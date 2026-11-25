# rev168 — Complemento de pago: subTotal del documento pagado

## Avance
- **La factura de ingreso ya se timbró en el ambiente de pruebas.**

## Error del complemento de pago
- **Mensaje de FiscalAPI:**
  `Complement.Payment.PaidInvoices[0].SubTotal: 'subTotal' debe ser mayor que 0 cuando un impuesto
  del documento pagado tiene base 0 (base 0 toma el subTotal).`
- **Causa:** el ERP no enviaba `subTotal` en el documento pagado, y FiscalAPI lo usa para calcular
  la **base del IVA** del pago.

## Corrección
- **`subTotal` = base del impuesto que corresponde a este pago** = pago ÷ (1 + tasa de IVA).
  - **Con pago total** es igual al subtotal de la factura, como en el ejemplo oficial de FiscalAPI.
  - **Con pagos parciales** es la parte proporcional, como pide el SAT para BaseDR.
- **La tasa de IVA se toma de la factura pagada** (comparando su subtotal y su total): 16 %, 8 % o
  0 % (exportación o factura sin IVA). Antes se suponía siempre el 16 % nacional.

## Probado (simulador con la misma regla)
- **Factura de $38,000 + IVA = $44,080.**
- **REP 1 de $38,000** → parcialidad 1, subTotal 32,758.62, saldo anterior 44,080, insoluto 6,080,
  tasa 0.16.
- **REP 2 de $6,080** → parcialidad 2, subTotal 5,241.38, insoluto 0.
