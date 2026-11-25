# rev174 — Catálogo de CONSUMIBLES

## Qué es
- **Compras ▸ Catálogos ▸ "Consumibles":** catálogo nuevo con **las mismas funciones** que
  Eléctrico, Mecánico y Servicio.
  - **Códigos consecutivos `CN-00001`, `CN-00002`…**
  - **Columnas:** código, marca, No. de parte, descripción, **etiqueta (QR / código de barras)** y
    último precio.
  - **Funciones:** búsqueda, **＋ Nuevo item**, editar o eliminar (clic en el renglón), **Importar
    Excel** (acepta la columna `CN-CODE`), exportar a Excel/CSV y Recargar.
  - **Marca "NUEVO · POR REVISAR"** y filtro "por revisar" para lo dado de alta desde una OC.

## Integración
- **Generar Orden de Compra:**
  - el buscador de items incluye Consumibles (filtro "🧴 Consumibles");
  - la categoría del renglón tiene la opción **🧴 Consumibles**.
- **Alta automática al emitir una OC (rev148):** un consumible nuevo se da de alta como `CN-…`, o
  se liga si ya existe, y actualiza el último precio.
- **Permisos:** módulo `cat-consumibles` en el grupo Catálogos, con el **mismo nivel por perfil**
  que el catálogo de Servicio. Los botones de alta e importación respetan el permiso.
- **Base de datos:** misma tabla `catalogos_compra` (familia `consumibles`), sin cambios de
  esquema. En modo JSON: `catalogo_consumibles.json`.
- **Respaldos y exportaciones:** incluyen `catalogo_consumibles`.

## Corrección de paso (todos los catálogos)
- **Importar Excel asignaba el mismo código a varios renglones nuevos** de una misma importación
  (p. ej. dos `CN-00002`). El consecutivo se leía de lo ya guardado y no de lo asignado durante la
  importación.
- **Ahora cada renglón recibe el siguiente código libre.**
- **Duplicados de importaciones anteriores:** si algún catálogo ya tiene códigos repetidos por
  esta falla, se pueden revisar y corregir editando el código.

## Probado
- **Alta y edición:** CN-00001 (disco de corte); edición de precio.
- **Importación de 2 renglones** → CN-00002 y CN-00003 (antes: dos CN-00002).
- **OC con un consumible nuevo** → alta automática **CN-00004** "por revisar".
- **Eliminar** → OK.
- **En pantalla:** catálogo con la columna Etiqueta y el contador "1 por revisar".
