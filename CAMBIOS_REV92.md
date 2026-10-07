# rev92 — KPIs: títulos en inglés, 7 KPIs nuevos y configuración por default para toda la empresa

## Títulos en inglés
Se usó la propuesta con la ortografía corregida. El nombre en español se muestra debajo en
cada tarjeta y en el modal.

| Español | Inglés |
|---|---|
| Tasa de creación de cotizaciones | Quotes issued by month |
| Tasa de aceptación de cotizaciones | Quote success rate |
| Índice de POs recibidas | POs received by month |
| Margen de ganancia promedio de proyectos asignados | Avg. gross margin per project |
| Entrega en tiempo de proyectos asignados | On-time delivery index |
| Porcentaje promedio de ahorro por compra de componentes | Avg. purchasing savings |
| Índice de horas extras | Weekly overtime index |
| Eficiencia horas usadas vs horas planeadas | Hours efficiency: used vs planned |

## KPIs nuevos
| KPI | Periodo | Cálculo | Meta |
|---|---|---|---|
| **Weekly attendance index** (asistencia semanal) | Semanal | Días con entrada en el kiosco ÷ días laborables esperados. Días esperados: su jornada (Tipo de Puesto, o L-V), sin festivos de ley, sin permisos o vacaciones aprobados, desde su ingreso y desde el arranque del kiosco | ≥ |
| **Monthly stock value** (valor mensual del Stock) | Mensual | Existencia × último costo, al cierre del mes (última foto del mes) | **% que debe bajar vs el mes anterior** |
| **Monthly consignment value** (valor mensual de consignación) | Mensual | Igual que Stock, con el material en consignación | % que debe bajar vs el mes anterior |
| **Avg. cost per hour by operating area** (costo promedio por hora) | Mensual | Costo de mano de obra (horas × tarifa de Hourly Rate) ÷ horas, de Ing. Mecánica, Ing. Eléctrica, Manufactura y Ensamble. Global = las cuatro; también por área | ≤ |
| **Monthly staff turnover index** (rotación de personal) | Mensual | Bajas del mes ÷ plantilla promedio × 100. Global o por área | ≤ |
| **Accounts payable index** (CPP) | Mensual | Días promedio entre el registro de la CPP y su pago, de las pagadas en el mes. Se informa el saldo pendiente al cierre | ≤ días |
| **Accounts receivable index** (CPC) | Mensual | Cartera vencida: monto vencido ÷ monto por cobrar al cierre del mes × 100 | ≤ % |

### Valor de Stock y Consignación
- Esos inventarios no guardan historia, así que la Suite toma una **foto diaria** de su
  valor. La foto se toma al arrancar, al guardar Stock (a lo más una vez por minuto), al
  crear o eliminar reasignaciones de consignación y al consultar los KPIs.
- El valor del mes es el de su última foto. La historia empieza **a partir de esta
  versión**.
- **Evaluación de un mes:**
  - verde si bajó al menos el % de la meta respecto al mes anterior;
  - ámbar si quedó dentro de la tolerancia;
  - rojo si no.
  La tarjeta muestra el último valor y su variación.

## Alcances
- Cada KPI indica cómo se puede asignar:
  - **Global:** todos.
  - **Persona:** los de ventas, PM, horas extra y asistencia.
  - **Área:** horas extra, asistencia, costo por hora y rotación.
  - **Solo global:** Stock, Consignación, CPP y CPC.
- El modal muestra solo los alcances válidos, con un selector de área.
- Para horas extra y asistencia por área se usa el área de cada persona en Control de
  Personal.

## Configuración por default
- **Los 15 KPIs quedan asignados a toda la empresa** (alcance global) con la **meta por
  definir**. Las tarjetas lo indican en ámbar: "meta por definir" y "sin meta".
- Se crean solos una vez por KPI. Si después eliminas una asignación global, no se vuelve a
  crear.
- La meta ahora es opcional al asignar.

## Archivos
- `db.py`: modelo `KpiSnapshot` (tabla `kpi_snapshots`): fotos diarias y banderas.
- `app.py`:
  - `KPI_CATALOGO` (inglés, `nombre_es`, `alcances`, KPIs nuevos);
  - nuevas: `_kpi_foto_inventarios()`, `_kpi_sembrar_globales()`, `_kpi_asistencia()`,
    `_kpi_costo_hora()`, `_kpi_cpp()`, `_kpi_cpc()`;
  - cambian: asignación (alcance de área, meta opcional), resultados y `stock_save()`, que
    ahora toma la foto.
- `static/app.js` / `index.html`: formatos $, $/h y días; meta por tipo; alcances y área en
  el modal.

## Cómo se probó (PostgreSQL local)
- 15 asignaciones globales creadas solas. Una de costo por hora para "Ensamble" creada.
  Stock asignado a una persona → rechazado.
- **Asistencia:** se mide desde el primer registro del kiosco (29/09/2026), por semana.
- **Stock** $300 y **consignación** $60 (foto de hoy).
- **Costo por hora:** global $8.5–11.4/h por mes; Ensamble $8.5–15.4/h.
- **Rotación:** agosto 10.5 %.
- **CPP y CPC con datos de prueba:**
  - CPP: 30 días promedio, saldo pendiente $500 / $200;
  - CPC: julio 0 %, agosto 25 %, septiembre 50 %, octubre 100 % vencido.
- **Modal:** costo por hora ofrece global o área (con selector de área); Stock solo global,
  con la meta como "% que debe bajar". Sin errores de JavaScript.
