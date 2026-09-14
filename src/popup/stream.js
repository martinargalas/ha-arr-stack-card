import { POPUP_TYPE } from '../constants.js';
import { dayClass } from '../shared/ui.js';

// Now Playing: the popup a playing stream opens, its transport and seek bar,
// and playing a title on a Plex client. Split out of popup/index.js.

class _PopupStreamMethods {

// ─────────────────────────────────────────────
// Stream popup — open from stream card click
// ─────────────────────────────────────────────

async _openStreamPopup(entityId, contentType, trackTitle, seriesTitle) {
  const isMusic  = contentType === 'music' || contentType === 'artist' || contentType === 'album';
  const streamAttr = this._hass?.states?.[entityId]?.attributes || {};
  const isLiveTV = contentType === 'channel' || !!streamAttr.media_channel
                 || streamAttr.media_library_title === 'Live TV';
  const isTV     = isLiveTV || contentType === 'tvshow' || contentType === 'episode'
                 || !!seriesTitle || !!streamAttr.media_series_title;

  if (isMusic) {
    const s    = this._hass?.states?.[entityId];
    const attr = s?.attributes || {};
    this._popup = {
      _type:         POPUP_TYPE.STREAM,
      _streamEntity: entityId,
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
    const lookupTitle = seriesTitle || trackTitle;
    const lt = lookupTitle.toLowerCase();

    // Ids first. Two different shows can carry the same name, and the old
    // bidirectional includes() also paired "Alien" with "Aliens".
    let showIds = { tvdbId: null, tmdbId: null };
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
    const _snMatch = arr => (arr || []).find(s => (s.title?.toLowerCase() || '') === lt);
    const s  = _snById(this._sonarr)  || _snMatch(this._sonarr);
    const s2 = !s && (_snById(this._sonarr2) || _snMatch(this._sonarr2));
    const snHit = s || s2;
    if (snHit) {
      const popType = snHit === s ? POPUP_TYPE.SONARR : POPUP_TYPE.SONARR;
      await this._openPopup(popType, snHit.tmdbId ? String(snHit.tmdbId) : null, snHit.tvdbId ? String(snHit.tvdbId) : null, snHit.title);
    } else if (this._overseerrConfigured !== false) {
      // Not in Sonarr + Overseerr available — search for tmdbId
      let tvTmdbId = null;
      try {
        const sr = await this._hass.callApi('POST', 'arr_stack/overseerr/search', { query: lookupTitle, page: 1 });
        const hit = (sr?.results || []).find(r => r.mediaType === 'tv');
        if (hit?.id) tvTmdbId = String(hit.id);
      } catch (_) {}
      await this._openPopup(POPUP_TYPE.TV, tvTmdbId, null, lookupTitle);
    } else {
      // No Overseerr — local fallback
      await this._openPopup(POPUP_TYPE.TV, null, null, lookupTitle);
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
  const _normT = s => (s || '').toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').trim();

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
      this._popup._plexMachineId  = p.machineIdentifier;
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
_renderPopupStreamControls(d) {
  const eid     = d._streamEntity;
  const dur     = d._duration || 0;
  const pos     = d._position || 0;
  const upd     = d._updatedAt || Date.now();
  const playing = d._streamState === 'playing';
  const elapsed = playing ? (Date.now() - upd) / 1000 : 0;
  const current = Math.min(pos + elapsed, dur);
  const initPct = dur > 0 ? (current / dur * 100).toFixed(2) : 0;
  const fmt     = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const timeLabel = dur > 0 ? `${fmt(current)} / ${fmt(dur)}` : '';
  const canSeek     = false; // seek only for Plexamp (music popup)
  const canPlexSeek = false;

  const seekBar = dur > 0 ? `
    <div ${(canSeek || canPlexSeek) ? `class="stream-seek-wrap" data-action="stream-seek" data-entity="${this._escHtml(eid)}" data-dur="${dur}" style="cursor:pointer;padding:6px 0;margin-bottom:2px"` : `style="padding:6px 0;margin-bottom:2px"`}>
      <div class="stream-popup-track" style="position:relative;height:4px;border-radius:2px;overflow:hidden">
        <div class="stream-prog-fill stream-popup-fill" data-entity="${this._escHtml(eid)}" data-pos="${pos}" data-dur="${dur}" data-updated="${upd}" style="position:absolute;inset:0 auto 0 0;width:${initPct}%;border-radius:2px;transition:none"></div>
      </div>
    </div>
    <div class="stream-popup-time" style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:8px">${timeLabel}</div>` : '';

  return `<div style="margin-top:10px;margin-bottom:2px">
    ${seekBar}
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

  const eid        = this._escHtml(d._streamEntity || '');
  const posterUrl  = d._poster || '';
  const posterHtml = posterUrl
    ? `<img class="popup-poster" src="${this._escHtml(posterUrl)}" loading="lazy" onerror="this.style.display='none'" />`
    : '';
  const backdropStyle = posterUrl
    ? `background-image:url('${this._escHtml(posterUrl)}');background-size:cover;background-position:center;filter:blur(6px) brightness(0.4)`
    : 'background:linear-gradient(135deg,rgba(20,20,40,1),rgba(40,20,60,1))';

  const subLine = [artist, album].filter(Boolean).join(' · ');

  const rawEid      = d._streamEntity || '';
  const suppFeats   = this._hass?.states?.[rawEid]?.attributes?.supported_features || 0;
  const canControl  = !!(suppFeats & 1) || !!(suppFeats & 16384) || !!d._plexMachineId;
  const canSeek     = !!(suppFeats & 2);
  const canPlexSeek = !!d._plexMachineId;

  const seekBar = duration > 0 ? `
    <div ${(canSeek || canPlexSeek) ? `class="stream-seek-wrap" data-action="stream-seek" data-entity="${eid}" data-dur="${duration}" style="cursor:pointer;padding:6px 0;margin-bottom:4px"` : `style="padding:6px 0;margin-bottom:4px"`}>
      <div class="stream-prog-track" style="height:4px;position:relative;bottom:auto;left:auto;right:auto;border-radius:2px">
        <div class="stream-prog-fill" data-entity="${eid}" data-pos="${position}" data-dur="${duration}" data-updated="${updatedAt}" style="width:${initPct}%;transition:none;border-radius:2px"></div>
      </div>
    </div>
    <div class="stream-popup-time" style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:10px">${timeLabel}</div>` : '';
  const controls = canControl ? `
    <div style="display:flex;align-items:center;gap:16px;margin-top:4px">
      <button class="popup-ctrl-btn" data-action="stream-prev" data-entity="${eid}">
        <ha-icon icon="mdi:skip-previous" style="--mdc-icon-size:26px"></ha-icon>
      </button>
      <button class="popup-ctrl-btn popup-ctrl-btn-main" data-action="stream-playpause" data-entity="${eid}">
        <ha-icon icon="mdi:${isPlaying ? 'pause' : 'play'}" style="--mdc-icon-size:32px"></ha-icon>
      </button>
      <button class="popup-ctrl-btn" data-action="stream-next" data-entity="${eid}">
        <ha-icon icon="mdi:skip-next" style="--mdc-icon-size:26px"></ha-icon>
      </button>
    </div>` : '';


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
