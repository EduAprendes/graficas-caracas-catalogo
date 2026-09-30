"use client";

import { useState, useTransition } from "react";

type EmailStatus = "sent" | "no_email" | "not_configured" | "failed";

export const EMAIL_STATUS_MESSAGES: Record<EmailStatus, string> = {
  sent: "Copia enviada al correo del cliente.",
  no_email: "El cliente no tiene correo registrado; no se envió la copia al cliente.",
  not_configured: "El envío de correos no está configurado en el servidor (variables SMTP).",
  failed: "No se pudo enviar el correo. La orden quedó creada; probá reenviarla.",
};

export default function ResendOrderEmailButton({
  onResend,
}: {
  onResend: () => Promise<EmailStatus>;
}) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const status = await onResend();
      setMessage({ text: EMAIL_STATUS_MESSAGES[status], ok: status === "sent" });
    });
  }

  return (
    <>
      <button type="button" className="admin-edit-btn" onClick={handleClick} disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar copia por correo"}
      </button>
      {message ? (
        <span className={message.ok ? "statement-note" : "login-error"}>{message.text}</span>
      ) : null}
    </>
  );
}
