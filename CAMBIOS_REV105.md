# rev105 — "Modificar Orden de Compra": error "Error conectando al servidor"

## Qué pasaba
- Al buscar una orden, **cualquier** falla terminaba en el mismo mensaje: "Error conectando
  al servidor". Daba igual si era:
  - la conexión;
  - una sesión vencida (el servidor responde con la página de login);
  - una respuesta que el navegador no puede leer;
  - un error al dibujar la orden en pantalla.
- Por eso no se veía la causa real.

## Correcciones
- **Lectura de la orden más robusta** (`/api/gpo/<po>/lookup`):
  - las cantidades y precios de las partidas se leen de forma segura: texto con comas o
    "$", vacíos y valores inválidos ya no rompen el cálculo de entregado / pendiente;
  - la respuesta se limpia de valores que no son JSON válido (NaN / Infinito), que el
    navegador no puede leer y antes terminaban en "Error conectando";
  - fechas convertidas a texto;
  - acepta el número de orden con o sin ceros y con PO-, PO# o PO_ (por ejemplo, "9" encuentra
    PO-000000009);
  - si algo falla, el mensaje dice qué fue: "No se pudo leer la orden: …".
- **Mensajes claros en el modal:**
  - sin conexión → "Error conectando al servidor: …";
  - sesión vencida → "Tu sesión expiró. Vuelve a iniciar sesión.";
  - respuesta no legible → "El servidor respondió N con datos que no se pudieron leer…",
    con el detalle en la consola del navegador para soporte;
  - error al mostrar la orden → "No se pudo mostrar la orden: …".
- La fecha de la orden se muestra de forma segura aunque venga en otro formato.

## Probado
- PO-000000001, PO_1 y 1 encuentran la misma orden; una orden inexistente da "Orden … no
  encontrada".
- Se abre y se dibuja correctamente una orden editada en la rev103 (con historial de
  esquema y revisión).
