# rev142 — Importación de Stock por Excel: costos en pesos → USD

## Antes
- **La columna de costo se guardaba tal cual, como si fuera USD.** Un archivo con costos en pesos
  dejaba el Stock (y lo que hereda de él: reasignaciones y el resultado del proyecto) con pesos
  registrados como dólares.

## Ahora (Almacenes ▸ Stock ▸ Importar Excel)
- **Selector nuevo: "Los costos del archivo están en: USD / MXN (pesos) → convertir a USD".**
- **Tipo de cambio** (con MXN):
  - por defecto, el **del día** de Finanzas ▸ Tipo de cambio (o el último disponible, que se
    indica);
  - se puede escribir otro.
- **Conversión:** costo en pesos **÷** tipo de cambio = costo en USD.
- **Columna opcional `MONEDA`** (USD/MXN; también acepta MN, PESOS, DLS, DÓLARES) para archivos que
  mezclan monedas: cada renglón se convierte según su moneda y la columna **tiene prioridad** sobre
  el selector. Los renglones sin moneda usan la del selector.
- **El costo admite formato con "$" y comas** (ej. "$1,066.00").
- **Cada material guarda:**
  - `last_cost` en USD;
  - como referencia: `costo_origen`, `moneda_origen` y `tipo_cambio_import`.
- **Resumen antes de importar:** cuántos renglones se convertirán, con qué tipo de cambio, y
  ejemplos (No. de parte: $MXN → $USD). Se confirma antes de guardar; la vista previa no
  modifica el Stock.
- **Si hay costos en pesos y no hay tipo de cambio,** la importación se detiene con un aviso.

## Probado
- **Archivo con 3 renglones** (P-100 $185 MXN, P-200 $2.50 USD, P-300 "$1,066.00" sin moneda) y
  selector MXN a TC 18.5:
  - la **vista previa** mostró 2 renglones a convertir y no modificó el Stock;
  - **al importar:** P-100 **$10.00 USD** (origen $185 MXN), P-200 **$2.50 USD**, P-300
    **$57.62 USD** (origen $1,066 MXN).
- **Selector USD con la columna MONEDA:** solo el renglón marcado MXN se convierte, con el tipo de
  cambio del día.
