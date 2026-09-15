import { prisma } from "@/lib/prisma";

export type InventoryProduct = {
  id: number;
  code: string;
  description: string;
  dimension: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

export type InventoryCategory = {
  id: number;
  title: string;
  subtitle: string | null;
  dimensionLabel: string;
  imagePath: string | null;
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
    subtitle: category.subtitle,
    dimensionLabel: category.dimensionLabel,
    imagePath: category.imagePath,
    products: category.products.map((product) => ({
      id: product.id,
      code: product.code,
      description: product.description,
      dimension: product.dimension,
      price: Number(product.price),
      stock: product.stock,
      imageUrl: product.imageUrl,
    })),
  }));
}

export type ProductOption = {
  id: number;
  code: string;
  description: string;
  dimension: string;
  price: number;
  stock: number;
  categoryTitle: string;
};

export async function getProductOptions(): Promise<ProductOption[]> {
  const products = await prisma.product.findMany({
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    include: { category: true },
  });

  return products.map((product) => ({
    id: product.id,
    code: product.code,
    description: product.description,
    dimension: product.dimension,
    price: Number(product.price),
    stock: product.stock,
    categoryTitle: product.category.title,
  }));
}
