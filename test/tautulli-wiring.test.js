// Tautulli's modal body is wired again after every partial refresh. What it
// binds must survive that: one click, one step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

// A detail view's "recently played" row: four pages side by side, a chevron
// either side. Scrolls are recorded instead of animated.
function recRow(prefix) {
  const body = document.createElement('div');
  body.innerHTML = `<button class="tl-${prefix}-rec-prev"></button>
    <div id="tl-${prefix}-rec-scroll"><div></div><div></div><div></div><div></div></div>
    <button class="tl-${prefix}-rec-next"></button>`;
  document.body.appendChild(body);
  const scroll = body.querySelector(`#tl-${prefix}-rec-scroll`);
  Object.defineProperty(scroll, 'offsetWidth', { value: 100 });
  const lefts = [];
  scroll.scrollTo = o => lefts.push(o.left);
  return { body, lefts, next: body.querySelector(`.tl-${prefix}-rec-next`), done: () => body.remove() };
}

for (const [prefix, what] of [['ud', 'user'], ['ld', 'library']]) {
  test(`the ${what} detail's recently played row keeps its place across a refresh`, () => {
    const card = makeCard({ _tautulliModal: {} });
    card._syncNavInd = () => {};
    card._wireGraphControls = () => {};
    card._wireChartCards = () => {};
    const { body, lefts, next, done } = recRow(prefix);
    card._wireTautulliModalBody(body);
    next.click(); next.click();                 // on the third page
    card._wireTautulliModalBody(body);          // a partial refresh wires the body again
    lefts.length = 0;
    next.click();
    assert.deepEqual(lefts, [300], 'one step on from the third page, not back to the second');
    done();
  });
}
