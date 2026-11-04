// Carga la mercancía recibida (reporte del 2026-10-26) como productos NUEVOS,
// con su stock, dentro de una orden de compra "RECIBIDA" para que el historial
// quede consistente. No toca productos existentes.
//
// Uso:
//   npx tsx scripts/cargar-mercancia-2026-10.ts          (simulación: solo muestra)
//   npx tsx scripts/cargar-mercancia-2026-10.ts --apply  (escribe en la base)
//
// Requiere acceso a la base (VPN).

import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split("\n")) {
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const APPLY = process.argv.includes("--apply");

type Line = {
  category: string; // slug de la categoría existente
  code: string;
  description: string;
  dimension: string;
  qty: number;
  price: number;
};

const LINES: Line[] = [
  { category: "banner", code: "BAN-BB-137", description: "Banner blanco / blanco brillante", dimension: "1.37 m", qty: 41, price: 95 },
  { category: "banner", code: "BAN-BB-250", description: "Banner blanco / blanco brillante", dimension: "2.50 m", qty: 59, price: 165 },
  { category: "banner", code: "BAN-BB-320", description: "Banner blanco / blanco brillante", dimension: "3.20 m", qty: 52, price: 205 },
  { category: "banner", code: "BAN-BN-320", description: "Banner blanco / negro brillante", dimension: "3.20 m", qty: 51, price: 205 },
  { category: "banner", code: "BAN-BNM-320", description: "Banner blanco / negro mate", dimension: "3.20 m", qty: 52, price: 205 },
  { category: "viniles", code: "VIN-BN", description: "Vinil blanco / negro", dimension: "Estándar", qty: 117, price: 105 },
  { category: "viniles", code: "VIN-BB-XP", description: "Vinil blanco / blanco (extra pega)", dimension: "Estándar", qty: 100, price: 105 },
  { category: "clear", code: "CLEAR-BR", description: "Clear brillante", dimension: "Estándar", qty: 100, price: 105 },
  { category: "clear", code: "CLEAR-MT", description: "Clear mate", dimension: "Estándar", qty: 96, price: 105 },
  { category: "microperforado", code: "MICRO-137", description: "Microperforado", dimension: "1.37 m", qty: 22, price: 160 },
  { category: "viniles", code: "BACKLIGHT-127", description: "Backlight Film", dimension: "1.27 m", qty: 20, price: 120 },
  { category: "floor", code: "FLOOR-152", description: "Floor Graphic", dimension: "1.52 m", qty: 27, price: 150 },
  { category: "varios", code: "MAQ-OJETES", description: "Máquina de ojetes", dimension: "Unidad", qty: 6, price: 250 },
];

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const total = LINES.reduce((s, l) => s + l.qty * l.price, 0);
    console.log(`${LINES.length} productos nuevos, valor a precio de venta: $${total.toFixed(2)}`);

    const categories = await prisma.category.findMany({
      where: { slug: { in: [...new Set(LINES.map((l) => l.category))] } },
      include: { products: { select: { order: true } } },
    });
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    for (const l of LINES) {
      if (!bySlug.has(l.category)) throw new Error(`No existe la categoría "${l.category}"`);
    }
    const existing = await prisma.product.findMany({
      where: { code: { in: LINES.map((l) => l.code) } },
      select: { code: true },
    });
    if (existing.length) {
      throw new Error(`Ya existen productos con código: ${existing.map((e) => e.code).join(", ")}`);
    }

    for (const l of LINES) {
      console.log(`  [${l.category}] ${l.code} | ${l.description} | ${l.dimension} | ${l.qty} | $${l.price}`);
    }
    if (!APPLY) {
      console.log("\nSimulación: no se escribió nada. Use --apply para cargar.");
      return;
    }

    const user = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });
    if (!user) throw new Error("No hay usuario administrador para atribuir la carga.");

    const nextOrder = new Map(
      categories.map((c) => [c.slug, Math.max(0, ...c.products.map((p) => p.order)) + 1])
    );

    await prisma.$transaction(
      async (tx) => {
        const po = await tx.purchaseOrder.create({
          data: {
            supplierName: "Mercancía recibida 2026-10-26",
            notes: "Carga de reporte de mercancía en destino (scripts/cargar-mercancia-2026-10.ts).",
            status: "RECIBIDA",
            receivedAt: new Date(),
            userId: user.id,
          },
        });
        for (const l of LINES) {
          const order = nextOrder.get(l.category)!;
          nextOrder.set(l.category, order + 1);
          const product = await tx.product.create({
            data: {
              categoryId: bySlug.get(l.category)!.id,
              code: l.code,
              description: l.description,
              dimension: l.dimension,
              price: l.price,
              stock: l.qty,
              order,
            },
          });
          const item = await tx.purchaseOrderItem.create({
            data: { orderId: po.id, productId: product.id, quantity: l.qty },
          });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              userId: user.id,
              delta: l.qty,
              reason: "COMPRA",
              purchaseOrderItemId: item.id,
            },
          });
        }
        console.log(`\nListo. Orden de compra #${po.id} creada con ${LINES.length} líneas.`);
      },
      { timeout: 60000, maxWait: 15000 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exitCode = 1;
});
