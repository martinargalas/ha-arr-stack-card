// The main search answers at the pace of its fastest source. The music leg goes
// out to Lidarr and on to MusicBrainz, which is allowed twenty seconds by the
// proxy — it must never hold the films and series in front of the reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

const film = (id, title) => ({ id, mediaType: 'movie', title, posterPath: null });

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

// Seerr answers at once; Lidarr answers when the test says so
function searchCard(music = deferred()) {
  const paints = [];
  const card = makeCard({ _overseerrConfigured: true, _lidarrConfigured: true });
  card._reRenderSearchResults = () => paints.push((card._searchResults || []).map(r => r.title));
  card._callApi = async (method, path) => {
    if (path.includes('/search')) return { results: [film(1, 'Alien'), film(2, 'Aliens')] };
    if (path.includes('lidarr/lookup')) return music.promise;
    return [];
  };
  return { card, paints, music };
}

test('films are on screen while the music leg is still out', async () => {
  const { card, paints, music } = searchCard();
  const done = card._fetchSearch('alien');
  await new Promise(r => setTimeout(r, 0));

  assert.deepEqual(paints.at(-1), ['Alien', 'Aliens'], 'painted before the slow leg answered');
  assert.equal(card._searchLoading, true, 'and still says it is working');

  music.resolve([{ artistName: 'Alien Ant Farm', foreignArtistId: 'mb-1', id: null }]);
  await done;
  assert.deepEqual(card._searchResults.map(r => r.title), ['Alien', 'Aliens', 'Alien Ant Farm']);
  assert.equal(card._searchLoading, false);
});

test('an answer for a query already typed past never lands', async () => {
  const slow = deferred();
  const { card } = searchCard(slow);
  const first = card._fetchSearch('ali');

  // The reader typed on: a second run starts before the first one's music is in
  const second = deferred();
  card._callApi = async (method, path) => {
    if (path.includes('/search')) return { results: [film(9, 'Arrival')] };
    if (path.includes('lidarr/lookup')) return second.promise;
    return [];
  };
  const latest = card._fetchSearch('arri');
  second.resolve([]);
  await latest;
  assert.deepEqual(card._searchResults.map(r => r.title), ['Arrival']);

  slow.resolve([{ artistName: 'Stale Artist', foreignArtistId: 'mb-old', id: null }]);
  await first;
  assert.deepEqual(card._searchResults.map(r => r.title), ['Arrival'],
    'the older query cannot overwrite what is on screen');
});

test('nothing found yet is not painted as nothing found', async () => {
  const music = deferred();
  const { card, paints } = searchCard(music);
  card._callApi = async (method, path) => {
    if (path.includes('/search')) return { results: [] };
    if (path.includes('lidarr/lookup')) return music.promise;
    return [];
  };
  const done = card._fetchSearch('obscure');
  await new Promise(r => setTimeout(r, 0));
  assert.equal(paints.length, 0, 'an empty grid would read as "no results" while music is still out');

  music.resolve([{ artistName: 'Obscure', foreignArtistId: 'mb-2', id: null }]);
  await done;
  assert.deepEqual(card._searchResults.map(r => r.title), ['Obscure']);
});
