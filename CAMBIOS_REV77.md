# rev77 — Control de Personal: Tipo de Puesto (jornada semanal) · corrección de permisos heredados

## 1. Nuevo apartado "Tipo de Puesto"
**Recursos Humanos → Control de Personal → Tipo de Puesto**, antes de Perfiles de Trabajo.

- **Nombre** del tipo de puesto.
- **Jornada de la semana:** los **7 días**, cada uno con **Hora de entrada** y **Hora de
  salida**.
  - Un día con ambos campos vacíos es **descanso**.
  - Si la salida es menor que la entrada, el turno **termina al día siguiente** (turno
    nocturno, marcado con 🌙). Por ejemplo, 22:00–06:00 = 8 h.
  - Se calculan las horas de cada día y el **total semanal** mientras se captura.
  - Atajos: "Copiar lunes a martes–viernes", "Copiar lunes a martes–jueves", "Limpiar".
  - El formulario nuevo trae como sugerencia la jornada de la planta (L-J 07:00–17:00,
    V 07:00–15:00 = 48 h).
- **Lista de tipos registrados:** jornada día por día, horas por día y por semana, días
  laborables y qué perfiles lo usan. Se puede editar y eliminar; no se elimina un tipo que
  algún perfil está usando.
- **Validación en el servidor:** horas válidas, entrada y salida completas, salida distinta
  de la entrada y nombre único.

## 2. Perfiles de puesto eligen su tipo de puesto
- En **Perfiles de Trabajo**, el alta y la edición tienen el selector **Tipo de puesto**. La
  lista muestra el tipo y sus horas por semana, o "(sin tipo de puesto)".
- **Herencia:** cada persona toma el tipo de puesto (y su jornada) del perfil que tiene como
  "Puesto".
  - En el panel del trabajador se ve "Tipo de puesto y jornada (heredado del perfil)", con
    la jornada día por día.
  - La herencia se calcula al consultar; no se copia a cada persona. Si cambia la jornada
    del tipo o el tipo del perfil, todos los trabajadores con ese perfil la ven al momento.
  - `GET /api/personal` agrega `tipo_puesto` (nombre, jornada, horas por día y por semana).

## 3. Corrección importante de permisos
Al probar el permiso del nuevo apartado salió un error desde la rev69. Al cargar los
usuarios, el sistema rellena con **"Ver"** los módulos nuevos que un usuario no tiene. Eso
incluía las pestañas de Configurar Proyecto (rev69), que debían **heredar** el nivel de
"Configurar Proyecto".
- **Efecto:** todos los usuarios quedaban en **solo lectura** en todas las pestañas de
  Configurar Proyecto, aunque tuvieran Control total. Por ejemplo, un Project Manager con
  Configurar Proyecto = Total no podía editar Presupuesto, Timing, etc.
  - Reproducido: el PM de prueba tenía las 6 pestañas en "view". Con la corrección quedan
    en "full".
- **Corrección:**
  - los módulos que heredan (6 pestañas de Configurar Proyecto y Tipo de Puesto) ya no se
    rellenan;
  - su valor solo cuenta si lo **fijó el administrador** (`perm_explicitos`), o si es
    distinto de "Ver", porque eso solo pudo venir del administrador entre la rev69 y la
    rev76;
  - si no, heredan del módulo padre. Así se conservan los permisos por pestaña que ya se
    hubieran configurado.
- En **Administración → usuarios**, estos módulos muestran la opción "Igual que <módulo
  padre> (nivel)". Elegirla quita el valor fijado. Al cambiar de perfil a un usuario, todo
  vuelve a heredar.
- **Tipo de Puesto** hereda de **Perfiles de Trabajo**: quien podía administrar perfiles
  puede administrar tipos de puesto sin configurar nada.

## API
- `GET/POST /api/tipos-puesto`, `PUT/DELETE /api/tipos-puesto/<tpid>`.
- `POST/PUT /api/perfiles` aceptan `tipo_puesto` (tpid).
- Tabla nueva `tipos_puesto`; se crea sola al arrancar.

## Archivos
- `db.py`: modelo `TipoPuesto`.
- `app.py`:
  - nuevas: `_catalog_modelo()`, endpoints de tipos de puesto, `_jornada_normalizada()`,
    `_tipo_puesto_de_personas()`, `MODULOS_HEREDAN`, `nivel_heredado()`;
  - cambian: `can()`, `pc_tab_level()`, `users_load()` (no rellena los módulos que heredan),
    actualización de usuario (`perm_explicitos`) y `/api/me/perms`.
- `static/index.html`: menú y módulo Tipo de Puesto, selector en Perfiles y campo en el
  panel del trabajador.
- `static/app.js`:
  - nuevas: `loadTiposPuesto()`, `tpRenderJornada()`, `tpGuardar()`, `tpEditar()`,
    `tpEliminar()`, `tpRenderList()`, `tpResumenPersona()`;
  - cambian: Perfiles (alta, edición, lista) y la matriz de permisos del administrador.

## Cómo se probó (PostgreSQL local)
- **Tipos:**
  - "Operativo planta" = 48 h;
  - "Nocturno" 22:00–06:00 L-V = 40 h;
  - "Administrativo" 08:30–18:00 copiado de lunes a viernes = 47.5 h, capturado desde la
    pantalla.
  - Un día incompleto o un nombre repetido se rechazan.
- **Perfiles:** Ensamblador → Operativo planta. Los trabajadores con ese puesto heredan
  48 h y se ve en su panel. No se guarda nada en el registro de la persona.
- No se puede eliminar un tipo en uso.
- **Permisos:**
  - PM: pestañas de "view" → "full";
  - ENGINEERING: sus permisos por pestaña de la rev69 se conservan;
  - RH: Tipo de Puesto hereda "full" de Perfiles; al fijarle "Ver" el alta responde 403;
    al regresarlo a "Igual que…" vuelve a "full".
- Sin errores de JavaScript.
