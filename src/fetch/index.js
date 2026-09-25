class _FetchMethods {

async _callApi(method, path, body) {
  const p = this._debug
    ? path + (path.includes('?') ? '&' : '?') + '_debug=1'
    : path;
  try {
    return await this._hass.callApi(method, p, body);
  } catch (err) {
    if (err?.status === 401 && this._hass.connection?.refreshAccessToken) {
      try { await this._hass.connection.refreshAccessToken(); } catch (_) {}
      return this._hass.callApi(method, p, body);
    }
    throw err;
  }
}

async _fetchCapabilities() {
  if (this._capsLoaded) return;
  try {
    const caps = await this._callApi('GET', 'arr_stack/capabilities/info');
    this._capsLoaded = true;
    if (!caps.qbit)      this._qbitConfigured      = false;
    if (!caps.sabnzbd)   this._sabConfigured        = false;
    if (!caps.nzbget)    this._nzbgetConfigured     = false;
    if (!caps.deluge)    this._delugeConfigured     = false;
    if (caps.rtorrent)   this._rtorrentConfigured   = true;
    else                 this._rtorrentConfigured   = false;
    if (caps.transmission) this._transmissionConfigured = true;
    else                   this._transmissionConfigured = false;
    if (!caps.radarr2)   this._radarr2Configured    = false;
    if (!caps.sonarr2)   this._sonarr2Configured    = false;
    if (!caps.bazarr)    this._bazarrConfigured      = false;
    if (!caps.overseerr) this._overseerrConfigured  = false;
    if (!caps.lidarr)    this._lidarrConfigured     = false;
    if (caps.lastfm)     this._lastfmConfigured     = true;
    if (caps.lastfmUser) this._lastfmUserConfigured = true;
    // Drives the notice about the shared TMDB key being retired on 2026-09-01
    this._tmdbOwnKey = caps.tmdbOwnKey !== false;
    if (!caps.plex)      this._plexConfigured        = false;
    if (!caps.tautulli)  this._tautulliConfigured    = false;
    if (!caps.jellystat) this._jellystatConfigured   = false;
    if (!caps.tracearr)  this._tracearrConfigured    = false;
    if (!caps.trakt)     this._traktConfigured       = false;
    if (!caps.suggestarr) this._suggestarrConfigured  = false;
    // Opted out in the integration — the ping never fires for this install
    if (caps.metrics === false) this._metricsOptOut = true;
    if (!caps.prowlarr)    this._prowlarrConfigured     = false;
    if (!caps.maintainerr) this._maintainerrConfigured  = false;
    if (!caps.gluetun)  this._gluetunConfigured      = false;
    if (caps.jellyfin)  this._jellyfinConfigured     = true;
    this._seerrType = caps.seerrType || 'overseerr';
    this._arrHosts = caps.arrHosts || {};
  } catch (_) {
    // fallback: leave flags at defaults, services auto-detect via 503
  }
}

async _fetchAll() {
  // First run: load capabilities to initialize configured flags before any fetches.
  await this._fetchCapabilities();

  if (!this._pingSent && !this._metricsOptOut) { this._pingSent = true; this._sendPing(); }

  // First run: determine Overseerr status before launching any Overseerr-dependent fetches.
  // On subsequent calls _overseerrConfigured is already set (true/false), skip re-fetch.
  if (this._overseerrConfigured === null) {
    await this._fetchOverseerrRadarrSettings();
    // Fetch Sonarr seerr settings immediately after — needed for instance labels
    if (this._overseerrConfigured !== false) {
      await this._fetchOverseerrSonarrSettings();
    }
  }
  // Fetch radarr2 first to determine _radarr2Configured before launching
  // radarr2-dependent fetches (Profiles/Tags/RootFolders guard on === false).
  await Promise.allSettled([
    this._fetchRadarr2(),
    this._fetchSonarr2(),
  ]);

  // On first run fetch everything; on subsequent runs skip fetches for categories
  // that are not on the currently visible right-panel page.
  const first = !this._initialFetchDone;
  this._initialFetchDone = true;
  const vis = first ? null : this._visibleCatIds(); // null = fetch all
  const see = id => !vis || vis.has(id);

  await Promise.allSettled([
    // ── Core — always fetch regardless of visible page ──────────────────
    this._fetchRadarr(),
    this._fetchSonarr(),
    this._fetchOverseerr(),
    this._fetchSab(),
    this._fetchSabHistory(),
    this._fetchNzbget(),
    this._fetchNzbgetHistory(),
    this._fetchQbit(),
    this._fetchDeluge(),
    this._fetchBazarr(),
    this._fetchRadarrQueue(),
    this._fetchRadarr2Queue(),
    this._fetchSonarrQueue('sonarr'),
    this._fetchSonarrQueue('sonarr2'),
    this._fetchDlHistory(),
    this._fetchPendingRequests(),
    this._fetchMyPendingRequests(),
    this._fetchRadarrTags(),
    this._fetchSonarrTags(),
    this._fetchRadarrRootFolders(),
    this._fetchSonarrRootFolders(),
    this._fetchRadarrDiskspace(),
    this._fetchSonarrDiskspace(),
    this._fetchGluetun(),
    this._fetchRadarr2Profiles(),
    this._fetchRadarr2Tags(),
    this._fetchRadarr2RootFolders(),
    this._fetchRadarr2Diskspace(),
    this._fetchSonarr2Diskspace(),
    // ── Sessions — always fetch (needed to detect hasActiveStreams for category visibility) ──
    this._fetchPlexSessions(),
    this._fetchJellyfinSessions(),
    this._fetchEmbySessions(),
    this._fetchKodiSessions(),
    // ── Category-specific — skip when category not on current page ──────
    (see('upcoming') || see('calendar')) ? this._fetchCalendar()         : Promise.resolve(),
    see('tvUpcoming')  ? this._fetchTvUpcoming()   : Promise.resolve(),
    see('trending')    ? this._fetchTrending()      : Promise.resolve(),
    see('popular')     ? this._fetchPopular()       : Promise.resolve(),
    (see('recommendations') && this._recSources.trakt)      ? this._fetchTrakt()      : Promise.resolve(),
    (see('recommendations') && this._recSources.suggestarr) ? this._fetchSuggestArr() : Promise.resolve(),
    see('tautulli')    ? this._fetchTautulli()      : Promise.resolve(),
    see('jellystat')   ? this._fetchJellystat()     : Promise.resolve(),
    see('tracearr')    ? this._fetchTracearr()      : Promise.resolve(),
    see('prowlarr')      ? this._fetchProwlarr()      : Promise.resolve(),
    see('maintainerr')   ? this._fetchMaintainerr()   : Promise.resolve(),
    see('recentlyRequested') ? this._fetchSeerrRequests() : Promise.resolve(),
    // Music has no category of its own — it rides inside Recently Added and
    // Recently Requested — so asking for `music` here was asking for something
    // no page ever says it shows, and the library was read once and never
    // again until the page was reloaded.
    (see('recentlyAdded') || see('recentlyRequested')) ? this._fetchLidarr() : Promise.resolve(),
    (see('recommendations') && this._recSources.lastfm) ? this._fetchLastfm() : Promise.resolve(),
    // episodefiles + bazarr episodes — only needed for recentlyAdded sonarr cards
    see('recentlyAdded') ? this._fetchSonarrEpisodeFiles().then(() => this._fetchBazarrEpisodes()) : Promise.resolve(),
    // Activity history/blocklist: always fetch if modal open, otherwise only if category visible
    (see('activity') || !!this._activityModal) ? this._fetchActivityHistory()   : Promise.resolve(),
    (see('activity') || !!this._activityModal) ? this._fetchActivityBlocklist() : Promise.resolve(),
  ]);
  this._computeActMissingCache();
  const fp = this._dataFingerprint();
  if (!first && fp === this._lastFingerprint) return;
  this._lastFingerprint = fp;
  this._render();
}

// Lightweight fingerprint of fetched state — used for dirty checking in _fetchAll().
// Uses counts + first/last IDs (not JSON.stringify) to stay O(1) per collection.
_dataFingerprint() {
  const ra = this._radarr;    const so = this._sonarr;
  const ra2 = this._radarr2; const so2 = this._sonarr2;
  const q = this._qbit;       const cal = this._calendar;
  const tv = this._tvUpcoming;
  return [
    // Libraries
    ra?.length, ra?.[0]?.id, ra?.[ra?.length-1]?.id,
    so?.length, so?.[0]?.id, so?.[so?.length-1]?.id,
    ra2?.length, ra2?.[0]?.id,
    so2?.length, so2?.[0]?.id,
    // Queue / downloads
    this._radarrQueueActive?.size, this._radarrQueueFailed?.size,
    this._sonarrQueue?.length, this._sonarr2Queue?.length,
    q?.length, q?.map?.(t=>t.hash).join(','),
    this._sab?.noofslots, this._sabFailed?.length,
    this._nzbget?.DownloadRate, this._nzbgetFailed?.length,
    this._deluge?.length,
    // Requests
    this._pendingRequests?.length, this._myPendingRequests?.length,
    // Subtitles
    this._bazarr ? Object.keys(this._bazarr).length : 0,
    // Calendar / upcoming
    cal?.length, cal?.[0]?.title,
    tv?.length,
    // Discover
    this._trending?.length, this._popular?.length, this._traktItems?.length,
    // Streaming
    this._plexSessions?.length, this._jellyfinSessions?.length,
    this._embySessions?.length, this._kodiSessions?.length,
    // Stats
    this._tautulliHistory?.length, this._tautulliSessions?.length,
    this._jellystatHistory?.length,
    this._tracearrData ? JSON.stringify(this._tracearrData).length : 0,
    // Activity
    this._actHistory?.length, this._actBlocklist?.length,
    // Prowlarr
    this._prowlarr?.indexers?.length,
  ].join('|');
}

// Returns the Set of category IDs currently visible on the right panel page.
// Mirrors the slicing logic in _renderRight() without rendering.
_visibleCatIds() {
  const perPage        = Math.max(2, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
  const regularPerPage = perPage - 1;
  const hasPending     = !!this._hass?.user?.is_admin && (this._pendingRequests?.length > 0);
  const hasCalendar    = (this._calendar?.length > 0);
  const hasStreams      = (this._jellyfinSessions?.length > 0)
                      || (this._embySessions?.length > 0)
                      || (this._kodiSessions?.length > 0)
                      || Object.keys(this._hass?.states || {}).some(id =>
                           id.startsWith('media_player.plex_') &&
                           ['playing', 'paused'].includes(this._hass.states[id]?.state));
  const isAdmin = !!this._hass?.user?.is_admin;
  const CAT_OK = {
    radarr: true, sonarr: true,
    recentlyAdded: true, recentlyRequested: true,
    upcoming: true, tvUpcoming: true,
    trending: true, popular: true,
    recommendations: (() => { const r = this._recSources; return r.trakt || r.suggestarr || r.lastfm; })(),
    calendar: hasCalendar,
    streams:  hasStreams,
    tautulli: isAdmin && this._tautulliConfigured  !== false,
    jellystat: isAdmin && this._jellystatConfigured !== false,
    tracearr:  isAdmin && this._tracearrConfigured  !== false,
    activity:  isAdmin,
    prowlarr:  isAdmin && this._prowlarrConfigured  !== false,
    maintainerr: isAdmin && this._maintainerrConfigured !== false,
  };
  const DEFAULT_CATS = ['recentlyAdded','recentlyRequested','upcoming','tvUpcoming','trending','popular','recommendations','calendar','tautulli','jellystat','tracearr','activity','prowlarr','maintainerr'];
  const catConfig = this._config?.categories
    ? this._catConfigMigrated(this._config.categories)
    : DEFAULT_CATS.map(id => ({ id, enabled: true }));
  const allIds = [
    ...(hasPending ? ['recentlyRequested'] : []),
    ...catConfig.filter(c => c.enabled !== false && CAT_OK[c.id]).map(c => c.id),
  ];
  const totalPages = Math.max(1, Math.ceil(allIds.length / regularPerPage));
  const page       = Math.max(0, Math.min(this._rightPage || 0, totalPages - 1));
  return new Set(allIds.slice(page * regularPerPage, (page + 1) * regularPerPage));
}

// Fetches only category-specific data for the currently visible page, then re-renders.
// Called after page navigation so newly-visible categories load immediately.
async _fetchVisibleCats() {
  const vis = this._visibleCatIds();
  const see = id => vis.has(id);
  await Promise.allSettled([
    (see('upcoming') || see('calendar')) ? this._fetchCalendar()       : Promise.resolve(),
    see('tvUpcoming')    ? this._fetchTvUpcoming()    : Promise.resolve(),
    see('trending')      ? this._fetchTrending()      : Promise.resolve(),
    see('popular')       ? this._fetchPopular()       : Promise.resolve(),
    (see('recommendations') && this._recSources.trakt)      ? this._fetchTrakt()      : Promise.resolve(),
    (see('recommendations') && this._recSources.suggestarr) ? this._fetchSuggestArr() : Promise.resolve(),
    see('tautulli')      ? this._fetchTautulli()      : Promise.resolve(),
    see('jellystat')     ? this._fetchJellystat()     : Promise.resolve(),
    see('tracearr')      ? this._fetchTracearr()      : Promise.resolve(),
    see('prowlarr')      ? this._fetchProwlarr()      : Promise.resolve(),
    see('maintainerr')   ? this._fetchMaintainerr()   : Promise.resolve(),
    see('recentlyRequested') ? this._fetchSeerrRequests() : Promise.resolve(),
    (see('recentlyAdded') || see('recentlyRequested')) ? this._fetchLidarr() : Promise.resolve(),
    (see('recommendations') && this._recSources.lastfm) ? this._fetchLastfm() : Promise.resolve(),
    see('recentlyAdded') ? this._fetchSonarrEpisodeFiles().then(() => this._fetchBazarrEpisodes()) : Promise.resolve(),
    see('activity')      ? this._fetchActivityHistory()   : Promise.resolve(),
    see('activity')      ? this._fetchActivityBlocklist() : Promise.resolve(),
  ]);
  this._reRenderRight?.();
}

async _fetchDownloadsAndRender() {
  if (this._musicModal) {
    await this._fetchLidarrQueue();
    // Five seconds apart, an unconditional repaint rebuilds the modal wholesale
    // — the actions menu blinks shut and open again, and so does whatever
    // dropdown is under the reader's hand. Only a queue that actually moved is
    // worth redrawing for.
    const sig = this._musQueueSig();
    if (sig !== this._musQueueSigLast) {
      this._musQueueSigLast = sig;
      this._renderMusicModalEl();
    }
    this._reRenderSection?.('recentlyRequested');
    return;
  }
  if (this._popup) return;
  const prevQbit     = new Set((this._qbit || []).map(t => t.hash));
  const prevSab      = new Set((this._sab?.slots || []).map(s => s.nzo_id));
  const prevNzbget   = new Set((this._nzbgetQueue || []).map(s => s.NZBID));
  const prevDeluge   = new Set((this._delugeQueue || []).map(t => t.hash));
  const prevRtorrent = new Set((this._rtorrentQueue || []).map(t => t.hash));
  const prevTransmission = new Set((this._transmissionQueue || []).map(t => t.hash));
  const hadItems = prevQbit.size > 0 || prevSab.size > 0 || prevNzbget.size > 0 || prevDeluge.size > 0 || prevRtorrent.size > 0 || prevTransmission.size > 0;

  // Sessions at 5s only when streams are currently active — avoids ~4 calls/5s when idle
  const hasActiveStreams = (this._jellyfinSessions?.length > 0)
                        || (this._embySessions?.length > 0)
                        || (this._kodiSessions?.length > 0)
                        || (this._plexSessions?.length > 0);
  await Promise.allSettled([
    this._fetchQbit(),
    this._fetchDeluge(),
    this._fetchRtorrent(),
    this._fetchTransmission(),
    this._fetchSab(),
    this._fetchSabHistory(),
    this._fetchNzbget(),
    this._fetchNzbgetHistory(),
    hasActiveStreams ? this._fetchPlexSessions()     : Promise.resolve(),
    hasActiveStreams ? this._fetchJellyfinSessions() : Promise.resolve(),
    hasActiveStreams ? this._fetchEmbySessions()     : Promise.resolve(),
    hasActiveStreams ? this._fetchKodiSessions()     : Promise.resolve(),
    this._lidarrConfigured !== false ? this._fetchLidarrQueue() : Promise.resolve(),
  ]);

  if (hadItems) {
    const currQbit     = new Set((this._qbit || []).map(t => t.hash));
    const currSab      = new Set((this._sab?.slots || []).map(s => s.nzo_id));
    const currNzbget   = new Set((this._nzbgetQueue || []).map(s => s.NZBID));
    const currDeluge   = new Set((this._delugeQueue || []).map(t => t.hash));
    const currRtorrent = new Set((this._rtorrentQueue || []).map(t => t.hash));
    const currTransmission = new Set((this._transmissionQueue || []).map(t => t.hash));
    const completed = [...prevQbit].some(id => !currQbit.has(id))
                   || [...prevSab].some(id => !currSab.has(id))
                   || [...prevNzbget].some(id => !currNzbget.has(id))
                   || [...prevDeluge].some(id => !currDeluge.has(id))
                   || [...prevRtorrent].some(id => !currRtorrent.has(id))
                   || [...prevTransmission].some(id => !currTransmission.has(id));
    if (completed) {
      await Promise.all([this._fetchRadarr(), this._fetchSonarr()]);
      this._reRenderRight();
    }
  }

  const left = this.shadowRoot.getElementById('col-left');
  if (!left) return;
  const newHtml = this._mobMinWrap('left', this._renderLeft());
  if (left.innerHTML !== newHtml) {
    left.innerHTML = newHtml;
    this._wireSort();
    this._wireActionButtons();
    this._wirePageButtons();
    this._wireMinimize();
  }
}

async _fetchGluetun() {
  if (this._gluetunConfigured === false) return;
  try {
    const [status, ip] = await Promise.all([
      this._callApi('GET', 'arr_stack/gluetun/status'),
      this._callApi('GET', 'arr_stack/gluetun/ip'),
    ]);
    this._gluetunConfigured = true;
    this._gluetunStatus  = status?.status || null;
    this._gluetunCountry = ip?.country    || null;
    this._gluetunIp      = ip?.public_ip  || null;
    const orgStr = `${ip?.isp || ''} ${ip?.organization || ''}`.toLowerCase();
    const PROVIDERS = [
      ['surfshark',             /surfshark|m247/],
      ['nordvpn',               /nordvpn|nord\s+security/],
      ['mullvadvpn',            /mullvad/],
      ['protonvpn',             /proton\s*vpn|protonvpn/],
      ['expressvpn',            /expressvpn|express\s+vpn/],
      ['ipvanish',              /ipvanish/],
      ['cyberghostvpn',         /cyberghost/],
      ['privateinternetaccess', /private.internet.access|\bpia\b/],
      ['hidemyass',             /hidemyass|\bhma\b/],
    ];
    const match = PROVIDERS.find(([, re]) => re.test(orgStr));
    const newProvider = match ? match[0] : null;
    if (newProvider && newProvider !== this._gluetunProvider) {
      this._gluetunProviderSvg = null;
      try {
        const r = await fetch(`https://cdn.simpleicons.org/${newProvider}`);
        if (r.ok) {
          const svg = await r.text();
          this._gluetunProviderSvg = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        }
      } catch (_) {}
    } else if (!newProvider) {
      this._gluetunProviderSvg = null;
    }
    this._gluetunProvider = newProvider;
  } catch (e) {
    if (e?.status === 503) { this._gluetunConfigured = false; return; }
    this._gluetunStatus = null;
  }
}

}

export const fetchMixin = _FetchMethods.prototype;
