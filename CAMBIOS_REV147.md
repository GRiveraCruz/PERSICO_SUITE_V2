# rev147 — Control de Costo ▸ Centros de costo

## Qué es
- **Catálogo de centros de costo** para horas, compras, reasignaciones y activos que **no
  corresponden a un proyecto**: áreas administrativas, proyectos internos, inversiones e
  infraestructura, y activos, herramientas y licencias.

## Catálogo (Control de Costo ▸ Centros de costo)
- **Cada centro de costo tiene:**
  - **ID** (2–25 caracteres, ej. `CC-ADM-01`). No puede tener formato de Job ni repetirse.
  - **Nombre**.
  - **Tipo:** Área administrativa · Proyecto interno · Inversión e infraestructura · Activos,
    herramientas y licencias · Otro.
  - Responsable, **presupuesto anual (USD)**, descripción y **activo/inactivo**.
- **Desactivar o eliminar:** desactivado deja de aparecer en las listas de selección. Solo se
  puede **eliminar** si no tiene movimientos ni personal; si los tiene, se desactiva.
- **Tabla del año:** compras, reasignaciones, horas, mano de obra, **total USD** y **% del
  presupuesto** (en rojo si se pasa). Arriba, tarjetas con los totales.
- **Detalle (clic en el renglón):**
  - **Compras:** renglones de Purchase Orders con destino = ID, en USD;
  - **Reasignaciones:** renglones de RA con Job = ID;
  - **Horas:**
    - **directas** reportadas al centro de costo en el kiosco;
    - **ADMIN del personal asignado** a ese centro de costo;
    - costo con **Hourly Rates** del año, por trabajador;
  - **Personal asignado.**

## Usos
1. **Órdenes de compra:** en Generar OC, el selector de Job (Job único y por ítem) incluye el grupo
   **"Centros de costo"**. La OC y sus renglones en Purchase Orders quedan con destino = ID.
2. **Áreas administrativas:** en **Control de Personal ▸ Detalle**, campo nuevo **"Centro de
   costo"** para cada trabajador.
3. **Horas de ADMIN del personal sin proyecto:** se acumulan en el centro de costo asignado al
   trabajador.
4. **Proyectos internos, inversiones e infraestructura, activos y licencias:** se usan como destino
   de compras, de reasignaciones (el selector de Job de Reasignación de Stock también los incluye) y
   de horas en el kiosco (v2.31).

## Datos y permisos
- **Tabla** `centros_costo` (en modo JSON: `CENTROS_COSTO.json`). El kiosco la lee para ofrecerlos
  al repartir horas.
- **Personal:** campo `centro_costo`.
- **Permisos:** módulo `centros-costo` (pestaña Control de Costo). Mientras no se le fije un nivel,
  toma el de Reporte por Job.
- **API:**
  - `GET/POST /api/centros-costo`
  - `PUT/DELETE /api/centros-costo/<id>`
  - `GET /api/centros-costo/<id>/reporte?anio=`
  - `GET /api/centros-costo/resumen?anio=`

## Probado
- **Altas y validaciones:**
  - alta de CC-ADM-01 (presupuesto $50,000) y CC-INV-24;
  - ID con formato de Job → rechazado; duplicado → rechazado.
- **Movimientos:**
  - **OC a CC-ADM-01** (2 laptops × $1,200) → compras $2,400;
  - **reasignación** de una licencia ($500) → reasignaciones $500;
  - total **$2,900 (5.8 % del presupuesto)**.
- **Trabajador asignado** a CC-ADM-01 → aparece en "Personal asignado".
- **Eliminar:**
  - con movimientos → bloqueado ("desactívalo");
  - sin movimientos → eliminado.
- **En pantalla:** módulo, detalle, y el grupo "Centros de costo" en el selector de la OC.
