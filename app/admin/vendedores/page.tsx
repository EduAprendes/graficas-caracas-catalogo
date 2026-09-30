import { auth } from "@/auth";
import { getSellers } from "@/lib/sellers";
import {
  cancelSeller,
  createSeller,
  reactivateSeller,
  saveSellerAccess,
  updateSeller,
} from "./actions";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import NewSellerForm from "@/components/admin/NewSellerForm";
import SellerRow from "@/components/admin/SellerRow";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const session = await auth();
  const sellers = await getSellers();

  const totalSold = sellers.reduce((sum, seller) => sum + seller.totalSold, 0);
  const totalCommission = sellers.reduce((sum, seller) => sum + seller.commissionEarned, 0);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Vendedores</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/vendedores" />

      <p className="statement-note">
        Una orden sin vendedor es una venta de tienda y no genera comisión. La comisión se calcula
        sobre el total de la orden (con descuentos) y solo cuenta órdenes confirmadas.
      </p>

      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-label">Vendido por vendedores</span>
          <span className="admin-summary-value">{totalSold.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Comisiones ganadas</span>
          <span className="admin-summary-value">{totalCommission.toFixed(2)}</span>
        </div>
      </div>

      <NewSellerForm onCreate={createSeller} />

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Teléfono</th>
              <th className="num">Comisión</th>
              <th className="num">Órdenes</th>
              <th className="num">Total vendido</th>
              <th className="num">Comisión ganada</th>
              <th>Acceso al panel</th>
              <th className="num">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sellers.length === 0 ? (
              <tr>
                <td colSpan={8} className="ledger-empty">
                  Todavía no hay vendedores. Creá el primero con &quot;+ Nuevo vendedor&quot;.
                </td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <SellerRow
                  key={seller.id}
                  seller={seller}
                  onUpdate={updateSeller.bind(null, seller.id)}
                  onCancel={cancelSeller.bind(null, seller.id)}
                  onReactivate={reactivateSeller.bind(null, seller.id)}
                  onSaveAccess={saveSellerAccess.bind(null, seller.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
