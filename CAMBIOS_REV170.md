# rev170 — Facturación electrónica: estado de cobro y candado de cancelación

## 1. ¿Está saldada la factura?
- **CFDI emitidos tiene la columna nueva "Cobro"** en las facturas de ingreso:
  - **✓ Saldada** (verde);
  - **Pago parcial** (ámbar), con "pagado $… · saldo $…";
  - **Pendiente de pago** (azul);
  - **Pagada (PUE)**;
  - **Cancelada**.
- **Cómo se calcula:**
  - **con Cuentas por Cobrar** (producción): el saldo de su CPC (pagos, complementos de pago y
    notas de crédito registrados);
  - **sin CPC** (pruebas): total − complementos de pago − notas de crédito vigentes;
  - **PUE sin complementos:** pagada en una exhibición.
- **Filtro "Cobro":** todas / **Por cobrar** / **Saldadas**.
- **El botón REP** solo aparece mientras haya saldo.

## 2. No se puede cancelar una factura pagada
- **El servidor rechaza cancelar una factura de ingreso** que tenga:
  - **complementos de pago o notas de crédito vigentes** relacionados. Esto lo exige el SAT; el
    mensaje dice cuáles (p. ej. "REP CP2") y que se cancelen primero;
  - **pagos registrados en Cuentas por Cobrar**, aunque no tengan REP.
- **En pantalla,** esas facturas muestran "🔒 con pagos" en lugar del botón Cancelar.
- **Al cancelar un complemento de pago o una nota de crédito,** se **revierte** su pago en CPC: se
  recalcula el saldo y, si estaba Pagada, vuelve a Pendiente. Queda en el historial.

## Probado (pruebas y producción con CPC)
- **Factura de $44,080 (PPD):**
  - Pendiente de pago;
  - REP $38,000 → **Pago parcial** (saldo 6,080);
  - **cancelar la factura → rechazado** ("tiene CFDI relacionados vigentes (REP CP2)");
  - REP $6,080 → **Saldada**.
- **Revertir:**
  - cancelar el REP 2 → vuelve a Pago parcial;
  - cancelar el REP 1 → Pendiente de pago;
  - entonces sí se cancela la factura.
