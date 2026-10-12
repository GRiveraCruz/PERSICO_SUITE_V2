# rev104 — Permisos del usuario en pestañas, con Requisición de Compra y CPC

## Pestañas en lugar de una lista larga
- En **Config ▸ Administrador**, la tarjeta de cada usuario muestra los permisos en
  **pestañas por área**, en lugar de la lista con todos los módulos.
- Cada pestaña indica cuántos de sus apartados tiene habilitados (por ejemplo,
  "Documentos de Compra 7/7"). El contador se actualiza al cambiar un nivel.
- La pestaña abierta se conserva al pasar de un usuario a otro, para revisar el mismo
  apartado en varios usuarios.

| Pestaña | Apartados |
|---|---|
| 📋 Proyectos | Jobs, PT, SV, Hourly Rate, Cotizaciones, Costos por perfil |
| 🤝 Ventas | CPO |
| ⚡ Catálogos | Eléctrico, Mecánico, Servicios |
| 🏭 Proveedores | Proveedores |
| 📄 Documentos de Compra | **Requisición de Compra** (nuevo en la tarjeta), Órdenes de Compra (GPO), Purchase Orders, Invoiced POs, Reasignaciones, Reasignaciones Consignación, Recuperaciones |
| 🏬 Almacenes | Stock, Consignación, Ingresos, Apartados, Stock de Manufactura, Salidas |
| ✈ Servicio | Viáticos, Gastos de viaje, Envíos |
| ⚙ Configurar Proyecto | Configurar Proyecto y sus 6 pestañas |
| 📊 Control de Costo | Work Hours, Job Report, Multi-Job Report, FX |
| 💹 Finanzas | Recepciones, Procesar Compra, CPP, **CPC** (nuevo), Pagos, Esquemas |
| 🧑‍💼 Recursos Humanos | Asistencia, Vacaciones, Permisos, Calcular Salario, Sueldos, Nómina, Áreas, Tipo de Puesto, Perfiles, Listado |
| 📈 Management | KPIs |
| 🏭 Operaciones | Capacidad, Órdenes de Trabajo, de Producción y de Servicio |

## Apartados que no aparecían
- **Requisición de Compra:** el permiso ya existía y se validaba, pero no estaba en la
  tarjeta, así que no se podía ajustar. Ahora se configura en "Documentos de Compra".
  - El menú Compras ▸ Requisición de Compra ahora se oculta a quien no tiene acceso.
- **CPC (Cuentas por Cobrar):** se validaba con un permiso que no existía en la lista, así
  que solo el administrador podía entrar. Ahora es configurable.
  - Mientras no se le fije un nivel, **toma el mismo nivel que CPP**, para que Finanzas
    tenga acceso sin configurar nada.
  - El menú Finanzas ▸ CPC se oculta a quien no tiene acceso.

## Probado
- La tarjeta de un PM muestra 13 pestañas con sus contadores.
- "Documentos de Compra" incluye Requisición de Compra (7 apartados).
- Al cambiar de pestaña solo se ve su tabla. Sin errores de JavaScript.
