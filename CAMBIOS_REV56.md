# rev56 — Timing: una fecha con año inválido dejaba el diagrama de tiempos en blanco

## Causa (caso PT0065)
Los campos de fecha del navegador aceptan años de 5 o 6 dígitos si se teclea un dígito de
más: por ejemplo `202626-09-04` en vez de `2026-09-04`. La tabla lo muestra como una fecha
"normal". Pero al calcular, `new Date()` lo convierte en *Invalid Date*.
- El diagrama busca la fecha mínima y máxima de todas las barras, incluida la fecha real de
  finalización. Una sola fecha inválida vuelve esos límites `NaN`.
- Resultado: encabezado "Invalid Date", todas las barras en la orilla izquierda y el
  marcador de fecha real como "NaNd".
- En la captura del PT0065 aparece "■aNd" en **Recepción de PO**. Esa actividad tiene una
  fecha así, probablemente en **Fecha real de finalización**.

## Corrección
- Nueva `_pcFecha()`: solo acepta fechas AAAA-MM-DD reales entre 2000 y 2100. La usan:
  - el cálculo de fechas condicionadas y objetivo;
  - el estatus (retraso / adelanto);
  - el diagrama de tiempos;
  - el rango del Plan de Personal;
  - las gráficas del Dashboard.
- Una fecha inválida **se ignora**, y el resto del diagrama se dibuja normal.
- La fecha inválida se **marca en rojo** en la tabla de Timing. El tooltip explica que el
  año debe tener 4 dígitos. Arriba de la tabla aparece un aviso con la actividad, el campo
  y el valor.
- Al **Guardar Configuración** con fechas inválidas se pide confirmación, con la lista; si
  se cancela, se abre la pestaña Timing.

## Cómo se probó (Chromium)
- Se reprodujo el caso con un Timing como el del PT0065 y `202626-09-04` en la fecha real
  de Recepción de PO:
  - el diagrama muestra fechas (20/08 … 21/10) y todas las barras;
  - el campo queda en rojo y aparece el aviso;
  - al guardar se pide confirmación.
- Sin errores de JavaScript.

## Qué hacer en el PT0065
Abrir Timing, corregir la fecha marcada en rojo (año de 4 dígitos) y guardar.

## Archivos
- `static/app.js`:
  - nuevas: `_pcFecha()`, `_pcFechaMala()`, `pcFechasInvalidasTiming()`,
    `pcMarcarFechasInvalidas()`;
  - cambian: `pcUpdateTimingCalcs()`, `pcRenderGantt()`, `pcGetTimingDateRange()`,
    `_pcParseISO()`, `pcSave()`.
