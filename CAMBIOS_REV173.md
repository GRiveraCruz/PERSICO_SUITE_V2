# rev173 — Work Hours: editar el Work Code de un registro (solo Administrador)

## Qué cambia
- **La columna Work Code de Work Hours es ahora un campo de entrada/salida:**
  - **Administrador:** el Work Code es un **campo editable** dentro de la tabla. Se ve igual que
    antes y se resalta al hacer clic.
    - Ofrece una lista de **Jobs en WIP**, **ADMINISTRACION** y **centros de costo activos**.
    - Al cambiarlo pide confirmación y guarda. **Esc** deshace la edición.
  - **Otros usuarios** (aunque tengan permiso sobre Work Hours): solo lectura, como antes.
- **Validación en el servidor** (`PUT /api/wh/<año>/<id>/work-code`):
  - **solo administradores;** cualquier otro usuario recibe "Sin permiso — solo administradores
    pueden editar el Work Code";
  - **acepta** Jobs existentes, ADMINISTRACION/ADMIN y centros de costo activos;
  - **otro código** se rechaza con explicación, y el administrador puede **confirmar y guardarlo
    de todos modos**.
- **Bitácora en el registro:** cada cambio queda en `reasignaciones` (de, a, fecha, usuario, "edición
  individual"). Se ve al pasar el mouse sobre el campo.
- **El costo del registro** pasa al nuevo Work Code en los reportes (Job Report, centros de costo).
- **La reasignación masiva por Job** (Work Hours ▸ reasignar) sigue igual.

## Probado
- **Usuario no administrador** → 403. **Código inexistente** → rechazado con explicación.
- **ADMINISTRACION → 652-50 → ADMINISTRACION** → guardado. **Código forzado** → guardado.
- **Bitácora:** el registro conserva los 3 cambios.
- **En pantalla:**
  - administrador: 100 campos editables (página visible) y lista de 41 opciones;
  - usuario sin rol de administrador: 0 campos editables (solo texto).
