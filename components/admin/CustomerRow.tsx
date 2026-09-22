"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export type CustomerRowData = {
  id: number;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSold: number;
  creditOutstanding: number;
};

export default function CustomerRow({
  customer,
  onUpdate,
  onDelete,
}: {
  customer: CustomerRowData;
  onUpdate: (formData: FormData) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await onUpdate(formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    const ok = window.confirm(
      `¿Borrar el cliente "${customer.name}"? Sus órdenes ya registradas quedan sin cliente asociado.`
    );
    if (!ok) return;
    startTransition(() => {
      onDelete();
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <form className="admin-form admin-edit-form" onSubmit={handleSave}>
            <input name="name" defaultValue={customer.name} placeholder="Nombre" required className="admin-input" />
            <input
              name="phone"
              defaultValue={customer.phone ?? ""}
              placeholder="Teléfono"
              className="admin-input admin-input-sm"
            />
            <input name="notes" placeholder="Notas" className="admin-input" />
            <button type="submit" className="admin-save-btn" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="admin-cancel-btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td data-label="Nombre">
        <Link href={`/admin/clientes/${customer.id}`} className="code code-link">
          {customer.name}
        </Link>
      </td>
      <td data-label="Teléfono">{customer.phone ?? "—"}</td>
      <td className="num" data-label="Órdenes">{customer.orderCount}</td>
      <td className="num" data-label="Total vendido">{customer.totalSold.toFixed(2)}</td>
      <td className="num" data-label="Saldo por cobrar">
        {customer.creditOutstanding > 0 ? (
          <span className="stock-badge stock-zero">{customer.creditOutstanding.toFixed(2)}</span>
        ) : (
          "0.00"
        )}
      </td>
      <td className="num" data-label="Acciones">
        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => setEditing(true)}
            aria-label={`Editar ${customer.name}`}
            title="Editar"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
              <path
                d="M13.6 2.9a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3L7.4 16.1l-3.6.7.7-3.6L13.6 2.9Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="admin-icon-btn admin-icon-btn-delete"
            onClick={handleDelete}
            disabled={isPending}
            aria-label={`Borrar ${customer.name}`}
            title="Borrar"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
              <path
                d="M4.5 5.5h11m-8.5 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5m-7.5 0 .6 9.4a1 1 0 0 0 1 .9h5.8a1 1 0 0 0 1-.9l.6-9.4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
