"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  cancelPurchaseOrder as cancelPurchaseOrderData,
  createPurchaseOrder as createPurchaseOrderData,
  receivePurchaseOrder as receivePurchaseOrderData,
  type PurchaseOrderItemInput,
} from "@/lib/orders";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return Number(session.user.id);
}

export async function createPurchaseOrderAction(input: {
  supplierName: string;
  notes: string;
  items: PurchaseOrderItemInput[];
}): Promise<{ id: number } | { error: string }> {
  try {
    const userId = await requireUserId();
    const order = await createPurchaseOrderData(userId, {
      supplierName: input.supplierName,
      notes: input.notes || null,
      items: input.items,
    });

    revalidatePath("/admin/compras");

    return { id: order.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la orden" };
  }
}

export async function receivePurchaseOrderAction(orderId: number) {
  const userId = await requireUserId();
  await receivePurchaseOrderData(orderId, userId);

  revalidatePath(`/admin/compras/${orderId}`);
  revalidatePath("/admin/compras");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function cancelPurchaseOrderAction(orderId: number) {
  await requireUserId();
  await cancelPurchaseOrderData(orderId);

  revalidatePath(`/admin/compras/${orderId}`);
  revalidatePath("/admin/compras");
}
