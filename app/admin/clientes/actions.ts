"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createCustomer as createCustomerData,
  deleteCustomer as deleteCustomerData,
  updateCustomer as updateCustomerData,
} from "@/lib/customers";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return session;
}

export async function createCustomer(formData: FormData) {
  await requireSession();

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) return;

  await createCustomerData({ name, phone: phone || null, notes: notes || null });

  revalidatePath("/admin/clientes");
}

export async function updateCustomer(customerId: number, formData: FormData) {
  await requireSession();

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) return;

  await updateCustomerData(customerId, { name, phone: phone || null, notes: notes || null });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${customerId}`);
}

export async function deleteCustomer(customerId: number) {
  await requireSession();

  await deleteCustomerData(customerId);

  revalidatePath("/admin/clientes");
}
