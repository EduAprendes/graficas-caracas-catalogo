// Crea una orden de compra de PRUEBA copiando la última orden existente (mismos productos,
// cantidades y costos). Queda en estado PENDIENTE: no suma stock ni entra en las ganancias
// (solo cuentan las RECIBIDA). Sirve para probar los gastos de aduana / logística en
// /admin/compras/[id]. Al terminar, bórrala con --borrar.
//
//   npx tsx scripts/crear-orden-prueba.ts            (simulación)
//   npx tsx scripts/crear-orden-prueba.ts --apply    (crea la orden de prueba)
//   npx tsx scripts/crear-orden-prueba.ts --borrar   (borra las órdenes de prueba)

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
const BORRAR = process.argv.includes("--borrar");
const PREFIX = "PRUEBA - ";

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    if (BORRAR) {
      const tests = await prisma.purchaseOrder.findMany({
        where: { supplierName: { startsWith: PREFIX } },
        select: { id: true, supplierName: true, status: true },
      });
      console.log("Órdenes de prueba:", tests);
      if (tests.some((t) => t.status === "RECIBIDA")) {
        throw new Error("Hay una orden de prueba RECIBIDA (movió stock); no se borra automáticamente.");
      }
      if (APPLY || BORRAR) {
        const r = await prisma.purchaseOrder.deleteMany({
          where: { supplierName: { startsWith: PREFIX }, status: { not: "RECIBIDA" } },
        });
        console.log(`Borradas: ${r.count} (sus líneas y gastos se borran en cascada).`);
      }
      return;
    }

    const last = await prisma.purchaseOrder.findFirst({
      where: { NOT: { supplierName: { startsWith: PREFIX } } },
      orderBy: { id: "desc" },
      include: { items: true },
    });
    if (!last) throw new Error("No hay ninguna orden de compra para copiar.");

    const withCost = last.items.filter((i) => i.cost != null).length;
    console.log(
      `Se copiaría la orden #${last.id} "${last.supplierName}" (${last.status}): ` +
        `${last.items.length} líneas, ${withCost} con costo de factura.`
    );
    if (!APPLY) {
      console.log("Simulación: no se creó nada. Usa --apply para crearla.");
      return;
    }

    const created = await prisma.purchaseOrder.create({
      data: {
        supplierName: `${PREFIX}${last.supplierName}`,
        notes: "Orden de prueba para ensayar gastos de aduana y logística. Borrar al terminar.",
        status: "PENDIENTE",
        userId: last.userId,
        items: {
          create: last.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            cost: i.cost,
          })),
        },
      },
    });
    console.log(`Creada la orden de prueba #${created.id}. Ábrela en /admin/compras/${created.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
