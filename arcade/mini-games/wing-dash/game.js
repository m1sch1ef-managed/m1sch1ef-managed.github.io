(() => {
  const c = document.getElementById('game'),
    x = c.getContext('2d'),
    $ = (id) => document.getElementById(id);
  const leaderboard = createMiniLeaderboard('wing-dash');
  const runKey = 'mini-wing-run';
  let state = 'ready',
    bird = { x: 205, y: 240, vy: 0 },
    gates = [],
    score = 0,
    best = arcadeReadBest('mini-wing-best'),
    distance = 0,
    last = 0,
    muted = false,
    lastSaved = 0;
  const W = 800,
    H = 480,
    ground = 440;
  $('best').textContent = best;
  function sound(f, d = 0.08) {
    if (!muted) arcadeSound(f, d, 'sine', 0.05);
  }
  function hud() {
    $('score').textContent = score;
    $('best').textContent = best;
    $('speed').textContent =
      (1 + Math.floor(score / 7) * 0.15).toFixed(2) + '×';
  }
  function show(title, message, action) {
    $('heading').textContent = title;
    $('message').textContent = message;
    $('start').textContent = action;
    $('overlay').hidden = false;
  }
  function hide() {
    $('overlay').hidden = true;
  }
  function saveRun(force = false) {
    const now = performance.now();
    if (!force && now - lastSaved < 2000) return;
    lastSaved = now;
    arcadeSaveRun(runKey, { bird, gates, score, distance });
  }
  function restore() {
    const saved = arcadeLoadRun(runKey);
    if (
      !saved ||
      !saved.bird ||
      !['x', 'y', 'vy'].every((key) => Number.isFinite(saved.bird[key])) ||
      !Array.isArray(saved.gates) ||
      saved.gates.length > 12 ||
      !saved.gates.every(
        (g) =>
          Number.isFinite(g.x) &&
          Number.isFinite(g.top) &&
          Number.isFinite(g.gap) &&
          typeof g.scored === 'boolean',
      ) ||
      !Number.isSafeInteger(saved.score) ||
      saved.score < 0 ||
      !Number.isFinite(saved.distance)
    )
      return false;
    ({ bird, gates, score, distance } = saved);
    best = arcadeBest('mini-wing-best', score);
    state = 'paused';
    hud();
    show(
      'Flight restored',
      'Your bird is waiting where you left it.',
      'Resume flight',
    );
    if (!leaderboard.hasRun()) void leaderboard.newRun();
    draw();
    return true;
  }
  function fresh() {
    arcadeClearRun(runKey);
    void leaderboard.newRun();
    state = 'ready';
    bird = { x: 205, y: 240, vy: 0 };
    gates = [];
    score = 0;
    distance = 0;
    hud();
    show(
      'Wing Dash',
      'Tap, click, or press Space to flap through the gates. Time your wingbeats to stay in the gap.',
      'Play game',
    );
    draw();
  }
  function begin() {
    if (state === 'over') fresh();
    if (state === 'ready' || state === 'paused') {
      state = 'play';
      hide();
      last = performance.now();
      requestAnimationFrame(frame);
      flap();
      saveRun(true);
    }
  }
  function flap() {
    if (state !== 'play') return;
    bird.vy = -310;
    sound(560, 0.055);
  }
  function end() {
    state = 'over';
    arcadeClearRun(runKey);
    leaderboard.submit(score, true);
    best = arcadeBest('mini-wing-best', score);
    hud();
    show(
      'Flight over',
      `You cleared ${score} ${score === 1 ? 'gate' : 'gates'}. Try another run?`,
      'Fly again',
    );
    sound(150, 0.25);
  }
  function pause() {
    if (state === 'play') {
      state = 'paused';
      saveRun(true);
      show('Paused', 'Your flight is waiting.', 'Resume flight');
    } else if (state === 'paused') {
      state = 'play';
      hide();
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }
  function update(dt) {
    const speed = 195 + Math.floor(score / 7) * 28;
    distance += speed * dt;
    bird.vy = Math.min(430, bird.vy + 840 * dt);
    bird.y += bird.vy * dt;
    if (!gates.length || gates[gates.length - 1].x < W - 290) {
      const gap = 154 - Math.min(30, Math.floor(score / 6) * 6),
        top = 55 + Math.random() * (ground - gap - 105);
      gates.push({ x: W + 30, top, gap, scored: false });
    }
    for (const g of gates) {
      g.x -= speed * dt;
      if (!g.scored && g.x + 72 < bird.x) {
        g.scored = true;
        score++;
        best = arcadeBest('mini-wing-best', score);
        leaderboard.submit(score);
        hud();
        sound(850, 0.12);
      }
      if (
        bird.x + 16 > g.x &&
        bird.x - 16 < g.x + 72 &&
        (bird.y - 14 < g.top || bird.y + 14 > g.top + g.gap)
      ) {
        end();
        return;
      }
    }
    gates = gates.filter((g) => g.x > -90);
    if (bird.y < 16 || bird.y + 15 >= ground) {
      end();
    }
  }
  function draw() {
    x.fillStyle = '#113343';
    x.fillRect(0, 0, W, H);
    const shift = (distance * 0.1) % W;
    x.fillStyle = '#234e58';
    for (let i = -1; i < 4; i++) {
      const cx = i * 310 - (shift % 310);
      x.beginPath();
      x.arc(cx, ground + 100, 180, Math.PI, 0);
      x.fill();
    }
    x.fillStyle = '#d8ff3e';
    x.beginPath();
    x.arc(640, 90, 38, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffffff18';
    for (let i = 0; i < 12; i++) {
      const sx = ((i * 89 - ((distance * 0.24) % 900) + 900) % 900) - 50,
        sy = 50 + (i % 4) * 60;
      x.fillRect(sx, sy, 24, 3);
    }
    for (const g of gates) {
      x.fillStyle = '#ff6d55';
      x.fillRect(g.x, 0, 72, g.top);
      x.fillRect(g.x, g.top + g.gap, 72, ground - g.top - g.gap);
      x.fillStyle = '#ffb18e';
      x.fillRect(g.x - 6, g.top - 17, 84, 17);
      x.fillRect(g.x - 6, g.top + g.gap, 84, 17);
      x.fillStyle = '#08202b';
      for (let yy = 22; yy < g.top - 18; yy += 34)
        x.fillRect(g.x + 16, yy, 40, 5);
      for (let yy = g.top + g.gap + 29; yy < ground; yy += 34)
        x.fillRect(g.x + 16, yy, 40, 5);
    }
    x.fillStyle = '#d8ff3e';
    x.fillRect(0, ground, W, H - ground);
    x.fillStyle = '#071a2c';
    for (let i = 0; i < W; i += 42)
      x.fillRect((i - ((distance * 0.7) % 42) + 42) % W, ground + 12, 24, 5);
    x.save();
    x.translate(bird.x, bird.y);
    x.rotate(Math.max(-0.4, Math.min(0.8, bird.vy / 600)));
    x.fillStyle = '#f2ce77';
    x.beginPath();
    x.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ff6d55';
    x.beginPath();
    x.ellipse(-7, 7, 12, 6, -0.3, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(8, -5, 5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#071a2c';
    x.beginPath();
    x.arc(10, -5, 2, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#d8ff3e';
    x.beginPath();
    x.moveTo(18, 1);
    x.lineTo(29, 5);
    x.lineTo(18, 9);
    x.fill();
    x.restore();
  }
  function frame(t) {
    if (state !== 'play') return;
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    update(dt);
    draw();
    if (state === 'play') {
      saveRun();
      requestAnimationFrame(frame);
    }
  }
  $('start').onclick = begin;
  $('restart').onclick = fresh;
  $('pause').onclick = pause;
  $('sound').onclick = () => {
    muted = !muted;
    $('sound').textContent = muted ? 'Sound off' : 'Sound on';
  };
  c.addEventListener('pointerdown', () => {
    if (state === 'ready' || state === 'over') begin();
    else flap();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      if (state === 'ready' || state === 'over') begin();
      else flap();
    }
    if (e.code === 'KeyP') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') pause();
  });
  if (!restore()) fresh();
})();
