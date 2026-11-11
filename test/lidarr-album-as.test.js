// An album's automatic search says what it did, as a series' episode does:
// waiting while Lidarr searches, then its download's progress, or nothing
// found (or not out yet) and searchable again.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup(t, queue) {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => real(fn, 0);
  t.after(() => { globalThis.setTimeout = real; });
  const card = makeCard();
  card._hass = { ...(card._hass || {}), user: { is_admin: true } };
  card._renderMusicModalEl = () => {};
  const sp = { mode: 'as', searched: new Set() };
  card._musicModal = { artistId: 1, search: sp, albums: [{ id: 10, title: 'Soon', releaseDate: '2099-01-01' }, { id: 11, title: 'Old', releaseDate: '2001-01-01' }] };
  const gets = [];
  card._callApi = async (m, path) => {
    if (m === 'POST') return { id: 77 };
    gets.push(path);
    if (path.endsWith('command/77')) return { status: 'completed' };
    if (path.startsWith('arr_stack/lidarr/queue')) return { records: queue() };
    return {};
  };
  return { card, sp, gets };
}
const settle = async (cond) => { for (let i = 0; i < 80 && !cond(); i++) await new Promise(r => setTimeout(r, 0)); };

test('an album not out yet: once Lidarr has searched, the row says so and can be searched again', async (t) => {
  const { card, sp, gets } = setup(t, () => []);
  await card._musPickAlbum(10);
  await settle(() => sp.missed?.has(10));
  assert.ok(sp.missed.has(10));
  assert.ok(!sp.waiting.has(10) && !sp.searched.has(10));
  assert.equal(gets[0], 'arr_stack/lidarr/command/77', 'Lidarr asked whether its search has run');
  const html = card._musAlbumRow(card._musicModal.albums[0], sp);
  assert.match(html, /as-ep-miss">Not released yet</);
  assert.ok(!html.includes('action-spinner'));
});

test('an album found shows its download\'s progress', async (t) => {
  const { card, sp } = setup(t, () => [{ albumId: 11, size: 100, sizeleft: 60, title: 'x' }]);
  await card._musPickAlbum(11);
  await settle(() => !sp.waiting?.has(11) && card._lidarrQueue?.has(11));
  clearInterval(sp.progressTimer);
  assert.ok(!sp.missed?.has(11));
  const html = card._musAlbumRow(card._musicModal.albums[1], sp);
  assert.match(html, />40%</);
});

test('while Lidarr searches the row says it waits', (t) => {
  const { card, sp } = setup(t, () => []);
  sp.searched.add(11); sp.waiting = new Set([11]);
  const html = card._musAlbumRow(card._musicModal.albums[1], sp);
  assert.match(html, /Waiting for a grab/);
  assert.match(html, /action-spinner/);
});
