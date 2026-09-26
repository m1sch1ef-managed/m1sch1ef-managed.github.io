const publicHosts = ['m1sch1efmanaged.com', 'www.m1sch1efmanaged.com'];
const endpoint = publicHosts.includes(location.hostname) ? 'https://m1sch1ef-managed.cheyenneorsak.chatgpt.site/api/modern-oregon-trail' : '/api/modern-oregon-trail';
const key = 'modern-trail-online-v1';
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
let token, saved = null;
try {
  token = localStorage.getItem('modern-trail-player');
  if (!uuid(token)) { token = crypto.randomUUID(); localStorage.setItem('modern-trail-player', token); }
  const data = JSON.parse(localStorage.getItem(key));
  if (data && uuid(data.id) && Number.isSafeInteger(data.seq) && data.seq >= 0 && data.seq <= 1000) saved = data;
} catch { /* Offline play remains available when storage is blocked. */ }
export const onlineSave = () => saved;
function persist() {
  // Ranked mode requires a durable identity and checkpoint for retry/recovery.
  localStorage.setItem(key, JSON.stringify(saved));
}
async function request(query = '', body) {
  if (!token || localStorage.getItem('modern-trail-player') !== token) throw Error('Allow browser storage to use ranked play. Practice mode needs no account.');
  let response;
  try {
    response = await fetch(endpoint + query, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000), cache: 'no-store', credentials: 'omit' });
  } catch { throw Error('Connection interrupted. Retry to recover the same action.'); }
  let data;
  try { data = await response.json(); } catch { throw Error('Online leaderboards are unavailable here. Practice mode still works.'); }
  if (!response.ok) throw Error(response.status === 429 ? `Too many requests. Try again in ${response.headers.get('Retry-After') || 60} seconds.` : data.error || 'Online play is unavailable.');
  return data;
}
function accept(data) { saved = { id: data.id, seq: data.seq }; persist(); return data; }
export async function rankedStart(config) {
  const id = crypto.randomUUID();
  saved = { id, seq: 0, pending: { action: 'start', id, ...config } }; persist();
  return retryRanked();
}
export async function rankedMove(move, value) {
  if (!saved) throw Error('Start a ranked run first.');
  if (!saved.pending) { saved.pending = { action: 'move', id: saved.id, seq: saved.seq, requestId: crypto.randomUUID(), move, ...(value === undefined ? {} : { value }) }; persist(); }
  return retryRanked();
}
export async function retryRanked() {
  if (!saved) throw Error('No ranked save exists.');
  return accept(saved.pending ? await request('', saved.pending) : await request(`?run=${encodeURIComponent(saved.id)}`));
}
export async function recoverRanked() {
  if (!saved) throw Error('No ranked save exists.');
  return accept(await request(`?run=${encodeURIComponent(saved.id)}`));
}
export function clearRanked() { saved = null; try { localStorage.removeItem(key); } catch {} }
export const loadBoard = (route, period) => request(`?route=${encodeURIComponent(route)}&period=${encodeURIComponent(period)}`);
