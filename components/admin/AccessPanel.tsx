"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

export type AccessAccount = {
  /** Clave única en la lista. */
  key: string;
  kind: "ADMINISTRADORA" | "VENDEDORA";
  /** Administradora: id del usuario. Vendedora: id de la vendedora. */
  id: number;
  name: string;
  username: string | null;
  /** Vendedora cancelada: no se puede dar ni cambiar su acceso. */
  cancelled: boolean;
};

type SaveResult = { ok: true } | { error: string };
type Save = (id: number | null, formData: FormData) => Promise<SaveResult>;

type Target = { mode: "edit"; account: AccessAccount } | { mode: "new-admin" };

const ROLE_LABEL: Record<AccessAccount["kind"], string> = {
  ADMINISTRADORA: "Administradora",
  VENDEDORA: "Vendedora",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

// Cuentas con las que se entra al panel: administradoras y vendedoras en una sola lista.
// Solo el administrador principal ve este bloque. La clave nunca se muestra una vez guardada.
export default function AccessPanel({
  accounts,
  saveAdministradora,
  saveVendedora,
}: {
  accounts: AccessAccount[];
  saveAdministradora: Save;
  saveVendedora: (id: number, formData: FormData) => Promise<SaveResult>;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const admins = accounts.filter((a) => a.kind === "ADMINISTRADORA");
  const sellers = accounts.filter((a) => a.kind === "VENDEDORA");

  function row(account: AccessAccount) {
    const hasAccess = account.username != null;
    return (
      <li key={account.key} className={`access-row${account.cancelled ? " is-cancelled" : ""}`}>
        <span className={`access-avatar access-avatar-${account.kind.toLowerCase()}`} aria-hidden="true">
          {initials(account.name)}
        </span>
        <div className="access-main">
          <span className="access-name">{account.name}</span>
          <span className="access-user">
            {hasAccess ? (
              <>
                Usuario: <code>{account.username}</code>
              </>
            ) : (
              "Todavía no puede entrar al panel"
            )}
          </span>
        </div>
        <div className="access-badges">
          <span className={`access-badge access-badge-${account.kind.toLowerCase()}`}>{ROLE_LABEL[account.kind]}</span>
          {account.cancelled ? (
            <span className="access-badge access-badge-off">Cancelada</span>
          ) : hasAccess ? (
            <span className="access-badge access-badge-ok">Acceso activo</span>
          ) : (
            <span className="access-badge access-badge-none">Sin acceso</span>
          )}
        </div>
        <div className="access-actions">
          {account.cancelled ? (
            <span className="access-hint">Reactívala para gestionar su acceso</span>
          ) : (
            <button
              type="button"
              className={hasAccess ? "admin-edit-btn" : "admin-save-btn"}
              onClick={() => {
                setNotice(null);
                setTarget({ mode: "edit", account });
              }}
              aria-label={`${hasAccess ? "Editar acceso de" : "Crear acceso para"} ${account.name}`}
            >
              {hasAccess ? "Editar acceso" : "Crear acceso"}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <section className="access-card" id="accesos" aria-labelledby="access-title">
      <header className="access-head">
        <div>
          <h2 id="access-title" className="access-title">
            Accesos al panel
          </h2>
          <p className="access-sub">Quién puede entrar, con qué usuario y qué puede ver.</p>
        </div>
        <button
          type="button"
          className="admin-save-btn"
          onClick={() => {
            setNotice(null);
            setTarget({ mode: "new-admin" });
          }}
        >
          + Nueva administradora
        </button>
      </header>

      {notice ? (
        <p className="access-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="access-group">
        <h3 className="access-group-title">
          Administradoras
          <span className="access-group-note">Ven todo menos Órdenes de compra, Salud y Balance</span>
        </h3>
        {admins.length === 0 ? (
          <div className="access-empty">
            <p>Todavía no hay una cuenta de administradora.</p>
            <button type="button" className="admin-edit-btn" onClick={() => setTarget({ mode: "new-admin" })}>
              Crear la primera
            </button>
          </div>
        ) : (
          <ul className="access-list">{admins.map(row)}</ul>
        )}
      </div>

      <div className="access-group">
        <h3 className="access-group-title">
          Vendedoras
          <span className="access-group-note">Solo ven el catálogo y sus propias órdenes de venta</span>
        </h3>
        {sellers.length === 0 ? (
          <div className="access-empty">
            <p>Aún no hay vendedoras. Crea una abajo con &quot;+ Nuevo vendedor&quot; y luego dale acceso aquí.</p>
          </div>
        ) : (
          <ul className="access-list">{sellers.map(row)}</ul>
        )}
      </div>

      {target ? (
        <AccessDialog
          key={target.mode === "edit" ? target.account.key : "new-admin"}
          target={target}
          onClose={() => setTarget(null)}
          onSaved={(text) => {
            setTarget(null);
            setNotice(text);
          }}
          saveAdministradora={saveAdministradora}
          saveVendedora={saveVendedora}
        />
      ) : null}
    </section>
  );
}

function AccessDialog({
  target,
  onClose,
  onSaved,
  saveAdministradora,
  saveVendedora,
}: {
  target: Target;
  onClose: () => void;
  onSaved: (message: string) => void;
  saveAdministradora: Save;
  saveVendedora: (id: number, formData: FormData) => Promise<SaveResult>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const account = target.mode === "edit" ? target.account : null;
  const isSeller = account?.kind === "VENDEDORA";
  const isNew = account == null || account.username == null;
  // El usuario de una vendedora no se puede renombrar (lo decide el servidor al crearlo).
  const usernameLocked = isSeller && account?.username != null;

  const title = isNew
    ? isSeller
      ? `Crear acceso para ${account!.name}`
      : "Nueva cuenta de administradora"
    : `Editar acceso de ${account!.name}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = isSeller
        ? await saveVendedora(account!.id, data)
        : await saveAdministradora(account ? account.id : null, data);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const who = account?.name ?? (String(data.get("name") || "").trim() || "la administradora");
      onSaved(isNew ? `Acceso creado para ${who}. Ya puede entrar con su usuario y clave.` : `Acceso de ${who} actualizado.`);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="access-dialog"
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <form className="access-form" onSubmit={handleSubmit}>
        <h2 id={`${uid}-title`} className="access-form-title">
          {title}
        </h2>

        {!isSeller ? (
          <div className="access-field">
            <label htmlFor={`${uid}-name`}>Nombre</label>
            <input
              id={`${uid}-name`}
              name="name"
              className="admin-input"
              defaultValue={account?.name ?? ""}
              placeholder="Ej: María Pérez"
              autoComplete="off"
            />
            <span className="access-field-hint">Es el nombre que se muestra arriba a la derecha al iniciar sesión.</span>
          </div>
        ) : null}

        <div className="access-field">
          <label htmlFor={`${uid}-user`}>Usuario</label>
          <input
            id={`${uid}-user`}
            name="username"
            className="admin-input"
            defaultValue={account?.username ?? ""}
            placeholder="Ej: maria.perez"
            readOnly={usernameLocked}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-describedby={`${uid}-user-hint`}
          />
          <span id={`${uid}-user-hint`} className="access-field-hint">
            {usernameLocked
              ? "El usuario de una vendedora no se puede cambiar; sí su clave."
              : "De 3 a 30 caracteres: letras minúsculas, números, punto o guion."}
          </span>
        </div>

        <div className="access-field">
          <label htmlFor={`${uid}-pass`}>{isNew || isSeller ? "Clave" : "Clave nueva"}</label>
          <div className="access-password">
            <input
              id={`${uid}-pass`}
              name="password"
              type={showPassword ? "text" : "password"}
              className="admin-input"
              minLength={isNew || isSeller ? 8 : undefined}
              required={isNew || isSeller}
              autoComplete="new-password"
              aria-describedby={`${uid}-pass-hint`}
            />
            <button
              type="button"
              className="access-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <span id={`${uid}-pass-hint`} className="access-field-hint">
            {isNew || isSeller
              ? "Mínimo 8 caracteres. Después de guardarla no se vuelve a mostrar."
              : "Déjala vacía para no cambiarla. Si escribes una, mínimo 8 caracteres."}
          </span>
        </div>

        {error ? (
          <p className="access-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="access-form-actions">
          <button type="button" className="admin-cancel-btn" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="admin-save-btn" disabled={isPending}>
            {isPending ? "Guardando…" : isNew ? "Crear acceso" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
