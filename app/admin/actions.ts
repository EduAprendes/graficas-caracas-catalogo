"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

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

export async function setProductImage(
  productId: number,
  image: { url: string; publicId: string }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const previous = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  await prisma.product.update({
    where: { id: productId },
    data: { imageUrl: image.url, imagePublicId: image.publicId },
  });

  if (previous.imagePublicId && previous.imagePublicId !== image.publicId) {
    await deleteCloudinaryImage(previous.imagePublicId);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeProductImage(productId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const previous = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  await prisma.product.update({
    where: { id: productId },
    data: { imageUrl: null, imagePublicId: null },
  });

  await deleteCloudinaryImage(previous.imagePublicId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
