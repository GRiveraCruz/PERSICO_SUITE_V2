# rev60 — Capacidad: índices por área

Nuevo panel **Índices de capacidad por área** al inicio de Operaciones → Capacidad. Tiene
selector de año y de proyectos (activos / todas las configuraciones).

## 1. Capacidad disponible por área
- **Trabajadores activos** del área (Control de Personal) × **48 h/semana**, es decir, 8 h
  diarias de lunes a sábado.
- **Se descuentan los días festivos de ley** (LFT art. 74) que caen de lunes a sábado:
  - 1 de enero; primer lunes de febrero; tercer lunes de marzo; 1 de mayo;
    16 de septiembre; tercer lunes de noviembre; 25 de diciembre;
  - 1 de octubre cada seis años por la transmisión del Poder Ejecutivo (2024, 2030…).
    Para años anteriores a 2024 se usa el 1 de diciembre (reforma al art. 83, DOF 10/02/2014).
- Un festivo que cae en domingo no reduce la capacidad y se marca así en la lista.
- Se muestran **capacidad del año** y **capacidad a la fecha** (días laborables hasta hoy).
- Un trabajador que ingresó durante el año cuenta desde su **fecha de ingreso**.
- 2026: 306 días laborables = 2,448 h por trabajador.

## 2. Horas planeadas en las configuraciones de proyecto
- Suma de las horas de las líneas de mano de obra de Configurar Proyecto.
- Filtro:
  - **Proyectos activos** (default): solo Jobs Open/WIP;
  - **Todas las configuraciones**.
- Además: **pendiente por consumir** (planeado − consumido en esos mismos Jobs) contra la
  **capacidad restante** del año → % de carga.

## 3. Horas registradas a la fecha
- Work Hours del año hasta la fecha de consulta.
- Separado en **proyectos** (códigos de Job ###-##) y **otras** (administración, festivos,
  permisos…).
- **Utilización** = horas registradas en proyectos / capacidad a la fecha.
- Colores: verde < 85 %, ámbar 85–100 %, rojo > 100 %.

## Relación línea de mano de obra → área
- Las horas planeadas y registradas existen por **línea de mano de obra**. Las registradas
  se clasifican por el departamento del trabajador en Hourly Rate, igual que en Horas
  consumidas y en el Dashboard del proyecto.
- La capacidad existe por **área de Control de Personal**. Una tabla desplegable asigna cada
  línea a un área.
- La relación **se sugiere sola** por el nombre del área, sin distinguir acentos:
  "Ingeniería Mecánica" ← diseño mecánico y simulación; "Ingeniería Eléctrica" ← diseño
  eléctrico, PLC y robots; "Manufactura" ← manufactura, soldadura y pintura; "Ensamble" ←
  ensamble.
- Se puede ajustar y **guardar**. Se guarda en la tabla de Capacidad de la base de datos,
  bajo una llave reservada que la cuadrícula ignora.
- Lo que no tenga área (líneas sin asignar o trabajadores sin perfil en Hourly Rate) se ve
  en "Sin área asignada".

## API
- `GET /api/capacidad/indices?anio=&proyectos=activos|todos`
- `PUT /api/capacidad/mapeo` (`{mapeo: {línea: área}}`), con permiso de crear en Capacidad.
- `GET /api/capacidad` ya no devuelve la llave reservada del mapeo.

## Archivos
- `app.py`:
  - nuevas: `_festivos_lft()`, `_cap_dias_laborables()`, `_cap_mapeo()`,
    `api_capacidad_indices()`, `api_capacidad_mapeo()`;
  - cambia: `_wh_clasificador()`, que ahora también expone `clasificar()` por registro.
- `static/app.js`: nuevas `loadCapIndices()`, `capRenderIndices()`, `capGuardarMapeo()`.
- `static/index.html`: contenedor del panel.

## Cómo se probó (PostgreSQL 16 local)
- Datos de prueba: 5 áreas y 9 trabajadores (uno con ingreso el 01/07/2026) y PT-0099 con
  horas planeadas.
- **Festivos:** 2026 da los 7 esperados y 306 días laborables. 2030 incluye el 01/10.
- **Capacidad:** Ingeniería Mecánica, con 3 trabajadores (uno desde julio), da
  2,448 + 2,448 + 1,240 = 6,136 h.
- **Relación línea → área:** la sugerencia asigna las 9 líneas. Cambiar "robots" y guardar
  persiste, y la cuadrícula de Capacidad no se ve afectada.
- Sin errores de JavaScript.
