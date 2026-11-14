import {loadServiceRoutes} from '../tests/service-fixture.mjs';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
import {resolveScoreSchedule,formatScoreTime} from '../dist/scoring.js';
import {readFile} from 'node:fs/promises';
const routes=await loadServiceRoutes(),recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8')).trains;
for(const [line,choices]of Object.entries(serviceChoices))for(const [id,vehicle,service,option]of choices){
 if(id==='tohoku')continue;const r=makeServiceRoute(routes.get(id),vehicle,service,option);if(!r.publishedSchedule)continue;
 const train=recipes.find(x=>x.id===vehicle),spec={...train.playableSpecs,powerNotches:train.notchLabels.length-train.notchLabels.indexOf('N')-1,powerForceRows:train.performance?.power?.force?.rows},q=resolveScoreSchedule(r,0,spec);
 console.log(JSON.stringify({id,vehicle,reverse:!!option.reverse,title:r.publishedSchedule.title,clock:formatScoreTime(q.clockStart),adjustments:q.adjustments,stops:q.timetable.filter(x=>x.stop).map(x=>[x.name,formatScoreTime(x.time),formatScoreTime(q.planningSpec.departureTimes[x.s])])}));
}
