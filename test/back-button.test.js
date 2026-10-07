// The phone's back button closes the card's topmost modal instead of leaving
// the dashboard, one level per press, and closing a modal by its X leaves no
// step behind in the history.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

globalThis.MouseEvent = window.MouseEvent;
const wait = ms => new Promise(r => setTimeout(r, ms));
// Press back and wait until the card has dealt with it (its listener runs first)
const back = () => new Promise(r => {
  window.addEventListener('popstate', () => setTimeout(r, 0), { once: true });
  window.history.back();
});

function setup() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const card = makeCard({ shadowRoot: root });
  card._backKey = 'k' + Math.random();
  return { card, root };
}

function modal(root, { onClose, z } = {}) {
  const o = document.createElement('div');
  o.className = 'popup-overlay';
  if (z) o.style.zIndex = String(z);
  o.innerHTML = '<div class="popup-glass"><button class="popup-close">x</button></div>';
  o.querySelector('.popup-close').addEventListener('click', onClose || (() => o.remove()));
  root.appendChild(o);
  return o;
}

test('opening a modal adds one history entry; back closes it', async () => {
  const { card, root } = setup();
  card._backInit();
  const before = window.history.length;
  modal(root);
  card._backSync();
  assert.equal(window.history.length, before + 1);
  modal(root);           // a second one over it adds nothing more
  card._backSync();
  assert.equal(window.history.length, before + 1);
  await back();
  assert.equal(root.querySelectorAll('.popup-overlay').length, 1, 'only the top one closed');
  assert.ok(card._backOurs(), 'the entry is back for the next press');
  await back();
  card._backSync();
  assert.equal(root.querySelectorAll('.popup-overlay').length, 0);
  card._backStop();
  root.remove();
});

test('the topmost is the highest z-index, then the later one', () => {
  const { card, root } = setup();
  const high = modal(root, { z: 1300 });
  modal(root);
  assert.equal(card._backTop(), high);
  const last = modal(root, { z: 1300 });
  assert.equal(card._backTop(), last);
  root.remove();
});

test('a modal that steps back inside itself keeps the entry for the next press', async () => {
  const { card, root } = setup();
  card._backInit();
  let level = 2;
  const o = modal(root, { onClose: () => { if (--level === 0) o.remove(); } });
  card._backSync();
  await back();
  assert.ok(o.isConnected, 'one level back, still open');
  assert.ok(card._backOurs());
  await back();
  assert.ok(!o.isConnected);
  card._backStop();
  root.remove();
});

test('closing by the X takes the entry off again', async () => {
  const { card, root } = setup();
  card._backInit();
  const o = modal(root);
  card._backSync();
  assert.ok(card._backOurs());
  o.querySelector('.popup-close').click();
  card._backSync();
  await wait(450);
  assert.ok(!card._backOurs(), 'the history is back where it was');
  assert.equal(card._backArmed, false);
  // The next modal takes the same slot rather than adding another
  const at = window.history.length;
  modal(root);
  card._backSync();
  assert.ok(card._backOurs());
  assert.ok(window.history.length <= at, 'replaces the step it took off');
  card._backStop();
  root.remove();
});

test('switching modals through a moment with nothing open keeps one entry', async () => {
  const { card, root } = setup();
  card._backInit();
  const a = modal(root);
  card._backSync();
  a.remove();
  card._backSync();
  await wait(50);
  modal(root);
  card._backSync();
  await wait(450);
  assert.ok(card._backOurs());
  assert.equal(card._backArmed, true);
  card._backStop();
  root.remove();
});
