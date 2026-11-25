import {sceneryDensity} from './scenery-profile.js?v=116';
// Representative Street View checks calibrate low-rise houses and station-front
// shops. This is a settlement estimate, not a survey of every individual facade.
export function estimateBuildingHeight(route,s,width,depth,height,estimated=false){
 if(!estimated)return height;
 const d=sceneryDensity(route,s),city=Math.max(d.building/100,d.urban??0),area=width*depth;
 if(height===3)return height;
 const shinjuku=(route.sceneryStations??route.stations??[]).find(st=>st.name==='新宿');
 if(shinjuku&&Math.abs(s-shinjuku.s)<1700){if(height===6)return area>120?12:9;if(height===7)return area<120?12:area<500?21:area<1800?30:42;if(height===12)return area>1200?39:24;if(height===20)return area>900?54:33;}
 // Garages, roofs and ancillary sheds.
 if(height===6)return city>.8&&area>120?9:6;
 if(height===7){if(area<180)return city>.65?9:6;if(area>900)return 8;return city>.7?12:7;}
 return height; // Keep typed industrial / apartment / office estimates.
}
