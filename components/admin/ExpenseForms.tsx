"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: true } | { error: string };

// Gasto de un contenedor: concepto (flete, aduana…) + monto en dólares.
export function PurchaseExpenseForm({
  onAdd,
}: {
  onAdd: (input: { concept: string; amount: number }) => Promise<Result>;
}) {
  const router = useRouter();
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onAdd({ concept, amount: Number(amount) });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setConcept("");
      setAmount("");
      router.refresh();
    });
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <input
        placeholder="Concepto (flete, aduana, transporte…)"
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        required
        className="admin-input"
      />
      <input
        type="number"
        step="0.01"
        min="0.01"
        inputMode="decimal"
        placeholder="Monto en $"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="admin-input admin-input-sm"
      />
      <button type="submit" className="admin-save-btn" disabled={isPending}>
        {isPending ? "Guardando…" : "Agregar gasto"}
      </button>
      {error ? <p className="login-error">{error}</p> : null}
    </form>
  );
}

// Gasto operativo: fecha, categoría, monto en dólares y nota.
export function OperatingExpenseForm({
  categories,
  defaultDate,
  onAdd,
}: {
  categories: string[];
  defaultDate: string;
  onAdd: (input: { date: string; category: string; amount: number; notes: string }) => Promise<Result>;
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onAdd({ date, category, amount: Number(amount), notes });
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
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        className="admin-input admin-input-sm"
        aria-label="Fecha del gasto"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="admin-input"
        aria-label="Categoría"
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        min="0.01"
        inputMode="decimal"
        placeholder="Monto en $"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="admin-input admin-input-sm"
      />
      <input
        placeholder="Nota (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="admin-input"
      />
      <button type="submit" className="admin-save-btn" disabled={isPending}>
        {isPending ? "Guardando…" : "Registrar gasto"}
      </button>
      {error ? <p className="login-error">{error}</p> : null}
    </form>
  );
}
