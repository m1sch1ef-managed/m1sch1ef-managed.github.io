// Keep the large catalogs off the page's main thread, especially on phones.
const gameIds = ['pokemon', 'magic', 'yugioh', 'onepiece', 'lorcana', 'fab'];
const catalogs = new Map();
const failures = new Set();
let latestRequest = null;
let processing = false;
let lastRetry = 0;

function normalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/\b0+(\d+)/g, '$1').trim();
}

const gameNames = {
  pokemon: 'Pokemon Pokémon', magic: 'Magic MTG', yugioh: 'Yu Gi Oh Yugioh',
  onepiece: 'One Piece', lorcana: 'Disney Lorcana', fab: 'Flesh and Blood FAB',
};
const selectedIds = game => game === 'all' ? gameIds : gameIds.includes(game) ? [game] : [];

async function loadCatalog(id, base = '') {
  try {
    const response = await fetch(`${base}/data/tcg-${id}.bin`, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok || !response.body) throw new Error('Catalog unavailable');
    const data = await new Response(
      response.body.pipeThrough(new DecompressionStream('gzip')),
    ).json();
    if (!Array.isArray(data.cards) || !Array.isArray(data.sets))
      throw new Error('Invalid catalog');
    const valid = [];
    for (const card of data.cards) {
      if (!card || typeof card.name !== 'string' || typeof card.variant !== 'string'
        || typeof card.set !== 'string' || typeof card.game !== 'string'
        || typeof card.number !== 'string' || typeof card.id !== 'string'
        || typeof card.url !== 'string') continue;
      card.searchText = normalize(`${card.name} ${card.number} ${card.variant} ${card.set} ${gameNames[card.game] || card.game}`);
      card.nameSearch = normalize(card.name);
      valid.push(card);
    }
    data.cards = valid;
    catalogs.set(id, data);
    failures.delete(id);
  } catch {
    failures.add(id);
  }
}

function publish(request) {
  const ids = selectedIds(request.game);
  const query = normalize(request.query);
  const words = query.split(/\s+/);
  const matches = [];
  const coverage = {};
  const partial = [];
  for (const id of ids) {
    const catalog = catalogs.get(id);
    if (!catalog) continue;
    coverage[id] = {
      count: catalog.cards.length,
      checkedSets: catalog.sets.filter(set => set.ok).length,
      sourceDate: catalog.sourceDate,
    };
    if (!catalog.complete || catalog.refreshOk === false) partial.push(id);
    if (query.length < 2) continue;
    for (const card of catalog.cards)
      if (words.every(word => card.searchText.includes(word))) matches.push(card);
  }
  matches.sort((a, b) =>
    Number(b.nameSearch === query) - Number(a.nameSearch === query)
    || a.name.localeCompare(b.name) || a.variant.localeCompare(b.variant));
  postMessage({
    requestId: request.requestId,
    retry: request.retry,
    query: request.query,
    game: request.game,
    limit: request.limit,
    count: matches.length,
    cards: matches.slice(0, request.limit).map(card => ({
      id: card.id, name: card.name, number: card.number, variant: card.variant,
      url: card.url, image: card.image, game: card.game, set: card.set,
      price: card.price, date: card.date,
    })),
    pending: ids.filter(id => !catalogs.has(id) && !failures.has(id)),
    failed: ids.filter(id => failures.has(id)),
    partial,
    coverage,
  });
}

async function processRequests() {
  if (processing) return;
  processing = true;
  try {
    while (latestRequest) {
      const request = latestRequest;
      latestRequest = null;
      if (request.retry !== lastRetry) {
        failures.clear();
        lastRetry = request.retry;
      }
      publish(request);
      for (const id of selectedIds(request.game)) {
        if (catalogs.has(id) || failures.has(id)) continue;
        await loadCatalog(id, request.catalogBase);
        if (latestRequest) break;
        publish(request);
      }
    }
  } finally {
    processing = false;
  }
}

self.onmessage = event => {
  if (event.data?.type !== 'search') return;
  latestRequest = event.data;
  void processRequests();
};
