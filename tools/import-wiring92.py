import pymupdf as fitz,json,gzip,re,math,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent/'wiring92';OUT.mkdir(exist_ok=True)
DOCS=['chuo','shinetsu','shinonoi','oito','yamanote','osaka','tokaido','tohoku','yagan']
DATA={};REPORT=[]
def norm(s):return s.strip().strip('（）() ').replace('御茶ノ水','御茶ノ水').replace('市ケ谷','市ヶ谷').replace('四ツ谷','四ツ谷')
for number,family in enumerate(DOCS):
 path=Path('C:/Users/bmwhz/OneDrive/Desktop')/('ダウンロード'+(' ('+str(number)+')' if number else '')+'.pdf');doc=fitz.open(path);records=[]
 for pi,page in enumerate(doc):
  page.get_pixmap(matrix=fitz.Matrix(.8,.8)).save(OUT/(str(number)+'-'+str(pi)+'.png'))
  labels=[]
  for b in page.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    for s in l['spans']:
     text=norm(s['text']);r=fitz.Rect(s['bbox'])
     if 14<=s['size']<18 and 60<r.y0<500 and re.search('[一-龯ぁ-んァ-ヶ]',text) and not any(x in text for x in ['線','方面','車両','配線','調査','現在','地点','電鉄','駅','所','支区','番','信号']):labels.append(dict(name=text,x=(r.x0+r.x1)/2,y=r.y0))
  # Large station labels are independent of the smaller reference annotations.
  groups=[]
  for label in sorted(labels,key=lambda x:(x['y'],x['x'])):
   group=next((g for g in groups if abs(g[0]['y']-label['y'])<7),None)
   if group is None:groups.append([label])
   else:group.append(label)
  drawings=page.get_drawings();platforms=[];segments=[]
  for d in drawings:
   if d['color'] is None or max(d['color'])>.15:continue
   r=d['rect']
   if d['type'] in ['fs','s'] and len(d['items'])==1 and d['items'][0][0]=='re' and 3<r.height<18 and r.width>15 and r.width/r.height>2.5:
    platforms.append([r.x0,r.y0,r.x1,r.y1])
   if d['type']=='s' and (d['width'] or 0)>=1.3:
    for item in d['items']:
     if item[0]=='l':
      a,b=item[1:];
      if math.hypot(a.x-b.x,a.y-b.y)>.5:segments.append([a.x,a.y,b.x,b.y])
     elif item[0]=='c':
      pts=item[1:];last=pts[0]
      for i in range(1,9):
       t=i/8;u=1-t;q=fitz.Point(*[u**3*pts[0][c]+3*u*u*t*pts[1][c]+3*u*t*t*pts[2][c]+t**3*pts[3][c] for c in [0,1]]);segments.append([last.x,last.y,q.x,q.y]);last=q
  # Side platforms are three outlined edges plus a bold boarding edge.
  strokes=[];cuts=collections.Counter()
  for d in drawings:
   r=d['rect']
   if d['fill'] and max(d['fill'])<.15 and .3<r.height<1.6 and 5<r.width<12:cuts[round(r.y0,1)]+=1
   if d['type']=='s' and d['color'] and max(d['color'])<.15 and (d['width']or 0)>=1.3:
    for it in d['items']:
     if it[0]=='l':strokes.append([it[1].x,it[1].y,it[2].x,it[2].y])
   if d['type']=='fs' and d['color'] and max(d['color'])<.15 and d['fill'] and min(d['fill'])>.9 and 3<r.width<18 and r.height>15 and r.height/r.width>2.5:platforms.append(list(r))
  for rotate in [False,True]:
   transform=lambda s:[s[1],s[0],s[3],s[2]] if rotate else s
   lines=[transform(v) for v in strokes];vertical=[v for v in lines if abs(v[0]-v[2])<.2 and 3<abs(v[1]-v[3])<18]
   for i,u in enumerate(vertical):
    for v in vertical[i+1:]:
     x,y=sorted([u[0],v[0]]);a,b=sorted([u[1],u[3]])
     if not 15<y-x<180 or abs(min(v[1],v[3])-a)>.3 or abs(max(v[1],v[3])-b)>.3:continue
     if not any(abs(t[1]-t[3])<.2 and (abs(t[1]-a)<.3 or abs(t[1]-b)<.3) and abs(min(t[0],t[2])-x)<.3 and abs(max(t[0],t[2])-y)<.3 for t in lines):continue
     r=[a,x,b,y] if rotate else [x,a,y,b]
     if not any(sum(abs(c-d) for c,d in zip(r,p))<2 for p in platforms):platforms.append(r)
  # Some side platforms have staggered ends rather than rectangular corners.
  horizontal=[v for v in strokes if abs(v[1]-v[3])<.2 and abs(v[0]-v[2])>20]
  vertical=[v for v in strokes if abs(v[0]-v[2])<.2 and 3<abs(v[1]-v[3])<16]
  for i,u in enumerate(horizontal):
   for v in horizontal[i+1:]:
    y,z=sorted([u[1],v[1]]);a=max(min(u[0],u[2]),min(v[0],v[2]));b=min(max(u[0],u[2]),max(v[0],v[2]));
    if not 3<z-y<16 or not 20<b-a<180:continue
    if not any(abs(min(t[1],t[3])-y)<.3 and abs(max(t[1],t[3])-z)<.3 and any(abs(t[0]-end)<.5 for end in [u[0],u[2],v[0],v[2]]) for t in vertical):continue
    r=[min(u[0],u[2],v[0],v[2]),y,max(u[0],u[2],v[0],v[2]),z]
    if not any(abs((r[0]+r[2]-p[0]-p[2])/2)<10 and abs(r[1]-p[1])<1 and abs(r[3]-p[3])<1 for p in platforms):platforms.append(r)
  boundaries=[35]+sorted(y for y,n in cuts.items() if n>12)+[520]
  for lower,upper in zip(boundaries,boundaries[1:]):
   names=[l for l in labels if lower<l['y']<upper];boxes=[r for r in platforms if lower<min(r[1],r[3])<upper];assign=collections.defaultdict(list)
   for box in boxes:
    x,y=(box[0]+box[2])/2,(box[1]+box[3])/2;vertical=box[3]-box[1]>box[2]-box[0]
    options=[n for n in names if (abs(n['x']-x)<160 and abs(n['y']-y)<90 if vertical else abs(n['x']-x)<max(55,(box[2]-box[0])*.7) and abs(n['y']-y)<450)]
    if not options:continue
    owner=min(options,key=lambda n:((n['x']-x)/(100 if vertical else 25))**2+((n['y']-y)/(35 if vertical else 80))**2);assign[owner['name']].append(box)
   for label in names:
    box=assign[label['name']]
    if not box:continue
    vertical=sum(r[3]-r[1]>r[2]-r[0] for r in box)>len(box)/2
    if vertical:box=[r for r in box if r[3]-r[1]>r[2]-r[0]]
    axis=lambda x,y:(y,-x) if vertical else (x,y)
    transformed=[[axis(r[0],r[1])[0],min(axis(r[0],r[1])[1],axis(r[2],r[3])[1]),axis(r[2],r[3])[0],max(axis(r[0],r[1])[1],axis(r[2],r[3])[1])] for r in box]
    center=sum((r[0]+r[2])/2 for r in transformed)/len(transformed)
    others=sorted(n['x'] for n in names);idx=others.index(label['x']);lo=(others[idx-1]+label['x'])/2 if idx else 45;hi=(others[idx+1]+label['x'])/2 if idx<len(others)-1 else 780
    if vertical:lo,hi=lower,upper
    used=[]
    for a,y,b,z in segments:
     if not(lower<min(y,z) and max(y,z)<upper):continue
     # Strip platform outlines; they are not running rails.
     if any((abs(y-z)<.3 and (abs(y-r[1])<.5 or abs(y-r[3])<.5) and min(a,b)>=r[0]-.5 and max(a,b)<=r[2]+.5) for r in platforms):continue
     a,y=axis(a,y);b,z=axis(b,z)
     if a>b:a,b,y,z=b,a,z,y
     if b-a<.5:continue
     aa=max(a,lo);bb=min(b,hi)
     if bb-aa<.3:continue
     used.append([round(aa-center,2),round(y+(z-y)*(aa-a)/(b-a),2),round(bb-center,2),round(y+(z-y)*(bb-a)/(b-a),2)])
    plats=[[round(a-center,2),round(y,2),round(b-center,2),round(z,2)] for a,y,b,z in transformed]
    cross=sorted({round(y+(z-y)*(-a)/(b-a),1) for a,y,b,z in used if a<=0<=b and b-a>.5})
    intervals=[b-a for a,b in zip(cross,cross[1:]) if 5<b-a<14];pitch=sorted(intervals)[len(intervals)//2] if intervals else 9.12
    records.append(dict(name=label['name'],page=pi+1,document=number,segments=used,platforms=plats,pitch=round(pitch,2),rails=cross,column=[round(lo-center,2),round(hi-center,2)],order=len(records),vertical=vertical))
  REPORT.append(dict(document=number,page=pi+1,labels=[l['name'] for l in labels],platforms=len(platforms),trackSegments=len(segments)))
 DATA[family]=records
payload=dict(version=92,source='User-supplied wiring diagrams, haisenryakuzu.net',documents=[dict(index=i,file='ダウンロード'+(' ('+str(i)+')' if i else '')+'.pdf',family=f) for i,f in enumerate(DOCS)],families=DATA,notes='Topology traced from PDF vectors; transverse spacing and longitudinal distances are reconstructed, not a survey. Platform lengths come from the existing route data.')
with gzip.GzipFile(filename=str(ROOT/'dist/assets/station-wiring92.json.gz'),mode='wb',mtime=0) as f:f.write(json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode())
(OUT/'extraction-report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf8');(OUT/'station-wiring92.json').write_text(json.dumps(payload,ensure_ascii=False),encoding='utf8')
print(json.dumps({k:len(v) for k,v in DATA.items()}));print('compressedBytes',(ROOT/'dist/assets/station-wiring92.json.gz').stat().st_size)
