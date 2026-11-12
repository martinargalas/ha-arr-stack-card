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
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-init sn-folded sn-row"/);
  card._snTilesUp = true;
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-init"/);
});

test('as many seasons as a row of the grid holds, or fewer: that row across the width, nothing to scroll sideways', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isNarrow', { get: () => true, configurable: true });
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  const ns = [1, 2, 3];
  const d = { _sonarrSeries: { id: 1, seasons: ns.map(n => ({ seasonNumber: n })) }, seasons: ns.map(n => ({ seasonNumber: n, posterPath: `/${n}.jpg` })) };
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-init sn-folded" data-few/);
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

test('below the strip, with the posters in a grid, a touch is the content\'s own', () => {
  const { area, st } = wiredArea({ row: false });
  area.fire('touchstart', 300, 560, { poster: true });
  const e = area.fire('touchmove', 300, 300, { poster: true });
  assert.equal(st.h, 100);
  assert.ok(!e.prevented);
});
