window.createMiniLeaderboard = (game) => {
  const endpoint = ['m1sch1efmanaged.com', 'www.m1sch1efmanaged.com'].includes(
    location.hostname,
  )
    ? 'https://m1sch1ef-managed.cheyenneorsak.chatgpt.site/api/mini-games'
    : '/api/mini-games';
  const tokenKey = 'm1-arcade-player';
  const runKey = `m1-mini-current-${game}`;
  const pendingKey = `m1-mini-pending-${game}`;
  let token;
  try {
    token = localStorage.getItem(tokenKey);
    if (!/^[a-f0-9-]{36}$/i.test(token || '')) {
      token = crypto.randomUUID();
      localStorage.setItem(tokenKey, token);
    }
  } catch {
    token = crypto.randomUUID();
  }
  let runId = null;
  try {
    runId = localStorage.getItem(runKey);
  } catch {
    /* Storage is optional. */
  }
  let runPromise = runId ? Promise.resolve(runId) : null;
  let period = 'week',
    timer = null,
    saveQueue = Promise.resolve(),
    pending = null;
  try {
    pending = JSON.parse(localStorage.getItem(pendingKey) || 'null');
  } catch {
    /* Ignore malformed pending data. */
  }
  if (
    pending &&
    (!pending.id ||
      !Number.isSafeInteger(pending.score) ||
      pending.score < 0 ||
      Date.now() - pending.savedAt > 86400000)
  ) {
    pending = null;
    try {
      localStorage.removeItem(pendingKey);
    } catch {
      /* Storage is optional. */
    }
  }

  const section = document.createElement('section');
  section.className = 'mini-leaderboard';
  section.setAttribute('aria-label', 'Online leaderboard');
  section.innerHTML =
    '<div class="mini-board-top"><div><small>COMMUNITY SCORES</small><h2>Leaderboard</h2></div><div class="mini-board-tabs"><button type="button" data-period="week" aria-pressed="true">This week</button><button type="button" data-period="all" aria-pressed="false">All time</button></div></div><p class="mini-board-status" aria-live="polite">Loading scores…</p><ol class="mini-board-list"></ol><p class="mini-board-own"></p><button type="button" class="mini-board-retry" hidden>Retry online save</button>';
  document.querySelector('main').appendChild(section);
  const status = section.querySelector('.mini-board-status');
  const list = section.querySelector('.mini-board-list');
  const own = section.querySelector('.mini-board-own');
  const retry = section.querySelector('.mini-board-retry');
  const store = (key, value) => {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* Keep playing without storage. */
    }
  };
  async function request(query = '', body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(endpoint + query, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Score service returned ${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  async function refresh() {
    const selected = period;
    status.textContent = 'Loading scores…';
    try {
      const data = await request(
        `?game=${encodeURIComponent(game)}&period=${selected}`,
      );
      if (selected !== period) return;
      list.replaceChildren();
      for (const row of data.rows) {
        const li = document.createElement('li');
        li.innerHTML = '<span></span><b></b>';
        li.firstElementChild.textContent = `${row.rank}. ${row.you ? 'You' : 'Player'}`;
        li.lastElementChild.textContent = row.score.toLocaleString();
        if (row.you) li.classList.add('is-you');
        list.appendChild(li);
      }
      status.textContent = data.rows.length
        ? `${selected === 'week' ? 'Weekly' : 'All-time'} top ten`
        : 'No scores yet. Be the first.';
      own.textContent =
        data.own && data.own.rank > 10
          ? `Your best: ${data.own.score.toLocaleString()} · Rank #${data.own.rank}`
          : '';
    } catch {
      status.textContent =
        'Online board is unavailable. Your best score still saves on this device.';
      list.replaceChildren();
      own.textContent = '';
    }
  }
  async function newRun() {
    runId = null;
    store(runKey, null);
    runPromise = request('', { action: 'start', game })
      .then((data) => {
        runId = data.id;
        store(runKey, runId);
        return runId;
      })
      .catch(() => {
        status.textContent =
          'Online scores are unavailable. You can keep playing locally.';
        return null;
      });
    return runPromise;
  }
  async function send(entry) {
    try {
      await request('', { action: 'save', game, ...entry });
      if (pending?.id === entry.id && pending.score <= entry.score) {
        pending = null;
        store(pendingKey, null);
        retry.hidden = true;
      }
      if (entry.finished && runId === entry.id) {
        runId = null;
        runPromise = null;
        store(runKey, null);
      }
      await refresh();
    } catch {
      if (!pending || entry.score >= pending.score) pending = entry;
      store(pendingKey, JSON.stringify(pending));
      retry.hidden = false;
      status.textContent =
        'Score saved on this device. Online save needs a retry.';
    }
  }
  function submit(score, finished = false) {
    if (!Number.isSafeInteger(score) || score < 0) return;
    const current = runPromise || newRun();
    void current.then((id) => {
      if (!id) return;
      const entry = { id, score, finished, savedAt: Date.now() };
      if (!pending || entry.score >= pending.score) {
        pending = entry;
        store(pendingKey, JSON.stringify(entry));
      }
    });
    const enqueue = async () => {
      const id = await current;
      if (!id) return;
      await send({ id, score, finished });
    };
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => {
        saveQueue = saveQueue.then(enqueue);
      },
      finished ? 0 : 1800,
    );
  }
  section.querySelectorAll('[data-period]').forEach((button) =>
    button.addEventListener('click', () => {
      period = button.dataset.period;
      section
        .querySelectorAll('[data-period]')
        .forEach((tab) =>
          tab.setAttribute('aria-pressed', String(tab === button)),
        );
      void refresh();
    }),
  );
  retry.addEventListener('click', () => {
    if (pending) saveQueue = saveQueue.then(() => send(pending));
    else void refresh();
  });
  if (pending?.id && Number.isSafeInteger(pending.score)) retry.hidden = false;
  void refresh();
  if (pending) saveQueue = saveQueue.then(() => send(pending));
  return { newRun, submit, refresh, hasRun: () => !!runPromise };
};
