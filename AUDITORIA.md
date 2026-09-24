# AUDITORÍA — PERSICO_SUITE_V2

**Punto de partida confirmado:** este documento audita el código a partir de `rev02`
(la versión con los cambios de la ronda anterior de esta misma conversación —
optimización de reportes, filtros de Jobs/Quotes/Personal, advisory locks, fix del
spinner de CPU, remoción de íconos/idioma/hover, `backdrop-filter` quitado) más los
cambios nuevos de esta pasada. Los conteos de línea/rutas/módulos del prompt original
(`app.py`: 14,411 líneas y 298 rutas; `app.js`: 14,052 líneas, 29 `DOMContentLoaded`,
9 reasignaciones de `switchMenu`; `index.html`: 7,226 líneas, 48 módulos, 103
`oninput`) se verificaron contra el código real de `rev02` y **coinciden exactos**
(salvo `DOMContentLoaded`: 29 reales vs 28 que cita el prompt, diferencia de 1 sin
importancia) — confirmando que el prompt fue escrito analizando esta misma versión,
aunque la llama "el ZIP original".

Metodología: cada hallazgo de abajo se verificó leyendo el código real (archivo +
línea citados) y, donde fue posible, con una prueba ejecutada localmente contra una
copia aislada — nunca contra producción. Donde no pude verificar algo con evidencia
real, lo digo explícitamente en vez de asumir.

---

## P0 — Bloquean producción (seguridad)

### P0-1. `SECRET_KEY` con valor de repuesto público y hardcodeado — **CORREGIDO en esta pasada**
**Dónde:** `app.py`, línea 76 (antes del fix).
**Evidencia:** `app.secret_key = _os.environ.get("SECRET_KEY", "persico-suite-secret-2026")`.
**Impacto:** si Railway no tiene configurada la variable `SECRET_KEY` (algo que no pude
verificar desde aquí — no tengo acceso a las variables de entorno de producción),
cualquiera que conozca este valor (publicado ahora en este mismo repositorio) puede
forjar una cookie de sesión Flask válida para cualquier usuario, sin contraseña.
**Corrección aplicada:** se quitó el valor de repuesto fijo. Si `SECRET_KEY` no está
configurada, se genera una aleatoria distinta en cada arranque del proceso (con aviso
fuerte en el log) — el efecto visible de no configurarla es que las sesiones no
sobreviven un reinicio/redeploy, una señal imposible de ignorar en vez de un hueco
silencioso.
**Pendiente:** confirmar en Railway que `SECRET_KEY` ya está configurada con un valor
real; si no, configurarla ahora (ver `DESPLIEGUE_RAILWAY.md`). No se cambiaron
contraseñas de usuarios ya almacenadas — quitar este valor de repuesto no las afecta.

### P0-2. `/emergency-reset-admin`: secreto compartido con `SECRET_KEY`, expuesto en query string de un GET — **CORREGIDO en esta pasada**
**Dónde:** `app.py`, ruta `/emergency-reset-admin` (antes del fix).
**Evidencia:** usaba `request.args.get("key")` (GET, secreto en la URL — queda en logs
de acceso del servidor, historial del navegador, proxies intermedios) comparado
contra el mismo valor de `SECRET_KEY` (mismo problema que P0-1, más el riesgo de que
filtrar uno filtra el otro).
**Corrección aplicada:** ahora requiere su propia variable `EMERGENCY_ADMIN_KEY` (sin
valor de repuesto — si no está configurada, el endpoint responde 503 y queda
desactivado por completo), se invoca por `POST` con la clave en el cuerpo JSON (no en
la URL), y la comparación usa `secrets.compare_digest` (evita timing attacks).
**Hallazgo adicional descubierto al probar el fix:** el `before_request` global exigía
sesión iniciada para llegar a esta ruta — contradice su propio propósito de "rescate"
(si el admin queda bloqueado por completo, tampoco podría loguearse para llegar aquí).
Se agregó una excepción explícita para esta ruta en el `before_request`, ya que su
propia clave es la protección real.
**Verificado con prueba real:** sin `EMERGENCY_ADMIN_KEY` → 503; con clave incorrecta →
403; con clave correcta por POST → 200; por GET (como antes) → 405 (ya no funciona,
es intencional).
**Pendiente:** documentar y comunicar al equipo el nuevo procedimiento (ver
`DESPLIEGUE_RAILWAY.md`) — el viejo enlace de navegador (`/emergency-reset-admin?key=...`)
ya no funciona.

### P0-3. Autorización por endpoint del lado servidor — **confirmado sistémico; se corrigió UN caso como prueba de concepto**
**Dónde:** de 169 rutas que modifican datos (`POST`/`PUT`/`DELETE`), un barrido
automatizado (heurística: busca `can(`/`is_admin(`/`_require_sync_key` en las primeras
~6 líneas de cada función — puede tener falsos negativos si el chequeo está más abajo
en la función, así que este número es una **señal, no un conteo exacto**) encontró
**74 sin chequeo visible**.
**Ejemplo verificado a mano:** `api_create_job` (antes del fix) no llamaba a `can()` en
ningún punto de la función — solo dependía de `session.get("user")` vía el
`before_request` global, que es autenticación, no autorización por módulo. El botón
"Nuevo Job" se oculta en el frontend para usuarios sin permiso, pero eso no protege la
ruta: cualquier usuario con sesión activa podía crear un Job llamando el endpoint
directo.
**Corrección aplicada (prueba de concepto, un solo endpoint):** se agregó
`if not can("create", "jobs"): return jsonify({"error": "Sin permiso"}), 403` al
inicio de `api_create_job`, siguiendo el mismo patrón que ya usan otras rutas como
`/api/personal`. **Verificado con prueba real:** un usuario sin permisos (rol
`viewer` por defecto) recibe 403; un admin recibe 201 y el Job se crea normalmente.
**Pendiente — el más grande de todo este documento:** las otras ~73 rutas necesitan el
mismo tratamiento. No se hizo de una vez porque (a) cada una requiere identificar el
módulo/acción correctos para no romper flujos legítimos, y (b) el propio prompt pide
explícitamente no reescribir todo de golpe. Recomiendo: generar la lista completa de
las 74 rutas (puedo hacerlo en la siguiente pasada), agruparlas por módulo, y aplicar
+ probar el chequeo módulo por módulo, empezando por los módulos financieros
(Purchase Orders, Work Hours, Nómina) por ser los de mayor impacto si se explotan.

### P0-4. Contraseña compartida en usuarios de arranque (`_auth_bootstrap_defaults`)
**Dónde:** `app.py`, función `_auth_bootstrap_defaults()` (línea ~174 en esta
versión).
**Estado:** **NO corregido en esta pasada** — identificado pero no tocado.
**Por qué no se tocó todavía:** cambiar esto probablemente implica invalidar sesiones
o forzar un cambio de contraseña real a usuarios que ya existen en producción, lo cual
el prompt pide evaluar con cuidado ("no cambies estas rutas sin pruebas de persistencia
y concurrencia... quitar el bootstrap no cambia contraseñas ya almacenadas"). Antes de
tocarlo necesito confirmar contigo si ya hay usuarios reales usando esa contraseña de
arranque en producción — si es así, el fix correcto no es solo "quitar el valor del
código", sino forzar un cambio de contraseña coordinado.

---

## P1 — Rendimiento y confiabilidad real

### P1-1. `_get_canonical_employees(year)` dentro del ciclo de filas en `api_import_wh` — **CORREGIDO y verificado en esta pasada**
**Dónde:** `app.py`, función `api_import_wh` (línea ~5448 en esta versión).
**Evidencia:** la función abre y parsea un archivo JSON de tarifas desde disco en cada
llamada; se llamaba una vez por cada fila del Excel importado.
**Corrección aplicada:** se movió la llamada fuera del ciclo — se calcula una sola vez
antes de procesar las filas.
**Verificado con prueba real:** con un Excel sintético de 300 filas (3 empleados con
nombres no-homologados, mismo patrón que producción), la función pasó de **300
llamadas a 1 llamada**. Se comparó el resultado completo (empleado homologado, horas,
fecha, work_code) de las 300 filas importadas entre el código antes y después del fix
— **idéntico registro por registro**, confirmando que el fix no cambia ningún dato,
solo cuántas veces se lee el archivo.

### P1-2. `threading.Lock` no coordina los 2 workers de Gunicorn
**Dónde:** `app.py`, variable global `lock = Lock()`, usada en ~120 lugares.
**Estado:** **parcialmente corregido en la ronda anterior de esta conversación**, no
en esta pasada. Se agregó un advisory lock de PostgreSQL (`pg_advisory_xact_lock`,
en `db.py`/`acquire_year_lock`) dentro de `wh_save()` y `po_save()`, que sí coordina
entre workers/procesos (a diferencia del `Lock()` de Python, que es por-proceso).
**Lo que el prompt señala correctamente y que YO MISMO ya había documentado como
pendiente** (ver `CAMBIOS_FASE2_PARTE3.md` de la ronda anterior): el advisory lock
protege que dos `*_save()` no corran su `DELETE`+`INSERT` al mismo tiempo sobre el
mismo (tabla, año) — pero NO protege el ciclo completo de "leer → modificar en Python →
guardar", porque la lectura (`wh_load`/`po_load`) ocurre en una sesión/transacción
separada, ANTES de que se tome el lock. Dos workers pueden leer el mismo estado
"viejo", modificar cada uno su copia, y el segundo en guardar pisa los cambios del
primero sin darse cuenta.
**Pendiente:** cerrar esto del todo requiere que la lectura y la escritura compartan
una sola transacción/lock desde el principio — un cambio de forma a las funciones
`wh_load`/`po_load`/`wh_save`/`po_save` (o a las ~10 rutas que hacen ese ciclo) para
que acepten una sesión ya abierta. No se hizo en esta pasada por el mismo motivo que
P0-3: es un cambio de forma más amplio, mejor candidato para Entrega 2 con sus propias
pruebas de dos escritores concurrentes.

### P1-3. Archivos centinela en `/tmp/` (`.db_schema_initialized`, `.fx_auto_update_thread_started`)
**Dónde:** `app.py`, cerca del final del archivo (bloque de inicialización).
**Estado:** identificado, **no corregido en esta pasada**.
**Riesgo real:** estos archivos viven en el disco EFÍMERO del contenedor de cada
worker — sobreviven reinicios del proceso Python dentro del mismo contenedor, pero NO
sobreviven un redeploy completo (Railway crea un contenedor nuevo). El riesgo
concreto es más sutil: con 2 workers en el mismo contenedor, el primero en arrancar
crea el archivo y corre la inicialización; el segundo lo encuentra y se salta la
inicialización — esto está bien SI la inicialización de verdad solo necesita correr
una vez por contenedor. El riesgo real (no confirmado con evidencia, es una hipótesis
pendiente) es si un *reinicio parcial* de un solo worker (por ejemplo, gunicorn
reciclando un worker por memoria) puede dejar al segundo worker pensando que ya se
inicializó algo que en realidad falló a medias en el primero.
**Pendiente:** revisar si `db_init_schema()`/`init_db()` son *idempotentes* de verdad
(¿qué pasa si se llaman dos veces? ¿y si la primera vez falló a la mitad?) antes de
decidir si el patrón de archivo centinela es aceptable o si conviene una migración
explícita de Alembic en su lugar, como sugiere el prompt.

### P1-4. Debounce global con `stopImmediatePropagation()` sobre TODOS los campos de texto
**Dónde:** `static/app.js`, líneas 44-57 (bloque IIFE al inicio del archivo).
**Evidencia:** intercepta el evento `input` en fase de captura para CUALQUIER
`<input type="text">` o `type="search"` que tenga un `oninput` inline, y llama
`e.stopImmediatePropagation()` — esto no solo retrasa la búsqueda, corta la
propagación del evento para CUALQUIER OTRO listener que dependiera de ese mismo evento
`input` en ese campo (por ejemplo, un listener agregado por separado con
`addEventListener('input', ...)` para validar el campo en vivo).
**Estado:** identificado con evidencia clara, **no corregido en esta pasada** — el
prompt pide explícitamente conservar "propagación, `this`, composición IME y
actualización inmediata de formularios" al corregirlo, lo cual requiere revisar caso
por caso cuáles de los ~103 `oninput` son campos de búsqueda/filtro (donde el debounce
tiene sentido) contra cuáles son campos de formulario que necesitan reflejar cada
tecla de inmediato (por ejemplo, para cálculos en vivo) — confundir unos con otros
rompería formularios reales. Es un candidato sólido para la siguiente pasada de
Entrega 1, pero requiere ese mapeo primero.

### P1-5. `apiCall` no distingue estados HTTP ni respuestas no-JSON
**Dónde:** `static/app.js`, línea 10:
```js
async function apiCall(method,path,body){const opts={method,headers:{'Content-Type':'application/json'}};if(body)opts.body=JSON.stringify(body);const r=await fetch('/api'+path,opts);return r.json()}
```
**Evidencia:** llama `r.json()` sin revisar `r.ok`/`r.status` — si el servidor responde
401, 403, 500, o un error de proxy que devuelve HTML en vez de JSON, `r.json()` lanza
una excepción genérica de parseo (`SyntaxError: Unexpected token <`) en vez de un error
entendible, y el código que llama a `apiCall` no tiene forma de reaccionar distinto a
"no autenticado" vs "error de validación" vs "error de red".
**Estado:** identificado, **no corregido en esta pasada** — el prompt pide
explícitamente revisar los consumidores antes de cambiar el contrato de esta función
(se usa en decenas de lugares), lo cual es un trabajo de mapeo que no alcancé a
terminar en esta pasada.

---

## P2 — Ya resuelto en la ronda anterior de esta conversación (contexto, no nuevo trabajo)

Por transparencia, esto es lo que YA estaba corregido antes de este documento y que el
prompt también señala — no se repitió el trabajo, solo se confirma que sigue en pie:

- **C.1 (`scan_jobs_filtered` no es paginación SQL completa):** cierto y documentado
  como decisión deliberada en `CAMBIOS_FASE2_PARTE2.md` — el filtro va a SQL, el orden
  y recorte se hacen en Python sobre el conjunto ya filtrado (chico). Pendiente decidir
  si vale la pena migrar a paginación 100% SQL (Entrega 2).
- **Reporte por Job y multi-job:** optimizado (de "cargar el año completo N veces" a
  consultas SQL filtradas / carga única por lote) — `CAMBIOS_FASE2_PARTE1.md`.
- **Filtros server-side en Jobs/Quotes/Personal**, preservando el `row` posicional
  correcto para no romper edición — `CAMBIOS_FASE2_PARTE2.md`.
- **Spinners de CPU al 9% en modales nunca abiertos** (`backdrop-filter` + animación
  infinita dentro de un modal oculto solo con `opacity`) — corregido y confirmado por
  el usuario que mejoró el rendimiento.
- **Íconos, sistema de idiomas, sombreado de hover en listas** — `CAMBIOS_UI_ICONOS_IDIOMAS_HOVER_MOVIL.md`.

---

## B — Interfaz adaptable (responsive)

**Estado:** hay una base de trabajo de la ronda anterior (un `@media` para apilar
sidebar/contenido bajo 900px, modal con ancho `min(540px,92vw)`, botones con
`min-height` táctil). **No cubre todavía** lo que pide esta sección del prompt:
- El panel lateral de 490px (mencionado en el prompt) — no lo identifiqué todavía en
  el código de esta pasada; pendiente ubicarlo y confirmar si el `@media` actual lo
  cubre.
- Menús que dependen de hover y se trasladan al `body` — confirmado que existen
  (`.nav-group` usa `onmouseenter`/`onmouseleave`), pero no se revisó su
  comportamiento en pantallas táctiles (donde no hay "hover") ni tras rotar/redimensionar.
- `aria-expanded`, cierre con Escape, navegación por teclado en los menús — no
  implementado todavía.
- Filtros/acciones plegables en tablet/teléfono — no implementado todavía (existe
  paginación virtual de filas, pero no colapso de la barra de filtros en sí).

**Limitación que debo repetir con la misma honestidad de siempre:** no tengo navegador
real en este entorno. Todo lo de responsive se verificó por inspección de código y
balance de llaves CSS, nunca con una captura de pantalla real ni en las resoluciones
que pide la sección 5 del prompt (320×568, 390×844, etc.). Esto queda como pendiente
explícito, no como "hecho".

---

## Resumen de prioridades para la próxima pasada

1. **P0-3 completo** (autorización server-side en las ~73 rutas restantes) — el de
   mayor impacto de seguridad, hacerlo módulo por módulo.
2. **P0-4** (contraseña compartida de arranque) — necesita tu confirmación primero.
3. **P1-4** (debounce global) y **P1-5** (`apiCall`) — requieren el mapeo de
   consumidores que el prompt pide antes de tocarlos.
4. **P1-2 completo** (lectura-modificación-escritura en una sola transacción) y
   **A.1/A.2** (mapa de dependencias de los 29 `DOMContentLoaded` + centralizar
   `switchMenu`) — los cambios estructurales más grandes y riesgosos, mejor como
   Entrega 2 con pruebas de concurrencia dedicadas.
5. **Sección B completa** (responsive real) — sujeta a la limitación de que no puedo
   validarla visualmente en este entorno.
