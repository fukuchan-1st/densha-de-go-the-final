import json,math,gzip,bisect
from pathlib import Path
ns={'__file__':str(Path('tools/import-all-roads.py').resolve()),'__name__':'rail_alignment'}
exec(Path('tools/import-all-roads.py').read_text(encoding='utf8').replace('alignments={k:Alignment(r) for k,r in routes.items()}',"alignments={k:Alignment(r) for k,r in routes.items() if not (k=='toho' or k.startswith('toho-'))}"),ns)
ways=json.loads((ns['CACHE']/'parallel-source-rails.json').read_text())
# Individual OSM tracks for the player's own railway are already represented.
own={'chuo':['中央','篠ノ井'],'chuo-extended':['中央','篠ノ井'],'shinonoi':['篠ノ井','信越'],'shinonoi-extended':['篠ノ井','信越'],'oito':['大糸'],'ome':['青梅'],'ome-okutama':['青梅'],'itsukaichi':['五日市'],'yagan':['野岩'],'osaka':['大阪環状'],'tokaido':['東海道','JR京都','JR神戸'],'tohoku':['東北'],'yamanote':['山手']}
result={}
for key,a in ns['alignments'].items():
 if key=='yamanote':continue
 out=[]; keys=[p[0] for p in a.points]
 def local(s):
  i=max(0,min(len(keys)-2,bisect.bisect_right(keys,s)-1));p,q=a.points[i:i+2];f=(s-p[0])/max(.001,q[0]-p[0]);return complex(p[1]+f*(q[1]-p[1]),p[2]+f*(q[2]-p[2]))
 for w in ways:
  if any(n in w['name'] for n in own.get(key,own.get(next((p for p in ['chuo','shinonoi','ome'] if key.startswith(p)),key),[]))):continue
  part=[]; parts=[]
  def finish():
   if len(part)>1:
    ordered=sorted(part)
    if ordered[-1][0]-ordered[0][0]>90:parts.append(ordered)
  previous=None
  for lat,lon in w['geometry']:
   distance,s,p=a.project(lat,lon)
   if not 7<distance<160 or not 0<=s<=a.r['length']:
    finish();part=[];previous=None;continue
   tangent=local(min(a.r['length'],s+5))-local(max(0,s-5));tangent/=abs(tangent) or 1
   offset=(complex(*p)-local(s))/tangent;x=-offset.imag
   if abs(x)<(9 if w['name'] else 14) or abs(x)>150:
    finish();part=[];previous=None;continue
   if previous and (abs(s-previous[0])<.5 or abs(x-previous[1])>max(5,abs(s-previous[0])*.28)):
    finish();part=[]
   if part and s<part[-1][0]:
    # Reversely digitised ways are normal in OSM; collect then sort.
    pass
   part.append([round(s,1),round(x,1)]);previous=(s,x)
  if len(part)>1:
   part.sort();finish()
  for knots in parts:
   knots.sort();knots=[p for i,p in enumerate(knots) if not i or p[0]>knots[i-1][0]]
   if len(knots)<2:continue
   # Reduce near-straight samples, retaining deviations and the full endpoints.
   reduced=[knots[0]]
   for i in range(1,len(knots)-1):
    p,q,r=reduced[-1],knots[i],knots[i+1];f=(q[0]-p[0])/max(.001,r[0]-p[0]);err=abs(q[1]-(p[1]+(r[1]-p[1])*f))
    if err>.4 or q[0]-p[0]>300:reduced.append(q)
   reduced.append(knots[-1]);height=6 if w['bridge'] else 0
   # Nearby mapped tracks may already be in the imported station/route layout.
   mid=reduced[len(reduced)//2];duplicate=False
   for t in a.r.get('neighborTracks',[])+out:
    k=t['knots']
    if k[0][0]<=mid[0]<=k[-1][0] and abs((t.get('height') or 0)-height)<1:
     i=max(0,min(len(k)-2,bisect.bisect_right([p[0] for p in k],mid[0])-1));p,q=k[i:i+2];xx=p[1]+(q[1]-p[1])*(mid[0]-p[0])/max(.001,q[0]-p[0])
     if abs(mid[1]-xx)<2.8:duplicate=True;break
   if not duplicate:out.append(dict(knots=reduced,lineName=w['name'] or 'OSM並走線',osmWayId=w['id'],sceneryParallel=True,direction='scenery',height=height))
 result[key]=out;print(key,len(out),flush=True)
p=Path('dist/assets/parallel-railways.json.gz')
with gzip.GzipFile(filename=str(p),mode='wb',mtime=0) as f:f.write(json.dumps(dict(routes=result,source='© OpenStreetMap contributors',alignment='Geofabrik regional railway ways, projected between route station anchors; approximate track heights'),ensure_ascii=False,separators=(',',':')).encode())
print('bytes',p.stat().st_size,flush=True)
