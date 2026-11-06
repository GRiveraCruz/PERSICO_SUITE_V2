# rev143 — BOM de Manufactura: carga por Excel con la plantilla DETAILS

## Qué pasaba
- **En la rev78 la tabla de Manufactura adoptó el formato de la hoja DETAILS:** DETL #, REV,
  DESCRIPTION, MATERIAL, FINISHING, PRODUCT GROUP, QTY / QTY MIRROR.
- **Pero la carga por Excel seguía usando la lógica de los BOM de compra:**
  - la **plantilla** que se descargaba era siempre la de PURCHASED (BRAND, PART #, …), también en
    Manufactura;
  - al subir un libro con varias hojas **no se tomaba la hoja DETAILS** (solo PURCHASED y
    CONTROLS);
  - **no se reconocía la columna "DETL #"** como número de pieza, así que la carga fallaba con "No
    se encontró la columna de número de parte";
  - aunque pasara, **no se leían** REV, MATERIAL, FINISHING, PRODUCT GROUP ni QTY MIRROR.

## Corrección
- **Plantilla de Manufactura (formato DETAILS):** "Descargar plantilla" con el BOM Manufactura
  elegido descarga `Plantilla_BOM_Manufactura_DETAILS.xlsx`, con hoja "Details":
  - título "DETAILS";
  - columnas ITEM, JOB#, RESPONSIBLE, DATE RELEASED, VENDOR, **DETL #**, **REV**, DESCRIPTION,
    **MATERIAL**, **FINISHING**, **PRODUCT GROUP**, **QTY.**, **QTY. MIRROR** y NOTAS;
  - 2 renglones de ejemplo.
  - Eléctrico, Mecánico y Comp. mayores siguen con la plantilla PURCHASED.
- **Carga de Manufactura:**
  - si el libro trae la hoja **DETAILS** (como la lista 5260-0000-TOOL), se toma esa aunque no sea
    la activa;
  - el número de pieza se lee de **DETL #**; también se reconocen DETAIL #, PLANO e ID PIEZA;
  - se leen **REV** (revisión del plano), **MATERIAL**, **FINISHING** (acabado), **PRODUCT GROUP**
    (grupo), **QTY.** (normal) y **QTY. MIRROR** (espejo), además de Responsible, Date released,
    Vendor y Notas;
  - **origen** (MX / USA / STD) según el formato del DETL #, y pieza **espejo** cuando termina en S;
  - estatus de Manufactura (Solicitado por defecto).
  - Si una pieza ya existía, se completan su material, acabado y grupo vacíos. La revisión de la
    lista no reemplaza la de los planos PDF ya subidos. Si la cantidad sube, se actualizan la
    normal y la espejo.
- **El aviso del modal de carga** explica las columnas de cada formato.

## Probado (PostgreSQL)
- **Plantilla de Manufactura:** hoja Details con las 14 columnas.
- **Libro con hojas Purchased + Details** (formato de la lista TOOL), subido en Manufactura del
  652-50 → **4 piezas**:
  - 5260-D2001 MAIN PLATE LOWER · ALUMINUM T&J · NONE · TD001 · V000 · qty 1 · MX;
  - 5260-D2002S NEST 2 MIRROR · **espejo**;
  - 5260-D2006 SENSOR BRACKET · SHEET METAL · BLACK OXIDE · TD008 · qty 2;
  - todas con responsable CART y estatus Solicitado.
- **La plantilla de Mecánico/Eléctrico** sigue siendo la de PURCHASED.
