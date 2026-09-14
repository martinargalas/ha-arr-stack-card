// Taking the card off the page stops everything it runs on a timer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

test('taking the card off the page stops the watch for a grabbed release', t => {
  const card = makeCard();
  const id = setInterval(() => {}, 1e6);
  t.after(() => clearInterval(id));
  card._ppGrabTimer = id;
  card.disconnectedCallback();
  assert.equal(card._ppGrabTimer, null);
});
