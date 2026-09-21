// The add overlay over the main search's results: it takes the row of the card
// whose plus was pressed. jsdom lays nothing out, so the offsets the sizing
// reads are the ones stated here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

const COLS = 4, W = 100, H = 150;

// Two rows of four, the second row 150px down
function results(ids) {
  const root = document.createElement('div');
  const anchor = document.createElement('div');
  anchor.className = 'tv-req-anchor';
  const grid = document.createElement('div');
  grid.className = 'mgrid';
  ids.forEach((id, i) => {
    const c = document.createElement('div');
    c.className = 'mc';
    c.dataset.tmdbid = String(id);
    const off = {
      offsetTop: Math.floor(i / COLS) * H,
      offsetLeft: (i % COLS) * W,
      offsetWidth: W,
      offsetHeight: H,
    };
    for (const [k, value] of Object.entries(off)) Object.defineProperty(c, k, { value });
    grid.appendChild(c);
  });
  const ov = document.createElement('div');
  ov.className = 'req-overlay';
  anchor.append(grid, ov);
  root.appendChild(anchor);
  return { root, ov };
}

test('a series\' overlay lands on the row of the result its plus was pressed on', () => {
  const card = makeCard();
  const { root, ov } = results([11, 22, 33, 44, 55, 66, 77, 88]);
  card._tvRequestPending = { source: 'search', show: { id: 77 }, mediaId: 77 };
  card._sizeSearchOverlay(root);
  assert.equal(ov.style.top, `${H}px`, 'the second row, where 77 is — not the top of the results');
  assert.equal(ov.style.height, `${H}px`, 'one row tall');
  assert.equal(ov.style.left, '0px');
  assert.equal(ov.style.width, `${COLS * W}px`, 'the whole row it sits on');
});

test('paged away from the card it was opened on, the overlay is not drawn', () => {
  const card = makeCard();
  const { root, ov } = results([11, 22, 33, 44, 55, 66, 77, 88]);
  // The pending series lives on another page of the results
  card._tvRequestPending = { source: 'search', show: { id: 96580 }, mediaId: 96580 };
  card._sizeSearchOverlay(root);
  assert.equal(ov.style.display, 'none', 'covering the first row would park it on a title nobody pressed');
});

test('opening from a search result paints the results, which a plain column redraw would not', async () => {
  const card = makeCard({ _searchActive: true, _overseerrConfigured: false });
  const painted = [];
  card._reRenderSearchResults = () => painted.push('results');
  // What _reRenderRight does while a search is active: nothing, unless forced
  card._reRenderRight = () => painted.push('column');
  card._callApi = async () => ({ seasons: [] });
  card._fetchSonarrProfiles = async () => {};
  card._fetchSonarrRootFolders = async () => {};
  card._wireTvOverlay = () => {};
  await card._openTvRequestOverlay({ id: 96580, name: 'S', tvdbId: null }, 'search');
  assert.ok(painted.includes('results'), 'the overlay has to reach the search results');
  assert.ok(!painted.includes('column'), painted.join(','));
});

test('a repaint of the results wires the overlay\'s own buttons, not just the cards', () => {
  const card = makeCard({ _searchActive: true, _searchOnlyLayout: true });
  const { root } = results([11, 22]);
  const wrap = document.createElement('div');
  wrap.className = 'search-results-wrap';
  wrap.appendChild(root.firstElementChild);
  const sec = document.createElement('div');
  sec.className = 'sec-search';
  sec.appendChild(wrap);
  const host = document.createElement('div');
  host.appendChild(sec);
  host.getElementById = id => host.querySelector(`#${id}`);
  card.shadowRoot = host;
  card._renderSearchResultsInner = () => wrap.innerHTML;
  card._wireSearchResultCards = () => {};
  let wired = 0;
  card._wireOverseerrButtons = () => { wired += 1; };
  card._reRenderSearchResults();
  assert.equal(wired, 1, "a series' cancel and confirm are bound over there, not in the card wiring");
});

test('the plus is bound once even when both wirings walk it', () => {
  const card = makeCard();
  const btn = document.createElement('button');
  btn.className = 'tv-req-open';
  btn.dataset.showid = '77';
  const root = document.createElement('div');
  root.appendChild(btn);
  let opened = 0;
  card._openTvRequestOverlay = async () => { opened += 1; };
  card._searchResults = [{ id: 77, mediaType: 'tv', name: 'S' }];
  card._cfgGet = () => false;
  // The scoped wiring, then the column's: the second must find it already taken
  card._wireSearchResultCards(root);
  assert.equal(btn._owTv, true, 'flagged for the column wiring to skip');
  card._wireSearchResultCards(root);
  btn.click();
  assert.equal(opened, 1, 'one press is one overlay');
});

test('the first row is still the fallback when nothing names a card', () => {
  const card = makeCard();
  const { root, ov } = results([11, 22, 33, 44, 55, 66, 77, 88]);
  card._tvRequestPending = { source: 'trending', show: { id: 77 } };
  card._sizeSearchOverlay(root);
  assert.equal(ov.style.top, '0px');
});

test('an artist\'s overlay still finds its own card', () => {
  const card = makeCard();
  const { root, ov } = results([11, 22, 33, 44, 55, 66, 77, 88]);
  root.querySelectorAll('.mc')[5].dataset.artistUnowned = 'MB-9';
  card._musAddPending = { source: 'search', artist: { foreignArtistId: 'mb-9' } };
  card._sizeSearchOverlay(root);
  assert.equal(ov.style.top, `${H}px`);
});
