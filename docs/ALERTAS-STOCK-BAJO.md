# Alertas de stock bajo

Fecha: 2026-11-07 (commit `4166167`, en producción). Solo las ve el rol **ADMIN**.

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

## Correo diario

- Cron `/api/cron/stock-bajo`, definido en `vercel.json`: todos los días **12:00 UTC (8:00 a. m.
  VET)**. Exige `Authorization: Bearer $CRON_SECRET`; sin él responde 401.
- Va a `MAIL_ADMIN_COPY` (varios correos separados por coma), la misma variable de la copia
  interna de las órdenes. Hoy: `eurorondon03@gmail.com`, en `.env` y en Vercel (Production).
- Solo se envía si hay alertas. La tabla muestra hasta 60 productos y dice cuántos más hay.
- Respuesta del cron (JSON): `{"alerts":N,"sent":true}`, o `sent:false` con `reason`:
  `no_alerts`, `mail_not_configured`, `no_recipient`, `send_failed`.

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
- [ ] Confirmar que el correo automático llega a las 8:00 a. m. (primer envío programado).
- [ ] Efecto lateral: `MAIL_ADMIN_COPY` también recibe ahora la copia interna de cada orden.
