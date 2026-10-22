# rev117 — POs generadas con varias partidas: renglones perdidos en Purchase Orders y en el Job

## Qué pasaba
- Al emitir una orden de compra con varias partidas, la Suite crea **un renglón por
  partida** en Purchase Orders, y **todos comparten la misma Clave** (PO-000000xxx).
- **"Cargar Excel" en modo Acumular** juntaba los registros existentes **por Clave**. Al
  hacerlo, de cada PO generada con varias partidas **solo dejaba la última** y borraba las
  demás.
- **El modo "Reemplazar todo"** borraba todos los renglones de las POs generadas.
- Por eso, en las POs creadas antes de la última carga de Excel (PO-000000002 a
  PO-000000032), las partidas desaparecieron del registro y **del costo de compras del
  Job**: el Job Report suma esos renglones.
- **La orden en sí no se perdió.** La PO generada (con todas sus partidas, el PDF y las
  entregas) siempre estuvo completa. Solo faltaban sus renglones en la lista de Purchase
  Orders.

## Corrección
1. **"Cargar Excel" ya no toca los renglones de POs generadas en la Suite** (ni los
   divididos), en ningún modo:
   - **Acumular:** actualiza o agrega solo las claves del archivo y conserva todo lo demás;
   - **Reemplazar todo:** reemplaza solo lo que vino de Excel y conserva las POs generadas.
2. **Reparación automática:**
   - al arrancar, la Suite compara cada PO generada (no cancelada) con sus renglones en
     Purchase Orders y **agrega las partidas que falten**;
   - toma los datos de la PO: Job, proveedor, monto, moneda, CPO y PO SAE, más el estatus y
     la fecha de recepción de los renglones que sí quedaron;
   - no modifica los renglones existentes, y es seguro reiniciar varias veces;
   - el log muestra "[POs] Renglones restaurados en N PO(s) generada(s): PO-… (+n)";
   - los renglones restaurados llevan la marca `_reparado_rev117`.
   - Con eso, **el costo de compras de cada Job se corrige solo**.
3. **Revisión manual (administrador):**
   - `GET /api/po/reparar-gpo` → lista lo que falta, sin cambiar nada;
   - `POST /api/po/reparar-gpo` → lo agrega.

## Probado
- **PO de 3 partidas** ($100 + $100 + $30):
  - carga de Excel en modo Acumular y en Reemplazar → las 3 partidas se conservan;
  - antes, Acumular dejaba una sola y Reemplazar las borraba.
- **Datos ya dañados:** se borraron 2 de las 3 partidas a propósito; al reiniciar, la
  Suite restauró las 2. La revisión posterior ya no encontró faltantes.
