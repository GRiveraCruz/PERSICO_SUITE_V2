# rev71 — Dashboard Project Manager: tarjetas en lugar de la lista de Jobs

## Qué cambia
- En el **Dashboard del Project Manager**, la lista "Jobs Open / WIP" se reemplazó por
  **tarjetas**, las mismas de Operaciones / superadmin:
  - documentación (☑ / ☒ / ☐);
  - Run Off interno, Run Off cliente y envío;
  - tiempo transcurrido y restante;
  - **Resultado**: Internal Target, revenue, costo actual, resultado operativo y
    resultado financiero;
  - estatus de compras por BOM;
  - puntos abiertos;
  - botón para abrir la configuración del proyecto.
- Se muestran **los Jobs Open y WIP del PM**, los mismos que antes tenía la lista. Los Open
  llevan su estatus junto al número.
- **Encima de las tarjetas:**
  - búsqueda;
  - filtros: Solo WIP, Solo Open, resultado operativo negativo, fecha final vencida,
    documentación incompleta;
  - orden: menos días restantes, peor resultado operativo, Job.
- Los indicadores de arriba y las gráficas del PM (estatus, Target vs Cost, tendencia del
  margen) no cambian.
- La vista previa del administrador ("Ver su dashboard") también muestra las tarjetas.

## Sin duplicar código
- **Servidor:** las tarjetas se arman con una sola función, `_ing_cards()`, que usan el
  dashboard ENGINEERING, Operaciones y el PM. `/api/dashboard/project-manager` agrega
  `cards`, `cards_meta` y, en cada Job, `revenue`, `costo_actual`, `resultado_financiero`,
  `financiero_pct` y `runoff_interno`.
  - Verificado: el resto de la respuesta del Dashboard PM es **idéntico** al anterior,
    comparando el JSON completo sin los campos nuevos.
- **Pantalla:** el bloque de tarjetas con filtros es uno solo, `jobCardsBlockHTML(ctx)`.
  Cada dashboard guarda su propio estado de filtros.

## Archivos
- `app.py`:
  - nuevas: `_ing_cards()`, `_ing_meta()`;
  - cambian: `api_dashboard_engineering()`, que ahora usa los helpers, y
    `api_dashboard_project_manager()`.
- `static/app.js`:
  - nuevas: `jobCardsBlockHTML()`, `jobCardsRender()`;
  - cambian: `renderPMDashboard()` y `ingCardHTML()` (estatus si no es WIP).

## Cómo se probó (PostgreSQL local)
- PM "Luz Munoz": 14 tarjetas (Open y WIP), "Solo WIP" deja 3 y la tabla anterior ya no
  aparece.
- Las tarjetas de Operaciones siguen funcionando.
- Sin errores de JavaScript.
