# rev61 — Capacidad: jornada lunes a jueves 10 h, viernes 8 h

## Cambio
- La capacidad ya no usa 8 h de lunes a sábado. Ahora usa la jornada de la planta:
  - **lunes a jueves: 10 h**;
  - **viernes: 8 h**;
  - **sábado y domingo: 0 h**.
  Siguen siendo 48 h/semana.
- Cada festivo de ley descuenta **las horas de ese día**: 10 h de lunes a jueves, 8 h en
  viernes y nada en fin de semana. La lista de festivos muestra cuántas horas descuenta cada
  uno, o si cae en sábado o domingo.
- El encabezado del panel dice cuántas horas tiene **cada persona en el año** y la tarjeta
  "Capacidad a la fecha" cuántas lleva a hoy.
- La jornada está en una sola constante (`CAP_JORNADA` en `app.py`), por si cambia.

## Horas disponibles por persona al año

| Año | Días laborables | Horas festivas descontadas | Horas por persona |
|---|---|---|---|
| 2025 | 254 | 70 | 2,436 |
| 2026 | 254 | 66 | **2,440** |
| 2027 | 256 | 48 | 2,456 |
| 2028 | 255 | 50 | 2,446 |
| 2030 | 253 | 80 (incluye 1 de octubre) | 2,426 |

- **Cálculo 2026:** 209 días de lunes a jueves × 10 h + 52 viernes × 8 h = 2,506 h. Menos los
  festivos: cinco en lunes a jueves (10 h cada uno) y dos en viernes (1 de mayo y 25 de
  diciembre, 8 h cada uno), 66 h en total. Resultado: **2,440 h**.
- El número varía cada año según el día de la semana en que cae cada festivo.

## Archivos
- `app.py`: `CAP_JORNADA`, `_cap_jornada()` (reemplaza a `_cap_dias_laborables()`) y
  `api_capacidad_indices()`, que ahora devuelve `jornada`, `horas_persona`,
  `horas_persona_fecha` y las horas de cada festivo.
- `static/app.js`: `capRenderIndices()`.

## Cómo se probó
- API con PostgreSQL local para 2025–2030; los resultados son los de la tabla.
- Capacidad de un trabajador que ingresó el 01/07/2026: 1,240 h. Ingeniería Mecánica, con 3
  trabajadores, da 2,440 + 2,440 + 1,240 = 6,120 h.
- Pantalla revisada en Chromium, sin errores.
