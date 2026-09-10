"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryView, ProductView } from "@/lib/catalog";

function sinTildes(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",");
}

export default function CatalogBrowser({ categories }: { categories: CategoryView[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [previewProduct, setPreviewProduct] = useState<ProductView | null>(null);

  useEffect(() => {
    if (!previewProduct) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewProduct(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewProduct]);

  const q = sinTildes(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    return categories.map((category) => {
      const catMatches = activeCat === "all" || activeCat === category.slug;
      const products = category.products.filter((product) => {
        if (!catMatches) return false;
        if (q === "") return true;
        const haystack = sinTildes(
          `${product.code} ${product.description}`.toLowerCase()
        );
        return haystack.indexOf(q) !== -1;
      });
      return { category, products };
    });
  }, [categories, activeCat, q]);

  const visibleCount = filtered.reduce((n, c) => n + c.products.length, 0);

  return (
    <>
      <div className="filters">
        <input
          className="search"
          type="text"
          placeholder="Buscar por código o descripción…"
          aria-label="Buscar producto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chip-row">
          <button
            type="button"
            className="chip"
            aria-pressed={activeCat === "all"}
            onClick={() => setActiveCat("all")}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              className="chip"
              aria-pressed={activeCat === category.slug}
              onClick={() => setActiveCat(category.slug)}
            >
              {category.title}
            </button>
          ))}
        </div>
        <span className="count">
          {visibleCount} {visibleCount === 1 ? "producto" : "productos"}
        </span>
      </div>

      {filtered.map(({ category, products }) => (
        <section
          className="category"
          key={category.slug}
          hidden={products.length === 0}
        >
          {category.imagePath ? (
            <div className="cat-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.imagePath} alt={category.title} />
              <div className="cat-cover-label">
                <span className="regdots">
                  <span className="c"></span>
                  <span className="m"></span>
                  <span className="y"></span>
                  <span className="k"></span>
                </span>
                <h2>
                  {category.title}
                  {category.subtitle ? (
                    <span className="sub"> — {category.subtitle}</span>
                  ) : null}
                </h2>
              </div>
            </div>
          ) : (
            <div className="category-head">
              <span className="regdots">
                <span className="c"></span>
                <span className="m"></span>
                <span className="y"></span>
                <span className="k"></span>
              </span>
              <h2>
                {category.title}
                {category.subtitle ? (
                  <span className="sub"> — {category.subtitle}</span>
                ) : null}
              </h2>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className="num">{category.dimensionLabel}</th>
                  <th className="num">Precio</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="clickable-row"
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver imagen de ${product.description}`}
                    onClick={() => setPreviewProduct(product)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPreviewProduct(product);
                      }
                    }}
                  >
                    <td data-label="Código">
                      <span className="code prod-code">{product.code}</span>
                    </td>
                    <td data-label="Descripción" className="desc-cell prod-desc">
                      {product.description}
                    </td>
                    <td data-label="Medida" className="num dim">
                      {product.dimension}
                    </td>
                    <td data-label="Precio" className="num price">
                      <span className="sym">$</span>
                      {formatPrice(product.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className={`no-results${visibleCount === 0 ? " visible" : ""}`}>
        Ningún producto coincide con la búsqueda.
      </p>

      {previewProduct ? (
        <div
          className="product-modal-overlay"
          onClick={() => setPreviewProduct(null)}
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={previewProduct.description}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="product-modal-close"
              onClick={() => setPreviewProduct(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            {previewProduct.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewProduct.imageUrl}
                alt={previewProduct.description}
                className="product-modal-img"
              />
            ) : (
              <div className="product-modal-empty">Todavía no hay una foto cargada para este producto.</div>
            )}
            <p className="product-modal-caption">
              <span className="code">{previewProduct.code}</span> — {previewProduct.description}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
