#!/usr/bin/env node
// Checks for method name collisions across all mixin files.
// Exits with code 1 if collisions found — called by build.js before esbuild.
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIXIN_FILES = [
  'src/fetch/index.js',
  'src/fetch/sessions.js',
  'src/fetch/downloads.js',
  'src/fetch/arr.js',
  'src/popup/index.js',
  'src/render/activity.js',
  'src/render/auto-search.js',
  'src/render/interactive-search-sonarr.js',
  'src/render/interactive-search.js',
  'src/render/jellystat-graphs.js',
  'src/render/jellystat-shared.js',
  'src/render/jellystat-table.js',
  'src/render/jellystat.js',
  'src/render/left.js',
  'src/render/media-cards.js',
  'src/render/prowlarr.js',
  'src/render/right.js',
  'src/render/tautulli-graphs.js',
  'src/render/tautulli-shared.js',
  'src/render/tautulli-table.js',
  'src/render/tautulli.js',
  'src/render/tracearr-table.js',
  'src/render/tracearr.js',
  'src/render/library.js',
  'src/wire/library.js',
  'src/styles/theme.js',
  'src/wire/activity.js',
  'src/wire/index.js',
  'src/wire/jellystat.js',
  'src/wire/prowlarr.js',
  'src/wire/tautulli.js',
  'src/wire/tracearr.js',
];

// Match class method definitions at 2-space indent — only _ -prefixed names (all mixin methods).
// Excludes JS keywords (if/try/for/return) which also appear at 2-space inside method bodies.
const METHOD_RE = /^  (?:async\s+|get\s+|set\s+)?(_[a-zA-Z0-9_$]+)\s*[({]/gm;

const seen = new Map(); // methodName → { file, line }
const collisions = [];

for (const relPath of MIXIN_FILES) {
  const absPath = resolve(relPath);
  const src = readFileSync(absPath, 'utf8');
  const lines = src.split('\n');

  for (const match of src.matchAll(METHOD_RE)) {
    const name = match[1];
    if (name === 'constructor') continue;

    // Find line number
    const lineIdx = src.slice(0, match.index).split('\n').length - 1;
    const loc = `${relPath}:${lineIdx + 1}`;

    if (seen.has(name)) {
      collisions.push({ name, first: seen.get(name), second: loc });
    } else {
      seen.set(name, loc);
    }
  }
}

if (collisions.length === 0) {
  console.log('✓ Mixin check: no collisions');
  process.exit(0);
} else {
  console.error(`\n⚠️  Mixin collisions found (${collisions.length}):`);
  for (const { name, first, second } of collisions) {
    console.error(`  ${name}`);
    console.error(`    first:  ${first}`);
    console.error(`    second: ${second}  ← wins (applied later)`);
  }
  console.error('');
  process.exit(1);
}
