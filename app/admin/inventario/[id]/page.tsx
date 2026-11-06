import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getInventoryCategory } from "@/lib/inventory";
import {
  createProduct,
  deleteProduct,
  logoutAction,
  removeCategoryImage,
  removeProductImage,
  setCategoryImage,
  setProductImage,
  updateCategory,
  updateProduct,
} from "../../actions";
import { deleteCategoryAndReturn } from "../actions";
import AdminNav from "@/components/admin/AdminNav";
import CategoryHead from "@/components/admin/CategoryHead";
import InfoTooltip from "@/components/admin/InfoTooltip";
import InventorySearch from "@/components/admin/InventorySearch";
import NewProductForm from "@/components/admin/NewProductForm";
import ProductRow from "@/components/admin/ProductRow";

export const dynamic = "force-dynamic";

const productText = (p: { code: string; description: string; dimension: string }) =>
  `${p.code} ${p.description} ${p.dimension}`;

export default async function InventoryCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) notFound();

  const session = await auth();
  const category = await getInventoryCategory(categoryId);
  if (!category) notFound();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{category.title}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/inventario" />

      <Link href="/admin/inventario" className="admin-back-link">
        ← Volver a las categorías
      </Link>

      <section className="admin-category admin-category-page">
        <div className="admin-category-page-head">
          <CategoryHead
            category={{
              ...category,
              meta: `${category.products.length} ${
                category.products.length === 1 ? "producto" : "productos"
              } · valor ${category.inventoryValue.toFixed(2)}`,
            }}
            onUploadImage={setCategoryImage.bind(null, category.id)}
            onRemoveImage={removeCategoryImage.bind(null, category.id)}
            onUpdate={updateCategory.bind(null, category.id)}
            onDelete={deleteCategoryAndReturn.bind(null, category.id)}
          />
        </div>

        <InventorySearch texts={category.products.map(productText)}>
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
                    <InfoTooltip text="Precio de catálogo: el que ve el cliente en la página pública. En las órdenes de venta se puede aplicar un descuento por línea." />
                  </th>
                  <th className="num">
                    Valor
                    <InfoTooltip text="Stock actual × precio de este producto." />
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
        </InventorySearch>
      </section>
    </div>
  );
}
