# rev159 — Menú Logística: Importaciones / Exportaciones y Paquetería

## Menú nuevo "Logística ▾" (después de Almacenes)
- **Importaciones / Exportaciones** y **Paquetería**, con su propia tabla en la base de datos
  (`logistica_mov`; en modo JSON: `LOGISTICA.json`).
- **Las pruebas de entrega** se guardan en `LOGISTICA/<ID>/` del volumen. Se incluyen en el
  respaldo de archivos.

## Importaciones / Exportaciones — campos
- **ID automático** consecutivo (**IE-000001**, IE-000002…).
- **Job Number:** solo **Jobs en WIP** (el servidor también lo valida). El **PM se hereda del
  Job**.
- **Tipo de movimiento:** IMPORTACIÓN / EXPORTACIÓN.
- **Datos del envío:** número de **orden de compra**, número de **factura**, **fecha de embarque**,
  **tracking number** y **proveedor**.
- **Estatus:** LISTO PARA RECOLECCIÓN / EN TRANSITO / EN ADUANA / ENTREGADO.
- **Fecha estimada de entrega.**
- **Datos del transporte**, **notas** y **prueba de entrega** (archivo o fotografía).

## Paquetería — campos
- **ID automático** (**PQ-000001**…).
- **Job Number** en WIP (hereda el PM).
- **Tipo de movimiento:** DESDE PERSICO / HACIA PERSICO.
- **Datos del envío:** **waybill**, **fecha de recolección**, **tracking number** y **proveedor /
  paquetería**.
- **Estatus** (los mismos 4), **fecha estimada de entrega**, **notas** y **prueba de entrega**.

## Edición e historial (ambos)
- **Cada movimiento es editable** (clic en el renglón).
- **Historial de fechas estimadas:** cada cambio de la fecha estimada se guarda con fecha
  anterior → nueva, quién, cuándo y **motivo** (campo que aparece al cambiar la fecha).
  - En la lista, "↻N" indica cuántas veces cambió.
- **Historial de cambios:** alta, estatus, Job, campos editados y archivos subidos o eliminados.
- **Al pasar a ENTREGADO** se registra la **fecha real de entrega**.
- **Prueba de entrega:** se pueden subir varios archivos (fotos, PDF, Office), con miniatura en las
  imágenes. Se abren o descargan desde el movimiento; se pueden quitar con permiso de Control
  total.

## Lista
- **Tarjetas por estatus** (clic para filtrar) y **"con fecha estimada vencida"** (no entregados
  con la fecha ya pasada, en rojo).
- **Búsqueda** (ID, Job, PM, tracking, proveedor, OC, factura, waybill y notas) y filtros por tipo
  y estatus.

## Permisos
- **Módulos** `log-impexp` y `log-paqueteria`, en el grupo **🚚 Logística** de los permisos.
- **Mientras no se les fije un nivel,** toman el de **Ingreso de Material**.
  - Con "Ver" se consulta.
  - Con Crear/Editar se registra, edita y suben pruebas.

## API
- `GET/POST /api/logistica/<impexp|paqueteria>`
- `PUT /api/logistica/<tipo>/<ID>`
- `POST /api/logistica/<tipo>/<ID>/evidencia`
- `GET/DELETE /api/logistica/<tipo>/<ID>/evidencia/<archivo>`

## Otros
- **El menú superior se compacta** en pantallas de hasta 1500 px para que quepan todos los menús.

## Probado
- **Validaciones:** sin Job → rechazado; Job que no está en WIP → rechazado.
- **Alta IE-000001:** importación, Job 652-50 → PM "Luz Munoz - Persico", estatus EN TRANSITO,
  fecha estimada 01-dic.
- **El siguiente folio** es IE-000002.
- **Edición:** fecha 01-dic → **05-dic** ("Retraso en aduana") y estatus EN ADUANA. El historial
  guarda el alta y el cambio con su motivo.
- **Prueba de entrega:** foto subida y descargada.
- **ENTREGADO** → fecha real de entrega registrada.
- **Paquetería PQ-000001 "DESDE PERSICO"** creada; un tipo de importación en Paquetería se
  rechaza.
