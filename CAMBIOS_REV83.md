# rev83 — Organigrama con los nombres de las personas

En **Recursos Humanos → Control de Personal → Áreas**, el organigrama tiene tres vistas:

- **🏢 Áreas y personas** (default): la jerarquía de áreas ("Reporta a") con su gente.
  - **Quién encabeza el área (👤):** las personas cuyo jefe directo es de otra área o que
    no tienen jefe directo. Se muestran con su puesto.
  - **El resto del personal del área:** se ven los primeros 4; "+ N más" despliega todos.
  - El número de personas del área.
  - Al final se listan las personas sin área asignada.
- **👤 Personas (jefe directo):** árbol de personas según el campo **Jefe Directo** de
  Control de Personal.
  - Cada tarjeta muestra nombre, puesto y área, y cuántos subordinados tiene.
  - Las personas sin jefe directo y sin subordinados se agrupan aparte, para no alargar el
    árbol.
  - Si hay un ciclo de jefes, se marca con ⚠.
- **Solo áreas:** el organigrama de antes.

Solo se consideran las personas activas (no dadas de baja). Si el usuario no tiene permiso
para ver el Listado de Trabajadores, se muestran solo las áreas, con un aviso.

## Archivos
- `static/app.js`:
  - `areaRenderOrgChart()` reescrita;
  - nuevas: `orgSetVista()`, `orgToggleArea()`;
  - cambia: `loadAreas()`, que ahora carga el personal.
- `static/index.html`: estilos de las tarjetas con personas.
