"""Sample newly fetched OSM polygons along actual rails, then align to BVE chainage."""
from pathlib import Path
import json, math, bisect
from shapely.geometry import Polygon, LineString, Point, shape, box
from shapely.ops import polygonize, unary_union, transform
ROOT=Path(__file__).resolve().parents[1]
cache=ROOT.parent/'yamagata99'
if (cache/'osm.json').exists():
    data=json.loads((cache/'osm.json').read_text(encoding='utf8'));source='OpenStreetMap / Overpass'
else:
    import osmium
    reader=osmium.io.Reader(str(ROOT.parent/'all-road-cache/tohoku-latest.osm.pbf'))
    timestamp=reader.header().get('osmosis_replication_timestamp');reader.close()
    data={'osm3s':{'timestamp_osm_base':timestamp},'elements':json.loads((ROOT.parent/'yamagata97/land.json').read_text(encoding='utf8'))['elements']}
    data['elements']+=[dict(type='area',**row) for row in json.loads((ROOT.parent/'yamagata97/areas.json').read_text(encoding='utf8'))]
    source='OpenStreetMap / retained Geofabrik Tohoku PBF; online refresh timed out'
route=json.loads((ROOT/'dist/assets/final/yamagata-route.json').read_text(encoding='utf8'))
geo=json.loads((ROOT.parent/'yamagata97/geographic.json').read_text(encoding='utf8'))
R=6378137; X=math.pi/180*R*math.cos(math.radians(37.7542));Y=math.pi/180*R
def xy(n):return ((n['lon']-geo['stations'][0]['lon'])*X,(n['lat']-geo['stations'][0]['lat'])*Y)
def polygon(e):
    if e['type']=='area':
        p=shape(e['geometry']);a,b,c,d=p.bounds
        if c<140.12 or a>140.42 or d<37.74 or b>37.89:return None
        return transform(lambda x,y,z=None:((x-geo['stations'][0]['lon'])*X,(y-geo['stations'][0]['lat'])*Y),p).buffer(0)
    if e['type']=='way':
        nodes=e.get('geometry',[])
        if len(nodes)<4 or nodes[0]!=nodes[-1]:return None
        if max(n['lon'] for n in nodes)<140.12 or min(n['lon'] for n in nodes)>140.42 or max(n['lat'] for n in nodes)<37.74 or min(n['lat'] for n in nodes)>37.89:return None
        return Polygon([xy(n) for n in nodes]).buffer(0)
    rings={role:[] for role in ['outer','inner']}
    for m in e.get('members',[]):
        nodes=m.get('geometry',[]);role=m.get('role','outer') or 'outer'
        if role in rings and len(nodes)>1:rings[role].append(LineString([xy(n) for n in nodes]))
    def joined(role):return unary_union(list(polygonize(unary_union(rings[role])))) if rings[role] else Polygon()
    return joined('outer').difference(joined('inner')).buffer(0)
parts={k:[] for k in ['forest','green','farmland','orchard','building']};count=0
clip=box(*xy({'lon':140.12,'lat':37.74}),*xy({'lon':140.42,'lat':37.89}))
for e in data['elements']:
    tags=e.get('tags',{});land=tags.get('landuse');natural=tags.get('natural');keys=[]
    if land=='forest' or natural in ('wood','scrub'):keys+=['forest','green']
    if land in ('farmland','meadow','grass'):keys+=['farmland','green']
    if land in ('orchard','vineyard'):keys+=['orchard','green']
    if natural in ('grassland','heath') or land in ('allotments','recreation_ground','village_green'):keys+=['green']
    if tags.get('building') not in (None,'no'):keys+=['building']
    if not keys:continue
    p=polygon(e)
    if p is not None and not p.is_empty:
        p=p.intersection(clip);count+=1
        for k in set(keys):parts[k].append(p)
unions={k:unary_union(v) for k,v in parts.items()};covered=unary_union(list(unions.values()))
stations=[s for s in route['stations'] if s['name'] in ['庭坂','板谷','峠','大沢','関根']]
def point(source):
    i=1
    while i<len(stations)-1 and stations[i]['sourceS']<source:i+=1
    a,b=stations[i-1:i+1];t=(source-a['sourceS'])/(b['sourceS']-a['sourceS'])
    ga,gb=[next(st for st in geo['stations'] if st['name']==s['name']) for s in [a,b]]
    chain=ga['s']+(gb['s']-ga['s'])*t;ps=geo['points'];j=max(1,min(len(ps)-1,bisect.bisect_right([p[0] for p in ps],chain)))
    a,b=ps[j-1:j+1];t=(chain-a[0])/(b[0]-a[0]);return Point(a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t)
start,end=stations[0]['sourceS'],stations[-1]['sourceS']
sources=sorted(set([start,end]+[s['sourceS'] for s in stations]+list(range(math.ceil(start/500)*500,math.floor(end/500)*500+1,500))))
rows=[]
for source in sources:
    buffer=point(source).buffer(600);areas={k:round(p.intersection(buffer).area/buffer.area,5) for k,p in unions.items()}
    coverage=covered.intersection(buffer).area/buffer.area
    rows.append(dict(sourceS=source,green=round(100*areas['green'],2),forest=areas['forest'],farmland=areas['farmland'],orchard=areas['orchard'],coverage=round(coverage,5)))
profile=dict(start=start,end=end,bufferM=600,source=source,timestamp=data['osm3s']['timestamp_osm_base'],bbox=[37.74,140.12,37.89,140.42],mappedElements=count,residentialPolicy='User-requested exclusion; station and railway facilities retained',rows=rows)
(ROOT/'dist/yamagata-mountain-data.js').write_text('export const YAMAGATA_MOUNTAIN='+json.dumps(profile,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
# Keep the options graph consistent with the rendered corridor; this policy is
# explicitly labelled separately from the measured OSM forest cover.
for row in route['sceneryProfile']:
    station=next((st for st in stations if st['name']==row['name']),None)
    if station:
        sampled=next(r for r in rows if r['sourceS']==station['sourceS'])
        row.update({k:v for k,v in sampled.items() if k!='sourceS'},building=0,urban=0,source='osm-corridor-600m',residentialExcluded=True)
(ROOT/'dist/assets/final/yamagata-route.json').write_text(json.dumps(route,ensure_ascii=False,separators=(',',':')),encoding='utf8')
p=ROOT/'dist/scenery-profile-data.js'
profiles=json.loads(p.read_text(encoding='utf8').split('export const SCENERY_PROFILES=')[1].strip().removesuffix(';'))
next(entry for entry in profiles if entry['id']=='yamagata')['rows']=route['sceneryProfile']
p.write_text('// Automatically derived from OSM footprints / land use and GSI terrain; marked residential exclusions follow simulator requirements.\nexport const SCENERY_PROFILES='+json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print(json.dumps(dict(samples=len(rows),forestRange=[min(r['forest'] for r in rows),max(r['forest'] for r in rows)],timestamp=profile['timestamp'])))
