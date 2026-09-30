"use client";

import { useEffect, useState, useTransition } from "react";
import type { CustomerOption } from "@/lib/customers";

export type NewCustomerInput = {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
};

export default function NewCustomerModal({
  onCreate,
  onCreated,
  onClose,
}: {
  onCreate: (input: NewCustomerInput) => Promise<{ customer: CustomerOption } | { error: string }>;
  onCreated: (customer: CustomerOption) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<NewCustomerInput>({
    name: "",
    company: "",
    phone: "",
    email: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function set(field: keyof NewCustomerInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onCreate(values);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCreated(result.customer);
    });
  }

  return (
    <div
      className="product-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo cliente"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="product-modal customer-modal">
        <button type="button" className="product-modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 className="customer-modal-title">Nuevo cliente</h2>
        <form className="customer-modal-form" onSubmit={handleSubmit}>
          <label>
            Nombre de contacto
            <input
              className="admin-input"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Nombre de empresa
            <input
              className="admin-input"
              value={values.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label>
            Teléfono
            <input
              className="admin-input"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label>
            Correo electrónico
            <input
              type="email"
              className="admin-input"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label>
            Dirección
            <input
              className="admin-input"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Opcional"
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <div className="customer-modal-actions">
            <button type="submit" className="admin-save-btn" disabled={isPending}>
              {isPending ? "Creando…" : "Crear cliente"}
            </button>
            <button type="button" className="admin-cancel-btn" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
