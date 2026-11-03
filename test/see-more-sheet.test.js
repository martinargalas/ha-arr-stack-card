// See More on a phone (#48): the category over the whole screen, scrolled down,
// more posters as the reader nears the end — never paged two at a time.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, setViewport } from './harness.js';
import { SHEET_BATCH } from '../src/render/sections.js';

afterEach(() => setViewport(1400));

function trending(n, extra = {}) {
  const card = makeCard({
    _config: { discover: { itemsPerCategory: 2 } },
    _trending: Array.from({ length: n }, (_, i) => ({ id: i + 1, mediaType: 'movie', title: `T${i}` })),
    _overlay: { section: 'trending', page: 0, tvPending: null },
    _overlayApiPage: { trending: 1 },
    _overlayApiTotalPages: { trending: 1 },
    ...extra,
  });
  card._renderTrendingCard = m => `<div class="mc" data-id="${m.id}"></div>`;
  return card;
}

test('on a phone See More is a sheet with the first batch, not two posters', () => {
  setViewport(390);
  const card = trending(60);
  const doc = parse(card._renderSectionOverlay('trending'));
  assert.ok(doc.querySelector('.to-sheet'));
  assert.equal(doc.querySelectorAll('.mc').length, SHEET_BATCH);
  assert.ok(doc.querySelector('[data-sheet-more]'), 'a footer to load more from');
  assert.equal(card._renderSectionOverlayNav('trending'), '', 'no pager under it');
});

test('the sheet shows as many as have been asked for, and ends without a footer', () => {
  setViewport(390);
  const card = trending(30, { _overlay: { section: 'trending', page: 0, tvPending: null, shown: 48 } });
  const doc = parse(card._renderSectionOverlay('trending'));
  assert.equal(doc.querySelectorAll('.mc').length, 30);
  assert.ok(!doc.querySelector('[data-sheet-more]'));
});

test('with everything loaded shown, the footer stays while the server has more', () => {
  setViewport(390);
  const card = trending(20, { _overlayApiTotalPages: { trending: 5 } });
  assert.ok(parse(card._renderSectionOverlay('trending')).querySelector('[data-sheet-more]'));
  card._sheetFetchFailed = 'trending';
  assert.ok(!parse(card._renderSectionOverlay('trending')).querySelector('[data-sheet-more]'),
    'a page that failed is not asked for in a loop');
});

test('a tablet keeps the paged See More', () => {
  setViewport(768);
  const card = trending(60);
  const doc = parse(card._renderSectionOverlay('trending'));
  assert.ok(!doc.querySelector('.to-sheet'));
  assert.equal(doc.querySelectorAll('.mc').length, 4);
});

test('nearing the end shows the next batch, from the server once the loaded run out', async () => {
  setViewport(390);
  const card = trending(30, { _overlayApiTotalPages: { trending: 3 } });
  card._reRenderSection = () => {};
  const asked = [];
  card._hass.callApi = (m, path) => {
    asked.push(path);
    return Promise.resolve({ results: Array.from({ length: 20 }, (_, i) => ({ id: 100 + i })), totalPages: 3 });
  };
  card._overlay.shown = SHEET_BATCH;
  await card._sheetMore();
  assert.equal(card._overlay.shown, SHEET_BATCH * 2);
  assert.deepEqual(asked, [], 'still loaded posters to show first');
  await card._sheetMore();
  assert.deepEqual(asked, ['arr_stack/overseerr/trending?page=2']);
  assert.equal(card._trending.length, 50);
  assert.equal(card._overlay.shown, SHEET_BATCH * 3);
});
