# rev89 — KPIs por proyecto: solo Jobs realmente cerrados (estatus Done)

## Problema
- Un Job contaba como "cerrado" si tenía **Closing Date** capturada, aunque su estatus
  siguiera en Open o WIP.
- En Jobs abiertos la Closing Date suele estar capturada como fecha **estimada**. Por eso
  685-00 y 686-00, que no están cerrados, aparecían en el KPI de ahorro.

## Corrección
- **Un Job cuenta como cerrado solo por su estatus:** **Done** (o Closed / Cerrado, de
  capturas anteriores). Los Jobs Open, WIP o Cancelled nunca entran en los KPIs al cierre:
  margen, ahorro y eficiencia de horas.
- **Fecha de cierre de un Job Done:** su Closing Date, si ya pasó. Si no tiene, la del
  último registro de horas o su última actualización, igual que antes.
- **Entrega en tiempo** sigue usando la fecha real del Envío del Timing aunque el Job aún
  no esté en Done, porque la entrega ya ocurrió. Si no hay fecha real de envío, usa la
  fecha de cierre de un Job Done.

## Cómo se calcula el ahorro (sin cambios)
- **Target Compras:** el valor de **Configurar Proyecto**.
- **Adquirido:** lo comprado **real**, es decir, las órdenes de compra del Job en todos sus
  años, al momento de consultar.
- Ahorro = (Target − adquirido) ÷ Target, de los Jobs en Done.

## Probado
- 612-08 y 666-00, en WIP con Closing Date, ya no aparecen en ningún KPI al cierre.
- 652-50 y 665-00, en Done, siguen igual.
