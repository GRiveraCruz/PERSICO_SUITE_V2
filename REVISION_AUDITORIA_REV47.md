# Revisión de la auditoría técnica rev47 y correcciones (rev48)

Cada hallazgo se verificó contra el código. **Todos los señalados se confirmaron**; ninguno
resultó falso. Se corrigieron en rev48 los que afectan integridad de inventario y reglas de
negocio y que se pueden cerrar sin rediseñar la persistencia. Los de arquitectura quedan con
plan.

## Corregidos en rev48 (con pruebas en PostgreSQL, incluidas pruebas de concurrencia)

| ID | Corrección | Prueba |
|---|---|---|
| **A03** | Surtir: el descuento del almacén de manufactura se prepara y se **confirma después** de guardar la salida como Surtida; si algo falla, se revierte y la salida sigue Pendiente. **Eliminar una salida surtida** regresa las piezas con un movimiento "Cancelación de salida" (queda trazabilidad) | surtida → descontado y Surtida; eliminar → piezas regresan con movimiento compensatorio |
| **A04** | Crear salida: renglones repetidos de la misma pieza **se suman**; validación bajo bloqueo PostgreSQL entre workers | 2 renglones de 2 con 2 disponibles → rechazado; **4 salidas simultáneas → 1** |
| **A05** | Crear Orden de Producción bajo bloqueo PostgreSQL por Job | **4 creaciones simultáneas con la misma pieza → 1** |
| **A06** (parcial) | Ingresar pieza desde la Orden de Producción bajo bloqueo por orden: reintentos o doble clic no sobreingresan | **4 ingresos simultáneos del lote → 1**; almacén correcto |
| **A07** (parcial) | El listado del almacén de manufactura devuelve solo el **último movimiento** y el total; el historial completo se pide al abrir la pieza (`GET /api/manuf-stock/movimientos`) | listado 1 movimiento, detalle completo |
| **A08** (parcial) | Horas consumidas: máximo 60 Jobs por consulta; con más de 3 Jobs, cada año de Work Hours se lee **una sola vez** | — |
| **A12** | No se concluye una orden sin procesos configurados ni con piezas sin proceso; no se marca lote terminado sin al menos un proceso concluido | rechazos y caso válido |
| **A13** | En manufactura `quantity` **solo se deriva** de Normal + Mirror (se ignora el valor directo); cantidades **bloqueadas** si la pieza está en una Orden de Producción | ambos casos |
| **A02** (parcial) | Si la OC se emite pero falla la actualización de la requisición, ya no responde `ok` en silencio: la pantalla muestra una **advertencia** para revisar | — |

**Error encontrado durante la corrección (importante):** `get_session()` devuelve una
sesión **compartida por hilo**. Los helpers `salida_save()` y `apartado_save()` usan y
cierran esa misma sesión, así que, dentro de una transacción abierta, cerraban la
transacción, perdían el descuento preparado y liberaban el bloqueo. Por eso las operaciones
de A03 y A04 usan `_sesion_propia()` (sesión independiente). Las pruebas lo detectaron:
la primera versión dejaba la salida Surtida sin descuento.

## Pendientes (arquitectura), con plan

| ID | Postura | Plan propuesto |
|---|---|---|
| **A01** Stock reescribe la tabla completa | Confirmado, crítico | Upsert/UPDATE por producto con `SELECT … FOR UPDATE`; el `lock` de Python no protege entre workers. Aplica también a Consignación. Es el cambio de mayor impacto en rendimiento. |
| **A02** OC en varios pasos | Confirmado | Llevar GPO + IPO + requisición a una sola transacción con bloqueo de filas de requisición. Requiere pasar gpo/po a escrituras por fila (ligado a A11). |
| **A06** (resto) Ingreso por OC en dos sesiones | Confirmado | Unir ingreso, almacén y BOM en una transacción con llave de idempotencia. |
| **A07** (resto) movimientos en JSONB | Confirmado | Tabla `manuf_movimientos` indexada por clave y fecha; paginación. |
| **A09** carga inicial de módulos ocultos | Confirmado | Carga por módulo al abrirlo (patrón ya usado en Consignación, OP y Piezas de Manufactura). |
| **A10** listados sin paginación | Confirmado | Paginación en PostgreSQL con límite máximo. |
| **A11** reescrituras de GPO/IPO/WH | Confirmado | Escrituras por fila; tabla de vínculo OC↔requisición indexada por folio (hoy cancelar una OC recorre todas las requisiciones). |
| **A14** varios wrappers de `switchMenu` | Confirmado | Un solo router de módulos. |
| **A15** pool de conexiones | Confirmado | Ajustar `pool_size`/`max_overflow` al límite de Railway (2 workers × 15 + conexiones directas); medir. |
| Regla de compra: líneas sin `req_item_id` no se validan contra Stock | Confirmado, **por diseño actual** | Las OC manuales (servicios, consumibles) no pasan por la validación. Si la regla "no comprar lo que hay en Stock" debe aplicar a toda OC, se puede extender con una excepción autorizada. **Decisión de negocio.** |

## Verificación
- **Pruebas nuevas en PostgreSQL:** 13, incluidas 4 de concurrencia con hilos simultáneos.
- **Regresión:** suites de piezas de manufactura, órdenes de producción, OC desde
  requisición, variantes Normal/Mirror, planos, estatus de requisición y eliminación de
  reasignaciones; todas OK.
