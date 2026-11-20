# rev154 — Presupuesto: con permiso "Ver" no se muestran los insumos del estimado

## Qué cambia (Configurar Proyecto ▸ Presupuesto ▸ Estimados)
- **Para usuarios con permiso "Ver" en la pestaña Presupuesto** (sin Crear/Editar ni Control
  total) **ya no se muestran:**
  - en **Material mecánico, Material eléctrico, Componentes mayores y Servicios externos**: los
    campos **Costo estimado** y **% de ahorro** (y la línea "ahorro $…"); solo se ve el
    **Disponible**;
  - en **Mano de obra**: las columnas **Horas** y **Costo promedio USD/h**; se siguen viendo el
    **Importe**, las **Horas consumidas** y el **Costo real**;
  - el botón **"↻ Actualizar costos promedio"**.
- **Los valores siguen en la página** (ocultos) para calcular importes, sumas y delta. El usuario no
  los ve ni los puede editar.
- **Con permiso Crear/Editar o Control total** (y para el Administrador) todo se ve igual que
  antes.

## Exportación del presupuesto (PDF / Excel)
- **Con permiso "Ver":** la exportación **no incluye horas ni costo por hora** de la mano de obra
  (aparece "—"; en Excel el importe va como valor y no como fórmula). Solo incluye los importes.
- **El servidor lo aplica**, aunque la petición traiga los datos.

## Probado
- **Administrador** → costo estimado, % de ahorro, horas y costo promedio **visibles**.
- **Usuario con Configurar Proyecto = Ver** → **ocultos**: tarjetas solo con "Disponible", y tabla
  de mano de obra con Importe / Horas consumidas / Costo real.
