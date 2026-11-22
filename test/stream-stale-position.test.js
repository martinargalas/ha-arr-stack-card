// A player that stops reporting its position (Plexamp after an update) runs
// past its end on the card's own clock. It is taken off Now Playing once — not
// brought back every second and repainted, which fetched its picture each time.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

test('a stream run out on the clock stays out while the player says nothing new', (t) => {
  const c = makeCard();
  c._streamsEnded = new Set();
  const id = 'media_player.plex_plexamp_ipad';
  const updated = new Date(Date.now() - 600_000).toISOString();   // ten minutes ago
  const attr = { media_duration: 200, media_position: 50, media_position_updated_at: updated };
  c._hass = { ...c._hass, states: { [id]: { state: 'playing', attributes: attr } } };
  const fill = { dataset: { pos: '50', dur: '200', updated: String(Date.parse(updated)), entity: id, state: 'playing' }, style: {}, closest: () => null };
  Object.defineProperty(c, 'shadowRoot', { configurable: true, value: { querySelectorAll: () => [fill] } });
  let repaints = 0;
  c._reRenderSection = () => { repaints++; };
  let tick;
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  globalThis.setInterval = (fn) => { tick = fn; return 1; };
  globalThis.clearInterval = () => {};
  t.after(() => { globalThis.setInterval = realSet; globalThis.clearInterval = realClear; });

  c._startStreamsTimer([{ id, state: 'playing', attr }]);
  tick();
  assert.equal(repaints, 1, 'ran out: taken off once');
  assert.ok(c._streamsEnded.has(id));
  tick(); tick(); tick();
  assert.equal(repaints, 1, 'not brought back on the stale position');
  assert.ok(c._streamsEnded.has(id));
});

test('a player that reports a fresh position again comes back', (t) => {
  const c = makeCard();
  c._streamsEnded = new Set();
  const id = 'media_player.plex_plexamp_ipad';
  c._streamsEnded.add(id);
  c._hass = { ...c._hass, states: { [id]: { state: 'playing', attributes: { media_duration: 200, media_position: 3, media_position_updated_at: new Date().toISOString() } } } };
  Object.defineProperty(c, 'shadowRoot', { configurable: true, value: { querySelectorAll: () => [] } });
  let repaints = 0;
  c._reRenderSection = () => { repaints++; };
  let tick;
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  globalThis.setInterval = (fn) => { tick = fn; return 1; };
  globalThis.clearInterval = () => {};
  t.after(() => { globalThis.setInterval = realSet; globalThis.clearInterval = realClear; });
  c._startStreamsTimer([{ id, state: 'playing', attr: { media_duration: 200 } }]);
  tick();
  assert.equal(repaints, 1);
  assert.ok(!c._streamsEnded.has(id));
});
