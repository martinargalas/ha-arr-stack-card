// The calendar repaints only what changed: it was rebuilt whole when it opened,
// again when its data came and at every refresh of the card, and a phone showed
// each rebuild as a blink. A week seen before shows at once.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function open(overrides = {}) {
  const host = document.createElement('div');
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = '<div id="cal-modal-root"></div>';
  const card = makeCard({ shadowRoot: sr, ...overrides });
  card._calendarModalOpen = true;
  card._calendarModalData = [];
  card._renderCalendarModalEl();
  return { card, root: sr.getElementById('cal-modal-root') };
}

test('a repaint keeps the glass', () => {
  const { card, root } = open();
  const glass = root.querySelector('#cal-glass');
  card._calendarModalLoading = true;
  card._renderCalendarModalEl();
  assert.ok(root.querySelector('.action-spinner'), 'the spinner comes in');
  card._calendarModalLoading = false;
  card._renderCalendarModalEl();
  assert.equal(root.querySelector('#cal-glass'), glass, 'the same glass throughout');
});

test('a kept glass is not wired twice', () => {
  const { card, root } = open();
  card._renderCalendarModalEl();
  card._renderCalendarModalEl();
  let renders = 0;
  const orig = card._renderCalendarModalEl.bind(card);
  card._renderCalendarModalEl = () => { renders++; orig(); };
  root.querySelector('[data-cal-action="close"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(renders, 1, 'one press, one repaint');
  assert.equal(root.querySelector('#cal-glass'), null, 'closed');
});

test('a week seen before shows at once, with no spinner', async () => {
  let calls = 0;
  const { card, root } = open({ _callApi: async () => { calls++; return []; } });
  const start = new Date(2026, 10, 2), end = new Date(2026, 10, 8, 23, 59);
  await card._fetchCalendarRange(start, end);
  const before = calls;
  const p = card._fetchCalendarRange(start, end);
  assert.equal(card._calendarModalLoading, false, 'no spinner for a week already seen');
  assert.equal(root.querySelector('.action-spinner'), null);
  await p;
  assert.ok(calls > before, 'and it is still brought up to date');
});
