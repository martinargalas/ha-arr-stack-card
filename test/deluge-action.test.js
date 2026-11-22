// Deluge (#50): one click on a torrent sends one request, in the proxy's
// words. The column is repainted by morphing, which keeps a button that did
// not change; wired again on every repaint, it stacked a listener each time.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function card() {
  const c = makeCard();
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<div id="col-left">
    <button class="deluge-global-toggle paused"></button>
    <button data-dlg-action="resume" data-dlg-hash="abc"></button>
    <button data-dlg-action="remove-del" data-dlg-hash="abc"></button>
  </div>`;
  Object.defineProperty(c, 'shadowRoot', { configurable: true, value: root });
  const calls = [];
  c._delugeAction = (hash, action, del) => { calls.push([hash, action, !!del]); };
  return { c, root, calls };
}

test('wired on every repaint, a Deluge button still sends one action per click', () => {
  const { c, root, calls } = card();
  for (let i = 0; i < 12; i++) c._wireActionButtons();
  root.querySelector('[data-dlg-action="resume"]').click();
  assert.deepEqual(calls, [['abc', 'resume', false]]);
  root.querySelector('.deluge-global-toggle').click();
  assert.equal(calls.length, 2, 'the pause-all toggle too');
});

test('the request is in the proxy\'s words', async (t) => {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = fn => real(fn, 0);
  t.after(() => { globalThis.setTimeout = real; });
  const c = makeCard();
  c._reRenderLeft = () => {};
  c._fetchDeluge = async () => {};
  const sent = [];
  c._callApi = async (m, path, body) => { sent.push(body); return { ok: true }; };
  await c._delugeAction('abc', 'resume');
  await c._delugeAction(null, 'resumeAll');
  await c._delugeAction('abc', 'delete', true);
  await c._delugeAction('abc', 'delete', false);
  assert.deepEqual(sent, [
    { action: 'resume', id: 'abc' },
    { action: 'global_resume', id: '' },
    { action: 'delete_files', id: 'abc' },
    { action: 'delete', id: 'abc' },
  ]);
});
