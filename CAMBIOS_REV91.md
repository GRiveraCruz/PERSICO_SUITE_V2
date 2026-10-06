# rev91 — Las reasignaciones generan apartados (opción 1)

## Antes
- **Apartados** solo se generaban al recibir material de una orden de compra.
- **Salida de almacén** solo ofrecía lo disponible por ingresos de compra.
- **Reasignación:** el material reasignado de Stock (o de Consignación) a un Job le cargaba
  el costo, pero nunca aparecía en Apartados ni se le podía dar salida.

## Ahora
- **Toda reasignación genera su apartado:** al crear una orden RA (manual o desde
  Requisición de Compra) o una CRA de Consignación, cada renglón suma su cantidad al
  apartado del Job.
  - En el detalle del apartado se ve "N reasignación(es)" junto a los ingresos, con los
    folios; las de consignación se marcan.
- **Salida de almacén:** lo disponible es **ingresos de compra + material reasignado −
  salidas** (pendientes y surtidas). El material reasignado se surte igual que el comprado
  y al surtir descuenta su apartado.
- **Eliminar una orden de reasignación** (Stock o Consignación):
  - quita su apartado;
  - **se bloquea** si ya se le dio salida, o hay salidas pendientes, a parte de ese
    material. El mensaje indica qué parte y cuánto queda disponible.
- **Costo, sin cambios:** lo sigue cargando la reasignación. Ni los apartados ni las
  salidas afectan el costo del Job, así que no se duplica.

## Reasignaciones existentes
- **Al arrancar, la Suite refleja en Apartados todas las reasignaciones anteriores** (Stock
  y Consignación) y las marca como **"históricas"**.
- **Revisión en Apartados:** aparece el aviso "⚠ N reasignación(es) anterior(es) a
  revisar", con orden, fecha, Job, No. de parte, cantidad y disponible del Job. Por cada
  renglón, el almacén indica:
  - **Sigue en almacén** → queda como apartado disponible y sale de la lista;
  - **Ya se entregó** → se captura cuántas piezas ya se habían entregado sin salida
    registrada y se dan de baja del apartado y de lo disponible. Queda registrado quién y
    cuándo.
- **Sincronización idempotente:** cada renglón queda marcado cuando ya se reflejó, así que
  reiniciar no duplica nada. Si alguna vez fallara el paso del apartado, se repara solo en
  el siguiente arranque.

## API
- `GET /api/apartados/reasignaciones-historicas`: reasignaciones anteriores pendientes de
  revisar.
- `POST /api/apartados/reasignaciones-historicas`: `{fuente, order_number, idx,
  accion: 'en_almacen'|'entregado', cantidad?}`.
- `/api/disponibilidad` incluye el material reasignado.

## Archivos
- `app.py`:
  - nuevas: `_apt_sumar()`, `_apt_restar()`, `_sincronizar_apartados_reasignaciones()`,
    `_disponibilidad_mapas()`, `_reasig_validar_eliminar()`, `_reasig_quitar_apartados()`
    y los endpoints de revisión;
  - cambian: `api_disponibilidad()`, la creación y eliminación de órdenes RA, la
    reasignación desde Requisición y la sincronización al arrancar.
- `consignacion.py`: `HOOKS` para que sus reasignaciones también generen y quiten
  apartados.
- `static/app.js` / `index.html`: aviso de revisión en Apartados y reasignaciones en el
  detalle.

## Cómo se probó (PostgreSQL local)
- **Una RA anterior** (5 piezas, 652-50): al arrancar → apartado de 5, disponible 5,
  listada como histórica.
- **Una RA nueva** desde Stock (4 piezas) → apartado y disponible de 4, no listada como
  histórica.
- **Salida de 3** → disponible 1. Intentar eliminar la RA → bloqueado con mensaje. Surtir
  → apartado de 1.
- **Revisión histórica:**
  - "Ya se entregó" 3 → apartado y disponible de 2;
  - "Sigue en almacén" → sale de la lista.
- **RA sin salidas:** eliminar → se quita su apartado.
- **Consignación:** CRA de 4 piezas → apartado (marcado de consignación) y disponible de
  4. Al eliminarla, se quita el apartado.
