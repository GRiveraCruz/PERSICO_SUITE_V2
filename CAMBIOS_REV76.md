# rev76 — Requisición de Compra: descargar los BOMs en Excel (respaldo)

## Qué cambia
En **Compras → Requisición de Compra** hay dos botones nuevos junto a "Buscar en Stock":

- **⬇ Excel de este BOM:** descarga el BOM de la pestaña actual (Eléctrico, Mecánico, Comp.
  mayores o Manufactura).
- **⬇ Excel de todos los BOMs:** un solo archivo con una hoja por BOM.

## Contenido del archivo
- **Resumen:**
  - Job, cliente, fecha y usuario de la descarga;
  - por BOM: renglones, cuántos hay en cada estatus, por revisar, ya no vienen y última
    carga (versión y fecha).
- **Una hoja por BOM**, con todos sus renglones (incluidos los cancelados):
  - **BRAND, PART NUMBER, DESCRIPTION, QUANTITY, STATUS:** las mismas columnas de la
    plantilla de carga, así que el archivo **se puede volver a importar**;
  - reasignado, comprado y pendiente;
  - orden de producción (solo Manufactura);
  - quién lo solicitó y cuándo, comprador y fecha de compra;
  - versión de alta, revisión pendiente, "ya no viene desde", último cambio de carga e ID
    interno.
  - El número de parte se guarda como texto para conservar su formato. El estatus va con
    color, con filtros en el encabezado y columnas fijas.
- **Historial de cargas:** cada versión subida (fecha, usuario, archivo) con todos sus
  cambios: nuevo, modificado, por revisar, diferencia, ya no viene, reaparece, con valor
  anterior y nuevo.

El archivo de **un solo BOM** abre directo en la hoja del BOM. Para restaurar un respaldo,
usa ese archivo en "Subir Excel" del mismo BOM. El de todos los BOMs abre en el Resumen.

## API
- `GET /api/requisiciones/<job>/excel?tipo=electrico|mecanico|componentes_mayores|manufactura|todos`,
  con permiso de ver Requisición de Compra.

## Archivos
- `app.py`: `api_requisiciones_excel()`, `REQ_TIPO_NOMBRE`.
- `static/index.html`: botones de descarga.
- `static/app.js`: `reqDescargarExcel()`.

## Cómo se probó (PostgreSQL local, Job 652-50)
- **Excel del BOM mecánico:** Resumen + Mechanic BOM (7 renglones) + Historial de cargas
  (v1 y v2 con sus cambios).
- **Excel de todos los BOMs:** 4 hojas de BOM más Resumen e Historial.
- **Re-importar el Excel del BOM mecánico en el mismo Job:** 0 nuevos, 7 sin cambio, sin
  duplicar. El renglón que "ya no venía" se marcó como "reaparece", que es correcto porque
  vuelve a venir en el archivo.
- Descargas desde el navegador funcionan. Sin errores de JavaScript.
