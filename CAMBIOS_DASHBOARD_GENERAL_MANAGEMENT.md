# CAMBIOS_DASHBOARD_GENERAL_MANAGEMENT.md

## Qué se construyó

Un dashboard en la pantalla de inicio, **solo para el perfil GENERAL MANAGEMENT**
(y para `admin`, para que puedas verificarlo tú también) — todos los demás perfiles
siguen viendo la pantalla de bienvenida de siempre, sin ningún cambio.

Sigue la estructura de tu boceto: **Sales**, **Projects**, **Cost Control (año
actual)**, con selector de año (año actual y 2 anteriores).

## De dónde sale cada número (para que puedas verificarlo tú mismo)

| En el dashboard | Fuente real en el sistema |
|---|---|
| Quotes registered / sent to customer | `Quote Register` — filtradas por año de `created_at`; "sent" = tienen fecha en `sentClient` |
| Refused / Awarded / Pending | Campos `refused` y `awarded` de cada cotización; "Pending" = ni una ni otra |
| POs registered / Total amount | `Purchase Orders` del año, excluyendo las canceladas — mismo cálculo de USD que usa el Reporte por Job |
| Jobs open / WIP / closed | Campo `status` de cada Job (`Open`/`WIP`/`Done`), filtrado por el año de `created_at` del Job |
| Revenue / Work hours cost / Purchasing+Services / Gross margin | Se reutiliza `_build_report_data` (la misma función del Reporte por Job) para **cada Job activo del año**, sumando sus resultados — no es un cálculo nuevo ni paralelo, es exactamente la misma lógica que ya usas en Job Report, agregada a nivel de toda la compañía |
| Tabla Job / Revenue / Cost / Result | Uno por cada Job activo del año, mismos números que verías si abrieras el reporte de ese Job individualmente |

## Una decisión de diseño que tomé — cuidando no repetir un problema ya conocido

Calcular esto para **todos** los Jobs activos del año (no uno a la vez) es exactamente
el patrón que optimizamos hace unas rondas para el Reporte Multi-Job — así que el
dashboard reutiliza el mismo truco: cada colección (Work Hours, Purchase Orders,
Recuperaciones, Reasignaciones, Viáticos, Gastos, Envíos, CPOs) se carga **una sola
vez** para todos los Jobs del año, no una vez por cada Job. Sin este cuidado, con
40-50 Jobs activos el dashboard habría sido notablemente lento — con esto, no.

**Detalle técnico que encontré al construirlo:** la función `_build_report_data` no
tenía forma de recibir un "pool" precargado de CPOs (a diferencia de las demás
colecciones) — así que si el dashboard la hubiera llamado directo en un ciclo, habría
recargado la tabla completa de Ventas una vez por cada Job, reintroduciendo el mismo
problema N+1 que ya habíamos corregido para las demás colecciones. Se replicó el
mismo truco que ya usa `/api/report/multi` para este caso específico (calcular el
CPO aparte, con su propio pool, y sobreescribir el revenue si corresponde) en vez de
tocar la firma de `_build_report_data` — así no se corre riesgo de romper ningún otro
lugar que ya la use.

## Sin librerías nuevas

Las barras y el gráfico circular están hechos con CSS puro (divs con alto
proporcional, y `conic-gradient` para el pastel) — la Suite no tiene ninguna
librería de gráficas instalada, y no se agregó ninguna a propósito, siguiendo el
mismo criterio de toda esta auditoría de "no asumir tecnologías que no existen".

## Supuestos que hice — avísame si alguno no es el correcto

- **"Jobs closed"** lo mapeé al estatus `Done` (no incluye `Cancelled`, que se cuenta
  aparte pero no se muestra en el dashboard todavía — lo puedo agregar si lo quieres
  visible).
- **Las gráficas de barras** las hice "por cliente" (top 8 clientes con más
  cotizaciones / más Jobs) — tu boceto tenía un gráfico de barras genérico de
  plantilla sin etiquetas claras, así que interpreté que "por cliente" es lo más útil
  para un director; si en realidad querías otra dimensión (por ejemplo, por mes, o por
  tipo de producto), lo cambio fácilmente.
- **"Jobs open/WIP/closed [this year / last year]"** lo basé en el año de **creación**
  del Job (`created_at`), no en la fecha de entrega ni ninguna otra fecha — es la
  interpretación más natural de "Jobs open this year" pero confírmamelo.

## Corrección posterior — "Sales" usaba la colección equivocada

El usuario reportó que el total de Ventas de 2026 no coincidía con el Revenue de
Cost Control de 2026, y debían ser el mismo monto. Al revisar, encontré un bug real:
el dashboard usaba **`po_load()`** (Purchase Orders — lo que Persico le compra a SUS
proveedores, un costo) para el número de "Sales", en vez de **`cpo_load()`**
(Customer POs — lo que los clientes le compran a Persico, la venta real). Son dos
colecciones completamente distintas del sistema; el nombre "PO" ambiguo del boceto
original me llevó a la equivocada.

**Corregido:** "Sales" ahora suma el campo `value` de las Customer POs del año —
exactamente la misma fuente que ya usa `cpo_revenue_for_job()` para calcular el
Revenue de cada Job individual en Cost Control. Verificado: para un Job con una CPO
real registrada, el Revenue que aparece en la tabla de Cost Control ahora coincide
centavo por centavo con el valor de esa CPO.

**Lo que encontré al verificar esto, y que le pregunté al usuario antes de tocar
nada:** el total agregado de "Sales" (solo CPOs confirmadas) y el total agregado de
"Revenue" en Cost Control **todavía pueden no coincidir exactamente** — no por un
bug, sino porque `_build_report_data` (la misma función que ya usa el Reporte por Job
desde antes de este dashboard) usa el revenue **estimado** de un Job como respaldo
cuando ese Job todavía no tiene una Customer PO registrada. Le pregunté al usuario si
quería que Cost Control usara SOLO CPOs confirmadas (lo cual habría cambiado también
el Reporte por Job existente, ya que comparten la misma función) — su respuesta fue
dejarlo como está, que así ha funcionado siempre.

**En vez de dejar esto como una diferencia silenciosa que alguien más tuviera que
volver a preguntar,** se agregaron dos aclaraciones directas en el propio dashboard:
- Debajo de "Customer POs total" en Sales: nota de que es solo ventas confirmadas.
- Debajo de "Revenue total" en Cost Control: nota de que usa el estimado del Job
  cuando no hay CPO todavía, por lo que puede ser mayor al total de Sales.
- Cada fila de la tabla de Cost Control ahora marca "(est.)" junto al Revenue de
  cualquier Job cuyo número venga del estimado y no de una CPO real — así se puede
  ver a simple vista cuáles Jobs están "inflando" el total.

**Prueba de esta corrección:** creé 2 Customer POs sintéticas (Job 652-50 = $168,000;
Job 665-00 = $64,805) y confirmé que el Revenue de esos dos Jobs en la tabla de Cost
Control coincide exacto con esos montos, marcados `source: CPO`; un tercer Job sin
CPO quedó marcado `source: estimado` como se espera.

## Actualización — rediseño visual + primera verificación con navegador real

El usuario pidió mantener el texto del saludo inicial y hacer el dashboard más
estético, y compartió 3 dashboards de referencia (bismart, un panel tipo SaaS, y un
panel de Google Data Studio). Se adoptaron sus recursos clave adaptados a la marca de
Persico: tarjetas blancas flotantes con sombra suave sobre el fondo gris de la app,
números grandes como protagonistas, una fila superior con los 3 KPIs que un director
mira primero (con variación año contra año donde el dato ya existe), donas hechas con
SVG puro (técnica `stroke-dasharray`, sin librerías) con leyenda clara al lado, y
barras con línea base. El saludo original se conservó íntegro, solo condensado en una
franja horizontal arriba en vez de ocupar toda la pantalla.

**Descubrimiento importante para el resto de este proyecto:** hasta este punto, todo
el trabajo de UI de esta conversación se validó solo por inspección de código —
nunca con una vista real, porque se asumía que este entorno no tenía navegador. Al
construir este rediseño se confirmó que **sí hay un Chromium real disponible vía
Playwright**, así que a partir de aquí se pudo verificar visualmente de verdad: se
montó la app real con datos de prueba, se navegó con un login real, y se tomaron
capturas de pantalla genuinas — no solo revisión de HTML generado.

**Dos bugs reales que solo aparecieron al ver la captura real, no en la inspección de código:**

1. **La tabla de Cost Control se cortaba horizontalmente** (las columnas Cost y
   Result quedaban fuera de vista) — la causa real no era la tabla en sí, sino que
   las tarjetas del grid (`.dash-grid`) no tenían `min-width:0`. Por defecto, un
   elemento dentro de un grid de CSS no se encoge por debajo del ancho mínimo de su
   contenido (una tabla ancha, en este caso) — en vez de dejar que el scroll interno
   de la tabla hiciera su trabajo, esto empujaba toda la tarjeta fuera del viewport.
   Es exactamente el problema que el prompt de auditoría original pedía revisar
   ("define min-width:0 donde corresponda en contenedores flex/grid") y que hasta
   ahora no se había topado con un caso concreto para corregir. Se corrigió en la
   fuente (la tarjeta), no parchando la tabla, y se agregó también como regla general
   en la hoja de estilos para cualquier futura tarjeta de dashboard.
2. Confirmado con captura real que el apilado responsive en móvil (`@media
   max-width:900px`) sigue funcionando correctamente con el nuevo diseño — las
   tarjetas pasan a una sola columna, el saludo y el selector de año se acomodan bien.

**Capturas de pantalla reales tomadas y revisadas** (no solo generadas, efectivamente
miradas): desktop (1440×900) con datos de prueba variados (24 cotizaciones, 6
Customer POs, jobs con costos positivos y negativos) y móvil (390×844, iPhone
12/13). Ambas se ven correctas y legibles.

## Pruebas ejecutadas (con datos sintéticos diseñados para cubrir cada caso)

Armé un set de datos de prueba con: cotizaciones en 2025 y 2026 con distintas
combinaciones de awarded/refused/pending y con/sin fecha de envío; un Job puesto en
WIP, otro en Done, y otro movido a 2025 — y verifiqué **a mano, uno por uno**, que
cada número del dashboard coincidiera con lo esperado (ej. 3 cotizaciones registradas
en 2026, 1 aprobada, 1 rechazada, 1 pendiente — exacto). También verifiqué
aritméticamente que Revenue − (Work Hours Cost + Purchasing/Services) = Gross Margin
en los totales, y confirmé que un usuario con otro perfil (Project Manager) recibe
403 al intentar ver el dashboard de General Management.

**Actualización sobre "lo que no pude probar" de la versión anterior de este
documento:** ya se pudo verificar visualmente con Playwright/Chromium real (ver
sección de arriba) — la limitación de "no tengo navegador" ya no aplica a este
componente.
