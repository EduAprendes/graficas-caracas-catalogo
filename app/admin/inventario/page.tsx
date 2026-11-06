import { auth } from "@/auth";
import { getInventory } from "@/lib/inventory";
import { getSalesSummary } from "@/lib/orders";
import { createCategory, logoutAction } from "../actions";
import AdminNav from "@/components/admin/AdminNav";
import CategoryCard from "@/components/admin/CategoryCard";
import InfoTooltip from "@/components/admin/InfoTooltip";
import InventorySearch from "@/components/admin/InventorySearch";
import NewCategoryForm from "@/components/admin/NewCategoryForm";

export const dynamic = "force-dynamic";

const productText = (p: { code: string; description: string; dimension: string }) =>
  `${p.code} ${p.description} ${p.dimension}`;

export default async function AdminPage() {
  const session = await auth();
  const [categories, summary] = await Promise.all([getInventory(), getSalesSummary()]);
  const allTexts = categories.flatMap((c) => c.products.map(productText));

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Inventario</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/inventario" />

      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-label">
            Por vender
            <InfoTooltip text="Suma de stock actual × precio de catálogo (el que ve el cliente) de cada producto. Se actualiza al momento; no es el total de ninguna orden en particular." />
          </span>
          <span className="admin-summary-value">{summary.inventoryToSellValue.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Por cobrar (crédito)</span>
          <span className="admin-summary-value">{summary.creditOutstanding.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">Total vendido</span>
          <span className="admin-summary-value">{summary.totalSold.toFixed(2)}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-label">
            Valor total de inventario
            <InfoTooltip text="Suma de stock actual × precio de cada producto." />
          </span>
          <span className="admin-summary-value">
            {categories.reduce((sum, category) => sum + category.inventoryValue, 0).toFixed(2)}
          </span>
        </div>
      </div>

      <InventorySearch texts={allTexts}>
        <div className="inv-grid">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              title={category.title}
              subtitle={category.subtitle}
              imagePath={category.imagePath}
              productCount={category.products.length}
              outOfStock={category.products.filter((p) => p.stock <= 0).length}
              value={category.inventoryValue.toFixed(2)}
              searchTexts={category.products.map(productText)}
            />
          ))}
        </div>
        {categories.length === 0 ? (
          <p className="dash-empty">Todavía no hay categorías. Crea la primera aquí abajo.</p>
        ) : null}

        <NewCategoryForm onCreate={createCategory} nextOrder={categories.length} />
      </InventorySearch>
    </div>
  );
}
