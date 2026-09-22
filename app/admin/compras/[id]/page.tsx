import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPurchaseOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import ConfirmActionButton from "@/components/admin/ConfirmActionButton";
import { logoutAction } from "@/app/admin/actions";
import { cancelPurchaseOrderAction, receivePurchaseOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const session = await auth();
  const order = await getPurchaseOrder(orderId);
  if (!order) notFound();

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = order.items.reduce(
    (sum, item) => sum + (item.cost != null ? item.cost * item.quantity : 0),
    0
  );

  return (
    <div className="admin-page">
      <div className="admin-header no-print">
        <div>
          <h1>Orden de compra #{order.id}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <div className="no-print">
        <AdminNav current="/admin/compras" />
        <Link href="/admin/compras" className="admin-back-link">
          ← Volver a órdenes de compra
        </Link>
      </div>

      <section className="order-ticket">
        <header className="order-ticket-head">
          <div>
            <p className="order-ticket-brand">Gráficas Caracas</p>
            <p className="order-ticket-title">Orden de compra / reposición</p>
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
            <strong>Proveedor</strong> {order.supplierName}
          </p>
          <p>
            <strong>Creada por</strong> {order.userName}
          </p>
          <p>
            <strong>Recibida</strong> {order.receivedAt ? formatDateTime(order.receivedAt) : "—"}
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
                <th>Producto</th>
                <th className="num">Cantidad</th>
                <th className="num">Costo unitario</th>
                <th className="num">Precio sugerido</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Producto">
                    <span className="code">{item.productCode}</span> {item.productDescription}
                  </td>
                  <td className="num" data-label="Cantidad">{item.quantity}</td>
                  <td className="num" data-label="Costo unitario">
                    {item.cost != null ? item.cost.toFixed(2) : "—"}
                  </td>
                  <td className="num" data-label="Precio sugerido">
                    {item.suggestedPrice != null ? item.suggestedPrice.toFixed(2) : "—"}
                  </td>
                  <td className="num" data-label="Subtotal">
                    {item.cost != null ? (item.cost * item.quantity).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td data-label="Producto">Total de piezas</td>
                <td className="num" data-label="Cantidad">{totalQuantity}</td>
                <td colSpan={2}></td>
                <td className="num" data-label="Subtotal">{totalCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
        {order.status !== "ANULADA" ? (
          <Link href={`/admin/compras/${order.id}/editar`} className="admin-edit-btn">
            Editar
          </Link>
        ) : null}
        {order.status === "PENDIENTE" ? (
          <ConfirmActionButton
            label="Marcar recibida"
            pendingLabel="Recibiendo…"
            confirmMessage="¿Marcar esta orden como recibida? Esto suma el stock de todos los productos al inventario."
            className="admin-save-btn"
            action={receivePurchaseOrderAction.bind(null, order.id)}
          />
        ) : null}
        {order.status !== "ANULADA" ? (
          <ConfirmActionButton
            label="Anular orden"
            pendingLabel="Anulando…"
            confirmMessage={
              order.status === "RECIBIDA"
                ? "¿Anular esta orden de compra ya recibida? Esto resta del stock todo lo que esta orden había sumado."
                : "¿Anular esta orden de compra? No se podrá recibir."
            }
            className="admin-delete-btn"
            action={cancelPurchaseOrderAction.bind(null, order.id)}
          />
        ) : null}
      </div>
    </div>
  );
}
