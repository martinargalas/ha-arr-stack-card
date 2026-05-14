#!/usr/bin/env node
import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const HA_WWW  = '/Volumes/Data/martinargalasxt/ha/config/www';
const HA_INT  = '/Volumes/Data/martinargalasxt/ha/config/custom_components/arr_stack';
const INT_SRC = resolve('./integration/custom_components/arr_stack');
const OUT_DIR = resolve('./output');

const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'arr-stack-card.js',
  // Žádná minifikace — chceme čitelný výstup pro debugging v HA
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});

if (watch) {
  await ctx.watch();
  console.log('👀 Watching src/ for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();

  // Deploy do HA
  copyFileSync('arr-stack-card.js', `${HA_WWW}/arr-stack-card.js`);
  console.log(`✓ Deployed JS → ${HA_WWW}/arr-stack-card.js`);

  cpSync(INT_SRC, HA_INT, { recursive: true });
  console.log(`✓ Deployed integration → ${HA_INT}`);

  // Kopie do output/
  mkdirSync(`${OUT_DIR}/custom_components/arr_stack`, { recursive: true });
  copyFileSync('arr-stack-card.js', `${OUT_DIR}/arr-stack-card.js`);
  cpSync(INT_SRC, `${OUT_DIR}/custom_components/arr_stack`, { recursive: true });
  console.log(`✓ Output → ${OUT_DIR}`);
}
