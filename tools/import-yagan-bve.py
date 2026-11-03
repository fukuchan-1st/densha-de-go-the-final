"""Convert Map_0805.txt's Shin-Fujiwara to Aizu-Kogen-Ozeguchi run.

Distances are metres from Shin-Fujiwara's two-car stopping point. Points have
local X/Z coordinates and relative elevation, sampled from the running line's
BVE curve and grade controls. Neighbor offsets are linear between BVE knots.
Platform surfaces use numeric mesh bounds. The boarding side comes from those
surfaces when available, with the original Station.Put side kept separately.
Structures cover the named tunnel repeater and verified bridge decks. Only
explicit speed limits and directly placed main signal heads are included.
No BVE meshes, textures, or audio are copied by this importer.
"""
import argparse
import ast
from bisect import bisect_right
from collections import defaultdict
import csv
from functools import lru_cache
import io
import json
import math
import operator
from pathlib import Path
import re


MAP = "Map_0805.txt"
ORIGIN = 16192
APPROACH = 300
TRACKS = {"up", "down", "cn", "yd1"}
FORM = {"form", "forml", "formr", "form_up", "form_down", "form_cnl", "form_cnr", "form_c"}
NUMBER = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"
COMMAND = re.compile(r"([\w.]+)(?:\['([^']+)'\])?\.([\w.]+)\((.*)\)$", re.I | re.S)
COMMENT = re.compile(r"'[^']*'|(?://|\#)[^\r\n]*")
OP = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv}


def read(path):
    raw = path.read_bytes()
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("cp932")


def rows(path):
    return list(csv.reader(io.StringIO(read(path))))[1:]


@lru_cache(maxsize=None)
def expression(code):
    return ast.parse(re.sub(r"\$([a-zA-Z_]\w*)", r"\1", code.lower()), mode="eval").body


def evaluate(node, values):
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return node.value
    if isinstance(node, ast.Name):
        return values[node.id]
    if isinstance(node, ast.BinOp) and type(node.op) in OP:
        return OP[type(node.op)](evaluate(node.left, values), evaluate(node.right, values))
    if isinstance(node, ast.UnaryOp) and type(node.op) in (ast.USub, ast.UAdd):
        value = evaluate(node.operand, values)
        return -value if isinstance(node.op, ast.USub) else value
    raise ValueError("unsupported numeric expression")


def parse(source):
    values = {"distance": 0}
    events = defaultdict(list)

    def map_file(file):
        content = read(source / file).split("\n", 1)[1]
        content = COMMENT.sub(lambda match: match[0] if match[0].startswith("'") else "", content)
        for statement in content.split(";"):
            statement = statement.strip()
            if not statement:
                continue
            include = re.fullmatch(r"include\s+'([^']+)'", statement, re.I)
            if include:
                map_file(include[1])
                continue
            variable = re.fullmatch(r"\$(\w+)\s*=\s*(.+)", statement, re.S)
            if variable:
                values[variable[1].lower()] = evaluate(expression(variable[2]), values)
                continue
            match = COMMAND.fullmatch(statement)
            if not match:
                if statement[0] in "$0123456789+-(" or statement.startswith("distance"):
                    values["distance"] = evaluate(expression(statement), values)
                continue
            element, key, method, arguments = match.groups()
            element, method = element.lower(), method.lower()
            lower_key = (key or "").lower()
            raw = [arg.strip() for arg in arguments.split(",")] if arguments.strip() else []
            s = values["distance"] - ORIGIN
            num = lambda i: evaluate(expression(raw[i]), values)
            string = lambda i: raw[i].strip("'")
            if element in ("curve", "gradient") and method in ("interpolate", "change"):
                events[element].append((s, method, tuple(num(i) if raw[i] else None for i in range(len(raw)))))
            elif element == "track" and method in ("x.interpolate", "y.interpolate"):
                events[method[0] + lower_key].append((s, "interpolate", tuple(num(i) if raw[i] else None for i in range(len(raw)))))
            elif element == "track" and method == "position":
                for i, axis in enumerate(("x", "y")):
                    events[axis + lower_key].append((s, "interpolate", (num(i) if i < len(raw) and raw[i] else 0,)))
            elif element == "station" and method == "put":
                events["stations"].append((s, key, num(0)))
            elif element == "speedlimit" and method in ("begin", "end"):
                events["limits"].append((s, num(0) if raw else None))
            elif element == "rollingnoise" and method == "change":
                events["rollingNoise"].append((s, num(0), raw[0].lstrip("$")))
            elif element == "sound" and method in ("play", "stop"):
                events["soundEvents"].append((s, key, method))
            elif element == "section" and method == "begin":
                events["sections"].append((s, [num(i) for i in range(len(raw))]))
            elif element == "signal" and method == "put" and string(1).lower() == "up":
                events["signals"].append((s, key, num(0), num(2), num(3), num(4)))
            elif element == "structure" and method == "put" and lower_key in ("signal_2l", "signal_3l", "signal_4l", "signal_5l", "sigpoleconc"):
                events[lower_key].append((s, string(0).lower(), num(1), num(2), num(3)))
            elif element == "structure" and method in ("put", "put0") and re.fullmatch(
                r"(?:sfj_formc[123]|ryk_formc2|kon_formc1|kmy_formc|azk_formc1|\w+_roof|kinugawa2br[123])", lower_key
            ):
                events["fixtures"].append((s, string(0).lower(), lower_key,
                                           num(1) if method == "put" else 0,
                                           num(3) if method == "put" else 0))
            elif element == "repeater" and lower_key.startswith("trees"):
                if method == "begin":
                    events["vegetation", lower_key].append((
                        s, string(0).lower(), string(10), tuple(num(i) if raw[i] else 0 for i in (1, 2, 3, 9))
                    ))
                elif method == "end":
                    events["vegetation", lower_key].append((s, None, None, None))
            elif element == "repeater" and (
                lower_key in FORM or lower_key.startswith("track_") or lower_key == "tunnel"
            ):
                if method == "begin0":
                    events[lower_key].append((s, string(0).lower(), string(4), 0))
                elif method == "begin":
                    events[lower_key].append((s, string(0).lower(), string(10), num(1)))
                elif method == "end":
                    events[lower_key].append((s, None, None, 0))

    map_file(MAP)
    return events


class Profile:
    """Resolved BVE transition knots, including step changes."""
    def __init__(self, events, transform=lambda args: args[0], sinusoidal=False):
        last = 0
        self.knots = [(-ORIGIN, last, False)]
        for s, method, args in sorted(events, key=lambda event: event[0]):
            if args and args[0] is not None:
                last = transform(args)
            entry = (s, last, method == "interpolate")
            if self.knots[-1][0] == s:
                self.knots[-1] = entry
            else:
                self.knots.append(entry)
        self.distances = [knot[0] for knot in self.knots]
        self.sinusoidal = sinusoidal

    def at(self, s):
        index = max(0, bisect_right(self.distances, s) - 1)
        start, before, _ = self.knots[index]
        if index + 1 == len(self.knots) or s <= start:
            return before
        end, after, interpolate = self.knots[index + 1]
        if not interpolate:
            return before
        fraction = (s - start) / (end - start)
        if self.sinusoidal:
            fraction = (1 - math.cos(math.pi * fraction)) / 2
        return before + (after - before) * fraction


def spans(events, lo, hi):
    events = sorted(events, key=lambda event: event[0])
    for index, (start, track, model, offset) in enumerate(events):
        end = events[index + 1][0] if index + 1 < len(events) else hi
        if track is not None and max(lo, start) < min(hi, end):
            yield max(lo, start), min(hi, end), track, model, offset


def merge(spans):
    ranges = []
    for start, end in sorted(spans):
        if ranges and start <= ranges[-1][1]:
            ranges[-1][1] = max(ranges[-1][1], end)
        else:
            ranges.append([start, end])
    return ranges


def time_string(value):
    return ":".join(part.zfill(2) for part in value.split(":")) if ":" in value else None


def bounds_at(edges, distance):
    index = bisect_right(edges, distance, key=lambda edge: edge[0])
    if index == 0:
        return edges[0][1:]
    if index == len(edges):
        return edges[-1][1:]
    a, left, right = edges[index - 1]
    b, next_left, next_right = edges[index]
    fraction = (distance - a) / (b - a)
    return left + fraction * (next_left - left), right + fraction * (next_right - right)


def join_platforms(platforms):
    """Join adjacent side and center surfaces of the same island platform."""
    joined = []
    while platforms:
        first, *platforms = platforms
        pieces = [first]
        for piece in pieces:
            a = piece["edges"]
            for candidate in platforms[:]:
                b = candidate["edges"]
                lo, hi = max(a[0][0], b[0][0]), min(a[-1][0], b[-1][0])
                if lo >= hi:
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


def make_route(source):
    events = parse(source)
    times = {row[0]: row for row in rows(source / "Stations_0805.csv") if row[0].startswith("Sta")}
    stations = []
    for s, key, door in events["stations"]:
        row = times[key]
        stations.append(dict(name=row[1], s=s, doorSide="right" if door == 1 else "left",
                             arrival=time_string(row[2]), departure=time_string(row[3]),
                             startTime=time_string(row[5]), departureSound=row[10] or None,
                             dwellSeconds=int(row[4])))
    length = stations[-1]["s"]
    lo, hi = -APPROACH, length + APPROACH
    curve = Profile(events["curve"], lambda args: 1 / args[0] if args[0] else 0, sinusoidal=True)
    grade = Profile(events["gradient"])
    offsets = {track: Profile(events["x" + track]) for track in TRACKS}
    levels = {track: Profile(events["y" + track]) for track in TRACKS}
    distances = sorted({*range(lo, hi + 1, 5), hi, *(st["s"] for st in stations),
                        *(s for s in curve.distances + grade.distances if lo < s < hi)})
    x, z, h, bearing, before = 0, 0, 0, 0, lo
    positions = {}
    for s in distances:
        steps = max(1, math.ceil(s - before))
        ds = (s - before) / steps
        for i in range(steps):
            midpoint = before + (i + .5) * ds
            turn = curve.at(midpoint) * ds
            x += math.sin(bearing + turn / 2) * ds
            z += math.cos(bearing + turn / 2) * ds
            h += grade.at(midpoint) * ds / 1000
            bearing += turn
        positions[s] = (x, z, h)
        before = s
    origin = positions[0]
    points = [[s, *(round(value - base, 4) for value, base in zip(xzh, origin))]
              for s, xzh in positions.items()]
    coordinates = {p[0]: p[1:] for p in points}
    for station in stations:
        station["x"], station["z"], station["height"] = coordinates[station["s"]]

    structures = []
    for a, b in merge((a, b) for a, b, _, _, _ in spans(events["tunnel"], lo, hi)):
        structures.append(dict(kind="tunnel", sStart=a, sEnd=b))
    neighbor_tracks = []
    for track in sorted(TRACKS - {"up"}):
        for a, b in merge((a, b) for a, b, *_ in spans(events["track_" + track], lo, hi)):
            x_profile, y_profile = offsets[track], levels[track]
            samples = sorted({a, b, *(s for s in x_profile.distances + y_profile.distances if a < s < b)})
            neighbor_tracks.append(dict(key=track, knots=[[s, round(x_profile.at(s), 4)] for s in samples],
                                        heightKnots=[[s, round(y_profile.at(s), 4)] for s in samples]))

    structure_files = {row[0].lower(): row[1] for row in rows(source / "Structures.txt")
                       if len(row) >= 2 and row[1]}

    @lru_cache(maxsize=None)
    def mesh_bounds(key):
        filename = structure_files[key.lower()].replace("\\", "/")
        model = read(source / filename)
        mesh = re.search(r"^\s*Mesh(?:\s+\w+)?\s*\{\s*(\d+)\s*;", model, re.M)
        vertices = re.findall(rf"\s*({NUMBER});\s*({NUMBER});\s*({NUMBER});[,;]", model[mesh.end():])[:int(mesh[1])]
        xyz = [tuple(map(float, vertex)) for vertex in vertices]
        return tuple((min(vertex[axis] for vertex in xyz), max(vertex[axis] for vertex in xyz))
                     for axis in (0, 2))

    bridge_spans = [(a, b) for a, b, _, key, _ in spans(events["track_up"], lo, hi)
                    if key.lower().startswith("bridgerail")]
    for s, _, key, _, z in events["fixtures"]:
        if key.startswith("kinugawa2br"):
            _, (a, b) = mesh_bounds(key)
            bridge_spans.append((s + z + a, s + z + b))
    for a, b in merge(bridge_spans):
        structures.append(dict(kind="bridge", sStart=round(a, 2), sEnd=round(b, 2)))
    structures.sort(key=lambda structure: structure["sStart"])

    layouts = {st["name"]: {"platforms": []} for st in stations}
    for form in sorted(FORM):
        pieces = defaultdict(list)
        for a, b, track, key, offset in spans(events[form], lo, hi):
            st = min(stations, key=lambda item: abs(item["s"] - (a + b) / 2))
            name, s = st["name"], st["s"]
            (left, right), _ = mesh_bounds(key)
            profile = offsets[track]
            samples = sorted({a, b, *(p for p in profile.distances if a < p < b)})
            edges = [[p - s, round(profile.at(p) + offset + left, 3), round(profile.at(p) + offset + right, 3)]
                     for p in samples]
            pieces[name, track].append(edges)
        for (name, track), parts in pieces.items():
            current = []
            for edges in parts:
                if current and current[-1][0] != edges[0][0]:
                    layouts[name]["platforms"].append(dict(edges=current, boarding=track == "up", roof=[0, 0]))
                    current = []
                current.extend(edges[1:] if current else edges)
            if current:
                layouts[name]["platforms"].append(dict(edges=current, boarding=track == "up", roof=[0, 0]))

    roofs = defaultdict(list)
    for s, track, key, offset, z in events["fixtures"]:
        if key.startswith("kinugawa2br"):
            continue
        (left, right), (a, b) = mesh_bounds(key)
        a, b = round(s + z + a, 2), round(s + z + b, 2)
        st = min(stations, key=lambda item: abs(item["s"] - (a + b) / 2))
        base = st["s"]
        profile = offsets[track]
        samples = sorted({a, b, *(p for p in profile.distances if a < p < b)})
        edges = [[round(p - base, 2), round(profile.at(p) + offset + left, 3),
                  round(profile.at(p) + offset + right, 3)] for p in samples]
        if key.endswith("_roof"):
            roofs[st["name"]].append(edges)
        else:
            layouts[st["name"]]["platforms"].append(dict(edges=edges, boarding=False, roof=[0, 0]))
    for st in stations:
        name = st["name"]
        platforms = join_platforms(layouts[name]["platforms"])
        layouts[name]["platforms"] = platforms
        boarding = next((platform for platform in platforms if platform["boarding"] and
                         platform["edges"][0][0] <= 0 <= platform["edges"][-1][0]), None)
        if boarding:
            left, right = bounds_at(boarding["edges"], 0)
            st["bveDoorSide"] = st["doorSide"]
            st["doorSide"] = "left" if left + right < 0 else "right"
        for platform in platforms:
            for roof in roofs[name]:
                roof_start = max(roof[0][0], platform["edges"][0][0])
                roof_end = min(roof[-1][0], platform["edges"][-1][0])
                if roof_start >= roof_end:
                    continue
                midpoint = (roof_start + roof_end) / 2
                roof_left, roof_right = bounds_at(roof, midpoint)
                form_left, form_right = bounds_at(platform["edges"], midpoint)
                if max(roof_left, form_left) < min(roof_right, form_right):
                    platform["roof"] = [roof_start, roof_end]

    signals = []
    sections = dict(events["sections"])
    for s, key, section_offset, x, y, z in events["signals"]:
        if not 0 <= s <= length:
            continue
        if key != "Signal2":
            continue
        lamps = next((count for count in range(2, 6) if
                      (s, "up", x, y, z) in events[f"signal_{count}l"]), None)
        if lamps is None:
            continue
        supports = [entry for entry in events["sigpoleconc"] if entry[0] == s and entry[1] == "up"]
        support = min(supports, key=lambda entry: abs(entry[2] - x)) if supports else None
        signals.append(dict(s=s + z, x=x, y=y, lights=lamps, mount="pole",
                            support=dict(x=support[2], y=support[3]) if support else None,
                            aspectIndices=sections.get(s), sectionOffset=section_offset, source="BVE Signal.Put"))

    vegetation = []
    for repeater, entries in events.items():
        if not isinstance(repeater, tuple) or repeater[0] != "vegetation":
            continue
        for a, b, track, model, (x, y, z, interval) in spans(entries, lo, hi):
            if interval <= 0 or track != "up" and not events["x" + track]:
                continue
            x_profile = offsets.get(track) or Profile(events["x" + track])
            y_profile = levels.get(track) or Profile(events["y" + track])
            samples = sorted({a, b, *(s for s in x_profile.distances + y_profile.distances if a < s < b)})
            vegetation.append(dict(sStart=a + z, sEnd=b + z, interval=interval, model=model,
                                   knots=[[s + z, round(x + x_profile.at(s), 3),
                                           round(y + y_profile.at(s), 3)] for s in samples]))

    limits = []
    changes = sorted(events["limits"])
    for index, (a, kmh) in enumerate(changes):
        b = changes[index + 1][0] if index + 1 < len(changes) else length
        if kmh is not None and max(0, a) < min(length, b):
            limits.append(dict(sStart=max(0, a), sEnd=min(length, b), kmh=kmh))
    rolling = []
    for s, (index, key) in sorted({s: (index, key) for s, index, key in events["rollingNoise"]}.items()):
        if s <= length:
            entry = dict(s=max(0, s), index=index, key=key)
            if s < 0 and rolling:
                rolling[-1] = entry
            else:
                rolling.append(entry)
    return dict(
        id="yagan", name="野岩鉄道 会津鬼怒川線", direction="新藤原 → 会津高原尾瀬口",
        loop=False, length=length, stations=stations, points=points,
        geometryQuality="BVE scenario-local geometry from curve and gradient transitions; no geodetic alignment",
        sources=[MAP, "Map_001_SFJ-AZK.txt", "Map_010_SFJ-Up.txt", "Map_020_AZK-YG.txt",
                 "Stations_0805.csv", "Structures.txt", "Signal.txt", "RolingNoiseSet_6050.txt",
                 "https://bvets.net/jp/edit/formats/route/map.html"],
        structures=structures, neighborTracks=neighbor_tracks, stationLayouts=layouts,
        vegetation=sorted(vegetation, key=lambda span: span["sStart"]),
        signals=sorted(signals, key=lambda signal: signal["s"]), limits=limits,
        grades=[[0, grade.at(0)], *[[s, value] for s, value, _ in grade.knots if 0 < s < length],
                [length, grade.at(length)]],
        soundEvents=[dict(s=s, key=key, action=action) for s, key, action in sorted(events["soundEvents"])
                     if 0 <= s <= length],
        rollingNoise=rolling,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    route = make_route(args.source)
    args.output.write_text(json.dumps(route, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    for key in ("stations", "points", "structures", "neighborTracks", "signals", "limits",
                "grades", "soundEvents", "rollingNoise", "vegetation"):
        print(f"{key}: {len(route[key])}")


if __name__ == "__main__":
    main()
