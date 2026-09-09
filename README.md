# Catálogo Gráficas Caracas

Catálogo de precios de Gráficas Caracas, C.A. — Next.js + Prisma + MySQL.

Los productos y categorías viven en una base de datos MySQL (no están hardcodeados en el
HTML como en la versión original). El archivo original de una sola página quedó guardado
como referencia en `reference/legacy-index.html`.

## 1. Crear la base de datos en Plesk

En Plesk: **Bases de datos → Añadir base de datos**. Anotá:

- Host (normalmente `localhost` si la app corre en el mismo servidor)
- Puerto (por defecto `3306`)
- Nombre de la base de datos
- Usuario y contraseña

## 2. Configurar la conexión

Editá `.env` en la raíz del proyecto y reemplazá el valor de ejemplo:

```env
DATABASE_URL="mysql://USUARIO:CONTRASEÑA@HOST:3306/NOMBRE_BASE_DE_DATOS"
```

## 3. Instalar dependencias, crear las tablas y cargar los productos

```bash
npm install
npx prisma migrate dev --name init   # crea las tablas (categories, products)
npx prisma db seed                    # carga las 14 categorías y 51 productos del catálogo original
```

`prisma/seed.ts` es idempotente (usa `upsert`) — podés volver a correr `npx prisma db seed`
sin duplicar datos si cambian los archivos en `prisma/seed-data/catalog.json`.

## 4. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## 5. Build de producción

```bash
npm run build
npm start
```

## Estructura relevante

- `prisma/schema.prisma` — modelos `Category` y `Product`.
- `prisma/seed.ts` + `prisma/seed-data/catalog.json` — datos migrados del catálogo original.
- `lib/prisma.ts` — cliente Prisma (usa el driver adapter de MariaDB, requerido en Prisma 7).
- `lib/catalog.ts` — consulta las categorías y productos desde la base de datos.
- `app/page.tsx` — página principal (Server Component, trae los datos de la DB).
- `components/CatalogBrowser.tsx` — buscador y filtro por categoría (Client Component).
- `public/images/categories/` — fotos de categorías extraídas del HTML original.

## Editar productos y precios

Por ahora no hay panel de administración — para agregar, editar o borrar productos hacelo
directamente en la base de datos (por ejemplo con `npx prisma studio`, que abre una interfaz
visual en el navegador) o pedime que actualice `prisma/seed-data/catalog.json` y vuelva a
correr el seed.
