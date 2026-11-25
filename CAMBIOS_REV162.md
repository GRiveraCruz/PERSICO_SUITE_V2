# rev162 — Facturación electrónica: emisor en FiscalAPI sin régimen fiscal

## Error reportado
- **Mensaje de FiscalAPI:**
  `Sorry, it's not me, it's you. — La persona emisora '95f4e36b-…' no tiene régimen fiscal (satTaxRegimeId).`
- **Causa:** el ERP timbra con el **emisor por referencia** (`FISCALAPI_ISSUER_ID`). FiscalAPI toma
  los datos fiscales de la **persona emisora registrada en su plataforma**, y a esa persona le
  faltaba el **régimen fiscal** (y probablemente el CP).
- **El JSON del ERP estaba bien;** el dato faltaba del lado de FiscalAPI.

## Corrección
- **Configuración ▸ "Emisor en FiscalAPI (por referencia)",** solo administrador:
  - **"Revisar emisor":** compara lo que tiene FiscalAPI contra Finanzas ▸ Datos fiscales (RFC,
    razón social sin régimen de capital, régimen y CP) y marca en rojo lo distinto o vacío.
    También muestra si hay **CSD cargado** en FiscalAPI y su vigencia.
  - **"Sincronizar emisor con FiscalAPI":** actualiza la persona emisora en FiscalAPI con los Datos
    fiscales del ERP.
    - Antes valida que estén completos: RFC, régimen de 3 dígitos, CP de 5 dígitos y razón social.
    - Queda registrado en Diagnóstico.
- **Verificación antes de timbrar:** con emisor por referencia, el ERP revisa que la persona
  emisora tenga RFC, razón social, régimen y CP (cada 10 minutos). Si falta algo, no envía el
  comprobante y lo indica.
- **Mensaje comprensible:** este error de FiscalAPI ahora dice "El emisor registrado en FiscalAPI
  no tiene régimen fiscal. Ve a … «Sincronizar emisor con FiscalAPI»…".
  - En la ventana de timbrado aparece el botón **"Sincronizar emisor con FiscalAPI"** para
    corregirlo ahí mismo y volver a timbrar.
- **El texto genérico** "Sorry, it's not me, it's you." ya no se muestra.

## Probado (simulador con la misma regla y el mismo mensaje)
- **Emisor sin régimen ni CP:** el timbrado se detiene antes de enviarse, con mensaje y botón.
- **"Revisar emisor"** → diferencias en régimen, CP y razón social; CSD cargado (vigente hasta
  2028-05-18).
- **"Sincronizar"** → FiscalAPI queda con régimen 601 y CP 72000.
- **Volver a timbrar** → CFDI timbrado.

## Importante
- **La razón social y el régimen deben coincidir exactamente** con la **Constancia de Situación
  Fiscal** del SAT, incluidos acentos y espacios, y sin "S.A. de C.V.". Revisa Finanzas ▸ Datos
  fiscales antes de sincronizar.
