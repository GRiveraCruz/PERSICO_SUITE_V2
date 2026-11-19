# rev151 — Bloqueo de requisiciones por Job (fecha límite para solicitar materiales)

## Quién
- **Solo el Administrador y el perfil PROJECT MANAGER** pueden bloquear o desbloquear y fijar la
  fecha límite. Cualquier otro usuario recibe "Solo el Administrador o el Project Manager pueden
  bloquear las requisiciones".

## Cómo (Compras ▸ Requisición de Compra ▸ elegir Job)
- **Banda arriba del BOM** con el estado del Job y, para Admin/PM, el botón **"🔒 Bloqueo / fecha
  límite"**:
  - **Bloquear ahora**, con casilla;
  - **fecha límite para solicitar materiales** (opcional): a partir del día siguiente, el Job se
    bloquea solo;
  - **motivo o nota** (ej. "Cierre de diseño");
  - historial de los últimos cambios (quién, cuándo, qué).
- **Lo que se muestra:**
  - **🔒 Requisiciones bloqueadas** (rojo): bloqueadas por el PM o porque ya pasó la fecha
    límite, con el motivo;
  - **📅 Fecha límite**: azul, o ámbar cuando faltan 3 días o menos, con los días que faltan.

## Qué se bloquea
- **Con el Job bloqueado o pasada su fecha límite, para todos menos Admin y PM:**
  - **cargar requisiciones** por Excel (mecánico, eléctrico, componentes mayores y manufactura),
    **planos PDF** o **archivos STP** → rechazado (423), con el motivo y la indicación de pedir
    al PM el desbloqueo;
  - **aumentar la cantidad** de un renglón (edición individual o "Guardar cambios" de
    Manufactura) → rechazado.
- **Sí se permite:**
  - bajar cantidades;
  - cambiar estatus;
  - **comprar** (generar OC), **reasignar de Stock** y registrar compras;
  - todo lo que haga el Admin o el PM.

## Datos y API
- **Se guarda en el Job** (`req_bloqueo`): bloqueado, fecha_limite, motivo, por, fecha e
  historial.
- **API:**
  - `GET /api/jobs/<job>/req-bloqueo` → estado (`activo`, `por_fecha`, `puede_editar`);
  - `PUT /api/jobs/<job>/req-bloqueo` (solo Admin/PM) `{bloqueado, fecha_limite, motivo}`.

## Probado (PostgreSQL)
- **Usuario de Compras:**
  - carga una requisición → OK;
  - intenta bloquear → rechazado.
- **El PM bloquea el Job 652-50.** Después, Compras:
  - sube otro Excel → **423 bloqueado**;
  - sube la cantidad de un renglón → **423**;
  - baja la cantidad → OK.
- **El PM sí puede** cargar con el Job bloqueado.
- **Fecha límite:**
  - **ayer** (sin bloqueo manual) → bloqueado por fecha;
  - **mañana** → abierto.
