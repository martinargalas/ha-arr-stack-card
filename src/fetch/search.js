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

// `any`: asked whatever the main search's type is — Similar titles has its own
async _fetchSearchMusic(query, any = false) {
  if (any ? this._lidarrConfigured === false : !this._searchMusic) return [];
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

// The two legs answer at their own pace: films and series come back from Seerr
// in a few hundred ms, while the music asks Lidarr, which asks MusicBrainz, and
// that is allowed twenty seconds. Waiting for both before painting anything is
// what made a search sit there for seconds at a time — so what has arrived goes
// up, and the music is folded in when it lands. Each run carries a token: an
// answer for a query already typed past is dropped rather than painted over the
// newer one.
async _fetchSearch(query) {
  const tok = this._searchTok = (this._searchTok || 0) + 1;
  const stale = () => tok !== this._searchTok;
  this._searchLoading = true;
  const musicP = this._fetchSearchMusic(query).catch(() => []);
  // Narrowed to music, there is nothing for the film and series sources to say.
  if (this._searchType === 'music') {
    const only = await musicP;
    if (stale()) return;
    this._searchResults = only;
    this._searchLoading = false;
    this._reRenderSearchResults();
    return;
  }
  let media = [];
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
      media = merged;
    } else {
      const data = await this._callApi('POST', `arr_stack/${this._discoverSvc}/search`, { query });
      media = (data?.results || []).filter(r => r.mediaType === 'movie' || r.mediaType === 'tv');
    }
    const type = this._searchType;
    if (type === 'movie' || type === 'tv') media = media.filter(r => r.mediaType === type);
  } catch (e) {
    console.error('[arr-card] Search fetch error:', e);
  }
  if (stale()) return;
  // Only worth a paint of its own when it has something to show: an empty grid
  // here would read as "nothing found" while the music is still on its way.
  if (media.length) {
    this._searchResults = media;
    this._reRenderSearchResults();
  }
  const music = await musicP;
  if (stale()) return;
  this._searchResults = [...media, ...music];
  this._searchLoading = false;
  this._reRenderSearchResults();
}

}

export const fetchSearchMixin = _FetchSearchMethods.prototype;
