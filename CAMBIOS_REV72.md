# rev72 — Cambios entre cargas del BOM · PM sin resultado financiero

## 1. Requisición de Compra: identificar qué cambió en cada carga del BOM
Antes, al subir una actualización del BOM solo cambiaba la fecha. No había forma rápida de
saber qué renglones eran nuevos, cuáles se modificaron o cuáles ya no venían.

### Versiones
- Cada carga de Excel (Eléctrico, Mecánico, Componentes mayores) queda registrada como una
  **versión** (v1, v2, v3…) por Job y BOM.
- Cada versión guarda fecha, usuario, archivo, renglones del archivo y la **lista de
  cambios**.
- Tabla nueva `requisiciones_cargas`; se crea sola al arrancar.

### Tipos de cambio
| Cambio | Qué significa |
|---|---|
| **Nuevo** | El número de parte no existía; se agregó. |
| **Modificado** | Se aplicó un cambio: subió la cantidad, o se completó una marca/descripción que estaba vacía. Muestra el valor anterior y el nuevo. |
| **Por revisar** | El archivo pide menos cantidad, o el renglón ya está Comprado/Cancelado. No se aplica; queda el aviso con Aceptar/Descartar, como antes. |
| **Diferencia** | El archivo trae otra marca o descripción que la guardada. **No se sobrescribe**; solo se informa. |
| **Ya no viene** | El renglón existía pero no viene en esta carga (posible baja del BOM). **No se borra ni se cancela**; se marca para decidir qué hacer. |
| **Reaparece** | Un renglón que no venía volvió a aparecer en el BOM. |

Una revisión o diferencia que sigue igual en la carga siguiente no se vuelve a listar como
cambio nuevo.

### En pantalla
- **Panel "Cambios de la carga"** arriba de la tabla:
  - selector de versión (fecha y usuario de cada una);
  - archivo y renglones sin cambio;
  - un **botón por tipo de cambio con su conteo**, que filtra la tabla;
  - casilla **"Solo renglones con cambios"**;
  - lista desplegable con todos los cambios de la versión: número de parte, descripción y
    "valor anterior → nuevo".
- **En la tabla**, cada renglón cambiado lleva su etiqueta de color bajo el número de parte
  (por ejemplo, "Modificado · Cantidad") y un fondo del mismo color. Al pasar el mouse se
  ve el detalle.
- **Al subir un archivo:**
  - la pantalla salta a la versión nueva con el filtro "Solo renglones con cambios";
  - el resultado de la carga dice el número de versión y cuántos renglones ya no vienen.
- El historial empieza con la primera carga hecha con esta versión del sistema. Las cargas
  anteriores no tienen registro de cambios.

### API
- `POST /api/requisiciones/upload` agrega `version` y `resumen` a la respuesta.
- Nuevo `GET /api/requisiciones/<job>/cargas?tipo=` (historial con cambios).
- Cada renglón guarda `carga_version` (cuándo se agregó), `cambios_carga` (por versión) y
  `ausente_desde`.

## 2. Project Manager: solo resultado operativo
- Las tarjetas del Dashboard PM ya no muestran el **resultado financiero**, solo el
  operativo.
- El servidor tampoco lo envía al PM.

## Archivos
- `db.py`: modelo `RequisicionCarga`.
- `app.py`: `api_requisiciones_upload()` (versiones y bitácora de cambios),
  `api_requisiciones_cargas()` y `api_dashboard_project_manager()` (sin financiero).
- `static/app.js`:
  - nuevas: `reqCambiosPanelHTML()`, `reqCambiosItem()`;
  - cambian: `reqRenderTab()`, `reqRenderTable()`, `reqUploadFile()` e `ingFinHTML()`
    (`sin_financiero`).

## Cómo se probó (PostgreSQL local, BOM mecánico de 652-50)
- **Carga v1:**
  - 1 nuevo (M-400);
  - 3 modificados (M-100 cantidad 2→3; P-0 marca y descripción completadas);
  - 1 por revisar (M-200 4→2);
  - 1 diferencia (M-300 marca NA → TRUARC);
  - 2 ya no vienen (P-1, P-2).
- **Carga v2** (agrega P-1 con cantidad 2): P-1 reaparece y queda por revisar (5→2). M-200
  y M-300 no se vuelven a listar.
- Filtros, selector de versión y lista de cambios funcionan.
- El PM ve solo el resultado operativo.
- Sin errores de JavaScript.
