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
```

Reiniciar `next dev` después de cambiar el `.env.local`.

## Qué se envía

- Número y fecha de la orden, forma de pago, tipo de entrega y dirección.
- Líneas con cantidad, descripción, precio unitario, descuento (si hay) y subtotal.
- Total; si es a crédito, también pagado y saldo por pagar.
- **No** incluye el vendedor ni la comisión (datos internos).

## Comportamiento ante fallos

El correo nunca bloquea ni deshace la orden. Después de crearla, el detalle
muestra un aviso con el resultado:

| Resultado | Significa |
|---|---|
| Copia enviada | Salió al correo del cliente |
| Sin correo | El cliente no tiene correo registrado (se puede agregar en Clientes y reenviar) |
| No configurado | Faltan las variables SMTP en el servidor |
| Falló | El servidor SMTP rechazó o no respondió; ver el log del servidor y reenviar |
