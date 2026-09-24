# FASE 2 — Parte 1: Reporte por Job y Reporte Multi-Job (puntos #1 y #2 de la auditoría)

## Qué se cambió

**`app.py`**
- Nuevas funciones `wh_load_matching(year, job_main)`, `po_load_matching(year, job_main)`,
  `recovery_load_matching(job_number)`, `_svc_load_matching(path, job_number)`,
  `reassign_items_for_job(job_number, ra_pool=None)`: cada una filtra en SQL (WHERE
  indexado, o `data->>'campo'` para lo que vive en JSONB) en vez de traer la tabla/año
  completo y filtrar en Python.
- `_build_report_data()` ahora usa esas funciones por defecto (caso de un solo Job:
  `/api/report/data`, export a Excel, PDF ejecutivo). Acepta parámetros opcionales
  `wh_pool`, `po_pool`, `fx_all`, `ra_pool`, `rc_pool`, `via_pool`, `gv_pool`, `env_pool`
  para el caso de reportes por lote.
- `/api/report/multi` ahora carga cada colección (WH, PO, CPO, recovery, reassign,
  viáticos, gastos, envíos) **una sola vez por request**, sin importar cuántos jobs
  vengan en el batch, y se la pasa a `_build_report_data()` para cada job. Antes: N jobs
  → N cargas completas de cada colección.
- `cpo_revenue_for_job()` acepta un `pool` opcional por el mismo motivo.
- **Fix de bug encontrado en el camino:** `_svc_save()` (usada por viáticos, gastos de
  viaje y envíos) nunca guardaba la columna `job` en Postgres — solo quedaba dentro del
  JSON de `data`. Sin esa columna poblada, el filtro SQL por job era imposible. Se
  corrigió para que la guarde en cada guardado nuevo.

**`db.py`**
- Nuevo tipo de paso `"backfill"` en `fix_schema_columns()`: rellena una columna que ya
  existe (sin tocar índices ni restricciones), para casos como el bug de arriba, donde
  la columna existía en el esquema pero nunca se llenó.
- Se agregaron 3 entradas a `_SCHEMA_FIXES` (`viaticos`, `gastos_viaje`, `envios`) para
  poblar `job` en las filas que ya estaban en la tabla antes del fix. Se corren llamando
  a `/api/admin/reparar-esquema-db` (ya existía ese endpoint, solo se le agregaron pasos).

## Qué NO se cambió
- El esquema de las tablas (no hay migraciones de Alembic nuevas — todas las columnas
  usadas ya existían).
- El contrato de las funciones `_load_X()` / `_save_X()` originales — siguen ahí, con su
  mismo comportamiento, para todo lo que no sea el reporte de Job.
- La lógica de negocio del reporte (fórmulas de margen, costo, etc.) — solo cambió DE
  DÓNDE viene cada lista de registros antes de que la lógica los procese.

## Cómo se probó (sin acceso a la Postgres de Railway)
1. Se instaló PostgreSQL local (Ubuntu) y se creó una base `persico_test`.
2. Se importaron a esa base los datos reales de `data_seed/` (37 Jobs, 4,253 Work Hours
   2026, 928 Purchase Orders 2026, 28 Hourly Rates, 163 tasas FX) más un puñado de filas
   sintéticas para recovery/reassign/viáticos/gastos/envíos (módulos que no vienen en el
   seed).
3. Se ejecutó `/api/report/data?job=652-50` y `/api/report/multi` (jobs `652-50` +
   `665-00`) en tres variantes:
   - Código **original**, sin DB (fallback JSON).
   - Código **modificado**, sin DB (fallback JSON) — para confirmar que el camino de
     respaldo no se rompió.
   - Código **modificado**, con la Postgres local (para ejercitar las queries SQL
     nuevas: `ILIKE`, `data->>'estatus'` con manejo de `NULL`, `func.upper(...)`,
     `jsonb_array_elements(...) EXISTS`).
4. Resultado: los campos derivados de Work Hours y Purchase Orders son **idénticos**
   entre las tres variantes (mismas 476 horas de trabajo y 80 PO no-canceladas
   encontradas para el job `652-50`, mismos montos). Los campos de recovery/reassign/
   viáticos/gastos/envíos coinciden entre el camino "un solo job" (query SQL directa) y
   el camino "multi-job" (pool cargado una vez + filtrado en Python) — ambos caminos dan
   el mismo número para el mismo job.
5. Se verificó además el backfill: se insertó una fila simulando el estado "antes del
   fix" (columna `job` en NULL, dato solo en el JSON) y `fix_schema_columns()` la
   corrigió correctamente, dejándola visible para el filtro SQL.

## Pendiente para revisión humana antes de producción
- Correr `/api/admin/reparar-esquema-db` una vez en producción después de desplegar este
  cambio, para que las filas viejas de viáticos/gastos/envíos (si las hay) queden con la
  columna `job` poblada.
- No se tocó `/api/report/export-excel` ni `/api/report/executive-pdf` más que
  heredar automáticamente el mismo `_build_report_data()` optimizado — vale la pena que
  alguien con acceso a producción corra un reporte real de ambos y lo compare contra el
  actual antes de reemplazarlo definitivamente.
