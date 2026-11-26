# rev177 — Timing: vista «Tabla | Gantt» alineada y modal de actividad

## Vista «▥ Tabla | Gantt» (como en la referencia)
- **Botón nuevo junto a "Tabla + Gantt" y "Vista Project".**
- **Distribución:** la **tabla de configuración** queda a la izquierda y el **Gantt** a la derecha,
  **renglón por renglón a la misma altura:**
  - cada actividad tiene su barra en su propio renglón;
  - los grupos tienen su barra agregada;
  - las actividades sin fecha dejan su renglón vacío.
  - Medido en pantalla: diferencia de **0–1 px** entre el centro del renglón de la tabla y el de su
    barra.
- **Cada lado tiene su desplazamiento horizontal.** El encabezado de fechas del Gantt queda a la
  altura del encabezado de la tabla.
- **Al colapsar un grupo o al cambiar el tamaño de la ventana,** el Gantt se vuelve a alinear.
- **La vista elegida se recuerda,** igual que las otras dos.

## Modal para configurar la actividad
- **"+ Actividad"** agrega la actividad y **abre el modal** para configurarla. Por omisión queda
  "Inicio ← fin de la previa", encadenada a la última actividad, con 5 días.
- **El modal se abre también:**
  - con el botón **✏** junto al nombre de cada actividad en la tabla;
  - con **clic en la barra** (o en el nombre) de la actividad en el Gantt, en cualquier vista.
- **Contenido:**
  - fechas resultantes (y conflicto si lo hay);
  - nombre, grupo, **condición**, previa / posterior, fechas, días, **desfase − / +**, recursos,
    fecha real y cumplido;
  - botones **Eliminar actividad** y **Listo**.
  - Los cambios se reflejan al momento en la tabla y el Gantt.
- **Reemplaza al panel lateral** de la rev176. Se cierra con ✕, con Listo o haciendo clic fuera.

## Probado
- **9 renglones** (hitos, grupo con 2 actividades, una sin fecha, "Fin → posterior"): alineación de
  0–1 px; el renglón sin fecha queda vacío.
- **"+ Actividad"** → modal abierto con la previa sugerida (la última actividad); el nombre se captura
  y el Gantt se actualiza.
- **Clic en la barra "Purchase"** → abre su modal.
