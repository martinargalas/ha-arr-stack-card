// An episode's automatic search says what it did: starting, waiting for a
// grab, nothing found (and searchable again), always in a button place of the
// same size, so the row keeps its height.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup(t) {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => real(fn, 0);
  t.after(() => { globalThis.setTimeout = real; });
  const card = makeCard();
  card._renderPopupEl = () => {};
  card._popup = { _type: 'sonarr', _sonarrSeries: { id: 7 } };
  card._asOpen = true; card._asInstance = 'sonarr';
  card._asSearchingItems = new Set(); card._asSearchedItems = new Set(); card._asPolling = new Set();
  card._asDownloadingItems = new Set(); card._asNotFound = new Set(); card._asEpMissed = new Set();
  card._grabWatchAdd = () => {};
  return card;
}
const ep = { id: 5, seasonNumber: 3, episodeNumber: 5, title: 'TBA', airDate: '2026-01-01' };

test('a search that grabs nothing says so and can be run again', async (t) => {
  const card = setup(t);
  card._callApi = async (m) => m === 'POST' ? {} : [];
  await card._triggerSonarrEpisodeSearch(5, 3, 'sonarr');
  for (let i = 0; i < 60 && !card._asEpMissed.has("ep:5"); i++) await new Promise(r => setTimeout(r, 0));
  assert.ok(card._asEpMissed.has('ep:5'));
  const html = card._renderAsEpRow(ep);
  assert.match(html, /as-ep-status as-ep-miss">Not found</);
  assert.match(html, /data-action="as-ep-search"/, 'searchable again');
});

test('while it waits for a grab the row says so, in a place of the same size', (t) => {
  const card = setup(t);
  card._asSearchedItems.add('ep:5'); card._asPolling.add('ep:5');
  const html = card._renderAsEpRow(ep);
  assert.match(html, /Waiting for a grab/);
  assert.match(html, /class="as-ep-slot"/);
});

test('sent and not yet resolved shows the tick with words, not a bare tick', (t) => {
  const card = setup(t);
  card._asSearchedItems.add('ep:5');
  const html = card._renderAsEpRow(ep);
  assert.match(html, /as-ep-slot as-ep-ok/);
  assert.match(html, /Search sent/);
});

test('another episode of the series in the queue is not this one\'s download', async (t) => {
  const card = setup(t);
  card._fetchSonarrQueue = async () => {};
  card._callApi = async (m) => m === 'POST' ? {} : [{ seriesId: 7, episodeId: 1, seasonNumber: 3 }];
  await card._triggerSonarrEpisodeSearch(5, 3, 'sonarr');
  for (let i = 0; i < 60 && !card._asEpMissed.has('ep:5'); i++) await new Promise(r => setTimeout(r, 0));
  assert.ok(!card._asDownloadingItems.has('ep:5'), 'not downloading');
  assert.ok(card._asEpMissed.has('ep:5'));
  const html = card._renderAsEpRow({ ...ep, airDateUtc: '2099-01-01T00:00:00Z' });
  assert.match(html, /Not aired yet/, 'an episode yet to air says why');
});

test('its own download in the queue is', async (t) => {
  const card = setup(t);
  card._fetchSonarrQueue = async () => {};
  card._callApi = async (m) => m === 'POST' ? {} : [{ seriesId: 7, episodeId: 5, seasonNumber: 3 }];
  await card._triggerSonarrEpisodeSearch(5, 3, 'sonarr');
  for (let i = 0; i < 60 && !card._asDownloadingItems.has('ep:5'); i++) await new Promise(r => setTimeout(r, 0));
  assert.ok(card._asDownloadingItems.has('ep:5'));
  clearInterval(card._asProgressTimer);
});

test('once Sonarr says its search has run, the answer comes at once — no forty seconds of waiting — and a season from its poster is redrawn', async (t) => {
  const card = setup(t);
  card._asOpen = false; card._snFromTile = 3;          // a season opened from its poster, not the AS list
  let renders = 0; card._renderPopupEl = () => { renders++; };
  const gets = [];
  card._callApi = async (m, path) => {
    if (m === 'POST') return { id: 42 };
    gets.push(path);
    if (path.endsWith('command/42')) return { status: 'completed' };
    return [];
  };
  await card._triggerSonarrEpisodeSearch(5, 3, 'sonarr');
  for (let i = 0; i < 60 && !card._asEpMissed.has('ep:5'); i++) await new Promise(r => setTimeout(r, 0));
  assert.ok(card._asEpMissed.has('ep:5'));
  assert.ok(!card._asPolling.has('ep:5'), 'no longer waiting');
  assert.deepEqual(gets, ['arr_stack/sonarr/command/42', 'arr_stack/sonarr/queue', 'arr_stack/sonarr/queue']);
  const before = renders;
  assert.ok(before > 0, 'the rows were redrawn');
});
