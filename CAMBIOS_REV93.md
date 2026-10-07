# rev93 — Menú MANAGEMENT con los KPIs

- **Menú nuevo "Management"** en la barra superior, después de Operaciones, con la opción
  **KPIs**.
- **KPIs sale de Recursos Humanos**, y el título queda solo como **"KPIs"** (antes "KPIs del
  Personal"). Se siguen pudiendo asignar por persona, por área o a toda la empresa, igual
  que antes.
- **Permisos sin cambios:** el módulo es el mismo (`rrhh-kpis`). En Administrador →
  permisos aparece en el grupo nuevo "📈 Management" como "Management — KPIs".
- **Un menú sin opciones visibles** para el usuario (por ejemplo, Management sin acceso a
  KPIs) ya no se muestra. Aplica a cualquier menú.
- La barra de menús se compactó un poco en pantallas de hasta 1600 px para que quepa el menú
  nuevo sin que se encimen los títulos.
- **Probado:**
  - el administrador ve Management → KPIs y abre el módulo con el título "KPIs";
  - el usuario de Ingeniería (sin acceso a KPIs) no ve el menú Management;
  - Recursos Humanos ya no muestra KPIs.
