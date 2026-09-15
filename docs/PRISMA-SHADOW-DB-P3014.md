# `prisma migrate dev` falla con P3014 (no se puede crear la shadow database)

> Fecha: 2026-09-15
> Servidor: mismo VPS de `docs/MYSQL-REMOTO-VPN.md` (`91.213.46.180`, MariaDB vía
> Plesk). Base de datos `catalogo_graficas_db`, usuario `admin_catalogo_graficas`.

## Síntoma

Al correr `npx prisma migrate dev --name <algo> --config prisma7.config.ts`
(con la base ya alcanzable, sin el problema de VPN), falla con:

```
Error: P3014

Prisma Migrate could not create the shadow database. Please make sure the
database user has permission to create databases. Read more about the
shadow database (and workarounds) at https://pris.ly/d/migrate-shadow

Original error: Error code: P1010
User was denied access on the database
`prisma_migrate_shadow_db_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
```

## Causa

`prisma migrate dev` **siempre** necesita crear una base de datos temporal
("shadow database") para calcular el diff entre el historial de migraciones
y el schema nuevo — incluso usando `--create-only`. Para crearla, el usuario
de la base de datos necesita permiso `CREATE DATABASE`.

El usuario `admin_catalogo_graficas` en este VPS (hosting Plesk) **no tiene**
ese permiso — solo tiene acceso a `catalogo_graficas_db`. Esto no es un bug
del proyecto ni de la conexión: es una restricción normal en hosting
compartido, donde a la cuenta de base de datos de la app no se le da permiso
para crear bases nuevas.

**Conclusión importante:** con este usuario/hosting, `prisma migrate dev`
**no va a funcionar nunca**, tenga o no VPN activa. No hay que reintentarlo
esperando que sea un problema pasajero — hay que usar el flujo de abajo
directamente, o resolver el permiso una sola vez (ver "Solución
permanente").

## Solución usada (sin tocar permisos, migración por migración)

En vez de `migrate dev`, generar el SQL de la migración comparando el schema
contra la base real (`--from-config-datasource`), sin pasar por ninguna
shadow database, y aplicarlo con `migrate deploy` (que tampoco necesita
shadow database):

```powershell
# 1. Crear la carpeta de la migración (mismo formato de timestamp que usa Prisma)
New-Item -ItemType Directory -Force -Path "prisma\migrations\<timestamp>_<nombre>"

# 2. Generar el SQL comparando la base real -> schema.prisma (no usa shadow db)
npx prisma migrate diff `
  --from-config-datasource `
  --to-schema prisma/schema.prisma `
  --script `
  --config prisma7.config.ts `
  -o "prisma/migrations/<timestamp>_<nombre>/migration.sql"

# 3. Aplicar la migración y registrarla en _prisma_migrations (no usa shadow db)
npx prisma migrate deploy --config prisma7.config.ts

# 4. Regenerar el cliente de Prisma con los modelos nuevos
npx prisma generate --config prisma7.config.ts
```

Notas:

- `<timestamp>` sigue el formato `YYYYMMDDHHMMSS` (ver las carpetas ya
  existentes en `prisma/migrations/` para el patrón). Tiene que ser mayor que
  el de la última migración para que el orden quede correcto.
- El paso 4 (`prisma generate`) no toca la base de datos — se puede correr
  aunque la base no sea alcanzable desde esa máquina (por ejemplo, desde el
  entorno donde corre el agente, que no siempre puede llegar al VPS; ver
  `docs/MYSQL-REMOTO-VPN.md`).
- Revisar siempre el `migration.sql` generado antes de aplicarlo — es una
  comparación automática, no un review humano.

## Diferencia con "usar `migrate deploy` en vez de `migrate dev`" a secas

`migrate deploy` **solo aplica migraciones que ya existen** como carpetas en
`prisma/migrations/`; no genera SQL nuevo a partir del schema. Por eso el
flujo completo es primero generar el `migration.sql` con `migrate diff`
(paso 2) y recién ahí `migrate deploy` (paso 3) — `migrate deploy` solo no
alcanza si todavía no existe la carpeta de la migración.

## Solución permanente (pendiente, opcional)

Si se vuelve tedioso repetir este flujo cada vez que cambia el schema, la
alternativa es resolverlo una sola vez en Plesk:

1. Crear una base de datos vacía adicional en el mismo servidor (por ejemplo
   `catalogo_graficas_shadow`), con el mismo usuario `admin_catalogo_graficas`
   con permisos sobre ella.
2. Agregar `SHADOW_DATABASE_URL` en `.env` apuntando a esa base, y
   `shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL` en el `datasource` de
   `prisma7.config.ts`.
3. A partir de ahí `prisma migrate dev` vuelve a funcionar normal (usa esa
   base como shadow database en lugar de intentar crear una al vuelo).

No se hizo en este momento porque el workaround de arriba ya resuelve el caso
puntual sin pedir cambios en Plesk.
