// The header filter and the pieces around it: what it renders, whether it says
// it is set, and that See More shows the same control the row does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, setViewport } from './harness.js';

test('the peanut marks the chosen half and offers all three', () => {
  const card = makeCard({ _raType: 'music' });
  const el = parse(card._raFilterHtml());
  const seg = el.querySelector('.mt-seg');
  assert.ok(seg, 'no peanut rendered');
  assert.equal(seg.querySelectorAll('[data-ra-type]').length, 3);
  assert.equal(seg.dataset.segTo, '2', 'music is the third half');
});

test('a narrowed row says so on its funnel', () => {
  assert.ok(parse(makeCard({ _raType: 'music' })._raFilterHtml()).querySelector('.hdr-filter.is-set'));
  assert.equal(parse(makeCard({ _raType: 'all' })._raFilterHtml()).querySelector('.hdr-filter.is-set'), null);
});

test('the filter is left out when there is no music to filter for', () => {
  assert.equal(makeCard({ _lidarrConfigured: false })._raFilterHtml(), '');
  assert.equal(makeCard({ _lastfmConfigured: false })._recFilterHtml(), '', 'no Last.fm, nothing to separate');
});

test('See More draws the row’s own filter and marks', () => {
  const card = makeCard({ _recType: 'video' });
  assert.notEqual(card._secFilterHtml('recommendations'), '', 'overlay lost the filter');
  assert.notEqual(card._secFilterHtml('recentlyAdded'), '');
  assert.notEqual(card._secFilterHtml('recentlyRequested'), '');
  assert.equal(card._secFilterHtml('trending'), '', 'a row without one gets none');

  // Recommendations wears one mark per source it draws on
  const icons = parse(card._secHeaderIcons('recommendations'));
  assert.ok(icons.textContent.length + icons.querySelectorAll('img,svg').length > 0);
});

test('a variable-width peanut carries the measurements the indicator follows', () => {
  const card = makeCard();
  const seg = parse(card._raFilterHtml()).querySelector('.mt-seg');
  assert.ok(seg.classList.contains('mt-seg--var'));
  assert.ok(seg.classList.contains('mt-seg--presync'), 'must not animate into its measured size');
  assert.match(seg.getAttribute('style'), /--w0:\s*38px/);
});

test('the week range keeps the year on a desktop and drops it on a phone', () => {
  const card = makeCard();
  const start = new Date(2026, 7, 31), end = new Date(2026, 8, 6);
  setViewport(1400);
  assert.match(card._fmtWeekRange(start, end), /2026/);
  setViewport(400);
  assert.doesNotMatch(card._fmtWeekRange(start, end), /2026/, 'the year pushed the close button off screen');
  setViewport(1400);
});

test('file quality reads as resolution and source', () => {
  const card = makeCard();
  const m = { hasFile: true, movieFile: { quality: { quality: { name: 'Bluray-1080p', resolution: 1080 } } } };
  assert.equal(card._qualityLabel(m, true), '1080p · BluRay');
});
