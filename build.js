#!/usr/bin/env node
// Builds arr-stack-card.js from src/.
//
// On the maintainer's machine it also deploys: the card and the integration
// into Home Assistant, and both into the release checkouts under output/.
// Home Assistant's paths come from build.local.json (not committed) or the
// ARR_HA_WWW / ARR_HA_INT environment variables; without them, and without
// integration/ or output/, the build stops at the bundle.
import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, existsSync, readFileSync } from 'fs';
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

// Read version from VERSION file — update this file on each release
let cardVersion = 'dev';
try { cardVersion = readFileSync('VERSION', 'utf8').trim(); } catch (_) {}

// Mixin collision check — exits with code 1 if collisions found
try {
  execFileSync(process.execPath, ['check-mixins.js'], { stdio: 'inherit' });
} catch {
  process.exit(1);
}

const ctx = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'arr-stack-card.js',
  // Whitespace and syntax only: identifiers keep their names, so a stack trace
  // in a user's bug report still says which method failed. Full minification
  // would save another ~7% and cost that.
  minifyWhitespace: true,
  minifySyntax: true,
  sourcemap: false,
  logLevel: 'info',
  define: { __CARD_VERSION__: JSON.stringify(cardVersion) },
});

if (watch) {
  await ctx.watch();
  console.log('👀 Watching src/ for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();

  // Sync strings.json → translations/en.json
  if (hasIntegration) copyFileSync(`${INT_SRC}/strings.json`, `${INT_SRC}/translations/en.json`);

  // Deploy do HA
  if (HA_WWW) {
    copyFileSync('arr-stack-card.js', `${HA_WWW}/arr-stack-card.js`);
    console.log(`✓ Deployed JS → ${HA_WWW}/arr-stack-card.js`);
  }
  if (HA_INT && hasIntegration) {
    cpSync(INT_SRC, HA_INT, { recursive: true });
    console.log(`✓ Deployed integration → ${HA_INT}`);
  }

  // Kopie do output/
  if (existsSync(OUT_DIR)) {
    copyFileSync('arr-stack-card.js', `${OUT_DIR}/arr-stack-card.js`);
    if (existsSync(`${OUT_DIR}/ha-arr-stack-card`)) copyFileSync('arr-stack-card.js', `${OUT_DIR}/ha-arr-stack-card/arr-stack-card.js`);
    if (hasIntegration) {
      mkdirSync(`${OUT_DIR}/custom_components/arr_stack`, { recursive: true });
      cpSync(INT_SRC, `${OUT_DIR}/custom_components/arr_stack`, { recursive: true });
      if (existsSync(`${OUT_DIR}/arr-stack-integration`)) cpSync(INT_SRC, `${OUT_DIR}/arr-stack-integration/custom_components/arr_stack`, { recursive: true });
    }
    console.log(`✓ Output → ${OUT_DIR}`);
  }
}
