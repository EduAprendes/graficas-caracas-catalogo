"use client";

import { useState, useTransition } from "react";

export default function NewProductForm({
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
      <tr>
        <td colSpan={7}>
          <button type="button" className="admin-add-btn" onClick={() => setOpen(true)}>
            + Nuevo producto
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={7}>
        <form className="admin-form" onSubmit={handleSubmit}>
          <input name="code" placeholder="Código" required className="admin-input admin-input-sm" />
          <input name="description" placeholder="Descripción" required className="admin-input" />
          <input name="dimension" placeholder="Medida" className="admin-input admin-input-sm" />
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio"
            required
            className="admin-input admin-input-sm"
          />
          <input
            name="suggestedPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio sugerido"
            className="admin-input admin-input-sm"
          />
          <input
            name="stock"
            type="number"
            min="0"
            defaultValue={0}
            placeholder="Stock inicial"
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
            {isPending ? "Creando…" : "Crear"}
          </button>
          <button type="button" className="admin-cancel-btn" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      </td>
    </tr>
  );
}
