"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeliveryFields, DeliveryInput } from "@/lib/delivery";

// Datos de transporte y de control de la orden de entrega de un pedido despachado.
export default function DeliveryOrderForm({
  orderId,
  initial,
  onSave,
}: {
  orderId: number;
  initial: DeliveryFields;
  onSave: (input: DeliveryInput) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<DeliveryInput>({
    driverName: initial.driverName ?? "",
    driverIdNumber: initial.driverIdNumber ?? "",
    vehiclePlate: initial.vehiclePlate ?? "",
    deliveryControlNumber: initial.deliveryControlNumber ?? "",
    deliveryPrinterInfo: initial.deliveryPrinterInfo ?? "",
  });
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function set(field: keyof DeliveryInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(values);
      if ("error" in result) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      setMessage({ text: "Datos guardados.", ok: true });
      router.refresh();
    });
  }

  return (
    <section className="order-ticket no-print">
      <header className="order-ticket-head">
        <div>
          <p className="order-ticket-title">Orden de entrega</p>
        </div>
      </header>
      <p className="statement-note">
        Documento interno para el transportista. No es un documento fiscal hasta que la imprenta
        digital autorizada le asigne su número de control (ver docs/ORDEN-DE-ENTREGA-SENIAT.md).
      </p>
      <form className="admin-form delivery-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          Chofer
          <input
            className="admin-input"
            value={values.driverName}
            onChange={(e) => set("driverName", e.target.value)}
            placeholder="Nombre y apellido"
          />
        </label>
        <label className="admin-field admin-field-sm">
          Cédula del chofer
          <input
            className="admin-input"
            value={values.driverIdNumber}
            onChange={(e) => set("driverIdNumber", e.target.value)}
            placeholder="V-12345678"
          />
        </label>
        <label className="admin-field admin-field-sm">
          Placa del vehículo
          <input
            className="admin-input"
            value={values.vehiclePlate}
            onChange={(e) => set("vehiclePlate", e.target.value)}
            placeholder="AB123CD"
          />
        </label>
        <label className="admin-field admin-field-sm">
          N° de control (imprenta)
          <input
            className="admin-input"
            value={values.deliveryControlNumber}
            onChange={(e) => set("deliveryControlNumber", e.target.value)}
            placeholder="00-000000"
          />
        </label>
        <label className="admin-field">
          Datos de la imprenta autorizada
          <input
            className="admin-input"
            value={values.deliveryPrinterInfo}
            onChange={(e) => set("deliveryPrinterInfo", e.target.value)}
            placeholder="Nombre, RIF y providencia de autorización"
          />
        </label>
        <button type="submit" className="admin-save-btn" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar datos"}
        </button>
        <Link href={`/admin/pedidos/${orderId}/entrega`} className="admin-edit-btn">
          Ver / imprimir orden de entrega
        </Link>
      </form>
      {message ? (
        <p className={message.ok ? "statement-note" : "login-error"}>{message.text}</p>
      ) : null}
    </section>
  );
}
