# Cambios — Cantidades NORMAL/MIRROR y Órdenes de Producción (rev38 → rev39)

## 1. BOM de Manufactura: columnas NORMAL y MIRROR
- Dos columnas editables por pieza. Al subir un plano: Normal 1, Mirror 0.
- **Cantidad requerida = Normal + Mirror.** Es la que usa la orden de compra de
  manufactura como cantidad por omisión y la que cuenta para el pendiente.

## 2. Órdenes de Producción (Operaciones ▸ Órdenes de Producción)
El módulo, que estaba "en construcción", ya funciona.

**Creación (desde Requisición ▸ Manufactura, botón "Generar Orden de Producción"):**
- **Qué piezas se listan:** las de Fabricación **Interna** en estatus **Solicitado** que no
  están en otra orden. Si hay piezas Solicitadas con otra fabricación, se avisa.
- **Datos de la orden:** prioridad (número, 1 = más urgente; obligatoria), fecha de
  entrega requerida (obligatoria) y notas.
- **Folio consecutivo `MNO-000001`,** con el contador atómico de folios: no se repite ni
  se reutiliza.
- **Herencia por pieza:** ID, Tipo, Material, Acabado, revisión y **plano** (el PDF de la
  revisión vigente, clic para abrirlo), más las cantidades Normal y Mirror.

**Listado:**
- Columnas: folio, Job, piezas (con sus IDs), prioridad y fecha de entrega (⚠ en rojo si
  ya venció y la orden no está Concluida ni Cancelada).
- También: estatus con color, **barra de avance** (procesos concluidos / procesos que
  aplican) y quién la creó.
- Filtros por Job y por estatus.

**Modal de la orden (clic en el listado o en el folio desde el BOM):**
- Se editan prioridad, fecha de entrega, estatus y notas.
- **Estatus:** Pendiente · En proceso · En pausa · Concluida · Cancelada.
- **Matriz de procesos por pieza** (Corte, Soldadura, CNC, Torno, Fresa, Pintura):
  - Cada celda puede ser "No aplica", "Pendiente" (el proceso aplica) o "✔ Concluido".
  - Al concluir se registra quién y cuándo, y se muestra debajo.
- **Historial** de cambios (quién, cuándo, qué).
- **"📄 PDF del estatus":** página lista para imprimir o guardar como PDF, con los datos,
  el avance y la matriz.
- **"Eliminar":** solo para nivel completo, y solo en órdenes Pendientes o Canceladas.

**Reglas:**
- **No se puede concluir** una orden con procesos Pendientes.
- En órdenes **Concluidas o Canceladas**, la matriz queda de solo lectura.

## 3. Vínculo con el BOM de Manufactura
| Evento en la orden | Pieza en el BOM |
|---|---|
| Creada | **Orden interna**, con enlace al folio |
| Concluida | **Fabricado** |
| Cancelada / eliminada | **Solicitado**, sin orden (se puede volver a ordenar) |
| Reabierta (de Concluida o Cancelada a otro estatus) | **Orden interna** otra vez (si la pieza no quedó en otra orden) |

- Mientras la pieza está en una orden, su estatus y su fabricación **los controla la
  orden** (selectores bloqueados) y la pieza **no se puede eliminar**.
- En el Dashboard de Compras, las piezas en Orden interna o Fabricado cuentan como
  ordenadas.

## 4. Permisos (módulo "Operaciones — Órdenes de Producción")
| Nivel | Puede |
|---|---|
| Ver | consultar el listado, la orden y el PDF |
| Crear | crear órdenes desde el BOM, configurar la matriz, marcar procesos, cambiar estatus |
| Completo | además, eliminar órdenes |

El perfil **MANUFACTURING** (supervisor de manufactura) pasa de "Ver" a **"Crear"**.
Aplica a usuarios nuevos; los existentes se ajustan en Config ▸ Administrador.

## API
- `GET`/`POST /api/ordenes-produccion`
- `GET`/`PUT`/`DELETE /api/ordenes-produccion/<folio>`
- `GET /api/ordenes-produccion/<folio>/pdf`
- Tabla nueva `ordenes_produccion`; se crea sola al arrancar.

## Cómo se probó
- **PostgreSQL (23 verificaciones), entre otras:**
  - Normal 2 + Mirror 2 → cantidad 4; compra externa por 4 → Comprado.
  - Pieza Externa y prioridad vacía → rechazadas.
  - MNO-000001 hereda los datos del plano; en el BOM → Orden interna.
  - No se puede duplicar ni eliminar una pieza en orden, ni cambiar su estatus.
  - No se concluye con procesos pendientes; los concluidos registran usuario.
  - Concluida → Fabricado; reabrir → Orden interna; Cancelada → Solicitado.
  - El PDF muestra los procesos concluidos.
  - Perfil con solo "Ver": consulta sí, modificar no.
  - Eliminar la orden cancelada; siguiente folio MNO-000002.
- **Chromium:**
  - NORMAL/MIRROR editados desde la tabla.
  - Orden creada desde el BOM con 3 piezas.
  - Matriz configurada y un proceso concluido: avance 33 % en el listado.
  - Folio visible en el BOM; PDF generado.
  - A 1366 px y 1500 px se ven las 6 columnas de procesos sin desplazamiento.
  - Sin errores de JavaScript.
- **Regresión:** suites de manufactura/planos, orden de compra desde requisición y
  estatus de requisición; todas OK.

---
# rev41 — Lote terminado, ingreso al almacén y "Piezas de Manufactura"

(Incluye también lo de rev40: tipo de cambio en órdenes de compra en MXN.)

## 1. Orden de Producción — acciones por pieza
Debajo de cada pieza en el modal de la orden hay una fila con:
- **"Marcar lote terminado":** requiere que los procesos que aplican a esa pieza estén
  concluidos. Registra usuario y fecha; tiene la opción "deshacer".
- **"Ingresar al almacén":** lotes **completos o parciales**, con cantidades Normal y
  Mirror por separado.
  - El formulario propone lo que falta.
  - El servidor no permite ingresar más de lo que falta ni ingresar en órdenes Canceladas.
  - Muestra "Almacén: Normal 2/3 · Mirror 0/2" y "✔ completo" al terminar.
- Cada ingreso queda en la pieza y en el historial de la orden.
- El PDF del estatus agrega las columnas "Almacén N · M" y "Lote terminado".

## 2. Almacenes ▸ Piezas de Manufactura (módulo nuevo)
- **Listado:** ID de pieza (con enlace al plano), Job, Tipo, Material, Acabado,
  existencia **Normal** y **Mirror**, total ingresado y último movimiento.
- **Salidas pendientes:** si hay piezas comprometidas en salidas sin surtir, se indica.
- **Filtros:** por Job y por ID.
- **Clic en una fila:** historial de movimientos (ingresos por Orden de Producción, por
  Orden de Compra y salidas), con folio, cantidades y usuario.
- **Datos:** tabla nueva `manuf_stock` (una fila por Job + ID de pieza).
- **Permiso nuevo:** "Piezas de Manufactura". Cada perfil hereda el nivel que tiene en
  Apartados.

## 3. Ingreso por Orden de Compra
- Al recibir una GPO, los renglones que vienen del **BOM de Manufactura** entran a
  **Piezas de Manufactura** y **no** a Apartados.
- **Reparto Normal / Mirror:** primero se completa lo Normal requerido y el resto va a
  Mirror.
- Los demás renglones siguen yendo a Apartados como siempre.
- El aviso indica cuántas piezas fueron a cada lugar.

## 4. Salida de Almacén — pestaña Compra / Manufactura
- **Compra:** el flujo de siempre (Apartados), sin cambios.
- **Manufactura:** piezas del Job con su **disponible** (existencia − salidas pendientes),
  y cantidades de salida Normal y Mirror. "Registrar salida de piezas" crea la salida
  (folio WO) en Pendiente.
- **Surtir:** descuenta del almacén de manufactura y registra el movimiento. Es todo o
  nada: si ya no alcanza la existencia, no surte.

## Cómo se probó
- **PostgreSQL (13 verificaciones):**
  - Lote terminado exige procesos concluidos.
  - Ingreso parcial y tope por lo que falta.
  - Almacén con Normal 2 / Mirror 1 en 2 lotes y datos del plano.
  - Ingreso por OC: la pieza va a Manufactura (Normal 1 + Mirror 1) y el tornillo a
    Apartados.
  - La salida pendiente reserva existencia y no permite exceder lo disponible; al surtir
    se descuenta.
  - La salida de Compra sigue igual.
  - Orden cancelada: no se ingresa.
- **Chromium:**
  - Lote terminado; ingreso 2/3 y luego el resto → "✔ completo".
  - La pieza aparece en Piezas de Manufactura con 2 movimientos.
  - Salida por la pestaña Manufactura (2 N, 1 M) → disponible 1/1.
  - Sin errores de JavaScript.
- **Regresión:** suites de órdenes de producción, orden de compra desde requisición y
  planos; todas OK.

---
# rev42 — Normal y Mirror en las órdenes de compra de manufactura

- **Modal "Generar Orden de Compra" (pestaña Manufactura):** dos cantidades por pieza,
  **Normal** y **Mirror (espejo)**. Cada una propone lo pendiente de su variante
  (requerido − ya comprado).
- **Dos renglones por pieza:** cada pieza genera un renglón **NORMAL** y otro **MIRROR**
  en la orden (se omite el que quede en 0). Ambos tienen su propia cantidad y precio.
  - La descripción dice "… · NORMAL" o "… · MIRROR (espejo)", y lo mismo la nota.
  - Así aparece en el formulario, en el listado y en el PDF que se manda al proveedor.
  - Cada renglón guarda `variante` = Normal / Mirror.
- **Requisición:** registra lo comprado por variante (`comprado_normal`,
  `comprado_mirror`). Al eliminar o cancelar la orden se revierte por variante.
- **Recepción (Ingreso por OC):** cada renglón entra al Almacén de Piezas de Manufactura
  **exactamente** en su variante. Recibir del renglón MIRROR suma Mirror; ya no se reparte
  "Normal primero". Las órdenes anteriores sin variante conservan el reparto de rev41.

## Cómo se probó
- **PostgreSQL:**
  - 3 Normal + 2 Mirror → orden con 2 renglones; requisición comprado 3 / 2 → Comprado.
  - Recibir 1 del renglón MIRROR → Mirror 1, Normal 0; recibir 3 NORMAL → Normal 3.
  - Eliminar la orden → comprado por variante vuelve a 0.
  - Compra parcial de 1 Normal → pendiente 2 Normal + 2 Mirror.
  - El PDF de la orden muestra NORMAL y MIRROR.
- **Chromium:**
  - El modal muestra columnas Normal / Mirror; la orden queda con los dos renglones
    descritos.
  - Recibir 2 del renglón Mirror desde Ingreso por OC → almacén Normal 0 / Mirror 2.
  - Sin errores de JavaScript.
- **Regresión:** suites de piezas de manufactura, orden de compra desde requisición y
  planos; todas OK.
