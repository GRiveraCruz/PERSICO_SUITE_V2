# rev169 — Facturación electrónica: una orden de cobro no se puede timbrar dos veces

## Problema
- **Una orden de cobro se podía mandar a timbrar varias veces.**
- **Desde la rev165,** un CFDI del ambiente de pruebas no marca la orden como Facturada (para no
  afectar los datos reales). La orden seguía "Por facturar" y aceptaba otro timbrado.
- **En producción** la orden sí quedaba Facturada, pero no había una regla explícita de "un solo
  CFDI vigente por orden".

## Corrección
- **Regla en el servidor:** una orden solo puede tener **un CFDI de ingreso vigente** (o en
  cancelación), sea de **pruebas o de producción**. El segundo intento se rechaza con: "La orden …
  ya tiene el CFDI F1 (UUID) vigente de PRUEBA. Para volver a timbrarla, cancela primero ese
  CFDI".
- **Un solo timbrado a la vez por orden,** también entre varios procesos del servidor: la orden
  queda marcada "timbrando" (con usuario y hora) mientras dura la petición, y la marca se libera
  al terminar.
- **Al cancelar el CFDI de ingreso** (ante el SAT o en pruebas):
  - la orden **vuelve a "Por facturar"**;
  - se quitan su CFDI y su CPC vinculados;
  - queda registrado en su historial, y entonces sí se puede volver a timbrar (por ejemplo, para
    la sustitución con motivo 01).
- **En pantalla:**
  - las órdenes con CFDI de prueba muestran la etiqueta **CFDI PRUEBA**;
  - "Timbrar CFDI" avisa y no abre si la orden ya tiene un CFDI vigente.

## Probado
- **1er timbrado** → OK. **2do sobre la misma orden** → rechazado, con el UUID del vigente.
- **Cancelar el CFDI** → la orden queda "Por facturar" con la nota "CFDI cancelado". Volver a
  timbrar → OK.
- **Tres peticiones simultáneas sobre la misma orden** → solo **una** se timbró.
