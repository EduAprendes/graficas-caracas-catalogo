"use client";

import { matchesSearch, useInventoryQuery } from "@/components/admin/InventorySearch";

export default function CategorySection({
  id,
  head,
  children,
  searchTexts = [],
}: {
  id: number;
  head: React.ReactNode;
  children: React.ReactNode;
  /** Texto buscable de cada producto de la categoría (para ocultarla si ninguno coincide). */
  searchTexts?: string[];
}) {
  const inputId = `category-toggle-${id}`;
  const query = useInventoryQuery();

  // Con una búsqueda activa, las categorías sin coincidencias se ocultan.
  if (query && !searchTexts.some((text) => matchesSearch(text, query))) return null;

  return (
    <section className={`admin-category${query ? " is-searching" : ""}`}>
      <input type="checkbox" id={inputId} className="admin-category-toggle-checkbox" />
      <div className="admin-category-toggle-row">
        <div className="admin-category-toggle-head">{head}</div>
        <label htmlFor={inputId} className="admin-category-toggle" aria-hidden="true" />
      </div>
      <div className="admin-category-body">{children}</div>
    </section>
  );
}
