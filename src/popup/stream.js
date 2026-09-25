import { POPUP_TYPE } from '../constants.js';
import { dayClass } from '../shared/ui.js';
import { normName } from '../shared/format.js';

// Now Playing: the popup a playing stream opens, its transport and seek bar,
// and playing a title on a Plex client. Split out of popup/index.js.

// A title as it compares: lower case, without the year a player appends.
const _normT = s => (s || '').toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').trim();

class _PopupStreamMethods {

// ─────────────────────────────────────────────
// Stream popup — open from stream card click
// ─────────────────────────────────────────────

async _openStreamPopup(entityId, contentType, trackTitle, seriesTitle, { bare = false } = {}) {
  const isMusic  = contentType === 'music' || contentType === 'artist' || contentType === 'album';
  const streamAttr = this._hass?.states?.[entityId]?.attributes || {};
  const isLiveTV = contentType === 'channel' || !!streamAttr.media_channel
                 || streamAttr.media_library_title === 'Live TV';
  const isTV     = isLiveTV || contentType === 'tvshow' || contentType === 'episode'
                 || !!seriesTitle || !!streamAttr.media_series_title;

  if (isMusic) {
    // A track opens the artist's window — their detail when the library holds
    // them, the same window as a preview when it does not. Only a stream that
    // has no artist to show falls through to the plain popup below.
    if (!bare && this._lidarrConfigured !== false) {
      this._markActivated();
      this._musOpenForStream(entityId, trackTitle);
      return;
    }
    const s    = this._hass?.states?.[entityId];
    const attr = s?.attributes || {};
    this._popup = {
      _type:         POPUP_TYPE.STREAM,
      _streamEntity: entityId,
      _ctrlEntity:   this._streamControlEntity(entityId),
      _streamState:  s?.state || 'idle',
      title:         attr.media_title || '',
      _artist:       attr.media_artist || '',
      _album:        attr.media_album_name || '',
      _duration:     attr.media_duration || 0,
      _position:     attr.media_position || 0,
      _updatedAt:    attr.media_position_updated_at
        ? new Date(attr.media_position_updated_at).getTime()
        : Date.now(),
      _poster:       attr.entity_picture || null,
    };
    this._renderPopupEl();
    if (entityId.startsWith('media_player.plex_')) this._fetchPlexMachineId(entityId);
    return;
  }

  if (isTV) {
    // The name the show is looked up by: what the player says, unless the ids
    // turn up the name TMDB uses.
    let lookupName = seriesTitle || trackTitle;

    // Ids first. Two different shows can carry the same name, and the old
    // bidirectional includes() also paired "Alien" with "Aliens".
    let showIds = { tvdbId: null, tmdbId: null };
    // Jellyfin names its own series, and those names are not TMDB's: a library
    // holding Bluey as "Blue" used to open Blue Bloods. The proxy carries the
    // series' provider ids, so the show is found by id like every other source.
    let jfEpIds = null;
    if (entityId.startsWith('jellyfin:')) {
      const jf = (this._jellyfinSessions || []).find(x => x.id === entityId);
      showIds = {
        tvdbId: jf?.attr?._jfSeriesTvdbId || null,
        tmdbId: jf?.attr?._jfSeriesTmdbId || null,
      };
      // Some libraries carry no ids on the series at all. The episode has
      // them, and TMDB names the show an episode belongs to, so that is asked
      // before falling back to the name the library happens to use.
      if (!showIds.tvdbId && !showIds.tmdbId) {
        jfEpIds = {
          tvdbId: jf?.attr?._jfEpTvdbId || null,
          imdbId: jf?.attr?._jfEpImdbId || null,
        };
        const src = jfEpIds.tvdbId ? `tvdb/${jfEpIds.tvdbId}` : jfEpIds.imdbId ? `imdb/${jfEpIds.imdbId}` : null;
        if (src) {
          const found = await this._callApi('GET', `arr_stack/tmdb/find/${src}`).catch(() => null);
          if (found?.tmdbId) {
            showIds.tmdbId = String(found.tmdbId);
            if (found.name) lookupName = found.name;
          }
        }
      }
    }
    if (!isLiveTV && entityId.startsWith('media_player.plex')) {
      try {
        const raw = await this._hass.callApi('GET', 'arr_stack/plex/sessions');
        const sess = this._plexSessionForEntity(raw?.MediaContainer?.Metadata || [], entityId)
                  || this._plexSessionFallback(raw?.MediaContainer?.Metadata || [], entityId);
        if (sess) showIds = await this._plexShowIds(sess);
      } catch (_) {}
    }
    const _snById = arr => (!showIds.tvdbId && !showIds.tmdbId) ? null : (arr || []).find(s =>
      (showIds.tvdbId && String(s.tvdbId) === String(showIds.tvdbId)) ||
      (showIds.tmdbId && String(s.tmdbId) === String(showIds.tmdbId))
    );
    // Exact title only — used when the show has no usable ids (Live TV, or a
    // source that does not expose series-level providers).
    const lt = lookupName.toLowerCase();
    const _snMatch = arr => (arr || []).find(s => (s.title?.toLowerCase() || '') === lt);
    // Both instances, ids before names across the pair rather than within each
    // one: a name that happens to match in the first instance must not beat the
    // show the id points at in the second.
    const snHit = _snById(this._sonarr) || _snById(this._sonarr2)
               || _snMatch(this._sonarr) || _snMatch(this._sonarr2);
    if (snHit) {
      await this._openPopup(
        POPUP_TYPE.SONARR,
        snHit.tmdbId ? String(snHit.tmdbId) : null,
        snHit.tvdbId ? String(snHit.tvdbId) : null,
        snHit.title,
      );
    } else if (this._overseerrConfigured !== false) {
      // Not in Sonarr + Overseerr available — search for tmdbId
      let tvTmdbId = null;
      let tvTitle = lookupName;
      if (showIds.tmdbId) {
        tvTmdbId = String(showIds.tmdbId);
      } else if (showIds.tvdbId) {
        // The show is known by its TVDB id alone, which is what Jellyfin
        // carries. TMDB answers for it, and with it comes the name the rest of
        // the card uses rather than whatever the library called it.
        const found = await this._callApi('GET', `arr_stack/tmdb/find/tvdb/${encodeURIComponent(showIds.tvdbId)}`)
          .catch(() => null);
        if (found?.tmdbId) {
          tvTmdbId = String(found.tmdbId);
          if (found.name) tvTitle = found.name;
        }
      } else {
        try {
          const sr = await this._hass.callApi('POST', 'arr_stack/overseerr/search', { query: lookupName, page: 1 });
          const want = _normT(lookupName);
          const tv = (sr?.results || []).filter(r => r.mediaType === 'tv');
          // The name has to match. Taking the first result turned "Blue" into
          // "Blue Bloods"; a title the card cannot place is better left as the
          // title it was given than shown as somebody else's show.
          const hit = tv.find(r => _normT(r.name || r.title) === want
                              || _normT(r.originalName || r.originalTitle || '') === want);
          if (hit?.id) tvTmdbId = String(hit.id);
        } catch (_) {}
      }
      await this._openPopup(POPUP_TYPE.TV, tvTmdbId, showIds.tvdbId ? String(showIds.tvdbId) : null, tvTitle);
    } else {
      // No Overseerr — local fallback, but the ids are still worth more than
      // the name the library happens to use
      await this._openPopup(
        POPUP_TYPE.TV,
        showIds.tmdbId ? String(showIds.tmdbId) : null,
        showIds.tvdbId ? String(showIds.tvdbId) : null,
        lookupName,
      );
    }
    if (this._popup) {
      this._popup._noIS = isLiveTV; // disable IS only for Live TV
      this._attachStreamData(entityId);
      this._renderPopupEl();
    }
    return;
  }

  // Movie — keep Interactive Search
  const titleNoYear = trackTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();

  // Show loading immediately while we resolve IDs
  this._popup = { _loading: true, title: trackTitle };
  this._renderPopupEl();

  // Step 1: for Plex entities try to get TMDB/TVDB IDs from session Guid array
  // Plex sessions return Guid: [{ id: "tmdb://490132" }, { id: "imdb://tt..." }]
  // For Jellyfin sessions, TMDB ID is in attr._jfTmdbId (from ProviderIds)
  let sessionTmdbId = null;
  if (entityId.startsWith('jellyfin:')) {
    const jfSession = (this._jellyfinSessions || []).find(s => s.id === entityId);
    if (jfSession?.attr?._jfTmdbId) sessionTmdbId = String(jfSession.attr._jfTmdbId);
  } else if (entityId.startsWith('emby:')) {
    const embySession = (this._embySessions || []).find(s => s.id === entityId);
    if (embySession?.attr?._embyTmdbId) sessionTmdbId = String(embySession.attr._embyTmdbId);
  }
  // Sessions read through the proxy are keyed `plex:<machineIdentifier>`, not by
  // an HA entity id, so the branch below never ran for them and the title-based
  // fallback took over — which fails on a localised Plex title.
  if (!sessionTmdbId && entityId.startsWith('plex:')) {
    const ps = (this._plexSessions || []).find(x => x.id === entityId);
    const guid = [...(ps?._plexGuids || []), ...(ps?._plexShowGuids || [])]
      .find(g => typeof g === 'string' && g.startsWith('tmdb://'));
    if (guid) sessionTmdbId = guid.replace('tmdb://', '').split('?')[0];
  }
  if (!sessionTmdbId && (entityId.startsWith('media_player.plex_') || entityId.startsWith('media_player.plex '))) {
    try {
      const raw = await this._hass.callApi('GET', 'arr_stack/plex/sessions');
      const sessions = raw?.MediaContainer?.Metadata || [];
      const match = this._plexSessionForEntity(sessions, entityId)
                 || this._plexSessionFallback(sessions, entityId);
      if (match?.Guid) {
        for (const g of (Array.isArray(match.Guid) ? match.Guid : [])) {
          if (g.id?.startsWith('tmdb://')) sessionTmdbId = g.id.replace('tmdb://', '');
        }
      }
      // Older Plex servers answer /status/sessions with their own plex:// guid
      // and nothing else, whatever includeGuids asks for. The item's own
      // metadata always carries the provider ids, so fetch those instead.
      if (!sessionTmdbId && match?.ratingKey) {
        const meta = await this._callApi(
          'GET', `arr_stack/plex/metadata?ratingKey=${encodeURIComponent(match.ratingKey)}`
        ).catch(() => null);
        const md = meta?.MediaContainer?.Metadata?.[0];
        for (const g of (Array.isArray(md?.Guid) ? md.Guid : [])) {
          if (g.id?.startsWith('tmdb://')) sessionTmdbId = g.id.replace('tmdb://', '');
        }
      }
    } catch (_) {}
  }

  // Step 2: if we have TMDB ID from session, use it directly
  if (sessionTmdbId) {
    const radarrByTmdb  = (this._radarr  || []).find(m => m.tmdbId && String(m.tmdbId) === sessionTmdbId);
    const radarr2ByTmdb = !radarrByTmdb && (this._radarr2 || []).find(m => m.tmdbId && String(m.tmdbId) === sessionTmdbId);
    await this._openPopup(
      (radarrByTmdb || radarr2ByTmdb) ? POPUP_TYPE.RADARR : POPUP_TYPE.MOVIE,
      sessionTmdbId, null, titleNoYear,
      radarrByTmdb?.id ?? null, radarr2ByTmdb?.id ?? null
    );
    if (this._popup) { this._attachStreamData(entityId); this._renderPopupEl(); }
    return;
  }

  // Step 3: title matching against Radarr library
  const _titleMatch = (entry) => {
    const ql = _normT(trackTitle);
    const qn = _normT(titleNoYear);
    return [entry.title, entry.sortTitle, entry.originalTitle].some(t => {
      const tl = _normT(t);
      return tl && (tl === ql || tl === qn);
    });
  };
  const m  = (this._radarr  || []).find(m => _titleMatch(m));
  const m2 = !m && (this._radarr2 || []).find(m => _titleMatch(m));
  const hit = m || m2;
  if (hit) {
    let hitTmdbId = hit.tmdbId ? String(hit.tmdbId) : null;
    // Radarr entry has no TMDB ID — look it up via Overseerr search
    if (!hitTmdbId && this._overseerrConfigured !== false) {
      try {
        const sr = await this._hass.callApi('POST', 'arr_stack/overseerr/search', { query: titleNoYear, page: 1 });
        const qt = _normT(titleNoYear);
        const oh = (sr?.results || []).find(r => {
          if (r.mediaType !== 'movie') return false;
          const rt = _normT(r.title);
          const ort = _normT(r.originalTitle || '');
          return rt === qt || ort === qt || rt.includes(qt) || qt.includes(rt);
        });
        if (oh?.id) hitTmdbId = String(oh.id);
      } catch (_) {}
    }
    await this._openPopup(POPUP_TYPE.RADARR, hitTmdbId, null, hit.title, m?.id ?? null, m2?.id ?? null);
    if (this._popup) { this._attachStreamData(entityId); this._renderPopupEl(); }
  } else {
    // Not found in Radarr by title — try Overseerr search (handles localized titles)
    const _trackYear = trackTitle.match(/\((\d{4})\)/)?.[1] || null;
    let movieTmdbId = null;
    if (this._overseerrConfigured !== false) {
      try {
        const sr = await this._hass.callApi('POST', 'arr_stack/overseerr/search', { query: titleNoYear, page: 1 });
        const qt = _normT(titleNoYear);
        const oh = (sr?.results || []).find(r => {
          if (r.mediaType !== 'movie') return false;
          const rt = _normT(r.title);
          const ort = _normT(r.originalTitle || '');
          if (rt === qt || ort === qt || rt.includes(qt) || qt.includes(rt)) return true;
          // Year fallback: localized title differs completely (e.g. "Bankéř" vs "The Banker")
          return !!(_trackYear && r.releaseDate?.startsWith(_trackYear));
        });
        if (oh?.id) movieTmdbId = String(oh.id);
      } catch (_) {}
    }
    if (movieTmdbId) {
      const radarrByTmdb  = (this._radarr  || []).find(m => m.tmdbId && String(m.tmdbId) === movieTmdbId);
      const radarr2ByTmdb = !radarrByTmdb && (this._radarr2 || []).find(m => m.tmdbId && String(m.tmdbId) === movieTmdbId);
      if (radarrByTmdb || radarr2ByTmdb) {
        await this._openPopup(POPUP_TYPE.RADARR, movieTmdbId, null, titleNoYear, radarrByTmdb?.id ?? null, radarr2ByTmdb?.id ?? null);
      } else {
        await this._openPopup(POPUP_TYPE.MOVIE, movieTmdbId, null, titleNoYear);
      }
      if (this._popup) { this._attachStreamData(entityId); this._renderPopupEl(); }
    } else {
      // Fallback — minimal stream popup + IS to add
      this._popup = {
        _type:         POPUP_TYPE.STREAM,
        _streamEntity: entityId,
        _ctrlEntity:   this._streamControlEntity(entityId),
        _streamState:  this._hass?.states?.[entityId]?.state || 'idle',
        title:         trackTitle,
        _artist:       '',
        _album:        '',
        _duration:     streamAttr.media_duration || 0,
        _position:     streamAttr.media_position || 0,
        _updatedAt:    streamAttr.media_position_updated_at
          ? new Date(streamAttr.media_position_updated_at).getTime()
          : Date.now(),
        _poster:       streamAttr.entity_picture || null,
        _noIS:         false,
      };
      this._renderPopupEl();
    }
  }
}

// Attach live stream data to current popup (called after _openPopup for movie/TV from stream card)
_attachStreamData(entityId) {
  if (!this._popup) return;
  let state = 'idle', attr = {}, updatedAt = Date.now();
  if (entityId.startsWith('jellyfin:')) {
    const jf = (this._jellyfinSessions || []).find(s => s.id === entityId);
    if (jf) { state = jf.state; attr = jf.attr; }
    updatedAt = attr.media_position_updated_at
      ? new Date(attr.media_position_updated_at).getTime()
      : Date.now();
  } else if (entityId.startsWith('emby:')) {
    const emby = (this._embySessions || []).find(s => s.id === entityId);
    if (emby) { state = emby.state; attr = emby.attr; }
    updatedAt = attr.media_position_updated_at
      ? new Date(attr.media_position_updated_at).getTime()
      : Date.now();
  } else if (entityId.startsWith('plex:')) {
    // A Plex session read through the proxy is not a Home Assistant entity,
    // so asking the states for it gave the popup an empty stream.
    const px = (this._plexSessions || []).find(s => s.id === entityId);
    if (px) { state = px.state; attr = px.attr; }
    updatedAt = attr.media_position_updated_at
      ? new Date(attr.media_position_updated_at).getTime()
      : Date.now();
  } else {
    const s = this._hass?.states?.[entityId];
    attr = s?.attributes || {};
    state = s?.state || 'idle';
    updatedAt = attr.media_position_updated_at
      ? new Date(attr.media_position_updated_at).getTime()
      : Date.now();
  }
  this._popup._streamEntity   = entityId;
  this._popup._streamState    = state;
  this._popup._duration       = attr.media_duration || 0;
  this._popup._position       = attr.media_position || 0;
  this._popup._updatedAt      = updatedAt;
  this._popup._plexMachineId  = null;
  this._popup._jfSessionId    = entityId.startsWith('jellyfin:') ? entityId.replace('jellyfin:', '') : null;
  this._popup._embySessionId  = entityId.startsWith('emby:') ? entityId.replace('emby:', '') : null;
  const isKodiSession = (this._kodiSessions || []).some(s => s.id === entityId);
  this._popup._kodiEntityId   = isKodiSession ? entityId : null;
  // A Jellyfin session cannot be driven from a browser, but JellyHA's player
  // for the same session can (#39). The row is still the proxy's, so the
  // progress bar and everything keyed on the session id stay as they are.
  this._popup._ctrlEntity     = this._streamControlEntity(entityId);
  // A Plex session read through the proxy is driven by its machine id rather
  // than by an entity; the popup was only given one for Plex players that
  // Home Assistant happens to expose, so proxy sessions had no controls.
  if (entityId.startsWith('plex:')) {
    const ps = (this._plexSessions || []).find(x => x.id === entityId);
    if (ps?._machineIdentifier && ps._plexCanControl) {
      this._popup._plexMachineId = ps._machineIdentifier;
      this._popup._plexPlayerUrl = ps._playerUrl || null;
    }
  }
  if (entityId.startsWith('media_player.plex_')) this._fetchPlexMachineId(entityId);
}

_plexSlug(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Home Assistant names its Plex entities after the client — "Plex (<user> -
// <product> - <device>)" — so the entity id says which player is streaming,
// independent of what is on screen. Matching sessions on that instead of the
// media title stops two players watching two different titles that share a
// name from picking up each other's metadata.
_plexSessionForEntity(sessions, entityId) {
  const want = (entityId || '').replace(/^media_player\.plex_/, '').replace(/_\d+$/, '');
  if (!want) return null;
  return (sessions || []).find(s => {
    const p   = s.Player || {};
    const dev = p.device || p.title || '';
    const withUser = this._plexSlug([s.User?.title, p.product, dev].filter(Boolean).join(' '));
    const noUser   = this._plexSlug([p.product, dev].filter(Boolean).join(' '));
    return want === withUser || want === noUser;
  }) || null;
}

// Falls back to title + position only when the player could not be identified.
// The old "if there is exactly one session, take it" guess is gone: a session
// belonging to someone else is worse than no ids at all.
_plexSessionFallback(sessions, entityId) {
  const attr     = this._hass?.states?.[entityId]?.attributes || {};
  const rawTitle = (attr.media_title || '').replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase();
  if (!rawTitle) return null;
  const mediaPos = attr.media_position || 0;
  return (sessions || []).find(s => {
    const st = (s.title || '').toLowerCase();
    return st === rawTitle && Math.abs((s.viewOffset || 0) / 1000 - mediaPos) < 60;
  }) || null;
}

// Resolves the SHOW's tvdb/tmdb id for an episode session. The episode's own
// Guid array is useless for matching against Sonarr, which keys on the series.
async _plexShowIds(session) {
  const out = { tvdbId: null, tmdbId: null };
  const take = guid => {
    if (typeof guid !== 'string') return;
    if (guid.startsWith('tvdb://')) out.tvdbId = guid.slice(7).split('?')[0];
    if (guid.startsWith('tmdb://')) out.tmdbId = guid.slice(7).split('?')[0];
    if (guid.startsWith('themoviedb://')) out.tmdbId = guid.slice(13).split('?')[0].split('/')[0];
  };
  take(session?.grandparentGuid);
  if (out.tvdbId || out.tmdbId) return out;

  // Modern agent: grandparentGuid is plex://show/<hash>, so ask the server for
  // the show item itself, which carries the real provider ids.
  const key = session?.grandparentRatingKey;
  if (!key) return out;
  try {
    const raw  = await this._hass.callApi('GET', `arr_stack/plex/metadata?ratingKey=${encodeURIComponent(key)}`);
    const show = raw?.MediaContainer?.Metadata?.[0];
    take(show?.guid);
    for (const g of (Array.isArray(show?.Guid) ? show.Guid : [])) take(g?.id);
  } catch (_) {}
  return out;
}

async _fetchPlexMachineId(entityId) {
  try {
    const [raw, clientsRaw] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/plex/sessions'),
      this._hass.callApi('GET', 'arr_stack/plex/clients').catch(() => null),
    ]);
    const clients = clientsRaw?.MediaContainer?.Server || [];
    const sessions = raw?.MediaContainer?.Metadata || [];
    if (!sessions.length) return;
    const match = this._plexSessionForEntity(sessions, entityId)
               || this._plexSessionFallback(sessions, entityId);
    const p = match?.Player;
    if (p && this._popup) {
      // Only a player that says it takes playback commands gets the buttons;
      // Plex Web says it does not, and quietly drops whatever is sent.
      const canControl = /playback/i.test(p.protocolCapabilities || '');
      this._popup._plexMachineId  = canControl ? p.machineIdentifier : null;
      this._popup._plexSessionId  = match?.Session?.id || match?.sessionKey || '';
      this._popup._plexSessionKey = match?.sessionKey || '';
      this._popup._plexUser       = match?.User?.title || '';
      this._popup._plexUserThumb  = match?.User?.thumb || '';
      const port     = p.port || (p.secure ? 32433 : 32500);
      const protocol = p.secure ? 'https' : 'http';
      this._popup._plexPlayerUrl  = (p.platform === 'tvOS' && p.address)
        ? `${protocol}://${p.address}:${port}` : null;
      this._renderPopupEl();
    }
  } catch (_) {
  }
}

// Seek via HA media_seek, or fall back to Plex direct API when HA seek unsupported
_doSeek(entityId, newPos) {
  this._markActivated();
  const supported = this._hass?.states?.[entityId]?.attributes?.supported_features || 0;
  const canSeek   = !!(supported & 2);
  if (canSeek) {
    this._hass.callService('media_player', 'media_seek', { entity_id: entityId, seek_position: newPos });
    return;
  }
  const machineId = this._popup?._plexMachineId;
  if (machineId) {
    this._hass.callApi('POST', 'arr_stack/plex/player', {
      action:            'seekTo',
      machineIdentifier: machineId,
      offset:            Math.round(newPos * 1000),
      playerUrl:         this._popup?._plexPlayerUrl || null,
    }).catch(() => {});
  }
}

// Update all progress fills for an entity across card + popup (call after seek)
_updateStreamFills(entityId, newPos, dur) {
  const pct = dur > 0 ? Math.min(newPos / dur * 100, 100).toFixed(2) : 0;
  const now = Date.now().toString();
  this.shadowRoot?.querySelectorAll(`.stream-prog-fill[data-entity="${entityId}"]`).forEach(f => {
    f.style.width     = pct + '%';
    f.dataset.pos     = newPos.toFixed(2);
    f.dataset.updated = now;
  });
}

// What a stream is playing, wherever the card reads it from.
_streamAttrOf(streamId) {
  if (!streamId) return {};
  for (const pool of [this._jellyfinSessions, this._plexSessions, this._embySessions, this._kodiSessions]) {
    const hit = (pool || []).find(s => s.id === streamId);
    if (hit) return hit.attr || {};
  }
  return this._hass?.states?.[streamId]?.attributes || {};
}

// The artist a stream is playing right now, as the library knows them. The
// name is all a player gives, which is what the Now Playing tile matches on
// too — one rule for both, or a tile and its window could disagree.
_musStreamArtist(streamId) {
  const a = this._streamAttrOf(streamId) || {};
  const want = normName(a.media_artist || a.media_album_artist);
  if (!want) return null;
  return [...(this._lidarrArtists?.values() || [])]
    .find(x => normName(x.artistName) === want) || null;
}

// A track that simply ended and handed over to the next one. A skip is
// watched for, but most changes are not skips — an album runs out, a shuffled
// playlist moves on — and the window stood on the track it was opened with
// until somebody pressed something.
_musWatchStream() {
  const streamId = this._musicModal?.stream;
  if (!streamId) { this._musWatchSig = null; return; }
  const sig = this._streamSignature(streamId);
  if (this._musWatchKey !== streamId) {
    // A different window, or the same one reopened: this is where it starts.
    this._musWatchKey = streamId;
    this._musWatchSig = sig;
    return;
  }
  if (sig === this._musWatchSig) return;
  this._musWatchSig = sig;
  // A skip is already being followed; two followers would fight over the window
  if (this._skipTimer) return;
  this._musFollowStream(streamId);
}

// A shuffled playlist walks from one artist to the next, and the window it
// is being watched in has to walk with it — redrawing the same artist around
// a track that is no longer theirs is worse than showing nothing.

// Everything a skip changes. The position is left out on purpose: it moves on
// its own, and waiting on it would call every second a new track.
_streamSignature(streamId) {
  const a = this._streamAttrOf(streamId) || {};
  return [
    a.media_title, a.media_series_title, a.media_season, a.media_episode,
    a.media_artist, a.media_album_name, a.entity_picture,
  ].join('|');
}

// A session read through the proxy is polled every five seconds, so after a
// skip the card would show the old track for most of that. This asks again at
// once, and is the only place allowed past the throttle.
async _streamRefetch(streamId) {
  const id = String(streamId || '');
  if (id.startsWith('jellyfin:')) { this._jellyfinLastFetch = 0; await this._fetchJellyfinSessions(); }
  else if (id.startsWith('emby:')) { this._embyLastFetch = 0; await this._fetchEmbySessions(); }
  else if (id.startsWith('plex:')) { this._plexLastFetch = 0; await this._fetchPlexSessions(); }
}

// Next and previous: the command goes out, and the card follows the moment the
// player answers rather than on a fixed wait. A player takes a beat to load
// the next track, so what is shown cannot change before it does — but it must
// change as soon as it has, not two seconds later.
_streamAfterSkip(streamId, apply) {
  const before = this._streamSignature(streamId);
  const token = (this._skipWatch || 0) + 1;
  this._skipWatch = token;
  const tick = async (left) => {
    // A newer skip, or a closed window, owns the card now
    if (this._skipWatch !== token) return;
    await this._streamRefetch(streamId);
    if (this._skipWatch !== token) return;
    if (this._streamSignature(streamId) !== before) { apply(); return; }
    if (left <= 0) { apply(); return; }
    this._skipTimer = setTimeout(() => tick(left - 1), 300);
  };
  this._skipTimer = setTimeout(() => tick(20), 150);
}

// The popup, redrawn around whatever is playing now.
_streamRefreshPopup(streamId) {
  const d = this._popup;
  if (!d || d._streamEntity !== streamId) return;
  if (d._type !== POPUP_TYPE.STREAM) { this._attachStreamData(streamId); this._renderPopupEl(); return; }
  const a = this._streamAttrOf(streamId) || {};
  this._popup = {
    ...d,
    title:      a.media_title || d.title,
    _artist:    a.media_artist || '',
    _album:     a.media_album_name || '',
    _duration:  a.media_duration || 0,
    _position:  a.media_position || 0,
    _updatedAt: a.media_position_updated_at ? new Date(a.media_position_updated_at).getTime() : Date.now(),
    _poster:    a.entity_picture || null,
  };
  this._renderPopupEl();
}

// Sync music popup to current hass state (called from _renderStreams on each refresh)
_syncStreamPopup() {
  const d = this._popup;
  if (!d || !d._streamEntity) return;

  const s    = this._hass?.states?.[d._streamEntity];
  if (!s) return;
  const attr = s.attributes || {};

  // For STREAM type (music) — full re-render on title/state change
  if (d._type === POPUP_TYPE.STREAM) {
    if (d._plexTerminated) return; // frozen
    if (attr.media_title === d.title && s.state === d._streamState) return;
    this._popup = {
      ...d,
      _streamState: s.state,
      title:        attr.media_title || d.title,
      _artist:      attr.media_artist || '',
      _album:       attr.media_album_name || '',
      _duration:    attr.media_duration || 0,
      _position:    attr.media_position || 0,
      _updatedAt:   attr.media_position_updated_at
        ? new Date(attr.media_position_updated_at).getTime()
        : Date.now(),
      _poster:      attr.entity_picture || null,
    };
    this._renderPopupEl();
    return;
  }

  // For movie/TV popup — just update stream state + play/pause icon without full re-render
  if (d._plexTerminated) return; // session terminated — freeze state, ignore HA updates
  if (s.state !== d._streamState) {
    d._streamState = s.state;
    d._position    = attr.media_position || 0;
    d._duration    = attr.media_duration || 0;
    d._updatedAt   = attr.media_position_updated_at
      ? new Date(attr.media_position_updated_at).getTime()
      : Date.now();
    // Flip play/pause icon in controls
    const root = this.shadowRoot?.getElementById('popup-root');
    const btn  = root?.querySelector('[data-action="stream-playpause"]');
    if (btn) {
      const playing = s.state === 'playing';
      btn.innerHTML = playing
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
  }
}

// ─────────────────────────────────────────────
// Stream controls embedded in movie/TV popup
// ─────────────────────────────────────────────
// The transport row, the one every popup uses: the artist window, a stream's
// own popup and the detail of a film or episode. They drifted apart — a lone
// oversized button in one, three of another size in the next — so the markup
// lives here and each caller says only what the player can do.
_streamCtrlRowHtml(entityId, { playing, feats = 0, plexFallback = false, step = true, style = '' } = {}) {
  const canPause = !!(feats & 1) || plexFallback;
  const canPlay  = !!(feats & 16384) || plexFallback;
  if (!canPause && !canPlay) return '';
  const eid  = this._escHtml(entityId || '');
  // Skipping is for something with a next one: an episode or a track. A film
  // has neither. The player's own features do not say so — JellyHA reports the
  // same mask for a film as for an episode — so the caller decides.
  const canStep = step && ((!!(feats & 16) && !!(feats & 32)) || plexFallback);
  const btn = (action, icon, size, cls = 'popup-ctrl-btn', title = '') =>
    `<button class="${cls}" data-action="${action}" data-entity="${eid}"${title ? ` title="${this._escHtml(title)}"` : ''}><ha-icon icon="mdi:${icon}" style="--mdc-icon-size:${size}px"></ha-icon></button>`;
  return `
    <div class="popup-stream-ctrls" style="display:flex;align-items:center;gap:14px;${style}">
      ${canStep ? btn('stream-prev', 'skip-previous', 22, 'popup-ctrl-btn', this._t('previous')) : ''}
      ${btn('stream-playpause', playing ? 'pause' : 'play', 26, 'popup-ctrl-btn popup-ctrl-btn-main', this._t(playing ? 'pause' : 'resume'))}
      ${canStep ? btn('stream-next', 'skip-next', 22, 'popup-ctrl-btn', this._t('next')) : ''}
    </div>`;
}

// What a stream's transport is sent to. A player Home Assistant already has an
// entity for is driven directly; a Jellyfin session needs JellyHA's player for
// the same session; a Plex session read through the proxy has neither and goes
// by its machine id instead (see _plexMachineId).
_streamControlEntity(streamId) {
  if (!streamId) return '';
  if (String(streamId).startsWith('media_player.')) return streamId;
  return this._jhControlEntity(streamId) || '';
}

_renderPopupStreamControls(d) {
  // Two different ids. The progress fill is found by the stream's own id, the
  // same one the card's tile uses; the transport is sent to whatever can
  // actually be driven, which for Jellyfin is JellyHA's player.
  const fillId  = d._streamEntity;
  const eid     = d._ctrlEntity || d._streamEntity;
  const dur     = d._duration || 0;
  const pos     = d._position || 0;
  const upd     = d._updatedAt || Date.now();
  const playing = d._streamState === 'playing';
  const elapsed = playing ? (Date.now() - upd) / 1000 : 0;
  const current = Math.min(pos + elapsed, dur);
  const initPct = dur > 0 ? (current / dur * 100).toFixed(2) : 0;
  const fmt     = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const timeLabel = dur > 0 ? `${fmt(current)} / ${fmt(dur)}` : '';
  // Seek is for Plexamp (music popup) and for a Jellyfin session JellyHA can
  // drive; every other player is read-only here.
  const _ctrlFeats  = this._hass?.states?.[d._ctrlEntity || '']?.attributes?.supported_features || 0;
  const canSeek     = !!(_ctrlFeats & 2);
  const canPlexSeek = !!d._plexMachineId;

  const seekBar = dur > 0 ? `
    <div ${(canSeek || canPlexSeek) ? `class="stream-seek-wrap" data-action="stream-seek" data-entity="${this._escHtml(eid)}" data-fill="${this._escHtml(fillId)}" data-dur="${dur}" style="cursor:pointer;padding:5px 0"` : `style="padding:5px 0"`}>
      <div class="stream-popup-track" style="position:relative;height:4px;border-radius:2px;overflow:hidden">
        <div class="stream-prog-fill stream-popup-fill" data-entity="${this._escHtml(fillId)}" data-pos="${pos}" data-dur="${dur}" data-updated="${upd}" style="position:absolute;inset:0 auto 0 0;width:${initPct}%;border-radius:2px;transition:none"></div>
      </div>
    </div>
    <div class="stream-popup-time" style="font-size:10px">${timeLabel}</div>` : '';

  // Until now a film or episode opened from a stream showed the bar and
  // nothing else — the buttons lived only in the music popup. Anything the
  // card can drive gets them: Plex through its own entity, Jellyfin through
  // JellyHA's player.
  // A film is one thing from beginning to end; an episode sits in a season
  const isMovieType = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
  const buttons = this._streamCtrlRowHtml(eid, {
    playing, feats: _ctrlFeats, plexFallback: !!d._plexMachineId,
    step: !isMovieType, style: 'margin-top:6px',
  });

  // The order the artist window uses: the bar, its clock, then the transport.
  // Only its width differs — a detail has the room, so the bar runs the whole
  // way rather than stopping where the artist window's does.
  return `<div class="mus-stream-bar pp-stream-bar">
    ${seekBar}
    ${buttons}
  </div>`;
}

// ─────────────────────────────────────────────
// Music / stream popup renderer
// ─────────────────────────────────────────────

_renderStreamPopup(d) {
  const isPlaying = d._streamState === 'playing';
  const title     = this._escHtml(d.title   || '');
  const artist    = this._escHtml(d._artist || '');
  const album     = this._escHtml(d._album  || '');
  const duration  = d._duration || 0;
  const position  = d._position || 0;
  const updatedAt = d._updatedAt || Date.now();
  const elapsed   = isPlaying ? (Date.now() - updatedAt) / 1000 : 0;
  const currentPos = Math.min(position + elapsed, duration);
  const initPct   = duration > 0 ? (currentPos / duration * 100).toFixed(2) : 0;

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const timeLabel = duration > 0 ? `${fmt(currentPos)} / ${fmt(duration)}` : '';

  const eid        = this._escHtml(d._ctrlEntity || d._streamEntity || '');
  const posterUrl  = d._poster || '';
  const posterHtml = posterUrl
    ? `<img class="popup-poster" src="${this._escHtml(posterUrl)}" loading="lazy" onerror="this.style.display='none'" />`
    : '';
  const backdropStyle = posterUrl
    ? `background-image:url('${this._escHtml(posterUrl)}');background-size:cover;background-position:center;filter:blur(6px) brightness(0.4)`
    : 'background:linear-gradient(135deg,rgba(20,20,40,1),rgba(40,20,60,1))';

  const subLine = [artist, album].filter(Boolean).join(' · ');

  const rawEid      = d._ctrlEntity || d._streamEntity || '';
  const suppFeats   = this._hass?.states?.[rawEid]?.attributes?.supported_features || 0;
  const canSeek     = !!(suppFeats & 2);
  const canPlexSeek = !!d._plexMachineId;

  const seekBar = duration > 0 ? `
    <div ${(canSeek || canPlexSeek) ? `class="stream-seek-wrap" data-action="stream-seek" data-entity="${eid}" data-fill="${this._escHtml(d._streamEntity || '')}" data-dur="${duration}" style="cursor:pointer;padding:6px 0;margin-bottom:4px"` : `style="padding:6px 0;margin-bottom:4px"`}>
      <div class="stream-prog-track" style="height:4px;position:relative;bottom:auto;left:auto;right:auto;border-radius:2px">
        <div class="stream-prog-fill" data-entity="${this._escHtml(d._streamEntity || '')}" data-pos="${position}" data-dur="${duration}" data-updated="${updatedAt}" style="width:${initPct}%;transition:none;border-radius:2px"></div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span class="stream-popup-time" style="font-size:10px;color:rgba(255,255,255,0.4)">${timeLabel}</span>
      ${this._streamRangeBadge(this._streamRangeOf(d._streamEntity), { long: true, cls: 'pp-hdr-chip' })}
    </div>` : '';
  const controls = this._streamCtrlRowHtml(d._ctrlEntity || d._streamEntity, {
    playing: isPlaying, feats: suppFeats, plexFallback: !!d._plexMachineId,
    // This popup is music and whatever the card could not place; both have a
    // next one, unlike a film
    step: true, style: 'margin-top:4px',
  });


  return `
    <div class="popup-overlay${dayClass(this)}">
      <div class="popup-glass">
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
              ${seekBar}
              ${controls}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// Plex Cast helpers
// ─────────────────────────────────────────────

// `silent` keeps the popup untouched: the cast drawer patches itself and a
// re-render would close it. `maxAge` lets a warm list be reused instead of
// making the user wait for a round trip they cannot see the point of.
async _fetchPlexClients({ silent = false, maxAge = 0 } = {}) {
  if (maxAge && this._plexClients && Date.now() - (this._plexClientsTs || 0) < maxAge) return;
  const states = this._hass?.states || {};
  const online = new Set(['playing', 'paused', 'idle', 'standby', 'on']);

  const allPlayers = Object.entries(states)
    .filter(([id, s]) => id.startsWith('media_player.plex_') && s.state !== 'unavailable')
    .map(([id, s]) => ({ entityId: id, name: s.attributes?.friendly_name || id }));

  try {
    // Try Plex /clients for currently-active Plex clients
    const raw = await this._callApi('GET', 'arr_stack/plex/clients');
    const mc = raw?.MediaContainer || raw || {};
    const clients = mc.Server || mc.Device || mc.Client || [];

    const seen = new Set();
    const result = [];

    // First: Plex active clients matched to HA entities
    for (const c of clients) {
      const cName = (c.name || c.Name || c.title || '').trim();
      const cLow  = cName.toLowerCase();
      const ha = allPlayers.find(e => e.name.toLowerCase().includes(cLow) || cLow.includes(e.name.toLowerCase()));
      if (ha && !seen.has(ha.entityId)) {
        seen.add(ha.entityId);
        result.push({ name: cName, entityId: ha.entityId });
      }
    }

    // Then: remaining online media_players (Cast devices etc.) not already listed
    for (const p of allPlayers) {
      if (!seen.has(p.entityId)) {
        seen.add(p.entityId);
        result.push(p);
      }
    }

    this._plexClients = result;
  } catch {
    this._plexClients = allPlayers;
  }
  this._plexClientsTs = Date.now();
  if (!silent) this._renderPopupEl();
}

_renderPlexCastBtn(d, movieInLib, showInLib) {
  const isMovieType = d._type === 'radarr' || d._type === 'movie';
  const isShowType  = d._type === 'sonarr' || d._type === 'tv';
  const inLib = isMovieType ? movieInLib : (isShowType ? showInLib : false);
  if (!inLib) return '';

  const castSvg = `<svg viewBox="0 0 24 24" width="14" height="14" style="display:block"><path fill="currentColor" d="M1 18v3h3a3 3 0 0 0-3-3m0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7m0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10m20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`;
  const spinner = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>`;
  const _btnCommon = `flex-shrink:0;width:36px;height:36px;padding:0;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:background 0.15s,color 0.15s,border-color 0.15s`;
  const btnBase   = `${_btnCommon};border:none;background:rgba(0,0,0,0.45);color:#fff`;
  const btnActive = `${_btnCommon};border:1px solid rgba(0,122,255,0.5);background:rgba(0,122,255,0.25);color:#fff`;

  if (this._plexCasting) {
    return `<button disabled style="${btnBase};opacity:0.6">${spinner}</button>`;
  }

  // Dropdown is rendered outside popup-glass (in _renderPlexCastDropdown), so button always shows
  const btnStyle = this._plexCastOpen ? btnActive : btnBase;
  return `<button data-action="plex-cast-open" style="${btnStyle}">${castSvg}</button>`;
}

_renderPlexCastDropdown() {
  if (!this._plexCastOpen) return '';
  const r = this._plexCastBtnRect;
  if (!r) return '';

  const castSvg = `<svg viewBox="0 0 24 24" width="12" height="12" style="display:block;flex-shrink:0"><path fill="currentColor" d="M1 18v3h3a3 3 0 0 0-3-3m0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7m0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10m20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`;
  const spinner = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>`;

  let dropContent;
  if (this._plexClients === null) {
    dropContent = `<div style="padding:10px 14px;font-size:11px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:8px">${spinner} Loading…</div>`;
  } else if (!this._plexClients.length) {
    dropContent = `<div style="padding:10px 14px;font-size:11px;color:rgba(255,255,255,0.45)">No devices found</div>`;
  } else {
    dropContent = this._plexClients.map(p =>
      `<button data-action="plex-cast-play" data-entity="${this._escHtml(p.entityId)}"
        style="display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;padding:7px 12px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);cursor:pointer;text-align:left;border-radius:6px;transition:background 0.12s"
        onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"
      >${castSvg}${this._escHtml(p.name)}</button>`
    ).join('');
  }

  const dropW = 190, dropH = 220, gap = 8;
  const leftPx = Math.max(8, Math.round(r.left - gap - dropW));
  const topPx  = Math.max(8, Math.min(Math.round(r.top), window.innerHeight - dropH - 8));

  return `<div class="plex-cast-dropdown" style="position:absolute;left:${leftPx}px;top:${topPx}px;z-index:9999;background:rgba(18,18,28,0.97);border:1px solid rgba(255,255,255,0.12);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);min-width:${dropW}px;max-height:${dropH}px;overflow-y:auto;padding:4px;display:flex;flex-direction:column">
    ${dropContent}
  </div>`;
}


// The stream's seek bar: tap and drag on touch screens.
_ppWireSeek(root) {
  // ── Stream seek bar — touch support (tap + drag on mobile/tablet) ──
  const seekWrap = root.querySelector('.stream-seek-wrap');
  if (seekWrap) {
    const applySeek = (clientX, commit) => {
      const rect   = seekWrap.getBoundingClientRect();
      const pct    = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const dur    = parseFloat(seekWrap.dataset.dur);
      const eid    = seekWrap.dataset.entity;
      if (dur > 0 && eid) {
        const newPos = pct * dur;
        this._updateStreamFills(eid, newPos, dur);
        if (commit) this._doSeek(eid, newPos);
      }
    };
    seekWrap.addEventListener('touchstart', e => {
      e.preventDefault();
      applySeek(e.touches[0].clientX, true);
    }, { passive: false });
    seekWrap.addEventListener('touchmove', e => {
      e.preventDefault();
      applySeek(e.touches[0].clientX, false);
    }, { passive: false });
    seekWrap.addEventListener('touchend', e => {
      e.preventDefault();
      applySeek(e.changedTouches[0].clientX, true);
    }, { passive: false });
  }
}

// A stream's detail: live progress and the time label.
// Dragging the progress bar. Clicking it already seeked; holding and moving
// did nothing, which is what a bar that looks like this invites. The fill
// follows the finger and the seek is sent once, on release.
_ppWireSeekDrag(root) {
  root.querySelectorAll('.stream-seek-wrap').forEach(wrap => {
    if (wrap._seekWired) return;
    wrap._seekWired = true;

    const posFrom = e => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
      const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      return { pct, dur: parseFloat(wrap.dataset.dur) || 0 };
    };
    const paint = pct => {
      const fill = wrap.querySelector('.stream-prog-fill');
      if (fill) fill.style.width = (pct * 100).toFixed(2) + '%';
      const timeEl = root.querySelector('.stream-popup-time');
      const dur = parseFloat(wrap.dataset.dur) || 0;
      if (timeEl && dur > 0) {
        const fmt = v => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
        timeEl.textContent = `${fmt(pct * dur)} / ${fmt(dur)}`;
      }
    };

    // Move and release are listened for on the document, not on the bar. A
    // pointer capture that does not take — or a finger that leaves the bar,
    // which is most of them — meant the release landed elsewhere: the fill
    // followed along and nothing was ever sent.
    const onMove = e => {
      if (this._seekDrag?.wrap !== wrap) return;
      const { pct } = posFrom(e);
      this._seekDrag.pct = pct;
      this._seekDrag.moved = true;
      paint(pct);
    };
    const onUp = e => {
      if (this._seekDrag?.wrap !== wrap) return;
      const drag = this._seekDrag;
      this._seekDrag = null;
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      const dur = parseFloat(wrap.dataset.dur) || 0;
      if (dur <= 0 || e.type === 'pointercancel') return;
      // A press without a drag seeks to where it landed. It used to be left to
      // the click handler, but preventDefault on pointerdown — which is what
      // stops the page selecting text while dragging — suppresses the click
      // that would have followed, so pressing did nothing at all.
      const newPos = drag.pct * dur;
      this._updateStreamFills(wrap.dataset.fill || wrap.dataset.entity, newPos, dur);
      this._doSeek(wrap.dataset.entity, newPos);
      // The click that follows a drag would seek a second time
      // Whatever click still arrives would seek a second time
      this._seekJustDragged = true;
      setTimeout(() => { this._seekJustDragged = false; }, 300);
    };

    wrap.addEventListener('pointerdown', e => {
      const { pct } = posFrom(e);
      // While a finger is down the ticking timer would fight it
      this._seekDrag = { wrap, pct, moved: false };
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onUp, true);
      paint(pct);
      e.preventDefault();
    });
  });
}

_ppStreamProgress(root) {
  // ── Stream popup: live progress + time label update ──
  if (this._popup?._type === POPUP_TYPE.STREAM || this._popup?._streamEntity) {
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    this._streamPopupTimer = setInterval(() => {
      const fill   = root.querySelector('.stream-prog-fill');
      const timeEl = root.querySelector('.stream-popup-time');
      if (!fill) return;
      const pos       = parseFloat(fill.dataset.pos);
      const dur       = parseFloat(fill.dataset.dur);
      const updatedAt = parseFloat(fill.dataset.updated);
      if (!dur) return;
      if (this._seekDrag) return;   // a finger is on the bar
      const playing = this._popup?._streamState === 'playing';
      const elapsed = playing ? (Date.now() - updatedAt) / 1000 : 0;
      const current = Math.min(pos + elapsed, dur);
      fill.style.width = (current / dur * 100).toFixed(2) + '%';
      if (timeEl) timeEl.textContent = `${fmt(current)} / ${fmt(dur)}`;
    }, 1000);
  }
}
}

export const popupStreamMixin = _PopupStreamMethods.prototype;
