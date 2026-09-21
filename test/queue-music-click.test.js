// A row in the download queue on the left opens what it is downloading: a film
// or series opens its detail, and music opens the artist's window — Lidarr's
// queue is the only place the torrent hash can be traced back to an artist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

test("Lidarr's queue maps a download back to its artist", async () => {
  const card = makeCard();
  card._callApi = async () => ({ records: [
    { albumId: 5, artistId: 42, downloadId: 'ABC123', size: 100, sizeleft: 25 },
    { albumId: 6, artist: { id: 43 }, downloadId: 'def456', size: 100, sizeleft: 0 },
    { albumId: 7, size: 100, sizeleft: 50 },
  ] });
  await card._fetchLidarrQueue();
  assert.equal(card._dlMediaLidarr.get('abc123'), 42, 'matched however the client cased the hash');
  assert.equal(card._dlMediaLidarr.get('def456'), 43, 'the artist may come nested');
  assert.equal(card._dlMediaLidarr.size, 2, 'a record without either is no use');
  assert.deepEqual(card._mediaForDownloadId('ABC123'), { type: 'music', artistId: 42 });
});

test('clicking a music row opens the artist, not the download dialog', () => {
  const card = makeCard();
  card._dlMediaLidarr = new Map([['abc123', 42]]);
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-left"><div data-dl-open="ABC123"><span class="dl-name">Some release</span></div></div>';
  Object.defineProperty(card, 'shadowRoot', { value: root, configurable: true });
  const opened = [];
  card._openMusicModal = id => opened.push(id);
  card._openPopup = () => opened.push('popup');
  card._renderDlInfoEl = () => opened.push('dl-info');
  card._wireActionButtons();
  root.querySelector('[data-dl-open]').click();
  assert.deepEqual(opened, [42]);
});

test('a row nothing knows about still falls back to the download dialog', () => {
  const card = makeCard();
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-left"><div data-dl-open="zzz"><span class="dl-name">Unknown</span></div></div>';
  Object.defineProperty(card, 'shadowRoot', { value: root, configurable: true });
  const seen = [];
  card._openMusicModal = () => seen.push('music');
  card._openPopup = () => seen.push('popup');
  card._renderDlInfoEl = () => seen.push('dl-info');
  card._wireActionButtons();
  root.querySelector('[data-dl-open]').click();
  assert.deepEqual(seen, ['dl-info']);
  assert.equal(card._dlInfoName, 'Unknown');
});
