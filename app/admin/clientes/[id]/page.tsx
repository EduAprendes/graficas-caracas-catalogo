import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCustomer } from "@/lib/customers";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CONTADO: "Contado",
  CREDITO: "Crédito",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const session = await auth();
  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{customer.name}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/clientes" />

      <Link href="/admin/clientes" className="admin-back-link">
        ← Volver a clientes
      </Link>

      <section className="ledger-head">
        <div>
          <p className="ledger-category">Cliente desde {formatDateTime(customer.createdAt)}</p>
          <h2>{customer.name}</h2>
          <p className="ledger-dimension">
            {customer.phone ?? "Sin teléfono"}
            {customer.notes ? ` · ${customer.notes}` : ""}
          </p>
        </div>
        <div className="ledger-stock">
          <span className="ledger-stock-label">Saldo por cobrar</span>
          <span
            className={`stock-badge stock-badge-lg${customer.creditOutstanding > 0 ? " stock-zero" : ""}`}
          >
            {customer.creditOutstanding.toFixed(2)}
          </span>
        </div>
      </section>

      <p className="admin-inventory-total">
        Total vendido a este cliente: <strong>{customer.totalSold.toFixed(2)}</strong>
      </p>

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Fecha</th>
              <th>Forma de pago</th>
              <th>Estado</th>
              <th className="num">Total</th>
              <th className="num">Pagado</th>
              <th className="num">Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customer.orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="ledger-empty">
                  Este cliente todavía no tiene órdenes de venta.
                </td>
              </tr>
            ) : (
              customer.orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="N°">#{order.id}</td>
                  <td data-label="Fecha">{formatDateTime(order.createdAt)}</td>
                  <td data-label="Forma de pago">
                    {PAYMENT_TYPE_LABELS[order.paymentType] ?? order.paymentType}
                  </td>
                  <td data-label="Estado">
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="num" data-label="Total">{order.total.toFixed(2)}</td>
                  <td className="num" data-label="Pagado">{order.paid.toFixed(2)}</td>
                  <td className="num" data-label="Saldo">
                    {order.balance > 0 ? (
                      <span className="stock-badge stock-zero">{order.balance.toFixed(2)}</span>
                    ) : (
                      "0.00"
                    )}
                  </td>
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
