import { getStockAlerts, LOW_STOCK_RATIO, type StockAlert } from "@/lib/stock-alerts";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return (process.env.SITE_URL || "https://catalogo.graficascaracas.com").replace(/\/$/, "");
}

const MAX_ROWS = 60;

type DigestMode = "nuevos" | "semanal";

function buildStockEmail(alerts: StockAlert[], mode: DigestMode, newIds: Set<number>) {
  const limit = Math.round(LOW_STOCK_RATIO * 100);
  const weekly = mode === "semanal";
  const label = weekly ? "Resumen semanal de stock bajo" : "Nuevos con stock bajo";
  const soldOut = alerts.filter((a) => a.stock <= 0).length;
  const shown = alerts.slice(0, MAX_ROWS);
  const more = alerts.length - shown.length;
  const link = `${siteUrl()}/admin/inventario/stock-bajo`;

  const rowsHtml = shown
    .map(
      (a) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8"><strong>${escapeHtml(a.code)}</strong> ${escapeHtml(a.description)}${weekly && newIds.has(a.productId) ? ' <span style="color:#b4232f;font-size:12px">· nuevo</span>' : ""}<br><span style="color:#777;font-size:12px">${escapeHtml(a.categoryTitle)}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${a.stock}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right">${a.reference}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8;text-align:right"><strong style="color:${a.stock <= 0 ? "#b4232f" : "#17191a"}">${a.percent} %</strong></td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f3ee;font-family:Arial,Helvetica,sans-serif;color:#17191a">
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #d9d7cb;padding:24px">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">Gráficas Caracas · Inventario</p>
      <h1 style="margin:4px 0 12px;font-size:22px">${label}: ${alerts.length} ${alerts.length === 1 ? "producto" : "productos"}</h1>
      <p style="margin:0 0 14px;font-size:14px">${weekly ? "Lista completa de los productos que" : "Estos productos acaban de entrar en alerta: ahora"} tienen ${limit} % o menos de lo que llegó en su última orden de compra recibida${soldOut > 0 ? ` (${soldOut} agotado${soldOut === 1 ? "" : "s"})` : ""}.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px" cellpadding="0" cellspacing="0">
        <thead><tr style="background:#f5f5ef">
          <th style="padding:6px 8px;text-align:left">Producto</th>
          <th style="padding:6px 8px;text-align:right">Stock</th>
          <th style="padding:6px 8px;text-align:right">Llegaron</th>
          <th style="padding:6px 8px;text-align:right">Queda</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${more > 0 ? `<p style="margin:12px 0 0;font-size:13px;color:#555">…y ${more} más.</p>` : ""}
      <p style="margin:18px 0 0;font-size:14px"><a href="${link}" style="color:#1d5fa8">Ver la lista completa en el panel</a></p>
    </div>
  </div>
</body></html>`;

  const text = [
    `Gráficas Caracas — ${label}: ${alerts.length} ${alerts.length === 1 ? "producto" : "productos"}`,
    `Productos con ${limit} % o menos de lo que llegó en su última orden de compra recibida.`,
    "",
    ...shown.map(
      (a) =>
        `- ${a.code} ${a.description} (${a.categoryTitle}): stock ${a.stock} de ${a.reference} (${a.percent} %)${weekly && newIds.has(a.productId) ? " · nuevo" : ""}`
    ),
    ...(more > 0 ? [`…y ${more} más.`] : []),
    "",
    `Lista completa: ${link}`,
  ].join("\n");

  return {
    subject: `${label}: ${alerts.length} ${alerts.length === 1 ? "producto" : "productos"} — Gráficas Caracas`,
    html,
    text,
  };
}

export type StockEmailResult = {
  alerts: number;
  /** Productos que entraron en alerta desde el último aviso. */
  newAlerts: number;
  mode: DigestMode;
  sent: boolean;
  reason?: "no_alerts" | "nothing_new" | "mail_not_configured" | "no_recipient" | "send_failed";
};

// Aviso para el administrador (MAIL_ADMIN_COPY, separados por coma):
//  - a diario: solo los productos que entraron en alerta desde el último aviso;
//  - los lunes (o con forceWeekly): la lista completa, marcando los nuevos.
// En stock_alert_notices queda quién ya se avisó; la fila se borra cuando el producto sale de la
// alerta, así que si vuelve a caer se avisa otra vez. Sin nada que decir no se escribe a nadie.
export async function sendStockAlertDigest(options: { forceWeekly?: boolean } = {}): Promise<StockEmailResult> {
  const { alerts } = await getStockAlerts();
  const mode: DigestMode = options.forceWeekly || new Date().getUTCDay() === 1 ? "semanal" : "nuevos";

  // Los que ya se repusieron dejan de estar "avisados".
  const inAlert = alerts.map((a) => a.productId);
  await prisma.stockAlertNotice.deleteMany({ where: { productId: { notIn: inAlert } } });

  const notified = new Set(
    (await prisma.stockAlertNotice.findMany({ select: { productId: true } })).map((n) => n.productId)
  );
  const fresh = alerts.filter((a) => !notified.has(a.productId));
  const newIds = new Set(fresh.map((a) => a.productId));

  if (alerts.length === 0) return { alerts: 0, newAlerts: 0, mode, sent: false, reason: "no_alerts" };
  const toSend = mode === "semanal" ? alerts : fresh;
  if (toSend.length === 0) {
    return { alerts: alerts.length, newAlerts: 0, mode, sent: false, reason: "nothing_new" };
  }
  const base = { alerts: alerts.length, newAlerts: fresh.length, mode };
  if (!isMailConfigured()) return { ...base, sent: false, reason: "mail_not_configured" };

  const to = (process.env.MAIL_ADMIN_COPY || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (to.length === 0) return { ...base, sent: false, reason: "no_recipient" };

  try {
    await sendMail({ to: to.join(", "), ...buildStockEmail(toSend, mode, newIds) });
  } catch (err) {
    console.error("No se pudo enviar el aviso de stock bajo:", err);
    return { ...base, sent: false, reason: "send_failed" };
  }

  // Solo después de enviar: si el correo falla, mañana se reintenta con los mismos.
  if (fresh.length > 0) {
    await prisma.stockAlertNotice.createMany({
      data: fresh.map((a) => ({ productId: a.productId })),
      skipDuplicates: true,
    });
  }
  return { ...base, sent: true };
}
