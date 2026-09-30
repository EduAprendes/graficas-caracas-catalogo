import { prisma } from "@/lib/prisma";
import { getSalesOrder, type SalesOrderDetail } from "@/lib/orders";
import { isMailConfigured, sendMail } from "@/lib/mailer";

export type OrderEmailStatus = "sent" | "no_email" | "not_configured" | "failed";

const PAYMENT_LABELS: Record<string, string> = { CONTADO: "Contado", CREDITO: "Crédito" };
const DELIVERY_LABELS: Record<string, string> = {
  TIENDA: "Recogido en tienda",
  DESPACHADO: "Despachado",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value: number): string {
  return value.toFixed(2);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "short", timeStyle: "short" }).format(date);
}

// Copia para el cliente: no incluye vendedor ni comisión (datos internos).
function buildOrderEmail(order: SalesOrderDetail) {
  const hasDiscount = order.items.some((item) => item.discountPercent > 0);

  const rowsHtml = order.items
    .map(
      (item) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8">${escapeHtml(item.description)} <span style="color:#777">(${escapeHtml(item.productCode)})</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${item.unitPrice != null ? money(item.unitPrice) : "—"}</td>
        ${hasDiscount ? `<td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}</td>` : ""}
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${item.unitPrice != null ? money(item.lineTotal) : "—"}</td>
      </tr>`
    )
    .join("");

  const payment = PAYMENT_LABELS[order.paymentType] ?? order.paymentType;
  const delivery = DELIVERY_LABELS[order.deliveryType] ?? order.deliveryType;

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f3ee;font-family:Arial,Helvetica,sans-serif;color:#17191a">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #d9d7cb;padding:24px">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">Gráficas Caracas</p>
      <h1 style="margin:4px 0 16px;font-size:22px">Orden de venta #${order.id}</h1>
      <p style="margin:0 0 12px;font-size:14px">Hola ${escapeHtml(order.customerName)}, gracias por tu compra. Esta es la copia de tu orden.</p>
      <table style="font-size:14px;margin-bottom:16px" cellpadding="0" cellspacing="0">
        <tr><td style="padding:2px 12px 2px 0;color:#777">Fecha</td><td>${formatDateTime(order.createdAt)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#777">Forma de pago</td><td>${payment}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#777">Entrega</td><td>${delivery}</td></tr>
        ${order.deliveryAddress ? `<tr><td style="padding:2px 12px 2px 0;color:#777">Dirección</td><td>${escapeHtml(order.deliveryAddress)}</td></tr>` : ""}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px" cellpadding="0" cellspacing="0">
        <thead><tr style="background:#f5f5ef">
          <th style="padding:6px 8px;text-align:right">Cant</th>
          <th style="padding:6px 8px;text-align:left">Descripción</th>
          <th style="padding:6px 8px;text-align:right">Precio unit.</th>
          ${hasDiscount ? `<th style="padding:6px 8px;text-align:right">Desc.</th>` : ""}
          <th style="padding:6px 8px;text-align:right">Subtotal</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin:16px 0 0;text-align:right;font-size:16px"><strong>Total: ${money(order.total)}</strong></p>
      ${order.paymentType === "CREDITO" ? `<p style="margin:4px 0 0;text-align:right;font-size:13px;color:#777">Pagado: ${money(order.paid)} · Saldo por pagar: ${money(order.balance)}</p>` : ""}
      ${order.notes ? `<p style="margin:16px 0 0;font-size:13px;color:#555"><strong>Notas:</strong> ${escapeHtml(order.notes)}</p>` : ""}
    </div>
    <p style="font-size:12px;color:#888;text-align:center;margin:12px 0 0">Gráficas Caracas, C.A.</p>
  </div>
</body></html>`;

  const lines = order.items.map(
    (item) =>
      `- ${item.quantity} x ${item.description} (${item.productCode})` +
      (item.unitPrice != null
        ? ` — ${money(item.unitPrice)}${item.discountPercent > 0 ? ` (-${item.discountPercent}%)` : ""} = ${money(item.lineTotal)}`
        : "")
  );
  const text = [
    `Gráficas Caracas — Orden de venta #${order.id}`,
    `Hola ${order.customerName}, gracias por tu compra. Esta es la copia de tu orden.`,
    "",
    `Fecha: ${formatDateTime(order.createdAt)}`,
    `Forma de pago: ${payment}`,
    `Entrega: ${delivery}`,
    ...(order.deliveryAddress ? [`Dirección: ${order.deliveryAddress}`] : []),
    "",
    ...lines,
    "",
    `Total: ${money(order.total)}`,
    ...(order.paymentType === "CREDITO"
      ? [`Pagado: ${money(order.paid)} · Saldo por pagar: ${money(order.balance)}`]
      : []),
    ...(order.notes ? ["", `Notas: ${order.notes}`] : []),
  ].join("\n");

  return { subject: `Orden de venta #${order.id} — Gráficas Caracas`, html, text };
}

// Nunca lanza: un fallo de correo no debe romper ni deshacer la orden ya creada.
export async function sendSalesOrderEmail(orderId: number): Promise<OrderEmailStatus> {
  try {
    const order = await getSalesOrder(orderId);
    if (!order) return "failed";

    const customer = order.customerId
      ? await prisma.customer.findUnique({
          where: { id: order.customerId },
          select: { email: true },
        })
      : null;
    const to = customer?.email?.trim();
    if (!to) return "no_email";
    if (!isMailConfigured()) return "not_configured";

    await sendMail({ to, ...buildOrderEmail(order) });
    return "sent";
  } catch (err) {
    console.error(`No se pudo enviar el correo de la orden #${orderId}:`, err);
    return "failed";
  }
}
