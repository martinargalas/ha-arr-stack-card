// Design tokens (#42). Every colour the card's two columns draw reads one of
// these, with the colour it always had as the fallback written at the point of
// use — so a token nobody sets changes nothing.
//
// Colours are RGB triplets ("255, 255, 255"), the way Home Assistant's own
// --rgb-primary-color is, because the card draws most of them at an alpha of
// its own: rgba(var(--_fg, 255, 255, 255), 0.55). color-mix() would take any
// colour, but an older wall tablet that lacks it would lose every colour on the
// card at once.
//
// Three ways in, all setting the same public names:
//   - a Home Assistant theme:   arr-text-rgb: "230, 230, 230"
//   - the card's YAML:          styles: { text: '#e6e6e6' }  (see theme.js)
//   - card-mod:                 :host { --arr-text-rgb: 230, 230, 230; }
//
// Each one exists for the whole card (--arr-text-rgb) and for one column
// (--arr-left-text-rgb, --arr-right-text-rgb); the column's wins. A role left
// unset follows its parent, keeping its own alpha — set only the text colour and
// secondary and muted text follow it at their usual strength.
//
// The internal names (--_fg …) are defined on the columns only. Modals live
// outside them, so they keep their own --is-* palette until they get theirs.

// [internal, public, parent]
export const COLOR_ROLES = [
  ['fg',      'text',           null],
  ['fg2',     'text-secondary', 'fg'],
  ['fg3',     'text-muted',     'fg2'],
  ['hd',      'heading',        'fg'],
  ['hdl',     'heading-line',   'hd'],
  // The apps' icons beside the headings: MDI icons, and the real logos when
  // styles.iconStyle is mono
  ['icon',    'icon',           'hd'],
  ['fill',    'fill',           null],
  ['line',    'line',           null],
  ['btn-fg',  'button-text',    'fg'],
  ['btn-bg',  'button',         'fill'],
  // Glyphs on buttons and paging arrows. '@icon' follows the icon colour only
  // when one is set; with neither, a glyph stays the colour of its button.
  ['btn-ico', 'button-icon',    '@icon'],
  ['pill-fg', 'pill-text',      'fg'],
  ['dot',     'dot',            null],
  ['dot-on',  'dot-active',     'dot'],
  // Text drawn over a poster or a cover, on the dark scrim the card lays over
  // the image. It stays light whatever the panels' text does, or a light
  // theme would print dark titles onto dark scrims.
  ['ptx',     'poster-text',    null],
  ['shade',   'shade',          null],
  ['shadow',  'shadow',         null],
];

// The column itself. Whole CSS values, not triplets: a background may be any
// colour or gradient, a border the full shorthand ("1px solid #333"), blur a
// backdrop-filter ("none" turns it off), shine the opacity of the glass's
// highlight (0 hides it).
// [internal, public]
export const SURFACE_TOKENS = [
  ['bg',     'background'],
  ['border', 'border'],
  ['radius', 'radius'],
  ['pad',    'padding'],
  ['blur',   'blur'],
  ['shine',  'shine'],
  ['elev',   'panel-shadow'],
  // A capsule behind each app icon; none by default
  ['icon-bg',  'icon-background'],
  ['icon-r',   'icon-radius'],
  ['icon-pad', 'icon-padding'],
];

// How strongly each kind of surface is drawn, as a factor on the alpha the
// card gives each one (1 = as designed). Every element keeps its own alpha —
// a row fill at 8 %, a border at 25 % — and the factor scales them alike, so
// they stay in proportion. In styles: they are percentages (boxOpacity: 50).
// [internal, public]
export const OPACITY_TOKENS = [
  ['a-box',    'box-opacity'],      // VPN bar, disks, download lists, tiles, paging capsules
  ['a-ctl',    'control-opacity'],  // buttons, sort, search field, request controls
  ['a-line',   'line-opacity'],     // every border and divider, the heading line
  ['a-track',  'track-opacity'],    // progress and slider tracks
  ['a-poster', 'poster-opacity'],   // the ground under a poster
  ['a-tag',    'tag-opacity'],      // dark labels over posters
  ['a-tint',   'tint-opacity'],     // the apps' colour tint behind a section (to 100 %)
];

// Status colours are one set for the whole card, modals included, so they are
// read by their public names directly. So are the gap between the columns
// (--arr-gap) and the card's own padding (--arr-card-padding).
export const STATUS_TOKENS = ['accent', 'success', 'warning', 'error', 'info'];

// The shades the card has used for each status, so a colour chosen in code
// (a badge's tone, a chart's "direct play" green) can be traded for the
// status token that stands for it. "r,g,b" → token name.
export const STATUS_RGB = {
  '10,132,255': 'accent', '0,122,255': 'accent',
  '48,209,88': 'success', '74,222,128': 'success', '60,200,120': 'success', '80,200,120': 'success',
  '52,211,153': 'success', '110,231,183': 'success', '52,199,89': 'success',
  '255,69,58': 'error', '248,113,113': 'error', '255,60,60': 'error', '255,100,100': 'error', '255,120,120': 'error',
  '255,90,80': 'error', '255,80,80': 'error', '255,100,90': 'error', '252,165,165': 'error', '255,59,48': 'error',
  '229,72,77': 'error', '255,120,110': 'error',
  '255,149,0': 'warning', '245,158,11': 'warning', '255,159,10': 'warning', '250,160,40': 'warning',
  '251,191,36': 'warning', '252,211,77': 'warning',
  '96,165,250': 'info', '90,200,250': 'info',
};

function roleBlock(side) {
  return COLOR_ROLES.map(([id, name, parent]) => {
    const pub = `--arr-${name}-rgb`;
    let v;
    if (parent?.startsWith('@')) {
      const p = parent.slice(1);
      v = side ? `var(${pub}, var(--arr-${side}-${p}-rgb, var(--arr-${p}-rgb)))` : `var(${pub}, var(--arr-${p}-rgb))`;
    } else v = parent ? `var(${pub}, var(--_${parent}))` : `var(${pub})`;
    if (side) v = `var(--arr-${side}-${name}-rgb, ${v})`;
    return `--_${id}: ${v};`;
  }).concat(side ? [...SURFACE_TOKENS, ...OPACITY_TOKENS].map(([id, name]) =>
    `--_${id}: var(--arr-${side}-${name}, var(--arr-${name}));`) : []).join('\n        ');
}

// ── Modals ──────────────────────────────────────────────────────────────
// One palette for every modal, night and day apart: a light text colour set
// for the night would vanish on the day's pale glass, so modal-day does not
// fall back to modal. The --is-* variables the modals already read take these
// (see .popup-overlay in index.js); the roles below let the rules that were
// written with the columns' tokens follow the modal's palette instead.
// [public, kind]
export const MODAL_TOKENS = [
  ['text-rgb',           'color'],
  ['text-secondary-rgb', 'color'],
  ['text-muted-rgb',     'color'],
  ['fill-rgb',           'color'],
  ['line-rgb',           'color'],
  ['background',         'value'],
  ['overlay',            'value'],
  ['header',             'value'],
  ['menu',               'value'],
  ['blur',               'value'],
  ['shine',              'value'],
  // The menu across the top of a modal (Tracearr's bar at the bottom on a
  // phone), and the items nested under one of its tabs
  ['nav-background',     'value'],
  ['nav-border',         'value'],
  ['nav-text',           'value'],
  ['nav-active',         'value'],
  ['nav-active-text',    'value'],
  ['sub-text',           'value'],
  ['sub-active',         'value'],
  ['sub-active-text',    'value'],
  // The bar of search, filters and toggles under a modal's header
  ['toolbar',            'value'],
  ['toolbar-border',     'value'],
  ['toolbar-text',       'value'],
  ['toolbar-active',     'value'],
  ['toolbar-active-text','value'],
  ['filter',             'value'],
  // Buttons (the --is-btn-* the modals read)
  ['button',             'value'],
  ['button-border',      'value'],
  ['button-text',        'value'],
  ['button-hover',       'value'],
  ['button-active',      'value'],
  ['button-active-text', 'value'],
  // Switches and checkboxes
  ['switch-on',          'value'],
  ['switch-off',         'value'],
  ['switch-knob',        'value'],
  // Progress bars
  ['progress-track',     'value'],
  ['progress-fill',      'value'],
  // Search results — Interactive Search's releases and the automatic search.
  // One colour each; the card draws a chip's fill, rim and label from it at
  // the strengths it always had.
  ['grab-rgb',           'color'],
  ['grab-done-rgb',      'color'],
  ['grab-failed-rgb',    'color'],
  ['quality-4k-rgb',     'color'],
  ['quality-1080-rgb',   'color'],
  ['quality-720-rgb',    'color'],
  ['torrent-rgb',        'color'],
  ['usenet-rgb',         'color'],
  ['score-positive-rgb', 'color'],
  ['score-negative-rgb', 'color'],
  ['rejected-rgb',       'color'],
  ['seeds-rgb',          'color'],
  ['leechers-rgb',       'color'],
  ['search-done-rgb',    'color'],
  ['search-downloading-rgb', 'color'],
];
// Their internal names, defined per palette in modalRoles
export const NAV_ROLES = [
  ['nav-bg', 'nav-background'], ['nav-bdr', 'nav-border'], ['nav-fg', 'nav-text'],
  ['nav-on', 'nav-active'], ['nav-on-fg', 'nav-active-text'],
  ['sub-fg', 'sub-text'], ['sub-on', 'sub-active'], ['sub-on-fg', 'sub-active-text'],
  ['tb-bg', 'toolbar'], ['tb-bdr', 'toolbar-border'], ['tb-fg', 'toolbar-text'],
  ['tb-on', 'toolbar-active'], ['tb-on-fg', 'toolbar-active-text'], ['flt', 'filter'],
  ['sw-on', 'switch-on'], ['sw-off', 'switch-off'], ['sw-knob', 'switch-knob'],
  ['pg-track', 'progress-track'], ['pg-fill', 'progress-fill'],
  ['as-ok', 'search-done-rgb'], ['as-dl', 'search-downloading-rgb'], ['grab', 'grab-rgb'],
];
// Only the night palette carries the window's corners; they do not change at dawn
export const MODAL_ONLY = [['radius', 'value']];

function modalRoles(m) {
  return [
    `--_fg: var(--arr-${m}text-rgb);`,
    `--_fg2: var(--arr-${m}text-secondary-rgb, var(--_fg));`,
    `--_fg3: var(--arr-${m}text-muted-rgb, var(--_fg2));`,
    `--_hd: var(--_fg);`, `--_hdl: var(--_hd);`,
    `--_fill: var(--arr-${m}fill-rgb);`, `--_line: var(--arr-${m}line-rgb);`,
    `--_btn-fg: var(--_fg);`, `--_btn-bg: var(--_fill);`, `--_pill-fg: var(--_fg);`,
    `--_dot: var(--_fg);`, `--_dot-on: var(--_dot);`,
    `--_ptx: var(--arr-poster-text-rgb);`,
    `--_shade: var(--arr-shade-rgb);`, `--_shadow: var(--arr-shadow-rgb);`,
    ...NAV_ROLES.map(([id, name]) => `--_${id}: var(--arr-${m}${name});`),
  ].join('\n        ');
}

export const TOKEN_CSS = `
      .popup-overlay {
        ${modalRoles('modal-')}
      }
      .popup-overlay.popup-day {
        ${modalRoles('modal-day-')}
      }
      .card {
        ${roleBlock(null)}
      }
      .col-left {
        ${roleBlock('left')}
      }
      .col-right {
        ${roleBlock('right')}
      }
`;

// ── styles: in the card's YAML ───────────────────────────────────────────
// Every token has a camelCase key named after it: text, textSecondary,
// heading, background, panelShadow … Set at the top of styles: it is the whole
// card's; under styles.left or styles.right, one column's.
//
//   styles:
//     preset: ha
//     text: '#e6e6e6'
//     radius: 12
//     right: { background: 'rgba(20, 20, 30, 0.8)' }

const camel = s => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const SIDE_COLORS  = COLOR_ROLES.map(([, name]) => [camel(name), `${name}-rgb`]);
const SIDE_SURFACE = SURFACE_TOKENS.map(([, name]) => [camel(name), name]);
const SIDE_OPACITY = OPACITY_TOKENS.map(([, name]) => [camel(name), name]);
const CARD_ONLY = [
  ...STATUS_TOKENS.map(n => [n, `${n}-rgb`, 'color']),
  ['gap', 'gap', 'length'],
  ['cardPadding', 'card-padding', 'length'],
];
const LENGTHS = new Set(['radius', 'padding', 'iconRadius', 'iconPadding']);

// Presets set the same keys a user would, and a key the user sets wins.
// glass is the card as it always looked, so it sets nothing.
export const STYLE_PRESETS = {
  glass: {},
  // Takes everything from the Home Assistant theme: the card's own surfaces
  // become ha-card's, and the colours its text and accent. Fills and lines
  // follow the text colour, so on a light theme they darken instead of
  // vanishing as white on white.
  ha: {
    background:  'var(--ha-card-background, var(--card-background-color, rgba(255, 255, 255, 0.05)))',
    border:      'var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, rgba(255, 255, 255, 0.25)))',
    radius:      'var(--ha-card-border-radius, 12px)',
    blur:        'var(--ha-card-backdrop-filter, none)',
    shine:       0,
    panelShadow: 'var(--ha-card-box-shadow, none)',
    text:        'var(--rgb-primary-text-color, 255, 255, 255)',
    fill:        'var(--rgb-primary-text-color, 255, 255, 255)',
    line:        'var(--rgb-primary-text-color, 255, 255, 255)',
    dot:         'var(--rgb-primary-text-color, 255, 255, 255)',
    accent:      'var(--rgb-primary-color, 10, 132, 255)',
    success:     'var(--rgb-success-color, 48, 209, 88)',
    warning:     'var(--rgb-warning-color, 255, 149, 0)',
    error:       'var(--rgb-error-color, 255, 69, 58)',
    info:        'var(--rgb-info-color, 96, 165, 250)',
    // Same in the day and at night: the theme decides light or dark
    modal: {
      background: 'var(--ha-card-background, var(--card-background-color, rgba(10, 10, 22, 0.88)))',
      header:     'var(--card-background-color, rgba(10, 12, 22, 0.80))',
      menu:       'var(--card-background-color, #18182a)',
      text:       'var(--rgb-primary-text-color, 255, 255, 255)',
      fill:       'var(--rgb-primary-text-color, 255, 255, 255)',
      line:       'var(--rgb-primary-text-color, 255, 255, 255)',
      shine:      0,
    },
  },
  // Opaque and flat: no glass to blur through, no highlight.
  solid: {
    background:  '#1c1c1e',
    border:      '1px solid rgba(255, 255, 255, 0.10)',
    blur:        'none',
    shine:       0,
    panelShadow: 'none',
  },

  // Nord (nordtheme.com, MIT): arctic frost. Slate glass lit from the top,
  // frost-blue headings and icons in soft capsules, aurora status colours.
  nord: {
    background:  'radial-gradient(120% 80% at 100% 0%, rgba(136, 192, 208, 0.14), transparent 55%), linear-gradient(165deg, rgba(59, 66, 82, 0.94) 0%, rgba(46, 52, 64, 0.96) 55%, rgba(36, 41, 51, 0.97) 100%)',
    border:      '1px solid rgba(136, 192, 208, 0.20)',
    radius:      18,
    blur:        'blur(28px) saturate(120%)',
    shine:       0.08,
    tintOpacity: 35,
    panelShadow: '0 24px 60px -12px rgba(15, 18, 25, 0.55)',
    iconBackground: 'rgba(136, 192, 208, 0.14)', iconRadius: 10, iconPadding: 4,
    text: '#ECEFF4', textSecondary: '#D8DEE9', textMuted: '#8F9BB3',
    heading: '#88C0D0', headingLine: '#5E81AC', icon: '#88C0D0',
    fill: '#88C0D0', line: '#88C0D0', button: '#5E81AC', buttonText: '#ECEFF4', buttonIcon: '#ECEFF4', pillText: '#ECEFF4',
    dot: '#616E88', dotActive: '#88C0D0', posterText: '#ECEFF4', shade: '#2E3440', shadow: '#1A1E26',
    accent: '#88C0D0', success: '#A3BE8C', warning: '#EBCB8B', error: '#BF616A', info: '#81A1C1',
    modal: {
      background: 'linear-gradient(170deg, rgba(59, 66, 82, 0.97), rgba(46, 52, 64, 0.98))',
      header: 'linear-gradient(180deg, rgba(76, 86, 106, 0.55), rgba(59, 66, 82, 0.35))', menu: '#3B4252',
      text: '#ECEFF4', textSecondary: '#D8DEE9', textMuted: '#8F9BB3', fill: '#D8DEE9', line: '#88C0D0', shine: 0.2, radius: 22,
      navBackground: 'rgba(46, 52, 64, 0.72)', navBorder: 'rgba(136, 192, 208, 0.18)', navText: '#D8DEE9',
      navActive: 'linear-gradient(135deg, #88C0D0, #81A1C1)', navActiveText: '#2E3440', subText: '#D8DEE9', subActive: '#5E81AC', subActiveText: '#ECEFF4',
      toolbar: 'rgba(59, 66, 82, 0.60)', toolbarBorder: 'rgba(136, 192, 208, 0.16)', toolbarText: '#D8DEE9',
      toolbarActive: '#88C0D0', toolbarActiveText: '#2E3440', filter: '#88C0D0',
      button: 'rgba(76, 86, 106, 0.75)', buttonBorder: 'rgba(136, 192, 208, 0.22)', buttonText: '#ECEFF4',
      buttonHover: 'rgba(94, 129, 172, 0.55)', buttonActive: '#88C0D0', buttonActiveText: '#2E3440',
      switchOn: '#A3BE8C', switchOff: '#4C566A', switchKnob: '#ECEFF4', progressTrack: 'rgba(216, 222, 233, 0.12)', progressFill: '#88C0D0',
      grab: '#88C0D0', grabDone: '#A3BE8C', grabFailed: '#BF616A', quality4k: '#B48EAD', quality1080: '#81A1C1', quality720: '#8FBCBB',
      torrent: '#A3BE8C', usenet: '#EBCB8B', scorePositive: '#A3BE8C', scoreNegative: '#BF616A', rejected: '#D08770',
      seeds: '#A3BE8C', leechers: '#BF616A', searchDone: '#A3BE8C', searchDownloading: '#88C0D0',
    },
  },

  // Catppuccin Mocha (catppuccin.com, MIT): soothing pastels. A mauve glow
  // in the corner of a deep base, rounder corners, pink headings, mauve accent.
  catppuccin: {
    background:  'radial-gradient(110% 80% at 0% 0%, rgba(203, 166, 247, 0.34), transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(245, 194, 231, 0.12), transparent 60%), linear-gradient(160deg, rgba(41, 41, 60, 0.95), rgba(30, 30, 46, 0.97) 50%, rgba(24, 24, 37, 0.98))',
    border:      '1px solid rgba(203, 166, 247, 0.24)',
    radius:      24,
    blur:        'blur(24px) saturate(140%)',
    shine:       0.06,
    tintOpacity: 35,
    panelShadow: '0 30px 70px -18px rgba(17, 17, 27, 0.75), 0 0 0 1px rgba(245, 194, 231, 0.04)',
    iconBackground: 'rgba(203, 166, 247, 0.16)', iconRadius: 12, iconPadding: 4,
    text: '#CDD6F4', textSecondary: '#BAC2DE', textMuted: '#9399B2',
    heading: '#F5C2E7', headingLine: '#CBA6F7', icon: '#CBA6F7',
    fill: '#B4BEFE', line: '#B4BEFE', button: '#45475A', buttonText: '#CDD6F4', buttonIcon: '#F5C2E7', pillText: '#CDD6F4',
    dot: '#585B70', dotActive: '#F5C2E7', posterText: '#CDD6F4', shade: '#181825', shadow: '#11111B',
    accent: '#CBA6F7', success: '#A6E3A1', warning: '#FAB387', error: '#F38BA8', info: '#89B4FA',
    modal: {
      background: 'radial-gradient(90% 60% at 100% 0%, rgba(245, 194, 231, 0.10), transparent 60%), linear-gradient(170deg, rgba(36, 36, 54, 0.97), rgba(30, 30, 46, 0.98))',
      header: 'linear-gradient(180deg, rgba(49, 50, 68, 0.70), rgba(30, 30, 46, 0.30))', menu: '#181825',
      text: '#CDD6F4', textSecondary: '#BAC2DE', textMuted: '#9399B2', fill: '#CDD6F4', line: '#B4BEFE', shine: 0.15, radius: 28,
      navBackground: 'rgba(24, 24, 37, 0.75)', navBorder: 'rgba(203, 166, 247, 0.20)', navText: '#BAC2DE',
      navActive: 'linear-gradient(135deg, #CBA6F7, #F5C2E7)', navActiveText: '#1E1E2E', subText: '#BAC2DE', subActive: '#B4BEFE', subActiveText: '#1E1E2E',
      toolbar: 'rgba(49, 50, 68, 0.55)', toolbarBorder: 'rgba(180, 190, 254, 0.18)', toolbarText: '#BAC2DE',
      toolbarActive: '#CBA6F7', toolbarActiveText: '#1E1E2E', filter: '#F5C2E7',
      button: 'rgba(69, 71, 90, 0.80)', buttonBorder: 'rgba(203, 166, 247, 0.24)', buttonText: '#CDD6F4',
      buttonHover: 'rgba(88, 91, 112, 0.85)', buttonActive: '#CBA6F7', buttonActiveText: '#1E1E2E',
      switchOn: '#A6E3A1', switchOff: '#45475A', switchKnob: '#CDD6F4', progressTrack: 'rgba(205, 214, 244, 0.12)', progressFill: '#CBA6F7',
      grab: '#CBA6F7', grabDone: '#A6E3A1', grabFailed: '#F38BA8', quality4k: '#F5C2E7', quality1080: '#89B4FA', quality720: '#94E2D5',
      torrent: '#A6E3A1', usenet: '#89DCEB', scorePositive: '#A6E3A1', scoreNegative: '#F38BA8', rejected: '#FAB387',
      seeds: '#A6E3A1', leechers: '#F38BA8', searchDone: '#A6E3A1', searchDownloading: '#CBA6F7',
    },
  },

  // Cinema: the dark of a theatre, a velvet-red glow from below, gold for
  // everything that matters — sharper corners, titles in brass.
  cinema: {
    background:  'radial-gradient(140% 70% at 50% 120%, rgba(128, 20, 32, 0.45), transparent 60%), linear-gradient(180deg, rgba(24, 18, 14, 0.96), rgba(9, 7, 6, 0.98))',
    border:      '1px solid rgba(229, 160, 13, 0.26)',
    radius:      12,
    blur:        'blur(18px) saturate(110%)',
    shine:       0,
    tintOpacity: 45,
    panelShadow: '0 0 0 1px rgba(229, 160, 13, 0.06), 0 30px 70px -10px rgba(0, 0, 0, 0.75)',
    iconBackground: 'rgba(229, 160, 13, 0.12)', iconRadius: 6, iconPadding: 3,
    text: '#F5EFE3', textSecondary: '#D9CFBF', textMuted: '#9C9286',
    heading: '#E5A00D', headingLine: '#8B1E2D', icon: '#E5A00D',
    fill: '#E5A00D', line: '#E5A00D', button: '#3A2A12', buttonText: '#F5EFE3', buttonIcon: '#E5A00D', pillText: '#F5EFE3',
    dot: '#5C4A33', dotActive: '#E5A00D', posterText: '#F5EFE3', shade: '#0A0806', shadow: '#000000',
    accent: '#E5A00D', success: '#7BC47F', warning: '#F2B544', error: '#D9453B', info: '#C9A66B',
    modal: {
      background: 'radial-gradient(120% 60% at 50% 115%, rgba(128, 20, 32, 0.30), transparent 60%), linear-gradient(180deg, rgba(20, 16, 12, 0.98), rgba(9, 7, 6, 0.99))',
      header: 'linear-gradient(90deg, rgba(92, 16, 26, 0.55), rgba(26, 20, 16, 0.40) 70%)', menu: '#16110C',
      text: '#F5EFE3', textSecondary: '#D9CFBF', textMuted: '#9C9286', fill: '#F5EFE3', line: '#E5A00D', shine: 0, radius: 14,
      navBackground: 'rgba(16, 12, 9, 0.80)', navBorder: 'rgba(229, 160, 13, 0.22)', navText: '#D9CFBF',
      navActive: 'linear-gradient(135deg, #F2C14E, #E5A00D 55%, #B87A08)', navActiveText: '#140F08', subText: '#D9CFBF', subActive: '#8B1E2D', subActiveText: '#F5EFE3',
      toolbar: 'rgba(30, 24, 18, 0.65)', toolbarBorder: 'rgba(229, 160, 13, 0.20)', toolbarText: '#D9CFBF',
      toolbarActive: '#E5A00D', toolbarActiveText: '#140F08', filter: '#E5A00D',
      button: 'rgba(42, 33, 22, 0.85)', buttonBorder: 'rgba(229, 160, 13, 0.28)', buttonText: '#F5EFE3',
      buttonHover: 'rgba(70, 52, 24, 0.90)', buttonActive: '#E5A00D', buttonActiveText: '#140F08',
      switchOn: '#E5A00D', switchOff: '#3A2E22', switchKnob: '#F5EFE3', progressTrack: 'rgba(245, 239, 227, 0.10)', progressFill: '#E5A00D',
      grab: '#E5A00D', grabDone: '#7BC47F', grabFailed: '#D9453B', quality4k: '#F2C14E', quality1080: '#C9A66B', quality720: '#9C9286',
      torrent: '#7BC47F', usenet: '#C9A66B', scorePositive: '#E5A00D', scoreNegative: '#D9453B', rejected: '#D9453B',
      seeds: '#7BC47F', leechers: '#D9453B', searchDone: '#7BC47F', searchDownloading: '#E5A00D',
    },
  },
};

// A value lands inside a <style>; nothing in it may close the rule.
const safe = v => String(v).replace(/[;{}<>]/g, '').trim();

// '#e6e6e6', '#fff', 'rgb(1, 2, 3)', 'rgba(1, 2, 3, 0.5)', '1, 2, 3' → '1, 2, 3'.
// A var() passes through, so a theme's own --rgb-* colour can be named.
// Alpha is dropped: the card draws each colour at an alpha of its own.
export function toRgbTriplet(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^var\(--[\w-]+(,[^;{}<>]*)?\)$/.test(s)) return s;
  let m = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
  }
  m = s.match(/^(?:rgba?\()?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+%?\s*)?\)?$/i);
  if (m && [m[1], m[2], m[3]].every(n => +n <= 255)) return `${+m[1]}, ${+m[2]}, ${+m[3]}`;
  return null;
}

function surfaceValue(key, v) {
  if (v == null || v === '') return null;
  if (key.endsWith('Opacity')) {
    const n = parseFloat(v);
    if (isNaN(n) || n < 0) return null;
    const max = key === 'tintOpacity' ? 100 : 300;
    return String(Math.round(Math.min(n, max)) / 100);
  }
  if (typeof v === 'number') {
    if (key === 'shine') return String(Math.max(0, Math.min(1, v > 1 ? v / 100 : v)));
    if (key === 'blur') return v > 0 ? `blur(${v}px) saturate(100%)` : 'none';
    if (LENGTHS.has(key) || key === 'gap' || key === 'cardPadding') return `${v}px`;
  }
  if (key === 'blur' && (v === false || v === 'none' || v === 0)) return 'none';
  const s = safe(v);
  return s || null;
}

function declsFor(obj, prefix, keys, out, bad) {
  for (const [key, token] of keys) {
    const v = obj?.[key];
    if (v == null || v === '') continue;
    const val = token.endsWith('-rgb') ? toRgbTriplet(v) : surfaceValue(key, v);
    if (val == null) { bad.push(prefix ? `${prefix.slice(0, -1)}.${key}` : key); continue; }
    out.push(`--arr-${prefix}${token}: ${val};`);
  }
}

// The declarations styles: sets on the card's host, and the keys it could not
// read (shown as a warning, so a typo in a colour is not silently ignored).
export function styleDeclarations(styles = {}) {
  const preset = STYLE_PRESETS[styles.preset] || {};
  const merged = { ...preset, ...styles };
  delete merged.modal; delete merged.modalDay;
  const out = [], bad = [];
  declsFor(merged, '', [...SIDE_COLORS, ...SIDE_SURFACE, ...SIDE_OPACITY, ...CARD_ONLY.map(([k, t]) => [k, t])], out, bad);
  for (const side of ['left', 'right']) {
    // A preset may shape one side; what the user sets for that side wins
    const own = styles[side] && typeof styles[side] === 'object' ? styles[side] : null;
    if (own || preset[side]) {
      declsFor({ ...(preset[side] || {}), ...(own || {}) }, `${side}-`, [...SIDE_COLORS, ...SIDE_SURFACE, ...SIDE_OPACITY], out, bad);
    }
  }
  const modalKeys = MODAL_TOKENS.map(([t]) => [camel(t.replace(/-rgb$/, '')), t]);
  const presetModal = preset.modal || {};
  for (const [key, prefix, extra] of [['modal', 'modal-', MODAL_ONLY], ['modalDay', 'modal-day-', []]]) {
    const m = { ...presetModal, ...(styles[key] || {}) };
    declsFor(m, prefix, [...modalKeys, ...extra.map(([t]) => [camel(t), t])], out, bad);
  }
  if (styles.preset && !STYLE_PRESETS[styles.preset]) bad.push(`preset: ${styles.preset}`);
  return { decls: out, bad };
}

// Every key styles: understands, for the editor and the README.
export const STYLE_KEYS = {
  modal:   [...MODAL_TOKENS, ...MODAL_ONLY].map(([t]) => camel(t.replace(/-rgb$/, ''))),
  colors:  SIDE_COLORS.map(([k]) => k),
  surface: SIDE_SURFACE.map(([k]) => k),
  opacity: SIDE_OPACITY.map(([k]) => k),
  card:    CARD_ONLY.map(([k]) => k),
};
