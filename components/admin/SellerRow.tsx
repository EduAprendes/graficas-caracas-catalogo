"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export type SellerRowData = {
  id: number;
  name: string;
  phone: string | null;
  commissionPercent: number;
  cancelled: boolean;
  orderCount: number;
  totalSold: number;
  commissionEarned: number;
};

export default function SellerRow({
  seller,
  onUpdate,
  onCancel,
  onReactivate,
}: {
  seller: SellerRowData;
  onUpdate: (formData: FormData) => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onReactivate: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onUpdate(formData);
      setEditing(false);
    });
  }

  function handleCancel() {
    const ok = window.confirm(
      `¿Cancelar al vendedor "${seller.name}"? No se borra: conserva su historial de ventas y comisiones, pero deja de aparecer al crear órdenes nuevas. Podés reactivarlo cuando quieras.`
    );
    if (!ok) return;
    startTransition(() => {
      onCancel();
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={7}>
          <form className="admin-form admin-edit-form" onSubmit={handleSave}>
            <input name="name" defaultValue={seller.name} placeholder="Nombre" required className="admin-input" />
            <input
              name="phone"
              defaultValue={seller.phone ?? ""}
              placeholder="Teléfono"
              className="admin-input admin-input-sm"
            />
            <label className="admin-field admin-field-sm">
              Comisión %
              <input
                name="commissionPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={seller.commissionPercent}
                required
                className="admin-input admin-input-sm"
              />
            </label>
            <p className="statement-note">
              El nuevo % aplica solo a órdenes futuras; las ya creadas conservan el % con que se vendieron.
            </p>
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
    <tr className={seller.cancelled ? "row-cancelled" : undefined}>
      <td data-label="Vendedor">
        <Link href={`/admin/vendedores/${seller.id}`} className="code code-link" title="Ver órdenes y comisiones">
          {seller.name}
        </Link>
        {seller.cancelled ? <span className="status-badge status-anulada"> Cancelado</span> : null}
      </td>
      <td data-label="Teléfono">{seller.phone ?? "—"}</td>
      <td className="num" data-label="Comisión">{seller.commissionPercent.toFixed(2)}%</td>
      <td className="num" data-label="Órdenes">
        <Link href={`/admin/vendedores/${seller.id}`} className="code-link">
          {seller.orderCount}
        </Link>
      </td>
      <td className="num" data-label="Total vendido">{seller.totalSold.toFixed(2)}</td>
      <td className="num" data-label="Comisión ganada">{seller.commissionEarned.toFixed(2)}</td>
      <td className="num" data-label="Acciones">
        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => setEditing(true)}
            aria-label={`Editar ${seller.name}`}
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
          {seller.cancelled ? (
            <button
              type="button"
              className="admin-edit-btn"
              onClick={() => startTransition(() => onReactivate())}
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
              aria-label={`Cancelar ${seller.name}`}
              title="Cancelar vendedor"
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
