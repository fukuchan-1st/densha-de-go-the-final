"""Import geographic crossing markers for the four playable Tobu/Aizu segments."""
import json
import math
import re
import urllib.request
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / 'dist/assets/final'
PAGES = {'tobu-skytree': 5894, 'tobu-nikko': 5906, 'tobu-kinugawa': 5910, 'aizu': 6934}
METRES_PER_DEGREE = math.pi * 6371008.8 / 180


def fetch(url, referer):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': referer})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode('utf-8-sig')


def project(points, x, z):
    best = (math.inf, 0)
    for a, b in zip(points, points[1:]):
        dx, dz = b[1] - a[1], b[2] - a[2]
        fraction = max(0, min(1, ((x - a[1]) * dx + (z - a[2]) * dz) / max(.001, dx*dx + dz*dz)))
        distance = math.hypot(x - a[1] - fraction*dx, z - a[2] - fraction*dz)
        best = min(best, (distance, a[0] + fraction*(b[0] - a[0])))
    return best


def main():
    for route_id, page in PAGES.items():
        url = f'https://fumikiri.info/?page_id={page}'
        marker_path = re.search(r'var fdata\s*=\s*"([^"]+)"', fetch(url, url))[1]
        features = json.loads(fetch('https://fumikiri.info/' + marker_path.removeprefix('./'), url))['features']
        path = ASSETS / f'{route_id}-route.json'
        route = json.loads(path.read_text(encoding='utf-8'))
        projection = route['projection']
        longitude_scale = METRES_PER_DEGREE * math.cos(math.radians(projection['scaleLatitude']))
        existing = [row for row in route['structures'] if row.get('source') != url]
        crossings = []
        for feature in features:
            props = feature['properties']
            kind = int(props['ftype'])
            if kind not in (1, 4):
                continue
            lon, lat = feature['geometry']['coordinates']
            x = (lon - projection['referenceLongitude']) * longitude_scale
            z = (lat - projection['referenceLatitude']) * METRES_PER_DEGREE
            error, s = project(route['points'], x, z)
            if error > 40 or s <= 0 or s >= route['length']:
                continue
            if any(row['kind'] == 'tunnel' and row['sStart'] <= s <= row['sEnd'] for row in existing):
                continue
            if any(abs(row['sOrigin'] - s) < 9 for row in crossings):
                continue
            s = round(s, 2)
            marker = int(props['fid'])
            crossings.append({
                'kind': 'crossing', 'sStart': round(s - 3, 2), 'sEnd': round(s + 3, 2),
                'sOrigin': s, 'name': props['fname'].strip() or ('第4種踏切' if kind == 4 else '踏切'),
                'source': url, 'sourceMarker': marker, 'projectionErrorM': round(error, 2),
                **({'hornOnly': True} if kind == 4 else {'sound': f'tobu{2 + (marker - 1) % 3}'})
            })
        route['structures'] = sorted(existing + crossings, key=lambda row: row['sStart'])
        path.write_text(json.dumps(route, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(route_id, len(crossings), 'horn only', sum(row.get('hornOnly', False) for row in crossings))


if __name__ == '__main__':
    main()
