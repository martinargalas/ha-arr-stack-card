// The right column on a phone (#48, discover.mobileLayout): pages as on a
// tablet, every category as a shelf swiped sideways, or a list of titles that
// open one at a time, on a phone or a tablet. Wider screens always page.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, setTouch, setViewport } from './harness.js';
import { SHELF_MAX } from '../src/render/sections.js';

afterEach(() => { setViewport(1400); setTouch(false); });

const IDS = ['trending', 'popular', 'upcoming', 'tvUpcoming'];

function column(mobileLayout, extra = {}, tabletLayout) {
  const card = makeCard({
    _config: { discover: { categoriesCount: 3, mobileLayout, tabletLayout },
      categories: IDS.map(id => ({ id, enabled: true })) },
    ...extra,
  });
  card._renderSearch = () => '<div class="sec-card sec-search"></div>';
  for (const [m, id] of [['_renderTrending', 'trending'], ['_renderPopular', 'popular'], ['_renderUpcoming', 'upcoming'], ['_renderTvUpcoming', 'tvUpcoming']])
    card[m] = () => `<div class="sec-card" data-cat="${id}"><div class="col-hdr"><span class="col-hdr-title">${id}</span></div></div>`;
  return card;
}
const cats = doc => [...doc.querySelectorAll('[data-cat]')].map(e => e.dataset.cat);

test('shelves on a phone: every category on one page, no pager', () => {
  setViewport(390);
  const doc = parse(column('shelves')._renderRight());
  assert.deepEqual(cats(doc), IDS);
  assert.ok(doc.querySelector('.rp-sections.mob-shelves'));
  assert.ok(!doc.querySelector('.rp-btn'), 'nothing to page');
});

test('the list on a phone: one tile a category, the chosen one opened over the screen', () => {
  setViewport(390);
  const doc = parse(column('list', { _mobSheet: 'popular' })._renderRight());
  assert.deepEqual([...doc.querySelectorAll('[data-mob-open]')].map(e => e.dataset.mobOpen), IDS);
  assert.deepEqual(cats(doc), ['popular'], 'only the opened category is drawn whole');
  assert.ok(doc.querySelector('.to-sheet.mob-sheet [data-mob-sheet-close]'));
});

test('a tablet has a choice of its own; a wider screen pages whatever is set', () => {
  setViewport(768);
  assert.ok(!parse(column('shelves')._renderRight()).querySelector('.mob-shelves'), "the phone's choice is the phone's");
  assert.ok(parse(column('pages', {}, 'shelves')._renderRight()).querySelector('.rp-sections.mob-shelves'));
  setViewport(1000);
  const doc = parse(column('shelves', {}, 'shelves')._renderRight());
  assert.equal(cats(doc).length, 2, 'search and two categories a page');
  assert.ok(!doc.querySelector('.mob-shelves'));
});

test('See More on a tablet is the full-screen sheet only beside shelves or the list', () => {
  setViewport(768);
  const card = column('pages', {}, 'list');
  assert.equal(card._secSheet, true);
  assert.equal(column('pages')._secSheet, false);
});

test('a shelf holds the whole row, and its last place opens See More', () => {
  setViewport(390);
  const items = Array.from({ length: 40 }, (_, i) => ({ id: i + 1 }));
  const card = makeCard({ _config: { discover: { mobileLayout: 'shelves' } }, _trending: items });
  const doc = parse(card._pagedGridWithSmp(items, 'trending', m => `<div class="mc" data-id="${m.id}"></div>`));
  assert.ok(doc.querySelector('.mgrid.shelf'));
  assert.equal(doc.querySelectorAll('.mc[data-id]').length, SHELF_MAX - 1);
  assert.ok(doc.querySelector('.smp-card'));
  assert.ok(!doc.querySelector('.pg-btn'), 'no paging arrows');
  assert.equal(card._pageIndicator('trending', items), '', 'no page count either');
});

test('a touch screen is a tablet up to a narrow desktop, columns side by side or not', () => {
  setViewport(1280);
  assert.ok(!parse(column('pages', {}, 'list')._renderRight()).querySelector('.mob-list'), 'a mouse pages');
  setTouch(true);
  assert.ok(parse(column('pages', {}, 'list')._renderRight()).querySelector('.mob-list'), 'a Nest Hub takes the tablet choice');
  setViewport(1600);
  assert.ok(!parse(column('pages', {}, 'list')._renderRight()).querySelector('.mob-list'), 'a big touch screen pages');
});
