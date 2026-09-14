import { POPUP_TYPE } from '../constants.js';

// Opening the detail: finding the title in each library, fetching it, what to show when that fails, and going back to where it was opened from.

class _PopupOpenMethods {

// Puts the user back wherever the popup was opened from — the Library modal, a
// Maintainerr tab, or the calendar — instead of the bare category list. Assumes
// `this._popup` is already cleared. Returns false when the popup was opened
// straight from a category and there is nothing to return to.
_popupReturn() {
  if (this._calReturnState) {
    this._calReturnState    = false;
    this._calendarModalOpen = true;
    this._renderPopupEl();
    this._renderCalendarModalEl();
    return true;
  }
  if (this._mtReturnState) {
    const saved = this._mtReturnState;
    this._mtReturnState = null;
    this._renderPopupEl();
    // Modal creation is async — restore the cached page once it exists so
    // going back does not refetch the library
    Promise.resolve(this._openMaintainerrModal(saved.tab)).then(() => {
      const mm = this._maintainerrModal;
      if (!mm) return;
      // Restore the exact view, including an open collection, so going back
      // does not dump the user on the collection list
      if (saved.overview)  mm.overview  = saved.overview;
      if (saved.colDetail) mm.colDetail = saved.colDetail;
      if (saved.colSubTab) mm.colSubTab = saved.colSubTab;
      if (saved.cal)       mm.cal       = saved.cal;
      this._mtLoadTab(saved.tab, this.shadowRoot.querySelector('[data-mt-modal]'));
    });
    return true;
  }
  if (this._libReturnState) {
    const saved = this._libReturnState;
    this._libReturnState = null;
    this._renderPopupEl();
    this._openLibModal(
      ['movies', 'tv', 'music'].includes(saved.typeKey) ? saved.typeKey : (saved.qualityKey || 'all')
    );
    const m = this._libModal;
    if (m) {
      m.typeKey    = saved.typeKey;
      m.qualityKey = saved.qualityKey;
      m.instFilter = saved.instFilter;
      m.search     = saved.search;
      m.sort       = saved.sort;
      m.sortDir    = saved.sortDir;
      m.view       = saved.view;
      m.filter     = saved.filter;
      m.page       = saved.page;
      const libEl = this.shadowRoot.querySelector('[data-lib-modal]');
      const bodyEl = libEl?.querySelector('#lib-body');
      if (bodyEl?.clientHeight > 0) {
        m._bodyH = bodyEl.clientHeight;
        bodyEl.innerHTML = this._libBodyHtml();
        this._wireLibModalBody(libEl);
      }
    }
    return true;
  }
  return false;
}

async _openPopup(type, tmdbId, tvdbId, title, radarrId = null, radarr2IdHint = null) {
  if (this._calendarModalOpen) {
    this._calReturnState    = true;
    this._calendarModalOpen = false;
    this._renderCalendarModalEl();
  }
  // Warm the cast device list so its drawer opens filled rather than spinning
  if (this._plexConfigured !== false) {
    this._fetchPlexClients({ silent: true, maxAge: 30000 });
  }

  // Quick actions may need to tell two same-named Maintainerr collections apart.
  // Fetched now, while the popup is still assembling, so the menu is complete
  // the moment it opens — a later arrival would have to redraw it.
  if (!this._maintainerrArrServers && this._maintainerrConfigured !== false) {
    this._mtLoadArrServers();
  }

  // Reset Radarr IS state
  this._isState    = null;
  this._isInstance = 'radarr'; // 'radarr' | 'radarr2'
  this._isResults  = [];
  this._isFilters  = { protocol: '', indexer: '', quality: '', lang: '' };
  this._isSort     = { col: null, dir: 1 };
  this._isPage     = 0;
  this._isPerPage  = 8;
  this._isGrabbing = null;
  this._isGrabbed  = new Set();
  this._isHistory  = {};
  this._isError    = null;

  // Reset remove confirm state
  this._removeConfirm = false;
  this._removeInstance = null;

  // Reset Sonarr IS state
  this._snIsInstance = 'sonarr'; // 'sonarr' | 'sonarr2'
  this._snIsOpen         = false;
  this._snExpandedSeasons = new Set();
  this._snEpisodes       = new Map();
  this._snActiveIs       = null;
  this._snIsState        = null;
  this._snIsResults      = [];
  this._snIsError        = null;
  this._snIsFilter       = 'all';
  this._snIsFilters      = { protocol: '', indexer: '', quality: '', lang: '' };
  this._snIsSort         = { col: null, dir: 1 };
  this._snIsGrabbing     = null;
  this._snIsGrabbed      = new Set();
  this._snIsHistory      = {};
  this._snSeasonsPage    = 0;

  // Reset Auto Search + unified search button state
  this._searchExpand     = null;
  this._searchPickInst   = null; // selected instance in dual pick-mode
  this._asOpen           = false;
  this._asInstance       = null;
  this._asState          = null;
  this._asError          = null;
  this._asMovieSearching = false;
  this._asMovieSearched  = false;
  this._asSearchingItems = new Set();
  this._asSearchedItems  = new Set();

  // Najdi Radarr interní ID (Radarr 1 i Radarr 2)
  let _radarrId  = null;
  let _radarr2Id = null;
  if ((type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE) && (radarrId || radarr2IdHint || tmdbId)) {
    // radarr2IdHint: explicitně předáno z data-radarr2id (Radarr 2 karta) → nepoužívat jako R1 ID
    if (!radarr2IdHint) {
      _radarrId = radarrId ?? (this._radarr || []).find(m => String(m.tmdbId) === String(tmdbId))?.id ?? null;
    }
    _radarr2Id = radarr2IdHint
      ?? (tmdbId ? (this._radarr2ByTmdb?.get(String(tmdbId))?.id ?? null) : null);
  }

  // Najdi Sonarr series (potřebné pro IS + seasons data)
  let _sonarrSeries  = null;
  let _sonarr2Series = null;
  if ((type === POPUP_TYPE.SONARR || type === POPUP_TYPE.TV) && (tvdbId || tmdbId)) {
    const sonarrPool = (this._sonarrAll || this._sonarr || []);
    _sonarrSeries = sonarrPool.find(s =>
      (tvdbId && String(s.tvdbId) === String(tvdbId)) ||
      (tmdbId && String(s.tmdbId) === String(tmdbId))
    ) ?? null;
    if (this._sonarr2Configured) {
      _sonarr2Series = (this._sonarr2 || []).find(s =>
        (tvdbId && String(s.tvdbId) === String(tvdbId)) ||
        (tmdbId && String(s.tmdbId) === String(tmdbId))
      ) ?? null;
    }
  }

  // Show loading state immediately
  this._popupMonExpand = false;
  this._popupMonBusy   = null;
  this._popupMonAddInst = null;
  this._popupMonAddBusy = null;
  this._popupMonAddSearch = null;
  this._popupCastOpen  = false;
  this._popupCastPage  = 0;
  this._popup = { _loading: true, title, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series };
  this._renderPopupEl();

  // Without Overseerr — skip API fetch, use local Radarr/Sonarr data directly
  if (this._overseerrConfigured === false) {
    const local = this._localFallbackData(type, tmdbId, tvdbId, title);
    const _popId   = tmdbId ? parseInt(tmdbId) : undefined;
    const _popTvdb = tvdbId ? parseInt(tvdbId) : undefined;
    this._popup = local
      ? { ...local, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb }
      : { title, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb };
    this._renderPopupEl();
    // Async TMDB detail fetch for trailer + richer data (fire-and-forget enrich)
    if (tmdbId) {
      const isMovie = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
      const tmdbPath = isMovie ? `arr_stack/tmdb/movie/${tmdbId}` : `arr_stack/tmdb/tv/${tmdbId}`;
      this._callApi('GET', tmdbPath).then(detail => {
        if (!this._popup || this._popup._type !== type) return; // popup already closed/changed
        const prev = this._popup;
        this._popup = {
          ...prev,
          overview:        detail.overview   || prev.overview   || '',
          posterPath:      detail.posterPath  || prev.posterPath  || null,
          backdropPath:    detail.backdropPath || prev.backdropPath || null,
          voteAverage:     detail.voteAverage || prev.voteAverage || 0,
          genres:          detail.genres?.length ? detail.genres : (prev.genres || []),
          releaseDate:     detail.releaseDate  || prev.releaseDate  || '',
          firstAirDate:    detail.firstAirDate || prev.firstAirDate || '',
          numberOfSeasons: detail.numberOfSeasons || prev.numberOfSeasons || 0,
          credits:         detail.credits?.cast?.length ? detail.credits : (prev.credits || null),
          certifications:  detail.certifications?.length ? detail.certifications : (prev.certifications || []),
          relatedVideos:   detail.youTubeTrailerId
            ? [{ site: 'YouTube', type: 'Trailer', key: detail.youTubeTrailerId }]
            : (prev.relatedVideos || []),
        };
        this._renderPopupEl();
      }).catch(() => {}); // silently ignore if TMDB fetch fails
    }
    return;
  }

  try {
    let apiPath = '';
    // Fallback: if tmdbId missing but sonarr series found, use its tmdbId
    if (!tmdbId && (type === POPUP_TYPE.SONARR || type === POPUP_TYPE.TV)) {
      const fallbackTmdb = _sonarrSeries?.tmdbId || _sonarr2Series?.tmdbId;
      if (fallbackTmdb) tmdbId = String(fallbackTmdb);
    }
    if (type === POPUP_TYPE.TV && tmdbId) {
      apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
    } else if (type === POPUP_TYPE.SONARR && tmdbId) {
      apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
    } else if ((type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE) && tmdbId) {
      apiPath = `arr_stack/overseerr/movie/${tmdbId}`;
    } else {
      // No TMDB ID available — use local data directly
      const local = this._localFallbackData(type, tmdbId, tvdbId, title);
      const _popId   = tmdbId ? parseInt(tmdbId) : undefined;
      const _popTvdb = tvdbId ? parseInt(tvdbId) : undefined;
      this._popup = local
        ? { ...local, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb }
        : { title, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb };
      this._renderPopupEl();
      return;
    }

    const data = await this._hass.callApi('GET', apiPath);
    // tvUpcoming cards only carry tmdbId — retry Sonarr lookup using tvdbId from Overseerr detail
    if ((type === POPUP_TYPE.TV || type === POPUP_TYPE.SONARR) && !_sonarrSeries && data.externalIds?.tvdbId) {
      const tvdbFromDetail = String(data.externalIds.tvdbId);
      let sonarrPool = (this._sonarrAll || this._sonarr || []);
      _sonarrSeries = sonarrPool.find(s => String(s.tvdbId) === tvdbFromDetail) ?? null;
      // Not in cache — refresh and retry
      if (!_sonarrSeries) {
        await this._fetchSonarr();
        sonarrPool = (this._sonarrAll || this._sonarr || []);
        _sonarrSeries = sonarrPool.find(s => String(s.tvdbId) === tvdbFromDetail) ?? null;
      }
    }
    this._popup = { ...data, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series };
    // Rotten Tomatoes ratings z Overseerr (fire-and-forget) — seriály vždy, filmy jen mimo Radarr
    {
      const _isMovieRt = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
      if (tmdbId && (!_isMovieRt || !_radarrId) && this._overseerrConfigured !== false) {
        const _rtPath = _isMovieRt ? `arr_stack/overseerr/movie/${tmdbId}/ratings` : `arr_stack/overseerr/tv/${tmdbId}/ratings`;
        this._callApi('GET', _rtPath).then(rt => {
          if (this._popup && this._popup._type === type) {
            this._popup._rtRatings = rt;
            this._renderPopupEl();
          }
        }).catch(() => {});
      }
    }
    // Fetch sonarr queue for download indicators (fire-and-forget)
    if (_sonarrSeries || type === POPUP_TYPE.TV || type === POPUP_TYPE.SONARR) {
      this._fetchSonarrQueue('sonarr').then(() => this._renderPopupEl());
      if (this._sonarr2Configured !== false)
        this._fetchSonarrQueue('sonarr2').then(() => this._renderPopupEl());
    }
    // Overseerr's own detail endpoint already proxies TMDB — asking TMDB again
    // for the same id only re-introduced the dependency we are removing. This
    // enrich now runs against Overseerr, and only when its first answer was thin.
    if (tmdbId && (!data.overview || !data.relatedVideos?.length)) {
      const _isMovie = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
      const _tmdbPath = _isMovie ? `arr_stack/overseerr/movie/${tmdbId}` : `arr_stack/overseerr/tv/${tmdbId}`;
      this._callApi('GET', _tmdbPath).then(detail => {
        if (!this._popup || this._popup._type !== type) return;
        const prev = this._popup;
        this._popup = {
          ...prev,
          overview:        detail.overview        || prev.overview        || '',
          posterPath:      detail.posterPath       || prev.posterPath      || null,
          backdropPath:    detail.backdropPath     || prev.backdropPath    || null,
          voteAverage:     detail.voteAverage      || prev.voteAverage     || 0,
          genres:          detail.genres?.length   ? detail.genres         : (prev.genres || []),
          releaseDate:     detail.releaseDate      || prev.releaseDate     || '',
          firstAirDate:    detail.firstAirDate     || prev.firstAirDate    || '',
          numberOfSeasons: detail.numberOfSeasons  || prev.numberOfSeasons || 0,
          relatedVideos:   detail.youTubeTrailerId
            ? [{ site: 'YouTube', type: 'Trailer', key: detail.youTubeTrailerId }]
            : (prev.relatedVideos || []),
        };
        this._renderPopupEl();
      }).catch(() => {});
    }
  } catch (e) {
    console.error('[arr-card] popup fetch error:', e);
    const local = this._localFallbackData(type, tmdbId, tvdbId, title);
    const _popId   = tmdbId ? parseInt(tmdbId) : undefined;
    const _popTvdb = tvdbId ? parseInt(tvdbId) : undefined;
    this._popup = local
      ? { ...local, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb }
      : { title, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, _error: e.message, id: _popId, _tvdbId: _popTvdb };
    // Overseerr failed — enrich from TMDB (fire-and-forget)
    if (tmdbId) {
      const _isMovie = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
      const _tmdbPath = _isMovie ? `arr_stack/tmdb/movie/${tmdbId}` : `arr_stack/tmdb/tv/${tmdbId}`;
      const _snapType = type;
      this._callApi('GET', _tmdbPath).then(detail => {
        if (!this._popup || this._popup._type !== _snapType) return;
        const prev = this._popup;
        this._popup = {
          ...prev,
          overview:     detail.overview     || prev.overview     || '',
          posterPath:   detail.posterPath   || prev.posterPath   || null,
          backdropPath: detail.backdropPath || prev.backdropPath || null,
          voteAverage:  detail.voteAverage  || prev.voteAverage  || 0,
          genres:       detail.genres?.length ? detail.genres : (prev.genres || []),
          releaseDate:  detail.releaseDate  || prev.releaseDate  || '',
          firstAirDate: detail.firstAirDate || prev.firstAirDate || '',
          numberOfSeasons: detail.numberOfSeasons || prev.numberOfSeasons || 0,
          credits:       detail.credits?.cast?.length ? detail.credits : (prev.credits || null),
          certifications:  detail.certifications?.length ? detail.certifications : (prev.certifications || []),
          relatedVideos: detail.youTubeTrailerId
            ? [{ site: 'YouTube', type: 'Trailer', key: detail.youTubeTrailerId }]
            : (prev.relatedVideos || []),
        };
        this._renderPopupEl();
      }).catch(() => {});
    }
  }
  this._renderPopupEl();
}

// Build popup data from local arrays when Overseerr is unavailable/fails
_localFallbackData(type, tmdbId, tvdbId, title) {
  if (type === POPUP_TYPE.TV) {
    // TV upcoming — hledej v _tvUpcoming podle TMDB ID
    const show = this._tvUpcoming?.find(m => String(m.id) === String(tmdbId))
              || (this._searchResults || []).find(m => m.mediaType === 'tv' && (
                   (tmdbId && String(m.id) === String(tmdbId)) ||
                   (tvdbId && String(m.tvdbId) === String(tvdbId))
                 ));
    if (show) return {
      _type: POPUP_TYPE.TV, _localData: true,
      title: show.name || show.originalName || title,
      overview: show.overview || '',
      firstAirDate: show.firstAirDate || '',
      genres: (show.genreIds || []).map(id => ({ name: String(id) })),
      ratings: show.ratings || {},
      images: show.images || [],
      _localPosterUrl: show.posterPath ? (show.posterPath.startsWith('http') ? show.posterPath : `https://image.tmdb.org/t/p/w342${show.posterPath}`) : null,
      relatedVideos: show.youTubeTrailerId ? [{ site: 'YouTube', type: 'Trailer', key: show.youTubeTrailerId }] : [],
    };
  }
  if (type === POPUP_TYPE.SONARR) {
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
      const fanart = series.images?.find(i => i.coverType === 'fanart')?.remoteUrl || null;
      return {
        _type: POPUP_TYPE.SONARR, _localData: true,
        title: series.title,
        overview: series.overview || '',
        firstAirDate: series.firstAired || '',
        genres: (series.genres || []).map(g => typeof g === 'string' ? { name: g } : g),
        certification: series.certification || '',
        voteAverage: series.ratings?.tmdb?.value || series.ratings?.imdb?.value || 0,
        _localPosterUrl: this._getSonarrPoster(series),
        _localBackdropUrl: fanart,
        relatedVideos: series.youTubeTrailerId
          ? [{ site: 'YouTube', type: 'Trailer', key: series.youTubeTrailerId }]
          : [],
      };
    }
  }
  if (type === POPUP_TYPE.RADARR) {
    const movie = this._radarr.find(m => tmdbId && String(m.tmdbId) === String(tmdbId));
    if (movie) {
      const fanart = movie.images?.find(i => i.coverType === 'fanart')?.remoteUrl || null;
      return {
        _type: POPUP_TYPE.RADARR, _localData: true,
        title: movie.title,
        overview: movie.overview || '',
        releaseDate: movie.digitalRelease || movie.physicalRelease || movie.inCinemas || '',
        genres: (movie.genres || []).map(g => typeof g === 'string' ? { name: g } : g),
        certification: movie.certification || '',
        voteAverage: movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0,
        _localPosterUrl: this._getRadarrPoster(movie),
        _localBackdropUrl: fanart,
        relatedVideos: movie.youTubeTrailerId
          ? [{ site: 'YouTube', type: 'Trailer', key: movie.youTubeTrailerId }]
          : [],
      };
    }
  }
  // Search result / discovery movie — hledej v _searchResults + _upcoming + _trending + _popular + _tvUpcoming
  if (type === POPUP_TYPE.MOVIE || type === POPUP_TYPE.TV) {
    const _allDiscover = [
      ...(this._searchResults || []),
      ...(this._upcoming     || []),
      ...(this._trending     || []),
      ...(this._popular      || []),
      ...(this._tvUpcoming   || []),
    ];
    const sr = _allDiscover.find(m =>
      (tmdbId && String(m.id) === String(tmdbId)) ||
      (tvdbId && m.tvdbId && String(m.tvdbId) === String(tvdbId))
    );
    if (sr) {
      const posterPath = sr.posterPath || null;
      return {
        _type: type, _localData: true,
        title: sr.title || sr.name || title,
        overview: sr.overview || '',
        releaseDate: sr.releaseDate || '',
        firstAirDate: sr.firstAirDate || '',
        genres: (sr.genres || []),
        ratings: sr.ratings || {},
        voteAverage: sr.voteAverage || 0,
        images: sr.images || [],
        _tvdbId: sr.tvdbId || null,
        _localPosterUrl: posterPath ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w342${posterPath}`) : null,
        relatedVideos: sr.youTubeTrailerId ? [{ site: 'YouTube', type: 'Trailer', key: sr.youTubeTrailerId }] : [],
      };
    }
  }
  // Upcoming movie — only title available
  return { _type: type, _localData: true, title, overview: '', relatedVideos: [] };
}

}

export const popupOpenMixin = _PopupOpenMethods.prototype;
