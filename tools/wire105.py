from pathlib import Path
D=Path(__file__).resolve().parents[1]/'dist'
for name in ['final-audio.js','assets/audio/sound-engine.js']:
 p=D/name;t=p.read_text(encoding='utf8');prefix='./' if name=='final-audio.js' else '../../'
 t=f"import {{AmbientAudio}} from '{prefix}ambient-audio.js?v=105';\n"+t
 old='updatePassby(world,s,speed,viewMode,paused){';assert old in t
 t=t.replace(old,old+"if(this.context??this.ctx){this.ambient??=new AmbientAudio(this);this.ambient.update(world,s,speed,viewMode,paused);}")
 t=t.replace('stop(){','stop(){this.ambient?.stop();') if name=='final-audio.js' else t.replace('stop() {','stop() {this.ambient?.stop();')
 method="callSlowRestriction(kmh){const ref={entryIndex:'weather-slow',driverVoiceFile:'./assets/audio/ambient/jyoko.ogg'};"
 # Driver buffer paths in the legacy engine are relative to its own module.
 if name=='final-audio.js':method+="return this.queueDriverCalls([ref,...restrictionVoiceRefs(this.driverRouteLine,kmh)]);}\n "
 else:method="callSlowRestriction(kmh){return this.callVoiceRefs([{entryIndex:'weather-slow',driverVoiceFile:'./assets/audio/ambient/jyoko.ogg'},...restrictionVoiceRefs('tohoku',kmh)]);}\n  "
 t=t.replace('callRestriction(kmh){',method+'callRestriction(kmh){');p.write_text(t,encoding='utf8')
p=D/'replay-store.js';t=p.read_text(encoding='utf8').replace("'callRestriction','callRouteCue'","'callRestriction','callSlowRestriction','callRouteCue'");p.write_text(t,encoding='utf8')
# Cache-bust the changed modules and their import graph, keeping a single module identity.
changed={'weather.js','weather-scene.js','weather-operations.js','station-name-layout.js','scene-atmosphere.js','final-audio.js','ambient-audio.js','app.js','final-app.js','replay-store.js','game-shell.js'}
import re
for p in D.rglob('*.js'):
 if 'vendor' in p.parts:continue
 t=p.read_text(encoding='utf8');new=re.sub(r"((?:\./|\.\./)[^'\"\s?]+\.js)(?=[?'\"])(?:\?v=[^'\"\s]+)?",lambda m:m[1]+'?v=105' if m[1].split('/')[-1] in changed else m[0],t)
 if new!=t:p.write_text(new,encoding='utf8')
for p in D.glob('*.html'):
 t=p.read_text(encoding='utf8');new=re.sub(r'((?:final-app|app)\.js|weather\.css|arcade-ui\.css)(?:\?v=[^"\s]+)?',r'\1?v=105',t)
 if new!=t:p.write_text(new,encoding='utf8')
print('Wired audio and weather modules')
