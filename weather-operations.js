import {sceneryDensity} from './scenery-profile.js?v=112c';
export function snowCover(route,s,type){
 if(!['snow','heavySnow','settledSnow'].includes(type))return 0;
 const d=sceneryDensity(route,s),urban=Math.max(d.building/100,d.urban??0),forest=Math.max(d.forest??0,d.green/100*.65);
 return Math.min(.96,Math.max(.06,(type==='snow'?.35:type==='heavySnow'?.9:.72)*(1-urban*.88)+forest*.23));
}
// Pick a section ahead of this duty's starting point, in either running direction.
export function typhoonSection(state,route){
 if(state.weather!=='typhoon')return null;
 if(state.typhoonSection)return state.typhoonSection;
 const from=state.s??0,end=route.stations?.[state.endIndex]?.s??route.length??route.stations?.at(-1)?.s??from+3000,remaining=end-from;
 if(remaining<30)return null;
 const lead=Math.min(Math.max(remaining*.18,180),950,remaining*.4),start=from+lead;
 state.typhoonTimingExempt=true;return state.typhoonSection={sStart:start,sEnd:Math.min(end-5,start+Math.min(800,remaining*.32)),kmh:40,weather:true};
}
const effectiveRoutes=new WeakMap();
export function weatherRoute(state,base){
 const limits=weatherLimits(state,base);if(limits===base.limits)return base;
 const old=effectiveRoutes.get(state);if(old?.base===base&&old.section===state.typhoonSection)return old.route;
 const route={...base,limits};effectiveRoutes.set(state,{base,section:state.typhoonSection,route});return route;
}
export function weatherLimits(state,route,base=route.limits??[]){
 if(state.weather!=='typhoon'){delete state.typhoonSection;return base;}
 const section=typhoonSection(state,route);return section?[...base.filter(x=>!x.weather),section]:base;
}
export function weatherLimitAt(state,route,s,normal){const section=typhoonSection(state,route);return section&&s>=section.sStart&&s<section.sEnd?Math.min(normal??Infinity,40):normal;}
export function reportTyphoon(state,route,previous,audio){
 const section=typhoonSection(state,route);if(!section)return;
 // Announce before the restriction, leaving room to brake; ordinary limit calls
 // still report the applicable numeric limit at the boundary.
 if(!state.typhoonAnnounced&&state.s>=Math.max(0,section.sStart-1000)){
  state.typhoonAnnounced=true;audio.callSlowRestriction?.(40);
 }
}
