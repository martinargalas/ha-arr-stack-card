// Library: the tiles in the right column, the counts behind them and the click
// that opens the modal. Core, because the column draws them synchronously; the
// modal loads on demand (chunks/library.js).

class _LibraryTilesMethods {

  _renderLibrary() {
    const hasMusic = this._lidarrConfigured !== false && (this._lidarrArtists?.size || 0) > 0;
    const tiles = (hasMusic
      ? [
          this._libBuildTile('movies',   this._t('tabMovies'),    this._libMoviesData()),
          this._libBuildTile('tv',       this._t('tlFilterTvShows'),  this._libTvData()),
          this._libBuildTile('music',    this._t('tabMusic'),     this._libMusicData()),
          this._libBuildTile('toprated', this._t('libTopRated'), this._libTopRatedData()),
        ]
      : [
          this._libBuildTile('movies',     this._t('tabMovies'),      this._libMoviesData()),
          this._libBuildTile('tv',         this._t('tlFilterTvShows'),    this._libTvData()),
          this._libBuildTile('toprated',   this._t('libTopRated'),   this._libTopRatedData()),
          this._libBuildTile('topquality', this._t('libTopQuality'), this._libTopQualityData()),
        ]).join('');

    const cols = 4;
    const grid = `<div class="mgrid" style="grid-template-columns:repeat(${cols},1fr)">${tiles}</div>`;

    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('radarr', 25, 75, 0.18)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIconRow(['radarr', 'sonarr', 'lidarr'])}
          <span class="col-hdr-title">${this._t('tlColLibrary')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap">
          <button class="pg-btn pg-btn-ph" disabled>‹</button>
          ${grid}
          <button class="pg-btn pg-btn-ph" disabled>›</button>
        </div>
      </div>`;
  }

  _libBuildTile(key, label, posters) {
    const slots = [0, 1, 2, 3].map(i => {
      const p = posters[i];
      if (!p) return `<div class="lib-sub-poster lib-sub-empty"></div>`;
      return p.url
        ? `<div class="lib-sub-poster"><img src="${p.url}" alt="${this._escHtml(p.title || '')}" loading="lazy" onerror="this.style.display='none'"></div>`
        : `<div class="lib-sub-poster lib-sub-empty"></div>`;
    }).join('');

    return `
      <div class="mc lib-tile-card" data-lib-open="${key}">
        <div class="lib-tile-grid">
          ${slots}
          <div class="lib-tile-dim"></div>
        </div>
        <span class="media-type-tag">${label}</span>
      </div>`;
  }

  _libMoviesData() {
    return (this._radarr || [])
      .filter(m => m.hasFile)
      .sort((a, b) => new Date(b.added || 0) - new Date(a.added || 0))
      .slice(0, 4)
      .map(m => ({ url: this._getRadarrPoster(m), title: m.title, _libType: 'movie' }));
  }

  _libTvData() {
    return (this._sonarr || [])
      .filter(s => (s.statistics?.episodeFileCount || 0) > 0)
      .sort((a, b) => new Date(b.added || 0) - new Date(a.added || 0))
      .slice(0, 4)
      .map(s => ({ url: this._getSonarrPoster(s), title: s.title, _libType: 'tv' }));
  }

  _libMusicData() {
    const arts = [...(this._lidarrArtists?.values() || [])]
      .filter(a => (a.statistics?.trackFileCount || 0) > 0)
      .sort((a, b) => new Date(b.added || 0) - new Date(a.added || 0))
      .slice(0, 24);
    const out = [];
    for (const a of arts) {
      const url = this._lidarrArtistImage(a, 'poster', { w: 360 }) || this._lidarrArtistImage(a, 'fanart', { w: 360 });
      if (!url) continue;   // no artwork, or its signature has not arrived yet
      out.push({ url, title: a.artistName || '', _libType: 'music' });
      if (out.length === 4) break;
    }
    return out;
  }

  _libTopRatedData() {
    return [
      ...(this._radarr || []).filter(m => m.hasFile).map(m => ({
        url: this._getRadarrPoster(m), title: m.title, _libType: 'movie',
        _score: m.ratings?.imdb?.value || m.ratings?.value || 0,
      })),
      ...(this._sonarr || []).filter(s => (s.statistics?.episodeFileCount || 0) > 0).map(s => ({
        url: this._getSonarrPoster(s), title: s.title, _libType: 'tv',
        _score: s.ratings?.imdb?.value || s.ratings?.tmdb?.value || s.ratings?.tvdb?.value || s.ratings?.tvMaze?.value || s.ratings?.trakt?.value || s.ratings?.value || 0,
      })),
    ].filter(i => i._score > 0).sort((a, b) => b._score - a._score).slice(0, 4);
  }

  _libTopQualityData() {
    const Q = ['2160p', '1080p', '720p', '480p'];
    const rank = q => { const i = Q.findIndex(r => q.includes(r)); return i === -1 ? 99 : i; };
    return [
      ...(this._radarr || []).filter(m => m.hasFile).map(m => ({
        url: this._getRadarrPoster(m), title: m.title, _libType: 'movie',
        _rank: rank(m.movieFile?.quality?.quality?.name || ''),
      })),
      ...(this._sonarr || []).filter(s => (s.statistics?.episodeFileCount || 0) > 0).map(s => ({
        url: this._getSonarrPoster(s), title: s.title, _libType: 'tv', _rank: 99,
      })),
    ].sort((a, b) => a._rank - b._rank).slice(0, 4);
  }

  _wireLibraryTiles(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._libWired) return;
    right._libWired = true;
    right.addEventListener('click', e => {
      const tile = e.target.closest('[data-lib-open]');
      if (!tile) return;
      this._openLibModal(tile.dataset.libOpen);
    });
  }

  _libRerenderBody(el) {
    const body = el.querySelector('#lib-body');
    if (!body || !this._libModal) return;
    const prevSearch = el.querySelector('#lib-search');
    const searchFocused = prevSearch && (this.shadowRoot?.activeElement === prevSearch);
    const sel = prevSearch?.selectionStart ?? null;
    body.innerHTML = this._libBodyHtml();
    this._wireLibModalBody(el);
    this._wireLibDragHandle(el);
    if (searchFocused) {
      const inp = el.querySelector('#lib-search');
      if (inp) { inp.focus(); try { inp.setSelectionRange(sel, sel); } catch {} }
    }
  }

  // Swaps in the poster grid for a new column count without repainting the
  // body — the slider lives in the body and a repaint mid-drag would take it
  // out from under the pointer. Poster clicks are delegated on .popup-glass,
  // so the new grid needs no wiring. The first poster on screen stays on the
  // page that is shown.
  _libRelayGrid(el, cols) {
    const m = this._libModal;
    const grid = el.querySelector('#lib-poster-grid');
    if (!m || !grid) return;
    const first = (m.page || 0) * (m._perPage || 1);
    m._libCols = cols;
    m._colsAuto = false;
    const probe = document.createElement('div');
    probe.innerHTML = this._libBodyHtml();          // measures _perPage for this count
    const page = Math.floor(first / (m._perPage || 1));
    if (page !== m.page) { m.page = page; probe.innerHTML = this._libBodyHtml(); }
    const next = probe.querySelector('#lib-poster-grid');
    if (next) grid.replaceWith(next);
  }

  _wireLibDragHandle(el) {
    const handle = el.querySelector('#lib-drag-handle');
    const track  = el.querySelector('#lib-drag-track');
    const thumb  = el.querySelector('#lib-drag-thumb');
    if (!handle || !track) return;
    const MIN = 3, MAX = 12, INSET = 7;
    let startX = 0, startCols = 0, liveCols = null;

    const _thumbPx = (cols, tW) => Math.round((cols - MIN) / (MAX - MIN) * (tW - INSET * 2)) + INSET;
    const _updateUI = cols => {
      const tW = track.getBoundingClientRect().width || 120;
      const px = _thumbPx(cols, tW);
      if (thumb) { thumb.style.left = px + 'px'; }
      const fill = track.firstElementChild;
      if (fill) { fill.style.left = '0'; fill.style.width = px + 'px'; }
      // The page follows the slider while it is held: a new column count means
      // a new poster size and so a new row count, and only re-laying the page
      // shows whole rows. Changing the columns alone left the old page's
      // posters squeezed or cut off until the drop.
      if (cols !== liveCols) {
        liveCols = cols;
        this._libRelayGrid(el, cols);
      }
    };
    const _colsFromDx = dx => {
      const tW = track.getBoundingClientRect().width || 120;
      const eff = tW - INSET * 2;
      const startPx = _thumbPx(startCols, tW) - INSET;
      const newFrac = Math.max(0, Math.min(1, (startPx + dx) / eff));
      return Math.max(MIN, Math.min(MAX, MIN + Math.round(newFrac * (MAX - MIN))));
    };

    handle.addEventListener('pointerdown', e => {
      startX    = e.clientX;
      startCols = this._libModal._libCols || 5;
      liveCols  = startCols;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', e => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      _updateUI(_colsFromDx(e.clientX - startX));
    });
    handle.addEventListener('pointerup', e => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      const newCols = _colsFromDx(e.clientX - startX);
      this._libModal._libCols = newCols;
      this._libModal._colsAuto = false;
      try {
        const s = JSON.parse(localStorage.getItem('arr-lib-tabs') || '{}');
        s.tabCols = newCols;
        localStorage.setItem('arr-lib-tabs', JSON.stringify(s));
      } catch (_) {}
      this._libRerenderBody(el);
    });
  }

}

export const libraryTilesMixin = _LibraryTilesMethods.prototype;
