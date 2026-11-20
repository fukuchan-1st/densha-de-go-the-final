"""Wire the eighth route and provisional provided 719 exterior into the app."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'dist'
def edit(name,old,new):
 p=D/name;s=p.read_text(encoding='utf8')
 if old not in s: raise ValueError(name+' missing target '+old[:60])
 p.write_text(s.replace(old,new),encoding='utf8')
edit('final-app.js'," {id:'toho',name:"," {id:'yamagata',name:'奥羽本線（山形線）',english:'YAMAGATA LINE',vehicle:'719-5000',color:'#e9a34b',summary:'福島 → 新庄 · 各駅停車',train:'719系5000番台（仮）',short:'719',card:'yamagata-route-button.svg'},\n {id:'toho',name:")
edit('final-app.js','7路線の運転乗務。','8路線の運転乗務。')
edit('final-app.js','<h2>8路線の運転乗務。</h2>','<h2>8路線の運転乗務。</h2><p>奥羽本線（山形線）福島〜新庄：福島〜米沢は提供BVE、米沢〜新庄はOpenStreetMap。719系5000番台は提供0番台の外観と211系の運転台・音・性能を使った仮設定です。</p>')
edit('final-app.js',"function rNote(r){return r.geometrySections?", "function rNote(r){if(r.id==='yamagata')return '福島〜米沢：提供BVE / 米沢〜新庄：OSM。719系5000番台は仮モデル・仮運転台です。';return r.geometrySections?")
edit('service-catalog.js'," tohoku:[item('tohoku','701','普通')],", " yamagata:[item('yamagata','719-5000','普通','福島','新庄',{startTime:'08:07:30'}),...([['福島','米沢'],['米沢','山形'],['山形','新庄']].map(([from,to])=>item('yamagata','719-5000','普通',from,to,{startTime:'10:00:00'})))],\n tohoku:[item('tohoku','701','普通')],")
edit('opposing-models.js',"if(id==='yamanote')return", "if(id==='yamagata')return ['719-5000'];if(id==='yamanote')return")
edit('final-world.js',"this.rural=['toho'", "this.rural=['yamagata','toho'")
edit('final-world.js',"for(const dx of[-.5335,.5335])", "for(const dx of[-(this.route.gaugeM??1.067)/2,(this.route.gaugeM??1.067)/2])")
edit('final-world.js',"y:level(s)+.06,w:2.05", "y:level(s)+.06,w:this.route.gaugeM===1.435?2.4:2.05")
edit('scenery-profile.js',"p.id===(aliases[route.id]??route.id));", "p.id===(aliases[route.id]??route.id))??(route.sceneryProfile?{rows:route.sceneryProfile}:null);")
edit('geographic-sections.js',"export function valleyWidth(route,s){", "export function valleyWidth(route,s){if(route.id==='yamagata'){const st=route.sceneryStations??route.stations,at=n=>st.find(x=>x.name===n)?.s,a=at('庭坂'),b=at('関根');return a!=null&&b!=null&&s>Math.min(a,b)&&s<Math.max(a,b)?45:1200;}")
edit('basin-profile.js',"['kofu',BASIN_PROFILE", "['yonezawa','関根 米沢 置賜 高畠 赤湯'.split(' '),'米沢',.65],\n  ['yamagata','かみのやま温泉 茂吉記念館前 蔵王 山形 北山形 羽前千歳 南出羽 漆山 高擶 天童南 天童 乱川 神町 さくらんぼ東根 東根 村山'.split(' '),'天童',.7],\n  ['kofu',BASIN_PROFILE")
edit('vehicle-photos.js',"export function vehiclePhoto(vehicle,line){return", "export function vehiclePhoto(vehicle,line){if(vehicle==='719-5000')return './assets/final/yamagata-route-button.svg';return")
edit('photo-menu.js',"export const MENU_PHOTOS={", "export const MENU_PHOTOS={yamagata:{file:'../final/yamagata-route-button.svg',flip:false},")
for name in ['final-vehicle.js','opposing-models.js']:
 p=D/name;s=p.read_text(encoding='utf8');s=re.sub(r'(vehicle-recipes\.json|vehicles/manifest\.json|opposing/manifest\.json)\?v=\d+',r'\1?v=97',s);p.write_text(s,encoding='utf8')
changed=['final-app','final-world','service-catalog','opposing-models','final-vehicle','scenery-profile','geographic-sections','basin-profile','vehicle-photos','photo-menu']
for p in [*D.glob('*.js'),D/'index.html']:
 s=p.read_text(encoding='utf8');before=s
 for name in changed:s=re.sub(r'('+re.escape(name)+r'\.js)\?v=[\w.-]+',r'\1?v=97',s)
 if before!=s:p.write_text(s,encoding='utf8')
p=ROOT/'tests/service-fixture.mjs';s=p.read_text(encoding='utf8');p.write_text(s.replace("const ids=['yamanote'","const ids=['yamagata','yamanote'"),encoding='utf8')
(D/'assets/final/yamagata-route-button.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#649bc0"/><stop offset="1" stop-color="#d9e7d1"/></linearGradient><linearGradient id="b" x2="0" y2="1"><stop stop-color="#eceeed"/><stop offset="1" stop-color="#89928c"/></linearGradient></defs><path fill="url(#s)" d="M0 0h960v540H0z"/><path fill="#546956" d="M0 290 140 105 290 270 440 130 590 280 780 110 960 300v240H0z"/><path fill="#90a778" d="M0 350q240-70 480 0t480 0v190H0z"/><path stroke="#686f64" stroke-width="14" d="M50 540 900 360M250 540 960 390"/><path fill="url(#b)" stroke="#55625c" stroke-width="4" d="M160 285h610l65 48v115H160z"/><path fill="#2a5249" d="M178 309h530v55H178zM739 309h29l46 35v28h-75z"/><path fill="#267455" d="M160 392h675v17H160z"/><path fill="#dd8d51" d="M160 386h675v5H160z"/><path fill="#aeb7af" stroke="#5d6963" stroke-width="3" d="M215 305h35v138h-35zM458 305h35v138h-35zM687 305h35v138h-35z"/><path fill="#253b33" d="M222 314h21v45h-21zM465 314h21v45h-21zM694 314h21v45h-21z"/><g fill="#343e38"><circle cx="251" cy="453" r="21"/><circle cx="319" cy="453" r="21"/><circle cx="649" cy="453" r="21"/><circle cx="717" cy="453" r="21"/></g><path fill="#52665d" d="M355 268h115v17H355zM560 268h115v17H560z"/><text x="45" y="65" font-family="sans-serif" font-size="38" fill="white">奥羽本線（山形線）</text><text x="48" y="108" font-family="sans-serif" font-size="24" fill="white">福島 − 米沢 − 山形 − 新庄</text><text x="48" y="513" font-family="sans-serif" font-size="22" fill="#fff">719系5000番台（仮モデル）</text></svg>''',encoding='utf8')
print('Yamagata UI and standard gauge connected')
