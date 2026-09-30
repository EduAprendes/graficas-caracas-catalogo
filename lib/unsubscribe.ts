import { createHmac, timingSafeEqual } from "node:crypto";

// Enlace de baja de promociones: firmado con HMAC para que nadie pueda dar de baja a
// otro cliente adivinando su id.
function sign(customerId: number): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET");
  return createHmac("sha256", secret).update(`baja:${customerId}`).digest("hex");
}

export function verifyUnsubscribeToken(customerId: number, token: string): boolean {
  try {
    const expected = Buffer.from(sign(customerId), "hex");
    const given = Buffer.from(token, "hex");
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "https://catalogo.graficascaracas.com").replace(/\/$/, "");
}

export function unsubscribeUrl(customerId: number): string {
  return `${siteUrl()}/baja?c=${customerId}&t=${sign(customerId)}`;
}
