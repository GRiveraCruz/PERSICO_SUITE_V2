# rev65 — Dashboard Operation Manager: solo Jobs WIP · Tendencia de capacidad mes con mes

## 1. Solo Jobs WIP
- La **lista de Jobs** y el **pastel de puntos abiertos** del Dashboard Operation Manager
  ahora consideran solo Jobs en estatus **WIP**; antes eran Open y WIP.
- Aplica también a la sección Operaciones de General Management y del administrador.
- Los indicadores (Jobs, envíos vencidos, Internal Target, costo actual, resultado
  operativo) se calculan sobre los mismos Jobs WIP.
- El estatus está en una constante (`DASH_OM_STATUS` en `app.py`), por si se quiere volver a
  incluir Open.

## 2. Gráfica de tendencia de capacidad mes con mes
- Líneas por mes del año:
  - **Disponible**: jornada sin festivos ni vacaciones;
  - **Consumida**: horas registradas en proyectos.
- **Selector de área:** Ingeniería Mecánica, Ingeniería Eléctrica, Manufactura, Ensamble o
  **las 4 áreas (total)**.
- **Qué muestra además:**
  - marca de "Hoy";
  - fila de **utilización por mes** (consumida / disponible), en verde, ámbar o rojo;
  - mes pico de consumo;
  - total de enero al mes actual, consumido contra disponible.
  Los meses futuros solo muestran la disponible.
- **Dónde aparece:**
  - en **Operaciones → Capacidad**, después de la gráfica de disponibilidad;
  - en el Dashboard Operation Manager, y por lo tanto también en General Management y en el
    administrador.
- El área elegida se conserva al cambiar entre Capacidad y el dashboard. Cambiar de área no
  vuelve a consultar el servidor.

## Archivos
- `app.py`: `DASH_OM_STATUS` y `api_dashboard_operation_manager()`, que ahora filtra solo WIP.
- `static/app.js`:
  - nuevas: `capChartTendencia()`, `capRepintarTendencia()`;
  - cambian: `capRenderIndices()`, `loadOMSecciones()` y los textos WIP.

## Cómo se probó (PostgreSQL local)
- Con 4 Jobs en WIP y el resto Open, la lista muestra solo los 4 WIP y el pastel suma los
  proyectos con Jobs WIP.
- La tendencia se cambia entre Ingeniería Mecánica, Ensamble y las 4 áreas, tanto en el
  dashboard como en Capacidad.
- Sin errores de JavaScript.
