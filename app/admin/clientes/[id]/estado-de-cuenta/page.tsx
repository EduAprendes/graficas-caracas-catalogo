import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCustomerStatement } from "@/lib/accounts";
import { formatDate, formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const session = await auth();
  const statement = await getCustomerStatement(customerId);
  if (!statement) notFound();

  const { customer } = statement;
  const overdueTotal =
    statement.aging.days31to60 + statement.aging.days61to90 + statement.aging.over90;

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header no-print">
        <div>
          <h1>Estado de cuenta</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <div className="no-print">
        <AdminNav current="/admin/cuentas" />
        <Link href="/admin/cuentas" className="admin-back-link">
          ← Volver a cuentas por cobrar
        </Link>
      </div>

      <section className="order-ticket">
        <header className="order-ticket-head">
          <div>
            <p className="order-ticket-brand">Gráficas Caracas</p>
            <p className="order-ticket-title">Estado de cuenta</p>
          </div>
          <div className="order-ticket-meta">
            <p>
              <strong>Emitido</strong> {formatDateTime(statement.generatedAt)}
            </p>
            <p>
              <strong>Saldo pendiente</strong>{" "}
              <span className={statement.balance > 0 ? "amount-overdue" : undefined}>
                {statement.balance.toFixed(2)}
              </span>
            </p>
          </div>
        </header>

        <div className="order-ticket-fields">
          <p>
            <strong>Cliente</strong> {customer.name}
          </p>
          <p>
            <strong>Empresa</strong> {customer.company ?? "—"}
          </p>
          <p>
            <strong>Teléfono</strong> {customer.phone ?? "—"}
          </p>
          <p>
            <strong>Correo</strong> {customer.email ?? "—"}
          </p>
          <p>
            <strong>Dirección</strong> {customer.address ?? "—"}
          </p>
        </div>

        <div className="admin-summary-row statement-summary">
          <div className="admin-summary-card">
            <span className="admin-summary-label">Total comprado</span>
            <span className="admin-summary-value">{statement.totalSold.toFixed(2)}</span>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">Total pagado</span>
            <span className="admin-summary-value">{statement.totalPaid.toFixed(2)}</span>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">
              {statement.balance < 0 ? "Saldo a favor" : "Saldo pendiente"}
            </span>
            <span
              className={`admin-summary-value${statement.balance > 0 ? " amount-overdue" : ""}`}
            >
              {Math.abs(statement.balance).toFixed(2)}
            </span>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">Vencido (+30 días)</span>
            <span className="admin-summary-value">{overdueTotal.toFixed(2)}</span>
          </div>
        </div>

        {statement.credit > 0 ? (
          <p className="statement-note">
            Este cliente tiene <strong>{statement.credit.toFixed(2)}</strong> pagados de más en:{" "}
            {statement.orders
              .filter((order) => order.overpaid > 0)
              .map((order) => `orden #${order.id} (+${order.overpaid.toFixed(2)})`)
              .join(", ")}
            . Se muestra como saldo a favor y ya está descontado del saldo pendiente.
          </p>
        ) : null}

        <h2 className="statement-heading">Movimientos</h2>
        <div className="admin-table-wrap">
          <table className="order-print-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Detalle</th>
                <th className="num">Cargo</th>
                <th className="num">Abono</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {statement.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ledger-empty">
                    Este cliente todavía no tiene movimientos.
                  </td>
                </tr>
              ) : (
                statement.lines.map((line) => (
                  <tr key={line.key}>
                    <td data-label="Fecha">{formatDateTime(line.date)}</td>
                    <td data-label="Concepto">
                      <Link href={`/admin/pedidos/${line.orderId}`} className="code-link">
                        {line.concept}
                      </Link>
                    </td>
                    <td data-label="Detalle">{line.detail ?? "—"}</td>
                    <td className="num" data-label="Cargo">
                      {line.charge > 0 ? line.charge.toFixed(2) : "—"}
                    </td>
                    <td className="num" data-label="Abono">
                      {line.payment > 0 ? line.payment.toFixed(2) : "—"}
                    </td>
                    <td className="num" data-label="Saldo">{line.balance.toFixed(2)}</td>
                  </tr>
                ))
              )}
              <tr className="order-print-total">
                <td colSpan={3}>Totales</td>
                <td className="num" data-label="Cargo">{statement.totalSold.toFixed(2)}</td>
                <td className="num" data-label="Abono">{statement.totalPaid.toFixed(2)}</td>
                <td className="num" data-label="Saldo">{statement.balance.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {statement.balance > 0 ? (
          <>
            <h2 className="statement-heading">Órdenes con saldo pendiente</h2>
            <div className="admin-table-wrap">
              <table className="order-print-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Fecha</th>
                    <th className="num">Antigüedad</th>
                    <th className="num">Total</th>
                    <th className="num">Pagado</th>
                    <th className="num">Resta por pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.orders
                    .filter((order) => order.balance > 0)
                    .map((order) => (
                      <tr key={order.id}>
                        <td data-label="Orden">#{order.id}</td>
                        <td data-label="Fecha">{formatDate(order.createdAt)}</td>
                        <td className="num" data-label="Antigüedad">{order.ageDays} días</td>
                        <td className="num" data-label="Total">{order.total.toFixed(2)}</td>
                        <td className="num" data-label="Pagado">{order.paid.toFixed(2)}</td>
                        <td className="num" data-label="Resta por pagar">
                          {order.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
        <Link href={`/admin/clientes/${customer.id}`} className="admin-edit-btn">
          Ver ficha del cliente
        </Link>
      </div>
    </div>
  );
}
