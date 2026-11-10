# Cuenta de administradora

Rol intermedio entre el administrador principal (`ADMIN`) y la vendedora (`VENDEDOR`).
En la base es `User.role = "ADMINISTRADORA"` (el campo es texto, no hizo falta migración).

## Qué ve y qué no

| Sección | Administrador | Administradora | Vendedora |
|---|---|---|---|
| Resumen, Inventario, Órdenes de venta, Clientes, Cuentas por cobrar, Vendedores, Promociones | Sí | Sí | No (solo Catálogo y sus órdenes) |
| Alertas de stock bajo (campana) | Sí | Sí | No |
| **Órdenes de compra** (y gastos/pagos de compras) | Sí | **No** | No |
| **Salud del negocio** | Sí | **No** | No |
| **Balance** (ganancias) | Sí | **No** | No |

## Cómo está protegido

- `proxy.ts`: si entra a `/admin/compras`, `/admin/salud` o `/admin/ganancias`, la manda a `/admin`.
- `AdminNav.tsx`: esas pestañas no aparecen.
- `lib/access.ts`: `requireAdmin()` deja pasar a administrador y administradora; `requireOwner()` solo al
  administrador. Las acciones de compras y gastos y la página de Balance usan `requireOwner()`.

## Crear la cuenta

```
npx tsx prisma/create-user.ts <usuario> <clave> <nombre> --rol=administradora
```

Contra producción se corre con el túnel SSH (ver `docs/SESION-2026-11-04.md`). Volver a correr el comando con el
mismo usuario cambia la clave.
