// The editor's Styles tab (#42): every design token from src/styles/tokens.js,
// grouped into categories that fold away. A colour has a spectrum picker and a
// field that takes a hex value, rgb() or "r, g, b"; × removes the key, so the
// colour goes back to what it inherits.
import { toRgbTriplet, STYLE_PRESETS } from './styles/tokens.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// [key, label, kind, default shown on the swatch, hint]
// kind: color (a triplet token), paint (any CSS colour or gradient), px, text, blur, shine
const TEXT = [
  ['text',          'Text',               'color', '#ffffff'],
  ['textSecondary', 'Secondary text',     'color', '#ffffff', 'Sizes, dates, metadata. Follows Text when unset.'],
  ['textMuted',     'Muted text',         'color', '#ffffff', 'Labels and empty states. Follows Secondary text.'],
  ['heading',       'Headings',           'color', '#ffffff', 'Column and section titles. Follows Text.'],
  ['headingLine',   'Heading line',       'color', '#ffffff', 'The bar beside a column title. Follows Headings.'],
];
const CONTROLS = [
  ['fill',      'Fills',              'color', '#ffffff', 'Rows, chips and tracks, drawn faintly.'],
  ['line',      'Lines and borders',  'color', '#ffffff'],
  ['button',    'Buttons',            'color', '#ffffff', 'Follows Fills.'],
  ['buttonText','Button text',        'color', '#ffffff', 'Follows Text.'],
  ['buttonIcon','Button icons',       'color', '#ffffff', 'Glyphs on buttons and paging arrows. Follows Icon colour if set, else the button text.'],
  ['pillText',  'Count pills',        'color', '#ffffff', 'The totals beside a section title.'],
  ['dot',       'Paging dots',        'color', '#ffffff'],
  ['dotActive', 'Current paging dot', 'color', '#ffffff', 'Follows Paging dots.'],
];
const SURFACE = [
  ['background',  'Background',   'paint',  '#121216', 'Any CSS colour, rgba() for transparency, or a gradient.'],
  ['border',      'Border',       'text',   '',        'Full CSS border, e.g. 1px solid #333 — or none.'],
  ['radius',      'Corner radius','px',     '34'],
  ['padding',     'Padding',      'text',   '',        'In px, or CSS like 8px 14px.'],
  ['blur',        'Blur',         'blur',   '35',      '0 turns the glass blur off.'],
  ['shine',       'Glass shine',  'shine',  '0.35'],
  ['panelShadow', 'Shadow',       'text',   '',        'Full CSS box-shadow, or none.'],
];
const ICONS = [
  ['icon',           'Icon colour',     'color', '#ffffff', 'MDI icons, the app logos when drawn in one colour, and the glyphs on buttons. Follows Headings.'],
  ['iconBackground', 'Icon background', 'paint', '#ffffff', 'A capsule behind each app icon — none by default.'],
  ['iconRadius',     'Icon corners',    'px',    '0',       'Large values make a circle.'],
  ['iconPadding',    'Icon padding',    'px',    '0',       'Room between the icon and its background.'],
];
// [key, label, 'pct', highest %, hint] — 100 % is the card as designed
const OPACITY = [
  ['boxOpacity',     'Boxes',              'pct', '200', 'VPN bar, disks, download lists, statistics tiles, paging capsules.'],
  ['controlOpacity', 'Controls',           'pct', '200', 'Buttons, sorting, the search field, request controls.'],
  ['lineOpacity',    'Lines and borders',  'pct', '200', 'Every border and divider, and the line beside a column title.'],
  ['trackOpacity',   'Progress tracks',    'pct', '200'],
  ['posterOpacity',  'Poster ground',      'pct', '200', 'Behind a poster, before and around its image.'],
  ['tagOpacity',     'Labels on posters',  'pct', '200'],
  ['tintOpacity',    'App colour tint',    'pct', '100', 'The glow in each app\'s colours behind a section (Category colour overlays, General).'],
];
const POSTER = [
  ['posterText', 'Text over posters', 'color', '#ffffff', 'Titles on the dark shade over an image. Stays light by default.'],
  ['shade',      'Image shade',       'color', '#000000', 'The darkening laid over posters and covers.'],
  ['shadow',     'Shadows',           'color', '#000000'],
];
const STATUS = [
  ['accent',  'Accent',  'color', '#0a84ff', 'Selected controls, links, progress.'],
  ['success', 'Success', 'color', '#30d158'],
  ['warning', 'Warning', 'color', '#ff9500'],
  ['error',   'Error',   'color', '#ff453a'],
  ['info',    'Info',    'color', '#60a5fa'],
];
const CARD = [
  ['gap',         'Gap between panels', 'px',   '12'],
  ['cardPadding', 'Card padding',       'text', '',  'In px, or CSS like 0 12px 8px.'],
];
// A modal's settings, grouped as the editor shows them; day and night each
// get the whole set
const MODAL_TEXT = day => [
  ['text',          'Text',             'color', day ? '#000000' : '#ffffff', 'Titles, values and table cells.'],
  ['textSecondary', 'Secondary text',   'color', day ? '#000000' : '#ffffff', 'Descriptions and table text. Follows Text.'],
  ['textMuted',     'Muted text',       'color', day ? '#000000' : '#ffffff', 'Labels and table headers. Follows Secondary text.'],
  ['fill',          'Fills',            'color', day ? '#000000' : '#ffffff', 'Row highlight, chips, cards inside a modal.'],
  ['line',          'Lines and borders','color', '#ffffff', 'Dividers, table rules, the window border.'],
];
const MODAL_WINDOW = day => [
  ['background',    'Background',      'paint', day ? '#ebeef5' : '#0a0a16'],
  ['overlay',       'Backdrop',        'paint', day ? '#ffffff' : '#000000', 'Behind the window.'],
  ['header',        'Header bar',      'paint', day ? '#f0f2ff' : '#0a0c16'],
  ['menu',          'Drop-down menus', 'paint', day ? '#f5f6ff' : '#18182a', 'Filter and column pickers, action menus.'],
  ['blur',          'Blur',            'blur',  day ? '40' : '35'],
  ['shine',         'Glass shine',     'shine', day ? '0.65' : '0.35'],
  ...(day ? [] : [['radius', 'Corner radius', 'px', '28']]),
];
// The menu across the top of a modal, and the items nested under a tab
const MENU = day => [
  ['navBackground', 'Background',          'paint', day ? '#f2f2f7' : '#18181f'],
  ['navBorder',     'Border line',         'paint', day ? '#e0e0e6' : '#3a3a44'],
  ['navText',       'Item',                'paint', day ? '#1c1c1e' : '#ffffff'],
  ['navActive',     'Active item',         'paint', '#0a84ff', 'The fill that slides to the chosen tab or option.'],
  ['navActiveText', 'Active item text',    'paint', '#ffffff'],
  ['subText',       'Sub-item',            'paint', day ? '#1c1c1e' : '#ffffff', 'The items under a tab, e.g. in Tracearr. Drawn at 65 % until hovered.'],
  ['subActive',     'Active sub-item',     'paint', day ? '#e5e5ea' : '#3a3a44'],
  ['subActiveText', 'Active sub-item text','paint', day ? '#1c1c1e' : '#ffffff'],
];
const TOOLBAR = day => [
  ['toolbar',           'Background',        'paint', day ? '#f2f2f7' : '#1c1c26'],
  ['toolbarBorder',     'Border and separators', 'paint', day ? '#e0e0e6' : '#3a3a44'],
  ['toolbarText',       'Text and icons',    'paint', day ? '#1c1c1e' : '#ffffff', 'Search field, pickers and buttons in the bar.'],
  ['toolbarActive',     'Toggle on',         'paint', '#0a84ff'],
  ['toolbarActiveText', 'Toggle on text',    'paint', '#ffffff'],
  ['filter',            'Active filter',     'paint', day ? '#0060df' : '#4da3ff', 'The value of a filter that narrows the list.'],
];
const BUTTONS = day => [
  ['button',           'Background',   'paint', day ? '#f2f2f7' : '#2a2a34'],
  ['buttonBorder',     'Border',       'paint', day ? '#e0e0e6' : '#44444e'],
  ['buttonText',       'Text',         'paint', day ? '#1c1c1e' : '#ffffff'],
  ['buttonHover',      'Hover',        'paint', day ? '#e5e5ea' : '#3a3a44'],
  ['buttonActive',     'Active',       'paint', '#0a84ff'],
  ['buttonActiveText', 'Active text',  'paint', day ? '#0050c8' : '#64b4ff'],
];
const SWITCHES = [
  ['switchOn',   'On',   'paint', '#0a84ff', 'Switches and ticked checkboxes.'],
  ['switchOff',  'Off',  'paint', '#3a3a44'],
  ['switchKnob', 'Knob and tick', 'paint', '#ffffff'],
];
const PROGRESS = day => [
  ['progressTrack', 'Track', 'paint', day ? '#e0e0e6' : '#3a3a44'],
  ['progressFill',  'Fill',  'paint', '#0a84ff', 'Playback position, season progress.'],
];
// Interactive Search's releases and the automatic search — in a film's or a
// series' detail, an album and Activity's season search. One colour per
// chip: its fill, rim and label are drawn from it.
const INTERACTIVE = [
  ['grab',               'Grab button',          'color', '#0a84ff'],
  ['grabDone',           'Grabbed',              'color', '#30d158'],
  ['grabFailed',         'Grab failed',          'color', '#ff9500'],
  ['quality4k',          '4K',                   'color', '#bf5af2', 'Quality chips; fill, rim and label come from one colour.'],
  ['quality1080',        '1080p',                'color', '#0a84ff'],
  ['quality720',         '720p',                 'color', '#5ac8fa'],
  ['torrent',            'Torrent',              'color', '#30d158'],
  ['usenet',             'Usenet',               'color', '#0a84ff'],
  ['scorePositive',      'Positive score',       'color', '#30d158'],
  ['scoreNegative',      'Negative score',       'color', '#ff453a'],
  ['rejected',           'Rejected',             'color', '#ff9500'],
  ['seeds',              'Seeds',                'color', '#30d158'],
  ['leechers',           'Leechers',             'color', '#ff453a'],
];
const AUTOMATIC = [
  ['searchDone',         'Found',                'color', '#4ade80', 'The badge on the search button once a release is found.'],
  ['searchDownloading',  'Downloading',          'color', '#3b82f6', 'The badge and the progress while it downloads.'],
];
// What every modal shares, then what only one of them has
const modalGroups = (ed, id, path, day) =>
  group(ed, `${id}.all`, 'All modals', sharedModalGroups(ed, `${id}.all`, path, day), true)
  + group(ed, `${id}.search`, 'Release search',
      '<div class="st-hint">Interactive Search and the automatic search, wherever they appear: a film\'s or series\' detail, an album, Activity\'s season search.</div>'
      + group(ed, `${id}.search.is`, 'Interactive Search', fields(ed, path, INTERACTIVE), true)
      + group(ed, `${id}.search.as`, 'Automatic search', fields(ed, path, AUTOMATIC), true), true);

const sharedModalGroups = (ed, id, path, day) =>
  group(ed, `${id}.window`,   'Window',               fields(ed, path, MODAL_WINDOW(day)), true)
  + group(ed, `${id}.text`,   'Text, tables and lines', fields(ed, path, MODAL_TEXT(day)), true)
  + group(ed, `${id}.menu`,   'Top menu',             fields(ed, path, MENU(day)), true)
  + group(ed, `${id}.tb`,     'Toolbar and filters',  fields(ed, path, TOOLBAR(day)), true)
  + group(ed, `${id}.btn`,    'Buttons',              fields(ed, path, BUTTONS(day)), true)
  + group(ed, `${id}.sw`,     'Switches and checkboxes', fields(ed, path, SWITCHES), true)
  + group(ed, `${id}.pg`,     'Progress bars',        fields(ed, path, PROGRESS(day)), true);

// Where a key lives in styles:, e.g. [] or ['left'] or ['modalDay']
const read = (ed, path, key) => {
  let o = ed._config?.styles || {};
  for (const p of path) o = o?.[p] || {};
  return o?.[key];
};

export function setStyle(styles, path, key, value) {
  const out = { ...(styles || {}) };
  let parent = out;
  for (const p of path) { parent[p] = { ...(parent[p] || {}) }; parent = parent[p]; }
  if (value === undefined || value === '') delete parent[key]; else parent[key] = value;
  // Fold away what the removal left empty
  for (let i = path.length; i > 0; i--) {
    let o = out;
    for (const p of path.slice(0, i - 1)) o = o[p];
    if (Object.keys(o[path[i - 1]]).length === 0) delete o[path[i - 1]];
  }
  return out;
}

function swatchHex(v, fallback) {
  const t = toRgbTriplet(v);
  if (!t || t.startsWith('var(')) return fallback;
  return '#' + t.split(',').map(n => (+n).toString(16).padStart(2, '0')).join('');
}

// The alpha of a colour as a percentage; null for what has none to change
// (a gradient, a theme variable).
function alphaOf(v) {
  const s = String(v ?? '').trim();
  if (!s) return 100;
  let m = s.match(/^rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([\d.]+)(%?))?\s*\)$/i);
  if (m) return m[1] == null ? 100 : Math.round(m[2] ? +m[1] : +m[1] * 100);
  m = s.match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) return 100;
  m = s.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/i);
  if (m) return Math.round(parseInt(m[1], 16) / 2.55);
  return null;
}

function compose(hex, a) {
  if (a >= 100) return hex;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a) / 100})`;
}

function field(ed, path, [key, label, kind, def, hint]) {
  const v = read(ed, path, key);
  const set = v != null && v !== '';
  const p = esc(path.join('.'));
  const attrs = `data-st-path="${p}" data-st-key="${key}" data-st-kind="${kind}"`;
  const clear = `<button class="st-clear" ${attrs} data-st-clear title="Reset to default"${set ? '' : ' hidden'}>×</button>`;
  // Every row has the same three slots — the field, a suffix (px, the
  // shine's value) and the reset — so the fields line up and match in width.
  let ctl, suffix = '';
  if (kind === 'color' || kind === 'paint') {
    const sw = kind === 'paint' && set && !/^#|^rgb/i.test(String(v)) ? def : swatchHex(v, def || '#ffffff');
    ctl = `<input type="color" class="st-swatch" ${attrs} value="${sw}"${set ? '' : ' data-unset'}>`
        + `<input type="text" class="st-text" ${attrs} value="${esc(set ? v : '')}" placeholder="${kind === 'color' ? 'hex or r, g, b' : 'CSS colour'}" spellcheck="false">`;
  } else if (kind === 'pct') {
    const n = set ? Math.round(+v) : 100;
    ctl = `<input type="range" class="st-range st-pct" ${attrs} min="0" max="${def}" step="5" value="${n}">`;
    suffix = `<span class="st-val">${n}%</span>`;
  } else if (kind === 'shine') {
    const n = set ? +v : +def;
    ctl = `<input type="range" class="st-range" ${attrs} min="0" max="1" step="0.05" value="${n}">`;
    suffix = `<span class="st-val">${n.toFixed(2)}</span>`;
  } else if (kind === 'px' || kind === 'blur') {
    ctl = `<input type="number" class="st-num" ${attrs} min="0" step="1" value="${set ? esc(v) : ''}" placeholder="${esc(def)}">`;
    suffix = 'px';
  } else {
    ctl = `<input type="text" class="st-text" ${attrs} value="${esc(set ? v : '')}" placeholder="default" spellcheck="false">`;
  }
  const row = `<div class="st-row"><span class="st-label">${label}</span><span class="st-ctl">`
    + `<span class="st-field">${ctl}</span><span class="st-suffix">${suffix}</span>${clear}</span></div>`;
  const help = hint ? `<div class="st-hint">${hint}</div>` : '';
  if (kind !== 'paint') return row + help;
  // A surface's colour gets its opacity beside it — the picker has none
  const a = set ? alphaOf(v) : 100;
  return `<div class="st-paint">${row}`
    + `<div class="st-row st-sub"><span class="st-label">Opacity</span><span class="st-ctl"><span class="st-field">`
    + `<input type="range" class="st-range st-alpha" min="0" max="100" step="1" value="${a ?? 100}"${a == null ? ' disabled title="Not for a gradient or a theme variable"' : ''}>`
    + `</span><span class="st-suffix"><span class="st-val">${a ?? 100}%</span></span><span class="st-clear" hidden></span></span></div></div>${help}`;
}

function group(ed, id, title, body, nested) {
  const open = ed._stOpen?.has(id) ? ' open' : '';
  const count = (body.match(/data-st-clear title="Reset to default">/g) || []).length;
  const badge = count ? `<span class="st-badge">${count}</span>` : '';
  return `<details class="st-group${nested ? ' st-nested' : ''}" data-st-group="${id}"${open}>`
    + `<summary>${title}${badge}</summary><div class="st-body">${body}</div></details>`;
}

const fields = (ed, path, list) => list.map(f => field(ed, path, f)).join('');

// Whole card, then each column, each folding on its own
function scoped(ed, id, list) {
  return group(ed, `${id}.card`, 'Whole card', fields(ed, [], list), true)
    + group(ed, `${id}.left`, 'Left panel', fields(ed, ['left'], list), true)
    + group(ed, `${id}.right`, 'Right panel', fields(ed, ['right'], list), true);
}

// One picker for which icons and in what colour — styles.applicationIcons
// (real | mdi) and styles.iconStyle (brand | mono) together
function iconStyleRow(ed) {
  const mdi = read(ed, [], 'applicationIcons') === 'mdi';
  const mono = read(ed, [], 'iconStyle') === 'mono';
  const v = mdi ? 'mdi' : mono ? 'mono' : 'brand';
  const opt = (val, label) => `<option value="${val}"${v === val ? ' selected' : ''}>${label}</option>`;
  return `<div class="st-row"><span class="st-label">App icons</span><span class="st-ctl"><span class="st-field">
      <select class="st-select" data-st-iconstyle>
        ${opt('brand', 'Real logos, own colours')}${opt('mono', 'Real logos, icon colour')}${opt('mdi', 'MDI icons, icon colour')}
      </select></span><span class="st-suffix"></span><span class="st-clear" hidden></span></span></div>
    <div class="st-hint">The icons beside the section titles. Real logos are the apps' own; MDI icons are plain glyphs.</div>`;
}

// general: the Appearance tab's own settings, shown as the first group
export function stylesTabHtml(ed, general = '') {
  // General starts open: it holds what the Appearance tab always showed
  ed._stOpen = ed._stOpen || new Set(['general']);
  const preset = read(ed, [], 'preset') || 'glass';
  const opt = (v, l) => `<option value="${v}"${preset === v ? ' selected' : ''}>${l}</option>`;
  return `
    <div class="section">
      <div class="row">
        <span class="row-label">Preset</span>
        <select data-st-preset>
          ${opt('glass', 'Glass (default)')}${opt('ha', 'Home Assistant theme')}${opt('solid', 'Solid')}${opt('nord', 'Nord')}${opt('catppuccin', 'Catppuccin')}${opt('cinema', 'Cinema')}
        </select>
      </div>
      <div class="hint">${{
        glass: 'The card as it has always looked: frosted glass over your dashboard.',
        ha: 'Background, border, corners, text and accent from your Home Assistant theme — modals included.',
        solid: 'Opaque and flat: no blur and no glass shine.',
        nord: 'Arctic frost: slate glass, frost-blue headings and icons, aurora status colours.',
        catppuccin: 'Soothing pastels: a mauve glow on a deep base, pink headings, rounder corners.',
        cinema: 'The dark of a theatre: a velvet-red glow from below, gold accents, sharper corners.',
      }[preset] || ''} Anything you set below wins over the preset.</div>
      ${general ? group(ed, 'general', 'General', general) : ''}
      ${group(ed, 'panels', 'Panels', scoped(ed, 'panels', SURFACE))}
      ${group(ed, 'text', 'Text', scoped(ed, 'text', TEXT))}
      ${group(ed, 'controls', 'Controls', scoped(ed, 'controls', CONTROLS))}
      ${group(ed, 'icons', 'Icons', iconStyleRow(ed) + scoped(ed, 'icons', ICONS))}
      ${group(ed, 'posters', 'Posters and shadows', scoped(ed, 'posters', POSTER))}
      ${group(ed, 'opacity', 'Transparency',
        '<div class="st-hint">100 % is the card as designed. Each element keeps its own transparency and these scale it, so a row stays fainter than its box.</div>'
        + scoped(ed, 'opacity', OPACITY))}
      ${group(ed, 'status', 'Status colours', fields(ed, [], STATUS))}
      ${group(ed, 'layout', 'Spacing', fields(ed, [], CARD))}
      ${group(ed, 'modals', 'Modals',
        group(ed, 'modals.night', 'Night', modalGroups(ed, 'modals.night', ['modal'], false), true)
        + group(ed, 'modals.day', 'Day', modalGroups(ed, 'modals.day', ['modalDay'], true), true)
        + '<div class="st-hint">Day colours apply while the sun is up, when Day / night modal colours is on in General.</div>')}
      <div class="st-hint st-foot">Colours take a hex value (#e6e6e6), rgb() or "r, g, b". The same settings can come from a Home Assistant theme or card-mod — see the README.</div>
    </div>`;
}

export const STYLES_TAB_CSS = `
  :host { --st-ctl-w: min(260px, 58%); }
  .st-group { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; margin-bottom: 8px; background: var(--card-background-color, #fff); }
  .st-group > summary { cursor: pointer; padding: 10px 12px; font-weight: 600; font-size: 13px; list-style: none; display: flex; align-items: center; gap: 8px; }
  .st-group > summary::-webkit-details-marker { display: none; }
  .st-group > summary::before { content: '›'; display: inline-block; width: 10px; transition: transform .15s; color: var(--secondary-text-color, #757575); }
  .st-group[open] > summary::before { transform: rotate(90deg); }
  .st-body { padding: 2px 12px 10px; }
  .st-nested { background: var(--secondary-background-color, #f5f5f5); }
  .st-nested > summary { font-weight: 500; padding: 8px 10px; }
  .st-badge { margin-left: auto; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 6px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff); }
  .st-row { display: flex; align-items: center; gap: 8px; margin: 8px 0 2px; }
  .st-label { flex: 1; font-size: 13px; min-width: 0; }
  .st-ctl { display: flex; align-items: center; gap: 6px; flex: 0 0 var(--st-ctl-w); width: var(--st-ctl-w); }
  .st-field { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; }
  .st-suffix { flex: 0 0 28px; font-size: 11px; color: var(--secondary-text-color, #757575); }
  .st-swatch { flex: 0 0 34px; width: 34px; height: 30px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid var(--divider-color, #e0e0e0); background: var(--card-background-color, #fff); box-sizing: border-box; }
  .st-swatch[data-unset] { opacity: .45; }
  .st-text, .st-num, .st-select {
    flex: 1; min-width: 0; width: 100%; height: 30px; box-sizing: border-box; padding: 0 8px; border-radius: 6px;
    font: inherit; font-size: 12px; border: 1px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121);
  }
  .st-num { text-align: right; }
  .st-text.st-bad { border-color: var(--error-color, #db4437); }
  .st-range { flex: 1; min-width: 0; margin: 0; accent-color: var(--primary-color, #03a9f4); }
  .st-clear { flex: 0 0 22px; width: 22px; height: 22px; padding: 0; border-radius: 50%; border: none; cursor: pointer; font-size: 14px; line-height: 1; background: var(--secondary-background-color, #eee); color: var(--secondary-text-color, #757575); }
  .st-clear[hidden] { visibility: hidden; display: inline-block; }
  .st-sub .st-label { padding-left: 14px; font-size: 12px; color: var(--secondary-text-color, #757575); }
  .st-sub { margin-top: 2px; }
  .st-alpha:disabled { opacity: .4; }
  .st-hint { font-size: 11px; color: var(--secondary-text-color, #757575); margin: 0 0 4px; }
  .st-foot { margin-top: 10px; }
`;

// Values as they go into the config: a picker writes hex, a number stays a
// number (px), a text field is checked before it is kept.
function parse(kind, raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return { value: undefined };
  if (kind === 'color') return toRgbTriplet(s) ? { value: s } : { bad: true };
  if (kind === 'px' || kind === 'blur') {
    const n = parseFloat(s);
    return isNaN(n) || n < 0 ? { bad: true } : { value: n };
  }
  if (kind === 'shine') return { value: Math.max(0, Math.min(1, parseFloat(s) || 0)) };
  if (/[;{}<>]/.test(s)) return { bad: true };
  return { value: s };
}

export function wireStylesTab(ed, root) {
  const save = (el, value) => {
    const path = el.dataset.stPath ? el.dataset.stPath.split('.') : [];
    ed._update({ styles: setStyle(ed._config.styles, path, el.dataset.stKey, value) });
    const row = el.closest('.st-row');
    row?.querySelector('[data-st-clear]')?.toggleAttribute('hidden', value === undefined);
  };
  root.querySelector('[data-st-preset]')?.addEventListener('change', e => {
    const v = e.target.value;
    ed._update({ styles: setStyle(ed._config.styles, [], 'preset', v === 'glass' ? undefined : v) });
    ed._render();
  });
  root.querySelector('[data-st-iconstyle]')?.addEventListener('change', e => {
    const v = e.target.value;
    let st = setStyle(ed._config.styles, [], 'applicationIcons', v === 'mdi' ? 'mdi' : undefined);
    st = setStyle(st, [], 'iconStyle', v === 'mono' ? 'mono' : undefined);
    ed._update({ styles: st });
  });
  root.querySelectorAll('details[data-st-group]').forEach(d => d.addEventListener('toggle', () => {
    ed._stOpen = ed._stOpen || new Set();
    if (d.open) ed._stOpen.add(d.dataset.stGroup); else ed._stOpen.delete(d.dataset.stGroup);
  }));
  const paintValue = (sw) => {
    const alpha = sw.closest('.st-paint')?.querySelector('.st-alpha');
    return alpha && !alpha.disabled ? compose(sw.value, +alpha.value) : sw.value;
  };
  root.querySelectorAll('.st-swatch').forEach(el => el.addEventListener('input', () => {
    el.removeAttribute('data-unset');
    const value = paintValue(el);
    const text = el.closest('.st-row').querySelector('.st-text');
    if (text) { text.value = value; text.classList.remove('st-bad'); }
    save(el, value);
  }));
  root.querySelectorAll('.st-alpha').forEach(el => {
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('input', () => {
      const paint = el.closest('.st-paint');
      el.closest('.st-ctl').querySelector('.st-val').textContent = `${el.value}%`;
      const sw = paint.querySelector('.st-swatch');
      sw.removeAttribute('data-unset');
      const value = paintValue(sw);
      const text = paint.querySelector('.st-text');
      if (text) { text.value = value; text.classList.remove('st-bad'); }
      save(sw, value);
    });
  });
  root.querySelectorAll('.st-text, .st-num').forEach(el => el.addEventListener('change', () => {
    const r = parse(el.dataset.stKind, el.value);
    el.classList.toggle('st-bad', !!r.bad);
    if (r.bad) return;
    const sw = el.closest('.st-row').querySelector('.st-swatch');
    if (sw && r.value !== undefined) {
      const hex = swatchHex(r.value, null);
      if (hex) { sw.value = hex; sw.removeAttribute('data-unset'); }
    }
    const alpha = el.closest('.st-paint')?.querySelector('.st-alpha');
    if (alpha) {
      const a = alphaOf(r.value);
      alpha.disabled = a == null;
      alpha.value = a ?? 100;
      alpha.closest('.st-ctl').querySelector('.st-val').textContent = `${a ?? 100}%`;
    }
    save(el, r.value);
  }));
  root.querySelectorAll('.st-pct').forEach(el => {
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('input', () => {
      el.closest('.st-ctl').querySelector('.st-val').textContent = `${el.value}%`;
      save(el, +el.value);
    });
  });
  root.querySelectorAll('.st-range:not(.st-pct):not(.st-alpha)').forEach(el => {
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('input', () => {
      el.closest('.st-ctl').querySelector('.st-val').textContent = (+el.value).toFixed(2);
      save(el, +el.value);
    });
  });
  root.querySelectorAll('[data-st-clear]').forEach(el => el.addEventListener('click', () => {
    save(el, undefined);
    ed._render();
  }));
}

export { STYLE_PRESETS };
