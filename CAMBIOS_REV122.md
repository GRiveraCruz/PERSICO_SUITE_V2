# rev122 — Términos de pago: tope de 100 % y días de vencimiento · Management ▸ Income Forecast

## 1. Tope de 100 % en los términos de pago
- **Mientras se captura:** si la suma de los milestones de un Job pasa del 100 %, los
  porcentajes se marcan en rojo y aparece "⛔ pasa del 100 %: no se podrá guardar".
- **"Guardar configuración" no guarda** y avisa qué Job y cuánto suma. Además lleva a la
  pestaña de ese Job.
- **El servidor también lo valida:** rechaza una configuración con más de 100 % por Job, aunque
  llegue por otra vía.

## 2. Vencimiento del pago (NET30, NET60, NET90…)
- **Columna nueva "Vencimiento (días)"** en cada milestone: campo libre de días naturales
  (0 a 365), con la etiqueta NET. Ejemplo: 30 → NET30.
- **Se hereda a la orden de cobro:**
  - el modal muestra "· NET30";
  - el PDF de la orden incluye "Vencimiento del pago";
  - al **registrar la factura** desde la orden, la **fecha de vencimiento** de la CPC se
    llena sola: fecha de factura + días.
- **Bloqueo:** con orden generada, los días quedan bloqueados junto con el resto del
  milestone.

## 3. Management ▸ Income Forecast (apartado nuevo)
- **Cobros esperados** de todos los milestones de pago de todos los proyectos.
- **Fecha esperada de cobro = fecha estimada del milestone + días de vencimiento**, en días
  naturales.
  - Una vez facturado, se usa la fecha de vencimiento de la factura.
- **Monto, según el avance:**
  - **Por cumplir / Cumplido sin orden:** % del milestone × revenue del Job, sin IVA
    (todavía no se sabe si llevará);
  - **Orden por facturar:** total de la orden de cobro (con IVA, si aplica);
  - **Facturado:** saldo pendiente de la factura CPC, en USD;
  - **Cobrado:** sale de los pendientes; se ve con el filtro "Cobrado" o "Todos".
- **Tarjetas:** total esperado, **vencido** (fecha pasada sin cobrar), próximos 30 días,
  próximos 90 días y milestones **sin fecha**.
- **Gráfica de cobros esperados por mes**, con una barra roja para lo vencido.
- **Tabla:**
  - columnas: fecha esperada, Job, PT/SV, cliente, milestone y %, fecha estimada, NET,
    monto, de dónde sale el monto, estatus y enlace a la orden o factura;
  - búsqueda, filtro por estatus y rango de fechas;
  - **exportación a CSV**.
- **Se actualiza solo:** al capturar milestones, generar órdenes, facturar o registrar
  pagos.

## Permisos
- Módulo nuevo `mgmt-income-forecast` en la pestaña Management. Mientras no se le fije un
  nivel, toma el de **CPC**.

## Probado
- **Milestones con 110 %:**
  - no se guardaron, con el aviso correspondiente;
  - corregidos a 100 %, se guardaron;
  - el servidor también rechazó 110 %.
- **Forecast:**
  - Anticipo 30 % (fecha 1-sep, NET30, con orden de $44,400) → 1-oct, **VENCIDO**;
  - Aceptación 50 % (15-nov, NET60) → **14-ene-2027**, $134,000;
  - Run-off 20 % sin fecha → "sin fecha".
- **Al facturar la orden** (factura del 26-oct), el vencimiento se llenó solo al 25-nov y
  el forecast pasó a "Facturado" con esa fecha.
- **Al registrar el pago** → "Cobrado".
