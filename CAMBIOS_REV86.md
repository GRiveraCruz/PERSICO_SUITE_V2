# rev86 — Mano de Obra: reasignar horas de un Job a otro

En **Recursos Humanos → Mano de Obra (Work Hours)** hay un botón nuevo,
**"↔ Reasignar horas"**, debajo de "Cargar Excel".

## Flujo
1. **Job actual:** se escribe el Job que se quiere mudar (con autocompletado de Jobs) y se
   pulsa "Buscar registros" o Enter. Se muestran el cliente, la descripción y el estatus
   del Job. Si el código no existe en Jobs (por ejemplo, una captura con error), se avisa,
   pero se pueden mover sus horas igual.
2. **Registros asociados:** se listan todos los registros de horas con ese Work Code, de
   **todos los años**, con fecha, empleado, horas y descripción. Todos vienen marcados;
   se desmarcan los que no deben moverse. Abajo se muestra el resumen: registros y horas
   seleccionadas.
3. **Nuevo Job:** se escribe el Job destino (con autocompletado). Debe existir en Jobs y
   ser distinto del actual; se muestra su cliente, descripción y estatus.
4. **Alerta:** antes de cambiar, se muestra un mensaje con el número de registros, las
   horas, los empleados y "Job actual → Job nuevo", y se explica que el costo de mano de
   obra pasa al Job nuevo (Job Report, dashboards, KPIs y capacidad).
5. **Cambio:** se reemplaza el Work Code de los registros elegidos por el Job nuevo y se
   recarga la tabla.

## Seguridad y trazabilidad
- Cada registro movido guarda su **bitácora** en `reasignaciones`: Job anterior, Job
  nuevo, fecha y usuario. El servidor también deja una línea en el log.
- Solo se cambian registros que **siguen teniendo** el Job actual. Si otra persona los
  cambió mientras tanto, no se tocan y se informa cuántos.
- Todo se hace en una sola operación con candado por año: o se cambian todos, o ninguno.
- Requiere permiso de **Crear** en Work Hours.

## API
- `GET /api/wh/por-job?job=` — registros del Job en todos los años.
- `POST /api/wh/reasignar` — `{origen, destino, registros: [{year, id}]}`.

## Cómo se probó (PostgreSQL local)
- 652-50 → 851 registros. Se movieron 3 (10.2 h) a 665-01: 652-50 quedó con 848 y
  665-01 con 3.
- Mismo Job o un Job que no existe → rechazado con mensaje.
- La alerta mostró registros, horas, empleados y origen → destino.
- Sin errores de JavaScript.
