# rev68 — Dashboard del proyecto: estatus de compras

## Qué cambia
- En **Configurar Proyecto → Dashboard** hay una sección nueva, **Estatus de compras**,
  justo debajo de la tabla de Jobs asociados y del pastel de la LOP, antes del Timing.
- **Mismo formato que el Dashboard de Compras:**
  - un renglón por Job;
  - por cada BOM (Electric, Mechanic, Major items, Manufacturing): barras de % reasignado y
    % ordenado, antigüedad relativa, "✓ Completo", "Sin requisición" y alerta ⚠ por más de
    14 días sin movimiento;
  - resumen: Jobs del proyecto, sin requisición, sin movimiento por más de 14 días y %
    ordenado / cubierto promedio;
  - filtros y orden; la búsqueda solo aparece si el proyecto tiene más de un Job;
  - clic en una celda abre esa requisición (Job + BOM).
- **Diferencias con el Dashboard de Compras:**
  - incluye **todos los Jobs del PT/SV**, no solo los WIP, y muestra el estatus de cada Job
    junto a su número;
  - si el proyecto tiene un solo Job, el indicador cambia a "BOMs sin requisición".
- Cada tabla conserva su propio estado de filtros, así que la del proyecto y la de Compras
  no se interfieren.

## Servidor
- El cálculo por Job y BOM pasó a una función compartida, `_req_resumen_jobs()`, que usan
  el Dashboard de Compras y el del proyecto.
  - Verificado: la respuesta de `/api/dashboard/purchasing` es **idéntica** antes y después
    (comparación completa del JSON).
- Nuevo `GET /api/projconfig/compras?jobs=…`, con permiso de ver Configurar Proyecto o
  Requisición de Compra.

## Archivos
- `app.py`:
  - nuevas: `_req_resumen_jobs()`, `api_projconfig_compras()`;
  - cambia: `api_dashboard_purchasing()`, que ahora usa el helper.
- `static/app.js`:
  - `purchWipTableHTML/Inner/Render` ahora reciben un contexto ('purch' o 'pc') y opciones;
  - nueva: `pcDashCargarCompras()`;
  - cambia: `pcRenderDashboard()`, que agrega la sección.

## Cómo se probó (PostgreSQL local, PT-0099 con 652-50 y 665-00)
- La sección aparece entre Jobs asociados y el Timing.
- El filtro "sin movimiento +14 días" muestra solo 652-50.
- El Dashboard de Compras sigue con su propio filtro y sus 4 Jobs WIP.
- Sin errores de JavaScript.
