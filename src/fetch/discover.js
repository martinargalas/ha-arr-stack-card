import { BP, maxWidth } from '../shared/ui.js';

// Fetching for Discover rows: trending, popular, upcoming, Trakt and SuggestArr. Split out of fetch/arr.js.

class _FetchDiscoverMethods {

// Returns discover service prefix — 'overseerr' when configured, 'tmdb' as fallback
get _discoverSvc() {
  return this._overseerrConfigured === false ? 'tmdb' : 'overseerr';
}

async _fetchOverseerr() {
  if (this._overseerrConfigured === null) return;
  const now = Date.now();
  if (now - (this._discoverLastFetch['upcoming'] || 0) < 600_000) return;
  try {
    const svc = this._discoverSvc;
    const [d1, d2] = await Promise.all([
      this._callApi('GET', `arr_stack/${svc}/upcoming?page=1`),
      this._callApi('GET', `arr_stack/${svc}/upcoming?page=2`).catch(() => ({ results: [] })),
    ]);
    this._upcoming = [...(d1.results || []), ...(d2.results || [])];
    this._upcomingError = null;
    this._discoverLastFetch['upcoming'] = now;
  } catch (e) {
    this._upcomingError = e.message;
    console.error('[arr-card] Upcoming fetch error:', e);
  }
}

// Společný helper pro stránkované fetche (trending/popular/tvUpcoming)
async _fetchOverseerrPaged(endpoint, dataKey, section) {
  if (this._overseerrConfigured === null) return;
  const now = Date.now();
  if (now - (this._discoverLastFetch[section] || 0) < 600_000) return;
  try {
    const svc = this._discoverSvc;
    const [d1, d2] = await Promise.all([
      this._callApi('GET', `arr_stack/${svc}/${endpoint}?page=1`),
      this._callApi('GET', `arr_stack/${svc}/${endpoint}?page=2`).catch(() => ({ results: [] })),
    ]);
    this[dataKey] = [...(d1.results || []), ...(d2.results || [])];
    this._overlayApiTotalPages[section] = d1.totalPages || 1;
    this._overlayApiPage[section] = 2;
    this._discoverLastFetch[section] = now;
  } catch (e) {
    console.error(`[arr-card] ${section} fetch error:`, e);
  }
}

async _fetchTrending() {
  await this._fetchOverseerrPaged('trending', '_trending', 'trending');
  // Reset overlay stránky pokud je mimo rozsah
  if (this._overlay?.section === 'trending') {
    const isMobile = maxWidth(BP.PHONE_S);
    const rows     = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
    const perPage  = isMobile ? rows * 2 : rows * 4;
    const maxPage  = Math.max(0, Math.ceil(this._trending.length / perPage) - 1);
    if (this._overlay.page > maxPage) this._overlay.page = 0;
  }
}

// Proaktivně načte další API stránky na pozadí, pokud overlay nemá dost dat
async _proactiveSectionLoad(section) {
  const cfg = this._getSectionOverlayConfig(section);
  if (!cfg?.apiEndpoint) return;
  const isMobile = maxWidth(BP.PHONE_S);
  const rows     = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
  const perPage  = isMobile ? rows * 2 : rows * 4;
  // Načítáme, dokud nemáme aspoň 2 plné stránky overlaye nebo dojdou API stránky
  while (
    this._overlay?.section === section &&
    ((cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || []).length < perPage * 2 &&
    (this._overlayApiPage[section] || 0) < (this._overlayApiTotalPages[section] || 1)
  ) {
    try {
      const nextApiPage = (this._overlayApiPage[section] || 0) + 1;
      const data = await this._callApi('GET', `arr_stack/${cfg.apiEndpoint}?page=${nextApiPage}`);
      this[cfg.dataKey] = [...((cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || []), ...(data.results || [])];
      this._overlayApiTotalPages[section] = data.totalPages || this._overlayApiTotalPages[section] || 1;
      this._overlayApiPage[section] = nextApiPage;
      this._reRenderSection(section);
    } catch (err) {
      console.error(`[arr-card] ${section} proactive load error:`, err);
      break;
    }
  }
}

async _fetchPopular() {
  await this._fetchOverseerrPaged('popular', '_popular', 'popular');
}

_traktInterleave(arr) {
  const movies = arr.filter(m => m.mediaType === 'movie');
  const shows  = arr.filter(m => m.mediaType === 'tv');
  const result = [];
  let mi = 0, si = 0;
  while (mi < movies.length || si < shows.length) {
    if (mi < movies.length) result.push(movies[mi++]);
    if (si < shows.length)  result.push(shows[si++]);
  }
  return result;
}

async _fetchTrakt() {
  try {
    const data = await this._callApi('GET', 'arr_stack/trakt/recommendations?limit=40');
    if (Array.isArray(data)) {
      const filtered = this._traktWatching?.size
        ? data.filter(m => !this._traktWatching.has(m._traktSlug || String(m.id)))
        : data;
      this._trakt = this._traktInterleave(filtered);
    }
  } catch (e) {
    if (e?.status === 503) {
      this._traktConfigured = false;
    } else {
      console.warn('[arr-card] Trakt fetch error:', e);
    }
  }
}

// SuggestArr keeps the state (blacklist, what is still pending) — the card only
// reads what is waiting for a decision.
async _fetchSuggestArr() {
  try {
    const data = await this._callApi('GET', 'arr_stack/suggestarr/suggestions?per_page=40');
    const items = (data?.items || []).map(it => {
      // `name` in the response is the discover job ("Automatic Recommendations"),
      // not the show — SuggestArr joins discover_jobs into the same flat row. The
      // media title only ever lives in `title`, so feed both card fields from it.
      const mediaTitle = it.title || '';
      const isTv       = (it.media_type || it.mediaType || 'movie') === 'tv';
      // One metadata table for both kinds, so the date arrives in release_date
      // whether it is a premiere or a first air date.
      const date = it.release_date || it.releaseDate || '';
      // SuggestArr hands the TMDB id back as a string. Every consumer — the
      // request button, the Radarr and Sonarr library lookups — compares it
      // strictly against a number, so it has to be one here.
      const tmdbId = Number(it.tmdb_id ?? it.tmdbId ?? it.id);
      return {
        id:           tmdbId,
        _saId:        it.id,
        mediaType:    isTv ? 'tv' : 'movie',
        title:        mediaTitle,
        name:         mediaTitle,
        posterPath:   it.poster_path || it.posterPath || null,
        backdropPath: it.backdrop_path || it.backdropPath || null,
        overview:     it.overview || '',
        releaseDate:  isTv ? '' : date,
        firstAirDate: isTv ? (it.first_air_date || it.firstAirDate || date) : '',
        voteAverage:  it.vote_average ?? it.voteAverage ?? it.rating ?? 0,
      };
    }).filter(m => Number.isFinite(m.id) && m.id > 0);
    // Same deal as Trakt: alternate movie, show, movie, show so a row is never
    // all one kind.
    this._suggestarr = this._traktInterleave(items);
    // Baseline for the auto-refresh: only grows, so clearing the row is what
    // eventually trips it rather than a shrinking target chasing itself down.
    if (items.length > this._suggestarrBaseline) this._suggestarrBaseline = items.length;
    // A run only counts as finished once the row actually grew. Clearing the
    // flag on any non-empty result stopped the poll chain after its first tick,
    // because a partly cleared row still has leftovers waiting for a decision.
    if (this._suggestarrRefreshing) {
      if (items.length > this._suggestarrPendingFrom) this._suggestarrRefreshing = false;
    } else if (items.length) {
      this._suggestarrPendingFrom = 0;
    }
  } catch (e) {
    if (e?.status === 503) this._suggestarrConfigured = false;
    else console.warn('[arr-card] SuggestArr fetch error:', e);
  }
}

async _fetchTvUpcoming() {
  await this._fetchOverseerrPaged('tv_upcoming', '_tvUpcoming', 'tvUpcoming');
}

}

export const fetchDiscoverMixin = _FetchDiscoverMethods.prototype;
