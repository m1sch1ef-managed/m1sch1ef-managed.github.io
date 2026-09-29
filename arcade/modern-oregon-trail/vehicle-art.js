import { vehicleInfo } from './engine.js';
import { paints } from './paint.js';

// Explicit art bounds keep wheels and bumpers intact; generated sheets are not exact grids.
const fleetBounds = [
  [20,40,790,305], [925,40,525,305], [25,348,690,328],
  [774,352,752,324], [22,686,736,294], [774,705,750,274],
];
const classicBounds = {
  truck:[228,18,800,326], wagon:[228,343,800,301],
  van:[224,641,810,354], hybrid:[236,992,780,253],
};
const factoryHue = {yama:0,redline:135,kawa:255,suzi:190,tahno:160,expedition:70};
// Axle positions are relative to the visible sprite bounds, not its transparent sheet cell.
const axlePositions = {
  fjord:[[.326,.729,.305],[.861,.729,.305]], ram:[[.334,.721,.303],[.863,.73,.31]],
  duty:[[.124,.714,.33,.76],[.584,.764,.37,.8]],
  diesel:[[.212,.72,.49],[.775,.72,.49]], sport:[[.23,.75,.46],[.79,.75,.46]],
  cruiser:[[.20,.74,.43],[.81,.75,.46]], suv:[[.20,.73,.45],[.80,.73,.45]],
  minivan:[[.19,.76,.41],[.79,.76,.41]], sedan:[[.21,.74,.45],[.83,.74,.45]],
  truck:[[.19,.70,.57],[.78,.70,.57]], wagon:[[.17,.79,.40],[.79,.79,.40]],
  van:[[.19,.81,.37],[.82,.81,.37]], hybrid:[[.19,.76,.45],[.80,.76,.45]],
};

export function drawVehicle(context, id, color, assets, x, y, width, height, wheels='stock') {
  const v=vehicleInfo(id);const modern=Number.isInteger(v.sprite);
  const gas=v.type==='gas-truck';
  const dedicated=id==='fjord'||id==='ram'||id==='duty'||gas;
  const source=gas?assets[`${id}-${wheels==='black'?'black':'stock'}`]:dedicated?assets[id]:modern?assets.fleet:assets.sprites;
  if(!source?.naturalWidth) {
    context.fillStyle='#bac7c7';context.font='14px monospace';
    context.fillText('Loading vehicle artwork…',x+12,y+height/2);
    return false;
  }
  const bounds=dedicated?[0,source.naturalHeight*.13,source.naturalWidth,source.naturalHeight*.77]:modern?fleetBounds[v.sprite]:classicBounds[id];
  const reference=dedicated?[source.naturalWidth,source.naturalHeight]:modern?[1536,1024]:[1280,1280];
  const [sx,sy,sw,sh]=bounds.map((n,i)=>n*(i%2?source.naturalHeight/reference[1]:source.naturalWidth/reference[0]));
  const scale=Math.min(width/sw,height/sh);const dw=sw*scale,dh=sh*scale;
  context.save();context.imageSmoothingEnabled=false;
  context.filter=color&&color!=='factory'?(paints[color]?.filter||'none'):`hue-rotate(${factoryHue[id]||0}deg)`;
  context.drawImage(source,sx,sy,sw,sh,x+(width-dw)/2,y+(height-dh)/2,dw,dh);
  context.restore();
  if(gas&&color&&color!=='factory') {
    // Paint belongs on the body; preserve the silver stock or black custom rims.
    const centers={gaschevy:[.222,.815,.659,.612],gasford:[.225,.814,.679,.628],gasdodge:[.211,.786,.676,.641]}[id];
    const cy=centers[wheels==='black'?3:2]*source.naturalHeight;
    context.save();context.beginPath();
    for(const ax of centers.slice(0,2)){
      const cx=x+(width-dw)/2+(ax*source.naturalWidth-sx)*scale;
      const py=y+(height-dh)/2+(cy-sy)*scale;
      const radius=source.naturalHeight*.109*scale;
      context.moveTo(cx+radius,py);context.arc(cx,py,radius,0,Math.PI*2);
    }
    context.clip();context.drawImage(source,sx,sy,sw,sh,x+(width-dw)/2,y+(height-dh)/2,dw,dh);context.restore();
  }
  const wheelImage=assets.wheelsets;
  const anchors=axlePositions[id]||axlePositions[v.type];
  if(wheelImage?.naturalWidth&&anchors&&!gas){
    const cell=wheelImage.naturalWidth/2;
    for(const [ax,ay,size,aspect=1] of anchors){
      const diameter=dh*size;
      context.drawImage(wheelImage,wheels==='black'?cell:0,0,cell,wheelImage.naturalHeight,
        x+(width-dw)/2+dw*ax-diameter*aspect/2,y+(height-dh)/2+dh*ay-diameter/2,diameter*aspect,diameter);
    }
  }
  return true;
}

export function paintVehiclePreview(canvas,id,color,assets,wheels='stock') {
  const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);
  drawVehicle(context,id,color,assets,10,10,canvas.width-20,canvas.height-20,wheels);
  const setup=vehicleInfo(id).type==='gas-truck'?(wheels==='black'?'lowered suspension with custom rims':'stock height with stock rims'):`${wheels==='black'?'wide black':'stock-style'} wheels with big tires`;
  canvas.setAttribute('aria-label',`${vehicleInfo(id).name}, ${paints[color]?.name||'factory paint'}, ${setup}`);
}
