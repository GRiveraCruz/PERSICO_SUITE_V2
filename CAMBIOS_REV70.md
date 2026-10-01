# rev70 — Operaciones / superadmin: tarjetas de Jobs WIP con resultado operativo y financiero

## Qué cambia
- En el **Dashboard del Operation Manager** y en la sección **Operaciones** del dashboard de
  **General Management / superadministrador**, la **lista de Jobs WIP se reemplazó por
  tarjetas**. Son las mismas del dashboard ENGINEERING:
  - documentación (☑ / ☒ / ☐);
  - Run Off interno, Run Off cliente y envío;
  - tiempo transcurrido y restante;
  - estatus de compras por BOM;
  - puntos abiertos;
  - botón para abrir la configuración del proyecto.
- **En estas tarjetas se agrega la sección "Resultado":**
  - Internal Target (o "Sin config."), revenue y costo actual;
  - **Resultado operativo** = Internal Target − costo actual. Si el Job no está configurado,
    se mide contra el revenue, igual que antes en la lista;
  - **Resultado financiero** = revenue − costo actual, igual que el Gross Margin del
    Job Report. El revenue es la Customer PO de todos los años o, si no hay, el revenue
    del Job.
  - Fondo verde si es positivo, rojo si es negativo, con su %.
- **Costo actual** = mano de obra + compras + servicios + reasignaciones − recuperaciones,
  de toda la vida del Job.
- **Encima de las tarjetas:**
  - búsqueda;
  - filtros: resultado operativo negativo, fecha final vencida, documentación incompleta;
  - orden: menos días restantes, **peor resultado operativo**, Job.
- Se mantienen los indicadores de arriba, el pastel de puntos abiertos y las gráficas de
  capacidad.

## Servidor
- `/api/dashboard/operation-manager`: cada Job agrega `revenue`, `resultado_financiero` y
  `financiero_pct`.
- `_dash_job_row(..., con_revenue=True)`: el Dashboard PM no cambia porque no pide el
  revenue.

## Archivos
- `app.py`: `_dash_job_row()` y `api_dashboard_operation_manager()`.
- `static/app.js`:
  - nuevas: `ingFinHTML()`, `omCardsHTML()`, `omCardsRender()`;
  - cambian: `ingCardHTML(c, d, fin)` y `loadOMSecciones()`.

## Cómo se probó (PostgreSQL local)
- Operation Manager y superadmin ven 4 tarjetas WIP y ya no aparece la tabla anterior.
- El filtro "resultado operativo negativo" deja 2.
- Resultado financiero de 652-50: $136,661, igual al Gross Margin del Job Report
  (revenue $248,000 − costo $111,339).
- Sin errores de JavaScript.
