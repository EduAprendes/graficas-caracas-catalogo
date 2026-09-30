import Link from "next/link";
import { auth } from "@/auth";
import { getReceivables } from "@/lib/accounts";
import { formatDate } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const showAll = ver === "todos";

  const session = await auth();
  const report = await getReceivables();
  const rows = showAll ? report.rows : report.rows.filter((row) => row.balance > 0);

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
        <div className="admin-summary-card">
          <span className="admin-summary-label">Vigente (0–30 días)</span>
          <span className="admin-summary-value">{report.aging.current.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">31–60 días</span>
          <span className="admin-summary-value">{report.aging.days31to60.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">61–90 días</span>
          <span className="admin-summary-value">{report.aging.days61to90.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Más de 90 días</span>
          <span
            className={`admin-summary-value${report.aging.over90 > 0 ? " amount-overdue" : ""}`}
          >
            {report.aging.over90.toFixed(2)}
          </span>
        </div>
      </div>

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
                      <span title="Pagó de más">{Math.abs(row.balance).toFixed(2)} a favor</span>
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
