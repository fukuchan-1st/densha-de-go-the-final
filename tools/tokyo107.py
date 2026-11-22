from pathlib import Path
p=Path(__file__).resolve().parents[1]/'dist/tokyo-station.js';s=p.read_text(encoding='utf8').replace('const stationKey=[96,','const stationKey=[107,')
s=s.replace("direction=chuo&&i<2&&v===(north?12:0)||yamanote", "direction=yamanote")
needle=' const drivingTrack=chuo?'
block=''' // Both diagonals belong to the same diamond crossover. The opposing
 // train uses the complementary branch, not the departing train's platform.
 if(chuo){
  const smooth=d=>{const t=Math.max(0,Math.min(1,(d-switchStart)/230));return t*t*(3-2*t);},oppositeOwn=12-own,oppositeRunning=12-running;
  const routeOffset=s=>x(oppositeOwn+(oppositeRunning-oppositeOwn)*smooth((s-st.s)*sign),s);
  const a=north?st.s-245:lo,b=north?hi:st.s+35,values=[...new Set([a,b,...Array.from({length:Math.ceil((b-a)/10)},(_,i)=>a+i*10),st.s+sign*switchStart,st.s+sign*switchEnd])].filter(v=>v>=a&&v<=b).sort((a,b)=>a-b);
  rails.push({id:'tokyo-chuo-opposing',tokyoTrack:true,tokyoTrafficPath:true,tokyoCrossover:true,direction:'opposing',lineName:'中央線',platformNumber:oppositeOwn===0?1:2,height:0,knots:values.map(s=>[s,routeOffset(s)])});
  // Include the unused diagonals when both active routes run straight.
  if(own===running)for(const from of [0,12]){const knots=Array.from({length:24},(_,i)=>{const d=switchStart+i*10,s=st.s+sign*d;return [s,x(from+(12-2*from)*smooth(d),s)];}).sort((a,b)=>a[0]-b[0]);rails.push({tokyoTrack:true,tokyoCrossover:true,direction:'scenery',height:0,knots});}
 }
'''
assert needle in s;s=s.replace(needle,block+needle);s=s.replace('tokyoStationVersion:96','tokyoStationVersion:107')
s=s.replace('end:st.s+sign*switchEnd}:null','end:st.s+sign*switchEnd,active:own!==running,sStart:Math.min(st.s+sign*switchStart,st.s+sign*switchEnd),sEnd:Math.max(st.s+sign*switchStart,st.s+sign*switchEnd),diamond:true}:null')
p.write_text(s,encoding='utf8')
