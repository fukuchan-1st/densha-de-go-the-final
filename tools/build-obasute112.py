import json,math,gzip
from pathlib import Path
from shapely.geometry import Polygon,box,LineString,Point
from shapely.ops import triangulate
root=Path.cwd();out=root.parent/'obasute112';osm=json.loads((out/'osm.json').read_text(encoding='utf-8'));dem=json.loads((out/'dem.json').read_text(encoding='utf-8'))
# OSM centreline of the valley-side platform; stop is 130 m before its buffer.
rails={w['id']:w for w in osm['rails']};lon0,lat0=138.0932,36.5027;X=111320*math.cos(math.radians(lat0))
xy=lambda p:((p[0]-lon0)*X,(p[1]-lat0)*111320)
line=LineString([xy(p) for p in rails[24412230]['points']]);stop=line.interpolate(130);lon=lon0+stop.x/X;lat=lat0+stop.y/111320
axis=(-.689,.725);L=math.hypot(*axis);axis=tuple(v/L for v in axis)
def en(p):return [round((p[0]-lon)*X,1),round((p[1]-lat)*111320,1)]
def u(p):e,n=en(p);return e*axis[0]+n*axis[1]
network=[]
ids=[24412230,222341441,222341439,222341440,1174542795,1174542796,1174542797,1174542798,1178483802,1178483812,1178483813,162793206,154816608]
for id in ids:
 pts=[en(p) for p in rails[id]['points']];network.append({'id':id,'points':pts})
land=[]
for row in osm['rows']:
 pts=[en(p) for p in row['points']];shape=Polygon(pts) if len(pts)>3 and pts[0]==pts[-1] else None
 if shape and not shape.is_valid:shape=shape.buffer(0)
 if shape and shape.geom_type!='Polygon':continue
 if shape:
  shape=shape.simplify(1.5,preserve_topology=True)
  if shape.area<45:continue
  pts=[[round(x,1),round(y,1)] for x,y in shape.exterior.coords]
 elif row['kind'] not in ('river',):continue
 land.append([row['id'],row['kind'],pts,row.get('crop')])
# Mapped buildings used as low-detail silhouettes on the distant basin floor.
buildings=[];seen=set()
cache=json.loads(gzip.decompress((root.parent/'buildings105/chubu.json.gz').read_bytes()))
if isinstance(cache,dict):print('building keys',list(cache));cache=cache.get('rows',[])
for row in cache:
 id,blat,blon,corners,h,*rest=row
 if not(36.48<blat<36.64 and 138.08<blon<138.24):continue
 e,n=en([blon,blat]);dist=math.hypot(e,n)
 if dist<380:continue
 cell=(int(e//(22 if dist<2200 else 60)),int(n//(22 if dist<2200 else 60)))
 if cell in seen:continue
 seen.add(cell);cs=[en([p[1],p[0]]) for p in corners];a,b,c=cs[:3];w=math.dist(a,b);d=math.dist(b,c)
 if w<2 or d<2 or w>160 or d>160:continue
 buildings.append([e,n,round(w,1),round(d,1),round(math.atan2(b[1]-a[1],b[0]-a[0]),3),round(min(h or 7,80),1)])
data={'source':'GSI DEM PNG z12 / OpenStreetMap Chubu extract; field boundaries are mapped landuse, crop only when tagged.','origin':[lon,lat],'axis':axis,'dem':dem,'land':land,'buildings':buildings,'network':network}
path=root/'dist/assets/obasute112.json.gz';path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':'),ensure_ascii=False).encode(),compresslevel=9,mtime=0));print('origin',data['origin'],'land',len(land),'buildings',len(buildings),'gzip',path.stat().st_size)
