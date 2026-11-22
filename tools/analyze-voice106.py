from pathlib import Path
import sys,json,os
work=Path('C:/Users/bmwhz/Documents/Codex/2026-10-30/new-chat-2/work/final-redesign/driver-voice');sys.path.insert(0,str(work/'python'))
from faster_whisper import WhisperModel
import wave,numpy as np
from scipy.signal import resample_poly
model=WhisperModel(str(work/'models/models--Systran--faster-whisper-small/snapshots/536b0662742c02347bc0e980a01041f333bce120'),device='cpu',compute_type='int8',cpu_threads=4)
root=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/cddata/se');out=[]
for i,prefix in enumerate(['uta','utb','utd','ute']):
 path=root/f'kanko{i}/com/{prefix}101.wag'
 with wave.open(str(path)) as w: rate=w.getframerate();audio=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
 audio=resample_poly(audio,16000,rate).astype(np.float32)
 segments,_=model.transcribe(audio,language='ja',word_timestamps=True,beam_size=5,condition_on_previous_text=False,initial_prompt='鉄道の運転士の歓呼。制限、40。')
 result=[{'text':s.text,'words':[{'word':w.word,'start':w.start,'end':w.end} for w in s.words]} for s in segments];out.append({'bank':i,'file':str(path),'result':result});print(json.dumps(out[-1],ensure_ascii=False),flush=True)
(Path(__file__).resolve().parents[2]/'voice106-analysis.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
