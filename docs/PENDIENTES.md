# Pendientes y estado del proyecto

Fecha: 2026-09-30 (último despliegue: commit `255292a`, todas las migraciones aplicadas)

## Urgente (antes del 2026-10-01 09:00 hora de Venezuela)

- [ ] **Decidir qué pasa con las órdenes a crédito viejas** antes de la primera corrida del
      cron de cobranza (`/api/cron/cobranza`, todos los días 13:00 UTC = 9:00 a. m. VET).
      Las órdenes a crédito confirmadas, con saldo y de más de 15 días (ej. la #7 y la #9)
      recibirán el recordatorio en esa primera corrida. Si no se quiere, hay que marcarlas
      como ya avisadas (`collectionEmailSentAt`) antes.

## Configuración pendiente

- [ ] **Datos del emisor** para la orden de entrega, en `.env` y en Vercel (Production):
      `COMPANY_NAME`, `COMPANY_RIF`, `COMPANY_ADDRESS` (`COMPANY_PHONE` opcional). Idénticos
      al RIF. Después, redeploy (las variables solo se leen en un despliegue nuevo).
- [ ] **`MAIL_ADMIN_COPY`** (correo del administrador para la copia interna de cada orden,
      con vendedor y comisión): está vacía en `.env` y no existe en Vercel.
- [ ] **RIF / C.I. de los clientes** a los que se les despacha mercancía (Clientes → Editar).
- [ ] Opcional: `PROMO_MAX_DIARIO` en Vercel (por defecto 300 correos de promoción por día).

## Pruebas por hacer (nada de esto se ha probado con datos reales)

- [ ] **Correo de la orden**: crear una orden con un cliente con tu correo; revisar bandeja y
      spam. En Gmail → "Mostrar original": debe decir `SPF: PASS` y `DKIM: PASS`.
- [ ] **Panel de vendedora**: en Vendedores → "Crear acceso" a una vendedora de prueba; entrar
      en ventana privada; comprobar que solo ve Catálogo y sus Órdenes de venta y que la
      orden queda con su % de comisión.
- [ ] **Orden de entrega**: orden Despachado → cargar chofer/placa → "Ver / imprimir".
- [ ] **Promociones**: mandar primero una prueba a tu correo; empezar con listas de 30–50
      clientes la primera semana (IP de correo compartida con otros dominios).
- [ ] **Cobranza**: después de la primera corrida, revisar el resultado en el detalle de las
      órdenes ("Recordatorio de cobranza enviado el …").

## Legal / SENIAT (ver `docs/ORDEN-DE-ENTREGA-SENIAT.md`)

- [ ] La orden de entrega del sistema **no tiene validez fiscal** sin número de control de una
      imprenta digital autorizada. Confirmar con el contador la lista de 12 puntos.
- [ ] Definir el proveedor (imprenta digital / sistema homologado). Si tiene API, evaluar
      integrarlo para emitir la orden de entrega desde allá.
- [ ] Verificar en `seniat.gob.ve` si hubo cambios recientes en imprentas y sistemas homologados.

## Datos a corregir / decidir

- [ ] **Orden #7**: se pagó 30.00 de más (abonos 50 + 100 sobre 120). Está como saldo a favor
      del cliente. Decidir: dejarlo como saldo a favor o corregir el abono en la base. No hay
      forma de editar o anular un abono desde la app.
- [ ] Órdenes de venta sin cliente asociado (si existieran) no entran en "Cuentas por cobrar".

## Ideas / mejoras posibles (no pedidas todavía)

- Que la vendedora vea su propia comisión acumulada; o que solo vea sus propios clientes.
- Control de **pago de comisiones** (saldo pendiente por vendedor).
- Editar o anular abonos; marca "no recibe promociones" visible en Clientes.
- Buscador con filtro en el select de productos de la orden de **compra** (hoy solo en ventas).
- Copia del recordatorio de cobranza al administrador; datos de pago (Binance, cuenta) en el
  correo de cobranza.
- Promociones por WhatsApp (hoy solo correo).
- DMARC está en `p=quarantine`: si algún correo cae en spam durante las pruebas, bajar
  temporalmente a `p=none` en el DNS.

## Infraestructura (referencia, sin secretos)

- **Vercel**: cuenta/equipo `eduaprendes-projects`, proyecto `graficas-caracas-catalogo`
  (`prj_Z78EbwDrluboJMhaijn4mOxCwS7b`). Cada push a `master` **despliega solo** a producción
  (`catalogo.graficascaracas.com`). El cron vive en `vercel.json`.
- **DNS**: `graficascaracas.com` usa `ns1/ns2.vercel-dns.com`, en la cuenta de Vercel del
  dominio principal (otra distinta a la del catálogo). Registros de correo ya creados: A `mail`,
  MX, SPF, DKIM (`default._domainkey`) y DMARC.
- **Servidor**: Plesk en `vps-926571-mix.servidor.hosting` (`91.213.46.180`). SMTP en 587 usando
  el nombre del servidor como host (su certificado Let's Encrypt cubre ese nombre). Cuenta de
  correo `ventas@graficascaracas.com`. El servidor **no tiene límite de correos salientes**; el
  freno está en la app (300 por envío y por día). Cola de correo con mensajes viejos de otro
  dominio (`parkingplus.es`): se limpia sola a los 5 días.
- **Base de datos**: MySQL en el mismo servidor; se llega con VPN. Las migraciones las aplica el
  usuario con `npx prisma migrate deploy`; se puede comprobar el estado por SSH con
  `plesk db -Ne "SELECT migration_name FROM catalogo_graficas_db._prisma_migrations ORDER BY finished_at DESC LIMIT 3"`.
- **Flujo de trabajo**: (1) aplicar migraciones, (2) commit y push (despliega solo). Nunca
  hacer push con una migración pendiente: el código nuevo rompería producción. Ver
  `docs/PRISMA-SHADOW-DB-P3014.md` si `migrate dev` falla.
- Si `next dev` da 404 en `/login` o `/admin` tras muchos cambios: detenerlo, borrar `.next` y
  reiniciar.

## Documentos relacionados

- `docs/SESION-2026-11-04.md` — órdenes de compra (costos, pagos, numeración), Balance y lo
  pendiente para la siguiente sesión (**leer primero**).
- `docs/CORREO-ORDENES.md` — correo de órdenes, copia al administrador, cobranza y promociones.
- `docs/PANEL-VENDEDORA.md` — roles, permisos y cómo crear el acceso.
- `docs/ORDEN-DE-ENTREGA-SENIAT.md` — orden de entrega y lista de verificación legal.
- `docs/MYSQL-REMOTO-VPN.md`, `docs/PRISMA-SHADOW-DB-P3014.md` — base de datos.
