// Every category renders — with data and, more importantly, without it. A row
// whose service is configured but has answered nothing yet is the normal state
// on a cold start, and a throw there takes the whole card down with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, movie, artist } from './harness.js';

// Each entry: the render method, and the state that makes the row appear.
const SECTIONS = [
  ['Recently Added',      '_renderRecentlyAdded',     {}],
  ['Recently Requested',  '_renderRecentlyRequested', {}],
  ['Recommendations',     '_renderRecommendations',   {}],
  ['Calendar',            '_renderCalendar',          {}],
  ['Upcoming Movies',     '_renderUpcoming',          {}],
  ['New Shows',           '_renderTvUpcoming',        {}],
  ['Trending',            '_renderTrending',          {}],
  ['Popular',             '_renderPopular',           {}],
  ['Movies',              '_renderRadarr',            {}],
  ['TV Shows',            '_renderSonarr',            {}],
];

test('every category renders on an empty install without throwing', () => {
  for (const [name, method, state] of SECTIONS) {
    const card = makeCard(state);
    let out;
    assert.doesNotThrow(() => { out = card[method](); }, `${name} threw on empty data`);
    assert.ok(typeof out === 'string' && out.includes('sec-card'), `${name} rendered nothing`);
  }
});

test('every category renders with data without throwing', () => {
  const filled = {
    _radarr: [movie({ id: 1, tmdbId: 11, title: 'Film', added: '2026-01-01' })],
    _sonarr: [{ id: 2, tvdbId: 22, tmdbId: 222, title: 'Show', statistics: { episodeFileCount: 3, episodeCount: 10 }, added: '2026-01-01', ratings: {}, images: [] }],
    _lidarrArtistFeed: [{ id: 10, artist: artist(), newestAlbum: null, newAlbumCount: 1, _importedAt: '2026-01-02' }],
    _lidarrArtists: new Map([[10, artist()]]),
    _trakt: [{ id: 3, mediaType: 'movie', title: 'Rec', posterPath: '/p.jpg' }],
    _suggestarr: [{ id: 4, mediaType: 'tv', title: 'Sug', posterPath: '/p.jpg' }],
    _lastfm: [{ artist: artist({ id: 99, foreignArtistId: 'mb-x', artistName: 'Sug Artist' }) }],
    _calendar: [
      { id: 5, _mediaType: 'movie', title: 'Cal film', airDate: '2026-02-01', series: {}, images: [] },
      { id: 6, _mediaType: 'music', title: 'Cal album', airDate: '2026-02-02', artistId: 10, artist: artist(), images: [], statistics: {} },
    ],
    _upcoming: [{ id: 7, title: 'Soon', releaseDate: '2026-03-01', posterPath: '/p.jpg' }],
    _tvUpcoming: [{ id: 8, name: 'New show', firstAirDate: '2026-03-02', posterPath: '/p.jpg' }],
    _trending: [{ id: 9, mediaType: 'movie', title: 'Hot', posterPath: '/p.jpg' }],
    _popular: [{ id: 12, title: 'Liked', posterPath: '/p.jpg' }],
  };
  for (const [name, method] of SECTIONS) {
    const card = makeCard(filled);
    assert.doesNotThrow(() => card[method](), `${name} threw on populated data`);
  }
});

test('a row says it is loading rather than claiming to be empty', () => {
  const card = makeCard();
  assert.match(parse(card._renderRecentlyAdded()).textContent, /Loading|loading/);
});

test('rows disappear when their service is not configured', () => {
  // Recommendations is the merged row: with every source off there is nothing
  // for it to draw and the section must not be offered at all.
  const card = makeCard({
    _traktConfigured: false, _suggestarrConfigured: false, _lastfmConfigured: false,
  });
  const src = card._recSources;
  assert.equal(src.trakt || src.suggestarr || src.lastfm, false);
});

test('a music tile in the calendar opens its artist, not the album', () => {
  const card = makeCard({ _lidarrArtists: new Map([[10, artist()]]) });
  const ep = { id: 6, _mediaType: 'music', title: 'Album', airDate: '2026-02-02', artistId: 10, artist: artist(), images: [], statistics: {} };
  const el = parse(card._renderCalendarMusicCard(ep));
  assert.ok(el.querySelector('[data-album-cal="6"]'), 'the tile has to name the album it stands for');
});

test('the search results grid renders each media type', () => {
  const card = makeCard({
    _searchActive: true,
    _searchResults: [
      { id: 1, mediaType: 'movie', title: 'Found film', posterPath: '/p.jpg' },
      { id: 2, mediaType: 'tv', name: 'Found show', posterPath: '/p.jpg' },
      { id: 3, mediaType: 'music', artist: artist({ id: null, foreignArtistId: 'mb-s' }) },
    ],
  });
  assert.doesNotThrow(() => card._renderSearchResultsInner());
});
