"""Import the supplied Shinshu BVE maps and route announcements into web assets."""
import argparse
import ast
from bisect import bisect_right
from collections import defaultdict
from functools import lru_cache
from importlib.machinery import SourceFileLoader
import json
import math
import operator
from pathlib import Path
import re
import subprocess

helpers = SourceFileLoader("yagan_helpers", str(Path(__file__).with_name("import-yagan-bve.py"))).load_module()
read, merge, bounds_at, join_platforms = helpers.read, helpers.merge, helpers.bounds_at, helpers.join_platforms
NUMBER = helpers.NUMBER
COMMENT = re.compile(r"'[^']*'|(?://|\#)[^\r\n]*")
COMMAND = re.compile(r"(\w+)\s*(?:\[\s*([^\]]*)\s*\])?\s*\.\s*([\w.]+)\s*\((.*)\)\s*$", re.I | re.S)
OPERATORS = {ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.Mod: operator.mod}
CONFIGS = [
    ("chuo-kofu", "中央本線", "chuoLine_9066M/9066Map.txt"),
    ("oito", "大糸線", "ooito/334Map.txt"),
    ("shinonoi", "篠ノ井線", "ooito/1012Map.txt"),
    ("chuo-shinshu", "中央本線・篠ノ井線", "ooito/428CMap.txt"),
]


def arguments(text):
    parts, start, depth, quoted = [], 0, 0, False
    for index, char in enumerate(text):
        if char == "'":
            quoted = not quoted
        if quoted:
            continue
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        elif char == "," and depth == 0:
            parts.append(text[start:index].strip())
            start = index + 1
    parts.append(text[start:].strip())
    return parts if text.strip() else []


@lru_cache(maxsize=None)
def syntax(text):
    text = re.sub(r"'[^']*'|\b0+\d+\b", lambda m: m[0].replace("\\", "\\\\")
                  if m[0].startswith("'") else str(int(m[0])), text)
    text = re.sub(r"\$([a-zA-Z0-9_]\w*)", lambda m: "v_" + m[1].lower(), text)
    return ast.parse(text, mode="eval").body


def evaluate(text, values):
    def node_value(node):
        if isinstance(node, ast.Constant) and type(node.value) in (str, int, float):
            return node.value
        if isinstance(node, ast.Name):
            return values[node.id.lower()]
        if isinstance(node, ast.UnaryOp):
            value = node_value(node.operand)
            if isinstance(node.op, ast.USub):
                return -value
            if isinstance(node.op, ast.UAdd):
                return value
        if isinstance(node, ast.BinOp):
            a, b = node_value(node.left), node_value(node.right)
            if isinstance(node.op, ast.Add):
                return str(a) + str(b) if isinstance(a, str) or isinstance(b, str) else a + b
            if type(node.op) in OPERATORS:
                return OPERATORS[type(node.op)](a, b)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            functions = {"floor": math.floor, "ceil": math.ceil, "sin": math.sin, "cos": math.cos,
                         "tan": math.tan, "atan": math.atan, "atan2": math.atan2, "sqrt": math.sqrt,
                         "abs": abs, "rand": lambda maximum=1: maximum / 2}
            return functions[node.func.id.lower()](*[node_value(arg) for arg in node.args])
        raise ValueError("Unsupported BVE numeric expression")
    return node_value(syntax(text))


def key_string(value):
    return "0" if value in ("", None, 0) else str(value).lower()


class BveMap:
    def __init__(self, master):
        self.master = master
        self.root = master.parent
        self.values = {"distance": 0, "null": None, "pi": math.pi}
        self.commands = []
        self.files = []
        self.lists = {}
        self.load(master)

    def path(self, filename):
        return (self.root / filename.replace("\\", "/")).resolve()

    def value(self, text):
        return evaluate(text, self.values) if text.strip() else None

    def load(self, path):
        self.files.append(str(path.relative_to(self.root)))
        content = read(path).split("\n", 1)[1]
        content = COMMENT.sub(lambda m: m[0] if m[0].startswith("'") else "", content)
        for statement in content.split(";"):
            statement = statement.strip()
            if not statement:
                continue
            try:
                include = re.fullmatch(r"include\s+(.+)", statement, re.I | re.S)
                if include:
                    self.load(self.path(self.value(include[1])))
                    continue
                variable = re.fullmatch(r"\$(\w+)\s*=\s*(.+)", statement, re.S)
                if variable:
                    # A few variables contain unrelated sound commands.
                    try:
                        self.values["v_" + variable[1].lower()] = self.value(variable[2])
                    except (ValueError, KeyError, SyntaxError):
                        self.values["v_" + variable[1].lower()] = None
                    continue
                match = COMMAND.fullmatch(statement)
                if match is None:
                    self.values["distance"] = float(self.value(statement))
                    continue
                element, raw_key, method, raw_arguments = match.groups()
                element, method = element.lower(), method.lower()
                relevant = element in {"curve", "gradient", "legacy", "track", "station", "repeater",
                                       "signal", "section", "speedlimit", "sound", "rollingnoise", "structure"}
                if not relevant:
                    continue
                if method == "load" and element in {"structure", "station", "sound", "signal"}:
                    filename = self.value(raw_arguments)
                    self.lists[element] = self.path(filename)
                    continue
                if element in {"structure", "repeater", "signal", "track", "station", "sound"} and raw_key is None:
                    continue
                args = [self.value(arg) for arg in arguments(raw_arguments)]
                key = key_string(self.value(raw_key)) if raw_key is not None else None
                self.commands.append((self.values["distance"], element, key, method, args))
            except Exception as error:
                raise ValueError(f"{path.name}: {statement[:160]}") from error

    def table(self, kind):
        return {row[0].lower(): row for row in helpers.rows(self.lists[kind])
                if row and row[0].strip() and not row[0].startswith("#")}


class Profile:
    def __init__(self, commands, element, axis=None, key=None):
        state, transition = 0, False
        self.knots = [(-1e9, 0, False)]
        for s, obj, name, method, args in sorted(commands, key=lambda c: c[0]):
            if obj == "legacy" and element in {"curve", "gradient"}:
                if method != ("curve" if element == "curve" else "pitch"):
                    continue
                method = "change"
            elif obj != element or key is not None and name != key:
                continue
            if axis:
                if method == "position":
                    args = [args[0 if axis == "x" else 1] if len(args) > (0 if axis == "x" else 1) else 0]
                    method = "interpolate"
                elif method == axis + ".interpolate":
                    method = "interpolate"
                else:
                    continue
            if method == "begintransition":
                self.knots.append((s, state, False))
                transition = True
                continue
            if method not in {"interpolate", "change", "begin", "begincircular", "beginconst", "end"}:
                continue
            if method == "end":
                value = 0
            else:
                value = args[0] if args and args[0] is not None else state
                if element == "curve":
                    value = 1 / value if value else 0
            interpolate = method == "interpolate" or transition and method != "change"
            state = value
            self.knots.append((s, value, interpolate))
            transition = False
        self.knots = list({s: (s, value, interpolate) for s, value, interpolate in self.knots}.values())
        self.distances = [knot[0] for knot in self.knots]
        self.sinusoidal = element == "curve"

    def at(self, s):
        index = max(0, bisect_right(self.distances, s) - 1)
        a, before, _ = self.knots[index]
        if index + 1 == len(self.knots):
            return before
        b, after, interpolate = self.knots[index + 1]
        if not interpolate or b == a:
            return before
        t = (s - a) / (b - a)
        if self.sinusoidal:
            t = (1 - math.cos(math.pi * t)) / 2
        return before + (after - before) * t


def repeater_spans(commands, lo, hi):
    grouped = defaultdict(list)
    for command in commands:
        if command[1] == "repeater":
            grouped[command[2]].append(command)
    for repeater, commands in grouped.items():
        commands.sort(key=lambda c: c[0])
        for index, (s, _, _, method, args) in enumerate(commands):
            end = commands[index + 1][0] if index + 1 < len(commands) else hi
            a, b = max(lo, s), min(hi, end)
            if method not in {"begin", "begin0"} or a >= b:
                continue
            if method == "begin0":
                track, *_, interval = args[:4]
                x = y = z = yaw = 0
                models = args[4:]
            else:
                track, x, y, z, _, yaw, _, _, _, interval = args[:10]
                models = args[10:]
            yield dict(sStart=a, sEnd=b, track=key_string(track), x=x or 0, y=y or 0, z=z or 0,
                       yaw=yaw or 0, interval=interval or 0, model=str(models[0]).lower(), key=repeater)


def time_string(value):
    return helpers.time_string(value.strip())


def platform_model(path):
    return bool(re.search(r"form|platform|^pf_|itaeki|^inao_eki|^matsu_shima", Path(path).stem, re.I)) and not re.search(
        r"roof|slope|stop|wall|sign|bench|pole", Path(path).stem, re.I
    )


def combine_platforms(platforms):
    """Join contiguous slabs, side strips and center infills on one platform."""
    joined = []
    while platforms:
        first, *platforms = platforms
        pieces = [first]
        for piece in pieces:
            a = piece["edges"]
            for candidate in platforms[:]:
                b = candidate["edges"]
                lo, hi = max(a[0][0], b[0][0]), min(a[-1][0], b[-1][0])
                if lo > hi + .3:
                    continue
                x1, x2 = bounds_at(a, (lo + hi) / 2)
                y1, y2 = bounds_at(b, (lo + hi) / 2)
                if max(x1, y1) - min(x2, y2) <= .35:
                    pieces.append(candidate)
                    platforms.remove(candidate)
        edges = []
        for s in sorted({s for piece in pieces for s, *_ in piece["edges"]}):
            active = [bounds_at(piece["edges"], s) for piece in pieces
                      if piece["edges"][0][0] <= s <= piece["edges"][-1][0]]
            edges.append([s, round(min(x[0] for x in active), 3), round(max(x[1] for x in active), 3)])
        joined.append(dict(edges=edges, boarding=any(piece["boarding"] for piece in pieces), roof=[0, 0]))
    return joined


def make_route(master, route_id, name):
    bve = BveMap(master)
    station_table = bve.table("station")
    placements = {key: (s, args[0]) for s, kind, key, method, args in bve.commands
                  if kind == "station" and method == "put"}
    stations, signal_boxes = [], []
    for key, row in station_table.items():
        if key not in placements:
            continue
        s, door = placements[key]
        row += [""] * max(0, 13 - len(row))
        station = dict(name=row[1], s=s, sourceS=s, key=key, doorSide="left" if door == -1 else "right",
                       sourcePass=row[2].strip().lower() == "p", arrival=time_string(row[2]),
                       departure=time_string(row[3]), startTime=time_string(row[5]),
                       arrivalSound=row[9] or None, departureSound=row[10] or None,
                       dwellSeconds=float(row[4]) if row[4] else 20)
        if route_id == "oito" and station["sourcePass"]:
            station["passOnly"] = True
        if any(label in station["name"] for label in ("桑ノ原", "平瀬", "普門寺")):
            signal_boxes.append(station)
        else:
            if "(通過線)" in station["name"]:
                station["name"] = station["name"].replace("(通過線)", "")
                station["passOnly"] = True
            stations.append(station)
    stations.sort(key=lambda station: station["s"])
    origin, finish = stations[0]["s"], stations[-1]["s"]
    length = finish - origin
    lo, hi = origin - 300, finish + 300
    curve, grade = Profile(bve.commands, "curve"), Profile(bve.commands, "gradient")
    track_keys = {key for _, obj, key, _, _ in bve.commands if obj == "track"} | {"0"}
    xs = {key: Profile(bve.commands, "track", "x", key) for key in track_keys}
    ys = {key: Profile(bve.commands, "track", "y", key) for key in track_keys}
    spans = list(repeater_spans(bve.commands, lo, hi))

    sample_s = sorted({lo, hi, origin, finish, *range(math.ceil(lo / 5) * 5, math.floor(hi / 5) * 5 + 1, 5),
                       *(st["s"] for st in stations),
                       *(s for s in curve.distances + grade.distances if lo < s < hi)})
    x = z = y = heading = 0
    before = lo
    positions = {}
    for s in sample_s:
        count = max(1, math.ceil(s - before))
        ds = (s - before) / count
        for i in range(count):
            mid = before + (i + .5) * ds
            turn = curve.at(mid) * ds
            x += math.sin(heading + turn / 2) * ds
            z += math.cos(heading + turn / 2) * ds
            y += grade.at(mid) * ds / 1000
            heading += turn
        positions[s] = (x, z, y)
        before = s
    origin_point = positions[origin]
    points = [[round(s - origin, 4), *[round(v - o, 4) for v, o in zip(position, origin_point)]]
              for s, position in positions.items()]
    point_lookup = {point[0]: point[1:] for point in points}
    for station in stations:
        station["s"] -= origin
        station["x"], station["z"], station["height"] = point_lookup[station["s"]]
    for station in signal_boxes:
        station["s"] -= origin

    structures_table = bve.table("structure")
    model_paths = {key: bve.path(row[1]) for key, row in structures_table.items() if len(row) > 1}

    @lru_cache(maxsize=None)
    def mesh_bounds(key, surface=False):
        path = model_paths.get(key)
        if not path or not path.exists():
            return None
        raw = path.read_bytes()
        if raw.startswith(b"xof ") and b"txt" not in raw[:16]:
            return None
        text = raw.decode("utf-8-sig", errors="replace")
        matrices = re.findall(r"^\s*FrameTransformMatrix\s*\{([^}]+)\}", text, re.M)
        for matrix in matrices:
            values = [float(value) for value in re.findall(NUMBER, matrix)]
            identity = [1 if i % 5 == 0 else 0 for i in range(16)]
            if len(values) != 16 or any(abs(a - b) > 1e-6 for a, b in zip(values, identity)):
                return None
        vertices = []
        for mesh in re.finditer(r"^\s*Mesh(?:\s+\w+)?\s*\{\s*(\d+)\s*;", text, re.M):
            vertices += [tuple(map(float, vertex)) for vertex in re.findall(
                rf"\s*({NUMBER});\s*({NUMBER});\s*({NUMBER});[,;]", text[mesh.end():])[:int(mesh[1])]]
        if not vertices:
            vertices = [tuple(map(float, vertex)) for vertex in re.findall(
                rf"^\s*(?:AddVertex|Vertex)\s*,?\s*({NUMBER})\s*,\s*({NUMBER})\s*,\s*({NUMBER})", text, re.M | re.I)]
        if not vertices:
            return None
        if surface:
            vertices = [vertex for vertex in vertices if .75 <= vertex[1] <= 1.4]
            if not vertices:
                return None
        return tuple((min(vertex[axis] for vertex in vertices), max(vertex[axis] for vertex in vertices))
                     for axis in range(3))

    def track_value(profiles, key, s):
        return profiles[key].at(s) if key in profiles else 0

    def knots(span):
        key, a, b = span["track"], span["sStart"], span["sEnd"]
        samples = sorted({a, b, *range(math.ceil(a / 10) * 10, math.floor(b / 10) * 10 + 1, 10),
                          *(s for s in xs.get(key, xs["0"]).distances if a < s < b)})
        return [[round(s - origin, 4), round(track_value(xs, key, s), 4),
                 round(track_value(ys, key, s), 4)] for s in samples]

    rails = defaultdict(list)
    tunnels, bridges, vegetation = [], [], []
    platforms = {st["name"]: [] for st in stations}
    fixtures = []
    for span in spans:
        model, track = span["model"], span["track"]
        path = str(model_paths.get(model, "")).lower().replace("\\", "/")
        a, b = span["sStart"], span["sEnd"]
        middle = (a + b) / 2
        offset = track_value(xs, track, middle) + span["x"]
        if re.search(r"/rail/|/rails/", path) and track != "0":
            rails[track].append((a, b))
        bounds = mesh_bounds(model) if "/tunnel/" in path or "tunnel" in Path(path).stem else None
        if ("tunnel" in Path(path).stem or "/tunnel/" in path and bounds and bounds[1][1] > 3) and abs(offset) < 12:
            tunnels.append((a - origin, b - origin))
        if "/rail/" in path and "bridge" in Path(path).stem and abs(offset) < 2:
            bridges.append((a - origin, b - origin))
        if re.search(r"(?:^|[_/])trees|/tree/", path + "/" + span["key"]) and abs(offset) < 180:
            vegetation.append(dict(sStart=a - origin, sEnd=b - origin, interval=span["interval"],
                                   model=model, knots=[[s, x + span["x"], y + span["y"]] for s, x, y in knots(span)]))
        if platform_model(path) or re.match(r"form[clr]", model):
            bounds = mesh_bounds(model, surface=True)
            if bounds is None:
                continue
            (left, right), _, _ = bounds
            if abs(span["yaw"]) % 360 == 180:
                left, right = -right, -left
            if right - left < .1 or right - left > 40:
                continue
            st = min(stations, key=lambda station: abs(station["sourceS"] - middle))
            if abs(st["sourceS"] - middle) > 500:
                continue
            edges = [[round(s + origin - st["sourceS"], 4), round(x + span["x"] + left, 4),
                      round(x + span["x"] + right, 4)] for s, x, _ in knots(span)]
            near = min(abs(left + offset), abs(right + offset))
            platforms[st["name"]].append(dict(edges=edges, boarding=near < 2.1, roof=[0, 0]))

    for s, kind, model, method, args in bve.commands:
        if kind != "structure" or method not in {"put", "put0", "putbetween"} or not lo - 300 <= s <= hi + 300:
            continue
        path = str(model_paths.get(model, "")).lower().replace("\\", "/")
        if not platform_model(path) and not re.match(r"form[clr]", model):
            continue
        bounds = mesh_bounds(model, surface=True)
        if bounds is None:
            continue
        (left, right), (bottom, top), (a, b) = bounds
        if top < .7 or top > 2 or right - left < .1:
            continue
        track = key_string(args[0])
        dx = dy = dz = yaw = 0
        if method == "put":
            dx, dy, dz, yaw = args[1] or 0, args[2] or 0, args[3] or 0, args[5] or 0
        if abs(yaw) % 360 == 180:
            left, right = -right, -left
            a, b = -b, -a
        a, b = s + dz + a, s + dz + b
        if a >= b or a > hi or b < lo:
            continue
        st = min(stations, key=lambda station: abs(station["sourceS"] - (a + b) / 2))
        if abs(st["sourceS"] - (a + b) / 2) > 500:
            continue
        edges = []
        for p in sorted({a, b, *range(math.ceil(a / 10) * 10, math.floor(b / 10) * 10 + 1, 10)}):
            x = track_value(xs, track, p) + dx
            l, r = x + left, x + right
            if method == "putbetween":
                other = track_value(xs, key_string(args[1]), p)
                l, r = min(x, other) + 1.5, max(x, other) - 1.5
            if l >= r:
                break
            edges.append([round(p - st["sourceS"], 4), round(l, 4), round(r, 4)])
        if len(edges) >= 2:
            middle = bounds_at(edges, (edges[0][0] + edges[-1][0]) / 2)
            platforms[st["name"]].append(dict(edges=edges, boarding=min(map(abs, middle)) < 2.1, roof=[0, 0]))

    neighbors = []
    for track, intervals in rails.items():
        for a, b in merge(intervals):
            span = dict(track=track, sStart=a, sEnd=b)
            samples = knots(span)
            # Several BVE scenery aliases duplicate the running line.
            if all(abs(x) < .15 and abs(y) < .15 for _, x, y in samples):
                continue
            if max(abs(x) for _, x, _ in samples) > 100 or max(abs(y) for _, _, y in samples) > 30:
                continue
            neighbors.append(dict(key=track, knots=[[s, x] for s, x, _ in samples],
                                  heightKnots=[[s, y] for s, _, y in samples]))

    limits, sounds, rolling, signals = [], [], [], []
    aspect_table = bve.table("signal")
    changes = []
    for s, obj, key, method, args in bve.commands:
        if obj == "speedlimit":
            changes.append((s, args[0] if method == "begin" else None))
        elif obj == "sound" and method in ("play", "stop") and origin <= s <= finish:
            sounds.append(dict(s=round(s - origin, 4), key=key, action=method))
        elif obj == "rollingnoise" and method == "change" and s <= finish:
            rolling.append(dict(s=max(0, s - origin), index=args[0], key=str(args[0])))
        elif obj == "signal" and method == "put" and origin <= s <= finish:
            if len(args) < 4 or key_string(args[1]) not in {"0", "100"}:
                continue
            dx = (args[2] or 0) + track_value(xs, key_string(args[1]), s)
            if abs(dx) > 15:
                continue
            body = next((entry for entry in bve.commands
                         if entry[0] == s and entry[1] == "structure" and re.match(r"signal[2345]l", entry[2] or "", re.I)), None)
            if body is not None:
                lamps = int(re.search(r"signal([2345])l", body[2], re.I)[1])
            else:
                aspect = next((str(cell).lower() for cell in aspect_table.get(key, [])[1:] if cell), "")
                match = re.match(r"signal([2345])(?:[0-9]|yg|yy|tn)", aspect)
                if match is None:
                    match = re.match(r"signal([345])l", aspect)
                if match is None:
                    continue
                lamps = int(match[1])
            signals.append(dict(s=s - origin + (args[4] or 0 if len(args) > 4 else 0),
                                x=dx, y=args[3], lights=lamps, source="BVE Signal.Put"))
    changes = sorted(dict(changes).items())
    for i, (a, kmh) in enumerate(changes):
        b = changes[i + 1][0] if i + 1 < len(changes) else finish
        if kmh is not None and max(origin, a) < min(finish, b):
            limits.append(dict(sStart=max(origin, a) - origin, sEnd=min(finish, b) - origin, kmh=kmh))
    rolling = sorted({entry["s"]: entry for entry in rolling}.values(), key=lambda entry: entry["s"])
    station_layouts = {}
    for station in stations:
        layout = combine_platforms(platforms[station["name"]])
        if layout:
            station_layouts[station["name"]] = dict(platforms=layout)
        else:
            station["platformGeometryQuality"] = "fallback; source station platform mesh not decoded"
    structures = [dict(kind=kind, sStart=a, sEnd=b) for kind, intervals in (("tunnel", tunnels), ("bridge", bridges))
                  for a, b in merge(intervals)]
    sources = [master.name, *bve.files, str(bve.lists["station"].relative_to(bve.root)),
               "https://bvets.net/jp/edit/formats/route/map.html"]
    route = dict(id=route_id, name=name, direction=stations[0]["name"] + " → " + stations[-1]["name"],
                 loop=False, length=length, stations=stations, signalBoxes=signal_boxes, points=points,
                 neighborTracks=neighbors, stationLayouts=station_layouts, structures=structures,
                 limits=limits, signals=sorted(signals, key=lambda signal: signal["s"]),
                 grades=[[0, grade.at(origin)], *[[s - origin, value] for s, value, _ in grade.knots if origin < s < finish],
                         [length, grade.at(finish)]], soundEvents=sorted(sounds, key=lambda event: event["s"]),
                 rollingNoise=rolling, vegetation=vegetation,
                 geometryQuality="BVE local coordinates; sampled curve/grade; linear interpolation of secondary track controls",
                 sources=sources, sourceScenario=master.name,
                 importNotes=["Random BVE branches use a deterministic middle value.",
                              "Station coordinates and passing status follow the selected source scenario.",
                              "Signal boxes are retained separately from passenger stations.",
                              "Neighbor track relative-radius controls are approximated by linear interpolation.",
                              "Only recognized rail, platform and tunnel mesh placement classes are imported."])
    if route_id == "shinonoi":
        ordinary = BveMap(master.with_name("2530Map.txt"))
        changes = sorted(dict((s, args[0] if method == "begin" else None)
                              for s, obj, _, method, args in ordinary.commands if obj == "speedlimit").items())
        profile = []
        for index, (a, kmh) in enumerate(changes):
            b = changes[index + 1][0] if index + 1 < len(changes) else finish
            if kmh is not None and max(origin, a) < min(finish, b):
                profile.append(dict(sStart=max(origin, a) - origin, sEnd=min(finish, b) - origin, kmh=kmh))
        route["limitsByVehicle"] = {"211": profile}
        route["limitProfileSources"] = {"default": master.name, "211": "2530Map.txt"}
    return route, bve


def bundle_audio(route, bve, output):
    table = bve.table("sound")
    keys = {event["key"] for event in route["soundEvents"]}
    keys.update(station[key] for station in route["stations"] for key in ("arrivalSound", "departureSound") if station[key])
    directory = output / f"{route['id']}-announcements"
    directory.mkdir(exist_ok=True)
    manifest = {}
    for key in sorted(keys):
        row = table.get(key.lower())
        if not row or len(row) < 2:
            continue
        path = (bve.lists["sound"].parent / row[1].replace("\\", "/")).resolve()
        if not path.exists():
            continue
        if not re.fullmatch(r"[\w-]+", key, re.UNICODE):
            raise ValueError("Unsafe sound output key " + key)
        destination = directory / f"{key}.mp3"
        if not destination.exists() or destination.stat().st_mtime < path.stat().st_mtime:
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
                            "-vn", "-codec:a", "libmp3lame", "-q:a", "5", str(destination)], check=True)
        manifest[key] = destination.name
    (directory / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    route["announcementBase"] = f"./assets/final/{directory.name}/"
    route["announcementFiles"] = manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--route", choices=[config[0] for config in CONFIGS])
    parser.add_argument("--audio", action="store_true")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "dist/assets/final")
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True)
    for route_id, name, filename in CONFIGS:
        if args.route and route_id != args.route:
            continue
        route, bve = make_route(args.source / filename, route_id, name)
        if args.audio:
            bundle_audio(route, bve, args.output)
        (args.output / f"{route_id}-route.json").write_text(
            json.dumps(route, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(route_id, route["direction"], route["length"],
              {key: len(route[key]) for key in ("stations", "points", "neighborTracks", "structures", "signals", "limits", "soundEvents")})


if __name__ == "__main__":
    main()
