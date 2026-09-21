// Removing a title from the library: the card behind the detail has to go back
// to offering the plus, with no status stripe left over from the request it
// used to have.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

const TMDB = 603;

function removable(over = {}) {
  const card = makeCard({
    _radarr: [{ id: 7, tmdbId: TMDB, hasFile: true, monitored: true, statistics: {}, ratings: {} }],
    ...over,
  });
  card._popup = { _type: 'radarr', _radarrId: 7, tmdbId: TMDB, id: TMDB, title: 'The Matrix' };
  card._hass.callApi = async () => ({});
  card._fetchAll = () => {};
  card._render = () => {};
  card._renderPopupEl = () => {};
  card._popupReturn = () => false;
  return card;
}

// The card as a discover row draws it, for a title Seerr still reports
const drawn = card => parse(card._renderUpcomingCard({
  id: TMDB, title: 'The Matrix', posterPath: '/m.jpg', voteAverage: 8.7,
  mediaInfo: { status: 3 }, genreIds: [28],
}, { showDate: false }));

test('the plus comes back and the stripe goes when a title leaves the library', async () => {
  const card = removable();
  card._optimisticRequested.add(TMDB);

  const before = drawn(card);
  assert.ok(!before.querySelector('.req-open'), 'while it is held there is nothing to add');

  await card._removeFromLibrary(true, false);

  assert.equal(card._popup, null, 'the detail closes');
  assert.ok(!card._optimisticRequested.has(TMDB), 'the number is the key everywhere else');
  const after = drawn(card);
  assert.ok(after.querySelector('.req-open'), 'the plus is back');
  assert.ok(!after.querySelector('.status-stripe, .b-st-proc, .b-st-avail, .b-dl'),
    'and no leftover badge or stripe from the request it used to have');
});

test('deleting from a search result closes the detail and repaints the results', async () => {
  const card = removable({ _searchActive: true });
  const calls = [];
  card._renderPopupEl = () => calls.push('popup');
  // What _render() does while a search is up: it returns before it would clear
  // the popup or repaint the column
  card._render = () => calls.push('render-bails');
  card._reRenderRight = () => calls.push('right');
  await card._removeFromLibrary(true, false);
  assert.ok(calls.includes('popup'), 'the overlay has to be cleared, not left to a repaint that returns early');
  assert.ok(calls.includes('right'), 'and the results have to be asked to repaint');
  assert.ok(!calls.includes('render-bails'), calls.join(','));
});

test('with no search up, the ordinary full render still runs', async () => {
  const card = removable();
  const calls = [];
  card._renderPopupEl = () => calls.push('popup');
  card._render = () => calls.push('render');
  card._reRenderRight = () => calls.push('right');
  await card._removeFromLibrary(true, false);
  assert.deepEqual(calls, ['popup', 'render']);
});

test('a title Seerr still calls pending is marked taken back', async () => {
  const card = removable();
  card._popup = { _type: 'radarr', _radarrId: 7, tmdbId: TMDB, id: TMDB, title: 'The Matrix' };
  await card._removeFromLibrary(false, false);
  assert.ok(card._withdrawnIds.has(TMDB),
    'Seerr keeps reporting the request until the next fetch, and pending is not stale enough to discount');
});

test('still held by the other instance: nothing is marked taken back', async () => {
  const card = removable({ _radarr2: [{ id: 9, tmdbId: TMDB, hasFile: true }] });
  card._popup = { _type: 'radarr', _radarrId: 7, _radarr2Id: 9, tmdbId: TMDB, id: TMDB, title: 'The Matrix' };
  card._removeInstance = 'radarr';
  await card._removeFromLibrary(false, false);
  assert.ok(!card._withdrawnIds.has(TMDB), 'it is still owned, so it is not a title the reader gave up');
  assert.ok(card._popup, 'and the detail stays open on the copy that remains');
});
