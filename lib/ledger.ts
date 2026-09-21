import { prisma } from "@/lib/prisma";

export type LedgerEntry = {
  id: number;
  createdAt: Date;
  reason: string;
  delta: number;
  balance: number;
  userName: string;
  reference: string | null;
  referenceHref: string | null;
};

export type ProductLedger = {
  product: {
    id: number;
    code: string;
    description: string;
    dimension: string;
    stock: number;
    categoryTitle: string;
  };
  entries: LedgerEntry[];
};

const REASON_LABELS: Record<string, string> = {
  AJUSTE: "Ajuste manual",
  VENTA: "Venta",
  COMPRA: "Compra",
  ANULACION_VENTA: "Anulación de venta",
  AJUSTE_COMPRA: "Ajuste por edición de compra",
  ANULACION_COMPRA: "Anulación de compra",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

export async function getProductLedger(productId: number): Promise<ProductLedger | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });
  if (!product) return null;

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { id: "asc" },
    include: {
      user: true,
      salesOrderItem: { include: { order: true } },
      purchaseOrderItem: { include: { order: true } },
    },
  });

  let balance = 0;
  const chronological: LedgerEntry[] = movements.map((movement) => {
    balance += movement.delta;

    let reference: string | null = null;
    let referenceHref: string | null = null;
    if (movement.salesOrderItem) {
      reference = `Venta #${movement.salesOrderItem.order.id} — ${movement.salesOrderItem.order.customerName}`;
      referenceHref = `/admin/pedidos/${movement.salesOrderItem.order.id}`;
    } else if (movement.purchaseOrderItem) {
      reference = `Compra #${movement.purchaseOrderItem.order.id} — ${movement.purchaseOrderItem.order.supplierName}`;
      referenceHref = `/admin/compras/${movement.purchaseOrderItem.order.id}`;
    }

    return {
      id: movement.id,
      createdAt: movement.createdAt,
      reason: movement.reason,
      delta: movement.delta,
      balance,
      userName: movement.user.name,
      reference,
      referenceHref,
    };
  });

  return {
    product: {
      id: product.id,
      code: product.code,
      description: product.description,
      dimension: product.dimension,
      stock: product.stock,
      categoryTitle: product.category.title,
    },
    entries: chronological.reverse(),
  };
}
