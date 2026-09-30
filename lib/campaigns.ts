import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { unsubscribeUrl } from "@/lib/unsubscribe";

// Tope por envío: la función serverless tiene un tiempo máximo y el SMTP del hosting
// suele limitar los correos por hora. Para listas mayores, dividir en varios envíos.
export const MAX_RECIPIENTS = 300;
const CONCURRENCY = 3;

// Tope diario de promociones (suma de todos los envíos del día). El servidor de correo no
// impone un límite propio y su IP es compartida con otros dominios, así que la holgura se
// pone aquí para cuidar la reputación. Configurable con PROMO_MAX_DIARIO.
export function getDailyLimit(): number {
  const limit = Number(process.env.PROMO_MAX_DIARIO);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 300;
}

// "Hoy" en hora de Venezuela (UTC-4, sin horario de verano).
export async function getSentToday(now = new Date()): Promise<number> {
  const offsetMs = 4 * 60 * 60 * 1000;
  const local = new Date(now.getTime() - offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const since = new Date(startLocal + offsetMs);

  const result = await prisma.campaign.aggregate({
    where: { createdAt: { gte: since } },
    _sum: { sent: true },
  });
  return result._sum.sent ?? 0;
}

export type Audience = "TODOS" | "COMPRADORES";

export const AUDIENCE_LABELS: Record<Audience, string> = {
  TODOS: "Todos los clientes con correo",
  COMPRADORES: "Solo clientes que ya han comprado",
};

export type CampaignContent = {
  subject: string;
  highlight: string; // línea destacada opcional (ej: "15% de descuento")
  message: string;
};

type Recipient = { id: number; name: string; email: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Clientes activos, con correo, que no pidieron baja de promociones.
async function getRecipients(audience: Audience): Promise<Recipient[]> {
  const customers = await prisma.customer.findMany({
    where: {
      cancelledAt: null,
      marketingOptOut: false,
      email: { not: null },
      ...(audience === "COMPRADORES"
        ? { salesOrders: { some: { status: "CONFIRMADA" } } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const customer of customers) {
    const email = customer.email?.trim();
    if (!email || !email.includes("@")) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue; // un mismo correo en varios clientes: una sola vez
    seen.add(key);
    recipients.push({ id: customer.id, name: customer.name, email });
  }
  return recipients;
}

export async function countAudiences(): Promise<Record<Audience, number>> {
  const [todos, compradores] = await Promise.all([
    getRecipients("TODOS"),
    getRecipients("COMPRADORES"),
  ]);
  return { TODOS: todos.length, COMPRADORES: compradores.length };
}

function personalize(text: string, name: string): string {
  return text.replace(/\{nombre\}/gi, name);
}

function buildCampaignEmail(content: CampaignContent, name: string, unsubscribe: string | null) {
  const message = personalize(content.message, name);
  const highlight = personalize(content.highlight, name).trim();

  const paragraphsHtml = message
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.5">${escapeHtml(block.trim()).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f3ee;font-family:Arial,Helvetica,sans-serif;color:#17191a">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #d9d7cb;padding:28px">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">Gráficas Caracas</p>
      ${
        highlight
          ? `<p style="margin:14px 0 18px;padding:14px 16px;background:#c81e2c;color:#fff;font-size:22px;font-weight:bold;text-align:center">${escapeHtml(highlight)}</p>`
          : `<div style="height:14px"></div>`
      }
      ${paragraphsHtml}
    </div>
    <p style="font-size:12px;color:#888;text-align:center;margin:14px 0 0;line-height:1.5">
      Recibes este correo porque eres cliente de Gráficas Caracas, C.A.${
        unsubscribe
          ? `<br><a href="${unsubscribe}" style="color:#888">Darme de baja de las promociones</a>`
          : ""
      }
    </p>
  </div>
</body></html>`;

  const text = [
    "Gráficas Caracas",
    ...(highlight ? ["", highlight.toUpperCase()] : []),
    "",
    message,
    "",
    "—",
    "Recibes este correo porque eres cliente de Gráficas Caracas, C.A.",
    ...(unsubscribe ? [`Darme de baja de las promociones: ${unsubscribe}`] : []),
  ].join("\n");

  return { subject: personalize(content.subject, name), html, text };
}

function validate(content: CampaignContent) {
  if (!content.subject.trim()) throw new Error("Falta el asunto");
  if (!content.message.trim()) throw new Error("Falta el mensaje");
}

// Correo de prueba: sin enlace de baja real (no hay cliente), con un nombre de ejemplo.
export async function sendCampaignTest(to: string, content: CampaignContent) {
  validate(content);
  if (!isMailConfigured()) throw new Error("El envío de correos no está configurado (variables SMTP)");
  if (!to.includes("@")) throw new Error("Correo de prueba inválido");

  const email = buildCampaignEmail(content, "Cliente de ejemplo", null);
  await sendMail({ to, ...email, subject: `[PRUEBA] ${email.subject}` });
}

export type CampaignResult = {
  campaignId: number;
  recipients: number;
  sent: number;
  failed: number;
};

export async function sendCampaign(
  userId: number,
  audience: Audience,
  content: CampaignContent
): Promise<CampaignResult> {
  validate(content);
  if (!isMailConfigured()) throw new Error("El envío de correos no está configurado (variables SMTP)");

  const recipients = await getRecipients(audience);
  if (recipients.length === 0) throw new Error("No hay clientes con correo para esa audiencia");
  if (recipients.length > MAX_RECIPIENTS) {
    throw new Error(
      `La audiencia tiene ${recipients.length} clientes y el máximo por envío es ${MAX_RECIPIENTS}. Usá la audiencia más acotada.`
    );
  }

  const dailyLimit = getDailyLimit();
  const sentToday = await getSentToday();
  if (sentToday + recipients.length > dailyLimit) {
    throw new Error(
      `Tope diario de promociones: hoy ya se enviaron ${sentToday} de ${dailyLimit} y este envío suma ${recipients.length}. Probá con una audiencia menor o esperá a mañana.`
    );
  }

  let sent = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < recipients.length) {
      const recipient = recipients[cursor++];
      try {
        const url = unsubscribeUrl(recipient.id);
        await sendMail({
          to: recipient.email,
          ...buildCampaignEmail(content, recipient.name, url),
          headers: { "List-Unsubscribe": `<${url}>` },
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`Promoción: no se pudo enviar a cliente #${recipient.id}:`, err);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const campaign = await prisma.campaign.create({
    data: {
      subject: content.subject.trim(),
      highlight: content.highlight.trim() || null,
      body: content.message,
      audience,
      recipients: recipients.length,
      sent,
      failed,
      userId,
    },
  });

  return { campaignId: campaign.id, recipients: recipients.length, sent, failed };
}

export type CampaignListItem = {
  id: number;
  createdAt: Date;
  subject: string;
  audience: string;
  recipients: number;
  sent: number;
  failed: number;
  userName: string;
};

export async function getCampaigns(): Promise<CampaignListItem[]> {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { id: "desc" },
    take: 50,
    include: { user: true },
  });
  return campaigns.map((campaign) => ({
    id: campaign.id,
    createdAt: campaign.createdAt,
    subject: campaign.subject,
    audience: campaign.audience,
    recipients: campaign.recipients,
    sent: campaign.sent,
    failed: campaign.failed,
    userName: campaign.user.name,
  }));
}
