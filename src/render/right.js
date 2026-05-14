class _RenderRight {
_renderRight() {
  const perPage     = Math.max(1, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
  const hasCalendar = this._calendar && this._calendar.length > 0;
  const hasPending  = this._hass.user.is_admin && this._pendingRequests.length > 0;

  const DEFAULT_CATS = ['radarr','sonarr','upcoming','tvUpcoming','trending','popular','calendar'];
  const catConfig = this._config?.categories || DEFAULT_CATS.map(id => ({ id, enabled: true }));
  const CAT_FN = {
    radarr:     () => this._renderRadarr(),
    sonarr:     () => this._renderSonarr(),
    upcoming:   () => this._renderUpcoming(),
    tvUpcoming: () => this._renderTvUpcoming(),
    trending:   () => this._renderTrending(),
    popular:    () => this._renderPopular(),
    calendar:   hasCalendar ? () => this._renderCalendar() : null,
  };

  const allCategories = [
    ...(hasPending ? [() => this._renderPendingRequests()] : []),
    ...catConfig
      .filter(c => c.enabled !== false)
      .map(c => CAT_FN[c.id])
      .filter(Boolean),
  ];

  const total      = allCategories.length;
  const totalPages = Math.ceil(total / perPage);
  const page       = Math.max(0, Math.min(this._rightPage || 0, totalPages - 1));
  const start      = page * perPage;
  const slice      = allCategories.slice(start, start + perPage);

  const _join = fns =>
    fns.map((fn, i) => `${i > 0 ? '<div class="spacer-sm"></div>' : ''}${fn()}`).join('');

  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;
  const dots = totalPages > 1
    ? Array.from({ length: totalPages }, (_, i) =>
        `<button class="rp-dot${i === page ? ' rp-dot-active' : ''}" data-section="right" data-page="${i}"></button>`
      ).join('')
    : '';

  const navBar  = (hasPrev || hasNext) ? `
    <div class="rp-nav">
      <button class="rp-btn ${hasPrev ? '' : 'rp-btn-hidden'}" data-section="right" data-dir="prev" ${hasPrev ? '' : 'disabled'}>
        <ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:16px"></ha-icon> ${this._t('prev')}
      </button>
      <div class="rp-dots">${dots}</div>
      <button class="rp-btn ${hasNext ? '' : 'rp-btn-hidden'}" data-section="right" data-dir="next" ${hasNext ? '' : 'disabled'}>
        ${this._t('next')} <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:16px"></ha-icon>
      </button>
    </div>` : '';

  // Pokud je otevřen sekce overlay, nahraď obsah col-right overlayem + rp-nav
  if (this._overlay?.section) return this._renderSectionOverlay(this._overlay.section) + this._renderSectionOverlayNav(this._overlay.section);

  return `<div class="rp-sections">${_join(slice)}</div>${navBar}`;
}

_pageIndicator(section, itemsOrCount, perPage = 4) {
  const count = Array.isArray(itemsOrCount) ? itemsOrCount.length : (itemsOrCount || 0);
  const totalPages = Math.ceil(count / perPage);
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

_renderRadarr() {
  const smpCount = this._smpPageCount(this._radarr, 'radarr');
  const grid = this._radarr.length === 0
    ? `<div class="placeholder">${this._t('noRadarr')}</div>`
    : this._pagedGridWithSmp(this._radarr, 'radarr', m => this._renderRadarrCard(m));
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:filmstrip" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('recentMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('radarr', smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.15);border:1px solid rgba(0,132,255,0.25)">${this._radarrTotal} ${this._t('movies')}</span>
      </div>
      ${grid}
    </div>`;
}

// Map full language name → ISO 639-1 code
_langCode(name) {
  const MAP = {
    Czech:'CS', English:'EN', German:'DE', French:'FR', Spanish:'ES',
    Italian:'IT', Polish:'PL', Slovak:'SK', Russian:'RU', Japanese:'JA',
    Korean:'KO', Chinese:'ZH', Portuguese:'PT', Dutch:'NL', Swedish:'SV',
    Norwegian:'NO', Danish:'DA', Finnish:'FI', Hungarian:'HU', Romanian:'RO',
    Ukrainian:'UK', Turkish:'TR', Arabic:'AR', Hindi:'HI', Croatian:'HR',
    Serbian:'SR', Bulgarian:'BG', Greek:'EL', Hebrew:'HE', Thai:'TH',
  };
  return MAP[name] || name.substring(0, 2).toUpperCase();
}

// Max 2 languages, CS first then EN then others
_topLangs(langs) {
  const unique = [...new Set(langs.filter(Boolean))];
  if (unique.length <= 2) return unique;
  const priority = ['CS', 'EN'];
  const ordered = [
    ...priority.filter(l => unique.includes(l)),
    ...unique.filter(l => !priority.includes(l)),
  ];
  return ordered.slice(0, 2);
}

_renderRadarrCard(m) {
  const poster = this._getRadarrPoster(m);
  const title = this._escHtml(m.title || 'Unknown');
  const year = m.year || '';
  const qualityName = m.movieFile?.quality?.quality?.name || '';
  const hasFile = m.hasFile;
  const cutoffNotMet = m.movieFile?.qualityCutoffNotMet;
  const dlFailed = this._radarrQueueFailed.has(m.id);
  const dlActive = this._radarrQueueActive.has(m.id);

  let badge = '';
  if (hasFile && cutoffNotMet) {
    badge = `<span class="badge b-cutoff">⚡<span class="b-txt"> Upgrade</span></span>`;
  } else if (hasFile) {
    badge = `<span class="badge b-ok">✓</span>`;
  } else if (dlFailed) {
    badge = `<span class="badge b-missing">✗<span class="b-txt"> Selhalo</span></span>`;
  } else if (dlActive) {
    badge = `<span class="badge b-dl">↓<span class="b-txt"> ${this._t('badgeDownloading')}</span></span>`;
  } else {
    badge = `<span class="badge b-missing">✗<span class="b-txt"> ${this._t('badgeMissing')}</span></span>`;
  }

  const sub = [year, qualityName].filter(Boolean).join(' · ');

  // Audio language badge
  let audioBadge = '';
  if (hasFile) {
    let audioLangs = [];
    if (Array.isArray(m.movieFile?.languages) && m.movieFile.languages.length > 0) {
      audioLangs = m.movieFile.languages
        .map(l => this._langCode(l.name || ''))
        .filter(Boolean);
    } else if (m.movieFile?.mediaInfo?.audioLanguages) {
      audioLangs = m.movieFile.mediaInfo.audioLanguages
        .split(/\s*[\/,]\s*/)
        .map(l => this._langCode(l.trim()))
        .filter(Boolean);
    }
    if (audioLangs.length > 0) {
      const codes = this._topLangs(audioLangs).join('|');
      audioBadge = `<span class="badge b-audio" title="Audio: ${codes}"><ha-icon icon="mdi:volume-high" style="--mdc-icon-size:9px"></ha-icon> ${codes}</span>`;
    }
  }

  // Bazarr subtitle badge (only when Bazarr is configured)
  let subBadge = '';
  const bz = this._bazarrConfigured ? this._bazarr[m.id] : null;
  if (bz) {
    if (bz.missing.length > 0) {
      const langs = this._topLangs(bz.missing.map(s => (s.code2 || s.name || '?').toUpperCase())).join('|');
      subBadge = `<span class="badge b-sub-miss" title="${this._t('missingSubs')}: ${langs}"><ha-icon icon="mdi:subtitles-outline" style="--mdc-icon-size:9px"></ha-icon> ${langs}</span>`;
    } else if (bz.subtitles.length > 0) {
      const langs = this._topLangs(bz.subtitles.map(s => (s.code2 || s.name || '?').toUpperCase())).join('|');
      subBadge = `<span class="badge b-sub-ok" title="${this._t('subtitles')}: ${langs}"><ha-icon icon="mdi:subtitles" style="--mdc-icon-size:9px"></ha-icon> ${langs}</span>`;
    }
  }

  return `
    <div class="mc" data-popup="radarr" data-tmdbid="${m.tmdbId}" data-title="${title}">
      ${poster
        ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" /></div>`
        : `<div class="mc-cover-lg ${this._grad(m.id)}">🎬</div>`
      }
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-sub">${this._escHtml(sub)}</div>
        <div class="mc-badges">${badge}${subBadge}${audioBadge}</div>
      </div>
    </div>`;
}

_getRadarrPoster(m) {
  if (!m.images) return null;
  const img = m.images.find(i => i.coverType === 'poster');
  return img ? img.remoteUrl : null;
}

_renderRequestOverlay(movieId, tmdbId) {
  const defProfileId = Number(this._seerrRadarr?.profileId ?? 0);
  const profiles = this._radarrProfiles;
const profileOptions = profiles.length > 0
    ? profiles.map(p =>
        `<option value="${p.id}" ${Number(p.id) === defProfileId ? 'selected' : ''}>${this._escHtml(p.name)}</option>`
      ).join('')
    : `<option value="${defProfileId}">${this._t('defaultProfile')}</option>`;

  return `
    <div class="req-overlay">
      <div class="req-inner">
        <span class="req-label">${this._t('downloadQuality')}</span>
        <select class="req-select" id="req-select-${movieId}">
          ${profileOptions}
        </select>
        <div class="req-actions">
          <button class="req-cancel" data-req="cancel">${this._t('cancel')}</button>
          <button class="req-confirm" data-req="confirm" data-movieid="${movieId}" data-tmdb="${tmdbId}">
            <ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${this._t('confirm')}
          </button>
        </div>
      </div>
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
        <ha-icon icon="mdi:television-play" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('recentShows')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('sonarr', smpCount)}
        <span class="sec-badge" style="background:rgba(255,214,10,0.12);border:1px solid rgba(255,214,10,0.22)">${this._sonarrTotal} ${this._t('shows')}</span>
      </div>
      ${grid}
    </div>`;
}

_renderSonarrCard(s) {
  const poster = this._getSonarrPoster(s);
  const title = this._escHtml(s.title || 'Unknown');
  const stats = s.statistics || {};
  const fileCount = stats.episodeFileCount || 0;
  const totalCount = stats.totalEpisodeCount || 0;
  const seasonCount = stats.seasonCount || 0;

  let badge = '';
  if (fileCount === 0 && totalCount > 0) {
    badge = `<span class="badge b-missing">✗<span class="b-txt"> ${this._t('badgeMissing')}</span></span>`;
  } else if (fileCount < totalCount) {
    badge = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
  } else if (totalCount > 0) {
    badge = `<span class="badge b-ok">✓</span>`;
  }

  const epBadge = totalCount > 0
    ? `<span class="badge b-ep">${totalCount} ep</span>`
    : '';

  return `
    <div class="mc" data-popup="sonarr" data-tvdbid="${s.tvdbId}" data-tmdbid="${s.tmdbId || ''}" data-title="${title}">
      ${poster
        ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" /></div>`
        : `<div class="mc-cover-lg ${this._grad(s.id)}">📺</div>`
      }
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-sub">${seasonCount} ${this._t('seasons')} · ${totalCount} ${this._t('episodes')}</div>
        <div class="mc-badges">${epBadge}${badge}</div>
      </div>
    </div>`;
}

_getSonarrPoster(s) {
  if (!s.images) return null;
  const img = s.images.find(i => i.coverType === 'poster');
  return img ? img.remoteUrl : null;
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
    grid = this._pagedGridWithSmp(items, 'upcoming', m => this._renderUpcomingCard(m));
  }
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:ticket-outline" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('upcomingMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('upcoming', smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
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
    <div class="sec-card" style="position:relative">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:television-play" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('newShows')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('tvUpcoming', smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
      ${p ? this._renderTvRequestOverlay() : ''}
    </div>`;
}

_renderTvUpcomingCard(m, { showRating = false, typeTag = '', overlayIndex = null } = {}) {
  const title = this._escHtml(m.name || m.originalName || 'Unknown');
  const rating = m.voteAverage ? m.voteAverage.toFixed(1) : '?';
  const mediaStatus = m.mediaInfo?.status;

  // inSonarr      = seriál je v Sonarru (přidán, nemusí mít epizody)
  // inSonarrAvail = seriál je v Sonarru A má alespoň jeden soubor epizody
  const sonarrEntry   = Array.isArray(this._sonarr) && this._sonarr.find(s => s.tmdbId === m.id);
  const inSonarr      = !!sonarrEntry;
  const inSonarrAvail = !!(sonarrEntry && (sonarrEntry.statistics?.episodeFileCount > 0));
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

  let actionBtn = '';
  if (_isAvail) {
    actionBtn = `<span class="badge b-st-avail" style="margin-left:auto">✓<span class="b-txt"> ${this._t('badgeAvailable')}</span></span>`;
  } else if (_isReq) {
    if (_isAdmin || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
      actionBtn = `<span class="badge b-st-proc" style="margin-left:auto">↓<span class="b-txt"> ${this._t('badgeAdded')}</span></span>`;
    } else {
      const withdrawBtn = _reqId
        ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}">✕</button>`
        : '';
      actionBtn = `<span class="mc-act-right"><span class="badge b-st-pend">⏱<span class="b-txt"> ${this._t('badgePending')}</span></span>${withdrawBtn}</span>`;
    }
  } else {
    actionBtn = `<button class="btn-add tv-req-open" data-showid="${m.id}" data-title="${title}">${this._t('add')}</button>`;
  }

  const tagHtml = typeTag ? `<span class="media-type-tag">${typeTag}</span>` : '';
  let coverHtml = '';
  if (m.posterPath) {
    const posterUrl = `https://image.tmdb.org/t/p/w342${m.posterPath}`;
    coverHtml = `<div class="mc-cover-lg" style="background:none;padding:0;position:relative">${tagHtml}<img src="${posterUrl}" style="width:100%;height:92px;object-fit:cover" loading="lazy" onerror="this.parentElement.innerHTML='📺'" /></div>`;
  } else {
    coverHtml = `<div class="mc-cover-lg ${this._grad(m.id)}" style="position:relative">${tagHtml}📺</div>`;
  }

  return `
    <div class="mc" data-popup="tv" data-tmdbid="${m.id}" data-title="${title}"${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ''}>
      ${coverHtml}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-act">
          ${showRating ? `<span class="imdb">⭐ ${rating}</span>` : ''}
          ${actionBtn}
        </div>
      </div>
    </div>`;
}

_renderTvRequestOverlay() {
  const p = this._tvRequestPending;
  if (!p) return '';

  // Loading stav — čekáme na fetch sezón
  if (p.loading || !p.seasons) {
    return `
      <div class="req-overlay tv-req-overlay">
        <span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span>
      </div>`;
  }

  const defProfileId = Number(p.profileId ?? 0);
  const profileOptions = this._sonarrProfiles.length > 0
    ? this._sonarrProfiles.map(pr =>
        `<option value="${pr.id}" ${Number(pr.id) === defProfileId ? 'selected' : ''}>${this._escHtml(pr.name)}</option>`
      ).join('')
    : `<option value="${defProfileId}">${this._t('defaultProfile')}</option>`;

  // Sezóny po stránkách po 4
  const seasons = p.seasons;
  const pages = [];
  for (let i = 0; i < seasons.length; i += 4) pages.push(seasons.slice(i, i + 4));
  const multiPage = pages.length > 1;

  const pagesHtml = pages.map(page => `
    <div class="sv-page">
      ${page.map(sn => `
        <label class="sv-wrap">
          <input type="checkbox" class="sv-input" data-season="${sn}" ${p.selected.has(sn) ? 'checked' : ''}>
          <span class="sv-track"><span class="sv-thumb"></span></span>
          <span class="sv-lbl">S${sn}</span>
        </label>`).join('')}
    </div>`).join('');

  const dotsHtml = multiPage
    ? `<div class="sv-dots">${pages.map((_, i) =>
        `<span class="sv-dot${i === 0 ? ' sv-dot-active' : ''}" data-pg="${i}"></span>`
      ).join('')}</div>`
    : '';

  const poster = p.show.posterPath
    ? `<img src="https://image.tmdb.org/t/p/w92${p.show.posterPath}" class="tv-req-poster">`
    : `<span class="tv-req-poster tv-req-poster-ph">📺</span>`;

  return `
    <div class="req-overlay tv-req-overlay">
      <div class="tv-req-inner">
        <div class="tv-req-top">
          ${poster}
          <div class="tv-req-info">
            <div class="tv-req-title">${this._escHtml(p.show.name || p.show.originalName || '')}</div>
            <select class="req-select" id="tv-req-profile">${profileOptions}</select>
          </div>
        </div>
        <div class="sv-nav-wrap">
          ${multiPage ? `<button class="sv-chev sv-prev" disabled><ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
          <div class="sv-scroll" id="sv-scroll">${pagesHtml}</div>
          ${multiPage ? `<button class="sv-chev sv-next"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
        </div>
        ${dotsHtml}
        <div class="req-actions">
          <button class="req-cancel tv-req-cancel">${this._t('cancel')}</button>
          <button class="tv-req-confirm req-confirm" data-mediaid="${p.mediaId}">
            <ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${this._t('confirm')}
          </button>
        </div>
      </div>
    </div>`;
}

_renderTrendingCard(m, overlayIndex = null) {
  if (m.mediaType === 'tv') {
    return this._renderTvUpcomingCard(m, { showRating: true, typeTag: this._t('typeTv'), overlayIndex });
  }
  return this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), overlayIndex });
}

_renderTrending() {
  const items = this._trending || [];
  const smpCount = this._smpPageCount(items, 'trending');
  const p = this._tvRequestPending?.source === 'trending' ? this._tvRequestPending : null;
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'trending', m => this._renderTrendingCard(m));
  return `
    <div class="sec-card" style="position:relative">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:trending-up" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('trendingMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('trending', smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
      ${p ? this._renderTvRequestOverlay() : ''}
    </div>`;
}

// Returns item count for _pageIndicator, accounting for SMP card insertion
_smpPageCount(items, section) {
  if (!items || items.length === 0) return 0;
  const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
  const itemsBefore  = showMorePage * 4 - 1;
  return items.length > itemsBefore ? itemsBefore + 1 : items.length;
}

_renderSeeMoreCardFor(section) {
  const cfg = this._getSectionOverlayConfig(section);
  const items = (cfg ? this[cfg.dataKey] : []) || [];
  const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
  const itemsBefore  = showMorePage * 4 - 1;
  const teasers = items.slice(-4);
  const cells = [];
  for (let i = 0; i < 4; i++) {
    const m = teasers[i];
    if (m && cfg) {
      const url = cfg.getPosterUrl(m);
      if (url) {
        cells.push(`<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">`);
      } else {
        cells.push(`<div class="${this._grad(m.id)}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px">${cfg.emoji(m)}</div>`);
      }
    } else {
      cells.push(`<div style="width:100%;height:100%;background:rgba(255,255,255,0.06)"></div>`);
    }
  }
  const remainCount = Math.max(0, items.length - itemsBefore);
  return `
    <div class="mc smp-card" data-action="overlay-open" data-sec="${section}">
      <!-- hidden spacer — dá kartě stejnou výšku jako ostatní mc karty -->
      <div class="mc-cover-lg" style="padding:0;visibility:hidden" aria-hidden="true"></div>
      <div class="mc-info" style="visibility:hidden" aria-hidden="true">
        <div class="mc-title">X</div>
        <div class="mc-act"><span class="badge">X</span></div>
      </div>
      <!-- 2×2 grid pokrývá celou kartu -->
      <div class="smp-full">
        <div class="smp-posters">${cells.join('')}</div>
        <div class="smp-overlay">
          <div class="smp-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </div>
          <span class="smp-cta">${this._t('seeMore')}</span>
          <span class="smp-count">+${remainCount}</span>
        </div>
      </div>
    </div>`;
}

_renderSectionOverlay(section) {
  const cfg = this._getSectionOverlayConfig(section);
  if (!cfg) return '';
  const items   = this[cfg.dataKey] || [];
  const isMobile = window.matchMedia('(max-width: 480px)').matches;
  const rows    = Math.max(1, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
  const perPage = isMobile ? rows * 2 : rows * 4;
  const page    = this._overlay.page || 0;
  const pageItems = items.slice(page * perPage, (page + 1) * perPage);
  const gridHtml  = pageItems.map((m, i) => cfg.renderCard(m, i)).join('');

  return `
    <div class="trending-overlay">
      <div class="col-hdr" style="margin-bottom:8px">
        <ha-icon icon="${cfg.icon}" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t(cfg.titleKey)}</span>
        <div class="col-hdr-line"></div>
        <button class="to-close" data-action="overlay-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M11 6l-6 6 6 6"/>
          </svg>
        </button>
      </div>
      <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">‹</button>
        <div class="to-grid">${gridHtml}</div>
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">›</button>
      </div>
    </div>`;
}

// Paging nav pro sekce overlay — stejná struktura jako standardní rp-nav
_renderSectionOverlayNav(section) {
  const cfg = this._getSectionOverlayConfig(section);
  if (!cfg) return '';
  const items    = this[cfg.dataKey] || [];
  const isMobile = window.matchMedia('(max-width: 480px)').matches;
  const rows     = Math.max(1, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
  const perPage  = isMobile ? rows * 2 : rows * 4;
  const page     = this._overlay.page || 0;
  const totalPages = Math.ceil(items.length / perPage);
  const hasPrev  = page > 0;
  const apiPage  = this._overlayApiPage[section] || 0;
  const apiTotal = this._overlayApiTotalPages[section] || 1;
  const hasNext  = page < totalPages - 1 || (cfg.apiEndpoint && apiPage < apiTotal);

  if (!hasPrev && !hasNext) return '';

  const dots = totalPages > 1
    ? Array.from({ length: totalPages }, (_, i) =>
        `<button class="rp-dot${i === page ? ' rp-dot-active' : ''}" data-topage="${i}"></button>`
      ).join('')
    : '';

  return `
    <div class="rp-nav">
      <button class="rp-btn ${hasPrev ? '' : 'rp-btn-hidden'}" data-action="overlay-prev" ${hasPrev ? '' : 'disabled'}>
        <ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:16px"></ha-icon> ${this._t('prev')}
      </button>
      <div class="rp-dots">${dots}</div>
      <button class="rp-btn ${hasNext ? '' : 'rp-btn-hidden'}" data-action="overlay-next" ${hasNext ? '' : 'disabled'}>
        ${this._t('next')} <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:16px"></ha-icon>
      </button>
    </div>`;
}

_renderTvOverlayCompact(p) {
  // Loading stav
  if (!p || p.loading || !p.seasons) {
    return `<div style="display:flex;align-items:center;justify-content:center;padding:20px">
      <span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span>
    </div>`;
  }

  const defProfileId = Number(p.profileId ?? 0);
  const profileOptions = this._sonarrProfiles.length > 0
    ? this._sonarrProfiles.map(pr =>
        `<option value="${pr.id}" ${Number(pr.id) === defProfileId ? 'selected' : ''}>${this._escHtml(pr.name)}</option>`
      ).join('')
    : `<option value="${defProfileId}">${this._t('defaultProfile')}</option>`;

  // Sezóny po stránkách po 4 (stejně jako v _renderTvRequestOverlay)
  const seasons = p.seasons;
  const pages = [];
  for (let i = 0; i < seasons.length; i += 4) pages.push(seasons.slice(i, i + 4));
  const multiPage = pages.length > 1;

  const pagesHtml = pages.map(page => `
    <div class="sv-page">
      ${page.map(sn => `
        <label class="sv-wrap">
          <input type="checkbox" class="sv-input" data-season="${sn}" ${p.selected.has(sn) ? 'checked' : ''}>
          <span class="sv-track"><span class="sv-thumb"></span></span>
          <span class="sv-lbl">S${sn}</span>
        </label>`).join('')}
    </div>`).join('');

  const dotsHtml = multiPage
    ? `<div class="sv-dots">${pages.map((_, i) =>
        `<span class="sv-dot${i === 0 ? ' sv-dot-active' : ''}" data-pg="${i}"></span>`
      ).join('')}</div>`
    : '';

  const poster = p.show.posterPath
    ? `<img src="https://image.tmdb.org/t/p/w92${p.show.posterPath}" class="tv-req-poster">`
    : `<span class="tv-req-poster tv-req-poster-ph">📺</span>`;

  return `
    <div class="tv-req-inner">
      <div class="tv-req-top">
        ${poster}
        <div class="tv-req-info">
          <div class="tv-req-title">${this._escHtml(p.show.name || p.show.originalName || '')}</div>
          <select class="req-select" id="tv-req-profile-abs">${profileOptions}</select>
        </div>
      </div>
      <div class="sv-nav-wrap">
        ${multiPage ? `<button class="sv-chev sv-prev-abs" disabled><ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
        <div class="sv-scroll" id="sv-scroll-abs">${pagesHtml}</div>
        ${multiPage ? `<button class="sv-chev sv-next-abs"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
      </div>
      ${dotsHtml}
      <div class="req-actions">
        <button class="req-cancel to-tv-cancel-abs">${this._t('cancel')}</button>
        <button class="to-tv-confirm-abs req-confirm" data-mediaid="${p.mediaId}">
          <ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${this._t('confirm')}
        </button>
      </div>
    </div>`;
}

_renderPopular() {
  const items = this._popular || [];
  const smpCount = this._smpPageCount(items, 'popular');
  const grid = items.length === 0
    ? `<div class="placeholder">${this._t('loading')}</div>`
    : this._pagedGridWithSmp(items, 'popular', m => this._renderUpcomingCard(m, { showDate: false }));
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:fire" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('popularMovies')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('popular', smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
    </div>`;
}

_renderUpcomingCard(m, { showDate = true, showRating = !showDate, typeTag = '', overlayIndex = null } = {}) {
  const title = this._escHtml(m.title || 'Unknown');
  const rating = m.voteAverage ? m.voteAverage.toFixed(1) : '?';
  const dateStr = this.fmtDate(m.releaseDate);

  // Check Radarr library (direct match by TMDB ID)
  // inRadarr          = film je v Radarru (přidán, ale nemusí být stažen)
  // inRadarrAvail     = film je v Radarru A má soubor (stažen/dostupný)
  // inRadarrDownloading = film je v Radarru, nemá soubor, ale aktivně se stahuje
  const radarrEntry       = Array.isArray(this._radarr) && this._radarr.find(r => r.tmdbId === m.id);
  const inRadarr          = !!radarrEntry;
  const inRadarrAvail     = !!(radarrEntry && radarrEntry.hasFile);
  const inRadarrDownloading = !!(radarrEntry && !radarrEntry.hasFile && this._radarrQueueActive.has(radarrEntry.id));

  const mediaStatus = m.mediaInfo?.status;
  // Status 5 = available, 3 = approved/processing, 2 = pending

  const _inOptimistic = this._optimisticRequested.has(m.id);
  const _withdrawn    = this._withdrawnIds.has(m.id);
  // Overseerr status >= 3 bez záznamu v Radarru = stará data (film byl odebrán)
  // Výjimka: pokud má family user aktivní pending request, není to stale
  const _hasPending   = this._familyPendingIds.has(m.id);
  const _stale        = mediaStatus >= 3 && !inRadarr && !_inOptimistic && !_hasPending;
  // Available = staženo (má soubor v Radarru) nebo Overseerr status=5
  const _isAvail      = (inRadarrAvail || mediaStatus === 5) && !_withdrawn && !_stale;
  // Req = cokoliv mezi "přidáno" a "schválení" — včetně stahování (!inRadarrAvail místo !inRadarr)
  const _isReq        = (mediaStatus >= 2 || _inOptimistic || _hasPending || inRadarr) && !_withdrawn && !inRadarrAvail && !_stale;
  const _reqId        = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(m.id);
  const _isAdmin      = this._hass.user.is_admin;

  let actionBtn = '';
  if (_isAvail) {
    actionBtn = `<span class="badge b-st-avail" style="margin-left:auto">✓<span class="b-txt"> ${this._t('badgeAvailable')}</span></span>`;
  } else if (_isReq) {
    if (inRadarrDownloading) {
      actionBtn = `<span class="badge b-dl" style="margin-left:auto">↓<span class="b-txt"> ${this._t('badgeDownloading')}</span></span>`;
    } else if (_isAdmin || (mediaStatus >= 3 && !_inOptimistic && !_hasPending)) {
      actionBtn = `<span class="badge b-st-proc" style="margin-left:auto">↓<span class="b-txt"> ${this._t('badgeAdded')}</span></span>`;
    } else {
      const withdrawBtn = _reqId
        ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}">✕</button>`
        : '';
      actionBtn = `<span class="mc-act-right"><span class="badge b-st-pend">⏱<span class="b-txt"> ${this._t('badgePending')}</span></span>${withdrawBtn}</span>`;
    }
  } else {
    actionBtn = `<button class="btn-add req-open" data-movieid="${m.id}" data-tmdb="${m.id}">${this._t('add')}</button>`;
  }

  const overlay = this._requestPending?.movieId === m.id
    ? this._renderRequestOverlay(m.id, m.id)
    : '';

  const tagHtml = typeTag ? `<span class="media-type-tag">${typeTag}</span>` : '';
  let coverHtml = '';
  const posterPath = m.posterPath || m.poster_path || null;
  if (posterPath) {
    const posterUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
    coverHtml = `<div class="mc-cover-lg" style="background:none;padding:0;position:relative">${tagHtml}<img src="${posterUrl}" style="width:100%;height:92px;object-fit:cover" loading="lazy" onerror="this.parentElement.innerHTML='🎬'" /></div>`;
  } else {
    coverHtml = `<div class="mc-cover-lg ${this._grad(m.id)}" style="position:relative">${tagHtml}🎬</div>`;
  }

  return `
    <div class="mc" data-popup="movie" data-tmdbid="${m.id}" data-title="${title}"${radarrEntry ? ` data-radarrid="${radarrEntry.id}"` : ''} style="position:relative"${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ''}>
      ${coverHtml}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-act">
          ${showRating ? `<span class="imdb">⭐ ${rating}</span>` : ''}
          ${showDate && dateStr ? `<span class="date-lbl">${dateStr}</span>` : ''}
          ${actionBtn}
        </div>
      </div>
      ${overlay}
    </div>`;
}

_renderCalendar() {
  let grid = '';
  if (!this._calendar || this._calendar.length === 0) {
    grid = `<div class="placeholder">${this._t('noEpisodes')}</div>`;
  } else {
    grid = this._pagedGrid(this._calendar, 'calendar', ep => this._renderCalendarCard(ep));
  }
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:calendar-clock" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('newEpisodes')}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator('calendar', this._calendar || [])}
        <span class="sec-badge" style="background:rgba(255,149,0,0.12);border:1px solid rgba(255,149,0,0.22)">ze Sonarr</span>
      </div>
      ${grid}
    </div>`;
}

_renderCalendarCard(ep) {
  const series = ep.series || {};
  const title = this._escHtml(series.title || ep.seriesTitle || 'Unknown');
  const s = String(ep.seasonNumber || 0).padStart(2, '0');
  const e = String(ep.episodeNumber || 0).padStart(2, '0');
  const badge = `S${s}E${e}`;
  const dateStr = this.fmtDate(ep.airDate);

  const poster = this._getSonarrPoster(series);

  return `
    <div class="mc" data-popup="sonarr" data-tvdbid="${ep.series?.tvdbId || ''}" data-tmdbid="${ep.series?.tmdbId || ''}" data-title="${title}">
      ${poster
        ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" /></div>`
        : `<div class="mc-cover-lg ${this._grad(ep.seriesId)}">📺</div>`
      }
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-act">
          <span class="badge b-ep">${badge}</span>
          <span class="date-lbl">${dateStr}</span>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// qBittorrent action API
// ─────────────────────────────────────────────

}

export const renderRightMixin = _RenderRight.prototype;
