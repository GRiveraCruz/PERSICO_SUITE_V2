"""
Persico Mex — Suite Unificada
===============================
Combina:  Job Register         (orig. puerto 5001)
          Hourly Rate Register  (orig. puerto 5002)
          GERC Quote Register   (orig. puerto 5000)
          Purchase Orders       (nuevo módulo)

Ejecutar:  python app.py
Acceso:    http://<IP-del-servidor>:5000
"""

import io, json, re, datetime, shutil, hashlib
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, Response, session, redirect, url_for
from threading import Lock
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# ══════════════════════════════════════════════════════════════════
#  CONFIG  — rutas locales / volumen persistente (Railway)
# ══════════════════════════════════════════════════════════════════
import os as _os
_BASE = _os.path.dirname(_os.path.abspath(__file__))

# En Railway: setear variable DATA_DIR apuntando al mount path del volumen.
# Localmente: usa la carpeta data/ junto al .py (Windows/Mac/Linux).
_DATA = _os.environ.get("DATA_DIR", _os.path.join(_BASE, "data"))

# Seed automático: si el volumen está vacío, copiamos los datos iniciales
_SEED = _os.path.join(_BASE, "data_seed")
if _os.path.isdir(_SEED) and not _os.path.exists(_os.path.join(_DATA, "JOBs")):
    import shutil as _shutil
    print(f"[INIT] Volumen vacío — copiando datos iniciales: data_seed/ → {_DATA}")
    _shutil.copytree(_SEED, _DATA, dirs_exist_ok=True)
    print("[INIT] Seed OK")

JOBS_FOLDER  = _os.path.join(_DATA, "JOBs")
RATES_FOLDER = _os.path.join(_DATA, "HOUR_RATE")
XLSM_PATH    = _os.path.join(_DATA, "QUOTE_REG", "quotes.json")   # migrado a JSON
QUOTE_BASE   = _os.path.join(_DATA, "QUOTE_REG")
PO_FOLDER    = _os.path.join(_DATA, "IPOs")
FX_FOLDER    = _os.path.join(_DATA, "FX")

HOST         = "0.0.0.0"
PORT         = int(_os.environ.get("PORT", 5000))
CURRENT_YEAR = datetime.date.today().year

# Quote Register constants
QUOTE_DATA_ROW = 4
QUOTE_MAX_ROWS = 200
# ══════════════════════════════════════════════════════════════════

app  = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = _os.environ.get("SECRET_KEY", "persico-suite-secret-2026")
lock = Lock()
JOB_RE = re.compile(r"^\d+-\d+$")

# ══════════════════════════════════════════════════════════════════
#  AUTH — usuarios con contraseña
# ══════════════════════════════════════════════════════════════════
def _hash(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

# Usuarios definidos como variables de entorno en Railway:
# USER1=guillermo:MiPassword1  USER2=luz:MiPassword2  etc.
# Si no hay variables definidas, usa estos defaults (cámbialos antes de hacer deploy)
_DEFAULT_USERS = {
    "guillermo": _hash("Persico2026!"),
    "luz":       _hash("Persico2026!"),
    "pablo":     _hash("Persico2026!"),
    "omar":      _hash("Persico2026!"),
}

def _load_users():
    users = {}
    for i in range(1, 10):
        val = _os.environ.get(f"USER{i}", "")
        if ":" in val:
            u, p = val.split(":", 1)
            users[u.strip()] = _hash(p.strip())
    return users if users else _DEFAULT_USERS

def _check_login(username, password):
    users = _load_users()
    return users.get(username) == _hash(password)

def _login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "no autenticado"}), 401
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated

@app.route("/login", methods=["GET", "POST"])
def login():
    error = ""
    if request.method == "POST":
        u = request.form.get("username", "").strip()
        p = request.form.get("password", "").strip()
        if _check_login(u, p):
            session["user"] = u
            return redirect("/")
        error = "Usuario o contraseña incorrectos"
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Persico Suite — Login</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: Arial, sans-serif; background: #1a1a2e; display: flex;
            justify-content: center; align-items: center; min-height: 100vh; }}
    .card {{ background: #16213e; border-radius: 12px; padding: 40px;
             width: 360px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }}
    h2 {{ color: #e2e8f0; text-align: center; margin-bottom: 8px; font-size: 22px; }}
    p.sub {{ color: #718096; text-align: center; margin-bottom: 28px; font-size: 13px; }}
    label {{ color: #a0aec0; font-size: 13px; display: block; margin-bottom: 6px; }}
    input {{ width: 100%; padding: 10px 14px; border-radius: 8px;
             border: 1px solid #2d3748; background: #0f3460; color: #e2e8f0;
             font-size: 14px; margin-bottom: 18px; outline: none; }}
    input:focus {{ border-color: #4299e1; }}
    button {{ width: 100%; padding: 12px; background: #3182ce; color: white;
              border: none; border-radius: 8px; font-size: 15px;
              cursor: pointer; font-weight: bold; }}
    button:hover {{ background: #2b6cb0; }}
    .error {{ background: #742a2a; color: #feb2b2; padding: 10px 14px;
              border-radius: 8px; font-size: 13px; margin-bottom: 18px;
              text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <h2>Persico Suite</h2>
    <p class="sub">Inicia sesión para continuar</p>
    {'<div class="error">' + error + '</div>' if error else ''}
    <form method="POST">
      <label>Usuario</label>
      <input type="text" name="username" autocomplete="username" required>
      <label>Contraseña</label>
      <input type="password" name="password" autocomplete="current-password" required>
      <button type="submit">Entrar</button>
    </form>
  </div>
</body>
</html>'''

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# ══════════════════════════════════════════════════════════════════
#  SHARED HELPERS
# ══════════════════════════════════════════════════════════════════
def to_str(v):
    if v is None: return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, bool): return v
    return str(v).strip() or None

def esc_csv(s):
    return str(s or "").replace(",", "")

# ══════════════════════════════════════════════════════════════════
#  JOB REGISTER HELPERS
# ══════════════════════════════════════════════════════════════════
def validate_subindex(sub):
    try:
        n = int(sub)
    except ValueError:
        return False
    return (n == 0 or n == 1 or (2 <= n <= 50) or
            (51 <= n <= 60) or (61 <= n <= 97) or n == 99)

def subindex_label(sub):
    try:
        n = int(sub)
    except ValueError:
        return "Desconocido"
    if n == 0:           return "Máquina / equipo principal"
    if n == 1:           return "Instalación y puesta en marcha"
    if 2  <= n <= 50:    return f"Cambio de ingeniería ({n:02d})"
    if 51 <= n <= 60:    return f"Refacción pagada por cliente ({n})"
    if 61 <= n <= 97:    return f"Servicio pagado por cliente ({n})"
    if n == 99:          return "Servicio de garantía"
    return "Índice no válido"

def jobs_root(): return Path(JOBS_FOLDER)
def job_folder(job_number): return jobs_root() / job_number
def meta_path(job_number): return job_folder(job_number) / "job_info.json"

def read_meta(job_number):
    mp = meta_path(job_number)
    if mp.exists():
        try:
            with open(mp, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    parts = job_number.split("-")
    sub = parts[1] if len(parts) > 1 else "00"
    return {
        "job_number": job_number,
        "main_index": int(parts[0]) if parts[0].isdigit() else 0,
        "subindex": sub.zfill(2),
        "subindex_label": subindex_label(sub),
        "customer": "", "pm": "", "description": "",
        "product_group": "", "product_subgroup": "",
        "revenue": 0, "estimated_cost": 0,
        "po_number": "", "ship_date": "",
        "approval_fc": "ToApprove", "status": "Open",
        "notes": "", "created_at": "",
    }

def write_meta(job_number, data):
    with open(meta_path(job_number), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

def scan_jobs():
    root = jobs_root()
    if not root.exists(): return []
    result = []
    for item in sorted(root.iterdir()):
        if item.is_dir() and JOB_RE.match(item.name):
            result.append(read_meta(item.name))
    result.sort(key=lambda j: (j.get("main_index", 0), int(j.get("subindex", "0"))))
    return result

def next_main_index():
    root = jobs_root()
    if not root.exists(): return 100
    indices = []
    for item in root.iterdir():
        if item.is_dir() and JOB_RE.match(item.name):
            try: indices.append(int(item.name.split("-")[0]))
            except ValueError: pass
    return max(indices) + 1 if indices else 100

def all_job_numbers():
    root = jobs_root()
    if not root.exists(): return set()
    return {item.name for item in root.iterdir()
            if item.is_dir() and JOB_RE.match(item.name)}

def extract_customer(full_addr):
    if not full_addr: return ""
    s = str(full_addr).strip()
    m = re.match(r'^([A-Z][A-Z &]+)-', s)
    if m: return m.group(1).strip()
    return re.split(r'[,\n]', s)[0].strip()[:60]

# ══════════════════════════════════════════════════════════════════
#  HOURLY RATE HELPERS
# ══════════════════════════════════════════════════════════════════
def rates_root(): return Path(RATES_FOLDER)
def rates_file(year): return rates_root() / f"rates_{year}.json"

def load_rates(year):
    p = rates_file(year)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_rates(year, records):
    root = rates_root()
    root.mkdir(parents=True, exist_ok=True)
    with open(rates_file(year), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2, default=str)

def available_years():
    root = rates_root()
    if not root.exists(): return []
    years = []
    for p in root.iterdir():
        m = re.match(r"^rates_(\d{4})\.json$", p.name)
        if m: years.append(int(m.group(1)))
    return sorted(years, reverse=True)

def normalize_name(name):
    return re.sub(r"\s+", " ", str(name).strip().upper())

# ══════════════════════════════════════════════════════════════════
#  QUOTE REGISTER HELPERS
# ══════════════════════════════════════════════════════════════════
# (Quote Register migrado a JSON — sin dependencia de .xlsm)

def _int_or_none(v):
    try: return int(v) if v not in (None, "", "0", 0) else None
    except: return None

def _gen_qnum(records):
    seq = len(records) + 1
    return f"Q-{datetime.date.today().year}-{seq:03d}"

def _quotes_path():
    p = Path(QUOTE_BASE)
    p.mkdir(parents=True, exist_ok=True)
    return p / "quotes.json"

def _load_quotes():
    p = _quotes_path()
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_quotes(records):
    with open(_quotes_path(), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2, default=str)

def read_quote_records():
    with lock:
        records = _load_quotes()
        for i, r in enumerate(records):
            r["row"] = i   # row = índice lógico, compatible con la API existente
        return records

def write_quote_record(data, target_row=None):
    with lock:
        records = _load_quotes()
        if target_row is None:
            qnum = data.get("qnum") or _gen_qnum(records)
            rec = {
                "qnum":       qnum,
                "customer":   data.get("customer", ""),
                "desc":       data.get("desc", ""),
                "machine":    _int_or_none(data.get("machine")),
                "tool":       _int_or_none(data.get("tool")),
                "machTool":   _int_or_none(data.get("machTool")),
                "robotic":    _int_or_none(data.get("robotic")),
                "service":    _int_or_none(data.get("service")),
                "rfq":        data.get("rfq") or None,
                "received":   data.get("received") or None,
                "done":       bool(data.get("done")),
                "sentMgmt":   data.get("sentMgmt") or None,
                "sentClient": data.get("sentClient") or None,
                "notes":      data.get("notes") or None,
                "awarded":    bool(data.get("awarded")),
                "created_at": datetime.datetime.now().isoformat(),
            }
            records.append(rec)
            idx = len(records) - 1
        else:
            idx  = target_row
            if idx < 0 or idx >= len(records):
                raise ValueError(f"Fila {target_row} fuera de rango")
            rec  = records[idx]
            qnum = data.get("qnum", rec.get("qnum"))
            rec.update({
                "qnum":       qnum,
                "customer":   data.get("customer", rec.get("customer", "")),
                "desc":       data.get("desc", rec.get("desc", "")),
                "machine":    _int_or_none(data.get("machine")),
                "tool":       _int_or_none(data.get("tool")),
                "machTool":   _int_or_none(data.get("machTool")),
                "robotic":    _int_or_none(data.get("robotic")),
                "service":    _int_or_none(data.get("service")),
                "rfq":        data.get("rfq") or None,
                "received":   data.get("received") or None,
                "done":       bool(data.get("done")),
                "sentMgmt":   data.get("sentMgmt") or None,
                "sentClient": data.get("sentClient") or None,
                "notes":      data.get("notes") or None,
                "awarded":    bool(data.get("awarded")),
                "updated_at": datetime.datetime.now().isoformat(),
            })
        _save_quotes(records)
        rec["row"] = idx
        return rec

def delete_quote_record(target_row):
    with lock:
        records = _load_quotes()
        if 0 <= target_row < len(records):
            records.pop(target_row)
            _save_quotes(records)

# ══════════════════════════════════════════════════════════════════
#  ROUTES — GENERAL
# ══════════════════════════════════════════════════════════════════
@app.before_request
def require_login():
    public = ("/login", "/logout")
    if request.path in public:
        return None
    if not session.get("user"):
        if request.path.startswith("/api/"):
            return jsonify({"error": "no autenticado"}), 401
        return redirect("/login")

@app.route("/")
@_login_required
def index():
    return send_from_directory("static", "index.html")

@app.route("/api/ping")
def ping():
    jobs_ok   = jobs_root().exists()
    rates_ok  = rates_root().exists()
    quotes_file = _quotes_path()
    xlsm_ok   = quotes_file.exists()
    quote_ok  = Path(QUOTE_BASE).exists()
    po_ok     = Path(PO_FOLDER).exists()
    job_count = 0
    if jobs_ok:
        job_count = sum(1 for f in jobs_root().iterdir()
                        if f.is_dir() and JOB_RE.match(f.name))
    return jsonify({
        "jobs_folder":  JOBS_FOLDER,
        "jobs_ok":      jobs_ok,
        "job_count":    job_count,
        "rates_folder": RATES_FOLDER,
        "rates_ok":     rates_ok,
        "years":        available_years(),
        "current_year": CURRENT_YEAR,
        "xlsm_path":    str(quotes_file),
        "xlsm_ok":      xlsm_ok,
        "quote_base":   QUOTE_BASE,
        "quote_ok":     quote_ok,
        "po_folder":    PO_FOLDER,
        "cpo_folder":   CPO_FOLDER,
        "cpo_ok":       Path(CPO_FOLDER).exists(),
        "po_ok":        po_ok,
        "wh_folder":    WH_FOLDER,
        "wh_ok":        Path(WH_FOLDER).exists(),
        "ivp_folder":   IVP_FOLDER,
        "ivp_ok":       Path(IVP_FOLDER).exists(),
        "fx_folder":    FX_FOLDER,
        "fx_ok":        Path(FX_FOLDER).exists(),
    })

# ══════════════════════════════════════════════════════════════════
#  ROUTES — JOB REGISTER  (/api/jobs/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/jobs", methods=["GET"])
def api_get_jobs():
    try: return jsonify(scan_jobs())
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/next-index", methods=["GET"])
def api_next_index():
    try: return jsonify({"next": next_main_index()})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/jobs", methods=["POST"])
def api_create_job():
    try:
        data = request.json
        sub  = str(data.get("subindex", "00")).zfill(2)
        if not validate_subindex(sub):
            return jsonify({"error": f"Subíndice '{sub}' no válido."}), 400
        with lock:
            # Soporte para asociar a job existente (main_index_override)
            main_override = data.get("main_index_override")
            if main_override is not None:
                main = int(main_override)
            else:
                main = next_main_index()
            job_number = f"{main}-{sub}"
            if job_number in all_job_numbers():
                return jsonify({"error": f"El Job {job_number} ya existe."}), 409
            folder = job_folder(job_number)
            try: folder.mkdir(parents=True, exist_ok=True)
            except Exception as fe:
                return jsonify({"error": f"No se pudo crear carpeta en NAS: {fe}"}), 500
            record = {
                "job_number": job_number, "main_index": main,
                "subindex": sub, "subindex_label": subindex_label(sub),
                "customer": data.get("customer", ""),
                "pm": data.get("pm", ""),
                "description": data.get("description", ""),
                "product_group": data.get("product_group", ""),
                "product_subgroup": data.get("product_subgroup", ""),
                "revenue": data.get("revenue", 0),
                "estimated_cost": data.get("estimated_cost", 0),
                "po_number": data.get("po_number", ""),
                "ship_date": data.get("ship_date", ""),
                "approval_fc": data.get("approval_fc", "ToApprove"),
                "status": data.get("status", "Open"),
                "notes": data.get("notes", ""),
                "created_at": datetime.datetime.now().isoformat(),
            }
            write_meta(job_number, record)
            return jsonify(record), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/jobs/<job_number>", methods=["PUT"])
def api_update_job(job_number):
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    try:
        data = request.json
        with lock:
            if not job_folder(job_number).exists():
                return jsonify({"error": "Job no encontrado"}), 404
            meta = read_meta(job_number)
            for k in ["customer","pm","description","product_group","product_subgroup",
                      "revenue","estimated_cost","po_number","ship_date",
                      "approval_fc","status","notes"]:
                if k in data: meta[k] = data[k]
            meta["updated_at"] = datetime.datetime.now().isoformat()
            write_meta(job_number, meta)
            return jsonify(meta)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/jobs/<job_number>", methods=["DELETE"])
def api_delete_job(job_number):
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    try:
        folder = job_folder(job_number)
        if folder.exists():
            import shutil as _shutil
            _shutil.rmtree(str(folder))
        return jsonify({"ok": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/files/<job_number>", methods=["GET"])
def api_list_job_files(job_number):
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    folder = job_folder(job_number)
    if not folder.exists(): return jsonify([])
    files = []
    for f in sorted(folder.iterdir()):
        if f.is_file() and f.name != "job_info.json":
            st = f.stat()
            files.append({
                "name": f.name, "size": st.st_size,
                "modified": datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M"),
            })
    return jsonify(files)

@app.route("/api/files/<job_number>", methods=["POST"])
def api_upload_job_file(job_number):
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    folder = job_folder(job_number)
    try: folder.mkdir(parents=True, exist_ok=True)
    except Exception as e: return jsonify({"error": f"No se pudo acceder a la carpeta: {e}"}), 500
    saved = []
    for f in request.files.getlist("files"):
        dest = folder / f.filename
        f.save(str(dest))
        saved.append({"name": f.filename, "size": dest.stat().st_size})
    return jsonify({"saved": saved})

@app.route("/api/files/<job_number>/<filename>", methods=["GET"])
def api_download_job_file(job_number, filename):
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    folder = job_folder(job_number)
    if not (folder / filename).exists():
        return jsonify({"error": "Archivo no encontrado"}), 404
    return send_from_directory(str(folder), filename, as_attachment=True)

@app.route("/api/files/<job_number>/<filename>", methods=["DELETE"])
def api_delete_job_file(job_number, filename):
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    target = job_folder(job_number) / filename
    if target.exists() and target.is_file() and target.name != "job_info.json":
        target.unlink()
        return jsonify({"ok": True})
    return jsonify({"error": "Archivo no encontrado"}), 404

@app.route("/api/import-jobs-excel", methods=["POST"])
def api_import_jobs_excel():
    try:
        f = request.files.get("file")
        if not f: return jsonify({"error": "No se recibió archivo"}), 400
        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        ws = wb.active
        headers = {}
        for cell in next(ws.iter_rows(min_row=1, max_row=1)):
            if cell.value: headers[str(cell.value).strip()] = cell.column - 1

        def col(*aliases):
            for a in aliases:
                if a in headers: return headers[a]
            return None

        ci_job  = col("Job Number", "Job Sequnce#", "Job #")
        ci_pm   = col("PM Assig.", "PM", "PM Assigned")
        ci_desc = col("Job Description", "Description")
        ci_cust = col("Customer and Ship To:", "Customer", "Customer/Ship To")
        ci_rev  = col("Revenue Amount:", "Revenue Amount", "Revenue")
        ci_cost = col("Estimated Cost:", "Estimated Cost", "Cost")
        ci_fc   = col("Approval By FC", "Approval FC", "FC")
        ci_pg   = col("Product Group")
        ci_psg  = col("Product SubGroup", "Product Subgroup")
        ci_po   = col("PO Number", "PO #")
        ci_ship = col("Ship Date")
        ci_date = col("Date Created", "Created")
        ci_note = col("Notes")

        if ci_job is None:
            return jsonify({"error": "No se encontró la columna 'Job Number' en el Excel"}), 400

        year_filter = request.form.get("year", "")
        try: year_filter = int(year_filter) if year_filter else None
        except ValueError: year_filter = None

        def cv(row_vals, idx):
            if idx is None or idx >= len(row_vals): return None
            return row_vals[idx]
        def ts(v): return str(v).strip() if v is not None else ""
        def tf(v):
            try: return float(v) if v is not None else 0
            except: return 0
        def td(v):
            if v is None: return ""
            if hasattr(v, "strftime"): return v.strftime("%Y-%m-%d")
            return str(v)[:10]

        existing = all_job_numbers()
        results  = {"created": [], "skipped": [], "errors": []}

        for row in ws.iter_rows(min_row=2, values_only=True):
            row = list(row)
            job_number = ts(cv(row, ci_job)).strip()
            if not job_number or not JOB_RE.match(job_number): continue
            if year_filter and ci_date is not None:
                raw_date = cv(row, ci_date)
                if raw_date and hasattr(raw_date, "year"):
                    if raw_date.year < year_filter:
                        results["skipped"].append({"job": job_number, "reason": f"Año {raw_date.year} < {year_filter}"})
                        continue
            if job_number in existing:
                results["skipped"].append({"job": job_number, "reason": "Ya existe"})
                continue
            parts = job_number.split("-")
            sub = parts[1].zfill(2) if len(parts) > 1 else "00"
            meta = {
                "job_number": job_number,
                "main_index": int(parts[0]) if parts[0].isdigit() else 0,
                "subindex": sub, "subindex_label": subindex_label(sub),
                "customer": extract_customer(ts(cv(row, ci_cust))),
                "customer_full": ts(cv(row, ci_cust)),
                "pm": ts(cv(row, ci_pm)),
                "description": ts(cv(row, ci_desc)),
                "product_group": ts(cv(row, ci_pg)),
                "product_subgroup": ts(cv(row, ci_psg)),
                "revenue": tf(cv(row, ci_rev)),
                "estimated_cost": tf(cv(row, ci_cost)),
                "po_number": ts(cv(row, ci_po)),
                "ship_date": td(cv(row, ci_ship)),
                "approval_fc": ts(cv(row, ci_fc)) or "ToApprove",
                "status": "Open", "notes": ts(cv(row, ci_note)),
                "created_at": td(cv(row, ci_date)), "imported": True,
            }
            with lock:
                folder = job_folder(job_number)
                try:
                    folder.mkdir(parents=True, exist_ok=True)
                    write_meta(job_number, meta)
                    existing.add(job_number)
                    results["created"].append(job_number)
                except Exception as fe:
                    results["errors"].append({"job": job_number, "error": str(fe)})

        results["summary"] = {
            "created": len(results["created"]),
            "skipped": len(results["skipped"]),
            "errors":  len(results["errors"]),
        }
        return jsonify(results)
    except Exception as e: return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════
#  ROUTES — HOURLY RATE  (/api/rates/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/rates", methods=["GET"])
def api_get_rates():
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        data = load_rates(year)
        return jsonify({"year": year, "records": data, "available_years": available_years()})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/rates", methods=["POST"])
def api_save_rates():
    try:
        payload = request.json
        year    = int(payload.get("year", CURRENT_YEAR))
        records = payload.get("records", [])
        for r in records:
            if not r.get("employee"):
                return jsonify({"error": "Todos los registros deben tener un nombre de empleado"}), 400
            try: float(r["rate"])
            except (ValueError, TypeError):
                return jsonify({"error": f"Tarifa inválida para {r.get('employee')}"}), 400
        with lock: save_rates(year, records)
        return jsonify({"ok": True, "year": year, "count": len(records)})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/rates/employee", methods=["PUT"])
def api_update_employee():
    try:
        data     = request.json
        year     = int(data.get("year", CURRENT_YEAR))
        employee = str(data.get("employee", "")).strip()
        rate     = float(data.get("rate", 0))
        dept     = str(data.get("department", "")).strip()
        notes    = str(data.get("notes", "")).strip()
        if not employee: return jsonify({"error": "Nombre de empleado requerido"}), 400
        with lock:
            records = load_rates(year)
            norm = normalize_name(employee)
            found = False
            for r in records:
                if normalize_name(r["employee"]) == norm:
                    r["rate"] = rate; r["department"] = dept; r["notes"] = notes
                    r["updated_at"] = datetime.datetime.now().isoformat()
                    found = True; break
            if not found:
                records.append({
                    "employee": employee, "rate": rate,
                    "department": dept, "notes": notes,
                    "created_at": datetime.datetime.now().isoformat(),
                })
            save_rates(year, records)
            return jsonify({"ok": True, "found": found, "records": records})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/rates/employee", methods=["DELETE"])
def api_delete_employee():
    try:
        data = request.json
        year = int(data.get("year", CURRENT_YEAR))
        norm = normalize_name(str(data.get("employee", "")).strip())
        with lock:
            records = load_rates(year)
            before  = len(records)
            records = [r for r in records if normalize_name(r["employee"]) != norm]
            save_rates(year, records)
        return jsonify({"ok": True, "removed": before - len(records)})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/rates/copy-year", methods=["POST"])
def api_copy_year():
    try:
        data        = request.json
        source_year = int(data.get("source_year"))
        target_year = int(data.get("target_year"))
        if source_year == target_year:
            return jsonify({"error": "El año origen y destino deben ser distintos"}), 400
        with lock:
            src = load_rates(source_year)
            if not src: return jsonify({"error": f"No hay tarifas para {source_year}"}), 404
            if rates_file(target_year).exists():
                return jsonify({"error": f"Ya existe una tabla para {target_year}. Elimínala primero."}), 409
            new_records = [{
                "employee": r["employee"], "rate": r["rate"],
                "department": r.get("department", ""), "notes": r.get("notes", ""),
                "copied_from": source_year, "created_at": datetime.datetime.now().isoformat(),
            } for r in src]
            save_rates(target_year, new_records)
        return jsonify({"ok": True, "count": len(new_records), "target_year": target_year})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/import-rates-excel", methods=["POST"])
def api_import_rates_excel():
    try:
        f = request.files.get("file")
        if not f: return jsonify({"error": "No se recibió archivo"}), 400
        year = int(request.form.get("year", CURRENT_YEAR))
        mode = request.form.get("mode", "replace")
        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        ws = wb.active
        headers = {}
        for cell in next(ws.iter_rows(min_row=1, max_row=1)):
            if cell.value: headers[str(cell.value).strip().upper()] = cell.column - 1

        def col(*aliases):
            for a in aliases:
                if a.upper() in headers: return headers[a.upper()]
            return None

        ci_emp  = col("EMPLOYEE", "NOMBRE", "NAME", "EMPLEADO")
        ci_rate = col("HOURLY RATE", "RATE", "TARIFA", "HOURLY_RATE", "HR RATE")
        ci_dept = col("DEPARTMENT", "DEPT", "DEPARTAMENTO", "AREA")
        ci_note = col("NOTES", "NOTE", "NOTAS", "NOTA")

        if ci_emp is None or ci_rate is None:
            return jsonify({"error": "No se encontraron columnas EMPLOYEE / HOURLY RATE en el Excel"}), 400

        imported = []; errors = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            row = list(row)
            emp = str(row[ci_emp]).strip() if row[ci_emp] is not None else ""
            if not emp or emp.upper() == "NONE": continue
            try: rate = float(row[ci_rate]) if row[ci_rate] is not None else 0
            except (ValueError, TypeError):
                errors.append({"employee": emp, "error": "Tarifa no numérica"}); continue
            dept  = str(row[ci_dept]).strip() if ci_dept is not None and row[ci_dept] else ""
            notes = str(row[ci_note]).strip() if ci_note is not None and row[ci_note] else ""
            imported.append({
                "employee": emp, "rate": rate, "department": dept, "notes": notes,
                "imported": True, "created_at": datetime.datetime.now().isoformat(),
            })

        if not imported: return jsonify({"error": "No se encontraron registros válidos en el archivo"}), 400

        with lock:
            if mode == "replace":
                final = imported
            else:
                existing = load_rates(year)
                existing_map = {normalize_name(r["employee"]): r for r in existing}
                for rec in imported:
                    key = normalize_name(rec["employee"])
                    if key in existing_map:
                        existing_map[key]["rate"] = rec["rate"]
                        existing_map[key]["department"] = rec["department"] or existing_map[key].get("department","")
                        existing_map[key]["updated_at"] = rec["created_at"]
                    else:
                        existing_map[key] = rec
                final = list(existing_map.values())
            save_rates(year, final)

        return jsonify({
            "ok": True, "year": year, "mode": mode,
            "imported": len(imported), "total": len(final), "errors": errors,
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/export-rates/<int:year>")
def api_export_rates(year):
    records = load_rates(year)
    lines   = ["EMPLOYEE,HOURLY RATE,DEPARTMENT,NOTES"]
    for r in records:
        lines.append(f"{esc_csv(r.get('employee',''))},{r.get('rate',0)},{esc_csv(r.get('department',''))},{esc_csv(r.get('notes',''))}")
    return Response("\n".join(lines), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=hourly_rates_{year}.csv"})

# ══════════════════════════════════════════════════════════════════
#  ROUTES — QUOTE REGISTER  (/api/quotes/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/quotes", methods=["GET"])
def api_get_quotes():
    try: return jsonify(read_quote_records())
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/quotes", methods=["POST"])
def api_create_quote():
    try:
        data   = request.json
        result = write_quote_record(data, target_row=None)
        return jsonify(result), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/quotes/<int:row>", methods=["PUT"])
def api_update_quote(row):
    try:
        data   = request.json
        result = write_quote_record(data, target_row=row)
        return jsonify(result)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/quotes/<int:row>", methods=["DELETE"])
def api_delete_quote(row):
    try:
        delete_quote_record(row)
        return jsonify({"ok": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/quotes/upload/<qnum>", methods=["POST"])
def api_upload_quote(qnum):
    if not re.match(r"^Q-\d{4}-\d{3}$", qnum):
        return jsonify({"error": "Q-Number inválido"}), 400
    folder = Path(QUOTE_BASE) / qnum
    try: folder.mkdir(parents=True, exist_ok=True)
    except Exception as e: return jsonify({"error": f"No se pudo acceder a la carpeta: {e}"}), 500
    saved = []
    for f in request.files.getlist("files"):
        dest = folder / f.filename
        f.save(str(dest))
        saved.append({"name": f.filename, "size": dest.stat().st_size})
    return jsonify({"saved": saved})

@app.route("/api/quotes/files/<qnum>", methods=["GET"])
def api_list_quote_files(qnum):
    if not re.match(r"^Q-\d{4}-\d{3}$", qnum):
        return jsonify({"error": "Q-Number inválido"}), 400
    folder = Path(QUOTE_BASE) / qnum
    if not folder.exists(): return jsonify([])
    files = []
    for f in sorted(folder.iterdir()):
        if f.is_file():
            st = f.stat()
            files.append({
                "name": f.name, "size": st.st_size,
                "modified": datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M"),
            })
    return jsonify(files)

@app.route("/api/quotes/files/<qnum>/<filename>", methods=["GET"])
def api_download_quote_file(qnum, filename):
    if not re.match(r"^Q-\d{4}-\d{3}$", qnum):
        return jsonify({"error": "Q-Number inválido"}), 400
    folder = Path(QUOTE_BASE) / qnum
    if not (folder / filename).exists():
        return jsonify({"error": "Archivo no encontrado"}), 404
    return send_from_directory(str(folder), filename, as_attachment=True)

@app.route("/api/quotes/files/<qnum>/<filename>", methods=["DELETE"])
def api_delete_quote_file(qnum, filename):
    if not re.match(r"^Q-\d{4}-\d{3}$", qnum):
        return jsonify({"error": "Q-Number inválido"}), 400
    target = Path(QUOTE_BASE) / qnum / filename
    if target.exists() and target.is_file():
        target.unlink()
        return jsonify({"ok": True})
    return jsonify({"error": "Archivo no encontrado"}), 404

@app.route("/api/quotes/import", methods=["POST"])
def api_import_quotes_excel():
    try:
        f = request.files.get("file")
        if not f: return jsonify({"error": "No se recibió archivo"}), 400
        mode = request.form.get("mode", "append")  # append | replace

        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        # Intentar la hoja "QUOTE REGISTER", si no existe usar la activa
        ws = wb["QUOTE REGISTER"] if "QUOTE REGISTER" in wb.sheetnames else wb.active

        # Detectar fila de encabezado (buscar celda con Q-NUMBER o CUSTOMER)
        header_row = None
        for i, row in enumerate(ws.iter_rows(min_row=1, max_row=10, values_only=True), 1):
            row_vals = [str(v).strip().upper() for v in row if v]
            if any(k in row_vals for k in ["Q-NUMBER", "CUSTOMER", "QNUM"]):
                header_row = i
                break
        if header_row is None:
            return jsonify({"error": "No se encontró fila de encabezados (Q-NUMBER / CUSTOMER)"}), 400

        # Mapear columnas
        headers = {}
        for cell in list(ws.iter_rows(min_row=header_row, max_row=header_row, values_only=False))[0]:
            if cell.value:
                headers[str(cell.value).strip().upper().replace("  "," ")] = cell.column - 1

        def col(*aliases):
            for a in aliases:
                if a.upper() in headers: return headers[a.upper()]
            return None

        ci_qnum     = col("Q-NUMBER", "QNUM", "Q NUMBER", "QUOTE")
        ci_cust     = col("CUSTOMER")
        ci_desc     = col("JOB DESCRIPTION", "DESCRIPTION", "DESC")
        ci_machine  = col("MACHINE (BASE)", "MACHINE")
        ci_tool     = col("TOOL / TOLLING", "TOOL", "TOLLING")
        ci_machtool = col("MACHINE & TOOL", "MACHINE & TOOL")
        ci_robotic  = col("ROBOTIC CELL", "ROBOTIC")
        ci_service  = col("SERVICE")
        ci_rfq      = col("RFQ REF.", "RFQ", "RFQ REF")
        ci_received = col("DATE RECEIVED", "RECEIVED")
        ci_done     = col("DONE ✓", "DONE")
        ci_mgmt     = col("SENT TO MANAGEMENT", "SENT MGMT", "SENTMGMT")
        ci_client   = col("SENT TO CUSTOMER", "SENT CUSTOMER", "SENTCLIENT", "SENT TO CLIENT")
        ci_notes    = col("NOTES")
        ci_awarded  = col("AWARDED")

        if ci_cust is None:
            return jsonify({"error": "No se encontró columna CUSTOMER en el Excel"}), 400

        def parse_date(v):
            if v is None: return None
            if isinstance(v, (datetime.date, datetime.datetime)):
                return v.strftime("%Y-%m-%d")
            try:
                # Excel serial date
                base = datetime.date(1899, 12, 30)
                return (base + datetime.timedelta(days=int(float(str(v))))).strftime("%Y-%m-%d")
            except:
                return str(v)[:10] if v else None

        def parse_bool(v):
            if v is None: return False
            if isinstance(v, bool): return v
            return str(v).strip().upper() in ("TRUE", "1", "YES", "SI", "✓", "X")

        def parse_int(v):
            try: return int(v) if v not in (None, "", 0) else None
            except: return None

        imported = []
        errors = []
        for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
            cust = str(row[ci_cust]).strip() if ci_cust is not None and row[ci_cust] else ""
            if not cust or cust.upper() in ("NONE", ""):
                continue
            qnum = str(row[ci_qnum]).strip() if ci_qnum is not None and row[ci_qnum] else None
            rec = {
                "qnum":       qnum,
                "customer":   cust,
                "desc":       str(row[ci_desc]).strip() if ci_desc is not None and row[ci_desc] else "",
                "machine":    parse_int(row[ci_machine])  if ci_machine  is not None else None,
                "tool":       parse_int(row[ci_tool])     if ci_tool     is not None else None,
                "machTool":   parse_int(row[ci_machtool]) if ci_machtool is not None else None,
                "robotic":    parse_int(row[ci_robotic])  if ci_robotic  is not None else None,
                "service":    parse_int(row[ci_service])  if ci_service  is not None else None,
                "rfq":        str(row[ci_rfq]).strip()    if ci_rfq      is not None and row[ci_rfq] else None,
                "received":   parse_date(row[ci_received]) if ci_received is not None else None,
                "done":       parse_bool(row[ci_done])    if ci_done     is not None else False,
                "sentMgmt":   parse_date(row[ci_mgmt])   if ci_mgmt     is not None else None,
                "sentClient": parse_date(row[ci_client]) if ci_client   is not None else None,
                "notes":      str(row[ci_notes]).strip()  if ci_notes    is not None and row[ci_notes] else None,
                "awarded":    parse_bool(row[ci_awarded]) if ci_awarded  is not None else False,
                "created_at": datetime.datetime.now().isoformat(),
            }
            imported.append(rec)

        if not imported:
            return jsonify({"error": "No se encontraron registros válidos en el archivo"}), 400

        with lock:
            if mode == "replace":
                final = imported
            else:  # append
                existing = _load_quotes()
                existing_qnums = {r.get("qnum") for r in existing if r.get("qnum")}
                for rec in imported:
                    if rec["qnum"] and rec["qnum"] in existing_qnums:
                        errors.append({"qnum": rec["qnum"], "error": "Ya existe, omitido"})
                    else:
                        existing.append(rec)
                final = existing
            _save_quotes(final)

        return jsonify({
            "ok": True, "mode": mode,
            "imported": len(imported), "total": len(final), "errors": errors,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════
#  PURCHASE ORDERS HELPERS
# ══════════════════════════════════════════════════════════════════
PO_COLS = [
    "clave", "fecha_doc", "entregar_a", "nombre",
    "subtotal", "tipo_cambio", "estatus",
    "descuento_financiero", "pct_descuento", "fecha_recepcion"
]

def po_root(): return Path(PO_FOLDER)
def po_json_file(year): return po_root() / f"po_{year}.json"

def po_available_years():
    root = po_root()
    if not root.exists(): return []
    years = []
    for p in root.iterdir():
        m = re.match(r"^po_(\d{4})\.json$", p.name)
        if m: years.append(int(m.group(1)))
    return sorted(years, reverse=True)

def po_load(year):
    p = po_json_file(year)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def po_save(year, records):
    root = po_root()
    root.mkdir(parents=True, exist_ok=True)
    with open(po_json_file(year), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2, default=str)

def po_to_str(v):
    if v is None: return ""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d")
    return str(v).strip()

def po_to_float(v):
    try: return float(v) if v is not None else 0.0
    except: return 0.0

# ══════════════════════════════════════════════════════════════════
#  ROUTES — PURCHASE ORDERS  (/api/po/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/po", methods=["GET"])
def api_get_po():
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        data = po_load(year)
        return jsonify({"year": year, "records": data, "available_years": po_available_years()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/po/import", methods=["POST"])
def api_import_po_excel():
    """
    Importa Purchase Orders desde el Excel con columnas:
      Clave | Fecha de documento | Entregar a | Nombre |
      Subtotal | Tipo de cambio | Estatus |
      Descuento financiero | Porcentaje de descuento | Fecha de recepción
    mode=replace → reemplaza toda la tabla del año
    mode=merge   → agrega / actualiza sin borrar los que no aparecen
    """
    try:
        f = request.files.get("file")
        if not f:
            return jsonify({"error": "No se recibió archivo"}), 400

        year = int(request.form.get("year", CURRENT_YEAR))
        mode = request.form.get("mode", "append")

        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        ws = wb.active

        # Build header map (0-based)
        headers = {}
        for cell in next(ws.iter_rows(min_row=1, max_row=1)):
            if cell.value:
                headers[str(cell.value).strip().lower()] = cell.column - 1

        def col(*aliases):
            for a in aliases:
                if a.lower() in headers: return headers[a.lower()]
            return None

        ci_clave  = col("clave")
        ci_fdoc   = col("fecha de documento")
        ci_dest   = col("entregar a")
        ci_nombre = col("nombre")
        ci_sub    = col("subtotal")
        ci_tc     = col("tipo de cambio")
        ci_est    = col("estatus")
        ci_desc   = col("descuento financiero")
        ci_pct    = col("porcentaje de descuento financ", "porcentaje de descuento financiero", "porcentaje de descuento")
        ci_frec   = col("fecha de recepción", "fecha de recepcion")

        if ci_clave is None:
            return jsonify({"error": "No se encontró la columna 'Clave' en el Excel"}), 400

        imported = []
        errors   = []

        for row in ws.iter_rows(min_row=2, values_only=True):
            row = list(row)
            def cv(idx):
                if idx is None or idx >= len(row): return None
                return row[idx]

            clave = cv(ci_clave)
            if clave is None or str(clave).strip() == "": continue

            try:
                clave_int = int(clave)
            except (ValueError, TypeError):
                errors.append({"clave": str(clave), "error": "Clave no numérica"})
                continue

            subtotal = po_to_float(cv(ci_sub))
            tc       = po_to_float(cv(ci_tc)) or 1.0
            desc_fin = po_to_float(cv(ci_desc))
            pct_desc = po_to_float(cv(ci_pct))

            imported.append({
                "clave":               clave_int,
                "fecha_doc":           po_to_str(cv(ci_fdoc)),
                "entregar_a":          po_to_str(cv(ci_dest)),
                "nombre":              po_to_str(cv(ci_nombre)),
                "subtotal":            subtotal,
                "tipo_cambio":         tc,
                "subtotal_mxn":        round(subtotal * tc, 2),
                "estatus":             po_to_str(cv(ci_est)),
                "descuento_financiero":desc_fin,
                "pct_descuento":       pct_desc,
                "fecha_recepcion":     po_to_str(cv(ci_frec)),
            })

        if not imported:
            return jsonify({"error": "No se encontraron registros válidos en el archivo"}), 400

        with lock:
            if mode == "replace":
                final = imported
            else:
                existing = po_load(year)
                existing_map = {r["clave"]: r for r in existing}
                for rec in imported:
                    existing_map[rec["clave"]] = rec
                final = list(existing_map.values())
            po_save(year, final)

        return jsonify({
            "ok":       True,
            "year":     year,
            "mode":     mode,
            "imported": len(imported),
            "total":    len(final),
            "errors":   errors,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/po/export/<int:year>")
def api_export_po(year):
    """Exporta Purchase Orders del año como CSV."""
    records = po_load(year)
    lines = ["Clave,Fecha Documento,Entregar A,Nombre,Subtotal,Tipo Cambio,Subtotal MXN,Estatus,Desc.Financiero,% Desc,Fecha Recepción"]
    for r in records:
        lines.append(",".join([
            str(r.get("clave", "")),
            r.get("fecha_doc", ""),
            '"' + r.get("entregar_a", "").replace('"', '') + '"',
            '"' + r.get("nombre", "").replace('"', '') + '"',
            str(r.get("subtotal", 0)),
            str(r.get("tipo_cambio", 1)),
            str(r.get("subtotal_mxn", 0)),
            r.get("estatus", ""),
            str(r.get("descuento_financiero", 0)),
            str(r.get("pct_descuento", 0)),
            r.get("fecha_recepcion", ""),
        ]))
    return Response(
        "\n".join(lines), mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=purchase_orders_{year}.csv"}
    )

@app.route("/api/po/years")
def api_po_years():
    return jsonify({"available_years": po_available_years(), "current_year": CURRENT_YEAR})

# ══════════════════════════════════════════════════════════════════
#  WORK HOURS HELPERS
# ══════════════════════════════════════════════════════════════════
WH_FOLDER  = _os.path.join(_DATA, "WHs")
IVP_FOLDER = _os.path.join(_DATA, "IVPs")


def _homologar_empleado(raw_name, canonical_list, _cache={}):
    """
    Convierte nombres del formato 'ID NOMBRE APELLIDO' al formato canónico
    'APELLIDOS NOMBRE(S)' usando la lista de HOURLY_RATE como referencia.
    """
    import re as _re
    # Quitar ID numérico al inicio
    clean = _re.sub(r"^\d+\s*", "", str(raw_name)).strip().upper()
    if not clean:
        return raw_name

    # Cache para no recalcular
    if clean in _cache:
        return _cache[clean]

    # Buscar mejor coincidencia por palabras compartidas
    words = set(clean.split())
    best_match = clean  # fallback: devolver limpio sin ID
    best_score = 0
    for c in canonical_list:
        c_words = set(c.upper().split())
        score = len(words & c_words)
        if score > best_score:
            best_score = score
            best_match = c

    # Solo usar el canónico si hay al menos 2 palabras en común
    result = best_match if best_score >= 2 else clean
    _cache[clean] = result
    return result

def _get_canonical_employees(year=None):
    """Carga la lista canónica de empleados desde HOURLY_RATE."""
    if year is None:
        year = CURRENT_YEAR
    rates_path = rates_root() / f"rates_{year}.json"
    if not rates_path.exists():
        # Intentar con cualquier año disponible
        root = rates_root()
        if root.exists():
            files = sorted(root.glob("rates_*.json"), reverse=True)
            if files:
                rates_path = files[0]
    if rates_path.exists():
        try:
            with open(rates_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [r["employee"] for r in data if r.get("employee")]
        except:
            pass
    return []

def wh_root():  return Path(WH_FOLDER)
def ivp_root(): return Path(IVP_FOLDER)

def wh_json_file(year):  return wh_root()  / f"wh_{year}.json"
def ivp_json_file(year): return ivp_root() / f"ivp_{year}.json"

def _generic_available_years(root_fn, prefix):
    root = root_fn()
    if not root.exists(): return []
    years = []
    for p in root.iterdir():
        m = re.match(rf"^{prefix}_(\d{{4}})\.json$", p.name)
        if m: years.append(int(m.group(1)))
    return sorted(years, reverse=True)

def wh_available_years():  return _generic_available_years(wh_root,  "wh")
def ivp_available_years(): return _generic_available_years(ivp_root, "ivp")

def _generic_load(json_file_fn, year):
    p = json_file_fn(year)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def wh_load(year):  return _generic_load(wh_json_file,  year)
def ivp_load(year): return _generic_load(ivp_json_file, year)

def _generic_save(root_fn, json_file_fn, year, records):
    root = root_fn()
    root.mkdir(parents=True, exist_ok=True)
    with open(json_file_fn(year), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2, default=str)

def wh_save(year, records):  _generic_save(wh_root,  wh_json_file,  year, records)
def ivp_save(year, records): _generic_save(ivp_root, ivp_json_file, year, records)

# ══════════════════════════════════════════════════════════════════
#  ROUTES — WORK HOURS  (/api/wh/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/wh", methods=["GET"])
def api_get_wh():
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        data = wh_load(year)
        return jsonify({"year": year, "records": data, "available_years": wh_available_years()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/wh/import", methods=["POST"])
def api_import_wh():
    """
    Importa Work Hours desde Excel con columnas:
      cboReports | cboFilterFavorites | ID | Employee | Date Worked |
      Work Code  | Hours | Work Description
    Soporta filtro por fecha_inicio / fecha_fin y mode replace/merge.
    """
    try:
        f = request.files.get("file")
        if not f:
            return jsonify({"error": "No se recibió archivo"}), 400

        year       = int(request.form.get("year", CURRENT_YEAR))
        mode       = request.form.get("mode", "append")
        date_from  = request.form.get("date_from", "")   # YYYY-MM-DD
        date_to    = request.form.get("date_to",   "")   # YYYY-MM-DD

        dt_from = None
        dt_to   = None
        if date_from:
            try: dt_from = datetime.datetime.strptime(date_from[:10], "%Y-%m-%d")
            except: pass
        if date_to:
            try: dt_to = datetime.datetime.strptime(date_to[:10], "%Y-%m-%d")
            except: pass

        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        # Use the first sheet (may be named 'Work Hours List')
        ws = wb.active if len(wb.sheetnames) == 1 else wb[wb.sheetnames[0]]
        for sname in wb.sheetnames:
            if "work hours" in sname.lower():
                ws = wb[sname]; break

        # Detect header row — scan first 3 rows for 'Employee'
        header_row = 1
        headers = {}
        for ri in range(1, 4):
            row_vals = [c.value for c in next(ws.iter_rows(min_row=ri, max_row=ri))]
            if any(str(v).strip().lower() == "employee" for v in row_vals if v):
                header_row = ri
                for ci, v in enumerate(row_vals):
                    if v: headers[str(v).strip().lower()] = ci
                break

        def col(*aliases):
            for a in aliases:
                if a.lower() in headers: return headers[a.lower()]
            return None

        ci_id    = col("id")
        ci_emp   = col("employee")
        ci_date  = col("date worked", "date")
        ci_wcode = col("work code")
        ci_hours = col("hours")
        ci_desc  = col("work description", "description")

        if ci_emp is None or ci_date is None or ci_hours is None:
            return jsonify({"error": "No se encontraron columnas requeridas (Employee, Date Worked, Hours)"}), 400

        imported = []
        skipped  = 0
        errors   = []

        for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
            row = list(row)
            def cv(idx):
                if idx is None or idx >= len(row): return None
                return row[idx]

            emp = cv(ci_emp)
            if not emp or str(emp).strip() == "": continue

            date_val = cv(ci_date)
            if not isinstance(date_val, (datetime.datetime, datetime.date)):
                skipped += 1; continue

            # Date range filter
            if dt_from and date_val < dt_from: skipped += 1; continue
            if dt_to   and date_val > dt_to:   skipped += 1; continue

            try:
                hours = float(cv(ci_hours)) if cv(ci_hours) is not None else 0
            except (ValueError, TypeError):
                errors.append({"row": str(cv(ci_id)), "error": "Horas no numéricas"}); continue

            # Homologar nombre al formato canónico
            canonical = _get_canonical_employees(year)
            emp_homolog = _homologar_empleado(str(emp).strip(), canonical) if canonical else                           __import__("re").sub(r"^\d+\s*", "", str(emp).strip()).upper()

            imported.append({
                "id":          int(cv(ci_id)) if cv(ci_id) is not None else None,
                "employee":    emp_homolog,
                "date_worked": date_val.strftime("%Y-%m-%d") if hasattr(date_val, "strftime") else str(date_val)[:10],
                "work_code":   str(cv(ci_wcode) or "").strip(),
                "hours":       hours,
                "description": str(cv(ci_desc) or "").strip(),
            })

        if not imported:
            return jsonify({"error": f"No se encontraron registros válidos (omitidos: {skipped})"}), 400

        with lock:
            if mode == "replace":
                final = imported
            else:
                existing = wh_load(year)
                existing_ids = {r["id"] for r in existing if r.get("id")}
                for rec in imported:
                    if rec.get("id") and rec["id"] in existing_ids:
                        for i, ex in enumerate(existing):
                            if ex.get("id") == rec["id"]:
                                existing[i] = rec; break
                    else:
                        existing.append(rec)
                final = existing
            wh_save(year, final)

        return jsonify({
            "ok":       True,
            "year":     year,
            "mode":     mode,
            "imported": len(imported),
            "skipped":  skipped,
            "total":    len(final),
            "errors":   errors,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/wh/export/<int:year>")
def api_export_wh(year):
    records = wh_load(year)
    lines = ["ID,Employee,Date Worked,Work Code,Hours,Description"]
    for r in records:
        lines.append(",".join([
            str(r.get("id", "")),
            '"' + r.get("employee", "").replace('"', '') + '"',
            r.get("date_worked", ""),
            '"' + r.get("work_code", "").replace('"', '') + '"',
            str(r.get("hours", 0)),
            '"' + r.get("description", "").replace('"', '') + '"',
        ]))
    return Response(
        "\n".join(lines), mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=work_hours_{year}.csv"}
    )

# ══════════════════════════════════════════════════════════════════
#  ROUTES — INVOICED POs  (/api/ivp/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/ivp", methods=["GET"])
def api_get_ivp():
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        data = ivp_load(year)
        return jsonify({"year": year, "records": data, "available_years": ivp_available_years()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ivp/import", methods=["POST"])
def api_import_ivp():
    """
    Importa Invoiced POs desde Excel con columnas:
      Clave | Entregar a | Nombre | Subtotal | Estatus |
      Fecha de recepción | Fecha de pago | Documento anterior
    Detecta USD por '(dolares)' en nombre del proveedor.
    """
    try:
        f = request.files.get("file")
        if not f:
            return jsonify({"error": "No se recibió archivo"}), 400

        year = int(request.form.get("year", CURRENT_YEAR))
        mode = request.form.get("mode", "append")

        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        ws = wb.active

        headers = {}
        for cell in next(ws.iter_rows(min_row=1, max_row=1)):
            if cell.value:
                headers[str(cell.value).strip().lower().rstrip()] = cell.column - 1

        def col(*aliases):
            for a in aliases:
                k = a.lower().rstrip()
                if k in headers: return headers[k]
                # partial match
                for hk in headers:
                    if k in hk or hk in k: return headers[hk]
            return None

        ci_clave = col("clave")
        ci_dest  = col("entregar a")
        ci_nomb  = col("nombre")
        ci_sub   = col("subtotal")
        ci_est   = col("estatus")
        ci_frec  = col("fecha de recepción", "fecha de recepcion")
        ci_fpag  = col("fecha de pago")
        ci_doc   = col("documento anterior")

        if ci_clave is None:
            return jsonify({"error": "No se encontró la columna 'Clave' en el Excel"}), 400

        imported = []
        errors   = []

        for row in ws.iter_rows(min_row=2, values_only=True):
            row = list(row)
            def cv(idx):
                if idx is None or idx >= len(row): return None
                return row[idx]

            clave = cv(ci_clave)
            if clave is None or str(clave).strip() in ("", "None"): continue

            try:
                clave_int = int(clave)
            except (ValueError, TypeError):
                errors.append({"clave": str(clave), "error": "Clave no numérica"}); continue

            nombre = str(cv(ci_nomb) or "").strip()
            is_usd = "(dolares)" in nombre.lower()

            try:
                subtotal = float(cv(ci_sub)) if cv(ci_sub) is not None else 0.0
            except (ValueError, TypeError):
                errors.append({"clave": clave_int, "error": "Subtotal no numérico"}); continue

            estatus = str(cv(ci_est) or "").strip()
            # Skip obviously bad estatus rows (date leaked into column)
            if estatus and re.match(r"\d{4}-\d{2}-\d{2}", estatus):
                estatus = ""

            def to_date(v):
                if v is None: return ""
                if hasattr(v, "strftime"): return v.strftime("%Y-%m-%d")
                s = str(v)[:10]
                return s if re.match(r"\d{4}-\d{2}-\d{2}", s) else ""

            doc_ant = cv(ci_doc)
            try:
                doc_ant = int(doc_ant) if doc_ant is not None else None
            except (ValueError, TypeError):
                doc_ant = None

            imported.append({
                "clave":            clave_int,
                "entregar_a":       str(cv(ci_dest) or "").strip(),
                "nombre":           nombre,
                "subtotal":         subtotal,
                "moneda":           "USD" if is_usd else "MXN",
                "estatus":          estatus,
                "fecha_recepcion":  to_date(cv(ci_frec)),
                "fecha_pago":       to_date(cv(ci_fpag)),
                "doc_anterior":     doc_ant,
            })

        if not imported:
            return jsonify({"error": "No se encontraron registros válidos en el archivo"}), 400

        with lock:
            if mode == "replace":
                final = imported
            else:
                existing = ivp_load(year)
                existing_map = {r["clave"]: r for r in existing}
                for rec in imported:
                    existing_map[rec["clave"]] = rec
                final = list(existing_map.values())
            ivp_save(year, final)

        return jsonify({
            "ok":       True,
            "year":     year,
            "mode":     mode,
            "imported": len(imported),
            "total":    len(final),
            "errors":   errors,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ivp/export/<int:year>")
def api_export_ivp(year):
    records = ivp_load(year)
    lines = ["Clave,Entregar A,Nombre,Subtotal,Moneda,Estatus,Fecha Recepcion,Fecha Pago,Doc Anterior"]
    for r in records:
        lines.append(",".join([
            str(r.get("clave", "")),
            '"' + r.get("entregar_a", "").replace('"', '') + '"',
            '"' + r.get("nombre", "").replace('"', '') + '"',
            str(r.get("subtotal", 0)),
            r.get("moneda", "MXN"),
            r.get("estatus", ""),
            r.get("fecha_recepcion", ""),
            r.get("fecha_pago", ""),
            str(r.get("doc_anterior", "") or ""),
        ]))
    return Response(
        "\n".join(lines), mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=invoiced_pos_{year}.csv"}
    )

# (run block moved to end)

# ══════════════════════════════════════════════════════════════════
#  JOB REPORT  — /api/report/*
# ══════════════════════════════════════════════════════════════════

def _build_report_data(job_number, rate_year, wh_year, po_year):
    """Core logic: compile all report data for a Job."""
    job_meta = read_meta(job_number) if job_folder(job_number).exists() else {}

    rates_raw = load_rates(rate_year)
    rate_map  = {normalize_name(r["employee"]): float(r["rate"])
                 for r in rates_raw if r.get("employee")}

    wh_raw   = wh_load(wh_year)
    job_main = "-".join(job_number.split("-")[:2]) if "-" in job_number else job_number
    wh_f     = [r for r in wh_raw
                if job_main.upper() in (r.get("work_code") or "").upper()]

    emp_agg = {}
    for r in wh_f:
        emp = str(r.get("employee", "")).strip()
        hrs = float(r.get("hours", 0))
        if emp not in emp_agg:
            emp_agg[emp] = {"employee": emp, "hours": 0.0, "rate": 0.0, "amount": 0.0}
        emp_agg[emp]["hours"] += hrs
        rate = rate_map.get(normalize_name(emp), 0.0)
        emp_agg[emp]["rate"]   = rate
        emp_agg[emp]["amount"] = round(emp_agg[emp]["hours"] * rate, 2)

    workers   = sorted(emp_agg.values(), key=lambda x: x["hours"], reverse=True)
    accum_hrs = round(sum(w["hours"]  for w in workers), 2)
    amount_wh = round(sum(w["amount"] for w in workers), 2)

    po_raw = po_load(po_year)
    po_f   = [r for r in po_raw
              if job_main.upper() in (r.get("entregar_a") or "").upper()]

    fx_all = fx_load_all()
    po_items = [{"clave":       r.get("clave"),
                 "nombre":      r.get("nombre", ""),
                 "subtotal":    float(r.get("subtotal", 0)),
                 "moneda":      r.get("moneda", "MXN"),
                 "subtotal_usd": _po_usd(r, fx_all),
                 "fx_rate":     fx_rate_for_date(r.get("fecha_recepcion",""), fx_all) or float(r.get("tipo_cambio",0)) or None,
                 "estatus":     r.get("estatus", ""),
                 "fecha_recepcion": r.get("fecha_recepcion", "")}
                for r in po_f]

    purch_tot = round(sum(p["subtotal_usd"] for p in po_items), 2)
    # Revenue: preferir suma de CPOs si existen
    cpo_rev = cpo_revenue_for_job(job_number, po_year)
    revenue = cpo_rev if cpo_rev > 0 else float(job_meta.get("revenue", 0))
    cost      = round(amount_wh + purch_tot, 2)
    gm        = round(revenue - cost, 2)
    gm_pct    = round((gm / revenue * 100), 1) if revenue else 0.0

    return {
        "job_number":       job_number,
        "customer":         job_meta.get("customer", ""),
        "description":      job_meta.get("description", ""),
        "pm":               job_meta.get("pm", ""),
        "revenue":          revenue,
        "po_number":        job_meta.get("po_number", ""),
        "ship_date":        job_meta.get("ship_date", ""),
        "status":           job_meta.get("status", ""),
        "product_group":    job_meta.get("product_group", ""),
        "accum_hours":      accum_hrs,
        "amount_wh":        amount_wh,
        "workers":          workers,
        "purchasing_total": purch_tot,
        "po_items":         po_items,
        "cost":             cost,
        "gross_margin":     gm,
        "gm_pct":           gm_pct,
        "rate_year":        rate_year,
        "wh_year":          wh_year,
        "po_year":          po_year,
        "wh_matches":       len(wh_f),
        "po_matches":       len(po_f),
    }


@app.route("/api/report/data")
def api_report_data():
    try:
        job_number = request.args.get("job", "").strip()
        rate_year  = int(request.args.get("rate_year", CURRENT_YEAR))
        wh_year    = int(request.args.get("wh_year",   CURRENT_YEAR))
        po_year    = int(request.args.get("po_year",   CURRENT_YEAR))
        if not job_number:
            return jsonify({"error": "job_number requerido"}), 400
        return jsonify(_build_report_data(job_number, rate_year, wh_year, po_year))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/report/export-excel")
def api_report_export_excel():
    """Exporta el reporte como .xlsx siguiendo la estructura del template."""
    from flask import make_response
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    job_number = request.args.get("job", "").strip()
    rate_year  = int(request.args.get("rate_year", CURRENT_YEAR))
    wh_year    = int(request.args.get("wh_year",   CURRENT_YEAR))
    po_year    = int(request.args.get("po_year",   CURRENT_YEAR))

    if not job_number:
        return jsonify({"error": "job_number requerido"}), 400

    d = _build_report_data(job_number, rate_year, wh_year, po_year)

    # Colour palette
    RED_H   = "C8102E"
    DARK    = "1F1F1F"
    DGRAY   = "2D2D2D"
    MGRAY   = "3D3D3D"
    LGRAY   = "F0F0F0"
    XLGRAY  = "FAFAFA"
    GOLD    = "F0A500"
    WHITE   = "FFFFFF"
    GREEN_C = "1E8449"
    RED_NEG = "C0392B"
    BLUE_H  = "1F618D"

    def _fill(hex_color):
        return PatternFill("solid", fgColor=hex_color)
    def _font(sz=9, bold=False, color=DARK, italic=False):
        return Font(name="Arial", size=sz, bold=bold, color=color, italic=italic)
    def _side():
        return Side(style="thin", color="AAAAAA")
    def _border():
        s = _side()
        return Border(left=s, right=s, top=s, bottom=s)
    def _lft(indent=1):
        return Alignment(horizontal="left",   vertical="center", indent=indent, wrap_text=False)
    def _rgt():
        return Alignment(horizontal="right",  vertical="center")
    def _ctr():
        return Alignment(horizontal="center", vertical="center")
    MONEY = '#,##0.00'
    HRS   = '#,##0.0'
    PCT   = '0.0"%"'

    wb = Workbook()
    ws = wb.active
    ws.title = f"Report {job_number}"

    # Column widths
    widths = {"A":26,"B":18,"C":28,"D":10,"E":14,"F":16}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    # ── Row 1: Title ─────────────────────────────────────────────
    ws.row_dimensions[1].height = 32
    ws.merge_cells("A1:F1")
    c = ws["A1"]
    c.value     = f"  JOB COST REPORT  ·  {job_number}"
    c.font      = _font(16, True, WHITE)
    c.fill      = _fill(RED_H)
    c.alignment = _lft(2)

    # ── Row 2: Sub-header ─────────────────────────────────────────
    ws.row_dimensions[2].height = 14
    ws.merge_cells("A2:C2")
    ws["A2"].value = f"Generated: {datetime.date.today()}  |  Rate year: {rate_year}  |  WH year: {wh_year}  |  PO year: {po_year}"
    ws["A2"].font  = _font(8, False, "888888", True)
    ws["A2"].alignment = _lft()

    # ── Summary block (rows 3-14) ──────────────────────────────────
    def label_row(row, label, val, fmt=None, bg_lbl=DGRAY, bg_val=MGRAY,
                  fc_lbl=WHITE, fc_val=WHITE, bold_val=False, height=18):
        ws.row_dimensions[row].height = height
        cl = ws.cell(row, 1)
        cl.value = label; cl.font = _font(9, True, fc_lbl)
        cl.fill = _fill(bg_lbl); cl.alignment = _lft(); cl.border = _border()
        cv = ws.cell(row, 2)
        cv.value = val; cv.font = _font(10, bold_val, fc_val)
        cv.fill = _fill(bg_val); cv.alignment = _lft()
        cv.border = _border()
        if fmt: cv.number_format = fmt

    label_row(3,  "JOB NUMBER",            job_number,              bg_val=MGRAY, fc_val=GOLD, bold_val=True)
    label_row(4,  "CUSTOMER",              d["customer"] or "—",    bg_val=MGRAY)
    label_row(5,  "PM",                    d["pm"] or "—",          bg_val=MGRAY)
    label_row(6,  "DESCRIPTION",           d["description"] or "—", bg_val=MGRAY)
    label_row(7,  "STATUS",                d["status"] or "—",      bg_val=MGRAY)

    # Spacer
    ws.row_dimensions[8].height = 6
    ws.merge_cells("A8:F8"); ws["A8"].fill = _fill(DARK)

    label_row(9,  "REVENUE",              d["revenue"],       MONEY, bg_val=BLUE_H, fc_val=WHITE, bold_val=True)
    label_row(10, "ACUMULATED WORK HOURS",d["accum_hours"],   HRS,   bg_val=MGRAY,  fc_val=WHITE)
    label_row(11, "AMOUNT WORK HOURS",    d["amount_wh"],     MONEY, bg_val=MGRAY,  fc_val=WHITE, bold_val=True)
    label_row(12, "PURCHASINGS TOTAL",    d["purchasing_total"], MONEY, bg_val=MGRAY, fc_val=WHITE, bold_val=True)

    ws.row_dimensions[13].height = 6
    ws.merge_cells("A13:F13"); ws["A13"].fill = _fill(DARK)

    # COST
    ws.row_dimensions[14].height = 20
    cl = ws["A14"]; cl.value = "COST"
    cl.font = _font(11, True, WHITE); cl.fill = _fill(RED_H)
    cl.alignment = _lft(); cl.border = _border()
    cv = ws["B14"]; cv.value = d["cost"]
    cv.font = _font(12, True, WHITE); cv.fill = _fill(RED_H)
    cv.alignment = _rgt(); cv.number_format = MONEY; cv.border = _border()

    # GROSS MARGIN
    ws.row_dimensions[15].height = 22
    gm_bg = GREEN_C if d["gross_margin"] >= 0 else RED_NEG
    cl = ws["A15"]; cl.value = "GROSS MARGIN"
    cl.font = _font(12, True, WHITE); cl.fill = _fill(gm_bg)
    cl.alignment = _lft(); cl.border = _border()
    cv = ws["B15"]; cv.value = d["gross_margin"]
    cv.font = _font(13, True, WHITE); cv.fill = _fill(gm_bg)
    cv.alignment = _rgt(); cv.number_format = MONEY; cv.border = _border()

    # GM%
    ws.row_dimensions[16].height = 16
    ws.merge_cells("A16:B16")
    c16 = ws["A16"]
    c16.value = f"Gross Margin %:  {d['gm_pct']:.1f}%"
    c16.font  = _font(10, True, WHITE)
    c16.fill  = _fill(gm_bg); c16.alignment = _ctr(); c16.border = _border()

    # ── Detail tables (right side of summary, rows 3-16) ──────────
    # PO mini-list header (cols D-F, row 3)
    ws.row_dimensions[3].height = max(ws.row_dimensions[3].height, 18)
    for col, txt in [(4,"CLAVE PO"),(5,"MXN"),(6,"PROVEEDOR")]:
        c = ws.cell(3, col)
        c.value = txt; c.font = _font(8, True, WHITE)
        c.fill = _fill(RED_H); c.alignment = _ctr(); c.border = _border()

    for i, po in enumerate(d["po_items"][:12]):
        r = 4 + i
        ws.row_dimensions[r].height = 15
        bg = LGRAY if i % 2 == 0 else XLGRAY
        ws.cell(r,4).value = str(po["clave"]); ws.cell(r,4).font = _font(8,False,"333333")
        ws.cell(r,4).fill = _fill(bg); ws.cell(r,4).alignment = _ctr(); ws.cell(r,4).border = _border()
        ws.cell(r,5).value = po["subtotal_usd"]; ws.cell(r,5).font = _font(8,False,"333333")
        ws.cell(r,5).fill = _fill(bg); ws.cell(r,5).alignment = _rgt()
        ws.cell(r,5).number_format = MONEY; ws.cell(r,5).border = _border()
        ws.cell(r,6).value = po["nombre"][:30]; ws.cell(r,6).font = _font(7,False,"666666")
        ws.cell(r,6).fill = _fill(bg); ws.cell(r,6).alignment = _lft(); ws.cell(r,6).border = _border()

    # ── Spacer ────────────────────────────────────────────────────
    sr = 17
    ws.row_dimensions[sr].height = 8
    ws.merge_cells(f"A{sr}:F{sr}")
    ws[f"A{sr}"].fill = _fill(DARK)

    # ── Detail tables header row ──────────────────────────────────
    dh = sr + 1
    ws.row_dimensions[dh].height = 22
    for col, txt in [(1,"PO NUMBER"),(2,"VALUE (USD)"),(3,"PROVEEDOR"),
                     (4,"WORKER"),(5,"HOURS"),(6,"VALUE (USD)")]:
        c = ws.cell(dh, col)
        c.value = txt; c.font = _font(9, True, WHITE)
        c.fill = _fill(DGRAY); c.alignment = _ctr(); c.border = _border()

    # ── PO detail rows ────────────────────────────────────────────
    po_start = dh + 1
    for i, po in enumerate(d["po_items"]):
        r = po_start + i
        ws.row_dimensions[r].height = 15
        bg = LGRAY if i % 2 == 0 else XLGRAY
        ws.cell(r,1).value = str(po["clave"])
        ws.cell(r,1).font = _font(9,False,"222222"); ws.cell(r,1).fill = _fill(bg)
        ws.cell(r,1).alignment = _ctr(); ws.cell(r,1).border = _border()
        ws.cell(r,2).value = po["subtotal_usd"]
        ws.cell(r,2).font = _font(9,False,"222222"); ws.cell(r,2).fill = _fill(bg)
        ws.cell(r,2).alignment = _rgt(); ws.cell(r,2).number_format = MONEY
        ws.cell(r,2).border = _border()
        ws.cell(r,3).value = po["nombre"][:35]
        ws.cell(r,3).font = _font(8,False,"555555"); ws.cell(r,3).fill = _fill(bg)
        ws.cell(r,3).alignment = _lft(); ws.cell(r,3).border = _border()

    # ── Worker detail rows ────────────────────────────────────────
    wk_start = dh + 1
    for i, w in enumerate(d["workers"]):
        r = wk_start + i
        if r < po_start + len(d["po_items"]):
            ws.row_dimensions[r].height = max(ws.row_dimensions[r].height, 15)
        else:
            ws.row_dimensions[r].height = 15
        bg = LGRAY if i % 2 == 0 else XLGRAY
        ws.cell(r,4).value = w["employee"]
        ws.cell(r,4).font = _font(9,False,"222222"); ws.cell(r,4).fill = _fill(bg)
        ws.cell(r,4).alignment = _lft(); ws.cell(r,4).border = _border()
        ws.cell(r,5).value = w["hours"]
        ws.cell(r,5).font = _font(9,False,"222222"); ws.cell(r,5).fill = _fill(bg)
        ws.cell(r,5).alignment = _rgt(); ws.cell(r,5).number_format = HRS
        ws.cell(r,5).border = _border()
        ws.cell(r,6).value = w["amount"]
        ws.cell(r,6).font = _font(9,False,"222222"); ws.cell(r,6).fill = _fill(bg)
        ws.cell(r,6).alignment = _rgt(); ws.cell(r,6).number_format = MONEY
        ws.cell(r,6).border = _border()

    # ── Totals footer ─────────────────────────────────────────────
    foot = max(po_start+len(d["po_items"]), wk_start+len(d["workers"])) + 1
    ws.row_dimensions[foot].height = 20
    for col, val, fmt in [
        (1,"TOTAL",None),(2,d["purchasing_total"],MONEY),(3,"",None),
        (4,"TOTAL",None),(5,d["accum_hours"],HRS),(6,d["amount_wh"],MONEY)]:
        c = ws.cell(foot, col)
        c.value = val; c.font = _font(10, True, WHITE)
        c.fill = _fill(DARK); c.alignment = _rgt() if fmt else _ctr()
        c.border = _border()
        if fmt: c.number_format = fmt

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"Report_{job_number.replace('-','_')}_{datetime.date.today()}.xlsx"
    resp  = make_response(buf.read())
    resp.headers["Content-Type"]        = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    resp.headers["Content-Disposition"] = f"attachment; filename={fname}"
    return resp

# ══════════════════════════════════════════════════════════════════
#  FX (TIPO DE CAMBIO) — /api/fx/*
# ══════════════════════════════════════════════════════════════════

def fx_root():           return Path(FX_FOLDER)
def fx_json_file(year):  return fx_root() / f"fx_{year}.json"

def fx_available_years():
    root = fx_root()
    if not root.exists(): return []
    years = []
    for p in root.iterdir():
        m = re.match(r"^fx_(\d{4})\.json$", p.name)
        if m: years.append(int(m.group(1)))
    return sorted(years, reverse=True)

def fx_load(year) -> dict:
    """Returns {YYYY-MM-DD: rate_float}"""
    p = fx_json_file(year)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def fx_save(year, data: dict):
    root = fx_root()
    root.mkdir(parents=True, exist_ok=True)
    with open(fx_json_file(year), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def fx_load_all() -> dict:
    """Merge all years into one lookup dict {YYYY-MM-DD: rate}"""
    combined = {}
    for year in fx_available_years():
        combined.update(fx_load(year))
    return combined

def fx_rate_for_date(date_str: str, fx_all: dict) -> float:
    """
    Returns the MXN/USD rate for a given date string (YYYY-MM-DD).
    Falls back up to 7 days earlier for weekends/holidays.
    Returns None if not found.
    """
    if not date_str or not fx_all:
        return None
    try:
        d = datetime.datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
    for offset in range(8):
        key = (d - datetime.timedelta(days=offset)).strftime("%Y-%m-%d")
        if key in fx_all:
            return fx_all[key]
    return None


@app.route("/api/fx", methods=["GET"])
def api_get_fx():
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        data = fx_load(year)
        # Return as sorted list for frontend table
        records = [{"date": k, "rate": v} for k, v in sorted(data.items())]
        return jsonify({
            "year":            year,
            "records":         records,
            "available_years": fx_available_years(),
            "count":           len(records),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/fx/import", methods=["POST"])
def api_import_fx():
    """
    Importa el archivo tipoCambio.xls del Banco de México.
    Formato: filas de datos a partir de fila 9 (idx 8).
    Col 0 = Fecha (dd/mm/yyyy string)
    Col 3 = Tipo de cambio 'Para solventar obligaciones'
    """
    try:
        f = request.files.get("file")
        if not f:
            return jsonify({"error": "No se recibió archivo"}), 400

        mode = request.form.get("mode", "merge")   # merge default — accumulate years
        raw  = f.read()

        # Support both .xls (legacy binary) and .xlsx
        fname_lower = (f.filename or "").lower()

        def parse_rows_from_raw(raw_bytes, is_xls):
            """
            Returns an iterable of rows starting from data row 9 (idx 8).
            For .xls we try xlrd, then fall back to converting via LibreOffice,
            then fall back to a minimal built-in compound-doc reader.
            """
            if is_xls:
                # ── Try xlrd first (if installed) ──────────────────
                try:
                    import xlrd
                    wb2 = xlrd.open_workbook(file_contents=raw_bytes)
                    ws2 = wb2.sheet_by_index(0)
                    return [[ws2.cell_value(r, c) for c in range(ws2.ncols)]
                            for r in range(0, ws2.nrows)]
                except ImportError:
                    pass

                # ── Try pandas with openpyxl-xlrd engine ───────────
                try:
                    import pandas as pd
                    df = pd.read_excel(io.BytesIO(raw_bytes), header=None,
                                       engine='xlrd')
                    return df.values.tolist()
                except Exception:
                    pass

                # ── Convert .xls → .xlsx via LibreOffice ────────────
                import tempfile, subprocess, os
                with tempfile.TemporaryDirectory() as tmpdir:
                    src = os.path.join(tmpdir, "tc.xls")
                    with open(src, "wb") as fh:
                        fh.write(raw_bytes)
                    result = subprocess.run(
                        ["libreoffice", "--headless", "--convert-to", "xlsx",
                         "--outdir", tmpdir, src],
                        capture_output=True, timeout=30
                    )
                    out_path = src.replace(".xls", ".xlsx")
                    if result.returncode != 0 or not os.path.exists(out_path):
                        raise RuntimeError(
                            "No se pudo convertir el archivo. "
                            "Instala xlrd: pip install xlrd==1.2.0 --break-system-packages"
                        )
                    with open(out_path, "rb") as fh:
                        xlsx_bytes = fh.read()

                wb3 = openpyxl.load_workbook(io.BytesIO(xlsx_bytes),
                                              read_only=True, data_only=True)
                ws3 = wb3.active
                return list(ws3.iter_rows(min_row=1, values_only=True))

            else:
                wb4 = openpyxl.load_workbook(io.BytesIO(raw_bytes),
                                              read_only=True, data_only=True)
                ws4 = wb4.active
                return list(ws4.iter_rows(min_row=1, values_only=True))

        is_xls = fname_lower.endswith(".xls") and not fname_lower.endswith(".xlsx")
        try:
            all_rows = parse_rows_from_raw(raw, is_xls)
        except RuntimeError as re_err:
            return jsonify({"error": str(re_err)}), 400

        rows_iter = all_rows

        # Parse rows
        by_year   = {}    # year → {YYYY-MM-DD: rate}
        imported  = 0
        skipped   = 0

        # Auto-detect header row and column positions
        header_map = {}
        data_start  = 0
        for ri, row in enumerate(rows_iter[:5]):
            if not row: continue
            vals = [str(v).strip().upper() if v else "" for v in row]
            if any(k in vals for k in ["FECHA","DATE","TASA","RATE","TASA_MXN_USD"]):
                for ci, v in enumerate(vals):
                    if v in ("FECHA","DATE"): header_map["date"] = ci
                    if v in ("TASA","RATE","TASA_MXN_USD","TASA (MXN/USD)"): header_map["rate"] = ci
                data_start = ri + 1
                break

        date_col = header_map.get("date", 0)
        rate_col = header_map.get("rate", 3)  # fallback: col 3 (Banxico format)

        for row in rows_iter[data_start:]:
            if not row or not row[date_col]:
                continue
            date_raw = str(row[date_col]).strip()
            rate_raw = row[rate_col] if len(row) > rate_col else None

            # Parse date — soporta dd/mm/yyyy y yyyy-mm-dd
            d = None
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
                try:
                    d = datetime.datetime.strptime(date_raw[:10], fmt)
                    break
                except ValueError:
                    continue
            if d is None:
                skipped += 1
                continue

            # Parse rate — skip N/E
            try:
                rate = float(rate_raw)
                if rate <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                skipped += 1
                continue

            year    = d.year
            iso_key = d.strftime("%Y-%m-%d")
            by_year.setdefault(year, {})[iso_key] = round(rate, 6)
            imported += 1

        if not by_year:
            return jsonify({"error": "No se encontraron registros válidos"}), 400

        total_saved = 0
        with lock:
            for year, new_data in by_year.items():
                if mode == "replace":
                    final = new_data
                else:   # merge
                    existing = fx_load(year)
                    existing.update(new_data)
                    final = existing
                fx_save(year, final)
                total_saved += len(final)

        years_touched = sorted(by_year.keys())
        return jsonify({
            "ok":       True,
            "imported": imported,
            "skipped":  skipped,
            "years":    years_touched,
            "total_saved": total_saved,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/fx/lookup")
def api_fx_lookup():
    """Quick single-date lookup: ?date=YYYY-MM-DD"""
    try:
        date_str = request.args.get("date", "")
        fx_all   = fx_load_all()
        rate     = fx_rate_for_date(date_str, fx_all)
        return jsonify({"date": date_str, "rate": rate, "found": rate is not None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Helper used by PO and IVP endpoints: convert subtotal to USD ─
def _po_usd(record: dict, fx_all: dict) -> float:
    """Return the subtotal in USD for a PO record."""
    subtotal = float(record.get("subtotal", 0))
    moneda   = record.get("moneda", "MXN")
    if moneda == "USD":
        return subtotal
    # MXN → USD
    date_str = record.get("fecha_recepcion") or record.get("fecha_doc") or ""
    rate     = fx_rate_for_date(date_str, fx_all)
    if rate and rate > 0:
        return round(subtotal / rate, 6)
    # Fallback: use stored tipo_cambio if available (PO module)
    tc = float(record.get("tipo_cambio", 0))
    if tc > 1:
        return round(subtotal / tc, 6)
    return subtotal   # can't convert — return as-is


@app.route("/api/po/usd-view")
def api_po_usd_view():
    """Return PO records with all amounts converted to USD."""
    try:
        year   = int(request.args.get("year", CURRENT_YEAR))
        po_raw = po_load(year)
        fx_all = fx_load_all()
        result = []
        for r in po_raw:
            rec = dict(r)
            rec["subtotal_usd"] = _po_usd(r, fx_all)
            # Determine which rate was used
            if r.get("moneda") == "USD":
                rec["fx_rate_used"] = 1.0
            else:
                date_str = r.get("fecha_recepcion") or r.get("fecha_doc") or ""
                rec["fx_rate_used"] = fx_rate_for_date(date_str, fx_all) or float(r.get("tipo_cambio", 0)) or None
            result.append(rec)
        return jsonify({"year": year, "records": result, "available_years": po_available_years()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ══════════════════════════════════════════════════════════════════
#  CUSTOMER POs (CPO) HELPERS
# ══════════════════════════════════════════════════════════════════
CPO_FOLDER = _os.path.join(_DATA, "CPOs")

def cpo_root(): return Path(CPO_FOLDER)
def cpo_json_file(year): return cpo_root() / f"cpo_{year}.json"

def cpo_available_years():
    root = cpo_root()
    if not root.exists(): return []
    years = []
    for p in root.iterdir():
        m = re.match(r"^cpo_(\d{4})\.json$", p.name)
        if m: years.append(int(m.group(1)))
    return sorted(years, reverse=True)

def cpo_load(year):
    p = cpo_json_file(year)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def cpo_save(year, records):
    root = cpo_root()
    root.mkdir(parents=True, exist_ok=True)
    with open(cpo_json_file(year), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2, default=str)

def cpo_to_float(v):
    try: return float(v) if v not in (None, "", "N/A", "#N/A") else 0.0
    except: return 0.0

def cpo_to_str(v):
    if v is None or str(v).strip() in ("#N/A", "None"): return ""
    return str(v).strip()

def cpo_parse_date(v):
    if v is None: return None
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.strftime("%Y-%m-%d")
    try:
        base = datetime.date(1899, 12, 30)
        return (base + datetime.timedelta(days=int(float(str(v))))).strftime("%Y-%m-%d")
    except:
        s = str(v).strip()
        return s[:10] if s else None

def cpo_revenue_for_job(job_number, year):
    """Suma de VALUE de todas las CPOs asociadas a este job en el año dado."""
    records = cpo_load(year)
    job_main = job_number.upper()
    total = sum(cpo_to_float(r.get("value")) for r in records
                if (r.get("job") or "").upper() == job_main)
    return round(total, 2)

# ══════════════════════════════════════════════════════════════════
#  ROUTES — CUSTOMER POs  (/api/cpo/*)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/cpo", methods=["GET"])
def api_get_cpo():
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        job  = request.args.get("job", "").strip().upper()
        records = cpo_load(year)
        if job:
            records = [r for r in records if (r.get("job") or "").upper() == job]
        return jsonify({"year": year, "records": records,
                        "available_years": cpo_available_years()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cpo", methods=["POST"])
def api_create_cpo():
    try:
        data = request.get_json()
        year = int(data.get("year", CURRENT_YEAR))
        records = cpo_load(year)
        rec = {
            "id":           f"CPO-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            "type_id":      cpo_to_str(data.get("type_id")),
            "po_number":    cpo_to_str(data.get("po_number")),
            "date":         cpo_to_str(data.get("date")),
            "job":          cpo_to_str(data.get("job")).upper(),
            "customer_supplier": cpo_to_str(data.get("customer_supplier")),
            "value":        cpo_to_float(data.get("value")),
            "type_name":    cpo_to_str(data.get("type_name", "01_REVENUE")),
            "customer":     cpo_to_str(data.get("customer")),
            "year":         year,
            "pm":           cpo_to_str(data.get("pm")),
            "status":       cpo_to_str(data.get("status", "WIP")),
            "est_finalize": cpo_to_str(data.get("est_finalize")),
            "created_at":   datetime.datetime.now().isoformat(),
        }
        records.append(rec)
        cpo_save(year, records)
        return jsonify({"ok": True, "record": rec})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cpo/<cpo_id>", methods=["PUT"])
def api_update_cpo(cpo_id):
    try:
        data = request.get_json()
        year = int(data.get("year", CURRENT_YEAR))
        records = cpo_load(year)
        idx = next((i for i, r in enumerate(records) if r.get("id") == cpo_id), None)
        if idx is None:
            return jsonify({"error": "CPO no encontrada"}), 404
        rec = records[idx]
        for k in ["type_id","po_number","date","job","customer_supplier",
                  "type_name","customer","pm","status","est_finalize"]:
            if k in data: rec[k] = cpo_to_str(data[k])
        if "value" in data: rec["value"] = cpo_to_float(data["value"])
        rec["updated_at"] = datetime.datetime.now().isoformat()
        rec["year"] = year
        cpo_save(year, records)
        return jsonify({"ok": True, "record": rec})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cpo/<cpo_id>", methods=["DELETE"])
def api_delete_cpo(cpo_id):
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        records = cpo_load(year)
        new_records = [r for r in records if r.get("id") != cpo_id]
        if len(new_records) == len(records):
            return jsonify({"error": "CPO no encontrada"}), 404
        cpo_save(year, new_records)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cpo/import", methods=["POST"])
def api_import_cpo_excel():
    try:
        f = request.files.get("file")
        if not f: return jsonify({"error": "No se recibió archivo"}), 400
        year = int(request.form.get("year", CURRENT_YEAR))
        mode = request.form.get("mode", "append")

        wb = openpyxl.load_workbook(io.BytesIO(f.read()), read_only=True, data_only=True)
        ws = wb.active
        headers = {}
        for cell in list(ws.iter_rows(min_row=1, max_row=1))[0]:
            if cell.value:
                headers[str(cell.value).strip().upper()] = cell.column - 1

        def col(*aliases):
            for a in aliases:
                if a.upper() in headers: return headers[a.upper()]
            return None

        ci_tid   = col("TYPE ID")
        ci_po    = col("PO NUMBER", "NAME/NUMBER / ID", "NAME/NUMBER/ID")
        ci_date  = col("DATE")
        ci_job   = col("JOB")
        ci_cs    = col("CUSTOMER/SUPPLIER/CC", "CUSTOMER/SUPPLIER")
        ci_val   = col("VALUE")
        ci_tn    = col("TYPE NAME")
        ci_cust  = col("CUSTOMER")
        ci_yr    = col("YEAR")
        ci_pm    = col("PM")
        ci_pnum  = col("PO NUMBER")
        ci_stat  = col("STATUS")
        ci_est   = col("ESTIMATED TIME TO FINALIZE", "EST TIME TO FINALIZE")

        if ci_job is None or ci_val is None:
            return jsonify({"error": "No se encontraron columnas JOB / VALUE"}), 400

        imported = []; errors = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            job = cpo_to_str(row[ci_job] if ci_job is not None else "")
            if not job or job.upper() in ("NONE", ""): continue
            val = cpo_to_float(row[ci_val] if ci_val is not None else 0)
            # Determinar año del registro
            rec_year = year
            if ci_yr is not None and row[ci_yr] not in (None, "", "#N/A"):
                try: rec_year = int(float(str(row[ci_yr])))
                except: pass
            rec = {
                "id":           f"CPO-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "type_id":      cpo_to_str(row[ci_tid]  if ci_tid  is not None else ""),
                "po_number":    cpo_to_str(row[ci_pnum] if ci_pnum is not None else (row[ci_po] if ci_po is not None else "")),
                "date":         cpo_parse_date(row[ci_date] if ci_date is not None else None),
                "job":          job.upper(),
                "customer_supplier": cpo_to_str(row[ci_cs]   if ci_cs   is not None else ""),
                "value":        val,
                "type_name":    cpo_to_str(row[ci_tn]   if ci_tn   is not None else "01_REVENUE"),
                "customer":     cpo_to_str(row[ci_cust] if ci_cust is not None else ""),
                "year":         rec_year,
                "pm":           cpo_to_str(row[ci_pm]   if ci_pm   is not None else ""),
                "status":       cpo_to_str(row[ci_stat] if ci_stat is not None else "WIP"),
                "est_finalize": cpo_parse_date(row[ci_est] if ci_est is not None else None),
                "created_at":   datetime.datetime.now().isoformat(),
            }
            imported.append((rec_year, rec))

        if not imported:
            return jsonify({"error": "No se encontraron registros válidos"}), 400

        with lock:
            if mode == "replace":
                # Agrupar por año
                by_year = {}
                for yr, rec in imported:
                    by_year.setdefault(yr, []).append(rec)
                for yr, recs in by_year.items():
                    cpo_save(yr, recs)
            else:
                # Append agrupado por año
                by_year = {}
                for yr, rec in imported:
                    by_year.setdefault(yr, []).append(rec)
                for yr, recs in by_year.items():
                    existing = cpo_load(yr)
                    existing.extend(recs)
                    cpo_save(yr, existing)

        total = sum(len(cpo_load(yr)) for yr in set(yr for yr, _ in imported))
        return jsonify({"ok": True, "mode": mode, "imported": len(imported),
                        "total": total, "errors": errors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cpo/revenue/<job_number>")
def api_cpo_revenue(job_number):
    try:
        year = int(request.args.get("year", CURRENT_YEAR))
        rev  = cpo_revenue_for_job(job_number, year)
        cpos = [r for r in cpo_load(year)
                if (r.get("job") or "").upper() == job_number.upper()]
        return jsonify({"job": job_number, "year": year,
                        "revenue": rev, "cpo_count": len(cpos), "cpos": cpos})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/report/multi", methods=["POST"])
def api_report_multi():
    """Reporte agrupado de múltiples jobs."""
    try:
        data      = request.get_json()
        jobs      = [j.strip() for j in data.get("jobs", []) if j.strip()]
        rate_year = int(data.get("rate_year", CURRENT_YEAR))
        wh_year   = int(data.get("wh_year",   CURRENT_YEAR))
        po_year   = int(data.get("po_year",   CURRENT_YEAR))
        cpo_year  = int(data.get("cpo_year",  CURRENT_YEAR))
        label     = data.get("label", "Multi-Job Report")
        if not jobs:
            return jsonify({"error": "Se requiere al menos un job"}), 400

        rows = []
        totals = {"revenue": 0, "amount_wh": 0, "purchasing_total": 0,
                  "cost": 0, "gross_margin": 0, "accum_hours": 0}
        for jn in jobs:
            d = _build_report_data(jn, rate_year, wh_year, po_year)
            # Usar CPO como Revenue si hay registros
            cpo_rev = cpo_revenue_for_job(jn, cpo_year)
            if cpo_rev > 0:
                d["revenue"]      = cpo_rev
                d["cost"]         = round(d["amount_wh"] + d["purchasing_total"], 2)
                d["gross_margin"] = round(cpo_rev - d["cost"], 2)
                d["gm_pct"]       = round((d["gross_margin"] / cpo_rev * 100), 1) if cpo_rev else 0.0
                d["revenue_source"] = "CPO"
            else:
                d["revenue_source"] = "job_meta"
            rows.append({
                "job_number":       d["job_number"],
                "customer":         d["customer"],
                "description":      d["description"],
                "pm":               d["pm"],
                "revenue":          d["revenue"],
                "accum_hours":      d["accum_hours"],
                "amount_wh":        d["amount_wh"],
                "purchasing_total": d["purchasing_total"],
                "cost":             d["cost"],
                "gross_margin":     d["gross_margin"],
                "gm_pct":           d["gm_pct"],
                "revenue_source":   d.get("revenue_source", "job_meta"),
            })
            for k in totals:
                totals[k] = round(totals[k] + d.get(k, 0), 2)

        totals["gm_pct"] = round((totals["gross_margin"] / totals["revenue"] * 100), 1) if totals["revenue"] else 0.0
        return jsonify({"label": label, "jobs": rows, "totals": totals,
                        "rate_year": rate_year, "wh_year": wh_year,
                        "po_year": po_year, "cpo_year": cpo_year})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ══════════════════════════════════════════════════════════════════
#  PT NUMBERS
# ══════════════════════════════════════════════════════════════════
PT_FILE = _os.path.join(_DATA, "pt_numbers.json")

def pt_load():
    p = Path(PT_FILE)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return []
    return []

def pt_save(records):
    Path(PT_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(PT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

@app.route("/api/pt", methods=["GET"])
def api_get_pt():
    try:
        records = pt_load()
        q = request.args.get("q","").lower()
        if q:
            records = [r for r in records if q in json.dumps(r, ensure_ascii=False).lower()]
        return jsonify({"records": records, "total": len(records)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pt", methods=["POST"])
def api_create_pt():
    try:
        data = request.get_json()
        with lock:
            records = pt_load()
            pt_num = str(data.get("pt_number","")).strip().upper()
            if not pt_num:
                return jsonify({"error": "PT Number es requerido"}), 400
            if any(r["pt_number"] == pt_num for r in records):
                return jsonify({"error": f"{pt_num} ya existe"}), 409
        rec = {
            "pt_number":        pt_num,
            "customer":         str(data.get("customer","")).strip(),
            "customer_program": str(data.get("customer_program","")).strip(),
            "pm":               str(data.get("pm","")).strip(),
            "jobs":             [j.strip().upper() for j in data.get("jobs",[]) if j.strip()],
            "notes":            str(data.get("notes","")).strip(),
            "created_at":       datetime.datetime.now().isoformat(),
        }
        records.append(rec)
        pt_save(records)
        return jsonify({"ok": True, "record": rec})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pt/<pt_number>", methods=["PUT"])
def api_update_pt(pt_number):
    try:
        data = request.get_json()
        records = pt_load()
        idx = next((i for i,r in enumerate(records) if r["pt_number"]==pt_number.upper()), None)
        if idx is None:
            return jsonify({"error": "PT no encontrado"}), 404
        rec = records[idx]
        for k in ["customer","customer_program","pm","notes"]:
            if k in data: rec[k] = str(data[k]).strip()
        if "jobs" in data:
            rec["jobs"] = [j.strip().upper() for j in data["jobs"] if j.strip()]
        rec["updated_at"] = datetime.datetime.now().isoformat()
        pt_save(records)
        return jsonify({"ok": True, "record": rec})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pt/<pt_number>", methods=["DELETE"])
def api_delete_pt(pt_number):
    try:
        records = pt_load()
        new_records = [r for r in records if r["pt_number"] != pt_number.upper()]
        if len(new_records) == len(records):
            return jsonify({"error": "PT no encontrado"}), 404
        pt_save(new_records)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pt/<pt_number>/jobs", methods=["GET"])
def api_pt_jobs(pt_number):
    """Devuelve los jobs asociados a un PT con info básica de cada job."""
    try:
        records = pt_load()
        pt = next((r for r in records if r["pt_number"]==pt_number.upper()), None)
        if pt is None:
            return jsonify({"error": "PT no encontrado"}), 404
        jobs_info = []
        for jn in pt.get("jobs", []):
            info_path = job_folder(jn) / "job_info.json"
            if info_path.exists():
                try:
                    with open(info_path, "r", encoding="utf-8") as f:
                        ji = json.load(f)
                    jobs_info.append({"job_number": jn,
                                      "customer": ji.get("customer",""),
                                      "description": ji.get("description",""),
                                      "pm": ji.get("pm","")})
                except:
                    jobs_info.append({"job_number": jn, "customer":"","description":"","pm":""})
            else:
                jobs_info.append({"job_number": jn, "customer":"","description":"","pm":""})
        return jsonify({"pt": pt, "jobs": jobs_info})
    except Exception as e:
        return jsonify({"error": str(e)}), 500




# ══════════════════════════════════════════════════════════════════
#  USERS & PERMISSIONS
# ══════════════════════════════════════════════════════════════════
USERS_FILE  = _os.path.join(_DATA, "users.json")
ADMIN_USER  = _os.environ.get("ADMIN_USER", "guillermo")

MODULES = ["jobs","rates","quotes","pt","cpo","po","wh","ivp","report","multirpt","fx"]
ACTIONS = ["view","create","edit","delete","import"]

def _default_perms(role):
    if role == "admin":
        return {m: {a: True for a in ACTIONS} for m in MODULES}
    else:  # viewer
        return {m: {"view": True, "create": False, "edit": False, "delete": False, "import": False} for m in MODULES}

def users_load():
    p = Path(USERS_FILE)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except: pass
    # Build default from env vars
    users = {}
    for i in range(1, 10):
        val = _os.environ.get(f"USER{i}", "")
        if ":" in val:
            uname = val.split(":", 1)[0].strip()
            role  = "admin" if uname == ADMIN_USER else "viewer"
            users[uname] = {"role": role, "permissions": _default_perms(role)}
    return users

def users_save(users):
    Path(USERS_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def get_user_perms(username):
    users = users_load()
    if username not in users:
        role = "admin" if username == ADMIN_USER else "viewer"
        return {"role": role, "permissions": _default_perms(role)}
    return users[username]

def can(action, module):
    """Check if current session user has permission."""
    user = session.get("user")
    if not user: return False
    info = get_user_perms(user)
    if info.get("role") == "admin": return True
    return info.get("permissions", {}).get(module, {}).get(action, False)

def is_admin():
    user = session.get("user")
    if not user: return False
    info = get_user_perms(user)
    return info.get("role") == "admin"

# ── Permission routes
@app.route("/api/admin/users", methods=["GET"])
def api_admin_get_users():
    if not is_admin():
        return jsonify({"error": "Sin permiso"}), 403
    users = users_load()
    # Ensure all env users are represented
    for i in range(1, 10):
        val = _os.environ.get(f"USER{i}", "")
        if ":" in val:
            uname = val.split(":", 1)[0].strip()
            if uname not in users:
                role = "admin" if uname == ADMIN_USER else "viewer"
                users[uname] = {"role": role, "permissions": _default_perms(role)}
    return jsonify({"users": users, "modules": MODULES, "actions": ACTIONS,
                    "current_user": session.get("user"), "admin_user": ADMIN_USER})

@app.route("/api/admin/users/<username>", methods=["PUT"])
def api_admin_update_user(username):
    if not is_admin():
        return jsonify({"error": "Sin permiso"}), 403
    data  = request.get_json()
    users = users_load()
    if username not in users:
        role = "admin" if username == ADMIN_USER else "viewer"
        users[username] = {"role": role, "permissions": _default_perms(role)}
    # Update role
    new_role = data.get("role", users[username]["role"])
    users[username]["role"] = new_role
    # Update permissions
    if "permissions" in data:
        users[username]["permissions"] = data["permissions"]
    elif new_role != users[username].get("role"):
        users[username]["permissions"] = _default_perms(new_role)
    users_save(users)
    return jsonify({"ok": True, "user": users[username]})

@app.route("/api/me/perms", methods=["GET"])
def api_me_perms():
    user = session.get("user")
    if not user: return jsonify({"error": "No autenticado"}), 401
    info = get_user_perms(user)
    return jsonify({"user": user, "role": info.get("role","viewer"),
                    "permissions": info.get("permissions", _default_perms("viewer")),
                    "is_admin": is_admin()})



# ══════════════════════════════════════════════════════════════════
#  SV NUMBERS
# ══════════════════════════════════════════════════════════════════
SV_FILE = _os.path.join(_DATA, "sv_numbers.json")

def sv_load():
    p = Path(SV_FILE)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return []
    return []

def sv_save(records):
    Path(SV_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(SV_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

def sv_next_number():
    records = sv_load()
    if not records:
        return "SV0001"
    nums = []
    for r in records:
        try: nums.append(int(r["sv_number"].replace("SV","")))
        except: pass
    return f"SV{(max(nums)+1):04d}" if nums else "SV0001"

def pt_next_number():
    records = pt_load()
    if not records:
        return "PT0001"
    nums = []
    for r in records:
        try: nums.append(int(r["pt_number"].replace("PT","")))
        except: pass
    return f"PT{(max(nums)+1):04d}" if nums else "PT0001"

@app.route("/api/sv", methods=["GET"])
def api_get_sv():
    try:
        records = sv_load()
        q = request.args.get("q","").lower()
        if q:
            records = [r for r in records if q in json.dumps(r, ensure_ascii=False).lower()]
        return jsonify({"records": records, "total": len(records),
                        "next_number": sv_next_number()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sv", methods=["POST"])
def api_create_sv():
    try:
        data = request.get_json()
        with lock:
            records = sv_load()
            sv_num = str(data.get("sv_number","")).strip().upper()
            if not sv_num:
                sv_num = sv_next_number()  # called inside lock — safe
            if any(r["sv_number"] == sv_num for r in records):
                return jsonify({"error": f"{sv_num} ya existe"}), 409
        rec = {
            "sv_number":        sv_num,
            "customer":         str(data.get("customer","")).strip(),
            "customer_program": str(data.get("customer_program","")).strip(),
            "pm":               str(data.get("pm","")).strip(),
            "jobs":             [j.strip().upper() for j in data.get("jobs",[]) if j.strip()],
            "notes":            str(data.get("notes","")).strip(),
            "created_at":       datetime.datetime.now().isoformat(),
        }
        records.append(rec)
        sv_save(records)
        return jsonify({"ok": True, "record": rec})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sv/<sv_number>", methods=["GET"])
def api_get_sv_one(sv_number):
    try:
        records = sv_load()
        rec = next((r for r in records if r["sv_number"]==sv_number.upper()), None)
        if rec is None:
            return jsonify({"error": "SV no encontrado"}), 404
        jobs_info = []
        for jn in rec.get("jobs", []):
            info_path = job_folder(jn) / "job_info.json"
            if info_path.exists():
                try:
                    with open(info_path, "r", encoding="utf-8") as f:
                        ji = json.load(f)
                    jobs_info.append({"job_number": jn,
                                      "customer": ji.get("customer",""),
                                      "description": ji.get("description",""),
                                      "pm": ji.get("pm","")})
                except:
                    jobs_info.append({"job_number": jn, "customer":"","description":"","pm":""})
            else:
                jobs_info.append({"job_number": jn, "customer":"","description":"","pm":""})
        return jsonify({"sv": rec, "jobs": jobs_info})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sv/<sv_number>", methods=["PUT"])
def api_update_sv(sv_number):
    try:
        data = request.get_json()
        records = sv_load()
        idx = next((i for i,r in enumerate(records) if r["sv_number"]==sv_number.upper()), None)
        if idx is None:
            return jsonify({"error": "SV no encontrado"}), 404
        rec = records[idx]
        for k in ["customer","customer_program","pm","notes"]:
            if k in data: rec[k] = str(data[k]).strip()
        if "jobs" in data:
            rec["jobs"] = [j.strip().upper() for j in data["jobs"] if j.strip()]
        rec["updated_at"] = datetime.datetime.now().isoformat()
        sv_save(records)
        return jsonify({"ok": True, "record": rec})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sv/<sv_number>", methods=["DELETE"])
def api_delete_sv(sv_number):
    try:
        records = sv_load()
        new_records = [r for r in records if r["sv_number"] != sv_number.upper()]
        if len(new_records) == len(records):
            return jsonify({"error": "SV no encontrado"}), 404
        sv_save(new_records)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════
#  WORKFLOW — Quote → CPO → Job → PT/SV
# ══════════════════════════════════════════════════════════════════

@app.route("/api/workflow/next-numbers", methods=["GET"])
def api_next_numbers():
    """Devuelve el siguiente PT y SV disponibles."""
    return jsonify({
        "next_pt": pt_next_number(),
        "next_sv": sv_next_number(),
        "pt_list": [{"pt_number": r["pt_number"], "customer": r.get("customer",""),
                     "customer_program": r.get("customer_program","")}
                    for r in pt_load()],
        "sv_list": [{"sv_number": r["sv_number"], "customer": r.get("customer",""),
                     "customer_program": r.get("customer_program","")}
                    for r in sv_load()],
    })

@app.route("/api/workflow/award", methods=["POST"])
def api_workflow_award():
    """
    Flujo AWARDED:
    1. Marca la cotización como awarded
    2. Crea la CPO
    3. Crea los Jobs
    4. Asigna o crea PT/SV
    """
    try:
        data    = request.get_json()
        q_row   = int(data.get("q_row", -1))
        year    = int(data.get("cpo_year", CURRENT_YEAR))

        # ── Paso 1: Marcar cotización como AWARDED
        quotes = _load_quotes()
        if q_row < 0 or q_row >= len(quotes):
            return jsonify({"error": "Cotización no encontrada"}), 404
        quote = quotes[q_row]
        quote["awarded"]        = True
        quote["award_date"]     = datetime.datetime.now().isoformat()
        quote["cpo_registered"] = True
        if data.get("refused_reason"):
            quote["refused"] = False
        _save_quotes(quotes)

        results = {"quote": quote["qnum"], "cpo": None, "jobs": [], "pt_sv": None}

        # ── Paso 2: Crear CPO (venta)
        cpo_data = data.get("cpo")
        if cpo_data:
            cpo_year = int(cpo_data.get("year", year))
            cpos = cpo_load(cpo_year)
            cpo_rec = {
                "id":                f"CPO-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "type_id":           "CPO",
                "po_number":         cpo_to_str(cpo_data.get("po_number","")),
                "date":              cpo_to_str(cpo_data.get("date","")),
                "job":               "",  # se actualiza al crear jobs
                "customer_supplier": cpo_to_str(cpo_data.get("customer_supplier","")),
                "value":             cpo_to_float(cpo_data.get("value",0)),
                "type_name":         "01_REVENUE",
                "customer":          cpo_to_str(cpo_data.get("customer","")),
                "year":              cpo_year,
                "pm":                cpo_to_str(cpo_data.get("pm","")),
                "status":            "WIP",
                "est_finalize":      cpo_to_str(cpo_data.get("est_finalize","")),
                "q_number":          quote["qnum"],
                "created_at":        datetime.datetime.now().isoformat(),
            }
            cpos.append(cpo_rec)
            cpo_save(cpo_year, cpos)
            results["cpo"] = cpo_rec["id"]

        # ── Paso 3: Crear Jobs
        job_numbers_created = []
        jobs_data = data.get("jobs", [])
        with lock:
            for jd in jobs_data:
                sub = str(jd.get("subindex","00")).zfill(2)
                main = next_main_index()
                job_number = f"{main}-{sub}"
                folder = job_folder(job_number)
                folder.mkdir(parents=True, exist_ok=True)
                record = {
                    "job_number":      job_number,
                    "main_index":      main,
                    "subindex":        sub,
                    "subindex_label":  subindex_label(sub),
                    "customer":        jd.get("customer", quote.get("customer","")),
                    "pm":              jd.get("pm", quote.get("pm","")),
                    "description":     jd.get("description", quote.get("desc","")),
                    "product_group":   jd.get("product_group",""),
                    "product_subgroup":jd.get("product_subgroup",""),
                    "revenue":         cpo_to_float(data.get("cpo",{}).get("value",0)),
                    "estimated_cost":  0,
                    "po_number":       cpo_to_str(data.get("cpo",{}).get("po_number","")),
                    "ship_date":       "",
                    "approval_fc":     "ToApprove",
                    "status":          "Open",
                    "notes":           jd.get("notes",""),
                    "q_number":        quote["qnum"],
                    "cpo_id":          results.get("cpo",""),
                    "created_at":      datetime.datetime.now().isoformat(),
                }
                write_meta(job_number, record)
                job_numbers_created.append(job_number)
        results["jobs"] = job_numbers_created

        # Actualizar job en CPO
        if cpo_data and job_numbers_created and results["cpo"]:
            cpos = cpo_load(year)
            for c in cpos:
                if c.get("id") == results["cpo"]:
                    c["job"] = job_numbers_created[0]
            cpo_save(year, cpos)

        # ── Paso 4: Asignar PT o SV
        pt_sv_data = data.get("pt_sv")
        if pt_sv_data and job_numbers_created:
            kind = pt_sv_data.get("kind","pt")  # "pt" o "sv"
            mode = pt_sv_data.get("mode","new")  # "new" o "existing"
            if kind == "pt":
                records = pt_load()
                if mode == "new":
                    num = pt_sv_data.get("number", pt_next_number())
                    rec = {
                        "pt_number":        num,
                        "customer":         pt_sv_data.get("customer", quote.get("customer","")),
                        "customer_program": pt_sv_data.get("customer_program",""),
                        "pm":               pt_sv_data.get("pm",""),
                        "jobs":             job_numbers_created,
                        "notes":            pt_sv_data.get("notes",""),
                        "q_number":         quote["qnum"],
                        "created_at":       datetime.datetime.now().isoformat(),
                    }
                    records.append(rec)
                else:
                    num = pt_sv_data.get("number","")
                    for r in records:
                        if r["pt_number"] == num:
                            r["jobs"] = list(set(r.get("jobs",[]) + job_numbers_created))
                pt_save(records)
                results["pt_sv"] = {"kind":"pt","number":num}
                # Actualizar job_info con pt_number
                for jn in job_numbers_created:
                    m = read_meta(jn)
                    m["pt_number"] = num
                    write_meta(jn, m)
            else:  # sv
                records = sv_load()
                if mode == "new":
                    num = pt_sv_data.get("number", sv_next_number())
                    rec = {
                        "sv_number":        num,
                        "customer":         pt_sv_data.get("customer", quote.get("customer","")),
                        "customer_program": pt_sv_data.get("customer_program",""),
                        "pm":               pt_sv_data.get("pm",""),
                        "jobs":             job_numbers_created,
                        "notes":            pt_sv_data.get("notes",""),
                        "q_number":         quote["qnum"],
                        "created_at":       datetime.datetime.now().isoformat(),
                    }
                    records.append(rec)
                else:
                    num = pt_sv_data.get("number","")
                    for r in records:
                        if r["sv_number"] == num:
                            r["jobs"] = list(set(r.get("jobs",[]) + job_numbers_created))
                sv_save(records)
                results["pt_sv"] = {"kind":"sv","number":num}
                for jn in job_numbers_created:
                    m = read_meta(jn)
                    m["sv_number"] = num
                    write_meta(jn, m)

        return jsonify({"ok": True, "results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/workflow/refuse", methods=["POST"])
def api_workflow_refuse():
    """Marca una cotización como REFUSED con motivo opcional."""
    try:
        data   = request.get_json()
        q_row  = int(data.get("q_row", -1))
        reason = str(data.get("reason","")).strip()
        quotes = _load_quotes()
        if q_row < 0 or q_row >= len(quotes):
            return jsonify({"error": "Cotización no encontrada"}), 404
        quotes[q_row]["awarded"]       = False
        quotes[q_row]["refused"]       = True
        quotes[q_row]["refuse_reason"] = reason
        quotes[q_row]["refuse_date"]   = datetime.datetime.now().isoformat()
        _save_quotes(quotes)
        return jsonify({"ok": True, "qnum": quotes[q_row]["qnum"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pt/next-number", methods=["GET"])
def api_pt_next():
    with lock:
        return jsonify({"next": pt_next_number()})

@app.route("/api/sv/next-number", methods=["GET"])
def api_sv_next():
    with lock:
        return jsonify({"next": sv_next_number()})



@app.route("/api/jobs/merge", methods=["POST"])
def api_merge_jobs():
    """Fusiona source_job hacia target_job. Solo admins."""
    if not is_admin():
        return jsonify({"error": "Sin permiso — solo administradores"}), 403
    try:
        data        = request.get_json()
        source      = str(data.get("source","")).strip().upper()
        target      = str(data.get("target","")).strip().upper()
        if not JOB_RE.match(source) or not JOB_RE.match(target):
            return jsonify({"error": "Job numbers inválidos"}), 400
        if source == target:
            return jsonify({"error": "Source y target no pueden ser iguales"}), 400

        source_folder = job_folder(source)
        target_folder = job_folder(target)

        if not source_folder.exists():
            return jsonify({"error": f"{source} no existe"}), 404
        if not target_folder.exists():
            return jsonify({"error": f"{target} no existe"}), 404

        moved_files = []
        skipped_files = []

        # Mover todos los archivos (excepto job_info.json) de source a target
        for f in source_folder.iterdir():
            if f.name == "job_info.json":
                continue
            dest = target_folder / f.name
            if dest.exists():
                # Renombrar con sufijo para no sobreescribir
                stem = f.stem; suffix = f.suffix; i = 1
                while dest.exists():
                    dest = target_folder / f"{stem}_from_{source}_{i}{suffix}"
                    i += 1
                skipped_files.append(f.name)
            f.rename(dest)
            moved_files.append(f.name)

        # Migrar Work Hours
        wh_year = int(data.get("wh_year", CURRENT_YEAR))
        wh_path = Path(WH_FOLDER) / f"wh_{wh_year}.json"
        wh_updated = 0
        if wh_path.exists():
            with open(wh_path, "r", encoding="utf-8") as f:
                wh_data = json.load(f)
            for rec in wh_data:
                if rec.get("work_code","").upper() == source:
                    rec["work_code"] = target
                    wh_updated += 1
            with open(wh_path, "w", encoding="utf-8") as f:
                json.dump(wh_data, f, ensure_ascii=False, indent=2)

        # Migrar IPOs
        po_year = int(data.get("po_year", CURRENT_YEAR))
        po_path = Path(PO_FOLDER) / f"po_{po_year}.json"
        po_updated = 0
        if po_path.exists():
            with open(po_path, "r", encoding="utf-8") as f:
                po_data = json.load(f)
            for rec in po_data:
                if str(rec.get("job","")).upper() == source:
                    rec["job"] = target
                    po_updated += 1
            with open(po_path, "w", encoding="utf-8") as f:
                json.dump(po_data, f, ensure_ascii=False, indent=2)

        # Migrar CPOs
        cpo_year = int(data.get("cpo_year", CURRENT_YEAR))
        cpo_path = Path(CPO_FOLDER) / f"cpo_{cpo_year}.json"
        cpo_updated = 0
        if cpo_path.exists():
            with open(cpo_path, "r", encoding="utf-8") as f:
                cpo_data = json.load(f)
            for rec in cpo_data:
                if str(rec.get("job","")).upper() == source:
                    rec["job"] = target
                    cpo_updated += 1
            with open(cpo_path, "w", encoding="utf-8") as f:
                json.dump(cpo_data, f, ensure_ascii=False, indent=2)

        # Actualizar PT Numbers
        pt_records = pt_load()
        for rec in pt_records:
            if source in rec.get("jobs",[]):
                rec["jobs"] = [target if j==source else j for j in rec["jobs"]]
        pt_save(pt_records)

        # Actualizar SV Numbers
        sv_records = sv_load()
        for rec in sv_records:
            if source in rec.get("jobs",[]):
                rec["jobs"] = [target if j==source else j for j in rec["jobs"]]
        sv_save(sv_records)

        # Eliminar carpeta source
        import shutil as _shutil
        _shutil.rmtree(str(source_folder))

        return jsonify({
            "ok": True,
            "source": source, "target": target,
            "files_moved": moved_files,
            "files_renamed": skipped_files,
            "wh_updated": wh_updated,
            "po_updated": po_updated,
            "cpo_updated": cpo_updated,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/jobs/<job_number>/renumber", methods=["POST"])
def api_renumber_job(job_number):
    """Cambia el número de un job. Solo admins."""
    if not is_admin():
        return jsonify({"error": "Sin permiso — solo administradores"}), 403
    if not JOB_RE.match(job_number):
        return jsonify({"error": "Job number inválido"}), 400
    try:
        data       = request.get_json()
        new_number = str(data.get("new_number","")).strip().upper()
        if not JOB_RE.match(new_number):
            return jsonify({"error": f"Nuevo número '{new_number}' inválido"}), 400
        if new_number == job_number:
            return jsonify({"error": "El nuevo número es igual al actual"}), 400
        if new_number in all_job_numbers():
            return jsonify({"error": f"{new_number} ya existe"}), 409

        old_folder = job_folder(job_number)
        new_folder = job_folder(new_number)
        if not old_folder.exists():
            return jsonify({"error": f"{job_number} no existe"}), 404

        # Renombrar carpeta
        old_folder.rename(new_folder)

        # Actualizar job_info.json
        meta = new_folder / "job_info.json"
        if meta.exists():
            with open(meta, "r", encoding="utf-8") as f:
                ji = json.load(f)
            parts = new_number.split("-")
            ji["job_number"]  = new_number
            ji["main_index"]  = int(parts[0])
            ji["subindex"]    = parts[1]
            ji["updated_at"]  = datetime.datetime.now().isoformat()
            with open(meta, "w", encoding="utf-8") as f:
                json.dump(ji, f, ensure_ascii=False, indent=2)

        # Actualizar PT Numbers
        pt_records = pt_load()
        for rec in pt_records:
            if job_number in rec.get("jobs",[]):
                rec["jobs"] = [new_number if j==job_number else j for j in rec["jobs"]]
        pt_save(pt_records)

        # Actualizar SV Numbers
        sv_records = sv_load()
        for rec in sv_records:
            if job_number in rec.get("jobs",[]):
                rec["jobs"] = [new_number if j==job_number else j for j in rec["jobs"]]
        sv_save(sv_records)

        return jsonify({"ok": True, "old": job_number, "new": new_number})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/wh/clear", methods=["POST"])
def api_clear_wh():
    """Borra todos los registros de WH de un año. Solo admins."""
    if not is_admin():
        return jsonify({"error": "Sin permiso — solo administradores"}), 403
    try:
        data = request.get_json()
        year = int(data.get("year", CURRENT_YEAR))
        wh_save(year, [])
        return jsonify({"ok": True, "year": year, "message": f"Work Hours {year} eliminados"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════
#  SV NUMBER FILES
# ══════════════════════════════════════════════════════════════════
SV_DOCS_BASE = _os.path.join(_DATA, "SV_DOCS")

def sv_folder(sv_number):
    return Path(SV_DOCS_BASE) / sv_number

@app.route("/api/sv/<sv_number>/files", methods=["GET"])
def api_list_sv_files(sv_number):
    folder = sv_folder(sv_number)
    if not folder.exists(): return jsonify([])
    files = []
    for f in sorted(folder.iterdir()):
        if f.is_file():
            st = f.stat()
            files.append({
                "name": f.name, "size": st.st_size,
                "modified": datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M"),
            })
    return jsonify(files)

@app.route("/api/sv/<sv_number>/files", methods=["POST"])
def api_upload_sv_file(sv_number):
    folder = sv_folder(sv_number)
    try: folder.mkdir(parents=True, exist_ok=True)
    except Exception as e: return jsonify({"error": str(e)}), 500
    saved = []
    for f in request.files.getlist("files"):
        dest = folder / f.filename
        f.save(str(dest))
        saved.append({"name": f.filename, "size": dest.stat().st_size})
    return jsonify({"saved": saved})

@app.route("/api/sv/<sv_number>/files/<filename>", methods=["GET"])
def api_download_sv_file(sv_number, filename):
    folder = sv_folder(sv_number)
    if not (folder / filename).exists():
        return jsonify({"error": "Archivo no encontrado"}), 404
    return send_from_directory(str(folder), filename, as_attachment=True)

@app.route("/api/sv/<sv_number>/files/<filename>", methods=["DELETE"])
def api_delete_sv_file(sv_number, filename):
    target = sv_folder(sv_number) / filename
    if target.exists() and target.is_file():
        target.unlink()
        return jsonify({"ok": True})
    return jsonify({"error": "Archivo no encontrado"}), 404

# ══════════════════════════════════════════════════════════════════
#  USER PREFERENCES — Idioma
# ══════════════════════════════════════════════════════════════════
@app.route("/api/me/lang", methods=["GET"])
def api_get_lang():
    return jsonify({"lang": session.get("lang", "es")})

@app.route("/api/me/lang", methods=["POST"])
def api_set_lang():
    data = request.get_json()
    lang = data.get("lang", "es")
    if lang not in ("es", "en", "it"):
        return jsonify({"error": "Idioma no válido"}), 400
    session["lang"] = lang
    session.modified = True
    return jsonify({"ok": True, "lang": lang})

# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  Persico Mex — Suite Unificada")
    print(f"  Job Register    : {JOBS_FOLDER}")
    print(f"  Hourly Rates    : {RATES_FOLDER}")
    print(f"  Quote Register  : {QUOTE_BASE}/quotes.json")
    print(f"  Purchase Orders : {PO_FOLDER}")
    print(f"  Customer POs    : {CPO_FOLDER}")
    print(f"  Work Hours      : {WH_FOLDER}")
    print(f"  Invoiced POs    : {IVP_FOLDER}")
    print(f"  FX / Tipo cambio: {FX_FOLDER}")
    print(f"  URL             : http://localhost:{PORT}")
    print("=" * 60)
    app.run(host=HOST, port=PORT, debug=False)
