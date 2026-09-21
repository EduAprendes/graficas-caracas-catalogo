import { prisma } from "@/lib/prisma";

// ---------- Órdenes de venta ----------

function itemsTotal(items: { unitPrice: unknown; quantity: number }[]): number {
  return items.reduce((sum, item) => {
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null;
    return sum + (unitPrice != null ? unitPrice * item.quantity : 0);
  }, 0);
}

function paymentsTotal(payments: { amount: unknown }[]): number {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export type SalesOrderListItem = {
  id: number;
  customerName: string;
  plotter: string | null;
  status: string;
  paymentType: string;
  createdAt: Date;
  userName: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
};

export async function getSalesOrders(): Promise<SalesOrderListItem[]> {
  const orders = await prisma.salesOrder.findMany({
    orderBy: { id: "desc" },
    include: { user: true, items: true, payments: true },
  });

  return orders.map((order) => {
    const total = itemsTotal(order.items);
    const paid = order.paymentType === "CREDITO" ? paymentsTotal(order.payments) : total;
    const balance = order.paymentType === "CREDITO" ? Math.max(0, total - paid) : 0;

    return {
      id: order.id,
      customerName: order.customerName,
      plotter: order.plotter,
      status: order.status,
      paymentType: order.paymentType,
      createdAt: order.createdAt,
      userName: order.user.name,
      itemCount: order.items.length,
      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: total,
      paidAmount: paid,
      balance,
    };
  });
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
  unitPrice: number | null;
};

export type SalesOrderPaymentDetail = {
  id: number;
  amount: number;
  notes: string | null;
  userName: string;
  createdAt: Date;
};

export type SalesOrderDetail = {
  id: number;
  customerId: number | null;
  customerName: string;
  plotter: string | null;
  notes: string | null;
  status: string;
  paymentType: string;
  createdAt: Date;
  userName: string;
  items: SalesOrderItemDetail[];
  payments: SalesOrderPaymentDetail[];
  total: number;
  paid: number;
  balance: number;
};

export async function getSalesOrder(id: number): Promise<SalesOrderDetail | null> {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { product: true }, orderBy: { position: "asc" } },
      payments: { include: { user: true }, orderBy: { id: "asc" } },
    },
  });
  if (!order) return null;

  const total = itemsTotal(order.items);
  const paid = order.paymentType === "CREDITO" ? paymentsTotal(order.payments) : total;
  const balance = order.paymentType === "CREDITO" ? Math.max(0, total - paid) : 0;

  return {
    id: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    plotter: order.plotter,
    notes: order.notes,
    status: order.status,
    paymentType: order.paymentType,
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
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      notes: payment.notes,
      userName: payment.user.name,
      createdAt: payment.createdAt,
    })),
    total,
    paid,
    balance,
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
  unitPrice: number | null;
};

export async function createSalesOrder(
  userId: number,
  input: {
    customerId: number;
    paymentType: "CONTADO" | "CREDITO";
    plotter: string | null;
    notes: string | null;
    items: SalesOrderItemInput[];
  }
) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new Error("Cliente inválido");

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
        customerId: customer.id,
        customerName: customer.name,
        paymentType: input.paymentType,
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
              unitPrice: item.unitPrice ?? null,
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

export async function addSalesOrderPayment(
  orderId: number,
  userId: number,
  input: { amount: number; notes: string | null }
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto del abono debe ser mayor a cero");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
    if (order.status !== "CONFIRMADA") {
      throw new Error("Solo se pueden registrar abonos en órdenes confirmadas");
    }
    if (order.paymentType !== "CREDITO") {
      throw new Error("Esta orden no es a crédito");
    }

    const total = itemsTotal(order.items);
    const paidSoFar = paymentsTotal(order.payments);
    if (paidSoFar >= total) {
      throw new Error("Esta orden ya está saldada");
    }

    await tx.salesOrderPayment.create({
      data: {
        orderId,
        userId,
        amount: input.amount,
        notes: input.notes?.trim() || null,
      },
    });
  });
}

export type SalesSummary = {
  inventoryToSellValue: number;
  creditOutstanding: number;
  totalSold: number;
};

export async function getSalesSummary(): Promise<SalesSummary> {
  const [products, orders] = await Promise.all([
    prisma.product.findMany({ select: { stock: true, price: true } }),
    prisma.salesOrder.findMany({
      where: { status: "CONFIRMADA" },
      include: { items: true, payments: true },
    }),
  ]);

  const inventoryToSellValue = products.reduce(
    (sum, product) => sum + product.stock * Number(product.price),
    0
  );

  let creditOutstanding = 0;
  let totalSold = 0;
  for (const order of orders) {
    const total = itemsTotal(order.items);
    totalSold += total;
    if (order.paymentType === "CREDITO") {
      creditOutstanding += Math.max(0, total - paymentsTotal(order.payments));
    }
  }

  return { inventoryToSellValue, creditOutstanding, totalSold };
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
  suggestedPrice: number | null;
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
      suggestedPrice: item.suggestedPrice != null ? Number(item.suggestedPrice) : null,
    })),
  };
}

export type PurchaseOrderItemInput = {
  productId: number;
  quantity: number;
  cost: number | null;
  suggestedPrice: number | null;
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
          suggestedPrice: item.suggestedPrice ?? null,
        })),
      },
    },
    include: { items: true },
  });
}

export async function updatePurchaseOrder(
  orderId: number,
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

  await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    if (order.status === "ANULADA") {
      throw new Error("No se puede editar una orden anulada");
    }

    if (order.status === "RECIBIDA") {
      // La orden ya sumó stock al recibirse: ajustar por la diferencia de cantidades.
      const oldQuantities = new Map<number, number>();
      for (const item of order.items) {
        oldQuantities.set(item.productId, (oldQuantities.get(item.productId) ?? 0) + item.quantity);
      }
      const newQuantities = new Map<number, number>();
      for (const item of items) {
        newQuantities.set(item.productId, (newQuantities.get(item.productId) ?? 0) + item.quantity);
      }
      const productIds = new Set([...oldQuantities.keys(), ...newQuantities.keys()]);

      for (const productId of productIds) {
        const delta = (newQuantities.get(productId) ?? 0) - (oldQuantities.get(productId) ?? 0);
        if (delta === 0) continue;

        const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
        const newStock = Math.max(0, product.stock + delta);
        const appliedDelta = newStock - product.stock;
        if (appliedDelta === 0) continue;

        await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
        await tx.stockMovement.create({
          data: {
            productId,
            userId,
            delta: appliedDelta,
            reason: "AJUSTE_COMPRA",
          },
        });
      }

      for (const item of items) {
        if (item.suggestedPrice != null) {
          await tx.product.update({
            where: { id: item.productId },
            data: { suggestedPrice: item.suggestedPrice },
          });
        }
      }
    }

    await tx.purchaseOrderItem.deleteMany({ where: { orderId } });

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        supplierName,
        notes: input.notes?.trim() || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            cost: item.cost ?? null,
            suggestedPrice: item.suggestedPrice ?? null,
          })),
        },
      },
    });
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

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: newStock,
          ...(item.suggestedPrice != null ? { suggestedPrice: item.suggestedPrice } : {}),
        },
      });
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

export async function cancelPurchaseOrder(orderId: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    if (order.status === "ANULADA") return;

    if (order.status === "RECIBIDA") {
      // Revertir el stock que esta orden había sumado al recibirse.
      for (const item of order.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const newStock = Math.max(0, product.stock - item.quantity);
        const appliedDelta = newStock - product.stock;

        await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
        if (appliedDelta !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId,
              delta: appliedDelta,
              reason: "ANULACION_COMPRA",
              purchaseOrderItemId: item.id,
            },
          });
        }
      }
    }

    await tx.purchaseOrder.update({ where: { id: orderId }, data: { status: "ANULADA" } });
  });
}
