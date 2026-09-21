import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getSalesOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import ConfirmActionButton from "@/components/admin/ConfirmActionButton";
import AddPaymentForm from "@/components/admin/AddPaymentForm";
import { logoutAction } from "@/app/admin/actions";
import { addSalesOrderPaymentAction, cancelSalesOrderAction } from "../actions";

export const dynamic = "force-dynamic";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CONTADO: "Contado",
  CREDITO: "Crédito",
};

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
            <strong>Cliente</strong>{" "}
            {order.customerId ? (
              <Link href={`/admin/clientes/${order.customerId}`} className="code-link">
                {order.customerName}
              </Link>
            ) : (
              order.customerName
            )}
          </p>
          <p>
            <strong>Forma de pago</strong>{" "}
            {PAYMENT_TYPE_LABELS[order.paymentType] ?? order.paymentType}
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
                <th className="num">Precio unit.</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="num" data-label="Cant">{item.quantity}</td>
                  <td data-label="Material">{item.material ?? "—"}</td>
                  <td data-label="Tipo">{item.tipo ?? "—"}</td>
                  <td data-label="Reverso">{item.reverso ?? "—"}</td>
                  <td data-label="Acabado">{item.acabado ?? "—"}</td>
                  <td className="num" data-label="Ancho">{item.ancho ?? "—"}</td>
                  <td className="num" data-label="Alto">{item.alto ?? "—"}</td>
                  <td className="num" data-label="M²">{item.m2 ?? "—"}</td>
                  <td data-label="Descripción">
                    {item.description}
                    <span className="order-print-code"> ({item.productCode})</span>
                  </td>
                  <td className="num" data-label="Precio unit.">
                    {item.unitPrice != null ? item.unitPrice.toFixed(2) : "—"}
                  </td>
                  <td className="num" data-label="Subtotal">
                    {item.unitPrice != null ? (item.unitPrice * item.quantity).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td className="num" data-label="Cant">{totalQuantity}</td>
                <td colSpan={9}>Total de piezas</td>
                <td className="num" data-label="Subtotal">{order.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {order.paymentType === "CREDITO" ? (
        <section className="order-ticket no-print">
          <header className="order-ticket-head">
            <div>
              <p className="order-ticket-title">Cobranza (crédito)</p>
            </div>
            <div className="order-ticket-meta">
              <p>
                <strong>Total</strong> {order.total.toFixed(2)}
              </p>
              <p>
                <strong>Pagado</strong> {order.paid.toFixed(2)}
              </p>
              <p>
                <strong>Saldo</strong>{" "}
                <span className={order.balance > 0 ? "stock-badge stock-zero" : "stock-badge"}>
                  {order.balance.toFixed(2)}
                </span>
              </p>
            </div>
          </header>

          {order.payments.length > 0 ? (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="num">Monto</th>
                    <th>Notas</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td data-label="Fecha">{formatDateTime(payment.createdAt)}</td>
                      <td className="num" data-label="Monto">{payment.amount.toFixed(2)}</td>
                      <td data-label="Notas">{payment.notes ?? "—"}</td>
                      <td data-label="Usuario">{payment.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ledger-empty">Todavía no se registraron abonos.</p>
          )}

          {order.status === "CONFIRMADA" && order.balance > 0 ? (
            <AddPaymentForm onAddPayment={addSalesOrderPaymentAction.bind(null, order.id)} />
          ) : null}
        </section>
      ) : null}

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
