"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Anula un registro de dinero (pago o gasto) pidiendo el motivo. Nada se borra: la fila queda en
// el historial como anulada, con quién, cuándo y por qué.
export default function VoidButton({
  label = "Anular",
  what,
  onVoid,
}: {
  what: string; // "pago" o "gasto", para los textos
  label?: string;
  onVoid: (reason: string) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onVoid(reason);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" className="admin-delete-btn no-print" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <form className="void-inline no-print" onSubmit={handleSubmit}>
      <input
        className="admin-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={`Motivo de la anulación del ${what}`}
        maxLength={180}
        required
        autoFocus
        aria-label={`Motivo de la anulación del ${what}`}
      />
      <button type="submit" className="admin-delete-btn" disabled={isPending}>
        {isPending ? "Anulando…" : "Confirmar anulación"}
      </button>
      <button
        type="button"
        className="admin-cancel-btn"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        disabled={isPending}
      >
        Cancelar
      </button>
      {error ? <p className="login-error">{error}</p> : null}
    </form>
  );
}
