import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="login-page">
      <form className="login-card" action={loginAction}>
        <h1>Gráficas Caracas</h1>
        <p className="login-subtitle">Acceso al inventario</p>

        <input type="hidden" name="callbackUrl" value={params.callbackUrl || "/admin"} />

        {params.error ? (
          <p className="login-error">Usuario o contraseña incorrectos.</p>
        ) : null}

        <label>
          Usuario
          <input type="text" name="username" autoComplete="username" required autoFocus />
        </label>

        <label>
          Contraseña
          <input type="password" name="password" autoComplete="current-password" required />
        </label>

        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}
