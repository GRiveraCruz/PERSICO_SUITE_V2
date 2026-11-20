# rev158 — Diagrama de tiempos: columna de nombres fija, dependencias y ruta crítica

## Columna de nombres fija
- **Al desplazar la línea de tiempo** a la derecha (sobre todo en la vista **Días**), la columna de
  nombres de actividades y grupos **se queda fija** a la izquierda, con una sombra que la separa de
  las barras.
- **El "Imprimir PDF"** sigue usando el diagrama completo.

## Líneas de dependencia
- **Cada actividad que tiene "Actividad previa"** (condicionada) se une con una **flecha** desde el
  **final** de su actividad previa hasta su **inicio** (fin → inicio).
  - Las dependencias normales se dibujan en **gris punteado**.
- **Al pasar el mouse** sobre la flecha se ve "Actividad previa → Actividad".
- **Si alguna de las dos actividades está en un grupo colapsado,** no se dibuja la flecha.

## Ruta crítica
- **Se calcula desde la(s) actividad(es) que terminan al último,** hacia atrás por su actividad
  previa, mientras su inicio dependa de ella (sin fecha inicial propia). Si dos cadenas terminan
  el mismo día, las dos son críticas.
- **Se resalta en rojo:** flechas rojas más gruesas y contorno rojo en las barras.
- **En la leyenda** aparecen "Dependencia" y "Ruta crítica".
- **Casilla "Dependencias y ruta crítica"** junto a Días/Semanas/Meses para mostrarlas u
  ocultarlas.

## Probado
- **Timing de prueba:**
  - Diseño mecánico → (Diseño eléctrico, Compras mecánicas);
  - Diseño eléctrico → Compras eléctricas → Run Off interno;
  - Compras mecánicas → Ensamble mecánico.
- **Las flechas** salen del final de cada actividad previa hacia el inicio de su condicionada.
- **Ruta crítica:** las dos cadenas que terminan el 21-dic quedan en rojo:
  - Diseño mecánico → Compras mecánicas → Ensamble mecánico;
  - Diseño mecánico → Diseño eléctrico → Compras eléctricas → Run Off interno.
- **Desplazando la vista Días** hasta diciembre, los nombres siguen fijos a la izquierda.
