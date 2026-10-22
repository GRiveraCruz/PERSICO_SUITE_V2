# rev116 — Piso de ensamble: croquis a escala con coordenadas

## Croquis del área de ensamble
- **Rectángulo del área total**, dibujado a escala con el **largo × ancho** capturado en
  "Espacio disponible". Si falta alguna de las dos medidas, se indica que hay que
  capturarlas.
- **Cuadrícula de 5 m:**
  - **a lo largo, una letra por cada 5 m**: A = 0–5 m, B = 5–10 m… después de la Z sigue
    AA, AB…;
  - **a lo ancho, un número por cada 5 m**: 1 = 0–5 m, 2 = 5–10 m…;
  - etiquetas en los cuatro lados, y escala gráfica de 5 m.
- **El origen** es la esquina inferior izquierda del área (A1).

## Posición de cada máquina / Job
- **Columnas nuevas en la tabla:**
  - **Coordenada** (ej. B3);
  - **Girar** 90°: el largo de la máquina queda a lo ancho de la planta;
  - **Desp. X / Y (m)**: desplazamiento opcional dentro de la celda, para afinar la
    posición.
- **La coordenada ubica la esquina inferior izquierda de la máquina** en la esquina
  inferior izquierda de esa celda, más el desplazamiento. Ejemplo: C1 con desplazamiento
  (1, 1) queda en x = 11 m, y = 1 m. Ese punto se marca con un círculo en el croquis.
- **Cada máquina se dibuja** como un rectángulo de su largo × ancho, de color, con el Job
  o la descripción y sus medidas. Si es alta y angosta, la etiqueta va vertical.
  - Al pasar el mouse muestra el detalle; al hacer clic, salta a su renglón de la tabla.
- **Las que no están "En piso"** se pueden mostrar punteadas con la casilla "Mostrar también
  las que no están en piso".
- **Coordenadas inválidas** (por ejemplo "3B" o "A0") se rechazan con un mensaje.

## Revisión automática
- **Debajo del croquis:**
  - **"⚠ Fuera del área"**: máquinas que se salen del rectángulo;
  - **"⚠ Se enciman X y Y (N m²)"**: máquinas en piso que se traslapan, con el área
    encimada;
  - "Sin dibujar": máquinas en piso sin coordenada o sin largo/ancho;
  - si todo está bien: "✓ Todas las máquinas en piso caben sin encimarse".
- Las máquinas con problema se dibujan con borde rojo.
- **"⬇ SVG"** descarga el croquis como imagen vectorial, para imprimir o insertar en una
  presentación.

## Probado
- **Área** de 60 × 30 m → columnas A–L y filas 1–6.
- **Máquinas:**
  - 652-50 (12 × 8 en A1) → (0, 0);
  - 665-00 (10 × 6 en C1 + 1, 1) → (11, 1);
  - 665-01 en D1 → (15, 0);
  - Banco 12 × 4 girado en K2 → 4 × 12 en (50, 5).
- **Avisos detectados:**
  - 652-50 y 665-00 se enciman 6 m²; 665-00 y 665-01 se enciman 30 m²;
  - la celda en L6 se sale del área.
- **Validaciones:** las coordenadas "3B" y "A0" se rechazan.
