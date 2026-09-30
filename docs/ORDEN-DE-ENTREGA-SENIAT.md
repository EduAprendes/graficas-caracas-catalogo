# Orden de entrega para el transportista — qué es y qué hay que cerciorar

Fecha: 2026-09-30

> **Aviso.** Esto es información de consulta reunida en fuentes públicas, **no asesoría
> legal ni tributaria**. La normativa del SENIAT cambia con frecuencia. Antes de usar el
> documento en carretera, debe confirmarlo el contador o el asesor tributario de la empresa.

## Qué hace el sistema y qué NO hace

**Hace:** para las órdenes de venta con entrega **Despachado**, imprime una **orden de
entrega interna** (`Órdenes de venta → detalle → Ver / imprimir orden de entrega`) con los
datos que la norma pide, tomados de la orden: emisor, receptor, bienes, traslado, chofer y
placa, firmas y un **recuadro para el número de control y los datos de la imprenta**.

**NO hace:** el sistema **no es un software homologado por el SENIAT** ni una imprenta digital
autorizada. Por eso el documento que imprime **no tiene validez fiscal por sí solo**. Sale
impreso con la advertencia "documento interno sin número de control" hasta que se registre un
número de control asignado por una imprenta digital autorizada.

## Marco normativo (según las fuentes consultadas)

| Norma | Qué regula |
|---|---|
| Ley de IVA, art. 55 | Si la factura no se emite al momento de la entrega, se debe entregar una **orden de entrega o guía de despacho** |
| Providencia SNAT/2011/0071, art. 21 | Contenido de la orden de entrega / guía de despacho |
| Providencia SNAT/2024/000102 (Gaceta 43.032, 19/12/2024) | **Cómo** se emiten digitalmente facturas y otros documentos (incluye órdenes de entrega y guías de despacho), mediante **imprentas digitales autorizadas**. Exigible desde el 01/03/2025 |
| Providencia sobre sistemas homologados (citada como "121") | **Qué software** puede emitir esos documentos: debe estar **homologado** |

## Contenido que debe llevar (art. 21, SNAT/2011/0071)

- La denominación **"Orden de Entrega"** (o "Guía de Despacho").
- La expresión **"sin derecho a crédito fiscal"**.
- Nombre o razón social, **RIF** y domicilio fiscal del **emisor** y del **receptor**.
- Numeración **consecutiva y única** y **número de control**.
- Fecha de emisión.
- Descripción de los bienes (cantidad, características y precio; en traslados sin venta el
  precio puede omitirse).
- **Motivo del traslado** y datos del transporte.
- Datos de la **imprenta autorizada** (nombre, RIF, providencia de autorización y fecha).
- Si el receptor no es contribuyente de IVA: indicar "contribuyente formal" o "no sujeto".
- La **factura posterior** debe hacer referencia a la orden de entrega y emitirse en el
  mismo período de imposición.

Qué de esto cubre el documento del sistema: todo lo anterior **excepto** la numeración
consecutiva oficial y el número de control (recuadro para llenar) y el caso de receptor no
contribuyente (no hay campo; se puede escribir a mano).

## Lo que hay que cerciorar (lista de verificación)

Antes de usar el documento, confirmar con el contador y con el SENIAT / la imprenta:

1. **Proveedor autorizado.** ¿Cuál es la imprenta digital autorizada y el sistema homologado
   que usa la empresa? Verificar que su autorización esté **vigente** en `seniat.gob.ve`.
2. **Quién emite el documento fiscal.** ¿La orden de entrega con validez se emite en el sistema
   de la imprenta (y este documento del sistema es solo respaldo), o se puede emitir de otra
   forma? Una consulta puntual: ¿es válido llevar en carretera un documento interno con el
   número de control anotado, o solo el original de la imprenta?
3. **Numeración.** La numeración consecutiva y única y el número de control los asigna la
   imprenta. Confirmar cómo se registran aquí (campo "N° de control" del detalle de la orden).
4. **Datos del emisor.** Configurar `COMPANY_NAME`, `COMPANY_RIF`, `COMPANY_ADDRESS` (y
   opcionalmente `COMPANY_PHONE`) **idénticos a los del RIF**. Sin ellos el documento sale
   con líneas en blanco.
5. **Datos del receptor.** El cliente debe tener **RIF o C.I.** cargado (campo nuevo en
   Clientes). Confirmar qué exige la norma cuando el receptor es persona natural sin RIF.
6. **Traslados sin venta.** El sistema solo hace la orden de entrega de **órdenes de venta**. Si
   se trasladan bienes sin venta (reparación, depósito, préstamo), el motivo y el tratamiento
   son distintos: consultar cómo documentarlos.
7. **Factura posterior.** Confirmar el plazo y cómo se referencia la orden de entrega en la
   factura, y que se emita dentro del mismo período de imposición.
8. **Montos e IVA.** El documento muestra montos **referenciales, sin IVA**. Confirmar si la
   norma o el contador prefieren que se muestren con IVA o sin precios.
9. **Otros permisos para movilizar mercancía.** Este documento no verifica si su rubro exige
   además otras guías o permisos de transporte (nacionales o municipales). Preguntar al contador.
10. **Cambios recientes.** El propio SENIAT ha modificado el esquema de imprentas y sistemas
    homologados. Verificar en `seniat.gob.ve` si hubo providencias posteriores a las citadas.
11. **Conservación.** Cuántas copias, quién las firma y por cuánto tiempo se conservan.
12. **Sanciones.** Consultar las sanciones por trasladar mercancía sin el documento válido.

## Cómo se usa en el día a día

1. Crear la orden de venta con entrega **Despachado** y la dirección de entrega.
2. En el detalle de la orden: cargar **chofer, cédula y placa**.
3. Obtener el documento con número de control en la imprenta digital autorizada y registrar
   el **N° de control** y los **datos de la imprenta** en el mismo formulario.
4. **Ver / imprimir orden de entrega** y entregar al transportista. Firmas: despachado por,
   transportista y recibido conforme (nombre, C.I., firma, sello, fecha y hora).

## Fuentes consultadas

- Gerencia y Tributos — Orden de entrega o guía de despacho emitida antes de la factura (2025)
- Gerencia y Tributos — Órdenes de entrega y guías de despacho reguladas por el SENIAT (2023)
- Legis — Providencia SNAT/2024/000102 sobre medios digitales
- Nompli, Alegra, LEĜA Abogados, Lixie, Gálac — resúmenes de las providencias 102 y 121
