# rev75 — Dashboard RH: horas extra por semana del año en curso (barras)

## Qué cambia
- La gráfica de tiempo extra ahora es una **gráfica de barras** con las **semanas 1 a 52**
  del año en curso. Son semanas ISO; los años con 53 semanas, como 2026, muestran la 53.
  - Cada barra es la **suma de horas extraordinarias** de esa semana.
  - Solo se muestran las semanas del año corriente. La semana 1 es la que contiene el 4 de
    enero, aunque empiece a fines de diciembre (en 2026 empieza el 29/12/2025).
- **Selector de área:**
  - "Las 4 áreas" muestra **barras apiladas por área**, con leyenda de colores;
  - al elegir un área se muestra solo esa.
- **Detalles de la gráfica:**
  - marca de "Hoy";
  - las semanas futuras quedan vacías;
  - al pasar el mouse se ven las horas extra de la semana (por área), el índice, las
    personas con extra y cuántas pasan de 9 h (límite LFT).
- **Tabla resumen por área** (en lugar de la tabla de 12 semanas):
  - horas extra en el año;
  - promedio por semana (semanas completas transcurridas);
  - semana pico;
  - última semana completa (horas e índice);
  - personas con más de 9 h extra.
- El criterio no cambia: horas extra = lo que pasa de 48 h por persona en la semana, según
  Work Hours, para Ensamble, Ing. Eléctrica, Ing. Mecánica y Manufactura.

## Archivos
- `app.py`: `api_dashboard_rh()` usa las semanas ISO del año (`num`, `futura`,
  `anio_semanas`).
- `static/app.js`: `rhRender()`, con la gráfica de barras apiladas y la tabla resumen.

## Cómo se probó (PostgreSQL local)
- 53 semanas (29/12/2025 – 28/12/2026), semana en curso S40 y 13 semanas futuras.
- Barras apiladas por área con los datos de Work Hours de enero a junio y las semanas de
  prueba de septiembre.
- Resumen: 3,904 h extra en el año; pico S8 con 288 h.
- Sin errores de JavaScript.
