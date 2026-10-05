# rev80 — Kiosco de Asistencia sobre la misma base de datos (PostgreSQL)

## Contexto
- Antes, la Suite hablaba con el kiosco por HTTP (`ATTENDANCE_URL`), y el kiosco guardaba
  sus trabajadores y registros en archivos JSON.
- Al perderse esos JSON se perdió el vínculo de cada trabajador con su `tid` de la Suite, y
  se rompieron permisos, vacaciones, tareas y asistencia.
- **Ahora el kiosco (v2) vive en la misma base PostgreSQL:**
  - sus trabajadores **son** la tabla `personal`;
  - sus registros están en `kiosco_registros`;
  - la Suite los lee directamente, sin HTTP ni sincronización.

## Cambios en la Suite
- **Modelos nuevos** en `db.py`: `KioscoRegistro`, `KioscoTrabajador`, `KioscoUbicacion`,
  `KioscoUsuario`, `KioscoFirma`, `KioscoConfig`. Tienen las mismas columnas que crea el
  kiosco, así que cualquiera de las dos aplicaciones puede arrancar primero.
- **Detección automática:** el kiosco v2 deja la marca `kiosco_config.kiosco_bd`. Si
  existe, la Suite lee trabajadores y registros de la base; si no (kiosco anterior), sigue
  usando `ATTENDANCE_URL` por HTTP como antes.
- **Asistencia** (registros, trabajadores, Control de Horas y la asistencia del día en el
  Dashboard RH) lee de `kiosco_registros` / `personal`.
  - **Sincronizar trabajadores** ya no es necesario: responde que el kiosco lee Control de
    Personal directamente.
  - **Vincular trabajador:** reasigna al `tid` elegido los registros "sin vincular"
    migrados de los JSON antiguos (`KIOSCO-…`).
  - **Estado:** "modo base_de_datos".
- **Nuevo** `GET /api/vacaciones/externo/<tid>`, con llave `X-Sync-Key`: saldo de
  vacaciones para el kiosco.
  - Ganados por antigüedad (LFT), gozados, saldo y días en solicitudes de vacaciones aún
    no descontadas ni rechazadas.
  - Mismo cálculo que la pantalla de Vacaciones.
- **Corrección de un error que ya existía:** `PUT /api/vacaciones/<tid>` ("+ Días" en
  Vacaciones) tenía el decorador de la ruta sobre la función interna equivocada.
  - Respondía **error 500** y además se saltaba la revisión de permisos.
  - Ahora suma los días correctamente y valida el permiso.
- **Sin cambios:** los endpoints `/api/permisos/externo`, `/api/tareas/externo` y
  `/api/ordenes-servicio/externo` siguen igual. Ya funcionaban contra la base; lo que
  fallaba era el vínculo del lado del kiosco.

## Archivos
- `db.py`: modelos `Kiosco*` (con valores por defecto también en la base).
- `app.py`:
  - nuevas: `_kiosco_bd()`, `_kiosco_workers()`, `_kiosco_records()`, `_att_get()`,
    `api_vacaciones_externo()`;
  - cambian: `api_asistencia_status/sync_workers/records/workers/link_worker`,
    `_ctrl_horas_rows()`, `api_dashboard_rh()` y la ruta de `api_add_dias_gozados()`.

## Cómo se probó (PostgreSQL local, Suite + kiosco v2 en la misma base)
- **Arranque del kiosco con JSON antiguos de prueba:** se migraron 2 usuarios, 1 ubicación,
  la configuración y el PIN de 1 trabajador, 3 registros (1 sin vincular) y la bandera de
  migración. En el segundo arranque no se repitió.
- **Kiosco:**
  - login admin (bcrypt);
  - 12 trabajadores tomados de `personal`, con los de baja marcados;
  - PIN migrado funciona; PIN duplicado rechazado; un trabajador de baja no entra con PIN;
  - jornada y ubicaciones guardadas; alta de trabajador rechazada con el mensaje de la Suite;
  - registro de entrada y PATCH de horas por Job; filtros por fecha y trabajador;
  - export a Excel; notificaciones; firma con contraseña.
- **Kiosco → Suite:**
  - permiso de Vacaciones → PM-0001 en la Suite, "Pendiente Jefe Directo";
  - historial de permisos;
  - saldo de vacaciones: 80 ganados, 4 gozados, 76 disponibles, 3 por aprobar;
  - tareas y órdenes de servicio responden.
- **Suite:**
  - estado = base_de_datos;
  - registros con nombre y área de Control de Personal;
  - trabajador sin vincular listado y vinculado (1 registro reasignado);
  - Control de Horas con las horas por Job del kiosco;
  - Dashboard RH: asistencia del día con 1 presente;
  - "+ Días" en Vacaciones ya responde 200.
- **Pantalla del kiosco:**
  - panel de Trabajadores con el aviso de Control de Personal;
  - editar trabajador con nombre, puesto y área bloqueados y PIN indicado;
  - saldo de vacaciones en Solicitar Permiso.
