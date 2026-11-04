// Solo lectura: muestra las líneas (producto, cantidad, costo) y los gastos de cada orden de
// compra. No modifica nada.
//
//   npx tsx scripts/listar-ordenes.ts [--out archivo.txt]

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
    const orders = await prisma.purchaseOrder.findMany({
      orderBy: { id: "asc" },
      include: {
        items: { include: { product: { select: { code: true, description: true, price: true } } }, orderBy: { id: "asc" } },
        expenses: true,
      },
    });
    const lines: string[] = [];
    for (const o of orders) {
      lines.push(
        `\n=== #${o.id} | ${o.supplierName} | ${o.status} | creada ${o.createdAt.toISOString().slice(0, 10)} | recibida ${o.receivedAt?.toISOString().slice(0, 10) ?? "-"} ===`
      );
      for (const i of o.items) {
        lines.push(
          `  ${i.product.code} | ${i.product.description} | cant ${i.quantity} | costo ${i.cost ?? "-"} | precio venta ${i.product.price}`
        );
      }
      lines.push(`  Gastos: ${o.expenses.map((e) => `${e.concept} ${e.amount}`).join(", ") || "ninguno"}`);
    }
    const text = lines.join("\n");
    const outIdx = process.argv.indexOf("--out");
    if (outIdx !== -1 && process.argv[outIdx + 1]) {
      fs.writeFileSync(process.argv[outIdx + 1], text, "utf8");
      console.log(`Escrito en ${process.argv[outIdx + 1]} (${orders.length} órdenes)`);
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
