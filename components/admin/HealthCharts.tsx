import type { PayableRow, CashFlowMonth, DailySalesDay } from "@/lib/health";
import type { AgingBuckets } from "@/lib/accounts";

// Gráficos en SVG, renderizados en el servidor (sin librerías). Colores: ver `.viz` en globals.css.
// Dos series categóricas (azul y naranja, validadas en claro y oscuro) y una rampa de un solo tono
// para la antigüedad de la deuda.

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${+(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${+(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

// Máximo "redondo" para el eje (1, 2, 2.5, 5 × 10^n) y paso entre líneas.
function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 1, step: 0.25 };
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * exp >= max) return { top: m * exp, step: (m * exp) / 4 };
  }
  return { top: 10 * exp, step: (10 * exp) / 4 };
}

// Barra vertical con el extremo de datos (arriba) redondeado a 4 px, pegada a la línea base.
function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}L${x},${y + rr}Q${x},${y} ${x + rr},${y}L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${y + h}Z`;
}

// Barra horizontal con el extremo de datos (derecha) redondeado, o recto si `round` es false.
function rowPath(x: number, y: number, w: number, h: number, round: boolean, r = 4): string {
  if (w <= 0) return "";
  if (!round) return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y}L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}L${x},${y + h}Z`;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="viz-legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className="viz-swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// ---------- 1. Flujo de caja por mes ----------

export function CashFlowChart({ months }: { months: CashFlowMonth[] }) {
  const W = 680;
  const H = 300;
  const m = { left: 52, right: 12, top: 18, bottom: 54 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const maxValue = Math.max(0, ...months.flatMap((r) => [r.income, r.outflow]));
  const { top, step } = niceScale(maxValue);
  const y = (v: number) => m.top + plotH - (v / top) * plotH;
  const group = plotW / months.length;
  const barW = Math.min(24, group * 0.3);
  const gap = 2;

  const maxIncome = Math.max(...months.map((r) => r.income));
  const maxOutflow = Math.max(...months.map((r) => r.outflow));
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const empty = maxValue === 0;

  return (
    <div className="viz-card">
      <Legend
        items={[
          { color: "var(--viz-1)", label: "Cobrado (ventas de contado y abonos)" },
          { color: "var(--viz-2)", label: "Pagado (proveedores, gastos y comisiones)" },
        ]}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-svg"
        role="img"
        aria-label="Cobrado y pagado por mes, últimos seis meses"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? "viz-axis" : "viz-grid"} />
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" className="viz-tick">
              {compact(t)}
            </text>
          </g>
        ))}
        {months.map((r, i) => {
          const cx = m.left + group * i + group / 2;
          const xIncome = cx - barW - gap / 2;
          const xOut = cx + gap / 2;
          const hIncome = (r.income / top) * plotH;
          const hOut = (r.outflow / top) * plotH;
          return (
            <g key={r.label}>
              <title>{`${r.label}: cobrado ${money(r.income)} · pagado ${money(r.outflow)} · saldo ${money(r.net)}`}</title>
              <rect x={m.left + group * i} y={m.top} width={group} height={plotH} className="viz-hit" />
              <path d={columnPath(xIncome, y(r.income), barW, hIncome)} fill="var(--viz-1)" />
              <path d={columnPath(xOut, y(r.outflow), barW, hOut)} fill="var(--viz-2)" />
              {r.income > 0 && r.income === maxIncome ? (
                <text x={xIncome + barW / 2} y={y(r.income) - 5} textAnchor="middle" className="viz-value">
                  {compact(r.income)}
                </text>
              ) : null}
              {r.outflow > 0 && r.outflow === maxOutflow ? (
                <text x={xOut + barW / 2} y={y(r.outflow) - 5} textAnchor="middle" className="viz-value">
                  {compact(r.outflow)}
                </text>
              ) : null}
              <text x={cx} y={H - 30} textAnchor="middle" className="viz-tick">
                {r.label}
              </text>
              <text x={cx} y={H - 12} textAnchor="middle" className="viz-net">
                {r.net === 0 ? "—" : `${r.net > 0 ? "+" : "−"}${compact(Math.abs(r.net))}`}
              </text>
            </g>
          );
        })}
        <text x={m.left - 8} y={H - 12} textAnchor="end" className="viz-tick">
          Saldo
        </text>
      </svg>
      {empty ? <p className="viz-note">Todavía no hay cobros ni pagos registrados en estos meses.</p> : null}
      <details className="viz-table">
        <summary>Ver tabla</summary>
        <div className="viz-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th className="num">Cobrado</th>
                <th className="num">Proveedores</th>
                <th className="num">Gastos</th>
                <th className="num">Comisiones</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {months.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="num">{money(r.income)}</td>
                  <td className="num">{money(r.suppliers)}</td>
                  <td className="num">{money(r.expenses)}</td>
                  <td className="num">{money(r.commissions)}</td>
                  <td className="num">{money(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ---------- 2. Cuentas por pagar a proveedores ----------

function shortSupplier(name: string): string {
  return name.length > 38 ? `${name.slice(0, 37)}…` : name;
}

export function PayablesChart({ rows }: { rows: PayableRow[] }) {
  const W = 680;
  const rowH = 34;
  const m = { left: 232, right: 120, top: 8, bottom: 8 };
  const H = m.top + m.bottom + rowH * rows.length;
  const plotW = W - m.left - m.right;
  const maxCost = Math.max(1, ...rows.map((r) => r.totalCost));
  const barH = 14;
  const gap = 2;

  return (
    <div className="viz-card">
      <Legend
        items={[
          { color: "var(--viz-1)", label: "Pagado" },
          { color: "var(--viz-2)", label: "Pendiente de pago" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Pagado y pendiente por orden de compra">
        {rows.map((r, i) => {
          const cy = m.top + rowH * i + rowH / 2;
          const yBar = cy - barH / 2;
          const wPaid = (r.paid / maxCost) * plotW;
          const wPending = (r.balance / maxCost) * plotW;
          const wTotal = (r.totalCost / maxCost) * plotW;
          const paidDrawn = Math.max(0, wPaid - (wPending > 0 && wPaid > 0 ? gap : 0));
          return (
            <g key={r.orderId}>
              <title>{`Orden #${r.orderId} · ${r.supplier}: costo ${money(r.totalCost)}, pagado ${money(r.paid)}, pendiente ${money(r.balance)}${r.incompleteCost ? " (faltan costos por cargar)" : ""}`}</title>
              <rect x={0} y={m.top + rowH * i} width={W} height={rowH} className="viz-hit" />
              <text x={0} y={cy - 2} className="viz-label-strong">
                {`#${r.orderId} · ${r.status === "RECIBIDA" ? "Recibida" : "En tránsito"}`}
              </text>
              <text x={0} y={cy + 12} className="viz-tick viz-left">
                {shortSupplier(r.supplier)}
              </text>
              {r.totalCost <= 0 ? (
                <text x={m.left} y={cy + 4} className="viz-tick viz-left">
                  Sin costo cargado
                </text>
              ) : (
                <>
                  <path d={rowPath(m.left, yBar, paidDrawn, barH, wPending <= 0)} fill="var(--viz-1)" />
                  <path
                    d={rowPath(m.left + (wPaid > 0 && wPending > 0 ? wPaid + 0 : 0), yBar, wPending, barH, true)}
                    fill="var(--viz-2)"
                  />
                  <text x={m.left + wTotal + 8} y={cy + 4} className="viz-value viz-left">
                    {r.balance > 0 ? `${compact(r.balance)} pend.` : "Pagada"}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {rows.some((r) => r.incompleteCost) ? (
        <p className="viz-note">
          Las órdenes con costos sin cargar muestran un total menor al real: el pendiente verdadero es mayor.
        </p>
      ) : null}
      <details className="viz-table">
        <summary>Ver tabla</summary>
        <div className="viz-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Proveedor</th>
                <th className="num">Costo</th>
                <th className="num">Pagado</th>
                <th className="num">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderId}>
                  <td>#{r.orderId}</td>
                  <td>{r.supplier}</td>
                  <td className="num">{money(r.totalCost)}</td>
                  <td className="num">{money(r.paid)}</td>
                  <td className="num">{money(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ---------- 3. Cuentas por cobrar por antigüedad ----------

const AGING_ROWS: { key: keyof AgingBuckets; label: string; color: string }[] = [
  { key: "current", label: "0–30 días", color: "var(--viz-seq-1)" },
  { key: "days31to60", label: "31–60 días", color: "var(--viz-seq-2)" },
  { key: "days61to90", label: "61–90 días", color: "var(--viz-seq-3)" },
  { key: "over90", label: "Más de 90 días", color: "var(--viz-seq-4)" },
];

export function AgingChart({ aging }: { aging: AgingBuckets }) {
  const W = 680;
  const rowH = 36;
  const m = { left: 118, right: 96, top: 6, bottom: 6 };
  const H = m.top + m.bottom + rowH * AGING_ROWS.length;
  const plotW = W - m.left - m.right;
  const max = Math.max(1, ...AGING_ROWS.map((r) => aging[r.key]));
  const total = AGING_ROWS.reduce((sum, r) => sum + aging[r.key], 0);

  return (
    <div className="viz-card">
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Cuentas por cobrar por antigüedad">
        {AGING_ROWS.map((r, i) => {
          const value = aging[r.key];
          const cy = m.top + rowH * i + rowH / 2;
          const w = (value / max) * plotW;
          return (
            <g key={r.key}>
              <title>{`${r.label}: ${money(value)}${total > 0 ? ` (${Math.round((value / total) * 100)} %)` : ""}`}</title>
              <rect x={0} y={m.top + rowH * i} width={W} height={rowH} className="viz-hit" />
              <text x={0} y={cy + 4} className="viz-label-strong">
                {r.label}
              </text>
              <path d={rowPath(m.left, cy - 8, w, 16, true)} fill={r.color} />
              <text x={m.left + Math.max(w, 0) + 8} y={cy + 4} className="viz-value viz-left">
                {value > 0 ? money(value) : "—"}
              </text>
            </g>
          );
        })}
      </svg>
      {total === 0 ? <p className="viz-note">No hay deudas de clientes pendientes.</p> : null}
    </div>
  );
}

// ---------- 4. Ventas diarias ----------

export function DailySalesChart({ days }: { days: DailySalesDay[] }) {
  const W = 680;
  const H = 250;
  const m = { left: 52, right: 12, top: 20, bottom: 30 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const maxTotal = Math.max(0, ...days.map((d) => d.total));
  const { top, step } = niceScale(maxTotal);
  const y = (v: number) => m.top + plotH - (v / top) * plotH;
  const slot = plotW / days.length;
  const barW = Math.max(4, Math.min(16, slot * 0.62));
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);

  const total = days.reduce((sum, d) => sum + d.total, 0);
  const orders = days.reduce((sum, d) => sum + d.orders, 0);
  const best = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);
  const withSales = days.filter((d) => d.orders > 0);
  const last = days.length - 1;

  return (
    <div className="viz-card">
      <p className="viz-summary">
        <span>
          <strong>{money(total)}</strong> en {days.length} días ({orders} {orders === 1 ? "orden" : "órdenes"})
        </span>
        <span>
          Promedio: <strong>{money(total / days.length)}</strong> por día
        </span>
        {best.total > 0 ? (
          <span>
            Mejor día: <strong>{best.label}</strong> ({money(best.total)})
          </span>
        ) : null}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-svg"
        role="img"
        aria-label={`Ventas por día, últimos ${days.length} días`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? "viz-axis" : "viz-grid"} />
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" className="viz-tick">
              {compact(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = m.left + slot * i + slot / 2;
          const h = (d.total / top) * plotH;
          const showLabel = i === 0 || i === last || i % 5 === 0;
          return (
            <g key={d.date}>
              <title>{`${d.label}: ${money(d.total)} · ${d.orders} ${d.orders === 1 ? "orden" : "órdenes"}`}</title>
              <rect x={m.left + slot * i} y={m.top} width={slot} height={plotH} className="viz-hit" />
              <path d={columnPath(cx - barW / 2, y(d.total), barW, h)} fill="var(--viz-1)" />
              {d.total > 0 && d.total === best.total ? (
                <text x={cx} y={y(d.total) - 5} textAnchor="middle" className="viz-value">
                  {compact(d.total)}
                </text>
              ) : null}
              {showLabel && (i === 0 || last - i > 2 || i === last) ? (
                <text x={cx} y={H - 10} textAnchor="middle" className="viz-tick">
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {total === 0 ? <p className="viz-note">No hay ventas en los últimos {days.length} días.</p> : null}
      <details className="viz-table">
        <summary>Ver tabla (solo días con ventas)</summary>
        <div className="viz-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th className="num">Órdenes</th>
                <th className="num">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {withSales.length === 0 ? (
                <tr>
                  <td colSpan={3}>Sin ventas en el período.</td>
                </tr>
              ) : (
                [...withSales].reverse().map((d) => (
                  <tr key={d.date}>
                    <td>{d.label}</td>
                    <td className="num">{d.orders}</td>
                    <td className="num">{money(d.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
