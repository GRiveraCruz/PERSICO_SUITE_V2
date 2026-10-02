# rev79 — Lista de Puntos Abiertos: modal del punto con notas y avances

## Qué cambia
- En **Configurar Proyecto → Puntos Abiertos**, cada fila tiene un botón **🔍 N** (número
  del punto) que abre el punto en un **modal grande**.
- **Columna izquierda (datos del punto, editables):**
  - Descripción y **Notas** en cajas de texto amplias;
  - Proyecto, Tool / Frame, Responsable y Estatus;
  - fechas de apertura, compromiso y finalización;
  - indicador de tiempo: "Abierto hace N días", "Cerrado en N días" o "⚠ Compromiso
    vencido hace N días".
- **Columna derecha — bitácora de AVANCES:**
  - se escribe el avance y se agrega con el botón o **Ctrl+Enter**;
  - cada avance queda con **usuario, fecha y hora, y el estatus del punto** en ese momento;
  - se muestran del más reciente al más antiguo y se pueden quitar (✕).
- **Aplicar cambios:** pasa lo editado a la fila de la tabla.
  - Si se cambia a CLOSE sin fecha de finalización, se pone la de hoy.
  - Un avance escrito pero no agregado también se registra.
- **◀ Anterior / Siguiente ▶** recorre los puntos sin cerrar el modal, aplicando lo editado.
- Todo queda registrado con **"Guardar Configuración"**, igual que el resto de la pestaña.
- **En la tabla,** debajo del número aparece "N avances · fecha del último".
- **Solo lectura:** con permiso "Ver" en la pestaña, el modal se puede abrir para consultar,
  pero no se edita ni se agregan avances.
- **Descargar Excel (F.PM.007):** agrega la columna **PROGRESS LOG** con la bitácora de
  avances (fecha, usuario y texto). Al reimportar el archivo se ignora.

## Datos
- Cada punto guarda `avances: [{fecha, usuario, texto, estatus}]` dentro de
  `puntos_abiertos` de la configuración. No hay tablas nuevas.

## Archivos
- `static/index.html`: modal `mo-pc-punto`.
- `static/app.js`:
  - nuevas: `pcPuntoAbrir()`, `pcPuntoAplicar()`, `pcPuntoAgregarAvance()`,
    `pcPuntoBorrarAvance()`, `pcPuntoNavegar()`, `pcPuntoRenderAvances()`,
    `pcPuntoInfo()`, `pcPuntoMarcarAvances()`;
  - cambian: `pcAddPuntoRow()` y `pcGetPuntosData()` (avances) y la excepción de solo
    lectura.
- `app.py`: columna PROGRESS LOG en `api_projconfig_lop_export()`.

## Cómo se probó (PostgreSQL local, PT-0099)
- Se abrió el punto 11 y se editaron las notas.
- Se agregaron 2 avances (botón y Ctrl+Enter) y se cambió a CLOSE.
- Al aplicar, la fila tomó notas, estatus y fecha de finalización de hoy, con
  "2 avances · 02/10".
- El resumen pasó de 4 a 3 abiertos.
- Se guardó la configuración y, al reabrir el PT, los 2 avances y el estatus seguían ahí.
- Sin errores de JavaScript.
