import { POPUP_TYPE } from '../constants.js';

// The Discover rows' cards: upcoming films and series, trending, Trakt and SuggestArr. Split out of render/media-cards.js.

class _DiscoverCardsMethods {

_renderTvUpcomingCard(m, { showDate = true, showRating = false, typeTag = '', overlayIndex = null, source = 'tvUpcoming', watchedBtn = '', traktOverlays = '', actionHtml = null } = {}) {
  const title   = this._escHtml(m.name || m.originalName || 'Unknown');
  const rating  = m.voteAverage ? m.voteAverage.toFixed(1) : '?';
  const dateStr = this.fmtDate(m.firstAirDate || m.first_air_date);
  const mediaStatus = m.mediaInfo?.status;

  // inSonarr      = seriál je v Sonarru (přidán, nemusí mít epizody)
  // inSonarrAvail = seriál je v Sonarru A má alespoň jeden soubor epizody
  const sonarrEntry   = Array.isArray(this._sonarr) && this._sonarr.find(s => s.tmdbId === m.id);
  const inSonarr      = !!sonarrEntry;
  const inSonarrAvail = !!(sonarrEntry && (sonarrEntry.statistics?.episodeFileCount > 0));
  const _sonarrFc     = sonarrEntry?.statistics?.episodeFileCount || 0;
  const _sonarrTc     = sonarrEntry?.statistics?.episodeCount || 0;
  const _sonarrPartial = inSonarrAvail && _sonarrTc > 0 && _sonarrFc < _sonarrTc;
  const _inOptimistic = this._optimisticRequested.has(m.id);
  const _withdrawn    = this._withdrawnIds.has(m.id);
  // Overseerr status >= 3 bez záznamu v Sonarru = stará data (seriál byl odebrán)
  // Výjimka: pokud má family user aktivní pending request, není to stale
  const _hasPending   = this._familyPendingIds.has(m.id);
  const _stale        = mediaStatus >= 3 && !inSonarr && !_inOptimistic && !_hasPending;
  const _isAvail      = (inSonarrAvail || mediaStatus === 5) && !_withdrawn && !_stale;
  const _isReq        = (mediaStatus >= 2 || _inOptimistic || _hasPending || inSonarr) && !_withdrawn && !inSonarrAvail && !_stale;
  const _reqId        = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(m.id);
  const _isAdmin      = this._hass.user.is_admin;
  const _noSeerr      = this._overseerrConfigured === false;

  let actionBtn = '';
  if (_isAvail) {
    actionBtn = '';
  } else if (_isReq) {
    if (_isAdmin || _noSeerr || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
      actionBtn = '';
    } else {
      const withdrawBtn = _reqId
        ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`
        : '';
      actionBtn = withdrawBtn;
    }
  } else {
    actionBtn = `<button class="btn-add tv-req-open" data-showid="${m.id}" data-title="${title}" data-source="${source}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" width="14" height="14" style="display:block"><path d="M12 5v14M5 12h14"/></svg></button>`;
  }
  // A caller's own action (Similar titles) goes above the request button, or
  // in its place where there is none to show.
  actionBtn = this._simStack(actionBtn, actionHtml);

  const pc = this._posterCfg();
  let badgeCls = '';
  let badgeHtml = '';
  if (_isAvail) {
    if (_sonarrPartial) {
      badgeCls = 'b-partial';
      badgeHtml = `<span class="badge b-partial">${_sonarrFc}/<span class="b-txt">${_sonarrTc}</span></span>`;
    } else {
      badgeCls = 'b-st-avail';
      badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
    }
  } else if (_isReq) {
    if (_isAdmin || _noSeerr || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
      badgeCls = 'b-st-proc';
      badgeHtml = this._badge('b-st-proc', '↓', this._t('badgeAdded'));
    } else {
      badgeCls = 'b-st-pend';
      badgeHtml = this._badge('b-st-pend', '⏱', this._t('badgePending'));
    }
  }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const _partialPct2 = badgeCls === 'b-partial' && _sonarrTc > 0 ? Math.round((_sonarrFc / _sonarrTc) * 100) : -1;
  const _stripePct2 = badgeCls === 'b-dl' ? this._dlPct(sonarrEntry?.id, 'tv') : _partialPct2;
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', _stripePct2) : '';

  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const effectiveTypeTag = typeTag || (showDate ? this._t('typeTv') : '');
  const img = this._mcImg(m.posterPath ? (m.posterPath.startsWith('http') ? m.posterPath : `https://image.tmdb.org/t/p/w342${m.posterPath}`) : null, '📺', m.id);
  const _tvLangs = this._arrLangCodes(sonarrEntry, false);
  const ratingHtml = this._ratingLangBlock(m, { ..._tvLangs, showRating });
  return `
    <div class="mc" data-popup="${POPUP_TYPE.TV}" data-tmdbid="${m.id}" data-title="${title}"${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ''}>
      ${this._goneBadge(m.id, m.tvdbId || null, false)}
      ${img}
      ${traktOverlays}
      ${(effectiveTypeTag && pc.mediaType) ? `<span class="media-type-tag"><span class="b-txt">${effectiveTypeTag}</span></span>` : ''}
      ${showDate ? `<div style="position:absolute;top:6px;right:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-end">
        ${dateStr ? `<span class="media-type-tag" style="position:static">${dateStr}</span>` : ''}
        ${statusBadge}
      </div>` : statusBadge}
      ${this._mcGrad(grad, `${ratingHtml}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${actionBtn ? 'padding-right:20px' : ''}">${title}</div>` : ''}${actionBtn ? `<div style="position:absolute;bottom:8px;right:10px">${actionBtn}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

_renderTraktCard(m, overlayIndex = null) {
  if (m._traktLoading) {
    return `<div class="mc trakt-loading-card" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);animation:trakt-pulse 1.8s ease-in-out infinite">
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,0.12);border-top-color:rgba(255,255,255,0.5)"></span>
        <span style="font-size:9px;color:rgba(255,255,255,0.3);text-align:center;letter-spacing:0.5px">${this._t('traktRefreshing')}</span>
      </div>
    </div>`;
  }
  // Trakt returns `title` — normalise to fields expected by render helpers
  const normalized = Object.assign({}, m, {
    name: m.name || m.title,
    originalName: m.originalName || m.title,
    firstAirDate: m.firstAirDate || m.releaseDate,
    releaseDate: m.releaseDate,
  });
  const alreadyHidden = this._traktWatching?.has(m._traktSlug || String(m.id));
  const traktData = `data-trakt-slug="${m._traktSlug || ''}" data-trakt-type="${m.mediaType}" data-trakt-tmdb="${m.id}"`;
  const _chars = s => s.toUpperCase().split('').join('<br>');
  const traktOverlays = alreadyHidden ? '' :
    `<div class="trakt-seen-ol" ${traktData}><span>${_chars(this._t('watched'))}</span></div>` +
    `<div class="trakt-ni-ol"   ${traktData}><span>${_chars(this._t('skip'))}</span></div>`;
  if (m.mediaType === 'tv') {
    return this._renderTvUpcomingCard(normalized, { showDate: false, showRating: true, typeTag: this._t('typeTv'), overlayIndex, source: 'trakt', traktOverlays });
  }
  return this._renderUpcomingCard(normalized, { showDate: false, typeTag: this._t('typeMovie'), overlayIndex, reqKey: 'trakt-' + m.id, traktOverlays });
}

// Same shape as a Trakt card. The overlays differ in what they mean upstream:
// Seen only drops the suggestion, Skip blacklists it in SuggestArr for good.
_renderSuggestArrCard(m, overlayIndex = null) {
  const saData = `data-sa-id="${m._saId}" data-sa-tmdb="${m.id}" data-sa-type="${m.mediaType}"`;
  const _chars = s => s.toUpperCase().split('').join('<br>');
  const overlays =
    `<div class="trakt-seen-ol sa-seen-ol" ${saData}><span>${_chars(this._t('watched'))}</span></div>` +
    `<div class="trakt-ni-ol   sa-skip-ol" ${saData}><span>${_chars(this._t('skip'))}</span></div>`;
  if (m.mediaType === 'tv') {
    return this._renderTvUpcomingCard(m, { showDate: false, showRating: true, typeTag: this._t('typeTv'), overlayIndex, source: 'suggestarr', traktOverlays: overlays });
  }
  return this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), overlayIndex, reqKey: 'sa-' + m.id, traktOverlays: overlays });
}

_renderTrendingCard(m, overlayIndex = null) {
  if (m.mediaType === 'tv') {
    return this._renderTvUpcomingCard(m, { showDate: false, showRating: true, typeTag: this._t('typeTv'), overlayIndex, source: 'trending' });
  }
  return this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), overlayIndex, reqKey: 'trending-' + m.id });
}

_renderUpcomingCard(m, { showDate = true, showRating = !showDate, typeTag = '', overlayIndex = null, reqKey = String(m.id), watchedBtn = '', traktOverlays = '', actionHtml = null } = {}) {
  const title = this._escHtml(m.title || 'Unknown');
  const rating = m.voteAverage ? m.voteAverage.toFixed(1) : '?';
  const dateStr = showDate ? this.fmtDate(m.digitalRelease || m.releaseDate) : '';

  // Check Radarr library (direct match by TMDB ID)
  // inRadarr          = film je v Radarru (přidán, ale nemusí být stažen)
  // inRadarrAvail     = film je v Radarru A má soubor (stažen/dostupný)
  // inRadarrDownloading = film je v Radarru, nemá soubor, ale aktivně se stahuje
  const radarrEntry         = Array.isArray(this._radarr) && this._radarr.find(r => r.tmdbId === m.id);
  const inRadarr            = !!radarrEntry;
  const inRadarrAvail       = !!(radarrEntry && radarrEntry.hasFile);
  const inRadarrDownloading = !!(radarrEntry && !radarrEntry.hasFile && this._radarrQueueActive.has(radarrEntry.id));
  const radarr2Entry        = this._radarr2ByTmdb?.get(String(m.id));
  const inRadarr2           = !!radarr2Entry;
  const inRadarr2Avail      = !!(radarr2Entry && radarr2Entry.hasFile);
  const inRadarr2Downloading = !!(radarr2Entry && !radarr2Entry.hasFile && this._radarr2QueueActive?.has(radarr2Entry.id));

  const mediaStatus = m.mediaInfo?.status;
  // Status 5 = available, 3 = approved/processing, 2 = pending

  const _inOptimistic = this._optimisticRequested.has(m.id);
  const _withdrawn    = this._withdrawnIds.has(m.id);
  // Overseerr status >= 3 bez záznamu v Radarru = stará data (film byl odebrán)
  // Výjimka: pokud má family user aktivní pending request, není to stale
  const _hasPending   = this._familyPendingIds.has(m.id);
  const _stale        = mediaStatus >= 3 && !inRadarr && !inRadarr2 && !_inOptimistic && !_hasPending;
  // Available = staženo (má soubor v Radarru nebo Radarr 2) nebo Overseerr status=5
  const _isAvail      = (inRadarrAvail || inRadarr2Avail || mediaStatus === 5) && !_withdrawn && !_stale;
  // Req = cokoliv mezi "přidáno" a "schválení" — včetně stahování
  const _isReq        = (mediaStatus >= 2 || _inOptimistic || _hasPending || inRadarr || inRadarr2) && !_withdrawn && !inRadarrAvail && !inRadarr2Avail && !_stale;
  const _isDownloading = inRadarrDownloading || inRadarr2Downloading;
  const _reqId        = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(m.id);
  const _isAdmin      = this._hass.user.is_admin;
  const _noSeerr2     = this._overseerrConfigured === false;

  let actionBtn = '';
  if (_isAvail) {
    actionBtn = '';
  } else if (_isReq) {
    if (_isDownloading) {
      actionBtn = '';
    } else if (_isAdmin || _noSeerr2 || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
      actionBtn = '';
    } else {
      const withdrawBtn = _reqId
        ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`
        : '';
      actionBtn = withdrawBtn;
    }
  } else {
    actionBtn = `<button class="btn-add req-open" data-movieid="${m.id}" data-tmdb="${m.id}" data-reqkey="${reqKey}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" width="14" height="14" style="display:block"><path d="M12 5v14M5 12h14"/></svg></button>`;
  }
  // A caller's own action (Similar titles) goes above the request button, or
  // in its place where there is none to show.
  actionBtn = this._simStack(actionBtn, actionHtml);

  const pc = this._posterCfg();
  let badgeCls = '';
  let statusBadge = '';
  if (_isAvail) {
    badgeCls = 'b-st-avail';
    statusBadge = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
  } else if (_isReq) {
    if (_isDownloading) {
      badgeCls = 'b-dl';
      statusBadge = this._badge('b-dl', '↓', this._t('badgeDownloading'));
    } else if (_isAdmin || _noSeerr2 || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
      badgeCls = 'b-st-proc';
      statusBadge = this._badge('b-st-proc', '↓', this._t('badgeAdded'));
    } else {
      badgeCls = 'b-st-pend';
      statusBadge = this._badge('b-st-pend', '⏱', this._t('badgePending'));
    }
  }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusHtml = (statusBadge && showTag) ? this._statusBadge(statusBadge) : '';
  // The film may be downloading on the second instance, whose queue is keyed by
  // its own ids — asking with the primary entry's id (or none at all) returned
  // -1 and drew a full bar for a download barely a third of the way through.
  const _dlInst = inRadarr2Downloading && !inRadarrDownloading ? 'radarr2' : 'radarr';
  const _dlId = _dlInst === 'radarr2' ? radarr2Entry?.id : (radarrEntry?.id ?? radarr2Entry?.id);
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', this._dlPct(_dlId, 'movie', _dlInst)) : '';

  const overlay = this._requestPending?.reqKey === reqKey
    ? this._renderRequestOverlay(m.id, m.id)
    : '';

  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const posterPath = m.posterPath || m.poster_path || null;
  const img = this._mcImg(posterPath ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w342${posterPath}`) : null, '🎬', m.id);
  const effectiveTypeTag = typeTag || (showDate ? this._t('typeMovie') : '');
  const _mvLangs = this._arrLangCodes(radarrEntry, true);
  const ratingHtml = this._ratingLangBlock(m, { ..._mvLangs, showRating });
  return `
    <div class="mc" data-popup="${POPUP_TYPE.MOVIE}" data-tmdbid="${m.id}" data-title="${title}"${radarrEntry ? ` data-radarrid="${radarrEntry.id}"` : ''}${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ''}>
      ${this._goneBadge(m.id, null, true)}
      ${img}
      ${traktOverlays}
      ${(effectiveTypeTag && pc.mediaType) ? `<span class="media-type-tag"><span class="b-txt">${effectiveTypeTag}</span></span>` : ''}
      ${showDate ? `<div style="position:absolute;top:6px;right:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-end">
        ${dateStr ? `<span class="media-type-tag" style="position:static">${dateStr}</span>` : ''}
        ${statusHtml}
      </div>` : statusHtml}
      ${this._mcGrad(grad, `${ratingHtml}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${actionBtn ? 'padding-right:20px' : ''}">${title}</div>` : ''}${actionBtn ? `<div style="position:absolute;bottom:8px;right:10px">${actionBtn}</div>` : ''}`)}
      ${stripe}
      ${overlay}
    </div>`;
}

}

export const discoverCardsMixin = _DiscoverCardsMethods.prototype;
