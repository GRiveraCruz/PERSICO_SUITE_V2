# rev63 — Capacidad: solo 4 áreas, horas consumidas por mes y horas planeadas por área

## 1. Solo cuatro áreas en cálculos y gráficas
- Los índices y las gráficas de Capacidad consideran únicamente:
  - **Ingeniería Mecánica**
  - **Ingeniería Eléctrica**
  - **Manufactura**
  - **Ensamble**
- El nombre se compara contra el catálogo de áreas de Control de Personal sin distinguir
  acentos ni mayúsculas. La lista está en `CAP_AREAS_INDICES` (`app.py`).
- **Queda fuera de los índices:**
  - trabajadores de otras áreas;
  - líneas de mano de obra sin una de estas cuatro áreas;
  - horas de trabajadores sin perfil en Hourly Rate.
  El panel dice cuántos trabajadores y cuántas horas planeadas y registradas quedaron fuera.
- Ya no aparece "Sin área asignada".
- Si alguna de las cuatro áreas no existe en el catálogo, el panel lo avisa.
- La tabla "Líneas de mano de obra → área" solo ofrece estas cuatro. El servidor rechaza
  cualquier otra al guardar.

## 2. Gráfica de horas consumidas por área y mes
- Barras agrupadas por mes, una por área, con las horas registradas en proyectos (códigos
  de Job) hasta la fecha de consulta. Es el mismo dato que la columna "Horas registradas a
  la fecha".
- La leyenda muestra el total de cada área y abajo va la fila de totales por mes.
- Al pasar el mouse se ve qué porcentaje de la disponibilidad de ese mes se consumió.
- El mes en curso se ve más tenue porque aún no termina.

## 3. Gráfica de horas planeadas por área
- Una barra por área con las horas planeadas en las configuraciones de proyecto. Respeta el
  filtro de proyectos: activos o todas las configuraciones.
- Dentro de cada barra va lo **ya consumido** en esos mismos Jobs (todos los años) y el %
  consumido.
- Lo consumido por encima de lo planeado se marca en rojo.

Orden de las gráficas: disponibilidad por mes → consumidas por mes → planeadas por área.

## Archivos
- `app.py`: `CAP_AREAS_INDICES`, `api_capacidad_indices()` (filtro de áreas,
  `registradas_mes`, `fuera`, `trabajadores_fuera`, `areas_faltantes`) y validación en
  `api_capacidad_mapeo()`.
- `static/app.js`:
  - `capChartMensual()` ahora es genérica (disponibles o consumidas);
  - nueva: `capChartPlaneadas()`;
  - cambia: avisos en `capRenderIndices()`.

## Cómo se probó (PostgreSQL local)
- El área "Administración" y su trabajador quedaron fuera.
- Las cuatro áreas cuadran: la suma mensual de horas consumidas es igual a sus horas
  registradas a la fecha.
- Gráficas revisadas en Chromium, sin errores de JavaScript.
