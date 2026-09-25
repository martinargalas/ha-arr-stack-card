// A download client that is down is not the same as one that was never set up,
// and neither of them should fill the console.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function withConsole(run) {
  const lines = [];
  const prev = console.error;
  console.error = (...a) => lines.push(a[0]);
  try { return run(lines); } finally { console.error = prev; }
}

function failing(card, status, body = {}) {
  card._callApi = async () => { const e = new Error('nope'); e.status_code = status; e.body = body; throw e; };
}

test('a client that is not set up is dropped and asked no more', async () => {
  const card = makeCard();
  card._rtorrentConfigured = true;
  failing(card, 503, { error: 'rTorrent not configured' });
  await withConsole(() => card._fetchRtorrent());
  assert.equal(card._rtorrentConfigured, false);
});

test('a client that is merely down is kept, and tried again', async () => {
  const card = makeCard();
  card._rtorrentConfigured = true;
  failing(card, 502, { error: 'rTorrent answered 502' });
  await withConsole(() => card._fetchRtorrent());
  assert.equal(card._rtorrentConfigured, true, 'it is still configured, just not answering');
  // The next poll is a moment later and is left alone, so the browser's own
  // network log does not fill up either
  let asked = 0;
  card._callApi = async () => { asked++; const e = new Error('nope'); e.status_code = 502; throw e; };
  await withConsole(() => card._fetchRtorrent());
  assert.equal(asked, 0, 'held off for now');
  card._dlHoldUntil.rTorrent = Date.now() - 1;
  await withConsole(() => card._fetchRtorrent());
  assert.ok(asked > 0, 'and asked again once the hold is over');
});

test('the wait grows with each failure, up to a minute', async () => {
  const card = makeCard();
  card._rtorrentConfigured = true;
  failing(card, 502, {});
  const waits = [];
  for (let i = 0; i < 6; i++) {
    card._dlHoldUntil = card._dlHoldUntil || {};
    delete card._dlHoldUntil.rTorrent;
    await withConsole(() => card._fetchRtorrent());
    waits.push(card._dlHoldUntil.rTorrent - Date.now());
  }
  assert.ok(waits[0] <= 5000 && waits[0] > 3000, `first wait ~5s, got ${waits[0]}`);
  assert.ok(waits[1] > waits[0], 'and it grows');
  assert.ok(waits[5] <= 60000, 'but never beyond a minute');
});

test('an outage is logged once, not once per poll', async () => {
  const card = makeCard();
  card._rtorrentConfigured = true;
  failing(card, 502, { error: 'down' });
  const lines = [];
  const prev = console.error;
  console.error = (...a) => lines.push(a[0]);
  try {
    for (let i = 0; i < 5; i++) {
      if (card._dlHoldUntil) delete card._dlHoldUntil.rTorrent;
      await card._fetchRtorrent();
    }
  } finally { console.error = prev; }
  assert.equal(lines.length, 1, `five polls, one line — got ${lines.length}`);
});

test('a client that comes back says so, so the next outage is heard', async () => {
  const card = makeCard();
  card._rtorrentConfigured = true;
  failing(card, 502, {});
  await withConsole(() => card._fetchRtorrent());
  card._callApi = async () => [];
  delete card._dlHoldUntil.rTorrent;
  await card._fetchRtorrent();
  failing(card, 502, {});
  const lines = [];
  const prev = console.error;
  console.error = (...a) => lines.push(a[0]);
  try { await card._fetchRtorrent(); } finally { console.error = prev; }
  assert.equal(lines.length, 1, 'the second outage is reported too');
});

test('every download client goes through the same handler', async () => {
  const card = makeCard();
  for (const [fetchName, flag] of [
    ['_fetchQbit', '_qbitConfigured'],
    ['_fetchDeluge', '_delugeConfigured'],
    ['_fetchTransmission', '_transmissionConfigured'],
    ['_fetchRtorrent', '_rtorrentConfigured'],
    ['_fetchNzbget', '_nzbgetConfigured'],
  ]) {
    card[flag] = true;
    card._dlHoldUntil = {};
    failing(card, 502, {});
    await withConsole(() => card[fetchName]());
    assert.equal(card[flag], true, `${fetchName} keeps a client that is only down`);
    card[flag] = true;
    card._dlHoldUntil = {};
    failing(card, 503, { error: 'not configured' });
    await withConsole(() => card[fetchName]());
    assert.equal(card[flag], false, `${fetchName} drops a client that is not set up`);
  }
});
