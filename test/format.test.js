// Sizes: one formatter, counting in powers of 1024 like the apps themselves.
import test from 'node:test';
import assert from 'node:assert';
import { fmtBytes } from '../src/shared/format.js';

const GiB = 1024 ** 3;

test('a size reads the number Radarr shows for it', () => {
  // 4 000 000 000 bytes: Radarr says 3.7 GiB. The Interactive Search used to
  // say 4.0 GB for the very same release.
  assert.strictEqual(fmtBytes(4e9), '3.7 GB');
  assert.strictEqual(fmtBytes(4 * GiB), '4.0 GB');
});

test('each unit takes over at 1024 of the one below', () => {
  assert.strictEqual(fmtBytes(512), '512 B');
  assert.strictEqual(fmtBytes(2048), '2 KB');
  assert.strictEqual(fmtBytes(700 * 1024 ** 2), '700 MB');
  assert.strictEqual(fmtBytes(1.5 * GiB), '1.5 GB');
  assert.strictEqual(fmtBytes(2.25 * 1024 ** 4), '2.3 TB');
});

test('decimals apply from GB up', () => {
  assert.strictEqual(fmtBytes(1.5 * GiB, { dec: 0 }), '2 GB');
  assert.strictEqual(fmtBytes(2.25 * 1024 ** 4, { dec: 2 }), '2.25 TB');
  assert.strictEqual(fmtBytes(700 * 1024 ** 2, { dec: 2 }), '700 MB');
});

test('nothing reads as the caller says', () => {
  for (const v of [0, null, undefined, NaN, 'x', -5]) assert.strictEqual(fmtBytes(v), '—');
  assert.strictEqual(fmtBytes(0, { empty: '0 MB' }), '0 MB');
});

test('a numeric string counts', () => {
  assert.strictEqual(fmtBytes(String(4 * GiB)), '4.0 GB');
});
