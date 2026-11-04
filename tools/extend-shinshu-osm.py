"""Build continuous Chuo and Nagano approaches from cached OpenStreetMap rails."""
from pathlib import Path
import argparse
from copy import deepcopy
from bisect import bisect_right
from collections import defaultdict
import heapq
import json
import math

R = 6371008.8
BASE_LAT, BASE_LON = 35.6812546, 139.766706


def xy(lat, lon):
    return ((lon - BASE_LON) * math.pi / 180 * R * math.cos(BASE_LAT * math.pi / 180),
            (lat - BASE_LAT) * math.pi / 180 * R)


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


class RailNetwork:
    def __init__(self, documents):
        self.ways = {}
        self.labels = {}
        for doc in documents:
            for element in doc["elements"]:
                if element["type"] == "way" and "geometry" in element:
                    self.ways[element["id"]] = element
                elif element["type"] == "node" and element.get("tags", {}).get("railway") == "station":
                    self.labels[element["id"]] = element
        self.points, self.graph, self.edgeway = {}, defaultdict(dict), {}
        for way in self.ways.values():
            tags = way.get("tags", {})
            if tags.get("railway") != "rail" or tags.get("service") or tags.get("gauge", "1067") != "1067":
                continue
            if any(word in tags.get("name", "") for word in ("新幹線", "貨物", "緩行", "飯田線")):
                continue
            for node, location in zip(way["nodes"], way["geometry"]):
                self.points[node] = xy(location["lat"], location["lon"])
            for a, b in zip(way["nodes"], way["nodes"][1:]):
                distance = math.dist(self.points[a], self.points[b])
                self.graph[a][b] = distance
                self.graph[b][a] = distance
                self.edgeway[frozenset((a, b))] = way

    def label(self, name):
        candidates = [node for node in self.labels.values() if node["tags"].get("name") == name]
        if not candidates:
            raise ValueError("No OSM station " + name)
        def score(node):
            tags = node["tags"]
            return (100 if "新幹線" in tags.get("network", "") else 0) + (
                0 if any(word in tags.get("operator", "") for word in ("東日本旅客", "JR", "Japan Railway")) else 10
            )
        return min(candidates, key=score)

    def route(self, names):
        labels = [self.label(name) for name in names]
        a, b = [xy(label["lat"], label["lon"]) for label in (labels[0], labels[-1])]
        starts = {node: 2 * math.dist(point, a) for node, point in self.points.items() if math.dist(point, a) < 350}
        ends = {node: 2 * math.dist(point, b) for node, point in self.points.items() if math.dist(point, b) < 350}
        distances, previous = dict(starts), {node: None for node in starts}
        queue = [(cost, node) for node, cost in starts.items()]
        heapq.heapify(queue)
        while queue:
            cost, node = heapq.heappop(queue)
            if distances[node] != cost:
                continue
            for other, length in self.graph[node].items():
                new = cost + length
                if new < distances.get(other, math.inf):
                    distances[other], previous[other] = new, node
                    heapq.heappush(queue, (new, other))
        accessible = [node for node in ends if node in distances]
        if not accessible:
            raise ValueError("OSM graph has no connected path " + names[0] + " → " + names[-1])
        last = min(accessible, key=lambda node: distances[node] + ends[node])
        path = []
        while last is not None:
            path.append(last)
            last = previous[last]
        path.reverse()
        positions = [self.points[node] for node in path]
        cumulative = [0]
        for a, b in zip(positions, positions[1:]):
            cumulative.append(cumulative[-1] + math.dist(a, b))

        projections = []
        for label in labels:
            target = xy(label["lat"], label["lon"])
            candidates = []
            for index, (a, b) in enumerate(zip(positions, positions[1:])):
                dx, dz = b[0] - a[0], b[1] - a[1]
                ll = dx * dx + dz * dz
                t = max(0, min(1, ((target[0] - a[0]) * dx + (target[1] - a[1]) * dz) / ll)) if ll else 0
                point = a[0] + dx * t, a[1] + dz * t
                candidates.append((math.dist(point, target), cumulative[index] + t * math.sqrt(ll), point))
            projections.append(min(candidates))
        if any(a[1] >= b[1] for a, b in zip(projections, projections[1:])):
            raise ValueError("Station order failure " + str(list(zip(names, [p[1] for p in projections]))))
        if max(p[0] for p in projections) > 180:
            raise ValueError("Rail path misses a station " + str(list(zip(names, [p[0] for p in projections]))))
        return labels, path, positions, cumulative, projections


def make_route(network, names, route_id, name, desired=None):
    labels, path, positions, raw, projections = network.route(names)
    observed = [projection[1] for projection in projections]
    origin = projections[0][2]
    desired = desired or [s - observed[0] for s in observed]

    def chain(s):
        index = max(0, min(len(observed) - 2, bisect_right(observed, s) - 1))
        t = (s - observed[index]) / (observed[index + 1] - observed[index])
        return desired[index] + t * (desired[index + 1] - desired[index])

    samples = [(s, position) for s, position in zip(raw, positions) if observed[0] < s < observed[-1]]
    samples += [(projection[1], projection[2]) for projection in projections]
    samples.sort()
    points = []
    for s, p in samples:
        row = [round(chain(s), 4), round(p[0] - origin[0], 4), round(p[1] - origin[1], 4), 0]
        if not points or row[0] > points[-1][0]:
            points.append(row)
    # Extend endpoint tangents to keep the cab vista valid at the first and final stop.
    for front in (True, False):
        a, b = points[:2] if front else points[-2:]
        gap = b[0] - a[0]
        reference = points[0] if front else points[-1]
        distance = -300 if front else 300
        extra = [reference[0] + distance, reference[1] + (b[1] - a[1]) * distance / gap,
                 reference[2] + (b[2] - a[2]) * distance / gap, 0]
        points.insert(0, extra) if front else points.append(extra)
    stations = [dict(name=station, s=round(s, 4), lat=label["lat"], lon=label["lon"],
                     x=round(p[2][0] - origin[0], 4), z=round(p[2][1] - origin[1], 4),
                     osmStationNodeId=label["id"], stationToRailM=round(p[0], 3),
                     stopPositionQuality="OSM station projected onto conventional railway")
                for station, s, label, p in zip(names, desired, labels, projections)]
    structures = []
    for i, (a, b) in enumerate(zip(path, path[1:])):
        way = network.edgeway[frozenset((a, b))]
        tags = way["tags"]
        kind = "tunnel" if tags.get("tunnel") not in (None, "no") else (
            "bridge" if tags.get("bridge") not in (None, "no") else None
        )
        start, end = max(raw[i], observed[0]), min(raw[i + 1], observed[-1])
        if kind and start < end:
            span = dict(kind=kind, sStart=round(chain(start), 4), sEnd=round(chain(end), 4), source="OpenStreetMap",
                        osmWayId=way["id"])
            if structures and structures[-1]["kind"] == kind and abs(structures[-1]["sEnd"] - span["sStart"]) < .01:
                structures[-1]["sEnd"] = span["sEnd"]
            else:
                structures.append(span)
    return dict(id=route_id, name=name, direction=names[0] + " → " + names[-1], loop=False,
                length=round(desired[-1], 4), stations=stations, points=points, structures=structures,
                limits=[], grades=[], signals=[], soundEvents=[], rollingNoise=[],
                geometryQuality="OpenStreetMap conventional railway; track and cab stopping anchor inferred from mapped geometry",
                sources=[dict(title="OpenStreetMap contributors", url="https://www.openstreetmap.org/copyright",
                              license="ODbL-1.0", wayIds=sorted({network.edgeway[frozenset((a, b))]["id"]
                                                             for a, b in zip(path, path[1:])}))],
                importNotes=["Unmapped gradients and operating limits remain unspecified.",
                             "Mapped station label projected onto a continuous conventional rail path."])


def save(route, output):
    (output / (route["id"] + "-route.json")).write_text(
        json.dumps(route, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(route["id"], route["length"], len(route["stations"]), len(route["points"]), flush=True)


def point_at(points, s):
    index = max(0, min(len(points) - 2, bisect_right(points, s, key=lambda point: point[0]) - 1))
    a, b = points[index:index + 2]
    fraction = (s - a[0]) / (b[0] - a[0])
    return [a[i] + fraction * (b[i] - a[i]) for i in range(1, 4)]


def reverse(route):
    result = deepcopy(route)
    length = route["length"]
    result["points"] = sorted([[length - s, *position] for s, *position in route["points"]])
    result["stations"] = list(reversed(result["stations"]))
    for station in result["stations"]:
        station["s"] = length - station["s"]
        for key in ("arrival", "departure", "startTime", "arrivalSound", "departureSound"):
            station.pop(key, None)
        if "doorSide" in station:
            station["doorSide"] = "right" if station["doorSide"] == "left" else "left"
    for key in ("structures", "limits"):
        for span in result.get(key, []):
            span["sStart"], span["sEnd"] = length - span["sEnd"], length - span["sStart"]
    for profile in result.get("limitsByVehicle", {}).values():
        for span in profile:
            span["sStart"], span["sEnd"] = length - span["sEnd"], length - span["sStart"]
    for track in result.get("neighborTracks", []):
        track["knots"] = sorted([[length - s, -x] for s, x in track["knots"]])
        track["heightKnots"] = sorted([[length - s, y] for s, y in track.get("heightKnots", [])])
    for layout in result.get("stationLayouts", {}).values():
        for platform in layout["platforms"]:
            platform["edges"] = sorted([[-s, -right, -left] for s, left, right in platform["edges"]])
            if "roof" in platform:
                platform["roof"] = [-platform["roof"][1], -platform["roof"][0]]
    result["grades"] = sorted([[length - s, -grade] for s, grade in result.get("grades", [])])
    result["signals"], result["soundEvents"], result["rollingNoise"] = [], [], []
    result.pop("announcementBase", None)
    result.pop("announcementFiles", None)
    return result


def concatenate(parts, route_id, name):
    output = dict(id=route_id, name=name, loop=False, length=0, stations=[], points=[], structures=[],
                  limits=[], grades=[], signals=[], soundEvents=[], rollingNoise=[], neighborTracks=[],
                  stationLayouts={}, sources=[], geometrySections=[], limitsByVehicle={}, limitProfileSources={})
    for part, quality in parts:
        length, offset = part["length"], output["length"]
        start = point_at(part["points"], 0)
        forward = point_at(part["points"], min(10, length))
        source_angle = math.atan2(forward[1] - start[1], forward[0] - start[0])
        if output["points"]:
            end = output["points"][-1][1:]
            previous = point_at(output["points"], offset - 10)
            angle = math.atan2(end[1] - previous[1], end[0] - previous[0]) - source_angle
        else:
            end, angle = [0, 0, 0], 0
        cosine, sine = math.cos(angle), math.sin(angle)
        def transform(point):
            dx, dz, dy = [a - b for a, b in zip(point, start)]
            return [round(end[0] + cosine * dx - sine * dz, 4),
                    round(end[1] + sine * dx + cosine * dz, 4), round(end[2] + dy, 4)]
        source_points = [point for point in part["points"] if 0 < point[0] < length]
        source_points = [[0, *start], *source_points, [length, *point_at(part["points"], length)]]
        rows = [[round(s + offset, 4), *transform(position)] for s, *position in source_points]
        output["points"].extend(rows if not output["points"] else rows[1:])
        for station in part["stations"]:
            entry = deepcopy(station)
            if part.get("announcementBase"):
                entry["announcementRouteId"] = part["id"]
            entry["s"] = round(station["s"] + offset, 4)
            entry["x"], entry["z"], entry["height"] = transform(point_at(part["points"], station["s"]))
            if output["stations"] and output["stations"][-1]["name"] == entry["name"]:
                output["stations"][-1].update(entry)
            else:
                output["stations"].append(entry)
        for key in ("structures", "limits"):
            for span in part.get(key, []):
                output[key].append({**span, "sStart": round(span["sStart"] + offset, 4),
                                    "sEnd": round(span["sEnd"] + offset, 4)})
        for vehicle, profile in part.get("limitsByVehicle", {}).items():
            output["limitsByVehicle"].setdefault(vehicle, []).extend(
                [{**span, "sStart": round(span["sStart"] + offset, 4),
                  "sEnd": round(span["sEnd"] + offset, 4)} for span in profile]
            )
        output["limitProfileSources"].update(part.get("limitProfileSources", {}))
        output["grades"].extend([[s + offset, gradient] for s, gradient in part.get("grades", [])])
        for key in ("signals", "soundEvents", "rollingNoise"):
            for event in part.get(key, []):
                output[key].append({**event, "s": round(event["s"] + offset, 4), "routeId": part["id"]})
        for rail in part.get("neighborTracks", []):
            copy = deepcopy(rail)
            for key in ("knots", "heightKnots"):
                copy[key] = [[s + offset, value] for s, value in copy.get(key, [])]
            output["neighborTracks"].append(copy)
        output["stationLayouts"].update(deepcopy(part.get("stationLayouts", {})))
        output["geometrySections"].append(dict(sStart=offset, sEnd=round(offset + length, 4),
                                               sourceRoute=part["id"], quality=quality))
        output["sources"].extend(part.get("sources", []))
        output["length"] = round(offset + length, 4)
    output["direction"] = output["stations"][0]["name"] + " → " + output["stations"][-1]["name"]
    output["geometryQuality"] = "Local BVE curve and grade sections joined to OpenStreetMap rail sections by endpoint tangent"
    output["importNotes"] = ["OSM sections retain unspecified gradients and operating restrictions.",
                            "BVE numeric track controls are used in the supplied sections.",
                            "Reversed BVE sections omit direction-specific signals and announcements.",
                            "Section joining preserves local shape; overall coordinates are not a surveyed alignment."]
    points = output["points"]
    for front in (True, False):
        a, b = points[:2] if front else points[-2:]
        reference, distance = (a, -300) if front else (b, 300)
        extra = [reference[0] + distance, *[round(reference[i] + (b[i] - a[i]) * distance / (b[0] - a[0]), 4)
                                         for i in range(1, 4)]]
        points.insert(0, extra) if front else points.append(extra)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    doc_names = ["chuo-osm", "chuo-extended-rail-osm", "shinshu-stations-osm", "nagano-shinonoi-rail-osm",
                 "shiojiri-matsumoto-rail-osm"]
    documents = [read(args.cache / (name + ".json")) for name in doc_names if (args.cache / (name + ".json")).exists()]
    network = RailNetwork(documents)
    gap = ["甲府", "竜王", "塩崎", "韮崎", "新府", "穴山", "日野春", "長坂", "小淵沢", "信濃境",
           "富士見", "すずらんの里", "青柳", "茅野"]
    gap_route = make_route(network, gap, "chuo-osm-gap", "中央本線")
    save(gap_route, args.output)
    nagano = make_route(network, ["長野", "安茂里", "川中島", "今井", "篠ノ井"], "shinonoi-approach", "信越本線")
    save(nagano, args.output)
    shinonoi = read(args.output / "shinonoi-route.json")
    save(concatenate([(nagano, "OpenStreetMap inferred"), (shinonoi, "BVE authored geometry")],
                     "shinonoi-extended", "信越本線・篠ノ井線"), args.output)
    old = read(args.output / "chuo-route.json")
    kofu = read(args.output / "chuo-kofu-route.json")
    shinshu = read(args.output / "chuo-shinshu-route.json")
    takao = make_route(network, ["高尾", "相模湖", "藤野", "上野原", "四方津", "梁川", "鳥沢", "猿橋", "大月"],
                       "takao-otsuki-osm", "中央本線")
    # Existing geometry uses 3 columns until its elevation has been measured.
    old["points"] = [point[:3] + [point[3] if len(point) > 3 else 0] for point in old["points"]]
    full = concatenate([(old, "OpenStreetMap; existing calibrated route"),
                        (takao, "OpenStreetMap inferred"), (reverse(kofu), "BVE reversed"),
                        (gap_route, "OpenStreetMap inferred"), (reverse(shinshu), "BVE reversed")],
                       "chuo-extended", "中央本線")
    save(full, args.output)


if __name__ == "__main__":
    main()
