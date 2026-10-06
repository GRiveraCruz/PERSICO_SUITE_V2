# rev85 — KPIs por proyecto: cuándo se considera cerrado un Job

## Problema
- Los KPIs por proyecto (margen, entrega en tiempo, ahorro en compras, eficiencia de horas)
  solo tomaban Jobs con **Closing Date** capturada en el Job.
- En la pantalla de Jobs, el estatus de cierre es **"Done"**. Un Job marcado como Done sin
  Closing Date, como los 665-0x, no aparecía en ningún KPI, y además sin ningún aviso.

## Corrección
- **Job cerrado:** estatus **Done** (también Closed / Cerrado de capturas o importaciones
  anteriores) o con Closing Date. Los **Cancelled** nunca cuentan.
- **Fecha de cierre efectiva:**
  1. la Closing Date del Job;
  2. si no tiene, la del **último registro de horas** del Job;
  3. si no tiene horas, su última actualización.
  En el detalle del proyecto se indica de dónde salió la fecha.
- **Al guardar un Job como Done sin Closing Date**, se pone la fecha de ese día de forma
  automática (`closing_date_auto`). Así, de aquí en adelante, los Jobs cerrados siempre
  tienen fecha.
- **Proyectos cerrados que no se pudieron calcular:** se listan en la tarjeta del KPI
  ("⚠ N proyecto(s) cerrado(s) sin dato para calcular"), con el motivo:
  - no está en ninguna Configuración de Proyecto (no hay horas planeadas ni Target Compras);
  - sin horas planeadas en Configurar Proyecto;
  - sin horas registradas en Work Hours;
  - sin Target Compras;
  - sin fecha de envío comprometida (para Entrega en tiempo);
  - Done sin Closing Date ni registros de horas: captura la fecha de cierre en el Job.

## Cómo se probó (PostgreSQL local)
- **665-01 y 665-02 en Done sin Closing Date ni horas:** antes no aparecían en ningún lado.
  Ahora aparecen en "sin dato para calcular", con el motivo y la indicación de capturar la
  fecha.
- **652-50 en Done con Closing Date:** eficiencia de 74.6 % (4,500 h planeadas / 6,035 h
  usadas), sin cambios.
- **Guardar 665-00 como Done sin fecha:** se asignó la Closing Date automáticamente.
