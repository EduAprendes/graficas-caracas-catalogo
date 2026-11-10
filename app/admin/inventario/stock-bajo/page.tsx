import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessUser } from "@/lib/access";
import { getStockAlerts, LOW_STOCK_RATIO } from "@/lib/stock-alerts";
import { formatDate } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  const access = await getAccessUser();
  if ((!access || access.role === "VENDEDOR")) notFound();

  const session = await auth();
  const { alerts, withoutReference } = await getStockAlerts();
  const limit = Math.round(LOW_STOCK_RATIO * 100);
  const soldOut = alerts.filter((a) => a.stock <= 0).length;

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header">
        <div>
          <h1>Stock bajo</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/inventario" />

      <Link href="/admin/inventario" className="admin-back-link">
        ← Volver al inventario
      </Link>

      <p className="statement-note">
        Productos cuyo stock actual es igual o menor al {limit} % de lo que llegó en su última orden
        de compra recibida.
        {withoutReference > 0
          ? ` ${withoutReference} producto(s) no tienen ninguna orden de compra recibida, así que no se pueden evaluar.`
          : ""}
      </p>

      <div className="admin-summary-row">
        <div className="admin-summary-card dash-card-danger">
          <span className="admin-summary-label">Productos en alerta</span>
          <span className="admin-summary-value">{alerts.length}</span>
        </div>
        <div className="admin-summary-card dash-card-warn">
          <span className="admin-summary-label">Agotados</span>
          <span className="admin-summary-value">{soldOut}</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="dash-empty">Ningún producto está por debajo del {limit} %. Todo en orden.</p>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="num">Stock actual</th>
                <th className="num">Última recepción</th>
                <th>Orden de compra</th>
                <th className="num">Queda</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.productId}>
                  <td data-label="Producto">
                    <Link href={`/admin/productos/${a.productId}`} className="code code-link">
                      {a.code}
                    </Link>{" "}
                    {a.description}
                    {a.dimension ? <small className="void-note">{a.dimension}</small> : null}
                  </td>
                  <td data-label="Categoría">
                    <Link href={`/admin/inventario/${a.categoryId}`} className="code-link">
                      {a.categoryTitle}
                    </Link>
                  </td>
                  <td className="num" data-label="Stock actual">
                    <span className={`stock-badge${a.stock <= 0 ? " stock-zero" : ""}`}>{a.stock}</span>
                  </td>
                  <td className="num" data-label="Última recepción">{a.reference}</td>
                  <td data-label="Orden de compra">
                    <Link href={`/admin/compras/${a.referenceOrderId}`} className="code-link">
                      #{a.referenceOrderId}
                    </Link>{" "}
                    <small className="void-note">{formatDate(a.referenceDate)}</small>
                  </td>
                  <td className="num" data-label="Queda">
                    <span className={a.percent === 0 ? "amount-overdue" : undefined}>{a.percent} %</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
