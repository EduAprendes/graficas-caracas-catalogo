"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin, requireOwner } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  addSellerPayment as addSellerPaymentData,
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
      if (taken) return { error: "Ese usuario ya existe; elige otro." };
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

export async function addSellerPaymentAction(
  sellerId: number,
  year: number,
  month: number,
  input: { amount: number; notes: string }
): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireSession();
    await addSellerPaymentData(sellerId, user.id, {
      amount: input.amount,
      year,
      month,
      notes: input.notes || null,
    });
    revalidatePath(`/admin/vendedores/${sellerId}`);
    revalidatePath("/admin/vendedores");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo registrar el pago" };
  }
}

// ---------- Accesos de administradora (solo el administrador principal) ----------

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

// Crea una cuenta de administradora o, si se pasa userId, cambia su usuario y/o su clave.
export async function saveAdministradoraAccess(
  userId: number | null,
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireOwner();

    const username = String(formData.get("username") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();

    if (!USERNAME_RE.test(username)) {
      return { error: "El usuario debe tener 3 a 30 caracteres: letras, números, punto, guion." };
    }
    if (userId == null && password.length < 8) {
      return { error: "La clave debe tener al menos 8 caracteres." };
    }
    if (password && password.length < 8) {
      return { error: "La clave debe tener al menos 8 caracteres." };
    }

    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== userId) return { error: "Ese usuario ya existe; elige otro." };

    if (userId == null) {
      await prisma.user.create({
        data: {
          username,
          passwordHash: await bcrypt.hash(password, 12),
          name: name || "Administradora",
          role: "ADMINISTRADORA",
        },
      });
    } else {
      const current = await prisma.user.findUnique({ where: { id: userId } });
      if (!current || current.role !== "ADMINISTRADORA") return { error: "Cuenta no encontrada" };
      await prisma.user.update({
        where: { id: userId },
        data: {
          username,
          ...(name ? { name } : {}),
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      });
    }

    revalidatePath("/admin/vendedores");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar el acceso" };
  }
}

// Cancela o reactiva una cuenta de administradora (no se borra: se conserva el historial).
export async function setAdministradoraActive(
  userId: number,
  active: boolean
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireOwner();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMINISTRADORA") return { error: "Cuenta no encontrada" };
    await prisma.user.update({ where: { id: userId }, data: { cancelledAt: active ? null : new Date() } });
    revalidatePath("/admin/vendedores");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo actualizar la cuenta" };
  }
}
