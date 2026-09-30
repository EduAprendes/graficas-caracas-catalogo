import nodemailer from "nodemailer";

// Configuración por variables de entorno (cualquier proveedor SMTP: el correo del
// dominio en Plesk, Gmail con clave de aplicación, etc.):
//   SMTP_HOST, SMTP_PORT (587 o 465), SMTP_SECURE ("true" para 465), SMTP_USER,
//   SMTP_PASS y MAIL_FROM (ej: "Gráficas Caracas <ventas@tudominio.com>").
export function isMailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM
  );
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Que un SMTP caído no deje colgada la creación de la orden.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || process.env.MAIL_REPLY_TO || undefined,
  });
}
