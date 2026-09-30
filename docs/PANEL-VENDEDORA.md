# Panel de vendedora

Fecha: 2026-09-30

Una vendedora entra al mismo login que el administrador, pero con un usuario de rol
`VENDEDOR` ligado a su registro en **Vendedores**.

## Qué puede y qué no

| | Vendedora | Administrador |
|---|---|---|
| Catálogo (solo lectura, con buscador, precio y stock) | Sí | Usa Inventario (editable) |
| Crear órdenes de venta | Sí | Sí |
| Ver órdenes de venta | Solo las **suyas** | Todas |
| Crear un cliente nuevo desde la orden | Sí | Sí |
| Órdenes de compra, clientes, cuentas por cobrar, vendedores, promociones, inventario | **No** | Sí |
| Abonos, anular órdenes, reenviar correos | **No** | Sí |

Si una vendedora intenta abrir una página que no le corresponde, se la devuelve a
Órdenes de venta. Además, cada acción del servidor valida el rol, así que no basta con
conocer la dirección.

## Comisión automática

Al crear una orden, la vendedora **no elige vendedor**: el formulario muestra
"Vendedora: Carla González — comisión 5%" y la orden queda ligada a ella con el % que
tenga configurado en ese momento (queda congelado en la orden). El administrador lo ve en el
listado (columna Vendedor con su %) y en el detalle de la orden (con el monto de comisión).

## Cómo crear el acceso

1. **Vendedores** → crear la vendedora con su comisión (si no existe).
2. En su fila, columna **Acceso al panel** → **Crear acceso**: usuario (ej. `carla`) y clave
   de al menos 8 caracteres. El administrador entrega esos datos a la vendedora.
3. Para cambiar la clave: **Cambiar clave** en la misma celda (el usuario no se renombra).

Si se **cancela** a la vendedora, deja de poder entrar y de operar de inmediato, aunque tenga
la sesión abierta. Al reactivarla recupera el acceso con la misma clave.
