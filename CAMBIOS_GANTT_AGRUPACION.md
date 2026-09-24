# CAMBIOS_GANTT_AGRUPACION.md — Configurar Proyecto → Timing: agrupación de tareas

## Contexto

El usuario pidió replicar una interfaz de Gantt como la de GestionalePW en
"Configurar Proyecto". Antes de construir nada se investigó el módulo y se encontró
que **ya existía un motor de cronograma bastante completo** (dependencias entre
actividades, cálculo automático de retraso/adelanto, hitos, exportación a PDF, Gantt
en SVG con línea de "Hoy"). Se comparó visualmente contra la referencia (con
Playwright/Chromium real) y se identificaron los huecos reales. De esos, el usuario
eligió **agrupación de tareas (padre/hijo colapsable)** como prioridad — la pieza más
grande de las cuatro identificadas.

## Qué se construyó

- **Nueva columna "Grupo"** en la tabla de Timing — cada actividad puede asignarse a
  un grupo (texto libre con sugerencias de los grupos ya creados, mismo patrón que ya
  usa "Actividad Previa").
- **Botón "+ Grupo"** junto a "+ Actividad" — agrega una fila de encabezado de grupo:
  solo tiene nombre, sin fecha ni duración propia.
- **Las fechas de un grupo se calculan solas**, a partir de sus actividades hijas
  (fecha condicionada = la más temprana entre sus hijas; fecha objetivo = la más
  tardía) — igual que en la referencia, donde el grupo es un contenedor, no una
  tarea con trabajo propio.
- **Colapsar/expandir** — el triángulo ▾/▸ en la fila de grupo oculta/muestra sus
  actividades, tanto en la tabla como en el diagrama de Gantt (al colapsar, el grupo
  se sigue viendo como una sola barra agregada).
- **En el Gantt**: cada grupo se dibuja como una barra de solo contorno (sin relleno)
  que abarca el rango completo de sus hijas, con un contador "(N)"; las actividades
  hijas se dibujan indentadas debajo, en el mismo orden de color/estatus que ya
  existía (ámbar=en tiempo, verde=cumplido, rojo=retraso). Las actividades sin grupo
  asignado se siguen mostrando igual que antes, al final.

## Decisiones de diseño

- **Se mantuvo el mismo patrón de "texto libre + sugerencias"** que ya usa
  "Actividad Previa", en vez de convertir esto en un árbol/lista arrastrable — es
  consistente con cómo ya está construida toda esta tabla, y no requiere una
  reestructuración de la edición para el usuario (sigue siendo una tabla plana que
  se llena celda por celda).
- **El orden de dibujo en el Gantt no depende del orden físico de las filas en la
  tabla** — se agrupa por asignación (`Grupo`), no por posición. Esto significa que
  puedes agregar actividades sueltas y asignarlas a un grupo después, sin tener que
  reordenar filas a mano para que se vean juntas en el diagrama.
- **El estado de colapsado no se guarda** — al recargar un proyecto, todos los grupos
  aparecen expandidos. Es una decisión deliberada de mantenerlo simple por ahora; se
  puede agregar persistencia del colapso si hace falta.

## Pruebas ejecutadas (con Playwright/Chromium real, no solo revisión de código)

1. Se crearon 2 grupos ("Purchasing", "Machine Assembly") con 2 actividades cada uno,
   más 1 actividad suelta sin grupo — capturas de pantalla reales confirmando que se
   ve correctamente tanto en la tabla como en el Gantt.
2. Se verificaron a mano los cálculos de fecha agregada de cada grupo contra sus
   hijas (ej. "Purchasing" con hijas que terminan 30/10 y 10/10 → fecha objetivo del
   grupo = 30/10, la más tardía — correcto).
3. Se colapsó un grupo y se confirmó con captura real que sus hijas desaparecen de
   la tabla y del Gantt, dejando solo la barra agregada.
4. **Prueba de punta a punta con el guardado real**: se llenó el timing, se guardó
   con el botón real "Guardar Configuración" (que llama a `POST /api/projconfig`), se
   recargó la página completa desde cero, se volvió a abrir el mismo proyecto, y se
   confirmó que la estructura de grupos y las fechas calculadas se reconstruyen
   exactamente igual desde el servidor.
5. Se confirmó que "Imprimir PDF" sigue funcionando sin errores de JavaScript con la
   nueva estructura.

## Ronda 2 — más cerca de la referencia: Recursos, zoom Día/Semana/Mes, fines de semana

Después de ver la agrupación funcionando, el usuario volvió a compartir la misma
imagen de referencia pidiendo que el resto del Timing se le pareciera más. Se
implementaron tres de las cuatro mejoras pendientes:

### Columna "Recursos"
Campo de texto libre por actividad (sin catálogo de empleados por ahora — es
consistente con cómo ya funciona "Actividad Previa"/"Grupo": texto libre con
sugerencias, no un selector estructurado).

### Zoom Días / Semanas / Mes
Antes el espaciado de fechas del Gantt se autoescalaba solo según el rango total.
Ahora hay 3 botones que controlan el zoom explícitamente, igual que en la
referencia. **Problema real que encontré al probarlo** (no solo con inspección de
código, con captura real): en modo "Días" sobre un rango largo (ej. 90 días), las
etiquetas de fecha se amontonaban unas sobre otras — el contenedor sí recortaba bien
(no era el bug de `min-width:0` de la ronda del dashboard), era un problema genuino
de densidad de información. Se corrigió mostrando el texto de la fecha solo cada
N días según el espacio real disponible por día, mientras la rejilla fina se sigue
dibujando cada día — confirmado con una segunda captura que ya no se amontonan.

### Sombreado de fines de semana
Columnas sábado/domingo sombreadas en rojo muy tenue, igual que las columnas rosas de
la referencia.

### La barra de grupo cambió de estilo
En la ronda anterior el grupo se dibujaba como una caja con solo contorno (vacía). Al
comparar de nuevo contra la referencia se ajustó a una línea sólida delgada con
remates en los extremos — más fiel a como GestionalePW representa una fila
agregadora, y ocupa menos espacio visual que compite con las barras de sus hijas.

### Diferencia que se mantuvo a propósito
En la referencia, el color de cada barra parece representar una **categoría** (ej.
compras en naranja, ingeniería en azul claro). Aquí el color sigue representando
**estatus** (ámbar=en tiempo, verde=cumplido, rojo=retraso) porque es información
más útil para el seguimiento del proyecto y ya existía antes de esta ronda — cambiar
a colores por categoría requeriría un campo nuevo de "tipo/categoría" que no se
pidió explícitamente. Si se prefiere ese comportamiento, es un cambio acotado que se
puede hacer después.

**Pruebas ejecutadas** (Playwright/Chromium real): capturas en los 3 niveles de
zoom, confirmación de que el sombreado de fin de semana aparece correctamente,
verificación de que la columna Recursos sobrevive un guardado real en el backend y
una recarga completa de página (`recurso: "Ana Garcia"` confirmado exacto tras el
ciclo completo).

## Pendiente
- Exportar a Excel (además de PDF) — la única de las 4 mejoras originalmente
  identificadas que falta.
- Colores de barra por categoría en vez de por estatus, si se decide que se
  prefiere ese comportamiento sobre el actual.


