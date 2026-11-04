import Link from "next/link";
import { auth } from "@/auth";
import { getReceivables, type AgingBucketKey } from "@/lib/accounts";
import { formatDate } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const BUCKETS: { key: AgingBucketKey; param: string; label: string; tone: string }[] = [
  { key: "current", param: "vigente", label: "Vigente (0–30 días)", tone: "dash-card-ok" },
  { key: "days31to60", param: "31-60", label: "31–60 días", tone: "dash-card-warn" },
  { key: "days61to90", param: "61-90", label: "61–90 días", tone: "dash-card-warn2" },
  { key: "over90", param: "90", label: "Más de 90 días", tone: "dash-card-danger" },
];

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; edad?: string }>;
}) {
  const { ver, edad } = await searchParams;
  const showAll = ver === "todos";
  const activeBucket = BUCKETS.find((b) => b.param === edad) ?? null;

  const session = await auth();
  const report = await getReceivables();
  const rows = showAll ? report.rows : report.rows.filter((row) => row.balance > 0);
  const bucketOrders = activeBucket
    ? report.agingOrders.filter((o) => o.bucket === activeBucket.key)
    : [];

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header">
        <div>
          <h1>Cuentas por cobrar</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/cuentas" />

      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-label">Total por cobrar</span>
          <span className="admin-summary-value">{report.totalBalance.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Clientes con deuda</span>
          <span className="admin-summary-value">{report.debtorCount}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Total cobrado</span>
          <span className="admin-summary-value">{report.totalPaid.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Total vendido</span>
          <span className="admin-summary-value">{report.totalSold.toFixed(2)}</span>
        </div>
      </div>

      <div className="admin-summary-row">
        {BUCKETS.map((b) => (
          <Link
            key={b.key}
            href={activeBucket?.key === b.key ? "/admin/cuentas" : `/admin/cuentas?edad=${b.param}`}
            scroll={false}
            aria-pressed={activeBucket?.key === b.key}
            title="Ver las órdenes de este tramo"
            className={`admin-summary-card aging-card ${b.tone}${activeBucket?.key === b.key ? " aging-card-active" : ""}`}
          >
            <span className="admin-summary-label">{b.label}</span>
            <span
              className={`admin-summary-value${b.key === "over90" && report.aging.over90 > 0 ? " amount-overdue" : ""}`}
            >
              {report.aging[b.key].toFixed(2)}
            </span>
          </Link>
        ))}
      </div>

      {activeBucket ? (
        <section className="aging-detail">
          <div className="aging-detail-head">
            <h2>
              Órdenes con saldo · {activeBucket.label}{" "}
              <span className="aging-detail-count">({bucketOrders.length})</span>
            </h2>
            <Link href="/admin/cuentas" className="admin-cancel-btn">
              Quitar filtro
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th className="num">Antigüedad</th>
                  <th className="num">Total</th>
                  <th className="num">Pagado</th>
                  <th className="num">Saldo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bucketOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="ledger-empty">
                      No hay órdenes con saldo en este tramo.
                    </td>
                  </tr>
                ) : (
                  bucketOrders.map((o) => (
                    <tr key={o.orderId}>
                      <td data-label="Orden">#{o.orderId}</td>
                      <td data-label="Cliente">
                        <Link href={`/admin/clientes/${o.customerId}`} className="code code-link">
                          {o.customerName}
                        </Link>
                      </td>
                      <td data-label="Fecha">{formatDate(o.createdAt)}</td>
                      <td className="num" data-label="Antigüedad">{o.ageDays} días</td>
                      <td className="num" data-label="Total">{o.total.toFixed(2)}</td>
                      <td className="num" data-label="Pagado">{o.paid.toFixed(2)}</td>
                      <td className="num" data-label="Saldo">
                        <span className="stock-badge stock-zero">{o.balance.toFixed(2)}</span>
                      </td>
                      <td>
                        <Link href={`/admin/pedidos/${o.orderId}`} className="admin-edit-btn">
                          Ver orden
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="admin-filter-row">
        <Link
          href="/admin/cuentas"
          className={`admin-nav-link${!showAll ? " admin-nav-link-active" : ""}`}
        >
          Con deuda
        </Link>
        <Link
          href="/admin/cuentas?ver=todos"
          className={`admin-nav-link${showAll ? " admin-nav-link-active" : ""}`}
        >
          Todos los clientes
        </Link>
      </div>

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Empresa</th>
              <th>Teléfono</th>
              <th className="num">Órdenes</th>
              <th className="num">Total comprado</th>
              <th className="num">Total pagado</th>
              <th className="num">Saldo pendiente</th>
              <th className="num">Deuda más antigua</th>
              <th>Último abono</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="ledger-empty">
                  {showAll
                    ? "Todavía no hay clientes con ventas."
                    : "No hay clientes con saldo pendiente."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.customerId} className={row.cancelled ? "row-cancelled" : undefined}>
                  <td data-label="Cliente">
                    <Link href={`/admin/clientes/${row.customerId}`} className="code code-link">
                      {row.name}
                    </Link>
                    {row.cancelled ? (
                      <span className="status-badge status-anulada"> Cancelado</span>
                    ) : null}
                  </td>
                  <td data-label="Empresa">{row.company ?? "—"}</td>
                  <td data-label="Teléfono">{row.phone ?? "—"}</td>
                  <td className="num" data-label="Órdenes">{row.orderCount}</td>
                  <td className="num" data-label="Total comprado">{row.totalSold.toFixed(2)}</td>
                  <td className="num" data-label="Total pagado">{row.totalPaid.toFixed(2)}</td>
                  <td className="num" data-label="Saldo pendiente">
                    {row.balance > 0 ? (
                      <span className="stock-badge stock-zero">{row.balance.toFixed(2)}</span>
                    ) : row.balance < 0 ? (
                      <span className="stock-badge stock-ok" title="Pagó de más">
                        {Math.abs(row.balance).toFixed(2)} a favor
                      </span>
                    ) : (
                      "0.00"
                    )}
                  </td>
                  <td className="num" data-label="Deuda más antigua">
                    {row.oldestDebtDays != null ? `${row.oldestDebtDays} días` : "—"}
                  </td>
                  <td data-label="Último abono">
                    {row.lastPaymentAt ? formatDate(row.lastPaymentAt) : "—"}
                  </td>
                  <td>
                    <Link
                      href={`/admin/clientes/${row.customerId}/estado-de-cuenta`}
                      className="admin-edit-btn"
                    >
                      Estado de cuenta
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
