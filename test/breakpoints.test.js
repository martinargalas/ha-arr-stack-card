// Width breakpoints: each layout switches at the same width it always did.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard, setViewport } from './harness.js';

test('the width getters switch where they did', (t) => {
  t.after(() => setViewport(1400));
  const card = makeCard();
  const at = px => { setViewport(px); return [card._isMob, card._isTablet, card._isNarrow]; };
  assert.deepStrictEqual(at(600),  [true,  true,  true]);
  assert.deepStrictEqual(at(601),  [false, true,  true]);
  assert.deepStrictEqual(at(900),  [false, true,  true]);
  assert.deepStrictEqual(at(901),  [false, false, true]);
  assert.deepStrictEqual(at(1400), [false, false, true]);
  assert.deepStrictEqual(at(1401), [false, false, false]);
});
