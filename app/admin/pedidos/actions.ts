"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addSalesOrderPayment as addSalesOrderPaymentData,
  cancelSalesOrder as cancelSalesOrderData,
  createSalesOrder as createSalesOrderData,
  type SalesOrderItemInput,
} from "@/lib/orders";
import { sendSalesOrderEmail, type OrderEmailStatus } from "@/lib/order-email";
import { createCustomer as createCustomerData, type CustomerOption } from "@/lib/customers";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return Number(session.user.id);
}

export async function createCustomerForOrderAction(input: {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
}): Promise<{ customer: CustomerOption } | { error: string }> {
  try {
    await requireUserId();
    if (!input.name.trim()) return { error: "Falta el nombre de contacto" };

    const customer = await createCustomerData({
      name: input.name,
      company: input.company || null,
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
    const userId = await requireUserId();

    if (!input.customerId) return { error: "Elegí un cliente o creá uno nuevo" };

    const order = await createSalesOrderData(userId, {
      customerId: input.customerId,
      paymentType: input.paymentType,
      deliveryType: input.deliveryType,
      sellerId: input.sellerId,
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
    const userId = await requireUserId();
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
  const userId = await requireUserId();
  await cancelSalesOrderData(orderId, userId);

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function resendSalesOrderEmailAction(orderId: number): Promise<OrderEmailStatus> {
  await requireUserId();
  return sendSalesOrderEmail(orderId);
}
