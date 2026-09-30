import { prisma } from "@/lib/prisma";
import { getReceivables } from "@/lib/accounts";
import { lineTotal } from "@/lib/pricing";
import { commissionAmount } from "@/lib/sellers";

// ---------- Órdenes de venta ----------

export { lineTotal };

function itemsTotal(
  items: { unitPrice: unknown; quantity: number; discountPercent?: unknown }[]
): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

function paymentsTotal(payments: { amount: unknown }[]): number {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export type SalesOrderListItem = {
  id: number;
  customerName: string;
  deliveryAddress: string | null;
  status: string;
  paymentType: string;
  deliveryType: string;
  sellerName: string | null;
  commissionPercent: number | null;
  commissionAmount: number;
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
    include: { user: true, seller: true, items: true, payments: true },
  });

  return orders.map((order) => {
    const total = itemsTotal(order.items);
    const paid = order.paymentType === "CREDITO" ? paymentsTotal(order.payments) : total;
    const balance = order.paymentType === "CREDITO" ? Math.max(0, total - paid) : 0;

    return {
      id: order.id,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      paymentType: order.paymentType,
      deliveryType: order.deliveryType,
      sellerName: order.seller?.name ?? null,
      commissionPercent: order.commissionPercent != null ? Number(order.commissionPercent) : null,
      commissionAmount: commissionAmount(
        total,
        order.commissionPercent != null ? Number(order.commissionPercent) : null
      ),
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
  description: string;
  quantity: number;
  unitPrice: number | null;
  discountPercent: number;
  lineTotal: number;
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
  collectionEmailSentAt: Date | null;
  deliveryAddress: string | null;
  notes: string | null;
  status: string;
  paymentType: string;
  deliveryType: string;
  sellerName: string | null;
  commissionPercent: number | null;
  commissionAmount: number;
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
      seller: true,
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
    collectionEmailSentAt: order.collectionEmailSentAt,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    status: order.status,
    paymentType: order.paymentType,
    deliveryType: order.deliveryType,
    sellerName: order.seller?.name ?? null,
    commissionPercent: order.commissionPercent != null ? Number(order.commissionPercent) : null,
    commissionAmount: commissionAmount(
      total,
      order.commissionPercent != null ? Number(order.commissionPercent) : null
    ),
    createdAt: order.createdAt,
    userName: order.user.name,
    items: order.items.map((item) => ({
      id: item.id,
      productCode: item.product.code,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
      discountPercent: Number(item.discountPercent),
      lineTotal: lineTotal(item),
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
  description: string;
  quantity: number;
  unitPrice: number | null;
  discountPercent?: number | null;
};

export async function createSalesOrder(
  userId: number,
  input: {
    customerId: number;
    paymentType: "CONTADO" | "CREDITO";
    deliveryType: "TIENDA" | "DESPACHADO";
    sellerId: number | null;
    deliveryAddress: string | null;
    notes: string | null;
    items: SalesOrderItemInput[];
  }
) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new Error("Cliente inválido");
  if (customer.cancelledAt) throw new Error("Este cliente está cancelado; reactivalo para crearle órdenes");

  // Sin vendedor = venta de tienda: sin comisión. El % se congela en la orden.
  let seller: Awaited<ReturnType<typeof prisma.seller.findUnique>> = null;
  if (input.sellerId != null) {
    seller = await prisma.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw new Error("Vendedor inválido");
    if (seller.cancelledAt) {
      throw new Error("Este vendedor está cancelado; reactivalo para asignarle órdenes");
    }
  }

  const items = input.items
    .map((item) => ({
      ...item,
      description: item.description.trim(),
      quantity: Math.trunc(item.quantity),
      discountPercent: item.discountPercent ?? 0,
    }))
    .filter(
      (item) =>
        Number.isFinite(item.productId) &&
        item.productId > 0 &&
        item.description.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
    );

  if (items.some((item) => !Number.isFinite(item.discountPercent) || item.discountPercent < 0 || item.discountPercent > 100)) {
    throw new Error("El descuento debe estar entre 0 y 100%");
  }

  if (items.length === 0) {
    throw new Error("La orden necesita al menos una línea con producto, descripción y cantidad");
  }

  const order = await prisma.$transaction(async (tx) => {
    const requestedByProduct = new Map<number, number>();
    for (const item of items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    const products = await tx.product.findMany({
      where: { id: { in: [...requestedByProduct.keys()] } },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const shortages: string[] = [];
    for (const [productId, requested] of requestedByProduct) {
      const product = productsById.get(productId);
      if (product && product.stock < requested) {
        shortages.push(`${product.code} (pedís ${requested}, hay ${product.stock} en stock)`);
      }
    }
    if (shortages.length > 0) {
      throw new Error(`No hay stock suficiente: ${shortages.join(", ")}`);
    }

    const created = await tx.salesOrder.create({
      data: {
        customerId: customer.id,
        customerName: customer.name,
        paymentType: input.paymentType,
        deliveryType: input.deliveryType === "DESPACHADO" ? "DESPACHADO" : "TIENDA",
        sellerId: seller ? seller.id : null,
        commissionPercent: seller ? Number(seller.commissionPercent) : null,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        notes: input.notes?.trim() || null,
        userId,
        items: {
          create: items.map((item, index) => {
            return {
              position: index,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? null,
              discountPercent: item.discountPercent,
            };
          }),
        },
      },
      include: { items: true },
    });

    for (const orderItem of created.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: orderItem.productId } });
      const newStock = product.stock - orderItem.quantity;

      await tx.product.update({ where: { id: orderItem.productId }, data: { stock: newStock } });
      await tx.stockMovement.create({
        data: {
          productId: orderItem.productId,
          userId,
          delta: -orderItem.quantity,
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
    const remaining = Math.round((total - paidSoFar) * 100) / 100;
    if (remaining <= 0) {
      throw new Error("Esta orden ya está saldada");
    }
    if (input.amount > remaining + 0.001) {
      throw new Error(
        `El abono (${input.amount.toFixed(2)}) supera lo que resta por pagar (${remaining.toFixed(2)})`
      );
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
  const [products, orders, receivables] = await Promise.all([
    prisma.product.findMany({ select: { stock: true, price: true } }),
    prisma.salesOrder.findMany({
      where: { status: "CONFIRMADA" },
      include: { items: true },
    }),
    getReceivables(),
  ]);

  const inventoryToSellValue = products.reduce(
    (sum, product) => sum + product.stock * Number(product.price),
    0
  );

  const totalSold = orders.reduce((sum, order) => sum + itemsTotal(order.items), 0);

  // Mismo criterio que "Cuentas por cobrar": saldo neto por cliente (descuenta abonos de más).
  return { inventoryToSellValue, creditOutstanding: receivables.totalBalance, totalSold };
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
        data: { stock: newStock },
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
