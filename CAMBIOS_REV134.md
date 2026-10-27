# rev134 — Presupuesto: exportar PDF / Excel con el presupuesto disponible y las horas estimadas

## Botones nuevos
- En **Configurar Proyecto ▸ Presupuesto**, arriba de las tarjetas de los Jobs:
  **"⬇ PDF"** y **"⬇ Excel"**.
- **Se exportan los valores que están en pantalla**, aunque todavía no se hayan guardado.

## Contenido
- **Resumen del proyecto (PT/SV):**
  - por Job: **Internal Target (presupuesto disponible)**, materiales y servicios
    (disponible), mano de obra estimada, **horas estimadas**, suma de estimados y **delta vs
    Internal Target**;
  - totales del proyecto;
  - **materiales y servicios del proyecto** por rubro;
  - **horas por línea de mano de obra** del proyecto.
- **Detalle por Job:**
  - fechas (inicio, Run Off interno y cliente, envío) e Internal Target;
  - **disponible por rubro** (material mecánico, material eléctrico, componentes mayores,
    servicios externos) con su subtotal;
  - **mano de obra por línea**: perfil, **horas estimadas**, costo promedio USD/h e importe;
    M.O. de proyectos anteriores si existe; subtotales;
  - suma de estimados y delta.
- **No se incluyen** el revenue, el markup ni el costo estimado o % de ahorro de los rubros:
  el documento muestra lo **disponible** para ejecutar el proyecto.

## Formatos
- **PDF:** se abre en una pestaña lista para **imprimir o guardar como PDF**, con el encabezado
  de la empresa, la fecha y el usuario.
- **Excel** (`Presupuesto_<PT/SV>_<fecha>.xlsx`):
  - hoja **"Presupuesto"**: resumen y detalle por Job, con **fórmulas** en totales,
    subtotales e importes (horas × costo);
  - hoja **"Horas por línea"**: líneas de mano de obra × Jobs, con totales, para la
    planeación.
- **Permisos:** quien puede ver la pestaña Presupuesto puede exportarlo.

## Probado
- **PT-0099:**
  - Job 652-50 con markup 20 % y ahorro 5 % → Internal Target **$133,000**;
  - materiales $48,000 (mecánico $18,000 + componentes mayores $30,000);
  - 920 horas (300 diseño mecánico, 120 PLC, 500 ensamble) por $8,032.20;
  - delta $76,967.80.
- **Excel:** descargado con sus 2 hojas.
- **PDF:** resumen, totales por rubro, horas por línea y detalle por Job.
