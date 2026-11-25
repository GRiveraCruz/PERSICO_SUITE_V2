# rev165 — Emisor de prueba del SAT y lectura de la Constancia de Situación Fiscal

## 1. Emisor de prueba del SAT (para avanzar mientras llega el CSD de Persico)
- **Facturación electrónica ▸ Configuración ▸ "Usar emisor de prueba del SAT".**
  - Solo aparece y funciona en el **ambiente de PRUEBAS**; en producción se ignora.
- **Usa los certificados públicos de prueba del SAT** que vienen en el SDK oficial de FiscalAPI
  (`cfdi_pruebas_sat.py`), con las mismas combinaciones de los ejemplos oficiales:
  - **facturas nacionales, REP y notas de crédito:** emisor **KARLA FUENTE NOLASCO**
    (FUNK671228PH6, 621) → receptor **ESCUELA KEMPER URGATE** (EKU9003173C9, 601, CP 42501);
  - **exportación con Comercio Exterior:** emisor **ESCUELA KEMPER URGATE** → el cliente
    extranjero real (XEXX010101000, país y Tax ID), con el domicilio de emisor del ejemplo
    oficial (CP 26015).
- **No necesita** los Datos fiscales de Persico ni su CSD. No toca la persona emisora de FiscalAPI.
- **El encabezado del módulo** muestra "EMISOR DE PRUEBA SAT", y la ventana de timbrado lo avisa.
- **Cancelación de CFDI emitidos por valores** (emisor de prueba o CSD por variables): ahora se
  cancela **por valores** (UUID, RFC y sellos), como pide FiscalAPI. La bitácora no guarda los
  sellos.

## 2. CFDI del ambiente de PRUEBAS: no afectan los datos reales
- **Un CFDI timbrado en pruebas** (con cualquier emisor):
  - **no se registra en Cuentas por Cobrar;**
  - **no marca la orden como Facturada:** queda "Por facturar", con una nota en su historial;
  - aparece en CFDI emitidos con la etiqueta **PRUEBA**.
- **REP y notas de crédito de prueba** calculan el saldo con los propios CFDI relacionados.
- **En PRODUCCIÓN** todo sigue igual: alta en CPC y orden Facturada.

## 3. Lectura de la Constancia de Situación Fiscal
- **Finanzas ▸ Datos fiscales ▸ "📄 Leer Constancia de Situación Fiscal (PDF)":** lee el PDF del
  SAT y llena:
  - **RFC**, **razón social para el CFDI** (denominación exacta, sin régimen de capital) y **régimen
    de capital**;
  - **régimen fiscal** con su clave (p. ej. "601 - General de Ley Personas Morales");
  - **código postal** y domicilio (calle, números, colonia, municipio, estado).
- **Muestra lo leído** y lo que no encontró. Se revisa y se guarda con **Guardar**.
- **Campos nuevos en Datos fiscales:** "Razón social para el CFDI" y "Régimen de capital".
  - La **razón social de siempre** (la de los PDF de OC y otros documentos) **no cambia**.
  - El CFDI y "Sincronizar emisor con FiscalAPI" usan la razón social del SAT.
- **No funciona con PDF escaneados como imagen,** porque no tienen texto. En ese caso se pide
  descargar la Constancia original del portal del SAT.

## Probado
- **Constancia de prueba (PDF):**
  - RFC, "PERSICO AUTOMOTIVE DE MEXICO", "SOCIEDAD ANONIMA DE CAPITAL VARIABLE";
  - régimen 601, CP 72710, calle, número exterior e interior, colonia, municipio y estado leídos;
  - archivo no PDF → rechazado.
- **Con el emisor de prueba:**
  - **ingreso PPD:** emisor FUNK671228PH6 → receptor EKU9003173C9, CP 42501. **Sin CPC**, y la
    orden sigue "Por facturar" con la nota "CFDI de prueba".
  - **REP de $10,000** → parcialidad 1. **Nota de crédito de $500 + IVA** → OK.
  - **REP que excede el saldo** ($24,220) → rechazado.
  - **Cancelación por valores** → Cancelada; la bitácora no contiene los sellos.
  - **Exportación con Comercio Exterior** → emisor EKU9003173C9, receptor extranjero, CCE con el
    domicilio del ejemplo oficial.
