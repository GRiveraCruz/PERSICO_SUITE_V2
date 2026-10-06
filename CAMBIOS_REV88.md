# rev88 — KPI de eficiencia de horas: usadas ÷ planeadas, con meta máxima

- **Nuevo cálculo:** **horas usadas ÷ horas planeadas × 100**. Antes era planeadas ÷
  usadas.
  - 100 % = se usó exactamente lo planeado;
  - 120 % = se usaron 20 % más horas;
  - 80 % = sobraron horas.
- **La meta ahora es el máximo permitido** (menor es mejor):
  - verde si el valor es igual o menor a la meta;
  - ámbar hasta la tolerancia por encima;
  - rojo si la pasa.
  La tarjeta muestra la meta como "≤".
- **Nombre del KPI:** "Eficiencia horas usadas vs horas planeadas por proyecto".
- En "Ver proyectos", el detalle de cada Job se ajusta al ancho de la tarjeta; antes se
  cortaba.
- **Las metas ya capturadas no cambian de valor**, pero ahora se leen como máximo. Una meta
  de 85 % significa "no usar más del 85 % de lo planeado". Si la idea es "no pasarse de lo
  planeado", la meta debe ser 100 %, o por ejemplo 110 % para dar 10 % de holgura.
- **Probado:** 652-50 → 133.9 % (6,024 h usadas / 4,500 h planeadas), rojo contra una meta
  ≤ 95 %.
