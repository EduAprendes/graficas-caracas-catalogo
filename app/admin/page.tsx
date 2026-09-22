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
          <span className="admin-summary-label">Por vender</span>
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
      </div>

      <p className="admin-inventory-total">
        Valor total de inventario (precio sugerido):{" "}
        <strong>
          {categories.reduce((sum, category) => sum + category.inventoryValue, 0).toFixed(2)}
        </strong>
      </p>

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
                  <th className="num">Precio sug.</th>
                  <th className="num">Valor</th>
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
