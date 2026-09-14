import { dayClass, ICONS } from '../shared/ui.js';
import { fmtBytes } from '../shared/format.js';

// Module scope, not a class field: applyMixin copies prototype members only.
const TMDB_NOTICE_KEY  = 'arr-stack-tmdb-notice';
const TMDB_NOTICE_SNOOZE = 3 * 24 * 60 * 60 * 1000;

class _RenderRight {
_renderRight() {
  // total slots per page = categoriesCount (default 3); search always takes 1st slot
  const perPage        = Math.max(2, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
  // The search bar can be switched off (a static or e-ink dashboard wants the
  // room); its slot then goes to one more category.
  const showSearch     = this._cfgGet('discover', 'showSearch', true) !== false;
  const regularPerPage = showSearch ? perPage - 1 : perPage; // regular cats per page (rest goes to search)
  const hasCalendar    = this._calendar && this._calendar.length > 0;
  const hasPending     = this._hass.user.is_admin && this._pendingRequests.length > 0;

  const DEFAULT_CATS = ['recentlyAdded','recentlyRequested','upcoming','tvUpcoming','trending','popular','recommendations','calendar','tautulli','jellystat','tracearr','activity','prowlarr','maintainerr','library'];
  const catConfig = this._config?.categories
    ? this._catConfigMigrated(this._config.categories)
    : DEFAULT_CATS.map(id => ({ id, enabled: true }));
  const states = this._hass?.states || {};
  const hasActiveStreams = (this._jellyfinSessions || []).length > 0
    || (this._embySessions || []).length > 0
    || (this._kodiSessions || []).length > 0
    || Object.keys(states).some(id => {
      if (!id.startsWith('media_player.plex_')) return false;
      const st = states[id].state;
      return st === 'playing' || st === 'paused';
    });

  const CAT_FN = {
    radarr:            () => this._renderRadarr(),
    sonarr:            () => this._renderSonarr(),
    recentlyAdded:     () => this._renderRecentlyAdded(),
    recentlyRequested: () => this._renderRecentlyRequested(),
    upcoming:   () => this._renderUpcoming(),
    tvUpcoming: () => this._renderTvUpcoming(),
    trending:   () => this._renderTrending(),
    popular:    () => this._renderPopular(),
    recommendations: (() => {
      const src = this._recSources;
      return (src.trakt || src.suggestarr || src.lastfm) ? () => this._renderRecommendations() : null;
    })(),
    calendar:   hasCalendar ? () => this._renderCalendar() : null,
    streams:    hasActiveStreams ? () => this._renderStreams() : null,
    tautulli:   (this._hass?.user?.is_admin && this._tautulliConfigured  !== false) ? () => this._renderTautulli()  : null,
    jellystat:  (this._hass?.user?.is_admin && this._jellystatConfigured  !== false) ? () => this._renderJellystat()  : null,
    tracearr:   (this._hass?.user?.is_admin && this._tracearrConfigured   !== false) ? () => this._renderTracearr()   : null,
    activity:   this._hass?.user?.is_admin ? () => this._renderActivity() : null,
    prowlarr:   (this._hass?.user?.is_admin && this._prowlarrConfigured !== false) ? () => this._renderProwlarr() : null,
    maintainerr:(this._hass?.user?.is_admin && this._maintainerrConfigured !== false) ? () => this._renderMaintainerr() : null,
    library:    (this._radarr?.length || this._sonarr?.length) ? () => this._renderLibrary() : null,
  };

  const regularCategories = [
    ...(hasPending ? [() => this._renderPendingRequests()] : []),
    ...catConfig
      .filter(c => c.enabled !== false)
      .map(c => CAT_FN[c.id])
      .filter(Boolean),
  ];

  // Search is on every page as the first slot; regular cats fill remaining slots
  const totalPages = Math.max(1, Math.ceil(regularCategories.length / regularPerPage));
  const page       = Math.max(0, Math.min(this._rightPage || 0, totalPages - 1));
  this._rightTotalPages = totalPages; // persist for wire first/last handlers
  const regStart   = page * regularPerPage;
  const regSlice   = regularCategories.slice(regStart, regStart + regularPerPage);
  const pageSlice  = showSearch ? [() => this._renderSearch(), ...regSlice] : regSlice;

  const _join = fns =>
    fns.map((fn, i) => `${i === 0 ? '' : (showSearch && i === 1) ? '<div style="height:3px"></div>' : '<div class="spacer-sm"></div>'}${fn()}`).join('');

  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;
  const navBar  = (hasPrev || hasNext) ? this._rpPag(page, totalPages, {
    firstAttr: 'data-section="right" data-dir="first"',
    prevAttr:  'data-section="right" data-dir="prev"',
    nextAttr:  'data-section="right" data-dir="next"',
    lastAttr:  'data-section="right" data-dir="last"',
    dotAttr: 'data-page', dotSecAttr: 'data-section="right" ',
  }) : '';

  // Pokud je otevřen sekce overlay, zobraz search bar + overlay + rp-nav
  if (this._overlay?.section) return `<div class="rp-sections">${showSearch ? `${this._renderSearch()}<div style="height:3px"></div>` : ''}${this._renderSectionOverlay(this._overlay.section)}</div>${this._renderSectionOverlayNav(this._overlay.section)}`;

  // While searching, the column is the search and nothing else. Its results
  // page by the chevrons beside the grid, like any category - the bottom pager
  // belongs to the categories, which are not on the page.
  if (this._searchActive && showSearch) return `<div class="rp-sections">${this._renderSearch()}</div>`;

  // Compensate for missing inter-category spacers on short pages (e.g. last page with 1 category).
  // Each missing regular category slot = 1 missing spacer-sm (8px) between sections.
  const filler = Array(Math.max(0, regularPerPage - regSlice.length))
    .fill('<div class="spacer-sm"></div>').join('');

  return `<div class="rp-sections">${_join(pageSlice)}${filler}</div>${navBar}`;
}

// One-off notice for installs with neither Seerr nor their own TMDB key: those
// lose posters, ratings, cast, trailers and the Trending/Popular rows on
// 2026-09-01. Admins only — nobody else can act on it — and snoozed for three
// days per dismissal so it reminds without nagging daily.
_tmdbNoticeSnoozed() {
  try {
    const until = parseInt(localStorage.getItem(TMDB_NOTICE_KEY) || '0', 10);
    return Date.now() < until;
  } catch (_) { return false; }
}

_tmdbNoticeHtml() {
  // No longer a warning about a coming change — the shared key is gone, so this
  // explains why a card without Seerr and without a key of its own is half empty.
  if (!this._hass?.user?.is_admin) return '';
  if (this._overseerrConfigured !== false || this._tmdbOwnKey !== false) return '';
  if (this._tmdbNoticeSnoozed()) return '';
  // Rides inside .search-bar-wrap, pushed right, and never grows: the input keeps
  // the remaining width and stays typable. Safe there because only a full
  // _renderRight rebuilds that node — _patchResultsWrap never touches it.
  return `
    <div class="tmdb-notice">
      <svg class="tmdb-notice-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
      <span class="tmdb-notice-txt">${this._t('tmdbNoticeShort')}</span>
      <button class="tmdb-notice-btn" data-tmdb-info>${this._t('tmdbNoticeMore')}</button>
      <button class="tmdb-notice-x" data-tmdb-notice-dismiss title="${this._t('tmdbNoticeDismiss')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>`;
}

_wireTmdbNotice(right) {
  // Delegated on col-right, which is created once and survives every re-render.
  // The strip itself is rebuilt by eight different paths and only two of them
  // run this wiring, so a listener bound to the node itself misses most of them.
  if (!right || right._tmdbWired) return;
  right._tmdbWired = true;
  right.addEventListener('click', e => {
    if (e.target.closest('[data-tmdb-notice-dismiss]')) {
      e.stopPropagation();
      try { localStorage.setItem(TMDB_NOTICE_KEY, String(Date.now() + TMDB_NOTICE_SNOOZE)); } catch (_) {}
      this._reRenderRight(true);
      return;
    }
    if (e.target.closest('[data-tmdb-info]')) {
      e.stopPropagation();
      this._tmdbInfoOpen = true;
      this._renderTmdbModalEl();
    }
  });
}

// Shown when a download-client row has no arr link. Clicking such a row used to
// do nothing at all, which reads as a broken card rather than a deliberate gap.
_renderDlInfoModal() {
  const name = this._dlInfoName || '';
  const p = n => `<p class="info-modal-p">${this._t('dlInfo' + n)}</p>`;
  return `
    <div class="popup-overlay info-modal-overlay${dayClass(this)}" data-dl-info-modal>
      <div class="popup-glass info-modal">
        <div class="info-modal-hdr">
          <span class="info-modal-title">${this._t('dlInfoTitle')}</span>
          <button class="popup-close" data-dl-info-close style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${ICONS.close}</button>
        </div>
        <div class="info-modal-body">
          ${name ? `<p class="info-modal-name">${this._escHtml(name)}</p>` : ''}
          ${p(1)}
        </div>
      </div>
    </div>`;
}

_renderTmdbModal() {
  const p = n => `<p class="info-modal-p">${this._t('tmdbInfo' + n)}</p>`;
  return `
    <div class="popup-overlay info-modal-overlay${dayClass(this)}" data-info-modal>
      <div class="popup-glass info-modal">
        <div class="info-modal-hdr">
          <span class="info-modal-title">${this._t('tmdbInfoTitle')}</span>
          <button class="popup-close" data-tmdb-info-close style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${ICONS.close}</button>
        </div>
        <div class="info-modal-body">
          ${[1, 2, 3, 4, 5].map(p).join('')}
          <a class="info-modal-link" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">${this._t('tmdbInfoLink')}</a>
        </div>
      </div>
    </div>`;
}

_ratingBadge(m, inline = false, solid = false) {
  const prov = this._ratingProvider;
  const ratings = m.ratings || {};
  // tmdbId first: for TMDB discover items .id already IS the tmdb id (tmdbId is absent there),
  // but for Radarr/Sonarr library entries .id is the arr instance's own internal id — using it
  // instead of the real .tmdbId misdirects rating lookups to the wrong (tiny) numeric id.
  const tmdbId = m.tmdbId ? String(m.tmdbId) : (m.tmdbId === undefined ? String(m.id || '') : '');
  const isMovie = m._mediaType !== 'tv' && m.mediaType !== 'tv';
  const cached = tmdbId ? this._posterRatingsCache.get(tmdbId) : undefined;
  let raw, display, icon, bdrClr, bgClr;

  switch (prov) {
    case 'tmdb': {
      raw = ratings.tmdb?.value ?? m.voteAverage;
      if (!raw && tmdbId) {
        const tmdbVote = this._posterTmdbVoteCache.get(this._tmdbVoteKey(tmdbId, isMovie));
        if (tmdbVote) { raw = tmdbVote; }
        else if (tmdbVote === undefined) { this._fetchPosterTmdbVote(tmdbId, isMovie); return ''; }
      }
      if (!raw) return '';
      display = (Math.round(raw * 10) / 10).toFixed(1);
      icon = `<svg width="30" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#0d253f"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="800" fill="#01b4e4">TMDB</text></svg>`;
      bdrClr = 'rgba(1,180,228,0.45)'; bgClr = 'rgba(1,180,228,0.22)';
      break;
    }
    case 'trakt':
      raw = ratings.trakt?.value;
      if (!raw) return '';
      display = (Math.round(raw * 10) / 10).toFixed(1);
      icon = `<svg width="24" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#1a1a1a"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="#e8191a">trakt</text></svg>`;
      bdrClr = 'rgba(232,25,26,0.45)'; bgClr = 'rgba(232,25,26,0.22)';
      break;
    case 'rottenTomatoes': {
      const rtVal = ratings.rottenTomatoes?.value ?? cached?.rt ?? null;
      if (rtVal == null) {
        if (cached === undefined && tmdbId) this._fetchPosterRating(tmdbId, isMovie);
        return '';
      }
      display = `${Math.round(rtVal)}%`;
      icon = `<svg width="10" height="10" viewBox="0 0 24 24" style="flex-shrink:0"><path fill="#FA320A" d="M12 7.5c-5 0-8.5 3-8.5 7.8 0 4.4 3.8 6.7 8.5 6.7s8.5-2.3 8.5-6.7c0-4.8-3.5-7.8-8.5-7.8z"/><path fill="#00912D" d="M11.8 7.6c.2-2 1.5-3.6 3.6-4.1-1 1.2-1.2 2.1-1.2 2.1s2-1.6 4.1-1c-1.5 1-2 2.3-2 2.3s1.7-.7 3.2-.2c-2 1.5-4.2 1.4-5.7 1.1-.5-.1-1.4-.2-2-.2z"/></svg>`;
      bdrClr = 'rgba(250,50,10,0.45)'; bgClr = 'rgba(250,50,10,0.22)';
      raw = rtVal;
      break;
    }
    case 'metacritic': {
      const mcVal = ratings.metacritic?.value ?? cached?.metacritic ?? null;
      if (mcVal == null) {
        if (cached === undefined && tmdbId) this._fetchPosterRating(tmdbId, isMovie);
        return '';
      }
      display = `${Math.round(mcVal)}`;
      icon = `<svg width="26" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#ffcc33"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="900" fill="#000">meta</text></svg>`;
      bdrClr = 'rgba(255,204,51,0.45)'; bgClr = 'rgba(255,204,51,0.22)';
      raw = mcVal;
      break;
    }
    default: {
      if (ratings.imdb?.value) {
        raw = ratings.imdb.value;
        display = (Math.round(raw * 10) / 10).toFixed(1);
        icon = `<svg width="24" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#F5C518"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#000">IMDb</text></svg>`;
        bdrClr = 'rgba(245,197,24,0.45)'; bgClr = 'rgba(245,197,24,0.22)';
        break;
      }
      // No IMDb score — and plenty of titles have none, Sonarr never carries one
      // and Radarr misses it on smaller films. TMDB stands in rather than the
      // poster going blank while the detail popup shows a rating perfectly well.
      let tmdbVal = ratings.tmdb?.value ?? m.voteAverage ?? null;
      if (!tmdbVal && tmdbId) {
        const cachedVote = this._posterTmdbVoteCache.get(this._tmdbVoteKey(tmdbId, isMovie));
        if (cachedVote) tmdbVal = cachedVote;
        else if (cachedVote === undefined) this._fetchPosterTmdbVote(tmdbId, isMovie);
      }
      if (tmdbVal) {
        display = (Math.round(tmdbVal * 10) / 10).toFixed(1);
        icon = `<svg width="30" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#0d253f"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="800" fill="#01b4e4">TMDB</text></svg>`;
        bdrClr = 'rgba(1,180,228,0.45)'; bgClr = 'rgba(1,180,228,0.22)';
        break;
      }
      // Last resort for a show: Sonarr's own TheTVDB score, while TMDB is still
      // being fetched or if it never answers.
      if (!isMovie && ratings.value) {
        display = (Math.round(ratings.value * 10) / 10).toFixed(1);
        icon = `<svg width="26" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#6cd591"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#003224">TVDB</text></svg>`;
        bdrClr = 'rgba(108,213,145,0.45)'; bgClr = 'rgba(108,213,145,0.22)';
        break;
      }
      return '';
    }
  }
  if (!display) return '';
  // Solid variant for the flag strip: the provider's own brand pairing, no
  // frame and no logo — the colour alone names the source. Keyed off the rgb
  // already baked into bgClr so each provider stays defined in one place above.
  // The border stays in the box model as transparent, so the badge keeps the
  // exact height of the outlined version.
  let sty = `border-color:${bdrClr};background:${bgClr}`;
  let iconHtml = icon;
  if (solid) {
    // Held at 0.85 rather than opaque so the flag underneath still reads through
    const A = 0.85;
    const SOLID = {
      '245,197,24':  [`rgba(245,197,24,${A})`,  '#000'],     // IMDb
      '1,180,228':   [`rgba(1,180,228,${A})`,   '#0d253f'],  // TMDB — teal ground, navy text
      '108,213,145': [`rgba(108,213,145,${A})`, '#003224'],  // TheTVDB
      '232,25,26':   [`rgba(232,25,26,${A})`,   '#fff'],     // Trakt
      '250,50,10':   [`rgba(250,50,10,${A})`,   '#fff'],     // Rotten Tomatoes
      '255,204,51':  [`rgba(255,204,51,${A})`,  '#000'],     // Metacritic
    };
    const rgb = /rgba?\(([^)]+)\)/.exec(bgClr);
    const nums = rgb ? rgb[1].split(',').slice(0, 3).map(n => String(parseFloat(n))).join(',') : '';
    let bg = null, fg = null;
    if (SOLID[nums]) {
      [bg, fg] = SOLID[nums];
    } else if (rgb) {
      const [r, g, b] = rgb[1].split(',').map(n => parseFloat(n));
      // Unknown provider: relative luminance picks the readable text colour
      bg = `rgba(${r},${g},${b},${A})`;
      fg = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000' : '#fff';
    }
    if (bg) {
      sty = `border-color:transparent;background:${bg};color:${fg};text-shadow:none`;
      iconHtml = '';
    }
  }
  const badge = `<span class="imdb" style="${sty};padding:2px ${solid ? '5px' : '3px'};gap:3px">${iconHtml}<span style="line-height:1;display:block;margin-top:-1px">${display}</span></span>`;
  return inline ? badge : `<div style="margin-bottom:3px">${badge}</div>`;
}

_pageIndicator(section, itemsOrCount, perPage = null) {
  const count = Array.isArray(itemsOrCount) ? itemsOrCount.length : (itemsOrCount || 0);
  // Must match what _pagedGrid slices by, or the indicator counts pages the grid
  // does not have — every caller passes the count only and relied on a hardcoded 4.
  const totalPages = Math.ceil(count / (perPage ?? this._perPage(section)));
  if (totalPages <= 1) return '';
  const page = Math.min(this._pages[section] || 0, totalPages - 1);
  return `<span class="sec-page-ind">${page + 1}<span class="sec-page-sep">/</span>${totalPages}</span>`;
}

_renderRightHeader() {
  return `
    <div class="col-hdr">
      <ha-icon icon="mdi:movie-outline" style="--mdc-icon-size:22px"></ha-icon>
      <span class="col-hdr-title">${this._t('overview')}</span>
      <div class="col-hdr-line"></div>
    </div>`;
}

_renderRootDiskChip(key, roots) {
  if (!roots || roots.length === 0) return '';

  const fmtGB = bytes => fmtBytes(bytes, { empty: '0 GB' });

  // Deduplicate by freeSpace rounded to 100 MB — tolerates small drift between API calls
  const DISK_ROUND = 100 * 1024 * 1024;
  const diskMap    = new Map();
  for (const r of roots) {
    const key = Math.round(r.freeSpace / DISK_ROUND);
    if (!diskMap.has(key)) diskMap.set(key, { freeSpace: r.freeSpace, paths: [] });
    diskMap.get(key).paths.push(r.path);
  }
  const uniqueDisks = [...diskMap.values()];

  const total    = uniqueDisks.length;
  const page     = Math.min(this._diskPage[key] || 0, total - 1);
  const disk     = uniqueDisks[page];

  const pathsHtml = disk.paths
    .map(p => `<div class="dc-root-path">${this._escHtml(p)}</div>`)
    .join('');

  const pagingHtml = total > 1 ? `
    <div class="dc-disk-paging">
      <button class="dc-disk-btn" data-diskkey="${key}" data-diskdir="prev" ${page === 0 ? 'disabled' : ''}>‹</button>
      <span class="dc-disk-dots">${page + 1} / ${total}</span>
      <button class="dc-disk-btn" data-diskkey="${key}" data-diskdir="next" ${page >= total - 1 ? 'disabled' : ''}>›</button>
    </div>` : '';

  return `
    <div class="disk-chip rf-disk-chip">
      <div class="rf-disk-inner">
        <div class="rf-disk-left">
          <div class="dc-label">${this._t('storage')}</div>
          <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(disk.freeSpace)} ${this._t('free')}</span></div>
          ${pagingHtml}
        </div>
        <div class="rf-disk-right">${pathsHtml}</div>
      </div>
    </div>`;
}

_renderRadarr() {
  const smpCount = this._smpPageCount(this._radarr, 'radarr');
  const grid = this._radarr.length === 0
    ? `<div class="placeholder">${this._t('noRadarr')}</div>`
    : this._pagedGridWithSmp(this._radarr, 'radarr', m => this._renderRadarrCard(m));
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon('radarr', 24)}
        <span class="col-hdr-title">${this._t('recentMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('radarr', smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.15);border:1px solid rgba(0,132,255,0.25)">${this._radarrTotal} ${this._t('movies')}</span>
        ${this._seeMoreBtn('radarr')}
      </div>
      ${grid}
    </div>`;
}

_renderSonarr() {
  const smpCount = this._smpPageCount(this._sonarr, 'sonarr');
  const grid = this._sonarr.length === 0
    ? `<div class="placeholder">${this._t('noSonarr')}</div>`
    : this._pagedGridWithSmp(this._sonarr, 'sonarr', s => this._renderSonarrCard(s));
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon('sonarr', 24)}
        <span class="col-hdr-title">${this._t('recentShows')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('sonarr', smpCount)}
        <span class="sec-badge" style="background:rgba(255,214,10,0.12);border:1px solid rgba(255,214,10,0.22)">${this._sonarrTotal} ${this._t('shows')}</span>
        ${this._seeMoreBtn('sonarr')}
      </div>
      ${grid}
    </div>`;
}

_renderRecentlyAdded() {
  const hasMusic = this._lidarrConfigured !== false;
  const items = this._raItems();
  const smpCount = this._smpPageCount(items, 'recentlyAdded');
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'recentlyAdded', m => this._renderRecentlyAddedCard(m));
  const noSeerr = this._overseerrConfigured === false;
  const headerIcon = noSeerr
    ? this._appIconRow(hasMusic ? ['radarr', 'sonarr', 'lidarr'] : ['radarr', 'sonarr'])
    : (hasMusic
        ? `<div style="display:inline-flex;gap:4px;flex-shrink:0;align-items:center">${this._appIcon(this._discoverIconKey(), 24)}${this._appIcon('lidarr', 24)}</div>`
        : this._appIcon(this._discoverIconKey(), 24));
  const raSeg = this._raFilterHtml();
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${noSeerr ? this._sectionOverlayHtml('radarr', 25, 75, 0.18) : this._sectionOverlayHtml(this._discoverIconKey())}
      <div class="col-hdr" style="margin-bottom:5px">
        ${headerIcon}
        <span class="col-hdr-title">${this._t('recentlyAdded')}</span>
        ${raSeg}
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('recentlyAdded', smpCount)}
        ${this._seeMoreBtn('recentlyAdded')}
      </div>
      ${grid}
    </div>`;
}

_renderRecentlyRequested() {
  const hasMusic = this._lidarrConfigured !== false;
  const items = this._rqItems();
  const smpCount = this._smpPageCount(items, 'recentlyRequested');
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'recentlyRequested', m => this._renderRecentlyRequestedCard(m));
  const noSeerrRq = this._overseerrConfigured === false;
  const headerIconRq = noSeerrRq
    ? this._appIconRow(['radarr', 'sonarr', 'lidarr'])
    : (hasMusic
        ? `<div style="display:inline-flex;gap:4px;flex-shrink:0;align-items:center">${this._appIcon(this._discoverIconKey(), 24)}${this._appIcon('lidarr', 24)}</div>`
        : this._appIcon(this._discoverIconKey(), 24));
  // The search bar's own type peanut, a size down, sitting right after the
  // title: All, the two the row always held, and music.
  const rqSeg = this._rqFilterHtml();
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${noSeerrRq ? this._sectionOverlayHtml('radarr', 25, 75, 0.18) : this._sectionOverlayHtml(this._discoverIconKey())}
      <div class="col-hdr" style="margin-bottom:5px">
        ${headerIconRq}
        <span class="col-hdr-title">${this._t('recentlyRequested')}</span>
        ${rqSeg}
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('recentlyRequested', smpCount)}
        ${this._seeMoreBtn('recentlyRequested')}
      </div>
      ${grid}
    </div>`;
}


// Anything that has since made it into Lidarr is no longer a suggestion — the
// list is held for hours on the server and the library moves under it.
_lastfmRowItems() {
  return (this._lastfm || []).filter(e => {
    const mb = String(e?.artist?.foreignArtistId || '').toLowerCase();
    const nm = String(e?.artist?.artistName || '').trim().toLowerCase();
    if (mb && this._musAdded?.has(mb)) return true;
    for (const a of (this._lidarrArtists?.values() || [])) {
      if (mb && String(a.foreignArtistId || '').toLowerCase() === mb) return false;
      if (nm && String(a.artistName || '').trim().toLowerCase() === nm) return false;
    }
    return true;
  });
}

// One suggestion. Nothing here is owned, so there is no status to show and the
// corner carries the plus instead — the same one a search result has.
_renderLastfmCard(entry) {
  const artist = entry?.artist || {};
  const mbid = String(artist.foreignArtistId || '');
  const added = this._musAdded?.has(mbid.toLowerCase());
  const card = this._renderMusicCard(
    { id: null, artist, newestAlbum: null, newAlbumCount: 0 },
    { noSub: true, noStatus: true },
  );
  const pc = this._posterCfg();
  const corner = added
    ? ((pc.statusDisplay === 'tags' || pc.statusDisplay === 'both')
        ? `${this._statusBadge(this._badge('b-st-proc', '↓', this._t('badgeAdded')))}`
        : '')
    : `<div style="position:absolute;bottom:8px;right:10px;z-index:3">
        <button class="btn-add mus-add-open" data-mus-add="${this._escHtml(mbid)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg></button>
      </div>`;
  const libHit = added
    ? [...(this._lidarrArtists?.values() || [])]
        .find(a => String(a.foreignArtistId || '').toLowerCase() === mbid.toLowerCase())
    : null;
  const dlPct = libHit ? this._lidarrQueueArtists?.get(libHit.id) : undefined;
  const stripe = (dlPct !== undefined && (pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both'))
    ? this._statusStripe(this._statusStripeColor('b-dl'), true, dlPct)
    : '';
  const _chars = t => t.toUpperCase().split('').join('<br>');
  const overlays =
    `<div class="trakt-seen-ol mus-like-ol" data-mus-mbid="${this._escHtml(mbid)}"><span>${_chars(this._t('musLike'))}</span></div>` +
    `<div class="trakt-ni-ol mus-skip-ol" data-mus-mbid="${this._escHtml(mbid)}"><span>${_chars(this._t('skip'))}</span></div>`;
  // Once the artist is in Lidarr the card opens the real modal — the preview is
  // built from the lookup record, which knows nothing of monitoring or of what
  // is on disk, and would keep reporting an added artist as unmonitored.
  return card
    .replace(/data-artist-id="[^"]*"/, libHit
      ? `data-artist-id="${libHit.id}"`
      : `data-artist-unowned="${this._escHtml(mbid)}"`)
    .replace(/<\/div>\s*$/, `${overlays}${corner}${stripe}</div>`);
}

_renderUpcoming() {
  const items = this._upcoming || [];
  const smpCount = this._smpPageCount(items, 'upcoming');
  let grid = '';
  if (this._upcomingError) {
    grid = `<div class="placeholder" style="color:rgba(255,80,80,0.9);font-size:11px">⚠ ${this._escHtml(this._upcomingError)}</div>`;
  } else if (items.length === 0) {
    grid = `<div class="placeholder">${this._t('loading')}</div>`;
  } else {
    grid = this._pagedGridWithSmp(items, 'upcoming', m => this._renderUpcomingCard(m, { reqKey: 'upcoming-' + m.id }));
  }
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${this._sectionOverlayHtml(this._discoverIconKey())}
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon(this._discoverIconKey(), 24)}
        <span class="col-hdr-title">${this._t('upcomingMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('upcoming', smpCount)}
        ${this._seeMoreBtn('upcoming')}
      </div>
      ${grid}
    </div>`;
}

_renderTvUpcoming() {
  const items = this._tvUpcoming || [];
  const smpCount = this._smpPageCount(items, 'tvUpcoming');
  const p = this._tvRequestPending?.source === 'tvUpcoming' ? this._tvRequestPending : null;
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'tvUpcoming', m => this._renderTvUpcomingCard(m));
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}position:relative;">
      ${this._sectionOverlayHtml(this._discoverIconKey())}
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon(this._discoverIconKey(), 24)}
        <span class="col-hdr-title">${this._t('newShows')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('tvUpcoming', smpCount)}
        ${this._seeMoreBtn('tvUpcoming')}
      </div>
      <div class="tv-req-anchor">${grid}${p ? this._renderTvRequestOverlay() : ''}</div>
    </div>`;
}

_renderTrending() {
  const items = this._trending || [];
  const smpCount = this._smpPageCount(items, 'trending');
  const p = this._tvRequestPending?.source === 'trending' ? this._tvRequestPending : null;
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'trending', m => this._renderTrendingCard(m));
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}position:relative;">
      ${this._sectionOverlayHtml(this._discoverIconKey())}
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon(this._discoverIconKey(), 24)}
        <span class="col-hdr-title">${this._t('trendingMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('trending', smpCount)}
        ${this._seeMoreBtn('trending')}
      </div>
      <div class="tv-req-anchor">${grid}${p ? this._renderTvRequestOverlay() : ''}</div>
    </div>`;
}

_renderRecommendations() {
  const src = this._recSources;
  const items = this._recItems();
  const smpCount = this._smpPageCount(items, 'recommendations');
  const p = ['trakt', 'suggestarr'].includes(this._tvRequestPending?.source) ? this._tvRequestPending : null;
  // SuggestArr running dry is a real state rather than a slow load: it only
  // parks items for the card in its approval mode, and a batch gets used up.
  const emptyMsg = this._suggestarrRefreshing
    ? this._t('saRefreshing')
    : ((src.trakt && this._trakt === null) || (src.suggestarr && this._suggestarr === null) || (src.lastfm && this._lastfm === null)
        ? this._t('loading')
        : this._t('saEmpty'));
  const gridInner = items.length === 0
    ? `<div class="placeholder">${emptyMsg}</div>`
    : this._pagedGridWithSmp(items, 'recommendations', (m, i) => this._renderRecCard(m, i));
  const grid = this._musAddPending?.source === 'lastfm'
    ? `<div class="tv-req-anchor">${gridInner}${this._renderMusicAddOverlay()}</div>`
    : `<div class="tv-req-anchor">${gridInner}${p ? this._renderTvRequestOverlay() : ''}</div>`;

  const icons = [src.trakt && 'trakt', src.suggestarr && 'suggestarr', src.lastfm && 'lastfm'].filter(Boolean);
  const recSeg = this._recFilterHtml();

  return `
    <div class="sec-card has-gradient" data-trakt-sec style="${this._sectionStyle()}">
      ${this._sectionOverlayHtml(icons[0] || 'trakt', 25, 75, 0.4)}
      <div class="col-hdr" style="margin-bottom:5px">
        ${icons.length > 1 ? this._appIconRow(icons) : this._appIcon(icons[0] || 'trakt', 24)}
        <span class="col-hdr-title">${this._t('catRecommendations')}</span>
        ${recSeg}
        <div class="col-hdr-line"></div>
        ${this._suggestarrRefreshing ? `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px;flex-shrink:0"></span>` : ''}
        ${this._pageIndicator('recommendations', smpCount)}
        ${this._seeMoreBtn('recommendations')}
      </div>
      ${grid}
    </div>`;
}

// One tile, drawn by whichever feed put it there, with that feed's own icon in
// the corner — three sets of controls in one row otherwise say little about
// where a suggestion came from.
_renderRecCard(m, i = null) {
  const card = m._recSrc === 'lastfm'
    ? this._renderLastfmCard(m)
    : m._recSrc === 'suggestarr'
      ? this._renderSuggestArrCard(m, i)
      : this._renderTraktCard(m, i);
  const icon = this._appIcon(m._recSrc || 'trakt', 16);
  return card.replace(/<\/div>\s*$/,
    `<div class="rec-src-badge" title="${m._recSrc || 'trakt'}">${icon}</div></div>`);
}

_renderPopular() {
  const items = this._popular || [];
  const smpCount = this._smpPageCount(items, 'popular');
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'popular', m => this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), reqKey: 'popular-' + m.id }));
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${this._sectionOverlayHtml(this._discoverIconKey())}
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon(this._discoverIconKey(), 24)}
        <span class="col-hdr-title">${this._t('popularMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('popular', smpCount)}
        ${this._seeMoreBtn('popular')}
      </div>
      ${grid}
    </div>`;
}

_renderCalendar() {
  const calSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const calSvgLg = `<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  let grid = '';
  if (!this._calCatItems().length) {
    grid = `<div class="placeholder">${this._t('noEpisodes')}</div>`;
  } else {
    const cols         = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
    const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
    const itemsBefore  = showMorePage * cols - 1;
    let items = this._calCatItems();
    if (items.length > itemsBefore) {
      const teasers = items.slice(-4);
      const cells = Array.from({ length: 4 }, (_, i) => {
        const ep = teasers[i];
        if (!ep) return `<div style="width:100%;height:100%;background:rgba(255,255,255,0.06)"></div>`;
        const isMovie = ep._mediaType === 'movie';
        const seriesRaw = ep.series || {};
        const _sid = seriesRaw.id || ep.seriesId;
        const series = isMovie
          ? ((this._radarr || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || (this._radarr2 || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || seriesRaw)
          : ((this._sonarrAll || this._sonarr || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || (this._sonarr2All || this._sonarr2 || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || seriesRaw);
        const url     = isMovie ? this._getRadarrPoster(series) : this._getSonarrPoster(series);
        return url
          ? `<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">`
          : `<div style="width:100%;height:100%;background:rgba(255,255,255,0.06)"></div>`;
      }).join('');
      const smpCard = `<div class="mc smp-card" data-action="open-cal-modal">
        <div class="smp-full">
          <div class="smp-posters">${cells}</div>
          <div class="smp-overlay">
            <div class="smp-btn">${calSvgLg}</div>
            <span class="smp-cta">${this._t('seeMore')}</span>
          </div>
        </div>
      </div>`;
      items = [...items.slice(0, itemsBefore), { _isCalSeeMore: true, _smpCard: smpCard }];
    }
    grid = this._pagedGrid(items, 'calendar', ep => {
      if (ep._isCalSeeMore) return ep._smpCard;
      return this._renderCalendarCard(ep);
    }, cols);
  }
  const hasLidarr = this._lidarrConfigured !== false;
  const _si = this._mtSegIcons;
  const calSeg = hasLidarr ? this._hdrFilter(`<div class="search-type-seg" style="margin:0 0 0 -6px">${this._mtSegmented('data-calcat-seg', [
    { v: 'all',   label: this._t('tabAll'),   attr: 'data-calcat-type="all"', w: 38 },
    { v: 'video', label: `${this._t('tabMovies')} / ${this._t('tabTvShows')}`,
      icon: `<span style="display:inline-flex;align-items:center;justify-content:center;gap:5px">${_si.movie}<span style="width:1px;height:12px;background:currentColor;opacity:0.35;flex-shrink:0"></span>${_si.tv}</span>`,
      attr: 'data-calcat-type="video"' },
    { v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: 'data-calcat-type="music"' },
  ], this._calCatTypeSaved, { accent: '0,122,255', animatePrev: !!this._calCatSegAnim, prev: this._calCatSegPrev })}</div>`, this._calCatTypeSaved !== 'all', 'cal') : '';

  const mask = `linear-gradient(to bottom,transparent 0.07%,black 6%,black 80%,transparent 100%)`;
  const dualOverlay = this._categoryOverlaysEnabled
    ? `<div style="position:absolute;inset:0;background:radial-gradient(circle at 25% 15%,${this._brandColor('radarr',0.23)} 0%,transparent 48%),radial-gradient(circle at 75% 15%,${this._brandColor('sonarr',0.23)} 0%,transparent 48%);mask-image:${mask};-webkit-mask-image:${mask};filter:blur(25px);pointer-events:none;z-index:0;"></div>`
    : '';
  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${dualOverlay}
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIconRow(hasLidarr ? ['radarr', 'sonarr', 'lidarr'] : ['radarr', 'sonarr'])}
        <span class="col-hdr-title">${this._t('catCalendar')}</span>
        ${calSeg}
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('calendar', this._smpPageCount(this._calCatItems(), 'calendar'))}
        <button class="smp-hdr-btn" data-action="open-cal-modal" title="Weekly calendar" style="width:28px;height:28px;margin:-2px 0;flex-shrink:0">${calSvg}</button>
      </div>
      ${grid}
    </div>`;
}

// ─────────────────────────────────────────────
// Shared pagination helper
// ─────────────────────────────────────────────

/**
 * Generates rp-nav HTML with first/prev/dots-or-counter/next/last buttons.
 * @param {number} page - current 0-based page
 * @param {number} totalPages
 * @param {object} opts
 *   firstAttr / prevAttr / nextAttr / lastAttr  — full HTML attribute strings for each button
 *   dotAttr       — attribute name for dot page index (e.g. 'data-page' or 'data-topage')
 *   dotSecAttr    — extra attribute prefix for dots (e.g. 'data-section="right" ')
 *   hasNext       — override for last/next disabled state (for API lazy-load)
 */
_rpPag(page, totalPages, { firstAttr, prevAttr, nextAttr, lastAttr, dotAttr, dotSecAttr = '', hasNext: hasNextOverride } = {}) {
  const DOT_LIMIT = 10; // dots if ≤10, counter if >10
  const first = page === 0;
  const last  = hasNextOverride !== undefined ? !hasNextOverride : (page >= totalPages - 1);

  let center;
  if (totalPages > 0 && totalPages <= DOT_LIMIT) {
    const dots = Array.from({ length: totalPages }, (_, i) =>
      `<button class="rp-dot${i === page ? ' rp-dot-active' : ''}" ${dotSecAttr}${dotAttr}="${i}"${i === page ? ' disabled' : ''}></button>`
    ).join('');
    center = `<div class="rp-dots">${dots}</div>`;
  } else {
    center = `<div class="rp-dots"><span class="rp-page-counter">${page + 1} / ${Math.max(totalPages, page + 1)}</span></div>`;
  }

  const Cll = `<ha-icon icon="mdi:chevron-double-left" style="--mdc-icon-size:20px"></ha-icon>`;
  const Cl  = `<ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:22px"></ha-icon>`;
  const Cr  = `<ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:22px"></ha-icon>`;
  const Crr = `<ha-icon icon="mdi:chevron-double-right" style="--mdc-icon-size:20px"></ha-icon>`;

  return `<div class="rp-nav">
    <button class="rp-btn rp-btn-icon" ${firstAttr}${first ? ' disabled' : ''}>${Cll}</button>
    <button class="rp-btn rp-btn-icon" ${prevAttr}${first ? ' disabled' : ''}>${Cl}</button>
    ${center}
    <button class="rp-btn rp-btn-icon" ${nextAttr}${last ? ' disabled' : ''}>${Cr}</button>
    <button class="rp-btn rp-btn-icon" ${lastAttr}${last ? ' disabled' : ''}>${Crr}</button>
  </div>`;
}

}

export const renderRightMixin = _RenderRight.prototype;
