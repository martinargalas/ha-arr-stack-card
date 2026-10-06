// The order a download queue was sorted in is remembered on the device, per
// client, and is what the queue opens in next time.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';
import { savedDlSort, saveDlSort } from '../src/shared/ui.js';

test('a queue never sorted opens progress first', () => {
  localStorage.removeItem('arr-dl-sort');
  assert.equal(savedDlSort('qbit'), 'progress_desc');
});

test('each client keeps its own order', () => {
  localStorage.removeItem('arr-dl-sort');
  saveDlSort('qbit', 'added_desc');
  saveDlSort('deluge', 'speed_asc');
  assert.equal(savedDlSort('qbit'), 'added_desc');
  assert.equal(savedDlSort('deluge'), 'speed_asc');
  assert.equal(savedDlSort('transmission'), 'progress_desc');
});

test('a stored value the buttons cannot produce is ignored', () => {
  localStorage.setItem('arr-dl-sort', JSON.stringify({ qbit: 'name_asc' }));
  assert.equal(savedDlSort('qbit'), 'progress_desc');
  localStorage.setItem('arr-dl-sort', 'not json');
  assert.equal(savedDlSort('qbit'), 'progress_desc');
});

test('a sort button remembers what it picked, for its own client', () => {
  localStorage.removeItem('arr-dl-sort');
  const handlers = [];
  const btn = (sort, client) => ({ dataset: { sort, ...(client ? { client } : {}) }, addEventListener: (_, fn) => handlers.push(fn) });
  const card = makeCard({ _pages: { qbit: 3, deluge: 2 }, _sort: 'progress_desc', _sortDeluge: 'progress_desc' });
  Object.defineProperty(card, 'shadowRoot', { value: { querySelectorAll: () => [btn('speed_desc'), btn('added_asc', 'deluge')] } });
  card._wireSort();
  handlers.forEach(fn => fn());
  assert.equal(card._sort, 'speed_desc');
  assert.equal(card._sortDeluge, 'added_asc');
  assert.equal(card._pages.qbit, 0);
  assert.equal(savedDlSort('qbit'), 'speed_desc');
  assert.equal(savedDlSort('deluge'), 'added_asc');
});
