// Renumera las órdenes de compra en orden cronológico para que el contenedor de junio quede
// como la #1:
//
//   hoy                                                      -> nuevo
//   #6 Contenedor junio 2026 (llegó 2026-06-15)              -> #1
//   #1 Inventario inicial                                    -> #2
//   #2 Mercancía recibida 2026-10-26                         -> #3
//   #3 Mercancía en tránsito 2026-10-28                      -> #4
//   #4 Contenedor 2026TF0298 (llega 2026-12-01)              -> #5
//   #5 Inventario Lista 4 (llega 2027-01-05)                 -> #6
//
// Las líneas y los gastos se mueven con su orden (las claves foráneas tienen ON UPDATE CASCADE).
// Todo va en una transacción: si el conteo de líneas/gastos cambia, se revierte.
//
//   npx tsx scripts/renumerar-ordenes-compra.ts          (simulación)
//   npx tsx scripts/renumerar-ordenes-compra.ts --apply

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
const TEMP_OFFSET = 1000;

// [id actual, nombre esperado, id nuevo]
const MAPPING: [number, string, number][] = [
  [6, "Contenedor junio 2026 (llegó 2026-06-15)", 1],
  [1, "Inventario inicial", 2],
  [2, "Mercancía recibida 2026-10-26", 3],
  [3, "Mercancía en tránsito 2026-10-28", 4],
  [4, "Contenedor 2026TF0298 (llega 2026-12-01)", 5],
  [5, "Inventario Lista 4 (llega 2027-01-05)", 6],
];

async function counts(prisma: any) {
  const orders = await prisma.purchaseOrder.findMany({
    select: { id: true, supplierName: true, _count: { select: { items: true, expenses: true } } },
    orderBy: { id: "asc" },
  });
  return orders as { id: number; supplierName: string; _count: { items: number; expenses: number } }[];
}

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const before = await counts(prisma);
    if (before.length !== MAPPING.length) {
      throw new Error(`Hay ${before.length} órdenes y se esperaban ${MAPPING.length}; no se renumera nada.`);
    }
    for (const [oldId, name] of MAPPING) {
      const o = before.find((b) => b.id === oldId);
      if (!o || o.supplierName !== name) {
        throw new Error(`La orden #${oldId} no es "${name}" (¿ya se renumeró?); no se renumera nada.`);
      }
    }
    for (const [oldId, name, newId] of MAPPING) {
      const o = before.find((b) => b.id === oldId)!;
      console.log(`  #${oldId} -> #${newId}  ${name}  (${o._count.items} líneas, ${o._count.expenses} gastos)`);
    }
    if (!APPLY) {
      console.log("\nSimulación: no se escribió nada. Use --apply.");
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        // 1) Todas a un rango temporal para no chocar entre sí.
        await tx.$executeRawUnsafe(
          `UPDATE purchase_orders SET id = id + ${TEMP_OFFSET} WHERE id BETWEEN 1 AND ${MAPPING.length}`
        );
        // 2) Del rango temporal al número definitivo.
        for (const [oldId, , newId] of MAPPING) {
          await tx.$executeRawUnsafe(
            `UPDATE purchase_orders SET id = ${newId} WHERE id = ${oldId + TEMP_OFFSET}`
          );
        }
        // 3) Verificar que cada orden conserva sus líneas y gastos.
        const after = await tx.purchaseOrder.findMany({
          select: { id: true, supplierName: true, _count: { select: { items: true, expenses: true } } },
          orderBy: { id: "asc" },
        });
        for (const [oldId, name, newId] of MAPPING) {
          const a = after.find((x) => x.id === newId);
          const b = before.find((x) => x.id === oldId)!;
          if (!a || a.supplierName !== name || a._count.items !== b._count.items || a._count.expenses !== b._count.expenses) {
            throw new Error(`Verificación fallida en la orden #${newId} (${name}); se revierte todo.`);
          }
        }
      },
      { timeout: 60000, maxWait: 15000 }
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE purchase_orders AUTO_INCREMENT = ${MAPPING.length + 1}`);
    console.log(`\nListo. Órdenes renumeradas #1 a #${MAPPING.length} en orden cronológico.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exitCode = 1;
});
