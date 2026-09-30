import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getSellerDetail } from "@/lib/sellers";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

// Acepta AAAA-MM-DD; devuelve el inicio o el final (inclusive) de ese día en hora local.
function parseDay(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function SellerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { id } = await params;
  const { desde, hasta } = await searchParams;
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId)) notFound();

  const session = await auth();
  const detail = await getSellerDetail(sellerId, {
    from: parseDay(desde, false),
    to: parseDay(hasta, true),
  });
  if (!detail) notFound();

  const { seller } = detail;
  const filtered = Boolean(parseDay(desde, false) || parseDay(hasta, true));

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
              {filtered ? `${desde || "inicio"} a ${hasta || "hoy"}` : "Todas las órdenes"}
            </p>
          </div>
        </header>

        <form className="admin-form seller-range-form no-print" method="get">
          <label className="admin-field admin-field-sm">
            Desde
            <input type="date" name="desde" defaultValue={desde ?? ""} className="admin-input" />
          </label>
          <label className="admin-field admin-field-sm">
            Hasta
            <input type="date" name="hasta" defaultValue={hasta ?? ""} className="admin-input" />
          </label>
          <button type="submit" className="admin-save-btn">
            Filtrar
          </button>
          {filtered ? (
            <Link href={`/admin/vendedores/${seller.id}`} className="admin-cancel-btn">
              Quitar filtro
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
                    Este vendedor no tiene órdenes{filtered ? " en ese período" : ""}.
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
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
      </div>
    </div>
  );
}
