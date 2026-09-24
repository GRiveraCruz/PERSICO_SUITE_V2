# FASE 2 — Parte 2: filtros y paginación en /api/jobs, /api/quotes, /api/personal (punto #3)

## Decisión de diseño importante (léase antes de tocar el frontend)

Antes de tocar código encontré una diferencia clave entre estas tres colecciones:

- **Jobs** se identifica por `job_number` (una llave de negocio real: `PUT/DELETE
  /api/jobs/<job_number>`). Filtrar o paginar esta colección en SQL es seguro sin más:
  no importa qué subconjunto se devuelva, cada registro se sigue identificando a sí
  mismo.
- **Quotes** y **Personal** se identifican por **posición en la lista completa**
  (`PUT/DELETE /api/quotes/<int:row>` y `/api/personal/<int:row>`) — `row` es el índice
  dentro del arreglo completo, no un ID propio del registro. Esto ya existía antes de
  cualquier cambio mío.

Esto importa porque si hubiera filtrado/paginado estas dos colecciones ANTES de calcular
`row`, cada registro se habría quedado con un índice relativo al subconjunto filtrado en
vez de a la lista completa — y el próximo PUT/DELETE con ese `row` habría editado o
borrado el registro equivocado. Es un bug silencioso y peligroso (pérdida/corrupción de
datos), así que el diseño que implementé es explícito en evitarlo:

**Regla aplicada:** `row` siempre se calcula sobre la lista completa PRIMERO; el filtro
o el recorte de página se aplican DESPUÉS, sobre records que ya traen su `row` correcto
asignado. Lo verifiqué con una prueba automatizada (ver abajo) que confirma que un PUT
usando el `row` de un resultado filtrado edita el registro correcto, no otro.

Esto significa que, para Quotes y Personal, el ahorro es de **red y DOM** (el navegador
recibe y pinta solo lo que pidió), no de lectura en la base — la colección completa se
sigue leyendo internamente para poder calcular `row` con precisión. Es la decisión
correcta dado el diseño actual; una migración a un ID real (ej. `qnum`, `tid`) en las
rutas PUT/DELETE eliminaría esa limitación, pero es un cambio de contrato de API que
también obliga a tocar el frontend — lo dejo señalado, no lo hice, porque no era lo que
se pidió y es un cambio de mayor riesgo.

## Qué se cambió

**`GET /api/jobs`** — nuevos parámetros opcionales, todos combinables:
- `q` — búsqueda libre sobre `job_number`, `customer`, `description`, `pm`.
- `status` — igualdad exacta (ej. `Open`).
- `customer` — substring, sin distinguir mayúsculas.
- `product_group` — igualdad exacta.
- `limit` / `offset` — paginación.

Sin ningún parámetro, la respuesta es **exactamente la misma** que antes (llama a
`scan_jobs()` sin tocar nada). Con algún parámetro, el filtro de `status` y `customer`
se empuja a SQL (columnas ya indexadas); `q` y `product_group` también van a SQL cuando
hay DB (usando el campo JSONB `data` para lo que no tiene columna propia). El orden
final y el recorte de página se hacen en Python sobre el conjunto ya filtrado (chico),
así que no hace falta complicar el `ORDER BY` en SQL para que valga la pena — el ahorro
real es no traer del todo los jobs que no matchean.

**`GET /api/quotes`** — nuevos parámetros opcionales:
- `q` — búsqueda libre sobre `qnum`, `customer`, `desc`, `rfq`.
- `limit` / `offset`.

**`GET /api/personal`** — nuevos parámetros opcionales:
- `q` — búsqueda libre sobre `tid`, `nombre`, `puesto`, `area`.
- `estado`, `area` — igualdad exacta.
- `limit` / `offset`.

Sin parámetros, ambas responden exactamente igual que antes.

## Qué NO se cambió
- El frontend (`static/app.js`, `static/index.html`) — sigue pidiendo la colección
  completa y filtrando/paginando en el navegador, exactamente como antes. Estos
  endpoints quedan listos para que el frontend los adopte cuando se decida (reduciría
  de verdad el tráfico de red para cuentas con muchos Jobs/Quotes/Personal), pero
  cambiar las pantallas para usarlos es un trabajo aparte que no se hizo en esta pasada,
  precisamente para no combinar un cambio de backend ya probado con un cambio de UI que
  requeriría su propia validación.
- El contrato de `PUT`/`DELETE` de las tres colecciones — no se tocó.

## Cómo se probó
Con la misma Postgres local de la Parte 1 (datos reales de `data_seed` para Jobs, más
un puñado de registros sintéticos de Quotes y Personal, ya que `data_seed` no los
incluye):

1. **Jobs**: comparé cada filtro (`customer`, `status`, `q`, `limit`/`offset`) contra el
   resultado de filtrar en Python la lista completa de `scan_jobs()` — coinciden exacto
   en los cuatro casos. También confirmé que paginar con `limit=5&offset=0` +
   `limit=5&offset=5` da los mismos 10 primeros jobs, en el mismo orden, que
   `scan_jobs()` sin filtrar.
2. **Quotes**: confirmé que sin parámetros la respuesta trae los mismos `row` de
   siempre; filtrando con `q=Antolin` devuelve solo el registro esperado con su `row`
   real (2, no 0); y que un `PUT /api/quotes/2` usando ese `row` edita efectivamente
   ese registro y ningún otro.
3. **Personal**: mismo tipo de prueba con `area`, `estado` y `q` — cada filtro devuelve
   el subconjunto correcto con su `row` real, y un `PUT` con ese `row` edita el
   trabajador correcto.

## Nota sobre `limit=0`
Como `limit` se evalúa como verdadero/falso en Python, pedir `limit=0` explícitamente se
trata igual que no mandar `limit` (se ignora, se devuelve todo). No es un caso de uso
real esperado (nadie pide "cero resultados" a propósito), pero queda anotado por si
alguien lo nota.
