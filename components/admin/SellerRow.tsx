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
  username: string | null;
};

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      `¿Cancelar al vendedor "${seller.name}"? No se borra: conserva su historial de ventas y comisiones, pero deja de aparecer al crear órdenes nuevas. Puedes reactivarlo cuando quieras.`
    );
    if (!ok) return;
    startTransition(() => {
      onCancel();
    });
  }

  const parts = seller.name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2)
  ).toUpperCase();

  if (editing) {
    return (
      <li className="access-row seller-row seller-row-editing">
        <form className="seller-form" onSubmit={handleSave}>
          <h3 className="seller-form-title">Editar a {seller.name}</h3>
          <div className="seller-form-grid">
            <div className="access-field">
              <label htmlFor={`seller-name-${seller.id}`}>Nombre</label>
              <input
                id={`seller-name-${seller.id}`}
                name="name"
                defaultValue={seller.name}
                required
                className="admin-input"
              />
            </div>
            <div className="access-field">
              <label htmlFor={`seller-phone-${seller.id}`}>Teléfono</label>
              <input
                id={`seller-phone-${seller.id}`}
                name="phone"
                defaultValue={seller.phone ?? ""}
                placeholder="Opcional"
                className="admin-input"
              />
            </div>
            <div className="access-field">
              <label htmlFor={`seller-comm-${seller.id}`}>Comisión %</label>
              <input
                id={`seller-comm-${seller.id}`}
                name="commissionPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={seller.commissionPercent}
                required
                className="admin-input"
              />
            </div>
          </div>
          <p className="access-field-hint">
            El nuevo % aplica solo a órdenes futuras; las ya creadas conservan el % con que se vendieron.
          </p>
          <div className="access-form-actions">
            <button type="button" className="admin-cancel-btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="submit" className="admin-save-btn" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`access-row seller-row${seller.cancelled ? " is-cancelled" : ""}`}>
      <span className="access-avatar access-avatar-vendedora" aria-hidden="true">
        {initials}
      </span>
      <div className="access-main">
        <Link
          href={`/admin/vendedores/${seller.id}`}
          className="access-name seller-link"
          title="Ver órdenes y comisiones"
        >
          {seller.name}
        </Link>
        <span className="access-user">{seller.phone ?? "Sin teléfono"}</span>
      </div>
      <dl className="seller-stats">
        <div>
          <dt>Comisión</dt>
          <dd>{seller.commissionPercent.toFixed(2)}%</dd>
        </div>
        <div>
          <dt>Órdenes</dt>
          <dd>
            <Link href={`/admin/vendedores/${seller.id}`} className="code-link">
              {seller.orderCount}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Total vendido</dt>
          <dd>{money(seller.totalSold)}</dd>
        </div>
        <div>
          <dt>Comisión ganada</dt>
          <dd>{money(seller.commissionEarned)}</dd>
        </div>
      </dl>
      <div className="access-badges">
        {seller.cancelled ? (
          <span className="access-badge access-badge-off">Cancelada</span>
        ) : (
          <span className="access-badge access-badge-ok">Activa</span>
        )}
        {seller.cancelled ? null : seller.username ? (
          <a
            href="#accesos"
            className="access-badge access-badge-info access-badge-link"
            title="Gestionar en Accesos al panel"
          >
            Con acceso
          </a>
        ) : (
          <a
            href="#accesos"
            className="access-badge access-badge-none access-badge-link"
            title="Crear acceso en Accesos al panel"
          >
            Sin acceso
          </a>
        )}
      </div>
      <div className="access-actions seller-actions">
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
    </li>
  );
}
