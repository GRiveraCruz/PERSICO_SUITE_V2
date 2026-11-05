# rev140 — Corrección de costos: renglones que no se convertían

## Qué pasaba
- **"Convertir a USD una OC emitida en pesos" solo corregía un registro si coincidían exactamente:**
  - el **No. de parte**: con un espacio, guion o punto distinto ya no coincidía;
  - el **Job** del renglón de la OC;
  - el **costo** igual al precio de la OC.
- **Si algo no coincidía, el renglón simplemente no aparecía** en la vista previa, sin explicación
  (caso 2711P-T7C22D9P de la PO-000000007).

## Corrección
- **El No. de parte se compara normalizado:** sin espacios, guiones ni puntos, y en mayúsculas.
  "2711P-T7C22D9P" = "2711P T7C22D9P".
- **Los ingresos de la misma OC ya no exigen el mismo Job:** la OC ya identifica el registro. En
  apartados, salidas y reasignaciones se sigue respetando el Job.
- **La vista previa muestra "Renglones de la OC sin corrección"**, con el motivo:
  - sin ingresos de esa OC con ese No. de parte;
  - el costo registrado ya está en USD;
  - el costo registrado (ej. 1000) no coincide con el precio de la OC (ej. 1066).
  - En ese último caso aparece un botón **"Corregir a $X"** que llena la herramienta por No. de
    parte con el costo registrado y el valor en USD, para revisarlo y aplicarlo.

## Probado
- **OC en pesos (TC 18.1128):**
  - 1429030000 → $16.305;
  - **2711P-T7C22D9P registrado como "2711P T7C22D9P" y con otro Job** → ahora sí se convierte
    ($61,500 MXN → $3,395.39 USD), en el ingreso y en el apartado;
  - GN403020 registrado a $1,000 en lugar de $1,066 → aparece en "sin corrección" con el motivo y
    el botón para corregirlo.
