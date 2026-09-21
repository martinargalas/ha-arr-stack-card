// Tracearr, Tautulli, Jellystat, Prowlarr, Maintainerr and the editor are fetched
// the first time they are needed (#36). Two things keep that working: the loader
// itself, and the line between core and the chunks. Core may reach into a chunk
// only through an entry listed in card.js — anything else throws "is not a
// function" for every user who has not opened that modal yet, and no test that
// preloads the chunks (as the harness does) would ever notice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import * as esbuild from 'esbuild';
import { installLazy } from '../src/shared/lazy.js';
import { makeCard } from './harness.js';

const apply = (proto, mixin) => {
  for (const k of Object.getOwnPropertyNames(mixin)) Object.defineProperty(proto, k, Object.getOwnPropertyDescriptor(mixin, k));
};

test('an entry fetches its chunk once, then is the real method', async () => {
  let fetched = 0;
  const proto = {};
  const real = { _openX(what) { return `${what} on ${this.id}`; } };
  const lazy = installLazy(proto, { x: { load: async () => { fetched++; return { default: [real] }; }, entries: ['_openX'] } }, apply);
  const card = Object.create(proto);
  card.id = 'c1';
  const stub = proto._openX;

  const both = await Promise.all([card._openX('one'), card._openX('two')]);
  assert.deepEqual(both, ['one on c1', 'two on c1'], 'arguments and this reach the real method');
  assert.equal(fetched, 1, 'two presses while it loads share one fetch');
  assert.notEqual(proto._openX, stub, 'the stub has been replaced');
  assert.equal(card._openX('three'), 'three on c1', 'and the method answers synchronously again');
  await lazy.load('x');
  assert.equal(fetched, 1);
});

test('a chunk that fails to load says so, and the next press tries again', async () => {
  let attempt = 0;
  const told = [];
  const proto = { _chunkFailed(name, err) { told.push([name, err.message]); } };
  installLazy(proto, {
    x: { load: async () => { if (++attempt === 1) throw new Error('404'); return { default: [{ _openX() { return 'ok'; } }] }; }, entries: ['_openX'] },
  }, apply);
  const card = Object.create(proto);
  await assert.rejects(card._openX(), /404/);
  assert.deepEqual(told, [['x', '404']], 'the card is told, so it can ask for a reload');
  assert.equal(await card._openX(), 'ok', 'a failed fetch is not remembered');
  assert.equal(attempt, 2);
});

test('a chunk that lacks its entry throws instead of calling itself forever', async () => {
  const proto = {};
  installLazy(proto, { x: { load: async () => ({ default: [{ _other() {} }] }), entries: ['_openX'] } }, apply);
  await assert.rejects(Object.create(proto)._openX(), /does not define _openX/);
});

// ── The line between core and the chunks ──────────────────────────────────────

const OPTIONAL = /^src\/(?:(?:render|wire)\/(?:(tracearr|tautulli|jellystat|prowlarr|maintainerr)(?!-tiles)[\w-]*|(activity|library)(?!-tiles)[\w-]*|music(?!-cards|-rows)[\w-]*)|editor)\.js$/;

test('nothing from an optional module is fetched when the card loads', async () => {
  const { metafile } = await esbuild.build({
    entryPoints: { 'arr-stack-card': 'src/index.js' }, bundle: true, format: 'esm', splitting: true,
    outdir: 'out', entryNames: '[name]', chunkNames: 'chunks/[name]-[hash]',
    write: false, metafile: true, logLevel: 'silent', define: { __CARD_VERSION__: '"test"' },
  });
  const outs = metafile.outputs;
  // What the entry needs before it runs: itself and whatever it imports statically
  const startup = new Set();
  const walk = path => {
    if (startup.has(path)) return;
    startup.add(path);
    for (const imp of outs[path].imports) if (imp.kind === 'import-statement') walk(imp.path);
  };
  walk('out/arr-stack-card.js');
  const leaked = [...startup].flatMap(p => Object.keys(outs[p].inputs)).filter(f => OPTIONAL.test(f));
  assert.deepEqual(leaked, [], 'a static import pulls a whole module back into every load');

  const lazyLoads = outs['out/arr-stack-card.js'].imports.filter(i => i.kind === 'dynamic-import').length;
  assert.equal(lazyLoads, 9, 'eight modals and the editor');
});

test('core reaches into a chunk only through a listed entry', () => {
  const card = readFileSync('src/card.js', 'utf8');
  const entries = new Set([...card.matchAll(/entries:\s*\[([^\]]*)\]/g)].flatMap(m => [...m[1].matchAll(/'(_\w+)'/g)].map(x => x[1])));
  assert.ok(entries.size >= 5, 'the entries are read from card.js');

  // Tautulli's tables and graphs are shared with Tracearr and Jellystat, and
  // travel in their chunks too
  const KIT = new Set(['render/tautulli-shared.js', 'render/tautulli-graphs.js', 'wire/tautulli-graphs.js']);
  const owner = f => (KIT.has(f) ? 'kit'
    : (f.match(/^(?:render|wire)\/(tracearr|tautulli|jellystat|prowlarr|maintainerr)(?!-tiles)/)
      || f.match(/^(?:render|wire)\/(activity|library)(?!-tiles)/)
      || (/^(?:render|wire)\/music(?!-cards|-rows)/.test(f) ? [, 'music'] : []) || [])[1] || 'core');
  const files = ['card.js', ...['render', 'wire', 'fetch', 'popup'].flatMap(d => readdirSync(`src/${d}`).filter(f => f.endsWith('.js')).map(f => `${d}/${f}`))];

  const defs = new Map();
  const methods = [];
  for (const f of files) {
    const src = readFileSync(`src/${f}`, 'utf8');
    const starts = [...src.matchAll(/^ {0,4}(?:async |static |get |set )?(_[A-Za-z0-9]+)\s*\(/gm)].map(m => ({ name: m[1], at: m.index }));
    starts.forEach((s, i) => {
      if (!defs.has(s.name)) defs.set(s.name, owner(f));
      methods.push({ file: f, own: owner(f), name: s.name, body: src.slice(s.at, starts[i + 1]?.at ?? src.length) });
    });
  }
  const bad = new Set();
  for (const m of methods) {
    for (const [, ref] of m.body.matchAll(/\.(_[A-Za-z0-9]+)\b/g)) {
      const to = defs.get(ref);
      if (!to || to === 'core' || to === m.own || entries.has(ref)) continue;
      if (to === 'kit' && ['tautulli', 'tracearr', 'jellystat'].includes(m.own)) continue;
      bad.add(`${m.own} → ${to}: ${m.file} ${m.name} calls ${ref}`);
    }
  }
  assert.deepEqual([...bad], [], 'move the method into core, or list it as an entry in card.js');
});

test('chunks are flat files beside the entry, which is all HACS installs', () => {
  // HACS installs a card from its release assets, which cannot hold folders, and
  // from a repository tree it takes only the root and dist/. A chunk anywhere
  // else is never downloaded, and the modal that needs it breaks for every user.
  const build = readFileSync('build.js', 'utf8');
  const names = build.match(/const CHUNK_NAMES = '([^']+)'/)?.[1];
  assert.ok(names, 'build.js names its chunks in CHUNK_NAMES');
  assert.ok(!names.includes('/'), `no folder in the chunk names: ${names}`);
  assert.ok(names.startsWith('arr-stack-card-'), 'prefixed, so a release upload of arr-stack-card*.js takes them all');
  assert.match(build, /chunkNames: CHUNK_NAMES/);
});

test("showing a title in the Library waits for the Library's own code to arrive", async () => {
  // The chunk arrives a tick later than the press, so anything reaching into the
  // modal has to wait for the opening to finish. Every other test preloads the
  // chunks, which is exactly why this one fakes the wait.
  const card = makeCard();
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<div data-lib-modal><div id="lib-body"></div></div>';
  Object.defineProperty(card, 'shadowRoot', { value: root, configurable: true });
  let open;
  const arrived = new Promise(r => { open = r; });
  card._openLibModal = () => arrived;
  const touched = [];
  card._libBodyHtml = () => { touched.push('body'); return ''; };
  card._wireLibModalBody = () => touched.push('wire');
  card._libFilteredItems = () => [];
  card._qaBlinkInLibrary = () => touched.push('blink');
  card._renderPopupEl = () => {};
  card._libModal = null;

  card._qaShowInLibrary({ _type: 'radarr', tmdbId: 1, title: 'X' }, null);
  assert.deepEqual(touched, [], 'nothing is drawn while the chunk is on its way');

  card._libModal = { page: 0, _perPage: 10 };
  open();
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(touched, ['body', 'wire', 'blink'], 'and it all happens once it is there');
});
