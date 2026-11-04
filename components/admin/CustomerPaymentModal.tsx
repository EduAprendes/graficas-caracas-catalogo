"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Botón + ventana para registrar un abono general a un cliente. El monto se reparte entre
// sus órdenes a crédito con saldo, de la más antigua a la más nueva.
export default function CustomerPaymentModal({
  customerName,
  balance,
  onAddPayment,
}: {
  customerName: string;
  // Saldo pendiente del cliente: no se permite abonar más que eso.
  balance: number;
  onAddPayment: (input: { amount: number; notes: string }) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onAddPayment({ amount: Number(amount), notes });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="admin-save-btn pay-modal-trigger no-print" onClick={() => setOpen(true)}>
        Registrar abono
      </button>

      {open ? (
        <div
          className="product-modal-overlay no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar abono"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="product-modal customer-modal">
            <button type="button" className="product-modal-close" onClick={close} aria-label="Cerrar">
              ×
            </button>
            <h2 className="customer-modal-title">Registrar abono</h2>
            <p className="statement-note">
              {customerName} debe <strong>{balance.toFixed(2)}</strong>. El abono se reparte entre sus
              órdenes con saldo, de la más antigua a la más nueva.
            </p>
            <form className="customer-modal-form" onSubmit={handleSubmit}>
              <label>
                Monto del abono
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  inputMode="decimal"
                  autoFocus
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Máx. ${balance.toFixed(2)}`}
                  className="admin-input"
                />
              </label>
              <button type="button" className="admin-edit-btn" onClick={() => setAmount(balance.toFixed(2))}>
                Pagar todo ({balance.toFixed(2)})
              </button>
              <label>
                Notas (opcional)
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. transferencia, efectivo…"
                  className="admin-input"
                />
              </label>
              {error ? <p className="login-error">{error}</p> : null}
              <div className="customer-modal-actions">
                <button type="submit" className="admin-save-btn" disabled={isPending}>
                  {isPending ? "Guardando…" : "Registrar abono"}
                </button>
                <button type="button" className="admin-cancel-btn" onClick={close}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
