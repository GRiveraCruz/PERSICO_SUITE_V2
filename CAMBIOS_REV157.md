# rev157 — Timing: nombres completos en el Diagrama de tiempos

## Qué pasaba
- **La columna de nombres del Gantt tenía un ancho fijo de 190 px.** Las actividades se recortaban a
  20–24 caracteres y los grupos a 26 ("BKT 3 - MECHANICAL ENGINE…").
- **Los nombres largos de grupo** además se salían por la izquierda ("T 3 - MECHANICAL…").

## Corrección
- **La columna de nombres se ajusta al nombre más largo** del Timing: mínimo 190 px y máximo
  520 px. El diagrama crece hacia la derecha; el contenedor ya tiene desplazamiento horizontal.
- **Los nombres ya no se recortan** a 20–26 caracteres. Solo se cortan nombres de más de 70–80
  caracteres.
- **Al pasar el mouse** sobre un nombre se ve completo.
- **Aplica al Gantt en pantalla** y a "Imprimir PDF", que usa el mismo dibujo.

## Probado
- **Grupos:** "BKT 3 - MECHANICAL ENGINEERING DESIGN RELEASE (2)" y "BKT 4 - ELECTRICAL ENGINNERING
  (1)".
- **Actividades:** "BKT 3 - Mechanical concept review with customer" y "BKT 4 - Electrical
  schematics and panel layout".
- **Todos se ven completos,** alineados junto a sus barras.
