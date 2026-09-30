"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductOption } from "@/lib/inventory";
import type { CustomerOption } from "@/lib/customers";
import type { SellerOption } from "@/lib/sellers";
import SearchSelect from "@/components/admin/SearchSelect";
import NewCustomerModal, {
  type NewCustomerInput,
} from "@/components/admin/NewCustomerModal";

type Row = {
  productId: number | "";
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

function rowTotal(row: Row): number {
  if (!row.unitPrice) return 0;
  const discount = Math.min(100, Math.max(0, Number(row.discountPercent || 0)));
  return (
    Number(row.unitPrice) * Number(row.quantity || 0) * (1 - discount / 100)
  );
}

function emptyRow(): Row {
  return {
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discountPercent: "",
  };
}

export type SalesOrderPayload = {
  customerId: number | null;
  paymentType: "CONTADO" | "CREDITO";
  deliveryType: "TIENDA" | "DESPACHADO";
  sellerId: number | null;
  deliveryAddress: string;
  notes: string;
  items: {
    productId: number;
    description: string;
    quantity: number;
    unitPrice: number | null;
    discountPercent: number;
  }[];
};

export default function SalesOrderForm({
  products,
  customers: initialCustomers,
  sellers,
  onCreate,
  onCreateCustomer,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  sellers: SellerOption[];
  onCreate: (
    data: SalesOrderPayload,
  ) => Promise<{ id: number; email: string } | { error: string }>;
  onCreateCustomer: (
    input: NewCustomerInput,
  ) => Promise<{ customer: CustomerOption } | { error: string }>;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customers, setCustomers] = useState(initialCustomers);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"CONTADO" | "CREDITO">(
    "CONTADO",
  );
  const [deliveryType, setDeliveryType] = useState<"TIENDA" | "DESPACHADO">(
    "TIENDA",
  );
  const [sellerId, setSellerId] = useState<number | "">("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function handleCustomerSelect(value: number | "") {
    setCustomerId(value);
    const customer = customers.find((c) => c.id === value);
    // Al elegir un cliente registrado se trae su dirección (editable para esta orden).
    setDeliveryAddress(customer?.address ?? "");
  }

  function handleCustomerCreated(customer: CustomerOption) {
    setCustomers((prev) =>
      [...prev, customer].sort((a, b) => a.name.localeCompare(b.name, "es")),
    );
    setCustomerId(customer.id);
    setDeliveryAddress(customer.address ?? "");
    setShowCustomerModal(false);
  }

  function handleProductSelect(index: number, value: number | "") {
    if (value === "") {
      updateRow(index, { productId: "" });
      return;
    }
    const product = products.find((p) => p.id === value);
    updateRow(index, {
      productId: product ? product.id : "",
      description: product ? product.description : rows[index].description,
      unitPrice:
        product && !rows[index].unitPrice
          ? String(product.price)
          : rows[index].unitPrice,
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

    if (customerId === "") {
      setError("Elegí un cliente o creá uno nuevo");
      return;
    }

    const payload: SalesOrderPayload = {
      customerId,
      paymentType,
      deliveryType,
      sellerId: sellerId === "" ? null : sellerId,
      deliveryAddress: deliveryAddress.trim(),
      notes,
      items: rows
        .filter((row) => row.productId !== "")
        .map((row) => ({
          productId: Number(row.productId),
          description: row.description,
          quantity: Number(row.quantity),
          unitPrice: row.unitPrice ? Number(row.unitPrice) : null,
          discountPercent: row.discountPercent
            ? Number(row.discountPercent)
            : 0,
        })),
    };

    startTransition(async () => {
      const result = await onCreate(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/admin/pedidos/${result.id}?correo=${result.email}`);
    });
  }

  return (
    <>
      <form className="order-form" onSubmit={handleSubmit}>
        <div className="order-form-header">
          <div className="order-form-field">
            Cliente
            <div className="order-form-customer">
              <SearchSelect
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.company
                    ? `${customer.name} · ${customer.company}`
                    : customer.name,
                  searchText: [customer.phone, customer.email]
                    .filter(Boolean)
                    .join(" "),
                }))}
                value={customerId}
                onChange={handleCustomerSelect}
                placeholder="Buscar cliente…"
                required
              />
              <button
                type="button"
                className="admin-add-btn"
                onClick={() => setShowCustomerModal(true)}
              >
                + Nuevo
              </button>
            </div>
          </div>
          <label>
            Forma de pago
            <select
              className="admin-input"
              value={paymentType}
              onChange={(e) =>
                setPaymentType(e.target.value as "CONTADO" | "CREDITO")
              }
            >
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </label>
          <label>
            Vendedor
            <select
              className="admin-input"
              value={sellerId}
              onChange={(e) =>
                setSellerId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Tienda (sin comisión)</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} ({seller.commissionPercent}%)
                </option>
              ))}
            </select>
          </label>
          <label>
            Entrega
            <select
              className="admin-input"
              value={deliveryType}
              onChange={(e) =>
                setDeliveryType(e.target.value as "TIENDA" | "DESPACHADO")
              }
            >
              <option value="TIENDA">Recogido en tienda</option>
              <option value="DESPACHADO">Despachado</option>
            </select>
          </label>
          <label className="order-form-notes">
            Dirección de entrega
            <input
              className="admin-input"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={
                customerId === ""
                  ? "Elegí un cliente"
                  : "Sin dirección registrada"
              }
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
                      onChange={(e) =>
                        updateRow(index, { quantity: e.target.value })
                      }
                      required
                    />
                  </label>
                  <div className="order-item-field order-item-field-wide">
                    Producto del catálogo
                    <SearchSelect
                      options={products.map((product) => ({
                        value: product.id,
                        label: `${product.code} · ${product.description} (stock ${product.stock})`,
                        searchText: `${product.dimension} ${product.categoryTitle}`,
                      }))}
                      value={row.productId}
                      onChange={(value) => handleProductSelect(index, value)}
                      placeholder="Buscar por código o descripción…"
                      required
                    />
                  </div>
                  <label className="order-item-field order-item-field-wide">
                    Descripción
                    <input
                      className="admin-input"
                      value={row.description}
                      onChange={(e) =>
                        updateRow(index, { description: e.target.value })
                      }
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
                      onChange={(e) =>
                        updateRow(index, { unitPrice: e.target.value })
                      }
                    />
                  </label>
                  <label className="order-item-field">
                    Descuento %
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="admin-input"
                      value={row.discountPercent}
                      onChange={(e) =>
                        updateRow(index, { discountPercent: e.target.value })
                      }
                      placeholder="0"
                    />
                  </label>
                  <div className="order-item-field">
                    Subtotal
                    <span className="order-m2">
                      {row.unitPrice ? rowTotal(row).toFixed(2) : "—"}
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
            {rows.reduce((sum, row) => sum + rowTotal(row), 0).toFixed(2)}
          </strong>
        </p>

        {error ? <p className="login-error">{error}</p> : null}

        <div className="order-form-actions">
          <button type="submit" className="admin-save-btn" disabled={isPending}>
            {isPending ? "Guardando…" : "Crear orden"}
          </button>
        </div>
      </form>
      {showCustomerModal ? (
        <NewCustomerModal
          onCreate={onCreateCustomer}
          onCreated={handleCustomerCreated}
          onClose={() => setShowCustomerModal(false)}
        />
      ) : null}
    </>
  );
}
