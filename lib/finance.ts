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
};

export async function getPurchaseCosting(orderId: number): Promise<PurchaseCosting> {
  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { price: true } } } },
      expenses: { orderBy: { id: "asc" } },
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

  return {
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
