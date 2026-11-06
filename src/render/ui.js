// ──────────────────────────────────────────────────────────────────────────
// Shared UI pieces — toolbar, badges, switches, inline confirm, paging.
// Every modal builds these through the card, so they live in one place
// rather than in whichever feature happened to need them first.
// ──────────────────────────────────────────────────────────────────────────
import { ICONS } from '../shared/ui.js';
import { STATUS_RGB } from '../styles/tokens.js';

const DOCK_FADE = 64;   // px of the columns' fade above a bottom bar

// Scroll-driven animations, with the mask's line registered as a length so it
// can be animated (a shadow root's @property does not register it)
let dockTimeline = null;
const DOCK_TIMELINE = () => {
  if (dockTimeline != null) return dockTimeline;
  dockTimeline = false;
  try {
    if (!CSS.supports('animation-timeline: view()')) return false;
    CSS.registerProperty({ name: '--dock-y', syntax: '<length>', inherits: false, initialValue: '100000px' });
    dockTimeline = true;
  } catch (e) {
    // Registered already by another copy of the card on the page
    dockTimeline = /already|InvalidModification/i.test(String(e?.name || e));
  }
  return dockTimeline;
};

class _UiMethods {

  // The shared toolbar: search, the pickers, then the actions, split by
  // hairlines. On a phone the pickers and actions become glyphs and share a
  // scrolling cluster capped at 60% of the bar, so the search field keeps the
  // rest. Every tab in every category builds its bar through this.
  _uiBar(searchId, searchVal, sels, btns, { placeholder = 'Search…', style = '' } = {}) {
    const isMob = this._isMob;
    const live = (sels || []).filter(s => s && s.items && s.items.length > 1);
    const actions = (btns || []).filter(Boolean);
    // An entry may hand over ready-made HTML — a Columns button carries its own
    // menu, which has to stay inside the button's positioned wrapper.
    const btnHtml = actions.map(b => b.html ?? (
      `<button id="${b.id}" class="mt-tb-btn${b.on ? ' is-on' : ''}"${b.attr ? ' ' + b.attr : ''} title="${this._escHtml(b.label || '')}">${b.icon || ''}${isMob ? '' : (b.label || '')}</button>`)).join('');
    const sep = '<span class="mt-tb-sep"></span>';

    // The 60% cap only makes sense against a search field — it exists to leave
    // room to type. With no search the bar is only as wide as its controls, and
    // capping it there just clipped them.
    // Glyphs are a concession to the search field's need for room. Without one
    // the bar has the width for words, so the pickers keep their labels.
    const mobPicks = searchId
      ? live.map(x => this._actIconSelect(x))
      : live.map(x => this._mtSelect(x.id, x.items, x.value, x.neutral ?? 'all'));
    const mobInner = `${mobPicks.join('')}${btnHtml ? `${live.length ? sep : ''}${btnHtml}` : ''}`;
    const ctrls = isMob
      ? ((live.length || btnHtml)
        ? (searchId ? `<span class="act-tb-cluster">${mobInner}</span>` : mobInner)
        : '')
      : `${live.map(x => this._mtSelect(x.id, x.items, x.value, x.neutral ?? 'all')).join('')}${btnHtml ? `${live.length ? sep : ''}${btnHtml}` : ''}`;

    // The wider left inset belongs to the magnifier; a bar without a search
    // field keeps the same 3px all round as its controls do.
    const pad = searchId ? '0 3px 0 12px' : '0 3px';
    // With no search to fill it, the bar's controls sit at its right end rather
    // than floating at the left of an otherwise empty row.
    const lead = searchId ? '' : '<div style="flex:1;min-width:0"></div>';
    return this._mtToolbar(searchId, searchVal, ctrls ? [{ html: lead + ctrls }] : [], placeholder,
      `flex:1;min-width:0;height:34px;padding:${pad}${style ? ';' + style : ''}`);
  }

  // Our own trigger carries the label, and a partial refresh leaves the bar
  // untouched, so a new value never shows unless it is copied across.
  _tbSyncSelect(sel) {
    const trig = sel?.closest?.('.mt-tb-sel, .mt-fsel');
    if (!trig) return;
    const opt = sel.selectedOptions?.[0];
    const lbl = trig.querySelector('.mt-tb-lbl, .mt-fsel-lbl');
    if (lbl && opt) lbl.textContent = opt.textContent;
    const off = !sel.value || sel.value === 'all';
    if (trig.classList.contains('mt-tb-sel--ico')) {
      trig.classList.toggle('is-active', !off);
      if (opt) trig.title = opt.textContent;
    } else {
      trig.classList.toggle('is-off', off);
    }
  }

  // A dropdown anchored inside the bar's scrolling icon cluster gets clipped by
  // it. Switching to fixed positioning takes the menu out of that box; the
  // modal's glass is its containing block, so it still moves with the modal.
  _floatMenu(btn, menu) {
    if (!btn || !menu || menu.style.display === 'none') return;
    const r = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top   = `${Math.round(r.bottom + 4)}px`;
    menu.style.left  = 'auto';
    menu.style.right = `${Math.round(window.innerWidth - r.right)}px`;
  }

  // Destructive row actions confirm where they stand: the button is swapped for
  // a tick and a cross, and the cross puts it back. No dialog, no state to
  // thread through the renderer.
  _confirmInline(btn, onYes, label = '') {
    if (!btn || btn._armed) return;
    btn._armed = true;
    const CHECK = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
    const CROSS = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const holder = document.createElement('span');
    // Anchored to the right edge of the cell so the label grows leftwards into
    // free space instead of pushing the row wider than the table.
    holder.style.cssText = 'display:inline-flex;gap:4px;align-items:center;position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:3';
    const host = btn.parentElement;
    const hostPos = host?.style.position || '';
    const hostOvf = host?.style.overflow || '';
    if (host) { host.style.position = 'relative'; host.style.overflow = 'visible'; }
    const restoreHost = () => { if (!host) return; host.style.position = hostPos; host.style.overflow = hostOvf; };
    // Two red icons side by side say nothing about what they do, so the armed
    // state spells the action out.
    holder.innerHTML = (label
        ? `<span style="font-size:10px;font-weight:600;color:#e5484d;white-space:nowrap;margin-right:2px">${this._escHtml(label)}</span>`
        : '')
      + this._mtRoundBtn('data-confirm-yes', CHECK, label || 'Confirm', { size: 24, tone: 'red' })
      + this._mtRoundBtn('data-confirm-no', CROSS, 'Cancel', { size: 24, tone: 'blue' });
    btn.replaceWith(holder);
    holder.querySelector('[data-confirm-yes]').addEventListener('click', async () => {
      holder.querySelectorAll('button').forEach(b => { b.disabled = true; });
      // The original button goes back first: callers that re-dispatch a click
      // rely on delegation, which only reaches nodes still in the document.
      btn._armed = false;
      holder.replaceWith(btn);
      restoreHost();
      await onYes();
    });
    holder.querySelector('[data-confirm-no]').addEventListener('click', () => {
      btn._armed = false;
      holder.replaceWith(btn);
      restoreHost();
    });
  }

  // One switch for the whole card: the same blue as every other accent, a
  // hairline rim when off. Prowlarr had its own indigo variant.
  _uiSwitch(attr, on, title = '') {
    return `<button ${attr} title="${this._escHtml(title)}" class="ui-sw${on ? ' is-on' : ''}"><span class="ui-sw-k"></span></button>`;
  }

  // Every badge in a table or modal goes through here, so the palette stays a
  // short list rather than a colour invented per call site.
  _uiBadge(label, tone = 'neutral', { small = false, extra = '', title = '', white = false } = {}) {
    const TONES = {
      neutral: '150,150,165',
      blue:    '99,140,255',
      green:   '52,199,89',
      amber:   '255,149,0',
      red:     '255,69,58',
      purple:  '175,82,222',
      teal:    '48,196,196',
    };
    const rgb = TONES[tone] || (typeof tone === 'string' && tone.includes(',') ? tone : TONES.neutral);
    return `<span class="ui-badge${small ? ' ui-badge--sm' : ''}${white ? ' ui-badge--w' : ''}" style="--bdg:${rgb}${extra ? ';' + extra : ''}"${title ? ` title="${this._escHtml(title)}"` : ''}>${label}</span>`;
  }

  // Some badges carry a colour that comes from data (an app's brand hue), not
  // from the palette, so it arrives as hex and is turned into the triple.
  // A status colour comes back as its token (#42) — var(--arr-success-rgb,
  // 52,199,89) — so the badge follows the theme; a colour that is already
  // a token passes through.
  _hexToRgbTriple(hex) {
    const str = String(hex);
    const tok = str.match(/var\(--[\w-]+,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/);
    if (tok) return tok[0];
    const h = str.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    if (!Number.isFinite(n)) return '150,150,165';
    const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    return STATUS_RGB[rgb] ? `var(--arr-${STATUS_RGB[rgb]}-rgb, ${rgb})` : rgb;
  }

  // Dates in the card's own language, not the browser's: day, short month and
  // year unless the caller asks for other parts.
  _uiDateFmt(opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
    return new Intl.DateTimeFormat({ cs: 'cs-CZ', fr: 'fr-FR' }[this._lg()] || 'en-GB', opts);
  }

  // ── Paging ──────────────────────────────────────────────────────────────

  // Chevrons either side of dots (up to 15 pages) or of "page/total".
  // The way back to the top of a long list scrolled on a phone (#48). It
  // rides at the end of the scrolling box, sticky to its bottom, and shows
  // once the reader is a screen and a half down (_wireToTop).
  _toTopHtml() {
    return `<div class="to-top-wrap"><button class="to-top" data-to-top aria-label="Top">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
    </button></div>`;
  }

  // Once for the card: scroll events do not bubble, so they are caught on the
  // way down, for every box with a way back to the top in it
  _wireToTop() {
    const sr = this.shadowRoot;
    if (!sr || sr._toTopWired) return;
    sr._toTopWired = true;
    sr.addEventListener('scroll', e => {
      const box = e.target;
      if (!box?.classList?.contains('vscroll')) return;
      const wrap = this._toTopWrap(box);
      const on = box.scrollTop > box.clientHeight * 1.5;
      if (on && wrap && !wrap.classList.contains('on')) this._syncBottomBar();
      wrap?.classList.toggle('on', on);
      if (box.classList.contains('to-sheet-body') || box.closest('.hdr-full')) this._syncEdgeFade(box);
    }, { capture: true, passive: true });
    sr.addEventListener('click', e => {
      const btn = e.target.closest?.('[data-to-top]');
      if (!btn) return;
      e.stopPropagation();
      (btn.closest('.vscroll') || btn.closest('.to-sheet')?.querySelector(':scope > .to-sheet-body'))
        ?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // A bar fixed along the bottom of the screen — Bubble Card's row of buttons —
  // covers what sits there: the arrow back to the top rises above it, and a
  // window's list ends above it. Looked for when the arrow is about to show,
  // through every shadow root on the page, so not more than once a few seconds.
  _syncBottomBar(force = false) {
    const now = Date.now();
    if (!force && now - (this._bottomBarAt || 0) < 3000) return;
    this._bottomBarAt = now;
    const found = [];
    const look = root => {
      root.querySelectorAll('.bubble-horizontal-buttons-stack-card-container').forEach(e => found.push(e));
      root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) look(e.shadowRoot); });
    };
    try { look(document); } catch (_) { return; }
    const vh = window.innerHeight;
    const top = Math.min(vh, ...found.map(e => e.getBoundingClientRect())
      .filter(r => r.height > 0 && r.top > vh / 2 && r.top < vh).map(r => r.top));
    const h = Math.max(0, Math.round(vh - top));
    this._bottomBarTop = h ? Math.round(top) : null;
    // With room between, as the arrow keeps from the screen's own edge
    if (h) this.style.setProperty('--arr-bottom-bar', `${h + 14}px`);
    else this.style.removeProperty('--arr-bottom-bar');
  }

  // The columns' content fades out just above a bar fixed along the screen's
  // bottom (Bubble Card's buttons), as a window's list does, rather than run
  // on under its icons. The mask sits on what each column holds, not on the
  // column: Chrome draws no mask on a box with its own backdrop-filter, and on
  // the card it would cut the columns' glass off from what lies behind it.
  // The floating page nav keeps clear of the bar on its own. Followed as the
  // page scrolls (_wireStickyNav).
  _syncDockFade() {
    const sr = this.shadowRoot;
    if (!sr) return;
    const top = this._bottomBarTop;
    // Where the mask stands is tied to the scroll by the browser itself (a
    // view() timeline), in the frame the page moves: set from here after a
    // scroll, it trailed behind and caught up. Only what does not move with
    // the scroll is given from here: where the bar is, the scroller's box,
    // the content's height.
    const timeline = DOCK_TIMELINE();
    const sc = timeline ? this._findScrollContainer?.() : null;
    const box = sc?.getBoundingClientRect?.();
    // Not the round minimise / restore button pinned in the corner: the box's
    // reach past the column's edge pushed it half out of the column
    for (const el of sr.querySelectorAll('.card-body > .col > :not(.rp-nav):not([data-min-btn]):not([data-min-restore])')) {
      const r = el.getBoundingClientRect();
      if (top == null || !r.height) {
        if (el.classList.contains('dock-fade')) {
          el.classList.remove('dock-fade', 'dock-tl');
          for (const v of ['--dock-y', '--dock-from', '--dock-to']) el.style.removeProperty(v);
        }
        continue;
      }
      el.classList.add('dock-fade');
      if (timeline && box && sc !== document.scrollingElement) {
        // view(): 0 as its top meets the scroller's bottom edge, 1 as its
        // bottom leaves the top one; the bar's line, in its own coordinates,
        // runs straight between the two
        const H = sc.clientHeight;
        el.classList.add('dock-tl');
        el.style.setProperty('--dock-from', `${Math.round(top - box.top - H)}px`);
        el.style.setProperty('--dock-to', `${Math.round(top - box.top + r.height)}px`);
        el.style.removeProperty('--dock-y');
      } else {
        el.classList.remove('dock-tl');
        el.style.setProperty('--dock-y', `${Math.round(top - r.top)}px`);
      }
    }
  }

  // A window's arrow sits beside its list rather than in it, out of the
  // list's faded edge; elsewhere it rides in the scrolled box
  _toTopWrap(box) {
    return box.querySelector(':scope > .to-top-wrap')
      || (box.classList.contains('to-sheet-body') ? box.parentElement?.querySelector(':scope > .to-top-wrap') : null);
  }

  // Posters cut by a window's edge fade out there: at the bottom while there
  // is more below, at the top once the list has moved
  _syncEdgeFade(box) {
    box.classList.toggle('fade-t', box.scrollTop > 2);
    box.classList.toggle('fade-b', box.scrollHeight - box.clientHeight - box.scrollTop > 2);
  }

  // A shelf's edges fade where it runs on past them: the right while there
  // is more to see, the left once it has moved. Once for the card, scroll
  // caught on the way down as for the arrow to the top.
  _syncShelfFade(row) {
    const max = row.scrollWidth - row.clientWidth;
    row.classList.toggle('fade-l', row.scrollLeft > 2);
    row.classList.toggle('fade-r', max - row.scrollLeft > 2);
  }

  _wireShelfFade() {
    const sr = this.shadowRoot;
    if (!sr) return;
    for (const row of sr.querySelectorAll('.mob-shelves :is(.mgrid, .tl-row)')) this._syncShelfFade(row);
    if (sr._shelfFadeWired) return;
    sr._shelfFadeWired = true;
    sr.addEventListener('scroll', e => {
      const row = e.target;
      if (row?.matches?.('.mob-shelves :is(.mgrid, .tl-row)')) this._syncShelfFade(row);
    }, { capture: true, passive: true });
  }

  _uiPager(attr, page, totalPages, numeric = false) {
    if (totalPages <= 1) return '';
    // Fifteen dots and four arrows are wider than a phone: the last arrow
    // went off the edge. A phone counts instead past eight pages.
    const DOT_LIMIT = this._isMob ? 8 : 15;
    let center;
    if (!numeric && totalPages <= DOT_LIMIT) {
      const dots = Array.from({ length: totalPages }, (_, i) =>
        i === page
          ? `<button data-${attr}="${i}" style="width:18px;height:6px;border-radius:3px;background:var(--is-text);padding:0;min-width:0;flex-shrink:0;vertical-align:middle;border:none;cursor:default;outline:none" disabled></button>`
          : `<button class="tl-page-btn" data-${attr}="${i}" style="width:6px;height:6px;border-radius:50%;background:var(--is-text-muted);padding:0;min-width:0;flex-shrink:0;vertical-align:middle;border:none"></button>`
      ).join('');
      center = `<div class="u-row-5">${dots}</div>`;
    } else {
      center = `<span style="font-size:13px;font-weight:600;color:var(--is-text,rgb(var(--_fg, 255, 255, 255)));min-width:44px;text-align:center">${page + 1}/${totalPages}</span>`;
    }
    const first = page === 0;
    const last  = page >= totalPages - 1;
    const btnSty = 'display:inline-flex;align-items:center;gap:4px;padding:5px 10px';
    return `<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px">
      <button class="tl-page-btn tl-icon-btn" data-${attr}="first" style="${btnSty}"${first ? ' disabled' : ''}>${ICONS.chevLL}</button>
      <button class="tl-page-btn tl-icon-btn" data-${attr}="prev" style="${btnSty}"${first ? ' disabled' : ''}>${ICONS.chevL}</button>
      ${center}
      <button class="tl-page-btn tl-icon-btn" data-${attr}="next" style="${btnSty}"${last ? ' disabled' : ''}>${ICONS.chevR}</button>
      <button class="tl-page-btn tl-icon-btn" data-${attr}="last" style="${btnSty}"${last ? ' disabled' : ''}>${ICONS.chevRR}</button>
    </div>`;
  }

  // A calendar's footer: step back, a pill back to now, step forward. Week
  // views also jump a month at a time with the double chevrons.
  _uiStepNav(attr, { isMonth, atNow, hereKey, hereLabel }) {
    const sty = 'display:inline-flex;align-items:center;gap:4px;padding:5px 10px';
    const btn = (key, ico) => `<button class="tl-page-btn tl-icon-btn" ${attr}="${key}" style="${sty}">${ico}</button>`;
    return [
      isMonth ? '' : btn('prev-month', ICONS.chevLL),
      btn('prev', ICONS.chevL),
      `<button class="tl-page-btn tl-pill-btn${atNow ? ' is-here' : ''}" ${attr}="${hereKey}"${atNow ? ' disabled' : ''}>${hereLabel}</button>`,
      btn('next', ICONS.chevR),
      isMonth ? '' : btn('next-month', ICONS.chevRR),
    ].filter(Boolean).join('\n');
  }
}

export const uiMixin = _UiMethods.prototype;
