# Cambios — Importación de Stock (rev08 → rev09)

## Bugs corregidos

**1. `/api/stock/import` no funcionaba (bloqueante).**
En `api_import_stock()`, el `return None` del helper interno `col()` estaba indentado
al nivel de la función de la vista, no dentro de `col()`. La vista regresaba `None`
justo después de definir `col()`, sin leer el archivo, y Flask respondía 500
("did not return a valid response"). El frontend mostraba un error de JSON.
Reproducido con el test client de Flask antes y después del cambio.

**2. `/api/pt/import` tenía exactamente el mismo bug** (mismo `return None` mal
indentado). Corregido igual. Revisé los demás 12 helpers `col()` de `app.py`: están bien.

**3. IDs duplicados en modo "Acumular".**
Los artículos nuevos recibían `id = f"STK-imp-{imported}"`, con el contador empezando en 0
en cada importación. Como la importación de julio ya creó `STK-imp-0` … `STK-imp-970`,
una segunda importación generaba IDs repetidos, y editar/borrar por ID (PUT/DELETE
`/api/stock/<id>`) podía afectar al artículo equivocado. Ahora el ID lleva un prefijo por
corrida: `STK-imp-AAAAMMDDhhmmss-N`. Los IDs existentes no se tocan.

## Mejoras en la misma función

- **Actualiza ubicación y unidad** de artículos existentes cuando el archivo las trae
  (SECCION, CAJA, UNIDAD). Antes, en modo Acumular solo se actualizaban existencia y costo,
  así que las ubicaciones de un conteo físico se perdían. Celdas vacías no borran nada.
  La descripción solo se llena si el artículo no tenía.
- **Valida columnas requeridas**: si faltan FABRICANTE, NUMERO DE PARTE o EXISTENCIA,
  responde 400 con el nombre de la columna faltante (antes importaba 0 filas en silencio).
- **Encabezados sin importar acentos/espacios**: "DESCRIPCIÓN", "Sección", "Último costo" ya se reconocen.
- **Respuesta más clara**: además de `imported`, regresa `updated` y `created`; el modal
  muestra "N actualizados · M nuevos".
- El modal lista también las columnas opcionales y aclara que ULTIMO COSTO es en USD.

## Archivos tocados
- `app.py`: `api_import_stock()` (reescrita), `api_import_pt()` (1 línea de indentación).
- `static/app.js`: mensaje de resultado en `runStkImport()`.
- `static/index.html`: texto del modal `mo-stk-imp`.

## Sin cambios
- Esquema de base de datos, `stock_load()` / `stock_save()`, y el criterio para identificar
  un artículo (fabricante + número de parte).
- Existencias siguen siendo enteras (el valor se trunca como antes).

## Cómo se probó
Test client de Flask con respaldo JSON, sembrado con los 973 registros de
`stock_2026_backup.xlsx`, importando `Stock_Import_Agosto_2026.xlsx` en modo Acumular:
200 OK, 969 actualizados, 121 nuevos, 1,094 en total, 0 IDs repetidos, 0 claves
(fabricante + no. de parte) repetidas. El mismo archivo contra el código rev08 reproduce el 500.

## Ajuste posterior
- `runStkImport()` ya no intenta leer como JSON una respuesta HTML: si el servidor
  responde con una página de error, muestra "Error <código> del servidor…" en vez de
  `Unexpected token '<', "<!doctype "... is not valid JSON`.
- Verificado también contra PostgreSQL 16 real (no solo el respaldo JSON): 200 OK,
  969 actualizados, 121 nuevos, 1,094 filas en la tabla `stock`, 0.4 s.
