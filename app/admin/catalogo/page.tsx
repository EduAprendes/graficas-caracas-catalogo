import { auth } from "@/auth";
import { getInventory } from "@/lib/inventory";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import CatalogTable from "@/components/admin/CatalogTable";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await auth();
  const categories = await getInventory();

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header">
        <div>
          <h1>Catálogo</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/catalogo" />

      <CatalogTable categories={categories} />
    </div>
  );
}
