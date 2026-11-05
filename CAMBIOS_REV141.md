# rev141 — Job Cost Report: aviso de material ingresado que no suma en compras

## Por qué no aparecía el renglón en el reporte de costo
- **El costo de compras del Job Cost Report sale de Purchase Orders** (los renglones de la OC
  asignados al Job), **no de los ingresos al almacén**. La corrección de costos (rev139/rev140)
  actúa sobre ingresos, apartados, salidas, reasignaciones y Stock, pero no agrega renglones a una OC.
- **Si un material se ingresó al almacén con el número de una OC pero ese renglón no existe en la
  OC,** no aparece en Purchase Orders ni suma en el costo del proyecto. Pasa lo mismo si el renglón
  está asignado a otro Job.
  - Caso de la PO-000000007: el reporte muestra 3 renglones y falta el PanelView 2711P-T7C22D9P.

## Qué agrega
- **Job Cost Report ▸ Purchase Orders:** recuadro **"⚠ Material ingresado al almacén que no suma
  en compras"**, con la OC, el No. de parte, la descripción, la cantidad × costo, el total, el
  ingreso (WI) y el motivo:
  - el renglón no existe en la OC;
  - en la OC está asignado a otro Job;
  - la OC no tiene ese renglón en Purchase Orders.
- **"Convertir a USD una OC emitida en pesos"** muestra también lo **"Ingresado con esta OC pero
  que NO está en la OC"**.

## Cómo corregirlo
- **Si el material sí se compró con esa OC:** agregar el renglón a la OC con **Nueva versión**. Así
  aparece en Purchase Orders y en el costo del Job.
- **Si salió de otra compra o de Stock:** registrarlo en su OC correcta o como **reasignación**.
- **Si está asignado a otro Job en la OC:** corregir el Job del renglón (Purchase Orders ▸ Editar
  registro).

## Probado
- **OC en pesos** con 2 renglones + un ingreso que trae además el PanelView (no está en la OC) → el
  reporte del Job muestra el aviso: PanelView $3,339.43, "el renglón no existe en la OC".
- **La herramienta de conversión** lo lista como "ingresado fuera de la OC".
