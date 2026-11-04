import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCustomer } from "@/lib/customers";
import { caracasYearMonth, formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import AddPaymentForm from "@/components/admin/AddPaymentForm";
import { addCustomerPaymentAction } from "@/app/admin/pedidos/actions";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CONTADO: "Contado",
  CREDITO: "Crédito",
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const { id } = await params;
  const { anio, mes } = await searchParams;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const session = await auth();
  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  // Por defecto: el año en curso, todos los meses.
  const currentYear = caracasYearMonth(new Date()).year;
  const yearFilter = anio === "todos" ? null : Number(anio) || currentYear;
  const monthFilter = Number(mes) >= 1 && Number(mes) <= 12 ? Number(mes) : null;

  const years = Array.from(
    new Set([currentYear, ...customer.orders.map((o) => caracasYearMonth(o.createdAt).year)])
  ).sort((a, b) => b - a);

  const visibleOrders = customer.orders.filter((order) => {
    const { year, month } = caracasYearMonth(order.createdAt);
    return (yearFilter == null || year === yearFilter) && (monthFilter == null || month === monthFilter);
  });
  const confirmed = visibleOrders.filter((o) => o.status === "CONFIRMADA");
  const periodSold = confirmed.reduce((sum, o) => sum + o.total, 0);
  const periodPaid = confirmed.reduce((sum, o) => sum + o.paid, 0);
  const periodBalance = confirmed.reduce((sum, o) => sum + o.balance, 0);
  const periodLabel = [
    monthFilter ? MONTHS[monthFilter - 1] : "Todo el año",
    yearFilter ?? "todos los años",
  ].join(" · ");
  const isDefaultFilter = yearFilter === currentYear && monthFilter == null;

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
          <h2>
            {customer.name}
            {customer.cancelled ? <span className="status-badge status-anulada"> Cancelado</span> : null}
          </h2>
          {customer.company ? <p className="ledger-dimension">{customer.company}</p> : null}
          <p className="ledger-dimension">
            {[customer.phone ?? "Sin teléfono", customer.email, customer.address]
              .filter(Boolean)
              .join(" · ")}
            {customer.notes ? ` · ${customer.notes}` : ""}
          </p>
        </div>
        <div className="ledger-stock">
          <span className="ledger-stock-label">
            {customer.creditBalance > 0 ? "Saldo a favor" : "Saldo por cobrar"}
          </span>
          <span
            className={`stock-badge stock-badge-lg${customer.creditOutstanding > 0 ? " stock-zero" : ""}`}
          >
            {(customer.creditBalance > 0
              ? customer.creditBalance
              : customer.creditOutstanding
            ).toFixed(2)}
          </span>
        </div>
      </section>

      <p className="admin-inventory-total">
        Total vendido a este cliente: <strong>{customer.totalSold.toFixed(2)}</strong>{" "}
        <Link href={`/admin/clientes/${customer.id}/estado-de-cuenta`} className="admin-edit-btn">
          Estado de cuenta
        </Link>
      </p>

      {customer.creditOutstanding > 0 ? (
        <section>
          <h3>Registrar abono general</h3>
          <p className="ledger-dimension">
            Se reparte entre las órdenes a crédito con saldo, de la más antigua a la más nueva.
          </p>
          <AddPaymentForm
            maxAmount={customer.creditOutstanding}
            onAddPayment={addCustomerPaymentAction.bind(null, customer.id)}
          />
        </section>
      ) : null}

      <form className="admin-form seller-range-form" method="get">
        <label className="admin-field admin-field-sm">
          Año
          <select name="anio" defaultValue={yearFilter == null ? "todos" : String(yearFilter)} className="admin-input">
            <option value="todos">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field-sm">
          Mes
          <select name="mes" defaultValue={monthFilter ? String(monthFilter) : ""} className="admin-input">
            <option value="">Todo el año</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-save-btn">
          Filtrar
        </button>
        {!isDefaultFilter ? (
          <Link href={`/admin/clientes/${customer.id}`} className="admin-cancel-btn">
            Año en curso
          </Link>
        ) : null}
      </form>

      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-label">Vendido · {periodLabel}</span>
          <span className="admin-summary-value">{periodSold.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Pagado en ese período</span>
          <span className="admin-summary-value">{periodPaid.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Saldo de esas órdenes</span>
          <span className="admin-summary-value">{periodBalance.toFixed(2)}</span>
        </div>
      </div>

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
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="ledger-empty">
                  {customer.orders.length === 0
                    ? "Este cliente todavía no tiene órdenes de venta."
                    : "No hay órdenes en este período."}
                </td>
              </tr>
            ) : (
              visibleOrders.map((order) => (
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
