// The right column's height is measured by rendering every page. That is only
// worth doing when something that can change the height has changed — paging
// through the column is not one of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

function setup() {
  const host = document.createElement('div');
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = '<div id="col-right"></div>';
  const card = makeCard({ shadowRoot: sr, _pages: { radarr: 0 }, _rightPage: 0 });
  let renders = 0, fp = 'a';
  card._renderRight = () => { renders++; return '<div class="page"></div>'; };
  card._wireRight = () => {};
  card._dataFingerprint = () => fp;
  return { card, renders: () => renders, setData: v => { fp = v; } };
}

test('paging through the right column does not measure it again', () => {
  const { card, renders } = setup();
  card._measureAndLockHeight();
  const first = renders();
  assert.ok(first > 0, 'the first time measures');
  card._rightPage = 1;
  card._measureAndLockHeight();
  assert.equal(renders(), first, 'the second time renders nothing');
});

test('new data measures again', () => {
  const { card, renders, setData } = setup();
  card._measureAndLockHeight();
  const first = renders();
  setData('b');
  card._measureAndLockHeight();
  assert.ok(renders() > first);
});

test('a new configuration measures again', () => {
  const { card, renders } = setup();
  card._measureAndLockHeight();
  const first = renders();
  card._config = { ...card._config };
  card._measureAndLockHeight();
  assert.ok(renders() > first);
});
