import { auth } from "@/auth";
import { getInventory } from "@/lib/inventory";
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
import CategoryHead from "@/components/admin/CategoryHead";
import NewCategoryForm from "@/components/admin/NewCategoryForm";
import NewProductForm from "@/components/admin/NewProductForm";
import ProductRow from "@/components/admin/ProductRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  const categories = await getInventory();

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

      <NewCategoryForm onCreate={createCategory} nextOrder={categories.length} />

      {categories.map((category) => (
        <section key={category.id} className="admin-category">
          <CategoryHead
            category={category}
            onUploadImage={setCategoryImage.bind(null, category.id)}
            onRemoveImage={removeCategoryImage.bind(null, category.id)}
            onUpdate={updateCategory.bind(null, category.id)}
            onDelete={deleteCategory.bind(null, category.id)}
          />
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className="num">Stock</th>
                  <th className="num">Ajustar</th>
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
        </section>
      ))}
    </div>
  );
}
