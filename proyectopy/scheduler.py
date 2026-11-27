"""
ProyectoPy - Modelo de datos y motor de programación (método de la ruta crítica, CPM).

Solo usa la biblioteca estándar de Python.

Convenciones:
  * Las duraciones y los retrasos (lags) se expresan en días laborables enteros.
  * Cada tarea ocupa los días laborables [es, ef) contados desde el inicio del proyecto.
  * Un hito (duración 0) se dibuja al final del día laborable anterior a su "es",
    igual que en Microsoft Project.
  * Los tipos de vínculo se guardan internamente como FS/SS/FF/SF y se muestran
    en español como FC/CC/FF/CF.
"""
from __future__ import annotations

import re
from bisect import bisect_left
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import date, timedelta

FILE_FORMAT = "ProyectoPy"
FILE_VERSION = 1

LINK_TYPES = ("FS", "SS", "FF", "SF")
CODE_ES = {"FS": "FC", "SS": "CC", "FF": "FF", "SF": "CF"}
CODE_IN = {"FS": "FS", "FC": "FS", "SS": "SS", "CC": "SS",
           "FF": "FF", "SF": "SF", "CF": "SF"}

DAYS_ES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
DAYS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun",
             "jul", "ago", "sep", "oct", "nov", "dic"]
MONTHS_FULL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

LINK_RE = re.compile(r"^(\d+)\s*([A-Za-z]{2})?\s*(?:([+-])\s*(\d+)\s*(\w*)\.?)?$")
DUR_RE = re.compile(
    r"^(\d+(?:\.\d+)?)\s*(d|día|días|dia|dias|s|sem|semana|semanas|w|wk|"
    r"ms|mes|meses|h|hr|hrs|hora|horas)?\.?$")


# --------------------------------------------------------------------------- #
# Utilidades de formato
# --------------------------------------------------------------------------- #
def fmt_date(d: date | None) -> str:
    if not d:
        return ""
    return f"{DAYS_ES[d.weekday()]} {d.day:02d}/{d.month:02d}/{d.year % 100:02d}"


def fmt_dur(n: int) -> str:
    return "1 día" if n == 1 else f"{n} días"


def parse_duration(text: str, days_per_week: int = 5) -> int:
    s = str(text).strip().lower().replace(",", ".")
    m = DUR_RE.match(s)
    if not m:
        raise ValueError(f"Duración no válida: «{text}». Ejemplos: 5, 5d, 2sem, 16h")
    v = float(m.group(1))
    u = m.group(2) or "d"
    if u.startswith(("s", "w")):
        v *= max(1, days_per_week)
    elif u.startswith("m"):
        v *= max(1, days_per_week) * 4
    elif u.startswith("h"):
        v /= 8.0
    return max(0, int(round(v)))


def nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    d = date(year, month, 1)
    d += timedelta(days=(weekday - d.weekday()) % 7)
    return d + timedelta(weeks=n - 1)


def mexico_holidays(year: int) -> list[tuple[date, str]]:
    """Días de descanso obligatorio (Ley Federal del Trabajo, art. 74)."""
    days = [
        (date(year, 1, 1), "Año Nuevo"),
        (nth_weekday(year, 2, 0, 1), "Día de la Constitución"),
        (nth_weekday(year, 3, 0, 3), "Natalicio de Benito Juárez"),
        (date(year, 5, 1), "Día del Trabajo"),
        (date(year, 9, 16), "Día de la Independencia"),
        (nth_weekday(year, 11, 0, 3), "Día de la Revolución"),
        (date(year, 12, 25), "Navidad"),
    ]
    if year >= 2024 and (year - 2024) % 6 == 0:
        days.append((date(year, 10, 1), "Transmisión del Poder Ejecutivo Federal"))
    return sorted(days)


# --------------------------------------------------------------------------- #
# Modelo
# --------------------------------------------------------------------------- #
@dataclass
class Link:
    uid: int            # UID de la tarea predecesora
    type: str = "FS"
    lag: int = 0        # días laborables (puede ser negativo)


@dataclass
class Task:
    uid: int
    name: str = "Nueva tarea"
    duration: int = 1
    level: int = 0
    links: list = field(default_factory=list)
    percent: int = 0
    resources: str = ""
    notes: str = ""
    constraint: str | None = None   # ISO: "No comenzar antes del"
    collapsed: bool = False
    # ---- valores calculados (no se guardan) ----
    es: int = field(default=0, repr=False)
    ef: int = field(default=0, repr=False)
    ls: int = field(default=0, repr=False)
    lf: int = field(default=0, repr=False)
    slack: int = field(default=0, repr=False)
    start: date | None = field(default=None, repr=False)
    finish: date | None = field(default=None, repr=False)
    critical: bool = field(default=False, repr=False)
    summary: bool = field(default=False, repr=False)
    ms_eod: bool = field(default=False, repr=False)

    @property
    def milestone(self) -> bool:
        return self.duration == 0 and not self.summary

    def resource_list(self) -> list[str]:
        return [r.strip() for r in re.split(r"[;,]", self.resources or "") if r.strip()]


class Calendar:
    """Calendario laboral: días de la semana laborables + días feriados."""

    def __init__(self, start: date, workdays=(0, 1, 2, 3, 4), holidays=()):
        self.workdays = set(workdays)
        if not self.workdays:
            raise ValueError("El calendario debe tener al menos un día laborable.")
        self.holidays = set(holidays)
        d, guard = start, 0
        while not self.is_work(d):
            d += timedelta(days=1)
            guard += 1
            if guard > 4000:
                raise ValueError("No se encontró ningún día laborable en el calendario.")
        self.origin = d
        self._days = [d]

    def is_work(self, d: date) -> bool:
        return d.weekday() in self.workdays and d not in self.holidays

    def _grow(self):
        d = self._days[-1] + timedelta(days=1)
        while not self.is_work(d):
            d += timedelta(days=1)
        self._days.append(d)

    def date_of(self, offset: int) -> date:
        offset = max(0, offset)
        while len(self._days) <= offset:
            self._grow()
        return self._days[offset]

    def offset_of(self, d: date) -> int:
        """Índice del primer día laborable >= d."""
        if d <= self.origin:
            return 0
        while self._days[-1] < d:
            self._grow()
        return bisect_left(self._days, d)

    def floor_offset(self, d: date) -> int:
        """Índice del último día laborable <= d (-1 si es anterior al inicio)."""
        if d < self.origin:
            return -1
        o = self.offset_of(d)
        return o if self.date_of(o) == d else o - 1


class Project:
    def __init__(self):
        self.name = "Proyecto sin título"
        self.manager = ""
        self.start = date.today()
        self.workdays = [0, 1, 2, 3, 4]
        self.holidays: list[dict] = []      # [{"date": "2026-12-25", "name": "Navidad"}]
        self.tasks: list[Task] = []
        self.next_uid = 1
        # calculados
        self.cal: Calendar | None = None
        self.finish: date | None = None
        self.end_offset = 0
        self.errors: list[str] = []

    # ------------------------------------------------------------------ #
    # Estructura del esquema
    # ------------------------------------------------------------------ #
    def new_task(self, name="Nueva tarea", duration=1, level=0, index=None) -> Task:
        t = Task(uid=self.next_uid, name=name, duration=duration, level=level)
        self.next_uid += 1
        if index is None or index >= len(self.tasks):
            self.tasks.append(t)
        else:
            self.tasks.insert(max(0, index), t)
        return t

    def index_of(self, uid: int) -> int:
        for i, t in enumerate(self.tasks):
            if t.uid == uid:
                return i
        return -1

    def get(self, uid: int) -> Task | None:
        i = self.index_of(uid)
        return self.tasks[i] if i >= 0 else None

    def block_end(self, i: int) -> int:
        """Índice siguiente al último descendiente de la tarea i."""
        lvl = self.tasks[i].level
        j = i + 1
        while j < len(self.tasks) and self.tasks[j].level > lvl:
            j += 1
        return j

    def is_summary_idx(self, i: int) -> bool:
        return i + 1 < len(self.tasks) and self.tasks[i + 1].level > self.tasks[i].level

    def related(self, i: int, j: int) -> bool:
        """True si una tarea es ancestro de la otra."""
        a, b = min(i, j), max(i, j)
        return a != b and b < self.block_end(a)

    def normalize_levels(self):
        prev = -1
        for t in self.tasks:
            t.level = max(0, min(t.level, prev + 1))
            prev = t.level

    def visible_tasks(self) -> list[tuple[int, Task]]:
        out, hide_below = [], None
        for i, t in enumerate(self.tasks):
            if hide_below is not None:
                if t.level > hide_below:
                    continue
                hide_below = None
            out.append((i, t))
            if t.collapsed and self.is_summary_idx(i):
                hide_below = t.level
        return out

    def delete(self, uids) -> set:
        gone = set()
        for uid in uids:
            i = self.index_of(uid)
            if i < 0:
                continue
            for t in self.tasks[i:self.block_end(i)]:
                gone.add(t.uid)
        self.tasks = [t for t in self.tasks if t.uid not in gone]
        for t in self.tasks:
            t.links = [l for l in t.links if l.uid not in gone]
        self.normalize_levels()
        return gone

    def indent(self, uids):
        done = set()
        for i in sorted(i for i in (self.index_of(u) for u in uids) if i >= 0):
            t = self.tasks[i]
            if i == 0 or t.uid in done or t.level > self.tasks[i - 1].level:
                continue
            for x in self.tasks[i:self.block_end(i)]:
                x.level += 1
                done.add(x.uid)
        self.drop_invalid_links()

    def outdent(self, uids):
        done = set()
        for i in sorted(i for i in (self.index_of(u) for u in uids) if i >= 0):
            t = self.tasks[i]
            if t.level == 0 or t.uid in done:
                continue
            for x in self.tasks[i:self.block_end(i)]:
                x.level -= 1
                done.add(x.uid)
        self.normalize_levels()
        self.drop_invalid_links()

    def move(self, uid: int, direction: int) -> bool:
        i = self.index_of(uid)
        if i < 0:
            return False
        lvl, j = self.tasks[i].level, self.block_end(i)
        if direction < 0:
            k = i - 1
            while k >= 0 and self.tasks[k].level > lvl:
                k -= 1
            if k < 0 or self.tasks[k].level < lvl:
                return False
            self.tasks[k:j] = self.tasks[i:j] + self.tasks[k:i]
        else:
            if j >= len(self.tasks) or self.tasks[j].level != lvl:
                return False
            m = self.block_end(j)
            self.tasks[i:m] = self.tasks[j:m] + self.tasks[i:j]
        return True

    def drop_invalid_links(self):
        idx = {t.uid: i for i, t in enumerate(self.tasks)}
        for i, t in enumerate(self.tasks):
            t.links = [l for l in t.links
                       if l.uid in idx and l.uid != t.uid and not self.related(i, idx[l.uid])]

    # ------------------------------------------------------------------ #
    # Vínculos
    # ------------------------------------------------------------------ #
    def link_chain(self, uids, ltype="FS"):
        order = sorted(uids, key=self.index_of)
        for a, b in zip(order, order[1:]):
            ia, ib = self.index_of(a), self.index_of(b)
            if ia < 0 or ib < 0 or self.related(ia, ib):
                continue
            tb = self.tasks[ib]
            if not any(l.uid == a for l in tb.links):
                tb.links.append(Link(a, ltype, 0))

    def unlink(self, uids):
        s = set(uids)
        if len(s) == 1:
            u = next(iter(s))
            for t in self.tasks:
                if t.uid == u:
                    t.links = []
                else:
                    t.links = [l for l in t.links if l.uid != u]
        else:
            for t in self.tasks:
                if t.uid in s:
                    t.links = [l for l in t.links if l.uid not in s]

    def parse_links(self, text: str, task_uid: int) -> list[Link]:
        ti = self.index_of(task_uid)
        out, seen = [], set()
        for part in re.split(r"[;,]", text or ""):
            part = part.strip()
            if not part:
                continue
            m = LINK_RE.match(part)
            if not m:
                raise ValueError(f"Predecesora no válida: «{part}».\n"
                                 "Ejemplos: 3   4FC+2d   5CC   6FF-1d   (separe con ;)")
            rid = int(m.group(1))
            code = (m.group(2) or "FC").upper()
            if code not in CODE_IN:
                raise ValueError(f"Tipo de vínculo desconocido «{code}». Use FC, CC, FF o CF.")
            lag = 0
            if m.group(3):
                lag = int(m.group(4))
                unit = (m.group(5) or "d").lower()
                if unit.startswith(("s", "w")):
                    lag *= max(1, len(self.workdays))
                if m.group(3) == "-":
                    lag = -lag
            if rid < 1 or rid > len(self.tasks):
                raise ValueError(f"No existe la tarea con Id {rid}.")
            pi = rid - 1
            if pi == ti:
                raise ValueError("Una tarea no puede ser predecesora de sí misma.")
            if self.related(ti, pi):
                raise ValueError(f"La tarea {rid} es resumen o subtarea de esta; "
                                 "no se pueden vincular entre sí.")
            puid = self.tasks[pi].uid
            if puid in seen:
                continue
            seen.add(puid)
            out.append(Link(puid, CODE_IN[code], lag))
        return out

    def format_links(self, t: Task) -> str:
        idx = {x.uid: i + 1 for i, x in enumerate(self.tasks)}
        parts = []
        for l in t.links:
            if l.uid not in idx:
                continue
            s = str(idx[l.uid])
            if l.type != "FS" or l.lag:
                s += CODE_ES[l.type]
            if l.lag:
                s += f"{l.lag:+d}d"
            parts.append(s)
        return ";".join(parts)

    # ------------------------------------------------------------------ #
    # Programación CPM
    # ------------------------------------------------------------------ #
    def holiday_dates(self) -> set:
        out = set()
        for h in self.holidays:
            try:
                out.add(date.fromisoformat(h["date"]))
            except (KeyError, ValueError, TypeError):
                pass
        return out

    def schedule(self):
        self.errors = []
        cal = Calendar(self.start, self.workdays, self.holiday_dates())
        self.cal = cal
        self.normalize_levels()
        tasks = self.tasks
        if not tasks:
            self.finish, self.end_offset = cal.origin, 0
            return

        by_uid = {t.uid: t for t in tasks}
        idx_of = {t.uid: i for i, t in enumerate(tasks)}
        for i, t in enumerate(tasks):
            t.summary = self.is_summary_idx(i)

        leaves_of = {}
        for i, t in enumerate(tasks):
            if t.summary:
                leaves_of[t.uid] = [x.uid for x in tasks[i + 1:self.block_end(i)]
                                    if not x.summary]
            else:
                leaves_of[t.uid] = [t.uid]

        # Restricciones "No comenzar antes del" (las subtareas heredan las del resumen)
        cons, stack = {}, []
        for t in tasks:
            while stack and stack[-1][0] >= t.level:
                stack.pop()
            own = 0
            if t.constraint:
                try:
                    d = date.fromisoformat(t.constraint)
                    own = cal.floor_offset(d) + 1 if t.milestone else cal.offset_of(d)
                except ValueError:
                    own = 0
            eff = max(stack[-1][1] if stack else 0, own, 0)
            if not t.summary:
                cons[t.uid] = eff
            stack.append((t.level, eff))

        # Aristas entre tareas hoja (los vínculos de resúmenes se expanden)
        edges = set()
        for i, t in enumerate(tasks):
            valid = []
            for l in t.links:
                if l.uid not in by_uid or l.uid == t.uid or self.related(i, idx_of[l.uid]):
                    continue
                valid.append(l)
                for pu in leaves_of[l.uid]:
                    for su in leaves_of[t.uid]:
                        edges.add((pu, su, l.type, l.lag))
            t.links = valid

        leaves = [t.uid for t in tasks if not t.summary]
        preds, succs = defaultdict(list), defaultdict(list)
        indeg = {u: 0 for u in leaves}
        for pu, su, ty, lag in edges:
            preds[su].append((pu, ty, lag))
            succs[pu].append((su, ty, lag))
            indeg[su] += 1

        q = deque(u for u in leaves if indeg[u] == 0)
        order = []
        while q:
            u = q.popleft()
            order.append(u)
            for su, _, _ in succs[u]:
                indeg[su] -= 1
                if indeg[su] == 0:
                    q.append(su)
        if len(order) < len(leaves):
            cyc = [u for u in leaves if indeg[u] > 0]
            ids = ", ".join(str(idx_of[u] + 1) for u in cyc[:12])
            self.errors.append(f"Dependencia circular detectada (afecta a las tareas: {ids})")
            order += cyc

        # Pasada hacia adelante
        done = set()
        for u in order:
            t = by_uid[u]
            d = t.duration
            es = cons.get(u, 0)
            for pu, ty, lag in preds[u]:
                if pu not in done:
                    continue
                p = by_uid[pu]
                if ty == "FS":
                    c = p.ef + lag
                elif ty == "SS":
                    c = p.es + lag
                elif ty == "FF":
                    c = p.ef + lag - d
                else:  # SF
                    c = p.es + lag - d
                es = max(es, c)
            t.es = max(es, 0)
            t.ef = t.es + d
            done.add(u)

        end = max((by_uid[u].ef for u in leaves), default=0)

        # Pasada hacia atrás
        bdone = set()
        for u in reversed(order):
            t = by_uid[u]
            d = t.duration
            lf = end
            for su, ty, lag in succs[u]:
                if su not in bdone:
                    continue
                s = by_uid[su]
                if ty == "FS":
                    c = s.ls - lag
                elif ty == "SS":
                    c = s.ls - lag + d
                elif ty == "FF":
                    c = s.lf - lag
                else:  # SF
                    c = s.lf - lag + d
                lf = min(lf, c)
            t.lf = lf
            t.ls = lf - d
            t.slack = t.ls - t.es
            t.critical = t.slack <= 0
            bdone.add(u)

        # Fechas
        for u in leaves:
            t = by_uid[u]
            if t.duration == 0:
                t.ms_eod = t.es > 0
                t.start = t.finish = cal.date_of(t.es - 1) if t.es > 0 else cal.date_of(0)
            else:
                t.ms_eod = False
                t.start = cal.date_of(t.es)
                t.finish = cal.date_of(t.ef - 1)

        # Tareas de resumen
        for t in tasks:
            if not t.summary:
                continue
            ch = [by_uid[u] for u in leaves_of[t.uid]]
            t.es = min(c.es for c in ch)
            t.ef = max(c.ef for c in ch)
            t.ls = min(c.ls for c in ch)
            t.lf = max(c.lf for c in ch)
            t.start = min(c.start for c in ch)
            t.finish = max(c.finish for c in ch)
            t.duration = max(0, t.ef - t.es)
            t.slack = min(c.slack for c in ch)
            t.critical = any(c.critical for c in ch)
            t.ms_eod = False
            tot = sum(c.duration for c in ch)
            if tot:
                t.percent = int(round(sum(c.duration * c.percent for c in ch) / tot))
            else:
                t.percent = int(round(sum(c.percent for c in ch) / len(ch)))

        self.end_offset = end
        self.finish = max(by_uid[u].finish for u in leaves)

    # ------------------------------------------------------------------ #
    # Recursos
    # ------------------------------------------------------------------ #
    def resource_usage(self) -> dict:
        if self.cal is None:
            self.schedule()
        usage, daymap = {}, defaultdict(lambda: defaultdict(list))
        for t in self.tasks:
            if t.summary:
                continue
            for r in t.resource_list():
                u = usage.setdefault(r, {"tasks": [], "work": 0, "first": None, "last": None})
                u["tasks"].append(t)
                u["work"] += t.duration
                if t.duration > 0:
                    u["first"] = t.start if u["first"] is None else min(u["first"], t.start)
                    u["last"] = t.finish if u["last"] is None else max(u["last"], t.finish)
                    for o in range(t.es, t.ef):
                        daymap[r][o].append(t.uid)
        for r, u in usage.items():
            over = sorted(o for o, lst in daymap[r].items() if len(lst) > 1)
            u["over_days"] = len(over)
            u["over_dates"] = [self.cal.date_of(o) for o in over[:60]]
        return usage

    # ------------------------------------------------------------------ #
    # Serialización
    # ------------------------------------------------------------------ #
    def to_dict(self) -> dict:
        return {
            "format": FILE_FORMAT, "version": FILE_VERSION,
            "name": self.name, "manager": self.manager,
            "start": self.start.isoformat(),
            "workdays": list(self.workdays), "holidays": list(self.holidays),
            "next_uid": self.next_uid,
            "tasks": [{
                "uid": t.uid, "name": t.name, "duration": t.duration, "level": t.level,
                "links": [[l.uid, l.type, l.lag] for l in t.links],
                "percent": t.percent, "resources": t.resources, "notes": t.notes,
                "constraint": t.constraint, "collapsed": t.collapsed,
            } for t in self.tasks],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Project":
        if d.get("format") != FILE_FORMAT:
            raise ValueError("El archivo no es un proyecto de ProyectoPy.")
        p = cls()
        p.name = d.get("name", p.name)
        p.manager = d.get("manager", "")
        p.start = date.fromisoformat(d.get("start", date.today().isoformat()))
        p.workdays = [int(x) for x in d.get("workdays", [0, 1, 2, 3, 4])] or [0, 1, 2, 3, 4]
        p.holidays = [dict(h) for h in d.get("holidays", []) if isinstance(h, dict)]
        for td in d.get("tasks", []):
            t = Task(uid=int(td["uid"]), name=td.get("name", ""),
                     duration=int(td.get("duration", 1)), level=int(td.get("level", 0)),
                     percent=int(td.get("percent", 0)), resources=td.get("resources", ""),
                     notes=td.get("notes", ""), constraint=td.get("constraint"),
                     collapsed=bool(td.get("collapsed", False)))
            t.links = [Link(int(a), b if b in LINK_TYPES else "FS", int(c))
                       for a, b, c in td.get("links", [])]
            p.tasks.append(t)
        p.next_uid = max([d.get("next_uid", 1)] + [t.uid + 1 for t in p.tasks])
        p.normalize_levels()
        return p
