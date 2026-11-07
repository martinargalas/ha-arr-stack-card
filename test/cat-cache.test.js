// The card's first moments on a slow line (render/cat-cache.js): last time's
// categories drawn at once, grey shapes where nothing is kept, posters at a
// size that fits.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, setViewport } from './harness.js';
import { tmdbSized } from '../src/shared/ui.js';
import { CAT_CACHE_KEY, CAT_CACHE_CAP } from '../src/render/cat-cache.js';

afterEach(() => { setViewport(1400); localStorage.clear(); });

test('a TMDB picture only ever gets smaller; other hosts stay as they are', () => {
  assert.equal(tmdbSized('https://image.tmdb.org/t/p/original/a.jpg'), 'https://image.tmdb.org/t/p/w342/a.jpg');
  assert.equal(tmdbSized('https://image.tmdb.org/t/p/w500/a.jpg', 'w185'), 'https://image.tmdb.org/t/p/w185/a.jpg');
  assert.equal(tmdbSized('https://image.tmdb.org/t/p/w92/a.jpg', 'w185'), 'https://image.tmdb.org/t/p/w92/a.jpg');
  assert.equal(tmdbSized('https://artworks.thetvdb.com/banners/p.jpg'), 'https://artworks.thetvdb.com/banners/p.jpg');
  assert.equal(tmdbSized(null), null);
});

test("Radarr's original-size poster is asked for at a card's size", () => {
  const card = makeCard();
  const m = { images: [{ coverType: 'poster', remoteUrl: 'https://image.tmdb.org/t/p/original/x.jpg' }] };
  assert.equal(card._getRadarrPoster(m), 'https://image.tmdb.org/t/p/w342/x.jpg');
});

function listCard(extra = {}) {
  const card = makeCard({
    _config: { discover: { categoriesCount: 3, mobileLayout: 'list' },
      categories: [{ id: 'trending', enabled: true }, { id: 'popular', enabled: true }] },
    ...extra,
  });
  card._renderSearch = () => '';
  card._renderTrending = () => `<div class="sec-card"><div class="col-hdr"><span class="col-hdr-title">Trending</span></div><div class="mgrid">${
    (card._trending || []).map(t => `<div class="mc"><img src="${t}"></div>`).join('')}</div></div>`;
  card._renderPopular = () => '<div class="sec-card"><div class="col-hdr"><span class="col-hdr-title">Popular</span></div><div class="placeholder">…</div></div>';
  return card;
}
const peek = (doc, i) => doc.querySelectorAll('.mob-peek')[i];

test('the list shows grey poster shapes for a category not in yet, its own posters once it is', () => {
  setViewport(390);
  const card = listCard({ _catReady: new Set() });
  card._renderSoon = () => {};
  let doc = parse(card._renderRight());
  assert.equal(peek(doc, 0).querySelectorAll('.mob-skel').length, 3);
  card._trending = ['https://image.tmdb.org/t/p/w342/a.jpg'];
  card._catLoaded(['trending']);
  doc = parse(card._renderRight());
  assert.equal(peek(doc, 0).querySelector('img').getAttribute('src'), 'https://image.tmdb.org/t/p/w185/a.jpg');
  assert.ok(peek(doc, 1).querySelector('.mob-skel'), 'popular is still on its way');
});

test('the list shows what a category showed last time until its data is in', () => {
  setViewport(390);
  const card = listCard({ _catReady: new Set(), _catCache: { popular: { t: 'Popular', i: ['p1.jpg', 'p2.jpg'] } } });
  const doc = parse(card._renderRight());
  assert.deepEqual([...peek(doc, 1).querySelectorAll('img')].map(i => i.getAttribute('src')), ['p1.jpg', 'p2.jpg']);
});

test('a card not tracking its first round draws as it always did', () => {
  setViewport(390);
  const doc = parse(listCard()._renderRight());
  assert.ok(!doc.querySelector('.mob-skel'));
});

test("last time's markup stands in, inert, until the category's data is in", () => {
  const card = makeCard({ _catReady: new Set(), _catCache: { trending: { h: '<div class="sec-card">kept</div>' } } });
  const fn = card._catFn('trending', () => '<div class="sec-card">live</div>');
  const kept = parse(fn()).querySelector('.sec-card');
  assert.equal(kept.textContent, 'kept');
  assert.ok(kept.hasAttribute('inert'));
  card._catReady.add('trending');
  assert.equal(parse(fn()).querySelector('.sec-card').textContent, 'live');
});

test('kept: what was drawn with everything in, newest first, never a stream, within the cap', () => {
  const card = makeCard({ _catReady: new Set(), _catAllReady: true });
  card._catOrder = ['streams', 'trending', 'popular', 'upcoming'];
  card._catHtmlNow = {
    streams: '<div>now</div>',
    trending: '<div>t</div>',
    popular: 'x'.repeat(CAT_CACHE_CAP),
    upcoming: '<div>u</div>',
  };
  card._catPeekNow = { popular: { t: 'Popular', i: ['p.jpg'] } };
  card._catCacheSave();
  const stored = JSON.parse(localStorage.getItem(CAT_CACHE_KEY));
  const c = Object.values(stored)[0].c;
  assert.ok(!c.streams);
  assert.equal(c.trending.h, '<div>t</div>');
  assert.equal(c.popular.h, undefined, 'over the cap: the markup is left out');
  assert.deepEqual(c.popular.i, ['p.jpg'], 'the peek still kept');
  assert.equal(c.upcoming.h, '<div>u</div>');

  const again = makeCard({ _config: card._config });
  again._catCacheLoad();
  assert.equal(again._catCache.trending.h, '<div>t</div>');
});

test('another setup does not read what this one kept', () => {
  const card = makeCard({ _catAllReady: true });
  card._catHtmlNow = { trending: '<div>t</div>' };
  card._catCacheSave();
  const other = makeCard({ _config: { ...card._config, discover: { categoriesCount: 5 } } });
  other._catCacheLoad();
  assert.equal(other._catCache, null);
});

test('storage that refuses does not break the card', () => {
  const card = makeCard({ _catAllReady: true });
  card._catHtmlNow = { trending: '<div>t</div>' };
  const set = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  try { assert.doesNotThrow(() => card._catCacheSave()); }
  finally { localStorage.setItem = set; }
});

// ── The polls and the start ──────────────────────────────────────────────
// Every fetch stubbed and counted; what _fetchAll decides to ask is the test
function counted(extra = {}) {
  const card = makeCard({ _recSources: {}, ...extra });
  const calls = {};
  let proto = Object.getPrototypeOf(card);
  const names = new Set();
  while (proto && proto !== Object.prototype) {
    for (const n of Object.getOwnPropertyNames(proto)) if (/^_fetch/.test(n) && n !== '_fetchAll') names.add(n);
    proto = Object.getPrototypeOf(proto);
  }
  for (const n of names) card[n] = async () => { calls[n] = (calls[n] || 0) + 1; };
  card._fetchCapabilities = async (force) => {
    calls._fetchCapabilities = (calls._fetchCapabilities || 0) + 1;
    if (card._capsLoaded && !force) return null;
    card._capsLoaded = true; card._overseerrConfigured = false;
    return { radarr2: false };
  };
  card._render = () => {};
  card._renderSoon = () => {};
  card._sendPing = () => {};
  card._visibleCatIds = () => new Set();
  card._computeActMissingCache = () => {};
  card._dataFingerprint = () => Math.random();
  return { card, calls };
}

test('a poll leaves the libraries alone for five minutes; anything else asks for them', async () => {
  const { card, calls } = counted();
  await card._fetchAll();
  assert.equal(calls._fetchRadarr, 1);
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 1, 'the poll skipped them');
  assert.equal(calls._fetchRadarrQueue, 2, 'the queues are asked every time');
  await card._fetchAll();
  assert.equal(calls._fetchRadarr, 2, 'a title added asks at once');
  card._libsAt = Date.now() - 6 * 60_000;
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 3, 'five minutes on, the poll asks too');
});

test('a title leaving a queue brings the libraries in on the poll', async () => {
  const { card, calls } = counted();
  await card._fetchAll();
  card._radarrQueueActive = new Set([7]);
  card._fetchRadarrQueue = async () => { card._radarrQueueActive = new Set(); };
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 2);
  assert.equal(calls._fetchSonarr, 2);
});

test("the start uses last time's answer on what is set up, and asks again behind", async () => {
  const first = counted();
  await first.card._fetchAll();
  const { card, calls } = counted();
  let waited = false;
  card._fetchCapabilities = async () => { await new Promise(r => setTimeout(r, 20)); waited = true; return null; };
  await card._fetchAll();
  assert.equal(waited, false, 'the round did not wait for the integration');
  assert.equal(card._radarr2Configured, false, "last time's answer applied");
  assert.equal(calls._fetchRadarr, 1);
  await new Promise(r => setTimeout(r, 30));
  assert.equal(waited, true, 'asked again behind');
});

test('the first load notes nothing unless asked to', () => {
  const card = makeCard();
  card._loadLogStart();
  card._loadLogCall('arr_stack/radarr/movies', 5);
  assert.equal(card._loadLog, undefined);
  card._loadLogPrint();
});

test('the first load notes each answer, slowest kept per call', () => {
  localStorage.setItem('arr-debug-load', '1');
  const card = makeCard();
  card._loadLogStart();
  card._loadLogCall('arr_stack/sonarr/episodefiles?seriesId=1', 120);
  card._loadLogCall('arr_stack/sonarr/episodefiles?seriesId=2', 300);
  assert.deepEqual(card._loadLog.calls.get('sonarr/episodefiles'), { n: 2, ms: 300 });
  const group = console.groupCollapsed, table = console.table, end = console.groupEnd;
  let title = '';
  console.groupCollapsed = t => { title = t; }; console.table = () => {}; console.groupEnd = () => {};
  try { card._loadLogPrint(); } finally { console.groupCollapsed = group; console.table = table; console.groupEnd = end; }
  assert.match(title, /first load: everything \d+ ms/);
  card._loadLogCall('arr_stack/radarr/movies', 5);
  assert.ok(!card._loadLog.calls.has('radarr/movies'), 'nothing noted after the first load');
});

test('a change made from the card has the polls take the libraries for two minutes', async () => {
  const { card, calls } = counted();
  card._hass = { ...card._hass, callApi: async () => ({}) };
  await card._fetchAll();
  await card._callApi('POST', 'arr_stack/overseerr/search', { query: 'x' });
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 1, 'a search changes nothing');
  await card._callApi('DELETE', 'arr_stack/radarr/movie/5');
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 2, 'a deletion shows on the next poll');
});

test("a new event in a Radarr's history brings its library in on the poll", async () => {
  const { card, calls } = counted();
  await card._fetchAll();
  card._dlHistTop = { radarr: 10 };
  card._fetchDlHistory = async () => { card._dlHistTop = { radarr: 11 }; };
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 2);
});

test('a Seerr request turning available brings the libraries in on the poll', async () => {
  const { card, calls } = counted();
  await card._fetchAll();
  card._seerrRequests = [{ id: 1, status: 2, media: { status: 3 } }];
  card._visibleCatIds = () => new Set(['recentlyRequested']);
  card._fetchSeerrRequests = async () => { card._seerrRequests = [{ id: 1, status: 2, media: { status: 5 } }]; };
  await card._fetchAll({ poll: true });
  assert.equal(calls._fetchRadarr, 2);
});

// ── Sonarr's posters (render/arr-img.js) ─────────────────────────────────
const show = (extra = {}) => ({ id: 4, tvdbId: 99, images: [{ coverType: 'poster',
  url: '/MediaCover/4/poster.jpg?lastWrite=777', remoteUrl: 'https://artworks.thetvdb.com/banners/p.jpg' }], ...extra });

test("without the integration's word a show's poster is TheTVDB's", () => {
  const card = makeCard({ _sonarr: [show()] });
  assert.equal(card._getSonarrPoster(show()), 'https://artworks.thetvdb.com/banners/p.jpg');
});

test("a show's poster comes signed from Sonarr, from the right instance", async () => {
  const asked = [];
  const card = makeCard({ _arrImageCap: true, _sonarr: [show()], _sonarr2: [show({ id: 4, tvdbId: 55, _isSonarr2: true })] });
  card._hass = { ...card._hass, callWS: async m => { asked.push(m.path); return { path: `${m.path}&authSig=t` }; } };
  card._arrImgRepaint = () => {};
  assert.equal(card._getSonarrPoster(show()), null, 'on its way');
  await new Promise(r => setTimeout(r, 60));
  assert.deepEqual(asked, ['/api/arr_stack/sonarr/image?id=4&file=poster-500.jpg&v=777']);
  assert.equal(card._getSonarrPoster(show()), '/api/arr_stack/sonarr/image?id=4&file=poster-500.jpg&v=777&authSig=t');
  // Same id, another show: the second instance's, by its TVDB id
  assert.equal(card._getSonarrPoster(show({ tvdbId: 55 })), null);
  await new Promise(r => setTimeout(r, 60));
  assert.match(asked[1], /sonarr2\/image\?id=4/);
  // In neither library: TheTVDB's
  assert.equal(card._getSonarrPoster(show({ tvdbId: 1 })), 'https://artworks.thetvdb.com/banners/p.jpg');
  // Kept for the next load
  assert.ok(JSON.parse(localStorage.getItem('arr-img-sig'))['/api/arr_stack/sonarr/image?id=4&file=poster-500.jpg&v=777']);
});

test('a signature that cannot be had falls back to TheTVDB', async () => {
  const card = makeCard({ _arrImageCap: true, _sonarr: [show()] });
  card._hass = { ...card._hass, callWS: async () => { throw new Error('no'); } };
  card._arrImgRepaint = () => {};
  card._getSonarrPoster(show());
  await new Promise(r => setTimeout(r, 60));
  assert.equal(card._getSonarrPoster(show()), 'https://artworks.thetvdb.com/banners/p.jpg');
});

test('a poster that loads in a peek is dealt in; anywhere else it is not', () => {
  const card = makeCard();
  const root = document.createElement('div');
  Object.defineProperty(card, 'shadowRoot', { value: root });
  root.innerHTML = '<span class="mob-peek" data-peek="trending"><img src="a.jpg"></span><div class="mc"><img src="b.jpg"></div>';
  card._wirePeekDeal();
  const [peek, other] = root.querySelectorAll('img');
  for (const img of [peek, other]) img.dispatchEvent(new Event('load'));
  assert.ok(peek.classList.contains('peek-in'));
  assert.ok(!other.classList.contains('peek-in'));
  // A refresh: another title's poster is dealt again, a renewed signature is not
  peek.classList.remove('peek-in');
  peek.setAttribute('src', 'a.jpg?authSig=new');
  peek.dispatchEvent(new Event('load'));
  assert.ok(!peek.classList.contains('peek-in'), 'same picture, new signature');
  peek.setAttribute('src', 'c.jpg');
  peek.dispatchEvent(new Event('load'));
  assert.ok(peek.classList.contains('peek-in'), 'another poster');
  // The row drawn again from scratch: its pictures are not dealt a second time
  root.querySelector('.mob-peek').innerHTML = '<img src="c.jpg">';
  const again = root.querySelector('.mob-peek img');
  again.dispatchEvent(new Event('load'));
  assert.ok(!again.classList.contains('peek-in'));
});

test('a list whose rows come and go keeps the rows it still has, pictures and all', async () => {
  const { makeCard: mk } = await import('./harness.js');
  const card = mk();
  const col = document.createElement('div');
  const row = (k, src) => `<button data-key="${k}"><span class="mob-peek"><img src="${src}"></span></button>`;
  card._paintCol(col, `<div class="mob-rows">${row('a', '1.jpg')}${row('b', '2.jpg')}</div>`);
  const imgB = col.querySelector('[data-key="b"] img');
  card._paintCol(col, `<div class="mob-rows">${row('a', '1.jpg')}${row('lib', '3.jpg')}${row('b', '2.jpg')}</div>`);
  assert.deepEqual([...col.querySelectorAll('[data-key]')].map(e => e.dataset.key), ['a', 'lib', 'b']);
  assert.equal(col.querySelector('[data-key="b"] img'), imgB, 'the same picture element, not a new one');
});

test("a peek keeps last time's posters through the load and changes once, when everything is in", () => {
  const card = makeCard({ _catReady: new Set(['trending']), _catCache: { trending: { i: ['old.jpg'] } } });
  assert.deepEqual(card._catPeek('trending', 'T', ['new.jpg']), ['old.jpg'], 'its data is in, the others not yet');
  card._catAllReady = true;
  card._arrImgQueue = new Set(['/api/arr_stack/sonarr/image?id=1']);
  assert.deepEqual(card._catPeek('trending', 'T', ['new.jpg']), ['old.jpg'], 'a signature still on its way');
  card._arrImgQueue = new Set();
  assert.deepEqual(card._catPeek('trending', 'T', ['new.jpg']), ['new.jpg'], 'settled: one change');
  card._arrImgQueue = new Set(['/later']);
  assert.deepEqual(card._catPeek('trending', 'T', ['new.jpg']), ['new.jpg'], 'a signature asked later changes nothing');
});

test('a grab is followed after its window closes, and the column redrawn when the queue has it', async () => {
  let redrawn = 0;
  const card = makeCard({ _sonarrQueueSeriesPct: new Map() });
  card._reRenderRight = () => { redrawn++; };
  card._fetchSonarrQueue = async () => { card._sonarrQueueSeriesPct = new Map([[7, 0]]); };
  card._grabWatchAdd('sonarr', 7);
  card._grabWatchAdd('sonarr', 7);
  assert.equal(card._grabWatch.length, 1, 'one watch a title');
  await card._grabWatchTick();
  assert.equal(redrawn, 1);
  assert.equal(card._grabWatch.length, 0);
  await card._grabWatchTick();
  assert.equal(redrawn, 1, 'nothing left to follow');
});

test('a show starting to download changes what the full poll compares', () => {
  const card = makeCard();
  const before = card._dataFingerprint();
  card._sonarrQueueEpisodes = new Set([12]);
  card._sonarrQueueSeriesPct = new Map([[3, 10]]);
  assert.notEqual(card._dataFingerprint(), before);
});

test('two downloads keep their order from one refresh to the next', () => {
  const card = makeCard({
    _seerrRequests: [], _radarr: [], _radarr2: [], _sonarr2: [],
    _sonarr: [{ id: 3, tvdbId: 30, title: 'Show', added: '2026-01-01' }],
    _sonarrQueueSeriesPct: new Map([[3, 10]]),
  });
  card._rqMusicItems = () => [{ _mediaType: 'music', id: 9, title: 'Album', _sortDate: '9999-12-31T00:00:00Z' }];
  const order = () => (card._seerrRequestItems() || []).map(i => i._mediaType);
  const first = order();
  for (let i = 0; i < 5; i++) assert.deepEqual(order(), first);
});

test("a category that waits for its data to show at all stands in the list from last time's", () => {
  setViewport(390);
  const card = listCard({ _catReady: new Set(), _catCache: { library: { t: 'Library', i: ['l.jpg'] } },
    _config: { discover: { categoriesCount: 3, mobileLayout: 'list' }, categories: [{ id: 'trending', enabled: true }, { id: 'library', enabled: true }] } });
  const doc = parse(card._renderRight());
  const row = doc.querySelector('.mob-row[data-key="library"]');
  assert.ok(row, 'the Library row is there before the libraries are');
  assert.equal(row.querySelector('.mob-row-t b').textContent, 'Library');
  assert.equal(row.querySelector('.mob-peek img').getAttribute('src'), 'l.jpg');
});
