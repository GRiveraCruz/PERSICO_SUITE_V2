# rev112 — Facturación (CPC): Serie / Folio guardados y filtro por esa clave

## Serie y Folio en cada factura
- **Campos nuevos en el modal:** **Serie** y **Folio**, junto a Job y Cliente. Se guardan
  en mayúsculas en la factura (antes solo existían dentro de los datos del CFDI).
- **Al cargar el XML** se llenan solos con la Serie y el Folio del CFDI. También se pueden
  capturar a mano en facturas sin XML.
- **Columna "Serie / Folio"** en la lista y en el PDF de la factura.
- **Serie / Folio repetida:** si ya está en otra factura vigente (no cancelada), se pide
  **confirmación** al guardar.
- **Bitácora:** los cambios de Serie / Folio quedan registrados.
- **Facturas registradas antes:** al arrancar toman la Serie y el Folio de su CFDI, si lo
  tienen.

## Filtro por Serie / Folio
- **Campo nuevo "Serie / Folio" en la barra lateral:** busca en **todos los años**, no solo
  en el año seleccionado.
  - Ignora espacios, guiones y mayúsculas: "A77", "a 77" y "A-77" encuentran lo mismo.
  - Se puede buscar solo el folio, por ejemplo "1203".
  - Cada resultado muestra su año, y el contador dice "N factura(s) con Serie/Folio …
    (todos los años)".
  - Al borrar el campo se regresa al año seleccionado.
- **La búsqueda general** (CPC, Job, Cliente, UUID) también encuentra por Serie / Folio
  dentro del año.

## API
- `POST` / `PUT /api/cpc` aceptan `serie` y `folio`. Si la Serie / Folio está repetida,
  responden 409 con `folio_duplicado` (salvo con `confirmar_folio_duplicado`).
- `GET /api/cpc?folio=…` — búsqueda por Serie / Folio en todos los años.

## Probado
- **Factura desde CFDI** → Serie "A", Folio "77". **Factura manual** en 2027 → "B" "1203".
- **Otra factura A 77** → aviso de repetida.
- **Búsquedas:** "A77", "a 77", "B-1203" y "1203" encuentran las facturas correctas, de
  2026 y de 2027.
- **Editar el folio** 1203 → 1204 → queda en la bitácora.
