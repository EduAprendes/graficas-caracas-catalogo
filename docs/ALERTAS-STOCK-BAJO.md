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
