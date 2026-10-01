# -*- coding: utf-8 -*-
"""pyRevit script: exports data from the open Revit model to a JSON file.
Run it from a pyRevit button or the pyRevit script console and choose where to save the file.
The companion web app does not load this file: it is for your own schedules and checks.
Revit units are feet; everything is converted to millimetres.
Viewer mapping: pos = [X, Z (elevation), Y], size = [dX, dZ, dY].
Geometry is the bounding box of each element only. This is a data export, NOT a replacement for the .rvt model. Everything in the output comes from the open
Revit document: nothing is invented, and empty categories are simply empty.
Rebar is counted (see revit_summary) but not exported as geometry, because it can be huge."""
import json
from pyrevit import revit, DB, forms

FT = 304.8
SQFT = 0.092903
doc = revit.doc

CATS = [
    (DB.BuiltInCategory.OST_StructuralColumns, 'Structural Columns', 'Structure'),
    (DB.BuiltInCategory.OST_StructuralFraming, 'Structural Framing', 'Structure'),
    (DB.BuiltInCategory.OST_Floors, 'Floors', 'Structure'),
    (DB.BuiltInCategory.OST_Roofs, 'Roofs', 'Structure'),
    (DB.BuiltInCategory.OST_Walls, 'Walls', 'Architecture'),
    (DB.BuiltInCategory.OST_Doors, 'Doors', 'Architecture'),
    (DB.BuiltInCategory.OST_Windows, 'Windows', 'Architecture'),
    (DB.BuiltInCategory.OST_Stairs, 'Stairs', 'Architecture'),
    (DB.BuiltInCategory.OST_Ramps, 'Ramps', 'Architecture'),
    (DB.BuiltInCategory.OST_Railings, 'Railings', 'Architecture'),
    (DB.BuiltInCategory.OST_CurtainWallPanels, 'Curtain Wall Panels', 'Architecture'),
    (DB.BuiltInCategory.OST_CurtainWallMullions, 'Curtain Wall Mullions', 'Architecture'),
    (DB.BuiltInCategory.OST_StructuralFoundation, 'Foundations', 'Structure'),
    (DB.BuiltInCategory.OST_Planting, 'Planting', 'Architecture'),
    (DB.BuiltInCategory.OST_PipeCurves, 'Pipes', 'Plumbing'),
    (DB.BuiltInCategory.OST_CableTray, 'Cable Trays', 'Electrical'),
    (DB.BuiltInCategory.OST_DuctCurves, 'Ducts', 'HVAC/Fire'),
]


def box(e):
    b = e.get_BoundingBox(None)
    if b is None:
        return None
    mn, mx = b.Min, b.Max
    pos = [(mn.X + mx.X) / 2, (mn.Z + mx.Z) / 2, (mn.Y + mx.Y) / 2]
    size = [mx.X - mn.X, mx.Z - mn.Z, mx.Y - mn.Y]
    return [int(round(v * FT)) for v in pos], [int(round(v * FT)) for v in size]


def type_name(e):
    t = doc.GetElement(e.GetTypeId())
    return DB.Element.Name.GetValue(t) if t else ''


def material_name(e):
    ids = list(e.GetMaterialIds(False))
    return doc.GetElement(ids[0]).Name if ids else ''


lv_elems = sorted(DB.FilteredElementCollector(doc).OfClass(DB.Level), key=lambda l: l.Elevation)
levels, lvmap = [], {}
for i, l in enumerate(lv_elems):
    elev = int(round(l.Elevation * FT))
    nxt = int(round(lv_elems[i + 1].Elevation * FT)) if i + 1 < len(lv_elems) else elev + 1200
    lid = 'L%02d' % i
    lvmap[l.Id.IntegerValue] = lid
    levels.append({'id': lid, 'name': l.Name, 'short': str(i), 'elevation': elev, 'height': nxt - elev, 'top': elev + 200, 'area_m2': 0})

rooms = []
for r in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_Rooms).WhereElementIsNotElementType():
    if r.Area <= 0:
        continue
    bb = box(r)
    if not bb:
        continue
    (px, py, pz), (sx, sy, sz) = bb
    rooms.append({'guid': r.UniqueId, 'number': r.Number,
                  'name': r.get_Parameter(DB.BuiltInParameter.ROOM_NAME).AsString(),
                  'level': lvmap.get(r.LevelId.IntegerValue),
                  'type': r.get_Parameter(DB.BuiltInParameter.ROOM_DEPARTMENT).AsString() or 'Office',
                  'area_m2': round(r.Area * SQFT, 2), 'length': sx, 'width': sz,
                  'height': int(round(r.UnboundedHeight * FT)),
                  'finish': r.get_Parameter(DB.BuiltInParameter.ROOM_FINISH_FLOOR).AsString() or '',
                  'x': px - sx // 2, 'y': pz - sz // 2, 'w': sx, 'd': sz})

elements = []
for cat, name, system in CATS:
    for e in DB.FilteredElementCollector(doc).OfCategory(cat).WhereElementIsNotElementType():
        bb = box(e)
        if not bb:
            continue
        lid = lvmap.get(e.LevelId.IntegerValue) if hasattr(e, 'LevelId') else None
        elements.append({'guid': e.UniqueId, 'category': name, 'system': system, 'level': lid or 'ALL',
                         'type': type_name(e), 'material': material_name(e), 'pos': bb[0], 'size': bb[1]})

def collect_grids():
    xs, ys = [], []
    for g in DB.FilteredElementCollector(doc).OfClass(DB.Grid):
        c = g.Curve
        if not isinstance(c, DB.Line):
            continue
        a, b = c.GetEndPoint(0), c.GetEndPoint(1)
        if abs(b.X - a.X) < abs(b.Y - a.Y):
            xs.append((int(round(a.X * FT)), g.Name))
        else:
            ys.append((int(round(a.Y * FT)), g.Name))
    xs.sort()
    ys.sort()
    return xs, ys


gx, gy = collect_grids()

# Footprint = extent of exported elements (not a fixed value)
if elements:
    minx = min(e['pos'][0] - e['size'][0] // 2 for e in elements)
    maxx = max(e['pos'][0] + e['size'][0] // 2 for e in elements)
    miny = min(e['pos'][2] - e['size'][2] // 2 for e in elements)
    maxy = max(e['pos'][2] + e['size'][2] // 2 for e in elements)
    footprint = {'length': maxx - minx, 'width': maxy - miny}
else:
    footprint = {'length': 0, 'width': 0}

for lv in levels:
    lv['area_m2'] = round(sum(r['area_m2'] for r in rooms if r['level'] == lv['id']), 2)

# Counts straight from the model, including categories we do not export as geometry
EXTRA = [(DB.BuiltInCategory.OST_Rebar, 'Rebar'), (DB.BuiltInCategory.OST_Rooms, 'Rooms (placed)')]
summary = {}
for cat, name, system in CATS:
    summary[name] = sum(1 for _ in DB.FilteredElementCollector(doc).OfCategory(cat).WhereElementIsNotElementType())
for cat, name in EXTRA:
    summary[name] = sum(1 for _ in DB.FilteredElementCollector(doc).OfCategory(cat).WhereElementIsNotElementType())

data = {'project': {'code': 'SIH26116', 'name': doc.Title, 'units': 'mm', 'storeys': len(levels),
                    'source': 'Exported from the open Revit document',
                    'footprint': footprint,
                    'grid': {'x': [v for v, n in gx], 'y': [v for v, n in gy],
                             'labelsX': [n for v, n in gx], 'labelsY': [n for v, n in gy]},
                    'built_up_m2': round(sum(r['area_m2'] for r in rooms), 2), 'structure': '', 'mep': ''},
        'levels': levels, 'rooms': rooms, 'elements': elements,
        'revit_summary': summary,
        'parking': {'slots': [], 'aisle': {'x': 0, 'y': 0, 'w': 0, 'd': 0}, 'ramp': {}, 'summary': {}}}

path = forms.save_file(file_ext='json', default_name='building')
if path:
    with open(path, 'w') as f:
        json.dump(data, f)
    forms.alert('Exported %d rooms and %d elements.' % (len(rooms), len(elements)))
