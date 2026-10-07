// The detail repaints only what changed: each answer that came back used to
// rebuild the whole popup — the blurred glass, every picture — and a phone
// showed every one of those rebuilds as a blink.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard, movie } from './harness.js';

function open() {
  const host = document.createElement('div');
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = '<div id="popup-root"></div>';
  const card = makeCard({ shadowRoot: sr });
  card._popup = { ...movie({ title: 'Heat', overview: 'A heist.' }), _type: 'radarr', _radarrId: 1 };
  card._renderPopupEl();
  return { card, root: sr.getElementById('popup-root') };
}

test('a repaint keeps the glass and the parts that did not change', () => {
  const { card, root } = open();
  const overlay = root.querySelector('.popup-overlay');
  const glass = root.querySelector('.popup-glass');
  const poster = root.querySelector('.popup-poster');
  card._popup.overview = 'A heist in Los Angeles.';
  card._renderPopupEl();
  assert.equal(root.querySelector('.popup-overlay'), overlay, 'the same overlay');
  assert.equal(root.querySelector('.popup-glass'), glass, 'the same glass');
  if (poster) assert.equal(root.querySelector('.popup-poster'), poster, 'the same picture');
  assert.match(root.textContent, /Los Angeles/);
});

test('a kept node is not wired twice', () => {
  const { card, root } = open();
  card._renderPopupEl();
  card._renderPopupEl();
  let closed = 0;
  card._popupReturn = () => { closed++; return true; };
  root.querySelector('.popup-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(closed, 1, 'one press, one close');
});

test('closing empties the root and the next open starts afresh', () => {
  const { card, root } = open();
  card._popup = null;
  card._renderPopupEl();
  assert.equal(root.childNodes.length, 0);
  card._popup = { ...movie({ title: 'Ronin' }), _type: 'radarr', _radarrId: 2 };
  card._renderPopupEl();
  assert.match(root.textContent, /Ronin/);
  assert.doesNotMatch(root.textContent, /Heat/);
});
