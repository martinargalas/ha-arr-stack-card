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
  const d = { _sonarrSeries: { id: 1, seasons: [{ seasonNumber: 1 }, { seasonNumber: 2 }] }, seasons: [{ seasonNumber: 1, posterPath: '/a.jpg' }, { seasonNumber: 2, posterPath: '/b.jpg' }] };
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet sn-folded sn-row"/);
  card._snTilesUp = true;
  assert.match(card._ppSnTilesHtml(d), /class="sn-tiles-sheet"/);
});
