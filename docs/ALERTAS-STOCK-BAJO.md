# Alertas de stock bajo

Fecha: 2026-11-07 (commits `4166167` y `3f15e73`, en producción; migración `20261107120000` aplicada). Solo las ve el rol **ADMIN**.

## Regla

Un producto está en alerta cuando su **stock actual ≤ 20 %** de la cantidad que llegó en su
**última orden de compra recibida** (estado `RECIBIDA`; "última" = mayor fecha de recepción, o de
creación si falta; empate → la orden de mayor id).

- Las órdenes que no están `RECIBIDA` (p. ej. en tránsito) no cuentan como referencia.
- Un producto que nunca se ha recibido en una orden **no tiene referencia y no alerta**; la
  pantalla muestra cuántos son.
- Stock 0 o negativo = agotado (0 %). Orden de la lista: más críticos primero.
- El 20 % está en `LOW_STOCK_RATIO` (`lib/stock-alerts.ts`). Cambiarlo cambia pantalla y correo.

## Dónde se ve

- `/admin/inventario/stock-bajo`: lista completa, con productos en alerta y agotados.
- Resumen del admin (`/admin`): panel "Stock bajo" con los 6 más críticos y contador.
- Menú del admin: campana con el número de alertas (si el cálculo falla, el menú se ve igual).
- Inventario: indicadores en las tarjetas de categoría, en las filas de producto y en el detalle.

## Correo (diario solo con lo nuevo + lista completa los lunes)

- Cron `/api/cron/stock-bajo`, definido en `vercel.json`: todos los días **12:00 UTC (8:00 a. m.
  VET)**. Exige `Authorization: Bearer $CRON_SECRET`; sin él responde 401.
- Va a `MAIL_ADMIN_COPY` (varios correos separados por coma), la misma variable de la copia
  interna de las órdenes. Hoy: `eurorondon03@gmail.com`, en `.env` y en Vercel (Production).
- **Lunes** (día UTC; coincide con Venezuela a esa hora): correo "Resumen semanal" con la lista
  completa, marcando "nuevo" los que entraron desde el último aviso.
- **Resto de días**: correo "Nuevos con stock bajo" solo con los productos que entraron en alerta
  desde el último aviso. Si no hay nuevos no se envía nada.
- La tabla `stock_alert_notices` (modelo `StockAlertNotice`, migración
  `20261107120000_add_stock_alert_notices`) guarda a quién ya se avisó. La fila se borra cuando el
  producto sale de la alerta (se repuso), así que si vuelve a caer se avisa otra vez. Las marcas se
  guardan **después** de enviar: si el correo falla, al día siguiente se reintenta.
- La tabla del correo muestra hasta 60 productos y dice cuántos más hay.
- Respuesta del cron (JSON): `{"alerts":N,"newAlerts":N,"mode":"nuevos|semanal","sent":true}`, o
  `sent:false` con `reason`: `no_alerts`, `nothing_new`, `mail_not_configured`, `no_recipient`,
  `send_failed`.
- Para forzar la lista completa en una prueba: añadir `?modo=semanal` a la URL.

## Probarlo a mano

```
curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2- | tr -d '"\r')" \
  https://catalogo.graficascaracas.com/api/cron/stock-bajo
```

Manda el correo real si hay alertas. Prueba del 2026-11-07: 16 productos en alerta, correo
recibido.

## Pendiente de verificar

- [ ] Comprobar a mano 2–3 productos: última orden recibida × 20 % frente a lo que muestra la pantalla.
- [ ] Casos límite: justo 20 % (alerta), 21 % (no), agotado, varias compras del mismo producto.
- [x] Flujo "solo nuevos" probado el 2026-11-07 (sábado): `?modo=semanal` → 16 alertas, 16 nuevas, correo
      enviado y 16 filas en `stock_alert_notices`; llamada normal → `nothing_new`, sin correo.
- [ ] Reposición: tras recibir una compra de un producto avisado, su marca debe borrarse; si vuelve a
      caer, debe avisarse como nuevo.
- [ ] Primer lunes (2026-11-09, 8:00 a. m. VET): debe llegar la lista completa con los nuevos marcados.
- [ ] Confirmar que el correo automático llega a las 8:00 a. m. (primer envío programado).
- [ ] Efecto lateral: `MAIL_ADMIN_COPY` también recibe ahora la copia interna de cada orden.

## Carga provisional de la orden #1 (2026-11-07)

La orden de compra #1 (junio) se registró **sin mover stock** (ver encabezado de
`scripts/cargar-contenedor-junio-2026.ts`), y 9 productos quedaron en 0 aunque la orden dice que
llegaron: `LAPICEROS-BASICOS` (100000), `LAPICEROS-VARIOS` (20000), `P-CARTEL` (500),
`SAV1,37 B/M` (500), `SAV1,37MB` (200), `OJETES-MILLAR` (200), `HOJILLAS-GRA-MILLAR` (100),
`CONTROL-INSECTOS` (10), `HOJILLAS-PEQ-MILLAR` (2). Eso daba 9 alertas falsas.

- Se cargó en stock la cantidad de la orden #1 para esos 9 con `scripts/cargar-stock-orden1.ts`
  (movimiento `COMPRA` ligado a la línea; no repite si ya se cargó). Alertas: 0.
- **Es provisional.** Son las cantidades de la orden, no lo contado en el almacén. Efectos hasta
  corregirlo: el valor del inventario sube ~$120.000 y esos productos aparecen con stock en el
  catálogo público.
- **Pendiente: hacer el inventario real y editar la orden #1** (`/admin/compras/1` → Editar) con las
  cantidades reales: el sistema ajusta el stock por la diferencia. Si alguna cantidad de la orden
  estaba mal (p. ej. los 100000 lapiceros), corregirla ahí; ojo, cambia también el costo en Ganancias.
- No se cargó el resto de líneas de la orden #1 (`CLEAR-*`, `BAN-*`, `MICRO-137`...): su stock ya
  estaba contado y se habría duplicado.

## Orden de prueba #2

La orden #2 era una prueba (1 unidad en 51 productos). Se **anuló** el 2026-11-07: se conserva con
sus 51 líneas como ejemplo, el stock que sumó se revirtió (40 movimientos `ANULACION_COMPRA`) y deja
de contar como referencia. Anular una orden grande falló al principio por el límite de 5 s de las
transacciones de Prisma (P2028); se corrigió en `lib/orders.ts` (commit `6aabda7`).

**Actualización:** la orden anulada pasó del id 2 al **id 0** (`UPDATE purchase_orders SET id=0 WHERE id=2`,
las líneas la siguieron por `ON UPDATE CASCADE`) para que quede como ejemplo "Inventario inicial" fuera
de la numeración normal: `/admin/compras/0`. (Ya no se puede deshacer volviendo al 2: ver la renumeración de abajo.)
Ojo: una restauración de respaldo que no use `NO_AUTO_VALUE_ON_ZERO` puede convertir ese 0 en un id nuevo;
si pasa, buscar la orden "Inventario inicial" en el listado.

## Renumeración de órdenes de compra (2026-11-07)

Al pasar la orden de prueba al id 0 quedó un hueco en el 2, así que se corrieron las demás para que
la numeración sea continua (`UPDATE purchase_orders SET id=...` en orden ascendente; líneas, gastos y
pagos las siguieron por `ON UPDATE CASCADE`; `AUTO_INCREMENT=6`):

| Antes | Ahora | Orden |
|---|---|---|
| #0 (era #2) | #0 | Inventario inicial (anulada, ejemplo) |
| #1 | #1 | Contenedor junio 2026 |
| #3 | **#2** | Contenedor llegada 2026-10-26 |
| #4 | **#3** | En tránsito (reporte 2026-10-28) |
| #5 | **#4** | Contenedor 2026TF0298 · Lista 3 |
| #6 | **#5** | Lista 4 · llegada 2027-01-05 |

- `docs/SESION-2026-11-04.md` y los commits anteriores usan los números **viejos** (#3 a #6).
- Los scripts ya aplicados tienen ids fijos de antes (`cargar-contenedor-2026TF0298.ts` usa 4,
  `cargar-lista4-2027-01-05.ts` usa 5, `costos-contenedor-2026TF0298.ts` usa `ORDER_ID = 4`,
  `cargar-transito-2026-10-28.ts` usa 3): **no volver a correrlos sin ajustar el número** (el de
  costos fallaría por su guarda al no ser la orden del contenedor 2026TF0298).
- Documentos ya impresos o enviados (p. ej. la hoja de recepción para almacén) pueden mostrar el número viejo.
