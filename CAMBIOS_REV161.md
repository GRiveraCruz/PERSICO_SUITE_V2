# rev161 — Facturación electrónica: corrección del timbrado con FiscalAPI

## Problema
- **FiscalAPI rechazaba los CFDI de ingreso** con `Items[0].ItemSku: 'itemSku' no debería estar
  vacío.`
- **Causa:** el concepto solo llevaba `itemSku` cuando se capturaba un "No. de identificación"
  (mercancías de Comercio Exterior). En facturas normales iba vacío.

## 1. Identificador de conceptos (itemSku)
- **Se genera automáticamente con el Job de la orden:** Job 689-01 → `"itemSku": "689-01"`.
- **Con varios conceptos**, sufijos consecutivos: `689-01-1`, `689-01-2`, `689-01-3`…
  - Se puede escribir un SKU propio en cualquier concepto (columna **SKU** en la ventana de
    timbrado).
  - Los SKU se mantienen **únicos**.
- **Mercancías de Comercio Exterior:** el SKU es su No. de identificación. Ambos deben coincidir en
  el XML; si no se captura, se usa el SKU.
- **Validación en pantalla y en el servidor:** ningún concepto puede ir sin SKU.
- **`itemCode` sigue siendo la clave SAT**, validada a 8 dígitos. No se mezcla con el SKU.
- **Complemento de pago y nota de crédito** también envían SKU: el Job de la factura, o
  PAGO / NC si no tiene Job.

## 2. Método y forma de pago
- **PPD** → forma **99 (Por definir)**, asignada y **bloqueada**, con la nota "la forma real va en
  el complemento de pago".
- **PUE** → se habilitan las formas válidas: 03 Transferencia (por omisión), 02, 01, 04, 28, 17,
  30, 15.
- **El servidor rechaza** PPD con una forma distinta de 99, y PUE con 99 o sin forma.

## 3. Cliente fiscal (receptor)
- **El receptor debe ser el cliente de la orden.**
  - En **producción** solo se ofrece ese cliente, y el servidor rechaza cualquier otro.
  - En **pruebas** se permite elegir otro, con aviso, y el aviso queda guardado en el CFDI.
- **Si el cliente de la orden no tiene datos fiscales:** aviso rojo con el botón **"＋ Registrar
  datos fiscales de <cliente>"**. Abre el alta con el nombre prellenado y, al guardar, la ventana
  de timbrado se actualiza.
  - **En producción el timbrado queda bloqueado** (también en el servidor).

## 4. Tipo de cambio
- **Con USD** se consulta y muestra el **tipo de cambio aplicable** (el FIX registrado de la fecha,
  o del último día hábil): "FIX del 2026-11-23: 18.2034". Se puede ajustar a mano.
  - Endpoint: `GET /api/cfdi/tipo-cambio`.
- **Si no hay tipo de cambio,** se avisa en rojo y no se puede timbrar.
- **Se envía como número:** el JSON a FiscalAPI lleva `"exchangeRate": 18.25`, y lo mismo los
  importes y cantidades. Antes el SDK los mandaba como texto.

## 5. Validaciones y diagnóstico
- **Validación completa antes de llamar a FiscalAPI,** en pantalla y en el servidor:
  - **emisor:** RFC, régimen y CP de expedición;
  - **receptor:** RFC, CP y régimen, o país y Tax ID si es extranjero;
  - **moneda y tipo de cambio;** método y forma de pago;
  - **exportación 02:** solo con cliente extranjero;
  - **por concepto:** SKU, descripción, cantidad, valor, clave SAT de 8 dígitos, unidad, objeto
    de impuesto y fracción arancelaria si es mercancía; SKU no repetidos.
  - **En la ventana** aparece "Antes de timbrar:" con la lista de pendientes, y el botón Timbrar
    queda deshabilitado mientras haya alguno.
- **Mensajes comprensibles:** los errores de FiscalAPI se traducen. Por ejemplo,
  `Items[0].ItemSku: …` → "**Concepto 1 · No. de identificación (SKU):** …" y
  `Recipient.ZipCode` → "Receptor · Código postal fiscal". Incluyen la referencia de la petición
  para soporte.
- **Nueva pestaña "Diagnóstico"** (Administrador o CPC Control total):
  - las últimas 300 solicitudes (timbrado, REP, nota de crédito, cancelación);
  - con el **JSON enviado** y la **respuesta de FiscalAPI**, y el ambiente (PRUEBAS / PRODUCCIÓN);
  - **no se registran** llaves, certificados CSD ni contraseñas (`taxCredentials`, `password`,
    archivos base64 → "[omitido]").
  - Endpoint: `GET /api/cfdi/diagnostico`.

## Sin cambios
- **El diseño, el resto del módulo y los demás módulos.**
- **La separación de ambientes** (`FISCALAPI_URL` test/live), visible en el encabezado.

## Probado (simulador del API con las reglas del rechazo reportado)
- **Ingreso del Job 689-01** → `itemSku: "689-01"`, `itemCode: "81141601"`, `exchangeRate: 18.25`
  (número), forma 99 con PPD.
- **Tres conceptos** (uno con SKU propio) → `689-01-1`, `689-01-2`, `689-01-INST`.
- **Validaciones de forma de pago:** PUE con 99 o sin forma → rechazado con mensaje.
- **Clave SAT de 3 dígitos** → "debe tener 8 dígitos".
- **Rechazo simulado de FiscalAPI** → "Concepto 1 · Clave de producto/servicio SAT: la clave no
  existe en el catálogo… (ref. trace-123)".
- **USD sin tipo de cambio registrado** → bloqueado.
- **Cliente de la orden sin datos fiscales:**
  - pruebas → se puede usar otro receptor, con aviso guardado;
  - **producción → bloqueado**, con acceso a registrar sus datos.
- **Producción con el receptor correcto** → timbrado.
- **Diagnóstico** con los JSON enviados; `taxCredentials` aparece como "[omitido]".
