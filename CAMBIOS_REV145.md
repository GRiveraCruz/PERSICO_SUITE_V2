# rev145 — Línea de tiempo WIP: reporte en PDF

- **Botón "⬇ PDF"** en Proyectos ▸ Línea de tiempo WIP, con la casilla opcional **"con
  actividades"**.
- **Respeta los filtros de la pantalla:** PM, estado y búsqueda.
- **Se abre en una pestaña nueva** lista para **imprimir o guardar como PDF**, en tamaño carta
  horizontal.
- **Contenido:**
  - encabezado con la razón social (Datos fiscales), la fecha, los filtros aplicados y el
    usuario;
  - **tarjetas** con el total de Jobs y el conteo por estado (Atrasado, En riesgo, Por enviar, En
    tiempo, Sin fecha de envío);
  - **diagrama de Gantt** (vectorial, se ve nítido al imprimir), igual que en pantalla:
    - barra inicio → envío con el tiempo transcurrido;
    - ▼ envío, ◆ Run Off, ● milestones de pago y línea roja de hoy;
    - con la casilla marcada, las **actividades del Timing** debajo de cada Job (verde terminada,
      rojo atrasada, azul en curso);
  - **tabla:** Job, estado, cliente, descripción, PT/SV, PM, inicio, envío, % del tiempo,
    **próximo hito** (Run Off o pago pendiente más cercano) y **lo vencido o atrasado** (Run Offs,
    pagos y actividades).
- **API:** `GET /api/timeline-wip/pdf?pm=&estado=&q=&actividades=1`.

## Probado
- **4 Jobs en WIP con actividades:** Gantt con Run Offs, milestones, actividades y línea de hoy.
- **Tabla:**
  - 652-50 con "Run Off interno, Run Off cliente, Pago Aceptación, Compras" vencidos;
  - 665-00 con próximo hito "Run Off interno · 2026-11-29".
- **Exportado a PDF** carta horizontal correctamente.
