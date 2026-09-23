// Transmission in the downloads column: what the card sends, and that the row
// is named the way Transmission expects rather than the way every other client
// is named.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

// The action waits two seconds before refreshing, which is right in a browser
// and pointless here.
async function noWait(run) {
  const prev = globalThis.setTimeout;
  globalThis.setTimeout = fn => prev(fn, 0);
  try { return await run(); } finally { globalThis.setTimeout = prev; }
}

function card() {
  const c = makeCard();
  c._transmissionConfigured = true;
  c._transmissionQueue = [{ hash: 'abcdef', id: 7, name: 'Some.Film.2026', progress: 50, state: 'Downloading' }];
  c._reRenderLeft = () => {};
  c._fetchTransmission = async () => {};
  return c;
}

test('an action names the torrent by the id Transmission gave it', async () => {
  const c = card();
  const sent = [];
  c._hass = { ...c._hass, callApi: (m, p, b) => { sent.push({ m, p, b }); return Promise.resolve({}); } };
  await noWait(() => c._transmissionAction('abcdef', 'pause'));
  assert.deepEqual(sent, [{ m: 'POST', p: 'arr_stack/transmission/action', b: { action: 'pause', id: 7 } }]);
});

test('removing with the files says so, and the confirmation is cleared', async () => {
  const c = card();
  c._transmissionConfirm = 'abcdef';
  let body = null;
  c._hass = { ...c._hass, callApi: (m, p, b) => { body = b; return Promise.resolve({}); } };
  await noWait(() => c._transmissionAction('abcdef', 'delete', true));
  assert.deepEqual(body, { action: 'delete_files', id: 7 });
  assert.equal(c._transmissionConfirm, null);
});

test('pausing everything asks for the lot, not for a row', async () => {
  const c = card();
  let body = null;
  c._hass = { ...c._hass, callApi: (m, p, b) => { body = b; return Promise.resolve({}); } };
  await noWait(() => c._transmissionAction(null, 'pauseAll'));
  assert.equal(body.action, 'global_pause');
});

test('a torrent the card no longer holds still reaches Transmission by its hash', async () => {
  const c = card();
  c._transmissionQueue = [];
  let body = null;
  c._hass = { ...c._hass, callApi: (m, p, b) => { body = b; return Promise.resolve({}); } };
  await noWait(() => c._transmissionAction('abcdef', 'resume'));
  assert.equal(body.id, 'abcdef', 'the hash is the only name left to use');
});

test('the queue and the totals are kept where the column reads them', async () => {
  const c = makeCard();
  c._transmissionConfigured = null;
  c._callApi = async (m, path) => path.endsWith('/queue')
    ? [{ hash: 'abcdef', id: 7 }]
    : { download_rate: 500, upload_rate: 60, free_space: 123 };
  await c._fetchTransmission();
  assert.equal(c._transmissionQueue.length, 1);
  assert.equal(c._transmissionStatus.download_rate, 500);
  assert.equal(c._transmissionConfigured, true);
});

test('a Transmission that is not set up is left alone after one refusal', async () => {
  const c = makeCard();
  c._transmissionConfigured = null;
  let calls = 0;
  c._callApi = async () => { calls++; const e = new Error('nope'); e.status_code = 503; throw e; };
  await c._fetchTransmission();
  assert.equal(c._transmissionConfigured, false);
  await c._fetchTransmission();
  assert.equal(calls, 2, 'the first attempt asks for both the queue and the totals, the second does not ask at all');
});

test('the ping counts Transmission among the services', () => {
  const c = makeCard();
  c._capsLoaded = true;
  c._transmissionConfigured = true;
  const sent = [];
  const prev = globalThis.fetch;
  globalThis.fetch = (url, opts) => { sent.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true }); };
  try { c._sendPing(); } finally { globalThis.fetch = prev; }
  assert.ok(sent[0].svcs.includes('transmission'));
});
