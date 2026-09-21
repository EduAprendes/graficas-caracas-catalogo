import { prisma } from "@/lib/prisma";

function orderTotal(items: { unitPrice: unknown; quantity: number }[]): number {
  return items.reduce((sum, item) => {
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null;
    return sum + (unitPrice != null ? unitPrice * item.quantity : 0);
  }, 0);
}

function orderPaid(payments: { amount: unknown }[]): number {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export type CustomerListItem = {
  id: number;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSold: number;
  creditOutstanding: number;
};

export async function getCustomers(): Promise<CustomerListItem[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      salesOrders: { include: { items: true, payments: true } },
    },
  });

  return customers.map((customer) => {
    let totalSold = 0;
    let creditOutstanding = 0;

    for (const order of customer.salesOrders) {
      if (order.status !== "CONFIRMADA") continue;
      const total = orderTotal(order.items);
      totalSold += total;
      if (order.paymentType === "CREDITO") {
        creditOutstanding += Math.max(0, total - orderPaid(order.payments));
      }
    }

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      orderCount: customer.salesOrders.length,
      totalSold,
      creditOutstanding,
    };
  });
}

export type CustomerOrderSummary = {
  id: number;
  createdAt: Date;
  status: string;
  paymentType: string;
  total: number;
  paid: number;
  balance: number;
};

export type CustomerDetail = {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  orders: CustomerOrderSummary[];
  totalSold: number;
  creditOutstanding: number;
};

export async function getCustomer(id: number): Promise<CustomerDetail | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesOrders: {
        orderBy: { id: "desc" },
        include: { items: true, payments: true },
      },
    },
  });
  if (!customer) return null;

  let totalSold = 0;
  let creditOutstanding = 0;

  const orders = customer.salesOrders.map((order) => {
    const total = orderTotal(order.items);
    const paid = order.paymentType === "CREDITO" ? orderPaid(order.payments) : total;
    const balance = order.paymentType === "CREDITO" ? Math.max(0, total - paid) : 0;

    if (order.status === "CONFIRMADA") {
      totalSold += total;
      creditOutstanding += balance;
    }

    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      paymentType: order.paymentType,
      total,
      paid,
      balance,
    };
  });

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes,
    createdAt: customer.createdAt,
    orders,
    totalSold,
    creditOutstanding,
  };
}

export type CustomerOption = {
  id: number;
  name: string;
};

export async function getCustomerOptions(): Promise<CustomerOption[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return customers;
}

export async function createCustomer(input: {
  name: string;
  phone: string | null;
  notes: string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Falta el nombre del cliente");

  return prisma.customer.create({
    data: {
      name,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function updateCustomer(
  id: number,
  input: { name: string; phone: string | null; notes: string | null }
) {
  const name = input.name.trim();
  if (!name) throw new Error("Falta el nombre del cliente");

  return prisma.customer.update({
    where: { id },
    data: {
      name,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function deleteCustomer(id: number) {
  await prisma.customer.delete({ where: { id } });
}
