# rev54 — Dashboard del proyecto: Desempeño e histórico

Sección nueva **Desempeño e histórico** en el Dashboard, antes del Timing. También se
incluye en el **Reporte PDF**, en página propia.

## 1. Tiempo del proyecto
- **Kickoff**, en este orden de prioridad:
  1. inicio de la actividad "Kickoff" del Timing;
  2. F. Inicio más temprana de Presupuesto;
  3. primera actividad del Timing.
  Se indica el origen.
- **Fecha estimada de finalización**: fin de la última actividad del Timing. Si no hay
  Timing, el Run Off Cliente o la F. Envío más tardía.
  - Si el compromiso de Run Off / Envío es anterior al fin del Timing, se avisa.
- Muestra días transcurridos (y semanas), días restantes o atraso, duración estimada y una
  barra con el % del tiempo transcurrido.

## 2. Indicadores de desempeño
- Barras de tiempo transcurrido, horas consumidas, presupuesto ejercido y puntos cerrados.
- Una raya azul marca el % de tiempo transcurrido. Si horas o presupuesto van arriba de ella,
  la barra sale en ámbar, o en rojo cuando pasa por más de 10 puntos: el proyecto consume
  más rápido de lo que avanza el calendario.

## 3. LOP en el tiempo (semanal)
- Registrados (acumulado), Abiertos (registrados − cerrados a esa fecha) y Cerrados
  (acumulado). Indica la semana en que los cerrados rebasan a los abiertos.
- Solo cuenta puntos OPEN/CLOSE; los INFO se reportan aparte.
- **Fechas faltantes:**
  - sin fecha de apertura: se toma el Kickoff;
  - cerrado sin fecha de finalización: se usa la fecha compromiso o la de apertura.
  La nota dice cuántos puntos quedaron así.

## 4. Horas por área (picos de trabajo)
- Barras apiladas por semana o por mes (selector), una por línea de mano de obra más
  "Otras".
- Usa el mismo criterio que "Horas consumidas" (Work Hours de todos los años, clasificadas
  por el departamento del trabajador), así que el total coincide.
- Indica el periodo pico, el promedio y el total por línea. Al pasar el mouse se ve el
  detalle de cada semana o mes.

## 5. Presupuesto: Internal Target vs gasto ejercido
- Líneas acumuladas por semana:
  - gasto total;
  - mano de obra y compras;
  - Internal Target (línea fija);
  - referencia lineal: de 0 en el Kickoff al target en la fecha estimada de fin.
- Resumen: ejercido, % del target, disponible o excedente, y diferencia contra la
  referencia lineal a hoy.
- El gasto usa **los mismos registros del resultado operativo** y solo les agrega fecha.
  El total acumulado a hoy cuadra con Internal Target − resultado operativo (probado:
  $133,042.49 vs $133,042.50, diferencia de redondeo).
  - Fechas por rubro: Work Hours por fecha trabajada; compras por fecha de recepción
    (si no tiene, fecha del documento); servicios por su fecha; reasignaciones por la fecha
    de la orden; recuperaciones por su fecha de alta.
  - Lo que no tiene fecha se suma en la semana actual.

## Servidor
- `POST /api/projconfig/dashboard` ahora regresa también:
  - `gasto` (por fecha y rubro);
  - `horas_semana` (por lunes de la semana y línea);
  - `horas_sin_fecha` y `lineas`.
- La clasificación de Work Hours por línea pasó a una función compartida,
  `_wh_clasificador()`, que usan Horas consumidas y el Dashboard.
  - Verificado: la respuesta de `/api/projconfig/horas-consumidas` es idéntica antes y
    después (comparación completa del JSON, 1 y 6 Jobs).
- Nuevas funciones `_gasto_fechado()` y `_ro_job(..., detalle=)`.

## Archivos
- `app.py`: `_wh_clasificador()`, `api_projconfig_horas_consumidas()`, `_gasto_fechado()`,
  `_ro_job()`, `api_projconfig_dashboard()`.
- `static/app.js`:
  - nuevas: `pcDashFechasProyecto()`, `pcDashChart()`, `pcDashHistoricoHTML()`,
    `pcDashRepintarHist()`;
  - cambian: `pcRenderDashboard()`, `pcDashCargarServidor()`, `pcDashReportePDF()`.

## Cómo se probó (Chromium + data_seed, PT-0099: 652-50 y 665-00)
- Timing con Kickoff el 09/01/2026 y fin estimado el 28/08/2026: 262 días transcurridos,
  31 de atraso.
- LOP con 14 puntos OPEN/CLOSE y 2 INFO; la nota cubre las fechas faltantes.
- Horas: 7,663.6 h, igual que la tarjeta de horas consumidas. Pico en mayo de 2026.
- Presupuesto: $133,042 ejercidos de $232,805 (57%).
- Reporte PDF de 4 páginas, revisado visualmente. Sin errores de JavaScript.
