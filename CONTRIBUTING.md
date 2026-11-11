# Contributing

Thanks for looking. Bug reports and pull requests are both welcome — open an issue first for anything large, so the approach can be agreed before you spend an evening on it.

## Building the card

The card's source is in [`src/`](src). The build writes it to [`dist/`](dist): `arr-stack-card.js`, and beside it the `arr-stack-card-*.js` files Home Assistant fetches the first time a module or the editor is opened. The Marketplace (HACS before Home Assistant 2026.11) installs straight from `dist/`.

```bash
npm install
npm run build   # src/ → dist/arr-stack-card.js + dist/arr-stack-card-*.js
npm test        # Node's own test runner against the source
```

Every file in `src/` is a mixin of one area (`fetch/` talks to the services, `render/` builds markup, `wire/` handles clicks, `popup/` is the title detail), and `check-mixins.js` fails the build if two of them define the same method. Translations live in `src/i18n.js`. Pull requests against `src/` are welcome — please leave `dist/` out of them; it is rebuilt on release.

## Translations

Every string lives in [`src/i18n.js`](src/i18n.js), with Czech, English and French side by side. A missing key falls back to English, so adding a language is a matter of copying the English block and translating it.

## Pull requests

- Work against `src/`, never against `dist/` — it is rebuilt on release and would only conflict.
- `npm test` has to pass. Tests live in [`test/`](test) and run on Node's own test runner, no browser needed.
- `npm run build` runs a check that no two mixins define the same method; it fails the build if they do.
- Keep a change to one area where you can. Each file in `src/` covers one: `fetch/` talks to the services, `render/` builds markup, `wire/` handles clicks, `popup/` is the title detail.
- Some modules — Tracearr, Tautulli, Jellystat, Prowlarr, Maintainerr, Activity, the Library, the artist and album windows, the editor — are downloaded only when first opened. Code that is always loaded may call into one of them only through an entry point listed in `installLazy(...)` in `src/card.js`; anything else works in the tests and fails for a user who has not opened that window yet. [`test/lazy-chunks.test.js`](test/lazy-chunks.test.js) checks it.
- For anything visible, a screenshot in the pull request saves a round of questions.

## Look and feel

The card follows one visual language, and a change that looks right on its own can still stand out beside the rest. Before adding anything to the screen:

- **Capsules on glass.** Tags, chips and controls are rounded capsules on a dark, slightly translucent surface — like the device and user tags on a Now Playing poster. No full borders; where a surface needs an edge, a hairline.
- **One accent.** Colour is for meaning — a state, a warning, what something costs — not decoration. Blue marks the active control. A row of differently coloured labels reads as noise.
- **Short labels, values standing free.** "Title A–Z", not "Title (A–Z) Ascending"; a value does not need a box around it.
- **Never a native `<select>`.** The operating system draws it, and it looks like a placeholder in the middle of the card. Existing dropdowns keep the native element invisible behind a drawn trigger — copy one of those.
- **Say a thing once.** If the source and the result are the same, name it once.
- **New options start switched off**, so an update never changes what someone already sees.

When in doubt, put the new piece next to the closest existing one — a tag beside the tags, a chip in the row of chips — and match it.

