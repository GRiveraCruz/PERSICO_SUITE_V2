# rev114 — Purchase Orders: plantilla de Excel para "Cargar Excel"

- **Botón nuevo "⬇ Descargar plantilla Excel"** en Compras ▸ Purchase Orders, debajo de
  "Cargar Excel". También hay un enlace en el modal de carga.
- **La plantilla** (`PURCHASE_ORDERS_PLANTILLA.xlsx`) trae exactamente los encabezados que
  lee la importación, en este orden:
  - Clave
  - Fecha de documento
  - Entregar a
  - Nombre
  - Subtotal
  - Tipo de cambio
  - Estatus
  - Descuento financiero
  - Porcentaje de descuento
  - Fecha de recepción
- **Ayudas dentro del archivo:**
  - encabezados **en rojo = obligatorios** (Clave, Nombre, Subtotal, Estatus) y en azul =
    opcionales; cada encabezado tiene un comentario con qué capturar;
  - un renglón de ejemplo en gris, para borrar antes de cargar;
  - **Estatus con lista desplegable:** Emitida, Recepcionada, Parcial, Cancelada, Cierre
    Anticipado;
  - Clave validada como número entero, y formatos de fecha (AAAA-MM-DD) y de monto ya
    aplicados;
  - hoja **INSTRUCCIONES**: cómo llenarla y qué hacen los modos "Acumular" (agrega y
    actualiza por Clave) y "Reemplazar todo".
- **Probado (ida y vuelta):** se descargó la plantilla, se llenó con un renglón válido y
  uno con Clave "ABC", y se cargó con "Cargar Excel". Se importó el válido con todos sus
  datos y el otro se reportó como "Clave no numérica".
