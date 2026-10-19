# rev113 — Ingreso de material: error al procesar (folio repetido)

## Qué pasaba
- Al procesar un ingreso aparecía un error largo de la base de datos (IntegrityError) y el
  ingreso no se guardaba.
- **Causa:** el contador de folios de ingreso (WI-…) estaba **por debajo** del último folio
  que ya existía. Pasa cuando hay registros importados o migrados, o si el contador se
  reinicia. El siguiente folio que entregaba, por ejemplo WI-0000000039, **ya estaba
  usado** por otro ingreso, y la base de datos rechaza dos ingresos con el mismo folio.
- El error ocurría antes de tocar apartados, órdenes o stock, así que **no quedó nada a
  medias**: solo no se guardó el ingreso.

## Corrección
1. **Al crear un ingreso, el folio se elige libre:** si el folio que da el contador ya
   existe, se salta y el contador se adelanta al folio más alto ya usado.
2. **Al arrancar, la Suite revisa todos los contadores de folios** y adelanta cada uno al
   folio más alto que ya existe. Nunca los baja.
   - Contadores revisados: ingresos (WI), salidas (WO), órdenes de compra (PO),
     reasignaciones (RA), CPC, CPP, pagos (PAY), recepciones (REC), procesar compra (PUR),
     movimientos de stock (SM), esquemas tributarios (ET) y CPO.
   - El ajuste queda en el log: "[FOLIOS] contadores revisados: WI≥…".

## Qué hacer después de publicar
- Basta con volver a procesar el ingreso de la **PO-000000013**: al arrancar, el contador
  ya queda al día y el ingreso se guarda con el siguiente folio libre.

## Probado (PostgreSQL local)
- Se crearon WI-0000000001 a WI-0000000003 y el contador se regresó a 1 a propósito. El
  siguiente ingreso se guardó como **WI-0000000004**: saltó el folio repetido y adelantó
  el contador.
- Con el contador atrasado otra vez, al reiniciar la Suite el contador quedó en 4.
