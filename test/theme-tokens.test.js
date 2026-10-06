// The design tokens (#42). A colour reads its token with the colour it always
// had as the fallback, so a misspelt token name changes nothing on screen and
// no other test would notice — the setting just silently does nothing. These
// keep the names honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { STYLES } from '../src/styles/index.js';
import { TOKEN_CSS, COLOR_ROLES, SURFACE_TOKENS, STATUS_TOKENS, OPACITY_TOKENS, NAV_ROLES } from '../src/styles/tokens.js';

const internal = new Set([...COLOR_ROLES, ...SURFACE_TOKENS, ...OPACITY_TOKENS, ...NAV_ROLES].map(([id]) => `--_${id}`));

function sources(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.js') ? [p] : [];
  });
}

test('every internal token the card reads is one the columns define', () => {
  const unknown = new Set();
  for (const file of sources('src')) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/var\((--_[\w-]+)/g)) {
      if (!internal.has(name)) unknown.add(`${name} in ${file}`);
    }
  }
  assert.deepEqual([...unknown], []);
});

test('every internal colour is read with a fallback', () => {
  // Without one, a column that sets no token would draw that colour as
  // nothing at all — the token is undefined until someone sets it.
  const bare = [];
  for (const file of sources('src')) {
    if (file.endsWith('tokens.js')) continue;
    // Except for color, which is inherited: there an unset token means
    // "the colour of what it sits in", which is what an icon wants.
    for (const m of readFileSync(file, 'utf8').matchAll(/(color:\s*rgba?\()?var\((--_[\w-]+)\s*\)/g)) {
      if (!m[1]) bare.push(`${m[2]} in ${file}`);
    }
  }
  assert.deepEqual(bare, []);
});

test('status colours are read by their public names', () => {
  const used = new Set([...STYLES.matchAll(/var\(--arr-(\w+)-rgb/g)].map(m => m[1]));
  for (const s of STATUS_TOKENS) assert.ok(used.has(s), `--arr-${s}-rgb is never read`);
  const known = new Set([...STATUS_TOKENS, ...COLOR_ROLES.map(([, n]) => n)]);
  const strays = [...used].filter(n => !known.has(n));
  assert.deepEqual(strays, [], 'a public colour token the card does not define');
});

test('each column falls back to the whole card, and a role to its parent', () => {
  assert.ok(STYLES.includes(TOKEN_CSS));
  const right = TOKEN_CSS.split('.col-right')[1];
  assert.match(right, /--_fg: var\(--arr-right-text-rgb, var\(--arr-text-rgb\)\);/);
  assert.match(right, /--_fg2: var\(--arr-right-text-secondary-rgb, var\(--arr-text-secondary-rgb, var\(--_fg\)\)\);/);
  assert.match(right, /--_radius: var\(--arr-right-radius, var\(--arr-radius\)\);/);
});

test('the keys from before the tokens set the tokens that took over', async () => {
  const { makeCard } = await import('./harness.js');
  const card = makeCard();
  card._config = { ...(card._config || {}), styles: { primaryTextColor: '#102030', pagingButtonTextColor: '#ff0000' } };
  let sheet = null;
  Object.defineProperty(card, 'shadowRoot', { configurable: true, value: {
    getElementById: () => sheet,
    appendChild: el => { sheet = el; },
  } });
  card._applyTheme();
  const css = sheet.textContent;
  assert.match(css, /--arr-text-rgb: 16, 32, 48;/);
  assert.match(css, /--arr-right-button-text-rgb: 255, 0, 0;/);
});

import { styleDeclarations, toRgbTriplet, STYLE_PRESETS } from '../src/styles/tokens.js';

test('a colour is read from hex, rgb() or a triplet, and its alpha dropped', () => {
  assert.equal(toRgbTriplet('#E6E6E6'), '230, 230, 230');
  assert.equal(toRgbTriplet('#0af'), '0, 170, 255');
  assert.equal(toRgbTriplet('#0af8'), '0, 170, 255');
  assert.equal(toRgbTriplet('rgba(10, 20, 30, 0.4)'), '10, 20, 30');
  assert.equal(toRgbTriplet('10,20,30'), '10, 20, 30');
  assert.equal(toRgbTriplet('var(--rgb-primary-color)'), 'var(--rgb-primary-color)');
  assert.equal(toRgbTriplet('300, 0, 0'), null);
  assert.equal(toRgbTriplet('red'), null);
});

test('styles: sets the whole card, a column, and lengths in pixels', () => {
  const { decls, bad } = styleDeclarations({
    text: '#ffffff', radius: 12, blur: 0, shine: 35, gap: 6, accent: 'rgb(255, 0, 128)',
    right: { background: 'rgba(20, 20, 30, 0.8)', heading: '#f00' },
  });
  assert.deepEqual(bad, []);
  for (const d of [
    '--arr-text-rgb: 255, 255, 255;', '--arr-radius: 12px;', '--arr-blur: none;', '--arr-shine: 0.35;',
    '--arr-gap: 6px;', '--arr-accent-rgb: 255, 0, 128;',
    '--arr-right-background: rgba(20, 20, 30, 0.8);', '--arr-right-heading-rgb: 255, 0, 0;',
  ]) assert.ok(decls.includes(d), d);
});

test('a preset starts the keys, and a key the user sets wins', () => {
  const { decls } = styleDeclarations({ preset: 'ha', radius: 4 });
  assert.ok(decls.includes('--arr-radius: 4px;'));
  assert.ok(decls.includes(`--arr-text-rgb: ${STYLE_PRESETS.ha.text};`));
  assert.ok(!decls.some(d => d.includes('ha-card-border-radius')));
  assert.deepEqual(styleDeclarations({ preset: 'glass' }).decls, []);
});

test('the palette presets read in full, card and modals, and the user still wins', () => {
  for (const name of ['nord', 'catppuccin', 'cinema']) {
    const { decls, bad } = styleDeclarations({ preset: name });
    assert.deepEqual(bad, [], name);
    for (const t of ['--arr-background:', '--arr-accent-rgb:', '--arr-heading-rgb:', '--arr-modal-background:', '--arr-modal-nav-active:', '--arr-modal-grab-rgb:', '--arr-modal-day-background:']) {
      assert.ok(decls.some(d => d.startsWith(t)), `${name} ${t}`);
    }
  }
  const { decls } = styleDeclarations({ preset: 'cinema', accent: '#00ff00' });
  assert.ok(decls.includes('--arr-accent-rgb: 0, 255, 0;'));
});

test('a preset may shape one side, and what the user sets for that side wins', () => {
  STYLE_PRESETS.__t = { left: { text: '#111111', heading: '#222222' } };
  try {
    const { decls } = styleDeclarations({ preset: '__t', left: { text: '#ffffff' } });
    assert.ok(decls.includes('--arr-left-text-rgb: 255, 255, 255;'));
    assert.ok(decls.includes('--arr-left-heading-rgb: 34, 34, 34;'));
  } finally { delete STYLE_PRESETS.__t; }
});

test('what cannot be read is named, and nothing closes the style rule', () => {
  const { decls, bad } = styleDeclarations({ text: 'reddish', preset: 'neon', left: { line: '#12' }, background: 'red; } * { display:none' });
  assert.deepEqual(bad.sort(), ['left.line', 'preset: neon', 'text'].sort());
  assert.ok(decls.every(d => !/[{}<>]/.test(d) && d.split(';').length === 2), decls.join(' '));
});

test('the new key wins over the one it replaced', async () => {
  const { makeCard } = await import('./harness.js');
  const card = makeCard();
  card._config = { ...(card._config || {}), styles: { primaryTextColor: '#000000', text: '#ffffff' } };
  let sheet = null;
  Object.defineProperty(card, 'shadowRoot', { configurable: true, value: {
    getElementById: () => sheet, appendChild: el => { sheet = el; },
  } });
  card._applyTheme();
  const css = sheet.textContent;
  assert.ok(css.indexOf('--arr-text-rgb: 0, 0, 0;') < css.indexOf('--arr-text-rgb: 255, 255, 255;'));
});

test('modals: night and day palettes are separate, and their corners are night only', () => {
  const { decls, bad } = styleDeclarations({
    modal: { text: '#eeeeee', background: '#111', radius: 10, blur: 0 },
    modalDay: { text: '#222222', radius: 4 },
  });
  assert.deepEqual(bad, []);
  for (const d of ['--arr-modal-text-rgb: 238, 238, 238;', '--arr-modal-background: #111;', '--arr-modal-radius: 10px;',
                   '--arr-modal-blur: none;', '--arr-modal-day-text-rgb: 34, 34, 34;']) assert.ok(decls.includes(d), d);
  assert.ok(!decls.some(d => d.startsWith('--arr-modal-day-radius')));
});

test('the modal palette reads the modal tokens, by night and by day', () => {
  const night = STYLES.slice(STYLES.indexOf('/* ── Popup day/night'), STYLES.indexOf('.popup-overlay.popup-day {\n        --is-overlay-bg'));
  assert.match(night, /--is-text:\s+rgba\(var\(--arr-modal-text-rgb, 255, 255, 255\), 1\)/);
  assert.match(night, /--is-glass-bg:\s+var\(--arr-modal-background,/);
  const day = STYLES.slice(STYLES.indexOf('.popup-overlay.popup-day {\n        --is-overlay-bg'));
  assert.match(day, /--is-text:\s+rgba\(var\(--arr-modal-day-text-rgb, 0, 0, 0\), 0.88\)/);
  assert.match(TOKEN_CSS, /\.popup-overlay\.popup-day \{\s+--_fg: var\(--arr-modal-day-text-rgb\);/);
});

test('the old modal keys set both palettes', async () => {
  const { makeCard } = await import('./harness.js');
  const card = makeCard();
  card._config = { ...(card._config || {}), styles: { modalHeadingTextColor: '#ff0000', modalBackgroundColor: '#000000' } };
  let sheet = null;
  Object.defineProperty(card, 'shadowRoot', { configurable: true, value: {
    getElementById: () => sheet, appendChild: el => { sheet = el; },
  } });
  card._applyTheme();
  const css = sheet.textContent;
  for (const d of ['--arr-modal-text-rgb: 255, 0, 0;', '--arr-modal-day-text-rgb: 255, 0, 0;', '--arr-modal-background: rgba(0, 0, 0, 0.30);'])
    assert.ok(css.includes(d), d);
  assert.ok(!css.includes('.popup-title'), 'no per-class !important rules any more');
});

test('icons: a capsule behind them, a colour, and real logos in that colour', async () => {
  const { decls } = styleDeclarations({ icon: '#ffd60a', iconRadius: 8, iconPadding: 3, right: { iconBackground: 'rgba(255,255,255,0.1)' } });
  for (const d of ['--arr-icon-rgb: 255, 214, 10;', '--arr-icon-radius: 8px;', '--arr-icon-padding: 3px;', '--arr-right-icon-background: rgba(255,255,255,0.1);'])
    assert.ok(decls.includes(d), d);
  const { makeCard } = await import('./harness.js');
  const card = makeCard();
  card._config = { ...(card._config || {}), styles: {} };
  assert.match(card._appIcon('radarr', 24), /^<span class="app-ico"><img src="[^"]*radarr\.svg"/);
  card._config.styles = { iconStyle: 'mono' };
  assert.match(card._appIcon('radarr', 24), /^<span class="app-ico"><span class="app-ico-mask" style="width:24px;height:24px;--ico-url:url\('[^']*radarr\.svg'\)">/);
  assert.equal(card._appIcon('nonexistent', 24), '');
});

test('opacity: percentages in styles:, factors on the alpha the card gives each surface', () => {
  const { decls, bad } = styleDeclarations({ boxOpacity: 50, lineOpacity: '150%', tintOpacity: 180, left: { controlOpacity: 0 } });
  assert.deepEqual(bad, []);
  for (const d of ['--arr-box-opacity: 0.5;', '--arr-line-opacity: 1.5;', '--arr-tint-opacity: 1;', '--arr-left-control-opacity: 0;'])
    assert.ok(decls.includes(d), d);
  assert.match(STYLES, /\.vpn-bar \{[^}]*calc\(0\.08 \* var\(--_a-box, 1\)\)/);
  assert.match(TOKEN_CSS, /--_a-ctl: var\(--arr-left-control-opacity, var\(--arr-control-opacity\)\);/);
});

test('the modal menu: its own colours by night and by day', () => {
  const { decls, bad } = styleDeclarations({
    modal: { navBackground: '#101018', navActive: 'rgba(255, 45, 120, 0.9)', subActiveText: '#fff' },
    modalDay: { navText: '#333' },
  });
  assert.deepEqual(bad, []);
  for (const d of ['--arr-modal-nav-background: #101018;', '--arr-modal-nav-active: rgba(255, 45, 120, 0.9);',
                   '--arr-modal-sub-active-text: #fff;', '--arr-modal-day-nav-text: #333;']) assert.ok(decls.includes(d), d);
  assert.match(TOKEN_CSS, /\.popup-overlay\.popup-day \{[^}]*--_nav-fg: var\(--arr-modal-day-nav-text\);/);
  assert.match(STYLES, /\.mt-nav-btn\.is-on \{ color: var\(--_nav-on-fg,/);
});

test('modals: toolbar, buttons, switches and progress take tokens by night and by day', async () => {
  const { decls, bad } = styleDeclarations({
    modal: { toolbar: '#111', filter: '#ff2d78', button: 'rgba(255,255,255,0.1)', switchOn: '#30d158', progressFill: '#ffd60a' },
    modalDay: { buttonText: '#222' },
  });
  assert.deepEqual(bad, []);
  for (const d of ['--arr-modal-toolbar: #111;', '--arr-modal-filter: #ff2d78;', '--arr-modal-switch-on: #30d158;',
                   '--arr-modal-progress-fill: #ffd60a;', '--arr-modal-day-button-text: #222;']) assert.ok(decls.includes(d), d);
  assert.match(STYLES, /--is-btn-bg:\s+var\(--arr-modal-button, /);
  assert.match(STYLES, /--is-btn-clr:\s+var\(--arr-modal-day-button-text, /);
  assert.match(STYLES, /\.mt-tb-sel \{[^}]*color: var\(--_flt, #4da3ff\)/);
  const { makeCard } = await import('./harness.js');
  const card = makeCard();
  assert.equal(card._uiSwitch('data-x', true), '<button data-x title="" class="ui-sw is-on"><span class="ui-sw-k"></span></button>');
});

test('search results: one colour per chip, by night and by day', () => {
  const { decls, bad } = styleDeclarations({ modal: { quality4k: '#ff00ff', grab: 'rgb(1, 2, 3)', searchDownloading: '#3b82f6' }, modalDay: { seeds: '#008800' } });
  assert.deepEqual(bad, []);
  for (const d of ['--arr-modal-quality-4k-rgb: 255, 0, 255;', '--arr-modal-grab-rgb: 1, 2, 3;',
                   '--arr-modal-search-downloading-rgb: 59, 130, 246;', '--arr-modal-day-seeds-rgb: 0, 136, 0;']) assert.ok(decls.includes(d), d);
  assert.match(STYLES, /--is-q4k-clr: rgba\(var\(--arr-modal-quality-4k-rgb, 210,140,255\), 0.95\)/);
  assert.match(STYLES, /--is-src-tor-bg: rgba\(var\(--arr-modal-torrent-rgb, var\(--arr-success-rgb, 48, 209, 88\)\), 0.18\)/);
  assert.match(STYLES, /\.as-dl-bar-fill \{[^}]*rgba\(var\(--_as-dl, 59, 130, 246\), 0.8\)/);
});
