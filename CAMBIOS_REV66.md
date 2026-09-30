# rev66 — Dashboard de Compras: tabla de requisiciones de Jobs en WIP rediseñada

## Antes → ahora
- **Un renglón por Job**, en lugar de cuatro. Antes eran "OK", última actualización,
  % reasignado y % ordenado, y la mayoría de las celdas quedaban vacías.
- **Cada celda de BOM** muestra:
  - barra de **% reasignado** (morado) y de **% ordenado** (verde), con su porcentaje;
  - antigüedad **relativa** ("hoy", "hace 5 d", "hace 1 mes"); la fecha exacta, los
    renglones y los cancelados se ven al pasar el mouse;
  - **✓ Completo** cuando el BOM está 100% cubierto entre reasignado y ordenado.
- **Estados explícitos** en lugar de celdas vacías:
  - "Sin requisición";
  - "Todo cancelado";
  - un Job sin ningún BOM se colapsa en una franja roja, **"Ningún BOM capturado"**.
- **Alerta de estancamiento:** un BOM con pendientes y más de **14 días** sin movimiento
  muestra su antigüedad en ámbar con ⚠. El umbral está en `PURCH_DIAS_ALERTA`.
- **Columna Job:** cliente, PM y "N de 4 BOMs" con requisición.
- **Resumen arriba:**
  - Jobs WIP;
  - Jobs sin ninguna requisición;
  - Jobs con pendientes sin movimiento por más de 14 días;
  - % ordenado promedio y % cubierto promedio.
- **Búsqueda** por Job, cliente o PM.
- **Filtros:**
  - todos;
  - con pendientes;
  - con algún BOM sin requisición;
  - sin movimiento por más de 14 días.
- **Orden:** menor avance (default; los Jobs sin requisiciones quedan arriba), Job, o sin
  movimiento más tiempo.
- **Clic en una celda:** abre Compras → Requisición de Compra en ese Job y ese BOM, con la
  pestaña ya seleccionada.

## Servidor
- `/api/dashboard/purchasing`: cada BOM agrega `pct_cubierto` (promedio por renglón de
  reasignado + ordenado, tope 100%) y `vivos` (renglones no cancelados).
- Los % existentes no cambian.

## Archivos
- `app.py`: `api_dashboard_purchasing()`.
- `static/app.js`:
  - `purchWipTableHTML()` reescrita;
  - nuevas: `purchWipInner()`, `purchWipRender()`, `purchIrReq()`, `_purchJobInfo()`.

## Cómo se probó (PostgreSQL local)
- Datos: 4 Jobs WIP con requisiciones de prueba (parciales, completas, viejas y un Job sin
  requisiciones).
- **Orden por menor avance:** 612-08 (sin requisiciones), 666-00, 652-50, 665-00.
- **Filtro "sin movimiento +14 días":** 666-00 y 652-50.
- **Búsqueda "665":** solo 665-00.
- **Clic en Mechanic BOM de 652-50:** abre la requisición de 652-50 en la pestaña Mecánico,
  con sus 3 renglones.
- Sin errores de JavaScript.
