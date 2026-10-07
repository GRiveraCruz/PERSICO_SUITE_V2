# rev98 — Permisos y vacaciones: solo cuentan días hábiles

- **Los días de un permiso por días** (vacaciones y cualquier otro tipo), pedido desde la
  Suite o desde el kiosco, **ya no cuentan sábados, domingos ni días de descanso obligatorio
  de la LFT**:
  - 1 ene;
  - primer lunes de febrero;
  - tercer lunes de marzo;
  - 1 may;
  - 16 sep;
  - tercer lunes de noviembre;
  - 25 dic;
  - 1 oct de cada 6 años (cambio del Ejecutivo).
- **Un periodo sin días hábiles** (por ejemplo, solo fin de semana y festivo) se rechaza con
  un mensaje.
- **Saldo de vacaciones:** al aprobar, se descuentan los días hábiles. También en Nómina, los
  días de vacaciones dentro del periodo son hábiles.
- **Permisos ya capturados:** al arrancar se recalculan en días hábiles los que aún no se
  descuentan (no rechazados y sin descuento de vacaciones). Se guarda el valor anterior en
  `dias_naturales_antes`. Los ya descontados no se tocan, para no mover saldos aplicados.
- **Formularios de la Suite** (nuevo permiso y editar): debajo de las fechas se ve en vivo
  "Cuenta como N días hábiles". El kiosco ya mostraba los hábiles en su calendario (v2.8).
- **Probado:**
  - viernes 13 a martes 17 de noviembre de 2026 (lunes 16 es festivo) → 2 días;
  - sábado 14 a lunes 16 → rechazado;
  - vacaciones del 21 de diciembre al 8 de enero → 13 días (sin fines de semana, 25 de
    diciembre ni 1 de enero).
