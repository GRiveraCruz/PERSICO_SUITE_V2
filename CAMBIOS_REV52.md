# rev52 — Dashboard del proyecto (Configurar Proyecto → pestaña Dashboard)

Pestaña nueva **Dashboard**, entre Presupuesto y Timing. Refleja lo que está en pantalla,
incluso cambios sin guardar, igual que el resto de las pestañas. Botón **Actualizar**
para recalcular.

## Qué muestra
1. **PT o SV number**, con su cliente.
2. **Jobs asociados**: tabla con estatus (Open / WIP / Closed / Cancelled; Done y Cerrado
   cuentan como Closed), horas planeadas, horas consumidas con % y resultado operativo por
   Job. La tarjeta superior agrupa los Jobs por estatus.
3. **Horas planeadas**: suma de las horas de las líneas de mano de obra (pestaña
   Presupuesto) de todos los Jobs.
4. **Horas consumidas**: suma de Work Hours de todos los Jobs; es el mismo dato que ya
   muestra Presupuesto. Barra y % contra lo planeado, en verde, ámbar (≥85%) o rojo (>100%).
   - Incluye una tarjeta por línea de mano de obra: consumidas contra planeadas.
   - Se indica aparte cuántas horas son de trabajadores sin tarifa o sin perfil. Cuentan
     en el total, pero no caen en ninguna línea.
5. **Timing**: copia de solo lectura del Gantt de la pestaña Timing, con actividades,
   cumplidas, con retraso, milestones de facturación y periodo.
6. **Pastel de la Lista de Puntos Abiertos**: Abiertos / Cerrados / Informativos. Avisa si
   hay puntos abiertos con fecha compromiso vencida.
7. **Resultado operativo del proyecto**: suma de los Jobs, con % contra el Internal Target
   y desglose.
   - Desglose: base − mano de obra − compras − servicios − reasignaciones + recuperaciones.
   - Misma fórmula que el Job Report y el Dashboard PM.
   - La base es el Internal Target en pantalla. Si un Job no tiene, se usa el revenue y
     se indica.
8. **Resumen del control de cambios**: total, autorizados, en espera y cancelados, más los
   8 cambios más recientes.

## Servidor
- Nuevo `POST /api/projconfig/dashboard` (`{ptsv, jobs:[{job_number, presupuesto_disponible}]}`),
  con permiso de ver Configurar Proyecto. Regresa el estatus de cada Job y su resultado
  operativo con desglose. Origen de la base (`base_origen`): `pantalla`, `guardado` o
  `revenue`.
- El cálculo del resultado operativo se movió a una función compartida `_ro_job()`, junto
  con las cargas por año `_ro_pools_factory()`. La usan el Dashboard PM y el nuevo
  dashboard, así que no hay dos copias de la fórmula.
  - Verificado: la respuesta del Dashboard PM es idéntica antes y después (comparación
    completa del JSON).

## Otros
- El botón "+ Cambio" de Control de Cambios ya no ocupa todo el ancho.

## Archivos
- `app.py`: `_ro_pools_factory()`, `_ro_job()`, `api_projconfig_dashboard()`;
  `api_dashboard_project_manager()` usa el helper.
- `static/app.js`: `pcSwitchTab()` (pestaña dashboard), `pcRenderDashboard()`,
  `pcDashJobsLocal()`, `pcDashPie()`, `pcDashRenderJobs()`, `pcDashCargarServidor()`.
- `static/index.html`: botón y contenedor de la pestaña.

## Cómo se probó (Chromium + data_seed, PT-0099: Jobs 652-50 y 665-00)
- **Resultado operativo:** el de 652-50 ($56,661) coincide con el Dashboard PM.
- **Horas:** con horas capturadas en Presupuesto, las planeadas suman 7,280 h. Las
  consumidas suman 7,663.6 h (105%), con el desglose por línea.
- **Timing:** Gantt con 2 grupos y 5 actividades, 1 cumplida y 2 con retraso.
- **Puntos abiertos:** pastel con 16 puntos (4 abiertos, 10 cerrados, 2 informativos).
- **Control de cambios:** 3 cambios, uno por estatus.
- **Casos límite:** un Job inexistente aparece "sin registro" y un Job Done aparece como
  Closed. Un PT sin Jobs recibe un mensaje claro. Cambiar entre todas las pestañas no da
  errores de JavaScript.
