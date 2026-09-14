import { POPUP_TYPE } from '../constants.js';
import { ICONS, dayClass } from '../shared/ui.js';

// Parts of the film and series detail, each drawn from what the template
// has already worked out and handing back only what it goes on to use.
// Taken out of _renderPopup, unchanged, with the snapshots in
// test/fixtures/popup holding the output to the byte.

class _PopupDetailPartMethods {

_ppInstanceChips({ _instLabels, d, isMovieType, isSonarrType, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry }) {
  // ── Instance status chips ──────────────────────────────────────────────
  const _instStatus = (entry, qActive, qFailed) => {
    if (!entry) return 'none';
    const hasF = entry.hasFile || (entry.statistics?.episodeFileCount > 0);
    if (qFailed?.has(entry.id))        return 'failed';
    if (qActive?.has(entry.id))        return 'downloading';
    // Unmonitored takes priority over "available" too — a downloaded-but-unmonitored movie
    // should read as unmonitored immediately, not silently stay "available".
    if (!entry.monitored)              return 'unmonitored';
    if (hasF)                          return 'available';
    return 'missing';
  };
  const _dlSvgSm = `<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>`;
  // True between a grab and the moment that instance's download shows up in the
  // queue — the chip has nothing to report in that gap, and a still chip reads
  // as "nothing happened".
  const _grabWaiting = inst => {
    const w = this._ppGrabWait;
    if (!w || w.inst !== inst) return false;
    if (Date.now() > w.until) { this._ppGrabWait = null; return false; }
    // The wait belongs to the title it was started on. Opening another one
    // before the queue catches up used to inherit its spinner.
    const openId = inst === 'radarr'   ? this._popup?._radarrId
                 : inst === 'radarr2'  ? this._popup?._radarr2Id
                 : inst === 'sonarr'   ? this._popup?._sonarrSeries?.id
                 :                       this._popup?._sonarr2Series?.id;
    return w.id == null || String(w.id) === String(openId);
  };
  const _instChip = (label, status, pct = null, inst = null) => {
    if (inst && status !== 'downloading' && _grabWaiting(inst)) {
      return `<span class="inst-chip ic--downloading">${label}<span class="is-spin" style="margin-left:5px;width:9px;height:9px;border-width:1.5px"></span></span>`;
    }
    // Consistent with the Sonarr chip: show the label plus a "not monitored" text suffix
    // rather than just an icon, so the state is unambiguous at a glance.
    if (status === 'unmonitored') {
      const nm = this._t('notMonitored');
      return `<span class="inst-chip ic--added">${label ? `${label} — ${nm}` : nm}</span>`;
    }
    const map = {
      available:   { cls: 'ic--available',   icon: '✓' },
      downloading: { cls: 'ic--downloading', icon: '' },
      failed:      { cls: 'ic--failed',      icon: '✗' },
      missing:     { cls: 'ic--missing',     icon: '✗' },
      added:       { cls: 'ic--added',       icon: '' },
      partial:     { cls: 'ic--partial',     icon: '' },
      none:        { cls: 'ic--none',        icon: '–' },
    };
    const { cls } = map[status] || map.none;
    if (status === 'downloading') {
      const p = pct ?? 0;
      const barHtml = `<div style="display:inline-flex;align-items:center;gap:3px;margin-left:4px;vertical-align:middle"><div style="width:36px;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden;display:inline-block;vertical-align:middle"><div style="width:${Math.max(p,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${p}%</span></div>`;
      return `<span class="inst-chip ${cls}">${label}${barHtml}</span>`;
    }
    const { icon } = map[status] || map.none;
    return `<span class="inst-chip ${cls}">${label}${icon ? ` <span class="ic-icon">${icon}</span>` : ''}</span>`;
  };
  // Download pct helpers for chips (no channel gate — chips always show actual state)
  const _chipMoviePct = (inst) => {
    const mId = inst === 'radarr2' ? d._radarr2Id : d._radarrId;
    if (!mId) return null;
    const qPct = inst === 'radarr2' ? (this._radarr2QueuePct || new Map()) : (this._radarrQueuePct || new Map());
    return qPct.has(mId) ? qPct.get(mId) : null;
  };
  const _chipSeriesPct = (inst) => {
    const series = inst === 'sonarr2' ? d._sonarr2Series : d._sonarrSeries;
    if (!series?.id) return null;
    const qPct = inst === 'sonarr2' ? (this._sonarr2QueueSeriesPct || new Map()) : (this._sonarrQueueSeriesPct || new Map());
    return qPct.has(series.id) ? qPct.get(series.id) : null;
  };
  let instanceStatusHtml = '';
  let singleDlTag = '';
  if (isMovieType && this._radarr2Configured) {
    const is4k  = this._seerrRadarr2?.is4k;
    let lbl1, lbl2;
    if (is4k) {
      [lbl1, lbl2] = ['HD', '4K'];
    } else {
      [lbl1, lbl2] = _instLabels(
        this._seerrRadarr?.name, this._seerrRadarr2?.name,
        'Radarr 1', 'Radarr 2'
      );
    }
    const st1 = _instStatus(radarrEntry,  this._radarrQueueActive,  this._radarrQueueFailed);
    const st2 = _instStatus(radarr2Entry, this._radarr2QueueActive, this._radarr2QueueFailed);
    instanceStatusHtml = `<div class="instance-status-row">${_instChip(lbl1, st1, _chipMoviePct('radarr'), 'radarr')}${_instChip(lbl2, st2, _chipMoviePct('radarr2'), 'radarr2')}</div>`;
  } else if (isSonarrType && this._sonarr2Configured) {
    const [lbl1, lbl2] = _instLabels(
      this._seerrSonarr?.name, this._seerrSonarr2?.name,
      'Sonarr 1', 'Sonarr 2'
    );
    instanceStatusHtml = `<div class="instance-status-row">${this._snInstChip(_instChip, lbl1, sonarrEntry, _chipSeriesPct('sonarr'), 'sonarr')}${this._snInstChip(_instChip, lbl2, sonarr2Entry, _chipSeriesPct('sonarr2'), 'sonarr2')}</div>`;
  } else if (isMovieType) {
    // Single Radarr — show download tag if downloading
    const pct = _chipMoviePct('radarr');
    if (pct === null && _grabWaiting('radarr')) {
      // No chip row in the single-instance layout, so the spinner stands alone
      // where the progress bar is about to appear.
      singleDlTag = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="is-spin" style="width:10px;height:10px;border-width:1.5px"></span><span style="font-size:10px;color:#3b82f6;font-weight:700">${this._t('loading')}</span></div>`;
    } else if (pct !== null) {
      singleDlTag = `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><div style="width:80px;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(pct,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:10px;color:#3b82f6;font-weight:700">${pct}%</span></div>`;
    }
  } else if (isSonarrType) {
    // Single Sonarr — episode count chip when added, download tag when downloading
    const pct = _chipSeriesPct('sonarr');
    if (pct !== null) {
      singleDlTag = `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><div style="width:80px;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(pct,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:10px;color:#3b82f6;font-weight:700">${pct}%</span></div>`;
    } else if (sonarrEntry) {
      instanceStatusHtml = `<div class="instance-status-row">${this._snInstChip(_instChip, '', sonarrEntry, null, 'sonarr')}</div>`;
    }
  }
  return { instanceStatusHtml, singleDlTag };
}

_ppRatingsRow({ d, isMovieType, isSonarrType, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry }) {
  // ── Ratings row — realistic source icons ────────────────────────────────
  let ratingsRow = '';
  {
    const _icImdb = `<svg width="30" height="15" viewBox="0 0 64 32" style="flex-shrink:0"><rect width="64" height="32" rx="6" fill="#F5C518"/><text x="32" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#000">IMDb</text></svg>`;
    const _icTmdb = `<svg width="30" height="15" viewBox="0 0 64 32" style="flex-shrink:0"><rect width="64" height="32" rx="6" fill="#0d253f"/><text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#01b4e4">TMDB</text></svg>`;
    const _icRt   = `<svg width="15" height="15" viewBox="0 0 24 24" style="flex-shrink:0"><path fill="#FA320A" d="M12 7.5c-5 0-8.5 3-8.5 7.8 0 4.4 3.8 6.7 8.5 6.7s8.5-2.3 8.5-6.7c0-4.8-3.5-7.8-8.5-7.8z"/><path fill="#00912D" d="M11.8 7.6c.2-2 1.5-3.6 3.6-4.1-1 1.2-1.2 2.1-1.2 2.1s2-1.6 4.1-1c-1.5 1-2 2.3-2 2.3s1.7-.7 3.2-.2c-2 1.5-4.2 1.4-5.7 1.1-.5-.1-1.4-.2-2-.2z"/></svg>`;
    const _icMc   = `<svg width="15" height="15" viewBox="0 0 32 32" style="flex-shrink:0"><circle cx="16" cy="16" r="16" fill="#001a35"/><text x="16" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#ffcc33">m</text></svg>`;
    const _icTvdb = `<svg width="30" height="15" viewBox="0 0 64 32" style="flex-shrink:0"><rect width="64" height="32" rx="6" fill="#6cd591"/><text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#003224">TVDB</text></svg>`;
    const _fmt1 = v => (Math.round(v * 10) / 10).toFixed(1);
    const items = [];
    const _rR = (radarrEntry || radarr2Entry)?.ratings;
    const _snR = (sonarrEntry || sonarr2Entry)?.ratings;
    if (isMovieType && _rR) {
      if (_rR.imdb?.value)  items.push([_icImdb, _fmt1(_rR.imdb.value)]);
      if (_rR.tmdb?.value)  items.push([_icTmdb, _fmt1(_rR.tmdb.value)]);
      else if (d.voteAverage) items.push([_icTmdb, _fmt1(d.voteAverage)]);
      if (_rR.rottenTomatoes?.value > 0) items.push([_icRt, `${Math.round(_rR.rottenTomatoes.value)}%`]);
      if (_rR.metacritic?.value > 0)     items.push([_icMc, `${Math.round(_rR.metacritic.value)}`]);
    } else if (isSonarrType) {
      // Sonarr series carry no provider breakdown (no IMDb rating) — prefer TMDB's
      // voteAverage (already fetched via Overseerr/TMDB for the popup) over Sonarr's own
      // generic TheTVDB score, only falling back to TVDB if TMDB is unavailable too.
      if (d.voteAverage)     items.push([_icTmdb, _fmt1(d.voteAverage)]);
      else if (_snR?.value)  items.push([_icTvdb, _fmt1(_snR.value)]);
    } else if (d.voteAverage) {
      items.push([_icTmdb, _fmt1(d.voteAverage)]);
    }
    // Rotten Tomatoes z Overseerr ratings (lazy fetch) — seriály + filmy mimo Radarr
    const _rtOv = d._rtRatings;
    if (_rtOv?.criticsScore != null && !items.some(it => it[0] === _icRt)) {
      items.push([_icRt, `${Math.round(_rtOv.criticsScore)}%`]);
    }
    if (items.length) {
      ratingsRow = `<div class="popup-ratings">${items.map(([ic, v]) =>
        `<span style="display:inline-flex;align-items:center;gap:4px">${ic}<b style="font-size:12px;color:var(--is-text);line-height:1;display:block;margin-top:-1px">${v}</b></span>`).join('')}</div>`;
    }
  }
  return { ratingsRow };
}

_ppFileInfoRow({ isMovieType, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry }) {
  // ── File info — audio, subtitles, quality ──────────────────────────────
  // Its own line under the ratings: these describe the copy on disk, not the
  // title, so mixing them into the ratings row would blur two different things.
  let fileInfoRow = '';
  {
    // Whichever instance actually holds files describes the copy; an entry
    // added but never downloaded has nothing to report.
    const _fiEntry = isMovieType
      ? ((radarrEntry?.hasFile && radarrEntry) || (radarr2Entry?.hasFile && radarr2Entry))
      : ((sonarrEntry?.statistics?.episodeFileCount > 0 && sonarrEntry)
        || (sonarr2Entry?.statistics?.episodeFileCount > 0 && sonarr2Entry));
    if (_fiEntry) {
      const _fiLangs = this._arrLangCodes(_fiEntry, isMovieType, { force: true });
      const _fiQual  = this._qualityLabel(_fiEntry, isMovieType);
      const _fiTags = [
        // Subtitles before audio throughout the card — the poster strip reads
        // the same way round.
        _fiQual ? `<span class="pp-fi-chip"><span class="pp-fi-txt">${this._escHtml(_fiQual)}</span></span>` : '',
        this._ppLangChip('subs',  _fiLangs.subCodes),
        this._ppLangChip('audio', _fiLangs.audioCodes),
      ].filter(Boolean).join('');
      if (_fiTags) fileInfoRow = `<div class="popup-fileinfo">${_fiTags}</div>`;
    }
  }
  return { fileInfoRow };
}

_ppMonitorTitle({ _instLabels, d, isAdmin, isMovieType, isSonarrType, isl1, isl2, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry }) {
  // ── Title monitoring bookmark ──────────────────────────────────────────
  let monTitleBtn = '';
  let monAddLabel = '';
  if (isAdmin && (isMovieType || isSonarrType)) {
    const _monE1   = isMovieType ? radarrEntry  : sonarrEntry;
    const _monE2   = isMovieType ? radarr2Entry : sonarr2Entry;
    const _monI1   = isMovieType ? 'radarr'  : 'sonarr';
    const _monI2   = isMovieType ? 'radarr2' : 'sonarr2';
    const _mon2Configured = isMovieType ? this._radarr2Configured : this._sonarr2Configured;
    const _monAdded = [_monE1 && _monI1, _monE2 && _monI2].filter(Boolean);
    if (_monAdded.length || _mon2Configured) {
      const _bmSvg = (mon, sz = 20) => mon
        ? `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
        : `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
      const _monSpin = `<span class="action-spinner" style="width:13px;height:13px;border-width:1.5px"></span>`;
      const _monAny  = !!(_monE1?.monitored || _monE2?.monitored);
      const _monTitleTip = this._t('monitoringTip');
      if (!_mon2Configured && _monAdded.length === 1) {
        const inst = _monAdded[0];
        const busy = this._popupMonBusy === inst;
        monTitleBtn = `<button class="popup-mon-btn" data-action="popup-monitor-toggle" data-instance="${inst}" title="${_monTitleTip}"${busy ? ' disabled' : ''}>${busy ? _monSpin : _bmSvg(_monAny)}</button>`;
      } else {
        monTitleBtn = `<button class="popup-mon-btn${this._popupMonExpand ? ' active' : ''}" data-action="popup-monitor-expand" title="${_monTitleTip}">${_bmSvg(_monAny)}</button>`;
        if (this._popupMonExpand) {
          const [_ml1, _ml2] = isMovieType
            ? [isl1, isl2]
            : _instLabels(this._seerrSonarr?.name, this._seerrSonarr2?.name, 'Sonarr 1', 'Sonarr 2');
          // Inline (appended after the bookmark icon, same title row) rather than a separate
          // row below — keeps the modal from growing taller when expanded.
          monTitleBtn += [[_monI1, _monE1, _ml1], [_monI2, _monE2, _ml2]].map(([inst, e, lbl]) => {
            if (e) {
              const busy = this._popupMonBusy === inst;
              return `<button class="is-open-btn" data-action="popup-monitor-toggle" data-instance="${inst}" style="flex-shrink:0;height:18px;padding:0 7px 0 6px;font-size:10px;gap:4px;margin-top:0;align-self:center" title="${lbl}"${busy ? ' disabled' : ''}>${busy ? _monSpin : _bmSvg(!!e?.monitored, 10)} ${lbl}</button>`;
            }
            // Not in this instance yet — offer to add it unmonitored. Confirm shown
            // in the trailer slot below (same spot Automatic/Interactive Search uses).
            const addActive = this._popupMonAddInst === inst;
            if (addActive) monAddLabel = lbl;
            return `<button class="is-open-btn${addActive ? ' active' : ''}" data-action="popup-monitor-add-confirm" data-instance="${inst}" style="flex-shrink:0;height:18px;padding:0 7px 0 6px;font-size:10px;gap:4px;margin-top:0;align-self:center;opacity:${addActive ? '1' : '0.55'};border-style:dashed" title="${lbl}">+ ${lbl}</button>`;
          }).join('');
        }
      }
    }
  }

  const canTerminate = !!(d._streamEntity && (d._plexSessionId || d._jfSessionId || d._embySessionId || d._kodiEntityId)) && !!(this._hass?.user?.is_admin);
  return { monTitleBtn, monAddLabel };
}

_ppStateHtml({ d }) {
  // Loading state
  if (d._loading) {
    return `
      <div class="popup-overlay">
        <div class="popup-glass" style="align-items:center;justify-content:center;min-height:200px">
          <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <div style="color:rgba(255,255,255,0.7);font-size:13px">${this._t('loadingDetail')}</div>
        </div>
      </div>`;
  }

  // Music/stream popup
  if (d._type === POPUP_TYPE.STREAM) return this._renderStreamPopup(d);

  // Info-only popup — description + trailer, no action buttons
  if (d._infoOnly) {
    const _year     = d.releaseDate ? d.releaseDate.slice(0,4) : (d.firstAirDate ? d.firstAirDate.slice(0,4) : '');
    const _genres   = (d.genres||[]).map(g=>this._escHtml(g.name||'')).filter(Boolean).join(' · ');
    const _rating   = d.voteAverage ? d.voteAverage.toFixed(1) : '';
    const _overview = this._escHtml(d.overview||'');
    const _cert     = this._certChipHtml(d);
    const _subLine  = [_year, _genres, _cert, _rating ? `⭐ ${_rating}` : ''].filter(Boolean).join(' · ');
    const _posterUrl = d.posterPath ? (d.posterPath.startsWith('http') ? d.posterPath : `https://image.tmdb.org/t/p/w342${d.posterPath}`) : (d._localPosterUrl||'');
    const _backdropUrl = d.backdropPath ? `https://image.tmdb.org/t/p/w1280${d.backdropPath}` : (d._localBackdropUrl||'');
    const _videos = Array.isArray(d.relatedVideos) ? d.relatedVideos : [];
    const _trailer = _videos.find(v=>v.site==='YouTube'&&v.type==='Trailer') || _videos.find(v=>v.site==='YouTube');
    const _trailerHtml = _trailer ? `<a class="popup-yt-thumb" href="https://www.youtube.com/watch?v=${encodeURIComponent(_trailer.key)}" target="_blank" rel="noopener noreferrer"><img src="https://img.youtube.com/vi/${encodeURIComponent(_trailer.key)}/hqdefault.jpg" loading="lazy" onerror="this.style.display='none'"/><div class="popup-yt-overlay"><div class="popup-yt-btn">▶ ${this._t('watchTrailer')}</div></div></a>` : '';
    const _hdrStyle = _backdropUrl ? `background-image:url('${_backdropUrl}');background-size:cover;background-position:center top` : (_posterUrl ? `background-image:url('${_posterUrl}');background-size:cover;background-position:center;filter:blur(6px) brightness(0.4)` : 'background:linear-gradient(135deg,rgba(20,20,40,1),rgba(40,20,60,1))');
    return `
      <div class="popup-overlay${dayClass(this)}">
        <div class="popup-glass" style="max-width:600px;width:calc(100vw - 32px);padding:0;gap:0;max-height:calc(100vh - 60px);overflow-y:auto;position:relative">
          <button class="popup-close" style="position:absolute;top:10px;right:10px;z-index:2">${ICONS.close}</button>
          <div style="height:160px;${_hdrStyle};position:relative;flex-shrink:0">
            ${_posterUrl ? `<img src="${_posterUrl}" style="position:absolute;bottom:-32px;left:16px;width:72px;height:108px;object-fit:cover;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5)" loading="lazy" onerror="this.style.display='none'"/>` : ''}
          </div>
          <div style="padding:${_posterUrl ? '44px' : '16px'} 16px 16px ${_posterUrl ? '100px' : '16px'}">
            <div style="font-size:15px;font-weight:700;color:var(--is-text);line-height:1.3">${this._escHtml(d.title||d.name||'')}</div>
            ${_subLine ? `<div style="font-size:11px;color:var(--is-text-muted);margin-top:3px">${_subLine}</div>` : ''}
          </div>
          ${_overview ? `<div style="padding:0 16px 12px;font-size:12px;color:var(--is-text-sec);line-height:1.6">${_overview}</div>` : ''}
          ${_trailerHtml ? `<div style="padding:0 16px 16px">${_trailerHtml}</div>` : ''}
        </div>
      </div>`;
  }

  // Activity modal IS — no poster/header, just IS panel
  if (d._fromActivity) {
    const actTitle = this._escHtml(d.title || d.name || '');
    const isPanel  = this._isState  ? this._renderIsPanel()           : '';
    const snPanel  = this._snIsOpen ? this._renderSonarrIsSection()   : '';
    return `
      <div class="popup-overlay${dayClass(this)}">
        <div class="popup-glass" style="width:min(900px, 94vw);padding:0;gap:0;max-height:calc(100vh - 80px);overflow-y:auto;overflow-x:hidden;position:relative">
          <button class="popup-close" style="position:absolute;top:12px;right:12px">${ICONS.close}</button>
          <div style="font-size:14px;font-weight:600;color:var(--is-text);margin-bottom:12px;padding:16px 48px 0 16px">${actTitle}</div>
          ${isPanel}${snPanel}
        </div>
      </div>`;

  }

  // Error state (no local fallback available)
  if (d._error) {
    return `
      <div class="popup-overlay">
        <div class="popup-glass" style="align-items:center;justify-content:center;min-height:200px;padding:24px">
          <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;text-align:center">
            ⚠ ${this._escHtml(d._error)}<br>
            <span style="font-size:11px;color:rgba(255,255,255,0.45)">${this._escHtml(d.title || '')}</span>
          </div>
        </div>
      </div>`;
  }
  return null;
}

_ppHeaderParts({ d }) {
  // Full detail (Overseerr data OR local fallback)
  const title    = this._escHtml(d.title || d.name || '');
  const year     = d.releaseDate ? d.releaseDate.slice(0, 4) : (d.firstAirDate ? d.firstAirDate.slice(0, 4) : '');
  const genres   = (d.genres || []).map(g => this._escHtml(g.name || '')).filter(Boolean).join(' · ');
  const rating   = d.voteAverage ? d.voteAverage.toFixed(1) : '';
  const overview = this._escHtml(d.overview || '');
  // Season count — always shown for series (Sonarr stats preferred, TMDB/Overseerr fallback)
  const _isSeriesPopup = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  let seasonsLine = '';
  if (_isSeriesPopup) {
    const snCount = d._sonarrSeries?.statistics?.seasonCount
      ?? d._sonarr2Series?.statistics?.seasonCount
      ?? d.numberOfSeasons ?? 0;
    if (snCount > 0) seasonsLine = this._tSeasons(snCount);
  }
  const certChip = this._certChipHtml(d);
  const subLine  = [year, seasonsLine, genres, certChip].filter(Boolean).join(' · ');

  // Images — prefer TMDB CDN paths, fall back to local Sonarr/Radarr URLs
  const backdropPath = d.backdropPath || null;
  const posterPath   = d.posterPath   || null;
  const backdropUrl  = backdropPath
    ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
    : (d._localBackdropUrl || '');
  const posterUrl    = posterPath
    ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w342${posterPath}`)
    : (d._localPosterUrl || '');

  const backdropStyle = backdropUrl
    ? `background-image:url('${backdropUrl}')`
    : (posterUrl
        ? `background-image:url('${posterUrl}');background-size:cover;background-position:center;filter:blur(6px) brightness(0.4)`
        : 'background:linear-gradient(135deg,rgba(20,20,40,1),rgba(40,20,60,1))');

  // Trailer — YouTube thumbnail link (avoids embed restrictions on local domains)
  const videos  = Array.isArray(d.relatedVideos) ? d.relatedVideos : [];
  const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos.find(v => v.site === 'YouTube');
  const trailerHtml = trailer
    ? `<a class="popup-yt-thumb"
         href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}"
         target="_blank" rel="noopener noreferrer">
         <img src="https://img.youtube.com/vi/${encodeURIComponent(trailer.key)}/hqdefault.jpg"
              loading="lazy" onerror="this.style.display='none'" />
         <div class="popup-yt-overlay">
           <div class="popup-yt-btn">▶ ${this._t('watchTrailer')}</div>
         </div>
       </a>`
    : '';

  const posterHtml = posterUrl
    ? `<img class="popup-poster" src="${posterUrl}" loading="lazy" onerror="this.style.display='none'" />`
    : '';
  return { title, overview, subLine, backdropStyle, trailer, trailerHtml, posterHtml };
}

_ppCastParts({ d }) {
  // ── Cast panel (toggle, paged) ───────────────────────────────────────────
  const _castList = (d.credits?.cast || []).filter(c => c.name);
  let castPanelHtml = '';
  if (this._popupCastOpen && _castList.length) {
    const PER = window.innerWidth <= 600 ? 3 : 6;
    const castPages = Math.max(1, Math.ceil(_castList.length / PER));
    const castPg = Math.min(this._popupCastPage || 0, castPages - 1);
    const slice = _castList.slice(castPg * PER, castPg * PER + PER);
    const items = slice.map(c => {
      const pp = c.profilePath || c.profile_path;
      const img = pp ? `https://image.tmdb.org/t/p/w185${pp}` : null;
      const initials = this._escHtml(c.name.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase());
      return `<div class="popup-cast-item">
        ${img
          ? `<img src="${img}" loading="lazy">`
          : `<div class="popup-cast-ph">${initials}</div>`}
        <div class="popup-cast-name">${this._escHtml(c.name)}</div>
        <div class="popup-cast-role">${this._escHtml(c.character || '')}</div>
      </div>`;
    }).join('');
    const _chevL = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const _chevR = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    // Paging lives on the panel's edges, which frees the row under the grid and
    // leaves room for the action capsule at the top.
    const nav = castPages > 1
      ? `<button class="popup-cast-arrow popup-cast-arrow--l" data-action="popup-cast-prev"${castPg === 0 ? ' disabled' : ''}>${_chevL}</button>
         <button class="popup-cast-arrow popup-cast-arrow--r" data-action="popup-cast-next"${castPg >= castPages - 1 ? ' disabled' : ''}>${_chevR}</button>
         <span class="popup-cast-pg">${castPg + 1} / ${castPages}</span>`
      : '';
    castPanelHtml = `<div class="popup-cast-panel"><div class="popup-cast-grid">${items}</div>${nav}</div>`;
  }
  const castGroupSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const castToggleBtn = _castList.length
    ? `<button class="popup-cast-fab${this._popupCastOpen ? ' active' : ''}" data-action="popup-cast-toggle">${castGroupSvg} ${this._t('castBtn')}</button>`
    : '';
  return { castPanelHtml, castToggleBtn };
}

_ppSearchParts({ _asSpinner, _instLabels, d, hasDualRadarr, hasDualSonarr, isAdmin, isMovieType, isSonarrType, isl1, isl2, personIconSvg, searchSvg }) {
  // ── Unified Search button ────────────────────────────────────────────
  const collXSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  let searchBtnHtml = '';
  let searchMenuRows = '';
  if (isAdmin && (isMovieType || isSonarrType) && !d._noIS) {
    const open = !!this._searchExpand;
    // Lit while its list is open and while whatever that list opened is still
    // on screen, so the button keeps naming the source of the panel below.
    const lit = open || this._asOpen || !!this._isState || this._snIsOpen;
    const _chev = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    // Written tight on purpose: whitespace inside the button renders as real
    // space glyphs and would make the collapsed state wider than the expanded.
    searchBtnHtml = `<div class="is-btn-row">
      <button class="is-open-btn is-search-btn${lit ? ' active' : ''}" data-action="${lit ? 'search-collapse' : 'search-expand'}">${searchSvg}<span class="pp-lbl">${this._t('musSearch')} ${_chev}</span></button>
    </div>`;

    // Both choices are visible at once now, so the old two-step pick (instance,
    // then mode) collapses into one list grouped by instance.
    // Indent belongs to rows sitting under an instance heading. With a single
    // instance there is no heading, so they are top level and start at the edge.
    const _asRow = (inst, label, indent) => {
      const key = `movie:${inst}`;
      const spinning = this._asPolling.has(key) || this._asMovieSearching
        || (this._asOpen && this._asState === 'adding' && this._asInstance === inst);
      const icon = spinning ? _asSpinner : searchSvg;
      const notFound = this._asNotFound.has(key);
      const downloading = this._asDownloadingItems.has(key);
      const active = this._asOpen && this._asInstance === inst;
      const tail = notFound
        ? `<span class="qa-air-date" style="color:rgba(255,149,0,1)">${this._t('asNotFound')}</span>`
        : downloading ? `<span class="qa-air-date" style="color:rgba(48,209,88,1)">↓</span>` : '';
      return `<button class="qa-item${indent ? ' qa-sub-item' : ''}${active ? ' qa-item-on' : ''}" data-action="search-pick-as" data-instance="${inst}"><span class="qa-ico">${icon}</span><span>${label}</span>${tail}</button>`;
    };
    const _isRow = (inst, label, indent) => {
      const active = isMovieType
        ? (!!this._isState && this._isInstance === inst)
        : (this._snIsOpen && this._snIsInstance === inst);
      return `<button class="qa-item${indent ? ' qa-sub-item' : ''}${active ? ' qa-item-on' : ''}" data-action="search-pick-is" data-instance="${inst}"><span class="qa-ico">${personIconSvg}</span><span>${label}</span></button>`;
    };

    const dual  = isMovieType ? hasDualRadarr : hasDualSonarr;
    const insts = isMovieType ? ['radarr', 'radarr2'] : ['sonarr', 'sonarr2'];
    const labels = isMovieType
      ? [isl1, isl2]
      : _instLabels(this._seerrSonarr?.name, this._seerrSonarr2?.name, 'Sonarr 1', 'Sonarr 2');
    const block = (inst, indent) => `${_asRow(inst, this._t('searchAutomatic'), indent)}${_isRow(inst, this._t('searchInteractive'), indent)}`;
    // Same shape as Options: the instance is a parent row that rolls its two
    // modes open, rather than a heading with everything already showing.
    const chevR = `<svg class="qa-chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    searchMenuRows = dual
      ? insts.map((inst, n) => {
          const key = `inst:${inst}`;
          const on  = this._ppMenu?.sub === key;
          return `<div class="qa-group">
            <button class="qa-item qa-item-parent${on ? ' qa-item-on' : ''}" data-qa-sub="${key}">
              <span class="qa-ico">${this._appIcon(isMovieType ? 'radarr' : 'sonarr', 16)}</span><span>${this._escHtml(labels[n])}</span>${chevR}
            </button>
            <div class="qa-drawer" data-qa-drawer="${key}">${block(inst, true)}</div>
          </div>`;
        }).join('')
      : block(insts[0], false);
  }
  return { searchBtnHtml, searchMenuRows };
}

_ppTagParts({ d, isMovieType }) {
  // Tags — lookup from Radarr/Sonarr regardless of admin
  const _popupRadarrEntry = (d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE)
    ? (this._radarr || []).find(m => m.id === d._radarrId) : null;
  const _popupSonarrEntry = (d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV) && d._sonarrSeries?.id
    ? (this._sonarr || []).find(s => s.id === d._sonarrSeries.id) : null;
  const _popupTags = _popupRadarrEntry
    ? (_popupRadarrEntry.tags || []).map(id => (this._radarrTags || []).find(t => t.id === id)?.label).filter(Boolean)
    : _popupSonarrEntry
      ? (_popupSonarrEntry.tags || []).map(id => (this._sonarrTags || []).find(t => t.id === id)?.label).filter(Boolean)
      : [];
  const _tagIconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:0.7"><path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.78 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58Z"/></svg>`;
  const popupTagHtml = _popupTags.length > 0
    ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:-6px;margin-bottom:10px">${_popupTags.map(l => `<span style="display:inline-flex;align-items:center;gap:2px;font-size:11px;color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:0 4px 0 3px;line-height:1.7">${_tagIconSvg}${this._escHtml(l)}</span>`).join('')}</div>`
    : '';

  // Detail view of a title Maintainerr has queued. Inline rather than pinned to
  // the poster — the popup has room to state it plainly.
  const _goneInfo = this._goneInfo(d.tmdbId || d.id, d.tvdbId, isMovieType);
  const _goneBadgeInner = _goneInfo
    ? this._mtDelBadge(_goneInfo.due, false, _goneInfo.seasons?.length ? this._mtSeasonLabel(_goneInfo.seasons) : '')
    : '';
  // Clicking through opens the Maintainerr collection the title is queued in
  const goneTagHtml = _goneBadgeInner
    ? `<div style="display:flex;margin:-2px 0 10px">${_goneInfo.colId != null
        ? `<span data-gone-col="${_goneInfo.colId}" title="${this._escHtml(_goneInfo.colTitle || '')}" style="cursor:pointer">${_goneBadgeInner}</span>`
        : _goneBadgeInner}</div>`
    : '';
  return { popupTagHtml, goneTagHtml };
}

_ppRemoveParts({ _instLabels, canRemoveRadarr, canRemoveSonarr, checkSvg, crossSvg, d, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry, trashSvg }) {
  const removeLabel = 'Remove ›';
  // Instance labels (same logic as IS buttons)
  const _rmIs4k   = this._seerrRadarr2?.is4k;
  const [_rmLbl1R, _rmLbl2R] = _rmIs4k
    ? ['HD', '4K']
    : _instLabels(this._seerrRadarr?.name, this._seerrRadarr2?.name, 'Radarr 1', 'Radarr 2');
  const [_rmLbl1S, _rmLbl2S] = _instLabels(this._seerrSonarr?.name, this._seerrSonarr2?.name, 'Sonarr 1', 'Sonarr 2');
  // Points down: the panel opens below the capsule, like Search and Options
  const chevronSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const removeBtn = (canRemoveRadarr || canRemoveSonarr)
    ? `<button class="is-open-btn remove-lib-btn${this._removeConfirm ? ' active' : ''}" data-action="${this._removeConfirm ? 'remove-no' : 'remove-confirm'}">${trashSvg}<span class="pp-lbl">${this._t('remove')} ${chevronSvg}</span></button>`
    : '';

  // Remove's drawer. Scope (library / disc) and instance are shown together —
  // choosing a row arms it, and the drawer then swaps to a confirmation. The
  // confirm step stays: these deletions cannot be undone.
  let removeMenuRows = '';
  if (canRemoveRadarr || canRemoveSonarr) {
    if (this._removeArmed) {
      const yesLbl = this._removeArmed === 'disc' ? this._t('ppYesDeleteFiles') : this._t('ppYesRemoveLib');
      removeMenuRows = `
        <button class="qa-item pp-armed-yes" data-action="remove-armed-yes"><span class="qa-ico">${checkSvg}</span><span>${yesLbl}</span></button>
        <button class="qa-item" data-action="remove-armed-no"><span class="qa-ico">${crossSvg}</span><span>${this._t('cancel')}</span></button>`;
    } else {
      const hasFiles = inst => inst === 'radarr'  ? !!radarrEntry?.hasFile
                             : inst === 'radarr2' ? !!radarr2Entry?.hasFile
                             : inst === 'sonarr'  ? (sonarrEntry?.statistics?.episodeFileCount > 0)
                             : (sonarr2Entry?.statistics?.episodeFileCount > 0);
      const present = [];
      if (canRemoveRadarr && d._radarrId)          present.push(['radarr',  _rmLbl1R]);
      if (canRemoveRadarr && d._radarr2Id)         present.push(['radarr2', _rmLbl2R]);
      if (canRemoveSonarr && d._sonarrSeries?.id)  present.push(['sonarr',  _rmLbl1S]);
      if (canRemoveSonarr && d._sonarr2Series?.id) present.push(['sonarr2', _rmLbl2S]);
      // The icon names the scope, the way Search's names the mode. Every row
      // here removes something, so a bin on each — or the same app icon twice —
      // would tell the two apart no better than nothing at all. The app icon
      // belongs on the instance row above, where it actually distinguishes.
      const _rmLibSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
      const _rmDiscSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`;
      const block = (inst, indent) => `
        <button class="qa-item${indent ? ' qa-sub-item' : ''}" data-action="remove-choose-lib" data-instance="${inst}"><span class="qa-ico">${_rmLibSvg}</span><span>${this._t('musRemoveLib')}</span></button>
        ${hasFiles(inst) ? `<button class="qa-item${indent ? ' qa-sub-item' : ''}" data-action="remove-choose-disc" data-instance="${inst}"><span class="qa-ico">${_rmDiscSvg}</span><span>${this._t('musRemoveDisc')}</span></button>` : ''}`;
      const chevR2 = `<svg class="qa-chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
      removeMenuRows = present.length > 1
        ? present.map(([inst, lbl]) => {
            const key = `rminst:${inst}`;
            const on  = this._ppMenu?.sub === key;
            return `<div class="qa-group">
              <button class="qa-item qa-item-parent${on ? ' qa-item-on' : ''}" data-qa-sub="${key}">
                <span class="qa-ico">${this._appIcon(inst.startsWith('radarr') ? 'radarr' : 'sonarr', 16)}</span><span>${this._escHtml(lbl)}</span>${chevR2}
              </button>
              <div class="qa-drawer" data-qa-drawer="${key}">${block(inst, true)}</div>
            </div>`;
          }).join('')
        : present.length ? block(present[0][0], false) : '';
    }
  }
  return { removeBtn, removeMenuRows };
}

_ppConfirmPanel({ _instLabels, _isMovieType, asConfirmOnly, hasDualRadarr, hasDualSonarr, isConfirmAdd, isl1, isl2, monAddLabel, snConfirmAdd }) {
  // ── Unified confirm panel (trailer-slot replacement) ────────────────────
  const _cfCheckSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const _cfCrossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const _cfStyle = 'height:clamp(140px,28vh,210px);min-height:0;flex:0 0 auto;display:flex;align-items:center;justify-content:center';
  const _instLbl = (inst) => {
    if (inst === 'radarr')  return hasDualRadarr ? isl1 : 'Radarr';
    if (inst === 'radarr2') return hasDualRadarr ? isl2 : 'Radarr';
    if (inst === 'sonarr')  return hasDualSonarr ? _instLabels(this._seerrSonarr?.name, this._seerrSonarr2?.name, 'Sonarr 1', 'Sonarr 2')[0] : 'Sonarr';
    if (inst === 'sonarr2') return hasDualSonarr ? _instLabels(this._seerrSonarr?.name, this._seerrSonarr2?.name, 'Sonarr 1', 'Sonarr 2')[1] : 'Sonarr';
    return inst;
  };
  const monAddActive = !!this._popupMonAddInst;
  let confirmPanelHtml = '';
  if (isConfirmAdd) {
    const _isInstLbl = _instLbl(this._isInstance);
    const _isMsg = this._t('isAddFirstMovie').replace('{inst}', () => _isInstLbl);
    confirmPanelHtml = `<div class="is-panel" style="${_cfStyle}"><div class="is-confirm-wrap">
      <div class="is-confirm-msg">${_isMsg}</div>
      <div class="is-confirm-actions">
        <button class="is-confirm-btn is-confirm-yes" data-action="is-confirm-yes">${_cfCheckSvg}</button>
        <button class="is-confirm-btn is-confirm-no" data-action="is-confirm-no">${_cfCrossSvg}</button>
      </div></div></div>`;
  } else if (snConfirmAdd) {
    const _snInstLbl = _instLbl(this._snIsInstance);
    const _snMsg = this._t('isAddFirstSeries').replace('{inst}', () => _snInstLbl);
    confirmPanelHtml = `<div class="is-panel" style="${_cfStyle}"><div class="is-confirm-wrap">
      <div class="is-confirm-msg">${_snMsg}</div>
      <div class="is-confirm-actions">
        <button class="is-confirm-btn is-confirm-yes" data-action="sn-confirm-yes">${_cfCheckSvg}</button>
        <button class="is-confirm-btn is-confirm-no" data-action="sn-confirm-no">${_cfCrossSvg}</button>
      </div></div></div>`;
  } else if (asConfirmOnly) {
    const _asInstLbl = _instLbl(this._asInstance);
    const _asMsg = this._t(_isMovieType ? 'asAddMovie' : 'asAddSeries').replace('{inst}', () => _asInstLbl);
    confirmPanelHtml = `<div class="is-panel" style="${_cfStyle}"><div class="is-confirm-wrap">
      <div class="is-confirm-msg">${_asMsg}</div>
      <div class="is-confirm-actions">
        <button class="is-confirm-btn is-confirm-yes" data-action="as-confirm-yes">${_cfCheckSvg}</button>
        <button class="is-confirm-btn is-confirm-no" data-action="as-confirm-no">${_cfCrossSvg}</button>
      </div></div></div>`;
  } else if (this._popupMonAddSearch) {
    const _searchMsg = this._t('runSearchNow');
    const _asLabel = this._t('searchAutomatic');
    const _isLabel = this._t('searchInteractive');
    const _asSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    const _isSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    confirmPanelHtml = `<div class="is-panel" style="${_cfStyle}"><div class="is-confirm-wrap" style="gap:10px">
      <div class="is-confirm-msg">${_searchMsg}</div>
      <div class="is-confirm-actions" style="gap:8px">
        <button class="is-confirm-btn is-confirm-yes" data-action="popup-mon-search-as" style="width:auto;border-radius:19px;padding:0 14px;gap:5px;font-size:11px;font-weight:500">${_asSvg} ${_asLabel}</button>
        <button class="is-confirm-btn is-confirm-yes" data-action="popup-mon-search-is" style="width:auto;border-radius:19px;padding:0 14px;gap:5px;font-size:11px;font-weight:500">${_isSvg} ${_isLabel}</button>
        <button class="is-confirm-btn is-confirm-no" data-action="popup-mon-search-no">${_cfCrossSvg}</button>
      </div>
    </div></div>`;
  } else if (monAddActive) {
    const monAddBusy = this._popupMonAddBusy === this._popupMonAddInst;
    const monAddMsg  = this._t('monAddAsMonitored').replace('{inst}', () => monAddLabel);
    confirmPanelHtml = `<div class="is-panel" style="${_cfStyle}"><div class="is-confirm-wrap">
      <div class="is-confirm-msg">${this._escHtml(monAddMsg)}</div>
      <div class="is-confirm-actions">
        ${monAddBusy ? `<span class="action-spinner" style="width:20px;height:20px;border-width:2px"></span>` : `
        <button class="is-confirm-btn is-confirm-yes" data-action="popup-monitor-add-yes" data-instance="${this._popupMonAddInst}">${_cfCheckSvg}</button>
        <button class="is-confirm-btn is-confirm-no" data-action="popup-monitor-add-no">${_cfCrossSvg}</button>`}
      </div></div></div>`;
  }
  return { confirmPanelHtml };
}

}

export const popupDetailPartsMixin = _PopupDetailPartMethods.prototype;
