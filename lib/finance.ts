import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";
import { caracasRange } from "@/lib/format";
import { commissionAmount } from "@/lib/sellers";

// Todo en dólares.

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const OPERATING_CATEGORIES = [
  "Empleados",
  "Transporte de despachos",
  "Servicios",
  "Alquiler",
  "Otros",
];

// Interpreta AAAA-MM-DD como mediodía en Caracas (evita que una zona horaria cambie el día/mes).
function parseExpenseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Fecha inválida");
  const date = new Date(`${value}T12:00:00-04:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida");
  return date;
}

function checkAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero");
}

// ---------- Costos de un contenedor (orden de compra) ----------

export type PurchaseExpenseRow = { id: number; concept: string; amount: number; createdAt: Date };

export type PurchasePaymentRow = {
  id: number;
  paidAt: Date;
  amount: number;
  notes: string | null;
  userName: string;
};

export type PurchaseCosting = {
  invoiceTotal: number; // costo de factura (Σ costo × cantidad)
  expensesTotal: number; // fletes, aduana, etc.
  totalCost: number;
  expectedSale: number; // piezas × precio de venta actual
  expectedProfit: number;
  expenses: PurchaseExpenseRow[];
  itemsWithoutCost: number;
  // Factor para repartir los gastos entre los productos: 1 + gastos / factura.
  landedFactor: number;
  // Cuenta por pagar: costo total (factura + gastos) menos lo ya pagado.
  payments: PurchasePaymentRow[];
  paidTotal: number;
  balance: number; // lo que aún se debe (nunca negativo)
  overpaid: number; // pagado de más, si el costo se corrigió a la baja
};

export async function getPurchaseCosting(orderId: number): Promise<PurchaseCosting> {
  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { price: true } } } },
      expenses: { orderBy: { id: "asc" } },
      payments: { include: { user: { select: { name: true } } }, orderBy: [{ paidAt: "asc" }, { id: "asc" }] },
    },
  });

  let invoiceTotal = 0;
  let expectedSale = 0;
  let itemsWithoutCost = 0;
  for (const item of order.items) {
    expectedSale += item.quantity * Number(item.product.price);
    if (item.cost == null) itemsWithoutCost += 1;
    else invoiceTotal += Number(item.cost) * item.quantity;
  }
  const expensesTotal = order.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCost = invoiceTotal + expensesTotal;
  const paidTotal = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    paidTotal: round2(paidTotal),
    balance: Math.max(0, round2(totalCost - paidTotal)),
    overpaid: Math.max(0, round2(paidTotal - totalCost)),
    payments: order.payments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      amount: Number(p.amount),
      notes: p.notes,
      userName: p.user.name,
    })),
    invoiceTotal: round2(invoiceTotal),
    expensesTotal: round2(expensesTotal),
    totalCost: round2(totalCost),
    expectedSale: round2(expectedSale),
    expectedProfit: round2(expectedSale - totalCost),
    expenses: order.expenses.map((e) => ({
      id: e.id,
      concept: e.concept,
      amount: Number(e.amount),
      createdAt: e.createdAt,
    })),
    itemsWithoutCost,
    landedFactor: invoiceTotal > 0 ? 1 + expensesTotal / invoiceTotal : 1,
  };
}

export async function addPurchaseExpense(orderId: number, input: { concept: string; amount: number }) {
  checkAmount(input.amount);
  const concept = input.concept.trim();
  if (!concept) throw new Error("Escribí en qué consistió el gasto (flete, aduana…)");
  await prisma.purchaseOrderExpense.create({
    data: { orderId, concept, amount: input.amount },
  });
}

export async function deletePurchaseExpense(orderId: number, expenseId: number) {
  await prisma.purchaseOrderExpense.deleteMany({ where: { id: expenseId, orderId } });
}

// ---------- Pagos a proveedores (cuentas por pagar) ----------

// Registra un pago contra una orden de compra. No se permite pagar más de lo que se debe, ni en
// órdenes anuladas, ni antes de que la orden tenga costo (factura + gastos) cargado.
export async function addPurchasePayment(
  orderId: number,
  userId: number,
  input: { amount: number; date: string; notes: string | null }
) {
  checkAmount(input.amount);
  const paidAt = parseExpenseDate(input.date);

  const order = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === "ANULADA") throw new Error("La orden está anulada: no admite pagos");

  const costing = await getPurchaseCosting(orderId);
  if (costing.totalCost <= 0) {
    throw new Error("Carga primero el costo de la factura de la orden para poder registrar pagos");
  }
  if (costing.balance <= 0) throw new Error("Esta orden ya está pagada por completo");
  if (input.amount > costing.balance + 0.001) {
    throw new Error(
      `El pago (${input.amount.toFixed(2)}) supera lo que resta por pagar (${costing.balance.toFixed(2)})`
    );
  }

  await prisma.purchaseOrderPayment.create({
    data: { orderId, userId, amount: input.amount, paidAt, notes: input.notes?.trim() || null },
  });
}

export async function deletePurchasePayment(orderId: number, paymentId: number) {
  await prisma.purchaseOrderPayment.deleteMany({ where: { id: paymentId, orderId } });
}

export type PayableSummary = { totalCost: number; paid: number; balance: number };

// Costo total, pagado y saldo de cada orden de compra no anulada (para el listado).
export async function getPayablesByOrder(): Promise<Map<number, PayableSummary>> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { not: "ANULADA" } },
    include: { items: true, expenses: true, payments: true },
  });
  const result = new Map<number, PayableSummary>();
  for (const order of orders) {
    const invoice = order.items.reduce(
      (sum, i) => sum + (i.cost != null ? Number(i.cost) * i.quantity : 0),
      0
    );
    const expenses = order.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCost = invoice + expenses;
    result.set(order.id, {
      totalCost: round2(totalCost),
      paid: round2(paid),
      balance: Math.max(0, round2(totalCost - paid)),
    });
  }
  return result;
}

// ---------- Gastos operativos ----------

export type OperatingExpenseRow = {
  id: number;
  expenseDate: Date;
  category: string;
  amount: number;
  notes: string | null;
};

export async function addOperatingExpense(
  userId: number,
  input: { date: string; category: string; amount: number; notes: string | null }
) {
  checkAmount(input.amount);
  const category = input.category.trim();
  if (!category) throw new Error("Elegí la categoría del gasto");
  await prisma.operatingExpense.create({
    data: {
      userId,
      expenseDate: parseExpenseDate(input.date),
      category,
      amount: input.amount,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function deleteOperatingExpense(id: number) {
  await prisma.operatingExpense.deleteMany({ where: { id } });
}

// ---------- Costo real por producto ----------

// Costo promedio por pieza de cada producto, con los gastos del contenedor ya repartidos
// (en proporción al costo de factura) y promediando entre las órdenes recibidas.
async function getAverageLandedCosts(): Promise<Map<number, number>> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: "RECIBIDA" },
    include: { items: true, expenses: true },
  });

  const acc = new Map<number, { cost: number; qty: number }>();
  for (const order of orders) {
    const invoice = order.items.reduce(
      (sum, i) => sum + (i.cost != null ? Number(i.cost) * i.quantity : 0),
      0
    );
    const expenses = order.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const factor = invoice > 0 ? 1 + expenses / invoice : 1;
    for (const item of order.items) {
      if (item.cost == null || item.quantity <= 0) continue;
      const entry = acc.get(item.productId) ?? { cost: 0, qty: 0 };
      entry.cost += Number(item.cost) * factor * item.quantity;
      entry.qty += item.quantity;
      acc.set(item.productId, entry);
    }
  }

  const result = new Map<number, number>();
  for (const [productId, { cost, qty }] of acc) result.set(productId, cost / qty);
  return result;
}

// ---------- Ganancias del período ----------

export type ProfitReport = {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  commissions: number;
  operatingTotal: number;
  netProfit: number;
  orderCount: number;
  linesWithoutCost: number; // líneas vendidas de productos sin costo conocido (cuentan con costo 0)
  expensesByCategory: { category: string; amount: number }[];
  expenses: OperatingExpenseRow[];
};

export async function getProfitReport(year: number, month: number | null): Promise<ProfitReport> {
  const { from, to } = caracasRange(year, month);

  const [orders, expenses, costs] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { status: "CONFIRMADA", createdAt: { gte: from, lte: to } },
      include: { items: true },
    }),
    prisma.operatingExpense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
    }),
    getAverageLandedCosts(),
  ]);

  let revenue = 0;
  let costOfGoods = 0;
  let commissions = 0;
  let linesWithoutCost = 0;
  for (const order of orders) {
    const total = order.items.reduce((sum, item) => sum + lineTotal(item), 0);
    revenue += total;
    commissions += commissionAmount(
      round2(total),
      order.commissionPercent != null ? Number(order.commissionPercent) : null
    );
    for (const item of order.items) {
      const unitCost = costs.get(item.productId);
      if (unitCost == null) linesWithoutCost += 1;
      else costOfGoods += unitCost * item.quantity;
    }
  }

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }
  const operatingTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const grossProfit = revenue - costOfGoods;
  return {
    revenue: round2(revenue),
    costOfGoods: round2(costOfGoods),
    grossProfit: round2(grossProfit),
    commissions: round2(commissions),
    operatingTotal: round2(operatingTotal),
    netProfit: round2(grossProfit - commissions - operatingTotal),
    orderCount: orders.length,
    linesWithoutCost,
    expensesByCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    expenses: expenses.map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate,
      category: e.category,
      amount: Number(e.amount),
      notes: e.notes,
    })),
  };
}
