# rev160 — Facturación electrónica con FiscalAPI (CFDI 4.0)

## Qué incluye
- **SDK oficial de FiscalAPI** (Python, v4.0.475) incluido en `./fiscalapi`, licencia MPL-2.0 en
  `fiscalapi/LICENSE.txt`.
- **Nuevo requisito:** `pydantic>=2.5,<3` (agregado a `requirements.txt`).
- **Menú nuevo Finanzas ▸ "Facturación electrónica"**, con tres pestañas:
  - **CFDI emitidos:** ingresos, complementos de pago y notas de crédito, con sus acciones (PDF,
    XML, REP, nota de crédito, estatus SAT, cancelar).
  - **Clientes fiscales:** datos fiscales de cada cliente tal como aparece en las CPO.
    - Nacionales: RFC, razón social, régimen, CP fiscal, uso de CFDI y correo.
    - **Extranjeros:** RFC genérico XEXX010101000, país (c_Pais), Tax ID y domicilio para
      Comercio Exterior.
  - **Configuración:**
    - estado de la conexión, con **"Probar conexión"**;
    - series (F / NC / CP), CP del lugar de expedición, IVA, clave de producto/servicio y unidad
      por defecto, colores del PDF;
    - **domicilio del emisor con claves del SAT** y valores por defecto de Comercio Exterior
      (pedimento A1, Incoterm, certificado de origen).
- **Órdenes de cobro ▸ Facturar ▸ "🧾 Timbrar CFDI"** (tercera opción, junto a registrar o
  vincular una factura):
  - se prellena con los datos de la orden: concepto, importe, IVA, condiciones y cliente
    fiscal;
  - se editan moneda, tipo de cambio, PUE/PPD, forma de pago, uso de CFDI, exportación 01/02 y
    conceptos;
  - con **exportación 02**: complemento de **Comercio Exterior**, donde cada concepto marcado como
    **mercancía** lleva No. de identificación, fracción arancelaria y cantidad/unidad aduana;
  - se compara el total contra la orden;
  - al timbrar:
    - se guardan el **XML y el PDF** (con colores de Persico) en `FINANZAS/cfdi/<UUID>/`;
    - **se da de alta en Cuentas por Cobrar** con el XML timbrado;
    - **la orden queda Facturada**.
- **Complemento de pago (REP)** para facturas PPD:
  - parcialidad automática, saldo anterior e insoluto tomados de CPC;
  - moneda y tipo de cambio del pago;
  - **registra el pago en CPC** con su UUID.
- **Nota de crédito (E),** relacionada (01) con la factura: **descuenta el saldo** en CPC.
- **Cancelación:**
  - motivos 01–04 (el 01 exige el UUID que sustituye);
  - guarda el acuse;
  - pone la CPC en Cancelada.
  - **"Estatus SAT"** consulta vigencia y cancelabilidad.

## Seguridad
- **Las llaves de FiscalAPI y el CSD van solo en variables del servidor (Railway).** Nunca se
  guardan en la base de datos ni se muestran en pantalla.
- **Permisos:**
  - timbrar desde la orden: permiso de Órdenes de cobro o de CPC;
  - REP y nota de crédito: CPC (Crear);
  - cancelar: CPC (Control total);
  - "Probar conexión", configuración: solo Administrador.
- **Idempotencia:** cada petición de timbrado lleva su llave para que un doble clic o un reintento
  no timbre dos veces.
- **El módulo muestra en todo momento** si se está en **PRUEBAS** o en **PRODUCCIÓN**.

## Probado (contra un simulador del API con el mismo formato del SDK)
- **"Probar conexión"** → OK.
- **Validaciones de clientes fiscales:** RFC inválido → rechazado.
- **Ingreso nacional PPD desde la orden OC-T1** ($30,000 + IVA = $34,800):
  - UUID, XML y PDF guardados;
  - **CPC-0000000001** creada con el UUID;
  - la orden quedó **Facturada**.
- **REP parcial de $20,000** → parcialidad 1.
- **Nota de crédito de $1,000 + IVA** → saldo en CPC $13,640.
- **Exportación con Comercio Exterior:** 2 carritos (mercancía, fracción 8716800100) + servicio de
  instalación, receptor XEXX010101000/USA.
  - El complemento se envió con el domicilio del emisor, Incoterm FCA, pedimento A1 y mercancías
    con valor en dólares.
- **Cancelación:** motivo 01 sin sustituto → rechazado; motivo 02 → Cancelada.
- **Estatus SAT** → Vigente / cancelable sin aceptación.

## Pendiente de validar en el ambiente de pruebas de FiscalAPI
- **Las pruebas usaron un simulador local** (desde aquí no hay acceso a FiscalAPI).
- **Antes de pasar a producción, timbrar en https://test.fiscalapi.com:**
  - una factura nacional, un REP, una nota de crédito y una cancelación;
  - **una exportación con Comercio Exterior** con datos reales (fracción, domicilios), y
    revisar cualquier mensaje de validación que regrese el API.
- **Ver `GUIA_FACTURACION_FISCALAPI.md`** para la puesta en marcha.
