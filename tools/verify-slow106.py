from pathlib import Path
import sys,subprocess,json
work=Path('C:/Users/bmwhz/Documents/Codex/2026-10-30/new-chat-2/work/final-redesign/driver-voice');sys.path.insert(0,str(work/'python'))
from faster_whisper import WhisperModel
import numpy as np
model=WhisperModel(str(work/'models/models--Systran--faster-whisper-small/snapshots/536b0662742c02347bc0e980a01041f333bce120'),device='cpu',compute_type='int8',cpu_threads=4)
result=[]
for i in range(4):
 p=Path(__file__).resolve().parents[1]/f'dist/assets/audio/ambient/kanko{i}-slow40.ogg'
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar','16000','-ac','1','-f','f32le','pipe:1']);audio=np.frombuffer(raw,dtype=np.float32)
 segments,_=model.transcribe(audio,language='ja',beam_size=5,condition_on_previous_text=False,no_speech_threshold=None,log_prob_threshold=None,initial_prompt='鉄道運転士の歓呼。')
 text=''.join(s.text for s in segments);row={'bank':i,'text':text,'duration':len(audio)/16000};result.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
(Path(__file__).resolve().parents[2]/'slow106-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
