class _PopupMethods {
_wirePopup() {
  this.shadowRoot.querySelectorAll('.mc[data-popup]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      // Ignore clicks on the Overseerr add/have buttons inside the card
      if (e.target.closest('.overseerr-add, .btn-add, .req-open, .req-cancel, .req-confirm, .req-overlay, .tv-req-open, .tv-req-cancel, .tv-req-confirm, .tv-req-overlay, .req-withdraw, .pr-approve, .pr-decline')) return;
      const type     = card.dataset.popup;  // 'radarr' | 'sonarr' | 'movie' | 'tv'
      const tmdbId   = card.dataset.tmdbid;
      const tvdbId   = card.dataset.tvdbid;
      const title    = card.dataset.title || '';
      const radarrId = card.dataset.radarrid ? parseInt(card.dataset.radarrid, 10) : null;
      this._openPopup(type, tmdbId, tvdbId, title, radarrId);
    });
  });
}

// ─────────────────────────────────────────────
// Popup: fetch detail data and open modal
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Day/night helper (sun.sun entity)
// ─────────────────────────────────────────────
get _isDaytime() {
  return this._hass?.states?.['sun.sun']?.state === 'above_horizon';
}

async _openPopup(type, tmdbId, tvdbId, title, radarrId = null) {
  // Reset Radarr IS state
  this._isState    = null;
  this._isResults  = [];
  this._isFilter   = 'all';
  this._isGrabbing = null;
  this._isGrabbed  = new Set();
  this._isHistory  = {};
  this._isError    = null;

  // Reset remove confirm state
  this._removeConfirm = false;

  // Reset Sonarr IS state
  this._snIsOpen         = false;
  this._snExpandedSeasons = new Set();
  this._snEpisodes       = new Map();
  this._snActiveIs       = null;
  this._snIsState        = null;
  this._snIsResults      = [];
  this._snIsError        = null;
  this._snIsFilter       = 'all';
  this._snIsGrabbing     = null;
  this._snIsGrabbed      = new Set();
  this._snIsHistory      = {};

  // Najdi Radarr interní ID
  // Radarr interní ID: přednostně z data-radarrid (embed při renderu), fallback lookup
  let _radarrId = null;
  if ((type === 'radarr' || type === 'movie') && (radarrId || tmdbId)) {
    _radarrId = radarrId ?? (this._radarr || []).find(m => String(m.tmdbId) === String(tmdbId))?.id ?? null;
  }

  // Najdi Sonarr series (potřebné pro IS + seasons data)
  let _sonarrSeries = null;
  if ((type === 'sonarr' || type === 'tv') && (tvdbId || tmdbId)) {
    _sonarrSeries = (this._sonarr || []).find(s =>
      (tvdbId && String(s.tvdbId) === String(tvdbId)) ||
      (tmdbId && String(s.tmdbId) === String(tmdbId))
    ) ?? null;
  }

  // Show loading state immediately
  this._popup = { _loading: true, title, _radarrId, _sonarrSeries };
  this._renderPopupEl();

  try {
    let apiPath = '';
    if (type === 'tv' && tmdbId) {
      // TV upcoming — m.id je TMDB ID z Overseerr discover
      apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
    } else if (type === 'sonarr' && tmdbId) {
      // Sonarr knihovna — preferuj TMDB ID (Overseerr to vyžaduje)
      apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
    } else if ((type === 'radarr' || type === 'movie') && tmdbId) {
      apiPath = `arr_stack/overseerr/movie/${tmdbId}`;
    } else {
      throw new Error('no_id');
    }

    const data = await this._hass.callApi('GET', apiPath);
    this._popup = { ...data, _type: type, _radarrId, _sonarrSeries };
  } catch (e) {
    console.error('[arr-card] popup fetch error:', e);
    const local = this._localFallbackData(type, tmdbId, tvdbId, title);
    this._popup = local ? { ...local, _radarrId, _sonarrSeries } : { title, _radarrId, _sonarrSeries, _error: e.message };
  }
  this._renderPopupEl();
}

// Build popup data from local arrays when Overseerr is unavailable/fails
_localFallbackData(type, tmdbId, tvdbId, title) {
  if (type === 'tv') {
    // TV upcoming — hledej v _tvUpcoming podle TMDB ID
    const show = this._tvUpcoming?.find(m => String(m.id) === String(tmdbId));
    if (show) return {
      _type: 'tv', _localData: true,
      title: show.name || show.originalName || title,
      overview: show.overview || '',
      firstAirDate: show.firstAirDate || '',
      genres: (show.genreIds || []).map(id => ({ name: String(id) })),
      _localPosterUrl: show.posterPath ? `https://image.tmdb.org/t/p/w342${show.posterPath}` : null,
      relatedVideos: [],
    };
  }
  if (type === 'sonarr') {
    let series = (tmdbId && this._sonarr.find(s => String(s.tmdbId) === String(tmdbId)))
              || (tvdbId && this._sonarr.find(s => String(s.tvdbId) === String(tvdbId)));
    if (!series) {
      const ep = this._calendar.find(ep =>
        (tmdbId && String(ep.series?.tmdbId) === String(tmdbId)) ||
        (tvdbId && String(ep.series?.tvdbId) === String(tvdbId))
      );
      if (ep?.series) series = ep.series;
    }
    if (series) {
      return {
        _type: 'sonarr', _localData: true,
        title: series.title,
        overview: series.overview || '',
        firstAirDate: series.firstAired || '',
        genres: (series.genres || []).map(g => typeof g === 'string' ? { name: g } : g),
        _localPosterUrl: this._getSonarrPoster(series),
        relatedVideos: [],
      };
    }
  }
  if (type === 'radarr') {
    const movie = this._radarr.find(m => tmdbId && String(m.tmdbId) === String(tmdbId));
    if (movie) {
      return {
        _type: 'radarr', _localData: true,
        title: movie.title,
        overview: movie.overview || '',
        releaseDate: movie.digitalRelease || movie.physicalRelease || movie.inCinemas || '',
        genres: (movie.genres || []).map(g => typeof g === 'string' ? { name: g } : g),
        _localPosterUrl: this._getRadarrPoster(movie),
        relatedVideos: [],
      };
    }
  }
  // Upcoming movie — only title available
  return { _type: type, _localData: true, title, overview: '', relatedVideos: [] };
}

// ─────────────────────────────────────────────
// Popup: render popup HTML into popup-root
// ─────────────────────────────────────────────

_renderPopupEl() {
  const root = this.shadowRoot.getElementById('popup-root');
  if (!root) return;

  if (!this._popup) {
    root.innerHTML = '';
    return;
  }

  // Preserve IS results scroll position across re-renders (desktop: .is-results-wrap, mobile: .popup-body)
  const prevIsWrap  = root.querySelector('.is-results-wrap');
  const prevBody    = root.querySelector('.popup-body');
  const savedIsScroll   = prevIsWrap ? prevIsWrap.scrollTop : 0;
  const savedBodyScroll = prevBody   ? prevBody.scrollTop   : 0;

  root.innerHTML = this._renderPopup();

  if (savedIsScroll > 0) {
    const newIsWrap = root.querySelector('.is-results-wrap');
    if (newIsWrap) newIsWrap.scrollTop = savedIsScroll;
  }
  if (savedBodyScroll > 0) {
    const newBody = root.querySelector('.popup-body');
    if (newBody) newBody.scrollTop = savedBodyScroll;
  }

  // Wire close handlers
  const overlay = root.querySelector('.popup-overlay');
  const glass   = root.querySelector('.popup-glass');
  const closeBtn = root.querySelector('.popup-close');

  if (overlay) {
    overlay.addEventListener('click', () => {
      this._popup = null;
      this._renderPopupEl();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      this._popup = null;
      this._isState = null;
      this._renderPopupEl();
    });
  }

  // ── Jeden click handler na glass: stopPropagation + event delegation ──
  if (glass) glass.addEventListener('click', e => {
    e.stopPropagation();
    const t = e.target.closest('[data-action],[data-isfilter],[data-snisfilter],[data-grab],[data-sngrab],[data-guid]');
    if (!t) return;

    // Radarr IS toggle
    if (t.dataset.action === 'is-toggle') {
      if (this._isState) {
        this._isState = null;
      } else if (this._popup._type === 'movie' && !this._popup._radarrId) {
        // Film není v Radarru — ukáž potvrzení před přidáním
        this._isState = 'confirm-add';
      } else {
        this._fetchInteractiveSearch(this._popup._radarrId);
      }
      this._renderPopupEl();
      return;
    }

    // IS confirm
    if (t.dataset.action === 'is-confirm-yes') {
      this._fetchInteractiveSearch(this._popup._radarrId);
      return;
    }
    if (t.dataset.action === 'is-confirm-no') {
      this._isState = null;
      this._renderPopupEl();
      return;
    }

    // Radarr IS filter
    if (t.dataset.isfilter !== undefined) {
      this._isFilter = t.dataset.isfilter;
      this._renderPopupEl();
      return;
    }

    // Radarr grab
    if (t.dataset.grab !== undefined) {
      this._grabRelease(t.dataset.grab, parseInt(t.dataset.indexerid));
      return;
    }

    // Sonarr IS toggle (seasons panel)
    if (t.dataset.action === 'sn-is-toggle') {
      console.log('[sn-is] sonarrSeries:', this._popup._sonarrSeries, 'type:', this._popup._type);
      this._snIsOpen = !this._snIsOpen;
      this._snActiveIs = null;
      this._snIsState = null;
      this._renderPopupEl();
      return;
    }

    // Sonarr season expand/collapse
    if (t.dataset.action === 'sn-season-toggle') {
      const n = parseInt(t.dataset.season);
      if (this._snExpandedSeasons.has(n)) {
        // Toggle off — sbalit
        this._snExpandedSeasons.delete(n);
      } else {
        // Otevřít — sbalit ostatní sezóny + zavřít IS panel
        this._snExpandedSeasons.clear();
        this._snExpandedSeasons.add(n);
        this._snActiveIs = null;
        this._snIsState = null;
        // Lazy-load episodes if not yet fetched
        if (!this._snEpisodes.has(n)) {
          const sid = this._popup._sonarrSeries?.id;
          if (sid) this._fetchSonarrEpisodes(sid, n);
        }
      }
      this._renderPopupEl();
      return;
    }

    // Sonarr season IS
    if (t.dataset.action === 'sn-season-is') {
      const n = parseInt(t.dataset.season);
      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      if (this._snActiveIs?.type === 'season' && this._snActiveIs?.key === n) {
        // Toggle off
        this._snActiveIs = null;
        this._snIsState = null;
      } else {
        this._snActiveIs = { type: 'season', key: n };
        // Sbalit epizody — IS panel a episode list se navzájem vylučují
        this._snExpandedSeasons.clear();
        const sid = this._popup._sonarrSeries?.id;
        if (sid) {
          if (isMobile) {
            this._renderPopupEl();
            this._fetchSonarrSeasonIS(sid, n);
          } else {
            this._fetchSonarrSeasonIS(sid, n);
          }
        }
      }
      this._renderPopupEl();
      return;
    }

    // Sonarr episode IS
    if (t.dataset.action === 'sn-ep-is') {
      const epId = parseInt(t.dataset.epid);
      const seasonN = parseInt(t.dataset.season);
      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      if (this._snActiveIs?.type === 'episode' && this._snActiveIs?.key === epId) {
        this._snActiveIs = null;
        this._snIsState = null;
      } else {
        // Find episode label for drill-down
        const eps = this._snEpisodes.get(seasonN) || [];
        const ep = eps.find(e => e.id === epId);
        this._snActiveIs = {
          type: 'episode', key: epId,
          seasonNumber: seasonN,
          epNum: ep?.episodeNumber ?? 0,
          label: ep?.title || '',
        };
        const sid = this._popup._sonarrSeries?.id;
        if (sid) {
          if (isMobile) {
            this._renderPopupEl();
            this._fetchSonarrEpIS(epId, sid);
          } else {
            this._fetchSonarrEpIS(epId, sid);
          }
        }
      }
      this._renderPopupEl();
      return;
    }

    // Sonarr IS filter
    if (t.dataset.snisfilter !== undefined) {
      this._snIsFilter = t.dataset.snisfilter;
      this._renderPopupEl();
      return;
    }

    // Sonarr grab
    if (t.dataset.sngrab !== undefined) {
      this._sonarrGrab(t.dataset.sngrab, parseInt(t.dataset.indexerid));
      return;
    }

    // Sonarr back (mobile drill-down)
    if (t.dataset.action === 'sn-back') {
      this._snActiveIs = null;
      this._snIsState = null;
      this._renderPopupEl();
      return;
    }

    // Remove from library — show confirm
    if (t.dataset.action === 'remove-confirm') {
      this._removeConfirm = 'choose';
      this._renderPopupEl();
      return;
    }
    if (t.dataset.action === 'remove-choose-lib') {
      this._removeFromLibrary(false);
      return;
    }
    if (t.dataset.action === 'remove-choose-disc') {
      this._removeFromLibrary(true);
      return;
    }
    if (t.dataset.action === 'remove-no') {
      this._removeConfirm = false;
      this._renderPopupEl();
      return;
    }
    if (t.dataset.action === 'remove-yes') {
      this._removeFromLibrary(t.dataset.files === 'true');
      return;
    }
  });
}

_renderPopup() {
  const d = this._popup;
  if (!d) return '';

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

  // Full detail (Overseerr data OR local fallback)
  const title    = this._escHtml(d.title || d.name || '');
  const year     = d.releaseDate ? d.releaseDate.slice(0, 4) : (d.firstAirDate ? d.firstAirDate.slice(0, 4) : '');
  const genres   = (d.genres || []).map(g => this._escHtml(g.name || '')).filter(Boolean).join(' · ');
  const rating   = d.voteAverage ? d.voteAverage.toFixed(1) : '';
  const overview = this._escHtml(d.overview || '');
  const subLine  = [year, genres, rating ? `⭐ ${rating}` : ''].filter(Boolean).join(' · ');

  // Images — prefer TMDB CDN paths, fall back to local Sonarr/Radarr URLs
  const backdropPath = d.backdropPath || null;
  const posterPath   = d.posterPath   || null;
  const backdropUrl  = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : '';
  const posterUrl    = posterPath
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
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

  // Interactive Search tlačítka — jen pro admina
  const isAdmin     = this._hass.user.is_admin;
  const isMovieType = d._type === 'radarr' || d._type === 'movie';
  const isSonarrType = d._type === 'sonarr' || d._type === 'tv';
  const isActive    = !!this._isState;
  const snIsActive  = this._snIsOpen;

  const personIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;

  const isOpenBtn = (isAdmin && isMovieType) ? `
    <button class="is-open-btn${isActive ? ' active' : ''}" data-action="is-toggle">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      Interactive Search
      <span class="is-admin-badge">admin</span>
    </button>` : '';

  const snIsOpenBtn = (isAdmin && isSonarrType) ? `
    <button class="is-open-btn${snIsActive ? ' active' : ''}" data-action="sn-is-toggle">
      ${personIconSvg}
      Interactive Search
      <span class="is-admin-badge">admin</span>
    </button>` : '';

  const trashSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
  const checkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const crossSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const canRemoveRadarr = isAdmin && (d._type === 'radarr' || d._type === 'movie') && d._radarrId;
  const canRemoveSonarr = isAdmin && (d._type === 'sonarr' || d._type === 'tv') && d._sonarrSeries?.id;

  const radarrEntry  = canRemoveRadarr ? (this._radarr || []).find(m => m.id === d._radarrId) : null;
  const sonarrEntry  = canRemoveSonarr ? (this._sonarr || []).find(s => s.id === d._sonarrSeries.id) : null;
  const hasFiles     = !!(radarrEntry?.hasFile || (sonarrEntry?.statistics?.episodeFileCount > 0));

  const removeLabel = canRemoveSonarr ? 'Remove Series' : 'Remove';
  const removeBtn = (canRemoveRadarr || canRemoveSonarr) ? (() => {
    const rc = this._removeConfirm;
    if (!rc) return `
      <button class="is-open-btn remove-lib-btn" data-action="remove-confirm">
        ${trashSvg} ${removeLabel}
        <span class="is-admin-badge">admin</span>
      </button>`;
    return `
      <div class="remove-confirm-row">
        <button class="is-open-btn remove-lib-btn" data-action="remove-choose-lib">${trashSvg} Remove from library</button>
        ${hasFiles ? `<button class="is-open-btn remove-disc-btn" data-action="remove-choose-disc">${trashSvg} Remove from disc</button>` : ''}
        <button class="remove-ic-btn remove-ic-no" data-action="remove-no">${crossSvg}</button>
      </div>`;
  })() : '';

  const dayClass  = this._isDaytime ? ' popup-day' : '';
  const wideClass = (isActive || snIsActive) ? ' is-wide' : '';

  return `
    <div class="popup-overlay${dayClass}">
      <div class="popup-glass${wideClass}">
        <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <div class="popup-backdrop" style="${backdropStyle}">
          <div class="popup-backdrop-fade"></div>
        </div>
        <div class="popup-body">
          <div class="popup-content">
            ${posterHtml}
            <div class="popup-meta">
              <h2 class="popup-title">${title}</h2>
              ${subLine ? `<div class="popup-sub">${subLine}</div>` : ''}
              ${overview ? `<p class="popup-overview">${overview}</p>` : `<p class="popup-overview" style="color:rgba(255,255,255,0.35);font-style:italic">${this._t('noDescription')}</p>`}
              ${isOpenBtn}
              ${snIsOpenBtn}
              ${removeBtn}
            </div>
          </div>
          ${(isActive || snIsActive) ? '' : trailerHtml}
          ${isActive ? this._renderIsPanel() : ''}
          ${snIsActive ? this._renderSonarrIsSection() : ''}
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// Interactive Search — panel HTML
// ─────────────────────────────────────────────

async _removeFromLibrary(deleteFiles = false) {
  const d = this._popup;
  if (!d) return;
  const df = deleteFiles ? 'true' : 'false';
  try {
    if ((d._type === 'radarr' || d._type === 'movie') && d._radarrId) {
      await this._hass.callApi('DELETE', `arr_stack/radarr/movie/${d._radarrId}?deleteFiles=${df}`);
      this._radarr = (this._radarr || []).filter(m => m.id !== d._radarrId);
    } else if ((d._type === 'sonarr' || d._type === 'tv') && d._sonarrSeries?.id) {
      await this._hass.callApi('DELETE', `arr_stack/sonarr/series/${d._sonarrSeries.id}?deleteFiles=${df}`);
      this._sonarr = (this._sonarr || []).filter(s => s.id !== d._sonarrSeries.id);
    }
  } catch (e) {
    console.error('[ArrStack] Remove failed:', e);
  }
  // Close popup + refresh data from APIs
  this._popup = null;
  this._removeConfirm = false;
  this._render();
  this._fetchAll();
}

}

export const popupMixin = _PopupMethods.prototype;
