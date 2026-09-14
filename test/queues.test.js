// Turning a download client's answer into what a poster shows: which ids are
// downloading, how far along, and what the card forgets when a title is gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, artist } from './harness.js';

const lidarrQueue = records => ({ records });

test('the Lidarr queue is read per album and per artist', async () => {
  const card = makeCard();
  card._callApi = async () => lidarrQueue([
    { albumId: 1, artistId: 10, size: 100, sizeleft: 62 },   // 38%
    { albumId: 2, artistId: 10, size: 100, sizeleft: 42 },   // 58%
    { albumId: 3, artistId: 11, size: 100, sizeleft: 100 },  // 0%
  ]);
  await card._fetchLidarrQueue();

  assert.deepEqual([...card._lidarrQueue].sort(), [1, 2, 3]);
  assert.equal(card._lidarrQueuePct.get(1), 38);
  assert.equal(card._lidarrQueuePct.get(3), 0);
  // An artist row shows one bar, so it reports the album that has come furthest
  assert.equal(card._lidarrQueueArtists.get(10), 58);
  assert.equal(card._lidarrQueueArtists.get(11), 0);
});

test('a queue entry of unknown size reports as unknown, not as finished', async () => {
  const card = makeCard();
  card._callApi = async () => lidarrQueue([{ albumId: 1, artistId: 10, size: 0, sizeleft: 0 }]);
  await card._fetchLidarrQueue();
  assert.equal(card._lidarrQueuePct.get(1), -1);
});

test('a failed queue read empties the queue instead of leaving stale progress', async () => {
  const card = makeCard({
    _lidarrQueue: new Set([9]),
    _lidarrQueuePct: new Map([[9, 50]]),
  });
  card._callApi = async () => { throw new Error('lidarr is down'); };
  await card._fetchLidarrQueue();
  assert.equal(card._lidarrQueue.size, 0);
  assert.equal(card._lidarrQueuePct.size, 0);
});

test('a deleted artist leaves every list the card holds', () => {
  const gone = artist({ id: 10, foreignArtistId: 'mb-gone' });
  const card = makeCard({
    _lidarrArtists: new Map([[10, gone], [11, artist({ id: 11 })]]),
    _lidarrArtistFeed: [{ id: 10, artist: gone }, { id: 11, artist: artist({ id: 11 }) }],
    _lidarrQueueArtists: new Map([[10, 40]]),
    _musAdded: new Set(['mb-gone']),
    _musAddedEntries: new Map([['mb-gone', { artist: gone }]]),
  });

  card._musForgetArtist(10);

  assert.equal(card._lidarrArtists.has(10), false, 'still in the library map');
  assert.deepEqual(card._lidarrArtistFeed.map(e => e.id), [11], 'still in the recently added row');
  assert.equal(card._lidarrQueueArtists.has(10), false, 'still counted as downloading');
  assert.equal(card._musAddedEntries.has('mb-gone'), false, 'still held as a suggestion');
  assert.equal(card._musAdded.has('mb-gone'), false);
});

test('the modal only repaints when the queue under it has moved', () => {
  const card = makeCard({
    _lidarrQueue: new Set([1]),
    _lidarrQueuePct: new Map([[1, 10]]),
    _lidarrQueueArtists: new Map([[10, 10]]),
  });
  card._musicModal = { artistId: 10, albums: [{ id: 1 }, { id: 2 }] };

  const first = card._musQueueSig();
  assert.equal(card._musQueueSig(), first, 'an unchanged queue must read the same');

  card._lidarrQueuePct.set(1, 11);
  assert.notEqual(card._musQueueSig(), first, 'progress moved and the signature did not');
});

test('Recently Requested holds an artist whose music has not arrived', () => {
  const waiting = artist({ id: 10, monitored: true, statistics: { trackFileCount: 0, trackCount: 12, totalTrackCount: 12 }, added: '2026-01-05' });
  const done = artist({ id: 11, monitored: true, statistics: { trackFileCount: 9, trackCount: 9, totalTrackCount: 9 }, added: '2026-01-04' });
  const card = makeCard({ _lidarrArtists: new Map([[10, waiting], [11, done]]) });

  assert.deepEqual(card._rqMusicItems().map(i => i.id), [10]);
});

test('a fresh artist with nothing known yet still counts as requested', () => {
  // Lidarr reports 0/0 until it has read the discography — filtering on
  // "has tracks" dropped exactly the artist that was just added.
  const fresh = artist({ id: 12, monitored: true, statistics: { trackFileCount: 0, trackCount: 0, totalTrackCount: 0 } });
  const card = makeCard({ _lidarrArtists: new Map([[12, fresh]]) });
  assert.deepEqual(card._rqMusicItems().map(i => i.id), [12]);
});
