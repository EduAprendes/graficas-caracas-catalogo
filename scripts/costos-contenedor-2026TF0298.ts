// Carga en la orden de compra #4 (contenedor 2026TF0298) el costo de factura por producto y los
// gastos del contenedor. Los costos unitarios son una APROXIMACIÓN: se repartió la factura total
// ($41.424) en proporción al precio de venta de cada línea. Reemplazar cuando el proveedor
// entregue el costo real de cada producto (en /admin/compras/4/editar).
//
//   npx tsx scripts/costos-contenedor-2026TF0298.ts          (simulación)
//   npx tsx scripts/costos-contenedor-2026TF0298.ts --apply

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
const ORDER_ID = 4;
const INVOICE_TOTAL = 41424;

const COSTS: Record<string, number> = {
  "BAN-BN-320": 80.88,
  "BAN-BNM-320": 80.88,
  "CLEAR-BR": 41.42,
  "CLEAR-MT": 41.42,
  "LAM-PVC-3": 5.92,
  UTTPA061: 47.34,
  "STAND-DEG-CU": 27.62,
  "BAN-BB-107": 27.2, // ajustado para que la factura cuadre exacta
  "BAN-BB-160": 41.03,
  "BAN-BB-180": 46.16,
  "VIN-BB-BR": 41.42,
  "VIN-BB-MT": 41.42,
};

const EXPENSES = [
  { concept: "Aduana", amount: 20000 },
  { concept: "Comisiones", amount: 1500 },
  { concept: "Descarga", amount: 400 },
  { concept: "Flete", amount: 11200 },
];

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: ORDER_ID },
      include: { items: { include: { product: { select: { code: true } } } }, expenses: true },
    });
    if (!order || !order.supplierName.includes("2026TF0298")) {
      throw new Error(`La orden #${ORDER_ID} no es la del contenedor 2026TF0298.`);
    }
    if (order.status !== "PENDIENTE") throw new Error(`La orden está ${order.status}, no PENDIENTE.`);
    if (order.expenses.length > 0) throw new Error("La orden ya tiene gastos cargados; no se duplican.");

    let invoice = 0;
    for (const item of order.items) {
      const cost = COSTS[item.product.code];
      if (cost === undefined) throw new Error(`Sin costo definido para ${item.product.code}`);
      invoice += cost * item.quantity;
      console.log(`  ${item.product.code.padEnd(14)} x${String(item.quantity).padStart(5)}  costo ${cost.toFixed(2)}`);
    }
    invoice = Math.round(invoice * 100) / 100;
    const expenses = EXPENSES.reduce((s, e) => s + e.amount, 0);
    console.log(`\nFactura: $${invoice} (esperado $${INVOICE_TOTAL}) | Gastos: $${expenses} | Costo total: $${invoice + expenses}`);
    if (invoice !== INVOICE_TOTAL) throw new Error("La factura no cuadra con el total esperado; no se escribe nada.");
    if (!APPLY) {
      console.log("Simulación: no se escribió nada. Use --apply.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { cost: COSTS[item.product.code] } });
      }
      await tx.purchaseOrderExpense.createMany({
        data: EXPENSES.map((e) => ({ orderId: ORDER_ID, concept: e.concept, amount: e.amount })),
      });
    }, { timeout: 60000, maxWait: 15000 });
    console.log(`\nListo. Orden #${ORDER_ID}: ${order.items.length} costos y ${EXPENSES.length} gastos cargados.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exitCode = 1;
});
