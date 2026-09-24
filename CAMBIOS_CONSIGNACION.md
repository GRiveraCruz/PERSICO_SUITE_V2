# Cambios — Almacén de Consignación (rev09 → rev10)

## Qué se agregó

**Almacenes ▸ Consignación** — mismas funciones que Stock:
lista con búsqueda (carga de 100 en 100), ingreso de material nuevo o existente
con Job de origen (genera recuperación), edición, importación de Excel (mismo
formato que Stock), borrado (solo admin) y exportación Excel/CSV.

**Compras ▸ Documentos ▸ Reasignaciones Consignación** — mismas funciones que
Reasignaciones: órdenes nuevas o agregar a una existente, filtro por Job, PDF
(marcado "MATERIAL EN CONSIGNACIÓN") y borrado (solo admin). Folio propio `CRA-0000000001`.

**Recuperación de Costos** — ahora muestra también las recuperaciones de
consignación, con una columna "Origen" (Stock / Consignación). Cada una se borra
contra su propia base.

## Base de datos separada

Todo el backend vive en `consignacion.py` (Blueprint de Flask), con su propia
capa de datos definida en `db.py` sobre un `ConsigBase` independiente:

| Tabla | Contenido |
|---|---|
| `consignacion` | inventario |
| `consignacion_reasignaciones` | órdenes CRA |
| `consignacion_recuperaciones` | recuperaciones de costo |
| `consignacion_folios` | contador de folios CRA |

- **Con `CONSIG_DATABASE_URL`** (variable nueva, opcional): estas tablas se crean en
  esa base PostgreSQL, físicamente distinta de la principal. En la principal no se crea ninguna.
- **Sin ella**: misma instancia que `DATABASE_URL`, tablas propias.
- **Sin base de datos**: JSON en `DATA_DIR/CONSIGNACION/`.

Las tablas se crean solas al arrancar (`init_db()`); no hay que correr migraciones.
El log de arranque indica cuál de los modos está activo.

## Diferencias intencionales respecto a Stock (datos fiscales)

- **Transacciones completas**: ingreso + recuperación, o reasignación + descuento de
  existencia, se guardan juntos o no se guarda nada. Con PostgreSQL se toma un
  advisory lock propio, así que dos workers de gunicorn no pueden pisarse.
- **Validación en servidor**: reasignar rechaza materiales que no existen y
  cantidades mayores a la existencia (sumando todos los renglones de la orden).
  Stock descuenta con `max(0, …)` y acepta materiales inexistentes sin avisar.
- **Folios sin huecos**: el folio se asigna al guardar la orden. Consultar la lista solo
  muestra el siguiente, sin consumirlo. (En Stock, cada consulta a `/api/reassign` consume un folio RA.)

## Reporte de Job

Las reasignaciones de consignación **cargan costo** al Job y sus recuperaciones lo
**abonan**, igual que las de Stock. Se suman a `reassign_total` / `recovery_total`,
así que aparecen en el reporte individual, el multi-job y Control de Costo sin
cambiar esos cálculos. Además:
- Campos nuevos informativos: `reassign_consig_total`, `recovery_consig_total`.
- Cada renglón trae `origen: "Consignación"`; el reporte lo marca con la etiqueta "CONSIG.".
- Para excluir consignación del costo del Job: `CONSIG_EN_COSTO_JOB = False` en `app.py`.

## Permisos

- Dos módulos nuevos: `consignacion` y `consig-reassign` (matriz del panel de administración).
- En cada perfil de puesto heredan el nivel de `stock` y `reassign` respectivamente.
  Para darle a un perfil un nivel distinto, agregar la llave explícita en `PROFILES`.
- **Cambio general**: cuando un usuario existente no tiene la llave de un módulo nuevo,
  ahora recibe el nivel que define su perfil (antes: siempre "ver"). Sin perfil, sigue siendo "ver".

## Correcciones de paso en Stock / reportes

- El botón "Importar Excel" de Stock no respetaba el permiso: la regla buscaba
  `stkOpenImport(`, pero la función se llama `openStockImport(`. Se agregó la regla correcta.
- Columna "Orden RA" del reporte de Job siempre vacía: `reassign_items_for_job()` no
  incluía el folio. Ahora lo incluye (copias; los datos guardados no cambian).
- El importador de Stock acepta también los encabezados `LAST_COST` y `LABEL_CODE`
  del propio respaldo Excel, para poder re-importarlo sin perder costo ni etiqueta.

## Archivos
- **Nuevo**: `consignacion.py`.
- `db.py`: modelos y engine de consignación; `init_db()` crea sus tablas.
- `app.py`: registro del módulo, MODULES/PROFILES, relleno de permisos por perfil,
  integración en `_build_report_data()` y pools de los reportes multi-job, respaldos.
- `static/index.html`: menú, dos módulos, tres modales, columna Origen, encabezado "Orden".
- `static/app.js`: lógica de Consignación (carga diferida al abrir el módulo),
  permisos, Recuperaciones combinadas, etiqueta en reporte.

## Cómo se probó
- 37 verificaciones de punta a punta con el test client de Flask, en tres modos:
  JSON, PostgreSQL 16 misma base, y PostgreSQL con `CONSIG_DATABASE_URL` apuntando a
  una segunda base (se confirmó que la principal quedó sin tablas de consignación).
  Incluye concurrencia: 6 solicitudes simultáneas pidiendo todo el saldo → solo una
  pasa, existencia final 0, folios únicos.
- Regresión contra rev09: reporte de 12 Jobs, reporte multi-job y lista de Stock
  idénticos cuando no hay consignación; importación de Stock en PostgreSQL igual.
- Chromium real (Playwright): módulo, modal de reasignación, lista de órdenes,
  Recuperaciones y reporte de Job, como admin y como perfil con nivel "ver"
  (ve el módulo, no ve Ingresar / Reasignar / Importar). Sin errores de JavaScript.

## Pendiente / no incluido
- "Mover Apartados a Stock" no tiene equivalente en consignación a propósito
  (ese material es propiedad de la empresa).
- "Buscar en Stock" de Requisición de Compra no consulta consignación.
- La lista de Stock sigue dibujando todos los artículos de una vez (una función
  posterior reemplaza a la versión con "Cargar más"). No se tocó en esta ronda.
