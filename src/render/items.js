// What the rows hold: Recently Added, Recently Requested, recommendations, their type filters. Split out of card.js.

class _ItemMethods {

  // Recently Requested's type filter: all, films and shows, or music.
  // Which of the three feeds the Recommendations row is built from. Trakt and
  // SuggestArr are chosen in the config; music rides along whenever Lidarr and
  // Last.fm are both set up, and is switched off with the row's own filter.
  get _recSources() {
    return {
      trakt: this._traktConfigured !== false && this._cfgGet('discover', 'recTrakt', true) !== false,
      suggestarr: this._suggestarrConfigured !== false && this._cfgGet('discover', 'recSuggestarr', true) !== false,
      // Last.fm suggests artists, and an artist can only be added to Lidarr:
      // without it there is no music here — no suggestions fetched, no Last.fm
      // mark in the header, no All / Movies & TV / Music filter
      lastfm: !!this._lastfmConfigured && this._lidarrConfigured !== false,
    };
  }

  // A header filter, and on a phone the funnel that stands in for it. Both are
  // always rendered and CSS decides which is seen: a JS branch on width would
  // need a re-render to follow a rotation, and the peanut would be measured
  // while it was still collapsed.
  _hdrFilter(segHtml, isSet, key = '') {
    if (!segHtml) return '';
    const funnel = `<ha-icon icon="mdi:filter-variant"></ha-icon>`;
    // Rendered open when it was open: this column is rebuilt on every poll, and
    // the reader's pop-out has to survive that.
    const open = key && this._hdrFilterOpen === key ? ' is-open' : '';
    // The same fill and edge the peanut's own selected half carries — those are
    // dimmer at night than the flat blue this used, which is why the funnel read
    // as a different control.
    const accent = `--seg-accent:rgba(0,122,255,${this._isDay ? 0.85 : 0.5});--seg-accent-bdr:rgba(0,122,255,${this._isDay ? 0.95 : 0.8})`;
    return `<div class="hdr-filter${isSet ? ' is-set' : ''}${open}" data-hdr-filter="${key}" style="${accent}">
      <button class="hdr-filter-btn" data-hdr-filter-btn aria-label="${this._t('tabAll')}">${funnel}</button>
      ${segHtml}
    </div>`;
  }

  get _recTypeSaved() {
    const v = this._recType || 'all';
    return ['all', 'video', 'music'].includes(v) ? v : 'all';
  }

  // Trakt and SuggestArr are dealt out one apiece so neither takes the row on
  // its own; music follows, in the order Last.fm gave it.
  _recItems() {
    const src = this._recSources;
    const tk = src.trakt ? (this._trakt || []) : [];
    const sa = src.suggestarr ? (this._suggestarr || []) : [];
    // Each feed is dealt out one apiece, so neither Trakt nor SuggestArr takes
    // the row on its own.
    const video = [];
    for (let i = 0; i < Math.max(tk.length, sa.length); i++) {
      if (tk[i]) video.push({ ...tk[i], _recSrc: 'trakt' });
      if (sa[i]) video.push({ ...sa[i], _recSrc: 'suggestarr' });
    }
    const music = src.lastfm
      ? (this._lastfmRowItems() || []).map(e => ({ ...e, _recSrc: 'lastfm', _mediaType: 'music' }))
      : [];
    const t = music.length ? this._recTypeSaved : 'all';
    if (t === 'music') return music;
    if (t === 'video') return video;

    // On All the three kinds take turns — film, show, artist, film, show,
    // artist — so the first page carries all three rather than whichever the
    // feeds happened to return most of. A kind that runs out drops out of the
    // rotation and the rest close up behind it.
    const lanes = [
      video.filter(m => m.mediaType !== 'tv'),
      video.filter(m => m.mediaType === 'tv'),
      music,
    ].filter(l => l.length);
    if (lanes.length < 2) return [...video, ...music];
    const out = [];
    for (let i = 0; out.length < video.length + music.length; i++) {
      for (const lane of lanes) if (lane[i]) out.push(lane[i]);
    }
    return out;
  }

  get _calCatTypeSaved() {
    const v = this._calCatType || 'all';
    return ['all', 'video', 'music'].includes(v) ? v : 'all';
  }

  // The calendar row through its header peanut, the same three choices the
  // other rows carry.
  _calCatItems() {
    const all = this._calendar || [];
    const t = this._lidarrConfigured !== false ? this._calCatTypeSaved : 'all';
    if (t === 'music') return all.filter(e => e._mediaType === 'music');
    if (t === 'video') return all.filter(e => e._mediaType !== 'music');
    return all;
  }

  get _raTypeSaved() {
    const v = this._raType || 'all';
    return ['all', 'video', 'music'].includes(v) ? v : 'all';
  }

  get _rqTypeSaved() {
    const v = this._rqType || 'all';
    return ['all', 'video', 'music'].includes(v) ? v : 'all';
  }

  // Returns the correct data array for a given section key
  // Resolves a download-client item back to the media it belongs to. Keyed on
  // the arr queue's downloadId (torrent hash / SAB nzo_id), so no release-name
  // parsing is involved and two files with similar names cannot cross over.
  _mediaForDownloadId(downloadId) {
    const key = String(downloadId || '').toLowerCase();
    if (!key) return null;
    // Active queues first, history second: a title being downloaded right now is
    // the better answer when the same hash appears in both.
    const sources = [
      [this._dlMediaRadarr,  this._radarr,  'radarr'],
      [this._dlMediaRadarr2, this._radarr2, 'radarr2'],
      [this._dlMediaSonarr,  this._sonarr,  'sonarr'],
      [this._dlMediaSonarr2, this._sonarr2, 'sonarr2'],
      [this._dlHistRadarr,   this._radarr,  'radarr'],
      [this._dlHistRadarr2,  this._radarr2, 'radarr2'],
      [this._dlHistSonarr,   this._sonarr,  'sonarr'],
      [this._dlHistSonarr2,  this._sonarr2, 'sonarr2'],
    ];
    // Music has one map and an artist rather than a title: its window opens on
    // the artist, and there is no popup for an album
    const artistId = this._dlMediaLidarr?.get(key);
    if (artistId != null) return { type: 'music', artistId };

    for (const [map, lib, inst] of sources) {
      const arrId = map?.get(key);
      if (arrId == null) continue;
      const hit = (lib || []).find(x => x.id === arrId);
      if (!hit) continue;
      const isMovie = inst.startsWith('radarr');
      return {
        type:      isMovie ? 'radarr' : 'sonarr',
        tmdbId:    hit.tmdbId ? String(hit.tmdbId) : null,
        tvdbId:    hit.tvdbId ? String(hit.tvdbId) : null,
        title:     hit.title || '',
        radarrId:  inst === 'radarr'  ? hit.id : null,
        radarr2Id: inst === 'radarr2' ? hit.id : null,
      };
    }
    return null;
  }

  get recentlyAdded() {
    const movies = (this._radarr || [])
      .filter(m => m.hasFile)
      .map(m => ({ ...m, _mediaType: 'movie', _sortDate: m.movieFile?.dateAdded || m.added || '' }));
    const movies2 = (this._radarr2 || [])
      .filter(m => m.hasFile)
      .map(m => ({ ...m, _mediaType: 'movie', _isRadarr2: true, _sortDate: m.movieFile?.dateAdded || m.added || '' }));
    const shows = (this._sonarr || [])
      .filter(s => (s.statistics?.episodeFileCount ?? 0) > 0)
      .map(s => ({ ...s, _mediaType: 'tv', _sortDate: this._sonarrImportDates?.[s.id] || s.added || '' }));
    const shows2 = (this._sonarr2 || [])
      .filter(s => (s.statistics?.episodeFileCount ?? 0) > 0)
      .map(s => ({ ...s, _mediaType: 'tv', _isSonarr2: true, _sortDate: (this._sonarr2ImportDates?.[s.id] || s.added || '') }));

    // Deduplicate by tmdbId/tvdbId — primary instance wins (radarr over radarr2, sonarr over sonarr2)
    const movieMap = new Map();
    for (const m of [...movies, ...movies2]) {
      const key = m.tmdbId ? String(m.tmdbId) : `_uid_m_${m._isRadarr2 ? 'r2' : 'r1'}_${m.id}`;
      if (!movieMap.has(key)) movieMap.set(key, m);
    }
    const showMap = new Map();
    for (const s of [...shows, ...shows2]) {
      const key = s.tvdbId ? String(s.tvdbId) : `_uid_s_${s._isSonarr2 ? 's2' : 's1'}_${s.id}`;
      if (!showMap.has(key)) showMap.set(key, s);
    }

    // Music sits in the same list rather than a row of its own: an album lands
    // in the library the same way a film does, and the peanut in the header is
    // what separates them.
    const music = (this._lidarrConfigured === false ? [] : (this._lidarrArtistFeed || []))
      .map(e => ({ ...e, _mediaType: 'music', _sortDate: e._importedAt || '' }));

    return [...movieMap.values(), ...showMap.values(), ...music]
      .sort((a, b) => b._sortDate.localeCompare(a._sortDate));
  }

  // Recently Added through its header peanut: everything, the two the row
  // always held, or music alone.
  // Recently Requested through its header peanut. The row and See More both
  // read it: See More used to take the unfiltered list, so the filter did
  // nothing there.
  _rqItems() {
    const all = this.recentlyRequested || [];
    const t = this._lidarrConfigured !== false ? this._rqTypeSaved : 'all';
    if (t === 'music') return all.filter(m => m._mediaType === 'music');
    if (t === 'video') return all.filter(m => m._mediaType !== 'music');
    return all;
  }

  _raItems() {
    const all = this.recentlyAdded;
    const t = this._lidarrConfigured !== false ? this._raTypeSaved : 'all';
    if (t === 'music') return all.filter(m => m._mediaType === 'music');
    if (t === 'video') return all.filter(m => m._mediaType !== 'music');
    return all;
  }

  // Seerr knows what was requested; Radarr and Sonarr only know what is missing.
  // Those two lists overlap heavily on an install fed purely by Seerr, which is
  // why the difference went unnoticed — but anything reaching the *arrs by
  // another route (import lists, another user, a manual add) belongs in neither
  // this section nor a user's mental model of "my requests".
  _seerrRequestItems() {
    // "library" is the pre-Seerr behaviour, kept for installs that drive the
    // *arrs directly and want a wanted list rather than a request list.
    if (this._cfgGet('discover', 'requestedSource', 'both') === 'library') return null;
    const reqs = this._seerrRequests;
    // Seerr configured but not answered yet: hold the section empty rather than
    // flashing the library list it is about to replace. An outright failure sets
    // _seerrRequestsErr and drops through to that list on purpose.
    if (!Array.isArray(reqs)) {
      return (this._overseerrConfigured !== false && !this._seerrRequestsErr) ? [] : null;
    }

    const movieByTmdb = new Map();
    for (const m of [...(this._radarr || []), ...(this._radarr2 || [])]) {
      if (m.tmdbId && !movieByTmdb.has(String(m.tmdbId))) movieByTmdb.set(String(m.tmdbId), m);
    }
    const showByTvdb = new Map();
    const showByTmdb = new Map();
    for (const sh of [...(this._sonarr || []), ...(this._sonarr2 || [])]) {
      if (sh.tvdbId && !showByTvdb.has(String(sh.tvdbId))) showByTvdb.set(String(sh.tvdbId), sh);
      if (sh.tmdbId && !showByTmdb.has(String(sh.tmdbId))) showByTmdb.set(String(sh.tmdbId), sh);
    }

    const items = [];
    const seen = new Set();
    for (const r of reqs) {
      const media = r?.media || {};
      const isMovie = (r?.type || '') === 'movie';
      const tmdbId = media.tmdbId != null ? String(media.tmdbId) : null;
      const tvdbId = media.tvdbId != null ? String(media.tvdbId) : null;
      // Seasons of one show arrive as separate requests; the section lists titles.
      const dedupKey = `${isMovie ? 'm' : 't'}:${tvdbId || tmdbId || r?.id}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const entry = isMovie
        ? (tmdbId ? movieByTmdb.get(tmdbId) : null)
        : ((tvdbId && showByTvdb.get(tvdbId)) || (tmdbId && showByTmdb.get(tmdbId)) || null);

      const base = entry ? { ...entry } : {
        id: null,
        title: media.title || r?.title || 'Unknown',
        tmdbId: tmdbId ? Number(tmdbId) : null,
        tvdbId: tvdbId ? Number(tvdbId) : null,
        images: [],
      };

      items.push({
        ...base,
        _mediaType:    isMovie ? 'movie' : 'tv',
        _sortDate:     r?.createdAt || r?.updatedAt || base.added || '',
        _seerr:        true,
        _seerrOnly:    !entry,
        _seerrPoster:  media.posterPath || null,
        _seerrStatus:  Number(r?.status ?? 0),        // 1 pending, 2 approved, 3 declined
        _seerrMedia:   Number(media.status ?? 0),     // 3 processing, 4 partial, 5 available
        _seerrUser:    r?.requestedBy?.displayName || r?.requestedBy?.plexUsername || '',
      });
    }

    // Not everything a user asks for goes through Seerr. Interactive Search grabs
    // a release straight in Radarr or Sonarr, and the card's instance "+" adds a
    // title directly — neither leaves a request behind, so both would be missing
    // from a list built purely from Seerr. A download in flight is the clearest
    // evidence someone asked for something, so it belongs here either way.
    const have = new Set(items.map(i => `${i._mediaType === 'movie' ? 'm' : 't'}:${i.tvdbId || i.tmdbId}`));
    const _rqA  = this._radarrQueueActive       || new Set();
    const _rq2A = this._radarr2QueueActive      || new Set();
    const _snQ  = this._sonarrQueueSeriesPct    || new Map();
    const _snQ2 = this._sonarr2QueueSeriesPct   || new Map();
    const _now  = new Date().toISOString();
    const extras = [];
    if (this._cfgGet('discover', 'requestedSource', 'both') === 'seerr') {
      return items.sort((a, b) => String(b._sortDate).localeCompare(String(a._sortDate)));
    }
    // Radarr's second instance is not tagged the way Sonarr's is, so which queue
    // an entry belongs to has to come from the list it was read out of.
    for (const [pool, queue] of [[this._radarr || [], _rqA], [this._radarr2 || [], _rq2A]]) {
      for (const m of pool) {
        const dl = queue.has(m.id);
        if (!dl && !this._pendingRequestedMovies.has(String(m.tmdbId))) continue;
        if (have.has(`m:${m.tmdbId}`)) continue;
        have.add(`m:${m.tmdbId}`);
        extras.push({ ...m, _mediaType: 'movie', _sortDate: dl ? _now : (m.added || ''), _seerr: false });
      }
    }
    for (const [pool, queue] of [[this._sonarr || [], _snQ], [this._sonarr2 || [], _snQ2]]) {
      for (const sh of pool) {
        const dl = queue.has(sh.id);
        if (!dl && !this._pendingRequestedShows.has(String(sh.tvdbId))) continue;
        if (have.has(`t:${sh.tvdbId}`)) continue;
        have.add(`t:${sh.tvdbId}`);
        extras.push({ ...sh, _mediaType: 'tv', _sortDate: dl ? _now : (sh.added || ''), _seerr: false });
      }
    }

    return [...extras, ...items].sort((a, b) => String(b._sortDate).localeCompare(String(a._sortDate)));
  }

  get recentlyRequested() {
    const fromSeerr = this._seerrRequestItems();
    if (fromSeerr) return fromSeerr;

    const _rqA   = this._radarrQueueActive   || new Set();
    const _rq2A  = this._radarr2QueueActive  || new Set();
    const _snQ   = this._sonarrQueueSeriesPct  || new Map();
    const _snQ2  = this._sonarr2QueueSeriesPct || new Map();
    const _pM    = this._pendingRequestedMovies || new Set();
    const _pS    = this._pendingRequestedShows  || new Set();
    const _now   = new Date().toISOString();

    const movies = (this._radarr || [])
      .filter(m => (m.monitored || _rqA.has(m.id) || _pM.has(String(m.tmdbId))) && !m.hasFile)
      .map(m => ({ ...m, _mediaType: 'movie', _sortDate: m.added || '' }));
    const movies2 = (this._radarr2 || [])
      .filter(m => (m.monitored || _rq2A.has(m.id) || _pM.has(String(m.tmdbId))) && !m.hasFile)
      .map(m => ({ ...m, _mediaType: 'movie', _isRadarr2: true, _sortDate: m.added || '' }));
    const shows = (this._sonarr || [])
      .filter(s => (s.monitored || _snQ.has(s.id) || _pS.has(String(s.tvdbId))) && ((s.statistics?.episodeFileCount ?? 0) === 0 || _snQ.has(s.id)))
      .map(s => ({ ...s, _mediaType: 'tv', _sortDate: (_snQ.has(s.id) && (s.statistics?.episodeFileCount ?? 0) > 0) ? _now : s.added || '' }));
    const shows2 = (this._sonarr2 || [])
      .filter(s => (s.monitored || _snQ2.has(s.id) || _pS.has(String(s.tvdbId))) && ((s.statistics?.episodeFileCount ?? 0) === 0 || _snQ2.has(s.id)))
      .map(s => ({ ...s, _mediaType: 'tv', _isSonarr2: true, _sortDate: (_snQ2.has(s.id) && (s.statistics?.episodeFileCount ?? 0) > 0) ? _now : s.added || '' }));

    // Deduplicate by tmdbId (movies) / tvdbId (shows)
    // Priority: downloading > not; equal → primary instance wins
    const _isDlMovie = m => m._isRadarr2 ? _rq2A.has(m.id) : _rqA.has(m.id);
    const _isDlShow  = s => s._isSonarr2 ? _snQ2.has(s.id) : _snQ.has(s.id);

    const movieMap = new Map();
    for (const m of [...movies, ...movies2]) {
      const key = m.tmdbId ? String(m.tmdbId) : `_uid_m_${m._isRadarr2 ? 'r2' : 'r1'}_${m.id}`;
      const ex = movieMap.get(key);
      if (!ex || (!_isDlMovie(ex) && _isDlMovie(m))) movieMap.set(key, m);
    }
    const showMap = new Map();
    for (const s of [...shows, ...shows2]) {
      const key = s.tvdbId ? String(s.tvdbId) : `_uid_s_${s._isSonarr2 ? 's2' : 's1'}_${s.id}`;
      const ex = showMap.get(key);
      if (!ex || (!_isDlShow(ex) && _isDlShow(s))) showMap.set(key, s);
    }

    // Cross-instance: exclude items already present in recentlyAdded (other instance has the file)
    // Movies: any instance has hasFile=true → item belongs only in recentlyAdded
    const _movieHasFile = new Set([
      ...(this._radarr  || []).filter(m => m.hasFile && m.tmdbId).map(m => String(m.tmdbId)),
      ...(this._radarr2 || []).filter(m => m.hasFile && m.tmdbId).map(m => String(m.tmdbId)),
    ]);
    // Shows: any instance has episodeFileCount>0 → only exclude items that themselves have 0 episodes
    //        (items with episodeFileCount>0 are intentionally in both sections when downloading missing eps)
    const _showHasEps = new Set([
      ...(this._sonarr  || []).filter(s => (s.statistics?.episodeFileCount ?? 0) > 0 && s.tvdbId).map(s => String(s.tvdbId)),
      ...(this._sonarr2 || []).filter(s => (s.statistics?.episodeFileCount ?? 0) > 0 && s.tvdbId).map(s => String(s.tvdbId)),
    ]);

    const finalMovies = [...movieMap.values()].filter(m => {
      const key = m.tmdbId ? String(m.tmdbId) : null;
      return !key || !_movieHasFile.has(key);
    });
    const finalShows = [...showMap.values()].filter(s => {
      if (_isDlShow(s)) return true; // actively downloading → always show (Silo case + cross-instance)
      const key = s.tvdbId ? String(s.tvdbId) : null;
      return !key || !_showHasEps.has(key); // no episodes anywhere → show; episodes exist → move to recentlyAdded
    });

    return [...finalMovies, ...finalShows, ...this._rqMusicItems()]
      .sort((a, b) => b._sortDate.localeCompare(a._sortDate));
  }

  // Artists whose music is still on its way — monitored with tracks missing, or
  // with something in Lidarr's queue right now. Newest request first, and the
  // album named is the one that prompted it.
  _rqMusicItems() {
    if (this._lidarrConfigured === false) return [];
    const dl = this._lidarrQueueArtists || new Map();
    const out = [];
    for (const a of (this._lidarrArtists?.values() || [])) {
      const st = a.statistics || {};
      const have = st.trackFileCount ?? 0;
      const total = st.trackCount ?? 0;
      const downloading = dl.has(a.id);
      const missing = total > 0 ? have < total : have === 0;
      if (!downloading && !(a.monitored && missing)) continue;
      const feed = (this._lidarrArtistFeed || []).find(e => e.id === a.id);
      out.push({
        id: a.id,
        artist: a,
        newestAlbum: feed?.newestAlbum || null,
        newAlbumCount: 0,
        _mediaType: 'music',
        _sortDate: a.added || '',
      });
    }
    return out;
  }
}

export const itemsMixin = _ItemMethods.prototype;
