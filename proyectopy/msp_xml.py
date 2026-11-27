"""
ProyectoPy - Intercambio con Microsoft Project mediante XML (formato MSPDI).

  * Exportar: el archivo .xml se abre directamente en MS Project 2007 o posterior.
  * Importar: en MS Project use Archivo > Guardar como > "Formato XML (*.xml)".
    (Los archivos .mpp son binarios propietarios y no se pueden leer directamente.)
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta

from .scheduler import Link, Project, Task

NS = "http://schemas.microsoft.com/project"
TYPE_TO_XML = {"FF": 0, "FS": 1, "SF": 2, "SS": 3}
XML_TO_TYPE = {v: k for k, v in TYPE_TO_XML.items()}


def _sub(parent, tag, text=None):
    el = ET.SubElement(parent, tag)
    if text is not None:
        el.text = str(text)
    return el


def _dt(d: date, t: str = "08:00:00") -> str:
    return f"{d.isoformat()}T{t}"


# --------------------------------------------------------------------------- #
# Exportar
# --------------------------------------------------------------------------- #
def export_mspdi(project: Project, path: str):
    p = project
    p.schedule()
    mpd = 480
    root = ET.Element("Project", {"xmlns": NS})
    _sub(root, "SaveVersion", 14)
    _sub(root, "Name", f"{p.name or 'Proyecto'}.xml")
    _sub(root, "Title", p.name)
    if p.manager:
        _sub(root, "Manager", p.manager)
    _sub(root, "ScheduleFromStart", 1)
    _sub(root, "StartDate", _dt(p.cal.origin))
    _sub(root, "FinishDate", _dt(p.finish, "17:00:00"))
    _sub(root, "CalendarUID", 1)
    _sub(root, "DefaultStartTime", "08:00:00")
    _sub(root, "DefaultFinishTime", "17:00:00")
    _sub(root, "MinutesPerDay", mpd)
    _sub(root, "MinutesPerWeek", mpd * len(p.workdays))
    _sub(root, "DaysPerMonth", 20)
    _sub(root, "DurationFormat", 7)

    # Calendario
    cal = _sub(_sub(root, "Calendars"), "Calendar")
    _sub(cal, "UID", 1)
    _sub(cal, "Name", "Estándar")
    _sub(cal, "IsBaseCalendar", 1)
    _sub(cal, "BaseCalendarUID", -1)
    wds = _sub(cal, "WeekDays")
    for daytype in range(1, 8):                     # 1 = domingo ... 7 = sábado
        py = (daytype - 2) % 7
        wd = _sub(wds, "WeekDay")
        _sub(wd, "DayType", daytype)
        work = py in p.workdays
        _sub(wd, "DayWorking", 1 if work else 0)
        if work:
            wt = _sub(wd, "WorkingTimes")
            for a, b in (("08:00:00", "12:00:00"), ("13:00:00", "17:00:00")):
                w = _sub(wt, "WorkingTime")
                _sub(w, "FromTime", a)
                _sub(w, "ToTime", b)
    for d in sorted(p.holiday_dates()):
        wd = _sub(wds, "WeekDay")
        _sub(wd, "DayType", 0)
        _sub(wd, "DayWorking", 0)
        tp = _sub(wd, "TimePeriod")
        _sub(tp, "FromDate", _dt(d, "00:00:00"))
        _sub(tp, "ToDate", _dt(d, "23:59:00"))

    # Tareas
    tasks_el = _sub(root, "Tasks")
    t0 = _sub(tasks_el, "Task")
    for tag, val in (("UID", 0), ("ID", 0), ("Name", p.name), ("Type", 1),
                     ("OutlineNumber", 0), ("OutlineLevel", 0),
                     ("Start", _dt(p.cal.origin)), ("Finish", _dt(p.finish, "17:00:00")),
                     ("Summary", 1)):
        _sub(t0, tag, val)

    counters: list[int] = []
    for i, t in enumerate(p.tasks):
        lvl = t.level
        counters = counters[:lvl + 1]
        while len(counters) < lvl + 1:
            counters.append(0)
        counters[lvl] += 1
        outline = ".".join(map(str, counters))

        if t.milestone:
            st = fi = _dt(t.start, "17:00:00" if t.ms_eod else "08:00:00")
        else:
            st, fi = _dt(t.start), _dt(t.finish, "17:00:00")

        el = _sub(tasks_el, "Task")
        _sub(el, "UID", t.uid)
        _sub(el, "ID", i + 1)
        _sub(el, "Name", t.name)
        _sub(el, "Type", 0)
        _sub(el, "IsNull", 0)
        _sub(el, "WBS", outline)
        _sub(el, "OutlineNumber", outline)
        _sub(el, "OutlineLevel", lvl + 1)
        _sub(el, "Start", st)
        _sub(el, "Finish", fi)
        _sub(el, "Duration", f"PT{t.duration * 8}H0M0S")
        _sub(el, "DurationFormat", 7)
        _sub(el, "Milestone", 1 if t.milestone else 0)
        _sub(el, "Summary", 1 if t.summary else 0)
        _sub(el, "Critical", 1 if t.critical else 0)
        _sub(el, "PercentComplete", t.percent)
        if t.constraint:
            _sub(el, "ConstraintType", 4)          # No comenzar antes del
            _sub(el, "CalendarUID", -1)
            hhmm = "17:00:00" if t.milestone else "08:00:00"
            _sub(el, "ConstraintDate", f"{t.constraint}T{hhmm}")
        else:
            _sub(el, "ConstraintType", 0)          # Lo antes posible
            _sub(el, "CalendarUID", -1)
        if t.notes:
            _sub(el, "Notes", t.notes)
        _sub(el, "Active", 1)
        _sub(el, "Manual", 0)
        for l in t.links:
            pl = _sub(el, "PredecessorLink")
            _sub(pl, "PredecessorUID", l.uid)
            _sub(pl, "Type", TYPE_TO_XML.get(l.type, 1))
            _sub(pl, "CrossProject", 0)
            _sub(pl, "LinkLag", l.lag * mpd * 10)  # décimas de minuto
            _sub(pl, "LagFormat", 7)

    # Recursos y asignaciones
    names: list[str] = []
    for t in p.tasks:
        if not t.summary:
            for r in t.resource_list():
                if r not in names:
                    names.append(r)
    res_el = _sub(root, "Resources")
    for k, n in enumerate(names, 1):
        r = _sub(res_el, "Resource")
        _sub(r, "UID", k)
        _sub(r, "ID", k)
        _sub(r, "Name", n)
        _sub(r, "Type", 1)
        _sub(r, "IsNull", 0)
        _sub(r, "MaxUnits", "1.00")
    asg_el = _sub(root, "Assignments")
    aid = 1
    for t in p.tasks:
        if t.summary:
            continue
        for r in t.resource_list():
            a = _sub(asg_el, "Assignment")
            _sub(a, "UID", aid)
            _sub(a, "TaskUID", t.uid)
            _sub(a, "ResourceUID", names.index(r) + 1)
            _sub(a, "Units", 1)
            aid += 1

    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="utf-8", xml_declaration=True)


# --------------------------------------------------------------------------- #
# Importar
# --------------------------------------------------------------------------- #
_DUR = re.compile(r"^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?"
                  r"(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$")


def _dur_days(text, mpd=480) -> int:
    if not text:
        return 0
    m = _DUR.match(text.strip())
    if not m:
        return 0
    d, h, mi, s = (float(g) if g else 0.0 for g in m.groups())
    minutes = d * mpd + h * 60 + mi + s / 60
    return int(round(minutes / mpd))


def _add_range(hol: list, a, b, name="Día no laborable"):
    if not a:
        return
    try:
        d0 = date.fromisoformat(a[:10])
        d1 = date.fromisoformat((b or a)[:10])
    except ValueError:
        return
    existing = {h["date"] for h in hol}
    d, n = d0, 0
    while d <= d1 and n < 400:
        if d.isoformat() not in existing:
            hol.append({"date": d.isoformat(), "name": name})
        d += timedelta(days=1)
        n += 1


def import_mspdi(path: str) -> Project:
    root = ET.parse(path).getroot()
    ns = root.tag[:root.tag.index("}") + 1] if root.tag.startswith("{") else ""
    if root.tag != ns + "Project":
        raise ValueError("El archivo no es un XML de Microsoft Project (MSPDI).")

    def tx(el, name, default=None):
        c = el.find(ns + name)
        return c.text if c is not None and c.text is not None else default

    p = Project()
    name = tx(root, "Title") or tx(root, "Name") or "Proyecto importado"
    p.name = name[:-4] if name.lower().endswith(".xml") else name
    p.manager = tx(root, "Manager", "")
    sd = tx(root, "StartDate")
    if sd:
        p.start = date.fromisoformat(sd[:10])
    mpd = int(float(tx(root, "MinutesPerDay", "480") or 480)) or 480

    # Calendario base
    cal_uid = tx(root, "CalendarUID", "1")
    cals = root.find(ns + "Calendars")
    if cals is not None:
        for c in cals.findall(ns + "Calendar"):
            if tx(c, "UID") != cal_uid:
                continue
            workdays, hol = set(p.workdays), []
            wds = c.find(ns + "WeekDays")
            if wds is not None:
                for wd in wds.findall(ns + "WeekDay"):
                    dt = int(tx(wd, "DayType", "-1"))
                    working = tx(wd, "DayWorking", "0") == "1"
                    if 1 <= dt <= 7:
                        (workdays.add if working else workdays.discard)((dt - 2) % 7)
                    elif dt == 0 and not working:
                        tp = wd.find(ns + "TimePeriod")
                        if tp is not None:
                            _add_range(hol, tx(tp, "FromDate"), tx(tp, "ToDate"))
            exs = c.find(ns + "Exceptions")
            if exs is not None:
                for ex in exs.findall(ns + "Exception"):
                    if tx(ex, "DayWorking", "0") == "1":
                        continue
                    tp = ex.find(ns + "TimePeriod")
                    if tp is not None:
                        _add_range(hol, tx(tp, "FromDate"), tx(tp, "ToDate"),
                                   tx(ex, "Name", "Día no laborable"))
            if workdays:
                p.workdays = sorted(workdays)
            p.holidays = sorted(hol, key=lambda h: h["date"])
            break

    # Tareas
    rows, starts = [], {}
    tasks_el = root.find(ns + "Tasks")
    if tasks_el is not None:
        for te in tasks_el.findall(ns + "Task"):
            uid = int(tx(te, "UID", "0"))
            lvl = int(tx(te, "OutlineLevel", "1"))
            if uid == 0 or lvl == 0 or tx(te, "IsNull", "0") == "1":
                continue
            t = Task(uid=uid, name=tx(te, "Name", "") or "(sin nombre)",
                     duration=_dur_days(tx(te, "Duration"), mpd), level=lvl - 1)
            if tx(te, "Milestone", "0") == "1":
                t.duration = 0
            t.percent = max(0, min(100, int(float(tx(te, "PercentComplete", "0")))))
            t.notes = tx(te, "Notes", "") or ""
            ctype, cdate = tx(te, "ConstraintType", "0"), tx(te, "ConstraintDate")
            if ctype in ("2", "4") and cdate:       # Debe comenzar el / No comenzar antes del
                t.constraint = cdate[:10]
            for pl in te.findall(ns + "PredecessorLink"):
                puid = int(tx(pl, "PredecessorUID", "-1"))
                ty = XML_TO_TYPE.get(int(tx(pl, "Type", "1")), "FS")
                lag = int(round(float(tx(pl, "LinkLag", "0")) / (mpd * 10)))
                t.links.append(Link(puid, ty, lag))
            starts[uid] = tx(te, "Start")
            rows.append((int(tx(te, "ID", "0")), t))
    rows.sort(key=lambda r: r[0])
    p.tasks = [t for _, t in rows]

    # Recursos
    res_names = {}
    res_el = root.find(ns + "Resources")
    if res_el is not None:
        for r in res_el.findall(ns + "Resource"):
            n = tx(r, "Name")
            if n:
                res_names[tx(r, "UID")] = n
    by_uid = {t.uid: t for t in p.tasks}
    asg_el = root.find(ns + "Assignments")
    if asg_el is not None:
        for a in asg_el.findall(ns + "Assignment"):
            t = by_uid.get(int(tx(a, "TaskUID", "-1")))
            n = res_names.get(tx(a, "ResourceUID"))
            if t and n and n not in t.resource_list():
                t.resources = f"{t.resources};{n}" if t.resources else n

    p.next_uid = max([1] + [t.uid + 1 for t in p.tasks])
    p.normalize_levels()
    p.drop_invalid_links()
    p.schedule()

    # Conservar la posición de tareas colocadas a mano en MS Project
    for t in p.tasks:
        if t.summary or t.links or t.constraint or not starts.get(t.uid):
            continue
        try:
            sdt = datetime.fromisoformat(starts[t.uid][:19])
        except ValueError:
            continue
        d = sdt.date()
        if t.milestone and sdt.hour < 12:
            d -= timedelta(days=1)          # hito al inicio del día = fin del día anterior
        if d > t.start:
            t.constraint = d.isoformat()
    p.schedule()
    return p
