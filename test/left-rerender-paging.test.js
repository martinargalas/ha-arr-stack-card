// Repainting the left column (a torrent's controls, its detail) must not
// leave the right column's pager dead: its wiring dropped every paging
// listener on the card and put back only the left column's.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

test('after the left column repaints, the right pager still turns pages', () => {
  const host = document.createElement('div');
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<div id="col-left"></div><div id="col-right"><div class="rp-nav">
    <button class="rp-btn" data-section="right" data-dir="prev" disabled></button>
    <button class="rp-dot" data-page="0"></button><button class="rp-dot" data-page="1"></button>
    <button class="rp-btn" data-section="right" data-dir="next"></button></div></div>`;
  const card = makeCard({ shadowRoot: sr });
  card._rightPage = 0;
  card._rightTotalPages = 2;
  const turned = [];
  card._swapRightKeepNav = () => turned.push(card._rightPage);
  card._captureScrollState = () => null;
  card._wireStickyNav = () => {};
  card._renderLeft = () => '<div class="dl-list">torrents</div>';
  card._mobMinWrap = (_, html) => html;
  card._wireSort = () => {};
  card._wireActionButtons = () => {};
  card._wireMinimize = () => {};
  card._wirePageButtons();
  card._reRenderLeft();
  sr.querySelector('.rp-btn[data-dir="next"]').click();
  assert.deepEqual(turned, [1], 'the arrow still works');
  sr.querySelectorAll('.rp-dot')[0].click();
  assert.deepEqual(turned, [1, 0], 'and so do the dots');
});
