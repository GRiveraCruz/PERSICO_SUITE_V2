# rev137 — Jobs: un Job desaparecido se puede encontrar y restaurar; borrar ya no es irreversible

## Causa probable (Job 685-01)
- **Lo más probable es que el Job se haya eliminado** desde su ficha (botón Eliminar). La ruta de
  borrado:
  - **no revisaba permisos**: cualquier usuario con sesión podía borrar un Job;
  - **no revisaba si el Job estaba en uso** (PT, Configurar Proyecto, CPO, POs);
  - **no dejaba registro** de quién lo borró;
  - **borraba la carpeta con sus archivos.**
- Por eso **sigue apareciendo en la PT y en la configuración del proyecto**, que no se actualizan al
  borrar.
- **Otra causa posible:** el Job tiene su archivo en disco pero no su renglón en la base de datos
  (por ejemplo, después de restaurar un respaldo). Esa también queda cubierta.

## Buscar / restaurar un Job (Config ▸ Administrador)
- **Sección nueva "🩺 Buscar / restaurar Job":** se escribe el número (ej. 685-01) y muestra:
  - si **aparece en el Registro de Jobs**, si tiene **renglón en la base** y si tiene **carpeta**;
  - si está en la **papelera**, **cuándo se eliminó y quién lo hizo** (para los eliminados desde
    esta versión);
  - **dónde se sigue usando:** PT/SV, Configurar Proyecto, CPO y renglones de Purchase Orders.
- **Botón "♻ Restaurar"** (solo administrador):
  1. si está en la **papelera** → vuelve con **todos sus datos originales** y su carpeta de
     archivos;
  2. si quedó su `job_info.json` en disco → se restaura desde ahí;
  3. si no hay respaldo (borrado antes de esta versión) → **se reconstruye** con lo que hay en sus
     referencias:
     - **cliente**, **PM**, **revenue** (suma de sus CPO), **PO del cliente** y estatus WIP;
     - una nota que indica que fue reconstruido.
     - Después se completan la descripción y el grupo de producto.

## Eliminar un Job (protecciones nuevas)
- **Permisos:** requiere Control total en Jobs (o ser administrador).
- **Si el Job está en uso** (PT, Configurar Proyecto, CPO o POs), **no se elimina** y se indica
  dónde.
  - Solo el **administrador** puede forzarlo, con confirmación.
- **Al eliminar:**
  - los datos del Job van a la **papelera**, con quién y cuándo;
  - su **carpeta de archivos se mueve** a `JOBs/_eliminados/` en lugar de borrarse.
  - Todo se puede restaurar.

## Sincronización automática
- **Si un Job tiene su `job_info.json` en disco pero no está en la base de datos,** al cargar el
  Registro de Jobs se vuelve a mostrar y se sincroniza a la base.

## Probado
- **Eliminar 665-00** (en una PT, en Configurar Proyecto y en una CPO) → **bloqueado** con el
  detalle. Forzado por el admin → eliminado, en la papelera y con su carpeta en `_eliminados`.
- **Diagnóstico:** no visible, "eliminado por guillermo" y sus referencias. **Restaurar** → vuelve
  con su cliente y su carpeta.
- **652-50 borrado "a la antigua"** (sin papelera ni carpeta) → diagnóstico con PT (1), Configurar
  Proyecto (1) y CPO (3). **Restaurar** → reconstruido con cliente, PM, revenue de sus CPO y
  estatus WIP.
- **Restaurar un Job que ya está en el registro** → rechazado.
