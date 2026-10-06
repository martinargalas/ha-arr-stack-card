// A column is painted by changing only what changed: unchanged markup leaves
// the DOM alone, and a changed poster replaces that poster, not the column.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const col = () => document.createElement('div');
const poster = (id, t) => `<div class="mc" data-id="${id}"><img src="${id}.jpg"><span>${t}</span></div>`;
const row = items => `<div class="rp-sections"><div class="sec-card"><div class="grid">${items.join('')}</div></div></div>`;

test('the same markup paints nothing', () => {
  const card = makeCard(), el = col();
  card._paintCol(el, row([poster(1, 'A'), poster(2, 'B')]));
  const img = el.querySelector('img');
  assert.equal(card._paintCol(el, row([poster(1, 'A'), poster(2, 'B')])), false);
  assert.equal(el.querySelector('img'), img, 'the very same node');
});

test('a changed poster replaces that poster and keeps its neighbours', () => {
  const card = makeCard(), el = col();
  card._paintCol(el, row([poster(1, 'A'), poster(2, 'B')]));
  const [first, second] = el.querySelectorAll('.mc');
  first.style.minHeight = '10px';   // something the card set since
  card._paintCol(el, row([poster(1, 'A'), poster(2, 'B2')]));
  const [a, b] = el.querySelectorAll('.mc');
  assert.equal(a, first, 'the unchanged poster is kept, with what was set on it');
  assert.equal(a.style.minHeight, '10px');
  assert.equal(b.querySelector('img'), second.querySelector('img'), 'inside the changed one, the picture stays too');
  assert.equal(b.textContent, 'B2');
});

test('a different shape repaints the column whole', () => {
  const card = makeCard(), el = col();
  card._paintCol(el, row([poster(1, 'A')]));
  card._paintCol(el, row([poster(1, 'A'), poster(2, 'B'), poster(3, 'C')]));
  assert.equal(el.querySelectorAll('.mc').length, 3);
  assert.equal(el.innerHTML, row([poster(1, 'A'), poster(2, 'B'), poster(3, 'C')]));
});

test('a write past _paintCol that clears the record makes the next paint start over', () => {
  const card = makeCard(), el = col();
  card._paintCol(el, row([poster(1, 'A')]));
  el.innerHTML = '<p>something else</p>';
  el._arrHtml = null;
  card._paintCol(el, row([poster(1, 'A')]));
  assert.equal(el.querySelectorAll('.mc').length, 1);
});
