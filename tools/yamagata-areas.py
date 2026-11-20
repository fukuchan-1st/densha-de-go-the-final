"""Retain OSM forest multipolygons, whose outer rings are often open ways."""
import osmium,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
factory=osmium.geom.GeoJSONFactory();rows=[]
for area in osmium.FileProcessor(str(ROOT.parent/'all-road-cache/tohoku-latest.osm.pbf')).with_areas().with_filter(osmium.filter.EntityFilter(osmium.osm.AREA)).with_filter(osmium.filter.KeyFilter('landuse','natural')):
    try:
        first=next(iter(area.outer_rings()))[0]
        if not(37.4<first.lat<39.1 and 139.5<first.lon<141):continue
        rows.append(dict(tags=dict(area.tags),geometry=json.loads(factory.create_multipolygon(area))))
    except (RuntimeError,ValueError,StopIteration):continue
(ROOT.parent/'yamagata97/areas.json').write_text(json.dumps(rows,separators=(',',':')),encoding='utf8')
print('OSM areas',len(rows),flush=True)
