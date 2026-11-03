// A phone scrolls instead of paging (#48): the search results and Radarr's
// Interactive Search are one list, read downwards. Wider screens keep pages.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, setViewport } from './harness.js';
import { SHEET_BATCH } from '../src/render/sections.js';

afterEach(() => setViewport(1400));

function searching(n) {
  return makeCard({
    _searchActive: true,
    _searchResults: Array.from({ length: n }, (_, i) => ({ id: i + 1, mediaType: 'movie', title: `T${i}` })),
  });
}

test('search on a phone: a batch three a row, a footer for more, no chevrons', () => {
  setViewport(390);
  const doc = parse(searching(60)._renderSearchResultsGrid());
  assert.ok(doc.querySelector('.mgrid.search-scroll'));
  assert.equal(doc.querySelectorAll('.mc').length, SHEET_BATCH);
  assert.ok(doc.querySelector('[data-search-more]'));
  assert.ok(!doc.querySelector('.pg-btn'));
});

test('search on a phone ends without a footer once everything is shown', () => {
  setViewport(390);
  const card = searching(30);
  card._searchShown = 48;
  const doc = parse(card._renderSearchResultsGrid());
  assert.equal(doc.querySelectorAll('.mc').length, 30);
  assert.ok(!doc.querySelector('[data-search-more]'));
});

test('search on a tablet still pages', () => {
  setViewport(768);
  const doc = parse(searching(60)._renderSearchResultsGrid());
  assert.ok(doc.querySelector('.pg-btn[data-search-dir="next"]'));
  assert.ok(!doc.querySelector('[data-search-more]'));
});

function releases(n) {
  return makeCard({
    _isState: 'results',
    _isResults: Array.from({ length: n }, (_, i) => ({
      guid: `g${i}`, title: `Rel.${i}.1080p`, indexer: 'X', protocol: 'torrent',
      quality: { quality: { name: 'Bluray-1080p' } }, size: 1e9, seeders: i, languages: [],
    })),
    _isFilters: {}, _isPerPage: 4, _isPage: 0, _isGrabbed: new Set(), _isHistory: {},
  });
}

test('Interactive Search on a phone lists every release and has no pager', () => {
  setViewport(390);
  const doc = parse(releases(40)._renderIsPanel());
  assert.equal(doc.querySelectorAll('.is-card').length, 40);
  assert.ok(doc.querySelector('.is-results-wrap.is-scroll'));
  assert.ok(!doc.querySelector('[data-is-page]'));
});

test('Interactive Search on a tablet keeps its pages', () => {
  setViewport(768);
  const doc = parse(releases(40)._renderIsPanel());
  assert.ok(!doc.querySelector('.is-scroll'));
  assert.ok(doc.querySelector('[data-is-page]'));
});

test('posters a row on a phone follow discover.mobileColumns, three unless two is asked for', () => {
  assert.equal(makeCard({ _config: { discover: {} } })._mobCols, 3);
  assert.equal(makeCard({ _config: { discover: { mobileColumns: '2' } } })._mobCols, 2);
  assert.equal(makeCard({ _config: { discover: { mobileColumns: 5 } } })._mobCols, 3);
});

test('a tablet counts its own posters a row, or fits them to its width', () => {
  assert.equal(makeCard({ _config: { discover: {} } })._tabCols, 0);
  assert.equal(makeCard({ _config: { discover: { tabletColumns: '5' } } })._tabCols, 5);
  assert.equal(makeCard({ _config: { discover: { tabletColumns: 1 } } })._tabCols, 0);
});
