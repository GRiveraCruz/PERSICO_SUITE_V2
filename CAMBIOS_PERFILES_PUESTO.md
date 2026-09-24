# CAMBIOS_PERFILES_PUESTO.md — 9 perfiles de puesto con permisos predefinidos

## Qué se agregó

**`app.py` — nuevo diccionario `PROFILES`** (justo antes de `_default_perms`): los 9
perfiles que llenaste en la matriz (incluyendo **PURCHASING**, que agregaste además de
los 8 originales — lo dejé integrado dando por hecho que fue intencional, avísame si
no), cada uno con su nivel de acceso (Ver / Crear / Control total / Sin acceso) para
los 46 módulos reales del sistema, tomados exactamente de lo que marcaste en el Excel.

**`_default_perms(role)`** ahora reconoce estos 9 nombres además de `"admin"` y el
genérico `"viewer"` — cuando un usuario tiene uno de estos roles, sus permisos se
generan automáticamente a partir de `PROFILES`, no hay que marcarlos módulo por
módulo a mano.

**Selector de rol** — tanto al crear un usuario nuevo como al editar uno existente, el
menú desplegable ahora incluye los 9 perfiles (agrupados aparte, bajo "Perfiles de
puesto") además de las opciones que ya existían ("Acceso personalizado" y
"Administrador").

## Decisión importante: "General Management" ≠ el rol interno "admin"

Aunque en tu matriz "GENERAL MANAGEMENT" tiene Control Total en los 46 módulos (igual
que "admin"), **a propósito NO se implementó como un alias del rol `admin`**. En este
sistema, `admin` no es solo "acceso a todo" — también desbloquea la administración de
usuarios y permisos en sí misma (crear/eliminar usuarios, cambiar roles de otros,
resetear contraseñas). Un "General Management" con ese poder adicional sería, en
efecto, un administrador de sistema, que es una responsabilidad distinta a tener
acceso completo a los módulos de negocio. Quedó como su propio perfil: control total
sobre los 46 módulos, pero sin la capacidad de administrar usuarios — si en realidad sí
quieres que ese perfil también administre usuarios, dímelo y lo ajusto (sería
cuestión de asignarle el rol `admin` en vez de `GENERAL MANAGEMENT` a esas personas
específicas, no un cambio de código).

## Dos bugs reales que encontré y corregí en el camino (no relacionados con lo que pediste, pero bloqueaban que esto funcionara)

**1. Cambiar el rol de un usuario nunca regeneraba sus permisos.** En
`api_admin_update_user`, el código comparaba `nuevo_rol != rol_actual` para decidir si
recalcular los permisos — pero esa comparación se hacía DESPUÉS de ya haber
sobrescrito el rol actual con el nuevo, así que la condición nunca podía ser
verdadera. En la práctica, cambiar el rol de alguien en el panel de administración
actualizaba la etiqueta pero dejaba sus permisos viejos intactos. Corregido:
ahora se compara antes de sobrescribir.

**2. `adminChangeRole` (la función que dispara el cambio de rol desde el panel) mandaba
su propio objeto de permisos, con un formato viejo e incompatible** (booleanos por
acción, solo 11 de los 46 módulos) que además tenía prioridad sobre el rol en el
backend — combinado con el bug #1, cambiar el rol de alguien no solo no aplicaba el
perfil nuevo, sino que de paso podía dejar datos con una forma rara en esos 11
módulos. Corregido: ahora solo manda el rol, y deja que el backend calcule los
permisos correctos.

Sin corregir estos dos, elegir uno de tus 9 perfiles en el desplegable se habría visto
bien en la pantalla pero no habría cambiado nada de verdad.

## Pruebas ejecutadas (reales, no solo revisión de código)

| Prueba | Resultado |
|---|---|
| Crear un usuario con cada uno de los 9 perfiles, comparar sus permisos contra la matriz | Los 9 coinciden exacto, módulo por módulo |
| Cambiar el rol de un usuario existente de "viewer" a "HUMAN RESOURCES" | Sus permisos se regeneran correctamente (antes no pasaba nada — bug #1) |
| Un usuario "GENERAL MANAGEMENT" | Tiene Control Total en los 46 módulos, pero `is_admin = False` |
| Un usuario "HUMAN RESOURCES" (que en tu matriz solo tiene Ver en Jobs) intenta crear un Job | 403 Sin permiso |
| Un usuario "HUMAN RESOURCES" intenta editar un Job existente | 403 Sin permiso |
| Un usuario "PROJECT MANAGER" (Control Total en Jobs según tu matriz) crea un Job | 201, se crea normalmente |

## Cómo usarlo

No requiere ningún paso de despliegue especial — es código, no una migración de base
de datos. En el panel de Administración → Usuarios, al crear un usuario nuevo o
cambiar el rol de uno existente, ahora aparecen los 9 perfiles en el desplegable.

## Pendiente / a confirmar contigo

- Confirmar que "PURCHASING" como noveno perfil fue intencional (asumí que sí, dado
  que sus valores en la matriz son coherentes con un rol de Compras).
- Confirmar la decisión de "General Management sin superpoderes de admin" de arriba.
- Si alguno de los 9 perfiles necesita ajustarse a futuro, el cambio es editar el
  diccionario `PROFILES` en `app.py` — no hace falta tocar la matriz de Excel de nuevo,
  aunque también puedo regenerar `PROFILES` desde una matriz actualizada si prefieres
  seguir editando ahí.
