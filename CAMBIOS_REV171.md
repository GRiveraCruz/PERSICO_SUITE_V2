# rev171 — Sincronizar emisor con FiscalAPI: el correo es obligatorio

## Error
- **Mensaje de FiscalAPI:** `Email: 'Email' no debería estar vacío.` (NotEmptyValidator) al
  **sincronizar el emisor**.
- **Causa:** la actualización de la persona en FiscalAPI **reemplaza la persona completa** y exige
  el **correo**. El ERP solo enviaba RFC, razón social, régimen y CP; el correo y los demás datos
  quedaban vacíos.

## Corrección
- **Antes de actualizar,** el ERP **lee la persona emisora en FiscalAPI** y conserva sus datos
  actuales: correo, teléfono, tipo de usuario, uso de CFDI y CURP. Solo cambia RFC, razón social
  para el CFDI, régimen y CP.
- **Si FiscalAPI no tiene correo,** se usa el de Finanzas ▸ Datos fiscales. Si tampoco hay, se pide
  con un mensaje claro: "captúralo en Datos fiscales (Correo) y vuelve a sincronizar".
- **Si no hay teléfono,** se toma el de Datos fiscales.

## Probado (simulador con la misma regla)
- **Sin correo** → mensaje claro, sin llamar a FiscalAPI.
- **Con correo en Datos fiscales** → persona actualizada: RFC, "PERSICO AUTOMOTIVE DE MEXICO",
  601, CP 72710 y correo.
