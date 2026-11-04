// Solo lectura: lista todos los productos (código, categoría, descripción, medida, precio, stock)
// y las órdenes de compra existentes. Escribe el resultado en la carpeta indicada por --out
// (o lo imprime). No modifica nada.
//
//   npx tsx scripts/listar-productos.ts [--out archivo.txt]

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

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const products = await prisma.product.findMany({
      include: { category: { select: { slug: true } } },
      orderBy: [{ categoryId: "asc" }, { id: "asc" }],
    });
    const orders = await prisma.purchaseOrder.findMany({
      select: { id: true, supplierName: true, status: true, notes: true, _count: { select: { items: true } } },
      orderBy: { id: "asc" },
    });

    const lines: string[] = [];
    lines.push("== ORDENES DE COMPRA ==");
    for (const o of orders) {
      lines.push(`#${o.id} | ${o.supplierName} | ${o.status} | ${o._count.items} lineas | ${o.notes ?? ""}`);
    }
    lines.push("", "== PRODUCTOS ==");
    for (const p of products as any[]) {
      lines.push(
        [p.id, p.code, p.category?.slug, p.description, p.dimension, `precio=${p.price}`, `stock=${p.stock ?? "?"}`].join(" | ")
      );
    }
    const text = lines.join("\n");
    const outIdx = process.argv.indexOf("--out");
    if (outIdx !== -1 && process.argv[outIdx + 1]) {
      fs.writeFileSync(process.argv[outIdx + 1], text, "utf8");
      console.log(`Escrito en ${process.argv[outIdx + 1]} (${products.length} productos, ${orders.length} órdenes)`);
    } else {
      console.log(text);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
