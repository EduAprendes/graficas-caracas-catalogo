# Envío de la orden de venta por correo

Fecha: 2026-09-30

Al crear una orden de venta se le manda una copia al correo registrado del
cliente. También hay un botón **Enviar copia por correo** en el detalle de la
orden para reenviarla.

## Configuración (variables de entorno)

El envío usa SMTP, así que sirve cualquier proveedor (el correo del dominio en
Plesk, Gmail con clave de aplicación, etc.). Agregar en `.env.local` (y en las
variables del proyecto en Vercel para producción):

```
SMTP_HOST=mail.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false        # "true" si usás el puerto 465
SMTP_USER=ventas@tudominio.com
SMTP_PASS=la-clave
MAIL_FROM="Gráficas Caracas <ventas@tudominio.com>"
MAIL_REPLY_TO=           # opcional
MAIL_ADMIN_COPY=         # opcional: correo(s) del administrador, separados por coma
```

Reiniciar `next dev` después de cambiar el `.env.local`.

## Qué se envía

- Número y fecha de la orden, forma de pago, tipo de entrega y dirección.
- Líneas con cantidad, descripción, precio unitario, descuento (si hay) y subtotal.
- Total; si es a crédito, también pagado y saldo por pagar.
- **No** incluye el vendedor ni la comisión (datos internos).

## Copia para el administrador

Si `MAIL_ADMIN_COPY` tiene uno o más correos, cada orden nueva (y cada reenvío) manda
además una **copia interna** a esas direcciones, con asunto `[Copia interna] Orden de
venta #N — cliente: ...`. Es un correo aparte del que recibe el cliente y sí incluye el
**vendedor y la comisión**. Se envía aunque el cliente no tenga correo registrado. Si esa
copia falla, no afecta la del cliente ni la orden.

## Comportamiento ante fallos

El correo nunca bloquea ni deshace la orden. Después de crearla, el detalle
muestra un aviso con el resultado:

| Resultado | Significa |
|---|---|
| Copia enviada | Salió al correo del cliente |
| Sin correo | El cliente no tiene correo registrado (se puede agregar en Clientes y reenviar) |
| No configurado | Faltan las variables SMTP en el servidor |
| Falló | El servidor SMTP rechazó o no respondió; ver el log del servidor y reenviar |

## Recordatorio de cobranza automático

Cada día a las 13:00 UTC (9:00 a. m. en Venezuela) Vercel Cron llama a
`/api/cron/cobranza` (definido en `vercel.json`). La ruta manda un correo de cobranza
al cliente por cada orden **a crédito, confirmada, con saldo pendiente**, que ya
cumplió `COBRANZA_DIAS` días desde su creación (15 por defecto).

- Un cliente con varias órdenes vencidas recibe **un solo correo** que las lista.
- Cada orden se marca (`collectionEmailSentAt`) al enviarse: el aviso es **único**, no se repite.
- Si el cliente no tiene correo registrado, se salta esa vez y se reintenta al día siguiente.
- Si la orden ya se saldó o se anuló antes del plazo, no se envía.
- En el detalle de la orden a crédito se ve si el recordatorio ya salió.

Variables: `COBRANZA_DIAS` (opcional, número de días) y `CRON_SECRET` (obligatoria;
la ruta responde 401 sin ella). `CRON_SECRET` debe estar en Vercel (Production).
Para probar a mano: `curl -H "Authorization: Bearer $CRON_SECRET" https://catalogo.graficascaracas.com/api/cron/cobranza`.

## Promociones (correo masivo)

Sección **Promociones** del admin: se escribe asunto, mensaje y, opcionalmente, una línea
destacada (ej. "15% OFF"), se elige la audiencia y se envía. Antes de enviar hay un botón
para mandar una **prueba** a cualquier correo.

- Audiencias: todos los clientes con correo, o solo los que ya han comprado.
- Solo reciben clientes activos (no cancelados), con correo y que no se hayan dado de baja.
- `{nombre}` en el asunto o el mensaje se reemplaza por el nombre de cada cliente.
- Cada correo lleva un enlace de baja (`/baja`, público, firmado con `AUTH_SECRET`) y el
  encabezado `List-Unsubscribe`. Quien se da de baja queda con `marketingOptOut` y no recibe
  más promociones; los correos de órdenes y cobranza no se ven afectados.
- Máximo 300 clientes por envío y un tope diario (`PROMO_MAX_DIARIO`, 300 por defecto) sumando todos los envíos del día. El servidor de correo no impone límite propio (revisado por SSH), así que la holgura se controla desde la app.
- Cada envío queda registrado (fecha, asunto, audiencia, enviados y fallidos).
- Variable opcional `SITE_URL` para el enlace de baja (por defecto `https://catalogo.graficascaracas.com`).

Ojo con los límites del servidor de correo: Plesk puede limitar los mensajes por hora
(Herramientas y configuración → Control del correo saliente). Si el límite es bajo, los
envíos grandes fallarán a partir de cierto punto.
