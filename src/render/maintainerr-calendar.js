// Maintainerr, the Calendar tab: when collections are due to delete what. Split out of render/maintainerr.js.
import { BP, maxWidth } from '../shared/ui.js';

class _MaintainerrCalendarRenderMethods {


  // ── Calendar tab ──────────────────────────────────────────────────────────

  // Week grid in the card's own calendar style, showing what each rule will
  // delete and when. Days with more than MT_CAL_MAX entries collapse the
  // remainder behind a round "…" that opens the full list.
  // Week and month views over the same scheduled-deletion data. Week shows the
  // usual poster cards; month only has room for the count and the overflow
  // button, so it drops the posters.
  _mtCalendarTabHtml() {
    const m = this._maintainerrModal;
    if (!m) return '';
    // Seeded in _openMaintainerrModal, including the remembered view
    const cal = m.cal || (m.cal = { weekOffset: 0, monthOffset: 0, view: 'week', dayModal: null });
    // Matches the calendar grid's own mobile breakpoint in styles/index.js: at
    // one column per day a month grid has nowhere to live, so it and its switch
    // both drop out and the view falls back to the week.
    const calMob = maxWidth(BP.COMPACT);
    // Forced down in memory only — the stored preference survives, so a wide
    // viewport gets the month view back.
    if (calMob && cal.view === 'month') cal.view = 'week';
    const isMonth = cal.view === 'month';
    const MT_CAL_MAX = 5;

    // Rendered in the previous state when a toggle just happened, so the wire
    // layer can flip it on the next frame and let the slide actually run —
    // a freshly inserted element would otherwise jump straight to its end state.
    const _ico = this._mtSegIcons;
    const viewSel = calMob ? '' : this._mtSegmented('data-mt-cal-seg', [
      { v: 'week', label: this._t('mtWeek'), icon: _ico.week },
      { v: 'month', label: this._t('mtMonth'), icon: _ico.month },
    ], cal.view === 'month' ? 'month' : 'week', { icons: true, animatePrev: !!cal._animSeg });

    if (!this._mtDelItems) {
      return `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
    }

    // A day's full list replaces the grid outright. Overlaying it inside the
    // padded modal body left a translucent panel floating short of the edges.
    if (cal.dayModal) return this._mtCalDayModalHtml();

    const localDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = localDateStr(new Date());

    const byDay = {};
    for (const it of this._mtDelItems) {
      // Past due but still queued — Maintainerr deletes it on its next run, so
      // it belongs on today rather than on a date already gone from view. The
      // category poster counts it the same way; the two disagreed before.
      const d = new Date(it.due);
      const key = localDateStr(d.getTime() < Date.now() ? new Date() : d);
      it._overdue = key === todayStr && localDateStr(d) !== todayStr;
      (byDay[key] || (byDay[key] = [])).push(it);
    }

    const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const DOTS = `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" style="display:block"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;

    const _countBadge = (n, block = true) => this._uiBadge(`${n} ${this._t('mtScheduled')}`, 'blue', { extra: `display:${block ? 'flex' : 'inline-flex'};justify-content:center;letter-spacing:0.03em;min-width:0;overflow:hidden;text-overflow:ellipsis` });
    // A 30%-alpha blue with a white glyph disappears on a light backdrop
    const _dotsBg  = this._isDay ? 'rgba(0,122,255,0.85)' : 'rgba(0,122,255,0.30)';
    const _dotsBdr = this._isDay ? 'rgba(0,122,255,0.95)' : 'rgba(0,122,255,0.50)';
    const _dotsBtn = (dateStr, n, size = 34) => `<button data-mt-cal-day="${dateStr}" title="${n} ${this._t('mtItems')}" style="width:${size}px;height:${size}px;padding:0;border-radius:50%;border:1px solid ${_dotsBdr};background:${_dotsBg};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0;backdrop-filter:blur(8px)">${DOTS}</button>`;

    let gridHtml, rangeLabel;

    if (isMonth) {
      const base = new Date();
      base.setDate(1);
      base.setMonth(base.getMonth() + (cal.monthOffset || 0));
      base.setHours(0, 0, 0, 0);
      const month = base.getMonth();
      // Grid always starts on the Monday on or before the 1st
      const first = new Date(base);
      first.setDate(1 - ((base.getDay() + 6) % 7));
      const weeks = Math.ceil(((base.getDay() + 6) % 7 + new Date(base.getFullYear(), month + 1, 0).getDate()) / 7);

      const cells = Array.from({ length: weeks * 7 }, (_, i) => {
        const d = new Date(first);
        d.setDate(first.getDate() + i);
        const dateStr = localDateStr(d);
        const items = byDay[dateStr] || [];
        const outside = d.getMonth() !== month;
        // The whole cell opens the day, as in the Calendar category's month
        // view — an overflow button next to the badge was a second control for
        // the one thing the cell already does.
        const open = items.length ? ` data-mt-cal-day="${dateStr}"` : '';
        return `<div class="cal-day-col${dateStr === todayStr ? ' cal-day-today' : ''}" style="${outside ? 'opacity:0.35;' : ''}min-height:0">
          <div class="cal-day-hdr" style="padding:5px 4px 4px">
            <span class="cal-day-num${dateStr === todayStr ? ' cal-day-num-today' : ''}" style="font-size:13px">${d.getDate()}</span>
          </div>
          <div${open} style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px;overflow:hidden;${open ? 'cursor:pointer' : ''}">
            ${items.length ? _countBadge(items.length, false) : ''}
          </div>
        </div>`;
      }).join('');

      const dayHdr = DAY_NAMES.map(n => `<div class="cal-day-name" style="text-align:center;padding:2px 0">${n}</div>`).join('');
      gridHtml = `<div style="display:flex;flex-direction:column;gap:6px;flex:1;min-height:0">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;flex-shrink:0">${dayHdr}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(${weeks},1fr);gap:6px;flex:1;min-height:0">${cells}</div>
      </div>`;
      rangeLabel = base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else {
      const { start } = this._calWeekRange(cal.weekOffset || 0);
      const cols = DAY_NAMES.map((name, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = localDateStr(d);
        const isToday = dateStr === todayStr;
        const items = (byDay[dateStr] || []).sort((a, b) => a.title.localeCompare(b.title));
        const shown = items.slice(0, MT_CAL_MAX);

        const chips = shown.map(it => this._mtOvPosterCard(it.raw, {
          compact: true,
          dueMs: null,
          type: it.mediaType,
          fallbackPoster: it.raw?.image_path || '',
          // Overdue titles sit on today's column; say so, or they read as due
          // today and the delay goes unnoticed.
          topBadge: (it._overdue ? `<span class="badge b-missing">${this._escHtml(this._t('mtOverdue'))}</span>` : '')
            + (it.seasonIndex != null ? `<span class="badge b-ep">S${this._escHtml(String(it.seasonIndex).padStart(2, '0'))}</span>` : ''),
        })).join('');

        const more = items.length > MT_CAL_MAX
          ? `<div style="display:flex;justify-content:center;padding-top:2px">${_dotsBtn(dateStr, items.length)}</div>`
          : '';
        // Same column markup the Calendar category's modal uses, so both week
        // views share one set of styles — including the mobile row layout.
        return `<div class="cal-day-col${isToday ? ' cal-day-today' : ''}${items.length === 0 ? ' cal-day-empty' : ''}">
          <div class="cal-day-hdr">
            <span class="cal-day-name">${name}</span>
            <span class="cal-day-num${isToday ? ' cal-day-num-today' : ''}">${d.getDate()}</span>
          </div>
          <div class="cal-day-body">${chips}${more}</div>
        </div>`;
      }).join('');

      const endD = new Date(start); endD.setDate(start.getDate() + 6);
      gridHtml = `<div class="cal-modal-grid" style="padding:0">${cols}</div>`;
      rangeLabel = `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${endD.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    const atNow = isMonth ? (cal.monthOffset || 0) === 0 : (cal.weekOffset || 0) === 0;
    // Switch sits bottom-left in every view, opposite the poster grids' column
    // slider, so it is always in the same place.
    const footer = `<div style="position:relative;display:flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;margin-top:10px">
      ${this._uiStepNav('data-mt-cal-nav', { isMonth, atNow, hereKey: 'today',
        hereLabel: isMonth ? this._t('mtThisMonth') : this._t('mtThisWeek') })}
      ${viewSel ? `<div style="position:absolute;left:0;top:50%;transform:translateY(-50%)">${viewSel}</div>` : ''}
    </div>`;

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;position:relative">
      <div style="flex-shrink:0;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700;color:var(--is-text)">${this._escHtml(rangeLabel)}</span>
      </div>
      ${gridHtml}
      ${footer}
    </div>`;
  }

  // Full list for one day. Rendered as an overlay over the calendar rather than
  // a dialog, so going back is a chevron rather than a Close button.
  _mtCalDayModalHtml() {
    const cal = this._maintainerrModal?.cal;
    const dateStr = cal?.dayModal;
    if (!dateStr) return '';
    const localDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const all = (this._mtDelItems || [])
      .filter(it => localDateStr(new Date(it.due)) === dateStr)
      .sort((a, b) => a.title.localeCompare(b.title));

    const PAGE = 12;
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE));
    cal.dayPages = totalPages;
    const page = Math.min(cal.dayPage || 0, totalPages - 1);
    const items = all.slice(page * PAGE, (page + 1) * PAGE);

    const rows = items.map(it => `<tr data-mt-cal-item="${this._mtDelItems.indexOf(it)}" style="cursor:pointer">
      <td><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(it.title)}</div></td>
      <td style="white-space:nowrap;color:var(--is-text-muted)">${new Date(it.addDate).toLocaleDateString()}</td>
      <td><span data-mt-cal-col="${this._escHtml(it.colId)}" style="color:rgba(245,158,11,0.95);cursor:pointer;text-decoration:underline">${this._escHtml(it.colTitle)}</span></td>
      <td style="white-space:nowrap;color:var(--is-text-muted)">${this._escHtml(it.typeLabel)}</td>
    </tr>`).join('');

    const _th = 'user-select:none;white-space:nowrap';
    const day = new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
      <div style="flex-shrink:0;margin-bottom:12px">
        <div style="font-size:14px;font-weight:700;color:var(--is-text)">${all.length} ${this._t('mtScheduled')}</div>
        <div style="font-size:11px;color:var(--is-text-muted)">${this._escHtml(day)}</div>
      </div>
      <div style="flex:1;min-height:0;overflow:hidden">
        <table class="tl-users-table lib-table" style="width:100%;table-layout:fixed">
          <thead><tr>
            <th style="${_th};width:auto">${this._t('mtMedia')}</th>
            <th style="${_th};width:110px">${this._t('mtAddedOn')}</th>
            <th style="${_th};width:200px">${this._t('mtCollection')}</th>
            <th style="${_th};width:90px">${this._t('mtType')}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${this._uiPager('mt-cal-day-page', page, totalPages, true)}
    </div>`;
  }

}

export const maintainerrCalendarRenderMixin = _MaintainerrCalendarRenderMethods.prototype;
