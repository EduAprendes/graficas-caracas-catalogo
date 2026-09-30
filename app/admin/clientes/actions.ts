"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import {
  createCustomer as createCustomerData,
  cancelCustomer as cancelCustomerData,
  reactivateCustomer as reactivateCustomerData,
  updateCustomer as updateCustomerData,
} from "@/lib/customers";

function readCustomerForm(formData: FormData) {
  const field = (key: string) => String(formData.get(key) || "").trim() || null;
  return {
    name: String(formData.get("name") || "").trim(),
    company: field("company"),
    taxId: field("taxId"),
    phone: field("phone"),
    email: field("email"),
    address: field("address"),
    notes: field("notes"),
  };
}

async function requireSession() {
  return requireAdmin();
}

export async function createCustomer(formData: FormData) {
  await requireSession();

  const input = readCustomerForm(formData);
  if (!input.name) return;

  await createCustomerData(input);

  revalidatePath("/admin/clientes");
}

export async function updateCustomer(customerId: number, formData: FormData) {
  await requireSession();

  const input = readCustomerForm(formData);
  if (!input.name) return;

  await updateCustomerData(customerId, input);

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${customerId}`);
}

export async function cancelCustomer(customerId: number) {
  await requireSession();

  await cancelCustomerData(customerId);

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${customerId}`);
  revalidatePath("/admin/pedidos/nueva");
}

export async function reactivateCustomer(customerId: number) {
  await requireSession();

  await reactivateCustomerData(customerId);

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${customerId}`);
  revalidatePath("/admin/pedidos/nueva");
}
