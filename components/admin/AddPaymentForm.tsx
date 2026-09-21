"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AddPaymentForm({
  onAddPayment,
}: {
  onAddPayment: (input: { amount: number; notes: string }) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      router.refresh();
    });
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Monto del abono"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="admin-input admin-input-sm"
      />
      <input
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="admin-input"
      />
      <button type="submit" className="admin-save-btn" disabled={isPending}>
        {isPending ? "Guardando…" : "Registrar abono"}
      </button>
      {error ? <p className="login-error">{error}</p> : null}
    </form>
  );
}
