"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/access";
import {
  addOperatingExpense,
  addPurchaseExpense,
  addPurchasePayment,
  deleteOperatingExpense,
  voidPurchaseExpense,
  voidPurchasePayment,
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
    await requireOwner();
    await addPurchaseExpense(orderId, input);
    revalidatePath(`/admin/compras/${orderId}`);
    revalidatePath("/admin/ganancias");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo registrar el gasto");
  }
}

// Los gastos de una orden no se borran: se anulan con motivo y queda la huella.
export async function voidPurchaseExpenseAction(
  orderId: number,
  expenseId: number,
  reason: string
): Promise<Result> {
  try {
    const user = await requireOwner();
    await voidPurchaseExpense(orderId, expenseId, { id: user.id, name: user.name }, reason);
    revalidatePath(`/admin/compras/${orderId}`);
    revalidatePath("/admin/compras");
    revalidatePath("/admin/ganancias");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo anular el gasto");
  }
}

// Pago (abono) al proveedor de una orden de compra.
export async function addPurchasePaymentAction(
  orderId: number,
  input: { amount: number; date: string; notes: string }
): Promise<Result> {
  try {
    const user = await requireOwner();
    await addPurchasePayment(orderId, user.id, {
      amount: input.amount,
      date: input.date,
      notes: input.notes || null,
    });
    revalidatePath(`/admin/compras/${orderId}`);
    revalidatePath("/admin/compras");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo registrar el pago");
  }
}

// Los pagos de una orden no se borran: se anulan con motivo y queda la huella.
export async function voidPurchasePaymentAction(
  orderId: number,
  paymentId: number,
  reason: string
): Promise<Result> {
  try {
    const user = await requireOwner();
    await voidPurchasePayment(orderId, paymentId, { id: user.id, name: user.name }, reason);
    revalidatePath(`/admin/compras/${orderId}`);
    revalidatePath("/admin/compras");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo anular el pago");
  }
}

export async function addOperatingExpenseAction(input: {
  date: string;
  category: string;
  amount: number;
  notes: string;
}): Promise<Result> {
  try {
    const user = await requireOwner();
    await addOperatingExpense(user.id, { ...input, notes: input.notes || null });
    revalidatePath("/admin/ganancias");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo registrar el gasto");
  }
}

export async function deleteOperatingExpenseAction(id: number) {
  await requireOwner();
  await deleteOperatingExpense(id);
  revalidatePath("/admin/ganancias");
}
