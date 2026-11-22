import {yamagataMountainDensity} from './yamagata-mountain.js?v=106';
import {SCENERY_PROFILES} from './scenery-profile-data.js?v=106';
import {basinDensity,basinProfile} from './basin-profile.js?v=106';
// Read-only indices are regenerated from geographical land use, not user sliders.
export function sceneryProfiles(){return [{id:'kofu',name:'甲府盆地',rows:basinProfile()},...SCENERY_PROFILES];}
const aliases={chuo:'chuo','chuo-extended':'chuo','chuo-kofu':'chuo','chuo-system':'chuo','chuo-oito':'chuo','chuo-shinshu':'chuo','chuo-osm-gap':'chuo',shinonoi:'shinonoi','shinonoi-extended':'shinonoi','shinonoi-approach':'shinonoi','suwa-nagano':'shinonoi','tatsuno-nagano':'tatsuno','chuo-ome':'ome','chuo-itsukaichi':'itsukaichi','ome-okutama':'okutama'};
const cache=new WeakMap();
const profilesCache=sceneryProfiles();
export function sceneryDensity(route={},s=0){
 const mountain=yamagataMountainDensity(route,s);if(mountain)return mountain;
 const basin=basinDensity(route,s);if(basin)return basin;
 let entry=cache.get(route);
 if(!entry){const list=profilesCache,primary=list.find(p=>p.id===(aliases[route.id]??route.id))??(route.sceneryProfile?{rows:route.sceneryProfile}:null);
  const rows=(route.sceneryStations??route.stations??[]).map(st=>{const p=primary?.rows.find(r=>r.name===st.name)??list.filter(p=>p.id!=='kofu').flatMap(p=>p.rows).find(r=>r.name===st.name);return p?{s:st.s,...p}:null;}).filter(Boolean).sort((a,b)=>a.s-b.s);
  entry={rows};cache.set(route,entry);
 }
 const rows=entry.rows;if(!rows.length)return {building:35,green:65};
 if(s<=rows[0].s)return rows[0];if(s>=rows.at(-1).s)return rows.at(-1);
 let lo=0,hi=rows.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(rows[m].s<=s)lo=m;else hi=m;}
 const a=rows[lo],b=rows[hi],t=(s-a.s)/Math.max(1,b.s-a.s);return Object.fromEntries(['building','green','forest','farmland','orchard','urban','coverage'].map(k=>[k,(a[k]??0)+((b[k]??0)-(a[k]??0))*t]));
}

export function sceneryTreeAmount(route,s){const d=sceneryDensity(route,s);return Math.min(1,Math.max(0,(d.forest??d.green/100)*1.3+(d.orchard??0)*.5+d.green/100*.1));}
