#!/usr/bin/env node
// Checks for method name collisions across all mixin files.
// Exits with code 1 if collisions found — called by build.js before esbuild.
//
// applyMixin copies each mixin's methods onto the card in import order, so two
// methods with one name do not fail: the later one silently replaces the
// earlier. This is the only thing that notices.
//
// The files are discovered rather than listed — a hand-kept list had fallen
// behind (music and Maintainerr were missing) — and methods are matched at
// either indent: several mixins declare them at column 0, which the old
// 2-space pattern never saw. Between the two, 521 methods went unchecked.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve('src');
const MIXIN_EXPORT = /export const \w+Mixin\s*=/;

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

// A method definition: `_name(args) {`, `async _name(...) {`, or a getter or
// setter, at column 0 or 2. Calls and property writes inside bodies sit deeper
// or lack the trailing brace on the same line.
const METHOD_RE = /^(?: {2})?(?:async\s+|get\s+|set\s+)?(_[a-zA-Z0-9_$]+)\s*\([^)\n]*\)\s*\{/gm;

const files = walk(ROOT)
  .filter(p => MIXIN_EXPORT.test(readFileSync(p, 'utf8')))
  .sort();

const seen = new Map();   // methodName → loc
const collisions = [];

for (const absPath of files) {
  const relPath = relative(process.cwd(), absPath);
  const src = readFileSync(absPath, 'utf8');
  const inFile = new Set();
  for (const match of src.matchAll(METHOD_RE)) {
    const name = match[1];
    // A getter and its setter share a name inside one file; that is not a clash.
    if (inFile.has(name)) continue;
    inFile.add(name);
    const loc = `${relPath}:${src.slice(0, match.index).split('\n').length}`;
    if (seen.has(name)) collisions.push({ name, first: seen.get(name), second: loc });
    else seen.set(name, loc);
  }
}

if (collisions.length === 0) {
  console.log(`✓ Mixin check: no collisions (${seen.size} methods in ${files.length} files)`);
  process.exit(0);
} else {
  console.error(`\n⚠️  Mixin collisions found (${collisions.length}):`);
  for (const { name, first, second } of collisions) {
    console.error(`  ${name}`);
    console.error(`    first:  ${first}`);
    console.error(`    second: ${second}`);
  }
  console.error('');
  process.exit(1);
}
