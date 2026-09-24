# CAMBIOS.md — Entrega 1 (primera pasada sobre el prompt de auditoría)

Punto de partida: `rev02` (ver `AUDITORIA.md` para la explicación completa de por qué
ese es el estado correcto, no el ZIP "original" que cita el prompt).

## 1. `SECRET_KEY` sin valor de repuesto público

**Qué cambió:** `app.py`, inicialización de `app.secret_key`. Ya no usa el string fijo
`"persico-suite-secret-2026"` como respaldo. Si la variable de entorno `SECRET_KEY` no
está configurada, se genera una aleatoria (`secrets.token_hex(32)`) distinta cada vez
que arranca el proceso, con un aviso impreso en el log.

**Por qué:** ese valor de repuesto era público (está en el código fuente) — cualquiera
que lo conociera podía forjar una cookie de sesión Flask válida para cualquier usuario
sin contraseña, si Railway no tenía la variable configurada.

**Efecto secundario a tener en cuenta:** si `SECRET_KEY` NO está configurada en
Railway, las sesiones dejan de sobrevivir un reinicio o redeploy (cada worker/proceso
genera su propia clave). Esto es intencional — es preferible que el equipo note
"me desconectó sin razón" a que el hueco de seguridad pase inadvertido. **Acción
requerida:** confirmar que `SECRET_KEY` ya está en las variables de Railway; si no,
configurarla (ver `DESPLIEGUE_RAILWAY.md`).

## 2. `/emergency-reset-admin` — endpoint propio, sin compartir secreto, sin exponerlo en la URL

**Qué cambió:**
- Ahora requiere su propia variable `EMERGENCY_ADMIN_KEY` (ya no reutiliza
  `SECRET_KEY`). Sin configurarla, el endpoint responde `503` (desactivado).
- Cambió de `GET /emergency-reset-admin?key=...` a `POST /emergency-reset-admin` con
  `{"key": "..."}` en el cuerpo JSON.
- La comparación de la clave usa `secrets.compare_digest` (protección contra timing
  attacks).
- Se agregó una excepción explícita en el `before_request` global para esta ruta —
  antes exigía sesión iniciada para llegar aquí, lo cual anulaba su propósito de
  "rescate" si el admin queda bloqueado.

**Por qué:** el secreto viajaba en la URL de un GET (queda en logs de acceso del
servidor, historial del navegador, proxies) y compartía valor con `SECRET_KEY`
(filtrar uno filtraba el otro).

**Efecto secundario — rompe el procedimiento anterior a propósito:** el enlace viejo
tipo `https://tu-app.up.railway.app/emergency-reset-admin?key=...` **ya no funciona**
(devuelve 405, método no permitido). El nuevo procedimiento está en
`DESPLIEGUE_RAILWAY.md`. Si el equipo tiene este enlace guardado en algún lado
(favoritos, un documento de procedimientos), hay que actualizarlo.

## 3. Autorización server-side en `api_create_job` (prueba de concepto de un problema más amplio)

**Qué cambió:** se agregó `if not can("create", "jobs"): return jsonify({"error": "Sin permiso"}), 403`
al inicio de la función, antes de crear el Job.

**Por qué:** la ruta no verificaba permisos del lado del servidor — solo exigía estar
logueado. El botón "Nuevo Job" se oculta en el frontend para usuarios sin permiso, pero
eso no protege la ruta (cualquiera con sesión activa podía llamarla directo).

**Efecto secundario:** ningún usuario legítimo con permiso de "crear" en el módulo
"jobs" debería notar ningún cambio. Un usuario sin ese permiso que hoy pudiera crear
Jobs llamando la API directamente (algo que no debería estar haciendo) ahora recibe
403. **Esto es solo 1 de ~73-74 rutas con el mismo problema** — ver `AUDITORIA.md`
sección P0-3 para la lista de trabajo pendiente.

## 4. `_get_canonical_employees(year)` movido fuera del ciclo de filas en `api_import_wh`

**Qué cambió:** la llamada que antes estaba dentro de `for row in ws.iter_rows(...)`
(una vez por cada fila del Excel) se movió a antes del ciclo (una sola vez).

**Por qué:** esa función abre y parsea un archivo JSON desde disco en cada llamada; con
un Excel de cientos o miles de filas, se leía el mismo archivo cientos o miles de
veces sin necesidad — el resultado no cambia entre una fila y la siguiente (depende
solo del año, que es fijo para todo el import).

**Efecto secundario:** ninguno esperado — se probó con un Excel sintético de 300 filas
y el resultado (empleado homologado, horas, fecha, work_code de cada fila) es
idéntico antes y después del cambio. La única diferencia medida es que
`_get_canonical_employees` pasó de 300 llamadas a 1.

## Pruebas ejecutadas (todas locales, contra una Postgres/JSON de prueba — nunca producción)

| Cambio | Prueba | Resultado |
|---|---|---|
| `SECRET_KEY` | Arrancar sin la variable configurada, inspeccionar `app.secret_key` | No es el valor viejo; es aleatorio |
| `/emergency-reset-admin` | Sin `EMERGENCY_ADMIN_KEY` | 503 |
| | Con clave incorrecta | 403 |
| | Con clave correcta (POST+JSON) | 200, admin restaurado |
| | Por GET (método viejo) | 405 |
| `api_create_job` | Usuario sin permiso (`viewer`) | 403 |
| | Usuario admin | 201, Job creado normalmente |
| `_get_canonical_employees` | Excel sintético de 300 filas, comparar antes/después | 300→1 llamadas; datos importados idénticos fila por fila |

## No incluido en esta pasada (ver `AUDITORIA.md` para el detalle de cada uno)

- Las ~73 rutas restantes sin autorización server-side (P0-3).
- Contraseña compartida de usuarios de arranque (P0-4) — pendiente tu confirmación.
- Ciclo completo leer-modificar-guardar en una sola transacción (P1-2).
- Archivos centinela en `/tmp/` (P1-3).
- Debounce global (P1-4) y `apiCall` (P1-5) — necesitan mapeo de consumidores primero.
- Mapa de dependencias de los 29 `DOMContentLoaded` + centralización de `switchMenu`
  (A.1/A.2) — cambio estructural grande, mejor candidato para Entrega 2.
- Responsive completo de la sección B del prompt — no verificable visualmente en este
  entorno (sin navegador real).
