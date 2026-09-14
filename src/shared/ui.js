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
 * @param {object} ctx - card instance (has _isDaytime, _config)
 * @returns {' popup-day'|''}
 */
export function dayClass(ctx) {
  return (ctx._isDaytime && ctx._config?.styles?.dayNightMode !== false) ? ' popup-day' : '';
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

/** True when the screen is `px` wide or less. */
export function maxWidth(px) {
  return window.matchMedia(`(max-width:${px}px)`).matches;
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
