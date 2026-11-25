# rev166 — Facturación electrónica: aviso de timbres insuficientes y saldo de la cuenta

## Situación
- **FiscalAPI respondió** `Saldo insuficiente. Disponible: 0, Requerido: 1` (HTTP 403).
- **Ya no es un error de datos:** el comprobante pasó todas las validaciones (emisor de prueba,
  SKU, tipo de cambio, impuestos). Lo que falta es **saldo de timbres** en la cuenta de FiscalAPI
  del ambiente que se está usando.

## Cambios
- **Mensaje comprensible:** "Tu cuenta de FiscalAPI no tiene timbres disponibles (saldo: 0).
  Compra o asigna timbres en el panel de FiscalAPI (Compras en línea) para este ambiente y vuelve a
  timbrar. El comprobante sí pasó las validaciones."
- **"Probar conexión"** (Configuración) muestra los **timbres disponibles** de la cuenta: en verde
  si hay saldo; en rojo y con la indicación de comprar si está en 0.

## Qué hacer
- **En el panel de FiscalAPI ▸ Compras en línea:** comprar o asignar timbres a la cuenta del
  ambiente actual (pruebas).
- **Si no se cobran timbres en pruebas,** pedir a soporte de FiscalAPI saldo de prueba,
  mencionando la referencia `BB3D978EEEE1417AA3809823E5EBEB5B`.
- **Después:** "Probar conexión" debe mostrar timbres > 0, y se vuelve a timbrar.
