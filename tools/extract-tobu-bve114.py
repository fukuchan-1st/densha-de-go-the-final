from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1];p=Path('C:/Users/bmwhz/OneDrive/Desktop/ARATobu-main/ARATobu-main/Scenarios/東武伊勢崎線下り/MapB.txt');t=p.read_text(encoding='utf-8-sig');t=re.sub(r'//[^\n]*','',t);s=0;stations=[];grades=[];limits=[];active=None
for statement in t.split(';'):
 c=statement.strip()
 if re.fullmatch(r'\d+(?:\.\d+)?',c):s=float(c)-100000;continue
 st=re.search(r'Station\[([^]]+)\]\.Put\(([^)]+)\)',c,re.I)
 if st:stations.append(dict(id=st[1],s=s,side=st[2].split(',')[0]))
 g=re.search(r'Gradient\.(BeginConst|End)\(([^)]*)\)',c,re.I)
 if g:grades.append([s,float(g[2] or 0)])
 lim=re.search(r'SpeedLimit\.(Begin|End)\(([^)]*)\)',c,re.I)
 if lim:
  if active is not None and s>active[0]:limits.append(dict(sStart=active[0],sEnd=s,speed=active[1],source='Provided ARATobu MapB.txt'))
  active=(s,float(lim[2])) if lim[1].lower()=='begin' else None
if active and s>active[0]:limits.append(dict(sStart=active[0],sEnd=s,speed=active[1],source='Provided ARATobu MapB.txt'))
doc=dict(source='User-provided ARATobu-main/Scenarios/東武伊勢崎線下り/MapB.txt',stations=stations,grades=grades,limits=limits,notes='s in metres from Kita-Senju Hibiya platform6. BeginTransition gradients simplified to explicit constant anchors; use profile as source metadata, not a surveyed alignment.');(ROOT/'dist/assets/final/tobu-hibiya-bve-profile.json').write_text(json.dumps(doc,ensure_ascii=False,separators=(',',':')),encoding='utf8');print(doc)
