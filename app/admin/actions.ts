"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { slugify } from "@/lib/slug";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session;
}

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

export async function setCategoryImage(
  categoryId: number,
  image: { url: string; publicId: string }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const previous = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

  await prisma.category.update({
    where: { id: categoryId },
    data: { imagePath: image.url, imagePublicId: image.publicId },
  });

  if (previous.imagePublicId && previous.imagePublicId !== image.publicId) {
    await deleteCloudinaryImage(previous.imagePublicId);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeCategoryImage(categoryId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const previous = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

  await prisma.category.update({
    where: { id: categoryId },
    data: { imagePath: null, imagePublicId: null },
  });

  await deleteCloudinaryImage(previous.imagePublicId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createCategory(formData: FormData) {
  await requireSession();

  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const subtitle = String(formData.get("subtitle") || "").trim() || null;
  const dimensionLabel = String(formData.get("dimensionLabel") || "").trim() || "Medida";
  const order = Number(formData.get("order"));

  const baseSlug = slugify(title) || "categoria";
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  await prisma.category.create({
    data: {
      slug,
      title,
      subtitle,
      dimensionLabel,
      order: Number.isFinite(order) ? Math.trunc(order) : 0,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateCategory(categoryId: number, formData: FormData) {
  await requireSession();

  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const subtitle = String(formData.get("subtitle") || "").trim() || null;
  const dimensionLabel = String(formData.get("dimensionLabel") || "").trim() || "Medida";

  await prisma.category.update({
    where: { id: categoryId },
    data: { title, subtitle, dimensionLabel },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteCategory(categoryId: number) {
  await requireSession();

  const category = await prisma.category.findUniqueOrThrow({
    where: { id: categoryId },
    include: { products: true },
  });

  await prisma.category.delete({ where: { id: categoryId } });

  await deleteCloudinaryImage(category.imagePublicId);
  await Promise.all(category.products.map((p) => deleteCloudinaryImage(p.imagePublicId)));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createProduct(categoryId: number, formData: FormData) {
  await requireSession();

  const code = String(formData.get("code") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const dimension = String(formData.get("dimension") || "").trim();
  const price = Number(formData.get("price"));
  const suggestedPriceRaw = String(formData.get("suggestedPrice") || "").trim();
  const suggestedPrice = suggestedPriceRaw ? Number(suggestedPriceRaw) : null;
  const stock = Number(formData.get("stock"));
  const order = Number(formData.get("order"));

  if (!code || !description || !Number.isFinite(price)) return;
  if (suggestedPrice !== null && !Number.isFinite(suggestedPrice)) return;

  await prisma.product.create({
    data: {
      categoryId,
      code,
      description,
      dimension,
      price,
      suggestedPrice,
      stock: Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : 0,
      order: Number.isFinite(order) ? Math.trunc(order) : 0,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateProduct(productId: number, formData: FormData) {
  await requireSession();

  const code = String(formData.get("code") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const dimension = String(formData.get("dimension") || "").trim();
  const price = Number(formData.get("price"));
  const suggestedPriceRaw = String(formData.get("suggestedPrice") || "").trim();
  const suggestedPrice = suggestedPriceRaw ? Number(suggestedPriceRaw) : null;

  if (!code || !description || !Number.isFinite(price)) return;
  if (suggestedPrice !== null && !Number.isFinite(suggestedPrice)) return;

  await prisma.product.update({
    where: { id: productId },
    data: { code, description, dimension, price, suggestedPrice },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteProduct(productId: number) {
  await requireSession();

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  await prisma.product.delete({ where: { id: productId } });
  await deleteCloudinaryImage(product.imagePublicId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
