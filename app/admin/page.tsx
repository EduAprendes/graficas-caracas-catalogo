import Link from "next/link";
import { auth } from "@/auth";
import { getReceivables } from "@/lib/accounts";
import { getDashboardStats } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { getSalesOrders, getSalesSummary } from "@/lib/orders";
import { getStockAlerts } from "@/lib/stock-alerts";
import { getDailySales } from "@/lib/health";
import AdminNav from "@/components/admin/AdminNav";
import { DailySalesChart } from "@/components/admin/HealthCharts";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function DashboardPage() {
  const session = await auth();
  const [summary, salesOrders, receivables, stats, stock, dailySales] = await Promise.all([
    getSalesSummary(),
    getSalesOrders(),
    getReceivables(),
    getDashboardStats(),
    getStockAlerts(),
    getDailySales(30),
  ]);
  const lowStock = stock.alerts.slice(0, 6);

  const now = new Date();
  const monthSales = salesOrders
    .filter(
      (o) =>
        o.status === "CONFIRMADA" &&
        o.createdAt.getFullYear() === now.getFullYear() &&
        o.createdAt.getMonth() === now.getMonth()
    )
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const recentSales = salesOrders.slice(0, 5);
  const debtors = receivables.rows
    .filter((r) => r.balance > 0 && !r.cancelled)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header">
        <div>
          <h1>Resumen</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin" />

      <div className="dash-actions">
        <Link href="/admin/pedidos/nueva" className="admin-save-btn admin-add-link">
          + Nueva orden de venta
        </Link>
      </div>

      <div className="admin-summary-row">
        <div className="admin-summary-card dash-card-info">
          <span className="admin-summary-label">Ventas del mes</span>
          <span className="admin-summary-value">{money(monthSales)}</span>
        </div>
        <div className="admin-summary-card dash-card-warn">
          <span className="admin-summary-label">Por cobrar (crédito)</span>
          <span className="admin-summary-value">{money(summary.creditOutstanding)}</span>
        </div>
        <div className="admin-summary-card dash-card-ok">
          <span className="admin-summary-label">Inventario por vender</span>
          <span className="admin-summary-value">{money(summary.inventoryToSellValue)}</span>
        </div>
        <div className="admin-summary-card dash-card-total">
          <span className="admin-summary-label">Total vendido</span>
          <span className="admin-summary-value">{money(summary.totalSold)}</span>
        </div>
      </div>

      <div className="viz">
        <h2 className="statement-heading">Ventas diarias · últimos 30 días</h2>
        <DailySalesChart days={dailySales} />
      </div>

      <div className="dash-grid">
        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>
              Stock bajo
              {stock.alerts.length > 0 ? (
                <span className="dash-count-badge">{stock.alerts.length}</span>
              ) : null}
            </h2>
            <Link href="/admin/inventario/stock-bajo" className="dash-link">Ver todos</Link>
          </header>
          {lowStock.length === 0 ? (
            <p className="dash-empty">Ningún producto está por debajo del 20 % de su última recepción.</p>
          ) : (
            <ul className="dash-list">
              {lowStock.map((a) => (
                <li key={a.productId}>
                  <Link href={`/admin/inventario/${a.categoryId}`} className="dash-row">
                    <span>
                      <strong>{a.code}</strong> {a.description}
                      <small>
                        {a.categoryTitle} · llegaron {a.reference} en la orden #{a.referenceOrderId}
                      </small>
                    </span>
                    <span className="dash-row-end">
                      <span className={`stock-badge${a.stock <= 0 ? " stock-zero" : ""}`}>
                        {a.stock <= 0 ? "Agotado" : `${a.stock} uds`}
                      </span>
                      <small>{a.percent} %</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>Mayores saldos por cobrar</h2>
            <Link href="/admin/cuentas" className="dash-link">Ver cuentas</Link>
          </header>
          {debtors.length === 0 ? (
            <p className="dash-empty">Nadie tiene saldo pendiente.</p>
          ) : (
            <ul className="dash-list">
              {debtors.map((r) => (
                <li key={r.customerId}>
                  <Link href={`/admin/clientes/${r.customerId}`} className="dash-row">
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        {r.oldestDebtDays != null ? `Deuda más antigua: ${r.oldestDebtDays} días` : "Al día"}
                      </small>
                    </span>
                    <span className="dash-row-end amount-overdue">{money(r.balance)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>Últimas órdenes de venta</h2>
            <Link href="/admin/pedidos" className="dash-link">Ver todas</Link>
          </header>
          {recentSales.length === 0 ? (
            <p className="dash-empty">Todavía no hay órdenes de venta.</p>
          ) : (
            <ul className="dash-list">
              {recentSales.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="dash-row">
                    <span>
                      <strong>#{o.id}</strong> {o.customerName}
                      <small>{formatDate(o.createdAt)}</small>
                    </span>
                    <span className="dash-row-end">
                      <span className={`status-badge status-${o.status.toLowerCase()}`}>
                        {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                      </span>
                      <small>{money(o.totalAmount)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>Inventario</h2>
            <Link href="/admin/inventario" className="dash-link">Ver inventario</Link>
          </header>
          <p className="dash-big">
            {stats.outOfStockCount}
            <span> de {stats.productCount} productos sin stock</span>
          </p>
        </section>
      </div>
    </div>
  );
}
