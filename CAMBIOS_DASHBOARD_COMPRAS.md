# Cambios — Dashboard de Compras (perfil PURCHASING) (rev24 → rev25)

Pantalla de inicio para usuarios con rol **PURCHASING**, con selector de año y botón
Actualizar.

## Tarjetas de resumen
- **Jobs del año:** cuántos hay y cuántos tienen Target Compras.
- **Target Compras y Adquirido:** sumas solo de los Jobs con target.
- **Ahorro:** porcentaje y monto.
- **Jobs en WIP:** cuántos hay.

## 1. Barras — Target comercial vs Adquirido (Jobs creados en el año)
- **Target comercial:** el *Target Compras* de Configurar Proyecto.
- **Adquirido:** total de órdenes de compra (IPO) del Job en USD, el mismo "Compras" del
  Job Report.
- La barra se pinta en rojo cuando lo adquirido rebasa el target.
- Los Jobs sin Target Compras no se grafican; se indica cuántos son.

## 2. Tendencia — % de ahorro
- **(Target Compras − Adquirido) / Target Compras** por Job, con líneas de MAX, promedio
  y "Sin ahorro 0 %".
- Los puntos rojos son Jobs con sobrecosto.
- Reutiliza el motor de gráficas del Dashboard PM; las barras y la tendencia ahora
  aceptan etiquetas propias.

## 3. Tabla — Jobs en WIP (formato de la imagen de referencia)
Por Job, una columna por tipo de BOM: Electric, Mechanic, Major Items y Manufacturing.
- **OK** (verde): hay requisición de ese tipo. El tooltip muestra renglones y cancelados.
- **Última actualización:** la fecha más reciente entre alta, edición, reasignaciones y
  cambios de cantidad por carga.
- **% Reasignado** (barra morada): promedio por renglón de reasignado / pedido.
- **% Ordenado** (barra ámbar): promedio por renglón de los "Comprado", contando solo la
  parte no reasignada. Así Reasignado + Ordenado nunca pasa de 100 %.
- Los renglones **Cancelados** no cuentan.
- Los renglones "Reasignado" de antes de rev18 (sin cantidad registrada) cuentan como
  100 % reasignados.
- Celda vacía: no hay requisición de ese tipo.

## API
`GET /api/dashboard/purchasing?year=`:
- Acceso: perfil PURCHASING o admin.
- Regresa `grafica` [job_number, status, target_compras, adquirido, ahorro_pct], `wip`
  [job_number, customer, pm, boms{tipo: {renglones, cancelados, ultima_actualizacion,
  pct_reasignado, pct_ordenado} | null}] y `years`.
- Las colecciones se cargan una vez por consulta.

## Cómo se probó (PostgreSQL con los datos de ejemplo migrados + Chromium)
- 40 Jobs 2026, 7 con Target Compras. Ahorro global 13.3 % ($59,079 vs $51,231).
  652-51 aparece con sobrecosto.
- **Tabla WIP:**
  - 537-10 Eléctrico: 4 renglones (E1 Comprado con 5 de 10 reasignados, E2 Comprado,
    E3 Solicitado, E4 Cancelado) → 17 % reasignado y 50 % ordenado, correcto a mano.
  - 559-99: los 4 tipos comprados → 100 %.
  - 612-08: solo Mechanic.
- Sin errores de JavaScript propios del dashboard.
