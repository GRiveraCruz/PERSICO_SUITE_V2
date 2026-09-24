# DESPLIEGUE_RAILWAY.md

## Variables de entorno — qué cambia con esta entrega

### `SECRET_KEY` — ya existía, ahora es estrictamente necesaria
Antes, si faltaba, la app usaba un valor público fijo (hueco de seguridad). Ahora, si
falta, la app sigue arrancando (no se cae el servicio) pero genera una clave aleatoria
nueva en cada arranque — **las sesiones no sobreviven un reinicio ni se comparten
entre los 2 workers de Gunicorn**.

**Verificar antes de desplegar:** entra a Railway → el servicio → pestaña Variables →
confirma que `SECRET_KEY` ya existe con un valor real. Si no está:
```
python -c "import secrets; print(secrets.token_hex(32))"
```
y pon ese valor como `SECRET_KEY` en Railway. Guárdalo en un lugar seguro (gestor de
contraseñas del equipo) — si se pierde, todas las sesiones activas se invalidan (no es
grave, solo obliga a volver a iniciar sesión).

### `EMERGENCY_ADMIN_KEY` — variable NUEVA, no existía antes
Sin esta variable, el endpoint `/emergency-reset-admin` queda **desactivado por
completo** (responde 503). Es opcional en el sentido de que la app funciona sin ella,
pero si el equipo quiere conservar la posibilidad de restaurar al administrador en una
emergencia, hay que configurarla.

**Generarla:**
```
python -c "import secrets; print(secrets.token_hex(32))"
```
Debe ser **distinta** de `SECRET_KEY` (son dos secretos con propósitos distintos a
propósito, para que filtrar uno no comprometa el otro). Guárdala en el gestor de
contraseñas del equipo, no en un chat ni en un documento compartido sin cifrar.

## Cómo usar el nuevo `/emergency-reset-admin` (cambió de forma)

**Antes** (ya no funciona, devuelve 405):
```
https://tu-app.up.railway.app/emergency-reset-admin?key=...
```

**Ahora** (por línea de comandos, con `curl`):
```bash
curl -X POST https://tu-app.up.railway.app/emergency-reset-admin \
  -H "Content-Type: application/json" \
  -d '{"key": "EL_VALOR_DE_EMERGENCY_ADMIN_KEY"}'
```
Respuesta esperada: `{"ok": true, "message": "Usuario 'guillermo' restaurado como administrador."}`
(el nombre de usuario viene de la variable `ADMIN_USER`, o `guillermo` si no está
configurada).

## Validación posterior al despliegue (staging o producción)

No tengo acceso a Railway desde este entorno, así que esto es una checklist para que
el equipo la ejecute, no algo que yo haya podido correr:

1. **Login normal** sigue funcionando con un usuario existente.
2. **Crear un Job** con un usuario que SÍ tiene permiso de creación en el módulo
   "jobs" — debe funcionar exactamente igual que antes.
3. **Intentar crear un Job con un usuario sin ese permiso** (si tienen uno de prueba
   con rol `viewer`) — debe recibir "Sin permiso" (403) en vez de crear el Job. Si
   antes de este despliegue algún usuario de bajo permiso SÍ estaba creando Jobs por
   necesidad real del negocio (no por error), esto lo va a bloquear — revisar permisos
   de los usuarios antes de desplegar si ese es el caso.
4. **Importar un archivo de Work Hours real** (uno de prueba, no de producción) —
   confirmar que los nombres de empleados se homologan igual que antes y que las
   horas/fechas importadas coinciden con el archivo fuente.
5. Revisar los logs de Railway justo después del despliegue por la línea
   `[SEGURIDAD] ⚠ La variable de entorno SECRET_KEY no está configurada` — si aparece,
   significa que `SECRET_KEY` no está puesta y hay que configurarla cuanto antes.
6. Si se configuró `EMERGENCY_ADMIN_KEY`, probar el `curl` de arriba UNA vez en
   staging (no en producción) para confirmar que responde 200.

## Reversión

Todos los cambios de esta pasada están en `app.py` únicamente (ningún cambio de
esquema de base de datos, ninguna migración). Si algo falla:
1. Revertir al commit/deploy anterior en Railway (rollback estándar).
2. Las variables nuevas (`EMERGENCY_ADMIN_KEY`) pueden quedarse configuradas sin
   problema aunque se revierta el código — el código viejo simplemente no las usa.

## Pendiente antes de considerar esto "listo para producción"

Ver `AUDITORIA.md` para el detalle completo. En resumen, lo más urgente que falta:
- Autorización server-side en ~73 rutas más (solo se corrigió 1 como prueba de
  concepto).
- Confirmar si hay usuarios reales usando la contraseña compartida de arranque antes
  de tocar ese mecanismo.
- Nada de esto se probó en Railway ni con navegador real — solo con pruebas locales
  automatizadas contra datos sintéticos.
