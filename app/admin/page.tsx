import { auth } from "@/auth";
import { getInventory } from "@/lib/inventory";
import { getSalesSummary } from "@/lib/orders";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  logoutAction,
  removeCategoryImage,
  removeProductImage,
  setCategoryImage,
  setProductImage,
  updateCategory,
  updateProduct,
} from "./actions";
import AdminNav from "@/components/admin/AdminNav";
import CategoryHead from "@/components/admin/CategoryHead";
import CategorySection from "@/components/admin/CategorySection";
import InfoTooltip from "@/components/admin/InfoTooltip";
import NewCategoryForm from "@/components/admin/NewCategoryForm";
import NewProductForm from "@/components/admin/NewProductForm";
import ProductRow from "@/components/admin/ProductRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  const [categories, summary] = await Promise.all([getInventory(), getSalesSummary()]);

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

      <AdminNav current="/admin" />

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
            <InfoTooltip text="Suma de stock actual × precio sugerido (uso interno, no el de catálogo) de cada producto." />
          </span>
          <span className="admin-summary-value">
            {categories.reduce((sum, category) => sum + category.inventoryValue, 0).toFixed(2)}
          </span>
        </div>
      </div>

      <NewCategoryForm onCreate={createCategory} nextOrder={categories.length} />

      {categories.map((category) => (
        <CategorySection
          key={category.id}
          id={category.id}
          head={
            <CategoryHead
              category={category}
              onUploadImage={setCategoryImage.bind(null, category.id)}
              onRemoveImage={removeCategoryImage.bind(null, category.id)}
              onUpdate={updateCategory.bind(null, category.id)}
              onDelete={deleteCategory.bind(null, category.id)}
            />
          }
        >
          <p className="admin-category-total">
            Valor de esta categoría: <strong>{category.inventoryValue.toFixed(2)}</strong>
          </p>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className="num">Stock</th>
                  <th className="num">
                    Precio
                    <InfoTooltip text="Precio de catálogo: el que ve el cliente en la página pública del sitio." />
                  </th>
                  <th className="num">
                    Precio sug.
                    <InfoTooltip text="Precio sugerido: solo interno, nunca se muestra al público. Se usa para calcular la columna Valor y el Valor total de inventario." />
                  </th>
                  <th className="num">
                    Valor
                    <InfoTooltip text="Stock actual × precio sugerido de este producto (no usa el precio de catálogo)." />
                  </th>
                  <th className="num">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {category.products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onUploadImage={setProductImage.bind(null, product.id)}
                    onRemoveImage={removeProductImage.bind(null, product.id)}
                    onUpdate={updateProduct.bind(null, product.id)}
                    onDelete={deleteProduct.bind(null, product.id)}
                  />
                ))}
                <NewProductForm
                  onCreate={createProduct.bind(null, category.id)}
                  nextOrder={category.products.length}
                />
              </tbody>
            </table>
          </div>
        </CategorySection>
      ))}
    </div>
  );
}
