# rev126 — Órdenes de cobro: elegir cualquier factura y facturas que agrupan varios Jobs

## Selección de la factura existente
- **"Solo las que coinciden en monto"** sigue **marcado por defecto**: solo se pueden elegir las
  facturas con el mismo monto que la orden.
- **Al desmarcarlo** se puede elegir **cualquier factura**, aunque el monto sea distinto. Es el
  caso de una factura que agrupa más de un Job.
  - Debajo de la lista se avisa si el monto coincide o, si no, la diferencia.
  - Al saldar con un monto distinto se pide el **motivo**, obligatorio; por ejemplo:
    "factura agrupa los Jobs 652-50 y 665-00".
  - El motivo queda en la orden (`monto_distinto`) y en la bitácora de la orden y de la
    factura.

## Una factura puede saldar varias órdenes
- **Una misma factura puede saldar varias órdenes** mientras le quede monto disponible.
  Antes, una factura solo podía saldar una orden.
- **En la lista**, una factura que ya salda otras órdenes muestra "ya salda ODC-… ·
  disponible $… USD".
  - El monto de la siguiente orden se compara contra **lo disponible**: si coincide, entra
    como "✓ coincide", sin pedir motivo.
- **Nunca se permite** que las órdenes saldadas con una factura **excedan su total**: se rechaza
  con "La orden excede lo disponible de la factura", aun con motivo.
  - Esas facturas se ven como "excede lo disponible" y no se pueden elegir.
- **Las facturas sin monto disponible** dejan de aparecer.
- **La factura guarda la lista de órdenes que salda** (`ordenes_cobro`).
- **"Desligar"** quita solo esa orden de la lista de la factura.

## Income Forecast
- **Factura que salda varias órdenes:** su saldo pendiente se **reparte** entre ellas en
  proporción a su monto, para no contar el mismo saldo dos veces.

## Probado
- **Factura de $116,000** (agrupa Anticipo $34,800 + SAT $81,200):
  - Anticipo sin motivo → rechazado; sin escribir motivo → rechazado; con motivo → saldada;
  - **SAT** → la factura aparece con "ya salda ODC-1 · disponible $81,200" y **coincide** →
    saldada sin motivo;
  - la factura quedó con las 2 órdenes;
  - el forecast muestra $34,800 y $81,200 "Facturado" (no $116,000 dos veces).
- **Factura de $1,160 para la orden de $81,200,** aun con motivo → rechazada (excede lo
  disponible).
- **En pantalla:** con el filtro solo se puede elegir la que coincide; sin el filtro se
  habilitan las demás que alcanzan.
