from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'dist'
def edit(name,a,b):
 p=D/name;t=p.read_text(encoding='utf8');assert a in t,(name,a[:90]);p.write_text(t.replace(a,b),encoding='utf8')
edit('weather.js',"export const WEATHER={clear:{name:'晴れ',traction:Infinity},rain:{name:'雨',traction:.32},snow:{name:'雪',traction:.20}};", "export const WEATHER={clear:{name:'晴れ',traction:Infinity},rain:{name:'雨',traction:.32,precipitation:'rain'},snow:{name:'雪',traction:.20,precipitation:'snow'},heavySnow:{name:'大雪',traction:.16,precipitation:'snow'},thunderstorm:{name:'雷雨',traction:.27,precipitation:'rain'},typhoon:{name:'台風',traction:.24,precipitation:'rain'},settledSnow:{name:'積雪',traction:.18}};")
edit('weather.js','滑りやすさ：晴れ ＜ 雨 ＜ 雪','大雪・積雪は山間部ほど積もります。台風では臨時40km/h徐行区間を設けます。')
edit('weather.css','.weather-controls>div{display:flex;gap:22px}', '.weather-controls>div{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}')
edit('weather.css','padding:15px 48px;font-size:28px','padding:15px 18px;font-size:28px')
with (D/'arcade-ui.css').open('a',encoding='utf8') as f:f.write('\n/* Keep station plates clear of the three central action buttons. */\n.hud-next{width:420px;min-width:0;max-width:420px;overflow:hidden}.hud-next strong{white-space:nowrap;font-size:var(--station-name-size,64px);letter-spacing:var(--station-name-spacing,8px)}\n.next-station strong.compact-station-name,.compact-station-name{font-size:var(--station-name-size)!important;letter-spacing:0!important;white-space:nowrap}\n')
edit('final-app.js',"function route(){return activeRoute??selectedRoute();}","function route(){const base=activeRoute??selectedRoute();return mode==='drive'&&run?weatherRoute(run,base):base;}")
for name in ['final-app.js','app.js']:
 p=D/name;t=p.read_text(encoding='utf8');t="import {fitStationName} from './station-name-layout.js?v=105';\nimport {weatherRoute,weatherLimits,weatherLimitAt,reportTyphoon} from './weather-operations.js?v=105';\n"+t
 if name=='final-app.js':
  t=t.replace("$('hudNext').textContent=next.name;","fitStationName($('hudNext'),next.name);")
  t=t.replace("for(const change of collectRestrictionReports(run,changesFromSections(r.limits),previous))", "reportTyphoon(run,r,previous,sound);\n for(const change of collectRestrictionReports(run,changesFromSections(r.limits),previous))")
  t=t.replace("snow:'❄'}[type]","snow:'❄',heavySnow:'❄',settledSnow:'❄',thunderstorm:'ϟ',typhoon:'≋'}[type]")
 else:
  t=t.replace("$('nextName').textContent=next.name;","fitStationName($('nextName'),next.name);")
  # The responsive HUD has its own station name. Fit it after its update.
  t=t.replace("const limit=profile.limitAt(run.s),grade=", "fitStationName(document.querySelector('.hud-next strong'),next.name);const limit=profile.limitAt(run.s),grade=")
  t=t.replace("world.weather=weatherType(run.weather);", "world.weather=weatherType(run.weather);")
  t=t.replace("if(paused)score.pause(true);if(legacyReplay)", "applyLegacyWeather();if(paused)score.pause(true);if(legacyReplay)")
  t=t.replace("for(const change of collectRestrictionReports(run,changesFromSteps(profile.limits),voicePrevious))", "reportTyphoon(run,{stations:STATIONS,length:ROUTE_LENGTH},voicePrevious,sound);\n for(const change of collectRestrictionReports(run,changesFromSteps(profile.limits),voicePrevious))")
  t+="\nlet weatherProfile=null,weatherBaseSteps=null,weatherStepsKey=null;\nfunction applyLegacyWeather(){if(!profile)return;if(profile!==weatherProfile){weatherProfile=profile;weatherBaseSteps=profile.limits;weatherStepsKey=null;}const r={stations:STATIONS,length:ROUTE_LENGTH},sections=weatherBaseSteps.map((x,i)=>({sStart:x.s,sEnd:weatherBaseSteps[i+1]?.s??Infinity,kmh:x.kmh})),limits=weatherLimits(run,r,sections),key=run.weather+':'+(run.typhoonSection?.sStart??'');if(key===weatherStepsKey)return;weatherStepsKey=key;profile.limits=limits===sections?weatherBaseSteps:[{s:0,kmh:weatherBaseSteps[0].kmh},...changesFromSections(limits).filter(x=>Number.isFinite(x.s)&&x.s>0).map(x=>({s:x.s,kmh:x.kmh??110}))];}\n"
  t=t.replace('import {mountLookahead,changesFromSteps,','import {mountLookahead,changesFromSections,changesFromSteps,')
 t=t.replace('run.weather=weatherType(settings.weather);run.wheelSlip=false;',"run.weather=weatherType(settings.weather);delete run.typhoonSection;delete run.typhoonAnnounced;run.wheelSlip=false;")
 p.write_text(t,encoding='utf8')
edit('scene-atmosphere.js','type:world.weather,tunnel:inside,daylight:solar.daylight','type:world.weather,tunnel:inside,daylight:solar.daylight,s')
edit('replay-store.js',"'wheelSlide','wheelDeficit'","'wheelSlide','wheelDeficit','typhoonSection','typhoonAnnounced'")
# Compact loops with a small equal-power end/start overlap, no sudden silence at the seam.
source=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/sounds');out=D/'assets/audio/ambient';out.mkdir(exist_ok=True)
records=[]
for filename in ['B01STNNO.wav','B02STNNO.wav','B03STNNO.wav','B04STNNO.wav','rain_se.mp3','snow_se.mp3','hill_se.mp3','city_se.mp3']:
 p=source/filename;probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(p)]));duration=float(probe['format']['duration']);length=min(16,duration)
 target=out/(p.stem+'.ogg');fade=min(.18,length/8)
 # Fade only the seam; the loop itself remains continuously audible.
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(p),'-t',str(length),'-af',f'afade=t=in:d={fade},afade=t=out:st={length-fade}:d={fade}','-ac','1','-ar','24000','-c:a','libopus','-b:a','40k',str(target)],check=True)
 records.append(dict(source=filename,file=target.name,duration=length))
jyoko=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/train/207-2000_ver2/207-2000/3notch/207-2000/navi/sound/jyoko_1.wav')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(jyoko),'-ac','1','-c:a','libopus','-b:a','48k',str(out/'jyoko.ogg')],check=True)
(out/'sources.json').write_text(json.dumps(dict(records=records,slowVoice=str(jyoko),description='User-supplied station/environment recordings; short mono loops'),ensure_ascii=False,indent=2),encoding='utf8')
print('Converted ambient files',sum(p.stat().st_size for p in out.iterdir()))
