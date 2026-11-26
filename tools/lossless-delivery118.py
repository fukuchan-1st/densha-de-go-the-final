from pathlib import Path
import json,subprocess,hashlib,shutil
root=Path(__file__).resolve().parents[1];base=root/'dist/assets/audio/bve';backup=root.parent/'audio-source118';backup.mkdir(exist_ok=True)
p=base/'config.json';data=json.loads(p.read_text(encoding='utf-8'));saved=0
for key in ['runLong','runBridge','runTunnel']:
 rel=data['files'][key];source=base/rel
 if source.suffix!='.wav':continue
 target=source.with_suffix('.flac');subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(source),'-c:a','flac',str(target)],check=True)
 def pcm_hash(path):return hashlib.sha256(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'])).hexdigest()
 assert pcm_hash(source)==pcm_hash(target),'Lossless PCM mismatch'
 shutil.copy2(source,backup/source.name);saved+=source.stat().st_size-target.stat().st_size;source.unlink();new=target.relative_to(base).as_posix();data['files'][key]=new
 for asset in data['assets']:
  if asset['path']==rel:asset.update(originalPath=rel,originalSha256=asset['sha256'],path=new,sha256=hashlib.sha256(target.read_bytes()).hexdigest())
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print('Lossless savings',saved,'bytes; decoded PCM SHA256 identical')
