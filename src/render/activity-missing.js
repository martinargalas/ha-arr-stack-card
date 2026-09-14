import { isMobile } from '../shared/ui.js';

// Activity, the Missing tab and its cards. Split out of render/activity.js.

class _ActivityMissingRenderMethods {

  // ── Missing / Wanted poster card ─────────────────────────────────────────

  _actMissingCard() {
    const cache = this._actMissingCache;
    const movieCount  = cache?.movieCount  ?? null;
    const seriesCount = cache?.seriesCount ?? null;

    const badge = movieCount !== null
      ? this._uiBadge(String(movieCount + seriesCount), 'amber', { extra: 'flex-shrink:0', white: true })
      : '';

    const filmSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    const tvSvg   = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
    const mkRow    = (svg, label, count) => `<div class="u-row-6"><span style="opacity:0.6;flex-shrink:0;display:flex">${svg}</span><span style="font-size:10px;font-weight:600;color:var(--is-text-sec);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span><span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);flex-shrink:0">${count}</span></div>`;
    const mkSubRow = (label, count) => `<div style="display:flex;align-items:center;gap:6px;padding-left:16px"><span style="font-size:9px;color:var(--is-text-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span><span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.75);flex-shrink:0">${count}</span></div>`;

    let rows = '';
    if (cache && movieCount !== null) {
      const rRecs = cache.rRecs || [];
      const sRecs = cache.sRecs || [];
      const hasR2 = this._radarr2Configured === true;
      const hasS2 = this._sonarr2Configured === true;
      if (hasR2 || hasS2) {
        const r1 = rRecs.filter(r => r._inst === 'radarr').length;
        const r2 = rRecs.filter(r => r._inst === 'radarr2').length;
        const s1 = sRecs.filter(s => s._inst === 'sonarr').length;
        const s2 = sRecs.filter(s => s._inst === 'sonarr2').length;
        if (movieCount > 0) {
          rows += mkRow(filmSvg, this._t('tlFilterMovies'), movieCount);
          if (hasR2) {
            if (r1 > 0) rows += mkSubRow(this._instLabel('radarr'), r1);
            if (r2 > 0) rows += mkSubRow(this._instLabel('radarr2'), r2);
          }
        }
        if (seriesCount > 0) {
          rows += mkRow(tvSvg, this._t('tlFilterTvShows'), seriesCount);
          if (hasS2) {
            if (s1 > 0) rows += mkSubRow(this._instLabel('sonarr'), s1);
            if (s2 > 0) rows += mkSubRow(this._instLabel('sonarr2'), s2);
          }
        }
      } else {
        if (movieCount  > 0) rows += mkRow(filmSvg, this._t('tlFilterMovies'), movieCount);
        if (seriesCount > 0) rows += mkRow(tvSvg,   this._t('tlFilterTvShows'),   seriesCount);
      }
    }

    const content = cache === undefined || movieCount === null
      ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('loading')}</div>`
      : (movieCount + seriesCount) === 0
        ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('actMissingEmpty')}</div>`
        : `<div style="display:flex;flex-direction:column;gap:4px;padding:4px 0">${rows}</div>`;

    
    return `<div class="tl-card u-sec-body" data-act-open="missing">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>
      <div class="u-row-sb-w">
        <span style="font-size:10px;font-weight:800;color:var(--is-text);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">${this._t('actMissing')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${content}</div>
    </div>`;
  }

  // ── Missing tab ───────────────────────────────────────────────────────────

  _actMissingTabHtml(radarrMovies, sonarrSeries, page, perPage, cols) {
    const isMobile = this._isMob;
    const m = this._activityModal || {};
    const expanded = m.missingExpanded || new Set();

    // Radarr: movies without files
    const rRows = (radarrMovies || []).map(r => ({
      _svc:        r._inst || 'radarr',
      _displaySvc: 'radarr',
      _id:         r.id,
      _title:      r.title || '—',
      _year:       r.year || '',
      _profile:    r._profileName || '',
      _added:      r.added || '',
      _monitored:  r.monitored ?? true,
      _missing:    null,
      _seasons:    null,
      _tmdbId:     r.tmdbId,
      _raw:        r,
    }));

    // Sonarr: series with missing episodes from statistics
    const snRows = (sonarrSeries || []).map(s => {
      const allSeasons = (s.seasons || []).filter(ss => ss.seasonNumber > 0).map(ss => ss.seasonNumber).sort((a, b) => a - b);
      const seasonStr = allSeasons.length > 0
        ? (allSeasons.length <= 3 ? allSeasons.map(n => `S${String(n).padStart(2,'0')}`).join(', ') : `S${String(allSeasons[0]).padStart(2,'0')}–S${String(allSeasons[allSeasons.length-1]).padStart(2,'0')}`)
        : '';
      return {
        _svc:        s._inst || 'sonarr',
        _displaySvc: 'sonarr',
        _id:         s.id,
        _title:      s.title || '—',
        _year:       s.year || '',
        _profile:    s._profileName || '',
        _added:      s.added || '',
        _monitored:  s.monitored ?? true,
        _missing:    s._missingCount || 0,
        _fileCount:  s._fileCount  || 0,
        _totalCount: s._totalCount || 0,
        _seasons:    seasonStr,
        _tvdbId:     s.tvdbId,
        _raw:        s,
      };
    });

    const all = [...rRows, ...snRows];

    const fSvc    = m.missingFilterSvc      || 'all';
    const fProf   = m.missingFilterProfile  || 'all';
    const fMon    = m.missingFilterMonitored || 'all';
    const mSearch = (m.missingSearch || '').toLowerCase().trim();
    const mSort   = m.missingSort    || 'title';
    const mSortDir= m.missingSortDir || 'asc';

    const filtered = all.filter(r => {
      if (fSvc  !== 'all' && r._svc !== fSvc) return false;
      if (fProf !== 'all' && r._profile !== fProf) return false;
      if (fMon  !== 'all' && (fMon === 'monitored' ? !r._monitored : r._monitored)) return false;
      if (mSearch && !r._title.toLowerCase().includes(mSearch)) return false;
      return true;
    });

    const _sortFn = {
      title:     r => r._title.toLowerCase(),
      year:      r => r._year || 0,
      profile:   r => r._profile.toLowerCase(),
      added:     r => new Date(r._added || 0).getTime(),
      missing:   r => r._missing ?? 0,
      monitored: r => r._monitored ? 0 : 1,
    }[mSort] || (r => r._title.toLowerCase());

    const sorted = [...filtered].sort((a, b) => {
      const va = _sortFn(a), vb = _sortFn(b);
      if (va < vb) return mSortDir === 'asc' ? -1 : 1;
      if (va > vb) return mSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (!all.length) {
      return `<div style="text-align:center;color:var(--is-text-muted);padding:40px 20px">${this._t('actMissingEmpty')}</div>`;
    }

    const pp       = perPage || 15;
    const pg       = Math.min(page || 0, Math.max(0, Math.ceil(sorted.length / pp) - 1));
    const paged    = sorted.slice(pg * pp, (pg + 1) * pp);
    const totPages = Math.max(1, Math.ceil(sorted.length / pp));
    const pagHtml  = totPages > 1 ? this._uiPager('act-missing-page', pg, totPages) : '';
    const PAG      = `<div style="flex-shrink:0;padding-top:8px">${pagHtml}</div>`;

    const searchSvg  = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    const srcFilmSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    const srcTvSvg   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
    const searchSvgSm = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    const isSvgSm     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    const asSvgSm     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

    const ALL_MISSING_COLS = [
      { id: 'monitored', label: this._t('actColMonitored') },
      { id: 'source',    label: this._t('actColSource') },
      { id: 'year',      label: this._t('actColYear') },
      { id: 'profile',   label: this._t('actColProfile') },
      { id: 'added',     label: this._t('actColAdded') },
      { id: 'missing',   label: this._t('actColMissingEps') },
    ];
    const C = cols instanceof Set ? cols : new Set(['source', 'year', 'missing']);
    const visCols = ALL_MISSING_COLS.filter(c => C.has(c.id));

    const uniq    = (arr, fn) => [...new Set(arr.map(fn).filter(Boolean))].sort();

    const _svcInstances = [
      { v: 'radarr',  lbl: this._instLabel('radarr'),  has: all.some(r => r._svc === 'radarr') },
      { v: 'radarr2', lbl: this._instLabel('radarr2'), has: all.some(r => r._svc === 'radarr2') },
      { v: 'sonarr',  lbl: this._instLabel('sonarr'),  has: all.some(r => r._svc === 'sonarr') },
      { v: 'sonarr2', lbl: this._instLabel('sonarr2'), has: all.some(r => r._svc === 'sonarr2') },
    ].filter(x => x.has);
    const profOpts = uniq(all, r => r._profile);
    const mSels = [
      { id: 'act-missing-svc',kind: 'source', value: fSvc, items: [['all', this._t('actAllSources')], ..._svcInstances.map(x => [x.v, x.lbl])] },
      { id: 'act-missing-profile',kind: 'profile', value: fProf, items: [['all', this._t('actAllProfiles')], ...profOpts.map(p => [p, p])] },
      { id: 'act-missing-monitored',kind: 'monitored', value: fMon, items: [['all', this._t('actAllMonitored')], ['monitored', this._t('actMonitored')], ['unmonitored', this._t('actNotMonitored')]] },
    ];

    const fmtDate = d => {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString(this._locale, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
    };

    const mToolbar = this._actBar('act-missing-search', m.missingSearch || '', mSels, 'act-missing-cols-btn');

    const thSt = `padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;white-space:nowrap`;
    const _mth = (id, label, pad0 = false) => {
      const active = mSort === id;
      const arrow  = active ? `<span style="margin-left:2px">${mSortDir === 'asc' ? '↑' : '↓'}</span>` : '';
      return `<th data-act-missing-sort="${id}" style="padding:4px 8px 8px${pad0?' 0':''};font-size:10px;font-weight:600;color:${active?'var(--is-text-body)':'var(--is-text-muted)'};text-align:left;cursor:pointer;user-select:none;white-space:nowrap">${label}${arrow}</th>`;
    };

    const chevDownSvg      = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const chevRightSvg     = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>`;
    const chevDownSvgLg    = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const chevRightSvgLg   = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>`;

    // Bookmark monitor toggle — filled = monitored, outline = not monitored
    const _monBookmarkSvg = (mon) => mon
      ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    const _monToggleBtn = (mon, attrs, extraStyle = '') =>
      `<button class="act-mon-toggle" ${attrs} data-mon="${mon ? 1 : 0}" title="${mon ? this._t('actMonitored') : this._t('actNotMonitored')}" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;border-radius:50%;cursor:pointer;padding:0;color:${mon ? 'var(--is-text)' : 'var(--is-text-muted)'};${extraStyle}">${_monBookmarkSvg(mon)}</button>`;

    const _seasonSubRows = (r, mobile) => {
      if (!(r._raw?.seasons)) return '';
      const seasons = (r._raw.seasons || [])
        .filter(ss => ss.seasonNumber > 0)
        .map(ss => ({ n: ss.seasonNumber, monitored: ss.monitored, missing: (ss.statistics?.totalEpisodeCount || 0) - (ss.statistics?.episodeFileCount || 0), total: ss.statistics?.totalEpisodeCount || 0 }))
        .filter(ss => ss.missing > 0)
        .sort((a, b) => a.n - b.n);
      if (!seasons.length) return '';
      if (mobile) {
        return seasons.map((ss, i) => `<div data-act-season style="padding:5px 10px 5px 22px;${i < seasons.length - 1 ? 'border-bottom:1px solid var(--is-divider)' : ''}">
          <div class="u-row-6">
            <span style="font-size:11px;font-weight:700;color:var(--is-text-sec);min-width:28px">S${String(ss.n).padStart(2,'0')}</span>
            <span style="font-size:10px;font-weight:700;color:#fb923c">${ss.total - ss.missing}/${ss.total}</span>
            <span style="flex:1"></span>
            ${_monToggleBtn(ss.monitored, `data-id="${r._id}" data-svc="${r._svc}" data-season="${ss.n}" data-kind="season"`)}
            ${this._mtRoundBtn(`class="act-missing-season-is-btn" data-id="${r._id}" data-svc="${r._svc}" data-season="${ss.n}" data-title="${this._escHtml(r._title)}"`, isSvgSm, `IS S${String(ss.n).padStart(2,'0')}`, { size: 22, tone: 'blue' })}
            ${this._mtRoundBtn(`class="act-missing-as-btn" data-id="${r._id}" data-svc="${r._svc}" data-season="${ss.n}"`, asSvgSm, `AS S${String(ss.n).padStart(2,'0')}`, { size: 22, tone: 'blue' })}
          </div>
        </div>`).join('');
      }
      return seasons.map(ss => `<tr data-act-season style="background:rgba(255,255,255,0.015)">
        <td style="padding:0;width:24px"></td>
        <td style="padding:5px 8px;overflow:hidden;max-width:300px">
          <span style="font-size:11px;font-weight:700;color:var(--is-text-sec)">S${String(ss.n).padStart(2,'0')}</span>
        </td>
        ${visCols.map(col => {
          if (col.id === 'missing') return `<td style="padding:5px 8px;font-size:10px;font-weight:700;color:#fb923c">${ss.total - ss.missing}/${ss.total}</td>`;
          if (col.id === 'monitored') { return `<td style="padding:4px 8px">${_monToggleBtn(ss.monitored, `data-id="${r._id}" data-svc="${r._svc}" data-season="${ss.n}" data-kind="season"`, 'margin:0 auto')}</td>`; }
          return `<td style="padding:5px 8px"></td>`;
        }).join('')}
        <td style="padding:5px 10px 5px 8px;text-align:right;white-space:nowrap">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px">
            ${this._mtRoundBtn(`class="act-missing-season-is-btn" data-id="${r._id}" data-svc="${r._svc}" data-season="${ss.n}" data-title="${this._escHtml(r._title)}"`, isSvgSm, `IS S${String(ss.n).padStart(2,'0')}`, { size: 22, tone: 'blue' })}
            ${this._mtRoundBtn(`class="act-missing-as-btn" data-id="${r._id}" data-svc="${r._svc}" data-season="${ss.n}"`, asSvgSm, `AS S${String(ss.n).padStart(2,'0')}`, { size: 22, tone: 'blue' })}
          </div>
        </td>
      </tr>`).join('');
    };

    if (isMobile) {
      const rowsHtml = paged.map(r => {
        const isSonarr = (r._displaySvc || r._svc) === 'sonarr';
        const expandKey = isSonarr ? `${r._svc}_${r._id}` : null;
        const isExpanded = isSonarr && expanded.has(expandKey);
        const expandBtn = isSonarr ? `<button class="act-missing-expand-btn" data-key="${expandKey}" style="flex-shrink:0;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;color:var(--is-text-muted);padding:0">${isExpanded ? chevDownSvgLg : chevRightSvgLg}</button>` : '';
        const seasonRows = isExpanded ? _seasonSubRows(r, true) : '';
        const typeIcon = `<span style="flex-shrink:0;color:var(--is-text-muted);display:flex;align-items:center">${isSonarr ? srcTvSvg : srcFilmSvg}</span>`;
        const subParts = (() => {
          const lbl = (r._svc === 'radarr2' || r._svc === 'sonarr2') ? this._instLabel(r._svc) : null;
          const miss = r._missing !== null
            ? (isSonarr
                ? `<span style="font-weight:700">${r._fileCount||0}/${r._totalCount||0}</span>`
                : `<span style="color:#fb923c;font-weight:700">${r._missing}</span>`)
            : null;
          return [lbl, r._profile, miss].filter(Boolean);
        })();
        return `<div style="padding:9px 0;border-bottom:1px solid var(--is-divider)">
          <div style="display:flex;align-items:flex-start;gap:6px">
            <div style="flex-shrink:0;width:24px;align-self:stretch;display:flex;align-items:center;justify-content:center">${expandBtn}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:5px;min-width:0">
                ${typeIcon}
                <span class="act-missing-info-btn" data-tmdb="${r._tmdbId||''}" data-tvdb="${r._tvdbId||''}" data-title="${this._escHtml(r._title)}" data-type="${isSonarr?'sonarr':'radarr'}" style="font-size:13px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;cursor:pointer">${r._title}${r._year ? ` <span class="u-xs-muted">(${r._year})</span>` : ''}</span>
              </div>
              ${subParts.length ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${subParts.join(' · ')}</div>` : ''}
            </div>
            <div style="flex-shrink:0;align-self:stretch;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:4px;margin-right:10px">
              ${_monToggleBtn(r._monitored, `data-id="${r._id}" data-svc="${r._svc}" data-kind="${isSonarr ? 'series' : 'movie'}"`)}
              <div style="display:flex;gap:4px;align-items:center">
                ${this._mtRoundBtn(`class="act-missing-is-btn" data-id="${r._id}" data-svc="${r._svc}" data-tmdb="${r._tmdbId||''}" data-tvdb="${r._tvdbId||''}" data-title="${this._escHtml(r._title)}"`, isSvgSm, 'Interactive search', { size: 24, tone: 'blue' })}
                ${this._mtRoundBtn(`class="act-missing-as-btn" data-id="${r._id}" data-svc="${r._svc}" data-tmdb="${r._tmdbId||''}" data-tvdb="${r._tvdbId||''}" data-title="${this._escHtml(r._title)}"`, asSvgSm, this._t('actAutoSearch'), { size: 24, tone: 'blue' })}
              </div>
            </div>
          </div>
          ${seasonRows}
        </div>`;
      }).join('');

      return `<div class="u-col-fill">
        ${mToolbar}
        <div class="act-missing-results-wrap" style="display:contents">
          <div class="u-flex-ovh" data-act-clip data-act-notrim>${rowsHtml}</div>
          ${PAG}
        </div>
      </div>`;
    }

    // Desktop
    const COL_W     = { source:70, year:60, profile:120, added:100, missing:75, monitored:110 };
    const COL_ALIGN = { source:'center', monitored:'center', year:'left', profile:'left', added:'left', missing:'left' };
    const rows = paged.flatMap(r => {
      const isSonarr = (r._displaySvc || r._svc) === 'sonarr';
      const expandKey = isSonarr ? `${r._svc}_${r._id}` : null;
      const isExpanded = isSonarr && expanded.has(expandKey);
      const s0total = isSonarr ? ((r._raw?.seasons||[]).find(ss=>ss.seasonNumber===0)?.statistics?.totalEpisodeCount||0) : 0;
      const totalEp = isSonarr ? ((r._raw?.statistics?.totalEpisodeCount||0) - s0total) : 0;
      const colTds = visCols.map(col => {
        if (col.id === 'source')  { const lbl = this._instLabel(r._svc); return `<td style="padding:8px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:7px"><span style="color:var(--is-text-sec);display:flex;align-items:center">${isSonarr ? srcTvSvg : srcFilmSvg}</span><span style="font-size:10px;font-weight:600;color:var(--is-text-sec)">${lbl}</span></div></td>`; }
        if (col.id === 'year')    return `<td style="padding:8px;font-size:10px;color:var(--is-text-sec)">${r._year || '—'}</td>`;
        if (col.id === 'profile') return `<td style="padding:8px;font-size:10px;color:var(--is-text-sec);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${r._profile || '—'}</td>`;
        if (col.id === 'added')   return `<td style="padding:8px;font-size:10px;color:var(--is-text-muted);white-space:nowrap">${fmtDate(r._added)}</td>`;
        if (col.id === 'missing') return `<td style="padding:8px;font-size:10px;font-weight:700;color:${r._missing ? '#fb923c' : 'var(--is-text-muted)'}">${r._missing !== null ? `${isSonarr ? (totalEp - r._missing) + '/' + totalEp : r._missing}` : '—'}</td>`;
        if (col.id === 'monitored') { return `<td style="padding:4px 8px">${_monToggleBtn(r._monitored, `data-id="${r._id}" data-svc="${r._svc}" data-kind="${isSonarr ? 'series' : 'movie'}"`, 'margin:0 auto')}</td>`; }
        return '';
      }).join('');
      const expandBtn    = isSonarr ? `<button class="act-missing-expand-btn" data-key="${expandKey}" style="flex-shrink:0;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;color:var(--is-text-muted);padding:0">${isExpanded ? chevDownSvg : chevRightSvg}</button>` : '';
      const isBtn        = `${this._mtRoundBtn(`class="act-missing-is-btn" data-id="${r._id}" data-svc="${r._svc}" data-tmdb="${r._tmdbId||''}" data-tvdb="${r._tvdbId||''}" data-title="${this._escHtml(r._title)}"`, isSvgSm, 'Interactive search', { size: 24, tone: 'blue' })}`;
      const autoSearchBtn = `${this._mtRoundBtn(`class="act-missing-as-btn" data-id="${r._id}" data-svc="${r._svc}" data-tmdb="${r._tmdbId||''}" data-tvdb="${r._tvdbId||''}" data-title="${this._escHtml(r._title)}"`, asSvgSm, this._t('actAutoSearch'), { size: 24, tone: 'blue' })}`;
      const mainRow = `<tr style="border-bottom:${isExpanded ? 'none' : '1px solid var(--is-divider)'}">
        <td style="padding:8px 0;width:24px;text-align:center">${expandBtn}</td>
        <td style="padding:8px 8px 8px 0;overflow:hidden;max-width:300px">
          <div class="act-missing-info-btn" data-tmdb="${r._tmdbId||''}" data-tvdb="${r._tvdbId||''}" data-title="${this._escHtml(r._title)}" data-type="${isSonarr?'sonarr':'radarr'}" style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer">${r._title}${r._year ? ` <span class="u-xs-muted">(${r._year})</span>` : ''}</div>
        </td>
        ${colTds}
        <td style="padding:8px 10px 8px 8px;text-align:right;white-space:nowrap"><div style="display:flex;align-items:center;justify-content:flex-end;gap:4px">${isBtn}${autoSearchBtn}</div></td>
      </tr>`;
      const seasonTrs = isExpanded ? _seasonSubRows(r, false) : '';
      return [mainRow, seasonTrs];
    }).join('');

    return `<div class="u-col-fill">
      ${mToolbar}
      <div class="act-missing-results-wrap" style="display:contents">
        <div style="flex:1;overflow:hidden;overflow-x:auto" data-act-clip data-act-notrim>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed">
            <thead><tr class="u-divider-b">
              <th style="padding:4px 0 8px;width:24px"></th>
              ${_mth('title', this._t('actColTitle'), true)}
              ${visCols.map(c => `<th data-act-missing-sort="${c.id}" style="${thSt};text-align:${COL_ALIGN[c.id]||'left'};width:${COL_W[c.id]||80}px;cursor:pointer;user-select:none">${c.label}${mSort===c.id?`<span style="margin-left:2px">${mSortDir==='asc'?'↑':'↓'}</span>`:''}</th>`).join('')}
              <th style="padding:4px 0 8px 8px;width:60px"></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${PAG}
      </div>
    </div>`;
  }

}

export const activityMissingRenderMixin = _ActivityMissingRenderMethods.prototype;
