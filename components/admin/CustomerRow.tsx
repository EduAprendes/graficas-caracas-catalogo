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
          <button type="button" className="admin-edit-btn" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button
            type="button"
            className="admin-delete-btn"
            onClick={handleDelete}
            disabled={isPending}
          >
            Borrar
          </button>
        </div>
      </td>
    </tr>
  );
}
