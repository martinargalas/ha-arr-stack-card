// ──────────────────────────────────────────────────────────────────────────
// Shared UI pieces — toolbar, badges, switches, inline confirm, paging.
// Every modal builds these through the card, so they live in one place
// rather than in whichever feature happened to need them first.
// ──────────────────────────────────────────────────────────────────────────
import { ICONS } from '../shared/ui.js';

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
    return `<button ${attr} title="${this._escHtml(title)}"
      style="flex-shrink:0;width:36px;height:20px;border-radius:999px;box-sizing:border-box;cursor:pointer;position:relative;padding:0;transition:background 0.15s,border-color 0.15s;border:1px solid ${on ? 'rgba(0,122,255,0.8)' : 'rgba(255,255,255,0.12)'};background:${on ? 'rgba(0,122,255,0.7)' : 'rgba(255,255,255,0.06)'}">
      <span style="position:absolute;top:50%;transform:translateY(-50%);left:${on ? '18px' : '4px'};width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,${on ? '0.95' : '0.45'});transition:left 0.15s"></span>
    </button>`;
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
  _hexToRgbTriple(hex) {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return Number.isFinite(n) ? `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}` : '150,150,165';
  }

  // Dates in the card's own language, not the browser's: day, short month and
  // year unless the caller asks for other parts.
  _uiDateFmt(opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
    return new Intl.DateTimeFormat({ cs: 'cs-CZ', fr: 'fr-FR' }[this._lg()] || 'en-GB', opts);
  }

  // ── Paging ──────────────────────────────────────────────────────────────

  // Chevrons either side of dots (up to 15 pages) or of "page/total".
  _uiPager(attr, page, totalPages, numeric = false) {
    if (totalPages <= 1) return '';
    const DOT_LIMIT = 15;
    let center;
    if (!numeric && totalPages <= DOT_LIMIT) {
      const dots = Array.from({ length: totalPages }, (_, i) =>
        i === page
          ? `<button data-${attr}="${i}" style="width:18px;height:6px;border-radius:3px;background:var(--is-text);padding:0;min-width:0;flex-shrink:0;vertical-align:middle;border:none;cursor:default;outline:none" disabled></button>`
          : `<button class="tl-page-btn" data-${attr}="${i}" style="width:6px;height:6px;border-radius:50%;background:var(--is-text-muted);padding:0;min-width:0;flex-shrink:0;vertical-align:middle;border:none"></button>`
      ).join('');
      center = `<div class="u-row-5">${dots}</div>`;
    } else {
      center = `<span style="font-size:13px;font-weight:600;color:var(--is-text,#fff);min-width:44px;text-align:center">${page + 1}/${totalPages}</span>`;
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
