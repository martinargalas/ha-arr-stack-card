// A service the integration says is not set up is never asked (key → flag)
const CAPS_OFF = [
  ['radarr2', '_radarr2Configured'], ['sonarr2', '_sonarr2Configured'],
  ['bazarr', '_bazarrConfigured'], ['overseerr', '_overseerrConfigured'],
  ['lidarr', '_lidarrConfigured'], ['plex', '_plexConfigured'],
  ['tautulli', '_tautulliConfigured'], ['jellystat', '_jellystatConfigured'],
  ['tracearr', '_tracearrConfigured'], ['trakt', '_traktConfigured'],
  ['suggestarr', '_suggestarrConfigured'], ['prowlarr', '_prowlarrConfigured'],
  ['maintainerr', '_maintainerrConfigured'], ['gluetun', '_gluetunConfigured'],
];
// The libraries are the heaviest answers the card asks for — every film and
// show, megabytes on a big library. A poll takes them this often, or sooner
// when a title leaves a Radarr or Sonarr queue (imported, most likely).
const LIB_EVERY = 5 * 60_000;
const LIB_AFTER_ACTION = 2 * 60_000;
// POSTs that only read: searches and statistics
const READ_POSTS = /\/(search|getItemDetails|getItemHistory|apptest)(\?|$)|\/(jellystat|tracearr|tautulli)\//;

class _FetchMethods {

async _callApi(method, path, body) {
  const p = this._debug
    ? path + (path.includes('?') ? '&' : '?') + '_debug=1'
    : path;
  // Anything that changes something — a title added, removed, requested, a
  // download grabbed, paused or deleted — has the polls take the libraries
  // for the next two minutes, the way they did before LIB_EVERY: whatever
  // follows from it in Radarr, Sonarr or Seerr shows within one poll
  if (method !== 'GET' && !READ_POSTS.test(path)) this._libStaleUntil = Date.now() + LIB_AFTER_ACTION;
  // The first load notes how long each answer took (render/cat-cache.js)
  const t0 = this._loadLog && !this._loadLog.done ? performance.now() : 0;
  try {
    return await this._hass.callApi(method, p, body);
  } catch (err) {
    if (err?.status === 401 && this._hass.connection?.refreshAccessToken) {
      try { await this._hass.connection.refreshAccessToken(); } catch (_) {}
      return this._hass.callApi(method, p, body);
    }
    throw err;
  } finally {
    if (t0) this._loadLogCall(path, performance.now() - t0);
  }
}

async _fetchCapabilities(force = false) {
  if (this._capsLoaded && !force) return null;
  try {
    const caps = await this._callApi('GET', 'arr_stack/capabilities/info');
    this._capsLoaded = true;
    this._applyCaps(caps);
    return caps;
  } catch (_) {
    // fallback: leave flags at defaults, services auto-detect via 503
    return null;
  }
}

// What the integration says is set up. Applied from last time's answer first
// (render/cat-cache.js _bootApply), then from the fresh one: a service set up
// since then goes back to unknown, and its first answer settles it.
_applyCaps(caps) {
  if (!caps || typeof caps !== 'object') return;
  for (const [key, flag] of CAPS_OFF) {
    if (!caps[key]) this[flag] = false;
    else if (this[flag] === false) this[flag] = null;
  }
  // Download clients get a definite answer either way: they are polled every
  // five seconds, and a flag left unknown is a flag that gets polled.
  this._qbitConfigured         = !!caps.qbit;
  this._sabConfigured          = !!caps.sabnzbd;
  this._nzbgetConfigured       = !!caps.nzbget;
  this._delugeConfigured       = !!caps.deluge;
  this._rtorrentConfigured     = !!caps.rtorrent;
  this._transmissionConfigured = !!caps.transmission;
  if (caps.lastfm)     this._lastfmConfigured     = true;
  if (caps.lastfmUser) this._lastfmUserConfigured = true;
  // Drives the notice about the shared TMDB key being retired on 2026-09-01
  this._tmdbOwnKey = caps.tmdbOwnKey !== false;
  // Opted out in the integration — the ping never fires for this install
  if (caps.metrics === false) this._metricsOptOut = true;
  // The installation's own id for the usage ping (see _pingSid)
  if (typeof caps.iid === 'string' && /^[0-9a-f]{16}$/.test(caps.iid)) this._iid = caps.iid;
  if (caps.jellyfin)  this._jellyfinConfigured     = true;
  // Sessions are asked every thirty seconds, and every five while anything
  // streams elsewhere. An integration too old to send these leaves the flags
  // unknown, and the first answer settles them (see _fetchEmbySessions).
  if ('emby' in caps) this._embyConfigured         = !!caps.emby;
  if ('kodi' in caps) this._kodiConfigured         = !!caps.kodi;
  this._seerrType = caps.seerrType || 'overseerr';
  this._arrHosts = caps.arrHosts || {};
  // Sonarr's posters through the integration (render/arr-img.js)
  this._arrImageCap = caps.arrImage === true;
}

// Last time's answers stood in for the first load; the fresh ones come in
// behind and are kept for next time
async _bootRefresh() {
  const caps = await this._fetchCapabilities(true);
  if (this._overseerrConfigured !== false) {
    await this._fetchOverseerrRadarrSettings();
    if (this._overseerrConfigured !== false) await this._fetchOverseerrSonarrSettings();
  }
  if (caps) this._bootSave(caps);
}

// What the polls watch to know the libraries changed without asking for them:
// every title in a Radarr or Sonarr queue, the newest event of each one's
// history (a grab, an import, a deletion, a rename), and Seerr's requests
_arrQueueSig() {
  const ids = new Set();
  for (const svc of ['radarr', 'radarr2'])
    for (const k of ['Active', 'Failed'])
      for (const id of this[`_${svc}Queue${k}`] || []) ids.add(`${svc}:${id}`);
  for (const k of ['_sonarrQueueEpisodes', '_sonarr2QueueEpisodes'])
    for (const id of this[k] || []) ids.add(`${k}:${id}`);
  for (const [svc, top] of Object.entries(this._dlHistTop || {})) ids.add(`hist:${svc}:${top}`);
  for (const r of this._seerrRequests || []) ids.add(`seerr:${r.id}:${r.status}:${r.media?.status}`);
  return ids;
}

// A title came or went, or anything else in the signature changed
_arrMoved(before) {
  const now = this._arrQueueSig();
  if (now.size !== before.size) return true;
  for (const id of before) if (!now.has(id)) return true;
  return false;
}

// What Now Playing shows of each session that is not in Home Assistant's own
// state: which item, and how it travels. A new track or a stream that started
// transcoding has to redraw the tiles, and nothing else would — they follow
// Home Assistant's state changes, and these arrive by polling.
_streamSessionSig() {
  const row = (x, item) => `${x.id}|${item || ''}|${x.attr?._tech?.method || ''}|${x.attr?._tech?.kbps || ''}`;
  return [
    ...(this._plexSessions || []).map(x => row(x, x._plexRatingKey)),
    ...(this._jellyfinSessions || []).map(x => row(x, x.attr?._jfItemId)),
    ...(this._embySessions || []).map(x => row(x, x.attr?._embyItemId)),
  ].sort().join(',');
}

// opts.poll: the thirty-second poll or the tab coming back into view — the
// libraries then only every LIB_EVERY, or when a title left a queue. Anything
// else (a title added, removed, requested) asks for them at once.
async _fetchAll(opts = {}) {
  const starting = !this._initialFetchDone;
  // First run: what the categories showed last time on this device is drawn
  // before anything is asked (render/cat-cache.js)
  if (starting) this._catStart();
  // Which services are set up and where Seerr sends requests. Last time's
  // answers are used at once and asked again behind (render/cat-cache.js);
  // without them they are waited for, one after another.
  if (starting && !this._capsLoaded && this._bootApply()) {
    this._bootRefresh();
  } else {
    // First run: load capabilities to initialize configured flags before any fetches.
    const caps = await this._fetchCapabilities();
    // First run: determine Overseerr status before launching any Overseerr-dependent fetches.
    // On subsequent calls _overseerrConfigured is already set (true/false), skip re-fetch.
    if (this._overseerrConfigured === null) {
      await this._fetchOverseerrRadarrSettings();
      // Fetch Sonarr seerr settings immediately after — needed for instance labels
      if (this._overseerrConfigured !== false) {
        await this._fetchOverseerrSonarrSettings();
      }
    }
    if (caps) this._bootSave(caps);
  }

  if (!this._pingSent && !this._metricsOptOut) { this._pingSent = true; this._sendPing(); }

  const none = Promise.resolve();
  const libsDue = starting || !opts.poll
    || Date.now() < (this._libStaleUntil || 0)
    || Date.now() - (this._libsAt || 0) >= LIB_EVERY;
  if (libsDue) this._libsAt = Date.now();
  // The second Radarr and Sonarr: their libraries tell whether they are set
  // up, which the fetches for their profiles, tags and folders wait on. With
  // the integration's word on that already in, they go along with the rest.
  let second = none;
  if (libsDue) {
    second = Promise.allSettled([this._fetchRadarr2(), this._fetchSonarr2()]);
    if (!this._capsLoaded) await second;
  }
  const queuesBefore = this._arrQueueSig();

  // On first run fetch everything; on subsequent runs skip fetches for categories
  // that are not on the currently visible right-panel page.
  const first = !this._initialFetchDone;
  this._initialFetchDone = true;
  const vis = first ? null : this._visibleCatIds(); // null = fetch all
  const see = id => !vis || vis.has(id);

  // The first round draws each category as soon as its own data is in, not
  // after the slowest service (render/cat-cache.js); the posters of the
  // Discover rows wait for the libraries too, or a title in them would show
  // as missing for a moment
  const T = (ids, ...ps) => {
    const all = Promise.allSettled(ps);
    if (first) all.then(() => this._catLoaded(ids));
    return all;
  };
  const radarr = libsDue ? this._fetchRadarr() : none;
  const sonarr = libsDue ? this._fetchSonarr() : none;
  const libs = [radarr, sonarr, second];

  await Promise.allSettled([
    // ── Core — always fetch regardless of visible page ──────────────────
    T(['radarr', 'sonarr', 'recentlyAdded', 'library'], ...libs),
    T(['upcoming'], this._fetchOverseerr(), ...libs),
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
    T(['pending'], this._fetchPendingRequests()),
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
    T(['streams'], this._fetchPlexSessions(), this._fetchJellyfinSessions(), this._fetchEmbySessions(), this._fetchKodiSessions()),
    // ── Category-specific — skip when category not on current page ──────
    T(['calendar'], (see('upcoming') || see('calendar')) ? this._fetchCalendar() : none),
    T(['tvUpcoming'], see('tvUpcoming') ? this._fetchTvUpcoming() : none, ...libs),
    T(['trending'], see('trending') ? this._fetchTrending() : none, ...libs),
    T(['popular'], see('popular') ? this._fetchPopular() : none, ...libs),
    T(['recommendations'],
      (see('recommendations') && this._recSources.trakt)      ? this._fetchTrakt()      : none,
      (see('recommendations') && this._recSources.suggestarr) ? this._fetchSuggestArr() : none,
      (see('recommendations') && this._recSources.lastfm) ? this._fetchLastfm() : none,
      ...libs),
    T(['tautulli'], see('tautulli') ? this._fetchTautulli() : none),
    T(['jellystat'], see('jellystat') ? this._fetchJellystat() : none),
    T(['tracearr'], see('tracearr') ? this._fetchTracearr() : none),
    T(['prowlarr'], see('prowlarr') ? this._fetchProwlarr() : none),
    T(['maintainerr'], see('maintainerr') ? this._fetchMaintainerr() : none),
    T(['recentlyRequested'], see('recentlyRequested') ? this._fetchSeerrRequests() : none, ...libs),
    // Music has no category of its own — it rides inside Recently Added and
    // Recently Requested — so asking for `music` here was asking for something
    // no page ever says it shows, and the library was read once and never
    // again until the page was reloaded.
    (see('recentlyAdded') || see('recentlyRequested')) ? this._fetchLidarr() : none,
    // episodefiles + bazarr episodes — only needed for recentlyAdded sonarr cards
    (see('recentlyAdded') && libsDue) ? this._fetchSonarrEpisodeFiles().then(() => this._fetchBazarrEpisodes()) : none,
    // Activity history/blocklist: always fetch if modal open, otherwise only if category visible
    T(['activity'],
      (see('activity') || !!this._activityModal) ? this._fetchActivityHistory()   : none,
      (see('activity') || !!this._activityModal) ? this._fetchActivityBlocklist() : none),
  ]);
  // Something moved in Radarr, Sonarr or Seerr — a download started or ended,
  // a title imported, renamed or deleted, a request came in or was approved:
  // the libraries are asked now rather than at the next LIB_EVERY
  if (!libsDue && this._arrMoved(queuesBefore)) {
    this._libsAt = Date.now();
    await Promise.allSettled([this._fetchRadarr(), this._fetchSonarr(), this._fetchRadarr2(), this._fetchSonarr2()]);
    if (see('recentlyAdded')) await this._fetchSonarrEpisodeFiles().then(() => this._fetchBazarrEpisodes()).catch(() => {});
  }
  this._computeActMissingCache();
  const fp = this._dataFingerprint();
  if (!first && fp === this._lastFingerprint) return;
  this._lastFingerprint = fp;
  if (first) this._catDone();
  this._render();
  this._catCacheSaveSoon(first);
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

  // Compared after the fetch (see _streamSessionSig)
  const prevSessions = this._streamSessionSig();

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
  if (this._streamSessionSig() !== prevSessions) this._reRenderSection('streams');

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
  // The browser's own serialisation never matched the markup written, so this
  // used to rewrite the whole column on every five-second poll
  if (this._paintCol(left, newHtml)) {
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
    // The provider, by the exit's network owner — drawn like any app's icon
    const PROVIDERS = [
      ['surfshark',  /surfshark|m247/],
      ['nordvpn',    /nordvpn|nord\s+security/],
      ['mullvad',    /mullvad/],
      ['protonvpn',  /proton\s*vpn|protonvpn/],
      ['expressvpn', /expressvpn|express\s+vpn/],
      ['pia',        /private.internet.access|\bpia\b/],
      ['airvpn',     /airvpn/],
      ['ipvanish',   /ipvanish/],
      ['cyberghost', /cyberghost/],
      ['hidemyass',  /hidemyass|\bhma\b/],
    ];
    const match = PROVIDERS.find(([, re]) => re.test(orgStr));
    const newProvider = match ? match[0] : null;
    this._gluetunProvider = newProvider;
  } catch (e) {
    if (e?.status === 503) { this._gluetunConfigured = false; return; }
    this._gluetunStatus = null;
  }
}

}

export const fetchMixin = _FetchMethods.prototype;
