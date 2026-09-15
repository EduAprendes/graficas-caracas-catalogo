"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ImageUploadControl from "@/components/admin/ImageUploadControl";
import { adjustStockForm } from "@/app/admin/actions";

export type ProductRowData = {
  id: number;
  code: string;
  description: string;
  dimension: string;
  price: number;
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
        <td colSpan={6}>
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
      <td>
        <ImageUploadControl
          label={product.description}
          initialImageUrl={product.imageUrl}
          onUpload={onUploadImage}
          onRemove={onRemoveImage}
        />
      </td>
      <td>
        <Link href={`/admin/productos/${product.id}`} className="code code-link">
          {product.code}
        </Link>
      </td>
      <td>{product.description}</td>
      <td className="num">
        <span className={`stock-badge${product.stock === 0 ? " stock-zero" : ""}`}>
          {product.stock}
        </span>
      </td>
      <td className="num">
        <form action={adjustStockForm} className="stock-form">
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="number"
            name="amount"
            min={1}
            defaultValue={1}
            className="stock-amount"
            aria-label={`Cantidad a ajustar para ${product.description}`}
          />
          <button type="submit" name="direction" value="in" className="stock-btn stock-in">
            + Entrada
          </button>
          <button type="submit" name="direction" value="out" className="stock-btn stock-out">
            − Salida
          </button>
        </form>
      </td>
      <td className="num">
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
