# rev57 — Configurar Proyecto: pestaña DOCUMENTACIÓN (antes Plan de Personal)

## Qué cambia
- La pestaña **Plan de Personal** ahora se llama **Documentación**.
- Tiene un recuadro (drop) por documento:
  1. Aprobación de diseño
  2. Diagrama eléctrico
  3. Diagrama neumático
  4. 3D de ensamble general de máquina o tool
- **Cómo se sube:** se arrastra el archivo o se hace clic para elegirlo. Se sube al momento;
  no espera a "Guardar Configuración".
- **Conteo de versiones:** cada subida es una versión nueva (v1, v2, v3…). El número se ve en
  la esquina del recuadro.
- **Solo queda la última versión.** Al subir una nueva, la anterior **se borra** del
  servidor. Antes de reemplazar se pide confirmación, indicando qué versión se va a borrar.
- **Historial:** de cada versión queda solo el registro (número, nombre, fecha, usuario), sin
  el archivo, para saber cuántas versiones ha tenido el documento.
- **Ver / Descargar:** PDF, PNG y JPG se pueden abrir en el navegador. Cualquier otro formato
  (STEP, DWG, SLDASM, ZIP…) se descarga. Por seguridad, ningún otro tipo se abre dentro de
  la aplicación.
- Se acepta cualquier tipo de archivo, hasta **100 MB** por archivo.
- El PT/SV se identifica sin importar guiones ni espacios (PT-0065 = PT0065).

## Dónde se guardan
- **Con base de datos (Railway):** tabla nueva `proyecto_documentos`, un renglón por PT/SV
  y documento. Al subir una versión se reemplaza el archivo en ese mismo renglón.
  - Igual que los planos del BOM, se guarda en la base y no en el volumen, para que no se
    pierda en un redeploy.
  - La tabla se crea sola al arrancar la aplicación (`create_all`); no hay que correr nada.
  - Las subidas simultáneas del mismo documento se serializan con `pg_advisory_xact_lock`,
    así que el número de versión nunca se repite.
- **Sin base de datos (modo local):** `DATA/proyecto_docs/<PT>/<tipo>/`, borrando el
  archivo anterior.

## Plan de Personal
- Se quitó la pantalla, pero **no se borra lo ya capturado**: al guardar la configuración se
  reenvía el plan que ya tenía el PT/SV. Antes, sin la pantalla, se habría guardado vacío.
- Se conservan el código y los endpoints del Plan de Personal (importar y plantilla), por
  si se necesita reactivarlo o llevarlo a otra sección.

## API
- `GET  /api/projconfig/documentos?ptsv=` → tipos y versión vigente de cada documento (sin
  el archivo).
- `POST /api/projconfig/documentos` (ptsv, tipo, file) → sube la versión nueva y borra la
  anterior. Permiso de crear en Configurar Proyecto.
- `GET  /api/projconfig/documentos/archivo?ptsv=&tipo=[&descargar=1]` → versión vigente.

## Archivos
- `db.py`: modelo `ProyectoDocumento`.
- `app.py`: `PROJ_DOC_TIPOS`, `_ptsv_key()` y los tres endpoints.
- `static/index.html`: pestaña y contenedor de Documentación; se quitó el contenido del Plan
  de Personal.
- `static/app.js`:
  - nuevas: `pcDocsCargar()`, `pcDocsRender()`, `pcDocSubir()`;
  - cambian: `pcSwitchTab()` y `pcSave()`, que ahora conserva el plan de personal.

## Cómo se probó
- **PostgreSQL 16 local** con los datos migrados de `data_seed`, igual que en Railway:
  - La tabla se creó sola, con el índice único (PT, tipo).
  - 3 subidas del diagrama eléctrico (la 2.ª de 3 MB) → v3. Queda un solo renglón con el
    archivo de v3 y 3 registros en el historial.
  - 6 subidas simultáneas del diagrama neumático → versiones 1 a 6, sin repetir.
- **Modo sin base de datos:** 3 versiones de la aprobación de diseño → en disco solo queda
  el archivo de v3.
- **Navegador (Chromium):**
  - pestaña "Documentación";
  - subida por selector de archivo en dos recuadros;
  - reemplazo de v1 por v2 en el 3D, con confirmación;
  - historial desplegable;
  - "Ver" solo en PDF/imagen.
  Sin errores de JavaScript.
