"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductOption } from "@/lib/inventory";

type Row = {
  productId: number | "";
  material: string;
  tipo: string;
  reverso: string;
  acabado: string;
  ancho: string;
  alto: string;
  description: string;
  quantity: string;
};

function emptyRow(): Row {
  return {
    productId: "",
    material: "",
    tipo: "",
    reverso: "",
    acabado: "",
    ancho: "",
    alto: "",
    description: "",
    quantity: "1",
  };
}

export type SalesOrderPayload = {
  customerName: string;
  plotter: string;
  notes: string;
  items: {
    productId: number;
    material: string | null;
    tipo: string | null;
    reverso: string | null;
    acabado: string | null;
    ancho: number | null;
    alto: number | null;
    description: string;
    quantity: number;
  }[];
};

export default function SalesOrderForm({
  products,
  onCreate,
}: {
  products: ProductOption[];
  onCreate: (data: SalesOrderPayload) => Promise<{ id: number } | { error: string }>;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [plotter, setPlotter] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleProductSelect(index: number, value: string) {
    if (!value) {
      updateRow(index, { productId: "" });
      return;
    }
    const product = products.find((p) => p.id === Number(value));
    updateRow(index, {
      productId: product ? product.id : "",
      description: product ? product.description : rows[index].description,
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const payload: SalesOrderPayload = {
      customerName,
      plotter,
      notes,
      items: rows
        .filter((row) => row.productId !== "")
        .map((row) => ({
          productId: Number(row.productId),
          material: row.material || null,
          tipo: row.tipo || null,
          reverso: row.reverso || null,
          acabado: row.acabado || null,
          ancho: row.ancho ? Number(row.ancho) : null,
          alto: row.alto ? Number(row.alto) : null,
          description: row.description,
          quantity: Number(row.quantity),
        })),
    };

    startTransition(async () => {
      const result = await onCreate(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/admin/pedidos/${result.id}`);
    });
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-form-header">
        <label>
          Cliente
          <input
            className="admin-input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nombre del cliente"
            required
          />
        </label>
        <label>
          Plotter / máquina
          <input
            className="admin-input"
            value={plotter}
            onChange={(e) => setPlotter(e.target.value)}
            placeholder="Ej: ROLAND"
          />
        </label>
        <label className="order-form-notes">
          Notas
          <input
            className="admin-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="order-items-table">
          <thead>
            <tr>
              <th className="num">Cant</th>
              <th>Producto del catálogo</th>
              <th>Material</th>
              <th>Tipo</th>
              <th>Reverso</th>
              <th>Acabado</th>
              <th className="num">Ancho</th>
              <th className="num">Alto</th>
              <th className="num">M²</th>
              <th>Descripción</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const ancho = Number(row.ancho);
              const alto = Number(row.alto);
              const m2 = row.ancho && row.alto ? Math.round(ancho * alto * 100) / 100 : null;
              return (
                <tr key={index}>
                  <td className="num">
                    <input
                      type="number"
                      min={1}
                      className="admin-input admin-input-sm order-input-cant"
                      value={row.quantity}
                      onChange={(e) => updateRow(index, { quantity: e.target.value })}
                      required
                    />
                  </td>
                  <td>
                    <select
                      className="admin-input"
                      value={row.productId}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      required
                    >
                      <option value="">— Elegir producto —</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} · {product.description} (stock {product.stock})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input-sm"
                      value={row.material}
                      onChange={(e) => updateRow(index, { material: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input-sm"
                      value={row.tipo}
                      onChange={(e) => updateRow(index, { tipo: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input-sm"
                      value={row.reverso}
                      onChange={(e) => updateRow(index, { reverso: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input-sm"
                      value={row.acabado}
                      onChange={(e) => updateRow(index, { acabado: e.target.value })}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="admin-input admin-input-sm order-input-num"
                      value={row.ancho}
                      onChange={(e) => updateRow(index, { ancho: e.target.value })}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="admin-input admin-input-sm order-input-num"
                      value={row.alto}
                      onChange={(e) => updateRow(index, { alto: e.target.value })}
                    />
                  </td>
                  <td className="num order-m2">{m2 ?? "—"}</td>
                  <td>
                    <input
                      className="admin-input"
                      value={row.description}
                      onChange={(e) => updateRow(index, { description: e.target.value })}
                      placeholder="Descripción"
                      required
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-delete-btn"
                      onClick={() => removeRow(index)}
                      disabled={rows.length === 1}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" className="admin-add-btn" onClick={addRow}>
        + Línea
      </button>

      {error ? <p className="login-error">{error}</p> : null}

      <div className="order-form-actions">
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? "Guardando…" : "Crear orden"}
        </button>
      </div>
    </form>
  );
}
