import { vehicleInfo } from './engine.js';
import { getRoute, getStop, biomes } from './routes.js';
import { drawVehicle } from './vehicle-art.js';

export function paint(canvas, state, assets) {
  const c=canvas.getContext('2d');canvas.height=state?360:220;c.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  if(!state) { if(assets.artwork.naturalWidth)c.drawImage(assets.artwork,0,0,640,220);else rect(0,0,640,220,'#121d2a');return; }
  const biome=biomes[getStop(state).biome];const route=getRoute(state);const v=vehicleInfo(state.vehicle);
  if(assets.scenery.naturalWidth){ const sw=assets.scenery.naturalWidth/3,sh=assets.scenery.naturalHeight/2; c.drawImage(assets.scenery,(biome.tile%3)*sw,Math.floor(biome.tile/3)*sh+sh*.14,sw,sh*.86,0,0,640,360); }
  else {rect(0,0,640,270,'#466977');rect(0,270,640,90,'#303639');}
  // Composite only the selected fictional vehicle; sprite sheets remain shared and cached.
  const bike=['sport','cruiser'].includes(v.type);const width=bike?180:300;const height=bike?106:125;
  drawVehicle(c,state.vehicle,state.paint,assets,145,208,width,height,state.wheels);
  if(state.condition<35){for(let i=0;i<9;i++)rect(425+i%3*7,209-i*8,12,12,`rgba(90,91,91,${.5-i*.04})`);}
  if(['storm','flood','snow'].includes(state.event)){c.fillStyle=state.event==='snow'?'#edf4fa':'#a4c9e2';for(let i=0;i<100;i++)c.fillRect(i*97%640,i*37%360,2,state.event==='snow'?2:9);}
  if(state.event==='heat')rect(0,0,640,360,'#ef863321');
  if(state.outcome&&state.health<=0)rect(0,0,640,360,'#080a1699');
  rect(10,333,620,20,'#080d18e8');c.fillStyle='#ece1c6';c.font='9px monospace';c.fillText(`${v.name.toUpperCase()}  /  ${Math.max(0,route.miles-state.miles)} MI TO ${route.to.toUpperCase()}`,18,347);
}
