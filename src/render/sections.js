import { BP, isTouch, maxWidth } from '../shared/ui.js';

// How many posters the phone's See More adds each time the reader nears the end
export const SHEET_BATCH = 24;
// How many a shelf holds before its last place opens See More
export const SHELF_MAX = 20;
// The posters a row a tablet's window can be set to by its slider
export const SHEET_COLS_MIN = 3;
export const SHEET_COLS_MAX = 10;

// Sections of the right column: their See More overlays, grids and paging. Split out of card.js.

class _SectionMethods {

  // Returns config object for a section overlay (icon, data key, render fn, etc.)
  _getSectionOverlayConfig(section) {
    const tmdbUrl = path => !path ? null : path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w92${path}`;
    const cfgs = {
      trending:   {
        dataKey: '_trending',   icon: 'mdi:trending-up',     titleKey: 'trendingMovies',
        appKey: this._discoverIconKey(),
        apiEndpoint: `${this._discoverSvc}/trending`,    hasTvPending: true,
        renderCard:  (m, i) => this._renderTrendingCard(m, i),
        getPosterUrl: m => tmdbUrl(m.posterPath || m.poster_path),
        emoji: m => m.mediaType === 'tv' ? '📺' : '🎬',
      },
      popular:    {
        dataKey: '_popular',    icon: 'mdi:fire',            titleKey: 'popularMovies',
        appKey: this._discoverIconKey(),
        apiEndpoint: `${this._discoverSvc}/popular`,     hasTvPending: false,
        renderCard:  (m, i) => this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), overlayIndex: i }),
        getPosterUrl: m => tmdbUrl(m.posterPath),
        emoji: () => '🎬',
      },
      upcoming:   {
        dataKey: '_upcoming',   icon: 'mdi:ticket-outline',  titleKey: 'upcomingMovies',
        appKey: this._discoverIconKey(),
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m, i) => this._renderUpcomingCard(m, { overlayIndex: i }),
        getPosterUrl: m => tmdbUrl(m.posterPath || m.poster_path),
        emoji: () => '🎬',
      },
      tvUpcoming: {
        dataKey: '_tvUpcoming', icon: 'mdi:television-play', titleKey: 'newShows',
        appKey: this._discoverIconKey(),
        apiEndpoint: `${this._discoverSvc}/tv_upcoming`, hasTvPending: true,
        renderCard:  (m, i) => this._renderTvUpcomingCard(m, { showRating: true, overlayIndex: i }),
        getPosterUrl: m => tmdbUrl(m.posterPath),
        emoji: () => '📺',
      },
      radarr:     {
        dataKey: '_radarr',     icon: 'mdi:filmstrip',       titleKey: 'recentMovies',
        appKey: 'radarr',
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m) => this._renderRadarrCard(m),
        getPosterUrl: m => this._getRadarrPoster(m),
        emoji: () => '🎬',
      },
      sonarr:     {
        dataKey: '_sonarr',     icon: 'mdi:television-play', titleKey: 'recentShows',
        appKey: 'sonarr',
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m) => this._renderSonarrCard(m),
        getPosterUrl: m => this._getSonarrPoster(m),
        emoji: () => '📺',
      },
      recentlyAdded: {
        dataKey: 'recentlyAdded', icon: 'mdi:check-circle-outline', titleKey: 'recentlyAdded',
        appKey: this._discoverIconKey(),
        apiEndpoint: null,                    hasTvPending: false,
        // See More shows what the header peanut is showing, not the raw list.
        getItems: () => this._raItems(),
        renderCard:  (m) => this._renderRecentlyAddedCard(m),
        getPosterUrl: m => m._mediaType === 'music'
          ? (this._lidarrArtistImage(m.artist, 'poster', { w: 200 }) || (m.newestAlbum ? this._lidarrCover(m.newestAlbum) : null))
          : (m._mediaType === 'movie' ? this._getRadarrPoster(m) : this._getSonarrPoster(m)),
        emoji: m => m._mediaType === 'music' ? '🎵' : (m._mediaType === 'movie' ? '🎬' : '📺'),
      },
      recommendations: {
        dataKey: '_trakt', icon: 'mdi:star-shooting-outline', titleKey: 'catRecommendations',
        appKey: 'trakt', gradPos: [25, 75, 0.6],
        apiEndpoint: null,                    hasTvPending: true,
        getItems: () => this._recItems(),
        renderCard:  (m, i) => this._renderRecCard(m, i),
        getPosterUrl: m => m._recSrc === 'lastfm'
          ? this._lidarrArtistImage(m.artist, 'poster', { w: 200 })
          : (m.posterPath ? (m.posterPath.startsWith('http') ? m.posterPath : `https://image.tmdb.org/t/p/w92${m.posterPath}`) : null),
        emoji: m => m._recSrc === 'lastfm' ? '🎵' : (m.mediaType === 'tv' ? '📺' : '🎬'),
      },
      recentlyRequested: {
        dataKey: 'recentlyRequested', icon: 'mdi:clock-time-four-outline', titleKey: 'recentlyRequested',
        getItems: () => this._rqItems(),
        appKey: this._discoverIconKey(),
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m) => this._renderRecentlyRequestedCard(m),
        getPosterUrl: m => m._mediaType === 'movie' ? this._getRadarrPoster(m) : this._getSonarrPoster(m),
        emoji: m => m._mediaType === 'movie' ? '🎬' : '📺',
      },
    };
    return cfgs[section] || null;
  }

  // Returns true if section has enough items to show the See-More card
  _hasSeeMore(section) {
    const cfg = this._getSectionOverlayConfig(section);
    if (!cfg) return false;
    const items = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
    if (items.length === 0) return false;
    const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
    const cols         = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
    return items.length > showMorePage * cols - 1;
  }

  // How the right column lays out on a phone (#48, discover.mobileLayout):
  // 'pages' as on a tablet, 'shelves' — every category at once, each a row
  // swiped sideways — or 'list', the categories folded to their titles with
  // one open at a time. A tablet has the same choice of its own
  // (tabletLayout): a screen up to where the card stacks its columns, or a
  // touch screen up to a narrow desktop's width — an iPad held sideways, a
  // Nest Hub — whose columns sit side by side. A desktop worked by a mouse
  // always pages.
  get _mobLayout() {
    // Measuring the height a tablet's column is held to draws it as pages
    if (this._measuringPages) return 'pages';
    const tablet = maxWidth(BP.STACKED) || (isTouch() && maxWidth(BP.NARROW));
    if (!tablet) return 'pages';
    const v = this._cfgGet('discover', maxWidth(BP.PHONE) ? 'mobileLayout' : 'tabletLayout', 'pages');
    return v === 'shelves' || v === 'list' ? v : 'pages';
  }

  // Posters a row in a phone's full-screen lists — See More, a category from
  // the list, the search, Library, Maintainerr (discover.mobileColumns)
  get _mobCols() {
    return parseInt(this._cfgGet('discover', 'mobileColumns', 3), 10) === 2 ? 2 : 3;
  }

  // The same on a tablet (discover.tabletColumns): a count, or 0 for as many
  // as fit its width
  get _tabCols() {
    const n = parseInt(this._cfgGet('discover', 'tabletColumns', 0), 10);
    return n >= 3 && n <= 8 ? n : 0;
  }

  // Shelves or list: the column flows down instead of paging
  get _mobFlow() {
    return this._mobLayout !== 'pages';
  }

  // A tablet's column keeps the height its categories have as pages
  // (categoriesCount): shelves or a list taller than that are turned in pages
  // of their own (_flowPages, measured in _measureAndLockHeight). A phone's
  // page scrolls instead.
  get _flowFits() {
    return this._mobFlow && !maxWidth(BP.PHONE);
  }

  // Paged grid with automatic See-More card insertion (if items exceed showMoreOnPage threshold)
  _pagedGridWithSmp(items, section, renderFn) {
    if (!items || items.length === 0) return '';
    if (this._mobFlow) {
      const more = items.length > SHELF_MAX && this._getSectionOverlayConfig(section);
      const shown = more ? [...items.slice(0, SHELF_MAX - 1), { _isSeeMore: true }] : items;
      return this._pagedGrid(shown, section, m => m._isSeeMore ? this._renderSeeMoreCardFor(section, items.length - SHELF_MAX + 1) : renderFn(m));
    }
    const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
    const cols         = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
    const itemsBefore  = showMorePage * cols - 1;
    if (items.length > itemsBefore) {
      const withSmp = [...items.slice(0, itemsBefore), { _isSeeMore: true }];
      return this._pagedGrid(withSmp, section, m => m._isSeeMore ? this._renderSeeMoreCardFor(section) : renderFn(m), cols);
    }
    return this._pagedGrid(items, section, renderFn, cols);
  }

  // Columns (and therefore items per page) for the right-panel categories
  _catCols() {
    return Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
  }

  // Returns items per page for a given section (respects YAML config)
  _perPage(section) {
    if (section === 'qbit')    return parseInt(this._cfgGet('downloads', 'torrentItems', 3)) || 3;
    if (section === 'sab')     return parseInt(this._cfgGet('downloads', 'usenetItems',  3)) || 3;
    if (section === 'nzbget')  return parseInt(this._cfgGet('downloads', 'usenetItems',  3)) || 3;
    if (section === 'deluge')   return parseInt(this._cfgGet('downloads', 'torrentItems', 3)) || 3;
    if (section === 'rtorrent') return parseInt(this._cfgGet('downloads', 'torrentItems', 3)) || 3;
    if (section === 'transmission') return parseInt(this._cfgGet('downloads', 'torrentItems', 3)) || 3;
    // Left-panel pending grid is fixed at four; every right-panel category pages
    // by its own column count, which is what _pagedGrid actually slices by.
    if (section === 'pending') return 4;
    return this._catCols();
  }

  // A config saved before the merge still names up to three recommendation
  // rows and one for music. They read as one Recommendations row, in the place
  // the first of them held — Trakt's, when it is there.
  _catConfigMigrated(cats) {
    const REC = ['trakt', 'suggestarr', 'lastfm'];
    const noMusic = cats.filter(c => c.id !== 'music');
    if (!noMusic.some(c => REC.includes(c.id))) return noMusic;
    if (noMusic.some(c => c.id === 'recommendations')) return noMusic.filter(c => !REC.includes(c.id));
    const idx = noMusic.findIndex(c => c.id === 'trakt');
    const slot = idx >= 0 ? idx : noMusic.findIndex(c => REC.includes(c.id));
    const enabled = noMusic.some(c => REC.includes(c.id) && c.enabled !== false);
    const out = noMusic.filter(c => !REC.includes(c.id));
    out.splice(Math.min(slot, out.length), 0, { id: 'recommendations', enabled });
    return out;
  }

  _sectionStyle() {
    return `position:relative;margin-left:-15px;padding-left:15px;margin-right:-15px;padding-right:15px;margin-top:-10px;padding-top:10px;`;
  }

  get _categoryOverlaysEnabled() {
    return this._cfgGet('styles', 'categoryOverlays', true) !== false;
  }

  // The windows' tint, switched apart from the categories' (styles.modalOverlays)
  get _modalOverlaysEnabled() {
    return this._cfgGet('styles', 'modalOverlays', true) !== false;
  }

  _sectionOverlayHtml(app, posL = 15, posR = 85, o = 0.4, bottomFade = 80, topFade = 6) {
    if (!this._categoryOverlaysEnabled) return '';
    const mask = `linear-gradient(to bottom,transparent 0.07%,black ${topFade}%,black ${bottomFade}%,transparent 100%)`;
    const gradL = `radial-gradient(circle at ${posL}% 15%,${this._brandColor(app, o)} 0%,transparent 48%)`;
    const gradR = `radial-gradient(circle at ${posR}% 15%,${this._brandColorSecondary(app, o)} 0%,transparent 48%)`;
    return `<div style="position:absolute;inset:0;background:${gradL},${gradR};mask-image:${mask};-webkit-mask-image:${mask};filter:blur(25px);opacity:var(--_a-tint, 1);pointer-events:none;z-index:0;"></div>`;
  }

_sectionOverlayHtmlSingle(app, o = 0.4) {
    if (!this._categoryOverlaysEnabled) return '';
    const mask = `linear-gradient(to bottom,transparent 0.07%,black 6%,black 80%,transparent 100%)`;
    const g = `radial-gradient(circle at 15% 0%,${this._brandColor(app, o)} 0%,transparent 65%)`;
    return `<div style="position:absolute;left:-15px;right:-15px;top:0;bottom:0;background:${g};mask-image:${mask};-webkit-mask-image:${mask};filter:blur(25px);opacity:var(--_a-tint, 1);pointer-events:none;z-index:0;"></div>`;
  }

  _sectionOverlayHtmlTop(app, posL = 15, posR = 85, o = 0.4, on = this._categoryOverlaysEnabled) {
    if (!on) return '';
    const mask = 'linear-gradient(to bottom,transparent 0.07%,black 6%,transparent 100%)';
    const gradL = `radial-gradient(circle at ${posL}% 30%,${this._brandColor(app, o)} 0%,transparent 48%)`;
    const gradR = `radial-gradient(circle at ${posR}% 30%,${this._brandColorSecondary(app, o)} 0%,transparent 48%)`;
    return `<div style="position:absolute;top:0;left:0;right:0;height:55%;background:${gradL},${gradR};mask-image:${mask};-webkit-mask-image:${mask};filter:blur(25px);opacity:var(--_a-tint, 1);pointer-events:none;z-index:0;"></div>`;
  }


  // A window wears the colours of its app at the top, softer than a
  // category in the column: Activity, Library and the calendar Radarr's and
  // Sonarr's, Prowlarr, Maintainerr and the statistics their own, a
  // category's full-screen window its source's
  _modalTint(app, posL = 15, posR = 85) {
    return this._sectionOverlayHtmlTop(app, posL, posR, 0.28, this._modalOverlaysEnabled);
  }

  _pagedGrid(items, section, renderFn, perPage = 4) {
    if (!items || items.length === 0) return '';
    // A shelf: the whole row, swiped sideways, no pages
    if (this._mobFlow) return `<div class="mgrid shelf">${items.slice(0, SHELF_MAX).map(it => renderFn(it)).join('')}</div>`;
    const page       = this._pages[section] || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const pageItems  = items.slice(page * perPage, page * perPage + perPage);
    const dir        = this._pageDir[section] || '';
    const animClass  = dir === 'next' ? 'anim-next' : dir === 'prev' ? 'anim-prev' : '';
    const grid       = `<div class="mgrid ${animClass}" style="grid-template-columns:repeat(${perPage},1fr)">${pageItems.map(it => renderFn(it)).join('')}</div>`;

    if (totalPages <= 1) {
      // Placeholder tlačítka zachovají stejné odsazení jako multi-page sekce
      return `
        <div class="pg-wrap">
          <button class="pg-btn pg-btn-ph" disabled>‹</button>
          ${grid}
          <button class="pg-btn pg-btn-ph" disabled>›</button>
        </div>`;
    }

    const prevDis = page === 0              ? 'disabled' : '';
    const nextDis = page >= totalPages - 1  ? 'disabled' : '';
    return `
      <div class="pg-wrap">
        <button class="pg-btn" data-section="${section}" data-dir="prev" ${prevDis}>‹</button>
        ${grid}
        <button class="pg-btn" data-section="${section}" data-dir="next" ${nextDis}>›</button>
      </div>`;
  }

  _getPageData(section) {
    if (section === 'qbit')     return this._dlInstPick('qbit', Array.isArray(this._qbit) ? this._qbit : []);
    if (section === 'deluge')   return Array.isArray(this._delugeQueue) ? this._delugeQueue : [];
    if (section === 'rtorrent') return Array.isArray(this._rtorrentQueue) ? this._rtorrentQueue : [];
    if (section === 'transmission') return Array.isArray(this._transmissionQueue) ? this._transmissionQueue : [];
    if (section === 'nzbget') {
      const queue = Array.isArray(this._nzbgetQueue) ? this._nzbgetQueue : [];
      const completed = (this._nzbgetCompleted || []).map(s => ({
        NZBID: s.NZBID, NZBName: s.NZBName || 'Unknown',
        FileSizeMB: s.FileSizeMB || 0, RemainingSizeMB: 0,
        Status: 'SUCCESS', _history: true,
      }));
      return [...queue, ...completed];
    }
    if (section === 'sab') {
      const slots     = Array.isArray(this._sab?.slots) ? this._sab.slots : [];
      const completed = (this._sabCompleted || []).map(s => ({ _inst: s._inst,
        nzo_id: s.nzo_id, filename: s.name || s.filename || 'Unknown',
        percentage: '100', mb: String((s.bytes || 0) / 1024 / 1024),
        mbleft: '0', status: 'Completed', timeleft: '', size: s.size || '', _history: true,
      }));
      return this._dlInstPick('sab', [...slots, ...completed]);
    }
    if (section === 'pending')           return this._pendingRequests || [];
    if (section === 'recommendations')   return this._recItems();
    if (section === 'calendar')          return this._calCatItems();
    if (section === 'recentlyAdded')     return this._raItems();
    if (section === 'recentlyRequested') return this.recentlyRequested;
    if (section === 'music')             return this._lidarrArtistFeed || [];
    return this['_' + section] || [];
  }

  // Paginated vertical list (for download items)
  _pagedList(items, section, renderFn, perPage = 4, innerClass = '', overlayHtml = '') {
    if (!items || items.length === 0)
      return innerClass
        ? `<div class="${innerClass} dc-no-chev">${overlayHtml}<div class="placeholder">${this._t('noDownloads')}</div></div>`
        : `<div class="placeholder">${this._t('noDownloads')}</div>`;
    const page       = this._pages[section] || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const pageItems  = items.slice(page * perPage, page * perPage + perPage);
    const dir        = this._pageDir[section] || '';
    const animClass  = dir === 'next' ? 'anim-next' : dir === 'prev' ? 'anim-prev' : '';
    const list       = `<div class="dl-list ${animClass}">${pageItems.map(it => renderFn(it)).join('')}</div>`;

    if (totalPages <= 1) {
      return innerClass ? `<div class="${innerClass} dc-no-chev">${overlayHtml}${list}</div>` : list;
    }

    const prevDis = page === 0             ? 'disabled' : '';
    const nextDis = page >= totalPages - 1 ? 'disabled' : '';
    const inner   = innerClass ? `<div class="${innerClass}" style="flex:1;min-width:0">${overlayHtml}${list}</div>` : list;
    return `
      <div class="pg-wrap">
        <button class="pg-btn" data-section="${section}" data-dir="prev" ${prevDis}>‹</button>
        ${inner}
        <button class="pg-btn" data-section="${section}" data-dir="next" ${nextDis}>›</button>
      </div>`;
  }

// Returns a right-arrow button for the section header that opens the overlay at page 0
_seeMoreBtn(section) {
  if (!this._hasSeeMore(section)) return '';
  return `<button class="smp-hdr-btn" data-action="overlay-open" data-sec="${section}" data-page="0" style="width:28px;height:28px;margin:-2px 0;flex-shrink:0">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  </button>`;
}

// Returns item count for _pageIndicator, accounting for SMP card insertion
_smpPageCount(items, section) {
  if (!items || items.length === 0) return 0;
  const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
  const cols         = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
  const itemsBefore  = showMorePage * cols - 1;
  return items.length > itemsBefore ? itemsBefore + 1 : items.length;
}

_renderSeeMoreCardFor(section, remaining = null) {
  const cfg = this._getSectionOverlayConfig(section);
  const items = (cfg ? (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) : []) || [];
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
      cells.push(`<div style="width:100%;height:100%;background:rgba(var(--_fill, 255, 255, 255), 0.06)"></div>`);
    }
  }
  const remainCount = remaining ?? Math.max(0, items.length - itemsBefore);
  return `
    <div class="mc smp-card" data-action="overlay-open" data-sec="${section}">
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

// The three type filters, built in one place: the row header and the See More
// overlay both draw the same control, and a reader who narrowed a row to music
// expects it to still be narrowed — and still switchable — inside See More.
_raFilterHtml() {
  const hasMusic = this._lidarrConfigured !== false;
  const _si = this._mtSegIcons;
  return hasMusic ? this._hdrFilter(`<div class="search-type-seg" style="margin:0 0 0 -6px">${this._mtSegmented('data-ra-seg', [
    { v: 'all',   label: this._t('tabAll'),   attr: 'data-ra-type="all"', w: 38 },
    { v: 'video', label: `${this._t('tabMovies')} / ${this._t('tabTvShows')}`,
      icon: `<span style="display:inline-flex;align-items:center;justify-content:center;gap:5px">${_si.movie}<span style="width:1px;height:12px;background:currentColor;opacity:0.35;flex-shrink:0"></span>${_si.tv}</span>`,
      attr: 'data-ra-type="video"' },
    { v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: 'data-ra-type="music"' },
  ], this._raTypeSaved, { accent: '0,122,255', animatePrev: !!this._raSegAnim, prev: this._raSegPrev })}</div>`, this._raTypeSaved !== 'all', 'ra') : '';
}

_rqFilterHtml() {
  const hasMusic = this._lidarrConfigured !== false;
  const rqType = hasMusic ? this._rqTypeSaved : 'all';
  const _si = this._mtSegIcons;
  return hasMusic ? this._hdrFilter(`<div class="search-type-seg" style="margin:0 0 0 -6px">${this._mtSegmented('data-rq-seg', [
    { v: 'all',   label: this._t('tabAll'),   attr: 'data-rq-type="all"', w: 38 },
    { v: 'video', label: `${this._t('tabMovies')} / ${this._t('tabTvShows')}`,
      icon: `<span style="display:inline-flex;align-items:center;justify-content:center;gap:5px">${_si.movie}<span style="width:1px;height:12px;background:currentColor;opacity:0.35;flex-shrink:0"></span>${_si.tv}</span>`,
      attr: 'data-rq-type="video"' },
    { v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: 'data-rq-type="music"' },
  ], rqType, { accent: '0,122,255', animatePrev: !!this._rqSegAnim, prev: this._rqSegPrev })}</div>`, rqType !== 'all', 'rq') : '';
}

_recFilterHtml() {
  const src = this._recSources;
  const _si = this._mtSegIcons;
  // Music only earns the filter when there is music to filter for.
  const hasMusic = src.lastfm && (src.trakt || src.suggestarr);
  return hasMusic ? this._hdrFilter(`<div class="search-type-seg" style="margin:0 0 0 -6px">${this._mtSegmented('data-rec-seg', [
    { v: 'all',   label: this._t('tabAll'),   attr: 'data-rec-type="all"', w: 38 },
    { v: 'video', label: `${this._t('tabMovies')} / ${this._t('tabTvShows')}`,
      icon: `<span style="display:inline-flex;align-items:center;justify-content:center;gap:5px">${_si.movie}<span style="width:1px;height:12px;background:currentColor;opacity:0.35;flex-shrink:0"></span>${_si.tv}</span>`,
      attr: 'data-rec-type="video"' },
    { v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: 'data-rec-type="music"' },
  ], this._recTypeSaved, { accent: '0,122,255', animatePrev: !!this._recSegAnim, prev: this._recSegPrev })}</div>`, this._recTypeSaved !== 'all', 'rec') : '';
}

// Which marks a section's header wears — the merged Recommendations row shows
// one per source it is drawing on, so See More says the same thing the row does.
_secHeaderIcons(section) {
  if (section === 'recommendations') {
    const src = this._recSources;
    const icons = [src.trakt && 'trakt', src.suggestarr && 'suggestarr', src.lastfm && 'lastfm'].filter(Boolean);
    if (icons.length > 1) return this._appIconRow(icons);
    return this._appIcon(icons[0] || 'trakt', 24);
  }
  if (section === 'recentlyAdded' || section === 'recentlyRequested') {
    const hasMusic = this._lidarrConfigured !== false;
    const noSeerr = this._overseerrConfigured === false;
    if (noSeerr) return this._appIconRow(hasMusic ? ['radarr', 'sonarr', 'lidarr'] : ['radarr', 'sonarr']);
    return hasMusic
      ? `<div class="app-icon-row" style="display:inline-flex;gap:4px;flex-shrink:0;align-items:center">${this._appIcon(this._discoverIconKey(), 24)}${this._appIcon('lidarr', 24)}</div>`
      : this._appIcon(this._discoverIconKey(), 24);
  }
  return '';
}

_secFilterHtml(section) {
  if (section === 'recentlyAdded')     return this._raFilterHtml();
  if (section === 'recentlyRequested') return this._rqFilterHtml();
  if (section === 'recommendations')   return this._recFilterHtml();
  return '';
}

// On a phone See More is the whole screen: a category a few posters wide was
// paged two posters at a time (#48). It scrolls down instead and loads more as
// the reader nears the end. A tablet does the same when its categories are
// shelves or a list: a shelf's last poster opening pages would be a stranger.
get _secSheet() {
  return maxWidth(BP.PHONE_S) || this._mobFlow;
}

// Whether the server has another page of this category to give
_sheetCanFetch(section, cfg) {
  return !!cfg?.apiEndpoint && this._sheetFetchFailed !== section
    && (this._overlayApiPage[section] || 0) < (this._overlayApiTotalPages[section] || 1);
}

_renderSectionOverlay(section) {
  const cfg = this._getSectionOverlayConfig(section);
  if (!cfg) return '';
  const items    = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
  if (this._secSheet) return this._renderSectionSheet(section, cfg, items);
  const isMobile = maxWidth(BP.PHONE_S);
  const cols     = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
  const perPage  = isMobile ? cols : cols * 2;
  const page       = this._overlay.page || 0;
  const totalPages = Math.ceil(items.length / perPage);
  const pageItems  = items.slice(page * perPage, (page + 1) * perPage);
  const gridHtml   = pageItems.map((m, i) => cfg.renderCard(m, i)).join('');
  const pageInd    = totalPages > 1
    ? `<span class="sec-page-ind">${page + 1}<span class="sec-page-sep">/</span>${totalPages}</span>`
    : '';

  // The add overlay belongs to whichever grid the plus was pressed in. Left to
  // the row's own renderer it was drawn behind this one, on the page the reader
  // had left — visible only after closing See More.
  //
  // It sits in the grid as a full-width item on the pressed card's own row
  // rather than as an absolutely positioned box measured afterwards: the grid
  // already knows where the row is, and a measurement that misses leaves the
  // overlay across every poster on the page.
  let musAddOv = '';
  if (this._musAddPending && section === 'recommendations') {
    const mb = String(this._musAddPending.artist?.foreignArtistId || '').toLowerCase();
    const idx = pageItems.findIndex(x =>
      String(x?.artist?.foreignArtistId || x?.foreignArtistId || '').toLowerCase() === mb);
    const rowNo = Math.floor(Math.max(0, idx) / cols) + 1;
    musAddOv = `<div class="mus-add-row" style="grid-column:1/-1;grid-row:${rowNo}">${this._renderMusicAddOverlay()}</div>`;
  }

  const [gposL = 15, gposR = 85, go = 0.35] = cfg.gradPos || [];
  return `
    <div class="trending-overlay">
      ${cfg.appKey ? this._sectionOverlayHtmlTop(cfg.appKey, gposL, gposR, go) : ''}
      <div class="col-hdr" style="margin-bottom:5px;position:relative;z-index:1">
        ${this._secHeaderIcons(section)
          || (cfg.appKey ? this._appIcon(cfg.appKey, 24) : `<ha-icon icon="${cfg.icon}" style="--mdc-icon-size:24px"></ha-icon>`)}
        <span class="col-hdr-title">${this._t(cfg.titleKey)}</span>
        ${this._secFilterHtml(section)}
        <div class="col-hdr-line"></div>
        ${pageInd}
        <!-- The same box and mark as the See More arrow it replaces: the button
             swaps under the reader's cursor, so a smaller one is noticed. -->
        <button class="to-close" data-action="overlay-close" style="width:28px;height:28px;margin:-2px 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <path d="M19 12H5M11 6l-6 6 6 6"/>
          </svg>
        </button>
      </div>
      <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative;z-index:1">
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">‹</button>
        <div class="to-grid" style="grid-template-columns:repeat(${cols},1fr)">${gridHtml}${musAddOv}</div>
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">›</button>
      </div>
    </div>`;
}

_renderSectionSheet(section, cfg, items) {
  const shown     = Math.min(items.length, this._overlay.shown || SHEET_BATCH);
  const pageItems = items.slice(0, shown);
  const gridHtml  = pageItems.map((m, i) => cfg.renderCard(m, i)).join('');
  // The same music add row as the paged grid, on a grid three wide
  let musAddOv = '';
  if (this._musAddPending && section === 'recommendations') {
    const mb = String(this._musAddPending.artist?.foreignArtistId || '').toLowerCase();
    const idx = pageItems.findIndex(x =>
      String(x?.artist?.foreignArtistId || x?.foreignArtistId || '').toLowerCase() === mb);
    musAddOv = `<div class="mus-add-row" style="grid-column:1/-1;grid-row:${Math.floor(Math.max(0, idx) / 3) + 1}">${this._renderMusicAddOverlay()}</div>`;
  }
  const more = shown < items.length || this._sheetCanFetch(section, cfg);
  const foot = more
    ? `<div class="to-sheet-foot" data-sheet-more>${this._t('loading')}</div>`
    : '';
  const [gposL = 15, gposR = 85] = cfg.gradPos || [];
  return `
    <div class="to-sheet-veil"></div>
    <div class="trending-overlay to-sheet${this._isDay ? ' sheet-day' : ''}"${this._sheetColsStyle()}>
      ${cfg.appKey ? this._modalTint(cfg.appKey, gposL, gposR) : ''}
      ${this._sheetHdr(this._t(cfg.titleKey), this._sheetTypeNav(section), 'data-action="overlay-close"')}
      <div class="to-sheet-body vscroll">
        <div class="to-grid to-grid-sheet">${gridHtml}${musAddOv}</div>
        ${foot}
      </div>
      ${this._toTopHtml()}
    </div>`;
}

// The header of a category opened over the whole screen on a phone: its
// name, its type filter where it has one, and a close. Not the column's
// header, whose line and back arrow belonged to a category drawn in place.
// Dressed as the calendar window's header, with the same controls: the
// name, the type switch beside the close, the close the modal's own round
// button.
// The type switch where a window's name would start, the name in the middle,
// the poster size and the close at the end. A phone's header, a switch and a
// close wide, leaves the name out where there is a switch: the category was
// opened a moment ago by that name.
_sheetHdr(title, filter, closeAttr) {
  return `<div class="col-hdr to-sheet-hdr${filter ? ' has-filter' : ''}">
    <div class="sh-side">${filter || ''}</div>
    <span class="col-hdr-title">${this._escHtml(title)}</span>
    <div class="sh-side sh-end">
      ${this._isMob ? '' : this._sheetSizeHtml()}
      <button class="popup-close sheet-x" ${closeAttr} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>`;
}

// A tablet's window sizes its posters by a slider in its header: how many a
// row, from SHEET_COLS_MIN to SHEET_COLS_MAX, remembered in this browser. Until
// it is moved the card's own setting (tabletColumns) or the width decides.
get _sheetCols() {
  try {
    const n = parseInt(localStorage.getItem('arr-sheet-cols'), 10);
    if (n >= SHEET_COLS_MIN && n <= SHEET_COLS_MAX) return n;
  } catch (_) {}
  return 0;
}

_sheetColsStyle() {
  const n = this._sheetCols;
  return n && !this._isMob ? ` style="--arr-tab-grid:repeat(${n},minmax(0,1fr))"` : '';
}

_sheetSizeHtml() {
  return `<div class="sz-slider" data-sheet-size title="${this._escHtml(this._t('posterSize'))}">
    <div class="sz-track"><div class="sz-fill"></div><div class="sz-thumb"></div></div>
  </div>`;
}

// The category's type filter for its sheet's header, drawn as the windows'
// tab bar; the same choices and attributes as the column's peanut, so the
// column's handler answers it
_sheetTypeNav(section) {
  const _si = this._mtSegIcons;
  const pair = `<span style="display:inline-flex;align-items:center;gap:4px">${_si.movie}${_si.tv}</span>`;
  const spec = {
    recentlyAdded:     { attr: 'data-ra-type',  cur: this._raTypeSaved,  key: 'ra',  on: this._lidarrConfigured !== false },
    recentlyRequested: { attr: 'data-rq-type',  cur: this._rqTypeSaved,  key: 'rq',  on: this._lidarrConfigured !== false },
    recommendations:   { attr: 'data-rec-type', cur: this._recTypeSaved, key: 'rec',
      on: this._recSources.lastfm && (this._recSources.trakt || this._recSources.suggestarr) },
  }[section];
  if (!spec?.on) return '';
  const nav = this._mtTypeNav([
    { v: 'all',   label: this._t('tabAll'), attr: `${spec.attr}="all"` },
    { v: 'video', label: `${this._t('tabMovies')} / ${this._t('tabTvShows')}`, icon: pair, attr: `${spec.attr}="video"` },
    { v: 'music', label: this._t('tabMusic'), icon: _si.music, attr: `${spec.attr}="music"` },
  // A sheet's header is the phone's on a tablet too: All in words, the rest
  // as their icons
  ], spec.cur, { compact: true });
  return this._hdrFilter(`<div class="search-type-seg">${nav}</div>`, spec.cur !== 'all', spec.key);
}

// A sheet's header with its switch out: when the name next to it would be cut
// short, the funnel stands in for the switch and opens it on a tap
_fitSheetHdr(root) {
  for (const h of root?.querySelectorAll('.to-sheet-hdr') || []) {
    h.classList.remove('tight');
    // The switch does not fit its side: the funnel stands in for it
    const side = h.querySelector('.sh-side');
    if (h.querySelector('.hdr-filter') && side && side.scrollWidth > side.clientWidth + 1) h.classList.add('tight');
  }
  this._syncTypeNavs(root);
}

// Paging nav pro sekce overlay — stejná struktura jako standardní rp-nav
_renderSectionOverlayNav(section) {
  const cfg = this._getSectionOverlayConfig(section);
  if (!cfg || this._secSheet) return '';
  const items    = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
  const isMobile = maxWidth(BP.PHONE_S);
  const cols     = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
  const perPage  = isMobile ? cols : cols * 2;
  const page     = this._overlay.page || 0;
  const totalPages = Math.ceil(items.length / perPage);
  const hasPrev  = page > 0;
  const apiPage  = this._overlayApiPage[section] || 0;
  const apiTotal = this._overlayApiTotalPages[section] || 1;
  const hasNext  = page < totalPages - 1 || (cfg.apiEndpoint && apiPage < apiTotal);

  if (!hasPrev && !hasNext) return '';

  return this._rpPag(page, totalPages, {
    firstAttr: 'data-action="overlay-first"',
    prevAttr:  'data-action="overlay-prev"',
    nextAttr:  'data-action="overlay-next"',
    lastAttr:  'data-action="overlay-last"',
    dotAttr: 'data-topage', dotSecAttr: '',
    hasNext,
  });
}
}

export const sectionsMixin = _SectionMethods.prototype;
