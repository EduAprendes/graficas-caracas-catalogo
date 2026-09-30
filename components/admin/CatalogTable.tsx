"use client";

import { useState } from "react";
import type { InventoryCategory } from "@/lib/inventory";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Vista de solo lectura del catálogo para vendedoras: buscar por código o descripción.
export default function CatalogTable({ categories }: { categories: InventoryCategory[] }) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  const visible = categories
    .map((category) => ({
      ...category,
      products: category.products.filter((product) => {
        const haystack = normalize(
          `${product.code} ${product.description} ${product.dimension} ${category.title}`
        );
        return terms.every((term) => haystack.includes(term));
      }),
    }))
    .filter((category) => category.products.length > 0);

  return (
    <>
      <input
        className="admin-input catalog-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por código o descripción…"
        aria-label="Buscar en el catálogo"
      />

      {visible.length === 0 ? (
        <p className="ledger-empty">No hay productos que coincidan.</p>
      ) : (
        visible.map((category) => (
          <section key={category.id} className="catalog-category">
            <h2 className="statement-heading">{category.title}</h2>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>{category.dimensionLabel}</th>
                    <th className="num">Stock</th>
                    <th className="num">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {category.products.map((product) => (
                    <tr key={product.id}>
                      <td data-label="Código">
                        <span className="code">{product.code}</span>
                      </td>
                      <td data-label="Descripción">{product.description}</td>
                      <td data-label={category.dimensionLabel}>{product.dimension || "—"}</td>
                      <td className="num" data-label="Stock">
                        <span className={`stock-badge${product.stock === 0 ? " stock-zero" : ""}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="num" data-label="Precio">{product.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}
