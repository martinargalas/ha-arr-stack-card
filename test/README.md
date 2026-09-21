# Tests

```bash
npm test
```

Node's own runner, no framework. `harness.js` imports `src/card.js` into jsdom,
which is enough for the component to register, and hands out bare objects with
its prototype — so a test runs against the same code the browser gets rather
than a copy that could drift.

What is covered so far:

| File | What it holds the line on |
|---|---|
| `lists.test.js` | Which items a row shows: the Recommendations rotation, the type filters, suggestions held after an add |
| `escaping.test.js` | Titles and artist names from the *arrs cannot inject markup |
| `badges.test.js` | Rating fallbacks, stripe colours and where download progress is read from |
| `header.test.js` | The header filter, See More carrying it, date formatting, quality labels |
| `sections.test.js` | Every category renders, with data and without — a cold start is the normal state |
| `queues.test.js` | Download queues into badges: per-album and per-artist progress, what a deleted artist leaves behind |

The proxy has its own suite in [`integration/tests`](../integration/tests/README.md) —
`npm run test:py`, or `npm run test:all` for both.

Adding one: build a card with `makeCard({ ...state })`, call the method, and
assert on what it returns — `parse()` turns rendered markup into DOM so a test
can ask questions of it instead of matching strings. Add state to `baseState()`
in the harness only when a method genuinely reads it; a missing field surfaces
as a TypeError naming it, which is a better failure than a wrong answer.

These cover decisions, not layout. Anything that depends on real measurement —
how many rows fit, how tall a category is — still needs a browser.
