"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  cancelSeller as cancelSellerData,
  createSeller as createSellerData,
  reactivateSeller as reactivateSellerData,
  updateSeller as updateSellerData,
} from "@/lib/sellers";

async function requireSession() {
  return requireAdmin();
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

// Crea el usuario con el que una vendedora entra al panel (rol VENDEDOR, ligado a ella), o
// cambia su clave si ya lo tiene. El usuario no se puede renombrar.
export async function saveSellerAccess(
  sellerId: number,
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireSession();

    const username = String(formData.get("username") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return { error: "El usuario debe tener 3 a 30 caracteres: letras, números, punto, guion." };
    }
    if (password.length < 8) return { error: "La clave debe tener al menos 8 caracteres." };

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: { user: true },
    });
    if (!seller) return { error: "Vendedor no encontrado" };
    if (seller.cancelledAt) return { error: "Reactivá al vendedor antes de darle acceso" };

    const passwordHash = await bcrypt.hash(password, 12);

    if (seller.user) {
      await prisma.user.update({ where: { id: seller.user.id }, data: { passwordHash } });
    } else {
      const taken = await prisma.user.findUnique({ where: { username } });
      if (taken) return { error: "Ese usuario ya existe; elegí otro." };
      await prisma.user.create({
        data: { username, passwordHash, name: seller.name, role: "VENDEDOR", sellerId },
      });
    }

    revalidateSellers();
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar el acceso" };
  }
}
