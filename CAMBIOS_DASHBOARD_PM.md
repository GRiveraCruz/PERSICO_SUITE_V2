# Cambios — Dashboard de Project Manager (rev11 → rev12)

## Liga PM ↔ usuario
El campo "PM" de los Jobs es texto libre (ej. "Luz Munoz - Persico"). Cada usuario
guarda ahora una lista `pm_names` con los nombres de PM que le corresponden.
- **Dónde se configura:** Config → Administrador → seleccionar al usuario. Si su rol es
  PROJECT MANAGER aparece el recuadro "PM en los Jobs ligado a este usuario", con
  los nombres de PM que existen hoy en los Jobs. Se guarda al marcar la casilla.
- Se puede marcar más de uno (mismo PM escrito distinto en algunos Jobs).
- La comparación ignora mayúsculas, acentos y espacios repetidos.
- **Ningún Job se modifica.**
- El botón "Ver su dashboard" le permite al admin ver el dashboard de ese usuario.

## Dashboard (pantalla de inicio del perfil PROJECT MANAGER)
- **Jobs incluidos:** los del PM ligado con estatus **Open** o **WIP**.
- **Por Job:** cliente, descripción, estatus, Run Off con Cliente, fecha de envío y
  resultado operativo (monto, % y base).
- **Fechas:** Run Off Cliente y Fecha de envío salen de Configurar Proyecto. Si el Job no
  tiene fecha de envío ahí, se usa el `ship_date` del Job; el tooltip indica la fuente.
- **⚠ Advertencia** cuando la fecha de envío es anterior a hoy (el filtro ya garantiza
  que el Job está Open/WIP).
- **Resumen:** Jobs activos, cuántos tienen envío vencido y resultado operativo total.
- **Resultado operativo:** se calcula en el momento en que se abre el dashboard (o con el
  botón Actualizar), con la misma fórmula que la pestaña Operativo del Job Report:
  presupuesto disponible de Configurar Proyecto (o revenue si no hay)
  − mano de obra − compras − reasignaciones (Stock + Consignación) + recuperaciones.
  Las colecciones se cargan una vez por año de Job, no una vez por Job.
- **Usuario PM sin liga:** ve un aviso para que el administrador la configure.

## Seguridad
- `GET /api/dashboard/project-manager`: solo perfil PROJECT MANAGER o admin.
- `?user=` (ver el de otro usuario) solo funciona para admin; para los demás se ignora.

## Archivos
- `app.py`: `api_dashboard_project_manager()`, `_norm_pm()`, campo `pm_names` en
  `PUT /api/admin/users/<u>`, lista `pm_names` en `GET /api/admin/users`.
- `static/app.js`: `loadPMDashboard()`, `renderPMDashboard()`, `adminSetPmNames()`,
  `adminPreviewPM()`, recuadro en el panel de usuario, `initHomeDashboard()`.

## Cómo se probó (Chromium + datos reales de data_seed)
- La liga se hizo desde la UI de Administrador. El usuario PM vio 13 Jobs: los 14 de
  "Luz Munoz - Persico" menos uno puesto en Closed. Uno en WIP sí aparece.
- El resultado operativo de los 13 coincide con el Job Report. Ej. 652-50:
  168,000 − 32,272.82 − 79,065.98 = 56,661.20. En 612-08 se usó el presupuesto
  disponible de Configurar Proyecto (50,000) en vez del revenue.
- El ⚠ aparece en los envíos vencidos y no en el de 2027.
- Un PM sin liga ve el aviso. Un no-admin que manda `?user=` recibe su propio dashboard.

## Observación, no corregida
El Job Report individual (pestaña Operativo) **no** resta viáticos / gastos de viaje /
envíos, pero el Multi-Job Report sí los resta. El dashboard sigue al Job Report
individual. Si el criterio correcto es restarlos, hay que cambiar ambos.

---
# rev14 — Target de cada Job en el Dashboard PM

- **Columna nueva "Internal Target":** el presupuesto disponible de Configurar Proyecto,
  el mismo valor que el Job Report llama "Internal Target" y contra el que se calcula el
  resultado operativo.
- Debajo aparecen **Target Compras** y **Target M.O.** cuando el proyecto los tiene configurados.
- **Job sin Configurar Proyecto:** muestra "Sin config." en ámbar y el revenue que se
  está usando en su lugar, para que no se confunda con un target real.
- **Tarjeta nueva "Internal Target"** con la suma. Si hay Jobs sin configurar, indica
  cuántos.
- El % del resultado operativo ahora dice "vs target" y se oculta cuando el target es
  casi cero y el porcentaje no tiene sentido (ej. −100,035%).
- `GET /api/dashboard/project-manager` regresa `internal_target`, `target_compras` y
  `target_mo` por Job (`null` si no están configurados).

Probado en Chromium: 612-08 muestra $50,000 con Compras $30,000 · M.O. $12,000;
652-50 muestra $168,000 (configurado en data_seed); los 11 Jobs sin configuración
muestran "Sin config.".

---
# rev24 — Gráficas en el Dashboard PM (según PROJECT_MANAGER_GRAPHICS.xlsx)

Tres gráficas nuevas entre las tarjetas de resumen y la tabla, dibujadas en SVG propio
(sin librerías, igual que el dashboard de Dirección):

## 1. Pastel — Estatus de mis Jobs
- **Todos** los Jobs ligados al PM, de cualquier año y estatus, con porcentaje y cantidad
  de Open, WIP, Cerrado y Cancelado.
- Equivalencias de estatus: Done/Closed/Cerrado → Cerrado; Cancelled/Cancelado → Cancelado.
  Cualquier otro valor aparece como "Otro".

## 2. Barras — Target vs Cost
- Jobs del PM **creados en el año**, con selector de año en la gráfica.
- **Target:** Internal Target de Configurar Proyecto, o el revenue si el Job no está
  configurado; en ese caso la barra se ve clara.
- **Cost:** mano de obra + compras + servicios + reasignaciones − recuperaciones, lo mismo
  que se resta en el resultado operativo (Target − Cost = resultado operativo).
- El costo se pinta en rojo cuando rebasa el target.

## 3. Tendencia del margen de ganancia
- Mismos Jobs del año. Fórmula del archivo: **(Target − Cost) / Cost**.
- Líneas de referencia: **MAX** (el margen más alto), **MIN 20 %** (del archivo) y
  **promedio**. Los puntos rojos están debajo del 20 %.
- **Jobs que no se grafican:** los que no tienen target (sin Configurar Proyecto y revenue
  0) o no tienen costo. La fórmula daría −100 % o no se podría calcular; se indica cuántos son.
- **Escala limitada a 200 %:** con esta fórmula, un Job que casi no tiene costo registrado
  da márgenes enormes (ej. 612-08: 50,000 / 311 → 15,949 %) y aplasta al resto. Los que
  rebasan 200 % se marcan con ▲ en el borde superior con su valor real. Si MAX y promedio
  quedan fuera de escala, se muestran juntos en una sola etiqueta.

## API
`GET /api/dashboard/project-manager` agrega:
- `estatus`, `total_jobs`, `year`, `years`.
- `grafica`: `[{job_number, status, target, cost, target_configurado, margen}]`.
- Acepta `?year=`.

## Cómo se probó (Chromium, 14 Jobs de "Luz Munoz - Persico" en data_seed)
- **Pastel:** 10 Open, 1 WIP, 2 Cerrado y 1 Cancelado (71 / 7 / 14 / 7 %).
- **Barras:** 14 Jobs de 2026. Target y costo coinciden con la tabla (Target − Cost =
  resultado operativo).
- **Tendencia:** 4 Jobs sin target excluidos y 4 marcados fuera de escala. 674-00 aparece
  debajo del mínimo (target $10 vs costo $9,977).
- Sin errores de JavaScript propios del dashboard.

---
# rev29 — Ajustes al Dashboard PM

- **Pastel más compacto:** columna fija de 300 px, con el círculo de 150 px y la leyenda
  debajo. La gráfica de barras usa el resto del ancho (en una pantalla de 1900 px pasó de
  compartir la mitad a unos 1,530 px).
- **Tendencia del margen solo con Jobs cerrados:** estatus Done, Closed o Cerrado.
  - El título dice "Jobs cerrados".
  - La nota indica cuántos cerrados no se grafican por no tener target o costo.
  - Las barras Target vs Cost siguen mostrando todos los Jobs del año.

Probado en Chromium a 1900 px: pastel 300 px, barras 1,530 px; la tendencia muestra
solo 652-51 y 652-53 (los dos Jobs "Done" de la prueba). Sin errores de JavaScript.
