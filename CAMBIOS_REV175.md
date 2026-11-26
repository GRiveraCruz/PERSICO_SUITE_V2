# rev175 — Catálogo automático de primera compra: revisión y correcciones

## Lógica (confirmada y reforzada)
Al **emitir** una OC, y ahora también al hacer **Nueva versión**, por cada renglón:
1. **El componente existe** (mismo No. de parte, comparado sin espacios ni guiones):
   - el renglón se **liga a su código**;
   - la marca solo distingue cuando ambas están capturadas: "N/A", "S/M", "Genérico" cuentan como
     sin marca.
2. **El componente no existe** → se **da de alta** con su **precio de compra** (código consecutivo,
   "NUEVO · POR REVISAR", proveedor y moneda).
3. **El componente existe pero el precio cambió** → se guarda el **nuevo precio de compra**, y queda
   el **historial**: fecha, precio anterior → nuevo, moneda, OC y proveedor.
   - Esto aplica también a los renglones elegidos desde el catálogo.
   - En la tabla del catálogo, el precio muestra ↻N cambios; al pasar el mouse se ven el historial y
     la última compra.

## Por qué "parecía no guardarse" (causas encontradas)
1. **Registros idénticos en el catálogo (base de datos):** la tabla de catálogos exige una huella
   única por registro. Si había dos registros idénticos (por ejemplo, de una importación de Excel
   con renglones repetidos, que además recibían el mismo código; corregido en la rev174), **todo
   guardado del catálogo fallaba**, y el error se ignoraba en silencio.
   - Ahora el guardado tolera esos casos y **depura duplicados exactos** (mismo código y No. de
     parte), conservando el más reciente.
2. **Nueva versión de una OC no actualizaba el catálogo:** los componentes agregados o cambiados en
   una versión **no se daban de alta** ni actualizaban precio.
   - Ahora sí. Los renglones nuevos de la versión toman la categoría más usada en la OC.
   - Si un renglón **cambió de No. de parte**, ya no hereda el código del componente anterior: se
     liga o se da de alta según su nuevo número.
3. **La búsqueda del catálogo no se refrescaba:** al armar la siguiente OC, el buscador usaba los
   catálogos cargados al abrir la página, así que lo recién dado de alta no aparecía.
   - Ahora los catálogos **se recargan** al emitir o versionar una OC.
   - La búsqueda por **No. de parte ignora espacios y guiones** ("6ES7214" encuentra "6ES7
     214-1AG40").
4. **Errores silenciosos:** si el catálogo no se puede actualizar, el aviso de la OC ahora lo dice.
   La respuesta indica también lo **omitido y su motivo**: sin No. de parte, marcado "no agregar",
   o categoría sin catálogo (Componentes mayores, Manufactura).

## Probado (PostgreSQL, con un registro duplicado idéntico en el catálogo)
- **OC 1:**
  - "cq2b20 10d" se **ligó** a CM-00001 (existía como "CQ2B20-10D");
  - Misumi nuevo → **alta** CM-00002;
  - "no agregar" y "major" → omitidos, con motivo.
- **OC 2:** el mismo cilindro a $44.90 → **precio actualizado** 40 → 44.90, con historial
  (PO-000000002). "MISUMI HFS5" se ligó a CM-00002.
- **Nueva versión:**
  - renglón con No. de parte cambiado → **alta CM-00003** (sin tocar CM-00002);
  - tornillo agregado → **alta CM-00004**.
- **El duplicado idéntico se depuró:** el catálogo quedó con 4 registros únicos.
