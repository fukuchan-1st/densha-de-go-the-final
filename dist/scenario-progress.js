const KEY='trackfinity-scenario-progress-v1',CATALOG='trackfinity-scenario-catalog-v1';
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;
export function serviceKey(line,choice){return JSON.stringify([line,sorted(choice)]);}
export class ScenarioProgress{
 constructor(storage){this.storage=storage;try{this.coverage=JSON.parse(storage?.getItem(KEY)??'{}');this.catalog=JSON.parse(storage?.getItem(CATALOG)??'[]');}catch{this.coverage={};this.catalog=[];}}
 register(entries){this.catalog=entries;try{this.storage?.setItem(CATALOG,JSON.stringify(entries));}catch{}}
 cleared(key,from,to){return (this.coverage[key]??[]).some(([a,b])=>a<=from+.5&&b>=to-.5);}
 complete(key,from,to,state){if(!key||!state.finished||state.missed>0||state.cheatUsed||!(to>from)||state.served<(state.requiredStops??1))return false;const intervals=[...(this.coverage[key]??[]),[from,to]],merged=intervals.filter((x,i)=>!intervals.some((y,j)=>j!==i&&y[0]<=x[0]&&y[1]>=x[1]&&(y[0]<x[0]||y[1]>x[1]||j<i)));this.coverage[key]=merged;try{this.storage?.setItem(KEY,JSON.stringify(this.coverage));}catch{}return true;}
 get count(){return this.catalog.filter(e=>this.cleared(e.key,e.from,e.to)).length;}
 get allClear(){return this.catalog.length>0&&this.count===this.catalog.length;}
}
export const progress=new ScenarioProgress(globalThis.localStorage);
