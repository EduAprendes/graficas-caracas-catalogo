import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";

const DAY_MS = 24 * 60 * 60 * 1000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

export type AgingBuckets = {
  current: number; // 0-30 días
  days31to60: number;
  days61to90: number;
  over90: number;
};

function emptyAging(): AgingBuckets {
  return { current: 0, days31to60: 0, days61to90: 0, over90: 0 };
}

function addToAging(aging: AgingBuckets, balance: number, ageDays: number) {
  if (ageDays <= 30) aging.current += balance;
  else if (ageDays <= 60) aging.days31to60 += balance;
  else if (ageDays <= 90) aging.days61to90 += balance;
  else aging.over90 += balance;
}

// Solo las órdenes CONFIRMADAS cuentan: las anuladas no generan deuda ni venta.
// Contado se considera cobrado al momento; crédito se cobra con abonos.
type OrderWithMoney = {
  id: number;
  createdAt: Date;
  paymentType: string;
  total: number;
  paid: number;
  balance: number;
  // Pagado de más (solo crédito): saldo a favor del cliente.
  overpaid: number;
  lastPaymentAt: Date | null;
};

type RawOrder = {
  id: number;
  createdAt: Date;
  status: string;
  paymentType: string;
  items: { unitPrice: unknown; quantity: number; discountPercent: unknown }[];
  payments: { amount: unknown; createdAt: Date }[];
};

function withMoney(order: RawOrder): OrderWithMoney {
  const total = round2(order.items.reduce((sum, item) => sum + lineTotal(item), 0));
  const credit = order.paymentType === "CREDITO";
  const paid = credit
    ? round2(order.payments.reduce((sum, p) => sum + Number(p.amount), 0))
    : total;
  const lastPaymentAt = order.payments.reduce<Date | null>(
    (latest, p) => (latest == null || p.createdAt > latest ? p.createdAt : latest),
    null
  );
  return {
    id: order.id,
    createdAt: order.createdAt,
    paymentType: order.paymentType,
    total,
    paid,
    balance: credit ? Math.max(0, round2(total - paid)) : 0,
    overpaid: credit ? Math.max(0, round2(paid - total)) : 0,
    lastPaymentAt,
  };
}

// Criterio único de saldo para toda la app: por cliente, deuda de sus órdenes a
// crédito menos lo pagado de más en otras órdenes. Negativo = saldo a favor.
export type CustomerTotals = {
  orders: OrderWithMoney[];
  totalSold: number;
  totalPaid: number;
  credit: number; // pagado de más
  balance: number; // neto
  receivable: number; // max(0, balance): lo que realmente se nos debe
  favorBalance: number; // max(0, -balance): lo que le debemos al cliente
};

export function summarizeCustomerOrders(confirmedOrders: RawOrder[]): CustomerTotals {
  const orders = confirmedOrders.map(withMoney);
  const debt = orders.reduce((sum, o) => sum + o.balance, 0);
  const credit = round2(orders.reduce((sum, o) => sum + o.overpaid, 0));
  const balance = round2(debt - credit);
  return {
    orders,
    totalSold: round2(orders.reduce((sum, o) => sum + o.total, 0)),
    totalPaid: round2(orders.reduce((sum, o) => sum + o.paid, 0)),
    credit,
    balance,
    receivable: Math.max(0, balance),
    favorBalance: Math.max(0, -balance),
  };
}

// ---------- Vista global: cuentas por cobrar ----------

export type ReceivableRow = {
  customerId: number;
  name: string;
  company: string | null;
  phone: string | null;
  cancelled: boolean;
  orderCount: number;
  totalSold: number;
  totalPaid: number;
  balance: number; // deuda neta: negativo = saldo a favor del cliente
  credit: number; // total pagado de más en órdenes a crédito
  lastPaymentAt: Date | null;
  oldestDebtDays: number | null;
  aging: AgingBuckets;
};

export type ReceivablesReport = {
  rows: ReceivableRow[];
  totalSold: number;
  totalPaid: number;
  totalBalance: number; // suma de lo que se nos debe (clientes con saldo a favor no compensan a otros)
  totalCredit: number; // suma de saldos a favor de clientes
  debtorCount: number;
  aging: AgingBuckets;
};

export async function getReceivables(): Promise<ReceivablesReport> {
  const now = new Date();
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      salesOrders: {
        where: { status: "CONFIRMADA" },
        include: { items: true, payments: true },
      },
    },
  });

  const rows: ReceivableRow[] = [];
  const globalAging = emptyAging();

  for (const customer of customers) {
    const totals = summarizeCustomerOrders(customer.salesOrders);
    const orders = totals.orders;
    if (orders.length === 0 && customer.cancelledAt) continue;

    const aging = emptyAging();
    let oldestDebtDays: number | null = null;
    let lastPaymentAt: Date | null = null;

    for (const order of orders) {
      if (order.lastPaymentAt && (lastPaymentAt == null || order.lastPaymentAt > lastPaymentAt)) {
        lastPaymentAt = order.lastPaymentAt;
      }
      if (order.balance > 0) {
        const age = daysSince(order.createdAt, now);
        addToAging(aging, order.balance, age);
        oldestDebtDays = oldestDebtDays == null ? age : Math.max(oldestDebtDays, age);
      }
    }

    const { totalSold, totalPaid, credit, balance } = totals;

    globalAging.current += aging.current;
    globalAging.days31to60 += aging.days31to60;
    globalAging.days61to90 += aging.days61to90;
    globalAging.over90 += aging.over90;

    rows.push({
      customerId: customer.id,
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      cancelled: customer.cancelledAt != null,
      orderCount: orders.length,
      totalSold,
      totalPaid,
      balance,
      credit,
      lastPaymentAt,
      oldestDebtDays,
      aging,
    });
  }

  // Mayores deudores primero; luego el resto por nombre.
  rows.sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "es"));

  return {
    rows,
    totalSold: round2(rows.reduce((sum, r) => sum + r.totalSold, 0)),
    totalPaid: round2(rows.reduce((sum, r) => sum + r.totalPaid, 0)),
    totalBalance: round2(rows.reduce((sum, r) => sum + Math.max(0, r.balance), 0)),
    totalCredit: round2(rows.reduce((sum, r) => sum + Math.max(0, -r.balance), 0)),
    debtorCount: rows.filter((r) => r.balance > 0).length,
    aging: globalAging,
  };
}

// ---------- Estado de cuenta de un cliente ----------

export type StatementLine = {
  key: string;
  date: Date;
  kind: "ORDEN" | "ABONO";
  orderId: number;
  concept: string;
  detail: string | null;
  charge: number; // aumenta la deuda / venta
  payment: number; // reduce la deuda
  balance: number; // saldo acumulado después de esta línea
};

export type StatementOrder = {
  id: number;
  createdAt: Date;
  paymentType: string;
  total: number;
  paid: number;
  balance: number;
  overpaid: number;
  ageDays: number;
};

export type CustomerStatement = {
  customer: {
    id: number;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    cancelled: boolean;
  };
  generatedAt: Date;
  lines: StatementLine[];
  orders: StatementOrder[];
  totalSold: number;
  totalPaid: number;
  balance: number; // neto: negativo = saldo a favor del cliente
  credit: number; // pagado de más en órdenes a crédito
  aging: AgingBuckets;
};

export async function getCustomerStatement(customerId: number): Promise<CustomerStatement | null> {
  const now = new Date();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      salesOrders: {
        where: { status: "CONFIRMADA" },
        orderBy: { createdAt: "asc" },
        include: {
          items: true,
          payments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!customer) return null;

  type Event = Omit<StatementLine, "balance"> & { order: number };
  const events: Event[] = [];
  const orders: StatementOrder[] = [];
  const aging = emptyAging();

  for (const raw of customer.salesOrders) {
    const money = withMoney(raw);
    const credit = raw.paymentType === "CREDITO";

    orders.push({
      id: raw.id,
      createdAt: raw.createdAt,
      paymentType: raw.paymentType,
      total: money.total,
      paid: money.paid,
      balance: money.balance,
      overpaid: money.overpaid,
      ageDays: daysSince(raw.createdAt, now),
    });
    if (money.balance > 0) addToAging(aging, money.balance, daysSince(raw.createdAt, now));

    events.push({
      key: `o${raw.id}`,
      date: raw.createdAt,
      kind: "ORDEN",
      orderId: raw.id,
      concept: `Orden de venta #${raw.id}`,
      detail: credit ? "Crédito" : "Contado — pagada al momento",
      charge: money.total,
      // Contado: se cobra en el acto, no genera deuda.
      payment: credit ? 0 : money.total,
      order: raw.id,
    });

    if (credit) {
      for (const payment of raw.payments) {
        events.push({
          key: `p${payment.id}`,
          date: payment.createdAt,
          kind: "ABONO",
          orderId: raw.id,
          concept: `Abono a orden #${raw.id}`,
          detail: payment.notes,
          charge: 0,
          payment: round2(Number(payment.amount)),
          order: raw.id,
        });
      }
    }
  }

  // Cronológico; a igual fecha, la orden va antes que sus abonos.
  events.sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      (a.kind === b.kind ? 0 : a.kind === "ORDEN" ? -1 : 1)
  );

  let running = 0;
  const lines: StatementLine[] = events.map((event) => {
    running = round2(running + event.charge - event.payment);
    const { order: _order, ...line } = event;
    void _order;
    return { ...line, balance: running };
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      cancelled: customer.cancelledAt != null,
    },
    generatedAt: now,
    lines,
    orders,
    totalSold: round2(orders.reduce((sum, o) => sum + o.total, 0)),
    totalPaid: round2(orders.reduce((sum, o) => sum + o.paid, 0)),
    // Igual al saldo acumulado de la última línea del estado de cuenta.
    balance: round2(
      orders.reduce((sum, o) => sum + o.balance - o.overpaid, 0)
    ),
    credit: round2(orders.reduce((sum, o) => sum + o.overpaid, 0)),
    aging,
  };
}
