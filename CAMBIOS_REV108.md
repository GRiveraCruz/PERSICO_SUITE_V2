# rev108 — Facturación (CPC): correcciones

## Errores corregidos
1. **Saldo de la CPO.** Se comparaba el **total con IVA** de las facturas contra el valor de
   la CPO (sin IVA). Una CPO facturada al 100 % mostraba saldo negativo. Ahora lo facturado
   es el **subtotal sin IVA, en USD**: la misma CPO queda con saldo $0.00.
2. **Cambiar la fecha de factura a otro año.** Antes marcaba "CPC no encontrada". Ahora la
   factura se busca en cualquier año y **se mueve** al año de su nueva fecha. El PDF y la
   eliminación también la encuentran en cualquier año.
3. **Guardados simultáneos.** Altas, cambios y bajas ahora usan un **candado** (proceso +
   PostgreSQL entre workers). Antes, dos guardados al mismo tiempo podían perder una factura.
   - Probado: 10 altas simultáneas → 10 facturas guardadas, folios únicos.

## Moneda y tipo de cambio
- **Cada factura tiene moneda (USD / MXN)** y, en MXN, **tipo de cambio**.
  - Si viene CFDI, se toman del XML.
  - Si no, el tipo de cambio sale de Finanzas ▸ Tipo de Cambio para la fecha de la factura.
  - Una factura en MXN sin tipo de cambio no se guarda.
- **La tabla** muestra el total con su moneda y una columna **"Equiv. USD"**.
- **"Por cobrar"** muestra el equivalente en USD y el desglose USD / MXN.
- **El saldo de la CPO y el KPI de cartera vencida** usan el equivalente en USD, para no
  mezclar pesos con dólares.
- **Facturas capturadas antes:** al arrancar toman la moneda de su CFDI (o USD si no
  tienen) y, si son MXN, el tipo de cambio de su fecha. Quedan marcadas con
  `_moneda_migrada`.

## Validación del CFDI
- **Solo se aceptan CFDI de tipo Ingreso.** Una nota de crédito (Egreso), un complemento de
  pago u otro tipo se rechaza con el motivo.
- **El emisor debe ser la empresa:** si el RFC emisor no es el de Persico, se rechaza
  ("¿Es la factura de un proveedor?").
  - Se configura con la variable de entorno **`RFC_EMPRESA`** en Railway (se aceptan
    varios, separados por coma).
  - Mientras no esté configurada, el CFDI se acepta con un aviso.
- **Las retenciones (ISR e IVA) se leen del XML**; antes se ponían en cero.

## Sobre-facturación
- Si con una factura (o un cambio) la CPO quedaría facturada por **más de su valor**, se pide
  **confirmación** mostrando el valor, lo ya facturado, esta factura y el exceso.
- Si se confirma, queda anotado en la bitácora.

## CPOs de cualquier año
- Al ligar una factura se ofrecen las CPOs de **todos los años** (primero las que tienen
  saldo), con su año. Antes solo las del año de la factura.

## Facturas pagadas y bitácora
- **Una factura Pagada no se puede eliminar:** se cambia a Cancelada. El botón Eliminar ya
  no aparece en las pagadas.
- **Bitácora por factura:** alta y cada cambio (qué campo, de qué a qué, quién y cuándo).
  Se ve en el modal ("Bitácora de cambios").
- **Facturas eliminadas** (no pagadas): se guarda una copia con quién y cuándo
  (`kpi_snapshots`, clave `cpc_eliminada:<folio>`).

## Para activar en Railway
- Agrega la variable **`RFC_EMPRESA`** con el RFC de Persico Automotive de México en el
  servicio de la Suite.

## Probado
- CFDI de nota de crédito → rechazado.
- CFDI de otro emisor → rechazado (con `RFC_EMPRESA` configurado).
- CFDI en MXN con TC 18.5 y retenciones ISR $100 / IVA $106.67 → se precargan moneda, TC y
  retenciones.
- CPO de $19,024 facturada por su subtotal → saldo $0.00.
- Factura extra de MXN 2,000 (TC 20) → aviso de sobre-facturación por $100 USD; confirmada →
  guardada con nota en la bitácora.
- Cambio de fecha a enero de 2027 → la factura se movió a 2027 (equiv. USD $116).
- Eliminar una pagada → bloqueado. Eliminar una pendiente → eliminada.
