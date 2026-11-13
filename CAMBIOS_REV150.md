# rev150 — Candado: no se puede ingresar más de lo comprado en la OC

## Qué pasaba
- **El ingreso por orden de compra** no validaba contra lo comprado: se podía seguir ingresando
  material aunque ya se hubiera recibido todo (caso PO-000000023: comprado 4, recibido 5).
- **Además,** si un No. de parte aparecía en varios renglones de la OC (por ejemplo, para dos
  Jobs), cada ingreso **sumaba la cantidad completa a todos esos renglones**.

## Corrección
- **Candado en el servidor** (Ingreso por OC de la Suite y por OC de SAE):
  - por cada No. de parte, la cantidad a ingresar no puede pasar de lo **pendiente** (comprado −
    ya recibido);
  - tampoco se aceptan números de parte que **no están en la orden**;
  - el ingreso se rechaza completo, con el detalle: "No se puede ingresar más de lo comprado en la
    orden PO-…: 1042243 — ya se recibió todo lo comprado (comprado 4, recibido 4, intenta 1)".
- **Reparto correcto de lo recibido** entre renglones del mismo No. de parte: primero al renglón
  del mismo Job, después a los demás con pendiente, sin pasar lo pendiente de cada uno. El
  estatus de la OC (Parcial/Entregada) se calcula con eso.
- **En pantalla:**
  - cada renglón muestra **"máx. N"**, y la cantidad no puede pasar de ese máximo (avisa si se
    intenta);
  - los renglones ya recibidos completos muestran **"✓ Completo"**, sin campo de captura;
  - si la orden ya se recibió completa, **"Procesar ingreso" queda deshabilitado** y se avisa.

## Probado
- **OC** con 1042243 ×4 y 6ES7 ×2 (Job 652-50) + 6ES7 ×2 (Job 665-00):
  - ingresar 4 de 1042243 → OK; **1 más → rechazado** ("ya se recibió todo");
  - 3 de 6ES7 → **reparto 2 (652-50) + 1 (665-00)**, OC Parcial;
  - **2 más → rechazado** ("solo queda 1"); 1 más → OK y la OC queda **Entregada**;
  - No. de parte que no está en la OC → rechazado.

## Nota
- **Los ingresos excedentes que ya existen** (como la PO-000000023) no se modifican. Si fue un
  error de captura, conviene revisarlos y corregirlos.
