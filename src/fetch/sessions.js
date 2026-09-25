import { plexRange, rangeLabel } from '../shared/range.js';
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
      // Plex words the picture its own way — a Dolby Vision flag and a
      // colour transfer — reduced to the same name Jellyfin's is
      _dynRange:               plexRange(s),
    },
    _machineIdentifier: player.machineIdentifier,
    // Plex says which of its players will take a command. Plex Web takes none
    // — it never registers as controllable — so a card that offered pause and
    // seek there was promising something the client throws away.
    _plexCanControl:    /playback/i.test(player.protocolCapabilities || ''),
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
  // The server is asked on a timer; JellyHA's players are Home Assistant
  // states, which cost nothing and are read on every pass so a stream that
  // only it knows about appears at once.
  if (now - (this._jellyfinLastFetch || 0) >= 5000) {
    this._jellyfinLastFetch = now;
    try {
      const raw = await this._callApi('GET', 'arr_stack/jellyfin/sessions');
      const sessions  = raw?._notConfigured ? [] : (raw?.sessions || []);
      const serverUrl = raw?.server_url || '';
      const apiToken  = raw?.api_token  || '';
      this._jfProxySessions = sessions.map(s => this._normalizeJellyfinSession(s, serverUrl, apiToken));
    } catch (_) {
      this._jfProxySessions = [];
    }
  }
  // Jellyfin's own API is the fuller account — provider ids, the library, the
  // user — so it stays the base where it is configured, and JellyHA overrides
  // what it knows better (#39). Where there is no official integration at all,
  // JellyHA is the whole account, which is enough to show and drive a stream.
  const proxy = this._jhAttach([...(this._jfProxySessions || [])]);
  const seen  = new Set(proxy.map(s => s.id));
  this._jellyfinSessions = [
    ...proxy,
    ...this._jhStandaloneSessions().filter(s => !seen.has(s.id)),
  ];
}

// What a client is, from whatever it calls itself. Jellyfin's own sessions and
// JellyHA's players name the same devices, so they are read the same way.
_jfDeviceFrom(clientish) {
  const nl = String(clientish || '').toLowerCase();
  if (/iphone|ios/i.test(nl))                                  return { icon: 'mdi:cellphone', name: 'Phone' };
  if (/ipad/i.test(nl))                                        return { icon: 'mdi:tablet',    name: 'Tablet' };
  if (/macbook|for mac\b|mac desktop/i.test(nl))               return { icon: 'mdi:laptop',    name: 'Mac' };
  if (/windows|desktop|pc\b/i.test(nl))                        return { icon: 'mdi:monitor',   name: 'PC' };
  if (/web|chrome|browser|safari|firefox/i.test(nl))           return { icon: 'mdi:web',       name: 'Browser' };
  if (/android.*tv|fire.*tv|shield|apple.*tv/i.test(nl))       return { icon: 'mdi:television', name: 'TV' };
  if (/android/i.test(nl))                                     return { icon: 'mdi:cellphone', name: 'Phone' };
  return { icon: 'mdi:television', name: 'TV' };
}

// A stream as JellyHA alone describes it, for a household that runs JellyHA
// and not the official Jellyfin integration. It carries everything a row and
// its transport need; what it cannot carry is the provider ids Jellyfin's API
// gives, so such a title is matched to the library by name.
_jhStandaloneSessions() {
  const out = [];
  for (const [entityId, st] of Object.entries(this._hass?.states || {})) {
    if (!entityId.startsWith('media_player.jellyha_')) continue;
    if (entityId.endsWith('_library_browser')) continue;
    const a = st?.attributes || {};
    if (!a.session_id) continue;
    if (st.state !== 'playing' && st.state !== 'paused') continue;
    const type    = String(a.media_type || a.media_content_type || '').toLowerCase();
    const series  = a.media_series_title || a.series_name || '';
    const isTV    = type === 'episode' || type === 'tvshow' || !!series;
    const isMusic = type === 'audio' || type === 'music';
    const dev     = this._jfDeviceFrom(`${a.client || ''} ${a.device_name || ''}`);
    out.push({
      id:     `jellyfin:${a.session_id}`,
      source: 'jellyfin',
      state:  st.state,
      attr: {
        media_content_type:        isTV ? 'episode' : isMusic ? 'music' : 'movie',
        media_title:               a.media_title || a.title || '',
        media_series_title:        isTV ? series : '',
        media_season:              isTV ? (a.media_season  || a.season_number  || 0) : 0,
        media_episode:             isTV ? (a.media_episode || a.episode_number || 0) : 0,
        media_artist:              isMusic ? (a.media_artist || '') : '',
        media_album_name:          isMusic ? (a.media_album_name || '') : '',
        media_channel:             '',
        media_library_title:       '',
        entity_picture:            a.entity_picture || null,
        media_duration:            a.media_duration || 0,
        media_position:            a.media_position || 0,
        media_position_updated_at: a.media_position_updated_at || new Date().toISOString(),
        friendly_name:             `${a.client || ''} ${a.device_name || ''}`.trim(),
        _jfDeviceIcon:             dev.icon,
        _jfDeviceName:             dev.name,
        _jfUser:                   a.user_name || '',
        _dynRange:                 rangeLabel(a.video_range_type || a.dynamic_range || a.video_range),
        _jfItemId:                 a.item_id || a.media_content_id || '',
        _jfServerUrl:              a.config_external_url || '',
        _jfServerId:               '',
        // The player is right here, so the transport needs no matching
        _jhEntity:                 entityId,
      },
    });
  }
  return out;
}

_normalizeJellyfinSession(s, serverUrl, apiToken) {
  const np   = s.NowPlayingItem || {};
  const ps   = s.PlayState      || {};
  const type = (np.Type || '').toLowerCase();
  const isTV    = type === 'episode';
  const isMusic = type === 'audio';
  const dev = this._jfDeviceFrom(`${(s.Client || '')} ${(s.DeviceName || '')}`);
  const deviceIcon = dev.icon;
  const deviceName = dev.name;
  const itemId    = np.Id || '';
  const providers = np.ProviderIds || {};
  const seriesIds = np.SeriesProviderIds || {};
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
      // HDR, Dolby Vision and the rest, as Jellyfin itself reports them, so a
      // card without JellyHA shows the badge too
      _dynRange:                 this._jfRangeOf(np),
      // An episode's own ids are the episode's; the series is what Sonarr and
      // the detail are keyed by, and the proxy looks it up (#39)
      _jfSeriesTmdbId:           seriesIds.Tmdb || seriesIds.tmdb || null,
      _jfSeriesTvdbId:           seriesIds.Tvdb || seriesIds.tvdb || null,
      // A library that gives its series no ids at all still gives the episode
      // some, and an episode names the show it belongs to
      _jfEpTvdbId:               isTV ? (providers.Tvdb || providers.tvdb || null) : null,
      _jfEpImdbId:               isTV ? (providers.Imdb || providers.imdb || null) : null,
      _jfTmdbId:                 providers.Tmdb  || providers.tmdb  || null,
      _jfTvdbId:                 providers.Tvdb  || providers.tvdb  || null,
      // What it takes to open this very item in Jellyfin's own web client.
      // The session already knows all three, so opening the title needs no
      // lookup and cannot land on the wrong entry.
      // What the track itself is, for the chip the artist window shows beside
      // the transport. Jellyfin says it in the session; Plex has to be asked.
      _audioCodec:               (np.MediaStreams || []).find(x => (x.Type || '') === 'Audio')?.Codec || '',
      _audioBitrate:             Math.round(((np.MediaStreams || []).find(x => (x.Type || '') === 'Audio')?.BitRate || 0) / 1000),
      _jfItemId:                 itemId,
      _jfServerUrl:              serverUrl || '',
      _jfServerId:               s.ServerId || np.ServerId || '',
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
      // The same three Jellyfin's session carries, for the same reason
      _audioCodec:               (np.MediaStreams || []).find(x => (x.Type || '') === 'Audio')?.Codec || '',
      _audioBitrate:             Math.round(((np.MediaStreams || []).find(x => (x.Type || '') === 'Audio')?.BitRate || 0) / 1000),
      _embyItemId:               itemId,
      _embyServerUrl:            serverUrl || '',
      _embyServerId:             s.ServerId || np.ServerId || '',
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
