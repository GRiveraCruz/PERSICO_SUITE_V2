# rev111 — Facturación (CPC): el Job ya no es obligatorio

- En **Finanzas ▸ CPC**, al registrar o editar una factura, el campo **Job** es
  **opcional**: la etiqueta dice "Job (opcional)".
- Solo son obligatorios **Cliente** y **Fecha de factura**, tanto en pantalla como en el
  servidor.
- Las facturas sin Job se muestran con "—" en la columna Job. Se pueden buscar, editar,
  cobrar y descargar en PDF igual que las demás.
- Si la factura se liga a una CPO, el Job se sigue llenando solo con el de la CPO.
- **Probado:**
  - alta sin Job → guardada;
  - alta sin Cliente → rechazada ("Completa Cliente y Fecha de Factura");
  - edición y PDF de una factura sin Job → correctos.
