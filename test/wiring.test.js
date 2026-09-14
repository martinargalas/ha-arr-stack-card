// Wiring the right column is safe to repeat, and every path that draws the
// column wires all of it. Before this, a second wiring over the same elements
// gave them a second listener: one click approved a request twice, and the
// statistics posters opened their modal once per repaint since the page loaded.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
function setup(rightHtml = '', leftHtml = '') {
  const host = document.createElement('div');
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<div id="col-left">${leftHtml}</div><div id="col-right">${rightHtml}</div><div id="popup-root"></div>`;
  return { sr, right: sr.getElementById('col-right'), card: makeCard({ shadowRoot: sr }) };
}

test('approving a request sends it once, however often the card repainted', async () => {
  const { sr, card } = setup('', '<button class="pr-approve" data-reqid="42">OK</button><button class="pr-decline" data-reqid="43">No</button>');
  let approve = 0, decline = 0;
  card._approvePendingRequest = async () => { approve++; };
  card._declinePendingRequest = async () => { decline++; };
  card._wireOverseerrButtons();
  card._wireOverseerrButtons();
  card._wireOverseerrButtons();
  click(sr.querySelector('.pr-approve'));
  click(sr.querySelector('.pr-decline'));
  assert.strictEqual(approve, 1);
  assert.strictEqual(decline, 1);
});

test('a statistics poster opens its modal once after several paints', () => {
  const posters = [['_wireTautulliPosters', 'data-tl-open', '_openTautulliModal'], ['_wireJellystatPosters', 'data-js-open', '_openJellystatModal'],
    ['_wireTracearrPosters', 'data-tra-open', '_openTracearrModal'], ['_wireActivityPosters', 'data-act-open', '_openActivityModal'],
    ['_wireProwlarrPosters', 'data-pw-open', '_openProwlarrModal'], ['_wireMaintainerrPosters', 'data-mt-open', '_openMaintainerrModal'],
    ['_wireLibraryTiles', 'data-lib-open', '_openLibModal']];
  for (const [fn, attr, open] of posters) {
    const { right, card } = setup();
    let n = 0;
    card[open] = () => { n++; };
    card[fn](right); card[fn](right); card[fn](right);
    right.innerHTML = `<div ${attr}="x">poster</div>`;
    click(right.firstElementChild);
    assert.strictEqual(n, 1, fn);
  }
});

test('measuring with See More open does not wire its cards a second time', () => {
  const { right, card } = setup('<div class="mc" data-popup="movie" data-tmdbid="1" data-title="t">card</div>');
  let opens = 0;
  card._openPopup = () => { opens++; };
  card._wirePopup();
  card._overlay = { section: 'recentlyAdded' };
  card._rightMaxH = 500;
  card._measureAndLockHeight();
  click(right.firstElementChild);
  assert.strictEqual(opens, 1);
});

test('wiring the whole column twice doubles nothing', () => {
  const { right, card } = setup('<div data-tl-open="x">p</div><div class="mc" data-popup="movie" data-tmdbid="1" data-title="t">c</div>',
    '<button class="pr-approve" data-reqid="9">OK</button>');
  let tl = 0, pop = 0, ok = 0;
  card._openTautulliModal = () => { tl++; };
  card._openPopup = () => { pop++; };
  card._approvePendingRequest = async () => { ok++; };
  card._wireRight(right);
  card._wireRight(right);
  click(right.querySelector('[data-tl-open]'));
  click(right.querySelector('.mc'));
  click(card.shadowRoot.querySelector('.pr-approve'));
  assert.deepStrictEqual({ tl, pop, ok }, { tl: 1, pop: 1, ok: 1 });
});

test('every path that draws the right column wires it through _wireRight', () => {
  const proto = Object.getPrototypeOf(makeCard());
  for (const fn of ['_render', '_reRenderRight', '_reRenderSection', '_swapRightKeepNav', '_measureAndLockHeight']) {
    assert.match(proto[fn].toString(), /this\._wireRight\(/, `${fn} does not call _wireRight`);
  }
});
