// The week calendar modal. Split out of popup/index.js.
import { BP, maxWidth } from '../shared/ui.js';

class _PopupCalendarMethods {

// ─────────────────────────────────────────────
// Calendar modal
// ─────────────────────────────────────────────

_renderCalendarModal() {
  const CAL_MAX = 5;
  // Matches the modal's own mobile breakpoint in styles/index.js
  const calMob = maxWidth(BP.COMPACT);
  // Forced down in memory only — localStorage keeps the desktop preference, so
  // going back to a wide viewport restores the month view.
  if (calMob && this._calendarView === 'month') this._calendarView = 'week';
  const isMonth = this._calendarView === 'month';
  const DAY_NAMES = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

  // Local date string helper — avoids UTC/local mismatch
  const localDateStr = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = localDateStr(new Date());

  const activeTab = this._calendarTab || 'tv';
  const filteredData = activeTab === 'all'
    ? (this._calendarModalData || [])
    : (this._calendarModalData || []).filter(ep =>
        activeTab === 'movie' ? ep._mediaType === 'movie'
        : activeTab === 'music' ? ep._mediaType === 'music'
        : (ep._mediaType !== 'movie' && ep._mediaType !== 'music')
      );

  // Group by airDate (Sonarr local date, no time component)
  const byDay = {};
  for (const ep of filteredData) {
    const key = (ep.airDate || '').split('T')[0];
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(ep);
  }

  const DOTS = `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" style="display:block"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
  // A 30%-alpha blue with a white glyph disappears on a light backdrop
  const _dotsBg  = this._isDay ? 'rgba(0,122,255,0.85)' : 'rgba(0,122,255,0.30)';
  const _dotsBdr = this._isDay ? 'rgba(0,122,255,0.95)' : 'rgba(0,122,255,0.50)';
  const _dotsBtn = (dateStr, n, size = 34) => `<button data-cal-day="${dateStr}" title="${n}" style="width:${size}px;height:${size}px;padding:0;border-radius:50%;border:1px solid ${_dotsBdr};background:${_dotsBg};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0;backdrop-filter:blur(8px)">${DOTS}</button>`;

  let gridHtml, rangeLabel;

  if (isMonth) {
    const { start, month, weeks, base } = this._calMonthRange(this._calendarMonthOffset || 0);
    const cells = Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = localDateStr(d);
      const items = byDay[dateStr] || [];
      const outside = d.getMonth() !== month;
      // Posters of the day's entries, knocked back to a backdrop so the counts
      // stay legible over them — lightened in day mode, darkened at night.
      const posters = items.map(ep => this._calItemPoster(ep)).filter(Boolean).slice(0, 4);
      const scrim = this._isDay
        ? 'linear-gradient(180deg,rgba(255,255,255,0.58) 0%,rgba(255,255,255,0.74) 100%)'
        : 'linear-gradient(180deg,rgba(18,18,22,0.45) 0%,rgba(14,14,18,0.62) 100%)';
      const mosaic = posters.length
        ? `<div style="position:absolute;inset:0;z-index:0;display:flex">${posters.map(u => `<div style="flex:1;min-width:0;background:url('${u}') center/cover no-repeat"></div>`).join('')}</div>
           <div style="position:absolute;inset:0;z-index:1;background:${scrim}"></div>`
        : '';

      const nMovie = items.filter(ep => ep._mediaType === 'movie').length;
      // Distinct series, not episodes — two episodes of one show is one series
      const nTv = new Set(items.filter(ep => ep._mediaType !== 'movie' && ep._mediaType !== 'music')
        .map(ep => this._calItemSeries(ep)?.id ?? ep.seriesId)).size;
      const nMusic = items.filter(ep => ep._mediaType === 'music').length;
      // Same dark pill the posters use for their type tag, a size up
      const _line = (n, forms) => `<span class="media-type-tag" style="position:static;font-size:11px;padding:3px 8px;border-radius:5px;white-space:nowrap">${this._calPlural(n, forms)}</span>`;
      const counts = [
        nMovie ? _line(nMovie, 'calMovieForms') : '',
        nTv ? _line(nTv, 'calSeriesForms') : '',
        nMusic ? _line(nMusic, 'calAlbumForms') : '',
      ].join('');

      // Mosaic lives inside the body, so the day-number strip stays clean
      // The whole cell opens the day, so no overflow button is needed here
      const open = items.length ? ` data-cal-day="${dateStr}"` : '';
      return `<div class="cal-day-col${dateStr === todayStr ? ' cal-day-today' : ''}" style="${outside ? 'opacity:0.35;' : ''}min-height:0;overflow:hidden">
        <div class="cal-day-hdr" style="padding:5px 4px 4px">
          <span class="cal-day-num${dateStr === todayStr ? ' cal-day-num-today' : ''}" style="font-size:13px">${d.getDate()}</span>
        </div>
        <div${open} style="position:relative;flex:1;min-height:0;overflow:hidden;${open ? 'cursor:pointer' : ''}">
          ${mosaic}
          <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;text-align:center">
            ${counts}
          </div>
        </div>
      </div>`;
    }).join('');
    const dayHdr = DAY_NAMES.map(n => `<div class="cal-day-name" style="text-align:center;padding:2px 0">${n}</div>`).join('');
    gridHtml = `<div style="display:flex;flex-direction:column;gap:6px;flex:1;min-height:0;padding:8px">
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;flex-shrink:0">${dayHdr}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(${weeks},1fr);gap:6px;flex:1;min-height:0">${cells}</div>
    </div>`;
    rangeLabel = base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } else {
    const { start, end } = this._calWeekRange(this._calendarWeekOffset || 0);
    const cols = DAY_NAMES.map((name, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr  = localDateStr(d);
      const isToday  = dateStr === todayStr;
      const episodes = byDay[dateStr] || [];
      const cards    = episodes.slice(0, CAL_MAX).map(ep => this._renderCalendarModalCard(ep)).join('');
      const more = episodes.length > CAL_MAX
        ? `<div style="display:flex;justify-content:center;padding-top:2px">${_dotsBtn(dateStr, episodes.length)}</div>`
        : '';
      return `
        <div class="cal-day-col${isToday ? ' cal-day-today' : ''}${episodes.length === 0 ? ' cal-day-empty' : ''}">
          <div class="cal-day-hdr">
            <span class="cal-day-name">${name}</span>
            <span class="cal-day-num${isToday ? ' cal-day-num-today' : ''}">${d.getDate()}</span>
          </div>
          <div class="cal-day-body">${cards}${more}</div>
        </div>`;
    }).join('');
    gridHtml = `<div class="cal-modal-grid">${cols}</div>`;
    rangeLabel = this._fmtWeekRange(start, end);
  }

  const loading = this._calendarModalLoading
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);border-radius:inherit;z-index:10"><span class="action-spinner" style="width:28px;height:28px"></span></div>`
    : '';

  const closeX = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const backX  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>`;
  // A day's list swaps out the grid and footer; the header stays put
  const dayOpen = !!this._calDayOpen;
  const dayLabel = dayOpen
    ? new Date(this._calDayOpen).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const atNow = isMonth ? (this._calendarMonthOffset || 0) === 0 : (this._calendarWeekOffset || 0) === 0;
  const footer = this._uiStepNav('data-cal-action', { isMonth, atNow, hereKey: 'this-week',
    hereLabel: isMonth ? this._t('mtThisMonth') : this._t('mtThisWeek') });

  const isDay = this._isDay;

  // Type filter and view switch, matching the Maintainerr calendar
  const _si = this._mtSegIcons;
  // "All" has no obvious glyph, so it keeps its word; the other two are icons
  const typeSeg = this._mtSegmented('data-cal-type-seg', [
    { v: 'all', label: this._t('tabAll'), attr: 'data-cal-action="tab-all"' },
    { v: 'movie', label: this._t('tabMovies'), icon: _si.movie, attr: 'data-cal-action="tab-movie"' },
    { v: 'tv', label: this._t('tabTvShows'), icon: _si.tv, attr: 'data-cal-action="tab-tv"' },
    ...(this._lidarrConfigured !== false
      ? [{ v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: 'data-cal-action="tab-music"' }]
      : []),
  ], activeTab, { width: 52, accent: '0,122,255', animatePrev: !!this._calAnimType, prev: this._calPrevTab });

  // A month grid needs seven usable columns; on a phone the modal collapses to
  // one column per day, so the view has nowhere to live and the switch goes too.
  const viewSeg = calMob ? '' : this._mtSegmented('data-cal-view-seg', [
    { v: 'week', label: this._t('mtWeek'), icon: _si.week },
    { v: 'month', label: this._t('mtMonth'), icon: _si.month },
  ], isMonth ? 'month' : 'week', { icons: true, animatePrev: !!this._calAnimView, prev: isMonth ? 'week' : 'month' });

  return `
    <div class="popup-overlay${isDay ? ' popup-day' : ''}" id="cal-overlay">
      <div class="popup-glass cal-modal-glass" id="cal-glass">
        ${loading}
        <div class="cal-modal-hdr" style="justify-content:flex-start">
          <div class="is-filter" style="flex-shrink:0">${typeSeg}</div>
          <span class="cal-week-label">${dayOpen ? this._escHtml(dayLabel) : rangeLabel}</span>
          <div style="flex:1;min-width:8px"></div>
          <button class="popup-close" data-cal-action="${dayOpen ? 'day-back' : 'close'}" style="position:static;flex-shrink:0;margin-left:4px">${dayOpen ? backX : closeX}</button>
        </div>
        ${dayOpen ? this._renderCalDayList(byDay[this._calDayOpen] || []) : gridHtml}
        ${dayOpen ? '' : `<div class="cal-modal-footer" style="position:relative">
          ${footer}
          ${viewSeg ? `<div style="position:absolute;left:14px;top:50%;transform:translateY(-50%)">${viewSeg}</div>` : ''}
        </div>`}
      </div>
    </div>`;
}

// Every entry for one day, filling the space the grid normally occupies
// Czech needs three plural forms; English reuses the second for both.
_calPlural(n, formsKey) {
  const forms = this._t(formsKey);
  if (!Array.isArray(forms)) return `${n}`;
  const i = n === 1 ? 0 : (n >= 2 && n <= 4 ? 1 : 2);
  return `${n} ${forms[i]}`;
}

_renderCalDayList(items) {
  if (!items.length) return `<div class="cal-modal-grid" style="display:flex;align-items:center;justify-content:center"><span class="u-empty-dim">—</span></div>`;
  return `<div style="flex:1;min-height:0;overflow-y:auto;padding:8px">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">
      ${items.map(ep => this._renderCalendarModalCard(ep)).join('')}
    </div>
  </div>`;
}

_wireCalendarModal() {
  const root    = this.shadowRoot?.getElementById('cal-modal-root');
  if (!root) return;
  const overlay = root.querySelector('#cal-overlay');
  const glass   = root.querySelector('#cal-glass');
  if (!overlay || !glass) return;

  // Backdrop closes modal
  overlay.addEventListener('click', () => {
    this._calendarModalOpen = false;
    this._renderCalendarModalEl();
  });

  // Glass handles actions, stops backdrop propagation
  glass.addEventListener('click', async e => {
    e.stopPropagation();
    const action = e.target.closest('[data-cal-action]')?.dataset.calAction;
    // Day buttons and the view switch carry no data-cal-action of their own
    const albumTile = e.target.closest('[data-album-cal]');
    if (albumTile) {
      this._openCalAlbumArtist(Number(albumTile.dataset.albumCal));
      return;
    }
    if (!action && !e.target.closest('[data-cal-day],[data-cal-view-seg]')) return;
    if (action === 'close') {
      this._calendarModalOpen = false;
      this._renderCalendarModalEl();
      return;
    }
    const isMonth = this._calendarView === 'month';

    if (action === 'day-back') {
      this._calDayOpen = null;
      this._renderCalendarModalEl();
      return;
    }
    if (action === 'this-week') {
      if (isMonth) this._calendarMonthOffset = 0;
      else this._calendarWeekOffset = 0;
      await this._fetchCalendarWindow();
      return;
    }
    // Double chevrons only exist in week view, where they jump four weeks
    if (action === 'prev-month' || action === 'next-month') {
      this._calendarWeekOffset = (this._calendarWeekOffset || 0) + (action === 'next-month' ? 4 : -4);
      await this._fetchCalendarWindow();
      return;
    }
    if (action === 'prev' || action === 'next') {
      const step = action === 'next' ? 1 : -1;
      if (isMonth) this._calendarMonthOffset = (this._calendarMonthOffset || 0) + step;
      else this._calendarWeekOffset = (this._calendarWeekOffset || 0) + step;
      await this._fetchCalendarWindow();
      return;
    }
    if (action === 'tab-all' || action === 'tab-tv' || action === 'tab-movie' || action === 'tab-music') {
      const next = action === 'tab-movie' ? 'movie'
                 : action === 'tab-tv' ? 'tv'
                 : action === 'tab-music' ? 'music' : 'all';
      if (next === (this._calendarTab || 'tv')) return;
      this._calPrevTab = this._calendarTab || 'tv';
      this._calAnimType = true;
      this._calendarTab = next;
      // Deliberately keeps an open day — the filter applies to its list too
      try { localStorage.setItem('arr-cal-tab', this._calendarTab); } catch (_) {}
      this._renderCalendarModalEl();
      return;
    }

    const dayBtn = e.target.closest('[data-cal-day]');
    if (dayBtn) {
      this._calDayOpen = dayBtn.dataset.calDay;
      this._renderCalendarModalEl();
      return;
    }

    if (e.target.closest('[data-cal-view-seg]')) {
      this._calendarView = isMonth ? 'week' : 'month';
      this._calAnimView = true;
      this._calDayOpen = null;
      try { localStorage.setItem('arr-cal-view', this._calendarView); } catch (_) {}
      await this._fetchCalendarWindow();
      return;
    }
  });
}

}

export const popupCalendarMixin = _PopupCalendarMethods.prototype;
