// What each row decides to show. These are pure list operations — no DOM, no
// network — and every one of them has been wrong at some point.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, artist } from './harness.js';

test('Recommendations deals film, show and artist in turn', () => {
  const card = makeCard({
    _trakt: [
      { id: 1, mediaType: 'movie', title: 'M1' },
      { id: 2, mediaType: 'tv', title: 'S1' },
      { id: 3, mediaType: 'movie', title: 'M2' },
      { id: 4, mediaType: 'tv', title: 'S2' },
    ],
    _lastfm: [
      { artist: artist({ id: 91, artistName: 'A1', foreignArtistId: 'mb-a1' }) },
      { artist: artist({ id: 92, artistName: 'A2', foreignArtistId: 'mb-a2' }) },
    ],
    _suggestarrConfigured: false,
  });

  const kinds = card._recItems().map(i => (i._recSrc === 'lastfm' ? 'artist' : i.mediaType));
  assert.deepEqual(kinds.slice(0, 6), ['movie', 'tv', 'artist', 'movie', 'tv', 'artist']);
});

test('Recommendations alternates its two video sources', () => {
  const card = makeCard({
    _trakt: [{ id: 1, mediaType: 'movie', title: 'T1' }, { id: 2, mediaType: 'movie', title: 'T2' }],
    _suggestarr: [{ id: 3, mediaType: 'movie', title: 'S1' }, { id: 4, mediaType: 'movie', title: 'S2' }],
    _lastfmConfigured: false,
  });
  assert.deepEqual(card._recItems().map(i => i._recSrc), ['trakt', 'suggestarr', 'trakt', 'suggestarr']);
});

test('a kind that runs out drops out of the rotation', () => {
  const card = makeCard({
    _trakt: [{ id: 1, mediaType: 'movie' }, { id: 2, mediaType: 'movie' }, { id: 3, mediaType: 'movie' }],
    _lastfm: [{ artist: artist({ foreignArtistId: 'mb-a1' }) }],
    _suggestarrConfigured: false,
  });
  const kinds = card._recItems().map(i => (i._recSrc === 'lastfm' ? 'artist' : 'movie'));
  assert.deepEqual(kinds, ['movie', 'artist', 'movie', 'movie']);
});

test('the type filter narrows Recommendations, and All keeps everything', () => {
  const state = {
    _trakt: [{ id: 1, mediaType: 'movie' }, { id: 2, mediaType: 'tv' }],
    _lastfm: [{ artist: artist({ foreignArtistId: 'mb-a1' }) }],
    _suggestarrConfigured: false,
  };
  assert.equal(makeCard({ ...state, _recType: 'all' })._recItems().length, 3);
  assert.equal(makeCard({ ...state, _recType: 'video' })._recItems().length, 2);
  assert.equal(makeCard({ ...state, _recType: 'music' })._recItems().length, 1);
});

test('Recently Added carries music, and its filter separates the two', () => {
  const card = makeCard({
    _radarr: [{ id: 1, tmdbId: 5, hasFile: true, added: '2026-01-02', movieFile: { dateAdded: '2026-01-02' } }],
    _lidarrArtistFeed: [{ id: 10, artist: artist(), _importedAt: '2026-01-03' }],
  });
  assert.deepEqual(card._raItems().map(i => i._mediaType), ['music', 'movie'], 'newest first');

  card._raType = 'video';
  assert.deepEqual(card._raItems().map(i => i._mediaType), ['movie']);
  card._raType = 'music';
  assert.deepEqual(card._raItems().map(i => i._mediaType), ['music']);
});

test('without Lidarr the filters are ignored rather than emptying a row', () => {
  const card = makeCard({
    _lidarrConfigured: false,
    _raType: 'music',
    _radarr: [{ id: 1, tmdbId: 5, hasFile: true, added: '2026-01-02' }],
  });
  assert.equal(card._raItems().length, 1);
});

test('the calendar filter keeps music apart from films and episodes', () => {
  const card = makeCard({
    _calendar: [
      { id: 1, _mediaType: 'movie' },
      { id: 2, _mediaType: 'tv' },
      { id: 3, _mediaType: 'music' },
    ],
  });
  assert.equal(card._calCatItems().length, 3);
  card._calCatType = 'music';
  assert.deepEqual(card._calCatItems().map(e => e.id), [3]);
  card._calCatType = 'video';
  assert.deepEqual(card._calCatItems().map(e => e.id), [1, 2]);
});

test('an artist added this session stays in the suggestions until judged', () => {
  const mb = 'mb-added';
  const card = makeCard({
    _lastfm: [{ artist: artist({ foreignArtistId: mb, artistName: 'Kept' }) }],
    _musAdded: new Set([mb]),
    _lidarrArtists: new Map([[1, artist({ id: 1, foreignArtistId: mb, artistName: 'Kept' })]]),
  });
  assert.equal(card._lastfmRowItems().length, 1, 'owned but added this session — still offered');

  card._musAdded = new Set();
  assert.equal(card._lastfmRowItems().length, 0, 'owned and not just added — gone');
});
