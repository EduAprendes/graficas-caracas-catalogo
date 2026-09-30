"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Audience, CampaignContent, CampaignResult } from "@/lib/campaigns";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "TODOS", label: "Todos los clientes con correo" },
  { value: "COMPRADORES", label: "Solo clientes que ya han comprado" },
];

export default function CampaignForm({
  counts,
  maxRecipients,
  onSend,
  onTest,
}: {
  counts: Record<Audience, number>;
  maxRecipients: number;
  onSend: (audience: Audience, content: CampaignContent) => Promise<CampaignResult | { error: string }>;
  onTest: (to: string, content: CampaignContent) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [highlight, setHighlight] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("TODOS");
  const [testTo, setTestTo] = useState("");
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const content: CampaignContent = { subject, highlight, message };
  const count = counts[audience];
  const tooMany = count > maxRecipients;

  function handleTest() {
    setNotice(null);
    startTransition(async () => {
      const result = await onTest(testTo, content);
      setNotice(
        "error" in result
          ? { text: result.error, ok: false }
          : { text: `Prueba enviada a ${testTo}. Revisá también la carpeta de spam.`, ok: true }
      );
    });
  }

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const ok = window.confirm(
      `¿Enviar esta promoción a ${count} cliente(s)? No se puede deshacer ni retirar una vez enviada.`
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await onSend(audience, content);
      if ("error" in result) {
        setNotice({ text: result.error, ok: false });
        return;
      }
      setNotice({
        text: `Enviada: ${result.sent} de ${result.recipients} correos${result.failed > 0 ? ` (${result.failed} fallaron)` : ""}.`,
        ok: result.failed === 0,
      });
      setSubject("");
      setHighlight("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <form className="order-form" onSubmit={handleSend}>
      <div className="order-form-header">
        <label className="order-form-notes">
          Asunto
          <input
            className="admin-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: 15% de descuento en viniles esta semana"
            required
          />
        </label>
        <label>
          Destacado (opcional)
          <input
            className="admin-input"
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            placeholder="Ej: 15% OFF"
          />
        </label>
        <label>
          Enviar a
          <select
            className="admin-input"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
          >
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({counts[option.value]})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="promo-message">
        Mensaje
        <textarea
          className="admin-input"
          rows={9}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={"Hola {nombre},\n\nEsta semana tenemos ... Válido hasta ...\n\nEscríbenos para más información."}
          required
        />
      </label>
      <p className="statement-note">
        Usá <code>{"{nombre}"}</code> para poner el nombre de cada cliente (también sirve en el
        asunto). Separá los párrafos con una línea en blanco. Cada correo incluye un enlace para
        darse de baja de las promociones; quienes lo usen no reciben más.
      </p>

      <div className="promo-test">
        <input
          type="email"
          className="admin-input"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="Tu correo para enviar una prueba"
        />
        <button
          type="button"
          className="admin-edit-btn"
          onClick={handleTest}
          disabled={isPending || !testTo || !subject || !message}
        >
          Enviar prueba
        </button>
      </div>

      {tooMany ? (
        <p className="login-error">
          Esa audiencia tiene {count} clientes y el máximo por envío es {maxRecipients}.
        </p>
      ) : null}
      {notice ? <p className={notice.ok ? "statement-note" : "login-error"}>{notice.text}</p> : null}

      <div className="order-form-actions">
        <button
          type="submit"
          className="admin-save-btn"
          disabled={isPending || count === 0 || tooMany}
        >
          {isPending ? "Enviando…" : `Enviar a ${count} cliente(s)`}
        </button>
      </div>
    </form>
  );
}
