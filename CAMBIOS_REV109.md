# rev109 — Facturación (CPC): verificación ante el SAT y cobranza

## 1. Verificación del CFDI ante el SAT
- Se usa el **servicio público de verificación del SAT** (el mismo de "Verificación de
  comprobantes fiscales digitales"). Se consulta con el RFC del emisor, el RFC del
  receptor, el total y el UUID, y **no requiere credenciales**.
- **Al cargar el XML** de una factura:
  - **Cancelado** ante el SAT → se **rechaza**: "El CFDI … está CANCELADO ante el SAT".
  - **Vigente** → se registra normalmente.
  - **No encontrado** (el SAT puede tardar en publicar un CFDI recién timbrado) o **sin
    respuesta** → se registra con aviso, para verificarla después. **Nunca bloquea** el
    trabajo si el SAT no responde.
- **En cada factura:**
  - recuadro "🏛 Estatus ante el SAT" con el resultado y la fecha de la última consulta;
  - botón **"Verificar ahora"**. Si aparece cancelada, se marca como **Cancelada** sola y
    queda en la bitácora ("Cancelada por el SAT").
- **En la lista:** junto al estatus, "SAT ✓" (vigente), "SAT ✕" (cancelado), "SAT ?" (no
  verificado o no encontrado) o "SAT ○" (sin verificar).
- **Verificación de pendientes:**
  - botón **"🏛 Verificar pendientes ante el SAT"**: revisa todas las facturas
    Pendientes con CFDI y cancela las que el SAT reporte canceladas, con un resumen;
  - **automática una vez al día:** la primera vez que alguien abre CPC en el día, se
    revisan en segundo plano;
  - debajo del botón aparece la fecha de la última verificación.

## 2. Cobranza
- **Pagos parciales:** en cada factura, la sección "💳 Cobranza" muestra:
  - Total · Cobrado · **Saldo**;
  - la lista de pagos (fecha, monto, forma, referencia, quién lo registró);
  - "Registrar pago" (fecha, monto, forma de pago y referencia). El monto propuesto es el
    saldo.
- **Estatus automático:**
  - con pagos y saldo pendiente → **"Pago parcial"**;
  - saldo en cero → **Pagada**, con la fecha del último pago;
  - eliminar un pago regresa la factura a Pendiente.
- **Un pago mayor al saldo** pide confirmación.
- **Marcar "Pagada" a mano** registra un pago por el saldo pendiente ("Marcada como
  pagada"), para que la cobranza siempre cuadre.
- **Para regresar una pagada a Pendiente** hay que eliminar su pago (queda en la bitácora).
- **Complemento de pago (REP):**
  - botón **"💳 Cargar complemento de pago (REP)"**: lee el CFDI tipo P (Pagos 2.0 y
    1.0) y muestra a qué facturas se aplica cada documento relacionado, por UUID, con
    monto, parcialidad y saldo;
  - "Aplicar pagos" los registra con la referencia del REP;
  - un mismo REP **no se aplica dos veces** a la misma factura;
  - si el UUID no corresponde a ninguna factura, se indica y se omite;
  - se valida que el emisor del REP sea la empresa (`RFC_EMPRESA`).
- **Por cobrar** (barra lateral), la columna **Saldo** de la lista y el **KPI de cartera
  vencida** usan ahora el **saldo** (total − pagos a la fecha), no el total.

## API
- `POST /api/cpc/<id>/verificar-sat` · `POST /api/cpc/verificar-sat-pendientes`
- `POST /api/cpc/<id>/pagos` · `DELETE /api/cpc/<id>/pagos/<pago>`
- `POST /api/cpc/parse-rep` · `POST /api/cpc/aplicar-rep`

## Probado
Con respuestas simuladas del SAT; desde el entorno de pruebas no hay salida a internet
hacia el SAT.
- **CFDI cancelado** → rechazado.
- **CFDI vigente** → registrado con "Vigente".
- **Pago de $500** sobre una factura de MXN 1,160:
  - saldo $660, estatus "Pago parcial";
  - un pago de $900 → aviso de exceso.
- **REP** con 2 documentos (uno existente por $660 y uno inexistente):
  - se aplicó el existente y la factura quedó **Pagada** con fecha del REP;
  - el inexistente se omitió;
  - reaplicar el mismo REP → omitido ("ya estaba aplicado").
- **Factura pendiente que el SAT reporta cancelada:** "Verificar pendientes" la marcó
  Cancelada, con su bitácora.
- **Sin conexión con el SAT:** la factura se guarda con el aviso "sin conexión con el
  servicio del SAT".
- **"Pagada" a mano** → se registró el pago por el saldo.

## En producción
- Railway debe poder salir a internet hacia `consultaqr.facturaelectronica.sat.gob.mx`,
  lo cual es normal.
- La primera verificación real conviene hacerla con una factura vigente conocida, para
  confirmar la respuesta del SAT.
