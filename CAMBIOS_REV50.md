# rev50 — Filtro de Jobs en Target vs Cost (Dashboard PM) y columnas ancladas en Timing

## 1. Dashboard Project Manager — filtro de Jobs en la gráfica Target vs Cost
- Nuevo botón junto al selector de año (ej. "Open / WIP · 11 Jobs ▾"). Abre un panel con:
  - Buscador por Job, cliente, estatus o año (con el debounce global de 250 ms).
  - Atajos: **Open / WIP**, **Jobs <año>**, **Todos**, **Ninguno** (con la cantidad de cada uno).
  - Lista de Jobs con casilla, cliente y estatus (Open/WIP primero).
  - Se cierra con clic fuera o con Esc.
- **Vista por default: todos los Jobs Open o WIP del PM**, de cualquier año.
- La gráfica se redibuja al instante; no vuelve a consultar al servidor.
- La selección se recuerda por usuario + año mientras la página esté abierta: sobrevive a
  "Actualizar" y a cambiar de año y regresar. Al recargar la página vuelve al default.
- Si la selección queda vacía, la gráfica indica que hay que elegir Jobs en el filtro.

### API
`GET /api/dashboard/project-manager` — cada renglón de `grafica` agrega `customer`, `anio` y
`en_anio`. La lista ahora incluye los Jobs creados en el año **más** los Open/WIP de otros
años (`en_anio: false`), para que el default "Open / WIP" esté completo aunque el Job sea de
un año anterior. Su cálculo ya existía (salen de la misma tabla de Jobs activos).
- La tendencia del margen sigue usando solo Jobs cerrados creados en el año (`en_anio`).

## 2. Configurar Proyecto → Timing — Actividad y Grupo anclados
- Las columnas **Actividad** (240 px) y **Grupo** (150 px) quedan fijas a la izquierda; el
  scroll horizontal mueve de la 3.ª columna (Actividad Previa) en adelante.
- Sombra a la derecha de Grupo para marcar el borde de lo anclado.
- Las celdas ancladas conservan el rayado de la tabla y el tono de las filas de grupo.
- Fila de grupo: el nombre ahora ocupa Actividad + Grupo (antes también Actividad Previa),
  para que quede anclado igual que las actividades. Se agregó una celda vacía para mantener
  las 14 columnas.
- El campo Actividad muestra el nombre completo como tooltip cuando no cabe.
- Sin cambios en los datos guardados (`pcGetTimingData` lee por `data-field`, no por posición).

## Archivos
- `app.py`: `api_dashboard_project_manager()` — pool de `grafica`.
- `static/app.js`: `pmChartsHTML()`, nuevas `pmBarsInit/FilterHTML/Label/BodyHTML/Redraw/
  Toggle/Quick/Search/Open`; `pcAddTimingRow()` y `pcAddGroupRow()` con clases `pc-stk`.
- `static/index.html`: CSS `.pc-timing-tbl .pc-stk*`; clases en la tabla de Timing.

## Cómo se probó (Chromium + data_seed, en copia aparte)
- PM de "Luz Munoz - Persico" con estatus variados (2 cerrados, 1 WIP, 1 cancelado):
  default = 11 Jobs Open/WIP; Ninguno = 0; búsqueda "652" = 5; selección manual 652-51 y
  652-53 → 2 barras; se conserva tras "Actualizar"; Todos = 14.
- Timing a 1280 px con 2 grupos y 5 actividades: con el scroll al final, Actividad queda en
  x=0 y Grupo en x=240; la fila de grupo queda en x=0. Colapsar grupo y
  `pcGetTimingData()` funcionan igual.
- Sin errores de JavaScript nuevos.
