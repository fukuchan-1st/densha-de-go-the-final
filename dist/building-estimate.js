import {sceneryDensity} from './scenery-profile.js?v=106';
// Representative Street View checks calibrate low-rise houses and station-front
// shops. This is a settlement estimate, not a survey of every individual facade.
export function estimateBuildingHeight(route,s,width,depth,height,estimated=false){
 if(!estimated)return height;
 const d=sceneryDensity(route,s),city=Math.max(d.building/100,d.urban??0),area=width*depth;
 if(height===3)return height; // Garages, roofs and ancillary sheds.
 if(height===6)return city>.8&&area>120?9:6;
 if(height===7){if(area<180)return city>.65?9:6;if(area>900)return 8;return city>.7?12:7;}
 return height; // Keep typed industrial / apartment / office estimates.
}
