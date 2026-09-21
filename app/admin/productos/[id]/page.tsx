import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProductLedger, reasonLabel } from "@/lib/ledger";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function ProductLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const session = await auth();
  const ledger = await getProductLedger(productId);
  if (!ledger) notFound();

  const { product, entries } = ledger;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Historial de producto</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin" />

      <Link href="/admin" className="admin-back-link">
        ← Volver al inventario
      </Link>

      <section className="ledger-head">
        <div>
          <p className="ledger-category">{product.categoryTitle}</p>
          <h2>
            <span className="code">{product.code}</span> {product.description}
          </h2>
          <p className="ledger-dimension">{product.dimension}</p>
        </div>
        <div className="ledger-stock">
          <span className="ledger-stock-label">Disponible</span>
          <span className={`stock-badge stock-badge-lg${product.stock === 0 ? " stock-zero" : ""}`}>
            {product.stock}
          </span>
        </div>
      </section>

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th className="num">Cantidad</th>
              <th className="num">Saldo</th>
              <th>Referencia</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="ledger-empty">
                  Todavía no hay movimientos registrados para este producto.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Fecha">{formatDateTime(entry.createdAt)}</td>
                  <td data-label="Movimiento">{reasonLabel(entry.reason)}</td>
                  <td
                    className={`num ledger-delta${entry.delta < 0 ? " ledger-delta-out" : " ledger-delta-in"}`}
                    data-label="Cantidad"
                  >
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </td>
                  <td className="num" data-label="Saldo">{entry.balance}</td>
                  <td data-label="Referencia">
                    {entry.reference && entry.referenceHref ? (
                      <Link href={entry.referenceHref} className="code-link">
                        {entry.reference}
                      </Link>
                    ) : (
                      (entry.reference ?? "—")
                    )}
                  </td>
                  <td data-label="Usuario">{entry.userName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
