// Inventario Lista 4 (PDF), llegada prevista 2027-01-05: crea la orden de compra #5 PENDIENTE
// con la factura (costos aproximados por producto) y los gastos del contenedor. Los precios del
// PDF son de venta. Todos los productos ya existen.
// Al recibirla desde /admin/compras/5 se suma el stock.
//
//   npx tsx scripts/cargar-lista4-2027-01-05.ts          (simulación)
//   npx tsx scripts/cargar-lista4-2027-01-05.ts --apply

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
const ORDER_ID = 5;
const SUPPLIER = "Inventario Lista 4 (llega 2027-01-05)";
const NOTES =
  "Inventario Lista 4 (PDF), llegada prevista 2027-01-05. Costos por producto aproximados " +
  "(factura repartida según el precio de venta). scripts/cargar-lista4-2027-01-05.ts";
const PDF_TOTAL = 126350;

const LINES: { code: string; qty: number; price: number }[] = [
  { code: "VIN-BB-BR", qty: 480, price: 105 },
  { code: "VIN-BN-BR", qty: 150, price: 105 },
  { code: "VIN-BN-MT", qty: 150, price: 105 },
  { code: "CLEAR-BR", qty: 195, price: 105 },
  { code: "CLEAR-MT", qty: 195, price: 105 },
  { code: "P-ARAÑA-NA", qty: 200, price: 10 },
  { code: "MAQ-OJETES", qty: 6, price: 250 },
];

// Factura y gastos del contenedor. Los costos por producto son una APROXIMACIÓN: la factura se
// reparte en proporción al valor de venta de cada línea (igual que "Repartir entre los
// productos" en el formulario). Reemplazar por los costos reales cuando el proveedor los dé.
const INVOICE_TOTAL = 47102;
const EXPENSES = [
  { concept: "Flete", amount: 11206.65 },
  { concept: "Comisiones", amount: 1200 },
  { concept: "Descarga", amount: 400 },
  { concept: "Aduana", amount: 20000 },
  { concept: "Camión China", amount: 1000 },
];

function distributeInvoice(total: number, lines: { price: number; quantity: number }[]): number[] {
  const base = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const cents = lines.map((l) => Math.round(((l.price * total) / base) * 100));
  let diff = Math.round(total * 100) - cents.reduce((s, c, i) => s + c * lines[i].quantity, 0);
  const order = lines.map((_, i) => i).sort((a, b) => lines[a].quantity - lines[b].quantity);
  for (const i of order) {
    const step = Math.round(diff / lines[i].quantity);
    if (step === 0 || cents[i] + step < 0) continue;
    const newDiff = diff - step * lines[i].quantity;
    if (Math.abs(newDiff) < Math.abs(diff)) {
      cents[i] += step;
      diff = newDiff;
    }
  }
  return cents.map((c) => c / 100);
}

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    if (await prisma.purchaseOrder.findUnique({ where: { id: ORDER_ID } })) {
      throw new Error(`Ya existe la orden #${ORDER_ID}; no se puede usar ese número.`);
    }
    if (await prisma.purchaseOrder.findFirst({ where: { supplierName: SUPPLIER } })) {
      throw new Error("Ya existe una orden con ese nombre; no se crea otra.");
    }

    const products = await prisma.product.findMany({
      where: { code: { in: LINES.map((l) => l.code) } },
      select: { id: true, code: true, price: true },
    });
    const byCode = new Map(products.map((p) => [p.code, p]));

    const costs = distributeInvoice(
      INVOICE_TOTAL,
      LINES.map((l) => ({ price: l.price, quantity: l.qty }))
    );
    let total = 0;
    let invoice = 0;
    LINES.forEach((l, i) => {
      const p = byCode.get(l.code);
      if (!p) throw new Error(`Falta el producto ${l.code}`);
      if (Number(p.price) !== l.price) {
        throw new Error(`${l.code}: el precio del catálogo (${p.price}) no coincide con el PDF (${l.price})`);
      }
      total += l.qty * l.price;
      invoice += costs[i] * l.qty;
      console.log(`  ${l.code.padEnd(12)} x${String(l.qty).padStart(4)}  venta $${l.price}  costo ${costs[i].toFixed(2)}`);
    });
    invoice = Math.round(invoice * 100) / 100;
    const expensesTotal = Math.round(EXPENSES.reduce((s, e) => s + e.amount, 0) * 100) / 100;
    console.log(`\nValor a precio de venta: $${total.toLocaleString("en-US")} (el PDF indica $${PDF_TOTAL.toLocaleString("en-US")})`);
    console.log(
      `Factura: $${invoice} (esperado $${INVOICE_TOTAL}) | Gastos: $${expensesTotal} | ` +
        `Costo total: $${(invoice + expensesTotal).toFixed(2)} | Ganancia esperada: $${(total - invoice - expensesTotal).toFixed(2)}`
    );
    if (total !== PDF_TOTAL) throw new Error("El total no coincide con el PDF; no se escribe nada.");
    if (invoice !== INVOICE_TOTAL) throw new Error("La factura repartida no cuadra; no se escribe nada.");
    if (!APPLY) {
      console.log("Simulación: no se escribió nada. Use --apply.");
      return;
    }

    const user = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });
    if (!user) throw new Error("No hay administrador.");

    await prisma.$transaction(
      async (tx) => {
        const po = await tx.purchaseOrder.create({
          data: { id: ORDER_ID, supplierName: SUPPLIER, notes: NOTES, status: "PENDIENTE", userId: user.id },
        });
        for (const [i, l] of LINES.entries()) {
          await tx.purchaseOrderItem.create({
            data: { orderId: po.id, productId: byCode.get(l.code)!.id, quantity: l.qty, cost: costs[i] },
          });
        }
        await tx.purchaseOrderExpense.createMany({
          data: EXPENSES.map((e) => ({ orderId: po.id, concept: e.concept, amount: e.amount })),
        });
        console.log(
          `\nListo. Orden #${po.id} pendiente con ${LINES.length} líneas y ${EXPENSES.length} gastos. ` +
            `Ábrela en /admin/compras/${po.id}`
        );
      },
      { timeout: 60000, maxWait: 15000 }
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE purchase_orders AUTO_INCREMENT = ${ORDER_ID + 1}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exitCode = 1;
});
