"""v118: true GSI cross-corridor ground + mapped OSM water/land, never alter existing assets.
Run from any cwd. Retained Geofabrik PBF and DEM PNG cache are external to dist.
"""
from pathlib import Path
import math,json,gzip,bisect,urllib.request,concurrent.futures
import numpy as np
from PIL import Image
import osmium
from shapely.geometry import LineString,Polygon,Point,shape,mapping
from shapely.ops import transform
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT.parent/'all-road-cache';OUT=ROOT/'dist/assets/final/tobu118-natural.json.gz';R=6371008.8
BASELAT=36;BASELON=139;CX=math.pi/180*R*math.cos(math.radians(BASELAT));CY=math.pi/180*R
OFFSETS=[-1600,-1000,-600,-300,-120,-40,0,40,120,300,600,1000,1600];Z=12;N=2**Z;tiles={};fetchErrors={}
def gx(lat,lon):return complex((lon-BASELON)*CX,(lat-BASELAT)*CY)
def gps(p):return BASELAT+p.imag/CY,BASELON+p.real/CX
def interp(p,s):return complex(np.interp(s,p[:,0],p[:,1]),np.interp(s,p[:,0],p[:,2]))
class Route:
 def __init__(self,rid):
  self.id=rid;self.data=json.loads((ROOT/f'dist/assets/final/{rid}-route.json').read_text(encoding='utf8'));self.p=np.array(self.data['points']);self.L=self.data['length'];self.anchors=[]
  if 'projection' in self.data:
   q=self.data['projection'];self.origin=gx(q['referenceLatitude'],q['referenceLongitude']);self.scale=complex(math.cos(math.radians(BASELAT))/math.cos(math.radians(q.get('scaleLatitude',q['referenceLatitude']))),0)
   self.method='Exact source local XY projection';self.affine=False
  else:
   geo=json.loads((ROOT.parent/'yagan-station-coordinates.json').read_text(encoding='utf8'));st=[(s['s'],geo[s['name']]) for s in self.data['stations'] if s['name'] in geo]
   for (s,a),(t,b) in zip(st,st[1:]):
    pa,pb=interp(self.p,s),interp(self.p,t);ga,gb=gx(*a),gx(*b);self.anchors.append((s,pa,ga,(gb-ga)/(pb-pa)))
   self.keys=[a[0] for a in self.anchors];self.affine=True;self.method='Piecewise station-anchor affine fit of original BVE XY, not surveyed alignment'
  self.line=LineString([(self.geo(s,complex(x,z)).real,self.geo(s,complex(x,z)).imag) for s,x,z,*_ in self.p]);self.corridor=self.line.buffer(1800);self.waters=[];self.land=[];self.waterlines=[];self.rows=[]
 def anchor(self,s):return self.anchors[max(0,min(len(self.keys)-1,bisect.bisect_right(self.keys,s)-1))]
 def geo(self,s,v):
  if self.affine:
   _,p,g,k=self.anchor(s);return g+(v-p)*k
  return self.origin+complex(v.real*self.scale.real,v.imag)
 def local(self,g):
  chain=self.line.project(Point(g.real,g.imag));s=chain/max(.001,self.line.length)*self.L
  # Geographic and BVE cumulative lengths differ; use a geographic chainage interpolation.
  if not hasattr(self,'gchain'):
   coords=list(self.line.coords);self.gchain=np.r_[0,np.cumsum([math.dist(a,b) for a,b in zip(coords,coords[1:])])]
  s=float(np.interp(chain,self.gchain,self.p[:,0]));
  if self.affine:
   _,p,a,k=self.anchor(s);v=p+(g-a)/k
  else:v=complex((g.real-self.origin.real)/self.scale.real,g.imag-self.origin.imag)
  return s,v
 def frame(self,s,o):
  p=interp(self.p,s);d=interp(self.p,min(self.L,s+5))-interp(self.p,max(0,s-5));right=complex(d.imag,-d.real)/max(.001,abs(d));return p+right*o
routes={rid:Route(rid) for rid in ['tobu-skytree','tobu-nikko','tobu-kinugawa','aizu','yagan']}
def pixelKey(lat,lon):
 x=(lon+180)/360*N*256;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*N*256;return x,y
keys=set()
for r in routes.values():
 ss=list(np.arange(0,r.L,100))+[r.L]
 for s in ss:
  for offset in OFFSETS:
   v=r.frame(s,offset);la,lo=gps(r.geo(s,v));x,y=pixelKey(la,lo)
   for dx in [0,1]:
    for dy in [0,1]:keys.add((int(x+dx)//256,int(y+dy)//256))
def getTile(k):
 tx,ty=k;p=CACHE/f'gsi/{Z}-{tx}-{ty}.png'
 try:
  if not p.exists():p.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{Z}/{tx}/{ty}.png',timeout=25).read())
  return k,Image.open(p).convert('RGB')
 except Exception as e:fetchErrors[str(k)]=str(e);return k,None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for k,im in pool.map(getTile,keys):tiles[k]=im

def height(g):
 lat,lon=gps(g);x,y=pixelKey(lat,lon);a,b=int(x),int(y);u,v=x-a,y-b;result=0
 for dx,dy,weight in [(0,0,(1-u)*(1-v)),(1,0,u*(1-v)),(0,1,(1-u)*v),(1,1,u*v)]:
  key=((a+dx)//256,(b+dy)//256)
  if key not in tiles:kk,im=getTile(key);tiles[kk]=im
  im=tiles[key]
  if im is None:return None
  red,green,blue=im.getpixel(((a+dx)%256,(b+dy)%256));value=(red<<16)+(green<<8)+blue
  if value==8388608:return None
  result+=(value if value<8388608 else value-16777216)*.01*weight
 return result
for r in routes.values():
 # Reconstruct v114 rail datum using precisely its nearest-pixel DEM sampling and smoothing/cap steps.
 if not r.affine:
  ss=np.arange(0,r.L+100,100);h=[]
  for s in ss:
   g=r.geo(s,interp(r.p,s));la,lo=gps(g);x,y=pixelKey(la,lo);im=tiles[(int(x)//256,int(y)//256)];red,gr,bl=im.getpixel((int(x)%256,int(y)%256));v=(red<<16)+(gr<<8)+bl;h.append(0 if v==8388608 else (v if v<8388608 else v-16777216)*.01)
  h=np.convolve(np.pad(h,(3,3),mode='edge'),np.ones(7)/7,mode='valid')
  for span in r.data['structures']:
   if span['kind']=='tunnel':
    a,b=span['sStart'],span['sEnd'];ha,hb=np.interp([a,b],ss,h);mask=(ss>=a)&(ss<=b);h[mask]=ha+(hb-ha)*(ss[mask]-a)/(b-a)
  for _ in range(3):
   for i in range(1,len(h)):h[i]=max(h[i-1]-3.5,min(h[i-1]+3.5,h[i]))
   for i in range(len(h)-2,-1,-1):h[i]=max(h[i+1]-3.5,min(h[i+1]+3.5,h[i]))
  r.datum=float(h[0]);r.datumMethod='Reconstructed original v114 nearest-pixel GSI z12, 7-sample smoothing, tunnel interpolation, gradient cap; same absolute datum as route.points'
 else:r.datum=height(r.geo(0,interp(r.p,0)))-float(np.interp(0,r.p[:,0],r.p[:,3]));r.datumMethod='GSI ground at original BVE origin minus BVE rail height; original BVE vertical survey datum unavailable'
 for s in list(np.arange(0,r.L,100))+[r.L]:
  pts=[]
  for offset in OFFSETS:
   p=r.frame(s,offset);h=height(r.geo(s,p));pts.append([round(p.real,1),round(p.imag,1),round(h-r.datum,2) if h is not None else None,int(h is not None)])
  r.rows.append([round(float(s),2),round(float(np.interp(s,r.p[:,0],r.p[:,3])),3),pts[6][2],pts])
 print('terrain',r.id,len(r.rows),round(r.datum,2),flush=True)

# OSM extraction: complete geometry is intersected with corridor, never a centroid/first-node test.
factory=osmium.geom.GeoJSONFactory();seen=set();counts={};timestamps={}
def geometries(g,kind):
 if g.is_empty:return []
 if g.geom_type==kind:return [g]
 return [v for child in getattr(g,'geoms',[]) for v in geometries(child,kind)]
def emit(r,g,tags,oid,otype,kind):
 clipped=g.intersection(r.corridor).simplify(3 if kind=='waterLine' else 5,preserve_topology=True)
 parts=geometries(clipped,'LineString' if kind=='waterLine' else 'Polygon')
 for part in parts:
  if (kind=='waterLine' and part.length<8) or (kind!='waterLine' and part.area<60):continue
  chains=[]
  def ring(coords):
   out=[]
   for x,z in coords:
    ss,p=r.local(complex(x,z));h=height(complex(x,z));chains.append(ss);out.append([round(p.real,1),round(p.imag,1),round(h-r.datum,2) if h is not None else None])
   return out
  if kind=='waterLine':points=ring(part.coords)
  else:points=[ring(part.exterior.coords)]+[ring(q.coords) for q in part.interiors]
  row=dict(osmId=oid,osmType=otype,name=tags.get('name',''),sStart=round(min(chains),1),sEnd=round(max(chains),1),points=points)
  if kind=='waterLine':
   try:width=float(tags.get('width','').replace('m','').strip());widthSource='OSM width tag'
   except:width=None;widthSource='Not mapped; renderWidth is a display estimate only'
   row.update(waterway=tags.get('waterway'),width=width,renderWidth=width or {'river':24,'stream':5,'canal':6,'drain':2,'ditch':1.5}.get(tags.get('waterway'),4),widthSource=widthSource,tunnel=tags.get('tunnel'),intermittent=tags.get('intermittent'))
   r.waterlines.append(row)
  else:
   row['kind']=kind;row['areaM2']=round(part.area)
   (r.waters if kind=='water' else r.land).append(row)
for region in ['kanto','tohoku']:
 source=CACHE/f'{region}-latest.osm.pbf';reader=osmium.io.Reader(str(source));timestamps[region]=reader.header().get('osmosis_replication_timestamp');reader.close();n=0
 processor=osmium.FileProcessor(str(source)).with_areas(osmium.filter.KeyFilter('waterway','natural','landuse','water')).with_filter(osmium.filter.EntityFilter(osmium.osm.WAY|osmium.osm.AREA)).with_filter(osmium.filter.KeyFilter('waterway','natural','landuse','water'))
 for obj in processor:
  tags=dict(obj.tags);waterline=isinstance(obj,osmium.osm.Way) and tags.get('waterway') in ['river','stream','canal','drain','ditch']
  if isinstance(obj,osmium.osm.Way) and not waterline:continue
  iswater=tags.get('natural')=='water' or tags.get('waterway')=='riverbank' or tags.get('landuse') in ['reservoir','basin'];forest=tags.get('landuse')=='forest' or tags.get('natural') in ['wood','scrub'];farm=tags.get('landuse') in ['farmland','farmyard','orchard','vineyard','meadow']
  if not (waterline or iswater or forest or farm):continue
  oid=obj.id if waterline else obj.orig_id();otype='way' if waterline or obj.from_way() else 'relation';key=(oid,otype,'line' if waterline else 'area')
  if key in seen:continue
  seen.add(key)
  try:
   if waterline:
    if not all(q.location.valid() for q in obj.nodes):continue
    coords=[gx(q.lat,q.lon) for q in obj.nodes];g=LineString([(q.real,q.imag) for q in coords])
   else:
    raw=shape(json.loads(factory.create_multipolygon(obj)));g=transform(lambda lo,la,z=None:((lo-BASELON)*CX,(la-BASELAT)*CY),raw)
   if not g.is_valid:g=g.buffer(0)
   a,b,c,d=g.bounds
   if d<-.4*CY or b>1.4*CY or c<.2*CX or a>1.1*CX:continue
   for r in routes.values():
    if g.intersects(r.corridor):emit(r,g,tags,oid,otype,'waterLine' if waterline else 'water' if iswater else 'forest' if forest else 'farmland')
   n+=1
  except Exception as e:
   counts['geometryErrors']=counts.get('geometryErrors',0)+1
 print('osm',region,n,flush=True)

result=dict(version=118,sources=[dict(name='国土地理院 DEM PNG z12',url='https://maps.gsi.go.jp/development/ichiran.html#dem',sampling='bilinear actual DEM; no invented terrain values',noData='null height, valid=0'),dict(name='OpenStreetMap contributors / Geofabrik retained PBF',url='https://www.openstreetmap.org/copyright',license='ODbL-1.0',timestamps=timestamps)],schema=dict(terrainRow=['s','railHeight','bedHeight','points'],terrainPoint=['localX','localZ','relativeGroundHeight','valid'],naturalPoint=['localX','localZ','relativeGroundHeight'],polygonPoints='Array of rings: exterior then holes',offsetSign='positive is right of northbound route tangent in local X/Z',railClearHalfWidthM=40,railBlendEndM=120),validity=dict(fetchErrors=fetchErrors,geometryErrors=counts.get('geometryErrors',0),waterHeightNote='DEM ground approximation, not surveyed water surface; retain rail/tunnel/bridge corridor clearance',landNote='Mapped land polygons only. Absence in OSM is not evidence of absence on the ground.'),routes={})
for rid,r in routes.items():
 result['routes'][rid]=dict(length=r.L,alignment=r.method,terrain=dict(sStep=100,offsets=OFFSETS,datumAbsoluteM=round(r.datum,4),datumMethod=r.datumMethod,railClearHalfWidthM=40,railBlendEndM=120,rows=r.rows),waterLines=r.waterlines,waterAreas=r.waters,landAreas=r.land)
 print('features',rid,len(r.waterlines),len(r.waters),len(r.land),flush=True)
raw=json.dumps(result,ensure_ascii=False,separators=(',',':')).encode();OUT.write_bytes(gzip.compress(raw,compresslevel=9,mtime=0));print('written',OUT,len(raw),OUT.stat().st_size,flush=True)

# A single command rebuilds and validates the final deduplicated distributable.
import runpy
runpy.run_path(str(Path(__file__).with_name("finalize-tobu-natural118.py")),run_name="__main__")
