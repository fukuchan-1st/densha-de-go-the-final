export const DISPLAY_WIDTH=1600, DISPLAY_HEIGHT=900;
export function fitDisplay(width,height){const scale=Math.min(width/DISPLAY_WIDTH,height/DISPLAY_HEIGHT);return {scale,width:DISPLAY_WIDTH*scale,height:DISPLAY_HEIGHT*scale,left:(width-DISPLAY_WIDTH*scale)/2,top:(height-DISPLAY_HEIGHT*scale)/2};}
export function mountDisplay(element){const fit=()=>{const b=fitDisplay(innerWidth,innerHeight);element.style.transform=`translate(-50%,-50%) scale(${b.scale})`;document.documentElement.style.setProperty('--display-scale',b.scale);};fit();addEventListener('resize',fit);return fit;}
export const STOP_TOLERANCE=10;
export function formatStopDistance(distance,precise=false){const d=Math.abs(distance);return d<=5?`${Math.round(d*100).toLocaleString()} cm`:`${precise&&d<100?d.toFixed(1):Math.round(d).toLocaleString()} m`;}
export function stoppingMarker(position,target){const error=position-target,within=Math.abs(error)<=STOP_TOLERANCE;return {error,within,visible:within,top:Math.max(0,Math.min(100,50+error/40*100)),label:within?(Math.abs(error)<.005?'停止位置':`${error<0?'手前':'行き過ぎ'} ${formatStopDistance(error,true)}`):`${error<0?'あと':'行き過ぎ'} ${formatStopDistance(error,true)}`};}
