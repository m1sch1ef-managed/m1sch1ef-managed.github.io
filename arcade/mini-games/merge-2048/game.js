(() => {
  const $ = (id) => document.getElementById(id),
    board = $('board');
  const leaderboard = createMiniLeaderboard('merge-2048');
  const saveKey = 'mini-2048-progress';
  let cells = Array(16).fill(0),
    score = 0,
    best = arcadeReadBest('mini-2048-best'),
    previous = null,
    won = false,
    muted = false,
    touch = null;
  $('best').textContent = best;
  function sound(f) {
    if (!muted) arcadeSound(f, 0.09, 'sine', 0.04);
  }
  function empty() {
    return cells.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  }
  function spawn() {
    const spots = empty();
    if (!spots.length) return;
    const at = spots[Math.floor(Math.random() * spots.length)];
    cells[at] = Math.random() < 0.9 ? 2 : 4;
  }
  function render() {
    board.innerHTML = '';
    let peak = 2;
    cells.forEach((v, i) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.value = String(v);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute(
        'aria-label',
        `Row ${Math.floor(i / 4) + 1}, column ${(i % 4) + 1}: ${v || 'empty'}`,
      );
      tile.textContent = v || '';
      board.appendChild(tile);
      peak = Math.max(peak, v);
    });
    $('score').textContent = score;
    $('best').textContent = best;
    $('peak').textContent = peak;
    $('undo').disabled = !previous;
  }
  function start() {
    void leaderboard.newRun();
    cells = Array(16).fill(0);
    score = 0;
    previous = null;
    won = false;
    spawn();
    spawn();
    $('status').textContent = '';
    render();
    persist();
  }
  function persist() {
    try {
      localStorage.setItem(
        saveKey,
        JSON.stringify({ cells, score, previous, won }),
      );
    } catch {
      /* The board remains playable when browser storage is unavailable. */
    }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');
      if (
        !saved ||
        !Array.isArray(saved.cells) ||
        saved.cells.length !== 16 ||
        saved.cells.some(
          (v) =>
            !Number.isSafeInteger(v) || v < 0 || (v && (v & (v - 1)) !== 0),
        ) ||
        !Number.isSafeInteger(saved.score) ||
        saved.score < 0 ||
        saved.score % 4 !== 0
      )
        return false;
      cells = saved.cells;
      score = saved.score;
      won = !!saved.won;
      previous =
        saved.previous &&
        Array.isArray(saved.previous.cells) &&
        saved.previous.cells.length === 16
          ? saved.previous
          : null;
      best = arcadeBest('mini-2048-best', score);
      render();
      $('status').textContent = 'Game restored from this device.';
      if (!leaderboard.hasRun()) void leaderboard.newRun();
      return true;
    } catch {
      return false;
    }
  }
  function line(idx) {
    return idx.map((i) => cells[i]);
  }
  function compact(values) {
    const nonzero = values.filter(Boolean),
      out = [];
    let earned = 0;
    for (let i = 0; i < nonzero.length; i++) {
      if (i + 1 < nonzero.length && nonzero[i] === nonzero[i + 1]) {
        const merged = nonzero[i] * 2;
        out.push(merged);
        earned += merged;
        i++;
      } else out.push(nonzero[i]);
    }
    while (out.length < 4) out.push(0);
    return { out, earned };
  }
  function possible() {
    if (empty().length) return true;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = cells[y * 4 + x];
        if (x < 3 && v === cells[y * 4 + x + 1]) return true;
        if (y < 3 && v === cells[(y + 1) * 4 + x]) return true;
      }
    return false;
  }
  function move(dir) {
    if (!possible()) return;
    const before = cells.slice();
    let earned = 0;
    for (let n = 0; n < 4; n++) {
      const ids = [];
      for (let k = 0; k < 4; k++) {
        if (dir === 'left') ids.push(n * 4 + k);
        if (dir === 'right') ids.push(n * 4 + 3 - k);
        if (dir === 'up') ids.push(k * 4 + n);
        if (dir === 'down') ids.push((3 - k) * 4 + n);
      }
      const result = compact(line(ids));
      earned += result.earned;
      ids.forEach((id, i) => {
        cells[id] = result.out[i];
      });
    }
    if (cells.every((v, i) => v === before[i])) return;
    previous = { cells: before, score, won };
    score += earned;
    best = arcadeBest('mini-2048-best', score);
    spawn();
    render();
    if (score > 0) leaderboard.submit(score);
    sound(earned ? 540 : 280);
    if (!won && cells.some((v) => v >= 2048)) {
      won = true;
      $('status').textContent = '2048 reached! Keep building.';
      sound(880);
    } else if (!possible()) {
      $('status').textContent = 'No moves left. Start a new game or undo.';
      sound(150);
    }
    persist();
  }
  $('new').onclick = start;
  $('undo').onclick = () => {
    if (!previous) return;
    cells = previous.cells;
    score = previous.score;
    won = previous.won;
    previous = null;
    $('status').textContent = 'Last move undone.';
    render();
    persist();
  };
  $('sound').onclick = () => {
    muted = !muted;
    $('sound').textContent = muted ? 'Sound off' : 'Sound on';
  };
  window.addEventListener('keydown', (e) => {
    const dir = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    }[e.key];
    if (dir) {
      e.preventDefault();
      move(dir);
    }
  });
  board.addEventListener(
    'touchstart',
    (e) => {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    { passive: true },
  );
  board.addEventListener(
    'touchend',
    (e) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x,
        dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? 'right'
            : 'left'
          : dy > 0
            ? 'down'
            : 'up',
      );
    },
    { passive: true },
  );
  if (!restore()) start();
})();
