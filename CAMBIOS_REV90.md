# rev90 — KPIs por proyecto: Jobs en WIP y cerrados

Aplica a **Margen de ganancia promedio**, **Ahorro por compra de componentes** y
**Eficiencia horas usadas vs planeadas** (y a la lista de Entrega en tiempo).

- **Jobs que se muestran:** los Jobs del PM (o todos, si el KPI es global) en estatus
  **WIP** o **Done/Closed**. Los Open y Cancelled no aparecen.
- **Jobs cerrados (Done):**
  - se evalúan contra la meta (verde / ámbar / rojo);
  - forman el **valor principal** de la tarjeta, que ahora dice "promedio de proyectos
    cerrados";
  - cuentan en "cumplió X de Y";
  - siguen asignándose al año de su fecha de cierre.
- **Jobs en WIP:**
  - se muestran con su **valor al día de hoy** (barra rayada y la etiqueta "WIP" en "Ver
    proyectos");
  - **no se evalúan ni entran al promedio principal**, porque todavía no terminan: el
    ahorro de un Job que apenas empieza a comprar o las horas de uno a medio camino
    falsearían el resultado;
  - la tarjeta muestra aparte "WIP (N): promedio";
  - aparecen en el año en curso;
  - si les falta un dato (Target Compras, horas planeadas, Configurar Proyecto), se
    listan en "sin dato" con la marca "(WIP)".
- Los motivos de "sin dato" ahora se ajustan al ancho de la tarjeta.

## Probado (PostgreSQL local)
- **Margen:**
  - 652-50 cerrado → 60 % (evaluado);
  - 612-08 y 666-00 en WIP → 94.7 % y 98.5 % al día de hoy, mostrados como WIP sin evaluar;
  - promedio principal 60 %; WIP (2): 96.6 %.
- **Ahorro y eficiencia:** los Jobs WIP sin Configurar Proyecto aparecen en "sin dato" como
  "(WIP)".
- En 2025 no aparece ningún WIP.
