# Cambios — BOM de Manufactura con planos PDF (rev36 → rev37)

En Compras ▸ Requisición de Compra, la pestaña **Manufactura** ahora trabaja con planos
PDF en lugar de la lista de materiales en Excel.

## Carga
- **Botón "📄 Subir planos (PDF)":** se pueden seleccionar varios archivos a la vez.
- **Resumen al terminar:** archivo, ID de pieza, revisión, tipo, material y acabado.
  Marca en ámbar lo que no se encontró en el cajetín.
- Solo se aceptan PDFs, de hasta 25 MB por archivo.

## Datos de cada pieza
| Columna | Origen |
|---|---|
| **ID pieza** | Nombre del PDF sin extensión. Clic → abre el plano de la revisión vigente. |
| **Rev.** | **A** en la primera subida; si se vuelve a subir la misma pieza en el Job → **B**, **C**… Debajo aparecen enlaces a las revisiones anteriores. |
| **Tipo** | Campo **DESCRIPTION** del cajetín (PLATE, CROSS MEMBER, WELDMENT SET…) |
| **Material** | Campo **MATERIAL** del cajetín (editable con clic) |
| **Acabado** | Campo **FINISH** del cajetín (editable con clic) |
| **Fabricación** | Interna / Externa / Mixta (selector) |
| **Estatus** | Solicitado · Comprado · Orden interna · Fabricado, cada uno con su color |
| **Solicitante** | Usuario que subió el plano, con fecha |
| **Cambió Fabricación** | Usuario que cambió la Fabricación, con fecha |

**Nombre con sufijo de revisión:** un archivo como `5257-D1002_revA.PDF` se toma como la
misma pieza `5257-D1002`. Se ignora el sufijo `_rev`, `-rev` o ` REV.` y recibe la
siguiente letra. Si ese sufijo debe tratarse como pieza distinta, es un cambio de una línea.

**Nueva revisión:** material, acabado y tipo se actualizan con lo que traiga el plano
nuevo; el estatus y la fabricación se conservan.

## Extracción del cajetín
- El texto de un PDF no sale en orden de lectura, así que cada dato se ubica por
  **posición**: la primera línea justo debajo de su etiqueta y dentro de su celda
  (MATERIAL termina donde empieza FINISH, FINISH donde empieza WEIGHT).
- Funciona con los dos formatos de cajetín de los ejemplos (652-51 y 5257). Probado con
  los 7 planos enviados: los 7 extraen correctamente tipo, material y acabado.

## Almacenamiento de los PDFs
- Se guardan en **PostgreSQL**, en la tabla nueva `requisicion_planos`, **no en el
  volumen**. Así no se pierden en un redeploy aunque `DATA_DIR` no esté configurado.
- Cada revisión es un archivo independiente.
- Se descargan con `GET /api/requisiciones/planos/<id>` (requiere permiso de ver Requisición).
- Al eliminar una pieza se borran también sus PDFs.

## Otros ajustes
- **Botones de compras:** en la pestaña Manufactura se ocultan "Buscar en Stock" y
  "Generar Orden de Compra"; las demás pestañas no cambian.
- **Estatus propios:** se validan en el servidor. Los de compras (Reasignado, Reas.
  Parcial…) no aplican a Manufactura.
- **Dashboard de Compras:** en la columna Manufacturing BOM, el % ordenado cuenta las
  piezas en Comprado, Orden interna o Fabricado.

## API
- `POST /api/requisiciones/planos` (multipart: `job`, `files[]`).
- `GET /api/requisiciones/planos/<id>`.
- `PUT /api/requisiciones/<item>` acepta, para Manufactura, `fabricacion`, `status`,
  `material` y `acabado`.

## Cómo se probó
- **PostgreSQL (15 verificaciones con los 7 planos reales):**
  - Extracción correcta en los 7.
  - 5257-D1002 → A, y 5257-D1002_revA → B.
  - Resubir D007 → B.
  - El PDF descargado es idéntico al subido.
  - Fabricación con usuario; valor inválido → 400.
  - Estatus "Orden interna" aceptado; "Reasignado" → 400.
  - Material editable.
  - Dashboard de Compras 1/6.
  - Eliminar borra el PDF; un archivo que no es PDF se rechaza.
- **Chromium:**
  - Carga de los 7 archivos desde la pantalla y resumen.
  - Cambio de Fabricación y de Estatus.
  - El enlace del ID abre el PDF.
  - Al pasar a Eléctrico y regresar, cada pestaña conserva su encabezado y su leyenda.
  - Sin errores de JavaScript.

---
# rev38 — Orden de Compra desde el BOM de Manufactura

- **Botón "Generar Orden de Compra"** en la pestaña Manufactura, junto a "Subir planos".
- **Qué piezas se listan:** solo las que tienen **Fabricación = Externa** y estatus
  **Solicitado**. Si hay piezas Solicitadas sin Fabricación Externa, el modal lo indica
  para que se cambie en la tabla.
- **Sin validación de Stock:** son piezas por fabricar, así que no aparece el paso
  "Validar existencias". El filtro (ID, tipo, material, acabado) y la selección funcionan
  igual que en compras.
- **Cantidad:** libre, por defecto 1, porque el plano no trae cantidad. Al emitir, la
  cantidad requerida de la pieza pasa a ser la que se ordenó.
- **Formulario de orden de compra:** se abre con el Job y cada pieza como renglón:
  - No. de parte: el ID de la pieza.
  - Descripción: "Tipo · Material · Acabado · Plano rev X".
  - Nota: "Fabricación externa según plano … rev …".
  - Proveedor, esquema y precios se capturan como en cualquier orden.

## Controles en el servidor
- **Fabricación:** comprar una pieza de manufactura que no sea **Externa** → error 400.
- **Stock:** no se revisa en piezas de manufactura; en compras sigue igual.
- **Pieza comprada al 100 %:** pasa a **Comprado** 🔒 con el folio visible debajo del
  estatus. El **estatus y la Fabricación quedan bloqueados**, y la pieza no se puede
  eliminar.
- **Eliminar o cancelar la orden:** la pieza vuelve a **Solicitado** y se desbloquea.

## Cómo se probó
- **PostgreSQL (7 verificaciones nuevas, más las 15 de rev37):**
  - Pieza sin Fabricación Externa → rechazada.
  - Externa ×2 → Comprado con cantidad 2, sin validar Stock.
  - Con la pieza comprada, cambiar estatus o fabricación → 400; eliminarla → 400.
  - Eliminar la orden → Solicitado, y el estatus vuelve a ser editable.
- **Chromium:**
  - Con D002 y D007 Externas y D003 Interna, el modal lista solo D002 y D007, sin botón
    de validar Stock.
  - D002 ×3 → orden PO-000000001, con las descripciones armadas desde el plano.
  - Ambas quedan Comprado 🔒 con el folio; D003 sigue Solicitado.
  - Sin errores de JavaScript.
