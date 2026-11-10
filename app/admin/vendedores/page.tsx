import { auth } from "@/auth";
import { getAccessUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getSellers } from "@/lib/sellers";
import {
  cancelSeller,
  createSeller,
  reactivateSeller,
  saveAdministradoraAccess,
  saveSellerAccess,
  setAdministradoraActive,
  updateSeller,
} from "./actions";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import AccessPanel, { type AccessAccount } from "@/components/admin/AccessPanel";
import NewSellerForm from "@/components/admin/NewSellerForm";
import SellerRow from "@/components/admin/SellerRow";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function SellersPage() {
  const session = await auth();
  const sellers = await getSellers();
  const access = await getAccessUser();
  const adminAccounts =
    access?.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { role: "ADMINISTRADORA" },
          select: { id: true, username: true, name: true, cancelledAt: true },
          orderBy: { id: "asc" },
        })
      : null;

  const accessAccounts: AccessAccount[] | null = adminAccounts
    ? [
        ...adminAccounts.map((a) => ({
          key: `admin-${a.id}`,
          kind: "ADMINISTRADORA" as const,
          id: a.id,
          name: a.name,
          username: a.username,
          cancelled: a.cancelledAt != null,
        })),
        ...sellers.map((s) => ({
          key: `seller-${s.id}`,
          kind: "VENDEDORA" as const,
          id: s.id,
          name: s.name,
          username: s.username,
          cancelled: s.cancelled,
        })),
      ]
    : null;

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
          <span className="admin-summary-value">{money(totalSold)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Comisiones ganadas</span>
          <span className="admin-summary-value">{money(totalCommission)}</span>
        </div>
      </div>

      {accessAccounts ? (
        <AccessPanel
          accounts={accessAccounts}
          saveAdministradora={saveAdministradoraAccess}
          saveVendedora={saveSellerAccess}
          setAdministradoraActive={setAdministradoraActive}
        />
      ) : null}

      <section className="access-card" aria-labelledby="sellers-title">
        <header className="access-head">
          <div>
            <h2 id="sellers-title" className="access-title">
              Vendedores
            </h2>
            <p className="access-sub">Ventas, comisión y estado de cada vendedor.</p>
          </div>
          <NewSellerForm onCreate={createSeller} />
        </header>

        {sellers.length === 0 ? (
          <div className="access-empty">
            <p>Todavía no hay vendedores. Crea el primero con &quot;+ Nuevo vendedor&quot;.</p>
          </div>
        ) : (
          <ul className="access-list">
            {sellers.map((seller) => (
              <SellerRow
                key={seller.id}
                seller={seller}
                onUpdate={updateSeller.bind(null, seller.id)}
                onCancel={cancelSeller.bind(null, seller.id)}
                onReactivate={reactivateSeller.bind(null, seller.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
