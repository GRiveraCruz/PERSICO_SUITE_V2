# rev97 — Mano de Obra: Excel de horas de uno o varios Jobs

- **Botón nuevo "⬇ Excel por Job"** en Recursos Humanos → Mano de Obra (Work Hours),
  debajo de "Reasignar horas".
- **Modal:**
  - se agregan uno o varios Jobs con autocompletado, Enter o "Agregar". También se pueden
    pegar varios separados por coma o espacio;
  - cada Job aparece como etiqueta con ✕ para quitarlo; los que no existen en Jobs se
    marcan en ámbar, pero se buscan igual en Work Hours;
  - rango de fechas opcional (Desde / Hasta). Sin rango se incluyen **todos los años**.
- **El Excel trae 5 hojas:**
  1. **Resumen:** por Job, cliente, descripción, estatus, PM, **horas**, **costo de mano de
     obra (USD)**, número de empleados, registros, primer y último registro, y la fila
     TOTAL. Avisa qué empleados no tienen tarifa en Hourly Rate (su costo no se calcula).
  2. **Por empleado:** horas de cada empleado en cada Job, con totales.
  3. **Por línea:** horas por línea de mano de obra (Diseño mecánico, Diseño eléctrico,
     Manufactura, etc.) en cada Job.
  4. **Por mes:** horas de cada mes en cada Job.
  5. **Detalle:** cada registro (Job, fecha, empleado, horas, tarifa, costo, línea,
     departamento, descripción, ID), con filtros.
- Se necesita permiso de **Ver** en Work Hours. Máximo 60 Jobs por archivo.
- **API:** `GET /api/wh/excel-jobs?jobs=652-50,665-01&desde=&hasta=`.
- **Probado:**
  - 652-50 + 665-01 + un Job inexistente → 6,034.6 h, $40,923 y 851 registros; el Job
    inexistente aparece en ceros y marcado;
  - con rango de febrero → 740 h y 96 registros.
