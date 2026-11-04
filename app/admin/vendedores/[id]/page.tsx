import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getSellerDetail, getSellerLedger } from "@/lib/sellers";
import { caracasRange, caracasYearMonth, formatDateTime } from "@/lib/format";
import AddPaymentForm from "@/components/admin/AddPaymentForm";
import { addSellerPaymentAction } from "@/app/admin/vendedores/actions";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function SellerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const { id } = await params;
  const { anio, mes } = await searchParams;
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId)) notFound();

  // Por defecto: el mes en curso (hora de Caracas).
  const now = caracasYearMonth(new Date());
  const yearFilter = anio === "todos" ? null : Number(anio) || now.year;
  let monthFilter: number | null = null;
  if (yearFilter != null) {
    if (mes === "todo") monthFilter = null;
    else if (Number(mes) >= 1 && Number(mes) <= 12) monthFilter = Number(mes);
    else monthFilter = anio ? null : now.month;
  }
  const range = yearFilter == null ? {} : caracasRange(yearFilter, monthFilter);

  const session = await auth();
  const [detail, ledger] = await Promise.all([
    getSellerDetail(sellerId, range),
    getSellerLedger(sellerId),
  ]);
  if (!detail) notFound();

  const { seller } = detail;
  const isDefaultFilter = yearFilter === now.year && monthFilter === now.month;
  const years = Array.from(new Set([now.year, ...ledger.months.map((m) => m.year)])).sort(
    (x, y) => y - x
  );
  const inPeriod = (year: number, month: number) =>
    (yearFilter == null || year === yearFilter) && (monthFilter == null || month === monthFilter);
  const periodMonths = ledger.months.filter((m) => inPeriod(m.year, m.month));
  const periodPaid = periodMonths.reduce((sum, m) => sum + m.paid, 0);
  const periodPending = periodMonths.reduce((sum, m) => sum + m.pending, 0);
  const periodPayments = ledger.payments.filter((p) => inPeriod(p.periodYear, p.periodMonth));
  const periodLabel = [
    monthFilter ? MONTHS[monthFilter - 1] : "Todo el año",
    yearFilter ?? "todos los años",
  ].join(" · ");

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header no-print">
        <div>
          <h1>{seller.name}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <div className="no-print">
        <AdminNav current="/admin/vendedores" />
        <Link href="/admin/vendedores" className="admin-back-link">
          ← Volver a vendedores
        </Link>
      </div>

      <section className="order-ticket">
        <header className="order-ticket-head">
          <div>
            <p className="order-ticket-brand">Gráficas Caracas</p>
            <p className="order-ticket-title">Comisiones de {seller.name}</p>
          </div>
          <div className="order-ticket-meta">
            <p>
              <strong>Comisión actual</strong> {seller.commissionPercent.toFixed(2)}%
            </p>
            <p>
              <strong>Período</strong>{" "}
              {periodLabel}
            </p>
          </div>
        </header>

        <form className="admin-form seller-range-form no-print" method="get">
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
            <select name="mes" defaultValue={monthFilter ? String(monthFilter) : "todo"} className="admin-input">
              <option value="todo">Todo el año</option>
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
            <Link href={`/admin/vendedores/${seller.id}`} className="admin-cancel-btn">
              Mes en curso
            </Link>
          ) : null}
        </form>

        <div className="admin-summary-row statement-summary">
          <div className="admin-summary-card">
            <span className="admin-summary-label">Órdenes que cuentan</span>
            <span className="admin-summary-value">{detail.countedOrders}</span>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">Total vendido</span>
            <span className="admin-summary-value">{detail.totalSold.toFixed(2)}</span>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">Comisión ganada</span>
            <span className="admin-summary-value">{detail.commissionEarned.toFixed(2)}</span>
          </div>
          <div className="admin-summary-card dash-card-ok">
            <span className="admin-summary-label">Pagado a la vendedora</span>
            <span className="admin-summary-value">{periodPaid.toFixed(2)}</span>
          </div>
          <div className="admin-summary-card dash-card-warn">
            <span className="admin-summary-label">Pendiente por pagar</span>
            <span className="admin-summary-value">{periodPending.toFixed(2)}</span>
          </div>
        </div>

        <div className="no-print seller-pay-box">
          {monthFilter && yearFilter ? (
            periodPending > 0 ? (
              <>
                <h3>
                  Pagar comisión de {MONTHS[monthFilter - 1]} {yearFilter}
                </h3>
                <p className="statement-note">
                  Pendiente de este mes: <strong>{periodPending.toFixed(2)}</strong>. Puedes pagar
                  todo o ir abonando; cada pago queda registrado abajo.
                </p>
                <AddPaymentForm
                  maxAmount={periodPending}
                  onAddPayment={addSellerPaymentAction.bind(null, seller.id, yearFilter, monthFilter)}
                />
              </>
            ) : (
              <p className="statement-note">
                {periodMonths.length === 0
                  ? "No hay comisión en este mes."
                  : "La comisión de este mes está pagada por completo."}
              </p>
            )
          ) : (
            <p className="statement-note">
              Elige un mes específico para registrar un pago a la vendedora.
              {ledger.totalPending > 0
                ? ` Pendiente en total (todos los meses): ${ledger.totalPending.toFixed(2)}.`
                : ""}
            </p>
          )}
        </div>

        <p className="statement-note">
          Solo las órdenes confirmadas suman. Las anuladas se listan tachadas para que puedas
          verlas, pero no cuentan en el total ni en la comisión. Cada orden usa el % con que se
          vendió, aunque hoy la comisión del vendedor sea otra.
        </p>

        <div className="admin-table-wrap">
          <table className="order-print-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th className="num">Total</th>
                <th className="num">%</th>
                <th className="num">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {detail.orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ledger-empty">
                    Este vendedor no tiene órdenes en este período.
                  </td>
                </tr>
              ) : (
                detail.orders.map((order) => (
                  <tr key={order.id} className={order.counts ? undefined : "row-cancelled"}>
                    <td data-label="Orden">
                      <Link href={`/admin/pedidos/${order.id}`} className="code-link">
                        #{order.id}
                      </Link>
                    </td>
                    <td data-label="Fecha">{formatDateTime(order.createdAt)}</td>
                    <td data-label="Cliente">{order.customerName}</td>
                    <td data-label="Estado">
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="num" data-label="Total">{order.total.toFixed(2)}</td>
                    <td className="num" data-label="%">
                      {order.commissionPercent != null ? `${order.commissionPercent}%` : "—"}
                    </td>
                    <td className="num" data-label="Comisión">
                      {order.counts ? order.commission.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))
              )}
              <tr className="order-print-total">
                <td colSpan={4}>Totales ({detail.countedOrders} órdenes)</td>
                <td className="num" data-label="Total">{detail.totalSold.toFixed(2)}</td>
                <td></td>
                <td className="num" data-label="Comisión">{detail.commissionEarned.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="seller-pay-title">Pagos a la vendedora · {periodLabel}</h3>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha del pago</th>
                <th>Mes que cubre</th>
                <th className="num">Monto</th>
                <th>Notas</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {periodPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ledger-empty">
                    Todavía no hay pagos registrados en este período.
                  </td>
                </tr>
              ) : (
                periodPayments.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Fecha del pago">{formatDateTime(p.createdAt)}</td>
                    <td data-label="Mes que cubre">
                      {MONTHS[p.periodMonth - 1]} {p.periodYear}
                    </td>
                    <td className="num" data-label="Monto">{p.amount.toFixed(2)}</td>
                    <td data-label="Notas">{p.notes ?? "—"}</td>
                    <td data-label="Registrado por">{p.userName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
      </div>
    </div>
  );
}
