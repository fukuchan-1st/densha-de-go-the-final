"""Lossless storage conversion: PNG→WebP and PCM WAV→FLAC, checked after decode."""
from pathlib import Path
from PIL import Image
import json,gzip,subprocess,hashlib,io,wave
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'dist/assets/final/vehicles';p=folder/'manifest.json';data=json.loads(p.read_text(encoding='utf8'))
saved=0;records=[]
for train,entries in data['trains'].items():
    for ref in entries.values():
        name=ref['file'];path=(folder/train/name).resolve()
        if name.endswith('.png'):
            target=path.with_suffix('.webp')
            original=Image.open(path).convert('RGBA');original.save(target,lossless=True,exact=True,method=6)
            assert Image.open(target).convert('RGBA').tobytes()==original.tobytes()
            if target.stat().st_size<path.stat().st_size-4096:
                ref['file']=name[:-4]+'.webp';saved+=path.stat().st_size-target.stat().st_size;records.append(dict(file=path.relative_to(folder).as_posix(),kind='pixel-identical WebP'))
            else:target.unlink()
        elif name.endswith(('.wav','.wav.gz')):
            raw=gzip.decompress(path.read_bytes()) if name.endswith('.gz') else path.read_bytes()
            try:
                w=wave.open(io.BytesIO(raw));samples=w.readframes(w.getnframes());width=w.getsampwidth();channels=w.getnchannels();rate=w.getframerate()
            except (wave.Error,EOFError):continue
            if width!=2:continue
            target=path.with_name(path.name.removesuffix('.gz').removesuffix('.wav')+'.flac')
            encoded=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','wav','-i','pipe:0','-c:a','flac','-compression_level','12',str(target)],input=raw,check=True)
            decoded=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(target),'-f','s16le','-acodec','pcm_s16le','pipe:1'],stdout=subprocess.PIPE,check=True).stdout
            assert decoded==samples,(name,'PCM changed')
            if target.stat().st_size<path.stat().st_size-4096:
                ref['file']=name.removesuffix('.gz').removesuffix('.wav')+'.flac';saved+=path.stat().st_size-target.stat().st_size;records.append(dict(file=path.relative_to(folder).as_posix(),kind='sample-identical FLAC',sampleRate=rate,channels=channels,pcmSha256=hashlib.sha256(samples).hexdigest()))
            else:target.unlink()
used={(folder/train/ref['file']).resolve() for train,entries in data['trains'].items() for ref in entries.values()}
for record in records:
    path=(folder/record['file']).resolve()
    if path not in used:path.unlink()
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(folder/'lossless-media97.json').write_text(json.dumps(records,separators=(',',':')),encoding='utf8')
print('lossless media bytes saved',saved,'assets',len(records),flush=True)
for name in ['yamanote','chuo','osaka','tokaido','tohoku']:
    path=ROOT/f'dist/assets/final/{name}-route-button-v25.png';target=path.with_suffix('.webp');original=Image.open(path).convert('RGBA');original.save(target,lossless=True,exact=True,method=6);assert Image.open(target).convert('RGBA').tobytes()==original.tobytes();saved+=path.stat().st_size-target.stat().st_size;path.unlink()
print('including pixel-identical route cards',saved,flush=True)
