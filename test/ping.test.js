// The analytics ping: which services it reports, and that it reports none
// before the integration has said what is set up.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

// Captures what _sendPing posts instead of letting it leave the process.
function capture(card) {
  const sent = [];
  const prev = globalThis.fetch;
  globalThis.fetch = (url, opts) => {
    sent.push(JSON.parse(opts.body));
    return Promise.resolve({ ok: true });
  };
  try { card._sendPing(); } finally { globalThis.fetch = prev; }
  return sent;
}

test('no service list before the capabilities have loaded', () => {
  const card = makeCard();
  card._capsLoaded = false;
  // The constructor defaults: true for qBittorrent and Bazarr, unknown for the
  // rest — exactly what used to be reported as installed.
  card._qbitConfigured = true;
  card._bazarrConfigured = true;
  card._overseerrConfigured = null;
  const [body] = capture(card);
  assert.ok(body, 'a ping is still sent');
  assert.ok(!('svcs' in body), 'but without services');
});

test('the service list rides along once they have', () => {
  const card = makeCard();
  card._capsLoaded = true;
  card._qbitConfigured = true;
  card._bazarrConfigured = false;
  const [body] = capture(card);
  assert.ok(Array.isArray(body.svcs));
  assert.ok(body.svcs.includes('qbit'));
  assert.ok(!body.svcs.includes('bazarr'));
});

test('an opted-out install sends nothing at all', () => {
  const card = makeCard();
  card._capsLoaded = true;
  card._metricsOptOut = true;
  assert.strictEqual(capture(card).length, 0);
});

test('activation is reported once, and says so', () => {
  const card = makeCard();
  // The harness silences activation for every other test; this one needs the
  // real method from the prototype.
  delete card._markActivated;
  card._capsLoaded = true;
  const sent = [];
  const prev = globalThis.fetch;
  globalThis.fetch = (url, opts) => { sent.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true }); };
  try {
    card._markActivated();
    card._markActivated();
  } finally { globalThis.fetch = prev; }
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].act, 1);
});
