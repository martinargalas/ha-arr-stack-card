// Auto Search panel — season/episode search (Sonarr) + movie search (Radarr)
// Mixin applied to ArrStackCard.prototype in card.js

const POPUP_TYPE_AS = { RADARR: 'radarr', MOVIE: 'movie', SONARR: 'sonarr', TV: 'tv' };

class _AutoSearchMethods {

  // ─── Entry point ─────────────────────────────────────────────────────────

  _renderAsSection() {
    if (!this._asOpen) return '';
    const d = this._popup;
    const isMovieType = d._type === POPUP_TYPE_AS.RADARR || d._type === POPUP_TYPE_AS.MOVIE;
    return isMovieType ? this._renderAsMoviePanel() : this._renderAsSeasonsView();
  }

  // ─── Movie panel ─────────────────────────────────────────────────────────

  _renderAsMoviePanel() {
    const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    // Confirm dialog only — feedback for searching/done/error lives on the button badge
    if (this._asState === 'confirm') {
      return `<div class="sn-is-section">
        <div class="is-confirm-wrap">
          <div class="is-confirm-msg">${this._t('asMovieConfirm')}</div>
          <div class="is-confirm-actions">
            <button class="is-confirm-btn is-confirm-yes" data-action="as-confirm-yes">${checkSvg}</button>
            <button class="is-confirm-btn is-confirm-no" data-action="as-confirm-no">${crossSvg}</button>
          </div>
        </div>
      </div>`;
    }
    return '';
  }

  // ─── Seasons view (Sonarr) ────────────────────────────────────────────────

  _renderAsSeasonsView() {
    const d = this._popup;
    const series = this._asInstance === 'sonarr2' ? d._sonarr2Series : d._sonarrSeries;
    const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const spinner  = `<span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>`;

    if (!series) {
      // Confirm dialog — other states (adding, error) show feedback on button badge
      if (this._asState === 'confirm') {
        return `<div class="sn-is-section">
          <div class="is-confirm-wrap">
            <div class="is-confirm-msg">${this._t('asSeriesConfirm')}</div>
            <div class="is-confirm-actions">
              <button class="is-confirm-btn is-confirm-yes" data-action="as-confirm-yes">${checkSvg}</button>
              <button class="is-confirm-btn is-confirm-no" data-action="as-confirm-no">${crossSvg}</button>
            </div>
          </div>
        </div>`;
      }
      return '';
    }

    const seasons = (series.seasons || [])
      .filter(s => s.seasonNumber > 0)
      .sort((a, b) => b.seasonNumber - a.seasonNumber);

    const PER_PAGE   = this._snSeasonsPerPage || 6;
    const totalPages = Math.max(1, Math.ceil(seasons.length / PER_PAGE));
    const page       = Math.min(this._snSeasonsPage || 0, totalPages - 1);
    const sliced     = seasons.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const rows       = sliced.map(s => this._renderAsSeasonRow(s)).join('');
    const pagination = this._uiPager('sn-spage', page, totalPages);
    // Fixed min-height for PER_PAGE rows — keeps the pagination row from jumping up
    // when the last page has fewer seasons than a full page.
    const rowsMinH   = this._snSeasonsRowH ? (PER_PAGE * this._snSeasonsRowH + (PER_PAGE - 1) * 4) : 234;

    return `<div class="sn-is-section">
      <div class="sn-seasons-label">${this._t('snSeasonsLabel')}</div>
      <div class="sn-seasons-rows" style="min-height:${rowsMinH}px;display:flex;flex-direction:column;gap:4px">${rows}</div>
      <div style="padding-bottom:12px">${pagination}</div>
    </div>`;
  }

  _renderAsSeasonRow(season) {
    const n   = season.seasonNumber;
    const exp = this._snExpandedSeasons.has(n);
    const stat = season.statistics || {};
    const have = stat.episodeFileCount ?? 0;
    const tot  = stat.episodeCount ?? 0;
    const pct  = tot > 0 ? Math.round((have / tot) * 100) : 0;

    const key           = `season:${n}`;
    const isSearching    = this._asSearchingItems.has(key);
    const isSearched     = this._asSearchedItems.has(key);
    const _series        = this._asInstance === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
    const _qSeasons      = this._asInstance === 'sonarr2' ? (this._sonarr2QueueSeasons  || new Set()) : (this._sonarrQueueSeasons  || new Set());
    const _qSeasonPct    = this._asInstance === 'sonarr2' ? (this._sonarr2QueueSeasonPct || new Map()) : (this._sonarrQueueSeasonPct || new Map());
    const _seasonKey     = _series?.id != null ? `${_series.id}:${n}` : null;
    const isDownloading  = this._asDownloadingItems.has(key) || (_seasonKey && _qSeasons.has(_seasonKey));
    const dlPct          = isDownloading && _seasonKey ? (_qSeasonPct.get(_seasonKey) ?? null) : null;

    const searchSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    const trashSvg  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const chevron   = `<svg class="sn-season-chevron${exp ? ' open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const isAdmin   = !!this._hass?.user?.is_admin;

    let searchBtn;
    if (isSearching) {
      searchBtn = `<span class="action-spinner" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0"></span>`;
    } else if (isSearched) {
      searchBtn = `<span class="as-done-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71Z"/></svg></span>`;
    } else {
      searchBtn = `<button class="btn-person" data-action="as-season-search" data-season="${n}" title="Search season ${n}">${searchSvg}</button>`;
    }

    const isDeletingSeason = this._seasonFileDeleting === n;
    const isConfirmSeason  = this._seasonFileConfirm === n;

    let trashBtn = '';
    if (have > 0 && isAdmin) {
      if (isDeletingSeason) {
        trashBtn = `<span class="action-spinner" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0"></span>`;
      } else if (isConfirmSeason) {
        const _chk = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        const _cross = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        trashBtn = `<span class="ep-del-confirm"><button class="btn-ep-trash btn-ep-del-yes" data-action="season-del-yes" data-season="${n}">${_chk}</button><button class="btn-person" data-action="season-del-no">${_cross}</button></span>`;
      } else {
        trashBtn = `<button class="btn-ep-trash" data-action="season-del-confirm" data-season="${n}" title="Delete season files">${trashSvg}</button>`;
      }
    }

    const barPct   = isDownloading ? Math.max(dlPct ?? 0, 4) : pct;
    const barStyle = isDownloading ? `width:${barPct}%;background:#3b82f6` : `width:${barPct}%`;
    const dlBarHtml = isDownloading
      ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:64px"><div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(dlPct ?? 0,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${dlPct ?? 0}%</span></div>`
      : '';

    const statHtml = isConfirmSeason
      ? `<span class="ep-del-msg">${this._t('delSeasonConfirm') || 'Delete all from disk?'}</span>`
      : `<span class="sn-season-stat">${have}/${tot}</span>
        <div class="sn-season-bar"><div class="sn-season-bar-fill" style="${barStyle}"></div></div>
        ${dlBarHtml}`;

    const episodesHtml = exp ? this._renderAsEpisodesPanel(n) : '';

    return `<div class="sn-season-row" data-season="${n}">
      <div class="sn-season-header">
        <button class="sn-expand" data-action="sn-season-toggle" data-season="${n}" title="${this._t('snExpandEpisodes')}">${chevron}</button>
        <span class="sn-season-title">${this._t('snSeasonTitle')} ${n}</span>
        ${statHtml}
        ${trashBtn}
        ${this._snMonitorBtn(season)}
        ${searchBtn}
      </div>
      ${episodesHtml}
    </div>`;
  }

  _renderAsEpisodesPanel(seasonNumber) {
    const eps = this._snEpisodes.get(seasonNumber);
    if (!eps) {
      return `<div class="sn-episodes sn-episodes-loading">
        <span class="action-spinner" style="width:14px;height:14px;border-width:1.5px"></span>
      </div>`;
    }
    if (eps.length === 0) {
      return `<div class="sn-episodes"><span style="color:rgba(255,255,255,0.4);font-size:11px">${this._t('snNoEpisodes')}</span></div>`;
    }
    return `<div class="sn-episodes">${eps.map(ep => this._renderAsEpRow(ep)).join('')}</div>`;
  }

  _renderAsEpRow(ep) {
    const key        = `ep:${ep.id}`;
    const isSearching   = this._asSearchingItems.has(key);
    const isSearched    = this._asSearchedItems.has(key);
    const _qEpisodes    = this._asInstance === 'sonarr2' ? (this._sonarr2QueueEpisodes || new Set()) : (this._sonarrQueueEpisodes || new Set());
    const _qEpPct       = this._asInstance === 'sonarr2' ? (this._sonarr2QueueEpPct    || new Map()) : (this._sonarrQueueEpPct    || new Map());
    const isDownloading = this._asDownloadingItems.has(key) || _qEpisodes.has(ep.id);
    const dlPct         = isDownloading ? (_qEpPct.get(ep.id) ?? null) : null;
    const hasFile    = !!ep.hasFile;
    const epNum      = `S${String(ep.seasonNumber).padStart(2,'0')}E${String(ep.episodeNumber).padStart(2,'0')}`;
    const searchSvg  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    const trashSvg   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const isAdmin    = !!this._hass?.user?.is_admin;
    const isDeleting = this._epFileDeleting === ep.episodeFileId;
    const isConfirm  = this._epFileConfirm === ep.id;

    const epQueueHtml = isDownloading
      ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:56px"><div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(dlPct ?? 0,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${dlPct ?? 0}%</span></div>`
      : '';
    const airDate = ep.airDate ? ep.airDate.slice(0,10) : '';

    let searchBtn = '';
    if (hasFile) {
      searchBtn = '';
    } else if (isSearching) {
      searchBtn = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px;flex-shrink:0"></span>`;
    } else if (isSearched) {
      searchBtn = `<span class="as-done-icon"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71Z"/></svg></span>`;
    } else {
      const dimStyle = isDownloading ? ' style="opacity:0.3;pointer-events:none"' : '';
      searchBtn = `<button class="btn-person btn-person-sm" data-action="as-ep-search" data-epid="${ep.id}" data-season="${ep.seasonNumber}" title="Search episode"${dimStyle}>${searchSvg}</button>`;
    }

    let trashBtn = '';
    let dateHtml = isDownloading ? epQueueHtml : (airDate ? `<span class="sn-ep-date">${airDate}</span>` : '');
    if (hasFile && isAdmin) {
      if (isDeleting) {
        trashBtn = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px;flex-shrink:0"></span>`;
      } else if (isConfirm) {
        const _chk = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        const _cross = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        dateHtml = `<span class="ep-del-msg">${this._t('delEpConfirm') || 'Delete from disk?'}</span>`;
        trashBtn = `<span class="ep-del-confirm"><button class="btn-ep-trash btn-ep-del-yes" data-action="ep-del-yes" data-efid="${ep.episodeFileId}" data-epid="${ep.id}" data-season="${ep.seasonNumber}">${_chk}</button><button class="btn-person btn-person-sm" data-action="ep-del-no">${_cross}</button></span>`;
      } else {
        trashBtn = `<button class="btn-ep-trash" data-action="ep-del-confirm" data-epid="${ep.id}" title="Delete file">${trashSvg}</button>`;
      }
    }

    const trashSlot = trashBtn || (isAdmin ? '<span style="width:24px;flex-shrink:0"></span>' : '');

    return `<div class="sn-ep-item">
      <div class="sn-ep-row${hasFile ? ' has-file' : ''}">
        <span class="sn-ep-num">${epNum}</span>
        <span class="sn-ep-title">${this._escHtml(ep.title || '')}</span>
        ${dateHtml}
        ${trashSlot}
        ${searchBtn}
      </div>
    </div>`;
  }
}

export const autoSearchMixin = _AutoSearchMethods.prototype;
