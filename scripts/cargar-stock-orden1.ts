// Carga en stock lo que dice la orden de compra #1 (contenedor del 2026-06-15) SOLO para los 9
// productos cuyo stock nunca se cargó (la orden #1 se registró sin mover stock). Es una carga
// PROVISIONAL: cuando se haga el inventario real, se edita la orden #1 desde la pantalla y el
// sistema ajusta el stock por la diferencia.
//
// Cada carga queda como movimiento de stock (reason COMPRA) ligado a la línea de la orden #1.
// Guardas: solo carga si el stock del producto es 0 y la línea no tiene ya un movimiento.
//
//   npx tsx scripts/cargar-stock-orden1.ts          (simulación)
//   npx tsx scripts/cargar-stock-orden1.ts --apply

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
const ORDER_ID = 1;
const CODES = [
  "LAPICEROS-BASICOS",
  "LAPICEROS-VARIOS",
  "P-CARTEL",
  "SAV1,37 B/M",
  "SAV1,37MB",
  "OJETES-MILLAR",
  "HOJILLAS-GRA-MILLAR",
  "CONTROL-INSECTOS",
  "HOJILLAS-PEQ-MILLAR",
];

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: ORDER_ID },
      include: { items: { include: { product: true } } },
    });
    if (order.status !== "RECIBIDA") throw new Error(`La orden #${ORDER_ID} no está RECIBIDA (${order.status}).`);

    const plan: { itemId: number; productId: number; code: string; qty: number }[] = [];
    for (const code of CODES) {
      const item = order.items.find((i) => i.product.code === code);
      if (!item) {
        console.log(`- ${code}: NO está en la orden #${ORDER_ID}, se omite.`);
        continue;
      }
      const hasMovement = await prisma.stockMovement.count({ where: { purchaseOrderItemId: item.id } });
      if (item.product.stock !== 0 || hasMovement > 0) {
        console.log(
          `- ${code}: se omite (stock ${item.product.stock}, movimientos de la línea: ${hasMovement}).`
        );
        continue;
      }
      plan.push({ itemId: item.id, productId: item.productId, code, qty: item.quantity });
      console.log(`+ ${code}: stock 0 -> ${item.quantity}`);
    }
    console.log(`\n${plan.length} producto(s) a cargar.`);

    if (!APPLY) {
      console.log("Simulación: no se escribió nada. Use --apply.");
      return;
    }
    if (plan.length === 0) return;

    const user = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });
    if (!user) throw new Error("No hay administrador.");

    await prisma.$transaction(
      async (tx) => {
        for (const p of plan) {
          await tx.product.update({ where: { id: p.productId }, data: { stock: p.qty } });
          await tx.stockMovement.create({
            data: {
              productId: p.productId,
              userId: user.id,
              delta: p.qty,
              reason: "COMPRA",
              purchaseOrderItemId: p.itemId,
            },
          });
        }
      },
      { timeout: 60000, maxWait: 15000 }
    );
    console.log(`\nListo: ${plan.length} producto(s) cargados.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
