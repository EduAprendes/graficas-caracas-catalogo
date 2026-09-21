"use client";

import { useState, useTransition } from "react";

export default function NewCustomerForm({
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
        + Nuevo cliente
      </button>
    );
  }

  return (
    <form className="admin-form admin-new-category-form" onSubmit={handleSubmit}>
      <input name="name" placeholder="Nombre del cliente" required className="admin-input" />
      <input name="phone" placeholder="Teléfono (opcional)" className="admin-input admin-input-sm" />
      <input name="notes" placeholder="Notas (opcional)" className="admin-input" />
      <button type="submit" className="admin-save-btn" disabled={isPending}>
        {isPending ? "Creando…" : "Crear cliente"}
      </button>
      <button type="button" className="admin-cancel-btn" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
