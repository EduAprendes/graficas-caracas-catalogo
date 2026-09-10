"use client";

import { useState, useTransition } from "react";

export default function NewCategoryForm({
  onCreate,
  nextOrder,
}: {
  onCreate: (formData: FormData) => void | Promise<void>;
  nextOrder: number;
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
      <button type="button" className="admin-add-btn admin-add-category-btn" onClick={() => setOpen(true)}>
        + Nueva categoría
      </button>
    );
  }

  return (
    <form className="admin-form admin-new-category-form" onSubmit={handleSubmit}>
      <input name="title" placeholder="Título" required className="admin-input" />
      <input name="subtitle" placeholder="Subtítulo (opcional)" className="admin-input" />
      <input
        name="dimensionLabel"
        placeholder="Etiqueta de medida"
        defaultValue="Medida"
        className="admin-input admin-input-sm"
      />
      <input
        name="order"
        type="number"
        defaultValue={nextOrder}
        aria-label="Orden"
        className="admin-input admin-input-sm"
      />
      <button type="submit" className="admin-save-btn" disabled={isPending}>
        {isPending ? "Creando…" : "Crear categoría"}
      </button>
      <button type="button" className="admin-cancel-btn" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
