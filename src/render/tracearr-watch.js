import { _traSegHtml } from './tracearr-table.js';

// Tracearr, the Watch tab: what is watched, by whom, and the charts. Split out of render/tracearr-table.js.

class _TracearrWatchMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Shared animated donut chart (matches Activity tab style)
  _traDonutSvg(segs, size) {
    const total = segs.reduce((s, sg) => s + (sg.value || 0), 0);
    if (!total) return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"></svg>`;
    const cx = size / 2, cy = size / 2, r = size * 0.34, sw = size * 0.15;
    const C = 2 * Math.PI * r;
    let cum = 0;
    const gap = segs.length > 1 ? 3 : 0;
    const uid = Math.random().toString(36).slice(2, 7);
    const ro = (r + sw / 2).toFixed(1);
    const ri = (r - sw / 2).toFixed(1);
    const ip = (Number(ri) / Number(ro) * 100).toFixed(0);
    const defs = '<defs>' + segs.map((sg, i) =>
      `<radialGradient id="dg-${uid}-${i}" cx="${cx}" cy="${cy}" r="${ro}" fx="${cx}" fy="${cy}" gradientUnits="userSpaceOnUse">` +
      `<stop offset="${ip}%" stop-color="${sg.color}" stop-opacity="0.5"/>` +
      `<stop offset="100%" stop-color="${sg.color}" stop-opacity="1"/>` +
      `</radialGradient>`
    ).join('') + '</defs>';
    const rings = segs.map(sg => {
      const full = sg.value / total * C;
      const dash = Math.max(0, full - gap);
      const off  = -cum; cum += full;
      return `<circle class="donut-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${sw * 1.9}" stroke-linecap="butt" stroke-dasharray="${dash.toFixed(2)} ${(C-dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" stroke-opacity="0" style="transition:stroke-opacity 0.15s"/>`;
    }).join('');
    cum = 0;
    const arcs = segs.map((sg, i) => {
      const full = sg.value / total * C;
      const dash = Math.max(0, full - gap);
      const off  = -cum; cum += full;
      const pct  = Math.round(sg.value / total * 100);
      return `<circle class="donut-arc" data-idx="${i}" data-label="${this._escHtml(sg.label ?? '')}" data-value="${sg.value}" data-pct="${pct}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#dg-${uid}-${i})" stroke-width="${sw}" stroke-linecap="butt" stroke-dasharray="${dash.toFixed(2)} ${(C-dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="cursor:pointer"><animate attributeName="r" from="0" to="${r.toFixed(2)}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/><animate attributeName="stroke-dasharray" from="0 ${C.toFixed(2)}" to="${dash.toFixed(2)} ${(C-dash).toFixed(2)}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/></circle>`;
    }).join('');
    const fs = Math.min(size * 0.14, 12);
    return `<div class="donut-wrap" style="position:relative;display:inline-block;flex-shrink:0"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;overflow:visible">
      ${defs}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${sw}"/>
      <g><animateTransform attributeName="transform" type="rotate" from="-360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/>${rings}${arcs}</g>
      <text x="${cx}" y="${cy + fs * 0.4}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="${fs}" font-weight="700">${total}</text>
    </svg><div class="donut-tt" style="display:none;position:absolute;pointer-events:none;background:rgba(15,15,20,0.92);border:1px solid rgba(255,255,255,0.13);border-radius:6px;padding:5px 9px;white-space:nowrap;z-index:10;color:rgba(255,255,255,0.9)"></div></div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Shared progress pie (5-level Tautulli style, 14×14 SVG)
  _traWatchPie(pct) {
    const ring = '<circle cx="7" cy="7" r="5.5" fill="none" style="stroke:var(--is-text-muted)" stroke-width="1.5"/>';
    const svg  = inner => `<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0">${inner}</svg>`;
    const arc  = d => `<path d="${d}" style="fill:var(--is-text-body)"/>`;
    return pct >= 85 ? svg('<circle cx="7" cy="7" r="5.5" style="fill:var(--is-text-body)"/>') :
           pct >= 63 ? svg(`${ring}${arc('M7,7 L7,1.5 A5.5,5.5 0,1,1 1.5,7 Z')}`) :
           pct >= 38 ? svg(`${ring}${arc('M7,7 L7,1.5 A5.5,5.5 0,0,1 7,12.5 Z')}`) :
           pct >= 10 ? svg(`${ring}${arc('M7,7 L7,1.5 A5.5,5.5 0,0,1 12.5,7 Z')}`) :
                       svg(ring);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Watch tab (library analytics)
  // Partial refresh: only MW data rows (tbody innerHTML replacement)
  _traWatchTopRowsHtml() {
    const m = this._tracearrModal;
    if (!m) return '';
    const isMob   = this._isMob;
    const _topTab  = m.watchTopTab || 'movies';
    const topItems = (_topTab === 'movies' ? m.watchTopMovies : m.watchTopShows) || [];
    const fmtH = h => {
      if (h >= 24) return `${Math.floor(h/24)}d ${Math.round(h%24)}h`;
      return h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(h*60)}m`;
    };
    if (!topItems.length) {
      if (isMob) return `<div style="padding:16px;text-align:center;color:var(--is-text-muted);font-size:11px">${this._t('tlNoData')}</div>`;
      const ROW_H = 'height:40px';
      return `<tr style="${ROW_H}"><td colspan="6" style="text-align:center;color:var(--is-text-muted);font-size:11px">${this._t('tlNoData')}</td></tr>`;
    }
    return topItems.slice(0, 5).map((it, i) => {
      const plays = Number(it.plays ?? it.totalPlays ?? it.playCount ?? it.viewCount ?? it.watchCount ?? it.totalEpisodeViews) || 0;
      const wh    = Number(it.watchHours ?? it.totalWatchHours ?? (it.totalWatchMs ? it.totalWatchMs/3600000 : 0)) || 0;
      const views = Number(it.viewers ?? it.uniqueViewers ?? it.viewerCount ?? 1) || 0;
      const cr    = it.completionRate ?? it.completion ?? it.avgCompletion ?? it.averageCompletion ?? it.episodeCompletionRate ?? it.avgEpisodeCompletion ?? it.avgCompletionRate ?? it.showCompletionRate ?? null;
      const cmplt = cr !== null ? (cr > 1 ? Math.round(cr) : Math.round(cr * 100)) : null;
      const title = this._escHtml(it.title || it.showTitle || it.seriesTitle || '—');
      const yearTxt = it.year ? this._escHtml(it.year) : '';
      const year  = yearTxt ? ` (${yearTxt})` : '';
      if (isMob) {
        const metaParts = [
          plays ? `${plays}×` : null,
          wh > 0 ? fmtH(wh) : null,
          views > 1 ? `${views} viewers` : null,
          cmplt !== null ? `${cmplt}%` : null,
        ].filter(Boolean).join('  ·  ');
        return `<div class="tl-mob-card" style="display:grid;grid-template-columns:16px 1fr;row-gap:3px;column-gap:6px;align-items:center">
          <span style="font-size:9px;color:var(--is-text-muted);text-align:center;line-height:1">${i+1}</span>
          <span style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;min-width:0"><span style="display:flex;flex-shrink:0">${this._tlMediaIcon(_topTab === 'movies' ? 'movie' : 'episode', 15)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}<span style="font-weight:400;opacity:0.5;font-size:10px">${year}</span></span></span>
          <span></span>
          <span class="u-xs-muted">${metaParts}</span>
        </div>`;
      }
      const cmpltCell = cmplt !== null
        ? `<div style="display:flex;align-items:center;gap:5px;justify-content:flex-end">${this._traWatchPie(cmplt)}<span style="font-size:11px;color:var(--is-text-muted)">${cmplt}%</span></div>`
        : `<span style="font-size:10px;color:rgba(255,255,255,0.25)">—</span>`;
      const ROW_H = 'height:40px';
      return `<tr style="${ROW_H}">
        <td style="width:22px;font-size:10px;color:var(--is-text-muted);text-align:center">${i+1}</td>
        <td style="font-size:11px;font-weight:600;color:var(--is-text);max-width:140px"><div style="display:flex;align-items:center;gap:5px;overflow:hidden">${this._tlMediaIcon(_topTab==='movies'?'movie':'episode',15)}<span class="u-truncate">${title}${yearTxt?` <span style="color:var(--is-text-muted);font-weight:400">(${yearTxt})</span>`:''}</span></div></td>
        <td style="font-size:11px;font-weight:600;color:var(--is-text);text-align:right">${plays}</td>
        <td style="font-size:10px;color:var(--is-text-muted);text-align:right">${wh>0?fmtH(wh):'—'}</td>
        <td style="font-size:10px;color:var(--is-text-muted);text-align:right">${views}</td>
        <td style="text-align:right">${cmpltCell}</td>
      </tr>`;
    }).join('');
  }

  // ──────────────────────────────────────────────────────────────────────────

  _traBodyWatch() {
    const m      = this._tracearrModal;
    const isMob  = this._isMob;
    const pat    = m.watchPatterns  || {};
    const stat   = m.watchStatus    || {};
    const comp   = m.watchCompletion || {};
    const topMovies = m.watchTopMovies || [];
    const topShows  = m.watchTopShows  || [];

    // ── helpers ──────────────────────────────────────────────────────────────
    const fmtHours = h => {
      const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
      return hh > 0 ? (mm > 0 ? `${hh}h ${mm}m` : `${hh}h`) : `${mm}m`;
    };
    const fmtMs = ms => fmtHours(ms / 3600000);
    const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

    // ── Extract stats from API responses ─────────────────────────────────────
    // patterns.peakTimes
    const peakTimes   = pat.peakTimes || {};
    const hourDist    = peakTimes.hourlyDistribution || [];
    const hourMap     = new Map(hourDist.map(r => [r.hour, Number(r.watchCount) || 0]));
    const hourVals    = Array.from({length: 24}, (_, h) => hourMap.get(h) || 0);
    const peakHour    = Number(peakTimes.peakHour ?? hourVals.indexOf(Math.max(...hourVals))) || 0;
    const peakHourLabel = `${String(peakHour).padStart(2,'0')}:00`;
    const peakDayNum  = peakTimes.peakDayOfWeek ?? null;
    const peakDay     = peakDayNum !== null ? `(${[this._t('dowSun'),this._t('dowMon'),this._t('dowTue'),this._t('dowWed'),this._t('dowThu'),this._t('dowFri'),this._t('dowSat')][peakDayNum] || ''})` : '';

    // patterns.seasonalTrends
    const seasonal    = pat.seasonalTrends || {};
    const monthlyArr  = seasonal.monthlyTrends || [];
    const busiestMonth  = this._escHtml(seasonal.busiestMonth  || '');
    const quietestMonth = this._escHtml(seasonal.quietestMonth || '');

    // Total watch time from sum of monthly totalWatchMs
    const totalWatchMs = monthlyArr.reduce((s, r) => s + (Number(r.totalWatchMs) || 0), 0);

    // Completion
    const _n = v => Number(v) || 0;
    const completedCount = _n(comp.movie?.summary?.completedCount) + _n(comp.episode?.summary?.completedCount);

    // Donut data (movies/shows watched vs total from completion summary)
    const totalMovies   = _n(comp.movie?.summary?.totalItems);
    const watchedMovies = _n(comp.movie?.summary?.completedCount) + _n(comp.movie?.summary?.inProgressCount);
    const totalShows    = _n(comp.episode?.summary?.totalItems);
    const watchedShows  = _n(comp.episode?.summary?.completedCount) + _n(comp.episode?.summary?.inProgressCount);

    // Watched stat — prefer completion-based counts (unique items) over watch-event total
    const totalItems   = (totalMovies + totalShows) || _n(stat.itemCount);
    const watchedItems = (watchedMovies + watchedShows) || _n(m.watchedTotal);
    const watchedPct   = pct(watchedItems, totalItems);

    // Binge highlights — stored on modal so _traWatchTopRowsHtml() can access it
    const binge        = pat.bingeShows || [];
    m.watchBinge       = binge;
    const bingeRatePct = Math.round(pat.summary?.bingeSessionsPct ?? 0);

    // ── Stat cards ───────────────────────────────────────────────────────────
    const _mdiSvg = (path, sz) => {
      const s = sz || 18;
      return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" style="flex-shrink:0;color:var(--is-text-muted)" fill="currentColor"><path d="${path}"/></svg>`;
    };
    const _mdiEye    = 'M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,19.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z';
    const _mdiClock  = 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z';
    const _mdiCheck  = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
    const _mdiTrend  = 'M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z';

    const statCard = (iconSvg, val, sub) => isMob
      ? `<div class="tl-g-card" style="display:flex;align-items:center;gap:5px;padding:5px 7px">
          ${iconSvg.replace(/width="\d+" height="\d+"/, 'width="13" height="13"')}
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--is-text);line-height:1">${val}</div>
            <div style="font-size:8px;color:var(--is-text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>
          </div>
        </div>`
      : `<div class="tl-g-card" style="display:flex;align-items:center;gap:10px;padding:10px 12px">
          ${iconSvg}
          <div>
            <div style="font-size:14px;font-weight:800;color:var(--is-text);line-height:1">${val}</div>
            <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${sub}</div>
          </div>
        </div>`;

    const statsRow = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${isMob?'4px':'6px'};margin-bottom:8px">
      ${statCard(_mdiSvg(_mdiEye), watchedItems ? `${watchedItems}/${totalItems}` : (totalItems ? `—/${totalItems}` : '—'), isMob ? `${watchedPct}%` : `${this._t('traWatchedOf')} (${watchedPct}%)`)}
      ${statCard(_mdiSvg(_mdiClock), totalWatchMs ? fmtMs(totalWatchMs) : '—', isMob ? this._t('traWatchTimeShort') : this._t('traWatchTime'))}
      ${statCard(_mdiSvg(_mdiCheck), completedCount || '—', isMob ? this._t('qaStatsDone') : this._t('traCompletion'))}
      ${statCard(_mdiSvg(_mdiTrend), hourVals.some(v=>v>0) ? `${peakHourLabel} ${peakDay}` : '—', isMob ? this._t('traPeakHour') : this._t('traPeakHour'))}
    </div>`;

    // ── Most Watched ─────────────────────────────────────────────────────────
    const _topTab    = m.watchTopTab || 'movies';
    const _period    = m.watchPeriod || '30d';
    const _periodMap = { '7d': '7d', '30d': '30d', '90d': '90d', 'all': 'all' };
    const _periodLbl = isMob
      ? { '7d': 'W', '30d': 'M', '90d': '3M', 'all': this._t('tabAll') }
      : { '7d': this._t('mtWeek'), '30d': this._t('mtMonth'), '90d': this._t('traQuarter'), 'all': this._t('tabAll') };
    const _topItems  = _topTab === 'movies' ? topMovies : topShows;
    const _periodBtns = _traSegHtml(Object.keys(_periodMap).map(p => [p, _periodLbl[p]]), _period, 'data-tra-w-period');
    const _topTabBtns = _traSegHtml([['movies', this._t('traMovies')], ['shows', 'TV']], _topTab, 'data-tra-w-top');

    // ── Most Watched + Binge — two separate cards, equal header height ───────
    // CARD_HDR_H: same min-height on both headers → data rows start at same Y
    const _CARD_HDR = 'min-height:42px;display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:nowrap;flex-shrink:0';
    const ROW_H = 'height:40px';

    const mostWatched = isMob
      ? `<div class="tl-g-card u-col">
          <div style="${_CARD_HDR}">
            <span class="tl-graph-title">${this._t('traMostWatched')}</span>
            ${isMob
              ? `<div style="margin-left:auto;display:flex;align-items:center;gap:6px;flex-shrink:0">${_topTabBtns}<span class="mt-tb-sep"></span>${_periodBtns}</div>`
              : `<div class="mt-tb mt-tb--card" style="margin-left:auto;min-height:34px;padding:0 3px;gap:4px;flex-shrink:0">
                   ${_topTabBtns}<span class="mt-tb-sep"></span>${_periodBtns}
                 </div>`}
          </div>
          <div data-tra-watch-top style="display:flex;flex-direction:column;gap:6px">${this._traWatchTopRowsHtml()}</div>
        </div>`
      : `<div class="tl-g-card" style="height:100%;box-sizing:border-box;display:flex;flex-direction:column">
          <div style="${_CARD_HDR}">
            <span class="tl-graph-title">${this._t('traMostWatched')}</span>
            ${isMob
              ? `<div style="margin-left:auto;display:flex;align-items:center;gap:6px;flex-shrink:0">${_topTabBtns}<span class="mt-tb-sep"></span>${_periodBtns}</div>`
              : `<div class="mt-tb mt-tb--card" style="margin-left:auto;min-height:34px;padding:0 3px;gap:4px;flex-shrink:0">
                   ${_topTabBtns}<span class="mt-tb-sep"></span>${_periodBtns}
                 </div>`}
          </div>
          <div style="overflow-x:auto;flex:1">
            <table class="tl-hist-table" style="font-size:11px;width:100%">
              <thead><tr style="${ROW_H}">
                <th style="width:22px">#</th>
                <th>${this._t('traTitle')}</th>
                <th style="text-align:right">${this._t('traPlays')}</th>
                <th style="text-align:right">${this._t('traWatchHours')}</th>
                <th style="text-align:right">${this._t('traViewers')}</th>
                <th style="text-align:right">${this._t('traCompletion')}</th>
              </tr></thead>
              <tbody data-tra-watch-top>${this._traWatchTopRowsHtml()}</tbody>
            </table>
          </div>
        </div>`;

    const scoreTag2 = (score) => {
      const lbl = score >= 80 ? 'highly addictive' : score >= 60 ? 'addictive' : 'bingeable';
      const [bg, txt] = lbl.includes('highly') ? ['rgba(255,59,48,0.18)','#FF3B30'] : lbl.includes('addict') ? ['rgba(255,149,0,0.18)','#FF9500'] : ['rgba(52,199,89,0.15)','#34C759'];
      const dl = lbl.includes('highly') ? this._t('traHighlyAddictive') : lbl.includes('addict') ? this._t('traAddictive') : this._t('traBingeable');
      return `${this._uiBadge(`${dl}`, this._hexToRgbTriple(txt), { small: true })}`;
    };
    const bingeRows = binge.slice(0, 5).map(b => {
      const show = this._escHtml(b.showTitle ?? b.show ?? b.title ?? '—');
      const eps  = this._escHtml(b.totalEpisodeWatches ?? b.episodes ?? '—');
      const cons = this._escHtml(b.consecutiveEpisodes ?? b.consecutive ?? '—');
      const cp   = b.consecutivePct ?? null;
      const bS   = b.bingeScore ?? b.score ?? '—';
      const bSTxt = this._escHtml(bS);
      const maxP = this._escHtml(b.maxEpisodesInOneDay ?? b.maxPerDay ?? '—');
      if (isMob) {
        return `<div class="tl-mob-card" style="display:flex;flex-direction:column;gap:3px">
          <div class="u-row-6">
            <span style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;flex:1;min-width:0"><span style="display:flex;flex-shrink:0">${this._tlMediaIcon('episode', 13)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${show}</span></span>
            ${typeof bS==='number'?scoreTag2(bS):''}
          </div>
          <div style="font-size:10px;color:var(--is-text-muted);display:flex;gap:8px;flex-wrap:wrap">
            <span>${this._t('traNEps').replace('{n}', () => eps)}</span>
            <span>${cons}${cp!==null?` (${Math.round(cp)}%)`:''} ${this._t('traConsec')}</span>
            <span>${this._t('traMaxPerDay').replace('{n}', () => maxP)}</span>
          </div>
        </div>`;
      }
      return `<tr style="${ROW_H}">
        <td style="font-size:11px;font-weight:600;color:var(--is-text);max-width:110px"><div style="display:flex;align-items:center;gap:7px;min-width:0">${this._tlMediaIcon('episode', 15)}<span class="u-truncate">${show}</span></div></td>
        <td style="font-size:11px;color:var(--is-text-muted);text-align:center">${eps}</td>
        <td style="font-size:11px;color:var(--is-text-muted);text-align:center">${cons}${cp!==null?` <span style="font-size:9px">(${Math.round(cp)}%)</span>`:''}</td>
        <td style="text-align:center">
          <span style="font-size:12px;font-weight:800;color:var(--is-text)">${bSTxt}</span>
          ${typeof bS==='number'?scoreTag2(bS):''}
        </td>
        <td style="font-size:11px;color:var(--is-text-muted);text-align:center">${maxP}</td>
      </tr>`;
    }).join('') || (isMob
      ? `<div style="padding:16px;text-align:center;color:var(--is-text-muted);font-size:11px">${this._t('tlNoData')}</div>`
      : `<tr style="${ROW_H}"><td colspan="5" style="text-align:center;color:var(--is-text-muted);font-size:11px">${this._t('tlNoData')}</td></tr>`);

    const _bingeHdr = `<div style="${_CARD_HDR}">
        <div>
          <span class="tl-graph-title">${this._t('traBingeHighlights')}</span>
          <div style="font-size:10px;color:var(--is-text-muted);margin-top:1px">${this._t('traBingeSub')}</div>
        </div>
        ${bingeRatePct>0?`<span style="margin-left:auto;font-size:13px;font-weight:800;color:var(--is-text);flex-shrink:0">${bingeRatePct}% <span style="font-size:10px;color:var(--is-text-muted);font-weight:400">binge sessions</span></span>`:''}
      </div>`;
    const bingeCard = isMob
      ? `<div class="tl-g-card u-col">
          ${_bingeHdr}
          <div style="display:flex;flex-direction:column;gap:6px">${bingeRows}</div>
        </div>`
      : `<div class="tl-g-card" style="height:100%;box-sizing:border-box;display:flex;flex-direction:column">
          ${_bingeHdr}
          <div style="overflow-x:auto;flex:1">
            <table class="tl-hist-table" style="font-size:11px;width:100%">
              <thead><tr style="${ROW_H}">
                <th>${this._t('typeTv')}</th>
                <th style="text-align:center">${this._t('traEpsShort')}</th>
                <th style="text-align:center">${this._t('traConsecutive')}</th>
                <th style="text-align:center">${this._t('traBingeScore')}</th>
                <th style="text-align:center">${this._t('traMaxDay')}</th>
              </tr></thead>
              <tbody>${bingeRows}</tbody>
            </table>
          </div>
        </div>`;

    // ── Viewing Hours bar chart ───────────────────────────────────────────────
    const _wHodTauFmt = (cats, series) => ({ response: { data: { categories: cats, series } } });
    const wHodRaw = _wHodTauFmt(
      Array.from({length: 24}, (_, h) => String(h)),
      [{ name: 'Plays', data: hourVals }]
    );
    const wHodSvg = this._tlGBarSvg(wHodRaw, { isMob, height: isMob ? 70 : 80, chartId: 'tra-whd', xLabel: (_, i) => i % 4 === 0 ? `${String(i).padStart(2,'0')}` : '' });

    // ── Watched donut (Movies / TV Shows) — Activity tab style ──────────────
    const watchDonut = (label, watched, total, color) => {
      const remaining = Math.max(0, total - watched);
      const segs = [
        { label: this._t('traWatchedOf'), value: watched,   color },
        { label: this._t('traRemaining'),             value: remaining, color: 'rgba(255,255,255,0.12)' },
      ].filter(s => s.value > 0);
      const ds = isMob ? 72 : 104;
      const pct = total ? Math.round(watched / total * 100) : 0;
      const legendItems = [
        { label: this._t('traWatchedOf'), value: watched,   color, pct },
        { label: this._t('traRemaining'),             value: remaining, color: 'rgba(255,255,255,0.25)', pct: 100 - pct },
      ].filter(s => s.value > 0).map(s =>
        `<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
          <span style="width:7px;height:7px;border-radius:2px;background:${s.color};flex-shrink:0"></span>
          <span style="font-size:10px;color:var(--is-text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.label}</span>
          <span style="font-size:10px;font-weight:700;color:var(--is-text-muted)">${s.pct}%</span>
        </div>`
      ).join('');
      if (!total) return `<div class="tl-g-card" style="flex:1;box-sizing:border-box;display:flex;flex-direction:column"><span class="tl-graph-title">${label}</span><div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--is-text-muted)">${this._t('tlNoData')}</div></div>`;
      return `<div class="tl-g-card" style="flex:1;box-sizing:border-box;display:flex;flex-direction:column">
        <div style="margin-bottom:8px;flex-shrink:0"><span class="tl-graph-title">${label}</span></div>
        <div style="flex:1;display:flex;align-items:center;gap:12px">
          ${this._traDonutSvg(segs, ds)}
          <div style="flex:1;min-width:0">${legendItems}</div>
        </div>
      </div>`;
    };
    const moviesDonutCard = watchDonut(this._t('traMovies'), watchedMovies, totalMovies, '#007AFF');
    const showsDonutCard  = watchDonut(this._t('tlFilterTvShows'), watchedShows, totalShows, '#BF5AF2');

    const _tipEl = `<div class="tl-g-tip" style="display:none;position:absolute;top:0;left:0;background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:7px;padding:7px 10px;font-size:11px;pointer-events:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div>`;
    const _badge = (txt, color, bg) => `${this._uiBadge(`${txt}`, this._hexToRgbTriple(color), { small: true })}`;

    // ── Viewing Hours bar chart ───────────────────────────────────────────────
    const peakBadge = hourVals.some(v=>v>0)
      ? _badge(`Peak: ${peakHourLabel}`, 'var(--is-text)', 'rgba(255,255,255,0.08)')
      : '';
    const viewingHoursCard = `<div class="tl-g-card" style="flex:1;box-sizing:border-box;display:flex;flex-direction:column;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0">
        <span class="tl-graph-title">${this._t('traViewingHours')}</span>
        ${peakBadge}
      </div>
      <div style="flex:1;position:relative">${wHodSvg}${_tipEl}</div>
    </div>`;

    // ── Monthly Trends line chart — edge-to-edge custom SVG with tooltip ─────
    const mArr = monthlyArr.slice(-12);
    const mN   = mArr.length;
    const _mFmt = cat => {
      const [y, mo] = (cat || '').split('-');
      if (!y || !mo) return String(cat ?? '');
      return `${mo.padStart(2,'0')}-${y.slice(2)}`;
    };
    const mVals  = mArr.map(r => Number(r.watchCount ?? r.count ?? r.plays) || 0);
    const mMax   = Math.max(1, ...mVals);
    const _MC    = '#007AFF';
    const _mEsc  = v => this._escHtml(v);
    const mSvg = (() => {
      if (mN < 2) return '';
      const VBW = 1000, SVH = 200, PL = 12, PR = 6, PT = 18, PB = 6;
      const cW = VBW - PL - PR, cH = SVH - PT - PB, baseY = PT + cH;
      const xOf = i => PL + (i / (mN - 1)) * cW;
      const yOf = v => PT + (1 - v / mMax) * cH;
      const pts = mVals.map((v, i) => ({ x: xOf(i), y: yOf(v), v, cat: _mFmt(mArr[i]?.month || '') }));
      const defs = `<defs>
        <linearGradient id="tra-mt-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${_MC}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${_MC}" stop-opacity="0"/>
        </linearGradient>
        <mask id="tra-mt-mask" maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="${VBW}" height="${SVH}" fill="white"/>
          ${pts.filter(p=>p.v>0).map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="black"/>`).join('')}
        </mask>
      </defs>`;
      let inner = defs;
      inner += `<path d="${this._tlGSmoothArea(pts, baseY)}" style="fill:url(#tra-mt-g);animation:fade-in 0.8s ease-out both"/>`;
      inner += `<path d="${this._tlGSmoothLine(pts)}" fill="none" stroke="${_MC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="tl-g-anim-line" mask="url(#tra-mt-mask)"/>`;
      pts.forEach(p => {
        if (!p.v) return;
        inner += `<circle class="tl-g-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" style="fill:transparent;stroke:${_MC};stroke-width:2.5;cursor:pointer" vector-effect="non-scaling-stroke" data-tl-g-dot="${_mEsc(JSON.stringify({lbl:p.cat,name:this._t('traWatches'),val:p.v,hex:_MC}))}"/>`;
      });
      const slotW = cW / mN;
      pts.forEach((p, i) => {
        const rx = i === 0 ? PL : p.x - slotW / 2;
        const rw = i === mN - 1 ? (VBW - PR - rx) : slotW;
        const td = _mEsc(JSON.stringify({ lbl: p.cat, tot: p.v, vals: [{ n: this._t('traWatches'), v: p.v, fv: null, hex: _MC }] }));
        inner += `<g class="tl-g-lcol" data-tl-g-col="${td}" style="cursor:pointer"><rect class="tl-g-lhlt" x="${rx.toFixed(1)}" y="${PT}" width="${rw.toFixed(1)}" height="${cH}" style="fill:var(--tl-col-hlt);opacity:0"/><rect x="${rx.toFixed(1)}" y="${PT}" width="${rw.toFixed(1)}" height="${cH}" fill="transparent"/></g>`;
      });
      const svgEl = this._tlGSvgEl(inner, isMob ? 70 : 80);
      const xLbls = `<div style="position:relative;height:16px;margin-top:2px">
        <span style="position:absolute;left:0;font-size:9px;color:var(--is-text-muted)">${this._escHtml(pts[0].cat)}</span>
        <span style="position:absolute;right:0;font-size:9px;color:var(--is-text-muted)">${this._escHtml(pts[mN-1].cat)}</span>
      </div>`;
      return this._tlGWrap(svgEl, xLbls, '');
    })();
    const mTags = `<div style="display:flex;gap:4px;flex-wrap:wrap">
      ${busiestMonth  ? _badge(`${this._t('traBusiest')}: ${busiestMonth}`,  '#34C759', 'rgba(52,199,89,0.15)') : ''}
      ${quietestMonth && quietestMonth !== busiestMonth ? _badge(`${this._t('traQuietest')}: ${quietestMonth}`, 'var(--is-text)', 'rgba(255,255,255,0.08)') : ''}
    </div>`;
    const monthlyCard = `<div class="tl-g-card" style="flex:1;box-sizing:border-box;display:flex;flex-direction:column;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:4px;flex-wrap:wrap;flex-shrink:0">
        <span class="tl-graph-title">${this._t('traMonthlyTrends')}</span>
        ${mTags}
      </div>
      ${mN >= 2
        ? `<div style="flex:1;position:relative">${mSvg}${_tipEl}</div>`
        : `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--is-text-muted)">${this._t('tlNoData')}</div>`
      }
    </div>`;

    // ── Layout ───────────────────────────────────────────────────────────────
    if (isMob) {
      return `${statsRow}
        <div style="display:flex;flex-direction:column;gap:8px">
          ${mostWatched}${bingeCard}${moviesDonutCard}${showsDonutCard}${viewingHoursCard}${monthlyCard}
        </div>`;
    }
    return `${statsRow}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;align-items:stretch">
        <div style="grid-column:span 2;display:flex;flex-direction:column">${mostWatched}</div>
        <div style="grid-column:span 2;display:flex;flex-direction:column">${bingeCard}</div>
        <div class="u-col">${moviesDonutCard}</div>
        <div class="u-col">${showsDonutCard}</div>
        <div class="u-col">${viewingHoursCard}</div>
        <div class="u-col">${monthlyCard}</div>
      </div>`;
  }

}

export const tracearrWatchMixin = _TracearrWatchMethods.prototype;
