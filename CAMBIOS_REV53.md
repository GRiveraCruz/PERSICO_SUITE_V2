# rev53 — Dashboard como primera pestaña y Reporte PDF del proyecto

## 1. Dashboard primero
- La pestaña **Dashboard** es la primera de la barra y la que se abre al elegir un PT/SV
  (antes abría Presupuesto).
- El dashboard se dibuja cuando el Timing guardado ya terminó de cargar, así que el Gantt
  aparece desde la primera vista.
- Al cambiar de PT se descarta cualquier cálculo pendiente del PT anterior. Mientras carga
  se muestra "Cargando dashboard…".

## 2. Reporte PDF del proyecto
- Botón **Reporte PDF** en el encabezado del dashboard. Se habilita cuando termina el cálculo
  del resultado operativo.
- Usa la misma técnica que el Gantt y la LOP: ventana de impresión → "Guardar como PDF".
  Formato carta horizontal, con colores de impresión forzados.
- **Contenido:**
  - Encabezado con logo, PT/SV, cliente, fecha de generación, hora del cálculo y corte de
    Work Hours.
  - KPIs: Jobs y sus estatus, horas planeadas, horas consumidas (%) y resultado operativo
    (% vs Internal Target).
  - Jobs asociados: estatus, horas planeadas y consumidas, Internal Target y resultado
    operativo por Job, más el total. Se marca con * el Job que usa revenue por no tener
    Internal Target.
  - Desglose del resultado operativo del proyecto.
  - Horas por línea de mano de obra: planeadas, consumidas y %, incluidas las "otras" horas
    sin tarifa o sin perfil.
  - Pastel de la Lista de Puntos Abiertos y tabla de los puntos **abiertos**, con la fecha
    compromiso vencida en rojo.
  - En página nueva: Timing con KPIs y el Gantt ajustado al ancho de la hoja.
  - Control de cambios **completo** (en pantalla solo se ven los 8 más recientes).
- Refleja lo que está en pantalla al momento de generarlo, igual que el dashboard.

## Archivos
- `static/index.html`: orden de pestañas; Dashboard visible por default.
- `static/app.js`: `pcCurrentTab = 'dashboard'`, `pcSwitchTab(tab, {sinRender})`,
  `pcSelectPTSV()` abre el Dashboard después de cargar el Timing, `_pcDash`,
  nueva `pcDashReportePDF()`.

## Cómo se probó (Chromium + data_seed, PT-0099)
- Al elegir el PT: pestaña activa Dashboard, primera de la barra, Presupuesto oculta, Gantt
  dibujado y botón PDF habilitado.
- Reporte con 2 Jobs, horas por línea, 16 puntos (4 abiertos), 5 actividades de Timing y 2
  cambios. Genera 2 páginas carta horizontal y se revisó visualmente.
- Sin errores de JavaScript.
