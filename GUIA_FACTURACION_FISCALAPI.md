# Guía de puesta en marcha — Facturación electrónica con FiscalAPI

## 1. Variables del servidor (Railway ▸ servicio de la Suite ▸ Variables)
| Variable | Valor |
|---|---|
| `FISCALAPI_URL` | `https://test.fiscalapi.com` (pruebas) — después `https://live.fiscalapi.com` (producción) |
| `FISCALAPI_API_KEY` | API key de FiscalAPI (panel ▸ Developers ▸ Api Keys) |
| `FISCALAPI_TENANT` | Tenant key de FiscalAPI |

**Emisor (elige una forma):**
- **A) CSD por variables** (el más directo):
  - `FISCALAPI_CSD_CER_B64` = contenido del archivo **.cer** en Base64;
  - `FISCALAPI_CSD_KEY_B64` = contenido del archivo **.key** en Base64;
  - `FISCALAPI_CSD_PASSWORD` = contraseña de la llave privada.
  - **Para obtener el Base64:**
    - **Windows (PowerShell):** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\archivo.cer"))`
      (lo mismo para el .key);
    - **Mac/Linux:** `base64 -w0 archivo.cer`.
- **B) Emisor por referencia:** `FISCALAPI_ISSUER_ID` = id de la persona emisora en FiscalAPI,
  con el CSD ya cargado en su panel.

⚠️ **No compartas estas llaves por correo ni chat.** Si alguna se expone, revócala en el panel de
FiscalAPI y genera otra. **Usa primero las llaves y el CSD de pruebas.**

## 2. En el ERP
1. **Finanzas ▸ Datos fiscales:** RFC, razón social, **régimen fiscal** (p. ej. 601) y **CP**
   fiscal.
2. **Finanzas ▸ Facturación electrónica ▸ Configuración:**
   - **"Probar conexión"**;
   - series, CP de expedición y **clave de producto/servicio por defecto** (catálogo c_ClaveProdServ
     del SAT);
   - **domicilio del emisor para Comercio Exterior** con claves del SAT (colonia, municipio,
     estado, CP).
3. **Clientes fiscales:** da de alta cada cliente con el **mismo nombre que en sus CPO**.
   - Para clientes del extranjero: Sí → país (USA), Tax ID y domicilio.

## 3. Timbrar
- **Facturas:** Órdenes de cobro ▸ **Facturar ▸ Timbrar CFDI** → revisar los conceptos →
  **Timbrar**.
  - El PDF se abre al terminar, y la factura queda en Cuentas por Cobrar.
- **Complementos de pago, notas de crédito, cancelación y estatus:** Facturación electrónica ▸
  CFDI emitidos.

## 4. Pasar a producción
1. Cambiar `FISCALAPI_URL` a `https://live.fiscalapi.com`, y las llaves y el CSD por los de
   producción.
2. Verificar que el encabezado del módulo diga **PRODUCCIÓN**.
3. Timbrar una primera factura real de bajo monto y revisarla en el portal del SAT.
