import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getSalesOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import ConfirmActionButton from "@/components/admin/ConfirmActionButton";
import { logoutAction } from "@/app/admin/actions";
import { cancelSalesOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const session = await auth();
  const order = await getSalesOrder(orderId);
  if (!order) notFound();

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="admin-page">
      <div className="admin-header no-print">
        <div>
          <h1>Orden de venta #{order.id}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <div className="no-print">
        <AdminNav current="/admin/pedidos" />
        <Link href="/admin/pedidos" className="admin-back-link">
          ← Volver a órdenes de venta
        </Link>
      </div>

      <section className="order-ticket">
        <header className="order-ticket-head">
          <div>
            <p className="order-ticket-brand">Gráficas Caracas</p>
            <p className="order-ticket-title">Orden de venta</p>
          </div>
          <div className="order-ticket-meta">
            <p>
              <strong>N°</strong> {order.id}
            </p>
            <p>
              <strong>Fecha</strong> {formatDateTime(order.createdAt)}
            </p>
            <p>
              <strong>Estado</strong>{" "}
              <span className={`status-badge status-${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </p>
          </div>
        </header>

        <div className="order-ticket-fields">
          <p>
            <strong>Cliente</strong> {order.customerName}
          </p>
          <p>
            <strong>Plotter</strong> {order.plotter || "—"}
          </p>
          <p>
            <strong>Atendió</strong> {order.userName}
          </p>
        </div>

        {order.notes ? (
          <p className="order-ticket-notes">
            <strong>Notas</strong> {order.notes}
          </p>
        ) : null}

        <div className="admin-table-wrap">
          <table className="order-print-table">
            <thead>
              <tr>
                <th className="num">Cant</th>
                <th>Material</th>
                <th>Tipo</th>
                <th>Reverso</th>
                <th>Acabado</th>
                <th className="num">Ancho</th>
                <th className="num">Alto</th>
                <th className="num">M²</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="num">{item.quantity}</td>
                  <td>{item.material ?? "—"}</td>
                  <td>{item.tipo ?? "—"}</td>
                  <td>{item.reverso ?? "—"}</td>
                  <td>{item.acabado ?? "—"}</td>
                  <td className="num">{item.ancho ?? "—"}</td>
                  <td className="num">{item.alto ?? "—"}</td>
                  <td className="num">{item.m2 ?? "—"}</td>
                  <td>
                    {item.description}
                    <span className="order-print-code"> ({item.productCode})</span>
                  </td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td className="num">{totalQuantity}</td>
                <td colSpan={8}>Total de piezas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
        {order.status === "CONFIRMADA" ? (
          <ConfirmActionButton
            label="Anular orden"
            pendingLabel="Anulando…"
            confirmMessage="¿Anular esta orden? Esto repone el stock descontado a los productos del catálogo que tenía asignados."
            className="admin-delete-btn"
            action={cancelSalesOrderAction.bind(null, order.id)}
          />
        ) : null}
      </div>
    </div>
  );
}
