import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";

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
};

export async function getSellers(): Promise<SellerListItem[]> {
  const sellers = await prisma.seller.findMany({
    orderBy: { name: "asc" },
    include: {
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
