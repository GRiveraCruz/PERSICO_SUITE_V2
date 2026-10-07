# rev94 — Costo por hora por área operativa y KPIs en el Dashboard de inicio

## 1. Costo promedio por hora: por cada área operativa
- **Cuatro asignaciones nuevas,** una por cada área operativa: Ingeniería Mecánica,
  Ingeniería Eléctrica, Manufactura y Ensamble. Cada una con su propia tarjeta y su propia
  meta, que queda por definir.
  - Se crean solas una vez; si se eliminan, no se vuelven a crear. Si ya existía la de un
    área, no se duplica.
- **La tarjeta global** (las cuatro áreas juntas) agrega una **tabla de desglose por área**:
  costo por hora del último mes cerrado y promedio del año, con el color según la meta.

## 2. KPIs en el Dashboard de inicio
- **KPIs asignados a una persona** → aparecen en el Dashboard de inicio **del usuario
  ligado a esa persona**, en la sección "Mis KPIs".
  - **Nuevo en Administrador ▸ usuario: "👤 Persona en Control de Personal"** para ligar
    cada usuario con su persona.
  - Si un usuario no está ligado, se usan sus nombres de PM (los que ya tiene para su
    Dashboard de PM) contra los identificadores del KPI.
- **KPIs globales o de área** → en la asignación hay un campo nuevo, **"Mostrar en el
  Dashboard de inicio de los perfiles"**, con casillas de General Management, Operation
  Manager, Finance Manager, Human Resources, Project Manager, Purchasing, Engineering,
  Manufacturing, Operative Leading y Administrador.
  - Esos KPIs aparecen en "KPIs de la empresa" para los usuarios de esos perfiles.
  - Cada tarjeta del módulo KPIs indica en qué Dashboards aparece.
- **En el Dashboard de inicio:**
  - el bloque "🎯 KPIs <año>" va arriba del Dashboard del perfil, con cuántos están en
    meta o fuera de meta;
  - si el perfil no tiene Dashboard propio, el bloque reemplaza la pantalla de bienvenida;
  - si el Dashboard del perfil se recarga (por ejemplo, al cambiar filtros), el bloque se
    vuelve a poner solo.
- **Por default ningún KPI global se muestra en Dashboards** hasta que se elijan sus
  perfiles.
- **Permisos:** un usuario ve sus KPIs en su Dashboard aunque no tenga acceso al módulo
  KPIs, que es para configurarlos.

## API
- `GET /api/kpis/mi-dashboard`.
- La asignación acepta `dashboard_perfiles`.
- `PUT /api/admin/users/<u>` acepta `tid`.
- `/api/admin/users` incluye la lista de personal.

## Cómo se probó (PostgreSQL local)
- Las 4 áreas de costo por hora quedaron sembradas (Ensamble ya existía).
- **Desglose global:** Ing. Mecánica $8.23/h, Ing. Eléctrica $9.04/h, Manufactura $8.63/h y
  Ensamble $15.35/h en el último mes.
- **Usuario de RH** ligado a una persona con 6 KPIs personales, y con Asistencia, Rotación y
  Costo por hora visibles para Human Resources:
  - su inicio muestra "Mis KPIs" (6) y "KPIs de la empresa" (3) arriba de su Dashboard de
    RH;
  - al recargar el Dashboard de RH, el bloque se mantiene.
- **Usuario de Ingeniería** (sin KPIs) → sin bloque.
- El modal muestra los perfiles marcados. Sin errores de JavaScript.
