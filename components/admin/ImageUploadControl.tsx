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
          className="admin-icon-btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={imageUrl ? `Cambiar foto de ${label}` : `Subir foto de ${label}`}
          title={imageUrl ? "Cambiar foto" : "Subir foto"}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M4 7.2h2.4l1-1.7h5.2l1 1.7H16a1 1 0 0 1 1 1v6.3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.2a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="11.3" r="2.3" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        {imageUrl ? (
          <button
            type="button"
            className="admin-icon-btn admin-icon-btn-delete"
            onClick={handleRemove}
            disabled={busy}
            aria-label={`Quitar foto de ${label}`}
            title="Quitar foto"
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
              <path
                d="M4.5 5.5h11m-8.5 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5m-7.5 0 .6 9.4a1 1 0 0 0 1 .9h5.8a1 1 0 0 0 1-.9l.6-9.4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
      {uploading ? <span className="image-upload-status">Subiendo…</span> : null}
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
