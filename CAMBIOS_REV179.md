# rev179 — Versiones del BOM de Manufactura y permisos por nivel en Presupuesto

## 1. BOM de Manufactura: versiones y cambios (igual que los demás BOM)
- **Qué faltaba:**
  - el servidor ya registraba las versiones de cada carga del BOM de Manufactura;
  - **la pantalla no las pedía ni las mostraba**, así que no se veían los componentes eliminados
    ni las variaciones.
- **Ahora, en la pestaña Manufactura:**
  - **panel "Cambios de la carga"** con selector de versión (v1, v2…), archivo, usuario y fecha,
    con chips **Nuevo · Modificado · Para revisión · Diferencia · Ya no viene · Reaparece**,
    filtro "solo renglones con cambios" y lista de cambios;
  - en cada pieza, **chips del cambio** bajo el DETL # y renglón tintado;
  - las piezas que **ya no vienen** en el BOM quedan marcadas "Ya no viene (vN)". No se borran:
    se decide qué hacer con ellas;
  - **baja de cantidad** (o pieza ya comprada) → caja "La nueva carga pide N (actual M)", con
    **Aceptar / Descartar**. Al aceptar se ajustan **Qty y Qty mirror** según la lista;
  - el contador "⚠ N por revisar" también aplica a Manufactura.
- **Diferencias propias de Manufactura** (se informan, no se sobrescriben): **descripción,
  material, acabado y REV** del plano.

## 2. Configurar Proyecto ▸ Presupuesto: permisos por nivel
| Nivel | Fechas del Job (inicio, Run Off interno/cliente, envío…) | Milestones de pago | Presupuestos y horas |
|---|---|---|---|
| **Ver** | solo lectura | solo lectura (sin "+ Milestone") | solo lectura (costo estimado y % de ahorro ocultos, como en la rev154/155) |
| **Crear** | **editables** | **editables** | **solo lectura** (costo estimado, % de ahorro, horas, costo promedio, markup) |
| **Control total** | editables | editables | **editables** |

- **El servidor lo aplica:**
  - con **Crear**, al guardar se conservan los presupuestos y horas guardados aunque la petición
    traiga otros valores;
  - con **Ver** no se puede guardar.
- **Con Crear,** el botón "↻ Actualizar costos promedio" no aparece.

## Probado (PostgreSQL)
- **Manufactura v1** (3 piezas) → **v2:**
  - D0013 REV V000→V001 (**diferencia**) y cantidad 2→1 (**para revisión**);
  - D2037 material ALUM ANGLE→STL-ANGLE (**diferencia**);
  - D2038 **nueva**;
  - D0014 **ya no viene** (marcada v2).
  - Aceptar la revisión → Qty normal 1.
  - En pantalla: panel de versiones, 5 chips y "Ya no viene".
- **Usuario con Crear:** cambió fecha de inicio, Run Off y milestones (**guardados**); intentó
  cambiar costo y horas (**se conservaron** 1000 y 10).
  - En pantalla: fechas editables, horas en solo lectura, "+ Milestone" visible.
- **Usuario con Ver:** guardar → 403.
