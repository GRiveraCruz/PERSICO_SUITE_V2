# rev95 — Eficiencia de horas (usadas vs planeadas) por área operativa

- El KPI **Hours efficiency: used vs planned** ahora también se calcula **por área
  operativa**: Ingeniería Mecánica, Ingeniería Eléctrica, Manufactura y Ensamble.
  - **Horas planeadas del área:** las horas de mano de obra de Configurar Proyecto de las
    líneas que pertenecen a esa área.
  - **Horas usadas del área:** las de Work Hours de esas mismas líneas.
  - Se usa la **misma relación línea → área de Capacidad** que el costo por hora y los
    índices de capacidad.
  - Por área se consideran **todos los Jobs** (no solo los de un PM), cerrados (Done) en el
    año y en WIP, con los mismos criterios de la rev85 y la rev90.
  - Un Job sin nada planeado ni usado en esa área no aparece. Si tiene horas usadas sin
    planeadas, se lista en "sin dato".
- **Cuatro asignaciones nuevas** por default (una por área, meta por definir), igual que el
  costo por hora. Se crean una sola vez.
- **Desglose en las tarjetas global y de persona:** tabla por área con el último proyecto
  cerrado y el promedio de los proyectos, más el número de proyectos y el color según la
  meta.
- **Asignación por área:** el KPI se puede asignar por área desde el modal (alcance
  "Un área").

## Probado (PostgreSQL local)
- **Global:** 104.2 % (665-00: 74.5 %; 652-50: 133.9 %).
- **Desglose por área:** Ing. Mecánica 124.4 %, Ing. Eléctrica 66.2 %, Manufactura 171 % y
  Ensamble 64.5 %, iguales a sus tarjetas de área.
- **652-50 por área:** Mecánica 1,251 / 2,500 h = 50 %; Eléctrica 1,323 / 1,000 h =
  132.3 %; Manufactura 684 / 200 h = 342 %; Ensamble 1,033 / 800 h = 129.1 %.
