# Contributing

Thanks for looking. Bug reports and pull requests are both welcome — open an issue first for anything large, so the approach can be agreed before you spend an evening on it.

## Building the card

The card's source is in [`src/`](src); `arr-stack-card.js` is built from it, together with the `arr-stack-card-*.js` files beside it that Home Assistant fetches the first time a module or the editor is opened.

```bash
npm install
npm run build   # src/ → arr-stack-card.js + arr-stack-card-*.js
npm test        # Node's own test runner against the source
```

Every file in `src/` is a mixin of one area (`fetch/` talks to the services, `render/` builds markup, `wire/` handles clicks, `popup/` is the title detail), and `check-mixins.js` fails the build if two of them define the same method. Translations live in `src/i18n.js`. Pull requests against `src/` are welcome — please leave the built `arr-stack-card*.js` files out of them; it is rebuilt on release.

## Translations

Every string lives in [`src/i18n.js`](src/i18n.js), with Czech, English and French side by side. A missing key falls back to English, so adding a language is a matter of copying the English block and translating it.

## Pull requests

- Work against `src/`, never against the built `arr-stack-card*.js` files — those are rebuilt on release and would only conflict.
- `npm test` has to pass. Tests live in [`test/`](test) and run on Node's own test runner, no browser needed.
- `npm run build` runs a check that no two mixins define the same method; it fails the build if they do.
- Keep a change to one area where you can. Each file in `src/` covers one: `fetch/` talks to the services, `render/` builds markup, `wire/` handles clicks, `popup/` is the title detail.
