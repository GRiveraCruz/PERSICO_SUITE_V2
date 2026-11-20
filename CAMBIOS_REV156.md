# rev156 — Timing: arrastrar y soltar actividades y grupos

- **Cada renglón del Timing** (actividades y grupos) tiene una **manija ⠿** a la izquierda de las
  flechas ▲ ▼. Se arrastra desde ahí y se suelta donde se quiere. Las flechas siguen funcionando.
- **Guía visual mientras se arrastra:**
  - una **línea roja** indica si quedará **antes** o **después** de la fila;
  - al pasar sobre el centro del encabezado de un grupo, el grupo se **resalta** (soltar
    "dentro");
  - lo que se está moviendo se ve atenuado.
- **Reglas:**
  - **Grupo:** se mueve **completo** (encabezado + sus actividades) antes o después del bloque donde
    se suelta.
  - **Actividad:**
    - soltada **antes o después de otra actividad**, se coloca ahí y **toma el grupo de esa fila**;
      así se puede **cambiar de grupo arrastrando**;
    - soltada **dentro o debajo del encabezado de un grupo**, queda como **primera actividad de ese
      grupo**;
    - soltada **encima del encabezado de un grupo**, queda **sin grupo**, antes de ese bloque;
    - junto a una actividad sin grupo, queda sin grupo.
- **Después de soltar,** se recalculan las fechas y el Gantt, y lo movido se resalta un momento.
  Se guarda con el botón Guardar de siempre.
- **En solo lectura** (sin permiso de edición en Timing), la manija no aparece, igual que las
  flechas.

## Probado (arrastre real en el navegador)
- **Inicio:** [DISEÑO] Diseño mecánico, Diseño eléctrico · [COMPRAS] Compras mecánicas · Run Off
  (sin grupo).
- **"Run Off" soltada sobre DISEÑO** → primera actividad de DISEÑO, con grupo = DISEÑO.
- **Grupo COMPRAS soltado antes de DISEÑO** → se movió completo, con su actividad.
- **Una actividad de DISEÑO soltada debajo de "Compras mecánicas"** → pasó a COMPRAS, con grupo =
  COMPRAS.
