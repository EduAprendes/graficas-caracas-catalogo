import { prisma } from "@/lib/prisma";

export type InventoryProduct = {
  id: number;
  code: string;
  description: string;
  dimension: string;
  stock: number;
  imageUrl: string | null;
};

export type InventoryCategory = {
  id: number;
  title: string;
  products: InventoryProduct[];
};

export async function getInventory(): Promise<InventoryCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      products: { orderBy: { order: "asc" } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    products: category.products.map((product) => ({
      id: product.id,
      code: product.code,
      description: product.description,
      dimension: product.dimension,
      stock: product.stock,
      imageUrl: product.imageUrl,
    })),
  }));
}
