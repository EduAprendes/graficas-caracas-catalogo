"use client";

import { createContext, useContext, useMemo, useState } from "react";

// Minúsculas y sin acentos, para que "vinil" encuentre "Vinil" y "esmerilado" a "Ésmerilado".
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Cada palabra escrita debe aparecer en algún punto del texto (orden libre).
export function matchesSearch(haystack: string, query: string): boolean {
  if (!query) return true;
  const text = normalizeSearch(haystack);
  return query.split(/\s+/).every((word) => text.includes(word));
}

const QueryContext = createContext("");

export function useInventoryQuery(): string {
  return useContext(QueryContext);
}

export default function InventorySearch({
  texts,
  children,
}: {
  /** Texto buscable de cada producto del inventario (código, descripción y medida). */
  texts: string[];
  children: React.ReactNode;
}) {
  const [raw, setRaw] = useState("");
  const query = normalizeSearch(raw);

  const matchCount = useMemo(
    () => (query ? texts.filter((t) => matchesSearch(t, query)).length : texts.length),
    [texts, query]
  );

  return (
    <QueryContext.Provider value={query}>
      <div className="inventory-search" role="search">
        <svg
          className="inventory-search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Buscar producto por nombre, código o medida…"
          aria-label="Buscar producto"
          className="admin-input inventory-search-input"
          autoComplete="off"
        />
        {raw ? (
          <button
            type="button"
            className="admin-cancel-btn inventory-search-clear"
            onClick={() => setRaw("")}
          >
            Limpiar
          </button>
        ) : null}
      </div>
      {query ? (
        <p className="inventory-search-count" aria-live="polite">
          {matchCount === 0
            ? "Ningún producto coincide con la búsqueda."
            : `${matchCount} ${matchCount === 1 ? "producto encontrado" : "productos encontrados"}`}
        </p>
      ) : null}
      {children}
    </QueryContext.Provider>
  );
}
