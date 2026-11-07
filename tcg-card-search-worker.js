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
const requestedIds = request => request.type === 'watchlist' ? selectedIds(request.game).filter(id => (request.saved || []).some(card => card.game === id)) : selectedIds(request.game);
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
  const ids = requestedIds(request);
  const query = normalize(request.query);
  const words = query.split(/\s+/);
  const matches = [];
  const coverage = {};
  const partial = [];
  const saved = new Set((request.saved || []).slice(0, 100).map(card => `${card.game}:${card.id}`));
  for (const id of ids) {
    const catalog = catalogs.get(id);
    if (!catalog) continue;
    coverage[id] = {
      count: catalog.cards.length,
      checkedSets: catalog.sets.filter(set => set.ok).length,
      sourceDate: catalog.sourceDate,
      unpricedSets: catalog.unpricedSets || [],
    };
    if (!catalog.complete || catalog.refreshOk === false) partial.push(id);
    if (query.length < 2 && request.type !== 'watchlist') continue;
    for (const card of catalog.cards)
      if (request.type === 'watchlist' ? saved.has(`${card.game}:${card.id}`) : words.every(word => card.searchText.includes(word))) matches.push(card);
  }
  const lexical = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const facets = { sets: [...new Set(matches.map(card => card.set))].sort(lexical), variants: [...new Set(matches.map(card => card.variant))].sort(lexical) };
  const filters = request.filters || {};
  const bound = value => value !== '' && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const min = bound(filters.minPrice), max = bound(filters.maxPrice);
  const amount = card => Number.isFinite(card.price) && card.price > 0 ? card.price : Number.isFinite(card.listingPrice) && card.listingPrice > 0 ? card.listingPrice : null;
  const filtered = matches.filter(card => {
    const price = amount(card);
    return (!filters.set || card.set === filters.set)
      && (!filters.variant || card.variant === filters.variant)
      && (filters.priceType !== 'market' || (Number.isFinite(card.price) && card.price > 0))
      && (filters.priceType !== 'listing' || (card.price === null && Number.isFinite(card.listingPrice) && card.listingPrice > 0))
      && (min === null || (price !== null && price >= min))
      && (max === null || (price !== null && price <= max));
  });
  filtered.sort((a, b) => {
    if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
      const pa = amount(a), pb = amount(b);
      if (pa === null || pb === null) return pa === pb ? a.name.localeCompare(b.name) : pa === null ? 1 : -1;
      if (pa !== pb) return filters.sort === 'price-asc' ? pa - pb : pb - pa;
    }
    if (filters.sort === 'name') return a.name.localeCompare(b.name) || a.variant.localeCompare(b.variant);
    return Number(b.nameSearch === query) - Number(a.nameSearch === query)
      || a.name.localeCompare(b.name) || a.variant.localeCompare(b.variant);
  });
  postMessage({
    requestId: request.requestId,
    retry: request.retry,
    query: request.query,
    game: request.game,
    limit: request.limit,
    count: filtered.length,
    filterKey: request.filterKey,
    facets,
    cards: filtered.slice(0, Math.min(1000, request.limit)).map(card => ({
      id: card.id, name: card.name, number: card.number, variant: card.variant,
      url: card.url, image: card.image, game: card.game, set: card.set,
      price: card.price, date: card.date,
      listingPrice: card.listingPrice, quoteStatus: card.quoteStatus,
      previousPrice: card.previousPrice, previousPriceDate: card.previousPriceDate,
      previousPriceType: card.previousPriceType,
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
      for (const id of requestedIds(request)) {
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
  if (!['search', 'watchlist'].includes(event.data?.type)) return;
  latestRequest = event.data;
  void processRequests();
};
