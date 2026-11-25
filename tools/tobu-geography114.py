"""Mapped roads/buildings within 180 m of new Tobu routes; output never mutates existing assets."""
from pathlib import Path
import json,math,gzip,osmium
import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import Polygon
ROOT=Path(__file__).resolve().parents[1];R=6371008.8;LAT=35.6812546;LON=139.766706
routes={}
def xy(lat,lon):return np.array([math.radians(lon-LON)*R*math.cos(math.radians(LAT)),math.radians(lat-LAT)*R])
for rid in ['tobu-skytree','tobu-nikko','tobu-kinugawa','aizu']:
 r=json.loads((ROOT/f'dist/assets/final/{rid}-route.json').read_text(encoding='utf8'));p=r['projection'];origin=xy(p['referenceLatitude'],p['referenceLongitude']);points=np.array(r['points']);v=points[:,1:3];a=v[:-1];d=v[1:]-a
 r.update(_origin=origin,_a=a,_d=d,_points=points,_tree=cKDTree((a+v[1:])/2),_roads=[],_buildings=[]);routes[rid]=r

def project(r,p):
 k=min(6,len(r['_a']));_,ids=r['_tree'].query(p,k=k);a=r['_a'][ids];d=r['_d'][ids];t=np.clip(np.sum((p-a)*d,axis=1)/np.maximum(.001,np.sum(d*d,axis=1)),0,1);dist=np.linalg.norm(p-a-t[:,None]*d,axis=1);j=dist.argmin();i=ids[j];s=r['_points'][i,0]+t[j]*(r['_points'][i+1,0]-r['_points'][i,0]);return dist[j],s
cells=set()
for r in routes.values():
 p=r['_points'];ss=np.arange(-300,r['length']+400,100);xx=np.interp(ss,p[:,0],p[:,1])+r['_origin'][0];zz=np.interp(ss,p[:,0],p[:,2])+r['_origin'][1]
 for x,z in zip(xx,zz):
  gx,gz=math.floor(x/250),math.floor(z/250)
  for dx in [-1,0,1]:
   for dz in [-1,0,1]:cells.add((gx+dx,gz+dz))
seen=set()
for region in ['kanto','tohoku']:
 for w in osmium.FileProcessor(str(ROOT.parent/f'all-road-cache/{region}-latest.osm.pbf')).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('highway','building')):
  if w.id in seen or not w.nodes or not w.nodes[0].location.valid():continue
  if not (35.65<w.nodes[0].lat<37.3 and 139.2<w.nodes[0].lon<140.05):continue
  first=xy(w.nodes[0].lat,w.nodes[0].lon)
  if (math.floor(first[0]/250),math.floor(first[1]/250)) not in cells:continue
  seen.add(w.id);tags=dict(w.tags);isroad=tags.get('highway') in ['motorway','trunk','primary','secondary','tertiary','unclassified','residential','service','living_street','motorway_link','trunk_link','primary_link','secondary_link'];isb=tags.get('building') not in [None,'no']
  if not isroad and not isb:continue
  geo=np.array([xy(n.lat,n.lon) for n in w.nodes]);center=geo.mean(axis=0)
  for rid,r in routes.items():
   local=geo-r['_origin'];p=center-r['_origin'];dist,s=project(r,p)
   if dist>200 or not -200<s<r['length']+200:continue
   if isroad:
    near=[project(r,q)[0] for q in local]
    if min(near)>180:continue
    try:width=float(tags.get('width',''))
    except:width={'motorway':12,'trunk':10,'primary':10,'secondary':8,'tertiary':7,'residential':5,'service':4}.get(tags.get('highway'),6)
    r['_roads'].append(dict(osmWayId=w.id,s=round(s,1),points=np.round(local,1).tolist(),width=width,bridge=tags.get('bridge') not in [None,'no'],source='OpenStreetMap',osmBridge=tags.get('bridge','no'),osmLayer=tags.get('layer','0'),osmTunnel=tags.get('tunnel','no'),osmLevelVerified=True))
   elif isb and len(local)>=4 and dist<170:
    poly=Polygon(local)
    if not poly.is_valid or poly.area<10:continue
    rect=list(poly.minimum_rotated_rectangle.exterior.coords);lengths=[math.dist(rect[i],rect[i+1]) for i in range(2)];angle=math.atan2(rect[1][1]-rect[0][1],rect[1][0]-rect[0][0]);c=poly.centroid
    try:h=float(tags.get('height','').replace('m','').strip());estimated=False
    except:
     try:h=float(tags.get('building:levels',2))*3.1
     except:h=6.2
     estimated=True
    r['_buildings'].append([round(s,1),round(c.x,1),round(c.y,1),round(lengths[0],1),round(lengths[1],1),round(angle,4),round(h,1),estimated])
 print(region,'done',flush=True)
for rid,r in routes.items():
 roads=sorted(r['_roads'],key=lambda x:x['s']);buildings=sorted(r['_buildings']);source='OpenStreetMap contributors / Geofabrik retained regional PBF; ODbL-1.0'
 doc=dict(route=rid,roads=roads,mappedBuildings=buildings,source=source,attribution='https://www.openstreetmap.org/copyright',bufferM=180,alignment='Same exact XY origin/projection as route.points; building height defaults estimated')
 path=ROOT/f'dist/assets/final/{rid}-geography.json.gz';path.write_bytes(gzip.compress(json.dumps(doc,separators=(',',':')).encode(),compresslevel=9))
 route=json.loads((ROOT/f'dist/assets/final/{rid}-route.json').read_text(encoding='utf8'));route['roadAsset']=f'./assets/final/{rid}-geography.json.gz';(ROOT/f'dist/assets/final/{rid}-route.json').write_text(json.dumps(route,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 print(rid,len(roads),len(buildings),path.stat().st_size,flush=True)
