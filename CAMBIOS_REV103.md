# rev103 — Editar orden de compra: esquema tributario y PDF actualizado

## 1. Cambiar el esquema tributario
- En **Compras ▸ Órdenes de Compra ▸ Editar**, si el renglón pertenece a una PO generada
  en la Suite, aparece **"Esquema tributario (de toda la PO)"**: una lista con los esquemas
  de Finanzas ▸ Esquemas Tributarios y, debajo, sus tasas (IVA, ISR retenido, IVA retenido
  e IEPS).
- **Al elegir uno distinto,** el modal avisa "⚠ cambia el esquema de toda la PO".
- **Al guardar con un esquema distinto,** se pide **confirmación**:
  - el mensaje dice de qué esquema a cuál cambia;
  - advierte que se recalcularán el IVA, las retenciones, el IEPS y el **total de toda la
    orden**;
  - advierte que si ya se envió al proveedor hay que mandarle la versión corregida.
  - Si se cancela, no se guarda nada.
- **Al confirmar,** la PO toma el esquema nuevo (IVA = IVA trasladado del esquema) y
  recalcula sus importes. El cambio queda en `historial_esquema`: de, a, fecha y usuario.
- Para ver la lista de esquemas basta el permiso de ver Órdenes de Compra; no hace falta el
  de Esquemas Tributarios.

## 2. El PDF de la PO no se actualizaba (bug)
- **Causa:** la edición solo cambiaba el renglón de la lista de Órdenes de Compra. El PDF
  se genera de la **PO generada** (con sus partidas, subtotal, impuestos y total), que se
  quedaba con los datos originales.
- **Corrección:** al editar un renglón de una PO generada, también se actualiza la partida
  correspondiente de la PO:
  - cantidad, precio unitario e importe;
  - descripción, No. de parte y Job;
  - moneda, tipo de cambio y proveedor.
  Se recalculan subtotal, impuestos y total, y el PDF muestra los datos nuevos.
- **El PDF indica "Revisión N · fecha"** debajo del número de PO cuando la orden se ha
  modificado.
- **El subtotal se calcula solo** (cantidad × precio) al cambiar la cantidad o el precio en
  el modal.

## Probado (PostgreSQL local)
- **PO original:** 2 × $100 + 1 × $50, esquema "General 16 %": subtotal $250, total $290.
- **Edición:** PN-A a 3 × $120 y esquema "Servicios PF (ret)" (IVA 16 %, ISR ret. 10 %,
  IVA ret. 10.6667 %):
  - subtotal $410, total $390.87;
  - revisión 1;
  - el PDF muestra la cantidad 3, el importe $360 y "Revisión 1";
  - el renglón de la lista quedó en 3 × $120 = $360.
- **Pantalla:** al cambiar el esquema y guardar aparece la confirmación; al cancelar, el
  modal sigue abierto sin guardar. El subtotal se calculó solo: 4 × 120 = 480.
