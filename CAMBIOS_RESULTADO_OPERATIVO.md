# Cambios — Resultado operativo unificado (rev12 → rev13)

Criterio confirmado: el resultado operativo **sí resta los servicios**
(viáticos + gastos de viaje + envíos de mensajería).

Fórmula única:
  base (presupuesto disponible de Configurar Proyecto, o revenue)
  − mano de obra − compras − servicios − reasignaciones + recuperaciones

| Dónde | Antes | Ahora |
|---|---|---|
| Job Report — pantalla (tarjeta "Gross Margin Operativo") | no restaba servicios | resta |
| Dashboard de Project Manager | no restaba servicios | resta |
| Job Report — PDF | ya restaba | sin cambio |
| Multi-Job Report | ya restaba | sin cambio |

## Archivos
- `static/app.js`: cálculo de `grossOp` en el Job Report y texto al pie del dashboard PM.
- `app.py`: cálculo en `api_dashboard_project_manager()`, que además regresa `svc_total` por Job.

## Cómo se probó
Job 612-08 con un viático de prueba de $1,234.50:
5,900 − 311.54 − 1,234.50 = **4,353.96**. Se obtuvo el mismo valor en la tarjeta del
Job Report en Chromium, en el Multi-Job Report y en el Dashboard PM.

En los Jobs sin servicios cargados el resultado no cambia (en data_seed ningún Job
Open/WIP tiene servicios hoy).
