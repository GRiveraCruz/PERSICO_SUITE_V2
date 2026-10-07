# rev96 — Quote success rate como gráfica de pastel

- La tarjeta **Quote success rate** (tasa de aceptación de cotizaciones) ya no muestra
  barras por trimestre. Ahora muestra una **gráfica de pastel del año** con:
  - en el centro, el total de **cotizaciones emitidas** (enviadas al cliente en el año);
  - **Aceptadas** (verde): Awarded y no rechazadas;
  - **Rechazadas** (rojo): con rechazo registrado;
  - **Pendientes** (gris): emitidas, sin aceptar ni rechazar.
  - Cada parte muestra cantidad y %, y al pasar el mouse sobre el pastel se ve el detalle.
- **Valor grande:** la **tasa del año** = aceptadas ÷ emitidas, con "N de M emitidas".
- **La meta se sigue evaluando por trimestre** ("cumplió X de Y"). Las aceptadas ya no
  cuentan una cotización que se haya rechazado.
- Aplica igual en el módulo KPIs y en el Dashboard de inicio. También a las asignaciones
  por persona: solo las cotizaciones donde es Key Account Manager o Technical Sales.
- **Probado:** 4 emitidas → 2 aceptadas (50 %), 1 rechazada (25 %), 1 pendiente (25 %);
  tasa del año 50 %.
