# Cambios — Folios RA sin huecos y Buscar en Stock + Consignación (rev10 → rev11)

## 1. Folios de Reasignación (RA) sin huecos

**Antes:** `GET /api/reassign` llamaba a `reassign_next_number()`, que incrementa el
contador. Cada vez que alguien abría la lista, escribía en el filtro por Job o abría
el modal "Reasignar Material" se consumía un folio. Luego el navegador mandaba ese
folio al guardar, así que también podían chocar dos personas con el mismo número.

**Ahora:**
- `GET /api/reassign` devuelve `reassign_peek_number()`: el siguiente folio **sin consumirlo**.
- El folio se asigna en el servidor **solo al guardar** una orden nueva. Si el navegador
  manda un número, se ignora. Si el contador quedara atrás de una orden ya existente,
  se salta al primer folio libre en vez de responder 409.
- El modal dice "Folio (se asigna al guardar)", igual que en Consignación.
- Agregar a una orden existente no cambia.

Los huecos que ya existen en la numeración histórica no se pueden rellenar; a partir
de este despliegue la numeración es consecutiva.

## 2. Requisición de Compra: Buscar en Stock y Consignación

`POST /api/requisiciones/buscar-stock` ahora regresa, por renglón:
- `quantity_en_stock` y `estatus` — **solo Stock**, mismo significado que antes.
- `quantity_en_consignacion` y `estatus_con_consignacion` — Stock + Consignación juntos,
  para saber si la consignación completa lo que falta.
- `incluye_consignacion` indica si se consultó consignación.

Estos dos campos nuevos **solo se incluyen si el usuario tiene al menos nivel "ver" en
Consignación**. Si no, la respuesta es igual que antes. Si Consignación no se pudo
consultar, se responde con Stock y un aviso, en vez de fallar toda la búsqueda.

En pantalla:
- El resultado muestra "En Stock: X · En Consignación: Y".
- Muestra el estatus de Stock y, cuando Stock no alcanza pero hay consignación, un
  segundo estatus "Con consignación: …".
- La columna "En Stock" de la tabla agrega "+ Consig.: Y → Existencia total/parcial".

## De paso
- La tecla Esc no cerraba los tres modales de Consignación (no estaban en la lista del
  manejador). Agregados.

## Archivos
- `app.py`: `reassign_peek_number()` nuevo, `GET`/`POST /api/reassign`, `api_requisiciones_buscar_stock()`.
- `static/app.js`: `saveReassignOrder()`, `reqBuscarStock()`, lista de modales de Esc.
- `static/index.html`: texto del folio en el modal RA y título del resultado de búsqueda.

## Cómo se probó
Test client de Flask en JSON y PostgreSQL 16 (13 verificaciones, todas bien):
5 consultas seguidas no mueven el contador; la orden guardada recibe el folio que se
mostró aunque el cliente mande otro; el siguiente es consecutivo; se salta un folio ya
ocupado; 6 órdenes simultáneas reciben 6 folios distintos; la búsqueda da el estatus
correcto en los cuatro casos (solo Stock, Stock parcial + consignación, solo
consignación, ninguno); un usuario sin acceso a Consignación no recibe esas cantidades
y ve exactamente el mismo estatus de Stock.

En Chromium: se abrió y filtró la lista de RA 4 veces y la orden se guardó con el mismo
folio que se había mostrado; el resultado de búsqueda se ve como se describe; Esc
cierra el modal de ingreso de Consignación. Sin errores de JavaScript.
