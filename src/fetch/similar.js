import { genreFamily, TV_COMPARABLE } from '../shared/genres.js';

// Similar titles: what the card's sources say is like one title. Films and
// series go by what they are about — the TMDB keywords they share, asked of
// Seerr or of TMDB, for films and series both — with Seerr's or TMDB's Similar,
// Trakt's related titles and Recommendations filling in; artists go to Last.fm.

// How much each list counts. The keyword match is the point of the feature;
// the others only add to it, and Recommendations ("people who liked this also
// liked") least, being about taste rather than about the film.
const SIM_WEIGHT = { byKeyword: 1, similar: 0.6, trakt: 0.5, recommendations: 0.35, soundtrack: 0.9 };

class _SimilarFetchMethods {

  // Titles to start from, found the way the main search finds them but kept
  // apart from its results, which the right column is still showing. Every
  // kind is asked; the header's type narrows what is shown, not what is asked.
  async _simFetchSeeds(query) {
    const svc = this._overseerrConfigured === false ? 'tmdb' : 'overseerr';
    const [media, music] = await Promise.all([
      this._simMediaOn()
        ? this._callApi('POST', `arr_stack/${svc}/search`, { query })
            .then(d => (d?.results || []).filter(r => (r.mediaType === 'movie' || r.mediaType === 'tv') && r.id))
            .catch(() => [])
        : [],
      this._fetchSearchMusic(query, true).catch(() => []),
    ]);
    // Kept where the preview window looks an artist up (_musUnownedArtist)
    this._simKeepArtists(music.map(r => r.artist));
    return [...media, ...music];
  }

  _simKeepArtists(records) {
    this._simArtists = this._simArtists || new Map();
    for (const a of records) if (a?.foreignArtistId) this._simArtists.set(String(a.foreignArtistId).toLowerCase(), a);
  }

  // One list from every source that answered, best first. A title scores in
  // each list by its rank there times the list's weight, and no single rank is
  // worth two, so one that two lists both rank well rises above the first pick
  // of either alone. The title asked about is dropped.
  _simMerge(lists, seedKey) {
    const byKey = new Map();
    for (const { src, items, weight = 1 } of lists) {
      const n = items.length + 1;
      items.forEach((it, i) => {
        const key = `${it.mediaType}:${it.id}`;
        if (!it.id || key === seedKey) return;
        const e = byKey.get(key) || { ...it, _simSrc: [], _simScore: 0 };
        if (!e.posterPath && it.posterPath) e.posterPath = it.posterPath;
        if (!e.tvdbId && it.tvdbId) e.tvdbId = it.tvdbId;
        if (!e.genreIds?.length && it.genreIds?.length) e.genreIds = it.genreIds;
        if (!e._simSrc.includes(src)) e._simSrc.push(src);
        e._simScore += weight * (1 - i / n);
        byKey.set(key, e);
      });
    }
    return [...byKey.values()].sort((a, b) => b._simScore - a._simScore);
  }

  // Where each artist comes from, as the Music windows learn it: MusicBrainz,
  // twenty to a request, remembered in the same map
  async _simOrigins(mbids) {
    this._musOriginMap = this._musOriginMap || new Map();
    const ids = [...new Set(mbids.map(m => String(m).toLowerCase()))];
    const missing = ids.filter(id => !this._musOriginMap.has(id));
    for (let i = 0; i < missing.length; i += 20) {
      const batch = missing.slice(i, i + 20);
      const r = await this._callApi('GET', `arr_stack/lidarr/origins?mbids=${batch.join(',')}`).catch(() => null);
      batch.forEach(id => this._musOriginMap.set(id, r?.[id] ?? null));
    }
    return this._musOriginMap;
  }

  // `kw` is the keywords the user left switched on (null lets the proxy pick),
  // `since`/`until` the years the keyword matches fall in, `country` where
  // every title must come from. Films and series are both asked for; the
  // header's type only chooses which are shown.
  // `cast`: actor ids whose titles come back as castItems.
  async _simFetch(seed, kw = null, { since = null, until = null, country = null, cast = null, xcountry = null, xcast = null } = {}) {
    // One country or several. A bare string is still taken: that is what the
    // preference held before this was a picker.
    const codesOf = v => [...new Set((Array.isArray(v) ? v : v ? [v] : []).filter(Boolean))];
    const want = codesOf(country);
    const inWant = c => want.includes(c);
    // Countries left out. A title from one of them goes; one whose origin is not
    // known stays, since nothing says it is from one. A code in both lists is
    // contradictory, and the include side keeps it.
    const leave = codesOf(xcountry).filter(c => !want.includes(c));
    const inLeave = c => leave.includes(c);
    const fromHere = codes => (!want.length || codes.some(inWant)) && !codes.some(inLeave);
    if (seed.kind === 'music') {
      // Deezer's related artists first — no key, only Lidarr to find them in —
      // and Last.fm's where there is one, each artist with its Lidarr lookup
      // record: the artwork, and what the preview window opens with
      const q = seed.mbid ? `mbid=${encodeURIComponent(seed.mbid)}` : `artist=${encodeURIComponent(seed.title)}`;
      const [dz, lf] = await Promise.all([
        this._lidarrConfigured !== false
          ? this._callApi('GET', `arr_stack/lidarr/related?artist=${encodeURIComponent(seed.title || '')}`).then(r => r?.artists || []).catch(() => [])
          : [],
        this._lastfmConfigured !== false
          ? this._callApi('GET', `arr_stack/lastfm/similar?${q}&limit=60&enrich=1`).then(r => r?.artists || []).catch(() => [])
          : [],
      ]);
      const toItem = a => {
        const mbid = a.mbid || a.artist?.foreignArtistId || null;
        return { mediaType: 'music', id: String(mbid || a.name).toLowerCase(), title: a.name, mbid, artist: a.artist || null };
      };
      const items = this._simMerge([
        { src: 'deezer', weight: 1, items: dz.map(toItem) },
        { src: 'lastfm', weight: 0.8, items: lf.map(toItem) },
      ], `music:${String(seed.mbid || seed.id).toLowerCase()}`);
      this._simKeepArtists(items.map(it => it.artist));
      if (!want.length && !leave.length) return { items, keywords: [], used: [], genreNames: {}, cast: [], castItems: [] };
      const origins = await this._simOrigins(items.map(it => it.mbid).filter(Boolean));
      const from = items.filter(it => {
        const o = it.mbid ? origins.get(it.mbid.toLowerCase()) : null;
        return fromHere(o ? [o] : []);
      });
      return { items: from, keywords: [], used: [], genreNames: {}, cast: [], castItems: [] };
    }
    const svc = this._overseerrConfigured === false ? 'tmdb' : 'overseerr';
    const q = `type=${seed.kind}&id=${encodeURIComponent(seed.id)}`;
    const extra = `&kinds=movie,tv&lang=${this._lg()}${since ? `&since=${since}` : ''}${until ? `&until=${until}` : ''}`
      + `${want.length ? `&country=${want.join(',')}` : ''}${leave.length ? `&xcountry=${leave.join(',')}` : ''}`
      + `${cast?.length ? `&cast=${cast.join(',')}` : ''}${xcast?.length ? `&xcast=${xcast.join(',')}` : ''}${kw ? `&kw=${kw.join(',')}` : ''}`;
    const [d, trakt] = await Promise.all([
      this._callApi('GET', `arr_stack/${svc}/similar?${q}${extra}`).catch(() => null),
      this._traktConfigured !== false
        ? this._callApi('GET', `arr_stack/trakt/related?${q}`).then(r => (Array.isArray(r) ? r : [])).catch(() => [])
        : [],
    ]);
    // The music of a film or series: its composers, as its credits name them —
    // hence after the answer above — then whoever is credited on a soundtrack
    const composers = (d?.composers || []).join('|');
    const score = this._lidarrConfigured !== false
      ? await this._callApi('GET', `arr_stack/lidarr/soundtrack?title=${encodeURIComponent(seed.title || '')}`
          + `${seed.year ? `&year=${seed.year}` : ''}${composers ? `&composers=${encodeURIComponent(composers)}` : ''}`)
          .then(r => r?.artists || []).catch(() => [])
      : [];
    const music = score.map(a => ({
      mediaType: 'music', id: String(a.mbid || a.artist?.foreignArtistId || a.name).toLowerCase(),
      title: a.name, mbid: a.mbid || a.artist?.foreignArtistId || null, artist: a.artist || null,
      soundtrack: a.soundtrack || null, _via: a.source === 'deezer' ? 'deezer' : 'lidarr',
    }));
    this._simKeepArtists(music.map(it => it.artist));
    const norm = it => ({ ...it, mediaType: it.mediaType || seed.kind, title: it.title || it.name || '' });
    // A disaster film is an action film too, but a title with no genre in
    // common with it is not like it. Titles that carry no genres (Trakt's) are
    // not held to this, nor is a series to a film whose genres (Horror,
    // Thriller) no series can have.
    const seedGenres = genreFamily(d?.genreIds);
    const tvComparable = [...seedGenres].some(g => TV_COMPARABLE.has(g));
    const fits = it => {
      if (!seedGenres.size || !it.genreIds?.length) return true;
      if (it.mediaType === 'tv' && seed.kind === 'movie' && !tvComparable) return true;
      const g = genreFamily(it.genreIds);
      return [...seedGenres].some(x => g.has(x));
    };
    const icon = this._discoverIconKey ? this._discoverIconKey() : svc;
    const list = (src, items, weight) => ({ src, weight, items: (items || []).map(norm).filter(fits) });
    const merged = this._simMerge([
      list(icon, d?.byKeyword, SIM_WEIGHT.byKeyword),
      list(icon, d?.similar, SIM_WEIGHT.similar),
      list('trakt', trakt, SIM_WEIGHT.trakt),
      list(icon, d?.recommendations, SIM_WEIGHT.recommendations),
      { src: 'lidarr', weight: SIM_WEIGHT.soundtrack, items: music.filter(m => m._via !== 'deezer') },
      { src: 'deezer', weight: SIM_WEIGHT.soundtrack, items: music.filter(m => m._via === 'deezer') },
    ], `${seed.kind}:${seed.id}`);
    // The proxy has checked where its titles come from; Trakt's say nothing
    // of it, so under a country filter they cannot stay. The soundtrack's
    // artists go by where MusicBrainz says they are from.
    let items = merged;
    if (want.length || leave.length) {
      const origins = music.length ? await this._simOrigins(music.map(it => it.mbid)) : new Map();
      items = merged.filter(it => {
        if (it.mediaType !== 'music') return fromHere(it.originCountry || []);
        const o = origins.get(String(it.mbid).toLowerCase());
        return fromHere(o ? [o] : []);
      });
    }
    // The titles of actors left out. The proxy has taken them out of its own
    // lists already; Trakt's come to the card on their own.
    const banned = new Set(d?.excludedTitles || []);
    if (banned.size) items = items.filter(it => !banned.has(`${it.mediaType}:${it.id}`));
    // The chosen actors' titles: more of the actors first, then those most like
    // the title asked about, then the better known
    const simScore = new Map(merged.map(it => [`${it.mediaType}:${it.id}`, it._simScore]));
    const castItems = (d?.byCast || []).map(norm).filter(fits)
      .map(it => ({ ...it, _simSrc: [icon], _simScore: simScore.get(`${it.mediaType}:${it.id}`) || 0 }))
      .sort((a, b) => (b._cast?.length || 0) - (a._cast?.length || 0)
        || b._simScore - a._simScore || (b.voteCount || 0) - (a.voteCount || 0));
    return {
      items, castItems, cast: d?.cast || [],
      keywords: d?.keywords || [], used: d?.used || [], genreNames: d?.genreNames || {},
    };
  }

  // Music tags: the genres Last.fm's listeners give an artist, and the artists
  // most tagged with the ones picked
  async _simFetchTags(ref) {
    const q = ref?.mbid ? `mbid=${encodeURIComponent(ref.mbid)}` : ref?.name ? `artist=${encodeURIComponent(ref.name)}` : '';
    if (!q) return [];
    const d = await this._callApi('GET', `arr_stack/lastfm/tags?${q}`).catch(() => null);
    return Array.isArray(d?.tags) ? d.tags : [];
  }

  async _simFetchTagArtists(tags) {
    const d = await this._callApi('GET', `arr_stack/lastfm/tagartists?tags=${tags.map(encodeURIComponent).join(',')}`).catch(() => null);
    const items = (d?.artists || []).filter(a => a.mbid).map(a => ({
      mediaType: 'music', id: a.mbid, title: a.name, mbid: a.mbid, artist: a.artist || null, _simSrc: ['lastfm'],
    }));
    this._simKeepArtists(items.map(it => it.artist));
    return items;
  }

}

export const similarFetchMixin = _SimilarFetchMethods.prototype;
