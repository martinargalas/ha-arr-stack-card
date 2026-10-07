// Every select in the card opens the card's own list: the system's is never
// shown, a pick sets the select and fires the change a native pick would, and
// a scroll that starts on a select still scrolls.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup(selectHtml) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<div class="popup-glass">${selectHtml}</div>`;
  const card = makeCard({ shadowRoot: sr });
  card._ddInit();
  const sel = sr.querySelector('select');
  const changes = [];
  sr.querySelector('.popup-glass').addEventListener('change', e => changes.push(e.target.value));
  const opts = () => [...sr.querySelectorAll('[data-arr-dd] .arr-dd-opt')];
  return { host, sr, card, sel, changes, opts };
}

const SORT = `<select id="sim-sort"><option value="rel" selected>Most similar</option><option value="rating">Highest rated</option><option value="year">Newest</option></select>`;

test('a click opens the card\'s list instead of the system\'s, with the current one marked', () => {
  const { host, sr, sel, opts } = setup(SORT);
  const down = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
  sel.dispatchEvent(down);
  assert.ok(down.defaultPrevented, 'the system list is held back');
  assert.ok(sr.querySelector('[data-arr-dd]'));
  assert.deepEqual(opts().map(b => b.textContent.trim()), ['Most similar', 'Highest rated', 'Newest']);
  assert.ok(opts()[0].classList.contains('is-sel'));
  host.remove();
});

test('a pick sets the select and fires its change; picking the same one fires nothing', () => {
  const { host, sr, sel, changes, opts } = setup(SORT);
  sel.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
  opts()[2].click();
  assert.equal(sel.value, 'year');
  assert.deepEqual(changes, ['year']);
  assert.equal(sr.querySelector('[data-arr-dd]'), null, 'the list closes');
  sel.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
  opts()[2].click();
  assert.deepEqual(changes, ['year']);
  host.remove();
});

test('a tap opens it; a scroll that starts on the select does not', () => {
  const { host, sr, sel } = setup(SORT);
  const touch = (type, x, y) => {
    const e = new window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, type === 'touchstart' ? 'touches' : 'changedTouches', { value: [{ clientX: x, clientY: y }] });
    sel.dispatchEvent(e);
    return e;
  };
  touch('touchstart', 10, 10);
  touch('touchend', 10, 120);
  assert.equal(sr.querySelector('[data-arr-dd]'), null, 'a scroll');
  touch('touchstart', 10, 10);
  const end = touch('touchend', 12, 11);
  assert.ok(end.defaultPrevented);
  assert.ok(sr.querySelector('[data-arr-dd]'), 'a tap');
  host.remove();
});

test('the prompt is not a choice, groups are headed, a long list can be filtered', () => {
  const many = Array.from({ length: 20 }, (_, i) => `<option value="${i}">Film ${i}</option>`).join('');
  const { host, sr, sel, opts } = setup(`<select><option value="" disabled hidden selected>Pick a film</option>
    <optgroup label="Library">${many}</optgroup></select>`);
  sel.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
  assert.equal(opts().length, 20);
  assert.equal(sr.querySelector('.arr-dd-group').textContent, 'Library');
  const find = sr.querySelector('.arr-dd-find');
  assert.ok(find);
  find.value = 'film 1';
  find.dispatchEvent(new window.Event('input'));
  assert.equal(opts().filter(b => !b.hidden).length, 11);   // 1, 10–19
  host.remove();
});

test('the list stays inside its window and scrolls only when it does not fit', () => {
  const card = makeCard();
  const bounds = { left: 100, top: 50, right: 500, bottom: 450 };
  const anchor = { getBoundingClientRect: () => ({ left: 420, top: 100, bottom: 130, width: 80 }) };
  const place = need => {
    const panel = { style: {}, scrollHeight: need };
    card._ddPlace(panel, anchor, bounds);
    return panel.style;
  };
  let st = place(150);
  assert.equal(st.overflowY, 'hidden', 'fits: no scrollbar');
  assert.equal(st.maxHeight, undefined);
  assert.ok(parseFloat(st.left) + parseFloat(st.width) <= bounds.right - 8, 'not past the window\'s right edge');
  st = place(900);
  assert.equal(st.overflowY, 'auto');
  assert.ok(parseFloat(st.maxHeight) <= bounds.bottom - 130 - 6 - 8, 'no taller than the room under it');
});
