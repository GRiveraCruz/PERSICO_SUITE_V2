# Cambios — Eliminar una reasignación regresa el material (rev18 → rev19)

**Antes:** eliminar una orden RA (Stock) o CRA (Consignación) solo borraba la orden. El
material descontado **no regresaba** al inventario; el aviso lo advertía ("no revierte
los cambios en stock").

**Ahora, al eliminar una orden:**
- **El material regresa** a Stock (RA) o a Consignación (CRA), con la cantidad de cada renglón.
- **Si el material ya no existe** en el inventario (lo borraron después de reasignarlo),
  se vuelve a dar de alta con No. de parte, marca, descripción, etiqueta, cantidad y
  costo unitario de la orden. Queda con unidad "Pieza" y sin ubicación; conviene
  completarlas.
- **Requisición de Compra:** si la orden RA salió de una requisición, se quita esa orden
  del historial del renglón y se le devuelve la cantidad pendiente. Si el renglón estaba
  "Reasignado" y vuelve a tener pendiente, regresa a "Solicitado".
- **Costo del Job:** el Job Report deja de contar la orden, porque ya no existe.
- **Aviso de confirmación:** ahora explica que el material regresa.
- La respuesta del servidor incluye el detalle devuelto (`devuelto`: sumado o re-creado
  por material) y cuántos renglones de requisición se ajustaron.
- **Permisos:** sigue siendo solo para administradores.

**Orden de guardado:** en Stock primero se guarda el inventario y después se borra la
orden. Si algo fallara en medio, la orden sigue existiendo y no se pierde material. En
Consignación ambas cosas van en la misma transacción.

**Limitación:** en Stock, una orden RA manual antigua pudo descontar menos de lo que
dice (Stock nunca bajaba de 0). Al eliminarla se devuelve la cantidad de la orden. En
órdenes creadas desde rev11 (Consignación) y desde requisición (rev16+) la cantidad
siempre se validó, así que coincide.

## Archivos
- `app.py`: `api_delete_reassign_order()` y las nuevas `_return_items_to_inventory()` y `_req_revert_order()`.
- `consignacion.py`: `api_delete_order()`.
- `static/app.js`: textos de confirmación.

## Cómo se probó (PostgreSQL 16, 16 verificaciones)
- **Orden manual:** Stock 10→6 y costo al Job $20. Al eliminar: Stock 6→10 y costo al Job 0.
  Un no-admin recibe 403 y Stock no cambia.
- **Material borrado de Stock antes de eliminar la orden:** se vuelve a dar de alta con
  3 piezas, costo $7 y descripción.
- **Orden desde requisición** (P1 pedía 15, se reasignaron 10; P2 completo → Reasignado).
  Al eliminar: Stock restaurado, P1 vuelve a pendiente 15 sin historial, P2 regresa a
  Solicitado con pendiente 2.
- **Consignación:** CRA 5→3 y al eliminar 3→5; material borrado se vuelve a dar de alta;
  Stock no recibe nada.
- Las suites anteriores de Reasignaciones (PostgreSQL) y Consignación (JSON) siguen pasando.

---
# rev20 — El estatus sí regresa a "Solicitado" + usuario en el PDF

## "Reasignado" no regresaba a "Solicitado"
Se encontraron dos causas:

1. **Pantalla desactualizada (causa principal).** Al volver a Requisición de Compra
   desde otro módulo, `reqInitSelectors()` reescribía el selector de Job: la selección
   se perdía, pero la tabla se quedaba con los datos anteriores. Si se eliminaba la orden
   en Reasignaciones y se regresaba a Requisición, seguía viéndose "Reasignado" aunque
   en la base ya fuera "Solicitado". Ahora se restaura el Job elegido y la tabla se
   recarga desde el servidor cada vez que se entra al módulo.
2. **Renglones reasignados con rev16/rev17**, que no guardaron historial. Al eliminar
   una orden, esos renglones se identifican por **Job + No. de parte (o etiqueta)** de
   los items de la orden, y si están "Reasignado" regresan a "Solicitado" con todo su
   pendiente. Solo se tocan renglones sin historial; un renglón "Reasignado" que no
   corresponde a la orden eliminada no cambia.

## Usuario en el PDF de la reasignación
- **Encabezado:** ahora dice "Generada por: <usuario>" y el origen ("Reasignación
  manual" o "Requisición de Compra (Job)").
- **Columna nueva "Agregó":** muestra quién agregó cada renglón, útil cuando se agregan
  materiales a una orden existente.
- Aplica a órdenes RA (Stock) y CRA (Consignación).
- La lista de órdenes RA también muestra el usuario y la marca "desde requisición".
- **Órdenes creadas antes de este cambio** no tienen usuario registrado; el PDF lo indica
  como "— (orden anterior al registro de usuario)".

## Cómo se probó
- **PostgreSQL:**
  - Renglón antiguo (Reasignado sin historial): al eliminar la orden de su Job y No. de
    parte vuelve a Solicitado con pendiente 2.
  - Otro renglón Reasignado no relacionado con la orden sigue igual.
  - PDF RA manual, PDF RA desde requisición y PDF CRA muestran usuario, columna Agregó
    y origen.
- **Chromium:** reasignar desde la requisición → eliminar la orden en Reasignaciones →
  volver a Requisición por el menú. El Job sigue seleccionado y los 4 renglones muestran
  "Solicitado" (antes seguían en "Reasignado").
- Las 16 pruebas de rev19 siguen pasando.

---
# rev21 — Columna "Job" en las tablas de reasignaciones

Aplica a Compras ▸ Documentos ▸ Reasignaciones (RA, Stock) y ▸ Reasignaciones
Consignación (CRA).

- **Columna nueva "Job"** después del folio, con los Jobs a los que va la orden. Una
  orden con materiales para varios Jobs los muestra todos.
- **Clic en un Job:** filtra la tabla por ese Job. Usa el mismo filtro del costado, que
  se llena solo, y ese Job queda resaltado en rojo.
- **Segundo clic** en el mismo Job, o "✕ quitar filtro" en la barra inferior: vuelve a
  mostrar todas las órdenes.
- La barra inferior indica el filtro activo ("2 órdenes · Job 685-00").
- La columna Items muestra también el usuario que generó la orden (en CRA antes
  mostraba ahí los Jobs).
- De paso: el filtro de RA ahora codifica el Job en la URL, y la tabla RA tenía un
  encabezado de menos para la columna de botones.

Probado en Chromium: 3 órdenes RA (685-00, 670-00, y 685-00 + 652-50). Clic en 685-00
muestra 2 órdenes y el segundo clic muestra las 3. En CRA, clic en 670-00 muestra 1 y
"quitar filtro" muestra las 2. Sin errores de JavaScript.
