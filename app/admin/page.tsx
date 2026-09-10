import { auth } from "@/auth";
import { getInventory } from "@/lib/inventory";
import { adjustStockForm, logoutAction } from "./actions";
import ProductImageUpload from "@/components/admin/ProductImageUpload";

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

      {categories.map((category) => (
        <section key={category.id} className="admin-category">
          <h2>{category.title}</h2>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className="num">Stock</th>
                  <th className="num">Ajustar</th>
                </tr>
              </thead>
              <tbody>
                {category.products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <ProductImageUpload
                        productId={product.id}
                        productLabel={product.description}
                        initialImageUrl={product.imageUrl}
                      />
                    </td>
                    <td>
                      <span className="code">{product.code}</span>
                    </td>
                    <td>{product.description}</td>
                    <td className="num">
                      <span
                        className={`stock-badge${product.stock === 0 ? " stock-zero" : ""}`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="num">
                      <form action={adjustStockForm} className="stock-form">
                        <input type="hidden" name="productId" value={product.id} />
                        <input
                          type="number"
                          name="amount"
                          min={1}
                          defaultValue={1}
                          className="stock-amount"
                          aria-label={`Cantidad a ajustar para ${product.description}`}
                        />
                        <button type="submit" name="direction" value="in" className="stock-btn stock-in">
                          + Entrada
                        </button>
                        <button type="submit" name="direction" value="out" className="stock-btn stock-out">
                          − Salida
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
