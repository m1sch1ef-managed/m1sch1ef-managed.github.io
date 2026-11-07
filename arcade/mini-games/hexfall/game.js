(() => {
  const c = document.getElementById('game'),
    x = c.getContext('2d'),
    $ = (id) => document.getElementById(id);
  const leaderboard = createMiniLeaderboard('hexfall');
  const runKey = 'mini-hex-run';
  const colors = ['#ff6d55', '#f2ce77', '#72e4ba', '#79aaff'],
    cx = 350,
    cy = 310,
    inner = 57,
    step = 30,
    maxDepth = 7;
  let stacks = Array.from({ length: 6 }, () => []),
    fall = null,
    state = 'ready',
    score = 0,
    best = arcadeReadBest('mini-hex-best'),
    cleared = 0,
    last = 0,
    muted = false,
    spin = 0,
    gesture = null,
    lastSaved = 0;
  $('best').textContent = best;
  function sound(f, d = 0.08) {
    if (!muted) arcadeSound(f, d, 'triangle', 0.045);
  }
  function hud() {
    $('score').textContent = score;
    $('best').textContent = best;
    $('cleared').textContent = cleared;
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
    arcadeSaveRun(runKey, { stacks, fall, score, cleared });
  }
  function restore() {
    const saved = arcadeLoadRun(runKey);
    if (
      !saved ||
      !Array.isArray(saved.stacks) ||
      saved.stacks.length !== 6 ||
      !saved.stacks.every(
        (stack) =>
          Array.isArray(stack) &&
          stack.length < maxDepth &&
          stack.every(
            (color) => Number.isInteger(color) && color >= 0 && color < 4,
          ),
      ) ||
      !saved.fall ||
      !Number.isInteger(saved.fall.lane) ||
      saved.fall.lane < 0 ||
      saved.fall.lane > 5 ||
      !Number.isInteger(saved.fall.color) ||
      saved.fall.color < 0 ||
      saved.fall.color > 3 ||
      !Number.isFinite(saved.fall.r) ||
      !Number.isSafeInteger(saved.score) ||
      saved.score < 0 ||
      !Number.isSafeInteger(saved.cleared) ||
      saved.cleared < 0
    )
      return false;
    ({ stacks, fall, score, cleared } = saved);
    best = arcadeBest('mini-hex-best', score);
    state = 'paused';
    hud();
    show(
      'Run restored',
      'Your hexagon is ready to keep spinning.',
      'Resume game',
    );
    if (!leaderboard.hasRun()) void leaderboard.newRun();
    draw();
    return true;
  }
  function angle(lane) {
    return -Math.PI / 2 + (lane * Math.PI) / 3;
  }
  function fresh() {
    arcadeClearRun(runKey);
    void leaderboard.newRun();
    stacks = Array.from({ length: 6 }, () => []);
    score = 0;
    cleared = 0;
    spin = 0;
    fall = {
      lane: Math.floor(Math.random() * 6),
      color: Math.floor(Math.random() * 4),
      r: 292,
    };
    state = 'ready';
    hud();
    show(
      'Hexfall',
      'Blocks arrive from six directions. Rotate your stacks and connect at least three of the same color before the tower reaches the edge.',
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
      saveRun(true);
    }
  }
  function pause() {
    if (state === 'play') {
      state = 'paused';
      saveRun(true);
      show('Paused', 'Your stacks are holding steady.', 'Resume');
    } else if (state === 'paused') begin();
  }
  function rotate(dir) {
    if (state !== 'play') return;
    const copy = stacks.map((s) => s.slice());
    for (let i = 0; i < 6; i++) stacks[(i + dir + 6) % 6] = copy[i];
    spin += dir;
    saveRun(true);
    sound(380, 0.045);
    draw();
  }
  function neighbors(l, d) {
    return [
      [(l + 5) % 6, d],
      [(l + 1) % 6, d],
      [l, d - 1],
      [l, d + 1],
    ];
  }
  function clearMatches() {
    let chain = 0;
    while (true) {
      const remove = Array.from({ length: 6 }, () => new Set());
      const seen = new Set();
      for (let l = 0; l < 6; l++)
        for (let d = 0; d < stacks[l].length; d++) {
          const key = l + ',' + d;
          if (seen.has(key)) continue;
          const color = stacks[l][d],
            group = [],
            queue = [[l, d]];
          seen.add(key);
          while (queue.length) {
            const [a, b] = queue.pop();
            group.push([a, b]);
            for (const [nl, nd] of neighbors(a, b)) {
              const nk = nl + ',' + nd;
              if (nd >= 0 && stacks[nl][nd] === color && !seen.has(nk)) {
                seen.add(nk);
                queue.push([nl, nd]);
              }
            }
          }
          if (group.length >= 3) for (const [a, b] of group) remove[a].add(b);
        }
      const count = remove.reduce((n, s) => n + s.size, 0);
      if (!count) break;
      for (let l = 0; l < 6; l++)
        stacks[l] = stacks[l].filter((_, d) => !remove[l].has(d));
      chain++;
      cleared += count;
      score += count * 20 * chain;
      best = arcadeBest('mini-hex-best', score);
      leaderboard.submit(score);
      hud();
      sound(620 + chain * 100, 0.16);
    }
  }
  function land() {
    const l = fall.lane;
    stacks[l].push(fall.color);
    sound(250);
    clearMatches();
    if (stacks.some((s) => s.length >= maxDepth)) {
      state = 'over';
      arcadeClearRun(runKey);
      leaderboard.submit(score, true);
      show(
        'Stack overflow',
        `You cleared ${cleared} blocks and scored ${score} points.`,
        'Play again',
      );
      sound(150, 0.3);
      return;
    }
    fall = {
      lane: Math.floor(Math.random() * 6),
      color: Math.floor(Math.random() * 4),
      r: 292,
    };
    saveRun(true);
  }
  function poly(lane, r1, r2, color, opacity = 1) {
    const a = angle(lane),
      half = 0.43;
    const points = [
      [r1, a - half],
      [r2, a - half],
      [r2, a + half],
      [r1, a + half],
    ];
    x.globalAlpha = opacity;
    x.beginPath();
    points.forEach(([r, t], i) => {
      const px = cx + Math.cos(t) * r,
        py = cy + Math.sin(t) * r;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    });
    x.closePath();
    x.fillStyle = color;
    x.fill();
    x.strokeStyle = '#071a2c';
    x.lineWidth = 3;
    x.stroke();
    x.globalAlpha = 1;
  }
  function draw() {
    x.fillStyle = '#0b202c';
    x.fillRect(0, 0, 700, 620);
    for (let ring = 1; ring <= 8; ring++) {
      x.beginPath();
      x.arc(cx, cy, inner + ring * step, 0, Math.PI * 2);
      x.strokeStyle = '#ffffff12';
      x.lineWidth = 1;
      x.stroke();
    }
    for (let l = 0; l < 6; l++) {
      const a = angle(l);
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      x.lineTo(cx + Math.cos(a) * 300, cy + Math.sin(a) * 300);
      x.strokeStyle = '#ffffff13';
      x.stroke();
      stacks[l].forEach((color, d) =>
        poly(l, inner + d * step, inner + (d + 1) * step, colors[color]),
      );
    }
    if (fall) poly(fall.lane, fall.r, fall.r + step, colors[fall.color]);
    x.fillStyle = '#d8ff3e';
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = angle(i) + Math.PI / 6,
        r = 43;
      if (i) x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
    x.fillStyle = '#071a2c';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '900 22px Arial';
    x.fillText('M', cx, cy + 1);
    x.font = '700 12px Arial';
    x.fillStyle = '#9cbab8';
    x.fillText('MATCH 3+', cx, 602);
  }
  function frame(t) {
    if (state !== 'play') return;
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    const target = inner + stacks[fall.lane].length * step;
    fall.r -= (105 + Math.min(105, cleared * 1.5)) * dt;
    if (fall.r <= target) {
      fall.r = target;
      land();
    }
    draw();
    if (state === 'play') {
      saveRun();
      requestAnimationFrame(frame);
    }
  }
  $('start').onclick = begin;
  $('restart').onclick = fresh;
  $('pause').onclick = pause;
  $('left').onclick = () => rotate(-1);
  $('right').onclick = () => rotate(1);
  $('sound').onclick = () => {
    muted = !muted;
    $('sound').textContent = muted ? 'Sound off' : 'Sound on';
  };
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code))
      e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'ArrowLeft') rotate(-1);
    if (e.code === 'ArrowRight') rotate(1);
    if (e.code === 'Space' && (state === 'ready' || state === 'over')) begin();
    if (e.code === 'KeyP') pause();
  });
  c.addEventListener('pointerdown', (e) => {
    if (state === 'ready' || state === 'over') {
      begin();
      return;
    }
    if (state !== 'play') return;
    gesture = { id: e.pointerId, x: e.clientX, y: e.clientY };
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointerup', (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const { x, y } = gesture;
    gesture = null;
    const dx = e.clientX - x;
    const dy = e.clientY - y;
    if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      rotate(dx > 0 ? 1 : -1);
    } else if (Math.hypot(dx, dy) < 20) {
      const r = c.getBoundingClientRect();
      rotate(x - r.left < r.width / 2 ? -1 : 1);
    }
  });
  c.addEventListener('pointercancel', () => { gesture = null; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') pause();
  });
  if (!restore()) fresh();
})();
