// The detail popup renders exactly as it did when the snapshots were written.
// They pin the template while _renderPopup is taken apart: every part moved out
// must leave every byte of the output where it was. After a deliberate change
// to the popup's look, rewrite them with: node test/write-popup-snapshots.mjs
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { SCENARIOS, renderScenario } from './popup-scenarios.js';

for (const name of Object.keys(SCENARIOS)) {
  test(`detail popup: ${name}`, () => {
    const want = readFileSync(new URL(`./fixtures/popup/${name}.html`, import.meta.url), 'utf8');
    const got = renderScenario(name);
    if (got !== want) {
      let i = 0;
      while (i < got.length && got[i] === want[i]) i++;
      assert.fail(`differs at char ${i}:\n  want …${JSON.stringify(want.slice(Math.max(0, i - 60), i + 60))}\n  got  …${JSON.stringify(got.slice(Math.max(0, i - 60), i + 60))}`);
    }
  });
}
