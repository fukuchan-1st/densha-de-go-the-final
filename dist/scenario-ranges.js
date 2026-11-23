import {FINAL_SCENARIOS} from './final-scenarios.js?v=111';
export function scenarioRanges(line,route,reverse=false){
 const last=route.stations.length-1,result=[{label:'全区間　'+route.stations[0].name+' → '+route.stations[last].name,start:0,end:last}];
 for(const entry of FINAL_SCENARIOS[line]??[]){const from=reverse?entry[2]:entry[1],to=reverse?entry[1]:entry[2],a=route.stations.findIndex(st=>st.name===from),b=route.stations.findIndex(st=>st.name===to);if(a>=0&&b>a&&!result.some(r=>r.start===a&&r.end===b))result.push({label:from+' → '+to,start:a,end:b});}
 if(result.length===1&&last>3){const mid=Math.floor(last/2);result.push({label:route.stations[0].name+' → '+route.stations[mid].name,start:0,end:mid},{label:route.stations[mid].name+' → '+route.stations[last].name,start:mid,end:last});}
 return result;
}
