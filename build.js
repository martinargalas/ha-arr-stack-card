#!/usr/bin/env node
// Builds arr-stack-card.js from src/.
//
// On the maintainer's machine it also deploys: the card and the integration
// into Home Assistant, and both into the release checkouts under output/.
// Home Assistant's paths come from build.local.json (not committed) or the
// ARR_HA_WWW / ARR_HA_INT environment variables; without them, and without
// integration/ or output/, the build stops at the bundle.
import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { execFileSync } from 'child_process';

let local = {};
try { local = JSON.parse(readFileSync('build.local.json', 'utf8')); } catch (_) {}
const HA_WWW  = process.env.ARR_HA_WWW || local.haWww || null;
const HA_INT  = process.env.ARR_HA_INT || local.haInt || null;
const INT_SRC = resolve('./integration/custom_components/arr_stack');
const OUT_DIR = resolve('./output');
const hasIntegration = existsSync(INT_SRC);

const watch = process.argv.includes('--watch');
// The bundle's name on the maintainer's Home Assistant, behind the dev loader
const DEV_BUNDLE = 'arr-stack-card.bundle.js';

// Read version from VERSION file — update this file on each release
let cardVersion = 'dev';
try { cardVersion = readFileSync('VERSION', 'utf8').trim(); } catch (_) {}

// Mixin collision check — exits with code 1 if collisions found
try {
  execFileSync(process.execPath, ['check-mixins.js'], { stdio: 'inherit' });
} catch {
  process.exit(1);
}

// Tracearr, Tautulli, Jellystat, Prowlarr, Maintainerr and the editor are
// dynamic imports, split into files of their own (#36, see src/card.js).
// - Flat, beside the entry: HACS installs a card from its release assets, which
//   cannot hold folders, and from a repository tree it takes the root and dist/
//   only — a chunk in a subfolder would never reach a user.
// - Named with a content hash: Home Assistant serves /hacsfiles/ with a
//   month-long cache, and the resource's ?v= reaches the entry, never what it
//   imports.
const CHUNK_NAMES = 'arr-stack-card-[name]-[hash]';
const IS_CHUNK = /^arr-stack-card-[a-z0-9-]+-[A-Z0-9]{8}\.js$/;
// The chunks of earlier builds, and the folder a first draft of this put them
// in. Matched by exact shape, so nothing else in a www/ folder is touched.
const clearChunks = dir => {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) if (IS_CHUNK.test(f)) rmSync(`${dir}/${f}`);
  rmSync(`${dir}/arr-stack-card-chunks`, { recursive: true, force: true });
};
const chunkFiles = () => readdirSync('.').filter(f => IS_CHUNK.test(f));
if (!watch) clearChunks('.');

const SHARED = {
  bundle: true,
  format: 'esm',
  // Whitespace and syntax only: identifiers keep their names, so a stack trace
  // in a user's bug report still says which method failed. Full minification
  // would save another ~7% and cost that.
  minifyWhitespace: true,
  minifySyntax: true,
  sourcemap: false,
  define: { __CARD_VERSION__: JSON.stringify(cardVersion) },
};

// Every window is bundled on its own, rather than by esbuild's code splitting.
// Splitting moves what the entry and the windows share into a third file that
// the entry then imports *statically* — and an entry that arrives without that
// file does not load at all. HACS installs the entry on its own whenever it
// falls back to its single-file path (repositories/plugin.py sets
// content.single as soon as a release asset matches the name in hacs.json), so
// the entry has to stand alone. The price is the shared helpers duplicated into
// each window; they are small, and they are only ever fetched on demand.
const LAZY = [
  ...readdirSync('src/chunks').filter(f => f.endsWith('.js'))
    .map(f => [`./chunks/${f}`, `src/chunks/${f}`, f.replace(/\.js$/, '')]),
  ['./editor.js', 'src/editor.js', 'editor'],
];

async function buildAll() {
  clearChunks('.');
  const built = new Map();
  for (const [specifier, entry, name] of LAZY) {
    const out = await esbuild.build({
      ...SHARED, entryPoints: [entry], outdir: '.',
      entryNames: `arr-stack-card-${name}-[hash]`, metafile: true, logLevel: 'silent',
    });
    const file = Object.keys(out.metafile.outputs).find(p => p.endsWith('.js'));
    built.set(specifier, file.replace(/^.*\//, ''));
  }
  // The entry asks for the names just built and does not bundle them in
  const lazyWindows = {
    name: 'lazy-windows',
    setup(build) {
      build.onResolve({ filter: /^\.\/(chunks\/|editor\.js$)/ }, args => {
        const file = built.get(args.path);
        return file ? { path: `./${file}`, external: true } : null;
      });
    },
  };
  await esbuild.build({
    ...SHARED, entryPoints: { 'arr-stack-card': 'src/index.js' }, outdir: '.',
    entryNames: '[name]', plugins: [lazyWindows], logLevel: 'info',
  });
  return built;
}

if (watch) {
  await buildAll();
  console.log('👀 Watching src/ for changes...');
  const { watch: fsWatch } = await import('fs');
  let pending;
  fsWatch('src', { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(() => buildAll().then(() => console.log('✓ rebuilt')).catch(e => console.error(e)), 150);
  });
} else {
  await buildAll();

  // Sync strings.json → translations/en.json
  if (hasIntegration) copyFileSync(`${INT_SRC}/strings.json`, `${INT_SRC}/translations/en.json`);

  // The entry and its chunks travel together. Old chunks go first: their names
  // are hashed, so stale ones would never be overwritten, only pile up.
  const deployCard = (dir, entry = 'arr-stack-card.js') => {
    clearChunks(dir);
    copyFileSync('arr-stack-card.js', `${dir}/${entry}`);
    for (const f of chunkFiles()) copyFileSync(f, `${dir}/${f}`);
  };

  // Deploy do HA
  // On Home Assistant the bundle goes in under its own name; arr-stack-card.js
  // there is the development loader written below
  if (HA_WWW) {
    deployCard(HA_WWW, DEV_BUNDLE);
    console.log(`✓ Deployed JS → ${HA_WWW}/${DEV_BUNDLE} (+ ${chunkFiles().length} chunks)`);
  }
  if (HA_INT && hasIntegration) {
    cpSync(INT_SRC, HA_INT, { recursive: true });
    console.log(`✓ Deployed integration → ${HA_INT}`);
  }

  // Development only, never released. On the maintainer's Home Assistant the
  // file the dashboard resource names, arr-stack-card.js, is a loader: on every
  // page load it asks for this build's version, uncached, and imports the bundle
  // under it (arr-stack-card.bundle.js?v=<hash>). A new build reaches the
  // browser on a plain reload, with no bump of the resource's ?v= — which the
  // Home Assistant MCP cannot do from Claude Code — and without changing the
  // resource either; an unchanged build stays cached. The version is a hash of
  // the bundle, which covers its chunks, whose names are hashed.
  if (HA_WWW) {
    const version = createHash('sha256').update(readFileSync('arr-stack-card.js')).digest('hex').slice(0, 12);
    writeFileSync(`${HA_WWW}/arr-stack-card.version`, version + '\n');
    const loader = `// Development loader for the Arr Stack Card, written by build.js — see there.
const v = await fetch('/local/arr-stack-card.version', { cache: 'no-store' })
  .then(r => (r.ok ? r.text() : ''))
  .catch(() => '');
await import(\`/local/${DEV_BUNDLE}?v=\${encodeURIComponent(v.trim() || Date.now())}\`);
`;
    // Under both names: the resource may point at either
    for (const name of ['arr-stack-card.js', 'arr-stack-card-dev.js']) writeFileSync(`${HA_WWW}/${name}`, loader);
    console.log(`✓ Dev loader → ${HA_WWW}/arr-stack-card.js (version ${version})`);
  }

  // output/ holds the release checkouts, so only main writes there. A feature
  // branch's build left in them goes out with main's next release: a split build
  // almost did, while v1.9.2 was still meant to ship as one file.
  let branch = '';
  try { branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(); } catch (_) {}
  const releaseTree = !branch || branch === 'main';
  if (existsSync(OUT_DIR) && !releaseTree) console.log(`• Output skipped — ${branch} is not main`);

  // Kopie do output/
  if (existsSync(OUT_DIR) && releaseTree) {
    deployCard(OUT_DIR);
    if (existsSync(`${OUT_DIR}/ha-arr-stack-card`)) deployCard(`${OUT_DIR}/ha-arr-stack-card`);
    if (hasIntegration) {
      mkdirSync(`${OUT_DIR}/custom_components/arr_stack`, { recursive: true });
      cpSync(INT_SRC, `${OUT_DIR}/custom_components/arr_stack`, { recursive: true });
      if (existsSync(`${OUT_DIR}/arr-stack-integration`)) cpSync(INT_SRC, `${OUT_DIR}/arr-stack-integration/custom_components/arr_stack`, { recursive: true });
    }
    console.log(`✓ Output → ${OUT_DIR}`);
  }
}
