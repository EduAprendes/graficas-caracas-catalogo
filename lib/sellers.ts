import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";
import { caracasYearMonth } from "@/lib/format";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Comisión de una orden: porcentaje congelado en la orden × total de la venta.
// Sin vendedor (venta en tienda) no hay comisión.
export function commissionAmount(total: number, percent: number | null): number {
  if (percent == null || percent <= 0) return 0;
  return round2((total * percent) / 100);
}

export function parseCommissionPercent(value: unknown): number {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("La comisión debe estar entre 0 y 100%");
  }
  return round2(percent);
}

export type SellerInput = {
  name: string;
  phone: string | null;
  commissionPercent: number;
};

function cleanSellerInput(input: SellerInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Falta el nombre del vendedor");
  return {
    name,
    phone: input.phone?.trim() || null,
    commissionPercent: parseCommissionPercent(input.commissionPercent),
  };
}

export type SellerListItem = {
  id: number;
  name: string;
  phone: string | null;
  commissionPercent: number;
  cancelled: boolean;
  orderCount: number;
  totalSold: number;
  commissionEarned: number;
  username: string | null; // usuario con el que entra la vendedora al panel
};

export async function getSellers(): Promise<SellerListItem[]> {
  const sellers = await prisma.seller.findMany({
    orderBy: { name: "asc" },
    include: {
      user: { select: { username: true } },
      salesOrders: {
        where: { status: "CONFIRMADA" },
        include: { items: true },
      },
    },
  });

  return sellers.map((seller) => {
    let totalSold = 0;
    let commissionEarned = 0;
    for (const order of seller.salesOrders) {
      const total = round2(order.items.reduce((sum, item) => sum + lineTotal(item), 0));
      totalSold += total;
      commissionEarned += commissionAmount(
        total,
        order.commissionPercent != null ? Number(order.commissionPercent) : null
      );
    }
    return {
      id: seller.id,
      name: seller.name,
      phone: seller.phone,
      commissionPercent: Number(seller.commissionPercent),
      cancelled: seller.cancelledAt != null,
      orderCount: seller.salesOrders.length,
      totalSold: round2(totalSold),
      commissionEarned: round2(commissionEarned),
      username: seller.user?.username ?? null,
    };
  });
}

export type SellerOption = {
  id: number;
  name: string;
  commissionPercent: number;
};

export async function getSellerOptions(): Promise<SellerOption[]> {
  const sellers = await prisma.seller.findMany({
    where: { cancelledAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, commissionPercent: true },
  });
  return sellers.map((seller) => ({
    id: seller.id,
    name: seller.name,
    commissionPercent: Number(seller.commissionPercent),
  }));
}

export async function createSeller(input: SellerInput) {
  return prisma.seller.create({ data: cleanSellerInput(input) });
}

// Cambiar el % solo afecta a las órdenes nuevas: cada orden guarda el % con que se vendió.
export async function updateSeller(id: number, input: SellerInput) {
  return prisma.seller.update({ where: { id }, data: cleanSellerInput(input) });
}

// Baja lógica, igual que los clientes: conserva su historial de ventas y comisiones.
export async function cancelSeller(id: number) {
  await prisma.seller.update({ where: { id }, data: { cancelledAt: new Date() } });
}

export async function reactivateSeller(id: number) {
  await prisma.seller.update({ where: { id }, data: { cancelledAt: null } });
}

// ---------- Detalle de órdenes de un vendedor (para auditar comisiones) ----------

export type SellerOrderRow = {
  id: number;
  createdAt: Date;
  customerName: string;
  status: string;
  total: number;
  commissionPercent: number | null;
  commission: number; // 0 si la orden está anulada
  counts: boolean; // solo las CONFIRMADAS suman
};

export type SellerDetail = {
  seller: { id: number; name: string; phone: string | null; commissionPercent: number; cancelled: boolean };
  orders: SellerOrderRow[];
  totalSold: number;
  commissionEarned: number;
  countedOrders: number;
};

export async function getSellerDetail(
  id: number,
  range: { from?: Date; to?: Date } = {}
): Promise<SellerDetail | null> {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) return null;

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (range.from) createdAt.gte = range.from;
  if (range.to) createdAt.lte = range.to;

  const orders = await prisma.salesOrder.findMany({
    where: { sellerId: id, ...(range.from || range.to ? { createdAt } : {}) },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const rows: SellerOrderRow[] = orders.map((order) => {
    const total = round2(order.items.reduce((sum, item) => sum + lineTotal(item), 0));
    const percent = order.commissionPercent != null ? Number(order.commissionPercent) : null;
    const counts = order.status === "CONFIRMADA";
    return {
      id: order.id,
      createdAt: order.createdAt,
      customerName: order.customerName,
      status: order.status,
      total,
      commissionPercent: percent,
      commission: counts ? commissionAmount(total, percent) : 0,
      counts,
    };
  });

  const counted = rows.filter((row) => row.counts);
  return {
    seller: {
      id: seller.id,
      name: seller.name,
      phone: seller.phone,
      commissionPercent: Number(seller.commissionPercent),
      cancelled: seller.cancelledAt != null,
    },
    orders: rows,
    totalSold: round2(counted.reduce((sum, row) => sum + row.total, 0)),
    commissionEarned: round2(counted.reduce((sum, row) => sum + row.commission, 0)),
    countedOrders: counted.length,
  };
}

// ---------- Pagos de comisión a la vendedora (mes a mes) ----------

export type SellerPaymentRow = {
  id: number;
  createdAt: Date;
  periodYear: number;
  periodMonth: number;
  amount: number;
  notes: string | null;
  userName: string;
};

export type SellerMonthLedger = {
  year: number;
  month: number;
  earned: number;
  paid: number;
  pending: number;
};

export type SellerLedger = {
  months: SellerMonthLedger[]; // más reciente primero
  payments: SellerPaymentRow[]; // más reciente primero
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
};

type LedgerDb = Pick<typeof prisma, "salesOrder" | "sellerPayment">;

async function buildSellerLedger(db: LedgerDb, sellerId: number): Promise<SellerLedger> {
  const [orders, payments] = await Promise.all([
    db.salesOrder.findMany({
      where: { sellerId, status: "CONFIRMADA" },
      include: { items: true },
    }),
    db.sellerPayment.findMany({
      where: { sellerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { user: { select: { name: true } } },
    }),
  ]);

  const byMonth = new Map<string, SellerMonthLedger>();
  const bucket = (year: number, month: number) => {
    const key = `${year}-${month}`;
    let row = byMonth.get(key);
    if (!row) {
      row = { year, month, earned: 0, paid: 0, pending: 0 };
      byMonth.set(key, row);
    }
    return row;
  };

  for (const order of orders) {
    const total = round2(order.items.reduce((sum, item) => sum + lineTotal(item), 0));
    const percent = order.commissionPercent != null ? Number(order.commissionPercent) : null;
    const { year, month } = caracasYearMonth(order.createdAt);
    bucket(year, month).earned += commissionAmount(total, percent);
  }
  for (const p of payments) {
    bucket(p.periodYear, p.periodMonth).paid += Number(p.amount);
  }

  const months = [...byMonth.values()]
    .map((m) => ({
      ...m,
      earned: round2(m.earned),
      paid: round2(m.paid),
      pending: round2(m.earned - m.paid),
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month);

  return {
    months,
    payments: payments.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      periodYear: p.periodYear,
      periodMonth: p.periodMonth,
      amount: Number(p.amount),
      notes: p.notes,
      userName: p.user.name,
    })),
    totalEarned: round2(months.reduce((sum, m) => sum + m.earned, 0)),
    totalPaid: round2(months.reduce((sum, m) => sum + m.paid, 0)),
    totalPending: round2(months.reduce((sum, m) => sum + m.pending, 0)),
  };
}

export async function getSellerLedger(sellerId: number): Promise<SellerLedger> {
  return buildSellerLedger(prisma, sellerId);
}

// Registra un pago (abono) de la comisión de un mes. No permite pagar más de lo pendiente de ese mes.
export async function addSellerPayment(
  sellerId: number,
  userId: number,
  input: { amount: number; year: number; month: number; notes: string | null }
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto del pago debe ser mayor a cero");
  }
  if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new Error("Elegí el mes que vas a pagar");
  }

  await prisma.$transaction(
    async (tx) => {
      const ledger = await buildSellerLedger(tx, sellerId);
      const row = ledger.months.find((m) => m.year === input.year && m.month === input.month);
      const pending = row?.pending ?? 0;
      if (pending <= 0) throw new Error("Ese mes no tiene comisión pendiente");
      if (Math.round(input.amount * 100) > Math.round(pending * 100)) {
        throw new Error(
          `El pago (${input.amount.toFixed(2)}) supera lo pendiente de ese mes (${pending.toFixed(2)})`
        );
      }
      await tx.sellerPayment.create({
        data: {
          sellerId,
          userId,
          amount: input.amount,
          periodYear: input.year,
          periodMonth: input.month,
          notes: input.notes?.trim() || null,
        },
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );
}
