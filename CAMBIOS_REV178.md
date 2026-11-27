# rev178 — Timing ⇄ ProyectoPy (.ppj) y Microsoft Project (XML)

## Qué incluye
- **El motor de ProyectoPy** (programación CPM e intercambio XML con MS Project) queda incluido en
  la Suite, en `./proyectopy` (`scheduler.py` y `msp_xml.py`, puro Python, sin dependencias
  nuevas).
- **En Configurar Proyecto ▸ Timing, tres botones nuevos:**
  - **⬆ Importar:** archivo **.ppj** de ProyectoPy o **.xml** de Microsoft Project. En Project:
    Archivo ▸ Guardar como ▸ «Formato XML». Los **.mpp** no se pueden leer: se pide guardarlos como
    XML.
  - **⬇ .ppj:** descarga el Timing como proyecto de ProyectoPy, para editarlo allá con todas sus
    herramientas y volver a importarlo.
  - **⬇ MS Project:** descarga el Timing en XML de Microsoft Project (Project 2007 o posterior).

## Importar (ProyectoPy / MS Project → Timing)
- **Estructura:**
  - las **fases** (tareas de resumen) → **grupos** del Timing;
  - las **tareas** → **actividades** de su fase, con duración en días hábiles, recursos y avance
    (100 % = cumplido);
  - los nombres repetidos se distinguen con "(2)".
- **Dos modos de fechas:**
  - **Conservar dependencias:**
    - una o varias predecesoras **FC** → **«Inicio ← fin de la previa»** con su **desfase**. Con
      varias, se conserva la que define el inicio y se avisa cuál;
    - vínculos **CC / FF / CF** o restricciones de fecha → actividad **Manual** con su fecha
      calculada por ProyectoPy, y se avisa.
  - **Fechas fijas:** cada actividad con su **inicio y fin exactos** del archivo.
- **Opciones:** **reemplazar** el Timing actual o **agregar al final**.
- **No se guarda hasta presionar «Guardar configuración».** Al terminar se muestran los avisos de
  la conversión.
- **Nota de calendario:** el Timing usa los días hábiles del ERP (sin sábados, domingos ni festivos
  de ley). Si el archivo no tenía cargados esos festivos, las fechas dependientes pueden recorrerse
  1–3 días; con «Fechas fijas» se conservan exactas.

## Exportar (Timing → ProyectoPy / MS Project)
- **Estructura y vínculos:**
  - grupos → tareas de resumen; actividades → subtareas;
  - «Inicio ← previa» y «Entre» → vínculo **FC** con su desfase;
  - «Fin → posterior» y «Entre» → la posterior queda vinculada (FC) a esta actividad.
- **Fechas:** las actividades Manual o calculadas en retrospectiva llevan una restricción «No
  comenzar antes del» con su fecha resuelta.
- **Calendario:** se incluyen los **festivos oficiales de México**, el mismo calendario del ERP.

## Probado (con el ejemplo «Celda de ensamble»)
- **Importar en modo dependencias** → 4 grupos y 15 actividades.
  - "Diseño mecánico" ← "Revisión de especificaciones" (FC).
  - "Diseño eléctrico" (CC+3) → Manual 17-nov.
  - 7 avisos de conversión.
- **Importar en modo fechas fijas** → mismas fechas que ProyectoPy, sin avisos.
- **En pantalla:** importado en la vista «Tabla | Gantt», con barras y dependencias.
- **Exportar a .ppj** → 19 tareas con niveles, vínculos y restricciones. ProyectoPy lo reprograma
  sin errores.
- **Exportar a XML de MS Project** → archivo válido; se volvió a importar con 19 renglones.
