"use client";

import { useState, useTransition } from "react";
import ImageUploadControl from "@/components/admin/ImageUploadControl";

export type CategoryHeadData = {
  id: number;
  title: string;
  subtitle: string | null;
  dimensionLabel: string;
  imagePath: string | null;
};

export default function CategoryHead({
  category,
  onUploadImage,
  onRemoveImage,
  onUpdate,
  onDelete,
}: {
  category: CategoryHeadData;
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
      `¿Borrar la categoría "${category.title}" y todos sus productos? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    startTransition(() => {
      onDelete();
    });
  }

  return (
    <div className="admin-category-head">
      <ImageUploadControl
        label={category.title}
        initialImageUrl={category.imagePath}
        onUpload={onUploadImage}
        onRemove={onRemoveImage}
      />

      {editing ? (
        <form className="admin-form" onSubmit={handleSave}>
          <input name="title" defaultValue={category.title} placeholder="Título" required className="admin-input" />
          <input
            name="subtitle"
            defaultValue={category.subtitle ?? ""}
            placeholder="Subtítulo (opcional)"
            className="admin-input"
          />
          <input
            name="dimensionLabel"
            defaultValue={category.dimensionLabel}
            placeholder="Etiqueta de medida"
            className="admin-input admin-input-sm"
          />
          <button type="submit" className="admin-save-btn" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" className="admin-cancel-btn" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <h2>{category.title}</h2>
          <div className="admin-row-actions">
            <button
              type="button"
              className="admin-icon-btn"
              onClick={() => setEditing(true)}
              aria-label={`Editar categoría ${category.title}`}
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
              aria-label={`Borrar categoría ${category.title}`}
              title="Borrar categoría"
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
        </>
      )}
    </div>
  );
}
