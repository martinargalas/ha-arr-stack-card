// A phone's posters (a series' seasons, an artist's albums) lie in one row
// scrolled sideways until the sheet has the whole window; dragged by its pill
// the sheet stops only at its fixed places.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';
import { wireSheetPill } from '../src/shared/ui.js';

function fakePill() {
  const ls = {};
  return {
    classList: { add() {}, remove() {} },
    addEventListener: (ev, fn) => { ls[ev] = fn; },
    fire: (ev, y) => ls[ev]?.({ touches: [{ clientY: y }], cancelable: true, preventDefault() {}, stopPropagation() {} }),
  };
}

test('dragged, a sheet with fixed places goes to the nearest of them, nothing between', () => {
  const pill = fakePill();
  let h = 100, last = null;
  wireSheetPill(pill, {
    getH: () => h, setH: v => { h = v; }, metrics: () => ({ min: 100, max: 600, stops: [100, 260, 600] }),
    done: v => { last = v; },
  });
  pill.fire('touchstart', 500);
  pill.fire('touchmove', 380);   // up 120 → 220, nearest the row
  assert.equal(h, 260);
  pill.fire('touchmove', 100);   // up 400 → 500, nearest the window
  assert.equal(h, 600);
  pill.fire('touchend');
  assert.equal(last, 600);
});

test('a phone\'s seasons sheet opens in one row; raised to the window it is a grid', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isNarrow', { get: () => true, configurable: true });
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  const ns = [1, 2, 3, 4];
  const d = { _sonarrSeries: { id: 1, seasons: ns.map(n => ({ seasonNumber: n })) }, seasons: ns.map(n => ({ seasonNumber: n, posterPath: `/${n}.jpg` })) };
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-init sn-wait sn-folded sn-row"/);
  card._snTilesUp = true;
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-init sn-wait"/);
});

test('as many seasons as a row of the grid holds, or fewer: that row across the width, nothing to scroll sideways', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isNarrow', { get: () => true, configurable: true });
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  const ns = [1, 2, 3];
  const d = { _sonarrSeries: { id: 1, seasons: ns.map(n => ({ seasonNumber: n })) }, seasons: ns.map(n => ({ seasonNumber: n, posterPath: `/${n}.jpg` })) };
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-init sn-wait sn-folded" data-few/);
});

// The sheet itself, taken above its posters or on them while they lie in a row
function fakeArea() {
  const ls = {};
  return {
    addEventListener: (ev, fn, o) => { (ls[ev + (o?.capture ? '!' : '')] ||= []).push(fn); },
    fire: (ev, x, y, target = {}) => {
      const e = { target, touches: [{ clientX: x, clientY: y }], cancelable: true, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
      for (const fn of ls[ev + '!'] || []) fn(e);
      for (const fn of ls[ev] || []) fn(e);
      return e;
    },
  };
}

function wiredArea({ row = true } = {}) {
  const pill = { ...fakePill(), contains: () => false, pressed: false };
  pill.classList = { add: () => { pill.pressed = true; }, remove: () => { pill.pressed = false; } };
  const area = fakeArea();
  const st = { h: 100, last: null };
  wireSheetPill(pill, {
    getH: () => st.h, setH: v => { st.h = v; }, metrics: () => ({ min: 100, max: 600, stops: [100, 260, 600] }),
    done: v => { st.last = v; },
    area, headBottom: () => 520, swipe: t => row && !!t.poster,
  });
  return { pill, area, st };
}

test('the strip above the posters drags the sheet as its pill does, and the pill shows it is held', () => {
  const { pill, area, st } = wiredArea();
  area.fire('touchstart', 300, 510);
  const e = area.fire('touchmove', 300, 380);
  assert.equal(st.h, 260);
  assert.ok(e.prevented && e.stopped, 'the page and the pop-up stay still');
  assert.ok(pill.pressed);
  area.fire('touchend', 300, 380);
  assert.equal(st.last, 260);
  assert.ok(!pill.pressed);
});

test('on posters in a row: sideways is their scroll, up drags the sheet', () => {
  const { area, st } = wiredArea();
  area.fire('touchstart', 300, 560, { poster: true });
  const side = area.fire('touchmove', 240, 555, { poster: true });
  assert.equal(st.h, 100);
  assert.ok(!side.prevented, 'the row scrolls');
  area.fire('touchend', 240, 555);
  assert.equal(st.last, null);

  area.fire('touchstart', 300, 560, { poster: true });
  area.fire('touchmove', 305, 420, { poster: true });
  assert.equal(st.h, 260);
});

test('a touch on the sheet does not reach the pop-up around it (Bubble Card\'s swipe to close)', () => {
  const { area } = wiredArea();
  assert.ok(area.fire('touchstart', 300, 510).stopped, 'on its top strip');
  assert.ok(area.fire('touchstart', 300, 700, {}).stopped, 'anywhere else on it');
});

test('below the strip, with the posters in a grid, a touch is the content\'s own', () => {
  const { area, st } = wiredArea({ row: false });
  area.fire('touchstart', 300, 560, { poster: true });
  const e = area.fire('touchmove', 300, 300, { poster: true });
  assert.equal(st.h, 100);
  assert.ok(!e.prevented);
});

test('a dock found after a sheet was laid out measures the sheet again', async () => {
  const card = makeCard();
  let relaid = 0;
  card._snTilesRelay = () => { relaid++; };
  card._syncFixedFrame = () => {};
  const props = {};
  Object.defineProperty(card, 'style', { configurable: true, value: {
    getPropertyValue: k => props[k] || '', setProperty: (k, v) => { props[k] = v; }, removeProperty: k => { delete props[k]; },
  } });
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = fn => fn();
  try {
    card._syncBottomBar(true);            // no dock on the page: nothing changes
    assert.equal(relaid, 0);
    card.style.setProperty('--arr-bottom-bar', '80px');
    card._syncBottomBar(true);            // the dock gone: measured again
    assert.equal(relaid, 1);
  } finally { globalThis.requestAnimationFrame = raf; }
});

test('the sheet waits below the window only the first time it shows in a detail', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isNarrow', { get: () => true, configurable: true });
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  const ns = [1, 2, 3, 4];
  const d = { _sonarrSeries: { id: 1, seasons: ns.map(n => ({ seasonNumber: n })) }, seasons: ns.map(n => ({ seasonNumber: n, posterPath: `/${n}.jpg` })) };
  assert.match(card._ppSnTilesHtml(d), /sn-wait/);
  card._snTilesShown = true;
  assert.doesNotMatch(card._ppSnTilesHtml(d), /sn-wait/, 'a repaint (seasons\' pictures in) does not rise again');
});

test('waiting for the dock: a page that had one waits for it, one without only a moment', async () => {
  const card = makeCard();
  let looks = 0;
  card._syncBottomBar = () => { looks++; if (looks === 4) card._bottomBarTop = 850; };
  card._dockSeen = true;
  await new Promise(r => card._dockWait(r));
  assert.equal(looks, 4, 'found on the fourth look');
  const c2 = makeCard();
  let looks2 = 0;
  c2._syncBottomBar = () => { looks2++; };
  try { localStorage.setItem('arr-dock', '0'); } catch { /* none */ }
  await new Promise(r => c2._dockWait(r));
  assert.equal(looks2, 3);
});

test('dock_offset adds room above a dock, or keeps room where none is known', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  card._syncFixedFrame = () => {};
  const props = {};
  Object.defineProperty(card, 'style', { configurable: true, value: {
    getPropertyValue: k => props[k] || '', setProperty: (k, v) => { props[k] = v; }, removeProperty: k => { delete props[k]; },
  } });
  card._config = { ...(card._config || {}), dock_offset: 40 };
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = fn => fn();
  try {
    card._syncBottomBar(true);   // no dock on the page
    assert.equal(props['--arr-bottom-bar'], '54px', 'the offset alone, with the usual gap');
    assert.equal(card._bottomBarTop, window.innerHeight - 40);
  } finally { globalThis.requestAnimationFrame = raf; }
});

test('a negative dock_offset keeps less than the dock, never below none', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  card._syncFixedFrame = () => {};
  const props = {};
  Object.defineProperty(card, 'style', { configurable: true, value: {
    getPropertyValue: k => props[k] || '', setProperty: (k, v) => { props[k] = v; }, removeProperty: k => { delete props[k]; },
  } });
  card._config = { ...(card._config || {}), dock_offset: -40 };
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = fn => fn();
  try {
    card._syncBottomBar(true);   // no dock: nothing to take from
    assert.equal(props['--arr-bottom-bar'], undefined);
    assert.equal(card._bottomBarTop, null);
  } finally { globalThis.requestAnimationFrame = raf; }
});
