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

## Crear o cambiar la cuenta desde el panel

En **Vendedores** (solo el administrador principal) hay una sección "Acceso de administradora": ahí se crea la
cuenta y se cambia el usuario o la clave (clave vacía = no cambiarla). No hace falta terminal ni túnel.
La acción es `saveAdministradoraAccess` (`requireOwner()`), valida que el usuario no esté repetido y guarda la
clave con bcrypt.

## Panel "Accesos al panel" (Vendedores)

Tarjeta única, solo para el administrador principal, con dos grupos: administradoras y vendedoras. Cada cuenta
muestra iniciales, nombre, usuario, insignia de rol y de estado (*Acceso activo*, *Sin acceso*, *Cancelada*) y sus
acciones. El formulario se abre en una ventana con etiquetas, botón Mostrar/Ocultar clave y "déjala vacía para
no cambiarla". La lista de vendedores de abajo usa el mismo estilo (componentes `AccessPanel.tsx`, `SellerRow.tsx`).

## Cancelar y reactivar

Igual que las vendedoras: la cuenta no se borra. `User.cancelledAt` (migración
`20261110120000_add_user_cancelled_at`, aplicada en producción el 2026-11-10) marca la cancelación.
Una administradora cancelada no puede iniciar sesión (`auth.ts`) y, si ya tenía sesión abierta, sus acciones se
bloquean (`getAccessUser` devuelve null). Se reactiva con el botón **Reactivar**. Acción: `setAdministradoraActive`.

## Cuenta creada

El 2026-11-10 se creó en producción el usuario `administradora` (rol ADMINISTRADORA) con una clave inicial que
quedó escrita en el chat: **cambiarla** desde Vendedores → Accesos al panel.
