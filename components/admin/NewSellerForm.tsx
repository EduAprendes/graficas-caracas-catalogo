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
      <button type="button" className="admin-save-btn" onClick={() => setOpen(true)}>
        + Nuevo vendedor
      </button>
    );
  }

  return (
    <form className="seller-form seller-form-new" onSubmit={handleSubmit}>
      <h3 className="seller-form-title">Nuevo vendedor</h3>
      <div className="seller-form-grid">
        <div className="access-field">
          <label htmlFor="new-seller-name">Nombre</label>
          <input
            id="new-seller-name"
            name="name"
            placeholder="Ej: Carla González"
            required
            className="admin-input"
            autoComplete="off"
          />
        </div>
        <div className="access-field">
          <label htmlFor="new-seller-phone">Teléfono</label>
          <input
            id="new-seller-phone"
            name="phone"
            placeholder="Opcional"
            className="admin-input"
            autoComplete="off"
          />
        </div>
        <div className="access-field">
          <label htmlFor="new-seller-comm">Comisión %</label>
          <input
            id="new-seller-comm"
            name="commissionPercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={5}
            required
            className="admin-input"
          />
        </div>
      </div>
      <p className="access-field-hint">Después de crearlo, dale acceso al panel en la sección Accesos.</p>
      <div className="access-form-actions">
        <button type="button" className="admin-cancel-btn" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? "Creando…" : "Crear vendedor"}
        </button>
      </div>
    </form>
  );
}
