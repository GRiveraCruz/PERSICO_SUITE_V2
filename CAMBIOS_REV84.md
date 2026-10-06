# rev84 — KPIs del Personal

Nuevo apartado **Recursos Humanos → KPIs del Personal**. Se asignan KPIs a personas de
Control de Personal (o de forma global), cada uno con su **meta**. La Suite calcula el valor
con sus propios datos.

## Los 8 KPIs
| KPI | Periodo | Cálculo | Fuente |
|---|---|---|---|
| Tasa de creación de cotizaciones | Mensual | Cotizaciones registradas en el mes (fecha de recepción del RFQ, o de alta) | Cotizaciones: Key Account Manager / Technical Sales |
| Tasa de aceptación de cotizaciones | Trimestral | Ganadas (Awarded) ÷ enviadas al cliente en el trimestre × 100 | Cotizaciones |
| Índice de POs recibidas | Mensual | Customer POs de revenue recibidas en el mes (también se informa el monto) | Customer POs: PM |
| Margen de ganancia promedio de proyectos asignados | Trimestral | Promedio del margen de sus Jobs cerrados en el trimestre: resultado operativo ÷ Internal Target; si el Job no tiene target, (revenue − costo) ÷ revenue | Jobs donde es PM |
| Entrega en tiempo de proyectos asignados | A la entrega | Entregados en o antes de la fecha de envío comprometida ÷ entregados × 100. Entrega real = fecha real de la actividad de Envío del Timing, o fecha de cierre del Job | Jobs donde es PM |
| Ahorro promedio por compra de componentes | Al cierre | Promedio de (Target Compras − adquirido) ÷ Target Compras × 100 | Jobs donde es PM, o global para Compras |
| Índice de horas extras | Semanal | Horas que pasan de su jornada semanal ÷ horas ordinarias × 100. La jornada sale de su **Tipo de Puesto** o, si no tiene, 48 h. Menor es mejor | Work Hours |
| Eficiencia horas planeadas vs usadas por proyecto | Al cierre | Horas planeadas (Configurar Proyecto) ÷ horas usadas (Work Hours) × 100 | Jobs donde es PM |

## Asignar un KPI
- **Botón "+ Asignar KPI".** Se captura:
  - el KPI (se muestra cómo se calcula y de dónde sale);
  - el **alcance**: una persona o global (toda la empresa);
  - la **meta**, y opcionalmente la **tolerancia**, que es la franja ámbar (10 % de la meta
    por defecto);
  - notas y si está activo.
- **Identificadores:** la Suite tiene que reconocer a la persona en los datos. Para eso se
  dan los nombres con que aparece:
  - como PM: "Luz Munoz - Persico";
  - como Key Account Manager / Technical Sales;
  - como empleado en Work Hours.
- Al elegir la persona se sugieren solos su nombre de Control de Personal y los nombres de
  los datos que comparten al menos dos palabras con él. Hay una lista de los nombres que
  existen en Jobs, cotizaciones y Work Hours.
- **Cómo se reconoce a la persona:** la comparación ignora acentos, el orden de las
  palabras y el " - Persico". "Luz Munoz" reconoce a "MUÑOZ RODRIGUEZ LUZ AILED".

## Resultados
- **Organización:** por persona, una tarjeta por KPI.
- **Cada tarjeta muestra:**
  - promedio del año, de color verde (en meta), ámbar (dentro de la tolerancia) o rojo;
  - último periodo cerrado;
  - cuántos periodos cumplieron la meta;
  - una barra por periodo (12 meses, 4 trimestres, 52/53 semanas o una por proyecto),
    con la línea punteada de la meta y el detalle al pasar el mouse.
- **El periodo en curso** (mes, trimestre o semana de hoy) se muestra rayado pero **no se
  evalúa ni entra al promedio**, porque todavía no termina.
- **KPIs por proyecto:** la lista de proyectos con su valor y el detalle. Por ejemplo,
  "comprometido 2026-11-05 · real 2026-09-30 · a tiempo", o "4,500 h planeadas ·
  6,035 h usadas".
- **Filtros:** año y persona. Al final hay una sección "Cómo se calcula cada KPI".

## Permisos
- Módulo nuevo `rrhh-kpis`. Mientras el administrador no le fije un nivel, **hereda el de
  Listado de Trabajadores**.
- Ver = consultar; Crear = asignar y editar; Total = eliminar.

## Archivos
- `db.py`: modelo `KpiAsignacion` (tabla `kpi_asignaciones`, se crea sola).
- `app.py`: `KPI_CATALOGO`, `_kpi_norm()`, `_kpi_es()`, `_kpi_estado()` y los endpoints
  `/api/kpis/catalogo`, `/api/kpis/asignaciones` (GET/POST/DELETE) y `/api/kpis/resultados`.
- `static/index.html`: menú, módulo y modal.
- `static/app.js`: `kpiCargar()`, `kpiRender()`, `kpiAbrir()`, `kpiGuardar()` y funciones
  relacionadas.

## Cómo se probó (PostgreSQL local, con datos de prueba)
- **Cotizaciones:** 2 en julio y 1 en agosto para la persona (reconocida como "Luz Munoz"
  y por su nombre completo). Aceptación T3: 66.7 % (2 de 3).
- **Margen T3:** 60 % (652-50, target $300,000).
- **Entrega en tiempo:** 100 % (652-50 entregado el 30/09 con compromiso el 05/11).
- **Ahorro global:** 58.4 % (665-00: 100 %; 652-50: 16.8 %).
- **Eficiencia de horas:** 74.6 % (4,500 h planeadas, 6,035 h usadas).
- **Horas extra semanales,** con jornada base de 40 h tomada de su Tipo de Puesto.
- Octubre (en curso) no se evalúa.
- **Pantalla:** asignar desde el modal con identificadores sugeridos; usuario de RH con
  acceso heredado. Sin errores de JavaScript.
