# rev100 — Presupuesto con pestañas por Job, espacio requerido y acceso desde PT/SV

## 1. Presupuesto: una pestaña por Job
- En **Configurar Proyecto → Presupuesto**, las tarjetas de los Jobs ya no van una debajo
  de otra: arriba hay **una pestaña por Job** (número, cliente y revenue) y solo se
  muestra la del Job elegido.
- La pestaña **"Ver todos"** regresa a la vista de lista completa, útil para comparar o
  imprimir.
- Con un solo Job no se muestran pestañas.
- La fila de totales y el guardado no cambian: se guardan todos los Jobs, aunque solo se
  esté viendo uno. Las pestañas también funcionan con permiso de solo lectura.

## 2. Campo "Espacio requerido (m²)"
- **Campo nuevo** en el encabezado de cada Job (junto a las fechas): espacio estimado en
  piso para instalar el equipo, en metros cuadrados, con decimales.
- Se guarda con la configuración del proyecto (`espacio_requerido`, número o vacío).

## 3. Abrir la configuración desde PT / SV Numbers
- En las listas de **PT Numbers** y **SV Numbers**, cada renglón tiene el botón
  **"⚙ Configurar"**. Abre Configurar Proyecto con ese PT/SV ya cargado (o lista para
  configurarse si aún no tiene configuración).
- El clic en el resto del renglón sigue abriendo la edición del PT/SV como antes.

## Probado
- Desde la lista de PT Numbers, "⚙ Configurar" de PT-0099 abre su configuración.
- Presupuesto: pestañas 652-50 y 665-00 más "Ver todos". Solo se ve la tarjeta elegida y al
  cambiar de pestaña se intercambia.
- Espacio requerido de 42.5 m² en 665-00 → guardado y leído de vuelta.
