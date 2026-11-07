(() => {
  const c = document.getElementById('game'),
    x = c.getContext('2d'),
    $ = (id) => document.getElementById(id);
  const leaderboard = createMiniLeaderboard('breakout');
  const runKey = 'mini-breaker-run';
  let state = 'ready',
    score = 0,
    best = arcadeReadBest('mini-breaker-best'),
    level = 1,
    lives = 3,
    paddle = 355,
    wide = 0,
    slow = 0,
    ball = { x: 400, y: 460, vx: 220, vy: -350 },
    bricks = [],
    drops = [],
    left = false,
    right = false,
    muted = false,
    last = 0,
    lastSaved = 0;
  const W = 800,
    H = 520,
    colors = ['#ff6d55', '#f2ce77', '#d8ff3e', '#72e4ba', '#79aaff'];
  $('best').textContent = best;
  function sound(f, d = 0.07) {
    if (!muted) arcadeSound(f, d, 'triangle', 0.045);
  }
  function hud() {
    $('score').textContent = score;
    $('best').textContent = best;
    $('level').textContent = level;
    $('lives').textContent = lives;
  }
  function build() {
    bricks = [];
    drops = [];
    const rows = Math.min(5 + Math.floor((level - 1) / 2), 8);
    for (let r = 0; r < rows; r++)
      for (let col = 0; col < 10; col++)
        bricks.push({
          x: 35 + col * 74,
          y: 58 + r * 36,
          alive: true,
          color: colors[r % colors.length],
          hp: level > 2 && r === 0 ? 2 : 1,
        });
    resetBall();
  }
  function resetBall() {
    ball = {
      x: paddle + 45,
      y: 457,
      vx: (Math.random() < 0.5 ? -1 : 1) * (190 + level * 15),
      vy: -(310 + level * 25),
    };
    state = 'serve';
  }
  function show(title, message, button) {
    $('heading').textContent = title;
    $('message').textContent = message;
    $('start').textContent = button;
    $('overlay').hidden = false;
  }
  function hide() {
    $('overlay').hidden = true;
  }
  function saveRun(force = false) {
    const now = performance.now();
    if (!force && now - lastSaved < 2000) return;
    lastSaved = now;
    arcadeSaveRun(runKey, {
      score,
      level,
      lives,
      paddle,
      wide,
      slow,
      ball,
      bricks,
      drops,
      state,
    });
  }
  function restore() {
    const saved = arcadeLoadRun(runKey);
    if (
      !saved ||
      !Number.isSafeInteger(saved.score) ||
      saved.score < 0 ||
      !Number.isInteger(saved.level) ||
      saved.level < 1 ||
      saved.level > 100 ||
      !Number.isInteger(saved.lives) ||
      saved.lives < 1 ||
      saved.lives > 5 ||
      !Number.isFinite(saved.paddle) ||
      !saved.ball ||
      !['x', 'y', 'vx', 'vy'].every((key) =>
        Number.isFinite(saved.ball[key]),
      ) ||
      !Array.isArray(saved.bricks) ||
      saved.bricks.length < 50 ||
      saved.bricks.length > 80 ||
      !saved.bricks.every(
        (b) =>
          Number.isFinite(b.x) &&
          Number.isFinite(b.y) &&
          typeof b.alive === 'boolean' &&
          Number.isInteger(b.hp),
      ) ||
      !Array.isArray(saved.drops) ||
      saved.drops.length > 30
    )
      return false;
    ({ score, level, lives, paddle, wide, slow, ball, bricks, drops } = saved);
    best = arcadeBest('mini-breaker-best', score);
    state = saved.state === 'serve' ? 'serve' : 'paused';
    hud();
    show(
      'Run restored',
      'Your brick breaker run is ready to continue.',
      'Resume game',
    );
    if (!leaderboard.hasRun()) void leaderboard.newRun();
    return true;
  }
  function fresh() {
    arcadeClearRun(runKey);
    void leaderboard.newRun();
    score = 0;
    level = 1;
    lives = 3;
    paddle = 355;
    wide = 0;
    slow = 0;
    build();
    hud();
    show(
      'Ready to launch',
      'Move the paddle and press Space or tap the playfield to launch.',
      'Launch ball',
    );
  }
  function launch() {
    if (state === 'over') fresh();
    if (state === 'serve' || state === 'paused') {
      state = 'play';
      hide();
      last = performance.now();
      requestAnimationFrame(frame);
      sound(460);
      saveRun(true);
    }
  }
  function gameOver() {
    state = 'over';
    arcadeClearRun(runKey);
    leaderboard.submit(score, true);
    show(
      'Game over',
      `You scored ${score} points and reached level ${level}.`,
      'Play again',
    );
    sound(170, 0.25);
  }
  function step(dt) {
    const pw = 90 + (wide > 0 ? 50 : 0);
    wide = Math.max(0, wide - dt);
    slow = Math.max(0, slow - dt);
    if (left) paddle -= 520 * dt;
    if (right) paddle += 520 * dt;
    paddle = Math.max(8, Math.min(W - pw - 8, paddle));
    const scale = slow > 0 ? 0.73 : 1;
    ball.x += ball.vx * dt * scale;
    ball.y += ball.vy * dt * scale;
    if (ball.x < 10) {
      ball.x = 10;
      ball.vx = Math.abs(ball.vx);
      sound(220);
    }
    if (ball.x > W - 10) {
      ball.x = W - 10;
      ball.vx = -Math.abs(ball.vx);
      sound(220);
    }
    if (ball.y < 10) {
      ball.y = 10;
      ball.vy = Math.abs(ball.vy);
      sound(250);
    }
    if (
      ball.vy > 0 &&
      ball.y + 9 >= H - 42 &&
      ball.y - 9 < H - 27 &&
      ball.x >= paddle - 8 &&
      ball.x <= paddle + pw + 8
    ) {
      ball.y = H - 51;
      const hit = (ball.x - (paddle + pw / 2)) / (pw / 2);
      const speed = Math.min(610, Math.hypot(ball.vx, ball.vy) + 9);
      ball.vx = hit * speed * 0.82;
      ball.vy = -Math.sqrt(Math.max(20000, speed * speed - ball.vx * ball.vx));
      sound(460);
    }
    if (ball.y > H + 15) {
      lives--;
      hud();
      if (lives <= 0) gameOver();
      else {
        resetBall();
        saveRun(true);
        show(
          'Ball lost',
          `${lives} ${lives === 1 ? 'life' : 'lives'} left. Line up your next shot.`,
          'Launch ball',
        );
      }
      return;
    }
    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + 8 > b.x &&
        ball.x - 8 < b.x + 65 &&
        ball.y + 8 > b.y &&
        ball.y - 8 < b.y + 25
      ) {
        b.hp--;
        if (b.hp <= 0) {
          b.alive = false;
          score += 10 * level;
          if (Math.random() < 0.12)
            drops.push({
              x: b.x + 32,
              y: b.y + 12,
              type: ['wide', 'slow', 'life'][Math.floor(Math.random() * 3)],
            });
        } else score += 2;
        ball.vy *= -1;
        sound(b.hp ? 420 : 650);
        best = arcadeBest('mini-breaker-best', score);
        leaderboard.submit(score);
        hud();
        break;
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += 145 * dt;
      if (d.y > H) {
        drops.splice(i, 1);
        continue;
      }
      if (d.y > H - 53 && d.x > paddle && d.x < paddle + pw) {
        if (d.type === 'wide') wide = 13;
        if (d.type === 'slow') slow = 10;
        if (d.type === 'life') lives = Math.min(5, lives + 1);
        drops.splice(i, 1);
        hud();
        sound(850, 0.16);
      }
    }
    if (bricks.every((b) => !b.alive)) {
      leaderboard.submit(score);
      level++;
      build();
      saveRun(true);
      hud();
      show(
        'Wall cleared',
        `Level ${level} is ready. The ball moves faster now.`,
        'Next level',
      );
      sound(1000, 0.2);
    }
  }
  function draw() {
    x.fillStyle = '#0b202c';
    x.fillRect(0, 0, W, H);
    x.strokeStyle = '#22404b';
    x.lineWidth = 1;
    for (let i = 0; i < W; i += 40) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, H);
      x.stroke();
    }
    for (let i = 0; i < H; i += 40) {
      x.beginPath();
      x.moveTo(0, i);
      x.lineTo(W, i);
      x.stroke();
    }
    for (const b of bricks) {
      if (!b.alive) continue;
      x.shadowColor = b.color;
      x.shadowBlur = 12;
      x.fillStyle = b.hp > 1 ? '#71878c' : b.color;
      x.fillRect(b.x, b.y, 65, 25);
      x.shadowBlur = 0;
      x.fillStyle = '#ffffff44';
      x.fillRect(b.x + 3, b.y + 3, 59, 3);
    }
    const pw = 90 + (wide > 0 ? 50 : 0);
    x.shadowColor = '#d8ff3e';
    x.shadowBlur = 18;
    x.fillStyle = '#d8ff3e';
    x.fillRect(paddle, H - 40, pw, 14);
    x.shadowBlur = 0;
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
    x.fill();
    for (const d of drops) {
      x.fillStyle =
        d.type === 'life'
          ? '#ff6d55'
          : d.type === 'wide'
            ? '#72e4ba'
            : '#79aaff';
      x.beginPath();
      x.arc(d.x, d.y, 12, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#071a2c';
      x.font = 'bold 13px Arial';
      x.textAlign = 'center';
      x.fillText(
        d.type === 'life' ? '+' : d.type === 'wide' ? 'W' : 'S',
        d.x,
        d.y + 5,
      );
    }
  }
  function frame(t) {
    if (state !== 'play') return;
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    step(dt);
    draw();
    if (state === 'play') {
      saveRun();
      requestAnimationFrame(frame);
    }
  }
  function move(e) {
    const r = c.getBoundingClientRect();
    const pw = 90 + (wide > 0 ? 50 : 0);
    paddle = Math.max(
      8,
      Math.min(W - pw - 8, ((e.clientX - r.left) / r.width) * W - pw / 2),
    );
    if (state === 'serve') ball.x = paddle + pw / 2;
    draw();
  }
  c.addEventListener('pointermove', move);
  c.addEventListener('pointerdown', (e) => {
    c.setPointerCapture(e.pointerId);
    move(e);
    if (state === 'serve') launch();
  });
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code))
      e.preventDefault();
    if (e.code === 'ArrowLeft') left = true;
    if (e.code === 'ArrowRight') right = true;
    if (e.code === 'Space') launch();
    if (e.code === 'KeyP') togglePause();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') left = false;
    if (e.code === 'ArrowRight') right = false;
  });
  function togglePause() {
    if (state === 'play') {
      state = 'paused';
      saveRun(true);
      show('Paused', 'Take your time. Your score is safe.', 'Resume');
    } else if (state === 'paused') launch();
  }
  $('start').onclick = launch;
  $('pause').onclick = togglePause;
  $('restart').onclick = fresh;
  $('sound').onclick = () => {
    muted = !muted;
    $('sound').textContent = muted ? 'Sound off' : 'Sound on';
    $('sound').setAttribute(
      'aria-label',
      muted ? 'Unmute sound' : 'Mute sound',
    );
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') togglePause();
  });
  if (!restore()) fresh();
  draw();
})();
