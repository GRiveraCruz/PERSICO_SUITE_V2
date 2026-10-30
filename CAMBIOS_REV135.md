# rev135 — Órdenes de compra: % de descuento por ítem o sobre el total

## En Generar Orden de Compra
- **Selector nuevo "Descuento"**, arriba de la lista de ítems: **Sin descuento** · **Por ítem** ·
  **Sobre el total de la PO**.

### Por ítem
| Columna | Cálculo |
|---|---|
| Precio unitario | captura |
| **Precio total** | cantidad × precio unitario |
| **% de descuento** | captura por renglón (0–100) |
| **Precio final** | precio total − % de descuento (muestra también el monto descontado) |

- **Abajo:** suma de precios totales − descuentos por ítem = **SUBTOTAL DESPUÉS DE DESCUENTO**.

### Sobre el total de la PO
- Un solo **% de descuento** para la orden:
  **SUBTOTAL** (suma de todos los ítems) − **DESCUENTO (x %)** = **SUBTOTAL DESPUÉS DE DESCUENTO**.

### Impuestos
- **El esquema tributario** (IVA trasladado, ISR retenido, IVA retenido, IEPS) se calcula sobre el
  **subtotal después de descuento**, igual que el "Total estimado".

## Cómo se guarda
- **En la orden generada:** `tipo_descuento`, `subtotal_bruto`, `descuento_items_amt`,
  `subtotal_items`, `descuento_global_pct`, `descuento_global_amt` y `descuento_total_amt`.
  `subtotal` es la **base de impuestos** (después de descuento).
- **En cada ítem:** `importe` (precio total), `descuento_pct`, `descuento_amt` y `total` (precio
  final).
- **En Purchase Orders (lista y costos por Job):**
  - cada renglón queda con su **costo neto**, ya con su descuento de ítem y la parte
    proporcional del descuento global;
  - `descuento_financiero` (monto) y `pct_descuento` (% efectivo) quedan informados;
  - así el Job Report, el Target Compras y los KPIs usan el costo real después de descuento.
- **Órdenes anteriores:** se comportan igual (sin descuento).

## PDF de la orden
- **Por ítem:** columnas **P. Total · % Desc. · P. Final**, y nota con el total descontado.
- **Sobre el total:** **SUBTOTAL**, **DESCUENTO (x %)** y **SUBTOTAL DESPUÉS DE DESCUENTO**, y
  después los impuestos y el total.

## Ediciones
- **Editar registro** (cantidad o precio de un renglón) y **Nueva versión** conservan el
  descuento del ítem y el global, y recalculan impuestos y costo neto.
- La ventana de Nueva versión todavía no permite cambiar el % de descuento; se mantiene el que
  tenía la orden.

## Probado
- **Por ítem** (A1: 2 × $100 con 10 % → $180; A2: $500 sin descuento): subtotal **$680**, IVA
  $108.80, total **$788.80**. En Purchase Orders: A1 $180 (descuento $20) y A2 $500.
- **Sobre el total 5 %:** subtotal $700 − $35 = **$665**, IVA $106.40, total **$771.40**. En
  Purchase Orders: A1 $190 y A2 $475 (5 % proporcional a cada renglón).
- **Sin descuento:** $700 / $812, igual que antes.
- **PDF:** columnas de descuento (por ítem) y subtotal después de descuento (sobre el total).
- **En pantalla:** el formulario muestra Precio total / % Desc. / Precio final y el resumen.
