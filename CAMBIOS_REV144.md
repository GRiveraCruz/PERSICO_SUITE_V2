# rev144 — Proyectos ▸ Línea de tiempo WIP

## Qué es
- **Opción nueva en el menú Proyectos: "Línea de tiempo WIP".** Muestra en un diagrama de Gantt la vida
  de **cada Job en WIP**, desde su inicio hasta su envío, con sus hitos.

## Qué muestra por Job
- **Barra de inicio → envío:**
  - **azul oscuro** = tiempo transcurrido hasta hoy;
  - **azul claro** = lo que falta;
  - **▼** = fecha de envío.
  - Sin fecha de envío, la barra va rayada hasta hoy.
- **Fechas usadas:**
  - **inicio:** Configurar Proyecto (F. Inicio) → si no hay, la fecha de la primera CPO → si no,
    el alta del Job;
  - **envío:** Configurar Proyecto (F. Envío) → si no hay, la Ship Date del Job.
- **◆ Run Off interno y Run Off cliente** (ámbar; rojo cuando la fecha ya pasó).
- **● Milestones de pago** (Términos de pago): **verde** = cumplido, **gris** = pendiente,
  **rojo** = vencido sin cumplir. Al pasar el mouse se ven el nombre, el %, la fecha y la orden de
  cobro.
- **Columna izquierda:** Job, **estado**, % del tiempo transcurrido, cliente, descripción, PT/SV,
  PM y fecha de envío.
- **Clic en el Job** → despliega las **actividades del Timing** de su PT/SV como sub-barras
  (inicio → fecha objetivo): **verde** = terminada (✔ en la fecha real), **rojo** = atrasada,
  **azul** = en curso o por iniciar. Muestra el recurso.
- **Línea roja vertical = hoy.** Al abrir, la vista se coloca alrededor de hoy.

## Estados (color del borde y tarjetas de resumen)
| Estado | Cuándo |
|---|---|
| **Atrasado** | la fecha de envío ya pasó |
| **En riesgo** | alguna actividad del Timing está atrasada o un Run Off ya pasó |
| **Por enviar** | faltan 14 días o menos para el envío |
| **En tiempo** | todo lo demás, con fecha de envío |
| **Sin fecha de envío** | sin F. Envío ni Ship Date |

- **Los Jobs se ordenan** del más crítico al menos crítico y por fecha de envío.

## Controles
- **Búsqueda** por Job, cliente, descripción o PT.
- **Filtros** por PM y por estado; las tarjetas de resumen también filtran al hacer clic.
- **Escala:** meses, semanas (con los lunes marcados) o días.

## Notas
- **El Timing es del PT/SV,** así que todos los Jobs de una misma configuración muestran las mismas
  actividades, y una actividad atrasada pone "En riesgo" a todos.
- **Los Run Off no tienen campo de "realizado":** se marcan en rojo cuando su fecha ya pasó. Si se
  quiere distinguir los ya realizados, se puede agregar esa casilla en Configurar Proyecto.
- **Permisos:** módulo `proj-timeline` (pestaña Configurar Proyecto de los permisos). Mientras no
  se le fije un nivel, toma el de Configurar Proyecto.
- **API:** `GET /api/timeline-wip` (`?estatus=TODOS` incluye los Jobs que no están en WIP).

## Probado
- **4 Jobs en WIP:**
  - **652-50 Atrasado** (envío hace 5 días, 103 %), con Run Offs, 2 milestones (anticipo cumplido y
    aceptación vencida) y 3 actividades (Diseño terminado ✔, Compras atrasada, Ensamble en curso);
  - **665-00 En riesgo**;
  - **612-08 Por enviar** (10 días);
  - **559-99 En tiempo**.
- Las vistas por meses y por semanas funcionan, y el despliegue de actividades también.
