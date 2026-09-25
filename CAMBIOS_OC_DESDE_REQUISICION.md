# Cambios — Orden de Compra desde la Requisición (rev29 → rev30)

## Proceso implementado
1. **El usuario del material** sube la requisición en Compras ▸ Requisición de Compra
   (sin cambios).
2. **El comprador valida existencias** con "Buscar en Stock" (sin cambios).
3. **Decide si reasigna** lo que hay en Stock ("Reasignar", desde rev16).
4. **Botón nuevo "Generar Orden de Compra"** junto a "Buscar en Stock". Lista solo los
   renglones **Solicitado** u **Homologado** con cantidad pendiente
   (pedido − reasignado − ya comprado).
5. **Selección:** el comprador marca los materiales y la cantidad a comprar (no puede
   pasar de lo pendiente).
6. **"1. Validar existencias":** lo que tenga existencia en Stock (por No. de parte o
   etiqueta) se **quita de la orden**. Aparece una alerta con el material y la cantidad en
   Stock, y el renglón queda tachado con la nota "reasígnalo, no se puede comprar".
7. **"2. Continuar a Orden de Compra":** abre el formulario de siempre (GPO), ya con el
   Job de la requisición (tipo Único) y los materiales validados. Ahí se elige el
   **proveedor**, el esquema tributario y la moneda, se capturan los **precios** (ahora
   editables en cada renglón; en rojo mientras estén en 0) y se **emite**. Folio `PO-…`
   y PDF como cualquier otra orden.

## Controles en el servidor (no dependen de la pantalla)
Al emitir una GPO con renglones de requisición (`req_item_id`):
- **Material con existencia en Stock:** 409, **no se crea la orden** y se regresa la
  lista. La pantalla muestra la alerta, **quita esos materiales** y pide volver a emitir.
  Cubre el caso de que entre Stock después de validar.
- **Cantidad mayor a lo pendiente:** error 400.
- **Renglón ya Comprado, Cancelado o Reasignado:** error 400.
- Las órdenes manuales (sin requisición) funcionan exactamente igual que antes.

## Efecto en la requisición
- **Al emitir:** cada renglón suma `cantidad_comprada` y guarda el folio en su historial
  `compras` (folio, cantidad, precio, fecha, usuario). Si ya no queda pendiente pasa a
  **Comprado**; si fue parcial sigue **Solicitado** con su pendiente.
- **En la tabla:** "1 · de 4 · 3 comprado"; el tooltip muestra los folios RA y PO.
- **Al eliminar o cancelar la GPO:** se revierte. Se quita la cantidad y el folio del
  renglón, y regresa a Solicitado si vuelve a tener pendiente.
- **Pendiente:** ahora descuenta lo comprado, así que "Buscar en Stock", "Reasignar" y
  una nueva orden trabajan solo sobre lo que falta.
- **Dashboard de Compras:** el % ordenado usa la cantidad comprada real; los renglones
  marcados "Comprado" a mano siguen contando como antes.

## Archivos
- `app.py`: `validar-oc`, `_req_en_stock`, `_req_rows`, `_req_registrar_compra`,
  `_req_revert_po`, validaciones en `POST /api/gpo`, reversión en eliminar y cancelar
  GPO, pendiente con lo comprado y dashboard de Compras.
- `static/app.js`: modal de orden de compra desde la requisición, carga al formulario GPO,
  precio editable, manejo del 409 y columna de cantidad con lo comprado.
- `static/index.html`: botón y modal `mo-req-oc`.
- **Permiso del botón:** nivel "Crear" en Órdenes de Compra (GPO).

## Cómo se probó
- **PostgreSQL (15 verificaciones):**
  - La validación detecta A1 en Stock.
  - Emitir con A1 da 409 y no crea la orden.
  - Pedir de más da 400.
  - La orden con B1×3 y C1×1 deja B1 Comprado y C1 parcial (pendiente 3).
  - Aparece en IPO del Job y el Job Report suma $22.50.
  - No se puede volver a comprar un renglón Comprado.
  - La orden manual sigue igual.
  - Dashboard de Compras: 41.7 % ordenado.
  - Eliminar la orden revierte; cancelar la orden revierte.
- **Chromium, requisición de 4 materiales (3 con Stock):**
  - La validación los quita con alerta.
  - El formulario GPO abre con el Job y el monitor.
  - Precio $250, proveedor y esquema → orden PO-000000001.
  - El monitor queda "Comprado (PO-000000001)"; los otros 3 siguen Solicitado.
  - Sin errores de JavaScript.

## Observación (no modificada)
`gpo_next_number()` reutiliza folios libres. Si se elimina PO-000000005, la siguiente orden
vuelve a ser PO-000000005 (se vio en la prueba con PO-000000001). Para documentos que
van a proveedores esto puede generar confusión; se puede cambiar a numeración
consecutiva sin reutilizar.

---
# rev31 — Folios de Orden de Compra (PO) consecutivos, sin reutilizar

**Antes:** `gpo_next_number()` asignaba el primer número libre. Al eliminar PO-000000005,
la siguiente orden volvía a ser PO-000000005 (folio repetido ante el proveedor), y
también rellenaba huecos antiguos.

**Ahora:**
- **Asignación al emitir:** `gpo_alloc_number()` usa el contador atómico de
  `doc_counters` (prefijo "PO"), el mismo mecanismo de los demás folios. Es seguro con
  varias peticiones simultáneas y con 2 workers.
- **Punto de partida:** el contador nunca queda por debajo del folio más alto ya emitido
  (`_doc_counter_bump_to`). Al desplegar, la numeración continúa después de las órdenes
  existentes; no reinicia ni rellena huecos.
- **Consultar no consume:** `gpo_next_number()` solo muestra la vista previa en el formulario.
- **Folios eliminados** no se vuelven a usar.

**Probado (PostgreSQL y JSON):** con órdenes existentes 1, 2, 3 y 7, la vista previa
muestra PO-000000008 tres veces seguidas sin consumirlo. Luego se emiten 8 y 9; se
elimina la 9 y la siguiente es la 10. Cinco órdenes simultáneas reciben 11–15, sin
duplicados. La suite de orden de compra desde requisición sigue pasando.

---
# rev32 — Filtro en la selección de materiales de la Orden de Compra

- **Campo de filtro** arriba de la lista del modal "Orden de Compra desde la requisición".
  Busca por **marca, No. de parte o descripción**, sin importar mayúsculas.
- **Varias palabras:** se combinan (ej. "banner wlb" muestra solo lo que contiene ambas).
- **Selección conservada:** el filtro solo oculta renglones. Lo marcado se mantiene
  aunque quede oculto y se incluye al validar y al pasar a la orden.
- **Casilla del encabezado:** marca o desmarca **solo los renglones visibles**.
- **Contador:** "N seleccionado(s) · mostrando X de Y".
- **Al abrir el modal,** el cursor queda en el filtro.
- Como el resto de las búsquedas de la suite, el filtro se aplica 250 ms después de la
  última tecla.

Probado en Chromium:
- "bni" → 1 de 4.
- Desmarcar la casilla del encabezado con ese filtro quita solo BNI009T; quedan 3
  seleccionados al limpiar el filtro.
- "banner wlb" → WLB32.
- La selección enviada son los 3 marcados, incluidos los ocultos.
- Sin errores de JavaScript.

---
# rev33 — Formulario de Orden de Compra más amplio y descripción completa

- **Ancho:** el modal de Orden de Compra (GPO) pasa de 860 px a hasta 1,320 px (96 % de
  la pantalla en equipos más chicos). Solo cambia este modal; otros tres que compartían
  el mismo estilo quedan igual.
- **Descripción de cada renglón en varias líneas:** ancho de 220 a 340 px y salto de
  línea automático, sin cortar texto. Toda la descripción queda visible.
- **Tabla de renglones:** ocupa todo el ancho. Solo si la pantalla es muy angosta,
  aparece desplazamiento horizontal dentro de la tabla, nunca columnas ocultas.

Probado en Chromium con descripciones de 130 a 170 caracteres:
- **1366 px:** modal de 1,311 px, todas las columnas visibles (incluido Eliminar), sin
  desplazamiento horizontal; las descripciones ocupan 3 líneas.
- **1920 px:** modal de 1,320 px, el mismo resultado.
- Sin errores de JavaScript.

---
# rev34 — Mismo formato en los demás modales de compras

Se aplicó a los otros tres modales que compartían el tamaño de 860 px:

| Modal | Cambio |
|---|---|
| Ingreso por Orden de Compra (`mo-ing-po`) | hasta 1,320 px de ancho; descripción en varias líneas (antes se cortaba con "…") |
| Ingreso con SAE (`mo-ing-sae`) | ídem |
| Modificar Orden de Compra (`mo-gpo-mod`) | ídem; la descripción editable pasó de campo de una línea a **área de texto** que crece con el contenido (al abrir y al escribir) |

**Modificar OC — detalle técnico:** las funciones que leen los renglones
(`gpoModRecalc` y el guardado de "Nueva versión") ahora toman `input,textarea` en el
mismo orden, así que cada valor sigue en su posición (descripción, No. de parte, marca,
cantidad, precio).

Probado en Chromium a 1366 px con descripciones de 130 a 170 caracteres:
- **Tamaño:** los tres modales miden 1,311 px; la última columna queda dentro y ningún
  texto se corta.
- **Modificar OC:** total recalculado $520.00 (2×80 + 3×120). La lectura por posición
  devuelve descripción, No. de parte, marca, cantidad y precio correctos en cada renglón.
- Sin errores de JavaScript.

---
# rev40 — Tipo de cambio "No disponible" al emitir órdenes en MXN

## Causa (existía desde antes de rev08)
El formulario de Orden de Compra pide el tipo de cambio a `GET /api/fx/lookup`.
La función `api_fx_lookup()` estaba en el código, pero **sin su `@app.route`**: el
servidor respondía 404 y la pantalla mostraba "No disponible".

**Consecuencia:** el formulario enviaba `fx_rate = null` y el servidor lo tomaba como
**1.0**. Toda orden en pesos quedaba con tipo de cambio 1 y un `total_usd` igual al monto
en pesos.
- **Costo del Job:** no se afectaba, porque la IPO convierte a dólares con la tabla de
  tipos de cambio según su fecha.
- **Sí se afectaban:** el `total_usd` y el `fx_rate` guardados en la orden.

## Corrección
- **Ruta:** se registra `@app.route("/api/fx/lookup")`. Ahora devuelve el tipo de cambio
  y la **fecha real** usada (en fin de semana o día festivo, el último día hábil, hasta
  7 días atrás).
- **Formulario:** muestra "17.6425 MXN/USD (fecha)". Si no hay tipo de cambio registrado,
  lo indica y dice dónde actualizarlo.
- **Servidor, orden en MXN sin tipo de cambio válido:** usa el de la tabla para hoy. Si
  no existe, **rechaza la orden** con un mensaje claro en lugar de guardarla con 1.0.
- **`subtotal_mxn` de la IPO:** había dos fórmulas contradictorias. En creación y
  modificación multiplicaba el total por el tipo de cambio aun cuando los precios ya
  estaban en pesos; con el tipo de cambio correcto habría quedado ×17. Se unificó con
  la fórmula que ya usaba otra ruta: **MXN → el total tal cual; USD → total × tipo de
  cambio**. Este campo solo se usa en exportaciones.

## Órdenes existentes
Las órdenes en MXN emitidas antes de este cambio tienen `fx_rate = 1` y `total_usd` en
pesos. **No se corrigieron automáticamente.** Se puede hacer con una migración que tome
el tipo de cambio de su fecha de emisión.

## Cómo se probó
- **PostgreSQL:**
  - La ruta existe (antes 404).
  - Sin tipo de cambio: la orden MXN se rechaza.
  - Con tipo de cambio de ayer: el lookup devuelve 17.6425 y la fecha real; la orden
    usa ese valor (2,000 MXN → 113.36 USD); la IPO queda con subtotal_mxn 2,000 (no ×17).
  - Si el formulario envía el tipo de cambio, se respeta.
  - Orden en USD: subtotal_mxn = total × tipo de cambio.
- **Chromium:** al elegir MXN aparece "17.6425 MXN/USD (2026-09-24)"; sin tipo de cambio,
  el aviso correspondiente.
- **Regresión:** suites de orden de compra desde requisición y de folios consecutivos OK.
