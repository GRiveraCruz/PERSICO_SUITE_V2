# rev73 — Dashboard de Compras: tarjetas de Jobs WIP

## Qué cambia
- En el **Dashboard de Compras (PURCHASING)**, la tabla de requisiciones de los Jobs WIP se
  reemplazó por **tarjetas**, con el mismo modelo de los otros dashboards.
- **Cada tarjeta muestra:**
  - **BOMs subidos (N/4):** por cada BOM (Eléctrico, Mecánico, Comp. mayores, Manufactura):
    - ☑ subido, con versión de la última carga (v2…), fecha y número de renglones;
    - aviso ⚠ si tiene renglones **por revisar** o que **ya no vienen** en la última carga;
    - ☐ sin subir.
    Clic en un BOM abre su requisición.
  - **Estatus de compras:** barra por BOM (morado = reasignado, verde = ordenado), %
    cubierto, ✓ completo y ⚠ si lleva más de 14 días sin movimiento.
  - **Tiempo transcurrido y restante:** misma barra roja/verde y mismo criterio de arranque
    y final que las demás tarjetas.
  - **Resultado comercial:**
    - Target Compras (de Configurar Proyecto) y monto adquirido (órdenes de compra del Job
      en todos sus años, USD);
    - barra de % consumido del target;
    - **Ahorro** = target − adquirido, en $ y %; verde si es positivo, rojo si se pasó del
      target.
    - Mientras haya compras pendientes, el ahorro se marca como **preliminar**: todavía falta
      comprar, así que no es un ahorro real.
- **Encima de las tarjetas:**
  - búsqueda;
  - filtros: con compras pendientes, con algún BOM sin subir, BOM con renglones por revisar /
    ya no vienen, adquirido sobre el target;
  - orden: menos días restantes, menor avance de compras, menor ahorro, Job.
- Se mantienen los indicadores y las dos gráficas de arriba: Target vs Adquirido y
  tendencia del % de ahorro de los Jobs del año.

## Servidor
- `/api/dashboard/purchasing` agrega:
  - `cards` y `cards_meta`;
  - en cada tarjeta, `comercial` (target, adquirido, ahorro, % de ahorro) y `boms_carga`
    (última versión de carga, fecha, usuario, renglones, por revisar, ya no vienen).
- El resumen por BOM (`_req_resumen_jobs`) agrega `por_revisar` y `ausentes`; también lo
  aprovecha la tabla del Dashboard del proyecto.
- Las piezas de la tarjeta (tiempo y compras) pasaron a funciones compartidas,
  `ingTiempoHTML()` e `ingComprasHTML()`, que usan todas las tarjetas.

## Archivos
- `app.py`: `api_dashboard_purchasing()` y `_req_resumen_jobs()`.
- `static/app.js`:
  - nuevas: `purchCardHTML()`, `purchCardsBlockHTML()`, `purchCardsRender()`,
    `ingTiempoHTML()`, `ingComprasHTML()`;
  - cambian: `renderPurchDashboard()` y `ingCardHTML()` (refactor, mismo resultado).

## Cómo se probó (PostgreSQL local)
- 4 tarjetas WIP.
- 652-50: BOMs 3/4, Mecánico v2 con "2 por revisar · 1 ya no viene", Target $95,000,
  adquirido $79,066, ahorro $15,934 (16.8%).
- Filtros: "por revisar" deja 652-50; "compras pendientes" deja 666-00 y 652-50.
- Las tarjetas de Operaciones y ENGINEERING siguen igual después del refactor.
- Sin errores de JavaScript.
