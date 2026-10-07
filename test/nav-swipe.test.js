// A swipe across the right column's pager turns one page by pressing the
// arrow it points to; a short or mostly vertical move does nothing.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup({ first = false, last = false } = {}) {
  const root = document.createElement('div');
  root.innerHTML = `<div class="rp-nav">
    <button class="rp-btn" data-section="right" data-dir="prev"${first ? ' disabled' : ''}></button>
    <button class="rp-btn" data-section="right" data-dir="next"${last ? ' disabled' : ''}></button></div>`;
  const card = makeCard({ shadowRoot: root });
  card._wireSwipe(new AbortController().signal);
  const pressed = [];
  root.querySelectorAll('.rp-btn').forEach(b => b.addEventListener('click', () => pressed.push(b.dataset.dir)));
  const nav = root.querySelector('.rp-nav');
  const touch = (type, x, y) => {
    const e = new window.Event(type, { bubbles: true });
    Object.defineProperty(e, type === 'touchstart' ? 'touches' : 'changedTouches', { value: [{ clientX: x, clientY: y }] });
    nav.dispatchEvent(e);
  };
  const swipe = (dx, dy = 0) => { touch('touchstart', 200, 100); touch('touchend', 200 + dx, 100 + dy); };
  return { swipe, pressed };
}

test('left turns to the next page, right to the previous', () => {
  const { swipe, pressed } = setup();
  swipe(-120);
  swipe(120);
  assert.deepEqual(pressed, ['next', 'prev']);
});

test('a short or vertical move turns nothing', () => {
  const { swipe, pressed } = setup();
  swipe(-20);
  swipe(-60, -150);
  assert.deepEqual(pressed, []);
});

test('nothing past the first or the last page', () => {
  const { swipe, pressed } = setup({ first: true, last: true });
  swipe(-120);
  swipe(120);
  assert.deepEqual(pressed, []);
});
