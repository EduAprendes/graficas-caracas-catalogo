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
            <button type="button" className="admin-edit-btn" onClick={() => setEditing(true)}>
              Editar
            </button>
            <button
              type="button"
              className="admin-delete-btn"
              onClick={handleDelete}
              disabled={isPending}
            >
              Borrar categoría
            </button>
          </div>
        </>
      )}
    </div>
  );
}
