"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ImageUploadControl from "@/components/admin/ImageUploadControl";

export type ProductRowData = {
  id: number;
  code: string;
  description: string;
  dimension: string;
  price: number;
  suggestedPrice: number | null;
  stock: number;
  imageUrl: string | null;
};

export default function ProductRow({
  product,
  onUploadImage,
  onRemoveImage,
  onUpdate,
  onDelete,
}: {
  product: ProductRowData;
  onUploadImage: (image: { url: string; publicId: string }) => void | Promise<void>;
  onRemoveImage: () => void | Promise<void>;
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
      `¿Borrar "${product.description}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    startTransition(() => {
      onDelete();
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={7}>
          <form className="admin-form admin-edit-form" onSubmit={handleSave}>
            <input
              name="code"
              defaultValue={product.code}
              placeholder="Código"
              required
              className="admin-input admin-input-sm"
            />
            <input
              name="description"
              defaultValue={product.description}
              placeholder="Descripción"
              required
              className="admin-input"
            />
            <input
              name="dimension"
              defaultValue={product.dimension}
              placeholder="Medida"
              className="admin-input admin-input-sm"
            />
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.price}
              placeholder="Precio"
              required
              className="admin-input admin-input-sm"
            />
            <input
              name="suggestedPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.suggestedPrice ?? ""}
              placeholder="Precio sugerido"
              className="admin-input admin-input-sm"
            />
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
      <td data-label="Foto">
        <ImageUploadControl
          label={product.description}
          initialImageUrl={product.imageUrl}
          onUpload={onUploadImage}
          onRemove={onRemoveImage}
        />
      </td>
      <td data-label="Código">
        <Link href={`/admin/productos/${product.id}`} className="code code-link">
          {product.code}
        </Link>
      </td>
      <td data-label="Descripción">{product.description}</td>
      <td className="num" data-label="Stock">
        <span className={`stock-badge${product.stock === 0 ? " stock-zero" : ""}`}>
          {product.stock}
        </span>
      </td>
      <td className="num" data-label="Precio sug.">
        {product.suggestedPrice != null ? product.suggestedPrice.toFixed(2) : "—"}
      </td>
      <td className="num" data-label="Valor">
        {product.suggestedPrice != null
          ? (product.stock * product.suggestedPrice).toFixed(2)
          : "—"}
      </td>
      <td className="num" data-label="Acciones">
        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => setEditing(true)}
            aria-label={`Editar ${product.description}`}
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
            aria-label={`Borrar ${product.description}`}
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
