'use strict';
const W = 46,
  H = 30,
  AGES = [
    'Hunter-gatherers',
    'Agrarian Age',
    'Bronze Age',
    'Classical Age',
    'Medieval Age',
    'Industrial Age',
    'Information Age',
    'Space Age',
    'AI Age',
  ];
const TECH = [
  'Gathering & oral traditions',
  'Farming & permanent villages',
  'Metalworking & trade routes',
  'Writing & organized cities',
  'Engineering & fortified towns',
  'Factories & rail networks',
  'Computing & global networks',
  'Orbital habitats & clean energy',
  'Autonomous cities & collective intelligence',
];
const PEOPLES = [
  {
    name: 'Verdant Kin',
    color: '#71dab1',
    trait: 'Born to wander',
    desc: '+25% expansion speed',
    bonus: 'expansion',
  },
  {
    name: 'Solaris Union',
    color: '#f2c879',
    trait: 'Keepers of knowledge',
    desc: '+25% research speed',
    bonus: 'research',
  },
  {
    name: 'Ironbound Clans',
    color: '#adabf5',
    trait: 'Together, unbroken',
    desc: '+25% military strength',
    bonus: 'defense',
  },
];
const COLORS = ['#71dab1', '#e58b79', '#ab9ae2', '#edc66c'];
const $ = (id) => document.getElementById(id);
let state = null,
  chosen = 0,
  mode = 'medium',
  speed = 1,
  selected = -1,
  meta = { sparks: 0, levels: [0, 0, 0] },
  saveWarning = false;
const natural = (value) => Number.isSafeInteger(value) && value >= 0;
const positive = (value) => Number.isFinite(value) && value >= 0;
const levelsValid = (value) =>
  Array.isArray(value) && value.length === 3 && value.every(natural);
function validRun(run) {
  if (
    !run ||
    run.version !== 1 ||
    !['easy', 'medium', 'hard'].includes(run.mode)
  )
    return false;
  const count = { easy: 1, medium: 2, hard: 4 }[run.mode];
  return (
    Array.isArray(run.civs) &&
    run.civs.length === count &&
    run.civs.every(
      (c, id) =>
        c &&
        c.id === id &&
        typeof c.name === 'string' &&
        /^#[0-9a-f]{6}$/i.test(c.color) &&
        ['expansion', 'research', 'defense'].includes(c.bonus) &&
        natural(c.age) &&
        c.age <= 8 &&
        [
          'research',
          'coins',
          'pop',
          'military',
          'expand',
          'build',
          'cityTimer',
          'trade',
        ].every((key) => positive(c[key])),
    ) &&
    Array.isArray(run.map) &&
    run.map.length === W * H &&
    run.map.every(
      (t) =>
        t &&
        typeof t.land === 'boolean' &&
        ['plain', 'forest', 'mountain', 'desert'].includes(t.terrain) &&
        Number.isInteger(t.owner) &&
        t.owner >= -1 &&
        t.owner < count &&
        natural(t.city) &&
        t.city <= 6 &&
        (t.land || (t.owner === -1 && t.city === 0)) &&
        (t.city === 0 || t.owner >= 0),
    ) &&
    levelsValid(run.invest) &&
    levelsValid(run.metaLevels) &&
    ['balanced', 'expansion', 'research', 'defense'].includes(run.focus) &&
    typeof run.over === 'boolean' &&
    typeof run.colonies === 'boolean' &&
    (run.banked === undefined || typeof run.banked === 'boolean') &&
    ['time', 'earned', 'highLand', 'nextDecision'].every((key) =>
      positive(run[key]),
    ) &&
    run.highLand <= 1 &&
    run.relations &&
    typeof run.relations === 'object' &&
    !Array.isArray(run.relations) &&
    Object.entries(run.relations).every(
      ([key, value]) =>
        /^\d-\d$/.test(key) && ['peace', 'war', 'neutral'].includes(value),
    ) &&
    Array.isArray(run.events) &&
    run.events.length <= 30 &&
    run.events.every(
      (e) => e && positive(e.time) && typeof e.text === 'string',
    ) &&
    (run.decision === null ||
      (run.decision &&
        (run.decision.kind === 'council' ||
          (run.decision.kind === 'age' &&
            natural(run.decision.age) &&
            run.decision.age <= 8)))) &&
    (run.speed === undefined || [0, 1, 2, 5, 10].includes(run.speed))
  );
}
let recoveredSave = false;
function readSave(key, validate) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!validate(value)) throw new Error('Invalid save');
    return value;
  } catch {
    recoveredSave = true;
    return null;
  }
}
meta =
  readSave(
    'epoch-meta-v1',
    (m) => m && natural(m.sparks) && levelsValid(m.levels),
  ) || meta;
state = readSave('epoch-run-v1', validRun);
if (state) speed = state.speed ?? 0;
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

// Preserve existing controls while updating text and attributes each simulation tick.
function updateHTML(id, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  function sync(target, source) {
    for (let i = 0; i < source.childNodes.length; i++) {
      const next = source.childNodes[i],
        current = target.childNodes[i];
      if (!current) {
        target.appendChild(next.cloneNode(true));
        continue;
      }
      if (
        current.nodeType !== next.nodeType ||
        current.nodeName !== next.nodeName
      ) {
        current.replaceWith(next.cloneNode(true));
      } else if (next.nodeType === 3) {
        if (current.textContent !== next.textContent)
          current.textContent = next.textContent;
      } else if (next.nodeType === 1) {
        // Snapshot the live attribute collection before removing entries.
        // eslint-disable-next-line unicorn/no-useless-spread
        for (const attribute of [...current.attributes])
          if (!next.hasAttribute(attribute.name))
            current.removeAttribute(attribute.name);
        for (const attribute of next.attributes)
          if (current.getAttribute(attribute.name) !== attribute.value)
            current.setAttribute(attribute.name, attribute.value);
        sync(current, next);
      }
    }
    while (target.childNodes.length > source.childNodes.length)
      target.lastChild.remove();
  }
  sync($(id), template.content);
}
const rand = () => Math.random();
const pick = (a) => a[Math.floor(rand() * a.length)];
const neighbors = (i) => {
  const x = i % W,
    y = Math.floor(i / W);
  return [
    x > 0 ? i - 1 : -1,
    x < W - 1 ? i + 1 : -1,
    y > 0 ? i - W : -1,
    y < H - 1 ? i + W : -1,
  ].filter((n) => n >= 0);
};
const tiles = (id) => state.map.filter((t) => t.owner === id);
const cities = (id) => tiles(id).filter((t) => t.city);
const alive = (c) => tiles(c.id).length > 0;
const costAge = (c) => 70 + c.age * 42;
const relKey = (a, b) => [a, b].sort((x, y) => x - y).join('-');
const relation = (a, b) => state.relations[relKey(a, b)] || 'neutral';
function log(s) {
  state.events.unshift({ time: Math.floor(state.time), text: s });
  state.events = state.events.slice(0, 30);
}
function toast(s) {
  $('toast').textContent = s;
  $('toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}
function save() {
  try {
    localStorage.setItem('epoch-meta-v1', JSON.stringify(meta));
    if (state) {
      state.speed = speed;
      localStorage.setItem('epoch-run-v1', JSON.stringify(state));
    }
  } catch {
    if (!saveWarning) {
      toast(
        'Browser storage is unavailable. Keep this page open to retain your run.',
      );
      saveWarning = true;
    }
  }
}
function mapGen() {
  const phase = rand() * 8;
  return Array.from({ length: W * H }, (_, i) => {
    const x = i % W,
      y = Math.floor(i / W);
    const shore = 2 + Math.sin(y * 0.37 + phase) * 1.5;
    const land =
      x > shore &&
      x < W - 3 - Math.cos(y * 0.32) * 2 &&
      y > 2 + Math.sin(x * 0.22 + phase) * 1.5 &&
      y < H - 3 - Math.cos(x * 0.25) * 1.5;
    const r = rand();
    return {
      land,
      terrain:
        r < 0.17
          ? 'mountain'
          : r < 0.42
            ? 'forest'
            : r < 0.52
              ? 'desert'
              : 'plain',
      owner: -1,
      city: 0,
      build: 0,
    };
  });
}
function start() {
  if (state && !state.over) bankLegacy();
  state = {
    version: 1,
    map: mapGen(),
    civs: [],
    relations: {},
    time: 0,
    events: [],
    focus: 'balanced',
    over: false,
    earned: 0,
    highLand: 0,
    decision: null,
    nextDecision: 40,
    colonies: true,
    mode,
    invest: [0, 0, 0],
    metaLevels: [...meta.levels],
  };
  const count = { easy: 1, medium: 2, hard: 4 }[mode];
  const names = [
    PEOPLES[chosen].name,
    'Ember Dominion',
    'Lunar Assembly',
    'Amber Republic',
  ];
  for (let id = 0; id < count; id++) {
    const positions = [
      [10, 10],
      [35, 20],
      [34, 9],
      [12, 21],
    ];
    const [x, y] = positions[id];
    const c = {
      id,
      name: names[id],
      color: id === 0 ? PEOPLES[chosen].color : COLORS[id],
      bonus:
        id === 0
          ? PEOPLES[chosen].bonus
          : ['defense', 'research', 'expansion'][id - 1],
      age: 0,
      research: 0,
      coins: id === 0 ? 55 + meta.levels[0] * 35 : 40,
      pop: 24,
      military: 1,
      expand: 0,
      build: 0,
      cityTimer: 0,
      trade: 0,
    };
    state.civs.push(c);
    const home = y * W + x;
    state.map[home].land = true;
    state.map[home].owner = id;
    state.map[home].city = 1;
    neighbors(home).forEach((i) => {
      state.map[i].land = true;
      state.map[i].owner = id;
    });
  }
  log('The first campfires are lit. Your people begin their story.');
  speed = 1;
  selected = -1;
  $('setup').close();
  $('ending').close();
  save();
  render();
  draw();
}
function strength(c) {
  return (
    (1 +
      c.age * 0.35 +
      Math.sqrt(tiles(c.id).length) * 0.035 +
      c.military * 0.13) *
    (c.bonus === 'defense' ? 1.25 : 1) *
    (c.id === 0
      ? (1 + state.metaLevels[2] * 0.1) * (state.focus === 'defense' ? 1.65 : 1)
      : state.mode === 'hard'
        ? 1.12
        : 1)
  );
}
function frontier(id) {
  const a = new Set();
  state.map.forEach((t, i) => {
    if (t.owner === id)
      neighbors(i).forEach((j) => {
        if (state.map[j].land && state.map[j].owner !== id) a.add(j);
      });
  });
  return [...a];
}
function expand(c) {
  const f = frontier(c.id),
    open = f.filter((i) => state.map[i].owner === -1);
  if (open.length) {
    const i = pick(open);
    state.map[i].owner = c.id;
    return;
  }
  const enemies = f.filter((i) => relation(c.id, state.map[i].owner) === 'war');
  if (enemies.length) {
    const i = pick(enemies),
      t = state.map[i],
      other = state.civs[t.owner];
    const attack = strength(c),
      def =
        strength(other) *
        (t.terrain === 'mountain' ? 1.3 : 1) *
        (t.city ? 1.25 : 1);
    if (rand() < (attack / (attack + def)) * 0.8) {
      const city = t.city;
      t.owner = c.id;
      c.pop += city ? 8 : 1;
      other.pop = Math.max(5, other.pop - 2);
      if (city) log(c.name + ' captured a settlement from ' + other.name + '.');
      if (!alive(other))
        log(
          other.name +
            ' has fallen. Their territory becomes part of ' +
            c.name +
            '.',
        );
    }
  }
}
function settle(c, forced = false) {
  const slots = [];
  state.map.forEach((t, i) => {
    if (t.owner === c.id && !t.city) {
      const distance = Math.min(
        ...state.map.map((a, j) =>
          a.owner === c.id && a.city
            ? Math.abs((j % W) - (i % W)) +
              Math.abs(Math.floor(j / W) - Math.floor(i / W))
            : 999,
        ),
      );
      if (distance >= 4) slots.push(i);
    }
  });
  if (!slots.length) return false;
  const i = pick(slots);
  state.map[i].city = 1;
  c.pop += 12;
  if (c.id === 0 || forced) log(c.name + ' founded a new colony.');
  return true;
}
function income(c) {
  return (
    (1 +
      tiles(c.id).length * 0.045 +
      cities(c.id).reduce((s, t) => s + t.city * 0.45, 0)) *
    (c.id === 0 ? 1 + state.invest[0] * 0.15 : 1) *
    (1 + c.trade * 0.08)
  );
}
function tick(dt) {
  if (!state || state.over) return;
  state.time += dt;
  for (const c of state.civs) {
    if (!alive(c)) continue;
    const own = tiles(c.id),
      cs = cities(c.id);
    c.coins += income(c) * dt;
    c.pop += dt * (0.18 + cs.length * 0.07) * (1 + c.age * 0.1);
    const focus = c.id === 0 ? state.focus : 'balanced';
    c.research +=
      dt *
      (1.15 + Math.sqrt(own.length) * 0.14) *
      (c.bonus === 'research' ? 1.25 : 1) *
      (focus === 'research' ? 2 : 1) *
      (c.id === 0 ? 1 + state.metaLevels[1] * 0.12 + state.invest[1] * 0.2 : 1);
    if (c.age < 8 && c.research >= costAge(c)) {
      c.research -= costAge(c);
      c.age++;
      log(c.name + ' entered the ' + AGES[c.age] + '.');
      if (c.id === 0) {
        state.decision = { kind: 'age', age: c.age };
        toast(AGES[c.age] + ' unlocked');
      }
    }
    c.expand +=
      dt *
      (0.5 + cs.length * 0.07 + c.age * 0.055) *
      (c.bonus === 'expansion' ? 1.25 : 1) *
      (focus === 'expansion' ? 1.8 : focus === 'defense' ? 0.8 : 1);
    while (c.expand >= 1) {
      c.expand--;
      expand(c);
    }
    c.cityTimer += dt;
    c.build += dt;
    if (c.cityTimer > 24) {
      c.cityTimer = 0;
      if (c.id !== 0 || state.colonies) settle(c);
    }
    if (c.build > 15) {
      c.build = 0;
      const city = pick(cs);
      if (city && city.city < Math.min(6, c.age + 2)) {
        city.city++;
        if (c.id === 0)
          log(
            'A settlement grew to level ' + city.city + '. Income increased.',
          );
      }
      c.military += focus === 'defense' ? 0.4 : 0.12;
    }
    if (c.id !== 0 && c.coins > 90) {
      c.coins -= 80;
      c.military += 0.6;
      c.research += 12;
    }
  }
  if (Math.floor(state.time / 14) !== Math.floor((state.time - dt) / 14))
    diplomacy();
  if (state.time >= state.nextDecision && !state.decision) {
    state.nextDecision = state.time + 75;
    state.decision = { kind: 'council' };
  }
  const mine = tiles(0).length,
    total = state.map.filter((t) => t.land).length;
  state.highLand = Math.max(state.highLand, mine / total);
  const earned = Math.floor(state.highLand * 20) + state.civs[0].age * 2;
  state.earned = Math.max(state.earned, earned);
  if (mine === 0) finish(false);
  else if (mine === total) finish(true);
}
function diplomacy() {
  for (let a = 0; a < state.civs.length; a++)
    for (let b = a + 1; b < state.civs.length; b++) {
      const c = state.civs[a],
        d = state.civs[b];
      if (!alive(c) || !alive(d)) continue;
      const contact = frontier(a).some((i) => state.map[i].owner === b);
      if (!contact) continue;
      const key = relKey(a, b),
        r = relation(a, b);
      if (r === 'neutral') {
        state.relations[key] = rand() < 0.5 ? 'peace' : 'war';
        log(
          c.name +
            ' and ' +
            escapeHTML(d.name) +
            (state.relations[key] === 'peace'
              ? ' opened peaceful trade.'
              : ' went to war over their border.'),
        );
      } else if (r === 'peace') {
        c.trade++;
        d.trade++;
        if (rand() < 0.09) {
          state.relations[key] = 'war';
          log(
            'A border dispute ended peace between ' +
              c.name +
              ' and ' +
              escapeHTML(d.name) +
              '.',
          );
        }
      } else if (rand() < 0.1) {
        state.relations[key] = 'peace';
        log(c.name + ' and ' + d.name + ' agreed to a ceasefire.');
      }
    }
}
function bankLegacy() {
  if (!state || state.banked) return;
  meta.sparks += state.earned;
  state.banked = true;
  save();
}
function finish(win) {
  state.over = true;
  if (win) state.earned += 10;
  bankLegacy();
  $('endTitle').textContent = win
    ? 'One world. Your civilization.'
    : 'An empire ends. A legacy remains.';
  $('endText').textContent =
    'You reached the ' +
    AGES[state.civs[0].age] +
    ' and earned ' +
    state.earned +
    ' legacy sparks. Spend them on permanent upgrades before your next run.';
  $('ending').showModal();
  save();
}
function purchase(type) {
  if (!state || state.over) return;
  const c = state.civs[0],
    cost = [
      40 + state.invest[0] * 25,
      50 + state.invest[1] * 30,
      45 + state.invest[2] * 25,
      70,
    ][type];
  if (c.coins < cost) return;
  if (type === 3 && !settle(c, true)) {
    toast('Your people need more open land for a colony.');
    return;
  }
  c.coins -= cost;
  if (type < 3) state.invest[type]++;
  if (type === 1) c.research += 20;
  if (type === 2) c.military += 1.5;
  log(
    [
      'You funded infrastructure. All settlements earn more coins.',
      'You funded scholars. Research accelerated.',
      'You reinforced the civilization’s defenses.',
      'You funded a settler expedition.',
    ][type],
  );
  save();
  render();
}
function diplomatic(id, action) {
  if (
    !state ||
    state.over ||
    !Number.isInteger(id) ||
    id < 1 ||
    id >= state.civs.length ||
    !['peace', 'war', 'union'].includes(action)
  )
    return;
  const c = state.civs[0],
    d = state.civs[id],
    key = relKey(0, id);
  if (!alive(d)) return;
  if (action === 'peace') {
    if (c.coins < 80) return;
    c.coins -= 80;
    state.relations[key] = 'peace';
    log('Your envoys secured peace and trade with ' + d.name + '.');
  } else if (action === 'war') {
    state.relations[key] = 'war';
    log('You declared war on ' + d.name + '.');
  } else {
    const cost = unionCost(d);
    if (c.coins < cost || relation(0, id) !== 'peace' || c.age < d.age) return;
    c.coins -= cost;
    state.map.forEach((t) => {
      if (t.owner === id) t.owner = 0;
    });
    c.pop += d.pop;
    log(d.name + ' peacefully joined your civilization.');
    toast('Peaceful unification achieved');
  }
  save();
  render();
}
const unionCost = (c) => Math.ceil(150 + tiles(c.id).length * 3);
function council(choice) {
  if (!state || state.over || !state.decision || ![0, 1].includes(choice))
    return;
  const c = state.civs[0];
  if (state.decision.kind === 'age') {
    if (choice === 0) {
      c.research += 30;
      log('Your council enshrined a tradition of discovery.');
    } else {
      c.military += 1.5;
      log('Your council established a defensive tradition.');
    }
  } else {
    if (choice === 0) {
      state.colonies = true;
      settle(c);
      log('Your council authorized autonomous colonies.');
    } else {
      state.colonies = false;
      c.military += 1;
      log('Your council consolidated settlements. Automatic colonies paused.');
    }
  }
  state.decision = null;
  state.nextDecision = state.time + 75;
  save();
  render();
}
function render() {
  if (!state) return;
  const c = state.civs[0],
    own = tiles(0),
    total = state.map.filter((t) => t.land).length,
    cs = cities(0);
  $('worldTitle').textContent =
    c.age < 2
      ? 'The first spark.'
      : c.age < 5
        ? 'A world taking shape.'
        : c.age < 8
          ? 'Beyond the horizon.'
          : 'The age of possibility.';
  $('clock').textContent =
    'YEAR ' +
    Math.floor(state.time * 2 + 1) +
    ' · ' +
    (speed === 0 ? 'PAUSED' : speed + '× SPEED');
  $('legacyCount').textContent = meta.sparks;
  $('civName').textContent = c.name;
  $('civTrait').textContent =
    PEOPLES.find((p) => p.name === c.name)?.desc || '';
  $('coins').textContent = Math.floor(c.coins).toLocaleString();
  $('income').textContent = '+' + income(c).toFixed(1) + ' coins / second';
  $('population').textContent = Math.floor(c.pop).toLocaleString();
  $('cities').textContent = cs.length + ' settlements';
  $('control').textContent = ((own.length / total) * 100).toFixed(1) + '%';
  $('controlBar').style.width = (own.length / total) * 100 + '%';
  $('landCount').textContent =
    own.length +
    ' of ' +
    total +
    ' land tiles · ' +
    state.earned +
    ' legacy sparks earned this run';
  $('ageName').textContent = AGES[c.age];
  $('ageNum').textContent = String(c.age + 1).padStart(2, '0') + ' / 09';
  $('ageDetail').textContent = TECH[c.age];
  $('researchBar').style.width =
    (c.age === 8 ? 100 : Math.min(100, (c.research / costAge(c)) * 100)) + '%';
  $('researchText').textContent =
    c.age === 8
      ? 'The pinnacle of civilization. Unite the world.'
      : Math.floor(c.research) +
        ' / ' +
        costAge(c) +
        ' knowledge → ' +
        AGES[c.age + 1];
  updateHTML(
    'ageTrack',
    AGES.map(
      (a, i) =>
        '<span class="' +
        (i <= c.age ? 'done' : '') +
        '" title="' +
        a +
        '"></span>',
    ).join(''),
  );
  $('modeBadge').textContent = state.mode;
  updateHTML(
    'events',
    state.events
      .slice(0, 6)
      .map(
        (e) =>
          '<div class="event"><time>Y ' +
          (e.time * 2 + 1) +
          '</time><span>' +
          escapeHTML(e.text) +
          '</span></div>',
      )
      .join(''),
  );
  updateHTML(
    'rivals',
    state.civs
      .map((d) => {
        const size = tiles(d.id).length;
        const r =
          d.id === 0 ? 'Your people' : size ? relation(0, d.id) : 'Absorbed';
        return (
          '<div class="rival"><div><span><i class="dot" style="background:' +
          d.color +
          '"></i>' +
          escapeHTML(d.name) +
          '</span><span>' +
          Math.round((size / total) * 100) +
          '%</span></div><small>' +
          r +
          ' · ' +
          AGES[d.age] +
          '</small>' +
          (d.id && size && !state.over
            ? '<button data-dip="peace" data-id="' +
              d.id +
              '" ' +
              (c.coins < 80 ? 'disabled' : '') +
              '>Peace · 80 ◉</button><button data-dip="war" data-id="' +
              d.id +
              '">Declare war</button><button data-dip="union" data-id="' +
              d.id +
              '" ' +
              (c.coins < unionCost(d) || r !== 'peace' || c.age < d.age
                ? 'disabled'
                : '') +
              ' title="Requires peace and an equal or more advanced age">Unify · ' +
              unionCost(d) +
              ' ◉</button>'
            : '') +
          '</div>'
        );
      })
      .join('') +
      (state.civs.length === 1
        ? '<p>Your people have this world to themselves.</p>'
        : ''),
  );
  updateHTML(
    'actions',
    [
      [
        'Build infrastructure',
        '+15% income · level ' + state.invest[0],
        40 + state.invest[0] * 25,
      ],
      [
        'Fund research',
        '+20% research & 20 knowledge',
        50 + state.invest[1] * 30,
      ],
      [
        'Strengthen defenses',
        'More strength in every battle',
        45 + state.invest[2] * 25,
      ],
      ['Send settlers', 'Your people choose the location', 70],
    ]
      .map(
        (a, i) =>
          '<button class="action" data-buy="' +
          i +
          '" ' +
          (c.coins < a[2] || state.over ? 'disabled' : '') +
          '><span><b>' +
          a[0] +
          '</b><small>' +
          a[1] +
          '</small></span><em>' +
          a[2] +
          ' ◉</em></button>',
      )
      .join(''),
  );
  updateHTML(
    'decision',
    state.over
      ? '<p>This chapter is complete. Begin a new civilization to play again.</p>'
      : state.decision
        ? state.decision.kind === 'age'
          ? '<h3>A new age, a new tradition</h3><p>Give this civilization a lasting advantage.</p><button data-choice="0">Pursue knowledge · +30 research</button><button data-choice="1">Protect our people · +1.5 defense</button>'
          : '<h3>Expand or consolidate?</h3><p>Our people are ready for their next chapter.</p><button data-choice="0">Authorize autonomous colonies</button><button data-choice="1">Pause colonies · strengthen defenses</button>'
        : '<p>Your council is tending to the civilization. New decisions arrive as time passes.</p><button id="toggleColonies">Auto-colonies: ' +
          (state.colonies ? 'on' : 'off') +
          '</button>',
  );
  $('speeds')
    .querySelectorAll('button')
    .forEach((b) => b.classList.toggle('active', +b.dataset.speed === speed));
  $('priorities')
    .querySelectorAll('button')
    .forEach((b) => {
      b.classList.toggle('active', b.dataset.focus === state.focus);
      b.disabled = state.over;
    });
}
// Villagers are a visual layer; they never consume resources or alter save data.
let villagers = [],
  villagerMap = null,
  villageTime = 0,
  animationAcc = 0;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
function workerRoute(map, home, owner, seed) {
  const queue = [home],
    parent = new Map([[home, -1]]),
    destinations = [];
  for (let head = 0; head < queue.length && head < 180; head++) {
    const tile = queue[head];
    if (!map[tile].city) destinations.push(tile);
    for (const next of [
      tile - W,
      tile + W,
      tile % W ? tile - 1 : -1,
      tile % W < W - 1 ? tile + 1 : -1,
    ]) {
      if (map[next]?.land && map[next].owner === owner && !parent.has(next)) {
        parent.set(next, tile);
        queue.push(next);
      }
    }
  }
  let target = destinations.length
    ? destinations[seed % destinations.length]
    : home;
  const route = [];
  while (target !== -1) {
    route.unshift(target);
    target = parent.get(target);
  }
  return route;
}
function updateVillagers(dt) {
  if (!state) return;
  if (villagerMap !== state.map) {
    villagers = [];
    villagerMap = state.map;
    villageTime = 0;
  }
  villageTime += dt;
  for (const civ of state.civs) {
    const cities = state.map.flatMap((tile, i) =>
      tile.city && tile.owner === civ.id ? [i] : [],
    );
    if (!cities.length) continue;
    for (let n = 0; n < Math.min(5, cities.length + 2); n++) {
      let worker = villagers.find((v) => v.owner === civ.id && v.number === n);
      if (!worker) {
        worker = {
          owner: civ.id,
          number: n,
          route: workerRoute(
            state.map,
            cities[n % cities.length],
            civ.id,
            n * 17 + 5,
          ),
          progress: n * 0.4,
        };
        villagers.push(worker);
      }
      if (
        worker.route.some((i) => state.map[i].owner !== civ.id) ||
        !state.map[worker.route[0]].city
      ) {
        worker.route = workerRoute(
          state.map,
          cities[n % cities.length],
          civ.id,
          n * 17 + 5,
        );
        worker.progress = 0;
      }
      worker.progress += dt * 1.4;
      const travel = worker.route.length - 1;
      if (worker.progress > travel * 2 + 5) {
        worker.progress = 0;
        worker.route = workerRoute(
          state.map,
          cities[n % cities.length],
          civ.id,
          n * 17 + Math.floor(villageTime),
        );
      }
    }
  }
  villagers = villagers.filter(
    (v) =>
      state.map[v.route[0]]?.city && state.map[v.route[0]].owner === v.owner,
  );
}
function drawVillagers(ctx, cw, ch, ox, oy) {
  if (!state) return;
  for (const worker of villagers) {
    const distance = worker.route.length - 1,
      p = reducedMotion?.matches ? 0 : worker.progress;
    const returning = p > distance + 2;
    const position = Math.max(
      0,
      Math.min(distance, returning ? distance * 2 + 2 - p : p),
    );
    const from = worker.route[Math.floor(position)],
      to = worker.route[Math.min(distance, Math.floor(position) + 1)],
      f = position % 1;
    const x =
      ox +
      ((from % W) * (1 - f) + (to % W) * f + 0.25 + worker.number * 0.1) * cw;
    const y =
      oy + (Math.floor(from / W) * (1 - f) + Math.floor(to / W) * f + 0.7) * ch;
    const unit = Math.max(1, cw / 13),
      working = (p >= distance && p <= distance + 2) || p > distance * 2 + 2;
    const stride = Math.sin(p * 14) * unit;
    ctx.fillStyle = '#0b202a80';
    ctx.beginPath();
    ctx.ellipse(x, y + unit * 2, unit * 2, unit, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#142b35';
    ctx.fillRect(x - unit, y, unit, unit * 2 + stride);
    ctx.fillRect(x + unit, y, unit, unit * 2 - stride);
    ctx.fillStyle = state.civs[worker.owner].color;
    ctx.fillRect(x - unit, y - unit * 3, unit * 3, unit * 3);
    ctx.fillStyle = '#efcc9c';
    ctx.fillRect(x, y - unit * 5, unit * 2, unit * 2);
    ctx.strokeStyle = working ? '#f3dc9c' : '#bd9870';
    ctx.lineWidth = unit;
    ctx.beginPath();
    ctx.moveTo(x + unit * 2, y - unit * 2);
    ctx.lineTo(
      x + unit * 4,
      y - unit * (working ? 3 + Math.sin(p * 12) * 2 : 1),
    );
    ctx.stroke();
    if (returning) {
      ctx.fillStyle = '#d9b471';
      ctx.fillRect(x - unit * 3, y - unit * 3, unit * 2, unit * 3);
    }
  }
}
function draw() {
  if (state && villagerMap !== state.map) updateVillagers(0);
  const cv = $('map'),
    rect = cv.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  cv.width = rect.width * dpr;
  cv.height = rect.height * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const width = rect.width,
    height = rect.height;
  ctx.fillStyle = '#102d40';
  ctx.fillRect(0, 0, width, height);
  const cw = width / (W + 2),
    ch = height / (H + 4),
    ox = cw,
    oy = ch * 2;
  const terrain = {
    plain: '#789576',
    forest: '#426c58',
    mountain: '#7d9290',
    desert: '#c4ab77',
  };
  const map = state ? state.map : previewMap;
  map.forEach((t, i) => {
    const x = ox + (i % W) * cw,
      y = oy + Math.floor(i / W) * ch;
    if (!t.land) {
      const coastal = [
        i - W,
        i + W,
        i % W ? i - 1 : -1,
        i % W < W - 1 ? i + 1 : -1,
      ].some((n) => map[n]?.land);
      if (coastal) {
        ctx.fillStyle = '#24596a';
        ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
      }
      if (i % 7 === 0) {
        ctx.fillStyle = '#48778766';
        ctx.fillRect(x + 2, y + ch * 0.5, cw * 0.4, 1);
      }
      return;
    }
    ctx.fillStyle = terrain[t.terrain];
    ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
    if (t.owner >= 0) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = state.civs[t.owner].color;
      ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
      ctx.globalAlpha = 1;
    }
    // Stable terrain texture: rendering never changes the simulation's random state.
    ctx.fillStyle = i % 3 ? '#ffffff0a' : '#102b2814';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = '#162f2910';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, cw, ch);
    if (t.owner >= 0) {
      ctx.strokeStyle = state.civs[t.owner].color;
      ctx.lineWidth = 1.4;
      [
        [i % W > 0 ? i - 1 : -1, x, y, x, y + ch],
        [i % W < W - 1 ? i + 1 : -1, x + cw, y, x + cw, y + ch],
        [i - W, x, y, x + cw, y],
        [i + W, x, y + ch, x + cw, y + ch],
      ].forEach(([n, a, b, c, d]) => {
        if (!map[n] || map[n].owner !== t.owner) {
          ctx.beginPath();
          ctx.moveTo(a, b);
          ctx.lineTo(c, d);
          ctx.stroke();
        }
      });
    }
    if (t.city) {
      ctx.fillStyle = '#091f30aa';
      ctx.beginPath();
      ctx.ellipse(
        x + cw / 2,
        y + ch * 0.76,
        cw * 0.62,
        ch * 0.28,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      const age = state.civs[t.owner].age;
      for (let building = 0; building < 3; building++) {
        const bx = x + cw * (0.08 + building * 0.28),
          bh = ch * (0.35 + (building === 1 ? 0.22 : 0) + age * 0.035);
        ctx.fillStyle = building === 1 ? '#f6dfae' : '#cbbf9b';
        ctx.fillRect(bx, y + ch * 0.8 - bh, cw * 0.24, bh);
        ctx.fillStyle = age < 4 ? '#a96749' : '#496778';
        ctx.beginPath();
        ctx.moveTo(bx - 1, y + ch * 0.8 - bh);
        ctx.lineTo(bx + cw * 0.12, y + ch * 0.65 - bh);
        ctx.lineTo(bx + cw * 0.24 + 1, y + ch * 0.8 - bh);
        ctx.fill();
        ctx.fillStyle = '#fff0ba';
        ctx.fillRect(
          bx + cw * 0.08,
          y + ch * 0.66 - bh * 0.3,
          Math.max(1, cw * 0.06),
          Math.max(1, ch * 0.09),
        );
      }
    } else if (t.terrain === 'mountain') {
      ctx.fillStyle = '#405b60';
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.2, y + ch * 0.8);
      ctx.lineTo(x + cw * 0.5, y + ch * 0.05);
      ctx.lineTo(x + cw * 0.8, y + ch * 0.8);
      ctx.fill();
      ctx.fillStyle = '#b3c4b9';
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.5, y + ch * 0.05);
      ctx.lineTo(x + cw * 0.8, y + ch * 0.8);
      ctx.lineTo(x + cw * 0.5, y + ch * 0.65);
      ctx.fill();
      ctx.fillStyle = '#edf0d9';
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.5, y + ch * 0.05);
      ctx.lineTo(x + cw * 0.62, y + ch * 0.35);
      ctx.lineTo(x + cw * 0.39, y + ch * 0.32);
      ctx.fill();
    } else if (t.terrain === 'forest') {
      for (let tree = 0; tree < 3; tree++) {
        const tx = x + cw * (0.23 + tree * 0.25),
          ty = y + ch * (tree === 1 ? 0.15 : 0.35);
        ctx.fillStyle = '#203f35';
        ctx.fillRect(tx, ty + ch * 0.25, Math.max(1, cw * 0.07), ch * 0.4);
        ctx.fillStyle = tree === 1 ? '#8aa879' : '#315545';
        ctx.beginPath();
        ctx.moveTo(tx - cw * 0.18, ty + ch * 0.42);
        ctx.lineTo(tx + cw * 0.04, ty);
        ctx.lineTo(tx + cw * 0.23, ty + ch * 0.42);
        ctx.fill();
      }
    }
  });
  drawVillagers(ctx, cw, ch, ox, oy);
  if (selected >= 0) {
    const x = ox + (selected % W) * cw,
      y = oy + Math.floor(selected / W) * ch;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cw, ch);
  }
  if (state)
    state.civs.forEach((c) => {
      const first = state.map.findIndex((t) => t.owner === c.id && t.city);
      if (first < 0) return;
      const x = ox + ((first % W) + 0.5) * cw,
        y = oy + Math.floor(first / W) * ch - 8;
      ctx.font = '600 ' + Math.max(9, width / 90) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#142d31';
      ctx.lineWidth = 4;
      ctx.strokeText(c.name.toUpperCase(), x, y);
      ctx.fillStyle = '#f2f2df';
      ctx.fillText(c.name.toUpperCase(), x, y);
    });
}
const previewMap = mapGen();
function showSetup() {
  $('civChoices').innerHTML = PEOPLES.map(
    (p, i) =>
      '<button data-civ="' +
      i +
      '" class="' +
      (chosen === i ? 'selected' : '') +
      '"><b style="color:' +
      p.color +
      '">' +
      p.name +
      '</b><span>' +
      p.trait +
      '</span><small>' +
      p.desc +
      '</small></button>',
  ).join('');
  $('cancelSetup').hidden = !state;
  $('begin').textContent =
    state && !state.over
      ? 'Bank ' + state.earned + ' sparks & begin again ↗'
      : 'Begin civilization ↗';
  $('setup').showModal();
}
function showLegacy() {
  $('sparkBalance').textContent = meta.sparks + ' sparks available';
  $('upgrades').innerHTML = [
    ['Ancestral wealth', '+35 starting coins per level'],
    ['Inherited wisdom', '+12% research per level'],
    ['Unbroken spirit', '+10% strength per level'],
  ]
    .map(
      (a, i) =>
        '<button data-upgrade="' +
        i +
        '" ' +
        (meta.sparks < (meta.levels[i] + 1) * 4 ? 'disabled' : '') +
        '><b>' +
        a[0] +
        ' · Level ' +
        meta.levels[i] +
        '</b><p>' +
        a[1] +
        ' · Next run</p><span>' +
        (meta.levels[i] + 1) * 4 +
        ' sparks</span></button>',
    )
    .join('');
  if (!$('legacy').open) $('legacy').showModal();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.civ !== undefined) {
    chosen = +b.dataset.civ;
    $('civChoices')
      .querySelectorAll('button')
      .forEach((x) =>
        x.classList.toggle('selected', +x.dataset.civ === chosen),
      );
  }
  if (b.dataset.mode) {
    mode = b.dataset.mode;
    document
      .querySelectorAll('[data-mode]')
      .forEach((x) => x.classList.toggle('selected', x.dataset.mode === mode));
  }
  if (b.dataset.speed !== undefined) {
    speed = +b.dataset.speed;
    render();
    save();
  }
  if (b.dataset.focus && state && !state.over) {
    state.focus = b.dataset.focus;
    render();
    save();
  }
  if (b.dataset.buy !== undefined) purchase(+b.dataset.buy);
  if (b.dataset.dip) diplomatic(+b.dataset.id, b.dataset.dip);
  if (b.dataset.choice !== undefined) council(+b.dataset.choice);
  if (b.dataset.upgrade !== undefined) {
    const i = +b.dataset.upgrade,
      cost = (meta.levels[i] + 1) * 4;
    if (meta.sparks >= cost) {
      meta.sparks -= cost;
      meta.levels[i]++;
      save();
      showLegacy();
      render();
    }
  }
  if (b.id === 'toggleColonies' && state && !state.over) {
    state.colonies = !state.colonies;
    render();
    save();
  }
});
$('begin').onclick = start;
$('newBtn').onclick = showSetup;
$('cancelSetup').onclick = () => $('setup').close();
$('legacyBtn').onclick = showLegacy;
$('closeLegacy').onclick = () => $('legacy').close();
$('again').onclick = () => {
  $('ending').close();
  showSetup();
};
$('setup').addEventListener('cancel', (e) => {
  if (!state) e.preventDefault();
});
$('map').onclick = (e) => {
  if (!state) return;
  const r = $('map').getBoundingClientRect(),
    cw = r.width / (W + 2),
    ch = r.height / (H + 4),
    x = Math.floor((e.clientX - r.left - cw) / cw),
    y = Math.floor((e.clientY - r.top - ch * 2) / ch);
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  inspectTile(y * W + x);
};
$('mapZoom').onclick = () => {
  const zoomed = $('mapZoom').getAttribute('aria-pressed') !== 'true';
  $('mapZoom').setAttribute('aria-pressed', String(zoomed));
  $('mapZoom').textContent = zoomed ? 'Show whole world' : 'Zoom map · 2×';
  $('map').style.width = zoomed ? '200%' : '100%';
  $('map').style.height = zoomed ? '200%' : '100%';
  draw();
};
function inspectTile(index) {
  selected = index;
  const t = state.map[selected];
  $('mapTag').textContent = !t.land
    ? 'OPEN OCEAN'
    : t.terrain.toUpperCase() +
      ' · ' +
      (t.owner < 0 ? 'UNCLAIMED' : state.civs[t.owner].name.toUpperCase()) +
      (t.city ? ' · SETTLEMENT LEVEL ' + t.city : '');
  draw();
}
$('map').addEventListener('keydown', (e) => {
  if (
    !state ||
    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
  )
    return;
  e.preventDefault();
  const index =
    selected < 0 ? state.map.findIndex((t) => t.owner === 0) : selected;
  const current = Math.max(0, index),
    x = current % W,
    y = Math.floor(current / W);
  const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
  const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
  inspectTile(
    Math.max(0, Math.min(H - 1, y + dy)) * W +
      Math.max(0, Math.min(W - 1, x + dx)),
  );
});
document.addEventListener('keydown', (e) => {
  if (
    e.code === 'Space' &&
    !document.querySelector('dialog[open]') &&
    !['BUTTON', 'INPUT'].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    speed = speed === 0 ? 1 : 0;
    render();
    save();
  }
});
window.addEventListener('resize', draw);
window.addEventListener('beforeunload', save);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
let last = performance.now(),
  acc = 0,
  ui = 0;
function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (
    state &&
    !state.over &&
    speed > 0 &&
    !document.querySelector('dialog[open]') &&
    !document.hidden
  ) {
    acc += elapsed * speed;
    while (acc >= 0.25) {
      tick(0.25);
      acc -= 0.25;
    }
    ui += elapsed;
    updateVillagers(elapsed * speed);
    animationAcc += elapsed;
    if (animationAcc >= (reducedMotion?.matches ? 0.25 : 0.05)) {
      draw();
      animationAcc = 0;
    }
    if (ui > 0.25) {
      render();
      ui = 0;
    }
  }
  requestAnimationFrame(frame);
}
setInterval(save, 5000);
if (state) {
  render();
  draw();
  if (state.over) {
    $('endTitle').textContent = 'Your last chapter is complete.';
    $('endText').textContent =
      'Your legacy has been saved. Begin another civilization to continue.';
    $('ending').showModal();
  }
} else {
  draw();
  showSetup();
}
requestAnimationFrame(frame);
if (recoveredSave) {
  $('saveNotice').hidden = false;
  $('saveNotice').textContent =
    'Some saved progress could not be loaded. Valid legacy progress was kept. You can start a new civilization.';
}
