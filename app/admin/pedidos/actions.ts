"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/access";
import {
  addSalesOrderPayment as addSalesOrderPaymentData,
  cancelSalesOrder as cancelSalesOrderData,
  createSalesOrder as createSalesOrderData,
  type SalesOrderItemInput,
} from "@/lib/orders";
import { sendSalesOrderEmail, type OrderEmailStatus } from "@/lib/order-email";
import { saveDeliveryFields, type DeliveryInput } from "@/lib/delivery";
import { createCustomer as createCustomerData, type CustomerOption } from "@/lib/customers";

async function requireAdminId() {
  const user = await requireAdmin();
  return user.id;
}

export async function createCustomerForOrderAction(input: {
  name: string;
  company: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
}): Promise<{ customer: CustomerOption } | { error: string }> {
  try {
    await requireUser();
    if (!input.name.trim()) return { error: "Falta el nombre de contacto" };

    const customer = await createCustomerData({
      name: input.name,
      company: input.company || null,
      taxId: input.taxId || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: null,
    });

    revalidatePath("/admin/clientes");

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        company: customer.company,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el cliente" };
  }
}

export async function createSalesOrderAction(input: {
  customerId: number | null;
  paymentType: "CONTADO" | "CREDITO";
  deliveryType: "TIENDA" | "DESPACHADO";
  sellerId: number | null;
  deliveryAddress: string;
  notes: string;
  items: SalesOrderItemInput[];
}): Promise<{ id: number; email: OrderEmailStatus } | { error: string }> {
  try {
    const user = await requireUser();
    const userId = user.id;

    if (!input.customerId) return { error: "Elegí un cliente o creá uno nuevo" };

    const order = await createSalesOrderData(userId, {
      customerId: input.customerId,
      paymentType: input.paymentType,
      deliveryType: input.deliveryType,
      // Una vendedora siempre vende como ella misma; el admin elige el vendedor (o tienda).
      sellerId: user.role === "VENDEDOR" ? user.sellerId : input.sellerId,
      deliveryAddress: input.deliveryAddress || null,
      notes: input.notes || null,
      items: input.items,
    });

    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin");
    revalidatePath("/");

    // Copia al correo del cliente; si falla, la orden ya está creada y se puede reenviar.
    const email = await sendSalesOrderEmail(order.id);

    return { id: order.id, email };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la orden" };
  }
}

export async function addSalesOrderPaymentAction(
  orderId: number,
  input: { amount: number; notes: string }
): Promise<{ ok: true } | { error: string }> {
  try {
    const userId = await requireAdminId();
    await addSalesOrderPaymentData(orderId, userId, {
      amount: input.amount,
      notes: input.notes || null,
    });

    revalidatePath(`/admin/pedidos/${orderId}`);
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin");

    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo registrar el abono" };
  }
}

export async function cancelSalesOrderAction(orderId: number) {
  const userId = await requireAdminId();
  await cancelSalesOrderData(orderId, userId);

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function resendSalesOrderEmailAction(orderId: number): Promise<OrderEmailStatus> {
  await requireAdminId();
  return sendSalesOrderEmail(orderId);
}

export async function saveDeliveryDataAction(
  orderId: number,
  input: DeliveryInput
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireAdminId();
    await saveDeliveryFields(orderId, input);
    revalidatePath(`/admin/pedidos/${orderId}`);
    revalidatePath(`/admin/pedidos/${orderId}/entrega`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron guardar los datos" };
  }
}
