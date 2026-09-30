import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { unsubscribeAction } from "./actions";

export const dynamic = "force-dynamic";

// Página pública (fuera de /admin) a la que llega el cliente desde el enlace del correo.
// La baja se hace con un botón (POST) y no al abrir el enlace, porque los filtros de
// correo abren los enlaces automáticamente y darían de baja a todos.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; t?: string; listo?: string }>;
}) {
  const { c, t, listo } = await searchParams;
  const customerId = Number(c);
  const valid = Number.isInteger(customerId) && Boolean(t) && verifyUnsubscribeToken(customerId, t!);

  const customer = valid
    ? await prisma.customer.findUnique({ where: { id: customerId }, select: { marketingOptOut: true } })
    : null;

  return (
    <div className="admin-page" style={{ maxWidth: 480 }}>
      <h1>Promociones de Gráficas Caracas</h1>
      {!valid || !customer ? (
        <p className="login-error">Este enlace no es válido.</p>
      ) : listo || customer.marketingOptOut ? (
        <p className="statement-note">
          Listo: ya no recibirás promociones por correo. Los avisos de tus órdenes y pagos
          seguirán llegando.
        </p>
      ) : (
        <form action={unsubscribeAction} className="admin-form">
          <input type="hidden" name="c" value={customerId} />
          <input type="hidden" name="t" value={t} />
          <p>¿Quieres dejar de recibir promociones por correo?</p>
          <button type="submit" className="admin-save-btn">
            Sí, darme de baja
          </button>
        </form>
      )}
    </div>
  );
}
