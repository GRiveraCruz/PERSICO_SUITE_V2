# rev99 — Timing: sin día vacío entre actividades, hitos como rombo y duración en días hábiles

## 1. Día vacío entre una actividad y su sucesora (bug)
- **Causa:** la fecha fin se calculaba como inicio + N días, que en realidad es el día
  *siguiente* al último día de trabajo, y la sucesora empezaba un día después de eso.
  Entre una actividad y la siguiente quedaba un día vacío.
- **Corrección:** la **fecha fin es el último día de trabajo (incluido)** y la sucesora
  empieza el **siguiente día hábil**. Ejemplo: Recepción de PO del 3 al 5 de febrero (3
  días) → Kickoff el 6 → Diseño el lunes 9.

## 2. Actividades de duración 0 = hito (rombo)
- Una actividad con **0 días** es un hito: inicia y termina el mismo día y en el Gantt se
  dibuja como **rombo morado** (verde si está cumplido). Al lado aparece "◆ fecha".
- Su sucesora empieza **el mismo día del hito** (no al día siguiente).
- La leyenda del Gantt agrega "Hito (0 días)". También en el PDF del proyecto.

## 3. La duración cuenta solo días hábiles
- "Días estimados" cuenta **solo días hábiles**: sin sábados, domingos ni días festivos de
  ley (los mismos que permisos y vacaciones).
- Si una fecha inicial cae en día no hábil, la actividad empieza el siguiente día hábil.
- Ejemplo: 5 días desde el lunes 9 de noviembre de 2026 → del 9 al 13. La siguiente, de 3
  días, empieza el martes 17 (el lunes 16 es festivo) y termina el jueves 19.

## Dónde aplica
- Tabla del Timing: fecha condicionada y fecha objetivo.
- Diagrama de tiempos (pantalla y PDF) y rango del proyecto (plan de personal).
- Del lado del servidor: dashboards de Ingeniería, Project Manager y Operation Manager,
  KPIs de entrega y fechas del proyecto, con las mismas reglas.
- Los timings guardados no cambian; solo se recalculan sus fechas con estas reglas.
  Proyectos con actividades largas pueden **terminar más tarde** que antes, porque ya no
  cuentan fines de semana ni festivos.

## Probado
- Mismas fechas en pantalla y en el servidor para la secuencia: 5 días → 3 días (con
  festivo de por medio) → hito → 2 días.
- **PT-0099:** Recepción de PO 03–05/02, Kickoff 06/02, Diseño desde el lunes 09/02, sin
  hueco; con 0 días, Diseño aparece como rombo el 09/02.
