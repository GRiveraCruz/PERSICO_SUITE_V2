# rev119 — Finanzas ▸ Datos fiscales de la empresa

## Qué pasaba
- La razón social, el RFC (PME200101AB1), el domicilio y el teléfono de los PDF estaban
  **escritos directo en el código** y eran incorrectos:
  - orden de compra;
  - recepción;
  - documentos de Finanzas;
  - reporte ejecutivo.

## Qué hay ahora
- **Opción nueva en Finanzas ▸ "Datos fiscales"**, con estos campos:
  - **empresa:** razón social (obligatoria), nombre comercial, **RFC** y régimen fiscal;
  - **domicilio fiscal:** calle, No. exterior e interior, colonia o parque, municipio,
    estado, C.P. y país;
  - **contacto:** teléfono, correo y sitio web.
- **Vista previa** del encabezado mientras se captura.
- **Validaciones:** RFC con formato válido (12 caracteres persona moral, 13 física), C.P. de
  5 dígitos y correo.
- **Queda registrado** quién los actualizó y cuándo.

## Dónde se usan
- **Encabezado de los PDF:** orden de compra (GPO), recepción, documentos de Finanzas (CPP,
  pagos, etc.) y reporte ejecutivo. Se toman al generar cada PDF, así que los nuevos salen
  con los datos correctos sin hacer nada más.
- **El RFC valida los CFDI propios:** facturas a clientes (CPC) y complementos de pago (REP)
  deben estar emitidos con ese RFC.
  - Ya **no es necesario** configurar la variable `RFC_EMPRESA` en Railway. Si existe, se
    siguen aceptando los RFC de ambos lados.
- **Mientras no se capturen,** los PDF muestran solo la razón social genérica, sin el RFC ni
  el domicilio incorrectos.

## Permisos
- Módulo nuevo `fin-datos-fiscales` en la pestaña Finanzas de los permisos.
- Mientras no se le fije un nivel, toma el de **Esquemas Tributarios**.
- Consultar requiere Ver; modificar requiere Crear.

## Probado
- **RFC "ABC"** → rechazado.
- **Datos capturados** (PERSICO AUTOMOTIVE DE MEXICO, S.A. DE C.V., RFC PAM190101AB1,
  C.P. 72730) → el PDF de la orden de compra ya los muestra y el RFC anterior ya no
  aparece.
- **CFDI de otro emisor** → rechazado. **CFDI con el RFC capturado** → aceptado sin aviso.
  Todo sin la variable `RFC_EMPRESA`.
