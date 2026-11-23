const KEY='trackfinity-scenario-progress-v1',CATALOG='trackfinity-scenario-catalog-v1',PARTIAL='trackfinity-scenario-partial-v1';
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;
export function serviceKey(line,choice){if(choice?.[0]==='ome-okutama'&&choice[3]?.carCount){choice=structuredClone(choice);delete choice[3].carCount;}return JSON.stringify([line,sorted(choice)]);}
export class ScenarioProgress{
 constructor(storage){this.storage=storage;try{this.coverage=JSON.parse(storage?.getItem(KEY)??'{}');this.catalog=JSON.parse(storage?.getItem(CATALOG)??'[]');this.partial=JSON.parse(storage?.getItem(PARTIAL)??'{}');}catch{this.coverage={};this.catalog=[];this.partial={};}}
 register(entries){this.catalog=entries;try{this.storage?.setItem(CATALOG,JSON.stringify(entries));}catch{}}
 cleared(key,from,to){return (this.coverage[key]??[]).some(([a,b])=>a<=from+.5&&b>=to-.5);}
 recordStop(key,from,to,state){if(!key||!Number.isFinite(from)||!Number.isFinite(to)||to<=from||state.cheatUsed||state.missed>0||!state.doors||Math.abs(state.v)>.01)return false;this.partial[key]=mergeIntervals([...(this.partial[key]??[]),[from,to]]);try{this.storage?.setItem(PARTIAL,JSON.stringify(this.partial));}catch{}return true;}
 fraction(key,from,to){if(!(to>from))return 0;if(this.cleared(key,from,to))return 1;const covered=mergeIntervals([...(this.coverage[key]??[]),...(this.partial[key]??[])].map(([a,b])=>[Math.max(from,a),Math.min(to,b)]).filter(([a,b])=>b>a));return Math.min(.99,covered.reduce((sum,[a,b])=>sum+b-a,0)/(to-from));}
 complete(key,from,to,state){if(!key||!state.finished||state.missed>0||state.cheatUsed||!(to>from)||state.served<(state.requiredStops??1))return false;const intervals=[...(this.coverage[key]??[]),[from,to]],merged=intervals.filter((x,i)=>!intervals.some((y,j)=>j!==i&&y[0]<=x[0]&&y[1]>=x[1]&&(y[0]<x[0]||y[1]>x[1]||j<i)));this.coverage[key]=merged;try{this.storage?.setItem(KEY,JSON.stringify(this.coverage));}catch{}return true;}
 get count(){return this.catalog.filter(e=>this.cleared(e.key,e.from,e.to)).length;}
 get allClear(){return this.catalog.length>0&&this.count===this.catalog.length;}
}
function mergeIntervals(rows){const result=[];for(const [a,b]of rows.sort((x,y)=>x[0]-y[0])){const previous=result.at(-1);if(previous&&a<=previous[1]+.001)previous[1]=Math.max(previous[1],b);else result.push([a,b]);}return result;}
export function applyProgressFrame(element,fraction){const value=Math.max(0,Math.min(1,Number(fraction)||0));element.style.setProperty('--scenario-progress',(value*100).toFixed(2)+'%');element.dataset.progress=String(value);element.classList.toggle('scenario-in-progress',value>0);let ring=element.querySelector('.scenario-progress-ring');if(!ring){ring=document.createElement('span');ring.className='scenario-progress-ring';ring.setAttribute('aria-hidden','true');element.append(ring);}}
export const progress=new ScenarioProgress(globalThis.localStorage);
