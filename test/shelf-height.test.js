// A tablet's shelves stand as tall as a category does as pages: the shelf's
// posters take what is left under the heading. The shelf's own height is its
// posters', so it is never the measure — taken from it, a category stood a
// heading taller than the rest and grew with every refresh up to the ceiling.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, setViewport } from './harness.js';

afterEach(() => setViewport(1400));

const HDR = 39;   // heading, gaps and padding of a category: everything but the shelf

function column() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-right"><div class="rp-sections mob-shelves shelf-fill">'
    + '<div class="sec-card"><div class="col-hdr"></div><div class="mgrid shelf"><div class="mc"></div></div></div>'
    + '</div></div>';
  const right = root.getElementById('col-right');
  Object.defineProperty(right, 'clientWidth', { get: () => 677 });
  // Laid out as a browser does: the posters are --shelf-h tall, the shelf as
  // tall as they are or as the category's floor leaves it (flex: 1), the
  // category its heading more
  const shelfH = () => parseFloat(right.style.getPropertyValue('--shelf-h')) || 180;
  const floor = () => parseFloat(right.style.getPropertyValue('--sec-min-h')) || 0;
  const shelfBox = () => Math.max(shelfH(), floor() - HDR);
  Object.defineProperty(root.querySelector('.mgrid.shelf'), 'offsetHeight', { get: shelfBox });
  Object.defineProperty(root.querySelector('.sec-card'), 'offsetHeight', { get: () => shelfBox() + HDR });
  const card = makeCard({ shadowRoot: root, _mobFlow: true });
  return { card, right };
}

test('a shelf takes its category\'s height less the heading', () => {
  setViewport(1280);
  const { card, right } = column();
  card._flowSecH = 260;
  card._syncSecHeights();
  assert.equal(right.style.getPropertyValue('--sec-min-h'), '260px');
  assert.equal(right.style.getPropertyValue('--shelf-h'), `${260 - HDR}px`);
});

test('before the pages are measured, a shelf is not measured on screen', () => {
  setViewport(1280);
  localStorage.removeItem('arr-shelf-h');
  const { card, right } = column();
  card._flowSecH = 0;
  // The column stretched the lone category during the first load
  right.style.setProperty('--sec-min-h', '620px');
  for (let i = 0; i < 10; i++) card._syncSecHeights();
  assert.equal(right.style.getPropertyValue('--sec-min-h'), '');
  assert.equal(right.style.getPropertyValue('--shelf-h'), '');
});

test('until then, last time\'s height at this width', () => {
  setViewport(1280);
  const { card, right } = column();
  card._shelfKeep(right.clientWidth, 250);
  card._flowSecH = 0;
  card._syncSecHeights();
  assert.equal(right.style.getPropertyValue('--sec-min-h'), '250px');
  assert.equal(right.style.getPropertyValue('--shelf-h'), `${250 - HDR}px`);
  localStorage.removeItem('arr-shelf-h');
});

test('a shelf poster never stands taller than a poster in a row of pages would', () => {
  setViewport(1280);
  const { card, right } = column();
  card._flowSecH = 900;
  card._syncSecHeights();
  assert.ok(parseFloat(right.style.getPropertyValue('--shelf-h')) <= 340);
});

test('the downloads\' column keeps its place until the services are known', () => {
  setViewport(1280);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div class="card-body"><div id="col-left"></div><div id="col-right"></div></div>';
  const card = makeCard({ shadowRoot: root, _capsLoaded: false, _requestPending: true });
  card._renderLeft = () => '';
  card._mobMinWrap = (_, h) => h;
  card._paintCol = () => {};
  card._measureFlagRatio = () => {};
  card._watchOverlays = () => {};
  Object.getPrototypeOf(card)._render.call(card);
  assert.ok(!root.querySelector('.card-body').classList.contains('no-downloads'));
  card._capsLoaded = true;
  Object.getPrototypeOf(card)._render.call(card);
  assert.ok(root.querySelector('.card-body').classList.contains('no-downloads'));
});

test('last time\'s services are taken before last time\'s look is drawn', async () => {
  const order = [];
  const card = makeCard({ _initialFetchDone: false, _capsLoaded: false });
  card._bootApply = () => { order.push('boot'); card._capsLoaded = true; return true; };
  card._catStart = () => order.push('look');
  card._bootRefresh = () => {};
  // The rest of the first round is not under test
  card._fetchCapabilities = () => { throw new Error('stop'); };
  card._overseerrConfigured = false;
  try { await Object.getPrototypeOf(card)._fetchAll.call(card); } catch { /* the rest of the round */ }
  assert.deepEqual(order.slice(0, 2), ['boot', 'look']);
});

test('a category never stands taller than a capped poster under its heading', () => {
  setViewport(1280);
  const { card, right } = column();
  card._flowSecH = 620;   // the column's height, measured with one category in it
  card._syncSecHeights();
  assert.ok(parseFloat(right.style.getPropertyValue('--sec-min-h')) <= 400);
});

test('on shelves the Library\'s tiles are a shelf, as tall as the posters', () => {
  const card = makeCard({ _mobFlow: true });
  card._libBuildTile = id => `<div class="lib-tile" data-id="${id}"></div>`;
  for (const m of ['_libMoviesData', '_libTvData', '_libTopRatedData', '_libTopQualityData', '_libMusicData']) card[m] = () => ({});
  const html = card._renderLibrary();
  assert.match(html, /class="mgrid shelf"/);
});

test('a category measured tall while loading does not hold the column once everything is in', () => {
  setViewport(1280);
  localStorage.removeItem('arr-sec-h2');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-right"><div class="rp-sections"><div class="sec-card"></div><div class="sec-card"></div></div></div>';
  const right = root.getElementById('col-right');
  Object.defineProperty(right, 'clientWidth', { get: () => 391 });
  let h = 440;   // last time's look, or grey shapes, while loading
  for (const c of root.querySelectorAll('.sec-card')) Object.defineProperty(c, 'offsetHeight', { get: () => h });
  const card = makeCard({ shadowRoot: root, _mobFlow: false, _heightsLoading: true, _catReady: undefined, _catAllReady: false });
  card._syncSecHeights();
  // Nothing kept from last time: no floor while loading
  assert.equal(right.style.getPropertyValue('--sec-min-h'), '');
  h = 220;       // the live categories
  card._catDone = Object.getPrototypeOf(card)._catDone;
  card._loadLogPrint = () => {};
  card._catDone();
  card._syncSecHeights();
  assert.equal(right.style.getPropertyValue('--sec-min-h'), '220px');
  localStorage.removeItem('arr-sec-h2');
});

test('nothing measured before the categories are tracked is kept for the next load', () => {
  setViewport(1280);
  localStorage.removeItem('arr-sec-h2');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-right"><div class="rp-sections"><div class="sec-card"></div><div class="sec-card"></div></div></div>';
  const right = root.getElementById('col-right');
  Object.defineProperty(right, 'clientWidth', { get: () => 880 });
  for (const c of root.querySelectorAll('.sec-card')) Object.defineProperty(c, 'offsetHeight', { get: () => 990 });
  // The card's first paint: no data, the categories not tracked yet
  const card = makeCard({ shadowRoot: root, _mobFlow: false, _heightsLoading: true });
  card._syncSecHeights();
  assert.equal(localStorage.getItem('arr-sec-h2'), null);
  assert.equal(right.style.getPropertyValue('--sec-min-h'), '');
});

test('on a shelf the calendar\'s More poster closes the row where every other category\'s does', async () => {
  const { SHELF_MAX } = await import('../src/render/sections.js');
  const eps = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, _mediaType: 'movie', series: { id: i + 1 }, airDateUtc: '2026-11-0' + (1 + (i % 9)) + 'T00:00:00Z' }));
  const card = makeCard({ _mobFlow: true, _config: { discover: { showMoreOnPage: 1, itemsPerCategory: 4 } } });
  card._calCatItems = () => eps;
  card._renderCalendarCard = ep => `<div class="mc cal-ep" data-ep="${ep.id}"></div>`;
  const html = card._renderCalendar();
  const n = (html.match(/class="mc cal-ep"/g) || []).length;
  assert.equal(n, SHELF_MAX - 1);
  assert.match(html, /smp-card/);
});
