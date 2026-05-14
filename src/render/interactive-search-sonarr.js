// Sonarr Interactive Search — seasons/episodes/IS panel render
// Přidáno na ArrStackCard.prototype v card.js

class _SonarrIS {

  // ─────────────────────────────────────────────
  // Entry point — called from _renderPopup
  // ─────────────────────────────────────────────

  _renderSonarrIsSection() {
    if (!this._snIsOpen) return '';

    const isMobile = window.matchMedia('(max-width: 600px)').matches;

    // Mobile + drilldown active → full-screen IS results
    if (isMobile && this._snActiveIs) {
      return this._renderSnDrilldownView();
    }

    return this._renderSnSeasonsView();
  }

  // ─────────────────────────────────────────────
  // Seasons list
  // ─────────────────────────────────────────────

  _renderSnSeasonsView() {
    const series = this._popup?._sonarrSeries;
    if (!series) return `<div class="sn-is-section"><div class="is-loading">${this._t('snNotInSonarr')}</div></div>`;

    const seasons = (series.seasons || [])
      .filter(s => s.seasonNumber > 0)
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    const rows = seasons.map(s => this._renderSnSeasonRow(s)).join('');

    return `<div class="sn-is-section">
      <div class="sn-seasons-label">${this._t('snSeasonsLabel')}</div>
      ${rows}
    </div>`;
  }

  _renderSnSeasonRow(season) {
    const n    = season.seasonNumber;
    const exp  = this._snExpandedSeasons.has(n);
    const stat = season.statistics || {};
    const have = stat.episodeFileCount ?? 0;
    const tot  = stat.totalEpisodeCount ?? stat.episodeCount ?? 0;
    const pct  = tot > 0 ? Math.round((have / tot) * 100) : 0;
    const pctStyle = `width:${pct}%`;

    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const isActiveIs = this._snActiveIs?.type === 'season' && this._snActiveIs?.key === n;

    const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;

    const chevron = `<svg class="sn-season-chevron${exp ? ' open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;

    const episodesHtml = exp ? this._renderSnEpisodesPanel(n) : '';
    const seasonIsHtml = (!isMobile && isActiveIs) ? this._renderSnIsPanel() : '';

    return `<div class="sn-season-row" data-season="${n}">
      <div class="sn-season-header">
        <button class="sn-expand" data-action="sn-season-toggle" data-season="${n}" title="${this._t('snExpandEpisodes')}">
          ${chevron}
        </button>
        <span class="sn-season-title">${this._t('snSeasonTitle')} ${n}</span>
        <span class="sn-season-stat">${have}/${tot}</span>
        <div class="sn-season-bar"><div class="sn-season-bar-fill" style="${pctStyle}"></div></div>
        <button class="btn-person${isActiveIs ? ' active' : ''}" data-action="sn-season-is" data-season="${n}" title="Interactive Search — season pack">
          ${personIcon}
        </button>
      </div>
      ${seasonIsHtml}
      ${episodesHtml}
    </div>`;
  }

  // ─────────────────────────────────────────────
  // Episodes panel
  // ─────────────────────────────────────────────

  _renderSnEpisodesPanel(seasonNumber) {
    const eps = this._snEpisodes.get(seasonNumber);

    if (!eps) {
      return `<div class="sn-episodes sn-episodes-loading">
        <span class="action-spinner" style="width:14px;height:14px;border-width:1.5px"></span>
      </div>`;
    }
    if (eps.length === 0) {
      return `<div class="sn-episodes"><span style="color:rgba(255,255,255,0.4);font-size:11px">${this._t('snNoEpisodes')}</span></div>`;
    }

    const rows = eps.map(ep => this._renderSnEpRow(ep)).join('');
    return `<div class="sn-episodes">${rows}</div>`;
  }

  _renderSnEpRow(ep) {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const isActive = this._snActiveIs?.type === 'episode' && this._snActiveIs?.key === ep.id;

    const personIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;

    const hasFile  = !!ep.hasFile;
    const epNum    = `S${String(ep.seasonNumber).padStart(2,'0')}E${String(ep.episodeNumber).padStart(2,'0')}`;
    const epTitle  = this._escHtml(ep.title || '');
    const airDate  = ep.airDate ? ep.airDate.slice(0,10) : '';

    const epIsHtml = (!isMobile && isActive) ? this._renderSnIsPanel() : '';

    return `<div class="sn-ep-row${hasFile ? ' has-file' : ''}">
      <span class="sn-ep-num">${epNum}</span>
      <span class="sn-ep-title">${epTitle}</span>
      ${airDate ? `<span class="sn-ep-date">${airDate}</span>` : ''}
      <button class="btn-person btn-person-sm${isActive ? ' active' : ''}" data-action="sn-ep-is" data-epid="${ep.id}" data-season="${ep.seasonNumber}" title="Interactive Search — ${this._t('snEpisode').toLowerCase()}">
        ${personIcon}
      </button>
      ${epIsHtml}
    </div>`;
  }

  // ─────────────────────────────────────────────
  // IS panel (shared by season pack + episode)
  // ─────────────────────────────────────────────

  _renderSnIsPanel() {
    if (this._snIsState === 'loading') {
      return `<div class="sn-is-panel">
        <div class="is-loading">
          <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>
          <span>${this._t('isQueryingIndexers')}</span>
        </div>
      </div>`;
    }
    if (this._snIsState === 'error') {
      return `<div class="sn-is-panel">
        <div class="is-loading" style="color:rgba(255,69,58,0.80)">⚠ ${this._escHtml(this._snIsError || this._t('isLoadError'))}</div>
      </div>`;
    }
    if (this._snIsState !== 'results') return '';

    const all = this._snIsResults;
    const visible = this._snIsFilter === 'torrent' ? all.filter(r => r.protocol === 'torrent')
                  : this._snIsFilter === 'usenet'  ? all.filter(r => r.protocol !== 'torrent')
                  : all;

    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const rowsHtml = isMobile ? this._renderSnIsCards(visible) : this._renderSnIsTable(visible);

    const fBtn = (val, label) =>
      `<button class="is-f-btn${this._snIsFilter === val ? ' active' : ''}" data-snisfilter="${val}">${label}</button>`;

    return `<div class="sn-is-panel">
      <div class="is-panel-hdr">
        <span class="is-panel-title">${this._snActiveIs?.type === 'season' ? this._t('snSeasonPack').charAt(0).toUpperCase()+this._t('snSeasonPack').slice(1) : this._t('snEpisode')}</span>
        <span class="is-count">${all.length}</span>
        <div class="is-filter">
          ${fBtn('all', this._t('isFilterAll'))}
          ${fBtn('torrent','TOR')}
          ${fBtn('usenet','NZB')}
        </div>
      </div>
      <div class="is-results-wrap">${rowsHtml}</div>
    </div>`;
  }

  _renderSnIsTable(releases) {
    const rows = releases.map(r => {
      const rejHtml = !r.approved && r.rejections?.length
        ? `<div class="is-rej-row">⚠ ${this._escHtml(r.rejections.slice(0,2).join(' · '))}</div>` : '';
      return `<tr>
        <td>${this._isSrcPill(r)}</td>
        <td>
          <span class="is-rel-title">${this._escHtml(r.title || '')}</span>
          <span class="is-rel-age">${r.ageHours < 48 ? Math.round(r.ageHours) + 'h ago' : Math.round(r.age || 0) + 'd ago'}</span>
          ${rejHtml}
        </td>
        <td><span class="is-indexer">${this._escHtml(r.indexer || '')}</span></td>
        <td><span class="is-size">${this._isSize(r.size)}</span></td>
        <td>${this._isPeers(r)}</td>
        <td>${this._isLang(r)}</td>
        <td>${this._isQualityBadge(r)}</td>
        <td>${this._isScoreHtml(r.customFormatScore)}</td>
        <td>${this._snGrabBtn(r)}</td>
      </tr>`;
    }).join('');
    return `<table class="is-table">
      <thead><tr>
        <th>Src</th><th>Title</th><th>Indexer</th>
        <th>Size</th><th>Peers</th><th>Lang</th><th>Quality</th><th>Score</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  _renderSnIsCards(releases) {
    return releases.map(r => {
      const rejHtml = !r.approved && r.rejections?.length
        ? `<div class="is-ic-rej">⚠ ${this._escHtml(r.rejections.slice(0,1).join(''))}</div>` : '';
      return `<div class="is-card">
        <div class="is-ic-r1">
          ${this._isSrcPill(r)}
          ${this._isQualityBadge(r)}
          ${this._isScoreHtml(r.customFormatScore)}
          <span class="is-size">${this._isSize(r.size)}</span>
          ${this._isLang(r)}
          <div class="is-ic-spacer"></div>
          ${this._snGrabBtn(r)}
        </div>
        <div class="is-ic-title">${this._escHtml(r.title || '')}</div>
        <div class="is-ic-meta">
          <span>${this._escHtml(r.indexer || '')}</span>
          ${r.protocol === 'torrent' ? `<span class="sep">·</span><span class="is-s">↑${r.seeders ?? '?'}</span>/<span class="is-l">↓${r.leechers ?? '?'}</span>` : ''}
          <span class="sep">·</span>
          <span>${r.ageHours < 48 ? Math.round(r.ageHours) + 'h ago' : Math.round(r.age || 0) + 'd ago'}</span>
        </div>
        ${rejHtml}
      </div>`;
    }).join('');
  }

  _snGrabBtn(r) {
    const guid = r.guid;
    const isRej = !r.approved;
    const histState = this._snIsHistory?.[guid];
    if (this._snIsGrabbed.has(guid) || histState === 'grabbed' || histState === 'imported') {
      const title = histState === 'imported' ? this._t('isImported') : this._t('isGrabbed');
      return `<button class="is-grab-btn is-grab-done" disabled title="${title}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }
    if (histState === 'failed') {
      return `<button class="is-grab-btn is-grab-failed" data-sngrab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t('isFailed')}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    if (this._snIsGrabbing === guid) {
      return `<button class="is-grab-btn" disabled>
        <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
      </button>`;
    }
    return `<button class="is-grab-btn${isRej ? ' force' : ''}" data-sngrab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${isRej ? 'Force grab' : 'Grab'}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>`;
  }

  // ─────────────────────────────────────────────
  // Mobile drill-down (full IS panel)
  // ─────────────────────────────────────────────

  _renderSnDrilldownView() {
    const label = this._snActiveIs?.type === 'season'
      ? `${this._t('snSeasonTitle')} ${this._snActiveIs.key} — ${this._t('snSeasonPack')}`
      : `S${String(this._snActiveIs?.seasonNumber ?? 0).padStart(2,'0')}E${String(this._snActiveIs?.epNum ?? 0).padStart(2,'0')} — ${this._escHtml(this._snActiveIs?.label || '')}`;

    return `<div class="sn-is-section sn-drilldown">
      <button class="sn-back-btn" data-action="sn-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        ${this._t('snBack')}
      </button>
      <div class="sn-drilldown-label">${label}</div>
      ${this._renderSnIsPanel()}
    </div>`;
  }
}

export const sonarrIsMixin = _SonarrIS.prototype;
