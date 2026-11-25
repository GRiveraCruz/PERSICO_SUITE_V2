# rev164 — Facturación electrónica: CSD del emisor no encontrado en FiscalAPI

## Error reportado
- **Mensaje de FiscalAPI:**
  `No se encontró tal recurso. Verifica los archivos fiscales de la persona: 95f4e36b-…`
- **Causa:** con el emisor por referencia, FiscalAPI firma cada CFDI con el **CSD** (certificado
  .cer y llave .key) cargado en la persona emisora **del mismo ambiente** (pruebas o producción).
  Esa persona no tiene su CSD cargado en el ambiente que usa el ERP.

## Corrección
- **Verificación antes de timbrar:** además de régimen y CP, el ERP revisa que la persona emisora
  tenga **.cer y .key** en FiscalAPI. Si falta, no envía el comprobante e indica qué falta y dónde
  subirlo.
- **Configuración ▸ Emisor en FiscalAPI ▸ "Subir CSD a FiscalAPI"** (solo administrador):
  - se adjuntan el **.cer**, el **.key** y la **contraseña**, y se envían directo a FiscalAPI, a
    la persona emisora y en el ambiente actual (se indica si es PRUEBAS o PRODUCCIÓN);
  - **el ERP no guarda los archivos ni la contraseña.** La bitácora registra la operación con
    `base64File` y `password` como "[omitido]";
  - al terminar muestra la vigencia del certificado.
- **"Revisar emisor"** muestra si el CSD está cargado.
- **Mensaje comprensible** para este error, y en la ventana de timbrado el botón **"Ir a «Subir CSD
  a FiscalAPI»"**.

## Importante
- **Es el CSD (Certificado de Sello Digital)**, no la e.firma (FIEL). Se tramita en el SAT con la
  e.firma (CertiSAT / portal del SAT).
- **Cada ambiente tiene su propia carga:** si se sube en pruebas, hay que volver a subirlo al pasar
  a producción.

## Probado (simulador con la misma regla y el mismo mensaje)
- **Sin CSD:** el timbrado se detiene antes de enviarse, con mensaje y botón.
- **Subir sin contraseña** → se pide la contraseña.
- **Subir .cer y .key** → cargados (vigente hasta 2028-05-18); la bitácora no tiene secretos.
- **Timbrar** → CFDI timbrado.
