# rev163 — Facturación electrónica: "Esta Idempotency-Key ya se usó con otra petición"

## Causa
- **Cada timbrado lleva una Idempotency-Key** para que un doble clic no genere dos CFDI.
- **El ERP armaba la llave con la orden y una ventana de 10 minutos** (`oc-<orden>-<bloque de 10 min>`).
- **Después del primer intento rechazado** (el del emisor sin régimen), el reintento llevaba **otra
  fecha y hora** (y a veces otros datos), pero la **misma llave**. FiscalAPI lo rechaza: una llave
  solo puede repetirse con exactamente la misma petición durante 24 h.

## Corrección
- **La llave se calcula con el contenido exacto del comprobante** (huella SHA-256 del JSON que se
  envía), con un prefijo por tipo: `oc-<orden>-…`, `rep-<cfdi>-<parcialidad>-…`, `nc-<cfdi>-…`.
  - **Si cambia cualquier dato** (fecha, montos, receptor, conceptos…), la llave es nueva y el
    reintento procede.
  - **Si se reenvía exactamente la misma petición** (por ejemplo, un corte de red), FiscalAPI
    devuelve el CFDI original sin timbrar otro.
- **Protección adicional contra doble timbrado:**
  - **una sola petición de timbrado por orden a la vez:** mientras una está en curso, otra recibe
    "Esta orden ya se está timbrando";
  - **una orden Facturada ya no se puede volver a timbrar.**
- **Mensaje comprensible** si FiscalAPI vuelve a reportarlo: "detectó un reenvío con datos
  distintos… vuelve a presionar Timbrar; si se repite, revisa en Diagnóstico si el primer intento
  sí se timbró".

## Probado (simulador con la regla de idempotencia de FiscalAPI)
- **Intento 1 rechazado por FiscalAPI;** intento 2 con datos corregidos, dentro de los mismos 10
  minutos → **timbrado**. Antes daba "Idempotency-Key ya se usó".
- **Un tercer intento** sobre la misma orden → "La orden está Facturada" (no hay doble CFDI).
