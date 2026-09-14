// What posters show beyond the library: ratings, audio and subtitle languages. Split out of card.js.

class _PosterInfoMethods {

  get _ratingProvider() {
    const v = this._cfgGet('posters', 'ratingProvider', null) || this._cfgGet('discover', 'ratingProvider', 'imdb');
    return ['imdb','tmdb'].includes(v) ? v : 'imdb';
  }

  _fetchPosterRating(tmdbId, isMovie = true) {
    if (!this._overseerrConfigured || !tmdbId) return;
    const key = String(tmdbId);
    if (this._posterRatingsCache.has(key)) return;
    this._posterRatingsCache.set(key, null); // pending
    const path = isMovie ? `overseerr/movie/${tmdbId}/ratings` : `overseerr/tv/${tmdbId}/ratings`;
    this._callApi('GET', `arr_stack/${path}`).then(data => {
      this._posterRatingsCache.set(key, {
        rt: data?.criticsScore ?? data?.rottenTomatoes?.criticsScore ?? null,
        metacritic: data?.metacritic ?? null,
      });
      this._render();
    }).catch(() => {
      this._posterRatingsCache.set(key, false);
    });
  }

  // TMDB voteAverage, used as the IMDb-provider poster fallback: Sonarr carries
  // only a generic TheTVDB score, and a film can be in Radarr with no IMDb
  // rating at all — the detail popup falls back to TMDB in both cases, so the
  // poster does too. Uses Overseerr when configured, otherwise the direct
  // public TMDB proxy (the same source _discoverSvc uses for discover data).
  // Films and shows are cached apart: the two number their ids separately and
  // the same id means different titles in each.
  _tmdbVoteKey(tmdbId, isMovie) { return `${isMovie ? 'm' : 't'}${tmdbId}`; }

  _fetchPosterTmdbVote(tmdbId, isMovie = false) {
    if (!tmdbId) return;
    const key = this._tmdbVoteKey(tmdbId, isMovie);
    if (this._posterTmdbVoteCache.has(key)) return;
    this._posterTmdbVoteCache.set(key, null); // pending
    const path = isMovie ? 'movie' : 'tv';
    this._callApi('GET', `arr_stack/${this._discoverSvc}/${path}/${tmdbId}`).then(data => {
      this._posterTmdbVoteCache.set(key, data?.voteAverage || false);
      this._render();
    }).catch(() => {
      this._posterTmdbVoteCache.set(key, false);
    });
  }

  // Audio language badge for a Sonarr series in the Library category — lazy-fetched per
  // visible poster (only the current page, not the whole library) since Sonarr series
  // objects don't embed episode file info the way Radarr movies embed movieFile directly.
  _fetchLibTvAudio(seriesId, inst = '1') {
    if (!seriesId) return;
    const key = `${inst}-${seriesId}`;
    if (this._libTvAudioCache.has(key)) return;
    this._libTvAudioCache.set(key, null); // pending
    const svc = inst === '2' ? 'sonarr2' : 'sonarr';
    this._callApi('GET', `arr_stack/${svc}/episodefiles?seriesId=${seriesId}`).then(files => {
      // Union across every episode file, not the first one that happens to
      // carry a language: a show is often dubbed for part of its run only, and
      // one episode's track list does not describe the series.
      const seen = new Set();
      for (const f of (Array.isArray(files) ? files : [])) {
        if (Array.isArray(f.languages) && f.languages.length) {
          for (const l of f.languages) {
            const c = this._langCode(l.name || '');
            if (c) seen.add(c);
          }
        } else if (f.mediaInfo?.audioLanguages) {
          for (const l of f.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/)) {
            const c = this._langCode(l.trim());
            if (c) seen.add(c);
          }
        }
      }
      const langs = [...seen];
      this._libTvAudioCache.set(key, langs.length ? langs : false);
      this._render();
    }).catch(() => {
      this._libTvAudioCache.set(key, false);
    });
  }

  // Bazarr answers per episode, with no series-level rollup, so a show's
  // subtitle languages are the union across its episodes. Missing languages win
  // over present ones — the same precedence a movie's badge uses. One request
  // per series, cached for the session.
  _fetchLibTvSubs(seriesId) {
    if (!seriesId || !this._bazarrConfigured) return;
    const key = String(seriesId);
    if (this._libTvSubCache.has(key)) return;
    this._libTvSubCache.set(key, null); // pending
    this._callApi('GET', `arr_stack/bazarr/episodes?seriesId=${seriesId}`).then(res => {
      const rows = res?.data || [];
      const missing = new Set();
      const present = new Set();
      for (const ep of rows) {
        for (const s of (ep.missing_subtitles || [])) missing.add((s.code2 || s.name || '?').toUpperCase());
        for (const s of (ep.subtitles || [])) if (s.code2 || s.name) present.add((s.code2 || s.name).toUpperCase());
      }
      const codes = missing.size ? [...missing] : [...present];
      this._libTvSubCache.set(key, codes.length ? { codes, missing: missing.size > 0 } : false);
      this._render();
    }).catch(() => {
      this._libTvSubCache.set(key, false);
    });
  }

  // How tall a flag emoji actually draws, as a fraction of its font-size. Apple
  // Color Emoji gives ~0.72, Noto Color Emoji on Android noticeably more — which
  // is why a hard-coded font-size made the flags overshoot the rating badge on
  // one platform and not the other. Measured once per session from the glyph's
  // own ink, then handed to CSS so the sizing is font-independent.
  _measureFlagRatio() {
    if (this._flagRatio != null) return;
    this._flagRatio = 0.72; // fallback if the canvas read fails
    try {
      const FS = 40, PAD = 20, SIZE = 120;
      const c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.font = `${FS}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText('\u{1F1E8}\u{1F1FF}', PAD, PAD);
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
      let minY = SIZE, maxY = -1, minX = SIZE, maxX = -1;
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (data[(y * SIZE + x) * 4 + 3] > 10) {
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
        }
      }
      if (maxY > minY) {
        const inkH = maxY - minY + 1;
        this._flagRatio = inkH / FS;
        this._flagAspect = (maxX - minX + 1) / inkH;
      }
    } catch (_) {}
    const host = this.shadowRoot?.host;
    if (host) {
      host.style.setProperty('--fl-ratio', String(this._flagRatio));
      if (this._flagAspect) host.style.setProperty('--fl-aspect', String(this._flagAspect));
    }
  }
}

export const posterInfoMixin = _PosterInfoMethods.prototype;
