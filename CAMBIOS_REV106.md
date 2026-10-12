# rev106 — Cambiar el esquema tributario desde "Modificar Orden de Compra"

## Qué faltaba
- En la rev103 el esquema tributario solo se podía cambiar en **Órdenes de Compra (lista) ▸
  Editar registro**.
- En **Órdenes de Compra (GPO) ▸ Modificar Orden de Compra ▸ Nueva Versión**, que es donde
  se cambian las partidas, precios y cantidades, no había forma de cambiarlo.
- Además, en "Editar registro" el campo se **ocultaba sin explicar por qué** cuando el
  renglón no venía de una orden generada en la Suite o no se podía leer.

## Cambios
- **Nueva Versión ▸ "Esquema tributario"** (después de las partidas):
  - lista con los esquemas del catálogo y sus tasas, con el esquema actual de la orden
    seleccionado. Si el esquema actual ya no existe en el catálogo, se muestra marcado;
  - **desglose en vivo:** Subtotal, IVA, ISR retenido, IVA retenido e IEPS;
  - **NUEVO TOTAL** con impuestos (antes mostraba solo el subtotal);
  - si se elige otro esquema: "⚠ Cambia el esquema tributario de la orden".
- **Al confirmar con otro esquema** se pide **confirmación**:
  - de qué esquema a cuál cambia;
  - que se recalcularán el IVA, las retenciones, el IEPS y el total;
  - que si ya se envió al proveedor hay que mandarle la versión corregida.
  - Si se cancela, no se guarda nada.
- **Al guardar:**
  - la nueva versión toma el esquema (IVA = IVA trasladado del esquema) y recalcula los
    importes;
  - la versión archivada conserva su esquema anterior;
  - el cambio queda en `historial_esquema` con la versión, fecha y usuario.
  - Se puede cambiar **solo el esquema**, sin tocar las partidas.
- **Editar registro (lista):** en lugar de ocultar el campo, explica por qué no se puede
  cambiar:
  - el registro viene de Excel y no de una orden generada;
  - o la orden no se pudo leer. En ese caso indica que se puede hacer desde Nueva Versión.

## Nota
- La Nueva Versión, y por lo tanto el cambio de esquema desde ahí, aplica a órdenes en
  estatus **Emitida** (sin entregas), igual que antes.

## Probado
- **Orden** de 2 × $100, esquema "General 16 %".
- **Nueva versión** con el esquema "Servicios PF (ret)" → subtotal $200, IVA $32, ISR ret.
  $20, IVA ret. $21.33, total $190.67, versión 2. La versión 1 archivada conserva "General
  16 %".
- **Pantalla:** el desglose y el total cambian al elegir otro esquema; al confirmar aparece
  la advertencia y, si se cancela, no se guarda.
