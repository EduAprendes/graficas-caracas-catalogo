import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/pricing";
import { isMailConfigured, sendMail } from "@/lib/mailer";

const DAY_MS = 24 * 60 * 60 * 1000;

// Días desde la creación de la orden a crédito antes de mandar el recordatorio de cobranza.
export function getCollectionDays(): number {
  const days = Number(process.env.COBRANZA_DIAS);
  return Number.isFinite(days) && days > 0 ? Math.floor(days) : 15;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function money(value: number): string {
  return value.toFixed(2);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "short" }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type DueOrder = {
  id: number;
  createdAt: Date;
  ageDays: number;
  total: number;
  paid: number;
  balance: number;
};

function buildCollectionEmail(customerName: string, orders: DueOrder[]) {
  const totalBalance = round2(orders.reduce((sum, order) => sum + order.balance, 0));

  const rowsHtml = orders
    .map(
      (order) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8">#${order.id}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8">${formatDate(order.createdAt)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${money(order.total)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${money(order.paid)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right"><strong>${money(order.balance)}</strong></td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f3ee;font-family:Arial,Helvetica,sans-serif;color:#17191a">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #d9d7cb;padding:24px">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">Gráficas Caracas</p>
      <h1 style="margin:4px 0 16px;font-size:22px">Recordatorio de pago</h1>
      <p style="margin:0 0 12px;font-size:14px">Hola ${escapeHtml(customerName)}, te escribimos para recordarte que ${orders.length === 1 ? "tienes una orden a crédito con saldo pendiente" : "tienes órdenes a crédito con saldo pendiente"}:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px" cellpadding="0" cellspacing="0">
        <thead><tr style="background:#f5f5ef">
          <th style="padding:6px 8px;text-align:left">Orden</th>
          <th style="padding:6px 8px;text-align:left">Fecha</th>
          <th style="padding:6px 8px;text-align:right">Total</th>
          <th style="padding:6px 8px;text-align:right">Pagado</th>
          <th style="padding:6px 8px;text-align:right">Por pagar</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin:16px 0 0;text-align:right;font-size:16px"><strong>Saldo pendiente: ${money(totalBalance)}</strong></p>
      <p style="margin:16px 0 0;font-size:13px;color:#555">Si ya realizaste el pago, por favor responde a este correo con el comprobante para registrarlo. Si tienes alguna duda, escríbenos y con gusto te ayudamos. ¡Gracias!</p>
    </div>
    <p style="font-size:12px;color:#888;text-align:center;margin:12px 0 0">Gráficas Caracas, C.A.</p>
  </div>
</body></html>`;

  const text = [
    "Gráficas Caracas — Recordatorio de pago",
    `Hola ${customerName}, te recordamos que ${orders.length === 1 ? "tienes una orden a crédito con saldo pendiente" : "tienes órdenes a crédito con saldo pendiente"}:`,
    "",
    ...orders.map(
      (order) =>
        `- Orden #${order.id} (${formatDate(order.createdAt)}): total ${money(order.total)}, pagado ${money(order.paid)}, por pagar ${money(order.balance)}`
    ),
    "",
    `Saldo pendiente: ${money(totalBalance)}`,
    "",
    "Si ya realizaste el pago, responde a este correo con el comprobante para registrarlo.",
  ].join("\n");

  return { subject: "Recordatorio de pago — Gráficas Caracas", html, text };
}

export type CollectionRunResult = {
  days: number;
  customersNotified: number;
  ordersMarked: number;
  skippedNoEmail: number;
  failed: number;
};

// Recordatorio único por orden: al pasar N días desde su creación (COBRANZA_DIAS, 15 por
// defecto) y seguir con saldo, se le manda al cliente UN correo que agrupa todas sus
// órdenes vencidas. Cada orden se marca al enviarse para no repetir el aviso.
export async function sendCollectionReminders(now = new Date()): Promise<CollectionRunResult> {
  const days = getCollectionDays();
  const result: CollectionRunResult = {
    days,
    customersNotified: 0,
    ordersMarked: 0,
    skippedNoEmail: 0,
    failed: 0,
  };
  if (!isMailConfigured()) return result;

  const cutoff = new Date(now.getTime() - days * DAY_MS);
  const orders = await prisma.salesOrder.findMany({
    where: {
      status: "CONFIRMADA",
      paymentType: "CREDITO",
      collectionEmailSentAt: null,
      createdAt: { lte: cutoff },
      customerId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    include: { items: true, payments: true, customer: true },
  });

  const byCustomer = new Map<number, { name: string; email: string | null; orders: DueOrder[] }>();
  for (const order of orders) {
    if (!order.customer) continue;
    const total = round2(order.items.reduce((sum, item) => sum + lineTotal(item), 0));
    const paid = round2(order.payments.reduce((sum, p) => sum + Number(p.amount), 0));
    const balance = round2(total - paid);
    if (balance <= 0) continue;

    const entry = byCustomer.get(order.customer.id) ?? {
      name: order.customer.name,
      email: order.customer.email?.trim() || null,
      orders: [],
    };
    entry.orders.push({
      id: order.id,
      createdAt: order.createdAt,
      ageDays: Math.floor((now.getTime() - order.createdAt.getTime()) / DAY_MS),
      total,
      paid,
      balance,
    });
    byCustomer.set(order.customer.id, entry);
  }

  for (const entry of byCustomer.values()) {
    if (!entry.email) {
      result.skippedNoEmail += 1;
      continue;
    }
    try {
      await sendMail({ to: entry.email, ...buildCollectionEmail(entry.name, entry.orders) });
      await prisma.salesOrder.updateMany({
        where: { id: { in: entry.orders.map((order) => order.id) } },
        data: { collectionEmailSentAt: now },
      });
      result.customersNotified += 1;
      result.ordersMarked += entry.orders.length;
    } catch (err) {
      result.failed += 1;
      console.error(`No se pudo enviar el recordatorio de cobranza a ${entry.name}:`, err);
    }
  }

  return result;
}
