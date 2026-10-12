# rev102 — Las tablas caben en la pantalla

## Qué cambia (en toda la Suite)
- **Las celdas ya no fuerzan una sola línea.** Antes todas las celdas eran `nowrap`, así
  que una descripción larga ensanchaba la tabla y las columnas de montos quedaban fuera de
  la pantalla (como en el Multi-Job Report). Ahora los textos largos se acomodan en varios
  renglones:
  - descripciones, notas, nombres de cliente y de proveedor;
  - **encabezados largos**, en dos renglones.
- **Lo que no se parte:**
  - códigos en fuente mono (Job, folios, números de parte), aunque tengan guion;
  - montos y números alineados a la derecha;
  - botones, etiquetas de estatus, selectores y campos de fecha o número.
- **Tablas con muchas columnas** (10 o más): celdas más compactas. En pantallas de hasta
  1440 px todas las tablas usan un relleno un poco menor.
- **Ajustes puntuales:**
  - **Multi-Job Report:** se quitó el ancho mínimo fijo de 1,100 px; ahora cabe con todas
    sus columnas, hasta GM %;
  - **Compras ▸ POs:** botones "Editar" y "Eliminar" con texto corto, que se acomodan si
    no caben;
  - **Cotizaciones:** columnas Resultado y Estatus más angostas;
  - **Configurar Proyecto ▸ Puntos Abiertos:** anchos de columna ajustados y celdas
    compactas, para que se vean todas las columnas (Item → Eliminar) sin barra horizontal.
    El detalle completo de cada punto se ve en su modal (🔍);
  - **Configurar Proyecto ▸ Control de Cambios:** se quitó el ancho mínimo fijo.
- **Sin cambios a propósito:** la tabla del **Timing** conserva su desplazamiento
  horizontal con columnas fijas, porque el diagrama necesita ese ancho.

## Cómo se probó
- **Barrido automático** en una ventana de 1366 × 800: se midió en 46 pantallas si la
  tabla visible era más ancha que su contenedor (Jobs, PT, SV, Cotizaciones, CPO, POs,
  IVP, Stock, Recuperaciones, Reasignaciones, Consignación, Apartados, Ingresos, Salidas,
  Requisición, Proveedores, catálogos, Envíos, Órdenes de Servicio / Trabajo /
  Producción, Job Report, Multi-Job Report, FX, CPC, CPP, Pagos, Recepciones, Procesar
  Compra, Gastos de viaje, Viáticos, Work Hours, Hourly Rate, Costos por perfil, Listado
  de Trabajadores, Permisos, Vacaciones, Asistencia, Nómina y Sueldos).
- **Antes de los ajustes:** Cotizaciones, POs, Listado de Trabajadores, Sueldos,
  Multi-Job Report y Puntos Abiertos se salían del ancho.
- **Después:** **ninguna** tabla excede su contenedor. Los Jobs ya no se parten en el guion
  y los montos no se cortan.
