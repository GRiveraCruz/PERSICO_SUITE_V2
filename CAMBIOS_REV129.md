# rev129 — Reporte gerencial (Management ▸ KPIs)

## Botón "📊 Reporte gerencial"
- En **Management ▸ KPIs** (junto a "+ Asignar KPI").
- **Se elige el año** y, opcionalmente, **incluir el costo de nómina por área**. Esta parte es
  protegida: pide la contraseña del usuario y el permiso de Costo de mano de obra.
- **Se abre en una pestaña nueva**, lista para **imprimir o guardar como PDF**, con el
  encabezado de la empresa (Datos fiscales), la fecha y el usuario que lo generó.

## Contenido
1. **POs recibidas durante el año (KPI Monthly sales):**
   - monto mensual de CPO de revenue, **sin las TBD**, y número de CPO por mes;
   - total del año, gráfica de barras y estado contra la meta del KPI.
2. **Estado de los proyectos en WIP:**
   - por Job: cliente, descripción, PM, revenue (CPO), **margen al día** y **fecha de envío**,
     con los atrasados marcados;
   - totales: proyectos, revenue en WIP, con envío vencido y margen promedio.
3. **Resultado de los proyectos cerrados en el año:**
   - **Avg. gross margin per project** y **On-time delivery index**, contra su meta;
   - tabla por Job con el margen, la entrega a tiempo y el detalle (target, costo y
     cierre).
4. **Accounts receivable index:**
   - último valor y gráfica mensual;
   - por cobrar hoy y vencido (USD).
5. **Capacidad operativa:**
   - por área: personas, capacidad del año y a la fecha, horas registradas,
     **utilización**, pendiente del plan y **carga restante**, en rojo si pasa de 100 %.
6. **Puestos de trabajo por área y costo de nómina** (jornada normal):
   - puestos activos por área;
   - nómina bruta y costo total empresa del mes, en MXN y su equivalente en USD;
   - **costo por área** solo si se generó con la contraseña y el permiso. Si no, se indica
     cómo incluirlo.
7. **Income Forecast:**
   - total esperado, vencido y sin fecha;
   - gráfica por mes y los próximos 15 cobros.
8. **Cash Flow Forecast (13 semanas):**
   - saldo inicial, saldo final y saldo más bajo contra el mínimo;
   - gráfica del saldo y tabla semanal (saldo inicial, entradas, salidas, flujo neto y saldo
     final).

## Notas
- **Permisos:** el reporte lo puede generar quien ve KPIs. Cada sección respeta además el
  permiso de su módulo (Capacidad, Costo de mano de obra, Income Forecast, Cash Flow): si
  falta, la sección lo indica en lugar de mostrar datos.
- **Errores:** si una sección falla por falta de datos, el reporte se genera igual y la
  sección muestra el motivo.
- **Cambio interno:** el Cash Flow Forecast ahora se calcula con una función compartida
  (`_cashflow_data`), sin cambios en su pantalla.

## Probado
- **Reporte 2026** generado desde el botón, con nómina por área (contraseña): las 8
  secciones, sin errores.
- **Ventas:** 26 CPO por $914,940 (1 TBD de $50,000 excluida).
- **WIP:** 3 proyectos, 1 con envío vencido.
- **Cerrados:** 1 proyecto, margen 93 % y entrega a tiempo 100 %.
- **Nómina:** 4 puestos, costo empresa $116,256 MXN, desglosado por área.
- **Cash flow:** de $60,000 a $13,441, por debajo del mínimo (marcado).
