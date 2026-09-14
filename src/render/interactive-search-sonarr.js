// Sonarr Interactive Search — seasons/episodes/IS panel render
// Přidáno na ArrStackCard.prototype v card.js
import { fmtBytes } from '../shared/format.js';

class _SonarrIS {

  // ─────────────────────────────────────────────
  // Entry point — called from _renderPopup
  // ─────────────────────────────────────────────

  _renderSonarrIsSection() {
    if (!this._snIsOpen) return '';

    const isMobile = this._isMob;

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
    const _snInst = this._snIsInstance || 'sonarr';
    const series = _snInst === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
    if (!series) {
      const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      if (this._snIsState === 'confirm-add') {
        return `<div class="sn-is-section">
          <div class="is-confirm-wrap">
            <div class="is-confirm-msg">${this._t('snConfirmMsg')}</div>
            <div class="is-confirm-actions">
              <button class="is-confirm-btn is-confirm-yes" data-action="sn-confirm-yes">${checkSvg}</button>
              <button class="is-confirm-btn is-confirm-no" data-action="sn-confirm-no">${crossSvg}</button>
            </div>
          </div>
        </div>`;
      }
      if (this._snIsState === 'adding') {
        return `<div class="sn-is-section"><div class="is-loading">
          <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>
          <span>${this._t('snAddingToSonarr')}</span>
        </div></div>`;
      }
      if (this._snIsState === 'error') {
        return `<div class="sn-is-section"><div class="is-loading" style="color:rgba(255,69,58,0.80)">⚠ ${this._escHtml(this._snIsError || this._t('isLoadError'))}</div></div>`;
      }
      return `<div class="sn-is-section"><div class="is-loading">${this._t('snNotInSonarr')}</div></div>`;
    }

    const seasons = (series.seasons || [])
      .filter(s => s.seasonNumber > 0)
      .sort((a, b) => b.seasonNumber - a.seasonNumber);

    const PER_PAGE   = this._snSeasonsPerPage || 6;
    const totalPages = Math.max(1, Math.ceil(seasons.length / PER_PAGE));
    const page       = Math.min(this._snSeasonsPage || 0, totalPages - 1);
    const sliced     = seasons.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const rows       = sliced.map(s => this._renderSnSeasonRow(s)).join('');

    const paginationHtml = this._uiPager('sn-spage', page, totalPages);
    // Fixed min-height for PER_PAGE rows — keeps the pagination row from jumping up
    // when the last page has fewer seasons than a full page.
    const rowsMinH = this._snSeasonsRowH ? (PER_PAGE * this._snSeasonsRowH + (PER_PAGE - 1) * 4) : 234;

    return `<div class="sn-is-section">
      <div class="sn-seasons-label">${this._t('snSeasonsLabel')}</div>
      <div class="sn-seasons-rows" style="min-height:${rowsMinH}px;display:flex;flex-direction:column;gap:4px">${rows}</div>
      <div style="padding-bottom:12px">${paginationHtml}</div>
    </div>`;
  }

  _renderSnSeasonRow(season) {
    const n    = season.seasonNumber;
    const exp  = this._snExpandedSeasons.has(n);
    const stat = season.statistics || {};
    const have = stat.episodeFileCount ?? 0;
    const tot  = stat.episodeCount ?? 0;
    const pct  = tot > 0 ? Math.round((have / tot) * 100) : 0;

    // Queue progress (queued or downloading)
    const inst      = this._snIsInstance || 'sonarr';
    const series    = inst === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
    const qKey      = `${series?.id}:${n}`;
    const qPctMap   = inst === 'sonarr2' ? (this._sonarr2QueueSeasonPct || new Map()) : (this._sonarrQueueSeasonPct || new Map());
    const qPct      = qPctMap.has(qKey) ? qPctMap.get(qKey) : null;
    const isQueued  = qPct !== null;
    const barPct    = isQueued ? Math.max(qPct, 4) : pct;
    const pctStyle  = isQueued
      ? `width:${barPct}%;background:#3b82f6`
      : `width:${barPct}%`;

    const isMobile = this._isMob;
    const isActiveIs = this._snActiveIs?.type === 'season' && this._snActiveIs?.key === n;

    const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;

    const monBtn = this._snMonitorBtn(season);

    const chevron = `<svg class="sn-season-chevron${exp ? ' open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;

    const trashSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const isAdmin = !!this._hass?.user?.is_admin;
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

    const queueBarHtml = isQueued ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:64px"><div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(qPct,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${qPct}%</span></div>` : '';
    const statHtml = isConfirmSeason
      ? `<span class="ep-del-msg">${this._t('delSeasonConfirm') || 'Delete all from disk?'}</span>`
      : `<span class="sn-season-stat">${have}/${tot}</span>
        <div class="sn-season-bar"><div class="sn-season-bar-fill" style="${pctStyle}"></div></div>
        ${queueBarHtml}`;

    const episodesHtml = exp ? this._renderSnEpisodesPanel(n) : '';
    const seasonIsHtml = (!isMobile && isActiveIs) ? this._renderSnIsPanel() : '';

    return `<div class="sn-season-row" data-season="${n}">
      <div class="sn-season-header">
        <button class="sn-expand" data-action="sn-season-toggle" data-season="${n}" title="${this._t('snExpandEpisodes')}">
          ${chevron}
        </button>
        <span class="sn-season-title">${this._t('snSeasonTitle')} ${n}</span>
        ${statHtml}
        ${trashBtn}
        ${monBtn}
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
    const isMobile = this._isMob;
    const isActive = this._snActiveIs?.type === 'episode' && this._snActiveIs?.key === ep.id;

    const personIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;

    const hasFile  = !!ep.hasFile;
    const epNum    = `S${String(ep.seasonNumber).padStart(2,'0')}E${String(ep.episodeNumber).padStart(2,'0')}`;
    const epTitle  = this._escHtml(ep.title || '');
    const airDate  = ep.airDate ? ep.airDate.slice(0,10) : '';

    // Queue indicator for this episode
    const inst2       = this._snIsInstance || 'sonarr';
    const qEps        = inst2 === 'sonarr2' ? (this._sonarr2QueueEpisodes || new Set()) : (this._sonarrQueueEpisodes || new Set());
    const qEpPctMap   = inst2 === 'sonarr2' ? (this._sonarr2QueueEpPct    || new Map()) : (this._sonarrQueueEpPct    || new Map());
    const epInQueue   = qEps.has(ep.id);
    const epQPct      = epInQueue ? (qEpPctMap.get(ep.id) ?? 0) : null;
    const epQueueHtml = epInQueue
      ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:56px"><div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(epQPct,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${epQPct}%</span></div>`
      : '';

    const epIsHtml = (!isMobile && isActive) ? this._renderSnIsPanel() : '';

    const trashSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const isAdmin    = !!this._hass?.user?.is_admin;
    const isDeleting = this._epFileDeleting === ep.episodeFileId;
    const isConfirm  = this._epFileConfirm === ep.id;
    let trashBtn = '';
    let dateHtml = epInQueue ? epQueueHtml : (airDate ? `<span class="sn-ep-date">${airDate}</span>` : '');
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
        <span class="sn-ep-title">${epTitle}</span>
        ${dateHtml}
        ${trashSlot}
        <button class="btn-person btn-person-sm${isActive ? ' active' : ''}" data-action="sn-ep-is" data-epid="${ep.id}" data-season="${ep.seasonNumber}" title="Interactive Search — ${this._t('snEpisode').toLowerCase()}">
          ${personIcon}
        </button>
      </div>
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
    const { protocol, indexer, quality, lang } = this._snIsFilters || {};
    const visible = all.filter(r => {
      if (protocol) { const p = r.protocol === 'torrent' ? 'torrent' : 'usenet'; if (p !== protocol) return false; }
      if (indexer  && (r.indexer || '') !== indexer) return false;
      if (quality  && this._isQualityLabel(r) !== quality) return false;
      if (lang) { const lc = ((r.languages||[])[0]?.name||'').slice(0,2).toUpperCase(); if (lc !== lang) return false; }
      return true;
    });

    const isMobile = this._isMob;
    const rowsHtml = isMobile ? this._renderSnIsCards(visible) : this._renderSnIsTable(visible);

    const uniqIndexers  = [...new Set(all.map(r => r.indexer).filter(Boolean))].sort();
    const uniqQualities = [...new Set(all.map(r => this._isQualityLabel(r)).filter(Boolean))];
    const uniqLangs     = [...new Set(all.map(r => ((r.languages||[])[0]?.name||'').slice(0,2).toUpperCase()).filter(Boolean))].sort();

    const mkSel = (dim, label, cur, opts) => {
      const options = opts.map(v =>
        `<option value="${this._escHtml(v)}"${cur === v ? ' selected' : ''}>${this._escHtml(v)}</option>`
      ).join('');
      return `<select class="is-f-select${cur ? ' active' : ''}" data-snisselect="${dim}">
        <option value="">${label}</option>${options}
      </select>`;
    };

    const countHtml = visible.length !== all.length
      ? `<span class="is-count">${visible.length}<span style="opacity:0.45">/${all.length}</span></span>`
      : `<span class="is-count">${all.length}</span>`;

    return `<div class="sn-is-panel">
      <div class="is-panel-hdr">
        <span class="is-panel-title">${this._snActiveIs?.type === 'season' ? this._t('snSeasonPack').charAt(0).toUpperCase()+this._t('snSeasonPack').slice(1) : this._t('snEpisode')}</span>
        ${countHtml}
        <div class="is-filter">
          ${mkSel('protocol', 'Protocol', protocol, ['torrent','usenet'])}
          ${uniqIndexers.length  > 1 ? mkSel('indexer', 'Indexer', indexer, uniqIndexers)   : ''}
          ${uniqQualities.length > 1 ? mkSel('quality', 'Quality', quality, uniqQualities)  : ''}
          ${uniqLangs.length     > 1 ? mkSel('lang',    'Lang',    lang,    uniqLangs)      : ''}
        </div>
      </div>
      <div class="is-results-wrap">${rowsHtml}</div>
    </div>`;
  }

  _renderSnIsTable(releases) {
    const { col, dir } = this._snIsSort || {};
    const sorted = col ? [...releases].sort((a, b) => {
      const av = this._isSortValue(a, col);
      const bv = this._isSortValue(b, col);
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    }) : releases;

    const arrow = (c) => col !== c
      ? `<span class="is-sort-arrow is-sort-inactive">⇅</span>`
      : `<span class="is-sort-arrow">${dir === -1 ? '↓' : '↑'}</span>`;
    const th = (c, label) =>
      `<th data-snissort="${c}" style="cursor:pointer;user-select:none">${label}${arrow(c)}</th>`;

    const rows = sorted.map(r => {
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
        <td><span class="is-size">${fmtBytes(r.size)}</span></td>
        <td>${this._isPeers(r)}</td>
        <td>${this._isLang(r)}</td>
        <td>${this._isQualityBadge(r)}</td>
        <td>${this._isScoreHtml(r.customFormatScore)}</td>
        <td>${this._snGrabBtn(r)}</td>
      </tr>`;
    }).join('');
    return `<table class="is-table">
      <colgroup>
        <col style="width:50px"><col><col style="width:75px">
        <col style="width:52px"><col style="width:48px"><col style="width:38px"><col style="width:68px"><col style="width:58px"><col style="width:52px">
      </colgroup>
      <thead><tr>
        ${th('src','Src')}${th('title','Title')}${th('indexer','Indexer')}
        ${th('size','Size')}${th('peers','Peers')}${th('lang','Lang')}${th('quality','Quality')}${th('score','Score')}<th></th>
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
          <span class="is-size">${fmtBytes(r.size)}</span>
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
    const _dlSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>`;

    // Imported → green check
    if (histState === 'imported') {
      return `<button class="is-grab-btn is-grab-done" disabled title="${this._t('isImported')}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }

    // Failed → red X (clickable to retry); check BEFORE grabbed to handle session-grabbed-then-failed
    if (histState === 'failed') {
      return `<button class="is-grab-btn is-grab-failed" data-sngrab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t('isFailed')}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    // Grabbed → progress bar only if grabbed this session OR actively in queue
    {
      const inst       = this._snIsInstance || 'sonarr';
      const isEpIs     = this._snActiveIs?.type === 'episode';
      const series     = inst === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
      const seriesId   = series?.id;
      let rawPct = null;
      if (isEpIs) {
        const qEpPct = inst === 'sonarr2' ? (this._sonarr2QueueEpPct || new Map()) : (this._sonarrQueueEpPct || new Map());
        const epId = this._snActiveIs.key;
        rawPct = qEpPct.has(epId) ? qEpPct.get(epId) : null;
      } else {
        const qSeasonPct = inst === 'sonarr2' ? (this._sonarr2QueueSeasonPct || new Map()) : (this._sonarrQueueSeasonPct || new Map());
        const qSeriesPct = inst === 'sonarr2' ? (this._sonarr2QueueSeriesPct || new Map()) : (this._sonarrQueueSeriesPct || new Map());
        const sk = `${seriesId}:${r.seasonNumber ?? r.season}`;
        rawPct = qSeasonPct.has(sk) ? qSeasonPct.get(sk) : (seriesId && qSeriesPct.has(seriesId) ? qSeriesPct.get(seriesId) : null);
      }
      const inQueue    = rawPct !== null;
      const grabbed    = this._snIsGrabbed.has(guid);
      if (grabbed && !inQueue) {
        // Grabbed, but the queue has not picked it up yet — a 0% bar would
        // claim a download that is not running. Spin until it really is.
        return `<button class="is-grab-btn" disabled title="${this._t('isGrabbed')}">
          <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
        </button>`;
      }
      const showProg   = grabbed && inQueue;
      if (showProg) {
        const p = rawPct;
        return `<button class="is-grab-btn" disabled style="min-width:56px;gap:3px;padding:0 6px;border-radius:9px" title="${this._t('isGrabbed')}">
          <div style="display:flex;align-items:center;gap:3px;width:100%">
            <div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden">
              <div style="width:${Math.max(p,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div>
            </div>
            <span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${p}%</span>
          </div>
        </button>`;
      }
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
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button class="sn-back-btn" data-action="sn-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="sn-drilldown-label" style="margin-bottom:0">${label}</div>
      </div>
      ${this._renderSnIsPanel()}
    </div>`;
  }
}

export const sonarrIsMixin = _SonarrIS.prototype;
