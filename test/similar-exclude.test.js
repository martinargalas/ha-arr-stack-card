// Similar titles: the Exclude side of the cast, genre and country filters. Each
// panel carries an Include | Exclude peanut; a pick goes to the list its view
// shows and leaves the other, and both lists narrow the results together.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

const hit = (id, extra = {}) => ({ id, mediaType: 'movie', title: `T${id}`, posterPath: `/p${id}.jpg`, ...extra });
const results = (extra = {}) => ({
  mode: 'results', seed: { kind: 'movie', id: 42, title: 'Seed' }, page: 0, _mtCols: 4, type: 'all', sort: 'rel',
  keywords: [], used: [], items: [], ...extra,
});

test('a genre left out drops every title that has it, alongside the genres included', () => {
  const card = makeCard();
  card._simModal = results({
    items: [hit(1, { genreIds: [28, 10752] }), hit(2, { genreIds: [28] }), hit(3, { genreIds: [28, 35] }),
      { mediaType: 'music', id: 'mb', title: 'M' }],
    genres: ['28'], genresEx: ['35'],
  });
  assert.deepEqual(card._simVisible().map(x => x.id), [1, 2, 'mb'], 'a comedy goes; artists have no genre to leave out');
  card._simModal.genres = [];
  card._simModal.genresEx = ['10752'];
  assert.deepEqual(card._simVisible().map(x => x.id), [2, 3, 'mb']);
});

test('a pick goes to the list its view shows and leaves the other one', () => {
  const card = makeCard();
  const s = { genres: ['28'], genresEx: [] };
  card._simTogglePick(s, 'genres', 'genresEx', 'ex', '28');
  assert.deepEqual([s.genres, s.genresEx], [[], ['28']], 'excluding what was included moves it');
  card._simTogglePick(s, 'genres', 'genresEx', 'ex', '28');
  assert.deepEqual([s.genres, s.genresEx], [[], []], 'a second press in the same view clears it');
  card._simTogglePick(s, 'genres', 'genresEx', 'in', '18');
  card._simTogglePick(s, 'genres', 'genresEx', 'ex', '35');
  assert.deepEqual([s.genres, s.genresEx], [['18'], ['35']], 'one of each at once');
});

test('the triggers name what is included and count what is left out', () => {
  const card = makeCard();
  card._simModal = results({
    genreNames: { 28: 'Akční', 35: 'Komedie' }, items: [hit(5, { genreIds: [28, 35] })],
    genres: ['28'], genresEx: ['35'],
    cast: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }], castSel: [1], castEx: [2, 3],
    countries: [], countriesEx: ['GB'],
  });
  const lbl = html => parse(html).querySelector('.mt-tb-lbl').textContent;
  assert.equal(lbl(card._simGenreHtml()), 'Akční −1');
  assert.equal(lbl(card._simCastHtml()), `${card._t('simCast')} +1 −2`);
  assert.equal(lbl(card._simCountryHtml()), `${card._t('simCountry')} −1`, 'only left out: the filter name and the count');

  Object.defineProperty(card, '_isMob', { value: true, configurable: true });
  const glyph = parse(card._simCountryHtml()).querySelector('#sim-country-btn');
  assert.ok(glyph.classList.contains('is-active'), 'a filter that only excludes is still lit');
  assert.ok(glyph.querySelector('span[style*="#e5484d"]'), 'with the red dot a glyph has room for');
});

test('each panel opens on Include; what is set on the other side shows faintly', () => {
  const card = makeCard();
  card._simModal = results({ genreNames: { 28: 'Akční', 35: 'Komedie' }, items: [hit(5, { genreIds: [28, 35] })],
    genres: ['28'], genresEx: ['35'], _genreOpen: true });
  let dom = parse(card._simGenreHtml());
  assert.ok(dom.querySelector('[data-sim-fview="genre:in"]') && dom.querySelector('[data-sim-fview="genre:ex"]'), 'the peanut');
  const pill = g => dom.querySelector(`[data-sim-genre="${g}"]`).getAttribute('style');
  assert.match(pill('28'), /rgba\(0,122,255,0\.32\)/, 'included: filled blue');
  assert.match(pill('35'), /dashed rgba\(229,72,77/, 'left out: a faint red edge in the Include view');
  assert.match(pill('35'), /line-through/);

  card._simModal._genreView = 'ex';
  dom = parse(card._simGenreHtml());
  assert.match(pill('35'), /rgba\(229,72,77,0\.32\)/, 'in the Exclude view it is filled red');
  assert.match(pill('28'), /dashed rgba\(0,122,255/, 'and the included one is the faint one');
});

test('the peanut switches where the next picks go', () => {
  const card = makeCard();
  card._simModal = results({ countries: [], countriesEx: [] });
  const el = parse(card._simModalHtml()).firstElementChild;
  card._wireSimModal(el);
  card._simLoadResults = () => {};
  card._simModal._countryOpen = true;
  card._simRefreshCountry(el);
  el.querySelector('[data-sim-fview="country:ex"]').click();
  assert.equal(card._simModal._countryView, 'ex');
  el.querySelector('[data-sim-country="GB"]').click();
  assert.deepEqual([card._simModal.countries, card._simModal.countriesEx], [[], ['GB']]);
  assert.equal(localStorage.getItem('arr-sim-countries-ex'), '["GB"]', 'remembered, as the included ones are');
  localStorage.removeItem('arr-sim-countries-ex');
  localStorage.removeItem('arr-sim-countries');
});

test('countries left out are remembered for the next opening', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const card = makeCard({ shadowRoot: host.attachShadow({ mode: 'open' }) });
  localStorage.setItem('arr-sim-countries', '["US"]');
  localStorage.setItem('arr-sim-countries-ex', '["GB","US","bogus"]');
  card._openSimModal();
  assert.deepEqual([card._simModal.countries, card._simModal.countriesEx], [['US'], ['GB']],
    'not a code, and not one already included');
  card._closeSimModal();
  localStorage.removeItem('arr-sim-countries');
  localStorage.removeItem('arr-sim-countries-ex');
});

function filmCard(similar, trakt = []) {
  const calls = [];
  const card = makeCard({ _overseerrConfigured: true, _traktConfigured: true, _lidarrConfigured: false });
  card._discoverIconKey = () => 'overseerr';
  card._callApi = async (m, path) => {
    calls.push(path);
    if (path.startsWith('arr_stack/trakt/related')) return trakt;
    return similar;
  };
  return { card, calls };
}

test('countries and actors left out go to the proxy, and Trakt is held to them too', async () => {
  const { card, calls } = filmCard({
    genreIds: [], keywords: [], used: [],
    byKeyword: [hit(1, { originCountry: ['US'] }), hit(2, { originCountry: ['GB'] })],
    similar: [], recommendations: [],
    excludedTitles: ['movie:9'],
  }, [hit(8), hit(9)]);
  const res = await card._simFetch({ kind: 'movie', id: 42, title: 'X' }, null, { xcountry: ['GB'], xcast: [7] });
  const asked = calls.find(c => c.startsWith('arr_stack/overseerr/similar'));
  assert.ok(asked.includes('&xcountry=GB') && asked.includes('&xcast=7'), asked);
  assert.deepEqual(res.items.map(x => x.id).sort(), [1, 8],
    'from Britain: gone; Trakt\'s with no known origin: kept; Trakt\'s in a left-out actor\'s films: gone');
});

test('an artist from a country left out goes; one of unknown origin stays', async () => {
  const card = makeCard();
  card._callApi = async (m, path) => {
    if (path.startsWith('arr_stack/lastfm/similar')) return { artists: [{ name: 'A', mbid: 'mb-a' }, { name: 'B', mbid: 'mb-b' }, { name: 'C', mbid: 'mb-c' }] };
    if (path.startsWith('arr_stack/lidarr/origins')) return { 'mb-a': 'CZ', 'mb-b': 'SK' };
    return null;
  };
  const res = await card._simFetch({ kind: 'music', id: 'mb-x', mbid: 'mb-x', title: 'X' }, null, { xcountry: ['SK'] });
  assert.deepEqual(res.items.map(x => x.title).sort(), ['A', 'C']);
});

test('genres left out are remembered for the next title and the next opening; included ones are not', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const card = makeCard({ shadowRoot: host.attachShadow({ mode: 'open' }) });
  localStorage.setItem('arr-sim-genres-ex', '["16", "x"]');
  card._openSimModal();
  assert.deepEqual(card._simModal.genresEx, ['16'], 'read back on opening, anything not an id dropped');

  const el = host.shadowRoot.querySelector('[data-sim-modal]');
  card._simLoadResults = async () => {};
  card._simModal.genres = ['28'];
  await card._simSetSeed({ kind: 'movie', id: 7, title: 'Next' }, el);
  assert.deepEqual([card._simModal.genres, card._simModal.genresEx], [[], ['16']], 'a new title keeps what is left out');

  // Shown in the panel even when these results carry none of it, so it can be taken back
  Object.assign(card._simModal, { genreNames: { 16: 'Animace', 28: 'Akční' }, items: [hit(1, { genreIds: [28] })], _genreOpen: true, mode: 'results' });
  assert.ok(parse(card._simGenreHtml()).querySelector('[data-sim-genre="16"]'));
  card._closeSimModal();
  localStorage.removeItem('arr-sim-genres-ex');
});

test('taking a genre back out of Exclude is remembered as well', () => {
  const card = makeCard();
  card._simModal = results({ genreNames: { 16: 'Animace' }, items: [hit(1, { genreIds: [16] })], genresEx: [], _genreOpen: true, _genreView: 'ex' });
  const el = parse(card._simModalHtml()).firstElementChild;
  card._wireSimModal(el);
  card._simRender = () => {};
  card._simRefreshGenre(el);
  el.querySelector('[data-sim-genre="16"]').click();
  assert.equal(localStorage.getItem('arr-sim-genres-ex'), '["16"]');
  card._simRefreshGenre(el);
  el.querySelector('[data-sim-genre="16"]').click();
  assert.equal(localStorage.getItem('arr-sim-genres-ex'), '[]');
  localStorage.removeItem('arr-sim-genres-ex');
});

test('countries included and left out carry over to the next title', async () => {
  const card = makeCard();
  card._simModal = results({ countries: ['US'], countriesEx: ['GB'] });
  const el = parse(card._simModalHtml()).firstElementChild;
  card._simLoadResults = async () => {};
  await card._simSetSeed({ kind: 'movie', id: 7, title: 'Next' }, el);
  assert.deepEqual([card._simModal.countries, card._simModal.countriesEx], [['US'], ['GB']]);
});
