# rev152 — Las reasignaciones de Stock son ahorro (no restan a los resultados)

## Criterio
- **Las reasignaciones** (material tomado de Stock para un Job) **siguen siendo parte del costo
  del proyecto**, pero **no representan presupuesto ejercido**.
- **Se presentan como ahorro:** ya **no restan** al Gross Margin ni a los resultados operativos.
- **Fórmulas:**
  - **Presupuesto ejercido** = mano de obra + compras + servicios − recuperaciones;
  - **Costo total del proyecto** = presupuesto ejercido + reasignaciones;
  - **Gross Margin / resultados** = base (revenue o Internal Target) − presupuesto ejercido.

## Dónde aplica
- **Job Report:**
  - Gross Margin (`cost` = presupuesto ejercido; nuevos `costo_total` y `ahorro_reasignaciones`);
  - Gross Margin Operativo vs Internal Target;
  - tabla de reasignaciones en verde.
- **Multi-Job Report:**
  - margen por Job y totales;
  - columna **"Reasign. (ahorro)"** en verde;
  - la tarjeta de Gross Margin muestra "Ahorro por reasignaciones" y el costo total.
- **Dashboards y reportes:**
  - Dashboard del PM / Configurar Proyecto: el **resultado operativo** ya no resta reasignaciones,
    y el detalle las muestra como "Reasignaciones de Stock (ahorro: no resta)";
  - KPIs de margen, Reporte gerencial y proyectos cerrados (usan el mismo cálculo);
  - PDF del Job Report: Gross Margin Operativo sin reasignaciones; la fila de reasignaciones
    aparece como ahorro.

## Ejemplo (pantalla del Multi-Job Report)
- **Job 691-01:** revenue $52,250, WH $2,027.90, compras $45,776.10, reasignaciones $19,500.27,
  recuperaciones $32.09.
  - **Antes:** GM −$15,022.18 (−28.8 %).
  - **Ahora:** GM **$4,478.09 (8.6 %)**, con $19,500.27 de ahorro por reasignaciones.

## Probado
- **Job 652-50** con una reasignación de $500 → el Gross Margin no cambia ($56,661.20).
- **Valores del reporte:** `reassign_total` = `ahorro_reasignaciones` = $500 y `costo_total` =
  $111,838.80.
- **El Multi-Job Report** da el mismo resultado.
