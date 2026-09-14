// The search bar at the top of the right column can be switched off (issue
// #32: a static e-ink dashboard wants the room). Its slot then goes to one
// more category, so a page still holds "categories per page" blocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

function column(discover = {}, extra = {}) {
  const card = makeCard({
    _config: { discover: { categoriesCount: 3, ...discover },
      categories: ['trending', 'popular', 'upcoming', 'tvUpcoming'].map(id => ({ id, enabled: true })) },
    ...extra,
  });
  card._renderSearch = () => '<div class="sec-card sec-search"></div>';
  for (const [m, id] of [['_renderTrending', 'trending'], ['_renderPopular', 'popular'], ['_renderUpcoming', 'upcoming'], ['_renderTvUpcoming', 'tvUpcoming']])
    card[m] = () => `<div class="sec-card" data-cat="${id}"></div>`;
  card._renderSectionOverlay = () => '<div class="sec-overlay"></div>';
  card._renderSectionOverlayNav = () => '';
  return card;
}
const cats = html => [...parse(html).querySelectorAll('[data-cat]')].map(e => e.dataset.cat);
const hasSearch = html => !!parse(html).querySelector('.sec-search');

test('by default the search bar opens the column and takes one slot', () => {
  const html = column()._renderRight();
  assert.ok(hasSearch(html));
  assert.deepEqual(cats(html), ['trending', 'popular']);
});

test('switched off, there is no search bar and its slot goes to a category', () => {
  const html = column({ showSearch: false })._renderRight();
  assert.ok(!hasSearch(html));
  assert.deepEqual(cats(html), ['trending', 'popular', 'upcoming']);
});

test('switched off, the next page carries on where this one ended', () => {
  const html = column({ showSearch: false }, { _rightPage: 1 })._renderRight();
  assert.deepEqual(cats(html), ['tvUpcoming']);
});

test('switched off, an open See More overlay has no search bar above it either', () => {
  const html = column({ showSearch: false }, { _overlay: { section: 'trending' } })._renderRight();
  assert.ok(!hasSearch(html));
  assert.ok(parse(html).querySelector('.sec-overlay'));
});
