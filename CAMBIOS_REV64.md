# rev64 — Dashboard del Operation Manager (también en General Management y administrador)

## Qué muestra
Pantalla de inicio del perfil **OPERATION MANAGER**. La misma información aparece como
sección **Operaciones** debajo del dashboard de **General Management** y del
**administrador**.

1. **Indicadores:**
   - Jobs Open/WIP;
   - envíos vencidos;
   - Internal Target total, avisando cuántos Jobs no están configurados y usan su revenue;
   - costo actual total;
   - resultado operativo total y % vs Internal Target.
2. **Lista de Jobs Open y WIP**, de todos los PMs:
   - Job, cliente / descripción, PM y estatus;
   - **Run Off interno**, **Run Off cliente** y **fecha de envío** (de Configurar Proyecto; si
     no hay, la del Job). El envío vencido sale en rojo;
   - **Internal Target**, **costo actual** y **resultado operativo**.
   - Mismo cálculo que el Job Report y el Dashboard PM, con la vida del Job (todos los años):
     costo actual = mano de obra + compras + servicios + reasignaciones − recuperaciones, y
     resultado operativo = Internal Target (o revenue) − costo actual.
3. **Pastel de puntos abiertos:** suma de las LOP de los proyectos que tienen algún Job
   Open/WIP, **abiertos vs cerrados**.
   - Los puntos INFO se informan aparte.
   - Al lado va la lista de proyectos con más puntos abiertos.
4. **Capacidad y disponibilidad** de las 4 áreas (Ing. Mecánica, Ing. Eléctrica,
   Manufactura, Ensamble), con los mismos cálculos de Operaciones → Capacidad:
   - indicadores: capacidad disponible, capacidad a la fecha, planeadas, registradas,
     utilización y carga pendiente;
   - gráficas de disponibilidad por mes, horas consumidas por mes y horas planeadas por área;
   - selector de año y enlace "Ver detalle en Capacidad".

## Permisos
- `GET /api/dashboard/operation-manager`: administrador, OPERATION MANAGER o
  GENERAL MANAGEMENT.
- `GET /api/capacidad/indices` también se permite a esos perfiles, aunque no tengan permiso
  de ver el módulo de Capacidad. Solo se usa para leer las gráficas.

## Sin duplicar cálculos
- El renglón de cada Job (fechas, targets y resultado operativo) pasó a una función
  compartida, `_dash_job_row()`, que usan el Dashboard PM y el del Operation Manager.
- Verificado: la respuesta del Dashboard PM es **idéntica** antes y después (comparación
  completa del JSON).

## Archivos
- `app.py`:
  - nuevas: `_dash_job_row()`, `_cfg_por_job()`, `api_dashboard_operation_manager()`,
    `_puede_dash_om()`;
  - cambian: `api_dashboard_project_manager()` (usa el helper) y el permiso de
    `api_capacidad_indices()`.
- `static/app.js`:
  - nuevas: `loadOMDashboard()`, `loadOMSecciones()`;
  - cambian: `initHomeDashboard()` (perfil OPERATION MANAGER) y `renderGMDashboard()`
    (agrega la sección Operaciones).

## Cómo se probó (PostgreSQL local)
- Se creó un usuario con perfil OPERATION MANAGER:
  - ve su dashboard con 40 Jobs Open/WIP, el pastel (4 abiertos / 10 cerrados, 2 INFO) y la
    capacidad;
  - un PROJECT MANAGER recibe 403 en el endpoint.
- El administrador ve su dashboard de General Management con la sección Operaciones abajo.
- Sin errores de JavaScript.
