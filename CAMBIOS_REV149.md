# rev149 — Ingreso por Orden de Compra: búsqueda por No. de PO **o** No. de SAE

- **El campo de búsqueda** de Almacenes ▸ Ingreso de material ▸ **Ingreso por orden de compra**
  acepta el **No. de PO de la Suite o el No. de SAE** de la orden. Funciona como condición **OR**.
- **Orden de búsqueda:**
  1. **No. de PO exacto** (PO-000000001);
  2. **No. de SAE exacto** (sin importar espacios ni mayúsculas). También funciona si se deja el
     "PO-" precargado y se escribe el No. de SAE después (PO-7781 → SAE 7781);
  3. **Solo números:** se comparan los dígitos del No. de PO y del No. de SAE (4512 → SAE "OC
     4512").
- **Si más de una orden coincide,** se muestran como botones (PO · SAE · proveedor) para elegir.
- **Si se encontró por SAE,** se avisa con qué PO se abrió.
- **El encabezado de la orden** muestra también su **No. SAE**.
- **No se consideran** las órdenes canceladas.
- **La etiqueta del campo** ahora dice "No. de Orden de Compra **o No. de SAE**".

## Probado
- **Órdenes de prueba:** PO-000000001 (SAE "OC 4512") y PO-000000002 (SAE 7781).
- **Resultados:**
  - "PO-000000001" → PO-000000001;
  - "OC4512" → PO-000000001;
  - "PO-7781" → PO-000000002;
  - "4512" → PO-000000001;
  - "7781" → PO-000000002;
  - "9999" → "No se encontró una OC con ese No. de PO ni de SAE".
