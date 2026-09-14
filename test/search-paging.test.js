// The main search: while it runs the column holds nothing else, and its
// results page by the chevrons beside the grid, like every category.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard, artist } from './harness.js';

const results = n => Array.from({ length: n }, (_, i) => ({
  mediaType: 'music', title: `Artist ${i}`, id: null,
  artist: artist({ id: null, artistName: `Artist ${i}`, foreignArtistId: `mbid-${i}`, images: [] }),
}));

test('several pages of results get working chevrons', () => {
  const card = makeCard({ _searchResults: results(20), _searchPage: 0 });
  const html = card._renderSearchResultsGrid();
  assert.match(html, /data-search-dir="prev" disabled/, 'back is off on the first page');
  assert.match(html, /data-search-dir="next">/, 'forward is on');
});

test('on the last page forward is off', () => {
  const card = makeCard({ _searchResults: results(20), _searchPage: 2 });
  const html = card._renderSearchResultsGrid();
  assert.match(html, /data-search-dir="next" disabled/);
  assert.match(html, /data-search-dir="prev">/);
});

test('one page of results keeps the chevrons as spacers only', () => {
  const card = makeCard({ _searchResults: results(3), _searchPage: 0 });
  const html = card._renderSearchResultsGrid();
  assert.ok(!html.includes('data-search-dir'));
  assert.match(html, /pg-btn pg-btn-ph/);
});

test('while searching the column is the search alone, with no bottom pager', () => {
  const card = makeCard({ _searchResults: results(20), _searchActive: true, _searchQuery: 'mot' });
  const html = card._renderRight();
  assert.match(html, /sec-search/);
  assert.ok(!/rp-nav|rp-btn|rp-dot/.test(html), 'no category pager');
  assert.strictEqual((html.match(/class="sec-card/g) || []).length, 1, 'no other category');
});

test('artwork arriving for the library redraws the search results', () => {
  const card = makeCard({ _searchActive: true });
  let redrawn = 0;
  card._reRenderSearchResults = () => { redrawn++; };
  card._lidarrRepaint();
  assert.strictEqual(redrawn, 1);
});

test('with no search running the results are left alone', () => {
  const card = makeCard({ _searchActive: false });
  let redrawn = 0;
  card._reRenderSearchResults = () => { redrawn++; };
  card._lidarrRepaint();
  assert.strictEqual(redrawn, 0);
});
