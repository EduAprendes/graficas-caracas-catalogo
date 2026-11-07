import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessUser } from "@/lib/access";
import { getCashFlow, getHealthSummary, getPayables } from "@/lib/health";
import AdminNav from "@/components/admin/AdminNav";
import { AgingChart, CashFlowChart, PayablesChart } from "@/components/admin/HealthCharts";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function HealthPage() {
  const access = await getAccessUser();
  if (access?.role !== "ADMIN") notFound();

  const session = await auth();
  const payables = await getPayables();
  const [cashFlow, summary] = await Promise.all([getCashFlow(6), getHealthSummary(payables)]);

  const salesDelta =
    summary.salesLastMonth > 0
      ? Math.round(((summary.salesThisMonth - summary.salesLastMonth) / summary.salesLastMonth) * 100)
      : null;

  return (
    <div className="admin-page admin-page-wide viz">
      <div className="admin-header">
        <div>
          <h1>Salud del negocio</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/salud" />

      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-label">Ventas del mes</span>
          <span className="admin-summary-value">{money(summary.salesThisMonth)}</span>
          <span className="admin-summary-sub">
            {salesDelta == null
              ? `Mes anterior: ${money(summary.salesLastMonth)}`
              : `${salesDelta >= 0 ? "▲" : "▼"} ${Math.abs(salesDelta)} % frente al mes anterior`}
          </span>
        </div>
        <div className={`admin-summary-card ${summary.payablesBalance > 0 ? "dash-card-warn" : "dash-card-ok"}`}>
          <span className="admin-summary-label">Por pagar a proveedores</span>
          <span className="admin-summary-value">{money(summary.payablesBalance)}</span>
          <span className="admin-summary-sub">{payables.rows.length} órdenes de compra</span>
        </div>
        <div className={`admin-summary-card ${summary.receivablesOverdue > 0 ? "dash-card-danger" : "dash-card-ok"}`}>
          <span className="admin-summary-label">Cobros vencidos (+30 días)</span>
          <span className="admin-summary-value">{money(summary.receivablesOverdue)}</span>
          <span className="admin-summary-sub">de {money(summary.receivablesTotal)} por cobrar</span>
        </div>
        <div className={`admin-summary-card ${summary.lowStockCount > 0 ? "dash-card-warn" : "dash-card-ok"}`}>
          <span className="admin-summary-label">Productos con stock bajo</span>
          <span className="admin-summary-value">{summary.lowStockCount}</span>
          <span className="admin-summary-sub">
            <Link href="/admin/inventario/stock-bajo" className="code-link">
              Ver la lista
            </Link>
          </span>
        </div>
      </div>

      {summary.ordersWithIncompleteCost > 0 ? (
        <p className="viz-warning" role="note">
          Datos incompletos: {summary.ordersWithIncompleteCost}{" "}
          {summary.ordersWithIncompleteCost === 1 ? "orden de compra tiene" : "órdenes de compra tienen"} líneas sin
          costo. Las ganancias de esas ventas se calculan con costo 0 y las cuentas por pagar quedan por debajo del
          valor real.
        </p>
      ) : null}

      <h2 className="statement-heading">¿Me alcanza la plata? Cobrado y pagado por mes</h2>
      <p className="statement-note">
        Cobrado: ventas de contado y abonos de clientes. Pagado: pagos a proveedores, gastos operativos y comisiones.
        Debajo de cada mes, el saldo (cobrado menos pagado). Los pagos a proveedores cuentan en la fecha del pago.
      </p>
      <CashFlowChart months={cashFlow} />

      <h2 className="statement-heading">Cuentas por pagar a proveedores</h2>
      <p className="statement-note">
        Costo de cada orden de compra (factura más gastos del contenedor), lo ya pagado y lo que falta.
      </p>
      <PayablesChart rows={payables.rows} />

      <h2 className="statement-heading">Cuentas por cobrar por antigüedad</h2>
      <p className="statement-note">
        Deuda de clientes por días desde la fecha de la orden. Total por cobrar: {money(summary.receivablesTotal)}.
      </p>
      <AgingChart aging={summary.aging} />

      {summary.debtors.length > 0 ? (
        <>
          <h2 className="statement-heading">Mayores deudores</h2>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Saldo</th>
                  <th className="num">Deuda más antigua</th>
                </tr>
              </thead>
              <tbody>
                {summary.debtors.map((d) => (
                  <tr key={d.customerId}>
                    <td data-label="Cliente">
                      <Link href={`/admin/clientes/${d.customerId}`} className="code-link">
                        {d.name}
                      </Link>
                    </td>
                    <td className="num" data-label="Saldo">{money(d.balance)}</td>
                    <td className="num" data-label="Deuda más antigua">
                      {d.oldestDebtDays == null ? "—" : `${d.oldestDebtDays} días`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
