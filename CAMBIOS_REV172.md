# rev172 — OC que no aparecían en Purchase Orders (PO-000000143 y PO-000000159)

## Diagnóstico
- **Las OC 143 y 159** (MAQUINADOS INDUSTRIALES MENA) sí existen como órdenes generadas, por eso
  aparecían en el Ingreso por OC. Pero **no tenían ningún renglón en Purchase Orders**; el respaldo
  `po_2026_backup.xlsx` lo confirma: salta de la 142 a la 144 y de la 158 a la 160.
- **Consecuencias:**
  - no aparecían en el listado de Purchase Orders;
  - su costo no sumaba en el reporte del proyecto, que las mostraba en "Material ingresado al
    almacén que no suma en compras" (la PO-000000143 de la captura).
- **Causa:**
  - la tabla de Purchase Orders identifica cada renglón con una **huella única de su contenido**;
  - esas OC tienen **renglones idénticos** (misma parte "SUMINISTRO Y FAB", Job, cantidad 6 y
    precio $610);
  - al guardar, la huella se repetía, la base de datos **rechazaba todo el guardado** de Purchase
    Orders, pero **la OC ya se había guardado antes**.

## Corrección
1. **Renglones idénticos permitidos:**
   - cada renglón lleva su **número de línea** (`linea`), y la huella distingue repeticiones;
   - una OC puede tener partidas iguales sin fallar. Esto aplica también a cualquier otro guardado
     de Purchase Orders, como importaciones.
2. **Emisión atómica:** si el registro en Purchase Orders falla por cualquier motivo, **la OC se
   deshace** y se avisa "No se guardó nada; inténtalo de nuevo". Ya no puede quedar una OC sin sus
   renglones.
3. **Reparación automática de las OC afectadas:**
   - al iniciar el servidor (unos 20 s después), el ERP busca las OC generadas sin renglones en
     Purchase Orders (no canceladas) y **crea sus renglones** desde la OC (partidas, Job, precios,
     moneda y descuentos), con el **estatus de la OC** (Emitida / Parcial / Entregada);
   - con eso **PO-000000143 y PO-000000159** aparecerán en el listado y su costo sumará en el
     reporte;
   - también disponible a mano (administrador): `GET /api/gpo/sin-purchase-orders` (lista) y
     `POST /api/gpo/reparar-purchase-orders` (repara).

## Probado (PostgreSQL)
- **OC con 6 partidas, 4 idénticas** (6 × $610) → emitida, con **6 renglones** en Purchase Orders
  (líneas 1–6). Antes fallaba y la OC quedaba sin renglones.
- **Simulación de una OC afectada:** se borraron sus renglones → aparece en "sin Purchase Orders" →
  **reparada** con 6 renglones por $26,700.

## Notas
- **La captura del reporte de costos muestra la PO-000000143,** que es esta misma falla.
  - Si después de publicar sigue apareciendo alguna OC (por ejemplo la 144) en "no suma en
    compras", mándame la captura. Puede ser otra causa, como un ingreso registrado a un Job
    distinto al de la OC.
- **Catálogo:** todas las partidas "SUMINISTRO Y FAB" quedaron ligadas al código CM-01454, porque
  el alta automática liga por No. de parte. Para servicios o maquinados únicos conviene marcar
  "no agregar" al emitir la OC, o usar números de parte más específicos.
