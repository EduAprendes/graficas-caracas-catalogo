import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Un producto está en alerta cuando su stock actual es igual o menor al 20 % de la cantidad
// que llegó en su ÚLTIMA orden de compra recibida. Los productos que nunca se han recibido en
// una orden de compra no tienen referencia y no generan alerta.
export const LOW_STOCK_RATIO = 0.2;

export type StockAlert = {
  productId: number;
  code: string;
  description: string;
  dimension: string;
  categoryId: number;
  categoryTitle: string;
  stock: number;
  /** Cantidad que llegó en la última orden de compra recibida. */
  reference: number;
  referenceOrderId: number;
  referenceDate: Date;
  /** Stock actual como porcentaje de la referencia (0 = agotado). */
  percent: number;
};

export type StockAlertReport = {
  alerts: StockAlert[];
  /** Productos sin ninguna orden de compra recibida: no se pueden evaluar. */
  withoutReference: number;
};

export const getStockAlerts = cache(async (): Promise<StockAlertReport> => {
  const [items, products] = await Promise.all([
    prisma.purchaseOrderItem.findMany({
      where: { order: { status: "RECIBIDA" }, quantity: { gt: 0 } },
      select: {
        productId: true,
        quantity: true,
        order: { select: { id: true, receivedAt: true, createdAt: true } },
      },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        description: true,
        dimension: true,
        stock: true,
        category: { select: { id: true, title: true, order: true } },
      },
    }),
  ]);

  // Última recepción de cada producto (por fecha de recepción; si falta, la de creación).
  const latest = new Map<number, { quantity: number; orderId: number; date: Date }>();
  for (const item of items) {
    const date = item.order.receivedAt ?? item.order.createdAt;
    const current = latest.get(item.productId);
    if (
      !current ||
      date > current.date ||
      (date.getTime() === current.date.getTime() && item.order.id > current.orderId)
    ) {
      latest.set(item.productId, { quantity: item.quantity, orderId: item.order.id, date });
    }
  }

  const alerts: StockAlert[] = [];
  let withoutReference = 0;
  for (const product of products) {
    const ref = latest.get(product.id);
    if (!ref) {
      withoutReference += 1;
      continue;
    }
    if (product.stock <= ref.quantity * LOW_STOCK_RATIO) {
      alerts.push({
        productId: product.id,
        code: product.code,
        description: product.description,
        dimension: product.dimension,
        categoryId: product.category.id,
        categoryTitle: product.category.title,
        stock: product.stock,
        reference: ref.quantity,
        referenceOrderId: ref.orderId,
        referenceDate: ref.date,
        percent: Math.max(0, Math.round((product.stock / ref.quantity) * 100)),
      });
    }
  }

  // Los más críticos primero (agotados, luego el menor porcentaje).
  alerts.sort(
    (a, b) =>
      a.percent - b.percent ||
      a.stock - b.stock ||
      a.categoryTitle.localeCompare(b.categoryTitle, "es") ||
      a.code.localeCompare(b.code, "es")
  );

  return { alerts, withoutReference };
});
