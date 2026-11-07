import { getStockAlerts, LOW_STOCK_RATIO, type StockAlert } from "@/lib/stock-alerts";
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

function buildStockEmail(alerts: StockAlert[]) {
  const limit = Math.round(LOW_STOCK_RATIO * 100);
  const soldOut = alerts.filter((a) => a.stock <= 0).length;
  const shown = alerts.slice(0, MAX_ROWS);
  const more = alerts.length - shown.length;
  const link = `${siteUrl()}/admin/inventario/stock-bajo`;

  const rowsHtml = shown
    .map(
      (a) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e2d8"><strong>${escapeHtml(a.code)}</strong> ${escapeHtml(a.description)}<br><span style="color:#777;font-size:12px">${escapeHtml(a.categoryTitle)}</span></td>
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
      <h1 style="margin:4px 0 12px;font-size:22px">Stock bajo: ${alerts.length} ${alerts.length === 1 ? "producto" : "productos"}</h1>
      <p style="margin:0 0 14px;font-size:14px">Estos productos tienen ${limit} % o menos de lo que llegó en su última orden de compra recibida${soldOut > 0 ? ` (${soldOut} agotado${soldOut === 1 ? "" : "s"})` : ""}.</p>
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
    `Gráficas Caracas — Stock bajo: ${alerts.length} ${alerts.length === 1 ? "producto" : "productos"}`,
    `Productos con ${limit} % o menos de lo que llegó en su última orden de compra recibida.`,
    "",
    ...shown.map(
      (a) =>
        `- ${a.code} ${a.description} (${a.categoryTitle}): stock ${a.stock} de ${a.reference} (${a.percent} %)`
    ),
    ...(more > 0 ? [`…y ${more} más.`] : []),
    "",
    `Lista completa: ${link}`,
  ].join("\n");

  return {
    subject: `Stock bajo: ${alerts.length} ${alerts.length === 1 ? "producto" : "productos"} — Gráficas Caracas`,
    html,
    text,
  };
}

export type StockEmailResult = {
  alerts: number;
  sent: boolean;
  reason?: "no_alerts" | "mail_not_configured" | "no_recipient" | "send_failed";
};

// Resumen diario para el administrador (MAIL_ADMIN_COPY, separados por coma). Solo se manda
// si hay productos en alerta: sin alertas no se escribe a nadie.
export async function sendStockAlertDigest(): Promise<StockEmailResult> {
  const { alerts } = await getStockAlerts();
  if (alerts.length === 0) return { alerts: 0, sent: false, reason: "no_alerts" };
  if (!isMailConfigured()) return { alerts: alerts.length, sent: false, reason: "mail_not_configured" };

  const to = (process.env.MAIL_ADMIN_COPY || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (to.length === 0) return { alerts: alerts.length, sent: false, reason: "no_recipient" };

  try {
    await sendMail({ to: to.join(", "), ...buildStockEmail(alerts) });
    return { alerts: alerts.length, sent: true };
  } catch (err) {
    console.error("No se pudo enviar el aviso diario de stock bajo:", err);
    return { alerts: alerts.length, sent: false, reason: "send_failed" };
  }
}
