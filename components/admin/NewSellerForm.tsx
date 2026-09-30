"use client";

import { useState, useTransition } from "react";

export default function NewSellerForm({
  onCreate,
}: {
  onCreate: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await onCreate(formData);
      form.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="admin-add-btn admin-add-category-btn"
        onClick={() => setOpen(true)}
      >
        + Nuevo vendedor
      </button>
    );
  }

  return (
    <form className="admin-form admin-new-category-form" onSubmit={handleSubmit}>
      <input name="name" placeholder="Nombre del vendedor" required className="admin-input" />
      <input name="phone" placeholder="Teléfono (opcional)" className="admin-input admin-input-sm" />
      <input
        name="commissionPercent"
        type="number"
        step="0.01"
        min="0"
        max="100"
        defaultValue={5}
        placeholder="Comisión %"
        required
        className="admin-input admin-input-sm"
      />
      <button type="submit" className="admin-save-btn" disabled={isPending}>
        {isPending ? "Creando…" : "Crear vendedor"}
      </button>
      <button type="button" className="admin-cancel-btn" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
