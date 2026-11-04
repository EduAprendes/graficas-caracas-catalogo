import Link from "next/link";
import { auth } from "@/auth";
import { getReceivables } from "@/lib/accounts";
import { getDashboardStats } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { getPurchaseOrders, getSalesOrders, getSalesSummary } from "@/lib/orders";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function DashboardPage() {
  const session = await auth();
  const [summary, salesOrders, purchaseOrders, receivables, stats] = await Promise.all([
    getSalesSummary(),
    getSalesOrders(),
    getPurchaseOrders(),
    getReceivables(),
    getDashboardStats(),
  ]);

  const now = new Date();
  const monthSales = salesOrders
    .filter(
      (o) =>
        o.status === "CONFIRMADA" &&
        o.createdAt.getFullYear() === now.getFullYear() &&
        o.createdAt.getMonth() === now.getMonth()
    )
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const inTransit = purchaseOrders.filter((o) => o.status === "PENDIENTE");
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
        <Link href="/admin/compras/nueva" className="admin-cancel-btn admin-add-link">
          + Nueva orden de compra
        </Link>
        <Link href="/admin/clientes" className="admin-cancel-btn admin-add-link">
          Clientes
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

      <div className="dash-grid">
        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>Mercancía en tránsito</h2>
            <Link href="/admin/compras" className="dash-link">Ver compras</Link>
          </header>
          {inTransit.length === 0 ? (
            <p className="dash-empty">No hay órdenes de compra pendientes.</p>
          ) : (
            <ul className="dash-list">
              {inTransit.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/compras/${o.id}`} className="dash-row">
                    <span>
                      <strong>#{o.id}</strong> {o.supplierName}
                      <small>{formatDate(o.createdAt)}</small>
                    </span>
                    <span className="dash-row-end">
                      <span className="status-badge status-pendiente">Pendiente</span>
                      <small>{o.totalQuantity.toLocaleString("en-US")} uds</small>
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
