from pathlib import Path
import subprocess,json
D=Path(__file__).resolve().parents[1]/'dist';folder=D/'assets/audio/ambient';source=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/cddata/se');records=[]
for i,(prefix,cut) in enumerate(zip(['uta','utb','utd','ute'],[.49,.58,.60,.65])):
 slow=source/f'kanko{i}/com/{prefix}121.wag';forty=source/f'kanko{i}/com/{prefix}101.wag';out=folder/f'kanko{i}-slow40.ogg'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(slow),'-ss',str(cut),'-i',str(forty),'-filter_complex','[0:a]aresample=24000[a];[1:a]aresample=24000,afade=t=in:d=0.006[b];[a][b]concat=n=2:v=0:a=1[out]','-map','[out]','-ac','1','-c:a','libopus','-b:a','48k',str(out)],check=True)
 records.append(dict(bank=f'kanko{i}',slow=f'{prefix}121.wag',number=f'{prefix}101.wag',numberTrimStart=cut,file=out.name))
# Keep a single quiet advisory cycle, independent of the driver's serialized queue.
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(folder/'jyoko.ogg'),'-t','2.35','-af','volume=0.26,afade=t=out:st=2.24:d=0.11','-c:a','libopus','-b:a','40k',str(folder/'slow-warning.ogg')],check=True)
# Retain the previously published temporary filename as a short compatibility alias.
(folder/'slow40.ogg').write_bytes((folder/'kanko2-slow40.ogg').read_bytes())
p=folder/'sources.json';data=json.loads(p.read_text(encoding='utf8'));data['slow40']={'records':records,'identification':'121=徐行, 122=徐行解除; existing local recognition-block-atc-sequences.jsonl plus four-bank common-number correspondence','numberAlignment':'Local cached Whisper small word timings for 制限 and 40, with cuts in their pause','warning':'jyoko_1 separate 2.35s advisory at reduced gain; never in driver queue'};p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
p=D/'final-audio.js';t=p.read_text(encoding='utf8');old="callSlowRestriction(kmh){const ref={entryIndex:'weather-slow',driverVoiceFile:'./assets/audio/ambient/slow40.ogg'};return this.queueDriverCalls([ref]);}"
new="callSlowRestriction(kmh){const bank=stationVoiceBank(this.driverRouteLine)?.[0]??'kanko1',ref={entryIndex:'weather-slow:'+bank,driverVoiceFile:`./assets/audio/ambient/${bank}-slow40.ogg`},call=this.queueDriverCalls([ref]);if(!this.weatherWarningPlayed){this.weatherWarningPlayed=true;const generation=this.generation;call.then(()=>{if(!this.stopped&&this.generation===generation)this.playRef({entryIndex:'weather-warning',driverVoiceFile:'./assets/audio/ambient/slow-warning.ogg',mixCategory:'se'}).catch(()=>false);});}return call;}"
assert old in t;t=t.replace(old,new);p.write_text(t,encoding='utf8')
p=D/'assets/audio/sound-engine.js';t=p.read_text(encoding='utf8').replace('{stationCueRefs,driverWordRefs}','{stationCueRefs,driverWordRefs,stationVoiceBank}');old="callSlowRestriction(kmh){return this.callVoiceRefs([{entryIndex:'weather-slow',driverVoiceFile:'./assets/audio/ambient/slow40.ogg'}]);}"
new="callSlowRestriction(kmh){const bank=stationVoiceBank('tohoku')?.[0]??'kanko2',call=this.callVoiceRefs([{entryIndex:'weather-slow:'+bank,driverVoiceFile:`./assets/audio/ambient/${bank}-slow40.ogg`}]);if(!this.weatherWarningPlayed){this.weatherWarningPlayed=true;const generation=this.routeCueGeneration;call.then(async()=>{if(generation!==this.routeCueGeneration||!this.ready)return;const buffer=await this.routeCueBuffer(new URL('../../assets/audio/ambient/slow-warning.ogg',import.meta.url).href);if(generation===this.routeCueGeneration)this.playEffectBuffer(buffer,'se');}).catch(()=>{});}return call;}"
assert old in t;t=t.replace(old,new);p.write_text(t,encoding='utf8')
print('Four matching driver voices composed; advisory no longer blocks driver calls')
