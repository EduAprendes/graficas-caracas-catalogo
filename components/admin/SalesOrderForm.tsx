"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductOption } from "@/lib/inventory";
import type { CustomerOption } from "@/lib/customers";

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
  unitPrice: string;
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
    unitPrice: "",
  };
}

export type SalesOrderPayload = {
  customerId: number | null;
  newCustomerName: string;
  paymentType: "CONTADO" | "CREDITO";
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
    unitPrice: number | null;
  }[];
};

export default function SalesOrderForm({
  products,
  customers,
  onCreate,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  onCreate: (data: SalesOrderPayload) => Promise<{ id: number } | { error: string }>;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<number | "">("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [paymentType, setPaymentType] = useState<"CONTADO" | "CREDITO">("CONTADO");
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
      unitPrice: product && !rows[index].unitPrice ? String(product.price) : rows[index].unitPrice,
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
      customerId: customerId === "" ? null : customerId,
      newCustomerName,
      paymentType,
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
          unitPrice: row.unitPrice ? Number(row.unitPrice) : null,
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
          <select
            className="admin-input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">— Cliente nuevo —</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        {customerId === "" ? (
          <label>
            Nombre del cliente nuevo
            <input
              className="admin-input"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </label>
        ) : null}
        <label>
          Forma de pago
          <select
            className="admin-input"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as "CONTADO" | "CREDITO")}
          >
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
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

      <div className="order-items-list">
        {rows.map((row, index) => {
          const ancho = Number(row.ancho);
          const alto = Number(row.alto);
          const m2 = row.ancho && row.alto ? Math.round(ancho * alto * 100) / 100 : null;
          return (
            <div className="order-item-card" key={index}>
              <div className="order-item-fields">
                <label className="order-item-field">
                  Cant
                  <input
                    type="number"
                    min={1}
                    className="admin-input"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: e.target.value })}
                    required
                  />
                </label>
                <label className="order-item-field order-item-field-wide">
                  Producto del catálogo
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
                  Material
                  <input
                    className="admin-input"
                    value={row.material}
                    onChange={(e) => updateRow(index, { material: e.target.value })}
                  />
                </label>
                <label className="order-item-field">
                  Tipo
                  <input
                    className="admin-input"
                    value={row.tipo}
                    onChange={(e) => updateRow(index, { tipo: e.target.value })}
                  />
                </label>
                <label className="order-item-field">
                  Reverso
                  <input
                    className="admin-input"
                    value={row.reverso}
                    onChange={(e) => updateRow(index, { reverso: e.target.value })}
                  />
                </label>
                <label className="order-item-field">
                  Acabado
                  <input
                    className="admin-input"
                    value={row.acabado}
                    onChange={(e) => updateRow(index, { acabado: e.target.value })}
                  />
                </label>
                <label className="order-item-field">
                  Ancho
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="admin-input"
                    value={row.ancho}
                    onChange={(e) => updateRow(index, { ancho: e.target.value })}
                  />
                </label>
                <label className="order-item-field">
                  Alto
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="admin-input"
                    value={row.alto}
                    onChange={(e) => updateRow(index, { alto: e.target.value })}
                  />
                </label>
                <div className="order-item-field">
                  M²
                  <span className="order-m2">{m2 ?? "—"}</span>
                </div>
                <label className="order-item-field order-item-field-wide">
                  Descripción
                  <input
                    className="admin-input"
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    placeholder="Descripción"
                    required
                  />
                </label>
                <label className="order-item-field">
                  Precio unit.
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="admin-input"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
                  />
                </label>
                <div className="order-item-field">
                  Subtotal
                  <span className="order-m2">
                    {row.unitPrice
                      ? (Number(row.unitPrice) * Number(row.quantity || 0)).toFixed(2)
                      : "—"}
                  </span>
                </div>
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
          );
        })}
      </div>

      <button type="button" className="admin-add-btn" onClick={addRow}>
        + Línea
      </button>

      <p className="admin-inventory-total">
        Total de la orden:{" "}
        <strong>
          {rows
            .reduce(
              (sum, row) =>
                sum + (row.unitPrice ? Number(row.unitPrice) * Number(row.quantity || 0) : 0),
              0
            )
            .toFixed(2)}
        </strong>
      </p>

      {error ? <p className="login-error">{error}</p> : null}

      <div className="order-form-actions">
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? "Guardando…" : "Crear orden"}
        </button>
      </div>
    </form>
  );
}
