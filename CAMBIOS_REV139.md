# rev139 — Costos en USD: OC en pesos y corrección de costos de material

## 1. Las OC en pesos heredan costos en USD
- **Al ingresar al almacén material de una OC generada en pesos** (Ingreso por OC), el costo
  unitario se **convierte a USD** con el **tipo de cambio de la OC**. Ya incluye los descuentos de
  la OC (rev135).
- **OC de SAE en pesos** (Ingreso SAE): se usa el tipo de cambio de su fecha.
- **El ingreso guarda los dos datos:** `unit_cost` (USD) y, como referencia, `unit_cost_origen`,
  `moneda_origen` y `tipo_cambio`.
- **De ahí heredan en USD:** **apartados**, **salidas de almacén**, **Stock**, **reasignaciones** y
  el **resultado del proyecto**.
- **Solo el PDF de la OC sigue mostrando pesos.**

## 2. Corrección de costos de material ya registrado (Config ▸ Administrador)
- **Sección nueva "💱 Corrección de costos de material"**, con dos herramientas. Ambas muestran
  primero una **vista previa** (dónde, documento, Job, cantidad, antes → después) y luego se
  aplican.
  1. **Por No. de parte** (opcionalmente de un Job y desde un costo actual específico): se escribe
     el **costo correcto en USD** o se marca **"Usar el precio actual de Stock"**.
  2. **Convertir a USD una OC emitida en pesos:** para OC en pesos ingresadas antes de esta versión.
     Toma el tipo de cambio de la OC y corrige **solo** los registros cuyo costo coincide con el
     precio en pesos de esa OC.
- **Se corrige en:** **reasignaciones (RA)**, **apartados**, **salidas de almacén**, **ingresos** y
  **Stock**. Con eso se actualiza el **Job Report** (costo reasignado).
- **En Reasignaciones ▸ Detalle**, cada renglón tiene **"Corregir costo"**: pide el costo en USD
  (o toma el de Stock), muestra a cuántos registros afecta y lo aplica.
- **Permisos y registro:** lo puede usar el administrador o quien tenga Control total en
  Reasignaciones. Queda en la bitácora (`ra_bitacora`), y cada renglón de RA corregido guarda su
  costo anterior.

## Probado
- **OC en pesos** (2 × $370 MXN, TC 18.5) → ingreso con **$20.00 USD** (origen $370 MXN) y apartado
  en $20.00.
- **Material histórico en pesos** (Stock, RA y salida a $185) → vista previa: RA, apartado, salida y
  Stock. Al aplicar $10 USD, el Job Report pasó de **$555 a $30** y la salida quedó en $10 / $30.
- **"Convertir OC en pesos"** (B7, $100 MXN, TC 20) → el apartado registrado en pesos quedó en
  **$5.00 USD**.
