"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import {
  addOperatingExpense,
  addPurchaseExpense,
  deleteOperatingExpense,
  deletePurchaseExpense,
} from "@/lib/finance";

type Result = { ok: true } | { error: string };

function fail(err: unknown, fallback: string): { error: string } {
  return { error: err instanceof Error ? err.message : fallback };
}

export async function addPurchaseExpenseAction(
  orderId: number,
  input: { concept: string; amount: number }
): Promise<Result> {
  try {
    await requireAdmin();
    await addPurchaseExpense(orderId, input);
    revalidatePath(`/admin/compras/${orderId}`);
    revalidatePath("/admin/ganancias");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo registrar el gasto");
  }
}

export async function deletePurchaseExpenseAction(orderId: number, expenseId: number) {
  await requireAdmin();
  await deletePurchaseExpense(orderId, expenseId);
  revalidatePath(`/admin/compras/${orderId}`);
  revalidatePath("/admin/ganancias");
}

export async function addOperatingExpenseAction(input: {
  date: string;
  category: string;
  amount: number;
  notes: string;
}): Promise<Result> {
  try {
    const user = await requireAdmin();
    await addOperatingExpense(user.id, { ...input, notes: input.notes || null });
    revalidatePath("/admin/ganancias");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo registrar el gasto");
  }
}

export async function deleteOperatingExpenseAction(id: number) {
  await requireAdmin();
  await deleteOperatingExpense(id);
  revalidatePath("/admin/ganancias");
}
