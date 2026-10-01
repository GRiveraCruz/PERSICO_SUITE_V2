# rev69 — Dashboard ENGINEERING · Permisos por pestaña de Configurar Proyecto

## 1. Dashboard del perfil ENGINEERING
Pantalla de inicio del perfil **ENGINEERING**: **una tarjeta por cada Job en WIP**,
siguiendo el boceto.

- **Encabezado:** número de Job, cliente / descripción, PT/SV y PM.
- **Documentación** del proyecto (pestaña Documentación), con contador N/4:
  - ☑ vigente (con su versión);
  - ☒ eliminada;
  - ☐ pendiente.
- **Fechas:** Run Off interno, Run Off cliente y envío. Las vencidas salen en rojo con ⚠.
- **Tiempo transcurrido y restante:** barra roja (transcurrido) y verde (restante), con días
  y %. Si ya pasó la fecha final, dice "Vencido hace N días".
  - **Arranque:** actividad "Kickoff" del Timing (calculada aunque dependa de actividades
    previas) → F. Inicio del Job → fecha de alta del Job.
  - **Final:** fecha de envío → Run Off cliente → Run Off interno → fin del Timing.
- **Estatus de compras:** una barra por BOM (morado = reasignado, verde = ordenado), %
  cubierto, ✓ si está completo y ⚠ si lleva más de 14 días sin movimiento. Clic abre la
  requisición.
- **Puntos abiertos:** pastel de la LOP del proyecto (abiertos / cerrados / informativos).
- Botón **"Abrir configuración del proyecto"**.
- **Arriba de las tarjetas:**
  - indicadores: Jobs WIP, con documentación incompleta, con fecha final vencida y
    próximo en terminar;
  - búsqueda;
  - filtros: documentación incompleta, fecha final vencida;
  - orden: menos días restantes, menos documentos, Job.
- API: `GET /api/dashboard/engineering`, para ENGINEERING, GENERAL MANAGEMENT,
  OPERATION MANAGER y administrador.

## 2. Pestañas de Configurar Proyecto configurables
- En **Administración → usuarios**, debajo de "Configurar Proyecto", hay un nivel por
  pestaña: Dashboard, Presupuesto, Timing, Puntos Abiertos, Control de Cambios y
  Documentación.
- **Opciones de cada pestaña:**
  - **Igual que Configurar Proyecto** (default): hereda el nivel del módulo. Así ningún
    usuario existente pierde ni gana acceso;
  - **Sin acceso:** la pestaña no aparece;
  - **Ver:** solo lectura, con aviso 🔒. Se ocultan los botones de edición, pero quedan las
    descargas (Excel/PDF de la LOP, imprimir Gantt, ver/descargar documentos);
  - **Crear / Control total:** edita. En Presupuesto, Control total sigue siendo lo que
    muestra los campos de markup y los estimados.
- **Se aplica también en el servidor:**
  - al **Guardar Configuración**, lo de las pestañas sin permiso de edición se conserva
    como estaba guardado, aunque se envíe otra cosa;
  - basta con poder editar una pestaña para poder guardar;
  - subir o eliminar documentos requiere Crear en Documentación; ver o descargar requiere
    Ver.
- Al abrir un proyecto se muestra el Dashboard. Si el usuario no tiene acceso a él, se abre
  la primera pestaña permitida.

## Otros
- Se corrigieron dos errores de JavaScript ("permisos.map / perfilesList.map is not a
  function") que aparecían al iniciar sesión con usuarios sin permiso de Recursos Humanos.

## Archivos
- `app.py`:
  - `MODULES` (6 pestañas);
  - nuevas: `PC_TABS`, `pc_tab_level()`, `pc_tab_can()`, `_timing_fechas()`,
    `_docs_estado_por_ptsv()`, `api_dashboard_engineering()`;
  - cambian: `api_me_perms()` (`projconfig_tabs`), la actualización de permisos (null =
    heredar), `api_create_projconfig()` (conserva las pestañas sin edición) y los permisos
    de Documentación.
- `static/app.js`:
  - nuevas: `loadIngDashboard()`, `ingRender()`, `ingCardHTML()`, `ingAbrirProyecto()`,
    `pcTabLevel()`, `pcAplicarPermisosPestanas()`, `pcAplicarSoloLectura()`;
  - cambian: la matriz de permisos del administrador, `pcSwitchTab()` y `pcSelectPTSV()`.

## Cómo se probó (PostgreSQL local)
- **Usuario ENGINEERING:**
  - dashboard con 4 tarjetas WIP;
  - Kickoff calculado como 06/02/2026, a partir de "Recepción de PO" + 3 días;
  - documentación 3/4 (neumático eliminado);
  - filtro de documentación incompleta.
- **Permisos:** Presupuesto sin acceso, Timing y Documentación con Crear, el resto heredado
  (Ver).
  - Presupuesto no aparece.
  - Puntos Abiertos queda en solo lectura, con Excel visible.
  - Timing se puede editar y Documentación permite subir.
  - Al guardar cambiando la fecha de envío (Presupuesto) y agregando una actividad
    (Timing), **la fecha se conservó** y la actividad sí se guardó.
- Sin errores de JavaScript.
