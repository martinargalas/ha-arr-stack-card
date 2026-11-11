// A second qBittorrent and SABnzbd (#8 in the integration's repo): one list out
// of both, a switch between them, and every action sent to the instance the
// download is in. Without a second instance nothing of it shows.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

// The actions wait a moment for the client to settle; not here
function fastTimers(t) {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => real(fn, 0);
  t.after(() => { globalThis.setTimeout = real; });
}

const torrent = (hash, name, state = 'downloading') =>
  ({ hash, name, state, progress: 0.4, dlspeed: 1000, upspeed: 0, size: 100, completed: 40, eta: 60 });

// Answers per service, and every call kept for the test to read
function stub(card, answers) {
  const calls = [];
  card._callApi = async (method, path, body) => {
    calls.push({ method, path, body });
    const [, svc, sub] = path.split('/');
    const a = answers[svc]?.[sub];
    if (a === undefined) return method === 'POST' ? { ok: true } : {};
    return typeof a === 'function' ? a() : JSON.parse(JSON.stringify(a));
  };
  return calls;
}

function twoQbits(card) {
  card._capsLoaded = true;
  card._sort = 'progress_desc';
  card._qbitConfigured = true;
  card._qbit2Configured = true;
  card._dlInst = { qbit: 'all', sab: 'all' };
  return stub(card, {
    qbit:  { torrents: [torrent('aaa', 'One.Film')], transfer: { dl_info_speed: 100, up_info_speed: 1 } },
    qbit2: { torrents: [torrent('bbb', 'Two.Film'), torrent('aaa', 'One.Film.Seeded.Here.Too')], transfer: { dl_info_speed: 50, up_info_speed: 2 } },
  });
}

test('both qBittorrents in one list, each torrent marked with its instance, speeds added up', async () => {
  const card = makeCard();
  twoQbits(card);
  await card._fetchQbit();
  assert.deepEqual(card._qbit.map(t => `${t._inst}:${t.hash}`), ['1:aaa', '2:bbb', '2:aaa']);
  assert.equal(card._qbitTransfer.dl_info_speed, 150);
  assert.equal(card._qbitTransfer.up_info_speed, 3);
});

test('the switch shows one instance, and the labels go while only one is shown', async () => {
  const card = makeCard();
  twoQbits(card);
  await card._fetchQbit();
  let html = card._renderQbit();
  assert.match(html, /dl-inst-full">\s*<button class="sb on" data-dl-inst="qbit:all"/, 'three buttons for a tablet and a desktop');
  assert.match(html, /dl-inst-one">\s*<button class="sb" data-dl-inst="qbit:1"[^>]*>1&nbsp;\|&nbsp;2</, 'and on a phone one, showing both, stepping to 1');
  assert.match(html, /class="dl-inst dl-inst-2"[^>]*>2</, 'a row of the second says so');
  assert.ok(html.includes('One.Film') && html.includes('Two.Film'));

  card._dlInstSet('qbit', '2');
  html = card._renderQbit();
  assert.match(html, /dl-inst-one">\s*<button class="sb on" data-dl-inst="qbit:all"[^>]*>2</, 'on the second, the phone\'s button steps back to both');
  assert.ok(!html.includes('>One.Film<'), 'the first one\'s torrent is gone');
  assert.ok(html.includes('Two.Film'));
  assert.doesNotMatch(html, /class="dl-inst/, 'no labels while one instance is shown');
  assert.equal(card._getPageData('qbit').length, 2, 'the paging counts what is shown');
});

test('a single qBittorrent shows no switch and no labels, whatever was saved', async () => {
  const card = makeCard();
  card._capsLoaded = true;
  card._qbitConfigured = true;
  card._qbit2Configured = false;
  card._sort = 'progress_desc';
  card._dlInst = { qbit: '2' };
  stub(card, { qbit: { torrents: [torrent('aaa', 'One.Film')], transfer: {} } });
  await card._fetchQbit();
  const html = card._renderQbit();
  assert.doesNotMatch(html, /data-dl-inst/);
  assert.ok(html.includes('One.Film'), 'a saved choice of the second does not hide the only one');
});

test('an action on a torrent goes to the qBittorrent it is in', async (t) => {
  fastTimers(t);
  const card = makeCard();
  const calls = twoQbits(card);
  await card._fetchQbit();
  card._reRenderLeft = () => {};
  await card._qbitAction('aaa', 'pause', false, '2');
  const posts = calls.filter(c => c.method === 'POST');
  assert.deepEqual(posts.map(c => c.path), ['arr_stack/qbit2/action']);
});

test('pause all goes to the instance shown, or to both', async (t) => {
  fastTimers(t);
  const card = makeCard();
  const calls = twoQbits(card);
  card._reRenderLeft = () => {};
  await card._qbitAction(null, 'pauseAll');
  assert.deepEqual(calls.filter(c => c.method === 'POST').map(c => c.path).sort(),
    ['arr_stack/qbit/action', 'arr_stack/qbit2/action']);
  calls.length = 0;
  card._dlInstSet('qbit', '1');
  await card._qbitAction(null, 'resumeAll');
  assert.deepEqual(calls.filter(c => c.method === 'POST').map(c => c.path), ['arr_stack/qbit/action']);
});

test('the same torrent in both instances: confirming removal on one leaves the other alone', async () => {
  const card = makeCard();
  twoQbits(card);
  await card._fetchQbit();
  card._confirmRemove = '2:aaa';
  const html = card._renderQbit();
  assert.equal((html.match(/data-tb-action="remove-del"/g) || []).length, 1);
  assert.match(html, /data-tb-action="remove-del"\s+data-hash="aaa" data-inst="2"/);
});

test('one qBittorrent down leaves the other one\'s torrents on the card', async () => {
  const card = makeCard();
  const calls = twoQbits(card);
  await card._fetchQbit();
  card._callApi = async (m, path) => {
    calls.push({ path });
    if (path.startsWith('arr_stack/qbit2/')) { const e = new Error('down'); e.status_code = 502; throw e; }
    return path.endsWith('torrents') ? [torrent('ccc', 'Three.Film')] : {};
  };
  const prev = console.error; console.error = () => {};
  try { await card._fetchQbit(); } finally { console.error = prev; }
  assert.equal(card._qbit2Configured, true, 'down, not gone');
  assert.ok(card._qbit.some(t => t.hash === 'ccc'), 'the first one\'s fresh list');
  assert.ok(card._qbit.some(t => t.hash === 'bbb'), 'the second one\'s last list stays');
});

function twoSabs(card) {
  card._capsLoaded = true;
  card._sabConfigured = true;
  card._sab2Configured = true;
  card._dlInst = { qbit: 'all', sab: 'all' };
  const slot = (id, name) => ({ nzo_id: id, filename: name, percentage: '10', mb: '100', mbleft: '90', status: 'Downloading', timeleft: '0:01:00' });
  return stub(card, {
    sabnzbd:  { queue: { queue: { status: 'Paused', kbpersec: '100', slots: [slot('n1', 'Usenet.One')] } },
                history: { history: { slots: [{ nzo_id: 'f1', name: 'Broken.One', status: 'Failed' }] } } },
    sabnzbd2: { queue: { queue: { status: 'Downloading', kbpersec: '50', slots: [slot('n2', 'Usenet.Two')] } },
                history: { history: { slots: [{ nzo_id: 'f2', name: 'Broken.Two', status: 'Failed' }] } } },
  });
}

test('both SABnzbds in one queue; paused only when both are', async () => {
  const card = makeCard();
  twoSabs(card);
  await card._fetchSab();
  await card._fetchSabHistory();
  assert.deepEqual(card._sab.slots.map(s => `${s._inst}:${s.nzo_id}`), ['1:n1', '2:n2']);
  assert.equal(parseFloat(card._sab.kbpersec), 150);
  assert.notEqual(card._sab.status, 'Paused', 'one of the two still downloads');
  assert.deepEqual(card._sabFailed.map(s => s._inst), ['1', '2']);

  card._dlInstSet('sab', '1');
  const html = card._renderSab();
  assert.ok(html.includes('Usenet.One') && !html.includes('Usenet.Two'));
  assert.ok(html.includes('Broken.One') && !html.includes('Broken.Two'), 'the failed ones follow the switch too');
  assert.match(html, /sab-global-toggle paused/, 'the first one is paused');
});

test('retry, delete and pause go to the SABnzbd the item is in', async (t) => {
  fastTimers(t);
  const card = makeCard();
  const calls = twoSabs(card);
  await card._fetchSab();
  await card._fetchSabHistory();
  card._reRenderLeft = () => {};
  calls.length = 0;
  await card._sabRetry('f2');
  await card._sabQueueDelete('n1');
  await card._sabHistoryDelete('f2');
  assert.deepEqual(calls.filter(c => c.method === 'POST').map(c => c.path),
    ['arr_stack/sabnzbd2/action', 'arr_stack/sabnzbd/action', 'arr_stack/sabnzbd2/action']);
  calls.length = 0;
  card._dlInstSet('sab', '2');
  await card._sabAction('pause');
  assert.deepEqual(calls.filter(c => c.method === 'POST').map(c => c.path), ['arr_stack/sabnzbd2/action']);
});

test('the capabilities carry the second instances', () => {
  const card = makeCard();
  card._applyCaps({ qbit: true, qbit2: true, sabnzbd: true, sabnzbd2: false });
  assert.equal(card._qbit2Configured, true);
  assert.equal(card._sab2Configured, false);
});

test('the row labels can be switched off in the editor, the header switch stays', async () => {
  const card = makeCard();
  twoQbits(card);
  await card._fetchQbit();
  card._config = { ...(card._config || {}), downloads: { rowInstance: false } };
  const html = card._renderQbit();
  assert.doesNotMatch(html, /class="dl-inst/);
  assert.match(html, /data-dl-inst="qbit:all"/);
});
