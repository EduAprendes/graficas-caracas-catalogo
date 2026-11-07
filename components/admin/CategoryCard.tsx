"use client";

import Link from "next/link";
import { matchesSearch, useInventoryQuery } from "@/components/admin/InventorySearch";

// Tarjeta de una categoría del inventario: al tocarla se abre la lista de sus productos.
export default function CategoryCard({
  id,
  title,
  subtitle,
  imagePath,
  productCount,
  outOfStock,
  lowStock = 0,
  value,
  searchTexts,
}: {
  id: number;
  title: string;
  subtitle: string | null;
  imagePath: string | null;
  productCount: number;
  outOfStock: number;
  /** Productos por debajo del 20 % de su última recepción (incluye los agotados con referencia). */
  lowStock?: number;
  value: string;
  /** Texto buscable de cada producto de la categoría. */
  searchTexts: string[];
}) {
  const query = useInventoryQuery();

  // Con una búsqueda activa, solo se ven las categorías que tienen coincidencias.
  const matches = query ? searchTexts.filter((text) => matchesSearch(text, query)).length : 0;
  if (query && matches === 0) return null;

  return (
    <Link href={`/admin/inventario/${id}`} className="inv-card">
      <span className="inv-card-media">
        {imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePath} alt="" className="inv-card-img" />
        ) : (
          <span className="inv-card-initial" aria-hidden="true">
            {title.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className="inv-card-body">
        <span className="inv-card-title">{title}</span>
        {subtitle ? <span className="inv-card-sub">{subtitle}</span> : null}
        <span className="inv-card-meta">
          {productCount} {productCount === 1 ? "producto" : "productos"} · valor {value}
        </span>
        <span className="inv-card-badges">
          {query ? (
            <span className="inv-card-badge inv-card-badge-hit">
              {matches} {matches === 1 ? "coincidencia" : "coincidencias"}
            </span>
          ) : null}
          {lowStock > 0 ? (
            <span className="inv-card-badge inv-card-badge-warn">
              {lowStock} con stock bajo
            </span>
          ) : null}
          {outOfStock > 0 ? (
            <span className="inv-card-badge inv-card-badge-warn">
              {outOfStock} sin stock
            </span>
          ) : null}
        </span>
      </span>
      <span className="inv-card-arrow" aria-hidden="true">›</span>
    </Link>
  );
}
