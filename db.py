"""
db.py — Configuración central de SQLAlchemy para Persico Suite.

Patrón de datos elegido: cada colección se guarda en su propia tabla con
columnas indexadas para las búsquedas más comunes (año, cliente, job, etc.)
más una columna JSONB ("data") con el registro completo tal como vivía en
el JSON original. Esto evita rediseñar cada campo como columna separada
(riesgoso, dado que estas estructuras crecieron orgánicamente durante mucho
tiempo) mientras sí da los beneficios reales de una base de datos: sin
candado único global, índices, y transacciones ACID.

Ventas (Quote / CPO) ya fue migrado antes de este proyecto usando psycopg2
directo — se deja tal cual (ya está probado en producción) y aquí solo se
definen sus modelos SQLAlchemy en modo "espejo" para que el esquema quede
documentado y consultable de forma consistente con el resto.
"""
import os
import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Railway a veces entrega la URL con el esquema viejo "postgres://" — SQLAlchemy
# 1.4+/2.x requiere "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

DB_ENABLED = bool(DATABASE_URL)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10) if DB_ENABLED else None
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False)) if DB_ENABLED else None
Base = declarative_base()


def now():
    return datetime.datetime.utcnow()


class JSONBMixin:
    """Columnas comunes a (casi) todas las tablas de este patrón."""
    id = Column(Integer, primary_key=True)
    data = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)


class ContentHashMixin:
    """Para colecciones sin una llave natural de un solo campo (ej. Stock se
    identifica por fabricante+número de parte juntos, no por un 'id' propio).
    Se usa una huella (hash) del contenido del registro como llave de upsert:
    si el mismo contenido vuelve a aparecer, se actualiza esa fila en vez de
    duplicarla; si el contenido cambia, se trata como una versión nueva."""
    content_hash = Column(String, unique=True, index=True)


# ══════════════════════════════════════════════════════════════════
#  VENTAS — modelos "espejo" (la app sigue usando psycopg2 directo para
#  estas dos tablas; se definen aquí solo para documentación de esquema
#  y para que Alembic las reconozca sin intentar recrearlas).
# ══════════════════════════════════════════════════════════════════
class Quote(Base, JSONBMixin):
    __tablename__ = "quotes"
    qnum = Column(String, unique=True)
    customer = Column(String, index=True)


class CPO(Base, JSONBMixin):
    __tablename__ = "cpos"
    cpo_id = Column(String, unique=True, nullable=False)
    year = Column(Integer, nullable=False, index=True)
    job = Column(String, index=True)
    customer = Column(String, index=True)


# ══════════════════════════════════════════════════════════════════
#  JOBS
# ══════════════════════════════════════════════════════════════════
class Job(Base, JSONBMixin):
    __tablename__ = "jobs"
    job_number = Column(String, unique=True, nullable=False, index=True)
    customer = Column(String, index=True)
    status = Column(String, index=True)


# ══════════════════════════════════════════════════════════════════
#  COMPRAS
# ══════════════════════════════════════════════════════════════════
class HourlyRate(Base, JSONBMixin):
    __tablename__ = "hourly_rates"
    year = Column(Integer, nullable=False, index=True)
    employee = Column(String, index=True)
    year_key = Column(String, unique=True, index=True)  # "{year}_{employee}" — único por año


class PurchaseOrder(Base, JSONBMixin):
    __tablename__ = "purchase_orders"
    year = Column(Integer, nullable=False, index=True)
    po_number = Column(String, index=True)
    job = Column(String, index=True)
    year_key = Column(String, unique=True, index=True)  # "{year}_{clave}" — único por año


class InvoicedPO(Base, JSONBMixin):
    __tablename__ = "invoiced_pos"
    year = Column(Integer, nullable=False, index=True)
    clave = Column(String, unique=True, index=True)  # llave real usada en el JSON de origen
    job = Column(String, index=True)
    job = Column(String, index=True)


class Proveedor(Base, JSONBMixin):
    __tablename__ = "proveedores"
    clave = Column(String, unique=True, index=True)  # es entero en el JSON, se guarda como texto aquí
    nombre = Column(String, index=True)


class GeneratedPO(Base, JSONBMixin):
    __tablename__ = "generated_pos"
    po_number = Column(String, unique=True, index=True)


class CatalogoCompra(Base, JSONBMixin, ContentHashMixin):
    """Unifica catalogo_electrico / catalogo_mecanico / catalogo_servicios
    (mismo formato, distinta 'familia')."""
    __tablename__ = "catalogos_compra"
    familia = Column(String, nullable=False, index=True)  # electrico | mecanico | servicios


# ══════════════════════════════════════════════════════════════════
#  WORK HOURS (la colección más grande — 4,253+ registros y creciendo)
# ══════════════════════════════════════════════════════════════════
class WorkHour(Base, JSONBMixin):
    __tablename__ = "work_hours"
    source_id = Column(Integer, index=True)  # "id" tal cual venía en el JSON — se reinicia cada año, NO es único global
    year_key = Column(String, unique=True, index=True)  # "{year}_{source_id}" — esta sí es la llave única real
    year = Column(Integer, nullable=False, index=True)
    employee = Column(String, index=True)
    job = Column(String, index=True)
    date_worked = Column(String, index=True)  # se guarda como texto AAAA-MM-DD, igual que en JSON


# ══════════════════════════════════════════════════════════════════
#  FX
# ══════════════════════════════════════════════════════════════════
class FXRate(Base, JSONBMixin):
    __tablename__ = "fx_rates"
    year = Column(Integer, nullable=False, index=True)
    fecha = Column(String, unique=True, index=True)


# ══════════════════════════════════════════════════════════════════
#  PERSONAL / RRHH
# ══════════════════════════════════════════════════════════════════
class Personal(Base, JSONBMixin):
    __tablename__ = "personal"
    tid = Column(String, unique=True, nullable=False, index=True)
    nombre = Column(String, index=True)
    area = Column(String, index=True)


class Area(Base, JSONBMixin):
    __tablename__ = "areas"
    nombre = Column(String, unique=True, index=True)


class Perfil(Base, JSONBMixin):
    __tablename__ = "perfiles"
    pid = Column(String, unique=True, index=True)


class Vacacion(Base, JSONBMixin):
    __tablename__ = "vacaciones"
    tid = Column(String, unique=True, nullable=False, index=True)


class Permiso(Base, JSONBMixin):
    __tablename__ = "permisos"
    pid = Column(String, unique=True, index=True)
    tid = Column(String, index=True)
    estatus = Column(String, index=True)


class Sueldo(Base, JSONBMixin):
    __tablename__ = "sueldos"
    tid = Column(String, unique=True, nullable=False, index=True)


class IsrTabla(Base, JSONBMixin):
    __tablename__ = "isr_tablas"
    periodo = Column(String, unique=True, index=True)  # quincenal | mensual


class NominaPeriodo(Base, JSONBMixin):
    __tablename__ = "nomina_periodos"
    periodo_id = Column(String, unique=True, index=True)


class NominaRecibo(Base, JSONBMixin):
    __tablename__ = "nomina_recibos"
    recibo_id = Column(String, unique=True, index=True)
    periodo_id = Column(String, index=True)
    tid = Column(String, index=True)


class ControlHorasFirma(Base, JSONBMixin):
    __tablename__ = "control_horas_firmas"
    report_key = Column(String, index=True)


class ControlHorasExport(Base, JSONBMixin):
    __tablename__ = "control_horas_exports"
    report_key = Column(String, unique=True, index=True)


# ══════════════════════════════════════════════════════════════════
#  OPERACIONES
# ══════════════════════════════════════════════════════════════════
class Stock(Base, JSONBMixin, ContentHashMixin):
    """Se identifica en la app por (manufacturer + part_number) juntos, no por
    un campo único propio — se usa huella de contenido para el upsert."""
    __tablename__ = "stock"
    job = Column(String, index=True)


class ReassignOrder(Base, JSONBMixin):
    __tablename__ = "reassign_orders"
    order_number = Column(String, unique=True, index=True)


class Recovery(Base, JSONBMixin, ContentHashMixin):
    __tablename__ = "recovery"
    job = Column(String, index=True)


class MovimientoStock(Base, JSONBMixin, ContentHashMixin):
    __tablename__ = "movimientos_stock"
    job = Column(String, index=True)


class Capacidad(Base, JSONBMixin):
    __tablename__ = "capacidad"
    tid = Column(String, unique=True, index=True)


class CapacidadCodigo(Base, JSONBMixin):
    __tablename__ = "ops_capacidad_codigos"
    codigo = Column(String, unique=True, index=True)


class OrdenServicio(Base, JSONBMixin):
    __tablename__ = "ordenes_servicio"
    os_id = Column(String, unique=True, nullable=False, index=True)
    estatus = Column(String, index=True)


class TareaAsignada(Base, JSONBMixin):
    __tablename__ = "tareas_asignadas"
    ta_id = Column(String, unique=True, nullable=False, index=True)
    estatus = Column(String, index=True)


# ══════════════════════════════════════════════════════════════════
#  FINANZAS
# ══════════════════════════════════════════════════════════════════
class EsquemaTributario(Base, JSONBMixin):
    __tablename__ = "esquemas_tributarios"
    folio = Column(String, unique=True, index=True)


class Recepcion(Base, JSONBMixin):
    __tablename__ = "recepciones"
    rec_number = Column(String, unique=True, index=True)
    job = Column(String, index=True)


class ProcesarCompra(Base, JSONBMixin):
    __tablename__ = "procesar_compra"
    pur_number = Column(String, unique=True, index=True)
    job = Column(String, index=True)


class CPP(Base, JSONBMixin):
    __tablename__ = "cpp"
    cpp_number = Column(String, unique=True, index=True)


class Pago(Base, JSONBMixin):
    __tablename__ = "pagos"
    pago_number = Column(String, unique=True, index=True)


class CPC(Base, JSONBMixin):
    __tablename__ = "cpc"
    year = Column(Integer, index=True)
    cpc_id = Column(String, unique=True, index=True)
    job = Column(String, index=True)


# ══════════════════════════════════════════════════════════════════
#  CONFIGURACIÓN DE PROYECTO
# ══════════════════════════════════════════════════════════════════
class ProjectConfig(Base, JSONBMixin):
    __tablename__ = "project_configs"
    ptsv = Column(String, unique=True, nullable=False, index=True)


# ══════════════════════════════════════════════════════════════════
#  LOGÍSTICA / OTROS
# ══════════════════════════════════════════════════════════════════
class Ingreso(Base, JSONBMixin):
    __tablename__ = "ingresos"
    record_id = Column(String, unique=True, index=True)  # "id" tal cual venía en el JSON (WI-...)
    # Nota: "job" vive dentro de cada item (ingreso.items[].job), no a nivel de registro —
    # por eso no hay columna "job" indexada aquí.


class Apartado(Base, JSONBMixin):
    __tablename__ = "apartados"
    part_number = Column(String, unique=True, index=True)  # llave real — es un registro consolidado por número de parte


class Salida(Base, JSONBMixin):
    __tablename__ = "salidas"
    record_id = Column(String, unique=True, index=True)  # "id" tal cual venía en el JSON (WO-...)
    job = Column(String, index=True)


class Viatico(Base, JSONBMixin):
    __tablename__ = "viaticos"
    record_id = Column(String, unique=True, index=True)  # "id" tal cual venía en el JSON (VIA-...)
    job = Column(String, index=True)


class GastoViaje(Base, JSONBMixin):
    __tablename__ = "gastos_viaje"
    record_id = Column(String, unique=True, index=True)  # "id" tal cual venía en el JSON (GV-...)
    job = Column(String, index=True)


class Envio(Base, JSONBMixin):
    __tablename__ = "envios"
    record_id = Column(String, unique=True, index=True)  # "id" tal cual venía en el JSON (ENV-...)
    job = Column(String, index=True)


# ══════════════════════════════════════════════════════════════════
#  SISTEMA
# ══════════════════════════════════════════════════════════════════
class User(Base, JSONBMixin):
    """Roles y permisos (users.json). Las contraseñas siguen en users_auth.json
    / UserAuth — se separan a propósito para no mezclar credenciales con
    configuración de permisos en la misma fila."""
    __tablename__ = "users"
    username = Column(String, unique=True, nullable=False, index=True)


class UserAuth(Base, JSONBMixin):
    __tablename__ = "users_auth"
    username = Column(String, unique=True, nullable=False, index=True)


class DocCounter(Base, JSONBMixin):
    __tablename__ = "doc_counters"
    prefix = Column(String, unique=True, nullable=False, index=True)


class PTNumber(Base, JSONBMixin):
    __tablename__ = "pt_numbers"
    pt_number = Column(String, unique=True, nullable=False, index=True)


class SVNumber(Base, JSONBMixin):
    __tablename__ = "sv_numbers"
    sv_number = Column(String, unique=True, nullable=False, index=True)


def canonical_hash(rec):
    """Huella determinística del contenido de un registro (mismo contenido →
    mismo hash, sin importar el orden de las llaves del dict). Compartida entre
    migrate_json_to_postgres.py y las funciones load/save en tiempo real de app.py
    para los modelos que usan ContentHashMixin."""
    import json as _json, hashlib as _hashlib
    canon = _json.dumps(rec, sort_keys=True, ensure_ascii=False, default=str)
    return _hashlib.sha256(canon.encode("utf-8")).hexdigest()


def init_db():
    """Crea todas las tablas que no existan. Nunca borra ni modifica una
    tabla existente (eso lo maneja Alembic vía migraciones versionadas)."""
    if not DB_ENABLED:
        print("  [DB] DATABASE_URL no configurada — el sistema sigue usando JSON.")
        return
    Base.metadata.create_all(bind=engine)
    print(f"  [DB] {len(Base.metadata.tables)} tablas verificadas/creadas en PostgreSQL.")


# ══════════════════════════════════════════════════════════════════
#  fix_schema_columns() — ajusta tablas que YA EXISTÍAN cuando alguno de
#  sus modelos cambió de nombre de columna (create_all() nunca modifica
#  una tabla existente, solo crea las que faltan). Nunca borra filas ni
#  datos — solo renombra/agrega/quita columnas. Segura de correr más de
#  una vez: cada paso revisa el estado real de la tabla antes de tocarla.
# ══════════════════════════════════════════════════════════════════
_SCHEMA_FIXES = [
    # (tabla, [pasos])  — cada paso es una tupla describiendo la operación.
    # "add_unique": (tipo, columna, tipo_sql, campo_json_de_origen) — el último
    # valor se usa para RELLENAR la columna nueva desde data->>'campo' en las
    # filas que ya existían (si no, quedarían en NULL y no se podrían usar
    # para buscar/actualizar esos registros).
    ("reassign_orders", [("rename", "folio", "order_number")]),
    ("generated_pos",   [("rename", "folio", "po_number")]),
    ("pagos",           [("rename", "folio", "pago_number")]),
    ("esquemas_tributarios", [("add_unique", "folio", "VARCHAR", "folio"), ("drop", "content_hash")]),
    ("proveedores",     [("add_unique", "clave", "VARCHAR", "clave"), ("drop", "content_hash")]),
    ("ingresos",        [("add_unique", "record_id", "VARCHAR", "id"), ("drop", "job"), ("drop", "content_hash")]),
    ("apartados",       [("add_unique", "part_number", "VARCHAR", "part_number"), ("drop", "job"), ("drop", "content_hash")]),
    ("salidas",         [("add_unique", "record_id", "VARCHAR", "id"), ("drop", "content_hash")]),
    ("viaticos",        [("add_unique", "record_id", "VARCHAR", "id"), ("drop", "content_hash")]),
    ("gastos_viaje",    [("add_unique", "record_id", "VARCHAR", "id"), ("drop", "content_hash")]),
    ("envios",          [("add_unique", "record_id", "VARCHAR", "id"), ("drop", "content_hash")]),
    ("project_configs", [("rename", "job", "ptsv")]),
    ("recepciones",      [("add_unique", "rec_number", "VARCHAR", "rec_number"), ("drop", "content_hash")]),
    ("procesar_compra",  [("add_unique", "pur_number", "VARCHAR", "pur_number"), ("drop", "content_hash")]),
    ("fx_rates",         [("add_unique", "fecha", "VARCHAR", "fecha")]),
    ("work_hours",       [("add_composite_unique", "year_key", "VARCHAR",
                            "year::text || '_' || source_id::text", "source_id")]),
]

def fix_schema_columns():
    """Regresa una lista de strings describiendo qué se hizo (para mostrar
    en el panel de administrador)."""
    if not DB_ENABLED:
        return ["DATABASE_URL no está configurada."]
    log = []
    with engine.begin() as conn:
        from sqlalchemy import text, inspect as sa_inspect
        insp = sa_inspect(engine)
        tablas_existentes = set(insp.get_table_names())
        for tabla, pasos in _SCHEMA_FIXES:
            if tabla not in tablas_existentes:
                continue  # la tabla ni siquiera existe todavía — create_all() ya la crea bien
            cols_actuales = {c["name"] for c in insp.get_columns(tabla)}
            for paso in pasos:
                try:
                    if paso[0] == "rename":
                        _, viejo, nuevo = paso
                        if viejo in cols_actuales and nuevo not in cols_actuales:
                            conn.execute(text(f'ALTER TABLE "{tabla}" RENAME COLUMN "{viejo}" TO "{nuevo}"'))
                            log.append(f"{tabla}: columna '{viejo}' renombrada a '{nuevo}'")
                            cols_actuales.discard(viejo); cols_actuales.add(nuevo)
                    elif paso[0] == "add_unique":
                        _, col, tipo, campo_json = paso
                        col_es_nueva = col not in cols_actuales
                        if col_es_nueva:
                            conn.execute(text(f'ALTER TABLE "{tabla}" ADD COLUMN "{col}" {tipo}'))
                            log.append(f"{tabla}: columna '{col}' agregada")
                            cols_actuales.add(col)
                        # Rellenar desde data->>campo_json las filas donde la columna quedó vacía
                        # (columnas recién creadas, o filas viejas que nunca la tuvieron poblada)
                        result = conn.execute(text(
                            f'UPDATE "{tabla}" SET "{col}" = data->>:campo WHERE "{col}" IS NULL AND data->>:campo IS NOT NULL'
                        ), {"campo": campo_json})
                        if result.rowcount:
                            log.append(f"{tabla}: {result.rowcount} fila(s) rellenadas en '{col}' desde data->>'{campo_json}'")
                        idx_name = f"ix_{tabla}_{col}_uq"
                        existing_idx = insp.get_indexes(tabla)
                        ya_tiene_indice = any(col in ix["column_names"] and ix.get("unique") for ix in existing_idx)
                        if not ya_tiene_indice:
                            conn.execute(text(f'CREATE UNIQUE INDEX IF NOT EXISTS "{idx_name}" ON "{tabla}" ("{col}")'))
                            log.append(f"{tabla}: índice único creado en '{col}'")
                    elif paso[0] == "add_composite_unique":
                        _, col, tipo, expr_sql, col_vieja_a_liberar = paso
                        # Liberar la restricción/índice único de la columna vieja, si tiene —
                        # en Postgres puede ser un índice único o una restricción UNIQUE
                        # (esta última no se puede borrar con DROP INDEX).
                        for uc in insp.get_unique_constraints(tabla):
                            if col_vieja_a_liberar in uc["column_names"]:
                                conn.execute(text(f'ALTER TABLE "{tabla}" DROP CONSTRAINT "{uc["name"]}"'))
                                log.append(f"{tabla}: restricción única vieja en '{col_vieja_a_liberar}' liberada")
                        for ix in insp.get_indexes(tabla):
                            if col_vieja_a_liberar in ix["column_names"] and ix.get("unique"):
                                conn.execute(text(f'DROP INDEX IF EXISTS "{ix["name"]}"'))
                                log.append(f"{tabla}: índice único viejo en '{col_vieja_a_liberar}' liberado")
                        if col not in cols_actuales:
                            conn.execute(text(f'ALTER TABLE "{tabla}" ADD COLUMN "{col}" {tipo}'))
                            log.append(f"{tabla}: columna '{col}' agregada")
                            cols_actuales.add(col)
                        result = conn.execute(text(
                            f'UPDATE "{tabla}" SET "{col}" = {expr_sql} WHERE "{col}" IS NULL'
                        ))
                        if result.rowcount:
                            log.append(f"{tabla}: {result.rowcount} fila(s) rellenadas en '{col}'")
                        idx_name = f"ix_{tabla}_{col}_uq"
                        existing_idx = insp.get_indexes(tabla)
                        ya_tiene_indice = any(col in ix["column_names"] and ix.get("unique") for ix in existing_idx)
                        if not ya_tiene_indice:
                            conn.execute(text(f'CREATE UNIQUE INDEX IF NOT EXISTS "{idx_name}" ON "{tabla}" ("{col}")'))
                            log.append(f"{tabla}: índice único creado en '{col}'")
                    elif paso[0] == "drop":
                        _, col = paso
                        if col in cols_actuales:
                            conn.execute(text(f'ALTER TABLE "{tabla}" DROP COLUMN "{col}"'))
                            log.append(f"{tabla}: columna '{col}' eliminada (ya no se usa)")
                            cols_actuales.discard(col)
                except Exception as e:
                    log.append(f"⚠ {tabla} paso {paso}: {e}")
    if not log:
        log.append("Nada que ajustar — el esquema ya está al día.")
    return log


def get_session():
    return SessionLocal()
