# rev124 — Pagos programados en PAGOS · Forecast semanal de ingreso vs gasto

## 1. Programar un pago lo registra en PAGOS
- **Al programar una o varias CPP** (en Programación de pagos o en el botón "Programar" de
  la CPP):
  - se crea **automáticamente su registro en PAGOS** con la fecha programada, **por
    confirmar** ("📅 Programado dd-mm-aaaa");
  - la **CPP cambia a estatus "Programado"**.
- **Reprogramar** cambia la fecha del mismo pago, sin duplicarlo.
- **"Quitar programación"** elimina el pago programado de PAGOS (solo si no está
  confirmado) y la CPP regresa a **Pendiente**.
- **"Confirmar Pago"** en PAGOS:
  - deja la **CPP en "Pagado"**;
  - guarda la fecha real de pago;
  - la CPP sale de la programación y del saldo por pagar.
- **"Procesar Pago" desde CPP** sobre una CPP ya programada usa **ese mismo pago**, sin
  crear otro.

## 2. Income Forecast: ingreso esperado vs gasto comprometido, semana a semana
- La gráfica ahora es **semanal**: columna de lo **vencido**, la semana actual (resaltada),
  las 12 siguientes y **"Después"**.
- En cada semana hay dos barras:
  - **verde:** ingreso esperado (milestones de pago, órdenes de cobro y facturas por
    cobrar);
  - **roja:** gasto comprometido (CPP por pagar en su **fecha programada de pago** o, si
    no tiene, en su **vencimiento**).
- **Fila inferior:** **neto de la semana** y **acumulado**, en rojo si es negativo.
- **Encabezado:** total de ingreso y de gasto. Al pasar el mouse sobre cada semana se ve el
  detalle.
- **Avisos:** CPP sin vencimiento y CPP sin tipo de cambio, que no se pueden ubicar o
  convertir a USD.

## Probado
- **Programar 2 CPP** → 2 pagos en PAGOS por confirmar y CPP "Programado".
- **Reprogramar** → mismo pago con la nueva fecha (sigue habiendo 2 pagos).
- **Quitar programación** → el pago se eliminó y la CPP volvió a Pendiente.
- **Confirmar Pago** → CPP "Pagado".
- **"Procesar Pago" de una CPP programada** → se usó su pago (1 solo registro).
- **Forecast:**
  - ingreso de $80.4k en la semana actual y $187.6k en la S51;
  - gasto de $2.5k en la S49 (vencimiento) y $2k vencido;
  - neto semanal y acumulado correctos.
