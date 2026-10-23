# rev120 — KPI "Monthly sales (Customer POs)": ingresos mensuales por CPO

## El KPI
- **Nombre:** **Monthly sales (Customer POs)** — "Ingresos mensuales por órdenes de compra de
  cliente".
- **Cálculo, por mes:** suma del **valor de las Customer POs de revenue** cuya **fecha** cae
  en ese mes.
- **No cuentan las CPO con "TBD" en el número de orden** (TBD, TBD-ABC, etc.: pedidos aún
  sin PO formal del cliente).
  - En cada mes se informa cuántas CPO TBD se excluyeron y por cuánto.
  - En la tarjeta se muestra el **total del año** y el total excluido por TBD.
- **Alcances:**
  - **global** (toda la empresa): queda configurado solo, con la meta por definir;
  - **por persona**: las CPO donde es PM.
- **Meta:** "al menos" un monto mensual. Se puede mostrar en el Dashboard de los perfiles
  elegidos, como los demás KPIs.

## Ajuste relacionado
- El KPI y el de **POs received by month** ahora toman las CPO **de todos los años
  capturados** y las ubican por su **fecha**. Antes solo leían las CPO del año
  seleccionado, y una CPO capturada en el registro de otro año con fecha de este no
  contaba.

## Probado (PostgreSQL local)
- **Septiembre:** CPO de $10,000 + una "TBD" de $5,000 → **$10,000** ("1 TBD excluida(s) por
  $5,000").
- **Octubre:** $7,000 + "TBD-ABC" de $2,500 → **$7,000**.
- **Agosto:** una CPO capturada en el registro de 2025 con fecha de agosto 2026 → contada,
  $3,000.
- **Total del año** $20,000, con 2 TBD excluidas por $7,500.
- La asignación global se creó sola.
