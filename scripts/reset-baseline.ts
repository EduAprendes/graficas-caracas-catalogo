// Reset destructivo del inventario a un estado base.
//
// Mantiene el catálogo (categorías y productos) intacto, pero:
//   - borra todas las órdenes de venta (con sus pagos y líneas)
//   - borra todas las órdenes de compra
//   - borra todos los clientes
//   - borra todo el historial de movimientos de stock
//   - deja cada producto con 1 unidad de stock
//   - crea UNA sola orden de compra "Inventario inicial" con 1 unidad
//     de cada producto, ya marcada como recibida, para que el historial
//     quede consistente con el stock resultante.
//
// Uso:
//   npm run db:reset-baseline
//   npm run db:reset-baseline -- --yes   (sin confirmación interactiva)

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// .env.local tiene prioridad sobre .env, igual que en Next.js.
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const SKIP_CONFIRM = process.argv.includes("--yes");

async function confirm(message: string): Promise<boolean> {
  if (SKIP_CONFIRM) return true;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(message);
  rl.close();
  return answer.trim() === "RESET";
}

// No hay costo de compra real guardado en ningún lado antes del reset, así
// que se inventa uno provisorio por debajo del precio de catálogo y del
// precio sugerido (para que quede margen de ganancia), editable a mano
// después desde "Editar" en la orden.
function estimateCost(price: number, suggestedPrice: number | null): number {
  const reference = suggestedPrice != null ? Math.min(price, suggestedPrice) : price;
  return Math.round(reference * 0.6 * 100) / 100;
}

async function main() {
  // Se importa después de cargar el entorno para que DATABASE_URL ya esté disponible.
  const { prisma } = await import("../lib/prisma");

  try {
    const [productCount, salesOrderCount, purchaseOrderCount, customerCount, movementCount] =
      await Promise.all([
        prisma.product.count(),
        prisma.salesOrder.count(),
        prisma.purchaseOrder.count(),
        prisma.customer.count(),
        prisma.stockMovement.count(),
      ]);

    console.log("Este comando va a hacer lo siguiente en la base de datos:");
    console.log(`  - Borrar ${salesOrderCount} orden(es) de venta (con sus pagos y líneas)`);
    console.log(`  - Borrar ${purchaseOrderCount} orden(es) de compra (con sus líneas)`);
    console.log(`  - Borrar ${customerCount} cliente(s)`);
    console.log(`  - Borrar ${movementCount} movimiento(s) de stock (historial)`);
    console.log(`  - Dejar los ${productCount} producto(s) del catálogo con 1 unidad de stock cada uno`);
    console.log(`  - Crear UNA orden de compra "Inventario inicial" con 1 unidad de cada producto`);
    console.log("");
    console.log("Las categorías, productos, precios, imágenes y usuarios NO se tocan.");
    console.log("Esta acción no se puede deshacer.");
    console.log("");

    const ok = await confirm(
      'Escribí RESET y presioná Enter para continuar (cualquier otra cosa cancela): '
    );
    if (!ok) {
      console.log("Cancelado. No se cambió nada.");
      process.exitCode = 1;
      return;
    }

    const user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (!user) {
      throw new Error(
        "No hay ningún usuario en la base de datos; no se puede atribuir la orden de compra inicial."
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // El historial de movimientos referencia líneas de órdenes; hay que
        // borrarlo antes de que el cascade de las órdenes borre esas líneas.
        await tx.stockMovement.deleteMany({});
        await tx.salesOrder.deleteMany({});
        await tx.purchaseOrder.deleteMany({});
        await tx.customer.deleteMany({});

        const products = await tx.product.findMany({
          select: { id: true, price: true, suggestedPrice: true },
        });

        await tx.product.updateMany({ data: { stock: 1 } });

        // Si un producto nunca tuvo precio sugerido, se usa su precio de
        // catálogo como valor provisorio (queda guardado en el producto,
        // no solo en la orden) para que "Por vender" no lo ignore.
        const resolvedPrices = new Map<number, { price: number; suggestedPrice: number }>();
        for (const product of products) {
          const price = Number(product.price);
          const suggestedPrice =
            product.suggestedPrice != null ? Number(product.suggestedPrice) : price;
          resolvedPrices.set(product.id, { price, suggestedPrice });
          if (product.suggestedPrice == null) {
            await tx.product.update({ where: { id: product.id }, data: { suggestedPrice } });
          }
        }

        const order = await tx.purchaseOrder.create({
          data: {
            supplierName: "Inventario inicial",
            notes: "Generada automáticamente por npm run db:reset-baseline.",
            status: "RECIBIDA",
            receivedAt: new Date(),
            userId: user.id,
            items: {
              create: products.map((product) => {
                const { price, suggestedPrice } = resolvedPrices.get(product.id)!;
                return {
                  productId: product.id,
                  quantity: 1,
                  cost: estimateCost(price, suggestedPrice),
                  suggestedPrice,
                };
              }),
            },
          },
          include: { items: true },
        });

        for (const item of order.items) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: user.id,
              delta: 1,
              reason: "COMPRA",
              purchaseOrderItemId: item.id,
            },
          });
        }

        return { productCount: products.length, orderId: order.id };
      },
      { timeout: 60000, maxWait: 15000 }
    );

    console.log("");
    console.log(
      `Listo. Orden de compra #${result.orderId} "Inventario inicial" creada con ${result.productCount} línea(s).`
    );
    console.log("Todos los productos quedaron con 1 unidad de stock, sin clientes ni órdenes previas.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error durante el reset:", err);
  process.exitCode = 1;
});
