import { onlineSave, rankedStart, rankedMove, retryRanked, recoverRanked, clearRanked, loadBoard } from './online.js';
import { paint } from './render.js';
import { paintVehiclePreview } from './vehicle-art.js';
import { paints } from './paint.js';
import { start, act, vehicles, vehicleInfo, offer, events, affordable } from './engine.js';
import { routes, getRoute, getStop, biomes } from './routes.js';
const $ = id => document.getElementById(id);
const key = 'modern-oregon-trail-v1';
let state = null;
let ranked = !!onlineSave(), busy = false, onlineError = false;
let selectedRoute = 'oregon';
let selectedVehicle = 'fjord';
let selectedPaint = 'factory';
let selectedWheels = 'stock';
const wheelsets = new Image(); wheelsets.onload = () => draw(); wheelsets.src = 'wheel-options-straight.webp';
const fjord = new Image(); fjord.onload = () => draw(); fjord.src = 'fjord-heavy-duty.webp';
const ram = new Image(); ram.onload = () => draw(); ram.src = 'battering-debt-loaded.webp';
const duty = new Image(); duty.onload = () => draw(); duty.src = 'debt-duty-loaded.webp';
const gasTrucks={};
for(const id of ['gaschevy','gasford','gasdodge']) for(const setup of ['stock','black']) {
  const key=`${id}-${setup}`;const image=new Image();image.onload=()=>draw();image.src=`${key}.webp`;gasTrucks[key]=image;
}
const fleet = new Image(); fleet.onload = () => draw(); fleet.src = 'fleet.webp';
const scenery = new Image(); scenery.onload = () => draw(); scenery.src = 'scenery.webp';
const sprites = new Image(); sprites.onload = () => draw(); sprites.src = 'vehicles.webp';
const artwork = new Image();
artwork.onload = () => draw();
artwork.src = 'last-exit.webp';
try { const saved = JSON.parse(localStorage.getItem(key)); if (saved?.version === 1 && Object.hasOwn(vehicles,saved.vehicle) && Object.hasOwn(routes,saved.route) && Object.hasOwn(paints,saved.paint) && ['stock','black'].includes(saved.wheels) && saved.miles >= 0 && saved.day >= 1 && saved.log?.length <= 80 && ['day','miles','cash','fuel','food','parts','health','morale','condition','fatigue','market','visited'].every(k => Number.isFinite(saved[k])) && saved.market > 0 && Array.isArray(saved.log) && (!saved.event || events.some(e => e.id === saved.event))) state = saved; } catch { /* A blocked store must not prevent playing. */ }
function button(text, action, value, disabled = false) { const b = document.createElement('button'); b.textContent = text; b.dataset.action = action; if (value !== undefined) b.dataset.value = value; b.disabled = disabled; return b; }
for(const [id,p] of Object.entries(paints)){const b=button(p.name,'paint',id);b.style.setProperty('--swatch',p.color);$('paints').append(b);}
for (const [id, r] of Object.entries(routes)) { const b=button('', 'route', id); b.innerHTML=`<span>${r.difficulty} · ${r.miles.toLocaleString()} MI · ${r.days} DAYS</span><strong>${r.from} → ${r.to}</strong><small>${r.name}<br>${r.blurb}</small>`; $('routes').append(b); }
for (const id of Object.keys(vehicles)) {
  const v=vehicleInfo(id);const b=button('','vehicle',id);b.dataset.type=v.type;
  b.innerHTML=`<span>${v.type.toUpperCase()} · ${v.crew} TRAVELER${v.crew>1?'S':''}</span><canvas class="vehicle-art" data-vehicle="${id}" width="560" height="220" role="img" aria-label="${v.name}"></canvas><strong>${v.name}</strong><small>${v.mpg} MPG · $${v.cash} starting cash · ${v.wear}/day wear<br>${v.note}<br>${v.tank} gal including reserve · ${['sport','cruiser'].includes(v.type)?'30% worse encounter injuries':'Sheltered cabin'}</small><span class="selected-badge" aria-hidden="true">✓ SELECTED</span>`;
  $('vehicles').append(b);
}
$('vehicle-class').onchange=()=>{document.querySelectorAll('[data-action="vehicle"]').forEach(b=>b.hidden=$('vehicle-class').value!=='all'&&b.dataset.type!==$('vehicle-class').value);};
function lockOnline() {
  $('play').inert = busy || (ranked && onlineError);
  $('departure').disabled = busy || (ranked && onlineError);
  $('retry-ranked').hidden = !ranked || !onlineError;
  $('recover-ranked').hidden = !ranked || !onlineError;
  $('leave-ranked').hidden = !ranked || !onlineError;
  for (const id of ['retry-ranked','recover-ranked','leave-ranked']) $(id).disabled = busy;
}
async function onlineOperation(operation) {
  busy = true; lockOnline(); $('online-status').textContent = 'Saving your questionable decisions…';
  try {
    const result = await operation(); state = result.game; onlineError = false;
    $('online-status').textContent = result.rankedScore !== null ? `Verified victory! ${result.rankedScore.toLocaleString()} points. Your survival is now a matter of public record.` : state.outcome ? 'Ranked run ended. Only survivors reach the leaderboard.' : 'Ranked run · saved online. Every bad decision counts.';
    if (state.outcome && $('leaderboard').open) void refreshBoard();
  } catch (error) { onlineError = true; $('online-status').textContent = error.message; }
  finally { busy = false; render(); lockOnline(); }
}
document.addEventListener('click', async e => {
  const b = e.target.closest('button[data-action]'); if (!b || b.disabled || busy) return;
  const action = b.dataset.action;
  if (action === 'route') selectedRoute = b.dataset.value;
  else if (action === 'wheels') selectedWheels = b.dataset.value;
  else if (action === 'paint') selectedPaint = b.dataset.value;
  else if (action === 'vehicle') selectedVehicle = b.dataset.value;
  else if (action === 'start') {
    ranked = $('ranked-mode').checked;
    if (ranked) await onlineOperation(() => rankedStart({vehicle:selectedVehicle,route:selectedRoute,paint:selectedPaint,wheels:selectedWheels}));
    else { clearRanked(); state = start(selectedVehicle,selectedRoute,selectedPaint,selectedWheels); }
    window.scrollTo({top:0,behavior:'instant'});
  } else if (state) {
    const value = action === 'drive' ? $('pace').value : action === 'choose' ? Number(b.dataset.value) : b.dataset.value;
    if (ranked) await onlineOperation(() => rankedMove(action,value)); else state = act(state,action,value);
  }
  render(); lockOnline();
});
$('retry-ranked').onclick = () => onlineOperation(retryRanked);
$('recover-ranked').onclick = () => onlineOperation(recoverRanked);
$('leave-ranked').onclick = () => $('reset-dialog').showModal();
for (const [id,route] of Object.entries(routes)) { const option=document.createElement('option'); option.value=id; option.textContent=`${route.from} → ${route.to}`; $('board-route').append(option); }
let boardRequest = 0;
async function refreshBoard() {
  const sequence = ++boardRequest;
  $('board-status').textContent='Checking who escaped…'; $('board-rows').replaceChildren();
  try {
    const board = await loadBoard($('board-route').value,$('board-period').value);
    if (sequence !== boardRequest) return;
    $('board-status').textContent = board.rows.length ? 'Verified survivors. Bankruptcy is not a disqualification.' : 'No verified survivors yet. A prestigious club with alarming admission requirements.';
    for (const row of board.rows) { const item=document.createElement('li'); const name=document.createElement('strong'); name.textContent=`#${row.rank} ${row.name}${row.you?' (you)':''}`; const detail=document.createElement('span'); detail.textContent=`${row.score.toLocaleString()} pts · ${row.days} days · ${vehicleInfo(row.vehicle).name}`; item.append(name,detail); $('board-rows').append(item); }
  } catch (error) { if (sequence === boardRequest) $('board-status').textContent = error.message; }
}
$('leaderboard').ontoggle = () => { if ($('leaderboard').open) void refreshBoard(); };
$('board-route').onchange = refreshBoard; $('board-period').onchange = refreshBoard; $('board-refresh').onclick = refreshBoard;

$('pace').onchange = () => render();
$('help').onclick = () => { $('guide').hidden = !$('guide').hidden; };
$('restart').onclick = () => $('reset-dialog').showModal();
$('cancel-reset').onclick = () => $('reset-dialog').close();
$('confirm-reset').onclick = () => { state = null; ranked = false; onlineError = false; clearRanked(); $('online-status').textContent = 'Practice mode. Your financial collapse is currently private.'; lockOnline(); try { localStorage.removeItem(key); } catch {} $('reset-dialog').close(); render(); };
function render() {
  $('setup').hidden = !!state; $('play').hidden = !state;
  const isGasTruck=vehicleInfo(selectedVehicle).type==='gas-truck';
  const setupLabel=isGasTruck?(selectedWheels==='black'?'Lowered + custom rims':'Stock height + stock rims'):(selectedWheels==='black'?'Wide black wheels + big tires':'Stock-style wheels + big tires');
  for(const setup of ['stock','black']){
    const option=document.querySelector(`[data-action="wheels"][data-value="${setup}"]`);
    option.querySelector('strong').textContent=isGasTruck?(setup==='stock'?'Stock height + stock rims':'Lowered + custom rims'):(setup==='stock'?'Stock wheels + big tires':'Wide black wheels + big tires');
    option.querySelector('small').textContent=isGasTruck?(setup==='stock'?'Original ride height and factory silver wheels.':'Lower street stance, custom black rims and street tires.'):(setup==='stock'?'Factory-style silver wheels. Plenty of rubber.':'Deep black rims. A wider, more aggressive look.');
    const picture=option.querySelector('.wheel-picture');
    picture.classList.toggle('gas-setup-picture',isGasTruck);
    picture.style.backgroundImage=isGasTruck?`url('${selectedVehicle}-${setup}.webp')`:'';
  }
  document.querySelectorAll('[data-action="route"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===selectedRoute)));
  document.querySelectorAll('[data-action="vehicle"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===selectedVehicle)));
  document.querySelectorAll('[data-action="paint"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===selectedPaint)));
  document.querySelectorAll('[data-action="wheels"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===selectedWheels)));
  $('selected-name').textContent=vehicles[selectedVehicle].name;
  $('selected-paint').textContent=`${paints[selectedPaint].name} · ${setupLabel} · ${vehicleInfo(selectedVehicle).mpg} MPG · $${vehicles[selectedVehicle].cash} starting cash`;
  const route = state ? getRoute(state) : routes[selectedRoute];
  const stop = getStop(state || {route:selectedRoute,miles:0});
  $('location').textContent=stop.name.toUpperCase();$('day').textContent=state?`DAY ${state.day} / ${route.days}`:'CHOOSE YOUR OWN MISFORTUNE';
  $('route-preview').textContent=`${route.stops.map(s=>s[0].split(',')[0]).join(' → ')}. Distance is a game approximation.`;
  $('departure').textContent=`START: ${route.from} → ${route.to}`;
  $('selection').textContent=`Selected: ${vehicles[selectedVehicle].name} · ${paints[selectedPaint].name} · ${setupLabel} · ${route.name}`;
  draw(); if (!state) return;
  try { localStorage.setItem(key, JSON.stringify(state)); $('save-status').textContent = 'Progress saved on this browser.'; } catch { $('save-status').textContent = 'Saving unavailable. Keep this tab open to preserve your trip.'; }
  const ride = vehicleInfo(state.vehicle), pace = $('pace').value;
  const range = Math.floor(state.fuel * ride.mpg / (pace === 'rush' ? 1.3 : 1));
  $('fuel-gauge').max = ride.tank; $('fuel-gauge').value = state.fuel;
  $('fuel-gauge').classList.toggle('fuel-low', state.fuel / ride.tank < .25);
  $('fuel-gauge').setAttribute('aria-valuetext', `${state.fuel.toFixed(1)} of ${ride.tank} gallons. Estimated range ${range} miles.`);
  $('fuel-amount').textContent = `${state.fuel.toFixed(1)} / ${ride.tank} GAL`;
  $('fuel-range').textContent = `~${range.toLocaleString()} MILES LEFT`;
  $('fuel-note').textContent = `${pace === 'rush' ? 'Floor it · 30% more fuel' : pace === 'careful' ? 'Careful driving' : 'Steady driving'} · estimate before events`;
  $('inventory-food').textContent = state.food;
  $('inventory-parts').textContent = state.parts;
  $('inventory-meal-days').textContent = `${Math.floor(state.food / ride.crew)} travel days for ${ride.crew} traveler${ride.crew === 1 ? '' : 's'}`;
  $('progress').max=route.miles;$('progress').value = state.miles;$('progress').setAttribute('aria-label',`Miles to ${route.to}`); $('distance').textContent = `${Math.round(state.miles)} / ${route.miles.toLocaleString()} MI`;
  $('origin').textContent=route.from;$('destination').textContent=route.to;
  $('itinerary').textContent=route.stops.map((s,i)=>`${i===stop.index?'● ':i<stop.index?'✓ ':''}${s[0].split(',')[0]}`).join(' → ');
  $('biome').textContent=`${biomes[stop.biome].name} · ${biomes[stop.biome].flavor}`;
  $('goal').textContent=`Reach ${route.to} within ${route.days} days. Your route is ${route.miles.toLocaleString()} miles.`;
  $('stats').replaceChildren();
  for (const [name, val, danger] of [['CASH', `$${state.cash.toFixed(0)}`, state.cash < 75], ['FUEL', `${state.fuel.toFixed(1)} gal`, state.fuel < 7], ['FOOD', `${state.food} meals`, state.food < 6], ['PARTS', state.parts, state.parts < 1], ['HEALTH', `${state.health}%`, state.health < 30], ['VEHICLE', `${state.condition}%`, state.condition < 25], ['MORALE', `${state.morale}%`, state.morale < 25], ['FATIGUE', `${state.fatigue}%`, state.fatigue > 70]]) { const el = document.createElement('div'); el.className = `stat ${danger ? 'danger' : ''}`; el.innerHTML = `<span>${name}</span><strong>${val}</strong>`; $('stats').append(el); }
  const event = events.find(e => e.id === state.event); $('encounter').replaceChildren();
  const heading = document.createElement('h2'); heading.textContent = state.outcome ? state.miles >= route.miles && state.health > 0 && state.day<=route.days ? 'You survived the American dream.' : 'End of the road.' : event?.title || (state.intoxicated ? 'You need a sober driver.' : 'Another day. Another exit.');
  const p = document.createElement('p'); p.textContent = state.outcome || event?.text || (state.intoxicated ? 'You have been drinking. Camp before driving, or face a crash, injuries, towing costs, and lost time.' : `${route.to} promises a fresh start. It has made no promises about parking.`); $('encounter').append(heading,p);
  if (event && !state.outcome) event.choices.forEach(([label,effect], i) => $('encounter').append(button(label, 'choose', i, !affordable(state,effect))));
  $('controls').hidden = !!event || !!state.outcome;
  const v=vehicleInfo(state.vehicle);
  $('pay').textContent = `Earn $${Math.round(70/state.market)} · 1 day · ${v.crew} meals`;
  $('rest-cost').textContent=`1 day · ${v.crew} meals`;
  $('market').textContent = `${v.type==='diesel'?'Diesel':'Fuel'} $${((v.type==='diesel'?4.15:3.8)*state.market).toFixed(2)}/gal · ${state.market > 1 ? 'Crisis pricing. Your suffering is a market opportunity.' : 'Prices are normal. Normal is still expensive.'}`;
  const locked = !!event || !!state.outcome; $('shop').replaceChildren(); $('barter').replaceChildren();
  for (const id of ['fuel','food','parts']) { const o=offer(state,id); $('shop').append(button(`${o.amount} ${id==='fuel'?'gallons':id==='food'?'meals':'spare part'} — $${o.cost}`, 'buy', id, locked || state.cash < o.cost || !o.amount)); }
  for (const [id,label,min,gain] of [['food','6 meals → 4 gallons',6,4],['parts','1 spare part → 10 gallons',1,10],['fuel','5 gallons → 6 meals',5,0]]) $('barter').append(button(label,'trade',id,locked || state[id]<min || gain>0&&state.fuel+gain>v.tank));
  document.querySelector('[data-action="repair"]').disabled = state.parts < 1 || state.condition >= 100;
  $('log').replaceChildren(); state.log.slice().reverse().forEach(text => { const li = document.createElement('li'); li.textContent = text; $('log').append(li); });
}
function draw() {
  const assets={artwork,scenery,sprites,fleet,fjord,ram,duty,wheelsets,...gasTrucks};
  paint($('landscape'),state,assets);
  if(!state) {
    paintVehiclePreview($('selected-vehicle'),selectedVehicle,selectedPaint,assets,selectedWheels);
    document.querySelectorAll('canvas.vehicle-art').forEach(canvas=>paintVehiclePreview(canvas,canvas.dataset.vehicle,selectedPaint,assets,selectedWheels));
  }
}
render();
if (ranked) void onlineOperation(retryRanked);
