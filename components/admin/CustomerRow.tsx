"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export type CustomerRowData = {
  id: number;
  name: string;
  company: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cancelled: boolean;
  orderCount: number;
  totalSold: number;
  creditOutstanding: number;
  creditBalance: number;
};

export default function CustomerRow({
  customer,
  onUpdate,
  onCancel,
  onReactivate,
}: {
  customer: CustomerRowData;
  onUpdate: (formData: FormData) => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onReactivate: () => void | Promise<void>;
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

  function handleCancel() {
    const ok = window.confirm(
      `¿Cancelar el cliente "${customer.name}"? No se borra: conserva su historial y podés reactivarlo, pero deja de aparecer al crear órdenes nuevas.`
    );
    if (!ok) return;
    startTransition(() => {
      onCancel();
    });
  }

  function handleReactivate() {
    startTransition(() => {
      onReactivate();
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={8}>
          <form className="admin-form admin-edit-form" onSubmit={handleSave}>
            <input name="name" defaultValue={customer.name} placeholder="Nombre de contacto" required className="admin-input" />
            <input name="company" defaultValue={customer.company ?? ""} placeholder="Empresa" className="admin-input" />
            <input name="taxId" defaultValue={customer.taxId ?? ""} placeholder="RIF o C.I." className="admin-input admin-input-sm" />
            <input
              name="phone"
              defaultValue={customer.phone ?? ""}
              placeholder="Teléfono"
              className="admin-input admin-input-sm"
            />
            <input name="email" type="email" defaultValue={customer.email ?? ""} placeholder="Correo electrónico" className="admin-input" />
            <input name="address" defaultValue={customer.address ?? ""} placeholder="Dirección" className="admin-input" />
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
    <tr className={customer.cancelled ? "row-cancelled" : undefined}>
      <td data-label="Nombre">
        <Link href={`/admin/clientes/${customer.id}`} className="code code-link">
          {customer.name}
        </Link>
        {customer.cancelled ? <span className="status-badge status-anulada"> Cancelado</span> : null}
      </td>
      <td data-label="Empresa">{customer.company ?? "—"}</td>
      <td data-label="Teléfono">{customer.phone ?? "—"}</td>
      <td data-label="Correo">{customer.email ?? "—"}</td>
      <td data-label="Dirección">{customer.address ?? "—"}</td>
      <td className="num" data-label="Órdenes">{customer.orderCount}</td>
      <td className="num" data-label="Total vendido">{customer.totalSold.toFixed(2)}</td>
      <td className="num" data-label="Saldo por cobrar">
        {customer.creditOutstanding > 0 ? (
          <span className="stock-badge stock-zero">{customer.creditOutstanding.toFixed(2)}</span>
        ) : customer.creditBalance > 0 ? (
          <span title="Pagó de más">{customer.creditBalance.toFixed(2)} a favor</span>
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
          {customer.cancelled ? (
            <button
              type="button"
              className="admin-edit-btn"
              onClick={handleReactivate}
              disabled={isPending}
            >
              Reactivar
            </button>
          ) : (
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn-delete"
              onClick={handleCancel}
              disabled={isPending}
              aria-label={`Cancelar ${customer.name}`}
              title="Cancelar cliente"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
                <path d="m5.5 14.5 9-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
