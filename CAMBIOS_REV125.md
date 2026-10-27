# rev125 — Órdenes de cobro: saldar con una factura ya registrada

## Botón "Facturar" (Finanzas ▸ Órdenes de cobro)
Abre una ventana con dos opciones:

1. **➕ Registrar factura nueva:** el flujo de siempre. Abre CPC ▸ Nueva factura con los datos
   de la orden y, al guardarla, la orden queda Facturada.
2. **🔗 Usar una factura ya registrada:** lista las facturas de CPC disponibles y salda la orden
   con la que se elija.

## Condición: los montos deben coincidir
- **Se compara el total de la factura contra el total de la orden** (USD, con IVA si la orden
  lo requiere):
  - **factura en USD:** diferencia máxima de **$0.01**;
  - **factura en MXN:** su equivalente en USD (con el tipo de cambio de la propia factura)
    dentro de **±0.5 %**.
- **Solo se pueden seleccionar las que coinciden.**
  - Con "Solo las que coinciden en monto" desmarcado se ven todas, con su diferencia, pero
    deshabilitadas.
- **El servidor vuelve a validar el monto** al saldar. Si no coincide, rechaza con el detalle:
  "factura … vs orden …".

## La lista de facturas
- **Se excluyen** las facturas **canceladas** y las que **ya saldan otra orden**.
- **Orden:** primero las que coinciden y las relacionadas con la orden (misma CPO, Job o
  cliente, que se indica en la lista).
- **Columnas:** folio CPC, serie y folio, fecha, cliente, Job y CPO, total (con su
  equivalente en USD si es MXN) y diferencia.
- **Búsqueda** por factura, serie/folio, cliente, Job o UUID.

## Al saldar
- **La orden** queda **Facturada** con esa factura ("· existente" en la lista) y su bitácora
  lo registra.
- **La factura** queda ligada a la orden (`orden_cobro_id`) y su bitácora también lo registra.
- **Una factura solo puede saldar una orden.**
- **"Desligar"** (permiso de Control total, con motivo): quita la factura de la orden. La orden
  regresa a "Por facturar" y la factura queda libre.

## API
- `GET /api/ordenes-cobro/<orden>/facturas-candidatas`
- `POST /api/ordenes-cobro/<orden>/vincular` (`cpc_id`)
- `POST /api/ordenes-cobro/<orden>/desvincular` (`motivo`)

## Probado
- **Orden** de $34,800 (30 % + IVA) → la factura USD de $34,800 aparece como "✓ coincide"
  (mismo Job y cliente).
- **Saldar con una factura de $1,160** → rechazado ("Los montos no coinciden").
- **Saldar con la de $34,800** → orden Facturada y factura ligada.
- **La misma factura a otra orden** → rechazado. Ya no aparece entre las candidatas.
- **Orden de $81,200 con factura MXN** $1,502,200 a TC 18.5 → equivalente $81,200 → aceptada.
- **Desligar** → orden "Por facturar" y factura libre.
