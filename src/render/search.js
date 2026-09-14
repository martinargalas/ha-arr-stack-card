import { POPUP_TYPE } from '../constants.js';

// The main search: the field, the type switch, the result grid, music results. Split out of render/right.js.

class _SearchRenderMethods {

_renderSearch() {
  const hasQuery        = !!this._searchQuery;
  const headingColor    = this._cfgGet('styles', 'headingTextColor', '#fff') || '#fff';
  const iconDefaultColor = this._cfgGet('styles', 'searchBarIconColor', '') || '';
  const iconStyle    = hasQuery ? `color:${headingColor};` : iconDefaultColor ? `color:${iconDefaultColor};` : '';
  const inputStyle   = hasQuery ? `color:${headingColor};` : '';
  return `
    <div class="sec-card sec-search" style="position:relative">
      <div class="search-bar-wrap">
        <ha-icon icon="mdi:magnify" class="search-bar-icon" style="--mdc-icon-size:22px;${iconStyle}"></ha-icon>
        <input
          class="search-bar-input"
          type="text"
          placeholder="${this._t('searchPlaceholder')}"
          value="${this._escHtml(this._searchQuery)}"
          data-action="search-input"
          autocomplete="off"
          style="${inputStyle}"
        >
        ${this._searchTypeSeg()}
        <button class="search-bar-clear" data-action="search-clear" style="${iconStyle}${this._searchActive ? '' : 'display:none;'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        ${this._tmdbNoticeHtml()}
      </div>
      ${this._searchActive ? `<div class="col-hdr" style="margin:13px 0 5px">
        ${this._searchHdrIcon()}
        <span class="col-hdr-title">${this._t('searchResults')}</span>
        <div class="col-hdr-line"></div>
      </div>` : ''}
      <div class="search-results-wrap">${this._renderSearchResultsInner()}</div>
    </div>`;
}

_searchHdrIcon() {
  const t = this._searchType;
  if (t === 'movie') return this._appIcon('radarr', 24);
  if (t === 'tv')    return this._appIcon('sonarr', 24);
  if (t === 'music') return this._appIcon('lidarr', 24);
  return this._appIconRow(['radarr', 'sonarr', 'lidarr']);
}

// All, films, series, music — the library's type filter at the size the search
// bar can carry, and only while there is a search to narrow. Music appears
// where there is a Lidarr to answer for it; All is where it starts.
_searchTypeSeg() {
  if (!this._searchActive && !(this._searchQuery || '').trim()) return '';
  const _si = this._mtSegIcons;
  const opts = [
    { v: 'all',   label: this._t('tabAll'),     attr: 'data-search-type="all"' },
    { v: 'movie', label: this._t('tabMovies'),  icon: _si.movie, attr: 'data-search-type="movie"' },
    { v: 'tv',    label: this._t('tabTvShows'), icon: _si.tv,    attr: 'data-search-type="tv"' },
    ...(this._lidarrConfigured !== false
      ? [{ v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: 'data-search-type="music"' }]
      : []),
  ];
  return `<div class="search-type-seg">${this._mtSegmented('data-search-seg', opts, this._searchType, {
    width: 38, accent: '0,122,255',
    animatePrev: !!this._searchSegAnim, prev: this._searchSegPrev,
  })}</div>`;
}

// Only the results grid + inline TV overlay — kept in a stable wrapper so re-rendering
// it during typing never touches .search-bar-wrap (recreating the input closes the iOS keyboard).
_renderSearchResultsInner() {
  const inner = this._searchActive ? this._renderSearchResultsGrid() : '';
  const overlay = this._musAddPending
    ? this._renderMusicAddOverlay()
    : (this._tvRequestPending?.source === 'search' ? this._renderTvRequestOverlay() : '');
  if (!overlay) return inner;
  const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
  return `<div class="tv-req-anchor" style="--sr-cols:${cols}">${inner}${overlay}</div>`;
}

_renderSearchResultsGrid() {
  if (this._searchLoading && !this._searchResults.length) {
    return `<div class="placeholder">${this._t('loading')}</div>`;
  }
  if (!this._searchResults.length) {
    return `<div class="placeholder" style="font-size:12px;color:var(--secondary-text-color,#888)">No results</div>`;
  }
  const gradColor = 'rgba(0,0,0,0.88)';
  const textColor = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const cols  = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
  const sPage = cols * 2;
  const sp    = this._searchPage || 0;
  // Same poster settings the category rows honour — search results were built
  // before those existed and had their own hardcoded treatment.
  const pc    = this._posterCfg();
  const cards = this._searchResults.slice(sp * sPage, (sp + 1) * sPage).map(m => {
    if (m.mediaType === 'music') return this._renderSearchMusicCard(m);
    const isMovie = m.mediaType === 'movie';
    const title = this._escHtml(m.title || m.name || '');
    const tmdbId = m.id;
    const popupType = isMovie ? POPUP_TYPE.MOVIE : POPUP_TYPE.TV;
    const typeTag = isMovie ? this._t('typeMovie') : this._t('typeTv');
    const poster = m.posterPath ? (m.posterPath.startsWith('http') ? m.posterPath : `https://image.tmdb.org/t/p/w342${m.posterPath}`) : '';
    // Both instances count: a title living only in the second one is still
    // owned, and showing it as missing would offer a request for something the
    // user already has.
    const _findMovie = list => (Array.isArray(list) ? list.find(r => r.tmdbId === tmdbId) : null) || null;
    const _findShow  = list => (Array.isArray(list)
      ? (list.find(s => tmdbId && s.tmdbId === tmdbId) || list.find(s => m.tvdbId && s.tvdbId === m.tvdbId))
      : null) || null;
    const radarrEntry  = isMovie ? _findMovie(this._radarr) : null;
    const radarr2Entry = isMovie ? _findMovie(this._radarr2) : null;
    const sonarrEntry  = !isMovie ? _findShow(this._sonarr) : null;
    const sonarr2Entry = !isMovie ? _findShow(this._sonarr2) : null;
    // The one with files wins the flags and rating lookup, so a downloaded copy
    // is described rather than an empty placeholder in the other instance.
    const libEntry = isMovie
      ? ((radarrEntry?.hasFile && radarrEntry) || (radarr2Entry?.hasFile && radarr2Entry) || radarrEntry || radarr2Entry)
      : ((sonarrEntry?.statistics?.episodeFileCount > 0 && sonarrEntry)
        || (sonarr2Entry?.statistics?.episodeFileCount > 0 && sonarr2Entry) || sonarrEntry || sonarr2Entry);
    const mediaStatus = m.mediaInfo?.status;
    const _inOptimistic = this._optimisticRequested.has(tmdbId);
    const _withdrawn = this._withdrawnIds.has(tmdbId);
    const _hasPending = this._familyPendingIds.has(tmdbId);
    const inLib = isMovie ? !!(radarrEntry || radarr2Entry) : !!(sonarrEntry || sonarr2Entry);
    const hasFile = isMovie
      ? !!(radarrEntry?.hasFile || radarr2Entry?.hasFile)
      : !!(sonarrEntry?.statistics?.episodeFileCount > 0 || sonarr2Entry?.statistics?.episodeFileCount > 0);
    const _stale = mediaStatus >= 3 && !inLib && !_inOptimistic && !_hasPending;
    const _isAvail = (hasFile || mediaStatus === 5) && !_withdrawn && !_stale;
    const _isReq = (mediaStatus >= 2 || _inOptimistic || _hasPending || inLib) && !_withdrawn && !hasFile && !_stale;
    const _reqId = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(tmdbId);
    const searchReqKey = 'search-' + tmdbId;
    const _isAdmin  = this._hass.user.is_admin;
    const _noSeerr  = this._overseerrConfigured === false;
    let actionBtn = '';
    if (_isAvail) {
      actionBtn = '';
    } else if (_isReq) {
      if (_isAdmin || _noSeerr || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
        actionBtn = '';
      } else {
        const withdrawBtn = _reqId ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${tmdbId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>` : '';
        actionBtn = withdrawBtn;
      }
    } else if (isMovie) {
      actionBtn = `<button class="btn-add req-open" data-movieid="${tmdbId}" data-tmdb="${tmdbId}" data-reqkey="${searchReqKey}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg></button>`;
    } else {
      actionBtn = `<button class="btn-add tv-req-open" data-showid="${tmdbId}" data-title="${title}" data-source="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg></button>`;
    }
    let badgeCls = '';
    let badgeHtml = '';
    if (_isAvail) {
      badgeCls = 'b-st-avail';
      badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
    } else if (_isReq) {
      if (_isAdmin || _noSeerr || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
        badgeCls = 'b-st-proc';
        badgeHtml = this._badge('b-st-proc', '↓', this._t('badgeAdded'));
      } else {
        badgeCls = 'b-st-pend';
        badgeHtml = this._badge('b-st-pend', '⏱', this._t('badgePending'));
      }
    }
    const showTag    = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
    const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
    const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
    const stripe = (badgeCls && showStripe)
      ? this._statusStripe(this._statusStripeColor(badgeCls), false, radarrEntry ? this._dlPct(radarrEntry.id) : -1)
      : '';
    // Popup needs the id of whichever instance holds it, so opening the card
    // lands on the copy that exists rather than on nothing.
    const arrAttr = isMovie
      ? (radarrEntry ? ` data-radarrid="${radarrEntry.id}"` : (radarr2Entry ? ` data-radarr2id="${radarr2Entry.id}"` : ''))
      : '';
    const img = this._mcImg(poster || null, isMovie ? '🎬' : '📺', tmdbId);
    const reqOverlay = isMovie && this._requestPending?.reqKey === searchReqKey
      ? this._renderRequestOverlay(tmdbId, tmdbId)
      : '';
    const tvdbAttr = !isMovie && m.tvdbId ? ` data-tvdbid="${m.tvdbId}"` : '';
    // Flags come from the library entry when there is one — a title nobody owns
    // yet has no audio or subtitle tracks to report.
    const langs = this._arrLangCodes(libEntry, isMovie);
    const ratingHtml = this._ratingLangBlock(
      { ...m, ratings: libEntry?.ratings || m.ratings }, langs);
    return `
      <div class="mc" data-popup="${popupType}" data-tmdbid="${tmdbId}"${tvdbAttr} data-title="${title}"${arrAttr}>
        ${this._goneBadge(tmdbId, m.tvdbId, isMovie)}
        ${img}
        ${pc.mediaType ? `<span class="media-type-tag"><span class="b-txt">${typeTag}</span></span>` : ''}
        ${statusBadge}
        ${this._mcGrad(gradColor, `${ratingHtml}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${actionBtn ? 'padding-right:20px' : ''}">${title}</div>` : ''}${actionBtn ? `<div style="position:absolute;bottom:8px;right:10px">${actionBtn}</div>` : ''}`)}
        ${stripe}
        ${reqOverlay}
      </div>`;
  }).join('');
  // Paged by the chevrons beside the grid, the way every category row is. With
  // one page they stay as spacers so the grid keeps its place.
  const total = Math.ceil(this._searchResults.length / sPage);
  const chev = (dir, glyph, off) => total > 1
    ? `<button class="pg-btn" data-search-dir="${dir}"${off ? ' disabled' : ''}>${glyph}</button>`
    : `<button class="pg-btn pg-btn-ph" disabled>${glyph}</button>`;
  return `<div class="pg-wrap">
    ${chev('prev', '‹', sp === 0)}
    <div class="mgrid" style="grid-template-columns:repeat(${cols},1fr);row-gap:10px">${cards}</div>
    ${chev('next', '›', sp >= total - 1)}
  </div>`;
}

_renderSearchMusicCard(res) {
  const artist = res.artist || {};
  // The result was matched against the library when the search ran; an artist
  // added since is still marked unowned there, so the library is asked again.
  const mbid = String(artist.foreignArtistId || '').toLowerCase();
  const hit = res.id ? null : (mbid
    ? [...(this._lidarrArtists?.values() || [])]
        .find(a => String(a.foreignArtistId || '').toLowerCase() === mbid)
    : null);
  if (hit) res = { ...res, id: hit.id };
  const inLib  = !!res.id;
  const card = this._renderMusicCard(
    { id: res.id, artist: inLib ? (this._lidarrArtists?.get(res.id) || artist) : artist, newestAlbum: null, newAlbumCount: 0 },
    { noSub: true, noStatus: !inLib },
  );
  if (inLib) return card;
  const plus = `<div style="position:absolute;bottom:8px;right:10px;z-index:3">
    <button class="btn-add mus-add-open" data-mus-add="${this._escHtml(artist.foreignArtistId || '')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg></button>
  </div>`;
  return card
    .replace(/data-artist-id="[^"]*"/, `data-artist-unowned="${this._escHtml(artist.foreignArtistId || '')}"`)
    .replace(/<\/div>\s*$/, `${plus}</div>`);
}

// The overlay a series gets when it is requested: it takes the poster row, asks
// the two things Lidarr cannot guess, and adds. No album picker — Lidarr has no
// discography for an artist it does not hold yet, and MusicBrainz's own list is
// every bootleg and live tape a band ever had its name on.
_renderMusicAddOverlay() {
  const p = this._musAddPending;
  if (!p) return '';
  if (p.loading || !p.opts) {
    return `<div class="req-overlay tv-req-overlay mus-add-overlay"><span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span></div>`;
  }
  const o = p.opts;
  const qualityItems = (o.quality || []).map(q => [q.id, q.name]);
  const metaItems    = (o.metadata || []).map(m => [m.id, m.name]);
  const rootItems    = (o.rootFolders || []).map(f => [f.path, f.path]);
  const monitorItems = [
    ['future', this._t('musMonFuture')],
    ['latest', this._t('musMonLatest')],
    ['all',    this._t('musMonAll')],
    ['none',   this._t('musMonNone')],
  ];
  const art = this._lidarrArtistImage(p.artist, 'poster', { w: 200 });
  const poster = art
    ? `<img src="${art}" class="tv-req-poster">`
    : `<span class="tv-req-poster tv-req-poster-ph">${this._escHtml(this._musInitials(p.artist?.artistName))}</span>`;

  const rootHtml = rootItems.length > 1
    ? `<div class="mus-add-field"><span class="req-label">${this._t('musRootFolder')}</span>${this._mtFieldSelect('mus-add-root', rootItems, p.rootFolder, 'width:100%')}</div>`
    : '';
  const metaHtml = metaItems.length > 1
    ? `<div class="mus-add-field"><span class="req-label">${this._t('musMetadata')}</span>${this._mtFieldSelect('mus-add-meta', metaItems, p.metadataId, 'width:100%')}</div>`
    : '';

  return `
    <div class="req-overlay tv-req-overlay mus-add-overlay">
      <div class="tv-req-inner">
        <div class="tv-req-col-poster">${poster}</div>
        <div class="tv-req-row2">
          <div class="tv-req-controls">
            <div class="req-panel mus-add-panel">
              <div class="mus-add-field"><span class="req-label">${this._t('downloadQuality')}</span>${this._mtFieldSelect('mus-add-profile', qualityItems, p.profileId, 'width:100%')}</div>
              <div class="mus-add-field"><span class="req-label">${this._t('musMonitorWhat')}</span>${this._mtFieldSelect('mus-add-monitor', monitorItems, p.monitor, 'width:100%')}</div>
              ${metaHtml}
              ${rootHtml}
            </div>
            <div class="tv-req-actions-col">
              ${p.done ? `<span class="mus-add-done">${this._t('badgeAdded')}</span>` : ''}
              <div class="req-actions">
                <button class="req-cancel mus-add-cancel" title="${this._t('cancel')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <button class="req-confirm mus-add-confirm${p.done ? ' is-done' : ''}" title="${this._t('confirm')}">${p.busy
                  ? `<span class="action-spinner" style="width:13px;height:13px;border-width:2px"></span>`
                  : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

}

export const searchRenderMixin = _SearchRenderMethods.prototype;
