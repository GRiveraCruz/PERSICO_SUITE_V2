# rev136 — Corrección: horas del kiosco asignadas al día equivocado (UTC)

## Qué pasaba
- El kiosco guarda la hora en UTC, y la Suite tomaba la fecha del texto UTC.
- **Una salida a las 19:00 en México aparece como el día siguiente.** En Asistencia ▸ Control de
  horas ("Desglose por trabajador / Job / fecha") y en su exportación (`date_worked`):
  - las horas del 26-oct aparecían el 27;
  - las del 27 aparecían el 28, junto con las horas reales del 28, y parecía un registro
    duplicado.
- **Los filtros de fecha** que la Suite manda al kiosco (`from`/`to`) se comparaban como texto
  contra la hora UTC.

## Corrección
- **Funciones nuevas:**
  - `_kiosco_fecha_local(ts)`: fecha del registro en hora de la planta (`KIOSCO_TZ`, por defecto
    America/Mexico_City);
  - `_kiosco_limite(fecha)`: convierte los filtros (día local o fecha y hora local) a UTC antes de
    comparar.
- **Lectura de registros del kiosco** (`_kiosco_records`): aplica los límites locales a todos los
  consumidores (Asistencia, Control de horas, KPIs de asistencia y dashboard de hoy).
- **Control de horas:**
  - cada renglón trae `fecha` (local), que es la que se muestra en el desglose;
  - la exportación usa esa fecha como `date_worked`.
- **Los datos del kiosco no cambian.**

## Probado
- **`2026-10-27T01:00Z` → 26-oct** y **`2026-10-28T23:36Z` → 28-oct**.
- **El filtro "26-oct a 1-nov"** cubre de 26-oct 06:00Z a 02-nov 05:59:59Z (hora de México).
