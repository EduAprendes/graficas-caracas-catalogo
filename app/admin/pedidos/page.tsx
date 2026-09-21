import Link from "next/link";
import { auth } from "@/auth";
import { getSalesOrders } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CONTADO: "Contado",
  CREDITO: "Crédito",
};

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
              <th className="num">Total</th>
              <th>Pago</th>
              <th className="num">Saldo</th>
              <th>Estado</th>
              <th>Usuario</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={12} className="ledger-empty">
                  Todavía no hay órdenes de venta. Creá la primera con &quot;+ Nueva orden de
                  venta&quot;.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="N°">#{order.id}</td>
                  <td data-label="Fecha">{formatDateTime(order.createdAt)}</td>
                  <td data-label="Cliente">{order.customerName}</td>
                  <td data-label="Plotter">{order.plotter ?? "—"}</td>
                  <td className="num" data-label="Líneas">{order.itemCount}</td>
                  <td className="num" data-label="Cant.">{order.totalQuantity}</td>
                  <td className="num" data-label="Total">{order.totalAmount.toFixed(2)}</td>
                  <td data-label="Pago">{PAYMENT_TYPE_LABELS[order.paymentType] ?? order.paymentType}</td>
                  <td className="num" data-label="Saldo">
                    {order.balance > 0 ? (
                      <span className="stock-badge stock-zero">{order.balance.toFixed(2)}</span>
                    ) : (
                      "0.00"
                    )}
                  </td>
                  <td data-label="Estado">
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td data-label="Usuario">{order.userName}</td>
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
