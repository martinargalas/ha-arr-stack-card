// A film's detail on a phone: a sheet of its collection's films, or of those
// recommended for one in none; its trailer the first tile; a tile opens that
// film and closing it comes back.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup(answers) {
  const card = makeCard();
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  Object.defineProperty(card, '_isNarrow', { get: () => true, configurable: true });
  card._renderPopupEl = () => {};
  card._overseerrConfigured = true;
  const asked = [];
  card._callApi = async (m, path) => { asked.push(path); const a = answers(path); if (a instanceof Error) throw a; return a; };
  return { card, asked };
}
const settle = () => new Promise(r => setTimeout(r, 0));

test('a film in a collection: its films in order of release, the one shown ringed, the trailer a tile (shown on a small phone only)', async () => {
  const { card, asked } = setup(p => p.includes('collection/1241')
    ? { name: 'Harry Potter Collection', parts: [{ id: 2, title: 'Chamber', releaseDate: '2002-11-13', posterPath: '/b.jpg' }, { id: 1, title: 'Stone', releaseDate: '2001-11-16', posterPath: '/a.jpg' }] }
    : {});
  card._radarr = [{ id: 9, tmdbId: 2, hasFile: true }];
  const d = { _type: 'movie', id: 1, title: 'Stone', collection: { id: 1241, name: 'Harry Potter Collection' }, relatedVideos: [{ site: 'YouTube', type: 'Trailer', key: 'xyz' }] };
  card._popup = d;
  assert.equal(card._ppMvTilesHtml(d), '', 'nothing until it is known');
  await settle();
  const html = card._ppMvTilesHtml(d);
  assert.equal(asked[0], 'arr_stack/overseerr/collection/1241');
  assert.match(html, /sn-tiles-label">Harry Potter Collection</);
  assert.ok(html.indexOf('sn-tile-trailer') < html.indexOf('data-tmdb="1"'), 'the trailer first');
  assert.ok(html.indexOf('data-tmdb="1"') < html.indexOf('data-tmdb="2"'), 'by release');
  assert.match(html, /mv-tile mv-cur" data-action="mv-tile" data-tmdb="1"/);
  assert.match(html, /class="mc mv-mc"/, 'the rows\' film card');
  assert.doesNotMatch(html, /data-popup=/, 'not one the page wires to open on its own');
  assert.doesNotMatch(html, /req-open/, 'no request button: a request is made in the detail');
  assert.match(html, /class="mv-grad"/, 'the title\'s block named, to lift it when folded');
  assert.match(html, /class="mv-title"/, 'the title named, to go first when folded');
  assert.match(html, /data-tmdb="2"[\s\S]*?class="mv-stripe"/, 'a film already here has its bar, whatever the posters show');
});

test('a film in no collection: those Seerr recommends', async () => {
  const { card, asked } = setup(p => p.includes('/recommendations') ? { results: [{ id: 5, mediaType: 'movie', title: 'Other', releaseDate: '2010-01-01' }, { id: 6, mediaType: 'tv', name: 'Show' }] } : {});
  const d = { _type: 'radarr', id: 1, title: 'Lone' };
  card._popup = d;
  card._ppMvTilesHtml(d);
  await settle(); await settle();
  const html = card._ppMvTilesHtml(d);
  assert.equal(asked[0], 'arr_stack/overseerr/movie/1/recommendations?page=1');
  assert.match(html, /data-tmdb="5"/);
  assert.doesNotMatch(html, /data-tmdb="6"/, 'films only');
  assert.match(html, /sn-tiles-label">Similar titles</, 'named under the pill');
});

test('a tile opens its film; closing it opens the first again', () => {
  const { card } = setup(() => ({}));
  const opened = [];
  card._openPopup = (...a) => { opened.push(a); card._mvOpening = false; };
  card._popup = { _type: 'movie', id: 1, title: 'Stone' };
  card._ppActMvTile({ dataset: { tmdb: '2', title: 'Chamber' } });
  assert.deepEqual(opened[0].slice(0, 4), ['movie', 2, null, 'Chamber']);
  card._popup = null;
  assert.equal(card._popupReturn(), true);
  assert.deepEqual(opened[1].slice(0, 4), ['movie', 1, null, 'Stone']);
});

test('a tablet keeps its trailer and no film sheet', () => {
  const { card } = setup(() => ({}));
  Object.defineProperty(card, '_isMob', { get: () => false, configurable: true });
  assert.equal(card._ppMvTilesHtml({ _type: 'movie', id: 1 }), '');
});
