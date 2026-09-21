"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addSalesOrderPayment as addSalesOrderPaymentData,
  cancelSalesOrder as cancelSalesOrderData,
  createSalesOrder as createSalesOrderData,
  type SalesOrderItemInput,
} from "@/lib/orders";
import { createCustomer as createCustomerData } from "@/lib/customers";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return Number(session.user.id);
}

export async function createSalesOrderAction(input: {
  customerId: number | null;
  newCustomerName: string;
  paymentType: "CONTADO" | "CREDITO";
  plotter: string;
  notes: string;
  items: SalesOrderItemInput[];
}): Promise<{ id: number } | { error: string }> {
  try {
    const userId = await requireUserId();

    let customerId = input.customerId;
    if (!customerId) {
      const name = input.newCustomerName.trim();
      if (!name) return { error: "Elegí un cliente o escribí el nombre de uno nuevo" };
      const customer = await createCustomerData({ name, phone: null, notes: null });
      customerId = customer.id;
    }

    const order = await createSalesOrderData(userId, {
      customerId,
      paymentType: input.paymentType,
      plotter: input.plotter || null,
      notes: input.notes || null,
      items: input.items,
    });

    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin");
    revalidatePath("/");

    return { id: order.id };
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
