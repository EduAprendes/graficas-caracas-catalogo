import { prisma } from "@/lib/prisma";

// ---------- Órdenes de venta ----------

export type SalesOrderListItem = {
  id: number;
  customerName: string;
  plotter: string | null;
  status: string;
  createdAt: Date;
  userName: string;
  itemCount: number;
  totalQuantity: number;
};

export async function getSalesOrders(): Promise<SalesOrderListItem[]> {
  const orders = await prisma.salesOrder.findMany({
    orderBy: { id: "desc" },
    include: { user: true, items: true },
  });

  return orders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    plotter: order.plotter,
    status: order.status,
    createdAt: order.createdAt,
    userName: order.user.name,
    itemCount: order.items.length,
    totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export type SalesOrderItemDetail = {
  id: number;
  productCode: string;
  material: string | null;
  tipo: string | null;
  reverso: string | null;
  acabado: string | null;
  ancho: number | null;
  alto: number | null;
  m2: number | null;
  description: string;
  quantity: number;
};

export type SalesOrderDetail = {
  id: number;
  customerName: string;
  plotter: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  userName: string;
  items: SalesOrderItemDetail[];
};

export async function getSalesOrder(id: number): Promise<SalesOrderDetail | null> {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    customerName: order.customerName,
    plotter: order.plotter,
    notes: order.notes,
    status: order.status,
    createdAt: order.createdAt,
    userName: order.user.name,
    items: order.items.map((item) => ({
      id: item.id,
      productCode: item.product.code,
      material: item.material,
      tipo: item.tipo,
      reverso: item.reverso,
      acabado: item.acabado,
      ancho: item.ancho != null ? Number(item.ancho) : null,
      alto: item.alto != null ? Number(item.alto) : null,
      m2: item.m2 != null ? Number(item.m2) : null,
      description: item.description,
      quantity: item.quantity,
    })),
  };
}

export type SalesOrderItemInput = {
  productId: number;
  material: string | null;
  tipo: string | null;
  reverso: string | null;
  acabado: string | null;
  ancho: number | null;
  alto: number | null;
  description: string;
  quantity: number;
};

export async function createSalesOrder(
  userId: number,
  input: {
    customerName: string;
    plotter: string | null;
    notes: string | null;
    items: SalesOrderItemInput[];
  }
) {
  const customerName = input.customerName.trim();
  if (!customerName) throw new Error("Falta el nombre del cliente");

  const items = input.items
    .map((item) => ({
      ...item,
      description: item.description.trim(),
      quantity: Math.trunc(item.quantity),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.productId) &&
        item.productId > 0 &&
        item.description.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
    );

  if (items.length === 0) {
    throw new Error("La orden necesita al menos una línea con producto, descripción y cantidad");
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        customerName,
        plotter: input.plotter?.trim() || null,
        notes: input.notes?.trim() || null,
        userId,
        items: {
          create: items.map((item, index) => {
            const ancho = item.ancho ?? null;
            const alto = item.alto ?? null;
            const m2 = ancho != null && alto != null ? Math.round(ancho * alto * 100) / 100 : null;
            return {
              position: index,
              productId: item.productId,
              material: item.material?.trim() || null,
              tipo: item.tipo?.trim() || null,
              reverso: item.reverso?.trim() || null,
              acabado: item.acabado?.trim() || null,
              ancho,
              alto,
              m2,
              description: item.description,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    for (const orderItem of created.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: orderItem.productId } });
      const newStock = Math.max(0, product.stock - orderItem.quantity);
      const appliedDelta = newStock - product.stock;
      if (appliedDelta === 0) continue;

      await tx.product.update({ where: { id: orderItem.productId }, data: { stock: newStock } });
      await tx.stockMovement.create({
        data: {
          productId: orderItem.productId,
          userId,
          delta: appliedDelta,
          reason: "VENTA",
          salesOrderItemId: orderItem.id,
        },
      });
    }

    return created;
  });

  return order;
}

export async function cancelSalesOrder(orderId: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    if (order.status !== "CONFIRMADA") return;

    for (const item of order.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
      const newStock = product.stock + item.quantity;

      await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          userId,
          delta: item.quantity,
          reason: "ANULACION_VENTA",
          salesOrderItemId: item.id,
        },
      });
    }

    await tx.salesOrder.update({ where: { id: orderId }, data: { status: "ANULADA" } });
  });
}

// ---------- Órdenes de compra / reposición ----------

export type PurchaseOrderListItem = {
  id: number;
  supplierName: string;
  status: string;
  createdAt: Date;
  receivedAt: Date | null;
  userName: string;
  itemCount: number;
  totalQuantity: number;
};

export async function getPurchaseOrders(): Promise<PurchaseOrderListItem[]> {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { id: "desc" },
    include: { user: true, items: true },
  });

  return orders.map((order) => ({
    id: order.id,
    supplierName: order.supplierName,
    status: order.status,
    createdAt: order.createdAt,
    receivedAt: order.receivedAt,
    userName: order.user.name,
    itemCount: order.items.length,
    totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export type PurchaseOrderItemDetail = {
  id: number;
  productId: number;
  productCode: string;
  productDescription: string;
  quantity: number;
  cost: number | null;
};

export type PurchaseOrderDetail = {
  id: number;
  supplierName: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  receivedAt: Date | null;
  userName: string;
  items: PurchaseOrderItemDetail[];
};

export async function getPurchaseOrder(id: number): Promise<PurchaseOrderDetail | null> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { product: true } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    supplierName: order.supplierName,
    notes: order.notes,
    status: order.status,
    createdAt: order.createdAt,
    receivedAt: order.receivedAt,
    userName: order.user.name,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: item.product.code,
      productDescription: item.product.description,
      quantity: item.quantity,
      cost: item.cost != null ? Number(item.cost) : null,
    })),
  };
}

export type PurchaseOrderItemInput = {
  productId: number;
  quantity: number;
  cost: number | null;
};

export async function createPurchaseOrder(
  userId: number,
  input: { supplierName: string; notes: string | null; items: PurchaseOrderItemInput[] }
) {
  const supplierName = input.supplierName.trim();
  if (!supplierName) throw new Error("Falta el nombre del proveedor");

  const items = input.items
    .map((item) => ({ ...item, quantity: Math.trunc(item.quantity) }))
    .filter(
      (item) =>
        Number.isFinite(item.productId) &&
        item.productId > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
    );

  if (items.length === 0) {
    throw new Error("La orden necesita al menos una línea con producto y cantidad");
  }

  return prisma.purchaseOrder.create({
    data: {
      supplierName,
      notes: input.notes?.trim() || null,
      userId,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost ?? null,
        })),
      },
    },
    include: { items: true },
  });
}

export async function receivePurchaseOrder(orderId: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    if (order.status !== "PENDIENTE") return;

    for (const item of order.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
      const newStock = product.stock + item.quantity;

      await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          userId,
          delta: item.quantity,
          reason: "COMPRA",
          purchaseOrderItemId: item.id,
        },
      });
    }

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { status: "RECIBIDA", receivedAt: new Date() },
    });
  });
}

export async function cancelPurchaseOrder(orderId: number) {
  await prisma.purchaseOrder.updateMany({
    where: { id: orderId, status: "PENDIENTE" },
    data: { status: "ANULADA" },
  });
}
