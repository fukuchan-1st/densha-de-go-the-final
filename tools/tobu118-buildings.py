"""Retain real OSM building footprints in a 500 m Tobu/Aizu route corridor.

Writes a NEW additive asset only; no old route/geography asset is modified.
Geometry uses exactly the projection and row layout of tobu-geography114.py.
Google Maps imagery is not copied, scraped, traced, or used as source geometry.
"""
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone
import gzip
import json
import math
import re
import time

import numpy as np
import osmium
from scipy.spatial import cKDTree
from shapely.geometry import Polygon

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets/final'
CACHE = ROOT.parent / 'all-road-cache'
R = 6371008.8
LAT = 35.6812546
LON = 139.766706
BUFFER = 500.0
ROUTE_IDS = ['tobu-skytree', 'tobu-nikko', 'tobu-kinugawa', 'aizu']


def xy(lat, lon):
    return np.array([math.radians(lon - LON) * R * math.cos(math.radians(LAT)),
                     math.radians(lat - LAT) * R])


def tag_number(value):
    """Accept a single unambiguous numeric metre/level/foot value; no guesses."""
    if value is None:
        return None
    m = re.fullmatch(r'\s*([+]?(?:\d+(?:\.\d*)?|\.\d+))\s*(m|metres?|meters?|ft|feet|\')?\s*', str(value), re.I)
    if not m:
        return None
    v = float(m.group(1))
    if m.group(2) and m.group(2).lower() in ('ft', 'feet', "'"):
        v *= .3048
    return v if math.isfinite(v) and v > 0 else None


def building_height(tags):
    height = tag_number(tags.get('height'))
    if height is not None:
        return height, False, 'height'
    raw_levels = tags.get('building:levels', '')
    levels = float(raw_levels) if re.fullmatch(r'\s*[+]?(?:\d+(?:\.\d*)?|\.\d+)\s*', raw_levels) else None
    if levels is not None and levels <= 0:
        levels = None
    if levels is not None:
        return levels * 3.1, True, 'levels'
    # Same default as the existing asset; the estimated flag remains explicit.
    return 6.2, True, 'default'


routes = {}
cells = {}
for rid in ROUTE_IDS:
    doc = json.loads((ASSETS / f'{rid}-route.json').read_text(encoding='utf8'))
    points = np.asarray(doc['points'], dtype=float)
    origin = xy(doc['projection']['referenceLatitude'], doc['projection']['referenceLongitude'])
    # Densification affects only nearest-segment search; coordinates and distance
    # interpolation remain on the exact original route polyline.
    dense = []
    for a, b in zip(points[:-1], points[1:]):
        count = max(1, math.ceil(float(np.linalg.norm(b[1:3] - a[1:3])) / 60))
        for j in range(count):
            dense.append(a[:3] + (b[:3] - a[:3]) * (j / count))
    dense.append(points[-1, :3])
    dense = np.asarray(dense)
    a, b = dense[:-1, 1:3], dense[1:, 1:3]
    r = dict(doc=doc, origin=origin, a=a, d=b - a,
             s=dense[:-1, 0], ds=np.diff(dense[:, 0]),
             tree=cKDTree((a + b) / 2), buildings=[], heights=[], ids=[],
             previous=json.loads(gzip.decompress((ASSETS / f'{rid}-geography.json.gz').read_bytes()))['mappedBuildings'])
    routes[rid] = r
    for p in dense[:, 1:3] + origin:
        gx, gz = math.floor(p[0] / 250), math.floor(p[1] / 250)
        # At least 750 m prefilter covers the requested 500 m plus footprint size.
        for dx in range(-3, 4):
            for dz in range(-3, 4):
                cells.setdefault((gx + dx, gz + dz), set()).add(rid)


def project(r, p):
    _, ids = r['tree'].query(p, k=min(8, len(r['a'])))
    ids = np.atleast_1d(ids)
    a, d = r['a'][ids], r['d'][ids]
    t = np.clip(np.sum((p - a) * d, axis=1) / np.maximum(.001, np.sum(d * d, axis=1)), 0, 1)
    distances = np.linalg.norm(p - a - t[:, None] * d, axis=1)
    j = int(np.argmin(distances))
    i = ids[j]
    return float(distances[j]), float(r['s'][i] + t[j] * r['ds'][i])


start = time.monotonic()
seen = set()
rejects = Counter()
source_files = []
for region in ['kanto', 'tohoku']:
    pbf = CACHE / f'{region}-latest.osm.pbf'
    with osmium.io.Reader(str(pbf)) as reader:
        header = reader.header()
        snapshot = header.get('osmosis_replication_timestamp')
        generator = header.get('generator')
    source_files.append(dict(file=pbf.name, bytes=pbf.stat().st_size,
                             modifiedUtc=datetime.fromtimestamp(pbf.stat().st_mtime, timezone.utc).isoformat(),
                             osmSnapshotUtc=snapshot, pbfGenerator=generator))
    count = kept = 0
    for way in osmium.FileProcessor(str(pbf)).with_locations().with_filter(
            osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('building')):
        count += 1
        if way.id in seen or len(way.nodes) < 4 or not way.nodes[0].location.valid():
            continue
        if not (35.65 < way.nodes[0].lat < 37.3 and 139.2 < way.nodes[0].lon < 140.05):
            continue
        first = xy(way.nodes[0].lat, way.nodes[0].lon)
        candidates = cells.get((math.floor(first[0] / 250), math.floor(first[1] / 250)))
        if not candidates:
            continue
        tags = dict(way.tags)
        if tags.get('building') in (None, 'no') or way.nodes[0].ref != way.nodes[-1].ref:
            rejects['notClosedBuildingWay'] += 1
            continue
        try:
            geo = np.array([xy(n.lat, n.lon) for n in way.nodes])
        except (osmium.InvalidLocationError, ValueError):
            rejects['invalidNodeLocation'] += 1
            continue
        # A valid OSM polygon is required; unknown areas are never filled.
        poly = Polygon(geo)
        if not poly.is_valid or poly.area < 10:
            rejects['invalidOrUnder10m2'] += 1
            continue
        c = poly.centroid
        center = np.array([c.x, c.y])
        matched = []
        for rid in candidates:
            r = routes[rid]
            distance, chainage = project(r, center - r['origin'])
            if distance <= BUFFER:
                matched.append((rid, chainage))
        if not matched:
            continue
        seen.add(way.id)
        rect = list(poly.minimum_rotated_rectangle.exterior.coords)
        widths = [math.dist(rect[i], rect[i + 1]) for i in range(2)]
        if min(widths) < .1:
            rejects['degenerateRectangle'] += 1
            continue
        angle = math.atan2(rect[1][1] - rect[0][1], rect[1][0] - rect[0][0])
        h, estimated, height_source = building_height(tags)
        for rid, chainage in matched:
            r = routes[rid]
            local = center - r['origin']
            r['buildings'].append([round(chainage, 1), round(float(local[0]), 1),
                                   round(float(local[1]), 1), round(widths[0], 1),
                                   round(widths[1], 1), round(angle, 4), round(h, 1), estimated])
            r['heights'].append(dict(source=height_source, height=tags.get('height'),
                                     levels=tags.get('building:levels'), building=tags.get('building')))
            r['ids'].append(way.id)
        kept += 1
        if kept % 20000 == 0:
            print(region, 'unique footprints retained', kept, 'elapsed', round(time.monotonic() - start, 1), flush=True)
    print(region, 'done', count, 'building ways scanned;', kept, 'retained;', round(time.monotonic() - start, 1), 'seconds', flush=True)


def height_stats(tags):
    kinds = Counter(t['source'] for t in tags)
    return dict(heightTagged=kinds['height'], levelsDerived=kinds['levels'],
                defaultHeight=kinds['default'],
                rawHeightTagPresent=sum(t['height'] is not None for t in tags),
                rawLevelsTagPresent=sum(t['levels'] is not None for t in tags),
                buildingTypeCounts=dict(Counter(t['building'] for t in tags)),
                heightTagValues=dict(Counter(str(t['height']) for t in tags if t['height'] is not None)),
                levelsTagValues=dict(Counter(str(t['levels']) for t in tags if t['levels'] is not None)))


out_routes = {}
summaries = []
for rid, r in routes.items():
    order = sorted(range(len(r['buildings'])), key=lambda i: r['buildings'][i][0])
    buildings = [r['buildings'][i] for i in order]
    tags = [r['heights'][i] for i in order]
    ids = [r['ids'][i] for i in order]
    old = np.array(r['previous'], dtype=float)
    coords = np.array([b[1:3] for b in buildings], dtype=float)
    station_stats = []
    for st in r['doc']['stations']:
        station_pos = np.array([st['x'], st['z']])
        mask = np.linalg.norm(coords - station_pos, axis=1) <= 400
        old_count = int(np.count_nonzero(np.linalg.norm(old[:, 1:3] - station_pos, axis=1) <= 400)) if len(old) else 0
        selected = [tags[i] for i in np.flatnonzero(mask)]
        station_stats.append(dict(name=st['name'], s=st['s'], radiusM=400,
                                  osmBuildingCount=int(np.count_nonzero(mask)),
                                  previous170mCorridorCount=old_count,
                                  heightTags=height_stats(selected)))
    stat = height_stats(tags)
    doc = dict(mappedBuildings=buildings, bufferM=BUFFER, osmBuildingCount=len(buildings),
               previous170mOsmBuildingCount=len(r['previous']), perStation400m=station_stats,
               heightTags=stat, osmWayIds=ids,
               projection=r['doc']['projection'], lengthM=r['doc']['length'],
               footprintMinimumAreaM2=10, rowFormat=['s', 'x', 'z', 'w', 'd', 'angle', 'h', 'estimated'],
               rectangleRepresentation=True)
    out_routes[rid] = doc
    summaries.append(dict(route=rid, before=len(r['previous']), after=len(buildings), **stat))

output = dict(schema='tobu118-building-corridors-v1',
              routes=out_routes, bufferM=BUFFER,
              source='OpenStreetMap contributors; cached Geofabrik Kanto and Tohoku regional PBF',
              sourceFiles=source_files, attribution='https://www.openstreetmap.org/copyright',
              license='ODbL-1.0',
              geometry='Original mapped footprint centroids and minimum rotated rectangles; exact existing route local XY projection',
              limitations=['Mapped closed building ways only; relation-only footprints are not included.',
                           'Buildings absent from OSM are left unknown; no invented footprint infill.',
                           'building:levels multiplied by 3.1 m is estimated; absent height and levels default to 6.2 m and are flagged estimated.',
                           '500 m is a route corridor around mapped route points, including their existing endpoint extensions.',
                           'Per-station counts use a true 400 m disk around the route-projected station position.',
                           'Centroid and minimum-rectangle representation is a rendering approximation, not cadastral geometry.',
                           'No Google imagery, Street View pixels, or traced Google footprints are included.'],
              processingRejects=dict(rejects))
path = ASSETS / 'tobu118-buildings.json.gz'
path.write_bytes(gzip.compress(json.dumps(output, ensure_ascii=False, separators=(',', ':')).encode(), compresslevel=9, mtime=0))
report = ROOT / 'tobu118-building-stats.json'
report.write_text(json.dumps(dict(summaries=summaries, perStation400m={rid: d['perStation400m'] for rid, d in out_routes.items()}, assetBytes=path.stat().st_size, processingSeconds=round(time.monotonic() - start, 1)), ensure_ascii=False, indent=2), encoding='utf8')
print('OUTPUT', path, path.stat().st_size, 'bytes', flush=True)
for summary in summaries:
    print(summary['route'], 'before', summary['before'], 'after', summary['after'],
          'height', summary['heightTagged'], 'levels', summary['levelsDerived'],
          'default', summary['defaultHeight'], flush=True)
