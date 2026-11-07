import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";
import { caracasRange, caracasYearMonth } from "@/lib/format";
import { getReceivables, type AgingBuckets } from "@/lib/accounts";
import { getProfitReport } from "@/lib/finance";
import { getStockAlerts } from "@/lib/stock-alerts";

// Datos de la página "Salud del negocio". Todo en dólares, meses en hora de Caracas.

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type MonthSlot = { key: string; year: number; month: number; label: string };

// Los últimos `count` meses terminando en el mes en curso (el más antiguo primero).
function lastMonths(count: number): MonthSlot[] {
  const now = caracasYearMonth(new Date());
  const slots: MonthSlot[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const index = now.year * 12 + (now.month - 1) - i;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    slots.push({
      key: `${year}-${month}`,
      year,
      month,
      label: `${MONTH_SHORT[month - 1]} ${String(year).slice(2)}`,
    });
  }
  return slots;
}

function keyOf(date: Date): string {
  const { year, month } = caracasYearMonth(date);
  return `${year}-${month}`;
}

// ---------- Flujo de caja ----------

export type CashFlowMonth = {
  label: string;
  /** Cobrado: ventas de contado + abonos de órdenes a crédito. */
  income: number;
  /** Pagado a proveedores. */
  suppliers: number;
  /** Gastos operativos del negocio. */
  expenses: number;
  /** Comisiones pagadas a vendedores. */
  commissions: number;
  /** Total de salidas. */
  outflow: number;
  net: number;
};

export async function getCashFlow(months = 6): Promise<CashFlowMonth[]> {
  const slots = lastMonths(months);
  const from = caracasRange(slots[0].year, slots[0].month).from;

  const [cashOrders, creditPayments, supplierPayments, expenses, sellerPayments] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { status: "CONFIRMADA", paymentType: "CONTADO", createdAt: { gte: from } },
      include: { items: true },
    }),
    prisma.salesOrderPayment.findMany({
      where: {
        voidedAt: null,
        createdAt: { gte: from },
        order: { status: "CONFIRMADA", paymentType: "CREDITO" },
      },
    }),
    prisma.purchaseOrderPayment.findMany({ where: { voidedAt: null, paidAt: { gte: from } } }),
    prisma.operatingExpense.findMany({ where: { expenseDate: { gte: from } } }),
    prisma.sellerPayment.findMany({ where: { createdAt: { gte: from } } }),
  ]);

  const rows = new Map<string, CashFlowMonth>(
    slots.map((s) => [
      s.key,
      { label: s.label, income: 0, suppliers: 0, expenses: 0, commissions: 0, outflow: 0, net: 0 },
    ])
  );

  for (const order of cashOrders) {
    const row = rows.get(keyOf(order.createdAt));
    if (row) row.income += order.items.reduce((sum, item) => sum + lineTotal(item), 0);
  }
  for (const payment of creditPayments) {
    const row = rows.get(keyOf(payment.createdAt));
    if (row) row.income += Number(payment.amount);
  }
  for (const payment of supplierPayments) {
    const row = rows.get(keyOf(payment.paidAt));
    if (row) row.suppliers += Number(payment.amount);
  }
  for (const expense of expenses) {
    const row = rows.get(keyOf(expense.expenseDate));
    if (row) row.expenses += Number(expense.amount);
  }
  for (const payment of sellerPayments) {
    const row = rows.get(keyOf(payment.createdAt));
    if (row) row.commissions += Number(payment.amount);
  }

  return slots.map((s) => {
    const row = rows.get(s.key)!;
    const income = round2(row.income);
    const suppliers = round2(row.suppliers);
    const operating = round2(row.expenses);
    const commissions = round2(row.commissions);
    const outflow = round2(suppliers + operating + commissions);
    return {
      label: row.label,
      income,
      suppliers,
      expenses: operating,
      commissions,
      outflow,
      net: round2(income - outflow),
    };
  });
}

// ---------- Cuentas por pagar a proveedores ----------

export type PayableRow = {
  orderId: number;
  supplier: string;
  status: string;
  totalCost: number;
  paid: number;
  balance: number;
  /** Alguna línea de la orden no tiene costo cargado: el total real es mayor. */
  incompleteCost: boolean;
};

export async function getPayables(): Promise<{ rows: PayableRow[]; totalBalance: number; totalPaid: number }> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { not: "ANULADA" } },
    orderBy: { id: "asc" },
    include: { items: true, expenses: true, payments: true },
  });

  const rows: PayableRow[] = orders.map((order) => {
    const invoice = order.items.reduce(
      (sum, i) => sum + (i.cost != null ? Number(i.cost) * i.quantity : 0),
      0
    );
    const expenses = order.expenses
      .filter((e) => e.voidedAt == null)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const paid = order.payments
      .filter((p) => p.voidedAt == null)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCost = round2(invoice + expenses);
    return {
      orderId: order.id,
      supplier: order.supplierName,
      status: order.status,
      totalCost,
      paid: round2(paid),
      balance: Math.max(0, round2(totalCost - paid)),
      incompleteCost: order.items.some((i) => i.cost == null),
    };
  });

  return {
    rows,
    totalBalance: round2(rows.reduce((sum, r) => sum + r.balance, 0)),
    totalPaid: round2(rows.reduce((sum, r) => sum + r.paid, 0)),
  };
}

// ---------- Indicadores de arriba ----------

export type HealthSummary = {
  salesThisMonth: number;
  salesLastMonth: number;
  payablesBalance: number;
  receivablesTotal: number;
  /** Por cobrar con más de 30 días. */
  receivablesOverdue: number;
  aging: AgingBuckets;
  debtors: { customerId: number; name: string; balance: number; oldestDebtDays: number | null }[];
  lowStockCount: number;
  ordersWithIncompleteCost: number;
};

export async function getHealthSummary(
  payables: Awaited<ReturnType<typeof getPayables>>
): Promise<HealthSummary> {
  const now = caracasYearMonth(new Date());
  const prevIndex = now.year * 12 + (now.month - 1) - 1;
  const prevYear = Math.floor(prevIndex / 12);
  const prevMonth = (prevIndex % 12) + 1;

  const [thisMonth, lastMonth, receivables, stock] = await Promise.all([
    getProfitReport(now.year, now.month),
    getProfitReport(prevYear, prevMonth),
    getReceivables(),
    getStockAlerts(),
  ]);

  return {
    salesThisMonth: thisMonth.revenue,
    salesLastMonth: lastMonth.revenue,
    payablesBalance: payables.totalBalance,
    receivablesTotal: receivables.totalBalance,
    receivablesOverdue: round2(
      receivables.aging.days31to60 + receivables.aging.days61to90 + receivables.aging.over90
    ),
    aging: receivables.aging,
    debtors: receivables.rows
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map((r) => ({
        customerId: r.customerId,
        name: r.name,
        balance: r.balance,
        oldestDebtDays: r.oldestDebtDays,
      })),
    lowStockCount: stock.alerts.length,
    ordersWithIncompleteCost: payables.rows.filter((r) => r.incompleteCost).length,
  };
}

// ---------- Ventas diarias ----------

export type DailySalesDay = {
  /** AAAA-MM-DD (hora de Caracas). */
  date: string;
  /** Día y mes cortos: "7 nov". */
  label: string;
  total: number;
  orders: number;
};

const CARACAS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" });

// Ventas confirmadas por día de los últimos `days` días (incluye hoy). Una venta cuenta el día en
// que se creó la orden, sea de contado o a crédito (mismo criterio que "Ventas del mes").
export async function getDailySales(days = 30): Promise<DailySalesDay[]> {
  const today = CARACAS_DAY.format(new Date()); // AAAA-MM-DD
  const [y, m, d] = today.split("-").map(Number);
  const list: DailySalesDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(y, m - 1, d - i, 12));
    list.push({
      date: day.toISOString().slice(0, 10),
      label: `${day.getUTCDate()} ${MONTH_SHORT[day.getUTCMonth()]}`,
      total: 0,
      orders: 0,
    });
  }

  const from = new Date(`${list[0].date}T00:00:00-04:00`);
  const orders = await prisma.salesOrder.findMany({
    where: { status: "CONFIRMADA", createdAt: { gte: from } },
    include: { items: true },
  });

  const byDate = new Map(list.map((row) => [row.date, row]));
  for (const order of orders) {
    const row = byDate.get(CARACAS_DAY.format(order.createdAt));
    if (!row) continue;
    row.total += order.items.reduce((sum, item) => sum + lineTotal(item), 0);
    row.orders += 1;
  }
  for (const row of list) row.total = round2(row.total);
  return list;
}
