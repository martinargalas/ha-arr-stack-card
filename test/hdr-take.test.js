// On a phone, a window of the card's in a pop-up with a header of the card's
// own (arr-stack-search, header: true) hands its controls up to that header;
// a press there reaches the window's own controls, and the header's close
// steps back out of the window instead of closing the pop-up.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard, setViewport } from './harness.js';

const fakeBar = (cfg = { header: true }) => ({
  _config: cfg, taken: undefined,
  _take(html) { this.taken = html; },
  getBoundingClientRect: () => ({ top: 0, bottom: 72, height: 56 }),
});

function setup(bar = fakeBar()) {
  const host = document.body.appendChild(document.createElement('div'));
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<div id="col-right" class="col">
    <div class="trending-overlay to-sheet">
      <div class="col-hdr to-sheet-hdr has-filter">
        <div class="sh-side"><div class="hdr-filter"><button data-ra-type="music"><svg><path d=""/></svg></button></div></div>
        <span class="col-hdr-title">Recently Added</span>
        <div class="sh-side sh-end"><button class="popup-close sheet-x" data-action="overlay-close">x</button></div>
      </div>
      <div class="to-sheet-body"></div>
    </div></div>`;
  const card = makeCard({ shadowRoot: sr, _searchExt: bar });
  return { card, sr, bar };
}

test('a phone: the window hands its controls to the header', () => {
  setViewport(400);
  try {
    const { card, bar } = setup();
    card._hdrTakeSync();
    assert.match(bar.taken, /data-ra-type="music"/);
    assert.doesNotMatch(bar.taken, /sheet-x/, 'not its close — the header has its own');
  } finally { setViewport(1400); }
});

test('a tablet, or a header that is only a field, takes nothing', () => {
  setViewport(800);
  try {
    const { card, bar } = setup();
    card._hdrTakeSync();
    assert.equal(bar.taken, undefined);
  } finally { setViewport(1400); }
  setViewport(400);
  try {
    const { card, bar } = setup(fakeBar({}));
    card._hdrTakeSync();
    assert.equal(bar.taken, undefined);
  } finally { setViewport(1400); }
});

test('a press on the copy reaches the same control in the window', () => {
  setViewport(400);
  try {
    const { card, sr, bar } = setup();
    card._hdrTakeSync();
    let got = 0;
    sr.querySelector('.to-sheet-hdr [data-ra-type="music"]').addEventListener('click', () => got++);
    const copy = document.createElement('div');
    copy.innerHTML = bar.taken;
    assert.ok(card._hdrTakeClick(copy.querySelector('path'), copy), 'an icon inside the button');
    assert.equal(got, 1);
  } finally { setViewport(1400); }
});

test('the back chevron closes the window, and the header gets its field back', async () => {
  setViewport(400);
  try {
    const { card, sr, bar } = setup();
    card._hdrTakeSync();
    sr.querySelector('.sheet-x').addEventListener('click', () => sr.querySelector('.to-sheet').remove());
    card._hdrTakeBack();
    card._hdrTakeSync();
    assert.equal(sr.querySelector('.to-sheet'), null);
    assert.equal(bar.taken, null);
  } finally { setViewport(1400); }
});

test('a window with no controls of its own shows its name in the header', () => {
  setViewport(400);
  try {
    const { card, sr, bar } = setup();
    sr.querySelector('.sh-side:not(.sh-end)').innerHTML = '';
    card._hdrTakeSync();
    assert.match(bar.taken, /ash-take-title">Recently Added</);
  } finally { setViewport(1400); }
});

test('the calendar hands up its type switch and dates, not its close', () => {
  setViewport(400);
  try {
    const host = document.body.appendChild(document.createElement('div'));
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = '<div id="cal-modal-root"></div>';
    const bar = fakeBar();
    const card = makeCard({ shadowRoot: sr, _searchExt: bar, _callApi: async () => [] });
    card._calendarModalOpen = true;
    card._calendarModalData = [];
    card._renderCalendarModalEl();
    card._hdrTakeSync();
    assert.match(bar.taken, /data-cal-action="tab-movie"/);
    assert.match(bar.taken, /cal-week-label/);
    assert.doesNotMatch(bar.taken, /popup-close/);
    // A press on the copy's Movies reaches the calendar
    const copy = document.createElement('div');
    copy.innerHTML = bar.taken;
    card._hdrTakeClick(copy.querySelector('[data-cal-action="tab-movie"]'), copy);
    assert.equal(card._calendarTab, 'movie');
    card._hdrTakeBack();
    assert.equal(card._calendarModalOpen, false, 'the chevron closes it');
  } finally { setViewport(1400); }
});

test('a service window hands up all its header but the close', () => {
  setViewport(400);
  try {
    const host = document.body.appendChild(document.createElement('div'));
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<div class="popup-overlay" data-tl-modal><div class="popup-glass">
      <div class="is-panel-hdr"><div id="tl-nav-area"><div class="mt-nav"><span class="mt-nav-ind" style="width:9px"></span>
        <button class="mt-nav-btn is-on" data-tl-tab="libraries">Libraries</button><button class="mt-nav-btn" data-tl-tab="users">U</button></div></div>
        <button class="popup-close" id="tl-close">x</button></div>
      <div class="popup-body"></div></div></div>
      <div class="popup-overlay" data-lib-modal><div class="popup-glass"><div class="is-panel-hdr"><div style="display:flex">
        <div class="mt-tb" data-lib="1">tools</div><button class="popup-close" id="lib-close">x</button></div></div></div></div>`;
    const bar = fakeBar();
    const card = makeCard({ shadowRoot: sr, _searchExt: bar });
    // The Library, opened last, is on top: its toolbar, out of the box it shares with the close
    card._hdrTakeSync();
    assert.match(bar.taken, /data-lib="1"/);
    assert.doesNotMatch(bar.taken, /popup-close/);
    assert.ok(sr.querySelectorAll('.popup-overlay')[1].classList.contains('hdr-taken'));
    sr.querySelectorAll('.popup-overlay')[1].remove();
    card._hdrTakeSync();
    assert.match(bar.taken, /data-tl-tab="users"/);
    assert.doesNotMatch(bar.taken, /width:9px/, 'the pill is placed by the header, not copied');
    assert.doesNotMatch(bar.taken, /tl-close/);
  } finally { setViewport(1400); }
});

test('a press reaches the right control though the header has text between its parts', () => {
  setViewport(400);
  try {
    const host = document.body.appendChild(document.createElement('div'));
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<div class="popup-overlay" data-lib-modal><div class="popup-glass"><div class="is-panel-hdr">
        <div style="display:flex">
          <div class="mt-tb"><span data-k="a">A</span> <span data-k="b">B</span></div>
          <button class="popup-close" id="lib-close">x</button>
        </div>
      </div></div></div>`;
    const bar = fakeBar();
    const card = makeCard({ shadowRoot: sr, _searchExt: bar });
    card._hdrTakeSync();
    let got = '';
    sr.querySelector('.is-panel-hdr').addEventListener('click', e => { got = e.target.dataset.k; });
    const copy = document.createElement('div');
    copy.innerHTML = bar.taken;
    card._hdrTakeClick(copy.querySelector('[data-k="b"]'), copy);
    assert.equal(got, 'b');
  } finally { setViewport(1400); }
});

test('a window over a picture sends up its name; a dialog keeps its own header', () => {
  setViewport(400);
  try {
    const host = document.body.appendChild(document.createElement('div'));
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<div class="popup-overlay" data-modal="stream"><div class="popup-glass">
      <button class="popup-close">x</button><div class="popup-body"><h2 class="popup-title">Heat</h2></div></div></div>`;
    const bar = fakeBar();
    const card = makeCard({ shadowRoot: sr, _searchExt: bar });
    card._hdrTakeSync();
    assert.match(bar.taken, /ash-take-title">Heat</);
    sr.innerHTML = `<div class="popup-overlay" data-pw-idx-form><div class="popup-glass"><div class="is-panel-hdr">Form<button class="popup-close">x</button></div></div></div>`;
    card._hdrTakeSync();
    assert.equal(bar.taken, null, 'a form is not a window of its own');
  } finally { setViewport(1400); }
});

test('a detail opened over a window takes the header back from it, and gives it again on closing', () => {
  setViewport(400);
  try {
    const { card, sr, bar } = setup();
    card._hdrTakeSync();
    assert.match(bar.taken, /data-ra-type/);
    const det = document.createElement('div');
    det.className = 'popup-overlay';
    det.setAttribute('data-modal', 'detail');
    det.innerHTML = '<div class="popup-glass"><button class="popup-close">x</button></div>';
    sr.appendChild(det);
    card._hdrTakeSync();
    assert.equal(bar.taken, null, 'the field back, under the detail');
    assert.ok(sr.querySelector('.to-sheet').classList.contains('hdr-taken'), 'the window keeps its place');
    det.remove();
    card._hdrTakeSync();
    assert.match(bar.taken, /data-ra-type/);
  } finally { setViewport(1400); }
});
