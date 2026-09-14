// Fetching for the main search. Split out of fetch/arr.js.

class _FetchSearchMethods {

get _searchType() {
  let v = 'all';
  try { v = localStorage.getItem('arr-search-type') || 'all'; } catch (_) {}
  if (v === 'music' && this._lidarrConfigured === false) return 'all';
  return ['all', 'movie', 'tv', 'music'].includes(v) ? v : 'all';
}

get _searchMusic() {
  const t = this._searchType;
  return this._lidarrConfigured !== false && (t === 'all' || t === 'music');
}

async _fetchSearchMusic(query) {
  if (!this._searchMusic) return [];
  const [byArtist, byAlbum] = await Promise.all([
    this._callApi('GET', `arr_stack/lidarr/lookup?term=${encodeURIComponent(query)}`).catch(() => []),
    this._callApi('GET', `arr_stack/lidarr/albumlookup?term=${encodeURIComponent(query)}`).catch(() => []),
  ]);
  const seen = new Set();
  const out = [];
  const push = (a, album) => {
    const key = a?.foreignArtistId || (a?.id ? `id:${a.id}` : null);
    if (!a?.artistName || !key || seen.has(key)) return;
    seen.add(key);
    // An album hit carries a thin copy of the artist — the library's own record
    // has the artwork and the counts on it.
    const full = a.id ? (this._lidarrArtists?.get(a.id) || a) : a;
    out.push({ id: a.id || null, mediaType: 'music', title: a.artistName, artist: full, viaAlbum: album || null });
  };
  for (const a of (Array.isArray(byArtist) ? byArtist : [])) push(a);
  for (const al of (Array.isArray(byAlbum) ? byAlbum : [])) push(al.artist, al.title);
  return out.slice(0, 8);
}

async _fetchSearch(query) {
  this._searchLoading = true;
  const musicP = this._fetchSearchMusic(query);
  // Narrowed to music, there is nothing for the film and series sources to say.
  if (this._searchType === 'music') {
    this._searchResults = await musicP.catch(() => []);
    this._searchLoading = false;
    this._reRenderSearchResults();
    return;
  }
  try {
    if (this._overseerrConfigured === false) {
      // Fallback: Radarr + Sonarr lookup, normalize to Overseerr-like format
      const [movieRaw, tvRaw] = await Promise.allSettled([
        this._callApi('GET', `arr_stack/radarr/lookup?term=${encodeURIComponent(query)}`),
        this._callApi('GET', `arr_stack/sonarr/lookup?term=${encodeURIComponent(query)}`),
      ]);
      const movies = (movieRaw.status === 'fulfilled' && Array.isArray(movieRaw.value) ? movieRaw.value : [])
        .filter(m => m.tmdbId)
        .map(m => ({
          id:              m.tmdbId,
          mediaType:       'movie',
          title:           m.title || '',
          posterPath:      m.remotePoster || null,
          overview:        m.overview   || '',
          releaseDate:     m.year ? `${m.year}-01-01` : '',
          genres:          (m.genres || []).map(g => typeof g === 'string' ? { name: g } : g),
          ratings:         m.ratings || {},
          voteAverage:     m.ratings?.tmdb?.value || m.ratings?.imdb?.value || 0,
          images:          m.images  || [],
          youTubeTrailerId: m.youTubeTrailerId || null,
          mediaInfo:       null,
        }));
      const shows = (tvRaw.status === 'fulfilled' && Array.isArray(tvRaw.value) ? tvRaw.value : [])
        .filter(s => s.tvdbId)
        .map(s => ({
          id:              s.tmdbId || null,
          tvdbId:          s.tvdbId,
          mediaType:       'tv',
          name:            s.title || '',
          posterPath:      s.remotePoster || null,
          overview:        s.overview    || '',
          firstAirDate:    s.year ? `${s.year}-01-01` : '',
          genres:          (s.genres || []).map(g => typeof g === 'string' ? { name: g } : g),
          ratings:         s.ratings || {},
          voteAverage:     s.ratings?.tmdb?.value || s.ratings?.imdb?.value || s.ratings?.value || 0,
          images:          s.images  || [],
          youTubeTrailerId: s.youTubeTrailerId || null,
          mediaInfo:       null,
        }));
      // Interleave movies + shows (zip) so results feel mixed
      const merged = [];
      const max = Math.max(movies.length, shows.length);
      for (let i = 0; i < max; i++) {
        if (movies[i]) merged.push(movies[i]);
        if (shows[i])  merged.push(shows[i]);
      }
      this._searchResults = merged;
    } else {
      const data = await this._callApi('POST', `arr_stack/${this._discoverSvc}/search`, { query });
      this._searchResults = (data?.results || []).filter(r => r.mediaType === 'movie' || r.mediaType === 'tv');
    }
    const type = this._searchType;
    if (type === 'movie' || type === 'tv') {
      this._searchResults = this._searchResults.filter(r => r.mediaType === type);
    }
    this._searchResults = [...this._searchResults, ...(await musicP)];
  } catch (e) {
    this._searchResults = await musicP.catch(() => []);
    console.error('[arr-card] Search fetch error:', e);
  }
  this._searchLoading = false;
  this._reRenderSearchResults();
}

}

export const fetchSearchMixin = _FetchSearchMethods.prototype;
