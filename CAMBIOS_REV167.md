# rev167 — Facturación electrónica: fecha del CFDI en hora de México

## Error
- **Mensaje de FiscalAPI:** `401 - El rango de la fecha de generación no debe de ser mayor a 72
  horas… Fecha de emisión: 2026-11-24T21:18:27 · Fecha del Servidor: 2026-11-24T15:18:27`.
- **Causa:** el ERP corre en Railway con **hora UTC**. Ponía en el CFDI la hora del servidor
  (21:18), que en México eran las 15:18, es decir, **6 horas en el futuro**.
- **Regla del SAT:** la fecha del comprobante debe ser la **hora local del lugar de expedición** y
  estar entre las últimas 72 horas y unos minutos adelante.

## Corrección
- **La fecha de todos los CFDI** (ingreso, complemento de pago y nota de crédito) se genera en la
  **hora del centro de México** (`America/Mexico_City`).
  - Se resta 1 minuto de margen por diferencias de reloj.
  - La zona se puede cambiar con la variable `CFDI_TZ`, si algún día se factura desde otra zona.
- **Si el servidor no tuviera la base de zonas horarias,** se usa UTC−6 (el centro de México ya no
  tiene horario de verano).
- **Se agregó `tzdata` a `requirements.txt`,** para que la zona horaria exista siempre en Railway.

## Probado
- **Servidor en UTC 21:25** → el CFDI se envió con fecha **2026-11-24T15:24:17** (hora de México),
  y el simulador con la misma regla de rango lo **timbró**.
