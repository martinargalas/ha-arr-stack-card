import { STATUS_RGB } from '../styles/tokens.js';
// ──────────────────────────────────────────────────────────────────────────
// Shared UI helpers — imported by render/wire modules
// ──────────────────────────────────────────────────────────────────────────

/** SVG icon strings */
export const ICONS = {
  /** 14×14 close ✕ (stroke-linecap round) */
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  /** 11×11 close ✕ (no stroke-linecap attr) */
  closeSmall: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  /** Animated spinner */
  spinner: `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
  /** ✓ check mark */
  check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  /** 👁 eye — "seen / watched" */
  eye: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  /** ⊘ ban/slash — "not interested" */
  ban: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  /** 👁 eye large — side overlay */
  eyeLg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  /** ⊘ ban large — side overlay */
  banLg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  /** Pager and step-nav chevrons, 16×16 */
  chevL: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevR: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  chevLL: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 18 12 12 18 6"/><polyline points="12 18 6 12 12 6"/></svg>`,
  chevRR: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 18 12 12 6 6"/><polyline points="12 18 18 12 12 6"/></svg>`,
};

/**
 * Returns the day/night CSS class string.
 * @param {object} ctx - card instance (has _isDay)
 * @returns {' popup-day'|''}
 */
export function dayClass(ctx) {
  return ctx._isDay ? ' popup-day' : '';
}

/** The widths the card lays out by, in px. Each is a max-width: "this wide or less". */
export const BP = {
  PHONE_S: 480,  // the smallest phones: poster rows and pickers shrink
  PHONE:   600,  // phone layout of the modals
  COMPACT: 700,  // the calendars switch to their compact grid
  TABLET:  860,  // tablet layout of the modals
  STACKED: 900,  // the card stacks its two columns
  NARROW:  1400, // a narrow desktop
};

/** What covers the screen: the modals, and See More on a phone (#48). The back
 *  button closes them and the page behind them stops scrolling. */
export const SCREEN_OVERLAYS = '.popup-overlay, .to-sheet';

/** True when the screen is `px` wide or less. */
export function maxWidth(px) {
  return window.matchMedia(`(max-width:${px}px)`).matches;
}

/** A screen worked by touch rather than a mouse: a tablet, a Nest Hub, a wall panel. */
export function isTouch() {
  return window.matchMedia('(pointer: coarse)').matches;
}

/** The phone check most modals use. */
export function isMobile(bp = BP.PHONE) {
  return maxWidth(bp);
}

/**
 * Standard toolbar `<select>` style (button-variant).
 * Use on filter/sort dropdowns in modal toolbars.
 */
export const SEL_STY = `background:var(--is-btn-bg);border:1px solid var(--is-btn-bdr);border-radius:6px;color:var(--is-btn-clr);font-size:12px;padding:0 10px;cursor:pointer;outline:none;height:28px;box-sizing:border-box;color-scheme:light dark`;

/**
 * Active/selected variant of SEL_STY.
 */
export const SEL_STY_A = `background:var(--is-btn-abg);border:1px solid var(--is-btn-abdr);border-radius:6px;color:var(--is-btn-aclr);font-size:12px;padding:0 10px;cursor:pointer;outline:none;height:28px;box-sizing:border-box;color-scheme:light dark`;

/**
 * Wide full-width `<select>` / `<input>` style (form fields inside modal panels).
 */
export const SEL_STY_WIDE = `width:100%;box-sizing:border-box;background:var(--is-btn-bg);border:1px solid var(--is-divider);border-radius:6px;color:var(--is-text);font-size:12px;padding:6px 10px;outline:none;color-scheme:light dark`;

// The order each download queue was last sorted in, on this device. Kept per
// client; a value the buttons cannot produce is ignored.
const DL_SORT_KEY = 'arr-dl-sort';
const DL_SORTS = ['progress_desc', 'progress_asc', 'speed_desc', 'speed_asc', 'added_desc', 'added_asc'];
export function savedDlSort(client) {
  try {
    const v = JSON.parse(localStorage.getItem(DL_SORT_KEY) || '{}')[client];
    return DL_SORTS.includes(v) ? v : 'progress_desc';
  } catch (_) { return 'progress_desc'; }
}
export function saveDlSort(client, sort) {
  try {
    const o = JSON.parse(localStorage.getItem(DL_SORT_KEY) || '{}');
    o[client] = sort;
    localStorage.setItem(DL_SORT_KEY, JSON.stringify(o));
  } catch (_) { /* storage blocked: the order holds until the page reloads */ }
}

// 'r,g,b' as a status token when it is one of the card's status shades — the
// accent blue becomes var(--arr-accent-rgb, 0,122,255) — so a colour written
// in code follows a theme or preset. Anything else comes back as it was.
export function statusTok(rgb) {
  const k = String(rgb).replace(/\s+/g, '');
  return STATUS_RGB[k] ? `var(--arr-${STATUS_RGB[k]}-rgb, ${k})` : rgb;
}

// A TMDB picture at a width that fits where it is shown. Radarr hands out its
// posters as TMDB's `original` — a megabyte or two each, on a phone, for a
// card 120 px wide. Only ever smaller: a w92 stays a w92. Other hosts as they are.
const TMDB_W = /(image\.tmdb\.org\/t\/p\/)(original|w(\d+))\//;
export function tmdbSized(url, size = 'w342') {
  if (typeof url !== 'string') return url;
  const m = url.match(TMDB_W);
  if (!m) return url;
  const want = parseInt(size.slice(1), 10);
  if (m[3] && parseInt(m[3], 10) <= want) return url;
  return url.replace(TMDB_W, `$1${size}/`);
}

// The grabber on a phone's sheet: the short pill sheets have, which reads as
// "pull me". The sheet is dragged by itself a row at a time; a tap on the pill
// takes it to the window's top, or back where it opened. Up or down, it looks
// the same — where the sheet stands says which.
export function sheetChevSvg() {
  return '<span class="sheet-pill"></span>';
}

// A sheet eased to its new height by its chevron, and only then
export function sheetMoving(el) {
  if (!el) return;
  el.classList.add('sheet-moving');
  clearTimeout(el._sheetMoveT);
  el._sheetMoveT = setTimeout(() => el.classList.remove('sheet-moving'), 380);
}

// Dragging a phone's sheet by its pill: pressed, the pill shows it is held,
// and the sheet follows the finger a row at a time from where it stood (the
// window's top once within half a row of it, never below `min`). A tap with
// no drag stays a click (the pill's own: to the top and back); a drag sets
// pill._dragged for a moment, so the click that follows it is let go.
// getH/setH(h, ease) read and set the sheet's height; metrics() gives
// { step, min, max } as the drag starts; done(h, m) once it is let go.
export function wireSheetPill(pill, { getH, setH, metrics, done }) {
  if (!pill || pill._pillWired) return;
  pill._pillWired = true;
  let y0 = 0, h0 = 0, m = null, shown = null, drag = false;
  const snap = raw => {
    const h = h0 + Math.round((raw - h0) / m.step) * m.step;
    if (h >= m.max - m.step / 2) return Math.round(m.max);
    return Math.round(Math.max(m.min, h));
  };
  pill.addEventListener('touchstart', e => {
    e.stopPropagation();
    y0 = e.touches[0].clientY;
    h0 = getH();
    m = metrics();
    shown = null; drag = false;
    pill.classList.add('is-pressed');
  }, { passive: true });
  pill.addEventListener('touchmove', e => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    const dy = e.touches[0].clientY - y0;
    if (!drag && Math.abs(dy) < 6) return;
    drag = true;
    const h = snap(h0 - dy);
    if (h !== shown) { shown = h; setH(h, true); }
  }, { passive: false });
  const end = () => {
    pill.classList.remove('is-pressed');
    if (!drag) return;
    pill._dragged = true;
    setTimeout(() => { pill._dragged = false; }, 400);
    if (shown != null) done(shown, m);
  };
  pill.addEventListener('touchend', end);
  pill.addEventListener('touchcancel', end);
}
