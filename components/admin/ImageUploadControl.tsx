"use client";

import { useRef, useState, useTransition } from "react";

export default function ImageUploadControl({
  label,
  initialImageUrl,
  onUpload,
  onRemove,
}: {
  label: string;
  initialImageUrl: string | null;
  onUpload: (image: { url: string; publicId: string }) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir la imagen");

      setImageUrl(data.url);
      startTransition(() => {
        onUpload({ url: data.url, publicId: data.publicId });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setImageUrl(null);
    setError(null);
    startTransition(() => {
      onRemove();
    });
  }

  const busy = uploading || isPending;

  return (
    <div className="image-upload">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={label} className="image-upload-thumb" />
      ) : (
        <div className="image-upload-thumb image-upload-empty">Sin foto</div>
      )}
      <div className="image-upload-actions">
        <button
          type="button"
          className="image-upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {uploading ? "Subiendo…" : imageUrl ? "Cambiar" : "Subir"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            className="image-upload-btn image-upload-btn-remove"
            onClick={handleRemove}
            disabled={busy}
          >
            Quitar
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      {error ? <span className="image-upload-error">{error}</span> : null}
    </div>
  );
}
