import { prisma } from "@/lib/prisma";

export type ProductView = {
  id: number;
  code: string;
  description: string;
  dimension: string;
  price: number;
};

export type CategoryView = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  imagePath: string | null;
  dimensionLabel: string;
  products: ProductView[];
};

export async function getCatalog(): Promise<CategoryView[]> {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      products: { orderBy: { order: "asc" } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    title: category.title,
    subtitle: category.subtitle,
    imagePath: category.imagePath,
    dimensionLabel: category.dimensionLabel,
    products: category.products.map((product) => ({
      id: product.id,
      code: product.code,
      description: product.description,
      dimension: product.dimension,
      price: Number(product.price),
    })),
  }));
}
