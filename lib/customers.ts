import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";
import { summarizeCustomerOrders } from "@/lib/accounts";

function orderTotal(
  items: { unitPrice: unknown; quantity: number; discountPercent?: unknown }[]
): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

function orderPaid(payments: { amount: unknown }[]): number {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export type CustomerListItem = {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cancelled: boolean;
  orderCount: number;
  totalSold: number;
  creditOutstanding: number;
  creditBalance: number; // saldo a favor del cliente (pagó de más)
};

export async function getCustomers(): Promise<CustomerListItem[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      salesOrders: { include: { items: true, payments: true } },
    },
  });

  return customers.map((customer) => {
    const totals = summarizeCustomerOrders(
      customer.salesOrders.filter((order) => order.status === "CONFIRMADA")
    );

    return {
      id: customer.id,
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      cancelled: customer.cancelledAt != null,
      orderCount: customer.salesOrders.length,
      totalSold: totals.totalSold,
      creditOutstanding: totals.receivable,
      creditBalance: totals.favorBalance,
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
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  cancelled: boolean;
  createdAt: Date;
  orders: CustomerOrderSummary[];
  totalSold: number;
  creditOutstanding: number;
  creditBalance: number; // saldo a favor del cliente (pagó de más)
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

  const totals = summarizeCustomerOrders(
    customer.salesOrders.filter((order) => order.status === "CONFIRMADA")
  );

  const orders = customer.salesOrders.map((order) => {
    const total = orderTotal(order.items);
    const paid = order.paymentType === "CREDITO" ? orderPaid(order.payments) : total;
    const balance = order.paymentType === "CREDITO" ? Math.max(0, total - paid) : 0;

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
    company: customer.company,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    cancelled: customer.cancelledAt != null,
    createdAt: customer.createdAt,
    orders,
    totalSold: totals.totalSold,
    creditOutstanding: totals.receivable,
    creditBalance: totals.favorBalance,
  };
}

export type CustomerOption = {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export async function getCustomerOptions(): Promise<CustomerOption[]> {
  const customers = await prisma.customer.findMany({
    where: { cancelledAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, company: true, phone: true, email: true, address: true },
  });
  return customers;
}

export type CustomerInput = {
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

function cleanCustomerInput(input: CustomerInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Falta el nombre de contacto del cliente");

  return {
    name,
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function createCustomer(input: CustomerInput) {
  return prisma.customer.create({ data: cleanCustomerInput(input) });
}

export async function updateCustomer(id: number, input: CustomerInput) {
  return prisma.customer.update({ where: { id }, data: cleanCustomerInput(input) });
}

// Baja lógica: el cliente conserva su historial de órdenes, solo deja de
// aparecer al armar órdenes nuevas.
export async function cancelCustomer(id: number) {
  await prisma.customer.update({ where: { id }, data: { cancelledAt: new Date() } });
}

export async function reactivateCustomer(id: number) {
  await prisma.customer.update({ where: { id }, data: { cancelledAt: null } });
}
