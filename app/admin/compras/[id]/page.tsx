import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPurchaseOrder } from "@/lib/orders";
import { getPurchaseCosting } from "@/lib/finance";
import { PurchaseExpenseForm, PurchasePaymentForm } from "@/components/admin/ExpenseForms";
import VoidButton from "@/components/admin/VoidButton";
import {
  addPurchaseExpenseAction,
  addPurchasePaymentAction,
  voidPurchaseExpenseAction,
  voidPurchasePaymentAction,
} from "@/app/admin/gastos/actions";
import { formatDate, formatDateTime } from "@/lib/format";
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
  const costing = await getPurchaseCosting(orderId);
  const usd = (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

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
                  <td className="num" data-label="Subtotal">
                    {item.cost != null ? (item.cost * item.quantity).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td data-label="Producto">Total de piezas</td>
                <td className="num" data-label="Cantidad">{totalQuantity}</td>
                <td></td>
                <td className="num" data-label="Subtotal">{totalCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {order.status !== "ANULADA" ? (
        <section className="no-print">
          <h2 className="statement-heading">Costos y ganancia del contenedor (en $)</h2>
          <div className="admin-summary-row">
            <div className="admin-summary-card dash-card-info">
              <span className="admin-summary-label">Factura</span>
              <span className="admin-summary-value">{usd(costing.invoiceTotal)}</span>
            </div>
            <div className="admin-summary-card dash-card-warn">
              <span className="admin-summary-label">Gastos del contenedor</span>
              <span className="admin-summary-value">{usd(costing.expensesTotal)}</span>
            </div>
            <div className="admin-summary-card">
              <span className="admin-summary-label">Costo total</span>
              <span className="admin-summary-value">{usd(costing.totalCost)}</span>
            </div>
            <div className="admin-summary-card dash-card-total">
              <span className="admin-summary-label">Venta esperada</span>
              <span className="admin-summary-value">{usd(costing.expectedSale)}</span>
            </div>
            <div
              className={`admin-summary-card ${costing.expectedProfit >= 0 ? "dash-card-ok" : "dash-card-danger"}`}
            >
              <span className="admin-summary-label">Ganancia esperada</span>
              <span className="admin-summary-value">{usd(costing.expectedProfit)}</span>
            </div>
          </div>
          <p className="statement-note">
            Venta esperada = piezas × precio de venta actual de cada producto. Los gastos se reparten
            entre los productos en proporción a su costo de factura, y ese costo real es el que se usa
            para calcular las ganancias del mes.
            {costing.itemsWithoutCost > 0
              ? ` Hay ${costing.itemsWithoutCost} producto(s) sin costo de factura: no entran en el reparto.`
              : ""}
          </p>

          <div className="seller-pay-box">
            <PurchaseExpenseForm onAdd={addPurchaseExpenseAction.bind(null, order.id)} />
          </div>

          {costing.expenses.length > 0 ? (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th className="num">Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {costing.expenses.map((e) => (
                    <tr key={e.id} className={e.void ? "row-voided" : undefined}>
                      <td data-label="Concepto">
                        <span className={e.void ? "voided-amount" : undefined}>{e.concept}</span>
                        {e.void ? (
                          <span className="void-note">
                            Anulado el {formatDateTime(e.void.voidedAt)}
                            {e.void.voidedByName ? ` por ${e.void.voidedByName}` : ""}
                            {e.void.voidReason ? ` · motivo: ${e.void.voidReason}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="num" data-label="Monto">
                        <span className={e.void ? "voided-amount" : undefined}>{usd(e.amount)}</span>
                      </td>
                      <td>
                        {e.void ? null : (
                          <VoidButton
                            what="gasto"
                            onVoid={voidPurchaseExpenseAction.bind(null, order.id, e.id)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <h2 className="statement-heading">Pagos de esta orden (en $)</h2>
          <div className="admin-summary-row">
            <div className="admin-summary-card">
              <span className="admin-summary-label">Costo total a pagar</span>
              <span className="admin-summary-value">{usd(costing.totalCost)}</span>
            </div>
            <div className="admin-summary-card dash-card-ok">
              <span className="admin-summary-label">Pagado</span>
              <span className="admin-summary-value">{usd(costing.paidTotal)}</span>
            </div>
            <div
              className={`admin-summary-card ${costing.balance > 0 ? "dash-card-warn" : "dash-card-ok"}`}
            >
              <span className="admin-summary-label">
                {costing.totalCost <= 0
                  ? "Sin costo cargado"
                  : costing.balance > 0
                    ? "Pendiente por pagar"
                    : "Orden pagada"}
              </span>
              <span className="admin-summary-value">{usd(costing.balance)}</span>
            </div>
          </div>
          {costing.overpaid > 0 ? (
            <p className="statement-note">
              Se ha pagado {usd(costing.overpaid)} más que el costo actual de la orden (el costo se
              corrigió a la baja o falta un gasto por cargar).
            </p>
          ) : null}
          <p className="statement-note">
            El costo total a pagar es la factura más los gastos del contenedor. Registra cada pago
            a medida que lo haces, igual que los abonos de los clientes. Los pagos y los gastos no se
            borran: si hay un error se anulan con un motivo y quedan en el historial, sin contar en
            el saldo.
          </p>

          {costing.totalCost <= 0 ? (
            <p className="statement-note">
              Esta orden aún no tiene costo. Pulsa &quot;Editar&quot;, carga el costo unitario de los
              productos (o el total de la factura con &quot;Repartir entre los productos&quot;) y
              agrega los gastos del contenedor; entonces podrás registrar pagos aquí.
            </p>
          ) : null}

          {costing.balance > 0 ? (
            <div className="seller-pay-box">
              <PurchasePaymentForm
                maxAmount={costing.balance}
                defaultDate={today}
                onAdd={addPurchasePaymentAction.bind(null, order.id)}
              />
            </div>
          ) : null}

          {costing.payments.length > 0 ? (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="num">Monto</th>
                    <th>Notas</th>
                    <th>Registrado por</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {costing.payments.map((p) => (
                    <tr key={p.id} className={p.void ? "row-voided" : undefined}>
                      <td data-label="Fecha">{formatDate(p.paidAt)}</td>
                      <td className="num" data-label="Monto">
                        <span className={p.void ? "voided-amount" : undefined}>{usd(p.amount)}</span>
                      </td>
                      <td data-label="Notas" className={p.notes || p.void ? undefined : "card-hide"}>
                        {p.notes ?? "—"}
                        {p.void ? (
                          <span className="void-note">
                            ANULADO el {formatDateTime(p.void.voidedAt)}
                            {p.void.voidedByName ? ` por ${p.void.voidedByName}` : ""}
                            {p.void.voidReason ? ` · motivo: ${p.void.voidReason}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td data-label="Registrado por">{p.userName}</td>
                      <td>
                        {p.void ? null : (
                          <VoidButton
                            what="pago"
                            onVoid={voidPurchasePaymentAction.bind(null, order.id, p.id)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="statement-note">Todavía no hay pagos registrados en esta orden.</p>
          )}
        </section>
      ) : null}

      <div className="order-form-actions no-print">
        <PrintButton />
        {order.status !== "ANULADA" ? (
          <Link href={`/admin/compras/${order.id}/almacen`} className="admin-edit-btn">
            Lista para almacén (sin precios)
          </Link>
        ) : null}
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
