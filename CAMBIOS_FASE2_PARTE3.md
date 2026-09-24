# FASE 2 — Parte 3: puntos #5, #4 y #6 de la auditoría

## #5 — Lock optimista/pesimista para el guardado "borra todo + reinserta todo"

**Problema exacto:** `wh_save()` y `po_save()` reemplazan la tabla completa de un año
(`DELETE ... WHERE year=X` + reinsertar todo). Ya existía un `threading.Lock()` de
Python (`app.py`, variable global `lock`) envolviendo la mayoría de las rutas que hacen
esto — pero ese lock vive en la memoria de UN proceso. Con `gunicorn --workers=2`, cada
worker es un proceso separado con su PROPIO `Lock()`: si dos requests caen en dos
workers distintos (algo que gunicorn hace a propósito, para eso son varios workers), el
lock de un worker no sabe nada del otro. Dos administradores importando Excel de Work
Hours del mismo año al mismo tiempo (uno en cada worker) podían pisarse sin que nada lo
impidiera.

**Qué se hizo:** se agregó `acquire_year_lock(session, table_name, year)` en `db.py`,
que usa `pg_advisory_xact_lock` de PostgreSQL — un lock que vive en el propio servidor
de base de datos, no en la memoria de un proceso, así que sí lo ven todos los workers
(y cualquier réplica futura). Se llama al principio de `wh_save()` y `po_save()`, antes
del `DELETE`, dentro de la misma transacción — se libera solo al hacer `commit()`, sin
falta de un `try/finally` aparte para soltarlo.

**Qué NO se resuelve del todo (y por qué):** el lock protege que dos `*_save()` no
corran su `DELETE`+`INSERT` a la vez sobre el mismo (tabla, año) — evita que las
escrituras se entrelacen o corrompan a nivel SQL. Lo que NO cubre es el escenario donde
dos requests **leen** el año (`wh_load`) casi al mismo tiempo, cada uno modifica su
propia copia en memoria, y luego ambos llaman a `wh_save()`: como el lock solo se toma
en el momento de guardar (no de leer), el segundo guardado gana y pisa los cambios del
primero con datos ya desactualizados ("lost update"). Cerrar esto del todo requiere que
la lectura y la escritura compartan una misma transacción/lock desde el principio, lo
cual implica cambiar la firma de `wh_load`/`po_load` (o de las ~10 rutas que hacen
"cargar → modificar → guardar") para que reciban una sesión ya abierta — es un cambio
de forma más amplio que no metí en esta pasada para no combinar riesgo de un refactor
grande con el fix puntual que sí pedía la auditoría. Lo dejo señalado como siguiente
paso si se quiere cerrar el 100% del problema.

**Alcance:** se aplicó solo a `wh_save`/`po_save` (los dos que señaló la auditoría). El
mismo patrón (`acquire_year_lock`) se puede reutilizar para cualquier otra colección con
el mismo problema (`recovery_save`, `reassign_save`, etc. — usando el nombre de tabla
sin año como llave) si se decide extenderlo.

**Cómo se probó:** con la Postgres local, dos hilos de Python abriendo sesiones
independientes (simulando dos workers de gunicorn) piden el lock de `(test_table,
2026)`: el segundo espera hasta que el primero hace `commit()` — medido con
timestamps, se confirmó la espera real (no una carrera). Un tercer hilo pidiendo el
lock de un año DISTINTO (`2025`) no espera nada, confirmando que años distintos no se
bloquean entre sí. Además se corrió el flujo real (`DELETE /api/wh/<year>/<id>`, que
usa `wh_save` internamente) para confirmar que el lock es transparente en el caso normal
de una sola escritura — el registro se borra correctamente y el conteo baja en 1.

## #4 — `whShowAllYears()` (y las mismas funciones en PO e Invoiced POs) sin límite

**Problema:** al apretar "cargar todos los años", el frontend pedía TODOS los años en
paralelo (`Promise.all`) y ponía `whVisibleCount = Infinity`, lo que no solo acumulaba
todo en memoria del navegador sino que además **quitaba por completo el límite de
filas pintadas en el DOM** — con varios años esto podía ser decenas de miles de `<tr>`
de golpe. El mismo patrón exacto existía también en `poShowAllYears()` (Purchase
Orders) y `ivpShowAllYears()` (Invoiced POs).

**Qué se hizo** en los tres (`static/app.js`):
- Antes de disparar la carga, si hay más de 2 años se pide confirmación explícita
  (`confirm(...)`) explicando qué va a pasar — se puede cancelar.
- Los años se piden uno a la vez (no todos en paralelo con `Promise.all`), mostrando
  progreso real (`Cargando 2/5…`) en vez de un spinner ciego — así no se le manda al
  servidor una ráfaga de N requests simultáneos.
- `whVisibleCount`/`poVisibleCount`/`ivpVisibleCount` se quedan en 100 (no
  `Infinity`) después de cargar todo — el DOM sigue acotado igual que al ver un solo
  año; "Cargar más" sigue funcionando exactamente igual. Los totales/estadísticas no
  cambian: ya se calculaban sobre el arreglo completo filtrado, no sobre lo visible, así
  que siguen siendo correctos.

**Qué NO se tocó a propósito:** `poShowAll()` y `stockShowAll()` son un botón distinto
("Ver todos" sobre datos que YA están cargados en memoria, sin pedir nada nuevo al
servidor) — no tienen el problema de "traer más y más años", solo remueven el límite de
render sobre una colección de un solo año/tabla ya en memoria. Cambiarlos habría hecho
que un botón que dice "ver todos" deje de mostrar todos, lo cual es una regresión de UX
distinta al problema que se pidió arreglar — se dejaron igual.

## #6 — CSS / responsive

**Qué se hizo:** se agregó un bloque `@media` nuevo al final de la hoja de estilos de
`static/index.html` — es **puramente aditivo**: en pantallas anchas (el uso normal de
esta suite, una app de escritorio) no cambia absolutamente nada, cero riesgo de
regresión ahí. En pantallas de ≤900px:
- El layout de escritorio (sidebar fija de 240px + contenido a su lado, sin scroll de
  página) se reacomoda en columna: la sidebar pasa arriba con altura acotada y su
  propio scroll, y el contenido principal ocupa el resto.
- El modal (`.md`, fijo en 540px) se vuelve `min(540px, 92vw)` para no desbordar en
  pantallas angostas.
- La barra superior de búsqueda y las grillas de chips/estadísticas de columnas fijas
  pasan a una o dos columnas según el ancho.
- Un segundo breakpoint en ≤520px reduce aún más el padding de la barra de navegación.

**Lo que encontré al revisar antes de tocar nada (bueno saberlo):** la mayoría de las
63 tablas YA estaban envueltas en un `<div style="overflow-x:auto">`, así que la mayor
parte del problema de "tablas que rompen el layout" en realidad ya estaba resuelto a
nivel de marcado — el problema real de fondo era que el layout general (sidebar +
contenido lado a lado, sin apilar en columna) no se adaptaba en absoluto a pantallas
angostas. Por eso el fix se enfocó ahí en vez de tocar las tablas una por una.

**Limitación importante, dicha con honestidad:** este entorno no tiene navegador, así
que no pude renderizar ni tomar una captura para confirmar visualmente el resultado —
armé el bloque revisando con cuidado cada clase estructural involucrada (`.sidebar`,
`.module`, `.md`, `.sw`, `.r-chips`, `.sb-stats`) y confirmé que las llaves `{}` de todo
el bloque `<style>` quedan balanceadas, pero **recomiendo una pasada visual rápida en un
teléfono real o en el modo responsive de las devtools antes de darlo por cerrado del
todo**. Es la única de las tres partes de esta ronda que no pude validar con una prueba
automatizada real, a diferencia de #4 y #5.

**Corrección sobre la marcha:** al insertar el bloque nuevo me equivoqué en el primer
intento y borré por accidente la regla `.lang-btn.active{...}` — lo noté al verificar
regla por regla contra el original y lo corregí antes de seguir. Quedó confirmado con
un script que compara las 340 líneas de CSS original contra el archivo final: cero
reglas faltantes, y el resto del documento (todo el HTML fuera de `<style>`) es
byte-idéntico al original.

## Hallazgo adicional (fuera de la lista de 6 puntos) — spinners girando dentro de modales cerrados

Esto no salió de la auditoría original, salió de una sesión de pruebas en vivo: el
usuario reportó ~9% de CPU sostenido en Chrome Task Manager con la pestaña de la Suite
completamente quieta, sin interactuar. Se diagnosticó paso a paso con DevTools:

1. `document.querySelectorAll('.spinner').length` → 5 spinners presentes en el DOM.
2. Se ubicó cada uno: 3 estaban dentro de paneles (`.module`, ocultos con
   `display:none` — esos SÍ se pausan solos, no son el problema) y **2 estaban dentro
   de modales (`.mo`) que nunca se habían abierto**: `mo-asis-link` (vincular
   trabajadores de Asistencia) y `mo-esq` (esquemas tributarios).
3. Causa raíz: los modales de esta app (`.mo`) se ocultan con `opacity:0`, no con
   `display:none` — así que cualquier animación CSS `infinite` dentro de un modal
   (el spinner de carga que varias pantallas traen de fábrica en su HTML como estado
   inicial) sigue animando y forzando repintado **para siempre**, aunque el modal jamás
   se haya abierto en toda la sesión. No es un bug de una pantalla en particular, es un
   patrón que afecta a cualquier modal que tenga un spinner en su marcado inicial.

**Fix:** una sola regla CSS en `static/index.html`:
```css
.mo:not(.on) .spinner{animation-play-state:paused}
```
Pausa la animación del spinner mientras el modal esté cerrado, sin tocar la transición
de opacidad ni el comportamiento de apertura/cierre de ningún modal — en cuanto el
modal se abre (clase `.on`), el spinner vuelve a animar normalmente mientras carga.

**Por qué esto arregla el 9% de CPU y no solo un caso puntual:** la regla es genérica
(`.mo:not(.on) .spinner`), así que cubre cualquier modal con este patrón, no solo los
2 que se encontraron por casualidad en esta sesión — si hay otro modal en algún módulo
que no se visitó durante esta prueba y tiene el mismo problema, ya queda cubierto por
la misma regla sin tener que encontrarlo uno por uno.

**Pendiente de confirmar por el usuario:** este cambio requiere desplegar de nuevo
`static/index.html` (o recargar con caché limpio) para que tenga efecto — pedirle al
usuario que repita la medición en Chrome Task Manager después de eso, para confirmar
que el CPU baja a ~0% en reposo.

## Cómo se probó todo junto
Con la misma Postgres local de las partes 1 y 2: `GET /api/wh`, `GET /api/jobs`,
`GET /api/report/data` y un `DELETE` real de un registro de Work Hours (que ahora pasa
por el advisory lock) — todo responde igual que antes. `app.js` pasa `node -c` sin
errores de sintaxis. `app.py`/`db.py` compilan sin errores.
