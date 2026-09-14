// The film and series detail: what each button in it does. These pin the
// behaviour of the popup's one big click handler before it is split up, so a
// branch that goes missing or lands in the wrong place fails here.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard, movie } from './harness.js';

const SIDE_EFFECTS = ['_removeFromLibrary', '_togglePopupMonitor', '_fetchInteractiveSearch',
  '_addMovieToRadarr', '_addSeriesToSonarr', '_fetchPlexClients',
  '_triggerRadarrAutoSearch', '_addSeriesForAs'];

// Renders a popup into a real shadow root and hands back ways to press its
// buttons. Methods that would reach a server are swapped for recorders.
function open(popup, setup) {
  const host = document.createElement('div');
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = '<div id="popup-root"></div>';
  const card = makeCard({ shadowRoot: sr });
  const calls = [];
  for (const m of SIDE_EFFECTS) card[m] = (...args) => { calls.push([m, ...args]); };
  setup?.(card);
  card._popup = popup;
  card._renderPopupEl();
  const root = sr.getElementById('popup-root');
  const fire = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return {
    card, root, calls,
    has: action => !!root.querySelector(`[data-action="${action}"]`),
    // A button the detail actually drew — the menus only take clicks on their
    // own rows, so flows inside them are driven through these.
    click(action, instance) {
      const sel = `[data-action="${action}"]` + (instance ? `[data-instance="${instance}"]` : '');
      const el = root.querySelector(sel);
      assert.ok(el, `the detail draws ${sel}`);
      fire(el);
    },
    // A button placed in the glass, for actions whose button only appears
    // deeper in a flow — this is what the handler sees either way.
    press(action, data = {}) {
      const glass = root.querySelector('.popup-glass');
      const b = document.createElement('button');
      b.dataset.action = action;
      for (const [k, v] of Object.entries(data)) b.dataset[k] = v;
      glass.appendChild(b);
      fire(b);
    },
  };
}

const film = (over = {}) => ({ _type: 'radarr', id: 550, title: 'Fight Club', overview: 'x',
  genres: [{ name: 'Drama' }], _radarrId: 5, ...over });
const inRadarr = card => { card._radarr = [movie({ id: 5, tmdbId: 550, title: 'Fight Club' })]; };

test('Search opens the picker and closes it again', () => {
  const p = open(film(), inRadarr);
  p.click('search-expand');
  assert.strictEqual(p.card._searchExpand, 'pick');
  assert.ok(p.has('search-collapse'), 'the button turns into its collapse');
  p.click('search-collapse');
  assert.strictEqual(p.card._searchExpand, null);
});

test('Remove on a single instance goes straight to the choice', () => {
  const p = open(film(), inRadarr);
  p.click('remove-confirm');
  assert.strictEqual(p.card._removeConfirm, 'choose');
  assert.strictEqual(p.card._removeInstance, null, 'the first instance, left implicit');
});

test('Remove on a film only the second Radarr holds pre-selects it', () => {
  const p = open(film({ _radarrId: null, _radarr2Id: 9 }));
  p.click('remove-confirm');
  assert.strictEqual(p.card._removeConfirm, 'choose');
  assert.strictEqual(p.card._removeInstance, 'radarr2');
});

test('Remove on a film both instances hold lists a row per instance', () => {
  const p = open(film({ _radarr2Id: 9 }), inRadarr);
  p.click('remove-confirm');
  assert.strictEqual(p.card._removeConfirm, 'instance');
  // One flat list, each row naming its instance — no separate pick step.
  assert.ok(p.root.querySelector('[data-action="remove-choose-lib"][data-instance="radarr"]'));
  p.click('remove-choose-lib', 'radarr2');
  assert.strictEqual(p.card._removeInstance, 'radarr2');
  assert.strictEqual(p.card._removeArmed, 'lib');
});

test('Removing from the library arms a tick before anything is deleted', () => {
  const p = open(film(), inRadarr);
  p.click('remove-confirm');
  p.click('remove-choose-lib');
  assert.strictEqual(p.card._removeArmed, 'lib');
  assert.strictEqual(p.calls.length, 0, 'nothing deleted yet');
  p.click('remove-armed-yes');
  assert.deepStrictEqual(p.calls, [['_removeFromLibrary', false, false]]);
  assert.strictEqual(p.card._removeArmed, null);
});

test('Removing from disc passes the files along', () => {
  const p = open(film(), inRadarr);
  p.click('remove-confirm');
  p.click('remove-choose-disc');
  assert.strictEqual(p.card._removeArmed, 'disc');
  p.click('remove-armed-yes');
  assert.deepStrictEqual(p.calls, [['_removeFromLibrary', true, true]]);
});

test('Backing out of Remove clears every step of it', () => {
  const p = open(film(), inRadarr);
  p.click('remove-confirm');
  p.click('remove-choose-disc');
  p.click('remove-armed-no');
  assert.strictEqual(p.card._removeArmed, null);
  p.click('remove-no');
  assert.strictEqual(p.card._removeConfirm, false);
  assert.strictEqual(p.card._removeInstance, null);
  assert.strictEqual(p.calls.length, 0);
});

test('The monitor toggle names its instance and ignores a second press while busy', () => {
  const p = open(film(), inRadarr);
  p.press('popup-monitor-toggle', { instance: 'radarr' });
  assert.strictEqual(p.card._popupMonBusy, 'radarr');
  p.press('popup-monitor-toggle', { instance: 'radarr' });
  assert.deepStrictEqual(p.calls, [['_togglePopupMonitor', 'radarr']]);
});

test('Adding to a missing instance asks, then adds monitored to the right *arr', () => {
  const p = open(film(), inRadarr);
  p.press('popup-monitor-add-confirm', { instance: 'radarr2' });
  assert.strictEqual(p.card._popupMonAddInst, 'radarr2');
  p.press('popup-monitor-add-no');
  assert.strictEqual(p.card._popupMonAddInst, null);
  p.press('popup-monitor-add-yes', { instance: 'radarr2' });
  p.press('popup-monitor-add-yes', { instance: 'sonarr' });
  assert.deepStrictEqual(p.calls, [['_addMovieToRadarr', 'radarr2', true], ['_addSeriesToSonarr', 'sonarr', true]]);
});

test('Interactive Search runs on the instance it was opened for', () => {
  const p = open(film({ _radarr2Id: 9 }), inRadarr);
  p.card._isInstance = 'radarr2';
  p.press('is-confirm-yes');
  assert.deepStrictEqual(p.calls, [['_fetchInteractiveSearch', 9, 'radarr2']]);
  p.card._isState = 'confirm';
  p.press('is-confirm-no');
  assert.strictEqual(p.card._isState, null);
});

test('The cast panel opens on its first page and pages without going below zero', () => {
  const cast = Array.from({ length: 20 }, (_, i) => ({ name: `Actor ${i}`, character: 'x', profilePath: null }));
  const p = open(film({ credits: { cast } }), inRadarr);
  p.press('popup-cast-toggle');
  assert.strictEqual(p.card._popupCastOpen, true);
  assert.strictEqual(p.card._popupCastPage, 0);
  p.press('popup-cast-next');
  assert.strictEqual(p.card._popupCastPage, 1);
  p.press('popup-cast-prev');
  p.press('popup-cast-prev');
  assert.strictEqual(p.card._popupCastPage, 0);
  p.press('popup-cast-toggle');
  assert.strictEqual(p.card._popupCastOpen, false);
});

test('Search: picking an instance moves on to choosing the mode', () => {
  const p = open(film(), inRadarr);
  p.press('search-pick-inst', { instance: 'radarr2' });
  assert.strictEqual(p.card._searchPickInst, 'radarr2');
  assert.strictEqual(p.card._searchExpand, 'pick-mode');
});

test('Automatic search runs on the chosen instance, and backing out closes it', () => {
  const p = open(film(), inRadarr);
  p.card._asInstance = 'radarr2';
  p.press('as-confirm-yes');
  assert.deepStrictEqual(p.calls, [['_triggerRadarrAutoSearch', 'radarr2']]);
  p.card._asOpen = true; p.card._asState = 'confirm';
  p.press('as-confirm-no');
  assert.strictEqual(p.card._asOpen, false);
  assert.strictEqual(p.card._asState, null);
});

test('Automatic search on a series adds it to Sonarr first', () => {
  const p = open(film(), inRadarr);
  p.card._popup._type = 'sonarr';
  p.card._asInstance = 'sonarr';
  p.press('as-confirm-yes');
  assert.deepStrictEqual(p.calls, [['_addSeriesForAs', 'sonarr']]);
});

test('Deleting an episode or a season asks first, and the two prompts exclude each other', () => {
  const p = open(film(), inRadarr);
  p.press('ep-del-confirm', { epid: '42' });
  assert.strictEqual(p.card._epFileConfirm, 42);
  p.press('season-del-confirm', { season: '3' });
  assert.strictEqual(p.card._seasonFileConfirm, 3);
  assert.strictEqual(p.card._epFileConfirm, null, 'the episode prompt gives way');
  p.press('season-del-no');
  assert.strictEqual(p.card._seasonFileConfirm, null);
  p.press('ep-del-confirm', { epid: '7' });
  p.press('ep-del-no');
  assert.strictEqual(p.card._epFileConfirm, null);
});

test('Sonarr sources: confirming adds to the chosen instance; No and Back close the panel', () => {
  const p = open(film(), inRadarr);
  p.card._snIsInstance = 'sonarr2';
  p.press('sn-confirm-yes');
  assert.deepStrictEqual(p.calls, [['_addSeriesToSonarr', 'sonarr2']]);
  p.card._snIsOpen = true; p.card._snIsState = 'confirm';
  p.press('sn-confirm-no');
  assert.strictEqual(p.card._snIsOpen, false);
  assert.strictEqual(p.card._snIsState, null);
  p.card._snActiveIs = { type: 'season', key: 1 }; p.card._snIsState = 'results';
  p.press('sn-back');
  assert.strictEqual(p.card._snActiveIs, null);
  assert.strictEqual(p.card._snIsState, null);
});

test('Monitoring: the instance list folds open and shut, and the search prompt can be dismissed', () => {
  const p = open(film(), inRadarr);
  p.press('popup-monitor-expand');
  assert.strictEqual(p.card._popupMonExpand, true);
  p.press('popup-monitor-expand');
  assert.strictEqual(p.card._popupMonExpand, false);
  p.card._popupMonAddSearch = 'radarr2';
  p.press('popup-mon-search-no');
  assert.strictEqual(p.card._popupMonAddSearch, null);
});

test('Cancelling a stream termination closes its dialog', () => {
  const p = open(film(), inRadarr);
  const modal = document.createElement('div');
  modal.className = 'plex-terminate-modal';
  p.card.shadowRoot.appendChild(modal);
  p.card._terminateActive = true;
  p.press('stream-terminate-cancel');
  assert.strictEqual(p.card._terminateActive, false);
  assert.strictEqual(p.card.shadowRoot.querySelector('.plex-terminate-modal'), null);
});
