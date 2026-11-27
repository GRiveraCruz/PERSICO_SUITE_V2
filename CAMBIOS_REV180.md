# rev180 — Management ▸ KPIs: exportar a PDF

## Qué cambia
- **En Management ▸ KPIs, dos botones nuevos:**
  - **⬇ PDF KPIs generales:** KPIs **globales (toda la empresa)** y **por área**;
  - **⬇ PDF todos:** también los asignados a personas, respetando el filtro de persona.
- **Abre el reporte listo para imprimir;** el botón **"🖨 Imprimir / Guardar como PDF"** lo
  descarga en PDF (tamaño carta).
- **Contenido:**
  - **Encabezado:** logo, año, razón social, alcance, fecha de corte y usuario.
  - **Resumen:** total de KPIs, **en meta**, **en tolerancia** y **fuera de meta**.
  - **Por grupo** (Global, áreas, personas), una tarjeta por KPI:
    - nombre (inglés/español), periodicidad y meta;
    - valor principal coloreado (verde, ámbar o rojo) y "cumplió N de M";
    - último periodo, WIP y emitidas/aceptadas cuando aplica;
    - **gráfica de barras por periodo**, con línea punteada de la meta;
    - tabla de desglose por área, y lista de proyectos en los KPIs por proyecto.
  - Los valores y colores son los mismos del tablero (mismo cálculo, `/api/kpis/resultados`).
- **Permiso:** el mismo de ver KPIs.

## Probado
- **6 KPIs globales** (cotizaciones, aceptación, POs recibidas, ventas mensuales, margen, entrega
  a tiempo) → reporte con 6 tarjetas, resumen (1 en meta, 2 fuera de meta), gráficas por mes y
  trimestre.
- **Exportado a PDF carta** sin errores.
