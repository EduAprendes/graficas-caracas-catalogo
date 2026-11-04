// Contenedor que llegó el 2026-06-15 (lista "Inventario General de Materiales", total de la lista
// $159.350): crea los productos que faltan (stock 0) y una orden de compra ya RECIBIDA, con la
// factura repartida de forma APROXIMADA (en proporción al valor de venta de la lista) y los
// gastos del contenedor. NO mueve stock: el inventario actual ya refleja lo que quedó de este
// contenedor. Sirve para que las ventas de estos productos tengan costo real en /admin/ganancias.
//
// Ojo: si luego se edita esta orden desde la pantalla y se cambian cantidades, el sistema SÍ
// ajusta el stock por la diferencia.
//
//   npx tsx scripts/cargar-contenedor-junio-2026.ts          (simulación)
//   npx tsx scripts/cargar-contenedor-junio-2026.ts --apply

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
const SUPPLIER = "Contenedor junio 2026 (llegó 2026-06-15)";
// La columna notes admite 191 caracteres.
const NOTES = "Llegó 2026-06-15. Costos aproximados (factura repartida por valor de venta). No movió stock.";
const RECEIVED_AT = new Date("2026-06-15T12:00:00-04:00");
const INVOICE_TOTAL = 53064;
const LIST_TOTAL = 159350; // suma de la lista (incluye pistola de calor y colector a $0)

const EXPENSES = [
  { concept: "Aduana", amount: 20000 },
  { concept: "Comisiones", amount: 2000 },
  { concept: "Flete", amount: 8500 },
  { concept: "Descarga", amount: 500 },
];

type Line = {
  code: string;
  qty: number;
  price: number; // precio unitario de la lista
  // Solo para productos nuevos:
  category?: string;
  description?: string;
  dimension?: string;
};

// La pistola de calor y el colector de polvo (herramientas, $0 en la lista) no se cargan.
const LINES: Line[] = [
  // Productos que ya existen
  { code: "BAN-BNM-320", qty: 25, price: 200 },
  { code: "BAN-BN-320", qty: 50, price: 200 },
  { code: "SAV1,37MB", qty: 200, price: 100 },
  { code: "SAV1,37 B/M", qty: 500, price: 100 },
  { code: "CLEAR-MT", qty: 100, price: 105 },
  { code: "CLEAR-BR", qty: 100, price: 105 },
  { code: "MICRO-137", qty: 20, price: 165 },
  { code: "P-CARTEL", qty: 500, price: 1 },
  // Productos nuevos
  { code: "OJETES-MILLAR", qty: 200, price: 30, category: "varios", description: "Ojetes (millar)", dimension: "Millar" },
  { code: "HOJILLAS-PEQ-MILLAR", qty: 2, price: 100, category: "varios", description: "Hojillas pequeñas (millar)", dimension: "Millar" },
  { code: "HOJILLAS-GRA-MILLAR", qty: 100, price: 110, category: "varios", description: "Hojillas grandes (millar)", dimension: "Millar" },
  { code: "CONTROL-INSECTOS", qty: 10, price: 35, category: "varios", description: "Control de insectos", dimension: "Unidad" },
  { code: "LAPICEROS-VARIOS", qty: 20000, price: 1, category: "de-todo", description: "Lapiceros varios", dimension: "Unidad" },
  { code: "LAPICEROS-BASICOS", qty: 100000, price: 0.12, category: "de-todo", description: "Lapiceros", dimension: "Unidad" },
];

// Reparte la factura en proporción al valor de venta (precio × cantidad) de cada línea, a
// centavos por unidad, y reparte el redondeo sobrante entre las líneas de costo >= $5 (un
// centavo por pasada) para que la suma de costo × cantidad dé exactamente el total.
function distributeInvoice(total: number, lines: { price: number; quantity: number }[]): number[] {
  const base = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const cents = lines.map((l) => Math.round(((l.price * total) / base) * 100));
  let diff = Math.round(total * 100) - cents.reduce((s, c, i) => s + c * lines[i].quantity, 0);
  const eligible = lines
    .map((_, i) => i)
    .filter((i) => cents[i] >= 500)
    .sort((a, b) => lines[b].quantity - lines[a].quantity);
  let moved = true;
  while (moved && diff !== 0) {
    moved = false;
    for (const i of eligible) {
      const q = lines[i].quantity;
      const s = Math.sign(diff);
      if (Math.abs(diff) >= q && cents[i] + s > 0) {
        cents[i] += s;
        diff -= s * q;
        moved = true;
      }
    }
  }
  return cents.map((c) => c / 100);
}

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    if (await prisma.purchaseOrder.findFirst({ where: { supplierName: SUPPLIER } })) {
      throw new Error("Ya existe la orden del contenedor de junio; no se crea otra.");
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

    const costs = distributeInvoice(
      INVOICE_TOTAL,
      LINES.map((l) => ({ price: l.price, quantity: l.qty }))
    );
    let listValue = 0;
    let invoice = 0;
    LINES.forEach((l, i) => {
      const found = byCode.get(l.code);
      if (!found && !l.category) throw new Error(`Falta el producto existente ${l.code}`);
      if (found && l.category) throw new Error(`El código nuevo ${l.code} ya existe`);
      if (l.category && !bySlug.has(l.category)) throw new Error(`No existe la categoría ${l.category}`);
      listValue += l.qty * l.price;
      invoice += costs[i] * l.qty;
      const note = found && Number(found.price) !== l.price ? `  (catálogo hoy $${found.price})` : "";
      console.log(
        `  ${found ? "existente" : "NUEVO    "} ${l.code.padEnd(20)} x${String(l.qty).padStart(6)}  ` +
          `lista $${l.price}  costo ${costs[i].toFixed(2)}${note}`
      );
    });
    invoice = Math.round(invoice * 100) / 100;
    listValue = Math.round(listValue * 100) / 100;
    const expensesTotal = EXPENSES.reduce((s, e) => s + e.amount, 0);
    console.log(`\nValor de la lista: $${listValue.toLocaleString("en-US")} (la imagen indica $${LIST_TOTAL.toLocaleString("en-US")})`);
    console.log(
      `Factura: $${invoice} (esperado $${INVOICE_TOTAL}) | Gastos: $${expensesTotal} | ` +
        `Costo total: $${(invoice + expensesTotal).toFixed(2)} | Factor: ${(1 + expensesTotal / INVOICE_TOTAL).toFixed(4)}`
    );
    if (listValue !== LIST_TOTAL) throw new Error("El valor de la lista no coincide con la imagen; no se escribe nada.");
    if (invoice !== INVOICE_TOTAL) throw new Error("La factura repartida no cuadra; no se escribe nada.");
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
          data: {
            supplierName: SUPPLIER,
            notes: NOTES,
            status: "RECIBIDA",
            userId: user.id,
            createdAt: RECEIVED_AT,
            receivedAt: RECEIVED_AT,
          },
        });
        for (const [i, l] of LINES.entries()) {
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
          await tx.purchaseOrderItem.create({
            data: { orderId: po.id, productId, quantity: l.qty, cost: costs[i] },
          });
        }
        await tx.purchaseOrderExpense.createMany({
          data: EXPENSES.map((e) => ({ orderId: po.id, concept: e.concept, amount: e.amount })),
        });
        console.log(
          `\nListo. Orden #${po.id} RECIBIDA (2026-06-15) con ${LINES.length} líneas y ${EXPENSES.length} gastos, sin mover stock. ` +
            `Ábrela en /admin/compras/${po.id}`
        );
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
