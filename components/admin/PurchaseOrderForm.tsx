"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductOption } from "@/lib/inventory";

type Row = {
  productId: number | "";
  quantity: string;
  cost: string;
};

function emptyRow(): Row {
  return { productId: "", quantity: "1", cost: "" };
}

export type PurchaseOrderPayload = {
  supplierName: string;
  notes: string;
  items: { productId: number; quantity: number; cost: number | null }[];
};

export default function PurchaseOrderForm({
  products,
  onCreate,
}: {
  products: ProductOption[];
  onCreate: (data: PurchaseOrderPayload) => Promise<{ id: number } | { error: string }>;
}) {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
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

    const items = rows
      .filter((row) => row.productId !== "")
      .map((row) => ({
        productId: Number(row.productId),
        quantity: Number(row.quantity),
        cost: row.cost ? Number(row.cost) : null,
      }));

    startTransition(async () => {
      const result = await onCreate({ supplierName, notes, items });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/admin/compras/${result.id}`);
    });
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-form-header">
        <label>
          Proveedor
          <input
            className="admin-input"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Nombre del proveedor"
            required
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
              <th>Producto</th>
              <th className="num">Cantidad</th>
              <th className="num">Costo unitario</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <select
                    className="admin-input"
                    value={row.productId}
                    onChange={(e) =>
                      updateRow(index, { productId: e.target.value ? Number(e.target.value) : "" })
                    }
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
                <td className="num">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="admin-input admin-input-sm order-input-num"
                    value={row.cost}
                    onChange={(e) => updateRow(index, { cost: e.target.value })}
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
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="admin-add-btn" onClick={addRow}>
        + Línea
      </button>

      {error ? <p className="login-error">{error}</p> : null}

      <div className="order-form-actions">
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? "Guardando…" : "Crear orden de compra"}
        </button>
      </div>
    </form>
  );
}
