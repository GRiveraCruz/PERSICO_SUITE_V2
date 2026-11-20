# rev155 — Presupuesto (permiso "Ver"): horas planeadas visibles en solo lectura

- **Ajuste a la rev154.** Para usuarios con permiso **"Ver"** en la pestaña Presupuesto, la columna
  **Horas** (horas planeadas por línea de mano de obra) **vuelve a mostrarse**, en **solo lectura**:
  - el valor se ve como texto, sin recuadro de captura;
  - no se puede editar.
- **Sigue oculto para "Ver":**
  - **Costo estimado** y **% de ahorro** de materiales y servicios;
  - la columna **Costo promedio USD/h**;
  - el botón "↻ Actualizar costos promedio".
- **Exportación con "Ver":** incluye las **horas planeadas** (por línea y totales), pero no el costo
  por hora (aparece "—").
- **Con permiso Crear/Editar o Control total,** y para el Administrador: sin cambios.

## Probado
- **Usuario con Configurar Proyecto = Ver:**
  - Diseño mecánico muestra **10 h** en solo lectura (no editable);
  - la columna Costo promedio y los campos de costo estimado / % de ahorro no aparecen;
  - Importe ($175.00), Horas consumidas y Costo real visibles.
