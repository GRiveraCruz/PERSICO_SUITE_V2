# rev62 — Capacidad: vacaciones por antigüedad y disponibilidad por área y mes

## 1. Vacaciones de ley por antigüedad
- La capacidad disponible ahora descuenta, además de los festivos, las **vacaciones de ley**
  (LFT art. 76, reforma 2023) de cada trabajador.
- **Días por antigüedad:**
  - 1 año: 12 días;
  - 2 años: 14; 3 años: 16; 4 años: 18; 5 años: 20;
  - 6 a 10 años: 22; 11 a 15 años: 24; 16 a 20 años: 26; 21 a 25 años: 28;
  - 26 a 30 años: 30, y +2 días por cada 5 años más.
  Se usa la misma función que ya usaba Sueldos y Salarios.
- **Qué días se descuentan en el año:** los del aniversario que la persona cumple ese año
  (año − año de ingreso, tomado de Control de Personal). Quien ingresó en el año consultado
  todavía no tiene vacaciones.
- **Valor de un día de vacaciones:** el promedio de la jornada, 48 h / 5 días = **9.6 h**.
- Las horas de vacaciones se **reparten en los meses** en proporción a las horas de jornada
  de cada persona. Así se descuentan también de la capacidad a la fecha y del restante.
- En pantalla:
  - la tarjeta de capacidad dice cuántas horas y días de vacaciones se descontaron;
  - cada área muestra "−N h vac." debajo de su capacidad;
  - hay una tabla desplegable con los días por antigüedad.
- Si un trabajador no tiene fecha de ingreso, no se le descuentan vacaciones y el panel
  lo avisa.

## 2. Gráfica de disponibilidad por área y mes
- Barras agrupadas: un grupo por mes, una barra por área.
- Cada barra son las horas disponibles de esa área en ese mes: jornada sin festivos y sin
  vacaciones, contando cada trabajador desde su fecha de ingreso.
- El mes actual se resalta y los meses ya transcurridos se ven más tenues. Debajo va la fila
  de totales por mes.
- Al pasar el mouse se ven las horas y el número de trabajadores.
- La suma de los 12 meses de cada área es igual a su capacidad disponible del año.

## Ejemplo (Ingeniería Mecánica, datos de prueba)
- 3 trabajadores:
  - ingreso 2020 → aniversario 6 en 2026 → 22 días;
  - ingreso 2021 → aniversario 5 → 20 días;
  - ingreso 07/2026 → sin vacaciones.
- Jornada sin festivos: 6,120 h. Vacaciones: 42 días × 9.6 = 403.2 h.
  **Disponible: 5,716.8 h.** La gráfica sube en julio, cuando entra el tercer trabajador.

## Archivos
- `app.py`: `CAP_HORAS_DIA_VAC` y `api_capacidad_indices()`, que ahora calcula vacaciones,
  capacidad bruta y neta, `mensual` por área y `vac_tabla`.
- `static/app.js`:
  - nueva: `capChartMensual()`;
  - cambia: `capRenderIndices()` (vacaciones en tarjetas, tabla y desplegable).

## Cómo se probó
- PostgreSQL local con 9 trabajadores en 5 áreas: los días de vacaciones por persona y la
  suma mensual cuadran con la capacidad anual de cada área.
- Pantalla revisada en Chromium: 60 barras (5 áreas × 12 meses), sin errores.
