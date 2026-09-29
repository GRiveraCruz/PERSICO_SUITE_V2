# rev58 — Documentación: eliminar e indicadores en el Dashboard · Timing: reordenar actividades

## 1. Documentación: eliminar archivo
- Botón **Eliminar** en cada documento vigente. Pide confirmación y borra el archivo del
  servidor; no se puede recuperar.
- **Se conserva el conteo de versiones**: si se elimina la v6, el recuadro muestra
  "v6 eliminada · sin documento vigente" y la siguiente subida será la **v7**.
- El historial registra la eliminación (🗑, fecha y usuario).
- API: `DELETE /api/projconfig/documentos?ptsv=&tipo=`. Requiere permiso de eliminar o de
  crear en Configurar Proyecto. Funciona igual con base de datos y en modo local.

## 2. Dashboard del proyecto: estatus de documentos
- Tarjeta **Documentación** debajo de los indicadores principales:
  - "N de 4 documentos con versión vigente", con barra de avance;
  - un indicador por documento: **Vigente** (versión, archivo y fecha), **Pendiente** (nunca
    se ha subido) o **Eliminado** (versión y fecha);
  - liga "Ir a Documentación".
- También aparece en el **Reporte PDF**, en la primera página.

## 3. Timing: subir / bajar actividades
- Flechas ▲ ▼ junto al nombre, en la columna fija, así que siempre se ve qué renglón se mueve.
- **Reglas:**
  - **Actividad de un grupo:** se mueve entre las actividades de ese grupo. En la orilla
    avisa "cambia su Grupo para sacarla".
  - **Grupo:** se mueve **completo**, con todas sus actividades, entre los demás grupos y
    actividades sin grupo.
  - **Actividad sin grupo:** se mueve entre los grupos, saltando el bloque completo, y las
    demás actividades sueltas.
- El renglón movido se resalta un momento. El diagrama de tiempos respeta el nuevo orden de
  grupos y de actividades dentro de cada grupo.
- El orden se guarda con "Guardar Configuración", como el resto del Timing.

### Corrección necesaria para reordenar
Las fechas condicionadas se calculaban en **una sola pasada, de arriba hacia abajo**. Si una
actividad quedaba arriba de su "actividad previa", se quedaba sin fecha. Con las flechas eso
pasaría todo el tiempo.
- Ahora `_pcResolverTiming()` resuelve las fechas **sin importar el orden** de los renglones.
  La usan el cálculo del Timing, el diagrama y el rango del Plan de Personal.
- Si la actividad previa existe pero no tiene fecha (o hay una referencia circular), la
  fecha condicionada dice "sin fecha previa". Si el nombre no existe, sigue diciendo
  "⚠ no encontrada".

## Archivos
- `app.py`:
  - nueva: `api_projconfig_documentos_eliminar()`;
  - cambian: `_doc_meta_publica()` (estado vigente/eliminado) y la descarga en modo local.
- `static/app.js`:
  - nuevas: `pcDocEliminar()`, `pcDashCargarDocs()`, `pcDashDocsHTML()`,
    `_pcResolverTiming()`, `_pcUnidadesTiming()`, `pcMoverTiming()`;
  - cambian: `pcDocsRender()`, `pcUpdateTimingCalcs()`, `pcGetTimingDateRange()`,
    `pcAddTimingRow()`, `pcAddGroupRow()`, `pcRenderDashboard()`, `pcDashReportePDF()`.
- `static/index.html`: estilos de los botones ▲ ▼.

## Cómo se probó
- **PostgreSQL 16 local:**
  - eliminar el diagrama neumático v6 → recuadro "v6 eliminada", historial con 7 registros;
  - Dashboard "3 de 4" con el neumático en rojo "Eliminado · v6".
- **Modo local:**
  - eliminar → la descarga da 404; eliminar otra vez → "No hay documento que eliminar";
  - volver a subir → v4, con un solo archivo en disco.
- **Timing con la estructura del PT0065:**
  - actividad ↑ dentro de SHIPMENT;
  - grupo SHIPMENT ↑ (se movió completo, arriba de PURCHASING);
  - actividad suelta ↑ dos veces (saltó el bloque SHIPMENT completo);
  - KICKOFF ↑ en la orilla del grupo → aviso.
  - Con "Run Off Interno" arriba de su actividad previa, todas las fechas se siguen
    calculando bien.
- Sin errores de JavaScript.
