# rev87 — KPI "Margen de ganancia promedio": un valor por Job

- El KPI **Margen de ganancia promedio de proyectos asignados** ya no se agrupa por
  trimestre. Ahora es **por proyecto**, como Entrega en tiempo, Ahorro y Eficiencia de
  horas.
- **La tarjeta muestra:**
  - una **barra por Job** cerrado en el año, de color según la meta;
  - el **promedio** de esos Jobs como valor del KPI;
  - "Ver proyectos": cada Job con su margen y el detalle. Por ejemplo, "Internal Target
    $300,000 · costo $119,989 · cierre 2026-09-30", con el origen de la fecha si no venía
    de la Closing Date;
  - los Jobs cerrados que no se pudieron calcular, con el motivo (sin Internal Target ni
    revenue, o Done sin fecha de cierre).
- **Cálculo, sin cambios:** resultado operativo ÷ Internal Target. Si el Job no tiene
  Internal Target, (revenue − costo) ÷ revenue. Se usan los mismos criterios de Job cerrado
  y fecha de cierre de la rev85.
- Las asignaciones existentes de este KPI no se tocan; la meta sigue igual.
- **Probado:** 652-50 → 60 % (Internal Target $300,000, costo $119,989). 665-01 aparece en
  "sin dato" por no tener Internal Target ni revenue.
