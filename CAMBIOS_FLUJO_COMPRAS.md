# Flujo de compra desde requisición

1. El solicitante sube el Excel en Compras → Requisición de Compra, asociado a un Job y tipo de BOM.
2. Compras pulsa **Buscar en Stock** y puede emitir una reasignación desde los resultados existentes.
3. Compras marca los renglones **Solicitado** pendientes y pulsa **Crear orden con solicitados**.
4. Se consulta Stock de nuevo; las piezas con cualquier existencia, incluso parcial o encontrada por etiqueta, se retiran del borrador y se informa cuáles son.
5. Se abre la orden con Job y cantidades pendientes. Compras selecciona proveedor, esquema tributario y captura el precio unitario en cada renglón.
6. Al emitir, el servidor vuelve a consultar Stock y comprueba estatus y cantidad pendiente de cada requisición. Si aparece existencia, rechaza la emisión e indica a la pantalla qué renglones retirar. La orden no se emite vacía.
7. La orden emitida registra sus renglones de requisición y descuenta la cantidad comprada del pendiente. Las compras parciales dejan el renglón en **Solicitado**; si queda cubierto, pasa a **Comprado**.

La cancelación o eliminación de una orden vinculada restituye las cantidades de la requisición. Para cambiar los materiales de una orden vinculada se debe cancelar y emitir otra con el pendiente actualizado.

No hay migración de esquema: cantidad_comprada y el historial de órdenes se almacenan en el JSON de cada renglón. La emisión vinculada guarda orden, partidas de compras y actualización de requisición en una sola transacción de base de datos.

Verificación: prueba de integración con Flask y SQLAlchemy para existencia parcial, coincidencia por etiqueta, compra parcial y completa, intento duplicado y cancelación; revisión sintáctica de Python y JavaScript.
