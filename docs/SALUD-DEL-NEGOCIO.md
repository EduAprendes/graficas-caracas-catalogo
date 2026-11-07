# Salud del negocio (gráficos)

Fecha: 2026-11-07. Página `/admin/salud`, pestaña **Salud** (solo administrador). Datos en vivo:
se recalcula en cada visita, sin librerías de gráficos (SVG en el servidor).

## Qué muestra

- **Indicadores de arriba:** ventas del mes (con ▲/▼ frente al mes anterior), por pagar a proveedores,
  cobros vencidos (+30 días) y productos con stock bajo.
- **Cobrado y pagado por mes** (últimos 6 meses). Cobrado = ventas de contado + abonos de clientes
  (no anulados). Pagado = pagos a proveedores (por fecha de pago) + gastos operativos + comisiones
  pagadas. Debajo de cada mes, el saldo. Tabla alternativa en "Ver tabla".
- **Cuentas por pagar a proveedores:** por orden de compra, pagado y pendiente (costo = factura + gastos
  del contenedor). Las órdenes anuladas no cuentan.
- **Cuentas por cobrar por antigüedad:** 0–30, 31–60, 61–90 y más de 90 días, más los 5 mayores deudores.

## Dónde está el código

- `lib/health.ts`: consultas (reutiliza `getReceivables`, `getProfitReport` y `getStockAlerts`).
- `components/admin/HealthCharts.tsx`: los tres gráficos. Colores en `.viz` de `app/globals.css`
  (azul y naranja validados en modo claro y oscuro con el validador de paleta; la antigüedad usa una
  rampa de un solo tono).
- `app/admin/salud/page.tsx`.

## Límites conocidos (los datos, no el código)

- **Costos incompletos:** si una orden de compra tiene líneas sin costo (hoy la #2), sus ventas cuentan
  con costo 0 y las cuentas por pagar quedan por debajo del real. La página muestra un aviso.
- **Poco historial de ventas:** las barras de "cobrado" se ven pequeñas frente a los pagos a proveedores
  (la escala es única, sin eje doble).
- **Stock provisional:** ver `docs/ALERTAS-STOCK-BAJO.md`.

## Ideas para después (cuando haya más datos)

Ventas, costo y ganancia neta por mes; inventario por categoría y rotación; ranking de productos,
categorías y vendedoras con su margen.
