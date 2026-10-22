# rev118 — Purchase Orders: los renglones restaurados no se veían junto a su PO

## Qué pasaba
- La rev117 restauró las partidas perdidas: el Job Report ya las sumaba. Pero en la **lista de
  Purchase Orders** quedaban **al final del año**, después de todas las demás órdenes. La
  lista muestra 100 renglones a la vez, así que normalmente ni se alcanzaban a ver, y junto
  a la PO solo aparecía la partida que había sobrevivido, por ejemplo el "COSTO DE ENVIO"
  de la PO-000000006.
- **El botón PDF** de ese renglón abría el PDF de **un solo renglón**, no el de la orden
  completa. Solo el renglón de la primera partida (que era justamente el que se había
  perdido) abría el PDF de la orden.

## Corrección
- **Los renglones de cada PO generada quedan juntos**, en el lugar de su primer renglón y en
  el orden de sus partidas. Se reordena solo al arrancar (una vez) y no cambia ningún dato.
- **El PDF:** el botón de **cualquier** renglón de una PO generada abre el PDF de la orden
  completa, con todas sus partidas.
- **Una sola partida por orden** queda marcada como "principal" (la primera).

## Probado (PostgreSQL local)
- **PO-1** de 3 partidas y **PO-2** creada después. Se borraron 2 partidas de PO-1 y se
  reinició: se restauraron y la lista quedó PO-1 (A1, A2, ENV) → PO-2 (B1). Antes las
  restauradas quedaban después de PO-2.
- Los renglones de una PO que ya estaban separados se reagruparon al arrancar.
