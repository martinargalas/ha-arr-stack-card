// A dashboard in a background tab — a wall tablet showing something else — does
// not keep polling Home Assistant and every service behind the card. It
// catches up the moment it is looked at again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

let hidden = false;
Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });

function card() {
  const c = makeCard({ isConnected: true });
  const calls = [];
  c._fetchAll = () => calls.push('all');
  c._fetchDownloadsAndRender = () => calls.push('downloads');
  return { c, calls };
}

test('a hidden tab polls nothing', () => {
  hidden = true;
  const { c, calls } = card();
  c._pollFull();
  c._pollFast();
  assert.deepEqual(calls, []);
});

test('a visible tab polls as before', () => {
  hidden = false;
  const { c, calls } = card();
  c._pollFull();
  c._pollFast();
  assert.deepEqual(calls, ['all', 'downloads']);
});

test('coming back into view catches up at once', t => {
  hidden = true;
  const { c, calls } = card();
  c._wireVisibility();
  t.after(() => c.disconnectedCallback());
  hidden = false;
  document.dispatchEvent(new window.Event('visibilitychange'));
  assert.deepEqual(calls, ['all', 'downloads']);
});

test('a card taken off the page stops listening', () => {
  hidden = true;
  const { c, calls } = card();
  c._wireVisibility();
  c.disconnectedCallback();
  hidden = false;
  document.dispatchEvent(new window.Event('visibilitychange'));
  assert.deepEqual(calls, []);
});
