// See More carries the row's type filter: the same items as the row, and a new
// filter starts it again from its first page.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const requested = [
  { id: 1, title: 'A film', _mediaType: 'movie' },
  { id: 2, title: 'A show', _mediaType: 'tv' },
  { id: 3, title: 'An artist', _mediaType: 'music' },
];

test('See More in Recently Requested shows what the filter leaves', () => {
  const card = makeCard({ recentlyRequested: requested });
  const items = () => card._getSectionOverlayConfig('recentlyRequested').getItems().map(m => m.id);
  card._rqType = 'music';
  assert.deepStrictEqual(items(), [3]);
  card._rqType = 'video';
  assert.deepStrictEqual(items(), [1, 2]);
  card._rqType = 'all';
  assert.deepStrictEqual(items(), [1, 2, 3]);
});

test('without Lidarr the filter has nothing to narrow', () => {
  const card = makeCard({ recentlyRequested: requested, _lidarrConfigured: false });
  card._rqType = 'music';
  assert.deepStrictEqual(card._rqItems().map(m => m.id), [1, 2, 3]);
});

test('a new filter sends an open See More back to its first page', () => {
  const card = makeCard({ recentlyRequested: requested });
  card._overlay = { section: 'recentlyRequested', page: 3 };
  card._pages = { recentlyRequested: 2 };
  card._rqType = 'all';
  const btn = document.createElement('button');
  card._applyTypeSeg(btn, { v: 'music', cur: '_rqType', prev: '_rqSegPrev', anim: '_rqSegAnim', ls: 'arr-rq-type', sec: 'recentlyRequested' });
  assert.strictEqual(card._rqType, 'music');
  assert.strictEqual(card._overlay.page, 0);
  assert.strictEqual(card._pages.recentlyRequested, 0);
});
