# Cambios — Requisición de Compra (rev15 → rev16)

## 1. Descripción larga ya no desborda la tabla
- La celda de Descripción tiene un ancho máximo (420 px o 32 % de la pantalla, lo que sea
  menor). El texto que no cabe termina en "…".
- **El texto completo aparece al pasar el mouse** sobre la descripción.
- Cantidad, Estatus, En Stock y Eliminar quedan siempre a la vista. Verificado en
  Chromium a 1500 px con descripciones de más de 170 caracteres.

## 2. Reasignar desde "Buscar en Stock"
En el resultado de la búsqueda aparece la sección **"Generar reasignación al Job … con lo
que hay en Stock"** cuando algún renglón tiene existencia:
- Lista solo los renglones con existencia que no estén ya como "Reasignado".
- Cada renglón trae una casilla (marcada por defecto) y una cantidad editable. El valor
  inicial es lo pedido o lo que hay en Stock, lo que sea menor, y no se puede pasar de ese tope.
- Al confirmar se crea **una orden RA nueva** hacia el Job de la requisición, con folio
  asignado por el servidor, y se descuenta de Stock.
- Si hay varios registros de Stock con el mismo No. de parte, primero se toma el de la
  **misma marca** que la requisición y luego el de mayor existencia.
- Los renglones cubiertos por completo pasan a estatus **"Reasignado"**. Los parciales
  conservan su estatus, para que se compre lo que falta. El aviso final indica el folio,
  el monto y cuántos quedaron completos o parciales.
- **Permisos:** requiere nivel "Crear" en Reasignaciones. Sin ese permiso, la sección
  solo avisa que hay material en Stock.

Endpoint nuevo: `POST /api/requisiciones/reasignar-stock`
`{job, items:[{item_id, part_number, brand, quantity}]}`

## 3. De paso: etiquetas HTML en el No. de parte
Algunas celdas del Excel traían HTML pegado (ej. `<br>TL-POE160S`). Eso se veía en
pantalla y además impedía encontrar el material en Stock.
- Al subir la requisición se quitan las etiquetas y los espacios dobles de todas las celdas.
- La búsqueda y la reasignación comparan el No. de parte ya limpio, así que también
  funcionan con los renglones que ya estaban guardados con `<br>`.
- Los renglones ya guardados siguen mostrando el `<br>` hasta que se vuelvan a subir.

## Cambio interno
La lógica de crear o agregar a una orden RA salió de la ruta `POST /api/reassign` a la
función `_reassign_create_order()`, que ahora usan esa ruta y la de requisición. El
comportamiento de `POST /api/reassign` no cambia; las 13 pruebas de folios y búsqueda
de rev11 pasan igual en JSON y PostgreSQL.

## Cómo se probó (PostgreSQL 16 + Chromium)
Requisición del Job 685-00 con 4 renglones; Stock con BNI009T en dos marcas
(BALLUF 3, OTRA 5):
- **Orden RA-0000000001** creada con: WLB32 1 de 2 (parcial), BNI009T 3 BALLUF + 3 OTRA
  (marca igual primero), TL-POE160S 1. El monitor no se incluyó porque no hay en Stock.
- **Stock después:** BANNER 0, BALLUF 0, OTRA 2, TP-LINK 1.
- **Estatus:** BNI009T y TL-POE160S → Reasignado; WLB32 (parcial) y el monitor → Solicitado.
- El `<br>` del Excel se quitó al subir.
- Sin errores de JavaScript.

---
# rev17 — Buscar en Stock también por etiqueta (OR)

La búsqueda de Requisición de Compra ahora encuentra un material si el No. de parte del
renglón coincide con el **No. de parte O con la etiqueta** (`label_code`, QR / código de
barras) del registro de Stock o Consignación.

- Un registro que coincide por ambos se cuenta **una sola vez**.
- Aplica a la existencia en Stock, a la existencia en Consignación y a "Reasignar"
  (la orden RA puede tomar material encontrado por etiqueta; la preferencia por la
  misma marca se mantiene).
- En el resultado aparece "🏷 Encontrado por etiqueta: MARCA NO.PARTE" cuando algún
  registro se encontró por etiqueta y no por No. de parte, para saber qué material real
  se está contando.
- La comparación ignora mayúsculas, espacios extra y etiquetas HTML, igual que en rev16.
- La respuesta de `POST /api/requisiciones/buscar-stock` trae dos campos nuevos por
  renglón: `por_etiqueta` y `por_etiqueta_consignacion`.

Probado: P1 = 2 por No. de parte + 3 por etiqueta = 5; QR-9 encontrado solo por
etiqueta en Stock (2) y en Consignación (5); un registro con No. de parte y etiqueta
iguales cuenta 4, no 8; la reasignación tomó SMC X2 (encontrado por etiqueta, misma
marca) y descontó Stock correctamente. Las pruebas de folios y búsqueda de rev11
siguen pasando.

---
# rev18 — Lo reasignado se descuenta de lo solicitado + colores por estatus

## Bug corregido: riesgo de compra duplicada
En rev16/rev17, reasignar desde la requisición creaba la orden RA y descontaba Stock,
pero **no descontaba la cantidad del renglón de la requisición**. Un renglón que pedía 2
y recibía 1 por reasignación seguía diciendo "Solicitado · 2", y Compras podía comprar
las 2.

**Ahora:**
- **Seguimiento por renglón:** cada renglón guarda `cantidad_reasignada` y el historial
  `reasignaciones` (folio RA, cantidad, fecha, usuario).
- **Cantidad en la tabla:** muestra lo **pendiente por comprar** (pedido − reasignado),
  con "de 2 · 1 reasignado" debajo. El tooltip muestra los folios RA.
- **En el servidor, en el mismo paso que crea la orden RA:** se suma lo reasignado al
  renglón y, si ya no queda pendiente, se marca "Reasignado".
- **Tope en el servidor:** nunca se reasigna más de lo pendiente, ni renglones Comprado,
  Cancelado o Reasignado, aunque el navegador mande otra cantidad.
- **La búsqueda en Stock** consulta lo pendiente, no lo pedido originalmente.
- La sección "Reasignar" solo ofrece renglones Solicitado u Homologado con pendiente > 0.

## Colores por estatus
| Estatus | Color |
|---|---|
| Solicitado | ámbar |
| Comprado | verde |
| Cancelado | gris |
| Reasignado | morado |
| Homologado | azul |

El selector de estatus toma el color, cada renglón lleva una franja del mismo color a la
izquierda y hay una leyenda junto al conteo de renglones. Al cambiar el estatus, el color
se actualiza al momento.

## Datos anteriores a este cambio
Las reasignaciones hechas desde la requisición con rev16/rev17 **no quedaron registradas
en el renglón**:
- Los renglones cubiertos por completo sí quedaron como "Reasignado".
- Los **parciales** siguen mostrando la cantidad completa.

Revisar esos Jobs contra sus órdenes RA (Compras ▸ Documentos ▸ Reasignaciones, filtro
por Job) antes de comprar.

## Cómo se probó (PostgreSQL 16 + Chromium)
Requisición del Job 685-00:
- **1ª reasignación (RA-0000000001):** WLB32 pide 2, hay 1 → queda "1 de 2 · 1
  reasignado", Solicitado. BNI009T y TL-POE160S → 0 pendiente, Reasignado.
- **2ª búsqueda:** envía solo lo pendiente (WLB32 = 1, reasignados = 0) y ya no ofrece
  reasignar nada, porque no hay Stock.
- **Llega Stock de WLB32 (5):** la sección ofrece máximo 1. RA-0000000002 lo completa; el
  renglón queda Reasignado, con historial RA-0000000001:1 | RA-0000000002:1.
- **Reasignar de más por API** (cantidad 99 en un renglón ya Reasignado): rechazado con
  "ya no tienen cantidad pendiente"; Stock no cambia (WLB32 = 4).
- Sin errores de JavaScript.

---
# rev22 — Subir otra requisición al mismo Job y tipo sin duplicar

**Antes:** cada carga solo agregaba renglones. Subir el mismo archivo dos veces, o una
versión corregida, duplicaba todos los materiales, con riesgo de compra doble.

**Ahora** se compara por **No. de parte** (sin importar mayúsculas, espacios ni HTML)
contra los renglones que ya existen para ese Job y ese tipo (Eléctrico, Mecánico, etc.):

| Caso | Qué pasa |
|---|---|
| No existe | Se agrega como renglón nuevo |
| Misma cantidad | No se hace nada (no se duplica) |
| Cantidad mayor | Se actualiza el renglón existente. Se conservan lo reasignado, el historial RA y el estatus; el pendiente sube solo por la diferencia. Si estaba "Reasignado" y vuelve a faltar material, regresa a "Solicitado" |
| Cantidad menor | No se cambia; se marca **para revisión** |
| Cantidad distinta en un renglón **Comprado o Cancelado** | No se cambia; se marca para revisión (si subiera, la diferencia quedaría oculta porque el pendiente solo descuenta lo reasignado) |
| Mismo No. de parte repetido **dentro del archivo** | Se suma en un solo renglón |

**Revisión:**
- El renglón muestra "⚠ Nueva requisición pide X (actual Y)" con dos botones:
  - **Aceptar:** cambia la cantidad (pide confirmación).
  - **Descartar:** conserva la actual.
- El conteo de la pestaña indica cuántos renglones hay por revisar.
- Cada cambio de cantidad queda registrado en el renglón (`cambios_cantidad`: de, a,
  fecha, usuario, origen).

**Resumen al subir:** nuevos, actualizados (con de → a), sin cambios, para revisión
(con actual → archivo) y repetidos consolidados.

**Notas:**
- Un mismo No. de parte en otro tipo (ej. Mecánico) se considera otro renglón, como antes.
- Si ya existían renglones duplicados de cargas anteriores, la comparación usa el
  primero; los duplicados viejos no se borran solos.

## Cómo se probó
- **PostgreSQL (14 verificaciones):**
  - Subir el mismo archivo 2 veces: 0 nuevos, 4 iguales, siguen 4 renglones.
  - Tercera carga:
    - A1 Reasignado 5→8 conserva los 5 reasignados, queda con pendiente 3 y pasa a
      Solicitado.
    - B1 Comprado con cantidad mayor → revisión.
    - C1 2→1 (escrito " c1 " en el archivo) → revisión.
    - E1 repetido en el archivo → un renglón de 6.
  - Aceptar y descartar la revisión funcionan; aceptar sin revisión pendiente → error 400.
  - Otro tipo se agrega aparte.
- **Chromium:** carga desde la pantalla con el resumen completo, aviso de revisión en el
  renglón, "⚠ 1 por revisar" en el conteo y "Aceptar" aplicado. Sin errores de JavaScript.

---
# rev35 — Estatus bloqueado al 100 %, "Reas. Parcial", Solicitante y Comprador

## Reglas de estatus (una sola función en el servidor: `_req_aplicar_estatus`)
Se recalcula en cada reasignación, compra, reversión (eliminar o cancelar RA/PO), carga
con mayor cantidad y revisión aceptada:

| Situación (por cantidades registradas) | Estatus |
|---|---|
| reasignado + comprado ≥ pedido, con compra | **Comprado** 🔒 |
| reasignado ≥ pedido, sin compra | **Reasignado** 🔒 |
| reasignado en parte, con pendiente | **Reas. Parcial** (nuevo, color turquesa) |
| sin reasignar | su estatus base: Solicitado u Homologado |

- **Bloqueo al 100 %:** el selector queda deshabilitado con 🔒 y el servidor rechaza el
  cambio con el motivo. Para modificarlo, se elimina o cancela la orden RA o PO; el
  estatus se recalcula solo.
- **Reas. Parcial:**
  - Lo asigna el sistema; no se puede elegir a mano (aparece deshabilitado en la lista).
  - Se puede seguir reasignando, comprar (orden de compra desde la requisición) o cancelar.
  - Al revertir toda la reasignación, el renglón vuelve a su **estatus base**. Si era
    Homologado, regresa a Homologado.
  - Si con reasignación parcial se elige Solicitado u Homologado, eso queda como estatus
    base y lo visible sigue siendo "Reas. Parcial".
- **Marcados a mano:** "Comprado" o "Reasignado" puestos a mano, sin cantidades
  registradas (compras hechas fuera del sistema), se pueden corregir como antes.
- **Eliminar renglón:** ya no se permite si tiene reasignaciones u órdenes de compra; el
  botón no aparece y el servidor lo rechaza. Así ninguna orden queda apuntando a un
  renglón inexistente.

## Columnas nuevas en la tabla de requisición
- **Solicitante:** usuario que subió la requisición, con fecha (`created_by`).
- **Comprador:** usuario que dejó el renglón en Comprado, Reasignado o Reas. Parcial, con
  fecha.
  - Se toma del último movimiento vigente (reasignación o compra). Si se elimina una
    orden, queda quien realmente reasignó o compró, no quien eliminó.
  - En los marcados a mano, es quien cambió el estatus.
  - En renglones anteriores a este cambio, se toma de su historial cuando existe.

## Cómo se probó
- **PostgreSQL (15 verificaciones, con dos usuarios: "ana" sube y "compras" reasigna y compra):**
  - Solicitante ana.
  - A1: 2 de 5 desde Stock → Reas. Parcial, Comprador compras. Luego se compra el resto
    → Comprado 🔒; cambiar su estatus da 400.
  - "Reas. Parcial" a mano da 400.
  - B1 Comprado a mano → corregible.
  - C1 Homologado + reasignación parcial → Reas. Parcial con base Homologado; al eliminar
    la RA vuelve a su base.
  - Eliminar la PO de A1 → regresa a Reas. Parcial con Comprador compras, no admin.
  - Renglón reasignado no se puede eliminar.
- **Regresión:** suites de orden de compra, eliminación de reasignaciones, carga sin
  duplicados y folios; todas OK. La única expectativa ajustada: un renglón reasignado al
  100 % cuya cantidad sube ahora queda **Reas. Parcial** (antes Solicitado).
- **Chromium:** Reas. Parcial en turquesa y editable; Reasignado y Comprado con 🔒 y
  selector deshabilitado; columnas Solicitante y Comprador con usuario y fecha. Sin
  errores de JavaScript.
