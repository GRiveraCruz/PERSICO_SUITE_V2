# rev55 — Recuperaciones, proyectos que cruzan de año y ajustes al Dashboard del proyecto

## 1. Recuperaciones: suman al margen y restan al costo
Las recuperaciones se guardan con signo negativo (`total_value`), porque son un abono.
Antes el resultado operativo las sumaba con ese signo, así que **reducían** el resultado.
Además, el "Cost" del Job Report no las descontaba.
- `_build_report_data()` toma cada recuperación en **valor absoluto** (Stock y Consignación):
  - `recovery_total` es siempre positivo;
  - **Costo** = mano de obra + compras + reasignaciones + servicios − recuperaciones;
  - **Margen** = revenue − costo.
- Con eso quedan correctos, sin tocar su fórmula:
  - el resultado operativo del Job Report (pantalla, PDF ejecutivo, Excel);
  - el Multi-Job Report;
  - el Dashboard PM, el Dashboard GM y el Dashboard del proyecto.
- También se corrigen dos cosas que dependían del signo:
  - la fila "♻ Recuperaciones" del PDF ejecutivo y la columna de recuperaciones del reporte
    múltiple, que solo aparecían con valores positivos y por eso nunca se veían;
  - el costo recalculado con CPO del Dashboard GM y del Multi-Job ("Por año").
- Prueba: recuperación de $1,200 en 652-50 → costo −$1,200, margen y resultado operativo
  +$1,200.

## 2. Proyectos que cruzan de año — "Vida del Job"
Antes el costo de un Job solo tomaba Work Hours, compras y CPO **de un año**. Un Job de
2026 que sigue en 2027 perdía el costo y el revenue de 2027.
- Nueva `_build_report_data_vida()`: suma **todos los años desde el de creación del Job**
  hasta el último año con datos.
  - Work Hours de cada año, con el Hourly Rate de **ese** año. Si el año todavía no tiene
    Hourly Rate cargado (ej. enero), se usa el más reciente anterior y se avisa.
  - Compras (IPO) de cada año.
  - Revenue = CPO de todos los años (o el del Job si no hay CPO).
  - Servicios, reasignaciones y recuperaciones no dependen del año: se cuentan una vez.
- **Dónde se usa:**
  - Dashboard PM, Dashboard GM (costo de los Jobs del año), Dashboard de Purchasing
    (monto adquirido) y Dashboard del proyecto (resultado operativo y gráfica de gasto);
  - **Job Report** (pantalla, Excel y PDF ejecutivo) y **Reporte Múltiple**: nuevo selector
    **Periodo**. Por default es "Vida del Job"; "Por año" deja elegir los años como antes.
- En el Job Report, el aviso de "Vida del Job" muestra el desglose por año y si algún año se
  valuó con el Hourly Rate de otro.
- Las cargas por año se hacen una sola vez por petición (`_ro_pools_factory`: WH/PO por año,
  el resto compartido).
- **Verificado sin cambios donde no debe haberlos:** con los datos actuales (todo en 2026) los
  40 Jobs dan exactamente lo mismo en modo "Vida" que el cálculo anterior de 2026. También
  son idénticos el Dashboard PM, el de Purchasing, el control de costo del GM, el Multi-Job y
  el Dashboard del proyecto.
- **Prueba con un Job que cruza de año** (se agregaron 318 h y una compra de $5,000 en 2027
  a 652-50):
  - el reporte "Vida" suma 5,596.6 h, M.O. +$2,512.63 (valuada con Hourly Rates 2026) y
    compras +$5,000;
  - el modo "Por año 2026" sigue dando lo de 2026;
  - la gráfica de gasto del Dashboard del proyecto cuadra con el resultado operativo.
- **Cambio de criterio a revisar:** el Dashboard GM y el Multi-Job, cuando el Job tenía CPO,
  recalculaban el costo **sin reasignaciones**. En modo "Vida" el costo es el mismo del Job
  Report (con reasignaciones). En "Por año", el Multi-Job conserva su cálculo anterior.

## 3. Dashboard del proyecto
- **Timing** justo debajo de Jobs asociados y del pastel de la LOP (también en ese orden en
  el Reporte PDF).
- **Horas por área:** por default es **gráfica de tendencia**, con una línea por área más la
  línea del total para ver los picos. Se puede cambiar a Barras y a Semanas/Meses.

## 4. Corrección encontrada en las pruebas
- **Exportar .xlsx del Job Report** fallaba (error 500) en cualquier Job con 5 o más compras:
  la lista de compras escribía sobre las filas separadoras combinadas (8 y 13). Ahora las
  salta. El error ya existía; salió al probar con 652-50.

## Archivos
- `app.py`:
  - nuevas: `_build_report_data_vida()`, `_anios_vida()`, `_rate_year_para()`,
    `_report_data_desde_request()`;
  - cambian: `_build_report_data()` (recuperaciones y costo), `_ro_pools_factory()`,
    `_ro_job()`, `_gasto_fechado()`;
  - rutas: `/api/report/data`, `/api/report/export-excel`, `/api/report/executive-pdf`,
    `/api/report/multi`, dashboards GM y Purchasing.
- `static/app.js`:
  - nuevas: `rptModoUI()`, `rptQS()`, `rptPeriodoTxt()`;
  - cambian: avisos del Job Report, `mrptGenerate()` (modo), `pcDashHistoricoHTML()`
    (tendencia) y el orden del Dashboard y del PDF.
- `static/index.html`: selector **Periodo** en Reporte por Job y Reporte Múltiple.
