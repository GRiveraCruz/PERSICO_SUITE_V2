# rev131 — Configurar Proyecto: materiales y servicios con COSTO ESTIMADO / % DE AHORRO / DISPONIBLE

## Qué cambia
- En **Configurar Proyecto ▸ Presupuesto ▸ cada Job ▸ Estimados**, cada uno de los 4 rubros es
  ahora un bloque con tres valores:
  - **Material mecánico**
  - **Material eléctrico**
  - **Componentes mayores** (antes "Major items")
  - **Servicios externos**

  | Campo | Qué es |
  |---|---|
  | **Costo estimado** | lo que se calcula que costará el rubro (captura) |
  | **% de ahorro** | ahorro esperado en la compra (captura, 0–100 %) |
  | **Disponible** | costo estimado × (1 − % de ahorro), calculado. También muestra el ahorro en $ |

## El DISPONIBLE es el que se usa en todo
- El disponible se guarda en el mismo campo de siempre (`est_material_mecanico`,
  `est_material_electrico`, `est_major_items`, `est_servicios_externos`).
- Por eso es el valor que usan, sin más cambios:
  - la **suma de estimados** y el **Delta vs Internal Target**;
  - el **Target de Compras** (suma de los 4 disponibles), que alimenta el target comercial
    de las tarjetas del dashboard, el KPI de ahorro en compras y el Job Report;
  - el **resumen por áreas / Presupuesto Proyecto** del PT/SV;
  - los **targets operativos** que leen esos campos.
- **También se guardan** `costo_<rubro>` y `ahorro_<rubro>`, para volver a mostrarlos y para
  análisis.

## Proyectos ya configurados
- **Al abrirlos,** el estimado que tenían se toma como **costo estimado con 0 % de ahorro**
  (disponible = el mismo valor). **No cambia ningún target** hasta que se capture un
  porcentaje y se guarde.

## Probado
- **Captura:**
  - Material mecánico $20,000 con 10 % → disponible **$18,000** (ahorro $2,000);
  - eléctrico $15,000 con 5 % → **$14,250**;
  - componentes mayores $40,000 con 0 % → **$40,000**;
  - servicios $8,000 con 12.5 % → **$7,000**.
- **Resultado:** la suma de estimados y el delta se recalcularon. Al guardar, el
  **Target de Compras = $79,250** (suma de disponibles) y los campos `costo_*`/`ahorro_*`
  quedaron guardados. Al reabrir, se muestran igual.
