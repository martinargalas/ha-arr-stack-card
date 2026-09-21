// Similar titles: asking for a title from inside the modal. A film's overlay
// belongs to its own card, a series' and an artist's to a panel over the grid,
// and the modal answers all three itself — the right column's re-render, which
// is what every other row relies on, does not reach in here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

const hit = (id, extra = {}) => ({
  id, mediaType: 'movie', title: `T${id}`, posterPath: `/p${id}.jpg`, genreIds: [28], ...extra,
});

function simCard(over = {}) {
  const card = makeCard({
    _sonarrProfiles: [{ id: 1, name: 'HD' }], _sonarrTags: [], _sonarrRootFolders: [{ path: '/tv' }],
    _radarrProfiles: [{ id: 2, name: 'UHD' }], _radarrTags: [], _radarrRootFolders: [{ path: '/films' }],
    _seerrSonarr: { serverId: 0, profileId: 1, rootFolder: '/tv' },
    _seerrRadarr: { serverId: 0, profileId: 2, rootFolder: '/films' },
    _sonarr2Configured: false, _radarr2Configured: false,
    ...over,
  });
  card._simModal = {
    mode: 'results', seed: { kind: 'movie', id: 42, title: 'Seed' }, page: 0, _mtCols: 4,
    type: 'all', sort: 'rel', keywords: [], used: [],
    items: [hit(5), hit(9, { mediaType: 'tv', name: 'S9' })],
  };
  card._fetchRadarrProfiles = async () => {};
  card._fetchRadarrTags = async () => {};
  card._fetchRadarrRootFolders = async () => {};
  return card;
}

const content = card => parse(card._simContentHtml());

test('a film is asked for in its own card, the way every other row asks', async () => {
  const card = simCard();
  const el = parse(card._simModalHtml()).firstElementChild;
  card._wireSimModal(el);
  const open = content(card).querySelector('.req-open');
  assert.ok(open, 'the plus is on the card');

  await card._simMovieReqOpen(open, el);
  assert.equal(card._requestPending.reqKey, 'sim-5');

  const card5 = content(card).querySelector('.mc[data-tmdbid="5"]');
  assert.ok(card5.querySelector('.req-overlay'), 'the overlay is inside the card it was opened on');
  assert.ok(!content(card).querySelector('.sim-req-scrim'), 'and not over the grid');
});

test('a series gets a panel over the grid, not an overlay across one row', () => {
  const card = simCard();
  card._tvRequestPending = {
    source: 'sim', show: { id: 9, name: 'S9', posterPath: '/p9.jpg' }, mediaId: 9,
    seasons: [1, 2], selected: new Set([1, 2]), profileId: 1, loading: false,
  };
  const wrap = content(card).querySelector('#sim-grid-wrap');
  const scrim = wrap.querySelector('.sim-req-scrim');
  assert.ok(scrim, 'the panel hangs off the grid wrapper, so it covers the grid and nothing else');
  assert.ok(scrim.querySelector('.tv-req-overlay .sv-input'), 'with the season switches in it');
  // The same pending state must not also paint over the search results below
  card._searchActive = false;
  card._musAddPending = { source: 'sim', artist: {}, loading: true };
  assert.ok(!parse(card._renderSearchResultsInner()).querySelector('.mus-add-overlay'),
    'a second copy under the modal would repeat every id in the shadow root');
});

test('an artist asked for from the modal repaints the modal', () => {
  const card = simCard();
  const painted = [];
  card._simRender = () => painted.push('sim');
  card._reRenderSearchResults = () => painted.push('search');
  card._reRenderSection = () => painted.push('section');
  card._musAddPaintFor('sim');
  card._musAddPaintFor('search');
  assert.deepEqual(painted, ['sim', 'search']);
});

test('the column re-wiring does not add a second listener to confirm', async () => {
  const card = simCard();
  let sent = 0;
  card._addOverseerrRequest = async () => { sent += 1; };
  const el = parse(card._simModalHtml()).firstElementChild;
  card._wireSimModal(el);
  const c = el.querySelector('#sim-content');
  c.innerHTML = card._simContentHtml();
  await card._simMovieReqOpen(c.querySelector('.req-open'), el);

  // What the right column does on every poll: it walks the whole shadow root,
  // this modal included
  card.shadowRoot = el;
  el.getElementById = id => el.querySelector(`#${id}`);
  for (const m of ['_wireTraktButtons', '_wireTvOverlay', '_wireSectionOverlay', '_alignReqOverlay', '_wireMusicCards']) card[m] = () => {};
  card._wireOverseerrButtons();
  card._wireOverseerrButtons();

  el.querySelector('.req-confirm').click();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(sent, 1, 'one press of confirm is one request');
});

test('cancelling clears whichever overlay was up and leaves the grid alone', () => {
  const card = simCard();
  const el = parse(card._simModalHtml()).firstElementChild;
  card._simRender = () => {};
  card._requestPending = { movieId: 5, tmdbId: 5, reqKey: 'sim-5' };
  card._tvRequestPending = { source: 'sim', show: { id: 9 } };
  card._musAddPending = { source: 'sim', artist: {} };
  card._simReqCancel(el);
  assert.equal(card._requestPending, null);
  assert.equal(card._tvRequestPending, null);
  assert.equal(card._musAddPending, null);
});
