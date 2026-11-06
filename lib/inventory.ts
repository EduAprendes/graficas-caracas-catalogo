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
  inventoryValue: number;
};

type CategoryRow = {
  id: number;
  title: string;
  subtitle: string | null;
  dimensionLabel: string;
  imagePath: string | null;
  products: {
    id: number;
    code: string;
    description: string;
    dimension: string;
    price: unknown;
    stock: number;
    imageUrl: string | null;
  }[];
};

function toInventoryCategory(category: CategoryRow): InventoryCategory {
  const products = category.products.map((product) => ({
    id: product.id,
    code: product.code,
    description: product.description,
    dimension: product.dimension,
    price: Number(product.price),
    stock: product.stock,
    imageUrl: product.imageUrl,
  }));

  return {
    id: category.id,
    title: category.title,
    subtitle: category.subtitle,
    dimensionLabel: category.dimensionLabel,
    imagePath: category.imagePath,
    products,
    inventoryValue: products.reduce((sum, product) => sum + product.stock * product.price, 0),
  };
}

export async function getInventory(): Promise<InventoryCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      products: { orderBy: { order: "asc" } },
    },
  });

  return categories.map(toInventoryCategory);
}

export async function getInventoryCategory(id: number): Promise<InventoryCategory | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: { orderBy: { order: "asc" } },
    },
  });

  return category ? toInventoryCategory(category) : null;
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
