"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductOption } from "@/lib/inventory";

type Row = {
  productId: number | "";
  quantity: string;
  cost: string;
  suggestedPrice: string;
};

function emptyRow(): Row {
  return { productId: "", quantity: "1", cost: "", suggestedPrice: "" };
}

export type PurchaseOrderPayload = {
  supplierName: string;
  notes: string;
  items: {
    productId: number;
    quantity: number;
    cost: number | null;
    suggestedPrice: number | null;
  }[];
};

export type PurchaseOrderInitialData = {
  supplierName: string;
  notes: string;
  items: {
    productId: number;
    quantity: number;
    cost: number | null;
    suggestedPrice: number | null;
  }[];
};

export default function PurchaseOrderForm({
  products,
  onCreate,
  initialData,
  submitLabel = "Crear orden de compra",
  pendingLabel = "Guardando…",
}: {
  products: ProductOption[];
  onCreate: (data: PurchaseOrderPayload) => Promise<{ id: number } | { error: string }>;
  initialData?: PurchaseOrderInitialData;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState(initialData?.supplierName ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(
    initialData && initialData.items.length > 0
      ? initialData.items.map((item) => ({
          productId: item.productId,
          quantity: String(item.quantity),
          cost: item.cost != null ? String(item.cost) : "",
          suggestedPrice: item.suggestedPrice != null ? String(item.suggestedPrice) : "",
        }))
      : [emptyRow()]
  );
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
      suggestedPrice:
        product && !rows[index].suggestedPrice && product.suggestedPrice != null
          ? String(product.suggestedPrice)
          : rows[index].suggestedPrice,
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

    const items = rows
      .filter((row) => row.productId !== "")
      .map((row) => ({
        productId: Number(row.productId),
        quantity: Number(row.quantity),
        cost: row.cost ? Number(row.cost) : null,
        suggestedPrice: row.suggestedPrice ? Number(row.suggestedPrice) : null,
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

      <div className="order-items-list">
        {rows.map((row, index) => (
          <div className="order-item-card" key={index}>
            <div className="order-item-fields">
              <label className="order-item-field order-item-field-wide">
                Producto
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
              </label>
              <label className="order-item-field">
                Cantidad
                <input
                  type="number"
                  min={1}
                  className="admin-input"
                  value={row.quantity}
                  onChange={(e) => updateRow(index, { quantity: e.target.value })}
                  required
                />
              </label>
              <label className="order-item-field">
                Costo unitario
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="admin-input"
                  value={row.cost}
                  onChange={(e) => updateRow(index, { cost: e.target.value })}
                />
              </label>
              <label className="order-item-field">
                Precio sugerido
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="admin-input"
                  value={row.suggestedPrice}
                  onChange={(e) => updateRow(index, { suggestedPrice: e.target.value })}
                />
              </label>
            </div>
            <div className="order-item-actions">
              <button
                type="button"
                className="admin-delete-btn"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="admin-add-btn" onClick={addRow}>
        + Línea
      </button>

      {error ? <p className="login-error">{error}</p> : null}

      <div className="order-form-actions">
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
