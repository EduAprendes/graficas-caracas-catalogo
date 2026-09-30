import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getSalesOrder } from "@/lib/orders";
import { getAccessUser } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import ConfirmActionButton from "@/components/admin/ConfirmActionButton";
import AddPaymentForm from "@/components/admin/AddPaymentForm";
import { logoutAction } from "@/app/admin/actions";
import ResendOrderEmailButton, {
  EMAIL_STATUS_MESSAGES,
} from "@/components/admin/ResendOrderEmailButton";
import {
  addSalesOrderPaymentAction,
  cancelSalesOrderAction,
  resendSalesOrderEmailAction,
} from "../actions";

export const dynamic = "force-dynamic";

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  TIENDA: "Recogido en tienda",
  DESPACHADO: "Despachado",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CONTADO: "Contado",
  CREDITO: "Crédito",
};

export default async function SalesOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ correo?: string }>;
}) {
  const { id } = await params;
  const { correo } = await searchParams;
  const emailNotice =
    correo && correo in EMAIL_STATUS_MESSAGES
      ? { text: EMAIL_STATUS_MESSAGES[correo as keyof typeof EMAIL_STATUS_MESSAGES], ok: correo === "sent" }
      : null;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const session = await auth();
  const access = await getAccessUser();
  const isSeller = access?.role === "VENDEDOR";
  const order = await getSalesOrder(orderId);
  if (!order) notFound();
  // Una vendedora solo puede abrir sus propias órdenes.
  if (isSeller && order.sellerId !== access?.sellerId) notFound();

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

      {!isSeller && emailNotice ? (
        <p className={`no-print ${emailNotice.ok ? "statement-note" : "login-error"}`}>
          {emailNotice.text}
        </p>
      ) : null}

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
            <strong>Entrega</strong>{" "}
            {DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType}
          </p>
          {!isSeller && order.paymentType === "CREDITO" ? (
            <p>
              <strong>Recordatorio de cobranza</strong>{" "}
              {order.collectionEmailSentAt
                ? `enviado el ${formatDateTime(order.collectionEmailSentAt)}`
                : "pendiente (se envía automáticamente al cumplirse el plazo si queda saldo)"}
            </p>
          ) : null}
          <p>
            <strong>Vendedor</strong>{" "}
            {order.sellerName
              ? `${order.sellerName} (${order.commissionPercent ?? 0}% · comisión ${order.commissionAmount.toFixed(2)})`
              : "Tienda"}
          </p>
          <p>
            <strong>Dirección</strong> {order.deliveryAddress || "—"}
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
                <th>Descripción</th>
                <th className="num">Precio unit.</th>
                <th className="num">Desc.</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="num" data-label="Cant">{item.quantity}</td>
                  <td data-label="Descripción">
                    {item.description}
                    <span className="order-print-code"> ({item.productCode})</span>
                  </td>
                  <td className="num" data-label="Precio unit.">
                    {item.unitPrice != null ? item.unitPrice.toFixed(2) : "—"}
                  </td>
                  <td className="num" data-label="Desc.">
                    {item.discountPercent > 0 ? item.discountPercent + "%" : "—"}
                  </td>
                  <td className="num" data-label="Subtotal">
                    {item.unitPrice != null ? item.lineTotal.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td className="num" data-label="Cant">{totalQuantity}</td>
                <td colSpan={3}>Total de piezas</td>
                <td className="num" data-label="Subtotal">{order.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {!isSeller && order.paymentType === "CREDITO" ? (
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
            <AddPaymentForm
              onAddPayment={addSalesOrderPaymentAction.bind(null, order.id)}
              maxAmount={order.balance}
            />
          ) : null}
        </section>
      ) : null}

      <div className="order-form-actions no-print">
        <PrintButton />
        {!isSeller ? (
          <ResendOrderEmailButton onResend={resendSalesOrderEmailAction.bind(null, order.id)} />
        ) : null}
        {!isSeller && order.status === "CONFIRMADA" ? (
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
