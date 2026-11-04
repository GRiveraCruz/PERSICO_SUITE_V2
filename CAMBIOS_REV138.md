# rev138 — Reasignaciones: eliminar orden o renglón (regresa a Stock y sale del costo del Job)

## Por qué no aparecía la opción en producción
- **El botón "Eliminar" de las órdenes RA solo se mostraba al rol administrador.** En BETA el
  usuario es administrador; en producción, probablemente no.
- **Además, la eliminación se bloqueaba** si parte del material ya tenía salida de almacén, sin
  ninguna forma de corregir una carga errónea.

## Qué cambia
- **Quién puede eliminar:** el **administrador** o quien tenga **Control total en Reasignaciones**
  (se asigna en los permisos del usuario).
- **Botón "Detalle"** en cada orden RA: muestra sus renglones (No. de parte, marca, descripción,
  Job, cantidad, costo unitario y total) con un botón **"Quitar"** por renglón, para corregir solo
  el renglón cargado por error.
- **"Eliminar" la orden completa** o **"Quitar" un renglón**:
  - el material **regresa a Stock**: se suma al registro existente, que **conserva su último
    precio**. Si el material ya no existe en Stock, se vuelve a dar de alta con el costo de la
    reasignación;
  - **sale del costo del Job** (Job Report / resultado de proyectos);
  - si salió de una **Requisición de Compra**, se **devuelve la cantidad pendiente** al renglón de
    la requisición (en "Quitar", solo la cantidad de ese renglón);
  - se quita de **Apartados**;
  - si al quitar renglones la orden queda vacía, la orden se elimina.
- **Material que ya tuvo salida de almacén:**
  - sigue bloqueado para evitar inventario duplicado;
  - el **administrador puede forzarlo** escribiendo el **motivo**, por ejemplo "carga duplicada
    por error".
- **Bitácora:** cada eliminación queda registrada (`ra_bitacora`) con quién, cuándo, qué renglones,
  si fue forzada y el motivo.

## Probado
- **Orden RA** con BOLT-1 ×10 ($2.50) y NUT-9 ×20 ($0.40) para el Job 652-50 → costo reasignado en
  el Job Report: $33.00.
- **Quitar el renglón NUT-9** → regresó 20 piezas a Stock (precio $0.40) y la orden siguió con
  BOLT-1.
- **Eliminar la orden** → BOLT-1 ×10 de regreso a Stock y la orden desaparece.
- **Job Report:** costo reasignado **$0**.
