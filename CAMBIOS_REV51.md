# rev51 — LOP en Configurar Proyecto: importar desde Excel y descargar en Excel / PDF

Pestaña **Puntos Abiertos** de Configurar Proyecto. Botones nuevos: **Importar LOP (Excel)**,
**Descargar Excel** y **Descargar PDF**.

## Importar LOP (para registrar proyectos pasados)
- Formato F.PM.007 (Open Issues List), como `PT0067-LOP-689-01-02.xlsx`: una hoja por proyecto.
- La fila de encabezados se busca por nombre (DESCRIPTION, RESPONSIBLE, STATUS…), no por
  posición: hay hojas donde RESPONSIBLE está en la columna G y otras en la H. Se aceptan
  encabezados en inglés o español y el "COMITMENT DATE" del formato.
- Cabecera de cada hoja: PROJECT:, PT: (o "PM:" cuando trae un PT) y CTRL. ENG.:.
- **Vista previa antes de importar:** cada hoja muestra proyecto, PT, cliente y cuántos
  puntos trae en OPEN / CLOSE / INFO. Se eligen las hojas y el modo:
  - **Agregar a la lista actual:** omite puntos repetidos (mismo proyecto, descripción y fecha
    de apertura). Volver a subir el mismo archivo no duplica nada.
  - **Reemplazar la lista actual:** pide confirmación si ya hay puntos.
- **Avisos** en la vista previa:
  - el PT de la hoja es distinto al PT abierto;
  - la hoja parece copia de otra (nombre "689-01 (2)"): viene desmarcada por default;
  - celdas con error de Excel (#VALUE!): quedan vacías y se indica en qué items;
  - estatus no reconocido: se importa como OPEN.
- **Conversión de datos:**
  - Fechas de Excel → fecha. "-" → vacía.
  - Un texto en un campo de fecha (ej. "TBD" en COMITMENT DATE) se agrega a Notas como
    "Compromiso: TBD", para no perderlo.
  - La columna sin encabezado junto a COMMENTS (celdas combinadas F:G) se suma a Notas.
  - Estatus: OPEN / CLOSE / INFO; también Closed, Cerrado, Done, Abierto, etc.
- Los puntos se cargan en la tabla y **se registran con "Guardar Configuración"**, como
  cualquier otro cambio de la pantalla.

## Cambios en la tabla de Puntos Abiertos
- **Columna nueva "Proyecto"** (el PROJECT del formato), con sugerencias de los Jobs del PT;
  acepta texto libre como "689-0X". Un punto nuevo toma el Job por default si el PT tiene uno solo.
- **Estatus INFO** (azul), además de OPEN y CLOSE. El resumen cuenta los INFO aparte.
- Los puntos ya guardados siguen funcionando igual (sin Proyecto hasta que se capture).

## Descargar
- **Excel:** formato F.PM.007 con cabecera PROJECT / PT / CTRL. ENG. y contadores con
  fórmula (Issues, Open, Close, Info). Estatus con color, encabezado fijo, horizontal y
  ajustado a una página de ancho al imprimir.
  - Se puede volver a importar tal cual (probado ida y vuelta).
- **PDF:** misma técnica que el Gantt (ventana de impresión → "Guardar como PDF"), carta
  horizontal, con logo, contadores y el encabezado de la tabla repetido en cada página.
- Ambos usan la lista **tal como está en pantalla**, aunque todavía no se haya guardado.

## API
- `POST /api/projconfig/lop/parse` (archivo .xlsx/.xlsm) — requiere permiso de crear en
  Configurar Proyecto. Solo lee; no guarda.
- `POST /api/projconfig/lop/export` (`{ptsv, jobs, rows}`) → .xlsx — requiere permiso de ver.

## Archivos
- `app.py`: `_lop_parse_sheet()`, `api_projconfig_lop_parse()`, `api_projconfig_lop_export()`.
- `static/app.js`: `pcAddPuntoRow()` (Proyecto, INFO), `pcUpdatePuntosSummary()`,
  `pcGetPuntosData()`, nuevas `pcLop*` (importar, vista previa, aplicar, Excel, PDF).
- `static/index.html`: botones, columna Proyecto, modal `mo-lop-imp`.

## Cómo se probó (Chromium + data_seed, PT-0099)
- `PT0067-LOP-689-01-02.xlsx`:
  - **Hoja 689-01:** 14 puntos (4 OPEN, 10 CLOSE). Aviso de PT distinto y de 4 celdas
    #VALUE! (items 2, 10, 11, 12).
  - **Hoja 689-02:** sin puntos; se muestra deshabilitada.
  - **Hoja 689-01 (2):** 4 puntos; al marcarla solo se suman los 2 INFO (los otros 2 ya
    estaban). Total 16.
- Volver a subir el archivo en modo Agregar → "Importar 0 puntos".
- Guardar y volver a abrir el PT → 16 puntos, con Proyecto e INFO conservados.
- Excel descargado: fórmulas recalculadas sin errores. Al reimportarlo da los mismos 16
  puntos (2 INFO).
- PDF revisado visualmente. Sin errores de JavaScript.
- Un .txt se rechaza con mensaje claro.

## Nota sobre el archivo de ejemplo
Las celdas de COMMENTS de los items 10, 11 y 12 de la hoja 689-01 (y la G del item 2) ya
vienen como `#VALUE!` en el propio Excel, sin fórmula. Ese texto no existe en el archivo
y hay que capturarlo a mano si se necesita.
