# rev127 — Management ▸ Costo de mano de obra · UMA automática

## Management ▸ Costo de mano de obra (apartado nuevo)
- **Nómina mensual de todos los trabajadores activos** con su salario de **jornada normal**
  (Sueldos y Salarios), con las mismas tasas que ya usan Calcular Salario y Nómina.
- **Por trabajador:**
  - salario bruto;
  - **ISR** (tabla mensual de ISR cargada en Nómina);
  - **IMSS obrero**;
  - neto al trabajador;
  - **IMSS patronal**: cuota fija, excedente, prestaciones en dinero, gastos médicos,
    invalidez y vida, guarderías, riesgo de trabajo, retiro, cesantía y vejez;
  - INFONAVIT 5 %;
  - ISN estatal;
  - provisión de prestaciones: aguinaldo, vacaciones y prima vacacional;
  - **costo total para la empresa**.
- **Tarjetas** con los totales del mes, más el equivalente en USD al tipo de cambio del día.
- **Nota de lectura:**
  - el ISR y el IMSS obrero **ya están dentro del salario bruto** (se retienen al
    trabajador), así que no se suman otra vez al costo;
  - costo empresa = bruto + IMSS patronal + INFONAVIT + ISN + provisión de prestaciones;
  - también se muestra la salida de efectivo mensual: neto + retenciones + cuotas
    patronales.
- **Tablas:**
  - **por área**, con totales;
  - **por trabajador**: solo para quien tiene permiso de **ver salarios**. Los demás ven
    solo los totales por área.
- **Parámetros editables:** ISN %, prima vacacional % y prima de riesgo de trabajo %.
- **Aviso** de trabajadores activos **sin salario capturado** (no se incluyen).
- **Exportación a CSV.**
- **Permisos:** módulo `mgmt-costo-mo` en Management. Mientras no se le fije un nivel, toma
  el de **Sueldos y Salarios**.

## UMA automática
- **Historial de la UMA por año** (vigencia del 1 de febrero al 31 de enero), precargado
  con 2023–2026.
  - **2026 = $117.31** queda marcado "por verificar" hasta que se confirme con el INEGI.
- **La Suite elige la UMA vigente para cada fecha.** Ya no hay que capturarla:
  - los campos "UMA Diaria" de Calcular Salario, Sueldos y Salarios y Nómina ya aparecen con
    la UMA vigente (se pueden cambiar a mano);
  - los cálculos del servidor la usan cuando no se manda otra.
- **Actualización automática:**
  - la Suite consulta la página de la UMA del **INEGI** (`UMA_URL`, por defecto
    https://www.inegi.org.mx/temas/uma/);
  - **cada semana**, y **a diario en enero y febrero** (cuando se publica el valor nuevo);
  - si encuentra el valor del año, lo agrega o lo corrige;
  - nunca borra valores;
  - si el INEGI no responde, conserva el último valor y lo indica.
- **Botón "UMA"** en Costo de mano de obra:
  - historial y última revisión;
  - **"Buscar en INEGI"** a demanda;
  - **captura manual** de un año, por si el sitio cambia o no hay conexión.

## Limitaciones (para la siguiente iteración)
- **Cesantía y vejez patronal** se calcula con la tasa fija de 3.150 %, igual que Calcular
  Salario. Desde la reforma de 2020 esa cuota **sube cada año y depende del rango de
  salario** (en 2026 es mayor para salarios altos), así que el IMSS patronal puede estar
  subestimado. Conviene agregar la tabla escalonada.
- **Subsidio para el empleo** no se considera. Solo afecta a salarios bajos.
- **Horas extra** no se incluyen: se pidió jornada normal.

## Probado
- **3 trabajadores activos** con salario (más 1 de baja, excluido, y 1 activo sin salario,
  avisado).
- **Salario de $12,000:** ISR $1,033.15 (tarifa mensual: 893.63 + 16 % del excedente) e
  IMSS obrero $307.54 → neto $10,659.31; costo empresa $16,207.19.
- **Totales:** bruto $69,000 → costo empresa $92,118.65.
- **UMA vigente:** $117.31, y el campo de Sueldos y Salarios la toma sola.
- **Lectura del INEGI:** probada con una tabla de ejemplo (2026: 117.31; 2025: 113.14). Sin
  conexión → aviso y se conserva el valor.
