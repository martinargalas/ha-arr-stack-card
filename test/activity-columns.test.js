// The Activity tabs' column pickers: what each one lists, what a tick does to
// the table under it, what it remembers, and that the gear closes it again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

const PICKERS = [
  { method: '_openHistoryColPicker', attr: 'data-hist-col-picker', field: 'histCols', key: 'arr-stack-hist-cols', tab: 'history',
    cols: ['event', 'quality', 'langs', 'formats', 'date', 'client', 'indexer', 'relgroup', 'srctitle', 'cfscore'] },
  { method: '_openBlColPicker', attr: 'data-bl-col-picker', field: 'blCols', key: 'arr-stack-bl-cols', tab: 'blocklist',
    cols: ['source', 'srctitle', 'langs', 'quality', 'formats', 'date', 'indexer', 'protocol'] },
  { method: '_openQueueColPicker', attr: 'data-col-picker', field: 'queueCols', key: 'arr-stack-queue-cols', tab: 'queue',
    cols: ['source', 'quality', 'size', 'timeleft', 'formats', 'protocol', 'indexer', 'client', 'status'] },
  { method: '_openMissingColPicker', attr: 'data-missing-col-picker', field: 'missingCols', key: 'arr-stack-missing-cols', tab: 'missing',
    cols: ['monitored', 'source', 'year', 'profile', 'added', 'missing'] },
];

function setup(p) {
  const root = document.createElement('div');
  root.innerHTML = '<div data-act-modal><div id="act-body"></div></div><button class="gear"></button>';
  document.body.appendChild(root);
  const cols = new Set([p.cols[0]]);
  const painted = [];
  const card = makeCard({
    shadowRoot: root,
    _activityModal: {
      [p.field]: cols,
      histData: { radarr: [], sonarr: [] }, blData: { radarr: [], sonarr: [] }, queueData: { radarr: [], sonarr: [] },
      histFilter: 'all', histPage: 0, histPerPage: 10, blPage: 0, blPerPage: 10, queuePage: 0, queuePerPage: 10,
    },
    _actMissingCache: {},
  });
  card._actHistoryTabHtml = () => 'H';
  card._actBlocklistTabHtml = () => 'B';
  card._actQueueTabHtml = (r, s, pg, pp, c) => { assert.equal(c, cols); return 'Q'; };
  card._actSetBodyHtml = (body, html) => { body.innerHTML = html; };
  card._wireActBody = (body, modal, tab) => painted.push(tab);
  card._actRenderMissing = () => painted.push('missing');
  return { card, root, gear: root.querySelector('.gear'), cols, painted, done: () => root.remove() };
}

for (const p of PICKERS) {
  test(`${p.method}: lists its columns, ticked as they are set`, () => {
    const { card, root, gear, done } = setup(p);
    card[p.method](gear, null);
    const picker = root.querySelector(`[${p.attr}]`);
    assert.ok(picker, 'the picker is open');
    assert.ok(gear.classList.contains('active'));
    const boxes = [...picker.querySelectorAll('input[type=checkbox]')];
    assert.deepEqual(boxes.map(b => b.dataset.colId), p.cols);
    assert.deepEqual(boxes.map(b => b.checked), p.cols.map((c, i) => i === 0));
    done();
  });

  test(`${p.method}: a tick changes the columns, remembers them and repaints the tab`, () => {
    const { card, root, gear, cols, painted, done } = setup(p);
    localStorage.removeItem(p.key);
    card[p.method](gear, null);
    const box = root.querySelector(`[${p.attr}] input[data-col-id="${p.cols[1]}"]`);
    box.checked = true;
    box.dispatchEvent(new window.Event('change'));
    assert.deepEqual([...cols], [p.cols[0], p.cols[1]]);
    assert.deepEqual(JSON.parse(localStorage.getItem(p.key)), [p.cols[0], p.cols[1]]);
    assert.deepEqual(painted, [p.tab]);
    const first = root.querySelector(`[${p.attr}] input[data-col-id="${p.cols[0]}"]`);
    first.checked = false;
    first.dispatchEvent(new window.Event('change'));
    assert.deepEqual([...cols], [p.cols[1]]);
    done();
  });

  test(`${p.method}: the gear closes it again`, () => {
    const { card, root, gear, done } = setup(p);
    card[p.method](gear, null);
    card[p.method](gear, null);
    assert.equal(root.querySelector(`[${p.attr}]`), null);
    assert.ok(!gear.classList.contains('active'));
    done();
  });
}
