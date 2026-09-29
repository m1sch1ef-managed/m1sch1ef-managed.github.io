import { routes, getRoute, getStop, biomes } from './routes.js';
import { paints } from './paint.js';
export const vehicles = {
  gaschevy: {name:'Chore-Rolet Square Debt 1500',mpg:18,wear:3,cash:580,color:'#6483a0',type:'gas-truck',crew:3,tank:30,note:'Nineties square-body gas pickup. Straight body lines. Complicated finances.'},
  gasford: {name:'Fjord F-One-Filthy',mpg:19,wear:3,cash:540,color:'#476f58',type:'gas-truck',crew:3,tank:30,note:'Boxy old-school half-ton. Runs on gasoline and optimistic maintenance records.'},
  gasdodge: {name:'Battering Budget 1500',mpg:17,wear:3,cash:620,color:'#89404c',type:'gas-truck',crew:3,tank:30,note:'Rounded nineties gas pickup. Big hood, small emergency fund.'},
  fjord: { name:'Fjord F-Too-Fiddy', mpg:15, wear:3, cash:380, color:'#913832', type:'diesel', crew:3, tank:38, sprite:0, note:'Boxy heavy-duty diesel. It tows everything except your credit score.' },
  ram: { name:'Battering Debt 2500', mpg:14, wear:4, cash:440, color:'#b5b4a8', type:'diesel', crew:3, tank:38, sprite:0, note:'Raised big-rig hood, loaded expedition bed, bigger repair estimates. Diesel-powered denial.' },
  duty: { name:'Chore-Rolet Debt Duty', mpg:17, wear:3, cash:320, color:'#4e647d', type:'diesel', crew:3, tank:36, sprite:0, note:'Tall HD hood, big tow mirrors, expedition cargo. Heavy-duty diesel. Light-duty savings.' },
  cruiser: { name:'Hardly Affordable', mpg:43, wear:4, cash:400, color:'#3d4145', type:'cruiser', crew:1, tank:12, sprite:2, note:'Low V-twin cruiser. Freedom is loud and billed weekly.' },
  redline: { name:'Hahnda Redline Regret', mpg:42, wear:3, cash:320, color:'#c9483e', type:'sport', crew:1, tank:12, sprite:1, note:'Red full-fairing superbike. Your emergency contact rides pillion in spirit.' },
  yama: { name:'Yama-Haha R-Debt', mpg:40, wear:4, cash:350, color:'#465fc5', type:'sport', crew:1, tank:12, sprite:1, note:'Blue angular superbike. Zero to bad decision in three seconds.' },
  kawa: { name:'Kawa-Sock-It Paycheck', mpg:38, wear:4, cash:390, color:'#7fc342', type:'sport', crew:1, tank:12, sprite:1, note:'Green supersport. The only thing greener is the finance manager.' },
  suzi: { name:'Su-Zoom-Me Court Date', mpg:41, wear:3, cash:300, color:'#b8c8dd', type:'sport', crew:1, tank:12, sprite:1, note:'Silver-blue aerodynamic missile. Built for tracks. Financed for traffic.' },
  tahno: { name:'Tow-Hoe & Behold', mpg:18, wear:3, cash:420, color:'#46566c', type:'suv', crew:3, tank:30, sprite:3, note:'Wide full-size SUV. Seats eight; financially supports none.' },
  escalater: { name:'Escaladebt Platinum', mpg:16, wear:4, cash:260, color:'#d6d2bc', type:'suv', crew:3, tank:30, sprite:3, note:'Tall luxury grille. Champagne interior, tap-water budget.' },
  expedition: { name:'Expen-dition Maxed', mpg:19, wear:3, cash:360, color:'#789183', type:'suv', crew:3, tank:30, sprite:3, note:'Long square family SUV. Every expedition starts with a loan application.' },
  minivan: { name:'Custody Shuttle LX', mpg:26, wear:2, cash:520, color:'#ac9074', type:'minivan', crew:3, tank:24, sprite:4, note:'Sliding doors. Sensible mileage. Absolutely no street credibility.' },
  sedan: { name:'Mediocrity Beige Edition', mpg:34, wear:2, cash:480, color:'#b6aa88', type:'sedan', crew:3, tank:20, sprite:5, note:'Three-box commuter. The closest thing here to a good decision.' },
  truck: { name: 'Lifted Pickup / Lowered Expectations', mpg: 14, wear: 4, cash: 380, color: '#a4453e' },
  wagon: { name: '2008 Station Wagon', mpg: 28, wear: 3, cash: 450, color: '#df9c67' },
  van: { name: 'The Apartment on Wheels', mpg: 19, wear: 2, cash: 600, color: '#87aba0' },
  hybrid: { name: 'Financed Hybrid', mpg: 46, wear: 2, cash: 320, color: '#bdc2c6' },
};
export const vehicleInfo = id => ({ type:'car',crew:3,tank:36,note:'A fresh start, sold as-is.',...vehicles[id] });
export function offer(s, item) {
  if (item === 'fuel') { const amount=Math.round(Math.max(0,Math.min(10,vehicleInfo(s.vehicle).tank-s.fuel))*10)/10; return {amount,cost:Math.ceil(amount*(vehicleInfo(s.vehicle).type==='diesel'?4.15:3.8)*s.market)}; }
  return item==='food'?{amount:9,cost:Math.round(18*s.market)}:item==='parts'?{amount:1,cost:Math.round(42*s.market)}:null;
}
export const stops = ['Independence, MO', 'Lincoln, NE', 'North Platte, NE', 'Cheyenne, WY', 'Rock Springs, WY', 'Twin Falls, ID', 'Boise, ID', 'Bend, OR', 'Portland, OR'];
export function start(vehicle = 'wagon', routeId = 'oregon', paint = 'factory', wheels = 'stock') {
  if (!Object.hasOwn(vehicles,vehicle) || !Object.hasOwn(routes,routeId)) throw new Error('Unknown vehicle or route');
  const route = routes[routeId];
  return { version: 1, wheels: wheels === "black" ? "black" : "stock", route: routeId, paint: Object.hasOwn(paints,paint) ? paint : "factory", vehicle, day: 1, miles: 0, cash: vehicles[vehicle].cash, fuel: Math.min(32,vehicleInfo(vehicle).tank), food: 30, parts: 3, health: 100, morale: 80, condition: 100, market: 1, fatigue: 0, intoxicated: false, event: null, outcome: null, log: [`Your lease ended. ${route.to} is ${route.miles.toLocaleString()} miles away.`, `Departing ${route.from}. Arrive by day ${route.days}. ${vehicleInfo(vehicle).crew} traveler(s). Your bills are coming with you.`], visited: 0 };
}
export const events = [
  { id:'heat', regional:true, title:'Your radiator is making soup.', text:'The desert is 112 degrees. The engine says 113. Nobody likes being outdone.', choices:[ ['Cool off in the shade · 1 day, 3 meals', {day:1,food:-3,fatigue:-20}], ['Replace a hose · 1 part', {parts:-1,condition:8}], ['Trust the dashboard vibes', {condition:-28,health:-10}] ] },
  { id:'flood', regional:true, title:'The road has become a subscription aquarium.', text:'Storm surge has flooded the coastal highway. Your vehicle’s amphibious rating is “absolutely not.”', choices:[ ['Follow the detour · 5 gal, 1 day', {fuel:-5,day:1}], ['Wait on high ground · 6 meals, 2 days', {food:-6,day:2,fatigue:-35}], ['Try driving through', {condition:-35,health:-18,morale:-10}] ] },
  { id:'gator', regional:true, title:'The speed bump has teeth.', text:'An alligator occupies the bayou access road. It has right of way and no insurance.', choices:[ ['Wait for the local professional · 1 day', {day:1,food:-3,fatigue:-15}], ['Use the long way around · 4 gal', {fuel:-4}], ['Honk until nature apologizes', {condition:-18,morale:-14}] ] },
  { id:'snow', regional:true, title:'All-wheel drive. No-wheel stop.', text:'The pass is iced over. Your GPS says “continue straight.” The guardrail suggests otherwise.', choices:[ ['Fit chains and wait · 1 part, 1 day', {parts:-1,day:1,fatigue:-15}], ['Take the lower pass · 6 gal', {fuel:-6}], ['Declare yourself a rally driver', {condition:-30,health:-22,morale:-8}] ] },
  { id:'parking', regional:true, title:'You have died of convenience fees. Almost.', text:'Downtown parking is $48, plus a service fee for the service of charging the fee.', choices:[ ['Pay the meter’s ransom · $48', {cash:-48,morale:-4}], ['Park outside town · 3 gal', {fuel:-3,fatigue:6}], ['Ignore the sign', {cash:-85,morale:-10,forced:true}] ] },
  { id: 'burnout', title: 'Your transmission has left the chat.', text: 'Someone says “do a burnout.” Your truck has 230,000 miles and the structural integrity of a campaign promise.', choices: [ ['Decline. Remain tragically employable.', { morale: -4 }], ['Do it for twelve internet strangers', { condition: -32, morale: 10, fuel: -3 }], ['Film someone else’s financial mistake', { morale: 6, day: 1, food: -3 }] ] },
  { id: 'subscription', title: 'Your heated seats require a subscription.', text: 'The car app offers Premium Comfort. The free tier includes the sensation of being alive in February.', choices: [ ['Wear two hoodies', { morale: -5 }], ['Subscribe · $24', { cash: -24, morale: 8 }], ['Trade 3 meals for a blanket', { food: -3, morale: 5 }] ] },
  { id: 'insurance', title: 'Your insurer discovered weather.', text: 'Your policy excludes acts of God, acts of other drivers, and acts involving your actual vehicle.', choices: [ ['Buy roadside cover · $80', { cash: -80, condition: 16 }], ['Become your own claims department', { parts: -1, condition: 10 }], ['Accept the risk', { morale: -12 }] ] },
  { id: 'influencer', title: 'Exposure cannot be pumped into a tank.', text: 'A travel influencer offers payment in visibility. The gas station currently accepts money and barely tolerates people.', choices: [ ['Negotiate actual money · $35 + day', { cash: 35, day: 1, food: -3 }], ['Accept exposure', { morale: -8 }], ['Trade 4 meals for their emergency fuel', { food: -4, fuel: 6 }] ] },
  { id: 'medical', title: 'The urgent care has surge pricing.', text: 'Your crew caught a nasty roadside bug. The receptionist asks whether your insurance is a real plan or a vision board.', choices: [ ['Pay for treatment · $95', { cash: -95, health: 12 }], ['Rest and hydrate · 2 days, 6 meals', { day: 2, food: -6, health: -4, fatigue: -40 }], ['Walk it off · health −22', { health: -22, morale: -10 }] ] },
  { id: 'crash', title: 'Brake lights. Then broken glass.', text: 'A distracted driver clips your bumper. Everyone is shaken. The radiator is not okay.', choices: [ ['Patch it yourself · 1 part', { parts: -1, condition: -8, morale: -5 }], ['Roadside mechanic · $110', { cash: -110, condition: 5 }], ['Limp onward · vehicle −24', { condition: -24, health: -8 }] ] },
  { id: 'crashmarket', title: 'The economy hit a pothole.', text: 'Markets tumble. Your emergency savings lose $90, gig work dries up, and fuel supply gets expensive. Barter suddenly looks pretty good.', choices: [ ['Replan around the downturn', { cash: -90, market: 0.45, morale: -10 }], ['Sell a spare part to cover losses', { parts: -1, cash: -25, market: 0.45, morale: -5 }] ] },
  { id: 'food', title: 'The cooler was unplugged.', text: 'Eight meals spent all afternoon getting warm. The gas station sushi is looking back at you.', choices: [ ['Throw it out · 8 meals', { food: -8, morale: -3 }], ['Buy fresh food · $35', { cash: -35, food: 2 }], ['Eat it anyway · illness risk', { risk: 'food' }] ] },
  { id: 'bar', title: 'Last call at the Last Exit.', text: 'A roadside bar offers a cheap night of forgetfulness. Tomorrow still needs a driver.', choices: [ ['Soda and a sober ride · $8', { cash: -8, morale: 7 }], ['Drink, then sleep here · $28 + day', { cash: -28, morale: 15, day: 1, fatigue: -40 }], ['Drink and get back behind the wheel', { intoxicated: true, morale: 3 }] ] },
  { id: 'fire', title: 'The sky has turned orange.', text: 'A wildfire closes the highway. The official detour is long. An unpaved shortcut is hard on tires.', choices: [ ['Take the detour · 5 gal + day', { fuel: -5, day: 1, morale: -5 }], ['Dirt road · 1 part, vehicle −8', { parts: -1, condition: -8 }], ['Wait for clearance · 6 meals + day', { food: -6, day: 1, fatigue: -20 }] ] },
  { id: 'rent', title: 'Portland called. Rent went up.', text: 'The room you found online now requires a bigger deposit. Your friend can hold a couch, but pride is expensive.', choices: [ ['Reserve the room · $100', { cash: -100, morale: 15 }], ['Take the couch. Bring snacks.', { food: -3, morale: 5 }] ] },
  { id: 'stranger', title: 'Someone else is running on empty.', text: 'A stranded nurse needs fuel. Her trunk has medical supplies and she knows engines.', choices: [ ['Trade 4 gallons for repairs', { fuel: -4, condition: 22, health: 8 }], ['Share 3 meals', { food: -3, morale: 12 }], ['Wish her luck', { morale: -4 }] ] },
  { id: 'scam', title: 'URGENT: your toll is overdue.', text: 'A text demands immediate payment. There is no toll road here. The crew debates it for twenty minutes.', choices: [ ['Delete the scam', { morale: 3 }], ['Pay it just in case · $45', { cash: -45, morale: -8 }] ] },
  { id: 'storm', title: 'Hail the size of bad decisions.', text: 'A severe storm rolls across the plains. The overpass is crowded and visibility is falling.', choices: [ ['Find a motel · $65 + day', { cash: -65, day: 1, health: 8, fatigue: -35 }], ['Park safely and wait · 3 meals', { food: -3, day: 1, morale: -5 }], ['Push through', { condition: -18, health: -10, fatigue: 15 }] ] },
  { id: 'layoff', title: 'Your remote job went remote without you.', text: 'The company eliminated your contract. A diner is hiring for one shift, and a trucker wants help unloading.', choices: [ ['Wash dishes · earn $65 + day', { cash: 65, day: 1, fatigue: 15 }], ['Unload freight · earn $100, health −10', { cash: 100, health: -10, fatigue: 20 }], ['Keep your momentum', { morale: -8 }] ] },
];
export function affordable(s, effect) {
  return ['cash', 'fuel', 'food', 'parts'].every(k => !(effect[k] < 0) || s[k] + effect[k] >= 0 || k === 'cash' && (effect.market || effect.forced));
}
function finish(s) {
  const route = getRoute(s);
  for (const k of ['cash', 'fuel', 'food', 'parts']) s[k] = Math.max(0, Math.round(s[k] * 10) / 10);
  for (const k of ['health', 'morale', 'condition', 'fatigue']) s[k] = Math.max(0, Math.min(100, s[k]));
  if (s.health <= 0) s.outcome = 'The trip ends at the hospital. Everyone needs a fresh start.';
  else if (s.day > route.days) s.outcome = 'Your relocation deadline expired. You settle along the route. Your five-year plan is now a gas-station application.';
  else if (s.miles >= route.miles) { s.miles = route.miles; s.visited = route.stops.length-1; s.event = null; s.outcome = `You made it to ${route.to} in ${s.day} days with $${s.cash.toFixed(0)}. You did not defeat capitalism. You did find a couch. Tonight, that counts.`; }
  s.log = s.log.slice(-40);
  return s;
}
export function act(state, action, value, random = Math.random) {
  const s = structuredClone(state);
  if (s.outcome || (s.event && action !== 'choose')) return s;
  const note = text => s.log.push(`Day ${s.day}: ${text}`);
  if (action === 'choose') {
    const event = events.find(e => e.id === s.event);
    const choice = event?.choices[value];
    if (!choice || !affordable(s, choice[1])) return s;
    for (const [k, v] of Object.entries(choice[1])) {
      if (k === 'risk') { const sick = random() < 0.7; s.health -= sick ? 26 : 0; note(sick ? 'Food poisoning. Your stomach has filed a formal complaint.' : 'You got lucky with the cooler food.'); }
      else if (k === 'intoxicated') s[k] = v;
      else if (k !== 'forced') s[k] += k==='health' && v<0 && ['sport','cruiser'].includes(vehicleInfo(s.vehicle).type) ? Math.round(v*1.3) : v;
    }
    note(choice[0]); s.event = null;
  } else if (action === 'drive') {
    const pace = value || 'steady';
    const miles = pace === 'careful' ? 90 : pace === 'rush' ? 170 : 130;
    const fuel = miles / vehicles[s.vehicle].mpg * (pace === 'rush' ? 1.3 : 1);
    if (s.fuel < fuel || s.condition < 15) { note('Cannot depart: you need enough fuel and at least 15 vehicle condition. Trade, repair, or work here.'); return finish(s); }
    s.fuel -= fuel; s.food -= vehicleInfo(s.vehicle).crew; s.day++; s.miles += miles;
    s.condition -= vehicles[s.vehicle].wear + (pace === 'rush' ? 5 : 0);
    s.fatigue += pace === 'rush' ? 25 : pace === 'careful' ? 9 : 16;
    s.morale -= 2;
    if (s.morale < 20) { s.health -= 5; note('Morale is underground. The crew argues over whose dream this was.'); }
    if (s.food < 0) { s.health -= 14; note('No food left. The crew is getting weak.'); }
    if (s.fatigue > 75) { s.health -= 8; s.condition -= 7; note('Exhaustion slows your reactions and wears everyone down.'); }
    if (s.intoxicated) { s.health -= 25; s.condition -= 30; s.cash -= 180; s.miles -= miles; s.day++; s.intoxicated = false; note('Impaired driving caused a crash. Injuries, towing, and two lost days.'); }
    else { note(`Drove ${miles} miles. ${Math.max(0, getRoute(s).miles - s.miles)} to ${getRoute(s).to}.`); if (random() < (pace === 'rush' ? .9 : .72)) { const pool = events.filter(e => !e.regional && !['fire','storm'].includes(e.id)); const hazard = biomes[getStop(s).biome].hazard; s.event = random() < .32 ? hazard : pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].id; } }
    const stop = getStop(s);
    if (stop.index > s.visited) { s.visited = stop.index; note(`Welcome to ${stop.name}. ${biomes[stop.biome].flavor}`); }
  } else if (action === 'rest') { s.day++; s.food -= vehicleInfo(s.vehicle).crew; s.fatigue -= 45; s.health += 12; s.morale += 9; s.intoxicated = false; if (s.food < 0) s.health -= 16; note('Camped for the night. The designated driver slept it off.'); }
  else if (action === 'work') { const pay = Math.round(70 / s.market); s.cash += pay; s.day++; s.food -= vehicleInfo(s.vehicle).crew; s.fatigue += 18; if (s.food < 0) s.health -= 14; note(`Completed a local shift. Earned $${pay}.`); }
  else if (action === 'repair' && s.parts >= 1) { s.parts--; s.condition += 28; note('A spare part and a tutorial later: vehicle +28.'); }
  else if (action === 'buy') {
    const o = offer(s,value);
    if (o && o.amount>0 && s.cash >= o.cost) { s.cash -= o.cost; s[value] += o.amount; note(`Bought ${o.amount} ${value}.`); }
  } else if (action === 'trade') {
    const trades = { food: ['food', 6, 'fuel', 4], parts: ['parts', 1, 'fuel', 10], fuel: ['fuel', 5, 'food', 6] };
    const t = trades[value];
    if (t && s[t[0]] >= t[1] && (t[2]!=='fuel'||s.fuel+t[3]<=vehicleInfo(s.vehicle).tank)) { s[t[0]] -= t[1]; s[t[2]] += t[3]; note(`Bartered ${t[1]} ${t[0]} for ${t[3]} ${t[2]}. No bank required.`); }
  }
  const bills = Math.floor(s.day / 7) - Math.floor(state.day / 7);
  if (bills > 0) { const due = bills * (s.vehicle === 'hybrid' ? 100 : 65); if (s.cash < due) { s.morale -= 12; s.health -= 8; } s.cash -= due; note(`Weekly phone, insurance, and ${s.vehicle === 'hybrid' ? 'car payment' : 'existence'} bills: $${due}. Being alive auto-renewed.`); }
  s.market = Math.min(3, s.market);
  s.fuel = Math.min(s.fuel,vehicleInfo(s.vehicle).tank);
  return finish(s);
}



