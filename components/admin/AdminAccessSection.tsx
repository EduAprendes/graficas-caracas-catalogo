"use client";

import { useState, useTransition } from "react";

type Account = { id: number; username: string; name: string };
type Save = (userId: number | null, formData: FormData) => Promise<{ ok: true } | { error: string }>;

// Cuentas de administradora (ven todo menos compras, salud y balance). Solo el administrador
// principal ve esta sección: crea la cuenta y cambia su usuario o su clave. La clave no se muestra.
export default function AdminAccessSection({ accounts, onSave }: { accounts: Account[]; onSave: Save }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>, userId: number | null) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(userId, data);
      if ("error" in result) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      form.reset();
      setEditing(null);
      setMessage({ text: "Acceso guardado.", ok: true });
    });
  }

  function form(account: Account | null) {
    return (
      <form className="seller-access-form" onSubmit={(e) => submit(e, account?.id ?? null)}>
        <input name="name" className="admin-input" placeholder="Nombre" defaultValue={account?.name ?? ""} autoComplete="off" />
        <input
          name="username"
          className="admin-input"
          placeholder="Usuario (ej: maria)"
          defaultValue={account?.username ?? ""}
          autoComplete="off"
          required
        />
        <input
          name="password"
          type="password"
          className="admin-input"
          placeholder={account ? "Clave nueva (vacío = no cambiar)" : "Clave (mín. 8)"}
          minLength={account ? undefined : 8}
          autoComplete="new-password"
          required={!account}
        />
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    );
  }

  return (
    <section className="seller-access">
      <h2 className="statement-heading">Acceso de administradora</h2>
      <p className="statement-note">
        Ve todo el panel menos Órdenes de compra, Salud y Balance. Solo el administrador principal puede crear o cambiar estas cuentas.
      </p>
      {accounts.map((a) => (
        <div key={a.id}>
          <span>
            {a.name} · <code>{a.username}</code>
          </span>{" "}
          <button type="button" className="admin-edit-btn" onClick={() => setEditing(editing === a.id ? null : a.id)}>
            Cambiar usuario o clave
          </button>
          {editing === a.id ? form(a) : null}
        </div>
      ))}
      {accounts.length === 0 ? <p className="statement-note">Todavía no hay cuenta de administradora.</p> : null}
      <button type="button" className="admin-edit-btn" onClick={() => setEditing(editing === "new" ? null : "new")}>
        + Nueva cuenta de administradora
      </button>
      {editing === "new" ? form(null) : null}
      {message ? <span className={message.ok ? "statement-note" : "login-error"}>{message.text}</span> : null}
    </section>
  );
}
