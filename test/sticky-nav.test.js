// The sticky nav on a stacked layout follows scrolling without a fast poll: it
// listens to the element that actually scrolls — HA scrolls inside its shadow
// DOM, where a listener on document hears nothing — and tears all of it down.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, setViewport } from './harness.js';

const tick = () => new Promise(r => setTimeout(r, 5));

function stickyCard() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-left"></div><div id="col-right"></div><nav class="rp-nav"></nav>';
  const scroller = document.createElement('div');
  const card = makeCard({ shadowRoot: root, _cfg: {} });
  card._findScrollContainer = () => scroller;
  const left = root.getElementById('col-left');
  let leftBottom = 500;   // on screen until a test scrolls it away
  left.getBoundingClientRect = () => ({ top: leftBottom - 400, bottom: leftBottom, height: 400 });
  root.getElementById('col-right').getBoundingClientRect = () => ({ top: leftBottom, bottom: leftBottom + 2000, height: 2000 });
  return {
    card, scroller,
    nav: root.querySelector('.rp-nav'),
    scrollLeftAway() { leftBottom = 20; },
  };
}

test('scrolling the real scroller shows the nav once the first column is gone', async t => {
  setViewport(600);
  t.after(() => setViewport(1400));
  const { card, scroller, nav, scrollLeftAway } = stickyCard();
  t.after(() => card._clearNavWatcher());
  card._wireStickyNav();
  assert.ok(!nav.classList.contains('rp-nav-visible'));
  scrollLeftAway();
  scroller.dispatchEvent(new window.Event('scroll'));
  await tick();
  assert.ok(nav.classList.contains('rp-nav-visible'));
});

test('the poll that stays is a slow backstop, not the 150 ms one', t => {
  setViewport(600);
  t.after(() => setViewport(1400));
  const { card } = stickyCard();
  t.after(() => card._clearNavWatcher());
  const delays = [];
  const real = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { delays.push(ms); return real(fn, ms); };
  try { card._wireStickyNav(); } finally { globalThis.setInterval = real; }
  assert.deepEqual(delays, [1000]);
});

test('both columns are observed, and tearing down stops every signal', async t => {
  setViewport(600);
  t.after(() => setViewport(1400));
  const observed = [];
  let disconnected = 0;
  globalThis.IntersectionObserver = class { observe(el) { observed.push(el.id); } disconnect() { disconnected++; } };
  t.after(() => { delete globalThis.IntersectionObserver; });
  const { card, scroller, nav, scrollLeftAway } = stickyCard();
  card._wireStickyNav();
  card._wireStickyNav();   // a re-render wires again; the first set is cleared
  assert.deepEqual(observed, ['col-left', 'col-right', 'col-left', 'col-right']);
  assert.equal(disconnected, 1);

  card._clearNavWatcher();
  assert.equal(disconnected, 2);
  assert.equal(card._navInterval, null);
  assert.equal(card._navScroller, null);
  scrollLeftAway();
  scroller.dispatchEvent(new window.Event('scroll'));
  window.dispatchEvent(new window.Event('scroll'));
  await tick();
  assert.ok(!nav.classList.contains('rp-nav-visible'));
});
