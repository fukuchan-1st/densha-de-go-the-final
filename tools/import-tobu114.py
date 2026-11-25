"""Build isolated Tobu vehicle recipe/manifest patches; never modify shared catalogs."""
import importlib.util
import json
import shutil
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path('C:/Users/bmwhz/OneDrive/Desktop')
TRAIN = DESKTOP / '整理/folder/dengo_thef/train'
ASSETS = ROOT / 'dist/assets/final'
spec = importlib.util.spec_from_file_location('added', ROOT/'tools/import-added-trains.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
original_read = m.read_config
def read_config(path):
    sections = [('root',{})]
    for line in m.helpers.read_text(path).splitlines():
        line=line.split(';',1)[0].strip()
        if line.startswith('[') and ']' in line:
            sections.append((line[1:line.index(']')].strip().lower(),{}))
        elif line and '=' in line and not line.startswith('#'):
            key,value=line.split('=',1);sections[-1][1][key.strip().lower()]=value.strip()
    for section, values in sections:
        if section == 'dynamics' and 'trailerweight' in values:
            values.setdefault('trailercarweight', values['trailerweight'])
    return sections
m.read_config = read_config

class CompactBundle(m.Bundle):
    def add(self, path, color=None, loop=False):
        ref = super().add(path, color, loop)
        if not ref: return ref
        entry = self.entries[str(ref['entryIndex'])]
        dest = self.target / entry['file']
        if dest.suffix.lower() == '.wav':
            # Decode to original-length buffers in WebAudio: keep independent source
            # samples and all BVE pitch/volume tables, never concatenate motor stages.
            new = dest.with_suffix('.ogg')
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(dest),'-c:a','libvorbis','-q:a','5',str(new)],check=True)
            dest.unlink(); entry['file'] = new.name
        elif dest.suffix == '.webp' and dest.stat().st_size > 60000:
            Image.open(dest).save(dest,'WEBP',quality=92,method=5,exact=True)
        return ref
m.Bundle = CompactBundle

def simple_recipe(id,name,specs):
    return dict(id=id,name=name,sourceSpecs=specs.copy(),playableSpecs=specs.copy(),
        notchLabels=['EB',*[f'B{i}' for i in range(specs['brakeNotches'],0,-1)],'N',*[f'P{i}' for i in range(1,specs['powerNotches']+1)]],
        subjectMappings={'common':m.COMMON,'vehicle':{}},sounds={},motorNoise={},performance={},notes=[])

def spec_for(cars,length,mass,accel,maxspeed,p=4,b=7):
    return dict(carCount=cars,carLengthM=length,massKg=mass,powerNotches=p,brakeNotches=b,holdingNotches=0,
        maxSpeedKmh=maxspeed,startingAccelerationKmhPerSecondApprox=accel,
        startingAccelerationMethod='東武鉄道 corporate book_02.pdf equipment specifications; browser force curve approximation',
        doorCloseSeconds=4,brakeSystem={'kind':'ECB','maxServiceKpa':350,'reservoirLowerKpa':640,'reservoirUpperKpa':780})

def image_ref(bundle,path):
    # Bundle takes paths relative to a single source root.
    return bundle.add(path)

def main():
    recipes=[]; manifests={}
    base=TRAIN/'TOBU10000_221220/Scenarios/A7'
    configs=[(base,{'id':'10030','name':'東武10030型','root':'.','vehicle':'TOBU10000/Vehicle/TI11655F-6.txt','maxSpeed':110,'mapping':{'ats10':'always'}}),
       (DESKTOP/'ARATobu-main/ARATobu-main/Scenarios/東武70000系',{'id':'70000','name':'東武70000系','root':'.','vehicle':'Vehicle.txt','maxSpeed':110,'mapping':{}})]
    for base,config in configs:
        recipe,entries=m.import_one(base,config)
        recipe['missingReferences']=[item for item in recipe.get('missingReferences',[]) if item['reference']]
        if recipe['id']=='10030':
            recipe['name']='東武10030型';recipe['sourceVehicle']='TI11655F-6.txt (10030-S.txt cab/audio)'
            recipe['playableSpecs'].update(spec_for(6,20,220500,2.5,110,p=3))
            for element in recipe['panel']['elements']:
                if element['subject']=='ats10':element.update(type='background',subject='true')
            recipe['notes'].append('10030-S.txtの実音と運転台。6両編成。音源側の車号写真は10050番台。先頭T車の収録音のため独立したモーター段音は含まれない。')
        else:
            recipe['playableSpecs']['startingAccelerationKmhPerSecondApprox']=3.3
        recipe.update(serviceBrakeKmhPerSecond=3.9 if config['id']=='10030' else 3.7,emergencyBrakeKmhPerSecond=4.5)
        recipes.append(recipe);manifests[recipe['id']]=entries

    bundle=CompactBundle(TRAIN,{'root':'.','id':'20400','mapping':{}})
    recipe=simple_recipe('20400','東武20400型',spec_for(4,18,130000,2.23,110))
    recipe.update(sourceArchive='dengo_thef/train/tob20400 + tob9050',sourceVehicle='20400 panel and door files / 9050 sound.cfg and MotorNoise tables',serviceBrakeKmhPerSecond=3.7,emergencyBrakeKmhPerSecond=4.5)
    bundle.width=3000
    panelroot=TRAIN/'tob20400'
    day=bundle.add(panelroot/'panel.png');night=bundle.add(panelroot/'panel_n.png')
    recipe['panel']={'this':{'origin':[1500,760]},'crop':{'x':0,'y':360.5,'width':3000,'height':1687.5},'elements':[
        {'type':'background','subject':'true','location':[0,0],'layer':0,'image':day,'nightImage':night}]}
    recipe['sounds']=m.audio_for(bundle,TRAIN/'tob9050/sound.cfg')
    # Whitespace in original BVE section keys is legal; engine uses compact keys.
    recipe['sounds']={k:{key.replace(' ',''):v for key,v in values.items()} for k,values in recipe['sounds'].items()}
    recipe['sounds']['door']={k:bundle.add(panelroot/name) for k,name in [('openleft','20400_dooropn.ogg'),('openright','20400_dooropn.ogg'),('closeleft','20400_doorcls.ogg'),('closeright','20400_doorcls.ogg')]}
    motorpath=TRAIN/'tob9050/motornoise/MotorNoise.txt'
    for phase,values in read_config(motorpath):
        if phase in ('power','brake'):
            recipe['motorNoise'][phase]={k:m.read_table(bundle.resolve(motorpath,v),bundle.source) for k,v in values.items()}
    # Reuse an authored, separate gauge needle; this overlay is a browser approximation.
    needle_source=ROOT/'../tobu500-cab/tobu500-speed-needle.png'
    needle_copy=panelroot/'_codex_speed_needle.png'
    # Never write into the user's source folder: add through an isolated bundle root.
    temp=ROOT/'local-vehicles/tobu114-generated';temp.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(needle_source,temp/'needle.png')
    with Image.open(temp/'needle.png') as im:
        im.save(bundle.target/'speed-needle.webp',lossless=True)
    ni=max(map(int,bundle.entries))+1
    bundle.entries[str(ni)]={'file':'speed-needle.webp','width':256,'height':256}
    nr={'entryIndex':ni,'entryName':'generated gauge needle','width':256,'height':256}
    recipe['panel']['elements'].append({'type':'needle','subject':'kmph','location':[984,1762],'layer':3,'image':nr,'origin':[128,128],'radius':90,'minimum':0,'maximum':120,'initialangle':0,'lastangle':240})
    recipe['notes']=['運転台・ドア音は指定train/tob20400フォルダーの実素材。','モーター・走行音と速度別周波数／音量表は指定tob9050から。音源は同一車両の録音ではない。','実車20400型の加速度2.23km/h/s、18m×4両。質量130tは形式別範囲内の近似。P4/B7はブラウザー操作設定。計器針とパネル視点は近似。']
    recipes.append(recipe);manifests['20400']=bundle.entries

    source=DESKTOP/'ST_tobu500_RTM ver0.0'
    bundle=CompactBundle(source,{'root':'.','id':'500','mapping':{}})
    recipe=simple_recipe('500','東武500系 リバティ',spec_for(3,20,116000,2.23,130))
    recipe['notchLabels'].insert(recipe['notchLabels'].index('N'),'抑速')
    recipe['playableSpecs']['holdingNotches']=1
    recipe.update(sourceArchive=source.name,sourceVehicle='ModelTrain_tobu500-1.json / shi-tobu500.js',serviceBrakeKmhPerSecond=3.7,emergencyBrakeKmhPerSecond=5.3)
    cab=ROOT/'../tobu500-cab'
    entries=bundle.entries
    for index,name in enumerate(['tobu500-console.png','tobu500-speed-needle.png']):
        im=Image.open(cab/name);filename=f'cab-{index}.webp';im.save(bundle.target/filename,'WEBP',quality=94,method=5,exact=True)
        entries[str(index)]={'file':filename,'width':im.width,'height':im.height}
    # Reserve indexes so Bundle.add cannot collide with generated cab entries.
    bundle.refs={('cab0',None):{'entryIndex':0},('cab1',None):{'entryIndex':1}}
    recipe['panel']={'this':{'origin':[830,-75]},'crop':{'x':180,'y':-280,'width':1300,'height':731.25},'elements':[
       {'type':'background','subject':'true','location':[0,0],'layer':0,'image':{'entryIndex':0,'entryName':'generated console'}},
       {'type':'needle','subject':'kmph','location':[669,299],'layer':3,'image':{'entryIndex':1,'entryName':'separate speed needle'},'origin':[128,128],'radius':76.5,'minimum':0,'maximum':140,'initialangle':0,'lastangle':240}]}
    audio=source/'assets/sound_tobu500/sounds/train'
    recipe['sounds']={'motor':{str(i):bundle.add(audio/f'tobu500-p{i+1}.ogg',loop=True) for i in range(4)},
       'others':{'noise':bundle.add(audio/'tobu500-0.ogg',loop=True)},'door':{'openleft':bundle.add(audio/'tobu500-door.ogg'),'closeleft':bundle.add(audio/'tobu500-door.ogg')},'horn':{'primary':bundle.add(audio/'tobu500-h.ogg')},'brake':{'bcrelease':bundle.add(audio/'tobu500-b.ogg')}}
    # Adapt original RTM segment boundaries/pitch expressions into BVE table units.
    speeds=sorted(set([0,.1,.1001,14.8,14.8001,15,15.0001,25,30,30.0001,129.9999,130]))
    volumes=[];freq=[]
    for v in speeds:
        vols=[1 if .1<v<15 else 0,1.5 if 14.8<v<30 else 0,((v-25)*.9/5+.3) if 15<v<30 else 0,1 if 30<v<130 else 0]
        pitches=[1,1,.3+(v-15)*.9/15,.9+(v-30)*1.1/100]
        volumes.append([v,*[max(0,x) for x in vols]]);freq.append([v,*pitches])
    table=lambda rows:{'source':'assets/minecraft/scripts/shi-tobu500.js','labels':['0','1','2','3'],'rows':rows}
    recipe['motorNoise']={phase:{'volume':table(volumes),'frequency':table(freq)} for phase in ['power','brake']}
    recipe['notes']=['運転台は別途制作済みの透過画像。速度針は独立素材として実速度に連動。','RTM提供音源を使用。元スクリプトの15/30/130km/h切替、各段音量とピッチ式を保持。元のP4惰行時停止漏れのみ解消。','元RTMのp3音量式は低速度で負値になるため0に制限。電気／空気制動・ATSや表示器はブラウザー近似。']
    recipes.append(recipe);manifests['500']=entries
    patch={'trains':recipes,'manifestTrains':manifests,'sources':['https://www.tobu.co.jp/pdf/corporation/book_02.pdf','https://ja.wikipedia.org/wiki/東武20000系電車#20400型']}
    output=ASSETS/'tobu114';output.mkdir(parents=True,exist_ok=True)
    (output/'vehicle-patch.json').write_text(json.dumps(patch,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    for recipe in recipes:
        size=sum((ASSETS/'vehicles'/recipe['id']/e['file']).stat().st_size for e in manifests[recipe['id']].values())
        print(recipe['id'],len(manifests[recipe['id']]),round(size/1024**2,2),'MiB',recipe.get('missingReferences',[]),flush=True)

if __name__=='__main__': main()
