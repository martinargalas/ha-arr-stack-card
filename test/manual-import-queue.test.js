// A manual import from the Activity queue: the row goes as soon as the *arr
// says the import command has completed — not when the *arr finally drops the
// download from its queue, which can be a minute later — and the list is not
// swapped for the loading placeholder while the import runs.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup({ status = 'completed', result = 'successful' } = {}) {
  const c = makeCard();
  const calls = [];
  const row = { downloadId: 'D1', movieId: 5, title: 'Heat', trackedDownloadState: 'importPending' };
  c._callApi = async (method, path) => {
    calls.push(`${method} ${path}`);
    if (path === 'arr_stack/radarr/command') return { id: 42 };
    if (path === 'arr_stack/radarr/command/42') return { id: 42, status, result };
    // The *arr still lists the download after the import
    if (path.startsWith('arr_stack/radarr/queue')) return { records: [row] };
    return null;
  };
  c._actImporting = new Set();
  c._actImported = new Set();
  c._actShowStatus = (msg, opts) => { c._lastStatus = { msg, opts }; };
  c._refreshQueueCounters = async () => {};
  c._radarr2Configured = false; c._sonarr2Configured = false; c._lidarrConfigured = false;
  const body = document.createElement('div');
  body.id = 'act-body';
  const modalEl = document.createElement('div');
  modalEl.appendChild(body);
  const painted = [];
  c._actRenderQueue = b => { painted.push((c._activityModal.queueData.radarr || []).map(r => r.downloadId)); b.textContent = 'rows'; };
  c._activityModal = { tab: 'queue', queueData: { radarr: [{ ...row, _svc: 'radarr' }], sonarr: [] } };
  const seen = [];
  new window.MutationObserver(() => seen.push(body.textContent)).observe(body, { childList: true, subtree: true, characterData: true });
  return { c, calls, body, modalEl, painted, seen };
}

const cand = { id: 1, path: '/dl/Heat.mkv', movie: { id: 5 }, downloadId: 'D1', quality: {}, languages: [] };

test('a completed import takes its row away at once, though the *arr still lists it', async () => {
  const { c, calls, modalEl, painted, seen } = setup();
  await c._submitManualImport([cand], [0], 'radarr', { remove() {} }, modalEl);
  assert.ok(calls.includes('GET arr_stack/radarr/command/42'), 'follows the command itself');
  assert.deepEqual(painted.at(-1), [], 'the row is gone');
  assert.ok(c._actImported.has('D1'));
  assert.equal(c._actImporting.size, 0);
  assert.equal(c._lastStatus.msg, c._t('actImported'));
  await new Promise(r => setTimeout(r, 0));
  assert.ok(!seen.some(t => /Loading/.test(t)), 'never swapped for the loading placeholder');
});

test('once the *arr drops the download, the note of it goes too', async () => {
  const { c, modalEl } = setup();
  await c._submitManualImport([cand], [0], 'radarr', { remove() {} }, modalEl);
  c._callApi = async () => ({ records: [] });
  await c._actLoadTab('queue', modalEl, { quiet: true });
  assert.equal(c._actImported.size, 0);
});

test('a failed import leaves the row and says so', async () => {
  const { c, modalEl, painted } = setup({ status: 'failed' });
  await c._submitManualImport([cand], [0], 'radarr', { remove() {} }, modalEl);
  assert.deepEqual(painted.at(-1), ['D1']);
  assert.equal(c._actImported.size, 0);
  assert.equal(c._lastStatus.opts.err, true);
});
