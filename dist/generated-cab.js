const layouts={
 '701':{windows:[[[55,45],[1587,24],[1622,49],[1580,463],[1548,485],[150,485],[137,278],[61,278]]],dials:[[693,644,59,'speed',140,'km/h'],[934,644,59,'pressure',1000,'kPa']]},
 e233:{dials:[[467,602,44,'speed',160,'km/h'],[355,599,30,'pressure',1000,'kPa']],digital:[515,651]},
 e235:{windows:[[[245,73],[905,73],[906,327],[988,329],[990,73],[1619,73],[1619,312],[1638,312],[1638,73],[1672,73],[1672,497],[245,497]],[[184,73],[226,73],[226,498],[184,520]]],dials:[[425,628,34,'speed',160,'km/h'],[301,628,31,'pressure',1000,'kPa']],digital:[470,650]},
 '323':{dials:[[911,597,62,'speed',160,'km/h'],[468,598,39,'pressure',1000,'kPa'],[571,598,39,'current',600,'A']],digital:[1000,645]},
 '207':{dials:[[543,548,76,'current',300,'A'],[980,548,76,'speed',160,'km/h'],[1185,548,76,'pressure',1000,'kPa']]},
 '6050':{windows:[[[192,27],[1556,27],[1555,445],[194,445]]],dials:[[424,589,74,'current',1000,'A'],[668,589,75,'speed',120,'km/h'],[914,590,77,'pressure',1000,'kPa'],[1144,590,76,'pressure',1000,'kPa']]}
};
export const generatedCab=new URLSearchParams(location.search).get('cab')==='generated';
export class GeneratedCab {
 static async load(canvas,id){
  const image=new Image();
  image.src=new URL('./assets/generated-cabs/'+id+'.png',import.meta.url);
  await image.decode();
  return new GeneratedCab(canvas,id,image);
 }
 constructor(canvas,id,image){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.layout=layouts[id];this.pressure=0;
  canvas.width=1600;canvas.height=900;
  const backing=document.createElement('canvas');backing.width=1672;backing.height=941;
  const ctx=backing.getContext('2d');ctx.drawImage(image,0,0,1672,941);ctx.globalCompositeOperation='destination-out';
  for(const polygon of this.layout.windows??[]){
   ctx.beginPath();ctx.moveTo(...polygon[0]);for(const point of polygon.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.fill();
  }
  this.backing=backing;
  this.viewOrigin={x:800,y:275};
 }
 setVisible(visible){this.canvas.hidden=!visible;}
 render(state,dt=1/60,inTunnel=false){
  const ctx=this.ctx,speed=(state.v??0)*3.6;
  this.pressure+=(Math.min(380,Math.max(0,-state.notch)*47.5)-this.pressure)*Math.min(1,dt*4);
  ctx.clearRect(0,0,1600,900);ctx.save();ctx.scale(1600/1672,900/941);
  ctx.filter=inTunnel?'brightness(.52)':'none';ctx.drawImage(this.backing,0,0);ctx.filter='none';
  const values={speed,pressure:this.pressure,current:Math.max(0,state.notch)*45};
  for(const [x,y,r,kind,max,unit] of this.layout.dials){
   ctx.save();ctx.translate(x,y);ctx.fillStyle=inTunnel?'#a6cbc2':'#e9e5d3';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#283138';ctx.fillStyle='#283138';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=r*.18+'px sans-serif';
   for(let i=0;i<=8;i++){
    const a=(-225+i*270/8)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    ctx.beginPath();ctx.moveTo(c*r*.80,s*r*.80);ctx.lineTo(c*r*.94,s*r*.94);ctx.stroke();
    if(i%2===0)ctx.fillText(Math.round(max*i/8),c*r*.64,s*r*.64);
   }
   ctx.fillText(unit,0,r*.55);
   const a=(-225+270*Math.min(1,values[kind]/max))*Math.PI/180;
   ctx.strokeStyle=kind==='pressure'?'#bb332a':'#222a30';ctx.lineWidth=Math.max(2,r*.047);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.76,Math.sin(a)*r*.76);ctx.stroke();ctx.fillStyle='#30363a';ctx.beginPath();ctx.arc(0,0,r*.09,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  if(this.layout.digital){ctx.fillStyle='#cff1df';ctx.font='bold 19px monospace';ctx.fillText(Math.round(speed)+' km/h',...this.layout.digital);}
  ctx.restore();
 }
 dispose(){this.ctx.clearRect(0,0,1600,900);}
}
