# MySQL remoto (91.213.46.180) inalcanzable con VPN activa

> Fecha: 2026-09-09
> Servidor: VPS con Plesk, `91.213.46.180` (hostname `vps-926571-mix.servidor.hosting`,
> CloudStack KVM). Mismo servidor que usa `Dashboard_angu` — ver también
> `D:\Programacion\Angu\Dashboard_angu\docs\MYSQL-REMOTO-VPN.md`.
> Base de datos de este proyecto: `catalogo_graficas_db`, usuario `admin_catalogo_graficas`.

## Síntoma

Con una VPN activa en la máquina local, cualquier intento de conectar a MySQL
en `91.213.46.180:3306` desde esta PC fallaba:

- `npx prisma db execute` / `prisma migrate dev` → `Error: P1001 Can't reach
  database server at 91.213.46.180:3306`.
- Una conexión TCP cruda a veces sí completaba el *handshake* pero se cortaba
  con `ECONNRESET` apenas se intentaba leer — nunca llegaba a completarse el
  protocolo de MySQL.

**Apagar la VPN resolvió el problema al instante** — sin tocar nada en el
VPS, en Plesk, ni en el firewall.

## Diagnóstico (todo esto salió limpio — no era el servidor)

Antes de sospechar de la VPN, se revisó todo el lado del servidor por SSH
(`ssh root@91.213.46.180`) y no apareció nada que explicara el bloqueo:

- MariaDB escuchando en `0.0.0.0:3306` (no solo `127.0.0.1`). ✓
- Usuario de base de datos con `Host = %` (permite cualquier origen). ✓
- `iptables -L` / `nft list ruleset`: sin reglas que bloqueen el puerto 3306
  ni la IP de origen. ✓
- `fail2ban-client status` (jails `dovecot`, `plesk-one-week-ban`,
  `plesk-permanent-ban`, `postfix-sasl`): la IP de origen no estaba baneada
  en ninguno. (Dato aparte: `plesk-permanent-ban` y `plesk-one-week-ban` usan
  `iptables-allports`, o sea que si algún día banean una IP ahí, le cortan
  **todos** los puertos, no solo el que disparó el baneo — tenerlo en cuenta
  si en el futuro algo deja de conectar sin razón aparente.)
- `ipset list`, `psad`, `crowdsec`: nada instalado/activo que pudiera estar
  bloqueando por fuera de las reglas normales.
- Conexión local en el propio VPS (`127.0.0.1:3306`) funcionaba perfecto.
- `tcpdump -i any port 3306` en el VPS mientras se intentaba conectar desde
  la PC local: **no llegaba ni un paquete** — la conexión se cortaba antes de
  tocar la tarjeta de red del servidor. Esto apuntaba a algo en el camino de
  red, no en el servidor.

## Causa real

La IP de salida de la VPN (`89.187.171.226`) resultó pertenecer a
**AS60068 "Datacamp Limited" / CDN77** — un rango de datacenter muy asociado
a VPNs y proxies. Este tipo de rangos son usados masivamente por bots para
escanear puertos como el 3306 (el propio servidor tenía **8211 intentos de
conexión abortados** históricos en `Aborted_connects`), así que es esperable
que el proveedor del VPS tenga alguna protección automática a nivel de red
(por delante del servidor, invisible desde adentro por SSH) que bloquea o
resetea conexiones nuevas hacia el 3306 desde ese tipo de IPs.

Con la IP residencial normal (VPN apagada), la conexión no tiene ese
problema de reputación y pasa sin inconvenientes.

Esto también explica por qué el proyecto ya desplegado en Vercel
(`Dashboard_angu`) siempre conectó sin que nadie tocara ningún firewall ni
security group: las funciones de Vercel salen por IPs limpias de su propia
nube, no por rangos de datacenter/VPN.

## Qué hacer si vuelve a pasar

1. **Primero revisar si hay una VPN activa** (en esta PC o en cualquier
   máquina desde la que se esté probando) y apagarla. Es la causa más
   probable con este servidor en particular.
2. Si sigue sin conectar con la VPN apagada, ahí sí investigar del lado del
   servidor (Plesk → usuario de la base de datos → Access Control; y con
   acceso SSH, repetir las verificaciones de la sección de diagnóstico de
   arriba).
3. Alternativa si hace falta trabajar igual con la VPN puesta: conectarse
   por SSH al VPS y correr los comandos ahí directamente (contra
   `127.0.0.1:3306`), en vez de depender del acceso externo por 3306.
