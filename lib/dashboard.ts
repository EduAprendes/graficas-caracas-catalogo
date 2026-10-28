import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  outOfStockCount: number;
  productCount: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [outOfStockCount, productCount] = await Promise.all([
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.product.count(),
  ]);
  return { outOfStockCount, productCount };
}
