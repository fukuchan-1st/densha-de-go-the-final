"""Extract Yamagata rails/stations/scenery from the retained full Tohoku OSM PBF."""
from pathlib import Path
import json
import osmium

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'yamagata97'
OUT.mkdir(exist_ok=True)

class Extract(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.rails, self.stations, self.roads, self.land = [], [], [], []

    def node(self, n):
        if n.tags.get('railway') not in ('station', 'halt') or not n.location.valid(): return
        if 37.65 < n.lat < 38.85 and 139.9 < n.lon < 140.6:
            self.stations.append(dict(type='node', id=n.id, lat=n.lat, lon=n.lon, tags=dict(n.tags)))

    def way(self, w):
        if not w.nodes or not w.nodes[0].location.valid(): return
        first=w.nodes[0]
        if not (37.5 < first.lat < 39 and 139.8 < first.lon < 140.7): return
        tags = dict(w.tags)
        category = 'rail' if tags.get('railway') == 'rail' else 'road' if tags.get('highway') in ('motorway','trunk','primary','secondary','tertiary','unclassified','residential','service','living_street') else 'land' if tags.get('building') or tags.get('landuse') or tags.get('natural') else None
        if not category: return
        if not any(n.location.valid() and 37.65 < n.lat < 38.85 and 139.9 < n.lon < 140.6 for n in w.nodes): return
        geometry = [dict(lat=n.lat, lon=n.lon) for n in w.nodes if n.location.valid()]
        if len(geometry) != len(w.nodes): return
        row = dict(type='way', id=w.id, nodes=[n.ref for n in w.nodes], geometry=geometry, tags=tags)
        getattr(self, {'rail':'rails','road':'roads','land':'land'}[category]).append(row)

if __name__ == '__main__':
    h = Extract()
    source=str(ROOT.parent/'all-road-cache/tohoku-latest.osm.pbf')
    for n in osmium.FileProcessor(source).with_filter(osmium.filter.EntityFilter(osmium.osm.NODE)).with_filter(osmium.filter.TagFilter(('railway','station'),('railway','halt'))): h.node(n)
    print('stations',len(h.stations),flush=True)
    for w in osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('railway')): h.way(w)
    (OUT/'rails.json').write_text(json.dumps(dict(elements=h.rails+h.stations),ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print('rails',len(h.rails),flush=True)
    for w in osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('highway','building','landuse','natural')):
        if w.tags.get('railway')=='rail':continue
        h.way(w)
    for name, rows in [('rails',h.rails+h.stations),('roads',h.roads),('land',h.land)]:
        (OUT/(name+'.json')).write_text(json.dumps(dict(elements=rows),ensure_ascii=False,separators=(',',':')),encoding='utf8')
        print(name,len(rows),flush=True)
