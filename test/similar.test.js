// Similar titles: what the sources suggest for one title, merged into one
// ranked list, and the grid the modal draws from it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

const hit = (id, extra = {}) => ({ id, mediaType: 'movie', title: `T${id}`, posterPath: `/p${id}.jpg`, ...extra });

test('a title two lists both rank well outranks the first pick of either alone', () => {
  const card = makeCard();
  const out = card._simMerge([
    { src: 'overseerr', items: [hit(1), hit(2), hit(3)] },
    { src: 'trakt',     items: [hit(4), hit(3), hit(9)] },
  ], 'movie:9');
  assert.equal(out[0].id, 3);
  assert.deepEqual(out[0]._simSrc, ['overseerr', 'trakt']);
  assert.ok(!out.some(x => x.id === 9), 'the title asked about is not suggested for itself');
});

function filmCard({ seerr = true, similar }) {
  const calls = [];
  const card = makeCard({ _overseerrConfigured: seerr, _traktConfigured: true });
  card._discoverIconKey = () => (seerr ? 'overseerr' : 'tmdb');
  card._callApi = async (method, path) => {
    calls.push(path);
    if (path.startsWith('arr_stack/trakt/related')) return [hit(8)];
    return similar;
  };
  return { card, calls };
}

test('what a film is about leads: a keyword match beats "people also liked"', async () => {
  const { card, calls } = filmCard({ similar: {
    genreIds: [28], keywords: [{ id: 1, name: 'natural disaster' }], used: [1],
    byKeyword: [hit(5, { genreIds: [28] })],
    similar: [],
    recommendations: [hit(6, { genreIds: [28] })],
  } });
  const res = await card._simFetch({ kind: 'movie', id: 42, title: '2012' });
  assert.ok(calls.some(c => c.startsWith('arr_stack/overseerr/similar?type=movie&id=42&kinds=movie,tv&lang=')), calls.join(' '));
  assert.ok(calls.includes('arr_stack/trakt/related?type=movie&id=42'));
  assert.deepEqual(res.items.map(x => x.id), [5, 8, 6]);
  assert.deepEqual(res.keywords, [{ id: 1, name: 'natural disaster' }]);
});

test('a title with no genre in common is dropped; one without genres is not', async () => {
  const { card } = filmCard({ seerr: false, similar: {
    genreIds: [28, 878], keywords: [], used: [],
    byKeyword: [hit(5, { genreIds: [35] }), hit(6, { genreIds: [878] })],
    similar: [], recommendations: [],
  } });
  const res = await card._simFetch({ kind: 'movie', id: 42, title: '2012' });
  assert.deepEqual(res.items.map(x => x.id).sort(), [6, 8]);
});

test('the keywords left switched on are passed to the proxy', async () => {
  const { card, calls } = filmCard({ similar: { byKeyword: [], similar: [], recommendations: [] } });
  await card._simFetch({ kind: 'tv', id: 7, title: 'S' }, [3, 9], { since: 2010 });
  const asked = calls.find(c => c.startsWith('arr_stack/overseerr/similar'));
  assert.ok(asked.includes('&since=2010') && asked.endsWith('&kw=3,9'), asked);
});

test('an artist is asked of Deezer first, Last.fm after, one list of both', async () => {
  const card = makeCard();
  const asked = [];
  card._callApi = async (m, path) => {
    asked.push(path);
    if (path.startsWith('arr_stack/lidarr/related')) return { artists: [{ name: 'C', artist: { foreignArtistId: 'mb-c' } }, { name: 'B', artist: { foreignArtistId: 'mb-b' } }] };
    return { artists: [{ name: 'B', mbid: 'mb-b', match: 0.9 }] };
  };
  const res = await card._simFetch({ kind: 'music', id: 'mb-a', mbid: 'mb-a', title: 'A' });
  assert.ok(asked.includes('arr_stack/lidarr/related?artist=A'), asked.join(' '));
  assert.ok(asked.some(p => /^arr_stack\/lastfm\/similar\?mbid=mb-a/.test(p)));
  assert.deepEqual(res.items.map(x => [x.title, x._simSrc]), [['B', ['deezer', 'lastfm']], ['C', ['deezer']]]);
});

const results = (extra = {}) => ({
  mode: 'results', seed: { kind: 'movie', id: 42, title: 'Seed' }, page: 0, _mtCols: 4, type: 'all', sort: 'rel',
  keywords: [{ id: 1, name: 'tsunami' }, { id: 2, name: 'sequel' }], used: [1],
  items: [
    hit(5, { _simSrc: ['trakt'], voteAverage: 6, releaseDate: '2001-01-01' }),
    hit(6, { mediaType: 'tv', _simSrc: ['overseerr'], voteAverage: 9, releaseDate: '2020-01-01' }),
    { mediaType: 'music', id: 'mb-b', title: 'B', mbid: 'mb-b', _simSrc: ['lastfm'] },
  ],
  ...extra,
});

test('the corner names a source only when it is not the one every title comes from', () => {
  const card = makeCard({ _overseerrConfigured: true });
  const badge = src => parse(card._simSrcBadge({ _simSrc: src })).querySelector('.rec-src-badge');
  assert.equal(badge(['overseerr']), null, 'Seerr found every film here');
  assert.equal(badge(['tmdb']), null, 'and TMDB does without Seerr');
  assert.equal(badge([card._discoverIconKey()]), null);
  const trakt = badge(['overseerr', 'trakt']);
  assert.equal(trakt.getAttribute('title'), 'trakt', 'only what tells this card apart');
  assert.equal(badge(['deezer', 'lastfm']).getAttribute('title'), 'deezer, lastfm');
});

test('results are drawn like Recommendations: the request button kept, Find similar above it', () => {
  const card = makeCard();
  card._simModal = results();
  const dom = parse(card._simContentHtml());
  const film = dom.querySelector('.mc[data-popup][data-tmdbid="5"]');
  assert.ok(film, 'a film opens its detail');
  const req = film.querySelector('.req-open');
  assert.ok(req, 'the request button stays');
  assert.ok(req.parentElement.querySelector('[data-sim-find]'), 'Find similar sits with it, above');
  assert.ok(dom.querySelector('[data-artist-unowned] .btn-add:not(.sim-find)'), 'an artist not in Lidarr gets the plus');
  assert.deepEqual([...dom.querySelectorAll('[data-sim-find]')].map(b => b.dataset.simFind), ['0', '1', '2']);
  assert.deepEqual([...dom.querySelectorAll('[data-sim-kw]')].map(b => b.textContent), ['tsunami', 'sequel']);
  assert.equal(dom.querySelector('[data-artist-unowned]')?.dataset.artistUnowned, 'mb-b');
});

test('the header type, the sort and hiding what is owned narrow the grid', () => {
  const card = makeCard({ _radarr: [{ id: 1, tmdbId: 5, hasFile: true }] });
  card._simModal = results({ type: 'movies' });
  assert.deepEqual(card._simVisible().map(x => x.id), [5]);
  card._simModal = results({ sort: 'rating' });
  assert.deepEqual(card._simVisible().map(x => x.id), [6, 5, 'mb-b']);
  card._simModal = results({ hideOwned: true });
  assert.deepEqual(card._simVisible().map(x => x.id), [6, 'mb-b']);
  const halves = [...parse(card._simHdrHtml()).querySelectorAll('[data-sim-type]')].map(h => h.dataset.simType);
  assert.deepEqual(halves, ['all', 'movies', 'tv', 'music']);
});

test('while searching, a card opens its title and its ≈ picks it as the one to start from', () => {
  const card = makeCard();
  card._simModal = { mode: 'pick', page: 0, _mtCols: 4, type: 'all', cands: [hit(1), hit(2, { mediaType: 'tv' })] };
  const picks = [...parse(card._simContentHtml()).querySelectorAll('.mc[data-sim-idx]')].map(e => e.dataset.simIdx);
  assert.deepEqual(picks, ['0', '1']);
  const dom = parse(card._simContentHtml());
  assert.ok(dom.querySelector('.mc[data-popup][data-tmdbid="1"]'), 'a click opens the detail');
  assert.deepEqual([...dom.querySelectorAll('[data-sim-find]')].map(b => b.dataset.simFind), ['0', '1']);
  assert.deepEqual(card._simSeedOf(hit(2, { mediaType: 'tv', firstAirDate: '2019-03-01' })), { kind: 'tv', id: 2, title: 'T2', year: '2019' });
});

test('a series can be like a film: its folded genres are compared in film terms', async () => {
  const { card } = filmCard({ similar: {
    genreIds: [28, 878], keywords: [], used: [],
    byKeyword: [hit(5, { mediaType: 'tv', genreIds: [10759] }), hit(6, { mediaType: 'tv', genreIds: [10764] })],
    similar: [], recommendations: [],
  } });
  const res = await card._simFetch({ kind: 'movie', id: 42, title: '2012' });
  assert.deepEqual(res.items.filter(x => x.mediaType === 'tv').map(x => x.id), [5]);
});

test('genre and year narrow the results; the genre list is named from the proxy', () => {
  const card = makeCard();
  card._simModal = results({
    genreNames: { 28: 'Akční', 12: 'Dobrodružný', 18: 'Drama' },
    items: [
      hit(5, { genreIds: [28], releaseDate: '2001-01-01' }),
      hit(6, { mediaType: 'tv', genreIds: [10759], firstAirDate: '2019-05-01' }),
      hit(7, { genreIds: [18], releaseDate: '2021-01-01' }),
      hit(8, { mediaType: 'tv', genreIds: [10759, 10768], firstAirDate: '2018-01-01' }),
    ],
  });
  card._simModal.genres = ['28'];
  assert.deepEqual(card._simVisible().map(x => x.id), [5, 6, 8]);
  card._simModal.genres = ['28', '10752'];
  assert.deepEqual(card._simVisible().map(x => x.id), [8], 'every genre picked — War & Politics counts as War');
  card._simModal.genres = [];
  card._simModal.since = 2015;
  assert.deepEqual(card._simVisible().map(x => x.id), [6, 7, 8]);
  card._simModal._genreOpen = true;
  const chips = [...parse(card._simGenreHtml()).querySelectorAll('[data-sim-genre]')].map(o => o.textContent);
  assert.deepEqual(chips, ['Akční', 'Dobrodružný', 'Drama']);   // War has no name in this list
});

test('artists are searched for whatever type the main search is set to', async () => {
  const card = makeCard({ _searchType: 'movie', _lidarrConfigured: true });
  const asked = [];
  card._callApi = async (m, path) => {
    asked.push(path);
    if (path.startsWith('arr_stack/lidarr/lookup')) return [{ artistName: 'Kryštof', foreignArtistId: 'mb-k' }];
    return m === 'POST' ? { results: [] } : [];
  };
  const found = await card._simFetchSeeds('krystof');
  assert.deepEqual(found.map(x => [x.mediaType, x.title]), [['music', 'Kryštof']]);
});

test('a country keeps only what the proxy confirmed comes from there', async () => {
  const { card, calls } = filmCard({ similar: {
    genreIds: [], keywords: [], used: [],
    byKeyword: [hit(5, { originCountry: ['CZ'] }), hit(6, { originCountry: ['US'] })],
    similar: [], recommendations: [],
  } });
  const res = await card._simFetch({ kind: 'movie', id: 42, title: 'X' }, null, { country: 'CZ', since: 2000, until: 2009 });
  const asked = calls.find(c => c.startsWith('arr_stack/overseerr/similar'));
  assert.ok(asked.includes('&since=2000&until=2009&country=CZ'), asked);
  assert.deepEqual(res.items.map(x => x.id), [5], 'Trakt\'s, with no country, go too');
});

test('several countries at once: a title from any one of them is kept', async () => {
  const { card, calls } = filmCard({ similar: {
    genreIds: [], keywords: [], used: [],
    byKeyword: [hit(5, { originCountry: ['CZ'] }), hit(6, { originCountry: ['SK'] }), hit(7, { originCountry: ['US'] })],
    similar: [], recommendations: [],
  } });
  const res = await card._simFetch({ kind: 'movie', id: 42, title: 'X' }, null, { country: ['CZ', 'SK'] });
  const asked = calls.find(c => c.startsWith('arr_stack/overseerr/similar'));
  assert.ok(asked.includes('&country=CZ,SK'), asked);
  // A title has one origin, so asking for two the way genres are asked would
  // answer with nothing at all
  assert.deepEqual(res.items.map(x => x.id).sort(), [5, 6]);
});

test('an artist from any of the countries picked is kept', async () => {
  const card = makeCard();
  card._callApi = async (m, path) => {
    if (path.startsWith('arr_stack/lastfm/similar')) return { artists: [{ name: 'A', mbid: 'mb-a' }, { name: 'B', mbid: 'mb-b' }, { name: 'C', mbid: 'mb-c' }] };
    if (path.startsWith('arr_stack/lidarr/origins')) return { 'mb-a': 'CZ', 'mb-b': 'SK', 'mb-c': 'US' };
    return null;
  };
  const res = await card._simFetch({ kind: 'music', id: 'mb-x', mbid: 'mb-x', title: 'X' }, null, { country: ['CZ', 'SK'] });
  assert.deepEqual(res.items.map(x => x.title).sort(), ['A', 'B']);
});

test('artists are narrowed to a country by where MusicBrainz says they are from', async () => {
  const card = makeCard();
  card._callApi = async (m, path) => {
    if (path.startsWith('arr_stack/lastfm/similar')) return { artists: [{ name: 'A', mbid: 'mb-a' }, { name: 'B', mbid: 'mb-b' }, { name: 'C' }] };
    if (path.startsWith('arr_stack/lidarr/origins')) return { 'mb-a': 'CZ', 'mb-b': 'SK' };
    return null;
  };
  const res = await card._simFetch({ kind: 'music', id: 'mb-x', mbid: 'mb-x', title: 'X' }, null, { country: 'CZ' });
  assert.deepEqual(res.items.map(x => x.title), ['A']);
});

test('a span of years narrows the grid, and the year control says what is set', () => {
  const card = makeCard();
  card._simModal = results({
    items: [hit(5, { releaseDate: '1995-01-01' }), hit(6, { releaseDate: '2005-01-01' }), hit(7, { releaseDate: '2015-01-01' })],
    since: 2000, until: 2009,
  });
  assert.deepEqual(card._simVisible().map(x => x.id), [6]);
  assert.match(parse(card._simYearHtml()).textContent, /2000–2009/);
  card._simModal.since = null; card._simModal.until = null;
  assert.equal(parse(card._simYearHtml()).querySelector('#sim-year-btn').classList.contains('is-off'), true);
});

test('similar artists come with their Lidarr record, which opens their preview', async () => {
  const card = makeCard();
  let asked = '';
  const rec = { artistName: 'B', foreignArtistId: 'mb-b', images: [{ coverType: 'poster', remoteUrl: 'https://x/b.jpg' }] };
  card._callApi = async (m, path) => { asked = path; return { artists: [{ name: 'B', mbid: 'mb-b', artist: rec }] }; };
  const res = await card._simFetch({ kind: 'music', id: 'mb-a', mbid: 'mb-a', title: 'A' });
  assert.ok(asked.includes('&enrich=1'), asked);
  assert.equal(res.items[0].artist, rec);
  assert.equal(card._musUnownedArtist('mb-b'), rec);
});

test('a film brings its soundtrack: the credited artists, as music, with their Lidarr record', async () => {
  const rec = { artistName: 'Harald Kloser', foreignArtistId: 'mb-h', images: [] };
  const calls = [];
  const card = makeCard({ _lidarrConfigured: true, _traktConfigured: false });
  card._callApi = async (m, path) => {
    calls.push(path);
    if (path.startsWith('arr_stack/lidarr/soundtrack')) return { artists: [{ name: 'Harald Kloser', mbid: 'mb-h', artist: rec, soundtrack: '2012' }] };
    return { byKeyword: [hit(5)], similar: [], recommendations: [] };
  };
  const res = await card._simFetch({ kind: 'movie', id: 42, title: '2012', year: '2009' });
  assert.ok(calls.includes('arr_stack/lidarr/soundtrack?title=2012&year=2009'), calls.join(' '));
  const music = res.items.filter(x => x.mediaType === 'music');
  assert.deepEqual(music.map(x => [x.title, x._simSrc[0]]), [['Harald Kloser', 'lidarr']]);
  assert.equal(card._musUnownedArtist('mb-h'), rec);
});

test('country reads Country unset and names what is picked; genre the same', () => {
  const card = makeCard();
  card._simModal = results({ countries: [] });
  const cLabel = () => parse(card._simCountryHtml()).querySelector('.mt-tb-lbl').textContent;
  assert.equal(cLabel(), card._t('simCountry'));
  card._simModal.countries = ['CZ'];
  const one = cLabel();
  assert.notEqual(one, card._t('simCountry'), 'the country picked is named');
  card._simModal.countries = ['CZ', 'SK'];
  assert.equal(cLabel(), `${one} +1`, 'and the rest are counted');
  card._simModal = results({ genreNames: { 28: 'Akční', 18: 'Drama' }, items: [hit(5, { genreIds: [28, 18] })] });
  const label = () => parse(card._simGenreHtml()).querySelector('.mt-tb-lbl').textContent;
  assert.equal(label(), card._t('simGenre'));
  card._simModal.genres = ['28'];
  assert.equal(label(), 'Akční');
  card._simModal.genres = ['28', '18'];
  assert.equal(label(), 'Akční +1');
});

test('the filters stay hidden until a title to start from is picked', () => {
  const card = makeCard();
  card._simModal = { seed: null, mode: 'results', query: '', type: 'all', sort: 'rel', items: null, page: 0 };
  const filters = () => parse(card._simToolbarHtml()).querySelector('#sim-filters').style.display;
  assert.equal(filters(), 'none');
  card._simModal = results();
  assert.equal(filters(), 'contents', 'in the search bar itself from a tablet up');
  assert.equal(parse(card._simToolbarHtml()).querySelectorAll('.mt-tb').length, 1, 'one bar');
  assert.equal(parse(card._simToolbarHtml()).querySelector('#sim-search').getAttribute('placeholder'), `${card._t('simLike')} Seed`);
});

test('picked actors: their titles take the films\' place, more of them first, the composer asked for the music', async () => {
  const calls = [];
  const card = makeCard({ _lidarrConfigured: true, _traktConfigured: false });
  card._callApi = async (m, path) => {
    calls.push(path);
    if (path.startsWith('arr_stack/lidarr/soundtrack')) return { artists: [] };
    return {
      cast: [{ id: 1, name: 'Matthew McConaughey' }, { id: 2, name: 'Anne Hathaway' }],
      composers: ['Hans Zimmer'],
      byKeyword: [hit(5)], similar: [], recommendations: [],
      byCast: [hit(7, { _cast: [1], voteCount: 900 }), hit(8, { _cast: [1, 2], voteCount: 50 })],
    };
  };
  const res = await card._simFetch({ kind: 'movie', id: 42, title: 'Interstellar', year: '2014' }, null, { cast: [1, 2] });
  assert.ok(calls.some(c => c.includes('&cast=1,2')), calls.join(' '));
  assert.ok(calls.includes('arr_stack/lidarr/soundtrack?title=Interstellar&year=2014&composers=Hans%20Zimmer'), calls.join(' '));
  assert.deepEqual(res.castItems.map(x => x.id), [8, 7]);
  assert.equal(res.cast.length, 2);

  card._simModal = results({ castSel: [1], castItems: res.castItems, cast: res.cast });
  assert.deepEqual(card._simVisible().map(x => x.id), [8, 7, 'mb-b']);
  card._simModal._castOpen = true;
  const tiles = [...parse(card._simCastHtml()).querySelectorAll('[data-sim-actor]')].map(b => b.lastElementChild.textContent.trim());
  assert.deepEqual(tiles, ['Matthew McConaughey', 'Anne Hathaway']);
});

test('under Music the chips are Last.fm tags, and back under films the keywords return', () => {
  const card = makeCard();
  card._simModal = results({ mTags: ['film score', 'soundtrack'], mUsed: ['film score'], type: 'music' });
  let dom = parse(card._simContentHtml());
  assert.deepEqual([...dom.querySelectorAll('[data-sim-mtag]')].map(b => b.textContent), ['film score', 'soundtrack']);
  assert.equal(dom.querySelectorAll('[data-sim-kw]').length, 0);
  card._simModal.type = 'movies';
  dom = parse(card._simContentHtml());
  assert.deepEqual([...dom.querySelectorAll('[data-sim-kw]')].map(b => b.textContent), ['tsunami', 'sequel']);
});

test('a soundtrack artist Deezer found says so', async () => {
  const card = makeCard({ _lidarrConfigured: true, _traktConfigured: false });
  card._callApi = async (m, path) => {
    if (path.startsWith('arr_stack/lidarr/soundtrack')) return { artists: [
      { name: 'Hans Zimmer', mbid: 'mb-z', artist: { foreignArtistId: 'mb-z' }, source: 'credits' },
      { name: 'Other', mbid: 'mb-o', artist: { foreignArtistId: 'mb-o' }, source: 'deezer' },
    ] };
    return { byKeyword: [], similar: [], recommendations: [] };
  };
  const res = await card._simFetch({ kind: 'movie', id: 1, title: 'Interstellar' });
  assert.deepEqual(res.items.map(x => [x.title, x._simSrc[0]]), [['Hans Zimmer', 'lidarr'], ['Other', 'deezer']]);
});

test('from a search, Find similar leaves a way back to the search and what it found', async () => {
  const card = makeCard();
  card._callApi = async () => null;
  card._simFetch = async () => ({ items: [hit(9)], keywords: [], used: [], genreNames: {}, cast: [], castItems: [] });
  card._simModal = { seed: null, mode: 'pick', query: 'alien', cands: [hit(1), hit(2)], page: 0, type: 'all', sort: 'rel' };
  const el = parse(card._simModalHtml()).firstElementChild;
  assert.ok(el.querySelector('[data-sim-close]'), 'nothing to go back to yet');
  await card._simSetSeed({ kind: 'movie', id: 1, title: 'Aliens' }, el);
  assert.equal(card._simModal.seed.title, 'Aliens');
  assert.ok(el.querySelector('[data-sim-back]'), 'back replaces close');
  card._simBack(el);
  assert.equal(card._simModal.mode, 'pick');
  assert.equal(card._simModal.query, 'alien');
  assert.equal(card._simModal.cands.length, 2);
  assert.equal(el.querySelector('#sim-search').value, 'alien');
  assert.ok(el.querySelector('[data-sim-close]'));
});

test('on a phone the filters are glyphs, lit while they filter', () => {
  const card = makeCard();
  Object.defineProperty(card, '_isMob', { value: true, configurable: true });
  card._simModal = results({ cast: [{ id: 1, name: 'A' }], castSel: [1], countries: ['CZ'] });
  const dom = parse(card._simToolbarHtml());
  assert.ok(dom.querySelector('#sim-cast-btn.mt-tb-sel--ico.is-active svg'));
  assert.ok(dom.querySelector('#sim-year-btn.mt-tb-sel--ico:not(.is-active)'));
  assert.equal(dom.querySelectorAll('#sim-filters .mt-tb-lbl').length, 0, 'no words on a phone');
  assert.ok(dom.querySelector('#sim-country-btn.mt-tb-sel--ico.is-active svg'));
  assert.ok(dom.querySelector('#sim-sort').closest('.mt-tb-sel--ico.is-active'), 'the sort is always lit');
  card._simModal.hideOwned = true;
  const hide = parse(card._simHideHtml()).querySelector('[data-sim-hide-owned]');
  assert.ok(hide.matches('.mt-tb-sel--ico.is-active'), 'lit as the others are, not a filled pill');
  assert.equal(parse(card._simToolbarHtml()).querySelector('#sim-filters').style.justifyContent, 'space-between');
});

test('the actor panel takes the room a tablet has, so the names are readable', () => {
  const card = makeCard();
  card._simModal = results({ cast: [{ id: 1, name: 'Katheryn Winnick' }], _castOpen: true });
  const pop = parse(card._simCastHtml()).querySelector('#sim-cast-pop');
  const grid = pop.querySelector('div[style*="grid-template-columns"]');
  assert.match(pop.getAttribute('style'), /width:min\(760px,86vw\)/);
  assert.match(grid.getAttribute('style'), /minmax\(170px/, 'a tile a full name fits in');

  // A phone was never the problem: there the viewport decides the width
  Object.defineProperty(card, '_isMob', { value: true, configurable: true });
  const mob = parse(card._simCastHtml()).querySelector('#sim-cast-pop');
  assert.match(mob.getAttribute('style'), /width:min\(460px,86vw\)/);
});

test('artists come after the films and series, whatever the order is', () => {
  const card = makeCard();
  const artist = (id, title) => ({ id, mediaType: 'music', title, mbid: `mb-${id}` });
  card._simModal = results({
    items: [
      artist('a', 'Trevor Jones'),
      hit(5, { title: 'B Film', releaseDate: '2001-01-01', voteAverage: 6 }),
      artist('b', 'Hans Zimmer'),
      hit(6, { title: 'A Film', releaseDate: '1999-01-01', voteAverage: 9 }),
    ],
  });
  const kinds = () => card._simVisible().map(it => it.mediaType);
  assert.deepEqual(kinds(), ['movie', 'movie', 'music', 'music'], 'as ranked');
  card._simModal.sort = 'rating';
  assert.deepEqual(kinds(), ['movie', 'movie', 'music', 'music'], 'sorted by rating');
  card._simModal.sort = 'title';
  assert.deepEqual(card._simVisible().map(it => it.title), ['A Film', 'B Film', 'Hans Zimmer', 'Trevor Jones']);

  // Under Music there is nothing for them to follow
  card._simModal.sort = 'rel';
  card._simModal.type = 'music';
  assert.deepEqual(kinds(), ['music', 'music']);
});

test('the actor filter counts who is picked instead of naming them', () => {
  const card = makeCard();
  const cast = [{ id: 1, name: 'Katheryn Winnick' }, { id: 2, name: 'Alexander Ludwig' }];
  card._simModal = results({ cast, castSel: [] });
  const label = () => parse(card._simCastHtml()).querySelector('.mt-tb-lbl').textContent;
  assert.equal(label(), card._t('simCast'), 'nothing picked, nothing counted');
  card._simModal.castSel = [1];
  assert.equal(label(), `${card._t('simCast')} +1`, 'a name this long rewrites the whole bar');
  card._simModal.castSel = [1, 2];
  assert.equal(label(), `${card._t('simCast')} +2`);
});

test('Find similar sits on a search result, where there is something to search with', () => {
  const card = makeCard({ _overseerrConfigured: true });
  const btn = parse(card._simSeedBtn({ kind: 'movie', id: 5, title: 'Rambo', year: '2008' })).querySelector('.sim-seed');
  assert.deepEqual([btn.dataset.simKind, btn.dataset.simId, btn.dataset.simTitle, btn.dataset.simYear], ['movie', '5', 'Rambo', '2008']);
  const none = makeCard({ _overseerrConfigured: false, _tmdbOwnKey: false, _lidarrConfigured: false });
  assert.equal(none._simSeedBtn({ kind: 'movie', id: 5, title: 'Rambo' }), '');
  assert.equal(none._simSeedBtn({ kind: 'music', id: 'mb', mbid: 'mb', title: 'A' }), '');
  const musicOnly = makeCard({ _overseerrConfigured: false, _tmdbOwnKey: false, _lidarrConfigured: true });
  assert.ok(musicOnly._simSeedBtn({ kind: 'music', id: 'mb', mbid: 'mb', title: 'A' }));
  musicOnly._simModal = { type: 'all', mode: 'results', items: null };
  const halves = [...parse(musicOnly._simHdrHtml()).querySelectorAll('[data-sim-type]')].map(h => h.dataset.simType);
  assert.deepEqual(halves, ['all', 'music']);
});

test('a search result carries Find similar above its request button', () => {
  const card = makeCard({ _overseerrConfigured: true, _searchResults: [hit(5, { title: 'Rambo', releaseDate: '2008-01-24' })], _searchPage: 0 });
  const dom = parse(card._renderSearchResultsGrid());
  const req = dom.querySelector('.mc[data-tmdbid="5"] .req-open');
  assert.ok(req);
  const sim = req.parentElement.querySelector('.sim-seed');
  assert.equal(sim?.dataset.simYear, '2008');
});

test('opened from a search result, back closes Similar titles onto the results', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const card = makeCard({ shadowRoot: host.attachShadow({ mode: 'open' }) });
  card._callApi = async () => null;
  card._simFetch = async () => ({ items: [], keywords: [], used: [], genreNames: {}, cast: [], castItems: [] });
  card._openSimModal({ kind: 'movie', id: 5, title: 'Rambo' }, null, { fromSearch: true });
  const el = card.shadowRoot.querySelector('[data-sim-modal]');
  assert.ok(el.querySelector('[data-sim-back]'));
  card._simBack(el);
  assert.equal(card._simModal, null);
  assert.equal(card.shadowRoot.querySelector('[data-sim-modal]'), null);
});

test('an artist\'s window offers Similar titles, the preview of one not in Lidarr too', () => {
  const card = makeCard({ _plexConfigured: false });
  card._musStatsSource = () => null;
  card._musicModal = { artistId: 3, artist: { artistName: 'Kryštof', foreignArtistId: 'mb-k', statistics: {} } };
  assert.ok(parse(card._musMenuHtml('actions')).querySelector('[data-mus-act="similar"]'));
  card._musicModal = { artistId: null, preview: 'mb-k', artist: { artistName: 'Kryštof', foreignArtistId: 'mb-k' } };
  assert.ok(parse(card._musPreviewBar()).querySelector('[data-mus-menu="actions"]'));
  const acts = [...parse(card._musMenuHtml('actions')).querySelectorAll('[data-mus-act]')].map(b => b.dataset.musAct);
  assert.deepEqual(acts, ['similar'], 'nothing that needs a library record');
});

test('year, country, sort and hide-owned are there again on the next opening', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const card = makeCard({ shadowRoot: host.attachShadow({ mode: 'open' }) });
  localStorage.setItem('arr-sim-since', '2000');
  localStorage.setItem('arr-sim-until', '2009');
  localStorage.setItem('arr-sim-countries', JSON.stringify(['CZ', 'SK']));
  localStorage.setItem('arr-sim-sort', 'rating');
  localStorage.setItem('arr-sim-hide', '1');
  card._openSimModal();
  const s = card._simModal;
  assert.deepEqual([s.since, s.until, s.countries, s.sort, s.hideOwned], [2000, 2009, ['CZ', 'SK'], 'rating', true]);
  card._closeSimModal();

  // One country, stored by a build from before this was a picker
  localStorage.removeItem('arr-sim-countries');
  localStorage.setItem('arr-sim-country', 'CZ');
  card._openSimModal();
  assert.deepEqual(card._simModal.countries, ['CZ'], 'the filter survives the upgrade');
  card._closeSimModal();

  localStorage.setItem('arr-sim-since', 'garbage');
  localStorage.setItem('arr-sim-countries', JSON.stringify(['Czechia', 'CZ']));
  card._openSimModal();
  assert.deepEqual([card._simModal.since, card._simModal.countries], [null, ['CZ']],
    'anything that is not an ISO code is dropped rather than drawn');
  card._closeSimModal();
  for (const k of ['arr-sim-since', 'arr-sim-until', 'arr-sim-country', 'arr-sim-countries', 'arr-sim-sort', 'arr-sim-hide']) localStorage.removeItem(k);
});

test('titles and ids from the APIs cannot break out of the markup', () => {
  const card = makeCard();
  const evil = 'X" autofocus onfocus="alert(1)';
  card._simModal = results({
    seed: { kind: 'movie', id: 42, title: evil },
    keywords: [{ id: '1" onclick="x', name: 'k' }], used: [],
    cast: [{ id: '2" onclick="x', name: 'A', profilePath: '/a.jpg" onerror="x' }], _castOpen: true,
  });
  const tb = parse(card._simToolbarHtml());
  const inp = tb.querySelector('#sim-search');
  assert.equal(inp.getAttribute('placeholder'), `${card._t('simLike')} ${evil}`);
  assert.equal(inp.hasAttribute('onfocus'), false);
  assert.equal(tb.querySelector('[onclick], [onerror]'), null);
  assert.equal(tb.querySelector('#sim-cast-pop img'), null, 'an odd picture path is not drawn');
  assert.equal(parse(card._simContentHtml()).querySelector('[onclick]'), null);
});

test('a remembered year does not empty an artist\'s results', () => {
  const card = makeCard();
  card._simModal = results({ since: 2000, until: 2009, genres: ['28'], seed: { kind: 'music', id: 'mb', mbid: 'mb', title: 'A' },
    items: [{ mediaType: 'music', id: 'mb-b', title: 'B', mbid: 'mb-b' }] });
  assert.deepEqual(card._simVisible().map(x => x.id), ['mb-b']);
});
