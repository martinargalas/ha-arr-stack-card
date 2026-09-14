// Writes the detail popup's snapshots from the code as it stands. Run once
// before a change that must not alter the output; the test compares against
// what this wrote.
import { writeFileSync } from 'fs';
import { SCENARIOS, renderScenario } from './popup-scenarios.js';
for (const name of Object.keys(SCENARIOS)) {
  const a = renderScenario(name), b = renderScenario(name);
  if (a !== b) { console.error(`${name}: two renders differ — not snapshot-safe`); process.exit(1); }
  writeFileSync(new URL(`./fixtures/popup/${name}.html`, import.meta.url), a);
  console.log(`${name.padEnd(22)} ${String(a.length).padStart(6)} chars`);
}
