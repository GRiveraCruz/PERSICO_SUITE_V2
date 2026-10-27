# rev130 — Reporte gerencial: proyectos en WIP con las tarjetas del dashboard

- **La sección 2 "Estado de los proyectos en WIP"** ahora muestra **las mismas tarjetas del
  dashboard de inicio** (Operaciones / Engineering), una por Job en WIP, ordenadas por
  menos días restantes. Cada tarjeta trae:
  - Job, cliente, descripción, PT/SV y PM;
  - **documentación** del proyecto (vigente / pendiente);
  - **fechas**: Run Off interno, Run Off cliente y envío, con las vencidas marcadas;
  - **tiempo transcurrido y restante**, con su barra;
  - **resultado**: Internal Target, revenue, costo actual, **resultado operativo** y
    **resultado financiero**;
  - **estatus de compras** por tipo de material;
  - **puntos abiertos** de la LOP.
- **Se mantienen arriba las tarjetas de resumen** (proyectos en WIP, revenue, con envío vencido
  y margen promedio al día).
- **Impresión:** las tarjetas se acomodan en 3 columnas sin cortarse entre páginas, y los
  botones de la pantalla se quitan.
- **Datos y permisos:** salen de los mismos cálculos del dashboard, con los permisos del
  usuario. Si el usuario no tiene acceso a esos datos, o si el reporte se abre con el enlace
  directo, se muestra la tabla de la versión anterior.

## Probado
- **Reporte generado desde el botón:** 3 tarjetas de Jobs en WIP con documentación, fechas,
  tiempo (incluido un Job vencido hace 5 días) y resultado operativo y financiero.
