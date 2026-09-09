"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function adjustStock(productId: number, delta: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  if (!Number.isInteger(delta) || delta === 0) return;

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const newStock = Math.max(0, product.stock + delta);
    const appliedDelta = newStock - product.stock;
    if (appliedDelta === 0) return;

    await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
    await tx.stockMovement.create({
      data: {
        productId,
        userId: Number(session.user.id),
        delta: appliedDelta,
      },
    });
  });

  revalidatePath("/admin");
}

export async function adjustStockForm(formData: FormData) {
  const productId = Number(formData.get("productId"));
  const amount = Number(formData.get("amount"));
  const direction = formData.get("direction") === "out" ? -1 : 1;
  if (!Number.isFinite(amount) || amount <= 0) return;

  await adjustStock(productId, direction * Math.trunc(amount));
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
