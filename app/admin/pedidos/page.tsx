import Link from "next/link";
import { auth } from "@/auth";
import { getSalesOrders } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function SalesOrdersPage() {
  const session = await auth();
  const orders = await getSalesOrders();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Órdenes de venta</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/pedidos" />

      <div className="admin-section-actions">
        <Link href="/admin/pedidos/nueva" className="admin-add-btn admin-add-link">
          + Nueva orden de venta
        </Link>
      </div>

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Plotter</th>
              <th className="num">Líneas</th>
              <th className="num">Cant.</th>
              <th>Estado</th>
              <th>Usuario</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="ledger-empty">
                  Todavía no hay órdenes de venta. Creá la primera con &quot;+ Nueva orden de
                  venta&quot;.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{order.customerName}</td>
                  <td>{order.plotter ?? "—"}</td>
                  <td className="num">{order.itemCount}</td>
                  <td className="num">{order.totalQuantity}</td>
                  <td>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.userName}</td>
                  <td>
                    <Link href={`/admin/pedidos/${order.id}`} className="admin-edit-btn">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
