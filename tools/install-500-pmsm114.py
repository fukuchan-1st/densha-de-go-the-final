"""Replace only the 500 traction bank; preserve externally adjusted cab/effects."""
from pathlib import Path
import copy,hashlib,json,subprocess,wave,importlib.util,shutil

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/sounds/pmsm')
PATCH=ROOT/'dist/assets/final/tobu114/vehicle-patch.json'
TARGET=ROOT/'dist/assets/final/vehicles/500'
spec=importlib.util.spec_from_file_location('bve_helpers',ROOT/'tools/import-tobu6050.py')
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)

def main():
    patch=json.loads(PATCH.read_text(encoding='utf-8'))
    train=next(r for r in patch['trains'] if r['id']=='500')
    before=copy.deepcopy(train)
    manifest=patch['manifestTrains']['500']
    next_index=max(map(int,manifest))+1
    sounds={};provenance=[]
    names=[('AnSync',f'AS{i}') for i in range(6)]+[('Sync',f'S{i}') for i in range(14)]
    motor_config=SOURCE/'6_15/MotorNoise.txt'
    assert motor_config.exists(),'The user-supplied 6_15 configuration is required.'
    for channel,(folder,name) in enumerate(names):
        original=SOURCE/folder/(name+'.wav')
        destination=TARGET/f'pmsm-{name}.ogg'
        if not destination.exists():subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(original),'-c:a','libvorbis','-q:a','7',str(destination)],check=True)
        key=next((k for k,v in manifest.items() if v['file']==destination.name),None)
        if key is None:key=str(next_index);next_index+=1
        manifest[key]={'file':destination.name}
        sounds[str(channel)]={'entryIndex':int(key),'entryName':f'sounds/pmsm/{folder}/{name}.wav','size':original.stat().st_size}
        with wave.open(str(original)) as wav:
            frames=wav.getnframes();rate=wav.getframerate();channels=wav.getnchannels()
        # Verify decoded duration; Vorbis may retain one small terminal block.
        decoded=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(destination),'-f','s16le','-'],capture_output=True,check=True).stdout
        assert abs(len(decoded)//(2*channels)-frames)<=128,(name,frames,len(decoded)//(2*channels))
        provenance.append({'channel':channel,'source':f'{folder}/{name}.wav','sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'sampleRate':rate,'channels':channels,'sourceFrames':frames,'decodedFrames':len(decoded)//(2*channels),'pitchMode':'Exact sparse phase frequency table from 6_15; original fixed sections preserved'})
    train['sounds']['motor']=sounds
    train['motorNoise']={};configs=[]
    retain=ROOT/'dist/assets/final/tobu114/pmsm-6_15';retain.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(motor_config,retain/'MotorNoise.txt')
    for phase,values in helpers.read_config(motor_config):
        if phase not in ('power','brake'):continue
        train['motorNoise'][phase]={}
        for kind,relative in values.items():
            original=motor_config.parent/relative.replace('\\','/')
            train['motorNoise'][phase][kind]=helpers.read_table(original,SOURCE)
            target=retain/phase/Path(relative.replace('\\','/')).name;target.parent.mkdir(exist_ok=True);shutil.copyfile(original,target)
            configs.append({'phase':phase,'table':kind,'source':original.relative_to(SOURCE).as_posix(),'sha256':hashlib.sha256(original.read_bytes()).hexdigest()})
    train['motorSource']={'folder':'dengo_thef/sounds/pmsm','sampleCount':20,'sourceConfigurationFound':True,'sourceConfiguration':'6_15/MotorNoise.txt','mapping':'Slots 0-5 = AnSync/AS0-AS5; slots 6-19 = Sync/S0-S13. Exact unresampled power/brake CSV rows and sparse values retained. Power has 19 channels, brake has 20; slot 19 is brake-only.','encoding':'Vorbis quality 7; decoded source frame counts checked within 128 samples (2.67ms at 48kHz)','tables':configs,'samples':provenance}
    train['notes']=[n for n in train.get('notes',[]) if 'RTM提供音源' not in n and '元RTMのp3' not in n and '500系モーター音は指定sounds/pmsm' not in n]
    train['notes'].append('500系モーター音は指定sounds/pmsmのAS0～AS5・S0～S13を使用。6_15/MotorNoise.txtが指定する力行・制動の周波数／音量CSVをそのまま使用し、固定周波数区間・速度ごとの切替・疎な補間点を保持。ドア・警笛等は提供RTM音源を継続。')
    for key,value in before.items():
        if key not in ('sounds','motorNoise','notes','motorSource'):assert train[key]==value,key
    assert {k:v for k,v in train['sounds'].items() if k!='motor'}=={k:v for k,v in before['sounds'].items() if k!='motor'}
    temp=PATCH.with_suffix('.pmsm-part');temp.write_text(json.dumps(patch,ensure_ascii=False,separators=(',',':')),encoding='utf-8');temp.replace(PATCH)
    report=ROOT/'dist/assets/final/tobu114/500-pmsm-source.json'
    report.write_text(json.dumps(train['motorSource'],ensure_ascii=False,indent=2),encoding='utf-8')
    print('500 panel preserved:',train['panel']['crop'],train['panel']['this']['origin'])
    print('PMSM clips:',len(sounds),'bytes:',sum((TARGET/f'pmsm-{name}.ogg').stat().st_size for _,name in names))

if __name__=='__main__':main()
