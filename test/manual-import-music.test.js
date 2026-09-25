// Manual import for music: Lidarr words every field its own way, so the rows
// and the command the card sends are its own too.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const CAND = {
  path: '/downloads/complete/1989/01. Welcome To New York.mp3',
  size: 10276045,
  downloadId: 'ABC123',
  artist: { id: 7, artistName: 'Taylor Swift' },
  album: { id: 55, title: '1989' },
  albumReleaseId: 910,
  tracks: [{ id: 301, mediumNumber: 1, absoluteTrackNumber: 1, title: 'Welcome To New York' }],
  quality: { quality: { id: 3, name: 'MP3-320' } },
  rejections: [],
};

function card() {
  const c = makeCard();
  c._lidarrArtists = new Map([[7, { id: 7, artistName: 'Taylor Swift' }]]);
  return c;
}

test('the row shows what Lidarr matched the file to', () => {
  const c = card();
  const html = c._actManualImportCandidatesHtml([CAND], 'lidarr', [{ quality: { id: 3, name: 'MP3-320' } }], []);
  assert.match(html, /Taylor Swift/);
  assert.match(html, /1989/);
  assert.match(html, /01\. Welcome To New York\.mp3/);
  assert.match(html, /1x1/, 'the track, as Lidarr numbers it');
  assert.match(html, /data-ready="1"/, 'and it can be imported');
});

test('a file Lidarr could not place is not offered for import', () => {
  const c = card();
  const orphan = { ...CAND, album: null, tracks: [] };
  const html = c._actManualImportCandidatesHtml([orphan], 'lidarr', [], []);
  assert.match(html, /data-ready=""/);
});

test('the command carries the album release and the tracks', async () => {
  const c = card();
  const sent = [];
  c._callApi = async (method, path, body) => { sent.push({ method, path, body }); return {}; };
  c._actImporting = new Set();
  c._actShowStatus = () => {};
  c._activityModal = null;
  c._fetchLidarrQueue = async () => {};
  c._fetchLidarr = async () => {};
  c._reRenderSection = () => {};
  await c._submitLidarrImport([CAND], [0], { remove() {} }, null);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].path, 'arr_stack/lidarr/command');
  assert.equal(sent[0].body.name, 'ManualImport');
  const f = sent[0].body.files[0];
  assert.equal(f.artistId, 7);
  assert.equal(f.albumId, 55);
  assert.equal(f.albumReleaseId, 910);
  assert.deepEqual(f.trackIds, [301]);
  assert.equal(f.quality.quality.id, 3);
});

test('nothing is sent when no row is complete', async () => {
  const c = card();
  let calls = 0;
  c._callApi = async () => { calls++; };
  await c._submitLidarrImport([{ ...CAND, artist: null }], [0], { remove() {} }, null);
  assert.equal(calls, 0);
});

// A folder answers in whatever order it feels like; a record has an order.
test('the files are listed the way the record runs', () => {
  const c = card();
  const f = (n, path) => ({ path, tracks: [{ id: n, mediumNumber: 1, absoluteTrackNumber: n }] });
  const sorted = c._miSortTracks([f(9, '09.mp3'), f(1, '01.mp3'), f(13, '13.mp3'), f(2, '02.mp3')]);
  assert.deepEqual(sorted.map(x => x.tracks[0].absoluteTrackNumber), [1, 2, 9, 13]);
});

test('a second disc follows the first, and an unnumbered file comes last', () => {
  const c = card();
  const rows = [
    { path: 'b.mp3', tracks: [{ mediumNumber: 2, absoluteTrackNumber: 1 }] },
    { path: 'a.mp3', tracks: [{ mediumNumber: 1, absoluteTrackNumber: 5 }] },
    { path: 'z.mp3', tracks: [] },
  ];
  assert.deepEqual(c._miSortTracks(rows).map(r => r.path), ['a.mp3', 'b.mp3', 'z.mp3']);
});

// Music has no category of its own, so it was never asked for again after the
// first fetch — Recently Added stood still until the page was reloaded.
test('the library is read again whenever the sections music rides in are shown', async () => {
  const c = makeCard();
  c._initialFetchDone = true;
  c._lidarrConfigured = true;
  let asked = 0;
  c._fetchLidarr = async () => { asked++; };
  c._visibleCatIds = () => new Set(['recentlyAdded', 'trending']);
  await c._fetchVisibleCats();
  assert.equal(asked, 1);
  c._visibleCatIds = () => new Set(['tautulli', 'prowlarr']);
  await c._fetchVisibleCats();
  assert.equal(asked, 1, 'and left alone on a page that shows neither');
});
