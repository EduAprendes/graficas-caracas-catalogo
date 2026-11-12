# Reinicio de ventas (2026-11-11)

Se empezó de cero con las ventas, a pedido del administrador, antes de usar el sistema de verdad.

## Qué se borró (producción, permanente)

- 17 órdenes de venta (16 confirmadas y 1 anulada), con sus 18 líneas y 17 abonos o pagos.
- 20 movimientos de stock ligados a esas ventas (VENTA y ANULACION_VENTA).
- Se devolvió al inventario el neto que esas ventas habían descontado (1 a 2 unidades en 14 productos).
- La numeración de órdenes de venta volvió a empezar: la próxima es la **#1**.

## Qué se conservó

Órdenes de compra (6), vendedores, clientes (4), productos, movimientos de compra (113) y pagos de comisiones.

## Respaldo

Copia completa de la base justo antes de borrar: `backups/ventas-antes-de-borrar-2026-11-11.sql` (en el equipo de
desarrollo, fuera de Git: `backups/` está en `.gitignore` porque incluye las claves cifradas de los usuarios).
Para recuperar algo hay que importar las tablas necesarias de ese archivo.

## Consecuencias

- Resumen y Salud muestran ceros en ventas, cobros y el gráfico de ventas diarias hasta que haya ventas nuevas.
- El stock sigue siendo provisional hasta el inventario real (ver `docs/ALERTAS-STOCK-BAJO.md`).
- Se hizo con SQL directo (`plesk db`) en una transacción, no con la app.
