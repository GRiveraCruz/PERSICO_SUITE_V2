# rev115 — Operaciones ▸ Piso de ensamble

Opción nueva **Operaciones ▸ Piso de ensamble**.

## 1. Espacio disponible de la planta
- **"Espacio total disponible (m²)":** se captura directo, o con el **largo × ancho** del
  área de ensamble, que lo calcula solo. Hay un campo de notas.
- Queda registrado quién lo actualizó y cuándo.

## 2. Máquinas / Jobs en el piso
- **Lista por máquina o Job:**
  - Job (con autocompletado) y descripción de la máquina. Puede ser una máquina sin Job,
    por ejemplo una celda de pruebas;
  - **largo y ancho (m)**: si se capturan los dos, el **área se calcula sola** (largo ×
    ancho); si no, se captura el área en m² directo;
  - **"En piso"**: solo las marcadas cuentan como espacio requerido. Sirve para dejar
    registradas máquinas que ya salieron o que aún no llegan;
  - fechas de entrada y salida del piso, y notas;
  - del Job se muestra el cliente y el estatus.
- **Edición:** directa en la tabla; cada cambio se guarda al salir del campo.
- **"+ Agregar máquina / Job"** para dar de alta.
- **Columna "m² en Config. Proyecto":** el "Espacio requerido" capturado en Configurar
  Proyecto (rev100), como referencia. Se marca en ámbar si es distinto al área de esta
  lista.
- **"⬇ Importar N Job(s) con espacio requerido en Configurar Proyecto":** agrega los Jobs
  que ya tienen m² capturados allá y aún no están en la lista.

## 3. Resultado
- **Tarjetas:**
  - **Espacio disponible**;
  - **Espacio requerido** (suma de lo que está en piso);
  - **Espacio libre** (disponible − requerido), en verde, o **"Faltan"** en rojo si el
    requerido supera al disponible;
  - **Ocupación %**.
- **Barra de ocupación:** verde hasta 85 %, ámbar hasta 100 % y roja si se rebasa.

## Para el plano gráfico
- Cada máquina guarda **largo y ancho**, y la planta su largo y ancho, para dibujar más
  adelante un plano del piso con las máquinas a escala.

## Permisos
- Módulo nuevo `ops-piso` en la pestaña Operaciones de los permisos.
- Mientras no se le fije un nivel, **toma el nivel de Capacidad**. Ver = consultar;
  Crear = capturar y editar; Total = eliminar.

## API
- `GET /api/piso-ensamble` · `PUT /api/piso-ensamble/config`
- `POST /api/piso-ensamble/items` · `DELETE /api/piso-ensamble/items/<id>`
- `POST /api/piso-ensamble/importar-config`

## Probado
- **Planta** de 40 × 25 m → 1,000 m².
- **652-50** de 12 × 8 m → 96 m². **665-00** de 300 m² → requerido 396 m², libre 604 m².
- **Celda de pruebas** de 650 m² sin Job → requerido 1,046 m², **faltan 46 m²**, ocupación
  104.6 %.
- **665-00 marcado fuera de piso** → requerido 746 m², libre 254 m², 74.6 %.
- **Validaciones:** un renglón sin área se rechaza, igual que las medidas negativas.
