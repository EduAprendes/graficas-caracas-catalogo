"use client";

import { useRef, useState, useTransition } from "react";
import { removeProductImage, setProductImage } from "@/app/admin/actions";

export default function ProductImageUpload({
  productId,
  productLabel,
  initialImageUrl,
}: {
  productId: number;
  productLabel: string;
  initialImageUrl: string | null;
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
        setProductImage(productId, { url: data.url, publicId: data.publicId });
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
      removeProductImage(productId);
    });
  }

  const busy = uploading || isPending;

  return (
    <div className="product-image-upload">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={productLabel} className="product-image-thumb" />
      ) : (
        <div className="product-image-thumb product-image-empty">Sin foto</div>
      )}
      <div className="product-image-actions">
        <button
          type="button"
          className="product-image-btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {uploading ? "Subiendo…" : imageUrl ? "Cambiar" : "Subir"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            className="product-image-btn product-image-btn-remove"
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
      {error ? <span className="product-image-error">{error}</span> : null}
    </div>
  );
}
