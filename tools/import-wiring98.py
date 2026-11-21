"""Trace the supplied Ou diagram, retaining coloured standard-gauge rail vectors."""
from pathlib import Path
import json,gzip
ROOT=Path(__file__).resolve().parents[1]
code=(ROOT/'tools/import-wiring92.py').read_text(encoding='utf8').split('payload=dict')[0]
code=code.replace("OUT=ROOT.parent/'wiring92'","OUT=ROOT.parent/'wiring98'")
start=code.index('DOCS=');end=code.index('\nDATA=',start)
code=code[:start]+"DOCS=['yamagata']"+code[end:]
code=code.replace('enumerate(DOCS):','enumerate(DOCS,9):')
code=code.replace('enumerate(doc):','enumerate(list(doc)[:5]):')
code=code.replace("if d['color'] is None or max(d['color'])>.15:continue","if d['color'] is None:continue")
code=code.replace("if d['type']=='s' and (d['width'] or 0)>=1.3:","if d['type']=='s' and ((d['width'] or 0)>=1 or d['color'][2]>.3):")
extra='''  # Trace connected heavy platform outlines, including L-shaped terminal faces.
  graph=collections.defaultdict(set)
  for d in drawings:
   if not d['color'] or max(d['color'])>.15 or (d['width']or 0)<1.3:continue
   for item in d['items']:
    pairs=[item[1:]] if item[0]=='l' else []
    if item[0]=='re':
     r=item[1];pairs=[(r.tl,r.tr),(r.tr,r.br),(r.br,r.bl),(r.bl,r.tl)]
    for a,b in pairs:
     u=(round(a.x,1),round(a.y,1));v=(round(b.x,1),round(b.y,1));graph[u].add(v);graph[v].add(u)
  seen=set();outlined=[]
  for seed in graph:
   if seed in seen:continue
   queue=[seed];seen.add(seed);points=[]
   while queue:
    u=queue.pop();points.append(u)
    for v in graph[u]:
     if v not in seen:seen.add(v);queue.append(v)
   x0=min(p[0] for p in points);x1=max(p[0] for p in points);y0=min(p[1] for p in points);y1=max(p[1] for p in points)
   if x1-x0>20 and 3<y1-y0<60 and (x1-x0)/(y1-y0)>1:outlined.append([x0,y0,x1,y1])
  for r in outlined:
   platforms=[p for p in platforms if not(r[0]-.5<=p[0] and r[1]-.5<=p[1] and r[2]+.5>=p[2] and r[3]+.5>=p[3])]
   platforms.append(r)
  (OUT/('platforms-'+str(pi+1)+'.json')).write_text(json.dumps(platforms),encoding='utf8')
'''
code=code.replace('  boundaries=[35]',extra+'  boundaries=[35]')
code=code.replace("name=label['name'],page=", "name=label['name'],sourceCenter=center,page=")
namespace={'__file__':str(ROOT/'tools/import-wiring92.py')}
exec(code,namespace)
records=namespace['DATA']['yamagata']
route=json.loads((ROOT/'dist/assets/final/yamagata-route.json').read_text(encoding='utf8'))
names={s['name'] for s in route['stations']}|{'赤岩'}
records=[r for r in records if r['name'] in names]
for r in records:
    center=r['sourceCenter']
    if r['name']=='米沢':r['platforms'].insert(0,[round(144.47-center,2),131.35,round(247.81-center,2),140.47])
    if r['name']=='新庄':r['platforms']=[[round(a-center,2),b,round(c-center,2),d] for a,b,c,d in [(252.44,205.31,301.91,214.67),(311.75,205.31,360.95,214.67),(252.44,233.39,360.95,242.75)]]
    page=namespace['fitz'].open('C:/Users/bmwhz/OneDrive/Desktop/ダウンロード (9).pdf')[r['page']-1]
    blue=[];samples=[(p[0]+p[2])/2+center for p in r['platforms']];low=min(p[1] for p in r['platforms'])-35;high=max(p[3] for p in r['platforms'])+35
    for drawing in page.get_drawings():
        color=drawing['color']
        if not color or color[0]>.05 or color[2]<.7:continue
        for item in drawing['items']:
            if item[0]!='l':continue
            a,b=item[1:]
            if abs(b.x-a.x)<1 or abs(b.y-a.y)/abs(b.x-a.x)>.3:continue
            for x in samples:
                if min(a.x,b.x)<=x<=max(a.x,b.x):
                    y=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x)
                    if low<=y<=high:blue.append(round(y,2))
    r['standardRails']=sorted(set(blue))
    if r['name']=='新庄':r['rails']=sorted(set(r['rails']+r['standardRails']))
for r in records:r['order']=next((i for i,s in enumerate(route['stations']) if s['name']==r['name']),2.5 if r['name']=='赤岩' else 99)
records.sort(key=lambda r:r['order'])
path=ROOT/'dist/assets/station-wiring92.json.gz'
payload=json.loads(gzip.decompress(path.read_bytes()))
payload['families']['yamagata']=records
payload['version']=98
payload['documents']=[d for d in payload['documents'] if d['family']!='yamagata']+[dict(index=9,file='ダウンロード (9).pdf',family='yamagata',pages=[1,2,3,4,5],sourceDate='2017-08',source='配線略図.net / きたまと')]
payload['notes']+=' Ou diagram uses coloured 1435 mm rail vectors. Continuous double-track running is the user-requested simulator arrangement; it differs from single-track sections in the source.'
path.write_bytes(gzip.compress(json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
(ROOT.parent/'wiring98/extraction-report.json').write_text(json.dumps(namespace['REPORT'],ensure_ascii=False,indent=2),encoding='utf8')
print([(r['name'],len(r['platforms']),len(r['segments']),r['rails']) for r in records])
print('missing',sorted(names-{r['name'] for r in records}))
