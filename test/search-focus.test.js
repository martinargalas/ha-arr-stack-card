// The main search keeps its caret through every redraw of the column — the
// first letter, the last one deleted, the clear button, a background refresh —
// until something else is clicked, as the search in Similar titles does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

function column(extra = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div id="col-right"></div>';
  const card = makeCard({ shadowRoot: root, ...extra });
  card._renderRight = () => `<div class="sec-search"><input class="search-bar-input" value="${card._searchQuery || ''}"></div><button id="elsewhere"></button>`;
  // makeCard stubs the redraw out; this is the redraw under test
  card._reRenderRight = Object.getPrototypeOf(card)._reRenderRight;
  for (const m of ['_wireRight', '_syncSecHeights', '_trimActivityCards', '_measureAndLockHeight', '_checkBadgeOverflow']) card[m] = () => {};
  card._measureSearchMaxHeight = () => 0;
  card._reRenderRight(true);
  return { card, root };
}

test('deleting the last letter leaves the caret in the field', () => {
  const { card, root } = column({ _searchQuery: 'ra', _searchActive: true });
  const input = root.querySelector('.search-bar-input');
  input.focus();
  input.value = '';
  card._searchQuery = '';
  card._searchActive = false;
  card._reRenderRight(true);
  const fresh = root.querySelector('.search-bar-input');
  assert.notEqual(fresh, input, 'the field was redrawn');
  assert.equal(root.activeElement, fresh);
});

test('the clear button leaves the caret in the field too', () => {
  const { card, root } = column({ _searchQuery: 'rambo', _searchActive: true });
  root.getElementById('elsewhere').focus();
  card._searchKeepFocus = true;
  card._searchActive = false;
  card._reRenderRight(true);
  assert.equal(root.activeElement, root.querySelector('.search-bar-input'));
});

test('with something else focused, a redraw does not take the caret to the search', () => {
  const { card, root } = column();
  root.getElementById('elsewhere').focus();
  card._reRenderRight(true);
  assert.notEqual(root.activeElement?.className, 'search-bar-input');
});
