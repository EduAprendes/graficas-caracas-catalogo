import Link from "next/link";
import { auth } from "@/auth";
import { getPurchaseOrders } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const session = await auth();
  const orders = await getPurchaseOrders();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Órdenes de compra</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/compras" />

      <div className="admin-section-actions">
        <Link href="/admin/compras/nueva" className="admin-add-btn admin-add-link">
          + Nueva orden de compra
        </Link>
      </div>

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th className="num">Líneas</th>
              <th className="num">Cant.</th>
              <th>Estado</th>
              <th>Recibida</th>
              <th>Usuario</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="ledger-empty">
                  Todavía no hay órdenes de compra. Creá la primera con &quot;+ Nueva orden de
                  compra&quot;.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="N°">#{order.id}</td>
                  <td data-label="Fecha">{formatDateTime(order.createdAt)}</td>
                  <td data-label="Proveedor">{order.supplierName}</td>
                  <td className="num" data-label="Líneas">{order.itemCount}</td>
                  <td className="num" data-label="Cant.">{order.totalQuantity}</td>
                  <td data-label="Estado">
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td data-label="Recibida">{order.receivedAt ? formatDateTime(order.receivedAt) : "—"}</td>
                  <td data-label="Usuario">{order.userName}</td>
                  <td>
                    <Link href={`/admin/compras/${order.id}`} className="admin-edit-btn">
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
