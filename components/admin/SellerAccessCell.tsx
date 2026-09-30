"use client";

import { useState, useTransition } from "react";

// Acceso (usuario y clave) de una vendedora al panel. El administrador crea el usuario y
// puede cambiar la clave cuando quiera; la clave nunca se muestra después de guardarla.
export default function SellerAccessCell({
  username,
  disabled,
  onSave,
}: {
  username: string | null;
  disabled: boolean;
  onSave: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(formData);
      if ("error" in result) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      form.reset();
      setOpen(false);
      setMessage({ text: "Acceso guardado.", ok: true });
    });
  }

  return (
    <div className="seller-access">
      <span>{username ? <code>{username}</code> : "Sin acceso"}</span>
      {!disabled ? (
        <button type="button" className="admin-edit-btn" onClick={() => setOpen((v) => !v)}>
          {username ? "Cambiar clave" : "Crear acceso"}
        </button>
      ) : null}
      {open ? (
        <form className="seller-access-form" onSubmit={handleSubmit}>
          <input
            name="username"
            className="admin-input"
            placeholder="Usuario (ej: carla)"
            defaultValue={username ?? ""}
            readOnly={Boolean(username)}
            autoComplete="off"
            required
          />
          <input
            name="password"
            type="password"
            className="admin-input"
            placeholder="Clave nueva (mín. 8)"
            minLength={8}
            autoComplete="new-password"
            required
          />
          <button type="submit" className="admin-save-btn" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </form>
      ) : null}
      {message ? (
        <span className={message.ok ? "statement-note" : "login-error"}>{message.text}</span>
      ) : null}
    </div>
  );
}
