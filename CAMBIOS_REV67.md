# rev67 — Requisición de Compra: el BOM mecánico no copiaba las marcas

## Causa
- Al subir el Excel, la columna de marca solo se reconocía si el encabezado decía
  exactamente **BRAND** o **MARCA**.
- Los BOM mecánicos traen la marca como **FABRICANTE** (formato normalizado
  FABRICANTE / NUMERO DE PARTE / DESCRIPCION / CANTIDAD). La columna no se encontraba y las
  marcas quedaban vacías **sin ningún aviso**.
- Además, al volver a subir un archivo, los renglones ya existentes solo actualizaban la
  cantidad. Aunque se corrigiera el encabezado, las marcas faltantes no se llenaban.
- Los encabezados con acento ("NÚMERO DE PARTE", "DESCRIPCIÓN") tampoco se reconocían.
- Solo se leía el renglón 1 como encabezado; un BOM con título arriba no funcionaba.

## Corrección
1. **Encabezados tolerantes:** se comparan sin acentos, signos ni espacios extra.
   - **Marca:** BRAND, MARCA, **FABRICANTE**, MANUFACTURER, MFR, MFG, MAKER, BRAND NAME…
   - **Número de parte:** PART NUMBER, PART NO, PN, NO. PARTE, NO DE PARTE, NÚMERO DE PARTE,
     MANUFACTURER PART NUMBER, CATALOG NUMBER…
   - **Descripción:** DESCRIPTION, DESCRIPCIÓN, DESC.
   - **Cantidad:** QUANTITY, CANTIDAD, QTY, CANT.
2. **Fila de encabezados:** se busca en los primeros 15 renglones, así que se aceptan BOM
   con título arriba.
3. **Completar renglones existentes:** si un renglón ya existía sin marca o sin
   descripción, se llena con lo del archivo. Lo que ya tenía valor **no se sobrescribe**.
   El resultado de la carga dice cuántos se completaron.
4. **Aviso:** si el archivo no trae columna de marca, la carga lo dice e indica qué
   encabezados leyó, en lugar de dejar las marcas vacías en silencio.
5. Si un número de parte viene repetido en el archivo y el primero no tiene marca, se toma
   la del siguiente.

Aplica a todos los BOM que se cargan por Excel (eléctrico, mecánico y componentes mayores).

## Cómo arreglar los BOM mecánicos que ya se subieron
Vuelve a subir el mismo Excel del BOM mecánico en el mismo Job. Las cantidades iguales no
se duplican y los renglones sin marca se completan con la columna FABRICANTE.

## Cómo se probó (PostgreSQL local)
- Archivo sin columna de marca (con título arriba y encabezados con acento): se cargó y
  apareció el aviso con los encabezados leídos.
- Archivo con FABRICANTE / NUMERO DE PARTE / DESCRIPCION / CANTIDAD:
  - 2 renglones nuevos con marca (FESTO y "NA" literal);
  - 2 existentes completados (MISUMI, SMC);
  - las cantidades iguales no se duplicaron.

## Archivos
- `app.py`: `api_requisiciones_upload()`.
- `static/app.js`: `reqUploadFile()` muestra los completados y los avisos.
