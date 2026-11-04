import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/access";
import { getProfitReport, OPERATING_CATEGORIES } from "@/lib/finance";
import { caracasYearMonth, formatDate } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import ConfirmActionButton from "@/components/admin/ConfirmActionButton";
import { OperatingExpenseForm } from "@/components/admin/ExpenseForms";
import { logoutAction } from "@/app/admin/actions";
import {
  addOperatingExpenseAction,
  deleteOperatingExpenseAction,
} from "@/app/admin/gastos/actions";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  await requireAdmin();
  const { anio, mes } = await searchParams;

  // Por defecto: el mes en curso (hora de Caracas).
  const now = caracasYearMonth(new Date());
  const year = Number(anio) || now.year;
  let month: number | null = now.month;
  if (mes === "todo") month = null;
  else if (Number(mes) >= 1 && Number(mes) <= 12) month = Number(mes);
  else if (anio) month = null;

  const session = await auth();
  const report = await getProfitReport(year, month);
  const years = Array.from(new Set([now.year, now.year - 1, year])).sort((a, b) => b - a);
  const periodLabel = `${month ? MONTHS[month - 1] : "Todo el año"} ${year}`;
  const isDefault = year === now.year && month === now.month;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Balance y gastos</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/ganancias" />

      <form className="admin-form seller-range-form" method="get">
        <label className="admin-field admin-field-sm">
          Año
          <select name="anio" defaultValue={String(year)} className="admin-input">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field-sm">
          Mes
          <select name="mes" defaultValue={month ? String(month) : "todo"} className="admin-input">
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
        {!isDefault ? (
          <Link href="/admin/ganancias" className="admin-cancel-btn">
            Mes en curso
          </Link>
        ) : null}
      </form>

      <h2 className="statement-heading">Resultado · {periodLabel}</h2>
      <div className="admin-summary-row">
        <div className="admin-summary-card dash-card-info">
          <span className="admin-summary-label">Ventas ({report.orderCount} órdenes)</span>
          <span className="admin-summary-value">{money(report.revenue)}</span>
        </div>
        <div className="admin-summary-card dash-card-warn">
          <span className="admin-summary-label">Costo de la mercancía vendida</span>
          <span className="admin-summary-value">{money(report.costOfGoods)}</span>
        </div>
        <div className="admin-summary-card dash-card-total">
          <span className="admin-summary-label">Ganancia bruta</span>
          <span className="admin-summary-value">{money(report.grossProfit)}</span>
        </div>
      </div>
      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-label">Comisiones de vendedoras</span>
          <span className="admin-summary-value">{money(report.commissions)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Gastos operativos</span>
          <span className="admin-summary-value">{money(report.operatingTotal)}</span>
        </div>
        <div className={`admin-summary-card ${report.netProfit >= 0 ? "dash-card-ok" : "dash-card-danger"}`}>
          <span className="admin-summary-label">Ganancia neta</span>
          <span className="admin-summary-value">{money(report.netProfit)}</span>
        </div>
      </div>

      <p className="statement-note">
        Ganancia neta = ventas − costo de la mercancía vendida − comisiones − gastos operativos. El
        costo de cada producto es el de la factura más la parte que le toca de los gastos del
        contenedor (fletes, aduana…), promediado entre las órdenes de compra recibidas. Se cuentan las
        ventas confirmadas del período, estén cobradas o no.
      </p>
      {report.linesWithoutCost > 0 ? (
        <p className="login-error">
          {report.linesWithoutCost} línea(s) vendida(s) son de productos sin costo registrado en ninguna
          orden de compra recibida; se contaron con costo 0 y la ganancia puede verse mayor de lo real.
        </p>
      ) : null}

      <h2 className="statement-heading">Gastos operativos · {periodLabel}</h2>
      <div className="seller-pay-box no-print">
        <OperatingExpenseForm
          categories={OPERATING_CATEGORIES}
          defaultDate={today}
          onAdd={addOperatingExpenseAction}
        />
      </div>

      {report.expensesByCategory.length > 0 ? (
        <div className="admin-summary-row">
          {report.expensesByCategory.map((c) => (
            <div key={c.category} className="admin-summary-card">
              <span className="admin-summary-label">{c.category}</span>
              <span className="admin-summary-value">{money(c.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Nota</th>
              <th className="num">Monto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {report.expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="ledger-empty">
                  No hay gastos operativos registrados en este período.
                </td>
              </tr>
            ) : (
              report.expenses.map((e) => (
                <tr key={e.id}>
                  <td data-label="Fecha">{formatDate(e.expenseDate)}</td>
                  <td data-label="Categoría">{e.category}</td>
                  <td data-label="Nota">{e.notes ?? "—"}</td>
                  <td className="num" data-label="Monto">{money(e.amount)}</td>
                  <td>
                    <ConfirmActionButton
                      label="Quitar"
                      pendingLabel="Quitando…"
                      confirmMessage="¿Quitar este gasto?"
                      className="admin-delete-btn"
                      action={deleteOperatingExpenseAction.bind(null, e.id)}
                    />
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
