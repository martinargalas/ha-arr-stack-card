class _SessionsMethods {

async _fetchPlexSessions() {
  // Throttle — max once per 5 s to avoid hammering Plex
  const now = Date.now();
  if (now - (this._plexLastFetch || 0) < 5000) return;
  this._plexLastFetch = now;
  try {
    const raw = await this._callApi('GET', 'arr_stack/plex/sessions');
    if (Array.isArray(raw)) {
      // Empty array = proxy returned 200+[] meaning Plex not configured
      this._plexConfigured = false;
      this._plexSessions = [];
      return;
    }
    this._plexConfigured = true;
    const sessions = raw?.MediaContainer?.Metadata || [];
    this._plexSessions = sessions
      .filter(s => s.Player?.machineIdentifier && (s.Player.state === 'playing' || s.Player.state === 'paused'))
      .map(s => this._normalizePlexSession(s));
    await this._resolvePlexSessionIds();
  } catch (_) {
    this._plexConfigured = false;
    this._plexSessions = [];
  }
}

_normalizePlexSession(s) {
  const player = s.Player || {};
  const type   = s.type || '';
  const isTV    = type === 'episode';
  const isMusic = type === 'track';

  // Store raw thumb path — full proxy URL constructed fresh at render time to avoid token expiry
  const poster = null; // set via attr._plexThumb below

  // Device icon/name — use product + device + platform for best match
  const productStr  = (player.product  || '').toLowerCase();
  const deviceStr   = (player.device   || '').toLowerCase();
  const platformStr = (player.platform || '').toLowerCase();
  const nl = `${productStr} ${deviceStr} ${platformStr}`;
  let deviceIcon = 'mdi:television';
  let deviceName = 'TV';
  if (/plexamp/i.test(productStr)) {
    // Plexamp — detect device type from device/platform
    if (/ipad|ipados/i.test(nl))          { deviceIcon = 'mdi:tablet';    deviceName = 'iPad'; }
    else if (/iphone|ios/i.test(nl))      { deviceIcon = 'mdi:cellphone'; deviceName = 'iPhone'; }
    else if (/android/i.test(nl))         { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }
    else if (/mac|macos/i.test(nl))       { deviceIcon = 'mdi:laptop';    deviceName = 'Mac'; }
    else if (/windows/i.test(nl))         { deviceIcon = 'mdi:monitor';   deviceName = 'PC'; }
    else                                  { deviceIcon = 'mdi:music';     deviceName = 'Plexamp'; }
  } else if (/iphone|for ios/i.test(nl))                                        { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }
  else if (/ipad|ipados/i.test(nl))                                             { deviceIcon = 'mdi:tablet';    deviceName = 'Tablet'; }
  else if (/macbook|for mac\b|mac desktop/i.test(nl))                          { deviceIcon = 'mdi:laptop';    deviceName = 'Mac'; }
  else if (/laptop/i.test(nl))                                                  { deviceIcon = 'mdi:laptop';    deviceName = 'Notebook'; }
  else if (/windows|for windows|desktop|pc\b/i.test(nl))                       { deviceIcon = 'mdi:monitor';   deviceName = 'PC'; }
  else if (/web|chrome|browser|safari|firefox/i.test(nl))                      { deviceIcon = 'mdi:web';       deviceName = 'Browser'; }
  else if (/apple\s*tv|android\s*tv|fire\s*tv|roku|shield/i.test(nl))         { deviceIcon = 'mdi:television'; deviceName = 'TV'; }
  else if (/android/i.test(nl))                                                 { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }

  const port     = player.port || (player.secure ? 32433 : 32500);
  const protocol = player.secure ? 'https' : 'http';
  const playerUrl = player.address ? `${protocol}://${player.address}:${port}` : null;

  return {
    id:    `plex:${player.machineIdentifier}`,
    source: 'plex',
    state:  player.state || 'playing',
    attr: {
      media_content_type:      isTV ? 'episode' : isMusic ? 'music' : 'movie',
      media_title:             s.title || '',           // episode title / movie title / track title
      media_series_title:      isTV    ? (s.grandparentTitle || '') : '',
      media_season:            isTV    ? (s.parentIndex || 0) : 0,
      media_episode:           isTV    ? (s.index || 0) : 0,
      media_artist:            isMusic ? (s.grandparentTitle || '') : '',
      media_album_name:        isMusic ? (s.parentTitle || '') : '',
      media_channel:           '',
      media_library_title:     '',
      entity_picture:          null,   // Plex poster built fresh at render via _plexThumb
      _plexThumb:              s.thumb || s.parentThumb || s.grandparentThumb || '',
      media_duration:          Math.round((s.duration  || 0) / 1000),
      media_position:          Math.round((s.viewOffset || 0) / 1000),
      media_position_updated_at: new Date().toISOString(),
      friendly_name:           player.product || player.title || '',
      supported_features:      0,
    },
    _machineIdentifier: player.machineIdentifier,
    _playerUrl:         playerUrl,
    _plexUser:          s.User?.title || '',
    _plexUserThumb:     s.User?.thumb || '',
    _plexSessionId:     s.Session?.id || s.sessionKey || '',
    _plexSessionKey:    s.sessionKey || '',
    // Plex states the title in the viewer's language, so opening the popup from
    // a stream used to search the library by that name and miss ("Garfield ve
    // filmu" against "Garfield"). The session carries provider ids — those match
    // whatever the library calls it.
    _plexRatingKey:     s.ratingKey || '',
    _plexParentKey:     s.grandparentRatingKey || s.parentRatingKey || '',
    _plexGuids:         [s.guid, ...((s.Guid || []).map(g => g?.id))].filter(Boolean),
    _plexShowGuids:     (s.grandparentGuid ? [s.grandparentGuid] : []),
  };
}

// Plex names an item in the viewer's language and its artwork is whatever the
// server happens to hold, so neither the title nor the Plex thumb identifies the
// library entry. The provider ids do — they are on the item's own metadata when
// the session payload leaves them out, so fetch and cache them per rating key.
_plexIdsFromGuids(guids) {
  const out = { tmdbId: null, tvdbId: null };
  for (const g of (guids || [])) {
    if (typeof g !== 'string') continue;
    if (g.startsWith('tmdb://')) out.tmdbId = g.replace('tmdb://', '').split('?')[0];
    if (g.startsWith('tvdb://')) out.tvdbId = g.replace('tvdb://', '').split('?')[0];
  }
  return out;
}

async _plexIdsForKey(key) {
  if (!key) return { tmdbId: null, tvdbId: null };
  this._plexIdCache = this._plexIdCache || {};
  if (this._plexIdCache[key]) return this._plexIdCache[key];
  let ids = { tmdbId: null, tvdbId: null };
  try {
    const meta = await this._callApi('GET', `arr_stack/plex/metadata?ratingKey=${encodeURIComponent(key)}`);
    const md = meta?.MediaContainer?.Metadata?.[0];
    ids = this._plexIdsFromGuids([md?.guid, ...((md?.Guid || []).map(g => g?.id))].filter(Boolean));
  } catch (_) {}
  this._plexIdCache[key] = ids;
  return ids;
}

async _resolvePlexSessionIds() {
  for (const s of (this._plexSessions || [])) {
    const isTV = s.attr.media_content_type === 'episode';
    // For an episode the show's ids are what Sonarr is keyed by, so read the
    // grandparent rather than the episode itself.
    const own = this._plexIdsFromGuids(isTV ? s._plexShowGuids : s._plexGuids);
    let ids = own;
    if (!ids.tmdbId && !ids.tvdbId) {
      ids = await this._plexIdsForKey(isTV ? s._plexParentKey : s._plexRatingKey);
    }
    s._tmdbId = ids.tmdbId;
    s._tvdbId = ids.tvdbId;
  }
}

async _fetchJellyfinSessions() {
  const now = Date.now();
  if (now - (this._jellyfinLastFetch || 0) < 5000) return;
  this._jellyfinLastFetch = now;
  try {
    const raw = await this._callApi('GET', 'arr_stack/jellyfin/sessions');
    if (raw?._notConfigured) { this._jellyfinSessions = []; return; }
    const sessions = raw?.sessions || [];
    const serverUrl = raw?.server_url || '';
    const apiToken  = raw?.api_token  || '';
    this._jellyfinSessions = sessions.map(s => this._normalizeJellyfinSession(s, serverUrl, apiToken));
  } catch (_) {
    this._jellyfinSessions = [];
  }
}

_normalizeJellyfinSession(s, serverUrl, apiToken) {
  const np   = s.NowPlayingItem || {};
  const ps   = s.PlayState      || {};
  const type = (np.Type || '').toLowerCase();
  const isTV    = type === 'episode';
  const isMusic = type === 'audio';
  const nl = `${(s.Client || '')} ${(s.DeviceName || '')}`.toLowerCase();
  let deviceIcon = 'mdi:television';
  let deviceName = 'TV';
  if (/iphone|ios/i.test(nl))                                        { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }
  else if (/ipad/i.test(nl))                                         { deviceIcon = 'mdi:tablet';    deviceName = 'Tablet'; }
  else if (/macbook|for mac\b|mac desktop/i.test(nl))               { deviceIcon = 'mdi:laptop';    deviceName = 'Mac'; }
  else if (/windows|desktop|pc\b/i.test(nl))                        { deviceIcon = 'mdi:monitor';   deviceName = 'PC'; }
  else if (/web|chrome|browser|safari|firefox/i.test(nl))           { deviceIcon = 'mdi:web';       deviceName = 'Browser'; }
  else if (/android.*tv|fire.*tv|shield|apple.*tv/i.test(nl))       { deviceIcon = 'mdi:television'; deviceName = 'TV'; }
  else if (/android/i.test(nl))                                      { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }
  const itemId    = np.Id || '';
  const providers = np.ProviderIds || {};
  const poster    = itemId && serverUrl
    ? `${serverUrl}/Items/${itemId}/Images/Primary${apiToken ? '?api_key=' + apiToken : ''}`
    : null;
  return {
    id:    `jellyfin:${s.Id || s.id}`,
    source: 'jellyfin',
    state:  ps.IsPaused ? 'paused' : 'playing',
    attr: {
      media_content_type:        isTV ? 'episode' : isMusic ? 'music' : 'movie',
      media_title:               np.Name || '',
      media_series_title:        isTV ? (np.SeriesName || '') : '',
      media_season:              isTV ? (np.ParentIndexNumber || 0) : 0,
      media_episode:             isTV ? (np.IndexNumber || 0) : 0,
      media_artist:              isMusic ? (np.AlbumArtist || '') : '',
      media_album_name:          isMusic ? (np.Album || '') : '',
      media_channel:             '',
      media_library_title:       '',
      entity_picture:            poster,
      media_duration:            Math.round((np.RunTimeTicks || 0) / 10000000),
      media_position:            Math.round((ps.PositionTicks || 0) / 10000000),
      media_position_updated_at: new Date().toISOString(),
      friendly_name:             `${s.Client || ''} ${s.DeviceName || ''}`.trim(),
      _jfDeviceIcon:             deviceIcon,
      _jfDeviceName:             deviceName,
      _jfUser:                   s.UserName || '',
      _jfTmdbId:                 providers.Tmdb  || providers.tmdb  || null,
      _jfTvdbId:                 providers.Tvdb  || providers.tvdb  || null,
    },
  };
}

async _fetchEmbySessions() {
  const now = Date.now();
  if (now - (this._embyLastFetch || 0) < 5000) return;
  this._embyLastFetch = now;
  try {
    const raw = await this._callApi('GET', 'arr_stack/emby/sessions');
    if (raw?._notConfigured) { this._embySessions = []; return; }
    const sessions  = raw?.sessions  || [];
    const serverUrl = raw?.server_url || '';
    const apiToken  = raw?.api_token  || '';
    this._embySessions = sessions.map(s => this._normalizeEmbySession(s, serverUrl, apiToken));
  } catch (_) {
    this._embySessions = [];
  }
}

_normalizeEmbySession(s, serverUrl, apiToken) {
  const np   = s.NowPlayingItem || {};
  const ps   = s.PlayState      || {};
  const type = (np.Type || '').toLowerCase();
  const isTV    = type === 'episode';
  const isMusic = type === 'audio';
  const nl = `${(s.Client || '')} ${(s.DeviceName || '')}`.toLowerCase();
  let deviceIcon = 'mdi:television';
  let deviceName = 'TV';
  if (/iphone|ios/i.test(nl))                                        { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }
  else if (/ipad/i.test(nl))                                         { deviceIcon = 'mdi:tablet';    deviceName = 'Tablet'; }
  else if (/macbook|for mac\b|mac desktop/i.test(nl))               { deviceIcon = 'mdi:laptop';    deviceName = 'Mac'; }
  else if (/windows|desktop|pc\b/i.test(nl))                        { deviceIcon = 'mdi:monitor';   deviceName = 'PC'; }
  else if (/web|chrome|browser|safari|firefox/i.test(nl))           { deviceIcon = 'mdi:web';       deviceName = 'Browser'; }
  else if (/android.*tv|fire.*tv|shield|apple.*tv/i.test(nl))       { deviceIcon = 'mdi:television'; deviceName = 'TV'; }
  else if (/android/i.test(nl))                                      { deviceIcon = 'mdi:cellphone'; deviceName = 'Phone'; }
  const itemId    = np.Id || '';
  const providers = np.ProviderIds || {};
  const poster    = itemId && serverUrl
    ? `${serverUrl}/Items/${itemId}/Images/Primary?api_key=${apiToken}`
    : null;
  return {
    id:    `emby:${s.Id || s.id}`,
    source: 'emby',
    state:  ps.IsPaused ? 'paused' : 'playing',
    attr: {
      media_content_type:        isTV ? 'episode' : isMusic ? 'music' : 'movie',
      media_title:               np.Name || '',
      media_series_title:        isTV ? (np.SeriesName || '') : '',
      media_season:              isTV ? (np.ParentIndexNumber || 0) : 0,
      media_episode:             isTV ? (np.IndexNumber || 0) : 0,
      media_artist:              isMusic ? (np.AlbumArtist || '') : '',
      media_album_name:          isMusic ? (np.Album || '') : '',
      media_channel:             '',
      media_library_title:       '',
      entity_picture:            poster,
      media_duration:            Math.round((np.RunTimeTicks || 0) / 10000000),
      media_position:            Math.round((ps.PositionTicks || 0) / 10000000),
      media_position_updated_at: new Date().toISOString(),
      friendly_name:             `${s.Client || ''} ${s.DeviceName || ''}`.trim(),
      _embyDeviceIcon:           deviceIcon,
      _embyDeviceName:           deviceName,
      _embyUser:                 s.UserName || '',
      _embyTmdbId:               providers.Tmdb  || providers.tmdb  || null,
      _embyTvdbId:               providers.Tvdb  || providers.tvdb  || null,
    },
  };
}

async _fetchKodiSessions() {
  const now = Date.now();
  if (now - (this._kodiLastFetch || 0) < 5000) return;
  this._kodiLastFetch = now;
  try {
    const raw = await this._callApi('GET', 'arr_stack/kodi/sessions');
    const sessions = raw?.sessions || [];
    if (raw?.known_ids?.length) this._kodiEntityIds = new Set(raw.known_ids);
    this._kodiSessions = sessions.map(s => ({
      id:     s.entity_id,
      source: 'kodi',
      state:  s.state,
      attr:   s.attributes || {},
    }));
  } catch (_) {
    this._kodiSessions = [];
  }
}

}

export const sessionsMixin = _SessionsMethods.prototype;
