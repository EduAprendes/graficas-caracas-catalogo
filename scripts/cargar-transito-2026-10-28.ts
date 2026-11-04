// Mercancía EN TRÁNSITO (reporte del 2026-10-28): crea los productos que faltan
// (stock 0) y una orden de compra PENDIENTE. Al recibirla desde
// /admin/compras/[id] se suma el stock. Además renumera las órdenes de compra
// existentes: "Inventario inicial" 5 -> 1 y "Mercancía recibida 2026-10-26" 6 -> 2.
//
//   npx tsx scripts/cargar-transito-2026-10-28.ts          (simulación)
//   npx tsx scripts/cargar-transito-2026-10-28.ts --apply

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

type Line = {
  code: string;
  qty: number;
  // Solo para productos nuevos:
  category?: string;
  description?: string;
  dimension?: string;
  price?: number;
};

const LINES: Line[] = [
  // Productos que ya existen (se suma stock al recibir)
  { code: "BAN-BNM-320", qty: 69 },
  { code: "BAN-BN-320", qty: 77 },
  { code: "CLEAR-BR", qty: 64 },
  { code: "CLEAR-MT", qty: 64 },
  { code: "UTTPA061", qty: 20 },
  // Productos nuevos
  { code: "MESH-320", qty: 25, category: "banner", description: "Mesh (Malla)", dimension: "3.20 m", price: 250 },
  { code: "VIN-BN-BR", qty: 300, category: "viniles", description: "Vinil blanco / negro brillante", dimension: "Estándar", price: 105 },
  { code: "VIN-BN-MT", qty: 100, category: "viniles", description: "Vinil blanco / negro mate", dimension: "Estándar", price: 105 },
  { code: "ESMERILADO-127", qty: 95, category: "viniles", description: "Esmerilado", dimension: "1.27 m", price: 140 },
  { code: "TINTA-ALLWIN", qty: 96, category: "tintas", description: "Tinta Allwin (48 rojas / 48 amarillas)", dimension: "Litro", price: 80 },
  { code: "TINTA-ECOSOLV", qty: 80, category: "tintas", description: "Tinta Ecosolvente (40 rojas / 40 amarillas)", dimension: "Litro", price: 35 },
  { code: "TINTA-I3200", qty: 100, category: "tintas", description: "Tinta I3200 (25 amarilla / 25 negra / 25 roja / 25 azul)", dimension: "Litro", price: 40 },
  { code: "PEGA-SPRAY", qty: 120, category: "varios", description: "Pega en spray (lata aerosol)", dimension: "Unidad", price: 10 },
  { code: "SILICON-TUBO", qty: 144, category: "varios", description: "Silicón en tubos (sellador)", dimension: "Unidad", price: 6 },
  { code: "LAPIZ-PROMO", qty: 5000, category: "de-todo", description: "Lapiceros promocionales", dimension: "Unidad", price: 1 },
];

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const orders = await prisma.purchaseOrder.findMany({ select: { id: true, supplierName: true } });
    const inicial = orders.find((o) => o.id === 5 && o.supplierName === "Inventario inicial");
    const recibida = orders.find((o) => o.id === 6 && o.supplierName === "Mercancía recibida 2026-10-26");
    if (!inicial || !recibida || orders.length !== 2) {
      throw new Error("Las órdenes de compra no son las esperadas (5 y 6); no se renumera nada.");
    }

    const existing = await prisma.product.findMany({
      where: { code: { in: LINES.map((l) => l.code) } },
      select: { id: true, code: true },
    });
    const byCode = new Map(existing.map((p) => [p.code, p.id]));
    const cats = await prisma.category.findMany({
      where: { slug: { in: [...new Set(LINES.flatMap((l) => (l.category ? [l.category] : [])))] } },
      include: { products: { select: { order: true } } },
    });
    const bySlug = new Map(cats.map((c) => [c.slug, c]));

    for (const l of LINES) {
      const exists = byCode.has(l.code);
      if (!exists && !l.category) throw new Error(`Falta el producto existente ${l.code}`);
      if (exists && l.category) throw new Error(`El código nuevo ${l.code} ya existe`);
      if (l.category && !bySlug.has(l.category)) throw new Error(`No existe la categoría ${l.category}`);
      console.log(`  ${exists ? "existente" : "NUEVO    "} ${l.code} x${l.qty}`);
    }
    if (!APPLY) {
      console.log("\nSimulación: no se escribió nada. Use --apply.");
      return;
    }

    const user = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });
    if (!user) throw new Error("No hay administrador.");
    const nextOrder = new Map(cats.map((c) => [c.slug, Math.max(0, ...c.products.map((p) => p.order)) + 1]));

    await prisma.$transaction(
      async (tx) => {
        // Renumerar (si la FK no tuviera ON UPDATE CASCADE esto falla y se revierte todo).
        await tx.$executeRaw`UPDATE purchase_orders SET id = 1 WHERE id = 5`;
        await tx.$executeRaw`UPDATE purchase_orders SET id = 2 WHERE id = 6`;
        const n1 = await tx.purchaseOrderItem.count({ where: { orderId: 1 } });
        const n2 = await tx.purchaseOrderItem.count({ where: { orderId: 2 } });
        if (n1 !== 51 || n2 !== 13) throw new Error(`Líneas tras renumerar: ${n1}/${n2} (se esperaba 51/13)`);

        const po = await tx.purchaseOrder.create({
          data: {
            id: 3,
            supplierName: "Mercancía en tránsito 2026-10-28",
            notes: "Reporte de inventario del 28/10 (scripts/cargar-transito-2026-10-28.ts). Costos sin cargar.",
            status: "PENDIENTE",
            userId: user.id,
          },
        });

        for (const l of LINES) {
          let productId = byCode.get(l.code);
          if (productId === undefined) {
            const order = nextOrder.get(l.category!)!;
            nextOrder.set(l.category!, order + 1);
            const p = await tx.product.create({
              data: {
                categoryId: bySlug.get(l.category!)!.id,
                code: l.code,
                description: l.description!,
                dimension: l.dimension!,
                price: l.price!,
                stock: 0,
                order,
              },
            });
            productId = p.id;
          }
          await tx.purchaseOrderItem.create({ data: { orderId: po.id, productId, quantity: l.qty } });
        }
        await tx.$executeRawUnsafe("ALTER TABLE purchase_orders AUTO_INCREMENT = 4");
        console.log(`\nListo. Orden #${po.id} pendiente con ${LINES.length} líneas; órdenes anteriores ahora #1 y #2.`);
      },
      { timeout: 60000, maxWait: 15000 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exitCode = 1;
});
