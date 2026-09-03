#!/usr/bin/env python3
"""
migrate_json_to_postgres.py — Migración idempotente de Persico Suite
=====================================================================

Copia el contenido de los ~44 archivos/carpetas JSON bajo DATA_DIR hacia las
tablas PostgreSQL definidas en db.py. Seguro de correr más de una vez: cada
corrida hace UPSERT (inserta lo nuevo, actualiza lo que cambió, no duplica
nada) usando la "llave natural" de cada colección (tid, job_number, qnum,
folio, etc.) — nunca la posición en el archivo ni un contador propio.

NO borra ni modifica los archivos JSON originales — se quedan intactos como
respaldo hasta que se validen manualmente los datos en la base de datos.

Uso:
    python migrate_json_to_postgres.py                 # migra todo
    python migrate_json_to_postgres.py --only jobs,wh   # solo esas colecciones
    python migrate_json_to_postgres.py --dry-run        # solo reporta, no escribe nada
    python migrate_json_to_postgres.py --no-backup      # omite el respaldo previo (no recomendado)

Requiere la variable de entorno DATABASE_URL configurada (Railway la provee
automáticamente si el servicio de PostgreSQL está vinculado).
"""
import os
import sys
import json
import shutil
import hashlib
import argparse
import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db  # noqa: E402

DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))


# ══════════════════════════════════════════════════════════════════
#  REPORTE
# ══════════════════════════════════════════════════════════════════
class Reporte:
    def __init__(self):
        self.inicio = datetime.datetime.now()
        self.colecciones = []  # una entrada por colección procesada
        self.errores_globales = []

    def nueva_coleccion(self, nombre):
        c = {
            "coleccion": nombre,
            "archivos_procesados": [],
            "registros_encontrados": 0,
            "registros_insertados": 0,
            "registros_actualizados": 0,
            "registros_omitidos": 0,
            "errores": [],
            "advertencias": [],
        }
        self.colecciones.append(c)
        return c

    def imprimir(self):
        print("\n" + "=" * 78)
        print("  REPORTE DE MIGRACIÓN — Persico Suite (JSON → PostgreSQL)")
        print("=" * 78)
        print(f"  Inicio:  {self.inicio.isoformat()}")
        print(f"  Fin:     {datetime.datetime.now().isoformat()}")
        print("-" * 78)
        tot_enc = tot_ins = tot_upd = tot_omit = 0
        for c in self.colecciones:
            tot_enc += c["registros_encontrados"]; tot_ins += c["registros_insertados"]
            tot_upd += c["registros_actualizados"]; tot_omit += c["registros_omitidos"]
            estado = "⚠" if c["errores"] else "✓"
            print(f"  {estado} {c['coleccion']:28s} encontrados={c['registros_encontrados']:5d}  "
                  f"insertados={c['registros_insertados']:5d}  actualizados={c['registros_actualizados']:5d}  "
                  f"omitidos={c['registros_omitidos']:5d}")
            for a in c["archivos_procesados"]:
                print(f"      · {a['ruta']}  ({a['registros']} registro(s))  sha256={a['checksum'][:16]}…")
            for w in c["advertencias"]:
                print(f"      ⚠ ADVERTENCIA: {w}")
            for e in c["errores"]:
                print(f"      ✗ ERROR: {e}")
        print("-" * 78)
        print(f"  TOTAL   encontrados={tot_enc}  insertados={tot_ins}  actualizados={tot_upd}  omitidos={tot_omit}")
        if self.errores_globales:
            print("-" * 78)
            print("  ERRORES GLOBALES:")
            for e in self.errores_globales:
                print(f"    ✗ {e}")
        print("=" * 78 + "\n")

    def guardar_json(self, path):
        data = {
            "inicio": self.inicio.isoformat(),
            "fin": datetime.datetime.now().isoformat(),
            "colecciones": self.colecciones,
            "errores_globales": self.errores_globales,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"Reporte detallado guardado en: {path}")


def sha256_archivo(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ══════════════════════════════════════════════════════════════════
#  RESPALDO COMPLETO DE DATA_DIR (antes de tocar nada)
# ══════════════════════════════════════════════════════════════════
def hacer_respaldo():
    if not os.path.isdir(DATA_DIR):
        print(f"⚠ DATA_DIR ({DATA_DIR}) no existe — nada que respaldar.")
        return None
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    destino = os.path.join(os.path.dirname(DATA_DIR), f"data_backup_{ts}")
    print(f"Creando respaldo completo de DATA_DIR en: {destino} …")
    shutil.copytree(DATA_DIR, destino)
    print("Respaldo completo. Los JSON originales en DATA_DIR no se tocan ni se borran.")
    return destino


# ══════════════════════════════════════════════════════════════════
#  HELPERS DE LECTURA (espejo de las funciones load() de app.py — de
#  solo lectura, nunca escriben en los JSON)
# ══════════════════════════════════════════════════════════════════
def leer_json(path, default):
    p = Path(path)
    if not p.exists():
        return default, None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f), sha256_archivo(p)
    except Exception:
        return default, None


def archivos_por_anio(carpeta, patron_regex):
    """Regresa [(year:int, Path)] para archivos tipo carpeta/prefijo_AAAA.json."""
    import re
    root = Path(carpeta)
    out = []
    if not root.exists():
        return out
    for f in sorted(root.iterdir()):
        m = re.match(patron_regex, f.name)
        if m:
            out.append((int(m.group(1)), f))
    return out


# ══════════════════════════════════════════════════════════════════
#  MOTOR GENÉRICO DE MIGRACIÓN (upsert por llave natural)
# ══════════════════════════════════════════════════════════════════
def _canonical_hash(rec):
    """Huella determinística del contenido de un registro — delega en db.py
    para que la migración y las funciones load/save en tiempo real de app.py
    usen siempre exactamente la misma lógica."""
    return db.canonical_hash(rec)


def upsert_lista_por_hash(session, modelo, registros, extra_cols_fn, rep_c):
    """Para colecciones sin una llave natural de un solo campo (ver
    ContentHashMixin en db.py) — el upsert se hace por huella del contenido."""
    for rec in registros:
        rep_c["registros_encontrados"] += 1
        h = _canonical_hash(rec)
        existente = session.query(modelo).filter(modelo.content_hash == h).one_or_none()
        extra = extra_cols_fn(rec) if extra_cols_fn else {}
        if existente:
            rep_c["registros_omitidos"] += 1  # contenido idéntico ya presente — no hay nada que actualizar
        else:
            session.add(modelo(data=rec, content_hash=h, **extra))
            rep_c["registros_insertados"] += 1


def upsert_lista(session, modelo, registros, campo_llave_json, extra_cols_fn, rep_c):
    """Migra una lista de dicts hacia `modelo`, usando registros[campo_llave_json]
    como llave natural (columna única en el modelo). extra_cols_fn(rec) regresa un
    dict con las columnas indexadas adicionales a partir del registro."""
    from sqlalchemy import inspect
    llave_col = None
    for col in modelo.__table__.columns:
        if col.unique and col.name != "id":
            llave_col = col.name
            break
    if not llave_col:
        rep_c["errores"].append(f"El modelo {modelo.__tablename__} no tiene columna única definida — no se puede hacer upsert seguro.")
        return

    for rec in registros:
        rep_c["registros_encontrados"] += 1
        llave_val = campo_llave_json(rec) if callable(campo_llave_json) else rec.get(campo_llave_json)
        if llave_val is None or llave_val == "":
            rep_c["registros_omitidos"] += 1
            rep_c["advertencias"].append(f"Registro sin llave — se omite: {str(rec)[:80]}")
            continue
        llave_val = str(llave_val)  # las columnas de llave natural son String — se normaliza el tipo aquí
        extra = extra_cols_fn(rec) if extra_cols_fn else {}
        if llave_col in extra:
            rep_c["errores"].append(
                f"Error de programación: extra_cols_fn de '{modelo.__tablename__}' vuelve a definir "
                f"'{llave_col}', que ya es la columna de llave natural — se omite este registro.")
            rep_c["registros_omitidos"] += 1
            continue
        existente = session.query(modelo).filter(getattr(modelo, llave_col) == llave_val).one_or_none()
        if existente:
            existente.data = rec
            for k, v in extra.items():
                setattr(existente, k, v)
            existente.updated_at = db.now()
            rep_c["registros_actualizados"] += 1
        else:
            nuevo = modelo(data=rec, **{llave_col: llave_val}, **extra)
            session.add(nuevo)
            rep_c["registros_insertados"] += 1


def upsert_dict_como_filas(session, modelo, dict_registros, campo_llave_modelo, extra_cols_fn, rep_c):
    """Migra un dict {llave: registro_o_valor} hacia `modelo`, una fila por llave."""
    for llave, valor in dict_registros.items():
        rep_c["registros_encontrados"] += 1
        rec = valor if isinstance(valor, dict) else {"valor": valor}
        rec = dict(rec)  # copia; no mutar el original
        rec.setdefault("_llave", llave)
        existente = session.query(modelo).filter(getattr(modelo, campo_llave_modelo) == llave).one_or_none()
        extra = extra_cols_fn(llave, rec) if extra_cols_fn else {}
        if existente:
            existente.data = rec
            for k, v in extra.items():
                setattr(existente, k, v)
            existente.updated_at = db.now()
            rep_c["registros_actualizados"] += 1
        else:
            nuevo = modelo(data=rec, **{campo_llave_modelo: llave}, **extra)
            session.add(nuevo)
            rep_c["registros_insertados"] += 1


def upsert_singleton_dict(session, modelo, campo_llave_modelo, llave_fija, contenido, rep_c):
    """Para colecciones que son UN SOLO documento (ej. isr_tablas con
    {'quincenal': [...], 'mensual': [...]}) — se guarda como una sola fila."""
    rep_c["registros_encontrados"] += 1
    existente = session.query(modelo).filter(getattr(modelo, campo_llave_modelo) == llave_fija).one_or_none()
    if existente:
        existente.data = contenido
        existente.updated_at = db.now()
        rep_c["registros_actualizados"] += 1
    else:
        nuevo = modelo(data=contenido, **{campo_llave_modelo: llave_fija})
        session.add(nuevo)
        rep_c["registros_insertados"] += 1


# ══════════════════════════════════════════════════════════════════
#  DEFINICIÓN DE CADA COLECCIÓN
# ══════════════════════════════════════════════════════════════════
def migrar_jobs(session, rep):
    c = rep.nueva_coleccion("jobs")
    root = Path(DATA_DIR) / "JOBs"
    if not root.exists():
        rep.errores_globales.append("Carpeta JOBs/ no encontrada")
        return
    for sub in sorted(root.iterdir()):
        f = sub / "job_info.json"
        if not f.exists():
            continue
        data, checksum = leer_json(f, None)
        if data is None:
            c["errores"].append(f"No se pudo leer {f}")
            continue
        c["archivos_procesados"].append({"ruta": str(f), "registros": 1, "checksum": checksum or ""})
        data = dict(data)
        data.setdefault("job_number", sub.name)
        upsert_lista(session, db.Job, [data], "job_number",
                     lambda r: {"customer": r.get("customer"), "status": r.get("status")}, c)


def migrar_por_anio(session, rep, nombre_coleccion, carpeta, patron, modelo, campo_llave_json, extra_cols_fn):
    """campo_llave_json puede ser el nombre de un campo del JSON (str), o una
    función fn(registro, year) para llaves compuestas por año (ej. cuando el
    mismo 'employee'/'clave' se repite en archivos de años distintos)."""
    c = rep.nueva_coleccion(nombre_coleccion)
    for year, f in archivos_por_anio(carpeta, patron):
        data, checksum = leer_json(f, [])
        if not isinstance(data, list):
            c["errores"].append(f"{f} no contiene una lista — se omite")
            continue
        c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
        llave_para_este_anio = (lambda r, y=year: campo_llave_json(r, y)) if callable(campo_llave_json) else campo_llave_json
        upsert_lista(session, modelo, data, llave_para_este_anio,
                     lambda r, y=year: dict(extra_cols_fn(r), year=y), c)


def migrar_fx(session, rep):
    c = rep.nueva_coleccion("fx_rates")
    root = Path(DATA_DIR) / "FX"
    import re
    for year, f in archivos_por_anio(root, r"^fx_(\d{4})\.json$"):
        data, checksum = leer_json(f, {})
        if not isinstance(data, dict):
            c["errores"].append(f"{f} no contiene un diccionario — se omite")
            continue
        c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
        for fecha, rate in data.items():
            c["registros_encontrados"] += 1
            existente = session.query(db.FXRate).filter(db.FXRate.fecha == fecha).one_or_none()
            payload = {"fecha": fecha, "rate": rate}
            if existente:
                existente.data = payload; existente.year = year; existente.updated_at = db.now()
                c["registros_actualizados"] += 1
            else:
                session.add(db.FXRate(data=payload, fecha=fecha, year=year))
                c["registros_insertados"] += 1


def migrar_lista_simple(session, rep, nombre_coleccion, archivo, modelo, campo_llave_json, extra_cols_fn):
    """Para colecciones de un solo archivo con una lista de registros."""
    c = rep.nueva_coleccion(nombre_coleccion)
    f = Path(DATA_DIR) / archivo
    data, checksum = leer_json(f, [])
    if not isinstance(data, list):
        if data:  # el archivo existe pero no es lista
            c["errores"].append(f"{f} no contiene una lista")
        return
    if f.exists():
        c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
    upsert_lista(session, modelo, data, campo_llave_json, extra_cols_fn, c)


def migrar_lista_simple_por_hash(session, rep, nombre_coleccion, archivo, modelo, extra_cols_fn):
    """Como migrar_lista_simple, pero para colecciones sin llave natural de un
    solo campo (usa ContentHashMixin en el modelo)."""
    c = rep.nueva_coleccion(nombre_coleccion)
    f = Path(DATA_DIR) / archivo
    data, checksum = leer_json(f, [])
    if not isinstance(data, list):
        if data:
            c["errores"].append(f"{f} no contiene una lista")
        return
    if f.exists():
        c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
    upsert_lista_por_hash(session, modelo, data, extra_cols_fn, c)


def migrar_dict_simple(session, rep, nombre_coleccion, archivo, modelo, campo_llave_modelo, extra_cols_fn=None):
    """Para colecciones de un solo archivo con un diccionario {llave: registro}."""
    c = rep.nueva_coleccion(nombre_coleccion)
    f = Path(DATA_DIR) / archivo
    data, checksum = leer_json(f, {})
    if not isinstance(data, dict):
        if data:
            c["errores"].append(f"{f} no contiene un diccionario")
        return
    if f.exists():
        c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
    upsert_dict_como_filas(session, modelo, data, campo_llave_modelo, extra_cols_fn, c)


def migrar_documento_unico(session, rep, nombre_coleccion, archivo, modelo, campo_llave_modelo, llave_fija):
    c = rep.nueva_coleccion(nombre_coleccion)
    f = Path(DATA_DIR) / archivo
    data, checksum = leer_json(f, None)
    if data is None:
        return
    c["archivos_procesados"].append({"ruta": str(f), "registros": 1, "checksum": checksum or ""})
    upsert_singleton_dict(session, modelo, campo_llave_modelo, llave_fija, data, c)


# ══════════════════════════════════════════════════════════════════
#  TABLA MAESTRA — qué colecciones existen y cómo migrarlas
# ══════════════════════════════════════════════════════════════════
COLECCIONES_DISPONIBLES = [
    "jobs", "hourly_rates", "purchase_orders", "invoiced_pos", "fx_rates",
    "work_hours", "personal", "areas", "perfiles", "vacaciones", "permisos",
    "sueldos", "isr_tablas", "nomina_periodos", "nomina_recibos",
    "control_horas_firmas", "control_horas_exports", "stock", "reassign_orders",
    "recovery", "movimientos_stock", "capacidad", "ops_capacidad_codigos",
    "ordenes_servicio", "tareas_asignadas", "esquemas_tributarios", "recepciones",
    "procesar_compra", "cpp", "pagos", "cpc", "project_configs", "ingresos",
    "apartados", "salidas", "viaticos", "gastos_viaje", "envios", "users",
    "users_auth", "doc_counters", "pt_numbers", "sv_numbers", "proveedores",
    "generated_pos", "catalogos_compra",
]


from contextlib import contextmanager

@contextmanager
def _punto_control(session, rep):
    """Aísla los cambios de UNA colección con un SAVEPOINT — si algo falla,
    solo esa colección se revierte y queda marcada con el error; el resto de
    la migración sigue adelante y sí se guarda. Antes, un solo error tumbaba
    la migración completa y había que reintentar todo desde cero."""
    sp = session.begin_nested()
    try:
        yield
        sp.commit()
    except Exception as e:
        sp.rollback()
        if rep.colecciones:
            rep.colecciones[-1]["errores"].append(
                f"Se omitió esta colección por un error de base de datos (el resto de la migración continuó): {e}")
        else:
            rep.errores_globales.append(f"Error antes de poder identificar la colección: {e}")


def ejecutar_migracion(session, rep, solo=None):
    incluir = lambda nombre: (solo is None or nombre in solo)

    if incluir("jobs"):
        with _punto_control(session, rep):
            migrar_jobs(session, rep)

    if incluir("hourly_rates"):
        with _punto_control(session, rep):
            migrar_por_anio(session, rep, "hourly_rates", Path(DATA_DIR) / "HOUR_RATE", r"^rates_(\d{4})\.json$",
                             db.HourlyRate, lambda r, y: f"{y}_{r.get('employee')}", lambda r: {"employee": r.get("employee")})
    if incluir("purchase_orders"):
        with _punto_control(session, rep):
            migrar_por_anio(session, rep, "purchase_orders", Path(DATA_DIR) / "IPOs", r"^po_(\d{4})\.json$",
                             db.PurchaseOrder, lambda r, y: f"{y}_{r.get('clave')}",
                             lambda r: {"po_number": str(r.get("clave") or ""), "job": r.get("entregar_a")})
    if incluir("invoiced_pos"):
        with _punto_control(session, rep):
            migrar_por_anio(session, rep, "invoiced_pos", Path(DATA_DIR) / "IVPs", r"^ivp_(\d{4})\.json$",
                             db.InvoicedPO, "clave", lambda r: {"job": r.get("job")})
    if incluir("fx_rates"):
        with _punto_control(session, rep):
            migrar_fx(session, rep)

    if incluir("work_hours"):
        with _punto_control(session, rep):
            migrar_por_anio(session, rep, "work_hours", Path(DATA_DIR) / "WHs", r"^wh_(\d{4})\.json$",
                             db.WorkHour, lambda r, y: f"{y}_{r.get('id')}",
                             lambda r: {"source_id": r.get("id"), "employee": r.get("employee"),
                                        "job": r.get("work_code") or r.get("job"),
                                        "date_worked": r.get("date_worked")})
    if incluir("personal"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "personal", "PERSONAL/trabajadores.json", db.Personal, "tid",
                                 lambda r: {"nombre": r.get("nombre"), "area": r.get("area")})
    if incluir("areas"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "areas", "PERSONAL/areas.json", db.Area, "nombre", lambda r: {})
    if incluir("perfiles"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "perfiles", "PERSONAL/perfiles.json", db.Perfil, "pid", lambda r: {})
    if incluir("vacaciones"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "vacaciones", "PERSONAL/vacaciones.json", db.Vacacion, "tid")
    if incluir("permisos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "permisos", "PERSONAL/permisos.json", db.Permiso, "id",
                                 lambda r: {"tid": r.get("tid") or r.get("externalId"), "estatus": r.get("estatus")})
    if incluir("sueldos"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "sueldos", "PERSONAL/sueldos.json", db.Sueldo, "tid")
    if incluir("isr_tablas"):
        with _punto_control(session, rep):
            migrar_documento_unico(session, rep, "isr_tablas", "PERSONAL/isr_tablas.json", db.IsrTabla, "periodo", "unico")
    if incluir("nomina_periodos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "nomina_periodos", "PERSONAL/nomina_periodos.json", db.NominaPeriodo, "id", lambda r: {})
    if incluir("nomina_recibos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "nomina_recibos", "PERSONAL/nomina_recibos.json", db.NominaRecibo, "id",
                                 lambda r: {"periodo_id": r.get("periodo_id"), "tid": r.get("tid")})
    if incluir("control_horas_firmas"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "control_horas_firmas", "PERSONAL/control_horas_firmas.json", db.ControlHorasFirma, "report_key")
    if incluir("control_horas_exports"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "control_horas_exports", "PERSONAL/control_horas_exports.json", db.ControlHorasExport, "report_key")

    if incluir("stock"):
        with _punto_control(session, rep):
            migrar_lista_simple_por_hash(session, rep, "stock", "stock.json", db.Stock, lambda r: {"job": r.get("job")})
    if incluir("reassign_orders"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "reassign_orders", "reassign_orders.json", db.ReassignOrder, "order_number", lambda r: {})
    if incluir("recovery"):
        with _punto_control(session, rep):
            migrar_lista_simple_por_hash(session, rep, "recovery", "recovery.json", db.Recovery, lambda r: {"job": r.get("job")})
    if incluir("movimientos_stock"):
        with _punto_control(session, rep):
            migrar_lista_simple_por_hash(session, rep, "movimientos_stock", "movimientos_stock.json", db.MovimientoStock, lambda r: {"job": r.get("job")})
    if incluir("capacidad"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "capacidad", "capacidad.json", db.Capacidad, "tid")
    if incluir("ops_capacidad_codigos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "ops_capacidad_codigos", "capacidad_codigos.json", db.CapacidadCodigo, "codigo", lambda r: {})
    if incluir("ordenes_servicio"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "ordenes_servicio", "ordenes_servicio.json", db.OrdenServicio, "id",
                                 lambda r: {"estatus": r.get("estatus")})
    if incluir("tareas_asignadas"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "tareas_asignadas", "tareas_asignadas.json", db.TareaAsignada, "id",
                                 lambda r: {"estatus": r.get("estatus")})

    if incluir("esquemas_tributarios"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "esquemas_tributarios", "FINANZAS/esquemas_tributarios.json", db.EsquemaTributario, "folio", lambda r: {})
    if incluir("recepciones"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "recepciones", "FINANZAS/recepciones.json", db.Recepcion, "rec_number", lambda r: {"job": r.get("job")})
    if incluir("procesar_compra"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "procesar_compra", "FINANZAS/procesar_compra.json", db.ProcesarCompra, "pur_number", lambda r: {"job": r.get("job")})
    if incluir("cpp"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "cpp", "FINANZAS/cpp.json", db.CPP, "cpp_number", lambda r: {})
    if incluir("pagos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "pagos", "FINANZAS/pagos.json", db.Pago, "pago_number", lambda r: {})
    if incluir("cpc"):
        with _punto_control(session, rep):
            c = rep.nueva_coleccion("cpc")
            root = Path(DATA_DIR) / "CPC"
            import re
            for year, f in archivos_por_anio(root, r"^cpc_(\d{4})\.json$"):
                data, checksum = leer_json(f, [])
                if not isinstance(data, list):
                    c["errores"].append(f"{f} no contiene una lista"); continue
                c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
                upsert_lista(session, db.CPC, data, "id",
                             lambda r, y=year: {"year": y, "job": r.get("job")}, c)

    if incluir("project_configs"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "project_configs", "project_configs.json", db.ProjectConfig, "ptsv", lambda r: {})
    if incluir("ingresos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "ingresos", "ingresos.json", db.Ingreso, "id", lambda r: {})
    if incluir("apartados"):
        with _punto_control(session, rep):
            migrar_lista_simple_por_hash(session, rep, "apartados", "apartados.json", db.Apartado, lambda r: {"part_number": r.get("part_number")})
    if incluir("salidas"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "salidas", "salidas.json", db.Salida, "id", lambda r: {"job": r.get("job")})
    if incluir("viaticos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "viaticos", "viaticos.json", db.Viatico, "id", lambda r: {"job": r.get("job")})
    if incluir("gastos_viaje"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "gastos_viaje", "gastos_viaje.json", db.GastoViaje, "id", lambda r: {"job": r.get("job")})
    if incluir("envios"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "envios", "envios.json", db.Envio, "id", lambda r: {"job": r.get("job")})

    if incluir("users"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "users", "users.json", db.User, "username")
    if incluir("users_auth"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "users_auth", "users_auth.json", db.UserAuth, "username")
    if incluir("doc_counters"):
        with _punto_control(session, rep):
            migrar_dict_simple(session, rep, "doc_counters", "doc_counters.json", db.DocCounter, "prefix")
    if incluir("pt_numbers"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "pt_numbers", "pt_numbers.json", db.PTNumber, "pt_number", lambda r: {})
    if incluir("sv_numbers"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "sv_numbers", "sv_numbers.json", db.SVNumber, "sv_number", lambda r: {})
    if incluir("proveedores"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "proveedores", "proveedores.json", db.Proveedor, "clave", lambda r: {"nombre": r.get("nombre")})
    if incluir("generated_pos"):
        with _punto_control(session, rep):
            migrar_lista_simple(session, rep, "generated_pos", "generated_pos.json", db.GeneratedPO, "po_number", lambda r: {})
    if incluir("catalogos_compra"):
        with _punto_control(session, rep):
            c = rep.nueva_coleccion("catalogos_compra")
            for familia, archivo in [("electrico", "catalogo_electrico.json"), ("mecanico", "catalogo_mecanico.json"),
                                      ("servicios", "catalogo_servicios.json")]:
                f = Path(DATA_DIR) / archivo
                data, checksum = leer_json(f, [])
                if not isinstance(data, list):
                    continue
                if f.exists():
                    c["archivos_procesados"].append({"ruta": str(f), "registros": len(data), "checksum": checksum or ""})
                upsert_lista_por_hash(session, db.CatalogoCompra, data, lambda r, fam=familia: {"familia": fam}, c)


# ══════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════
def main():
    ap = argparse.ArgumentParser(description="Migra los JSON de Persico Suite hacia PostgreSQL (idempotente).")
    ap.add_argument("--only", help="Lista separada por comas de colecciones a migrar (por defecto: todas)")
    ap.add_argument("--dry-run", action="store_true", help="Solo cuenta y reporta, no escribe nada en la base de datos")
    ap.add_argument("--no-backup", action="store_true", help="Omite el respaldo previo de DATA_DIR (no recomendado)")
    args = ap.parse_args()

    solo = set(x.strip() for x in args.only.split(",")) if args.only else None
    if solo:
        desconocidas = solo - set(COLECCIONES_DISPONIBLES)
        if desconocidas:
            print(f"⚠ Colecciones desconocidas en --only: {desconocidas}")
            print(f"  Disponibles: {', '.join(COLECCIONES_DISPONIBLES)}")
            sys.exit(1)

    if not db.DB_ENABLED:
        print("✗ DATABASE_URL no está configurada. Configúrala antes de correr este script.")
        sys.exit(1)

    print(f"DATA_DIR: {DATA_DIR}")
    print(f"Base de datos destino: {db.DATABASE_URL.split('@')[-1] if '@' in db.DATABASE_URL else '(oculta)'}")
    print(f"Modo: {'DRY-RUN (no se escribe nada)' if args.dry_run else 'REAL'}")
    print(f"Colecciones: {'TODAS' if not solo else ', '.join(sorted(solo))}")
    print()

    if not args.no_backup and not args.dry_run:
        hacer_respaldo()
    elif args.no_backup:
        print("⚠ Se omitió el respaldo previo (--no-backup) — no recomendado.")

    db.init_db()  # crea tablas que no existan; nunca borra ni modifica una existente

    rep = Reporte()
    session = db.get_session()
    try:
        ejecutar_migracion(session, rep, solo=solo)
        if args.dry_run:
            session.rollback()
            print("DRY-RUN: se descartaron todos los cambios (no se escribió nada en la base de datos).")
        else:
            session.commit()
            print("Cambios guardados en la base de datos.")
    except Exception as e:
        session.rollback()
        rep.errores_globales.append(f"Migración abortada por error no manejado: {e}")
        raise
    finally:
        session.close()

    rep.imprimir()
    reporte_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        f"migration_report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )
    rep.guardar_json(reporte_path)


if __name__ == "__main__":
    main()
