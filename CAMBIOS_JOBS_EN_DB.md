# Cambios — "Job no encontrado" con PostgreSQL (rev14 → rev15)

## Causa
Con PostgreSQL los Jobs viven en la tabla `jobs`. Varias rutas comprobaban que un Job
existiera buscando **su carpeta en disco** (`DATA_DIR/JOBs/<job>`). En Railway esa
carpeta no existe para muchos Jobs: el disco no es permanente, y los Jobs migrados o
creados con la base activa nunca la tuvieron.

## Síntomas corregidos (reproducidos con rev14 y verificados en rev15)
| Dónde | rev14 | rev15 |
|---|---|---|
| Editar Job (`PUT /api/jobs/<job>`) | 404 "Job no encontrado" | se guarda |
| Job Report / Multi-Job / Dashboards | revenue 0, cliente, PM y descripción vacíos | datos del Job |
| Crear Job con un número que ya existía en la base | **sobrescribía el Job existente** | 409 "El Job … ya existe." |
| Siguiente número de Job | solo contaba carpetas (podía reiniciar en 100 o repetir) | cuenta carpetas + base |
| Detalle de PT y SV | Jobs sin cliente, descripción ni PM | datos del Job |

El segundo punto también afectaba al Dashboard de Project Manager: los Jobs sin
Configurar Proyecto se calculaban contra un revenue de 0.

## Cambio
- **Nueva función `job_exists(job_number)`:** con DB revisa primero la tabla `jobs` y
  después la carpeta; sin DB, la carpeta como siempre.
- Se usa en editar Job, en `_build_report_data()` y en el detalle de PT/SV. Estos
  últimos ahora leen los datos con `read_meta()`, que ya sabía leer de la base.
- `all_job_numbers()` une carpetas y tabla `jobs`; `next_main_index()` usa esa lista.

Las rutas que manejan archivos del Job (documentos, CIERRE, renombrar, fusionar)
siguen usando la carpeta porque ahí sí trabajan con archivos. No se tocaron.

## Cómo se probó
- **PostgreSQL 16**, Job 701-00 creado solo en la base (sin carpeta), mismo script
  contra rev14 y rev15: los cinco síntomas de la tabla se reproducen en rev14 y quedan
  corregidos en rev15.
- **Modo JSON** (con carpetas): reportes de 12 Jobs, Multi-Job y Stock idénticos a rev14.

---
# rev23 — Cambiar número de Job con PostgreSQL

## Problema reportado
El cambio de número "se realizaba", pero el Job nuevo no aparecía, el anterior seguía en
la base y un segundo intento no se permitía.

## Causa (reproducida con rev22)
`POST /api/jobs/<job>/renumber` solo renombraba la **carpeta** en disco y su
`job_info.json`. **Nunca cambiaba la fila de la tabla `jobs`** en PostgreSQL:
- **1er intento:** responde OK. La carpeta pasa a ser la del número nuevo, pero la base
  sigue con el número viejo y el nuevo no existe.
- **2º intento:** falla. La carpeta vieja ya no existe, y la del número nuevo existe, así
  que se toma como duplicado.

Además, el aviso decía "actualiza todos los registros asociados", pero solo actualizaba PT y SV.

## Corrección
- **Validación:** se valida contra la base y las carpetas. Hay conflicto si el número
  nuevo ya existe en la base, o si existen las dos carpetas.
- **Reanudación de cambios a medias:** si el Job viejo sigue en la base, su carpeta ya no
  existe y la carpeta nueva sí, se trata como un cambio anterior que quedó a medias y se
  completa. La respuesta trae `reanudado: true`. **Es el caso reportado: basta con volver
  a hacer el mismo cambio con rev23.**
- **Orden:** primero la carpeta (si existe), después la fila de `jobs` en la base. Si la
  base falla, la carpeta regresa a su nombre original.
- **Referencias actualizadas** (campo de Job exacto):
  - PT y SV.
  - Requisiciones de compra.
  - Órdenes RA y recuperaciones.
  - Órdenes CRA y recuperaciones de Consignación.
  - Configurar Proyecto.
  - Viáticos, gastos de viaje y envíos.
- La respuesta incluye cuántos registros se cambiaron por colección. Si alguna colección
  falla, se reporta y las demás continúan.
- **Aviso de confirmación:** ahora dice exactamente qué se actualiza y qué no.

## Lo que NO se cambia (igual que antes, ahora declarado)
Horas trabajadas (work_code), órdenes de compra IPO (entregar_a / job), CPO e IVP
conservan el número anterior. Son documentos donde el Job va dentro de texto o códigos, y
cambiarlos en automático es riesgoso. Si se requiere, se hace por separado.

## De paso
"Fusionar Jobs" (Config → Administrador) tiene el mismo problema: trabaja con archivos
JSON y no con la base. No se modificó en esta revisión.

## Cómo se probó
- **Con rev22 en PostgreSQL:**
  - 1er intento: "OK"; en la base sigue 700-00; la carpeta es 700-10.
  - 2º intento: 409 "700-10 ya existe" (el caso reportado).
- **Con rev23 sobre ese mismo estado:**
  - Se completa con `reanudado: true`; en la base queda 700-10 con sus datos y ya no 700-00.
- **Cambio completo 701-00 → 711-05 con referencias:**
  - Se cambiaron 1 requisición, 1 RA, 1 recuperación, 1 CRA, 1 Configurar Proyecto,
    1 PT y 1 viático.
  - El Job Report del número nuevo conserva reasignaciones (7), recuperaciones (−5) y
    servicios (10).
- **Otros casos:**
  - Job solo en la base (sin carpeta): se renumera.
  - Destino existente: 409 sin cambios.
  - Origen inexistente: 404.
- **Modo JSON (carpetas):** funciona igual que antes.
