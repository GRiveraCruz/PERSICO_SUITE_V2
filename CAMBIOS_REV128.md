# rev128 — Costo de mano de obra protegido · Finanzas ▸ Cash Flow Forecast

## 1. Costo de mano de obra: tablas protegidas
- **Las tablas "Por área" y "Por trabajador" ahora requieren dos cosas:**
  1. **Permiso** del usuario, que se configura en **Config ▸ Administrador**: casilla nueva
     **"🔒 Puede ver las tablas de Costo de mano de obra"**. Los administradores siempre
     pueden.
  2. **Segunda verificación con su contraseña** al abrirlas.
- **Duración:** se muestran por **15 minutos** y se ocultan solas. También hay un enlace
  "Ocultar ahora".
- **Intentos fallidos:** con 5 contraseñas incorrectas se bloquea 5 minutos, y queda en el
  log del servidor.
- **Sin permiso:** se explica que hay que pedirlo al administrador.
- **Las tarjetas con los totales del mes** se siguen viendo; las tablas son lo protegido.
- **El servidor no envía las tablas** si no se cumplen las dos condiciones: no basta con
  ocultarlas en pantalla.
- **La tabla por trabajador** además sigue requiriendo el permiso de **ver salarios**.
- **El CSV** solo se puede descargar con las tablas abiertas.

## 2. Finanzas ▸ Cash Flow Forecast (apartado nuevo)
- **Proyección semanal en USD** (13 o 26 semanas):
  - **Saldo inicial:** saldos bancarios por cuenta, en MXN o USD, capturados en
    "⚙ Saldos y parámetros", con su fecha;
  - **Entradas:** **cobros esperados** del Income Forecast (milestones, órdenes de cobro y
    facturas por cobrar);
  - **Salidas — proveedores:** **CPP por pagar** en su **fecha programada** o, si no tiene,
    en su **vencimiento**;
  - **Salidas — nómina en jornada normal** (de Costo de mano de obra), con su calendario
    real de pago:
    - **neto a trabajadores:** quincenal (día 15 y fin de mes), semanal (viernes) o
      mensual, según la configuración;
    - **ISR retenido, IMSS e ISN:** día 17 del mes siguiente;
    - **RCV + INFONAVIT:** bimestral, el 17 de ene/mar/may/jul/sep/nov (incluye la parte
      obrera de cesantía y vejez);
    - **aguinaldo:** 15 días de salario, el 20 de diciembre.
  - **Flujo neto** de la semana y **saldo final**.
- **Tarjetas:** saldo inicial, entradas, salidas, saldo final, **saldo más bajo** (y en qué
  semana) y **semanas bajo el efectivo mínimo** (configurable, por defecto USD 30,000).
- **Gráfica del saldo proyectado** con la línea del mínimo.
- **Tabla semanal:**
  - una columna **"Vencido"**, que agrupa lo que ya debió cobrarse o pagarse y se toma como
    si ocurriera esta semana;
  - **al hacer clic en una cifra se ve su detalle**: qué cobros, CPP o pagos de nómina la
    forman.
- **Avisos:** cobros o CPP sin fecha, CPP en MXN sin tipo de cambio y el tipo de cambio
  usado.
- **Tipo de cambio:** el del día o, si no hay, el último disponible (se indica la fecha).
- **CSV.**
- **Permisos:** módulo `fin-cashflow`. Mientras no se le fije un nivel, toma el de **CPP**.
  Editar saldos y parámetros requiere Crear.

## Probado
- **Costo de mano de obra:**
  - sin desbloquear → solo totales;
  - contraseña incorrecta → "1 de 5"; correcta → tablas por 15 min;
  - usuario sin permiso → rechazado; con el permiso dado en Administrador → ve "Por
    área", pero no "Por trabajador" (no tiene permiso de salarios).
- **Cash flow:**
  - saldo inicial MXN 900,000 + USD 25,000 → USD 76,754;
  - cobros de $80,400 (esta semana) y $187,600 (S52);
  - CPP vencida de $5,000 y otra en la S47;
  - nómina quincenal de $1,643 los días 15 y fin de mes; ISR, IMSS e ISN el 17;
    RCV + INFONAVIT el 17-nov y el 17-ene; aguinaldo en la semana del 20-dic;
  - saldo final $317,674 y mínimo $71,754.
