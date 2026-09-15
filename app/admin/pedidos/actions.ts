"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  cancelSalesOrder as cancelSalesOrderData,
  createSalesOrder as createSalesOrderData,
  type SalesOrderItemInput,
} from "@/lib/orders";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return Number(session.user.id);
}

export async function createSalesOrderAction(input: {
  customerName: string;
  plotter: string;
  notes: string;
  items: SalesOrderItemInput[];
}): Promise<{ id: number } | { error: string }> {
  try {
    const userId = await requireUserId();
    const order = await createSalesOrderData(userId, {
      customerName: input.customerName,
      plotter: input.plotter || null,
      notes: input.notes || null,
      items: input.items,
    });

    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    revalidatePath("/");

    return { id: order.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la orden" };
  }
}

export async function cancelSalesOrderAction(orderId: number) {
  const userId = await requireUserId();
  await cancelSalesOrderData(orderId, userId);

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/");
}
