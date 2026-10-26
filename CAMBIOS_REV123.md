# rev123 — CPP: fecha de vencimiento y programación de pagos

## Días de crédito del proveedor
- **Campo nuevo "Días de crédito"** (número, 0–365) en **Compras ▸ Proveedores**, junto a
  "Términos de pago". También se muestra en la ficha del proveedor.
- **Si se deja vacío,** se toma del texto de "Términos de pago": "30 días" → 30,
  "NET 60" → 60, "contado" o "inmediato" → 0.

## Vencimiento de cada CPP
- **Vencimiento = fecha de la factura + días de crédito** (naturales).
  - La fecha de la factura sale del CFDI de Procesar Compra; si no hay, de la fecha de la CPP.
  - Los días salen del proveedor o de la propia CPP.
- **Por CPP se puede ajustar** (botón **"Programar"**):
  - **días de crédito** propios de esa CPP: tienen prioridad sobre los del proveedor y se
    marcan con *;
  - **fecha de vencimiento a mano**: se respeta aunque cambien los días;
  - **fecha programada de pago**.
  - Cada cambio queda en la **bitácora** de la CPP.
- **Moneda y equivalente en USD:**
  - moneda tomada del CFDI (o de la OC);
  - tipo de cambio del CFDI, de la OC o de Finanzas ▸ Tipo de cambio según la fecha de la
    factura.
- **Lista de CPP**, columnas nuevas: **Fecha factura**, **Vencimiento** (en rojo con los días
  si está vencida) y **Pago programado**, con su semana.
- **Estatus calculado:** Vencido · Programado · Por vencer · Sin vencimiento · Pagado.

## Finanzas ▸ Programación de pagos (apartado nuevo)
- **Antigüedad de saldos** (equivalente en USD): total por pagar, por vencer, vencido 1–30,
  31–60, 61–90 y 91+, y "sin vencimiento" (CPP cuyo proveedor no tiene días de crédito).
- **Plan de pagos por proveedor y semana** (como el *Payments plan* del archivo de flujo):
  - filas por proveedor y columnas de la semana actual + 7 siguientes;
  - además: semanas pasadas, después y **sin programar**;
  - totales por semana y por proveedor.
- **Tabla de CPP pendientes:**
  - búsqueda y filtro: vencidas, por vencer, programadas, sin vencimiento, sin programar;
  - **selección múltiple** para **programar varias CPP en una fecha** o quitarles la
    programación;
  - "Editar" abre la programación de la CPP;
  - **exportación a CSV**.
- **El pago se sigue procesando en CPP ▸ Procesar Pago**. Al pagarse, la CPP sale de la
  programación.

## API
- `GET /api/cpp/programacion` — pendientes, antigüedad y semanas.
- `PUT /api/cpp/<cpp>/programacion` — días, vencimiento manual y fecha programada.
- `POST /api/cpp/programar` — fecha programada para varias CPP.
- `GET /api/cpp` y `/api/cpp/pendientes` ahora incluyen vencimiento, programación y estatus.

## Permisos
- Módulo nuevo `fin-prog-pagos`. Mientras no se le fije un nivel, toma el de **CPP**.
- Programar requiere Crear en CPP.

## Probado
- **Proveedores:** "30 días" → 30, "NET 60" → 60, "contado" → 0, días capturados 15 →
  15, sin términos → sin vencimiento.
- **CPP:**
  - factura del 6-sep con 30 días → vence 6-oct, **vencida 20 días**;
  - USD con 60 días → 5-dic, por vencer;
  - contado de hace 100 días → vencida 91+.
- **Ajustes:**
  - días propios (45) en una CPP sin términos → vence 7-dic;
  - vencimiento manual → respetado.
- **Programación masiva** de 2 CPP al 6-nov → semana 45: $3,500 USD equiv. (MXN 18,000 +
  USD 2,500).
- **Validación:** días inválidos → rechazados.
