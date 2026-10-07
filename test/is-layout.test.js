// Interactive Search on a phone and a tablet: compact cards, the indexer under
// the name, filters folded under one button, the whole name a tap away, and an
// age that reads like one.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard, setViewport } from './harness.js';

const rel = (over = {}) => ({
  guid: 'g1', title: 'Late.Fame.2026.1080p.HC.HDRip.X264.AC3-EVO[EtHD]', indexer: 'Movie Tracker (Prowlarr)',
  protocol: 'torrent', seeders: 0, leechers: 1, size: 5e9, age: 3217, ageHours: 3217 * 24,
  quality: { quality: { name: 'HDTV-1080p' } }, languages: [{ name: 'English' }], customFormatScore: 1000,
  approved: false, rejections: ['Hardcode subs found: Generic Hardcoded Subs', 'Not enough seeders: 0'],
  ...over,
});

test('the age is in the largest unit that reads well', () => {
  const c = makeCard();
  c._lg = () => 'en';
  assert.equal(c._isAge({ ageHours: 5 }), '5h');
  assert.equal(c._isAge({ ageHours: 209 * 24, age: 209 }), '7m');
  assert.equal(c._isAge({ ageHours: 30 * 24, age: 30 }), '30d');
  assert.equal(c._isAge({ ageHours: 3217 * 24, age: 3217 }), '8.8y');
});

test('a phone card has no rejection text, only a ⚠ that opens the sheet', () => {
  const c = makeCard();
  const html = c._isCards([rel()], () => '<button class="is-grab-btn"></button>');
  assert.doesNotMatch(html, /is-ic-rej/);
  assert.match(html, /class="is-rej-ico"[^>]*data-is-info/);
  assert.match(html, /class="is-ic-title" data-is-info data-full="Late\.Fame/);
  assert.match(html, /data-rej="Hardcode subs found: Generic Hardcoded Subs\nNot enough seeders: 0"/);
});

test('a narrow table puts the indexer under the name; a wide one keeps its column', () => {
  const c = makeCard();
  const opts = { sortAttr: 'issort', sort: null, grab: () => '' };
  setViewport(768);
  let html = c._isTable([rel()], opts);
  assert.doesNotMatch(html, /data-issort="indexer"/);
  assert.match(html, /is-rel-2l/);
  assert.match(html, /is-rel-age">Movie Tracker \(Prowlarr\) · /);
  assert.doesNotMatch(html, /is-rej-row/);
  setViewport(1400);
  html = c._isTable([rel()], opts);
  assert.match(html, /data-issort="indexer"/);
  assert.match(html, /is-rej-row/);
});

test('a phone folds the filters under one button that counts what is on', () => {
  const c = makeCard();
  setViewport(375);
  let bar = c._isFilterBar('<select></select>', 2);
  assert.match(bar.hdr, /data-is-filters/);
  assert.match(bar.hdr, / · 2/);
  assert.equal(bar.below, '');
  c._isFiltersOpen = true;
  bar = c._isFilterBar('<select></select>', 0);
  assert.match(bar.below, /is-filter-wrap/);
  setViewport(1400);
  bar = c._isFilterBar('<select></select>', 0);
  assert.match(bar.hdr, /class="is-filter"/);
  assert.equal(bar.below, '');
});

test('a tap on a name opens the whole of it, past the glass that stops clicks', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const sr = host.attachShadow({ mode: 'open' });
  const c = makeCard({ shadowRoot: sr });
  c._isWireSheet();
  sr.innerHTML = `<div class="popup-glass">${c._isCards([rel()], () => '')}</div>`;
  sr.querySelector('.popup-glass').addEventListener('click', e => e.stopPropagation());
  sr.querySelector('.is-ic-title').click();
  const sheet = sr.querySelector('[data-is-sheet]');
  assert.ok(sheet);
  assert.equal(sheet.querySelector('.is-sheet-title').textContent, rel().title);
  assert.equal(sheet.querySelectorAll('.is-sheet-rej li').length, 2);
  sheet.querySelector('.popup-close').click();
  assert.equal(sr.querySelector('[data-is-sheet]'), null);
  host.remove();
  setViewport(1400);
});

test('the detail is always narrow, so its table is compact on any screen', () => {
  const c = makeCard();
  setViewport(1280);
  const html = c._isTable([rel()], { sortAttr: 'issort', sort: null, grab: () => '', compact: true });
  assert.doesNotMatch(html, /data-issort="indexer"/);
  assert.doesNotMatch(html, /is-rej-row/);
  setViewport(1400);
});
