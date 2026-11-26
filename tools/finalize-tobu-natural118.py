"""Remove mapped water-line portions covered by actual water-area polygons, then validate v118 asset."""
from pathlib import Path
import json,gzip,math
import numpy as np
from shapely.geometry import LineString,Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1];PATH=ROOT/'dist/assets/final/tobu118-natural.json.gz'
def parts(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 return [v for c in getattr(g,'geoms',[]) for v in parts(c)]
def finalize():
 data=json.loads(gzip.decompress(PATH.read_bytes()));stats={}
 for rid,r in data['routes'].items():
  p=np.array(json.loads((ROOT/f'dist/assets/final/{rid}-route.json').read_text(encoding='utf8'))['points']);line=LineString(p[:,1:3]);lc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p[:,1:3],axis=0),axis=1))]
  water=[]
  for w in r['waterAreas']:
   rings=w['points'];poly=Polygon([q[:2] for q in rings[0]],[[q[:2] for q in ring] for ring in rings[1:]])
   if poly.is_valid:water.append(poly)
  union=unary_union(water);out=[];covered=0
  for w in r['waterLines']:
   points=np.array([[q[0],q[1],q[2] if q[2] is not None else 0] for q in w['points']]);source=LineString(points[:,:2]);sc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points[:,:2],axis=0),axis=1))];cut=source.difference(union)
   covered+=max(0,source.length-cut.length)
   for segment in parts(cut):
    if segment.length<8:continue
    coords=[];chains=[]
    for x,z in segment.coords:
     distance=source.project(__import__('shapely').geometry.Point(x,z));height=float(np.interp(distance,sc,points[:,2]));distanceRail=line.project(__import__('shapely').geometry.Point(x,z));s=float(np.interp(distanceRail,lc,p[:,0]));chains.append(s);coords.append([round(x,1),round(z,1),round(height,2)])
    out.append({**w,'points':coords,'sStart':round(min(chains),1),'sEnd':round(max(chains),1),'areaOverlapSuppressed':True})
  r['waterLines']=out
  valid=sum(q[3] for row in r['terrain']['rows'] for q in row[3]);total=sum(len(row[3]) for row in r['terrain']['rows']);values=[q[2] for row in r['terrain']['rows'] for q in row[3] if q[3]]
  assert len(r['terrain']['offsets'])==13 and all(len(row[3])==13 for row in r['terrain']['rows'])
  assert all(a[0]<b[0] for a,b in zip(r['terrain']['rows'],r['terrain']['rows'][1:]))
  for key in ['waterLines','waterAreas','landAreas']:
   assert all(math.isfinite(w['sStart']) and math.isfinite(w['sEnd']) and w['sStart']<=w['sEnd'] for w in r[key])
  stats[rid]=dict(terrainRows=len(r['terrain']['rows']),validSamples=valid,totalSamples=total,groundRelativeRangeM=[min(values),max(values)],waterLines=len(out),waterAreas=len(r['waterAreas']),landAreas=len(r['landAreas']),duplicateWaterLineLengthRemovedM=round(covered,1))
 data['validation']=stats;data['validity']['waterDuplicatePolicy']='Line portions covered by actual water-area polygons were removed. Line width defaults are display estimates, never claimed as measured widths.'
 PATH.write_bytes(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0));print(json.dumps(dict(bytes=PATH.stat().st_size,stats=stats),ensure_ascii=False,indent=2))
if __name__=='__main__':finalize()
