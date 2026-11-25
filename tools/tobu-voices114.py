from pathlib import Path
import json,re,shutil
root=Path(__file__).resolve().parents[1];p=root/'dist/station-voice-data.js';s=p.read_text(encoding='utf-8');prefix=s[:s.index('{')];data=json.loads(s[s.index('{'):].strip().rstrip(';'))
src=Path('C:/Users/bmwhz/OneDrive/Desktop/tobu_nikko_voice');dst=root/'dist/assets/final/driver-voice/tobu114';dst.mkdir(exist_ok=True)
names={'鐘ヶふち':'鐘ヶ淵','phoneme_startya0tsu1ka1phoneme_end':'谷塚','phoneme_startga1mou0phoneme_end':'蒲生','phoneme_startshi1n0de0n0phoneme_end':'新田','phoneme_startta0ke1sa0to0phoneme_end':'武里','phoneme_startsa0tte1phoneme_end':'幸手','杉戸phoneme_startta0ka1no1da0i0phoneme_end':'杉戸高野台','しず和':'静和','phoneme_starti0e1na0ka0phoneme_end':'家中','合戦ば':'合戦場','にれ木':'楡木','東武金さき':'東武金崎','もみ山':'樅山','phoneme_starti0ta1ga1phoneme_end':'板荷','phoneme_startki0ta1ka1nu0ma0phoneme_end':'北鹿沼','phoneme_startshi0mo1go1shi0ro0phoneme_end':'下小代','phoneme_startda0i1ya1mu0kou0phoneme_end':'大谷向','phoneme_startko0sa1go1e0phoneme_end':'小佐越','phoneme_startshi1n1ta1ka1to0ku0phoneme_end':'新高徳','phoneme_startna0na1tsu1ga1ta1ke0phoneme_end登山口':'七ヶ岳登山口','会津phoneme_startsa0n1so0n0phoneme_end道場':'会津山村道場','会津phoneme_starta0ra1ka1i1phoneme_end':'会津荒海'}
audit=[]
for i,f in enumerate(sorted(src.glob('*.mp3'))):
 raw=re.sub(r'^山手線運転士-\d{4}-\d\d-\d\d-\d\d-\d\d-','',f.stem);name=names.get(raw,raw);out=f'{i:02d}.mp3';shutil.copy2(f,dst/out);data['yagan']['stations'][name]='tobu114/'+out;audit.append({'station':name,'source':f.name,'file':out})
data['yagan']['stations']['鐘ケ淵']=data['yagan']['stations']['鐘ヶ淵']
p.write_text(prefix+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8');(dst/'source.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print('Imported',len(audit),'station voices')
