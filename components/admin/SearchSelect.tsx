"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SearchSelectOption = {
  value: number;
  label: string;
  // Texto extra sobre el que también se filtra (código, empresa, etc.)
  searchText?: string;
};

const MAX_VISIBLE = 50;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  required = false,
  emptyLabel,
}: {
  options: SearchSelectOption[];
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  required?: boolean;
  // Si se pasa, agrega una primera opción fija que limpia la selección.
  emptyLabel?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = options.filter((option) => {
    const haystack = normalize(`${option.label} ${option.searchText ?? ""}`);
    return terms.every((term) => haystack.includes(term));
  });
  const visible = filtered.slice(0, MAX_VISIBLE);

  function choose(next: number | "") {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="search-select" ref={rootRef}>
      <input
        className="admin-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder={selected ? selected.label : placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (visible.length > 0) choose(visible[0].value);
          }
        }}
        // Sin selección, el navegador bloquea el envío y marca el campo.
        required={required && value === ""}
      />
      {open ? (
        <ul className="search-select-list" id={listId} role="listbox">
          {emptyLabel ? (
            <li>
              <button type="button" className="search-select-option" onClick={() => choose("")}>
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {visible.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`search-select-option${option.value === value ? " is-selected" : ""}`}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
          {visible.length === 0 ? <li className="search-select-empty">Sin resultados</li> : null}
          {filtered.length > MAX_VISIBLE ? (
            <li className="search-select-empty">
              Mostrando {MAX_VISIBLE} de {filtered.length}; seguí escribiendo para acotar.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
