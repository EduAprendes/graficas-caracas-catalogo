"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  cancelSeller as cancelSellerData,
  createSeller as createSellerData,
  reactivateSeller as reactivateSellerData,
  updateSeller as updateSellerData,
} from "@/lib/sellers";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return session;
}

function readSellerForm(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim() || null,
    commissionPercent: Number(formData.get("commissionPercent") || 0),
  };
}

function revalidateSellers() {
  revalidatePath("/admin/vendedores");
  revalidatePath("/admin/pedidos/nueva");
}

export async function createSeller(formData: FormData) {
  await requireSession();
  const input = readSellerForm(formData);
  if (!input.name) return;

  await createSellerData(input);
  revalidateSellers();
}

export async function updateSeller(sellerId: number, formData: FormData) {
  await requireSession();
  const input = readSellerForm(formData);
  if (!input.name) return;

  await updateSellerData(sellerId, input);
  revalidateSellers();
}

export async function cancelSeller(sellerId: number) {
  await requireSession();
  await cancelSellerData(sellerId);
  revalidateSellers();
}

export async function reactivateSeller(sellerId: number) {
  await requireSession();
  await reactivateSellerData(sellerId);
  revalidateSellers();
}
