// Contenedor 2026TF0298 (Inventario Lista 3), llegada prevista 2026-12-01: crea los productos
// que faltan (stock 0) y una orden de compra PENDIENTE con costos sin cargar (los precios del
// PDF son de venta). Al recibirla desde /admin/compras/[id] se suma el stock.
//
//   npx tsx scripts/cargar-contenedor-2026TF0298.ts          (simulación)
//   npx tsx scripts/cargar-contenedor-2026TF0298.ts --apply

import fs from "node:fs";
import path from "node:path";

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const APPLY = process.argv.includes("--apply");
const SUPPLIER = "Contenedor 2026TF0298 (llega 2026-12-01)";
const NOTES =
  "Inventario Lista 3 (PDF). Contenedor 2026TF0298, llegada prevista 2026-12-01. " +
  "Costos sin cargar (los precios del PDF son de venta). scripts/cargar-contenedor-2026TF0298.ts";

type Line = {
  code: string;
  qty: number;
  price: number; // precio de venta según el PDF (para verificar el casado)
  // Solo para productos nuevos:
  category?: string;
  description?: string;
  dimension?: string;
};

const LINES: Line[] = [
  // Productos que ya existen
  { code: "BAN-BN-320", qty: 30, price: 205 },
  { code: "BAN-BNM-320", qty: 30, price: 205 },
  { code: "CLEAR-BR", qty: 135, price: 105 },
  { code: "CLEAR-MT", qty: 135, price: 105 },
  { code: "LAM-PVC-3", qty: 1000, price: 15 },
  { code: "UTTPA061", qty: 20, price: 120 },
  { code: "STAND-DEG-CU", qty: 100, price: 70 },
  // Productos nuevos
  { code: "BAN-BB-107", qty: 40, price: 69, category: "banner", description: "Banner blanco / blanco", dimension: "1.07 m" },
  { code: "BAN-BB-160", qty: 40, price: 104, category: "banner", description: "Banner blanco / blanco", dimension: "1.60 m" },
  { code: "BAN-BB-180", qty: 40, price: 117, category: "banner", description: "Banner blanco / blanco", dimension: "1.80 m" },
  { code: "VIN-BB-BR", qty: 135, price: 105, category: "viniles", description: "Vinil blanco / blanco brillante", dimension: "Estándar" },
  { code: "VIN-BB-MT", qty: 135, price: 105, category: "viniles", description: "Vinil blanco / blanco mate", dimension: "Estándar" },
];

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    if (await prisma.purchaseOrder.findFirst({ where: { supplierName: { contains: "2026TF0298" } } })) {
      throw new Error("Ya existe una orden del contenedor 2026TF0298; no se crea otra.");
    }

    if (await prisma.purchaseOrder.findUnique({ where: { id: 4 } })) {
      throw new Error("Ya existe la orden #4; no se puede usar ese número.");
    }

    const existing = await prisma.product.findMany({
      where: { code: { in: LINES.map((l) => l.code) } },
      select: { id: true, code: true, price: true },
    });
    const byCode = new Map(existing.map((p) => [p.code, p]));
    const cats = await prisma.category.findMany({
      where: { slug: { in: [...new Set(LINES.flatMap((l) => (l.category ? [l.category] : [])))] } },
      include: { products: { select: { order: true } } },
    });
    const bySlug = new Map(cats.map((c) => [c.slug, c]));

    let total = 0;
    for (const l of LINES) {
      const found = byCode.get(l.code);
      if (!found && !l.category) throw new Error(`Falta el producto existente ${l.code}`);
      if (found && l.category) throw new Error(`El código nuevo ${l.code} ya existe`);
      if (l.category && !bySlug.has(l.category)) throw new Error(`No existe la categoría ${l.category}`);
      if (found && Number(found.price) !== l.price) {
        throw new Error(`${l.code}: el precio del catálogo (${found.price}) no coincide con el PDF (${l.price})`);
      }
      total += l.qty * l.price;
      console.log(`  ${found ? "existente" : "NUEVO    "} ${l.code} x${l.qty}  (venta $${l.price})`);
    }
    console.log(`\nValor a precio de venta: $${total.toLocaleString("en-US")} (el PDF indica $102,520)`);
    if (!APPLY) {
      console.log("Simulación: no se escribió nada. Use --apply.");
      return;
    }

    const user = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });
    if (!user) throw new Error("No hay administrador.");
    const nextOrder = new Map(cats.map((c) => [c.slug, Math.max(0, ...c.products.map((p) => p.order)) + 1]));

    await prisma.$transaction(
      async (tx) => {
        const po = await tx.purchaseOrder.create({
          data: { id: 4, supplierName: SUPPLIER, notes: NOTES, status: "PENDIENTE", userId: user.id },
        });
        for (const l of LINES) {
          let productId = byCode.get(l.code)?.id;
          if (productId === undefined) {
            const order = nextOrder.get(l.category!)!;
            nextOrder.set(l.category!, order + 1);
            const p = await tx.product.create({
              data: {
                categoryId: bySlug.get(l.category!)!.id,
                code: l.code,
                description: l.description!,
                dimension: l.dimension!,
                price: l.price,
                stock: 0,
                order,
              },
            });
            productId = p.id;
          }
          await tx.purchaseOrderItem.create({ data: { orderId: po.id, productId, quantity: l.qty } });
        }
        console.log(`\nListo. Orden #${po.id} pendiente con ${LINES.length} líneas. Ábrela en /admin/compras/${po.id}`);
      },
      { timeout: 60000, maxWait: 15000 }
    );
    // Siguiente orden: #5 (el id 4 se fija arriba; el id de prueba 4 ya fue borrado).
    await prisma.$executeRawUnsafe("ALTER TABLE purchase_orders AUTO_INCREMENT = 5");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exitCode = 1;
});
