import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import catalog from "./seed-data/catalog.json";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const category of catalog) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        title: category.title,
        subtitle: category.subtitle,
        imagePath: category.imageFile ? `/images/categories/${category.imageFile}` : null,
        dimensionLabel: category.dimensionLabel,
        order: category.order,
      },
      create: {
        slug: category.slug,
        title: category.title,
        subtitle: category.subtitle,
        imagePath: category.imageFile ? `/images/categories/${category.imageFile}` : null,
        dimensionLabel: category.dimensionLabel,
        order: category.order,
      },
    });

    await prisma.product.deleteMany({ where: { categoryId: savedCategory.id } });
    await prisma.product.createMany({
      data: category.products.map((p) => ({
        categoryId: savedCategory.id,
        code: p.code ?? "",
        description: p.description ?? "",
        dimension: p.dimension ?? "",
        price: p.price ?? 0,
        order: p.order,
      })),
    });
  }

  const categoryCount = await prisma.category.count();
  const productCount = await prisma.product.count();
  console.log(`Seed completo: ${categoryCount} categorías, ${productCount} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
