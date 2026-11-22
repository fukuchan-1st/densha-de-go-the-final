export const WEATHER={clear:{name:'晴れ',traction:Infinity},rain:{name:'雨',traction:.32,precipitation:'rain'},snow:{name:'雪',traction:.20,precipitation:'snow'},heavySnow:{name:'大雪',traction:.16,precipitation:'snow'},thunderstorm:{name:'雷雨',traction:.27,precipitation:'rain'},typhoon:{name:'台風',traction:.24,precipitation:'rain'},settledSnow:{name:'積雪',traction:.18}};
export const weatherType=value=>Object.hasOwn(WEATHER,value)?value:'clear';
export const SLIP_EFFORT_RATIO=.8;
// Gameplay adhesion approximation, not a measured vehicle/rail friction model.
// Contact force still accelerates the train during wheelspin; the excess torque
// raises wheel RPM separately. Neutral removes powered force immediately.
// Braking is independent. Smooth position patches avoid per-frame RNG.
export function adhesionStep(state,demand,dt){
 const type=weatherType(state.weather),step=Math.max(0,Math.min(.1,dt));
 if(type==='clear'){state.wheelSlip=false;state.wheelExcess=0;state.wheelSpeed=state.v;return demand;}
 const patch=.83+.12*Math.sin((state.s??0)/37)+.05*Math.sin((state.s??0)/11+1.7);
 const limit=WEATHER[type].traction*patch*(1+.18*Math.min(1,(state.v??0)/22));
 const slipping=demand>limit+.012;
 state.wheelExcess=Math.max(0,Math.min(9,(state.wheelExcess??0)+(slipping?(demand-limit)*9:-4.5)*step));
 state.wheelSlip=slipping;
 state.wheelSpeed=Math.max(0,(state.v??0)+state.wheelExcess);
 state.adhesionLimit=limit;
 if(demand>0)state.wheelDeficit=0;
 return slipping?demand*SLIP_EFFORT_RATIO:demand;
}
// Strong braking (70% of service range and above, including EB) can cause
// wheel slide. Reduce braking effort to 80%; actual train speed never freezes.
export function brakeAdhesionStep(state,demand,dt,fraction=0){
 const wet=weatherType(state.weather)!=='clear',step=Math.max(0,Math.min(.1,dt));
 const sliding=wet&&fraction>=.7&&demand>0&&state.v>.1;
 state.wheelSlide=sliding;
 if(demand>0)state.wheelExcess=0;
 state.wheelDeficit=wet?Math.max(0,Math.min(Math.max(0,state.v)*.7,(state.wheelDeficit??0)+(sliding?demand*5:-6)*step)):0;
 return sliding?demand*SLIP_EFFORT_RATIO:demand;
}
export function weatherMarkup(selected='clear'){
 return '<fieldset class="weather-controls"><legend>天候</legend><div>'+Object.entries(WEATHER).map(([id,{name}])=>`<button type="button" data-weather="${id}" aria-pressed="${id===weatherType(selected)}">${name}</button>`).join('')+'</div><p>雨・雪では強い力行で空転しやすくなります。<br>空転したらノッチを戻し、弱い力行から再加速してください。<br>大雪・積雪は山間部ほど積もります。台風では臨時40km/h徐行区間を設けます。<br>空転時の加速・強いブレーキで滑走した時の減速は通常の80％</p></fieldset>';
}
export function bindWeather(root,settings,onChange){
 const update=()=>root.querySelectorAll('[data-weather]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.weather===weatherType(settings.weather))));
 root.querySelectorAll('[data-weather]').forEach(button=>button.onclick=()=>{settings.weather=weatherType(button.dataset.weather);update();onChange?.();});update();
}
export function updateWeatherStatus(container,state){
 let status=container.querySelector('.weather-status');
 if(!status){status=document.createElement('div');status.className='weather-status';status.setAttribute('role','status');container.append(status);}
 const slip=Boolean(state.wheelSlip||state.wheelSlide),text=state.wheelSlide?'滑走　ブレーキを弱めてください':state.wheelSlip?'空転　力行を弱めてください':'';
 status.hidden=!slip;
 status.classList.toggle('slipping',slip);if(status.textContent!==text)status.textContent=text;
}
