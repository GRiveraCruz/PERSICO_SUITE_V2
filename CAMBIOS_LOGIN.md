# Cambios — Nadie podía iniciar sesión (rev25 → rev26)

## Diagnóstico
El código de login **no cambió** entre rev08 y rev25. Se comparó función por función:
login, `_check_login`, `_load_auth`, `_verify_password`, la sesión y `get_user_perms`.

La falla ocurre cuando **Railway no tiene la variable `SECRET_KEY`**:
- El Procfile arranca gunicorn con `--workers=2`. Sin la variable, cada worker generaba
  **su propia** clave de sesión al arrancar.
- El login se aceptaba en un worker (redirección normal), pero las peticiones siguientes
  caían al azar en el otro worker, que no reconocía la cookie: 401 y de regreso al login.

Reproducido con gunicorn de 2 workers y PostgreSQL, forzando conexión nueva por
petición, como hace el proxy de Railway:

| Condición | Sesiones completas |
|---|---|
| rev25 sin SECRET_KEY | **2 / 10** |
| rev25 con SECRET_KEY | 10 / 10 |
| **rev26 sin SECRET_KEY** | **10 / 10** |

El comentario original suponía que el único efecto era "las sesiones no sobreviven un
reinicio"; con 2 workers el efecto real era que nadie podía entrar.

## Corrección
Si `SECRET_KEY` no está definida, la clave aleatoria se genera **una sola vez** y se
comparte entre todos los workers y reinicios:
- **Con PostgreSQL:** tabla `app_secrets` (fila `flask_secret_key`). El primer worker la
  inserta y los demás la leen. Si dos workers crean la tabla a la vez, hay reintento.
- **Sin base de datos:** archivo `DATA_DIR/.flask_secret_key` (creación exclusiva,
  permisos 600).
- Sigue sin existir una clave fija en el código (el hueco de seguridad que se quitó antes).
- El log de arranque indica el origen de la clave.

**Recomendado de todas formas:** definir `SECRET_KEY` en Railway (Variables) con un
valor largo y aleatorio (`python -c "import secrets; print(secrets.token_hex(32))"`).
Con la variable definida, se usa esa y lo demás no interviene.

## Cómo se probó (gunicorn 2 workers, conexión nueva por petición)
- **PostgreSQL sin SECRET_KEY:** 10/10 sesiones completas; los dos workers reportan
  "origen: base de datos (tabla app_secrets)".
- **Tras reiniciar gunicorn,** la sesión iniciada antes sigue válida (6/6 peticiones
  200), en PostgreSQL y en JSON.
- **JSON sin SECRET_KEY:** clave en archivo compartido, 6/6 antes y después de reiniciar.
- **Con SECRET_KEY:** sin cambios, 10/10.

## Si después de desplegar rev26 alguien sigue sin poder entrar
El síntoma sería distinto: "Usuario o contraseña incorrectos" en todos los usuarios.
Eso indicaría que no se puede leer la tabla de usuarios (conexión a la base). Buscar en
los logs de Railway `[DB] Error leyendo users_auth`.

---
# rev27 — Aviso cuando la app corre sin la capa de base de datos

**Hallazgo en los logs de Railway:** después de "Esquema de Ventas…" no aparecen las
líneas "Consignación: 4 tablas…" ni "49 tablas verificadas/creadas…". Ese patrón solo
ocurre cuando `import db` falla (SQLAlchemy no instalado); se reprodujo igual en local.

En ese estado, toda la app corre en **modo JSON** sobre `DATA_DIR` (copiado de
`data_seed` porque el volumen está vacío):
- Los usuarios salen de `data_seed/users_auth.json`, así que ninguna contraseña real
  funciona: "Usuario o contraseña incorrectos".
- Los Jobs y demás datos que se ven son los de ejemplo, no los de PostgreSQL.
- Lo que se capture se guarda en el disco del contenedor y se pierde en el siguiente deploy.

**Cambio:** si `DATABASE_URL` está configurada y `db.py` no se puede cargar, el log
muestra un ERROR GRAVE con el motivo exacto, por ejemplo "No module named 'sqlalchemy'".
Antes pasaba en silencio.

**Causa probable en el repositorio:** `requirements.txt` desactualizado o ausente tras la
subida desordenada. Todos los ZIP entregados (rev08–rev27) incluyen `sqlalchemy>=2.0`.

---
# rev28 — CAUSA REAL: SQLAlchemy 2.1 cambió el conector de PostgreSQL

**Log de Railway con rev27:**
`[DB] ✗✗ ERROR GRAVE: … no se pudo cargar la capa de base de datos (db.py): No module named 'psycopg'`

**Causa:**
- `requirements.txt` pedía `sqlalchemy>=2.0` sin tope. SQLAlchemy **2.1.0** (la versión
  más reciente hoy) cambió el conector predeterminado de `postgresql://` de **psycopg2**
  a **psycopg (v3)**, que no está instalado.
- Cualquier build nuevo en Railway instaló la 2.1.0, `import db` falló y la app quedó en
  modo JSON con los usuarios de ejemplo: nadie podía entrar.
- No fue un cambio en el código de la suite. Las pruebas locales usaban 2.0.54, por eso
  no se detectó.

Reproducido en local con 2.1.0: mismo error, mismo log.

**Corrección:**
- `db.py`: nueva función `_pg_url()` que convierte `postgres://` y `postgresql://` a
  **`postgresql+psycopg2://`** (conector explícito). Se aplica a `DATABASE_URL` y
  `CONSIG_DATABASE_URL`.
- `migrations/env.py`: el mismo conector explícito para Alembic.
- `requirements.txt`: `sqlalchemy>=2.0,<2.1`, la serie probada. Aun con 2.1 funcionaría
  gracias al conector explícito.
- La conexión directa psycopg2 del módulo de Ventas no cambia.

**Verificado (4 combinaciones):** SQLAlchemy 2.1.0 y 2.0.54 × URL `postgres://` y
`postgresql://`. En todas arrancan las tres líneas `[DB]` (Ventas, Consignación 4 tablas,
49 tablas) y el login valida contra la base: la contraseña real funciona y la de ejemplo
ya no. La suite de reasignaciones pasa con ambas versiones.

**Qué revisar después del deploy:** en el Deploy Log deben aparecer las tres líneas
`[DB]` y **ninguna** con "✗✗ ERROR GRAVE".

**Nota:** rev26 (clave de sesión compartida) no era la causa de este problema, pero se
conserva como protección por si `SECRET_KEY` llegara a faltar.
