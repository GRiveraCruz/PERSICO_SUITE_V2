# rev78 — BOM: formato de listas (PURCHASED / DETAILS), NOTAS, GRUPO, nuevo cajetín, V000, STP y guardado por lote

## 1. NOTAS (todos los BOM)
- Columna **Notas al final de la tabla** en Eléctrico, Mecánico, Comp. mayores y Manufactura.
  - En los BOM de compra se edita en la tabla y se guarda al salir del campo.
  - En Manufactura se guarda con el botón "Guardar cambios".
- **Plantilla de carga:** NOTAS es la última columna. Al subir el Excel se lee
  NOTAS / NOTES / COMMENTS / OBSERVACIONES.
- Sale también en el respaldo en Excel (última columna).

## 2. BOM con el formato de listas (5260-0000-TOOL)
- **Mecánico (y Eléctrico / Comp. mayores) = hoja PURCHASED:** Item · Responsible · Date
  released · Vendor · Marca · No. Parte · Descripción · Cantidad · UoM, más Estatus,
  Solicitante, Comprador, En stock y Notas.
  - **Plantilla nueva:** ITEM, JOB#, RESPONSIBLE, DATE RELEASED, VENDOR, BRAND, PART #,
    DESCRIPTION, QTY., UoM, STATUS, NOTAS (título "PURCHASED COMPONENTS" como en la lista).
  - **Al subir un libro con varias hojas** se toma la hoja **PURCHASED** para el BOM Mecánico
    y **CONTROLS** para el Eléctrico, aunque no sean la hoja activa. Probado con
    `5260-0000-TOOL_20260813.xlsx`: 15 componentes con Responsible "CART", Date released
    27/07/2026, marca, número de parte y cantidad.
  - Si un renglón ya existía, sus Responsible / Date released / Vendor / UoM / Notas vacíos se
    completan con lo del archivo.
- **Manufactura = hoja DETAILS:** Item · Responsible · Date released · Vendor · DETL # · Rev ·
  Description · Material · Finishing · **Product group (GRUPO)** · Qty · Qty mirror, más
  Fabricación, Estatus, STP, Solicitante y Notas.
- JOB# no se repite en la tabla porque es el Job seleccionado, pero sí sale en el respaldo en
  Excel.

## 3. GRUPO y pegado desde Excel (Manufactura)
- Responsible, Date released, Vendor, Description, Material, Finishing, **Grupo**, Qty, Qty
  mirror y Notas se capturan en la misma tabla. Fabricación y Estatus son listas.
- **Pegar una columna de Excel:** se copian varias celdas de una columna, se hace clic en el
  campo de la primera fila y se pega (Ctrl+V).
  - Los valores se reparten hacia abajo, uno por fila.
  - Se saltan las filas bloqueadas (con orden de compra o de producción).
  - Si sobran valores, se avisa.
  - Si se copian varias columnas, se toma la primera.
  - Funciona en cualquier columna editable.

## 4. Manufactura: botón "💾 Guardar cambios"
- Ya no se guarda al cambiar cada dato.
- **Mientras se edita:**
  - los campos cambiados se marcan en ámbar;
  - la barra superior dice cuántos cambios hay sin guardar y en cuántas piezas;
  - "Descartar" deshace todo.
- **Al guardar,** todos los cambios se envían en una sola operación (`POST /api/requisiciones/lote`),
  con las mismas validaciones que antes (orden de producción, piezas compradas al 100%,
  estatus válidos).
  - Si alguna pieza no se puede guardar, se dice cuál y por qué. Esa pieza queda pendiente y
    las demás sí se guardan.
- **Se pide confirmación** antes de cambiar de BOM o de Job, o de salir de la página, con
  cambios sin guardar. También antes de subir PDF/STP, porque al terminar se recarga la tabla.

## 5. Nuevo cajetín (lectura del PDF)
- Los PDF de SolidWorks traen el texto como "(cid:N)": las fuentes no van incrustadas ni
  tienen tabla de caracteres. El lector anterior no podía leerlos.
  - Ahora se decodifican: Century Gothic / Tahoma / Arial = código − 29; fuente de
    SolidWorks (SWIsop) = − 32, minúsculas − 33.
- **Del cajetín se lee:** **DETAIL#**, **REVISION**, DESCRIPTION, MATERIAL, FINISH y WEIGHT.
- **El ID de la pieza es el DETAIL# del cajetín.** Si no se encuentra, se usa el nombre del
  archivo; si no coinciden, se avisa y manda el DETAIL#.
- Probado con los 3 planos de ejemplo:

  | DETAIL# | Descripción | Material | Acabado | Peso | Origen |
  |---|---|---|---|---|---|
  | 685-00-D1001 | BASE FRAME | STL-WELDMENT | PAINTING RAL 5015 | 459732.595 | USA |
  | 685-00-D1002 | MAIN PLATE | ALUMINUM 6061 | POLISHED | 46440.091 | USA |
  | 685-00-D1003 | PIN | STL-HRS | BLACK OXIDE | 72.8 | USA |

## 6. Números de plano México / USA
- **Formatos reconocidos del DETAIL#:**
  - **MX:** NNNN-D#### (5257-D1002);
  - **USA:** NNN-NN-D#### (689-01-D1008);
  - **STD-MX:** NNN-STD-D#### (689-STD-D0008);
  - **STD-USA:** STD-### o STD-D#### (STD-017, STD-D0353).
  - La letra puede ser D (detalle) o A (ensamble). Una **S al final** = pieza espejo
    (mirror), como en la hoja DETAILS (5260-D2002S).
- Cada pieza muestra su **origen** (color) bajo el DETL#, y "mirror" si aplica.
- **Avisos:**
  - DETAIL# que no cumple ningún formato;
  - USA cuyo prefijo NNN-NN no es el Job;
  - MX cuyos 4 dígitos no son los del Job.
- Los patrones están en `PLANO_FORMATOS` (`app.py`) por si hay que ajustarlos.

## 7. Revisiones: V000 y letras
- **La versión original es V000.** La primera vez que se sube un plano queda como V000 (antes
  era A). A partir de la segunda versión se usan letras: A, B, C…
- **Orden para decidir la revisión:**
  1. lo que diga el cajetín en REVISION (V000, A, B…);
  2. si está vacío, el sufijo del nombre del archivo: `5258-D1050_revA.pdf` → A (los
     archivos originales no llevan sufijo);
  3. si no hay nada: V000 si es la primera vez, o la letra siguiente con aviso.
  4. Subir **el mismo archivo** otra vez (mismo contenido) conserva su revisión y solo
     reemplaza el archivo.
- Si el cajetín y el nombre del archivo indican revisiones distintas, se avisa y manda el
  cajetín.
- Si ya existe la revisión, se reemplaza su archivo y se avisa.
- Solo la revisión más reciente actualiza Description / Material / Finishing / Peso.
- **Al descargar el PDF:** la V000 conserva el nombre original (`685-00-D1002.pdf`) y las
  revisiones llevan `_revX`.
- Las piezas que ya existían conservan sus revisiones (A, B…) tal como estaban.

## 8. Archivos STP / STEP
- **Masivo:** botón "🧊 Subir STP (masivo)" en la barra de Manufactura.
  - Cada archivo se liga a la pieza cuyo DETAIL# coincide con el nombre del archivo, sin
    extensión ni `_revX`.
  - La revisión sale del sufijo `_revX`; sin sufijo es la revisión vigente del plano.
- **Por pieza:** ⬆ en la columna STP. Se liga a esa fila aunque el nombre no coincida, con
  aviso.
- **Archivos sin pieza correspondiente:** se listan y **no se guardan**.
- **Avisos:** cuando el STP es de una revisión que no tiene plano PDF, y cuando se reemplaza
  el STP de la misma revisión.
- **Guardado:** tabla nueva `requisicion_stp`, en la base de datos (se crea sola), hasta
  60 MB por archivo.
- La columna STP muestra el más reciente para descargar y cuántos hay.

## API
- `POST /api/requisiciones/lote`.
- `POST /api/requisiciones/stp` y `GET /api/requisiciones/stp/<id>`.
- `PUT /api/requisiciones/<id>` acepta `notas`, `responsable`, `vendor`, `uom`,
  `fecha_liberacion` y `grupo`.
- La lógica de actualización pasó a `_req_actualizar_renglon()`, que comparten la edición
  individual y el lote.

## Archivos
- `db.py`: modelo `PlanoSTP`.
- `app.py`:
  - nuevas: `_pdf_texto_cid()`, `PLANO_FORMATOS` / `_plano_formato()`, `_rev_orden()`,
    `_rev_normalizada()`, `_rev_de_nombre()`, `_req_actualizar_renglon()`, endpoints de
    lote y STP;
  - cambian: `_extraer_cajetin()`, carga de planos, carga de Excel, plantilla y respaldo en
    Excel.
- `static/index.html`: encabezado de la tabla de compra y estilo de los campos modificados.
- `static/app.js`:
  - nuevas: `reqGuardarNota()`, `reqManufStage()`, `reqManufGuardar()`,
    `reqManufPaste()`, `reqSubirSTP()`, `reqManufToolbarHTML()`;
  - cambian: `reqRenderManuf()` (reescrita) y la tabla de compra.

## Cómo se probó (PostgreSQL local)
- **Plantilla:** columnas nuevas con NOTAS al final.
- **Libro TOOL al BOM Mecánico:** toma la hoja PURCHASED; 15 renglones con Responsible
  CART, Date released 27/07/2026 y marca.
- **3 PDF de ejemplo:** V000, origen USA, datos completos del cajetín.
- **Segunda carga:**
  - el mismo D1002 → V000 reemplazada;
  - `685-00-D1002_revA.pdf` → A;
  - D1003 con otro nombre → V000 por DETAIL#, con aviso.
- **STP:** `685-00-D1002.stp` → D1002 rev A; `685-00-D1001_revA.step` → D1001 rev A, con
  aviso de que no hay PDF A; `NOEXISTE.stp` → sin pieza.
- **Lote:** 3 piezas, una con estatus inválido. Se guardaron 2, se reportó la tercera y no
  se tocó.
- **Navegador:**
  - pegar 3 valores en GRUPO llena 3 filas;
  - "Guardar cambios" guarda (incluido lo recién escrito);
  - cambiar de BOM con cambios pide confirmación;
  - las notas del BOM Mecánico se guardan al salir del campo.
- **Respaldo Excel de Manufactura:** columnas de DETAILS más STP y NOTAS.
- Sin errores de JavaScript.
