"""Extract representative supplied BVE2 Isesaki controls without importing clocks, sounds, or replacing OSM XY."""
from pathlib import Path
import json,re,math,hashlib,bisect,collections
ROOT=Path(__file__).resolve().parents[1];SOURCE=Path('C:/Users/bmwhz/OneDrive/Desktop/isesaki/isesaki');FILE=SOURCE/'Route/東武伊勢崎線/35 快速.csv';OUT=ROOT/'dist/assets/final/tobu118-bve2-profile.json';ORIGIN=100225;BLOCK=25
ALIASES={'業平橋':'とうきょうスカイツリー','松原団地':'獨協大学前〈草加松原〉'}
def num(v,default=0):
 try:return float(v.strip()) if v.strip() else default
 except:return default
def atom(v):
 v=v.strip()
 try:return float(v) if '.' in v else int(v)
 except:return v if v else None
raw=FILE.read_bytes();text=raw.decode('cp932');section='';distance=0;events=[];structures={};counts=collections.Counter();ignored=collections.Counter();stations=[];current=None;seq=0
for lineNumber,line in enumerate(text.splitlines(),1):
 # CSV commas delimit expressions; a semicolon at expression start is a comment. Semicolons inside a command separate arguments.
 for expression in line.split(','):
  c=expression.strip()
  if not c or c.startswith(';'):continue
  if c.lower().startswith('with '):section=c[5:].strip().lower();continue
  if re.fullmatch(r'[-+]?\d+(?:\.\d+)?',c):distance=float(c);continue
  if section=='structure':
   m=re.match(r'\.(\w+)\(([^)]+)\)\s+(.+)$',c)
   if m:structures[m[1].lower()+':'+m[2].replace(' ','')]=m[3].strip()
   continue
  if section!='track':continue
  m=re.match(r'(?:track)?\.(\w+)\s*(.*)',c,re.I)
  if not m:ignored[c[:24]]+=1;continue
  cmd=m[1].lower();args=m[2].split(';');s=distance-ORIGIN;counts[cmd]+=1;seq+=1
  if cmd=='sta':
   name=args[0].strip();name=ALIASES.get(name,name);door=num(args[4]) if len(args)>4 else 0
   current=dict(name=name,sourceName=args[0].strip(),declaredS=s,stopS=None,doorSide={-1:'left',0:'none',1:'right'}.get(door,'both'),pass_=len(args)>1 and args[1].strip().lower()=='p',stops=[])
   current['pass']=current.pop('pass_');stations.append(current)
  elif cmd=='stop':
   stop=dict(s=s,direction=num(args[0]),backwardToleranceM=num(args[1],5) if len(args)>1 else 5,forwardToleranceM=num(args[2],5) if len(args)>2 else 5,cars=int(num(args[3])) if len(args)>3 else 0)
   if current:current['stops'].append(stop);current['stopS']=s if current['stopS'] is None else current['stopS']
  elif cmd in ['pitch','curve','turn','limit','height','ground','rail','railstart','railend','railtype','form','sig','signal','sigf','section','relay','wall','wallend','dike','dikeend']:
   events.append(dict(s=s,command=cmd,args=[atom(v) for v in args],sequence=seq,line=lineNumber))
# BVE preprocesses expressions into increasing associated position; preserve order within each distance.
events.sort(key=lambda x:(x['s'],x['sequence']));grades=[];curves=[];turns=[];limitChanges=[];height=[];ground=[];forms=[];signals=[];active={};last={};railSpans=[];duplicateRailCommands=0
for e in events:
 s=e['s'];a=e['args'];cmd=e['command'];get=lambda i,default=0:a[i] if i<len(a) and isinstance(a[i],(int,float)) else default
 if cmd=='pitch':grades.append(dict(s=s,permille=get(0)))
 elif cmd=='curve':curves.append(dict(s=s,radius=get(0),cantMm=get(1)))
 elif cmd=='turn':turns.append(dict(s=s,ratio=get(0)))
 elif cmd=='limit':limitChanges.append(dict(s=s,kmh=get(0),post=get(1),direction=get(2)))
 elif cmd=='height':height.append(dict(s=s,railAboveGroundM=get(0)))
 elif cmd=='ground':ground.append(dict(s=s,index=get(0)))
 elif cmd=='form':forms.append(dict(sStart=s,sEnd=s+BLOCK,rail1=int(get(0)),rail2=a[1] if len(a)>1 else 0,roofIndex=int(get(2)),formIndex=int(get(3))))
 elif cmd in ['sig','signal','sigf','section','relay']:signals.append(dict(s=s,kind=cmd,args=a))
 elif cmd in ['rail','railstart','railend','railtype']:
  idx=int(get(0));prev=last.get(idx,(0,0,0));x=get(1,prev[0]);y=get(2,prev[1]);typ=int(get(3,prev[2]));span=active.get(idx)
  if cmd=='railtype':
   typ=int(get(1));last[idx]=(prev[0],prev[1],typ)
   if span:span['types'].append([s,typ])
   continue
  if cmd=='railend':
   if span:
    k=span['knots'];p=k[-1]
    if s-BLOCK>p[0]:k.append([s-BLOCK,p[1],p[2]])
    k.append([s,x,y]);span['sEnd']=s;railSpans.append(span);del active[idx]
   last[idx]=(x,y,prev[2]);continue
  if span is None:
   span=dict(railIndex=idx,sStart=s,sEnd=None,knots=[[s,x,y]],types=[[s,typ]]);active[idx]=span
  elif span['knots'][-1][0]==s:duplicateRailCommands+=1;continue
  else:
   k=span['knots'];p=k[-1]
   if s-BLOCK>p[0]:k.append([s-BLOCK,p[1],p[2]])
   k.append([s,x,y])
   if typ!=prev[2]:span['types'].append([s,typ])
  last[idx]=(x,y,typ)
lastDistance=max(e['s'] for e in events)
for span in active.values():span['sEnd']=lastDistance;railSpans.append(span)
# .Height is rail above ground, never rail elevation or a grade.
def integrated(s):
 knots=[dict(s=-ORIGIN,permille=0)]+grades;h=0
 for i,g in enumerate(knots):
  lo=max(0,g['s']);hi=min(s,knots[i+1]['s'] if i+1<len(knots) else s)
  if hi>lo:h+=(hi-lo)*g['permille']/math.sqrt(1000000+g['permille']**2)
 return round(h,5)
for st in stations:
 if st['stopS'] is not None:st['integratedRailHeightM']=integrated(st['stopS'])
 st['forms']=[i for i,f in enumerate(forms) if f['sEnd']>st['declaredS']-100 and f['sStart']<(st['stopS'] if st['stopS'] is not None else st['declaredS'])+50]
limits=[]
for i,c in enumerate(limitChanges):limits.append(dict(sStart=c['s'],sEnd=limitChanges[i+1]['s'] if i+1<len(limitChanges) else lastDistance,kmh=c['kmh'],post=c['post'],direction=c['direction']))
# Source platform object vertex bounds are sufficient for measured surface height/width; no textures are copied.
platformObjects={}
for key,path in structures.items():
 if not key.startswith(('form','roof')):continue
 file=SOURCE/'Object'/path.replace('\\','/');vertices=[]
 if file.exists():
  obj=file.read_text(encoding='cp932');vertices=[[num(v) for v in m.split(',')[:3]] for m in re.findall(r'(?im)^\s*AddVertex\s*,([^\r\n]+)',obj)]
  transforms=bool(re.search(r'(?im)^\s*(?:Translate|Scale|Rotate)',obj))
  if vertices:platformObjects[key]=dict(path=path,bounds=[[min(p[i] for p in vertices),max(p[i] for p in vertices)] for i in range(3)],vertexCount=len(vertices),boundsQuality='raw vertices; transform present' if transforms else 'object vertices in metres')
# Resolve source form edges against rail knots; preserve source block extent and object surface height.
def railxy(index,s):
 if index==0:return (0,0)
 candidates=[r for r in railSpans if r['railIndex']==index and r['sStart']<=s<=r['sEnd']]
 if not candidates:return None
 k=candidates[-1]['knots'];j=max(0,min(len(k)-2,bisect.bisect_right([q[0] for q in k],s)-1)) if len(k)>1 else 0
 if len(k)==1:return tuple(k[0][1:])
 a,b=k[j:j+2];f=(s-a[0])/max(.001,b[0]-a[0]);return (a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f)
for f in forms:
 edges=[];surface=[]
 for s in [f['sStart'],f['sEnd']]:
  a=railxy(f['rail1'],s)
  if a is None:break
  b=railxy(int(f['rail2']),s) if isinstance(f['rail2'],(int,float)) else None
  if f['rail2'] in ['L','R']:
   side='l' if f['rail2']=='L' else 'r';objects=[platformObjects.get('form'+side+':'+str(f['formIndex'])),platformObjects.get('formc'+side+':'+str(f['formIndex']))];objects=[o for o in objects if o]
   if not objects:break
   left=a[0]+min(o['bounds'][0][0] for o in objects);right=a[0]+max(o['bounds'][0][1] for o in objects);top=a[1]+max(o['bounds'][1][1] for o in objects)
  elif b is not None:
   left=min(a[0],b[0])+1.5;right=max(a[0],b[0])-1.5;obj=platformObjects.get('forml:'+str(f['formIndex'])) or platformObjects.get('formr:'+str(f['formIndex']));top=a[1]+(obj['bounds'][1][1] if obj else 1.1)
   if right<=left:break
  else:break
  edges.append([s,round(left,4),round(right,4)]);surface.append([s,round(top,4)])
 if len(edges)==2:f.update(edges=edges,surfaceHeight=surface,boarding=f['rail1']==0 or f['rail2']==0,roofPresent=f['roofIndex']>0)
anchors={}
for rid in ['tobu-skytree','tobu-nikko','tobu-kinugawa','aizu','yagan']:
 route=json.loads((ROOT/f'dist/assets/final/{rid}-route.json').read_text(encoding='utf8'));byname={s['name']:s for s in stations};anchors[rid]=[dict(name=s['name'],bveS=byname[s['name']]['stopS'],routeS=s['s']) for s in route['stations'] if s['name'] in byname and byname[s['name']]['stopS'] is not None]
# Preserve high-value bridge/station object placements as references only; omit every sound and timetable reference.
landmarkObjects={k:v for k,v in structures.items() if k.startswith('freeobj:') and any(w in v.lower() for w in ['bridge','station','fujiwara','form_i'])};landmarks=[]
section='';distance=0
for line in text.splitlines():
 c=line.strip()
 if c.lower().startswith('with '):section=c[5:].strip().lower()
 if section!='track':continue
 if re.fullmatch(r'\d+(?:\.\d+)?',c):distance=float(c)
 m=re.match(r'\.freeobj\s+(.+)',c,re.I)
 if m:
  a=[atom(x) for x in m[1].split(',')[0].split(';')]
  if len(a)>1 and 'freeobj:'+str(a[1]) in landmarkObjects:landmarks.append([distance-ORIGIN,*a[:7]])
result=dict(version=118,source=dict(file='isesaki/Route/東武伊勢崎線/35 快速.csv',encoding='CP932',sha256=hashlib.sha256(raw).hexdigest(),format='BVE2 CSV',scope='浅草→会津田島',historical=True,originAbsoluteM=ORIGIN,firstStopAbsoluteM=ORIGIN,lastStopAbsoluteM=stations[-1]['stopS']+ORIGIN,coveredStopLengthM=stations[-1]['stopS'],geometryCommandEndM=lastDistance,blockLengthM=BLOCK,soundPolicy='No sound files, sound references, train selection, arrival/departure clocks imported'),semantics=dict(reference='https://openbve-project.net/documentation_hugo/en/routes/csv.html',s='metres relative to Asakusa Stop; absolute source distance=s+originAbsoluteM',curve='radius metres: negative left, positive right, 0 straight; cant millimetres, default unsigned',pitch='permille; positive uphill',height='rail height above local ground, not rail elevation',rail='positive X right/Y up relative to player rail; omitted values retain last state; changes interpolate from preceding25m block only',form='one25m block; rail2 L/R means outside edge, numeric means platform between rails; roofIndex/formIndex select source object',limit='kmh=0 means restriction ends; post is sign side, direction is arrow/course, neither chooses rail',clockPolicy='Existing simulator timetable unchanged'),stations=stations,anchorsByRoute=anchors,grades=grades,curves=curves,turns=turns,limits=limits,heightGround=height,ground=ground,railSpans=railSpans,forms=forms,signals=signals,platformObjects=platformObjects,railObjects={k:v for k,v in structures.items() if k.startswith('rail:')},landmarkObjects=landmarkObjects,landmarkPlacements=landmarks,validation=dict(commandCounts=dict(counts),ignoredExpressions=dict(ignored),duplicateRailCommandsIgnored=duplicateRailCommands,unmatchedCurrentStation='東武ワールドスクウェア opened after source era; interpolate controls between neighboring anchors',extraSourceStation='鬼怒立岩信号場',horizontalPolicy='Retain OSM XY; warp source chainage piecewise using stop anchors; no circles used to replace mapped railway'))
OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf8');print(json.dumps(dict(bytes=OUT.stat().st_size,stations=len(stations),anchors={k:len(v) for k,v in anchors.items()},grades=len(grades),curves=len(curves),limits=len(limits),rails=len(railSpans),forms=len(forms),signals=len(signals),heightGround=len(height),platformObjects=len(platformObjects),scope=[stations[0],stations[-1]]),ensure_ascii=False,indent=2))
