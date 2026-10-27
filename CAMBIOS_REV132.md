# rev132 — Job Cost Report ▸ Resultado comercial: composición del Target Compras

- **Debajo de las tarjetas** (Target Compras / Purchase Orders / Ahorro comercial) aparece el
  panel **"Composición del Target Compras"** del Job, tomado de Configurar Proyecto ▸
  Presupuesto (rev131).
- **Barra de colores** con el peso de cada rubro en el target.
- **Tabla por rubro** (Material mecánico, Material eléctrico, Componentes mayores, Servicios
  externos):
  - **costo estimado**;
  - **% de ahorro**;
  - **disponible**, que es el target;
  - **% del target**.
- **Fila de total:** costo estimado total, **% de ahorro ponderado** y Target Compras.
- **Comparación con lo comprado:** se indica lo comprado (Purchase Orders) y su % del target.
  Las OC no están clasificadas por rubro, por eso la comparación es contra el total.
- **Avisos:**
  - si la suma de los rubros no coincide con el Target Compras guardado (configuración
    antigua), se pide volver a guardar el proyecto;
  - si el Job no está en ninguna configuración, se indica.
- **Proyectos configurados antes de la rev131:** muestran sus estimados como costo con
  0 % de ahorro.
- **El panel solo aparece en "Resultado comercial"**: al cambiar de pestaña se quita.

## Probado
- **Job 652-50:** mecánico $20,000 (10 %) → $18,000 · eléctrico $15,000 (5 %) → $14,250 ·
  componentes mayores $40,000 → $40,000 · servicios $8,000 (12.5 %) → $7,000.
- **Totales:** costo $83,000, ahorro ponderado 4.5 % y **Target $79,250**, que coincide con
  la tarjeta.
- **Comprado:** $79,065.98 (100 % del target).
- **Al cambiar a Resultado operativo,** el panel desaparece.
