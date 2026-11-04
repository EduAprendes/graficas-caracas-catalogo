// Estandariza el nombre (proveedor) de las órdenes de compra:
//   Contenedor <número> · <detalle> · llegada <AAAA-MM-DD>
// "s/n" = número de contenedor aún no conocido: se completa desde /admin/compras/<n>/editar.
// La orden #2 (Inventario inicial) es el punto de partida del inventario, no un contenedor,
// y se deja como está.
//
//   npx tsx scripts/renombrar-ordenes-compra.ts          (simulación)
//   npx tsx scripts/renombrar-ordenes-compra.ts --apply

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

// [id, nombre actual esperado, nombre nuevo]
const RENAMES: [number, string, string][] = [
  [1, "Contenedor junio 2026 (llegó 2026-06-15)", "Contenedor s/n · llegada 2026-06-15"],
  [3, "Mercancía recibida 2026-10-26", "Contenedor s/n · llegada 2026-10-26"],
  [4, "Mercancía en tránsito 2026-10-28", "Contenedor s/n · en tránsito (reporte 2026-10-28)"],
  [5, "Contenedor 2026TF0298 (llega 2026-12-01)", "Contenedor 2026TF0298 · Lista 3 · llegada 2026-12-01"],
  [6, "Inventario Lista 4 (llega 2027-01-05)", "Contenedor s/n · Lista 4 · llegada 2027-01-05"],
];

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const orders = await prisma.purchaseOrder.findMany({ select: { id: true, supplierName: true } });
    for (const [id, current, next] of RENAMES) {
      const o = orders.find((x) => x.id === id);
      if (!o || o.supplierName !== current) {
        throw new Error(`La orden #${id} no se llama "${current}" (¿ya se renombró?); no se cambia nada.`);
      }
      console.log(`  #${id}: "${current}"\n       -> "${next}"`);
    }
    const inicial = orders.find((x) => x.id === 2);
    console.log(`  #2: "${inicial?.supplierName}" (sin cambios)`);
    if (!APPLY) {
      console.log("\nSimulación: no se escribió nada. Use --apply.");
      return;
    }
    await prisma.$transaction(
      async (tx) => {
        for (const [id, , next] of RENAMES) {
          await tx.purchaseOrder.update({ where: { id }, data: { supplierName: next } });
        }
      },
      { timeout: 60000, maxWait: 15000 }
    );
    console.log(`\nListo. ${RENAMES.length} órdenes renombradas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exitCode = 1;
});
