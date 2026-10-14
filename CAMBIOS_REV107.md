# rev107 — No. de PO de SAE en las órdenes de compra (detección de duplicados)

## Captura
- **Generar Orden de Compra:** campo nuevo **"No. de PO de SAE"**, antes de las notas.
  - Se guarda en mayúsculas y sin espacios.
  - **Al salir del campo** se revisa si ese número ya está en otra orden vigente:
    "⚠ Ya registrado en PO-… (fecha · proveedor). ¿Es la misma orden?", o
    "✓ No está registrado en otra orden".
- **Al emitir con un número que ya existe:** aparece una **confirmación** con las órdenes que
  ya lo tienen (folio, fecha, proveedor, total y estatus).
  - Si se cancela, no se emite.
  - Si se confirma, la orden se emite y queda registrado quién confirmó el duplicado y con
    qué órdenes.
- **Las órdenes canceladas no cuentan** como duplicado.

## Dónde se ve y se busca
- **Lista de Órdenes de Compra:**
  - debajo del número de PO aparece "SAE …";
  - la **búsqueda general** encuentra por No. de PO de SAE.
- **PDF de la orden:** muestra "PO SAE: …" debajo del número.
- **Botón "🔎 Duplicados SAE"** (barra lateral de Órdenes de Compra):
  - lista cada No. de PO de SAE que aparece en **más de una** orden vigente, con sus
    órdenes (enlace al PDF), fecha, proveedor, total y estatus;
  - indica cuántas órdenes vigentes no tienen el número capturado.

## Órdenes ya emitidas
- En **Editar registro** de una orden generada aparece **"No. de PO de SAE (de toda la PO)"**,
  para capturarlo o corregirlo.
  - Se aplica a la orden y a todos sus renglones.
  - Si el número ya existe en otra orden, pide la misma confirmación.
  - Los cambios quedan en `historial_sae`.

## API
- `POST /api/gpo` acepta `po_sae` (y `confirmar_duplicado_sae`). Si el número está
  duplicado y no viene confirmado, responde 409 con `duplicado_sae`.
- `GET /api/gpo/sae-check?sae=` — revisión de un número.
- `GET /api/gpo/sae-duplicados` — todos los duplicados.
- `PUT /api/gpo/<po>/sae` — capturar o corregir en una orden emitida.

## Probado
- **Orden con "sae 12345"** → guardada como SAE12345.
- **Segunda orden con SAE12345:** sin confirmar → 409 con el aviso; confirmada → emitida.
  "Duplicados SAE" lista SAE12345 con las dos órdenes.
- **Corregir la segunda a SAE99999:** desaparece de duplicados; sus renglones y el PDF
  muestran SAE99999.
- **Pantalla:** la búsqueda "sae99999" encuentra la orden y el aviso en el formulario
  aparece al salir del campo.
