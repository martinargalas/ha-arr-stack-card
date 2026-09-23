/**
 * arr-stack-card.js  v119
 * Home Assistant Lovelace custom card — Media server dashboard
 * Displays qBittorrent, SABnzbd, Radarr, Sonarr, Overseerr data
 */

import { ARR_I18N } from './i18n.js';
import { installLazy } from './shared/lazy.js';
import { STYLES } from './styles/index.js';
import { uiMixin } from './render/ui.js';
import { sectionsMixin } from './render/sections.js';
import { itemsMixin } from './render/items.js';
import { brandMixin } from './render/brand.js';
import { layoutMixin } from './render/layout.js';
import { certMixin } from './render/cert.js';
import { pendingMixin } from './fetch/pending.js';
import { posterInfoMixin } from './fetch/poster-info.js';
import { pingMixin } from './fetch/ping.js';
import { interactiveSearchMixin } from './render/interactive-search.js';
import { sonarrIsMixin } from './render/interactive-search-sonarr.js';
import { autoSearchMixin } from './render/auto-search.js';
import { fetchMixin } from './fetch/index.js';
import { sessionsMixin } from './fetch/sessions.js';
import { downloadsMixin } from './fetch/downloads.js';
import { arrMixin } from './fetch/arr.js';
import { fetchCalendarMixin } from './fetch/calendar.js';
import { fetchDiscoverMixin } from './fetch/discover.js';
import { fetchRequestsMixin } from './fetch/requests.js';
import { fetchSearchMixin } from './fetch/search.js';
import { fetchGrabMixin } from './fetch/grab.js';
import { fetchServicesMixin } from './fetch/services.js';
import { fetchMusicMixin } from './fetch/music.js';
import { fetchMusicArtMixin } from './fetch/music-art.js';
import { renderLeftMixin } from './render/left.js';
import { renderRightMixin } from './render/right.js';
import { searchRenderMixin } from './render/search.js';
import { streamsRenderMixin } from './render/streams.js';
import { requestOverlaysRenderMixin } from './render/request-overlays.js';
import { mediaCardsMixin } from './render/media-cards.js';
import { posterFlagsMixin } from './render/poster-flags.js';
import { calendarCardsMixin } from './render/calendar-cards.js';
import { discoverCardsMixin } from './render/discover-cards.js';
import { musicCardsMixin } from './render/music-cards.js';
import { activityTilesMixin } from './render/activity-tiles.js';
import { libraryTilesMixin } from './render/library-tiles.js';
import { musicRowsMixin } from './render/music-rows.js';
import { themeMixin } from './styles/theme.js';
import { wireMixin } from './wire/index.js';
import { wireRequestsMixin } from './wire/requests.js';
import { wireSearchMixin } from './wire/search.js';
import { wireSectionsMixin } from './wire/sections.js';
import { wireTraktMixin } from './wire/trakt.js';
import { popupMixin } from './popup/index.js';
import { popupOpenMixin } from './popup/open.js';
import { popupClickMixin } from './popup/click.js';
import { popupPanelsMixin } from './popup/panels.js';
import { popupQuickActionsMixin } from './popup/quick-actions.js';
import { popupQaStatsMixin } from './popup/qa-stats.js';
import { popupQaCollectionsMixin } from './popup/qa-collections.js';
import { popupQaNavigateMixin } from './popup/qa-navigate.js';
import { popupStreamMixin } from './popup/stream.js';
import { popupCalendarMixin } from './popup/calendar.js';
import { popupArrActionsMixin } from './popup/arr-actions.js';
import { popupActionsMixin } from './popup/actions.js';
import { popupDetailPartsMixin } from './popup/detail-parts.js';
import { mtKitMixin } from './render/mt-kit.js';
import { maintainerrTilesMixin } from './render/maintainerr-tiles.js';
import { tracearrTilesMixin } from './render/tracearr-tiles.js';
import { tautulliTilesMixin } from './render/tautulli-tiles.js';
import { prowlarrTilesMixin } from './render/prowlarr-tiles.js';
import { jellystatTilesMixin } from './render/jellystat-tiles.js';
import { similarFetchMixin } from './fetch/similar.js';
import { similarRenderMixin } from './render/similar.js';
import { wireSimilarMixin } from './wire/similar.js';
import { BP, maxWidth } from './shared/ui.js';

// STYLES runs to some 235 KB. A <style> per card made every card on a
// dashboard parse all of it again; one constructed sheet is parsed once and
// adopted by each card's shadow root. Browsers without constructable sheets
// keep the <style>.
let ARR_SHEET;
function arrSharedSheet() {
  if (ARR_SHEET !== undefined) return ARR_SHEET;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(STYLES);
    ARR_SHEET = sheet;
  } catch (_) {
    ARR_SHEET = null;
  }
  return ARR_SHEET;
}

class ArrStackCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._interval = null;
    this._fastInterval = null;
    this._initialized = false;
    this._pageBtnAbort = null; // AbortController pro page-button listenery
    this._sort         = 'progress_desc'; // qBit sort state
    this._sortDeluge   = 'progress_desc'; // Deluge sort state
    this._sortRtorrent = 'progress_desc'; // rTorrent sort state
    this._sortTransmission = 'progress_desc'; // Transmission sort state

    // Data stores
    this._radarr = [];
    this._radarrTotal = 0;
    this._radarr2 = [];
    this._radarr2Total = 0;
    this._radarr2Configured = null;    // null=unknown, true=configured, false=not configured (503)
    this._radarr2ByTmdb = new Map();   // tmdbId → radarr4k movie object (for O(1) lookup)
    this._sonarr = [];
    this._sonarrAll = [];
    this._sonarrTotal = 0;
    this._sonarr2 = [];
    this._sonarr2Total = 0;
    this._sonarr2Configured = null;    // null=unknown, true=configured, false=not configured (503)
    this._sonarr2ByTvdb = new Map();   // tvdbId → sonarr4k series object (for O(1) lookup)
    this._calendar = [];
    this._calendarModalOpen    = false;
    this._calendarWeekOffset   = 0;
    this._calendarModalData    = [];
    this._calendarModalLoading = false;
    this._calReturnState       = false;
    this._albumModal           = null;   // one album's detail, opened from a calendar tile
    this._musAddPending        = null;   // the add-an-artist overlay
    this._lidarrAddOpts        = null;   // profiles and root folders, read once
    this._albumCalReturn       = false;
    this._calendarTab          = localStorage.getItem('arr-cal-tab') || 'all';
    this._calendarView         = localStorage.getItem('arr-cal-view') === 'month' ? 'month' : 'week';
    this._calendarMonthOffset  = 0;
    this._calDayOpen           = null;
    this._upcoming = [];
    this._tvUpcoming = [];
    this._trending = [];
    this._popular  = [];
    this._trakt    = [];
    this._traktConfigured    = null; // null=unknown, false=not configured
    this._suggestarr = null;   // null = not fetched yet, [] = fetched and empty
    this._suggestarrConfigured = null;
    this._suggestarrBaseline = 0;    // how many suggestions the row started with
    this._suggestarrRefreshing = false;
    this._suggestarrPendingFrom = 0; // row size when the refresh was asked for
    // Assume a key is present until capabilities say otherwise, so the notice
    // never flashes up during the first load.
    this._tmdbOwnKey = true;
    // downloadId (torrent hash / SAB nzo_id) → arr internal id, filled by the
    // queue fetchers. Lets a download-client row open the right media popup.
    this._dlMediaRadarr  = new Map();
    this._dlMediaRadarr2 = new Map();
    this._dlMediaSonarr  = new Map();
    this._dlMediaSonarr2 = new Map();
    this._dlMediaLidarr  = new Map();
    // Same shape, filled from recent arr history — covers downloads that already
    // imported and left the queue but are still seeding in the client.
    this._dlHistRadarr  = new Map();
    this._dlHistRadarr2 = new Map();
    this._dlHistSonarr  = new Map();
    this._dlHistSonarr2 = new Map();
    this._tmdbInfoOpen = false;
    this._dlInfoOpen = false;
    // Quick-actions menu in the detail popup: { sub, busy } or null when closed
    this._ppMenu   = null;
    this._ppSeasonPick = null;  // season chooser inside a Maintainerr drawer
    this._ppStats = null;       // watch statistics drawer
    this._ppJfId = null;        // { key: popup, id } — Jellyfin item id per popup
    this._traV2 = undefined;    // undefined = not probed, then true/false for Tracearr 2.x
    this._actImporting = new Set();  // downloadIds with a manual import in flight
    this._ppGrabWait = null;    // { inst, until } — grabbed, waiting for the queue to show it
    this._ppGrabTimer = null;   // interval that watches for that download to appear
    this._plexClientsTs = 0;    // cast device list is cached briefly
    this._libPopupReturn = null;  // set when Library was opened from a detail popup
    this._actPopupReturn = null;  // same, for the Activity queue
    this._arrHosts = {};   // { radarr: 'host:port', … } from capabilities
    this._ppStatus = null;   // { msg, err, spin }
    this._dlInfoName = '';
    this._prowlarrConfigured = null;
    this._prowlarr           = null; // { indexers: [], lastFetch: ts }
    this._qbit = [];
    this._qbitTransfer     = {};
    this._qbitDiskFreeBytes = null;
    this._sab = {};
    this._sabLocalIp    = null;
    this._sabPublicIp   = null;
    this._sabVpnFetched = false;
    this._sabFailed = [];            // failed položky z SABnzbd history
    this._sabRetryBusy = null;       // nzo_id položky, jejíž retry právě probíhá
    this._sabDeleteBusy = null;      // nzo_id položky, jejíž smazání z history probíhá
    this._qbCookies = null;
    this._capsLoaded = false;       // true after first capabilities fetch
    this._qbitConfigured   = true; // false pokud proxy vrátí 503 (není nakonfigurován)
    this._sabConfigured    = true; // false pokud proxy vrátí 503 (není nakonfigurován)
    this._nzbgetConfigured = true;
    this._nzbget           = null;   // status { DownloadRate, DownloadPaused, FreeDiskSpaceMB, TotalDiskSpaceMB }
    this._nzbgetQueue      = [];     // queue items from listgroups
    this._nzbgetFailed     = [];     // failed items from history
    this._nzbgetCompleted  = [];     // completed items from history
    this._nzbgetBusy       = false;  // global pause/resume in progress
    this._nzbgetItemBusy   = null;   // NZBID of item with pending action
    this._nzbgetConfirm    = null;   // NZBID awaiting delete confirm
    this._nzbgetRetryBusy  = null;   // NZBID of item being retried
    this._delugeConfigured = true;
    this._deluge           = null;   // { download_rate, upload_rate }
    this._delugeQueue      = [];     // active torrents
    this._delugeBusy       = false;  // global action in progress
    this._delugeItemBusy   = null;   // hash of item with pending action
    this._delugeConfirm    = null;   // hash awaiting delete confirm
    this._gluetunConfigured = null;  // null=unknown, true=configured, false=not configured
    this._gluetunStatus     = null;  // 'running' | 'stopped' | null
    this._gluetunCountry    = null;  // e.g. 'Netherlands'
    this._gluetunIp         = null;  // public IP string
    this._gluetunProvider   = null;  // detected provider slug for Simple Icons
    this._rtorrentConfigured = null;
    this._rtorrentStatus     = {};   // { download_rate, upload_rate }
    this._rtorrentQueue      = [];   // active torrents
    this._rtorrentBusy       = false;
    this._rtorrentItemBusy   = null;
    this._rtorrentConfirm    = null;

    this._transmissionConfigured = null;
    this._transmissionStatus     = {};   // { download_rate, upload_rate, free_space }
    this._transmissionQueue      = [];   // active torrents
    this._transmissionBusy       = false;
    this._transmissionItemBusy   = null;
    this._transmissionConfirm    = null;
    this._bazarrConfigured    = true; // false pokud proxy vrátí 503 (není nakonfigurován)
    this._tautulliConfigured  = true; // false pokud Tautulli není nakonfigurován
    this._tautulli       = null; // { activity, stats, playsData, sharingDetected, sharingUsers, ackedIps }
    this._tautulliModal  = null; // { tab, histPage, histData, histTotal, histLoading, graphsSub, graphsData }
    this._jellystatConfigured = true; // false pokud Jellystat není nakonfigurován
    this._jellystat      = null; // { libraries, users, recentHistory, activity, playsData }
    this._jellystatModal = null; // { tab, libsData, usersData, histData, graphsData, ... }
    this._tracearrConfigured = true; // false pokud Tracearr není nakonfigurován
    this._tracearr       = null; // { stats, health, users, violations, activity }
    this._tracearrModal  = null; // { tab, usersData, violsData, histData, activityData, ... }
    this._maintainerrConfigured = true;
    this._maintainerr       = null;
    this._maintainerrModal  = null;
    this._maintainerrConstants = null;
    this._maintainerrLibraries = null;
    this._maintainerrArrServers = null;
    this._activityModal     = null; // { tab, queueData, histData, blData, histFilter, histPage, blPage, ... }
    this._actHistoryCache   = null; // [{title, date, eventType, svc}] — pre-fetched for card display
    this._actBlocklistCache = null; // [{title, date, quality, svc}]
    this._radarrQueueItems  = [];   // [{title, svc, failed, pct}]
    this._radarr2QueueItems = [];   // same for radarr2
    this._bazarr = {}; // map: radarrId → { subtitles, missing_subtitles }
    this._posterRatingsCache = new Map(); // tmdbId(str) → {rt, metacritic} | null(pending) | false(failed)
    this._posterTmdbVoteCache = new Map(); // tmdbId(str) → voteAverage(number) | null(pending) | false(failed)
    this._libTvAudioCache = new Map(); // "{inst}-{seriesId}" → langCodes[] | null(pending) | false(failed/none)
    this._libTvSubCache = new Map();   // seriesId → { codes[], missing } | null(pending) | false
    this._radarrQueueFailed  = new Set(); // radarr movieId s chybou stahování
    this._radarrQueueActive  = new Set(); // radarr movieId s aktivním stahováním
    this._radarr2QueueFailed = new Set(); // radarr2 movieId s chybou stahování
    this._radarr2QueueActive = new Set(); // radarr2 movieId s aktivním stahováním
    this._plexSessions      = [];
    this._plexConfigured    = null;
    this._plexLastFetch     = 0;
    this._jellyfinSessions  = [];
    this._jellyfinLastFetch = 0;
    this._embySessions      = [];
    this._embyLastFetch     = 0;
    this._kodiSessions      = [];
    this._kodiLastFetch     = 0;
    this._kodiEntityIds     = new Set();
    this._overseerrConfigured = null;   // null=unknown, true=configured, false=not configured
    this._tmdbPinged = false;
    this._seerrRadarr = null;           // { serverId, profileId, rootFolder } z Overseerr settings (HD)
    this._seerrRadarr2 = null;         // { serverId, profileId, rootFolder } z Overseerr settings (4K)
    this._confirmRemove = null;         // hash torrentu čekajícího na potvrzení smazání
    this._requestPending = null;        // { movieId, tmdbId } — overlay výběru profilu
    this._pendingRequests = [];         // čekající žádosti z Overseerr (vidí jen admin)
    this._optimisticRequested = new Set(); // mediaId odeslaných žádostí (okamžitá odezva)
    this._withdrawnIds = new Set();        // mediaId stažených žádostí (okamžitá odezva)
    this._traktWatching = new Set();       // trakt slugs označených jako zhlédnuté (session)
    this._myRequestIds = new Map();        // mediaId → requestId (zachyceno z POST odpovědi)
    this._familyPendingIds = new Map();    // tmdbId → requestId (načteno z my_pending, pro non-admin)
    this._radarrProfiles = [];          // cache quality profilů z Radarr
    this._radarrTags     = [];          // cache tagů z Radarr [{id, label}]
    this._sonarrTags     = [];          // cache tagů ze Sonarr [{id, label}]
    this._radarrRootFolders = [];
    this._sonarrRootFolders = [];
    this._radarr2Profiles    = [];     // cache quality profilů z Radarr 2
    this._radarr2Tags        = [];     // cache tagů z Radarr 2
    this._radarr2RootFolders = [];     // cache root folderů z Radarr 2
    this._sonarr2Profiles    = [];     // cache quality profilů z Sonarr 2
    this._sonarr2RootFolders = [];     // cache root folderů z Sonarr 2
    this._radarrDiskspace    = [];
    this._radarr2Diskspace   = [];
    this._sonarrDiskspace    = [];
    this._sonarr2Diskspace   = [];
    this._tvRequestPending = null;      // { show, seasons, selected, profileId, mediaId, loading }
    this._overlay = { section: null, page: 0, tvPending: null }; // section=null → closed
    this._overlayApiPage = {};           // section → last fetched API page number
    this._overlayApiTotalPages = {};     // section → total pages in API
    this._discoverLastFetch = {};        // section → timestamp of last successful fetch (throttle)
    this._seerrSonarr  = null;          // { serverId, profileId, rootFolder, name } z Overseerr Sonarr settings
    this._seerrSonarr2 = null;          // secondary Sonarr instance (pokud existuje)
    this._sonarrProfiles = [];          // cache quality profilů ze Sonarr
    this._qbitBusy = false;            // globální akce qBit právě probíhá
    this._sabBusy  = false;            // globální akce SAB právě probíhá
    this._qbitItemBusy = null;         // hash torrentu, jehož akce právě probíhá

    // Popup state
    this._popup = null; // stores fetched detail data for modal

    // Interactive Search state (Radarr)
    this._isState    = null;    // null | 'loading' | 'results' | 'error'
    this._isResults  = [];      // pole releasů z Radarr /api/v3/release
    this._isFilters  = { protocol: '', indexer: '', quality: '', lang: '' };
    this._isSort     = { col: null, dir: 1 }; // col: null|'src'|'title'|'indexer'|'size'|'peers'|'lang'|'quality'|'score', dir: 1 asc | -1 desc
    this._isGrabbing = null;    // guid právě stahovaného releasu
    this._isGrabbed  = new Set(); // guidy úspěšně grabnutých releasů
    this._isConfirm  = null;    // guid čekající na potvrzení
    this._isError    = null;    // chybová zpráva

    // Interactive Search state (Sonarr)
    this._snIsOpen         = false;      // seasons panel visible
    this._snExpandedSeasons = new Set(); // čísla sezón s rozbalením epizod
    this._snEpisodes       = new Map();  // seasonNumber → episodes[]
    this._snActiveIs       = null;       // { type:'season'|'episode', key } - otevřený IS panel
    this._snMonitorBusy    = null;       // seasonNumber právě přepínaného monitoringu
    this._popupMonExpand   = false;      // dual instance výběr monitoringu rozbalen
    this._popupMonBusy     = null;       // instance právě přepínaného monitoringu (popup title)
    this._popupMonAddInst  = null;       // instance čekající na potvrzení "přidat unmonitored?"
    this._popupMonAddBusy  = null;       // instance právě přidávaná (unmonitored)
    this._popupCastOpen    = false;      // panel obsazení místo traileru
    this._popupCastPage    = 0;          // stránka obsazení
    this._snIsState        = null;       // loading | results | error
    this._snIsResults      = [];
    this._snIsError        = null;
    this._snIsFilter       = 'all'; // kept for legacy, superseded by _snIsFilters
    this._snIsFilters      = { protocol: '', indexer: '', quality: '', lang: '' };
    this._snIsSort         = { col: null, dir: 1 };
    this._snIsGrabbing     = null;
    this._snIsGrabbed      = new Set();
    this._snIsHistory      = {};

    // Unified search button expand state
    this._searchExpand     = null;       // null|'pick'|'as-inst'|'is-inst'
    this._plexCastOpen    = false;
    this._plexCasting     = null;
    this._plexClients     = null;
    this._plexCastBtnRect = null;

    // Auto Search state
    this._asOpen           = false;      // AS panel open
    this._asInstance       = null;       // 'radarr'|'radarr2'|'sonarr'|'sonarr2'
    this._asState          = null;       // null|'confirm'|'adding'|'seasons'|'done'|'error'
    this._asError          = null;
    this._asMovieSearching = false;
    this._asMovieSearched  = false;
    this._asSearchingItems   = new Set();  // 'season:N' or 'ep:ID' in progress
    this._asSearchedItems    = new Set();  // done
    this._asDownloadingItems = new Set();  // downloading detected (key or 'movie')
    this._asNotFound         = new Set();  // poll finished, nothing in queue
    this._asPolling          = new Set();  // currently polling queue
    this._radarrQueuePct   = new Map(); // movieId → pct
    this._radarr2QueuePct  = new Map();
    this._dlTriggeredBy    = null; // 'as' | 'is' | null
    this._epFileConfirm    = null; // episodeId awaiting confirm
    this._epFileDeleting   = null; // episodeFileId being deleted
    this._seasonFileConfirm  = null; // seasonNumber awaiting confirm
    this._seasonFileDeleting = null; // seasonNumber being deleted
    this._sonarrQueueSeasons    = new Set();
    this._sonarrQueueEpisodes   = new Set();
    this._sonarrQueueEpPct      = new Map();
    this._sonarrQueueSeasonPct  = new Map();
    this._sonarrQueueSeriesPct  = new Map(); // seriesId → pct
    this._sonarr2QueueSeasons   = new Set();
    this._sonarr2QueueEpisodes  = new Set();
    this._sonarr2QueueEpPct     = new Map();
    this._sonarr2QueueSeasonPct = new Map();
    this._sonarr2QueueSeriesPct = new Map();
    this._sonarr2ImportDates    = {};
    this._sonarrImportEps       = {}; // seriesId → [{ s, e }, ...]
    this._sonarr2ImportEps      = {};
    this._pendingRequestedShows  = new Set(); // tvdbId strings — added via card AS/IS (session only)
    this._pendingRequestedMovies = new Set(); // tmdbId strings — added via card AS/IS (session only)
    this._seerrRequests = null;   // Seerr's own request list; null = not available, fall back to the library
    this._lidarrConfigured = null;  // null=unknown, true, false
    this._lastfm = null;            // null = not fetched yet, [] = fetched and empty
    try { this._rqType = localStorage.getItem('arr-rq-type') || 'all'; } catch (_) { this._rqType = 'all'; }
    try { this._raType = localStorage.getItem('arr-ra-type') || 'all'; } catch (_) { this._raType = 'all'; }
    try { this._calCatType = localStorage.getItem('arr-cal-type') || 'all'; } catch (_) { this._calCatType = 'all'; }
    try { this._recType = localStorage.getItem('arr-rec-type') || 'all'; } catch (_) { this._recType = 'all'; }
    this._musAdded = new Set();     // artists added from a suggestion this session
    this._musAddedEntries = new Map(); // …and the cards themselves, held until liked or skipped
    this._lastfmConfigured = false; // a key of the user's own, for artist suggestions
    this._lastfmUserConfigured = false; // …and a name, so their own scrobbles seed them
    this._lidarrArtistFeed = null;  // artists whose music arrived recently, newest first
    this._musicModal = null;        // { artistId, artist, albums, loading }
    this._lidarrArtists = new Map();// artistId → artist, for the fanart behind a cover
    this._lidarrQueue   = new Set();// albumIds currently downloading
    this._lidarrQueuePct = new Map();    // albumId → percent complete
    this._lidarrQueueArtists = new Map();// artistId → percent of its furthest album

    // Search state
    this._searchQuery   = '';
    this._searchResults = [];
    this._searchPage    = 0;
    this._searchLoading = false;
    this._searchActive  = false;  // overlay visible
    this._searchTimer = null;    // debounce timer
    this._searchAbort = null;    // AbortController for search listeners

    // Pagination state
    this._pages   = { radarr: 0, sonarr: 0, upcoming: 0, tvUpcoming: 0, calendar: 0, trending: 0, popular: 0, qbit: 0, sab: 0, deluge: 0, rtorrent: 0, transmission: 0, pending: 0, recentlyAdded: 0, recentlyRequested: 0, music: 0, lastfm: 0, recommendations: 0, streams: 0 };
    this._pageDir = { radarr: '', sonarr: '', upcoming: '', tvUpcoming: '', calendar: '', trending: '', popular: '', qbit: '', sab: '', pending: '', streams: '' };
    this._streamsTimer     = null;
    this._streamPopupTimer = null;
    this._streamsEnded     = new Set(); // entity IDs our timer detected as finished
    this._diskPage = { radarr: 0, sonarr: 0, left: null }; // null = auto-select SAB disk
    this._rightPage = 0;
    this._rightMaxH = 0;    // cached max height across all outer pages (used to pre-lock before innerHTML swap)

    // Cover gradient classes pool
    this._gradients = ['ca','cb','cc','cd','ce','cf','cg','ch','ci','cj','ck','cl','cm','cn','co','cp','cq','cr'];
    this._gradientMap = {};
    this._gradientIdx = 0;

    // Panel minimize state (mobile only) — persisted in localStorage
    try {
      this._leftMinimized  = localStorage.getItem('arr-left-minimized')  === '1';
      this._rightMinimized = localStorage.getItem('arr-right-minimized') === '1';
    } catch { this._leftMinimized = false; this._rightMinimized = false; }
  }

  // ─────────────────────────────────────────────
  // HA lifecycle
  // ─────────────────────────────────────────────

  setConfig(config) {
    if (Array.isArray(config.categories)) {
      const CAT_MAP = { radarr: 'recentlyAdded', sonarr: 'recentlyRequested' };
      const seen = new Set();
      config = {
        ...config,
        categories: config.categories
          .map(c => CAT_MAP[c.id] ? { ...c, id: CAT_MAP[c.id] } : c)
          .filter(c => seen.has(c.id) ? false : seen.add(c.id)),
      };
    }
    this._config = config;
    this._debug = !!config.debug;
    // Pokud je karta už inicializována, obnov sticky nav observer s novým offsetem
    if (this._initialized) {
      this._wireStickyNav();
      this._applyTheme();
    }
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._buildShell();
      this._loadPendingFromStorage(); // obnovit pending stav z localStorage před prvním fetchem
      this._fetchAll();
      this._interval = setInterval(() => this._pollFull(), 30000);
      this._fastInterval = setInterval(() => this._pollFast(), 5000);

      // ResizeObserver — badge compact při změně velikosti karty
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this._checkBadgeOverflow());
      });
      this._resizeObserver.observe(this);
      this._wireVisibility();
      return;
    }

    // Detect Plex/Jellyfin stream changes — re-render streams section immediately
    if (prev) {
      const cur = hass.states || {};
      const old = prev.states || {};

      // 1) New stream started (idle/off → playing/paused)
      for (const id of Object.keys(cur)) {
        if (!(id.startsWith('media_player.plex_') || id.startsWith('media_player.jellyfin_'))) continue;
        const nowActive = cur[id]?.state === 'playing' || cur[id]?.state === 'paused';
        const wasActive = old[id]?.state === 'playing' || old[id]?.state === 'paused';
        if (nowActive && !wasActive) {
          this._streamsEnded.delete(id);
          this._reRenderSection('streams');
          break;
        }
      }

      // 2) Restarted on same device — entity still playing but position_updated_at changed
      //    (timer put it in _streamsEnded, new playback began without idle transition)
      for (const id of this._streamsEnded) {
        const curS = cur[id];
        if (!curS) { this._streamsEnded.delete(id); continue; }
        const nowActive = curS.state === 'playing' || curS.state === 'paused';
        if (!nowActive) { this._streamsEnded.delete(id); continue; }
        const curAttr = curS.attributes || {};
        const oldAttr = old[id]?.attributes || {};
        const curUpd   = curAttr.media_position_updated_at;
        const oldUpd   = oldAttr.media_position_updated_at;
        const titleChg = curAttr.media_title !== oldAttr.media_title;
        const idChg    = curAttr.media_content_id !== oldAttr.media_content_id;
        const posReset = (curAttr.media_position || 0) < 10 && (oldAttr.media_position || 0) > 30;
        if ((curUpd && curUpd !== oldUpd) || titleChg || idChg || posReset) {
          this._streamsEnded.delete(id);
          this._reRenderSection('streams');
          break;
        }
      }

      // 3) Kodi — detect via cached entity IDs (HA state, no proxy roundtrip needed)
      if (this._kodiEntityIds.size) {
        let kodiChanged = false;
        for (const id of this._kodiEntityIds) {
          if (cur[id]?.state !== old[id]?.state) { kodiChanged = true; break; }
        }
        if (kodiChanged) {
          this._kodiSessions = [...this._kodiEntityIds]
            .map(id => {
              const s = cur[id];
              if (!s || (s.state !== 'playing' && s.state !== 'paused')) return null;
              return { id, source: 'kodi', state: s.state, attr: s.attributes || {} };
            })
            .filter(Boolean);
          this._reRenderSection('streams');
        }
      }
    }
  }

  // Reset the 30s full-fetch interval after a page switch so the next cycle starts
  // fresh from now (avoids a fetch arriving seconds after navigation).
  _resetFetchInterval() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = setInterval(() => this._pollFull(), 30000);
    }
  }

  // The polls skip a hidden tab: a dashboard in the background — a wall tablet
  // showing something else — kept calling HA and every service behind the
  // card. Coming back into view catches up at once.
  _pollFull() { if (!document.hidden) this._fetchAll(); }
  _pollFast() { if (!document.hidden) this._fetchDownloadsAndRender(); }
  _wireVisibility() {
    if (this._visibilityHandler) return;
    this._visibilityHandler = () => {
      if (!document.hidden && this.isConnected) { this._fetchAll(); this._fetchDownloadsAndRender(); }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  disconnectedCallback() {
    if (this._overlayObserver) {
      this._overlayObserver.disconnect();
      this._overlayObserver = null;
    }
    if (this._scrollLocked) {
      // Unlock but do not restore — the card is going away, and forcing a
      // scroll position onto whatever replaces it would fight the navigation.
      this._scrollRestore = null;
      this._applyScrollLock(false);
    }
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this._fastInterval) {
      clearInterval(this._fastInterval);
      this._fastInterval = null;
    }
    if (this._streamsTimer) {
      clearInterval(this._streamsTimer);
      this._streamsTimer = null;
    }
    if (this._streamPopupTimer) {
      clearInterval(this._streamPopupTimer);
      this._streamPopupTimer = null;
    }
    if (this._ppGrabTimer) {
      clearInterval(this._ppGrabTimer);
      this._ppGrabTimer = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._clearNavWatcher();
    if (this._pageBtnAbort) { this._pageBtnAbort.abort(); this._pageBtnAbort = null; }
  }

  connectedCallback() {
    // Karta byla odpojena a znovu zapojena (např. Bubble Card přepnutí/schování).
    // _initialized zůstane true — HA set hass() přeskočí re-init, takže intervaly
    // a nav watcher musíme obnovit sami.
    if (!this._initialized) return; // ještě nebyla inicializována, set hass() to vyřeší
    this._wireVisibility();

    if (!this._interval) {
      this._interval = setInterval(() => this._pollFull(), 30000);
    }
    if (!this._fastInterval) {
      this._fastInterval = setInterval(() => this._pollFast(), 5000);
    }
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this._checkBadgeOverflow());
      });
      this._resizeObserver.observe(this);
    }
    // Nav watcher (setInterval) musí být obnoven — col-left/col-right jsou stále v DOM
    requestAnimationFrame(() => this._wireStickyNav());
  }

  // ─────────────────────────────────────────────
  // Config helpers
  // ─────────────────────────────────────────────

  get _cfg() { return this._config; }

  // Nested config read with flat fallback for backward compat
  // e.g. _cfgGet('downloads', 'torrentItems') reads config.downloads.torrentItems ?? config.torrentItems
  _cfgGet(group, key, fallback) {
    const grouped = this._config?.[group]?.[key];
    if (grouped !== undefined) return grouped;
    const flat = this._config?.[key];
    if (flat !== undefined) return flat;
    return fallback;
  }

  // The card's language: cs, fr or en, from the card's localisation setting.
  _lg() {
    const l = this._cfg?.localisation;
    return l === 'cs' || l === 'fr' ? l : 'en';
  }

  // Lokalizační helper — přeložený řetězec dle nastavení localisation: cs|fr|en.
  // A key a language lacks reads in English rather than as its own name.
  _t(key) {
    return ARR_I18N[this._lg()]?.[key] || ARR_I18N.en[key] || key;
  }

  // "X seasons" s českou plurálovou logikou (1 série / 2–4 série / 5+ sérií)
  _tSeasons(n) {
    const lang = this._lg();
    if (lang === 'fr') return `${n} ${n <= 1 ? 'saison' : 'saisons'}`;
    if (lang === 'cs') {
      const word = n === 1 ? 'série' : (n >= 2 && n <= 4 ? 'série' : 'sérií');
      return `${n} ${word}`;
    }
    return `${n} ${n === 1 ? 'season' : 'seasons'}`;
  }

  // Converts "#rrggbb" or "#rgb" to "r,g,b" string for use in rgba()

  // ─────────────────────────────────────────────
  // Formatters
  // ─────────────────────────────────────────────

  fmtSpeed(bytesPerSec) {
    if (bytesPerSec === undefined || bytesPerSec === null || isNaN(bytesPerSec)) return '0 KB/s';
    if (bytesPerSec >= 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    }
    return Math.round(bytesPerSec / 1024) + ' KB/s';
  }

  fmtEta(seconds) {
    if (!seconds || seconds <= 0 || seconds >= 8640000) return '∞';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  }

  get _locale() { return this._hass?.locale?.language || 'en'; }

  fmtDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(this._locale, { month: 'numeric', day: 'numeric' });
    } catch {
      return '';
    }
  }

  // The year is dropped on a phone: the header also carries the type filter,
  // which grew by one when music arrived, and the close button was the part
  // pushed off the edge. Nobody reads a week range to find out which year it is.
  _fmtWeekRange(start, end) {
    const locale = this._locale;
    const fmt = this._hass?.locale?.date_format || 'DMY';
    const mon = d => new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
    const s = start.getDate(), sm = mon(start);
    const e = end.getDate(),   em = mon(end), y = end.getFullYear();
    // 700px, matching the width at which the header puts this label in the flow
    // beside the filter — that is where the space runs out, not at 600.
    const narrow = maxWidth(BP.COMPACT);
    if (fmt === 'MDY') return narrow ? `${sm} ${s} – ${em} ${e}` : `${sm} ${s} – ${em} ${e}, ${y}`;
    if (fmt === 'YMD') return narrow ? `${sm} ${s} – ${em} ${e}` : `${y} ${sm} ${s} – ${em} ${e}`;
    return narrow ? `${s} ${sm} – ${e} ${em}` : `${s} ${sm} – ${e} ${em} ${y}`;
  }

  fmtPct(ratio) {
    if (ratio === undefined || ratio === null || isNaN(ratio)) return '0%';
    return Math.round(ratio * 100) + '%';
  }

  // Assign a stable gradient class to each media item ID
  _grad(id) {
    const key = String(id);
    if (!this._gradientMap[key]) {
      this._gradientMap[key] = this._gradients[this._gradientIdx % this._gradients.length];
      this._gradientIdx++;
    }
    return this._gradientMap[key];
  }

  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // Badge / pill helpers
  // ─────────────────────────────────────────────

  /** Media card poster img + gradient placeholder fallback */
  _mcImg(poster, emoji, gradId, phClass = '') {
    return poster
      ? `<img src="${this._escHtml(poster)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="${phClass}${this._grad(gradId)}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px">${emoji}</div>`;
  }

  _posterCfg() {
    return {
      title: this._cfgGet('posters', 'showTitle', true) !== false,
      audio: this._cfgGet('posters', 'showAudio', true) !== false,
      subtitles: this._cfgGet('posters', 'showSubtitles', true) !== false,
      rating: this._cfgGet('posters', 'showRating', true) !== false,
      mediaType: this._cfgGet('posters', 'showMediaType', true) !== false,
      statusDisplay: this._cfgGet('posters', 'statusDisplay', 'tags'),
      // 'all' | 'maintainerr' | 'off' — where the Maintainerr deletion tag shows
      goneTag: this._cfgGet('posters', 'goneTag', 'all'),
      // 'flags' = one combined strip; 'tags' = the original separate badges
      langDisplay: this._cfgGet('posters', 'langDisplay', 'flags'),
    };
  }

  // `inst` says which instance the id belongs to. Without it both maps are
  // tried in order, and two instances number their libraries from 1 apiece —
  // so an id that exists in both answers with the wrong film's progress.
  _dlPct(id, type = 'movie', inst = null) {
    if (!id) return -1;
    if (type === 'tv') {
      if (inst === 'sonarr2') return this._sonarr2QueueSeriesPct?.get(id) ?? -1;
      if (inst === 'sonarr')  return this._sonarrQueueSeriesPct?.get(id) ?? -1;
      return this._sonarrQueueSeriesPct?.get(id) ?? this._sonarr2QueueSeriesPct?.get(id) ?? -1;
    }
    if (inst === 'radarr2') return this._radarr2QueuePct?.get(id) ?? -1;
    if (inst === 'radarr')  return this._radarrQueuePct?.get(id) ?? -1;
    return this._radarrQueuePct?.get(id) ?? this._radarr2QueuePct?.get(id) ?? -1;
  }

  _statusStripeColor(cls) {
    const map = { 'b-st-avail': '#27ae60', 'b-continuing': '#2980b9', 'b-dl': '#2980b9', 'b-st-proc': '#2980b980', 'b-st-pend': '#e67e22', 'b-missing': '#c0392b', 'b-cutoff': '#e67e22', 'b-partial': '#c0392b' };
    return map[cls] || '#555';
  }

  _statusStripe(color, animated = false, pct = -1) {
    const bg = `linear-gradient(90deg,${color} 0%,color-mix(in srgb,${color} 70%,white) 50%,${color} 100%)`;
    const dimColor = `color-mix(in srgb,${color} 50%,transparent)`;
    const dimBg = `linear-gradient(90deg,${dimColor} 0%,color-mix(in srgb,${dimColor} 70%,white) 50%,${dimColor} 100%)`;
    if (pct >= 0 && pct < 100) {
      // A download that has just started reads as 0%, and a fill of no width
      // shows neither colour nor the pulse that says it is moving. A sliver is
      // what makes a fresh grab legible.
      const w = animated ? Math.max(pct, 4) : pct;
      return `<div style="position:absolute;bottom:0;left:0;right:0;height:4px;z-index:3;pointer-events:none;background:${dimBg};overflow:hidden">` +
        `<div style="position:absolute;left:0;top:0;bottom:0;width:${w}%;background:${bg}${animated ? ';animation:stripe-pulse 1.8s ease-in-out infinite' : ''}"></div>` +
        `</div>`;
    }
    return `<div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:${bg};z-index:3;pointer-events:none${animated ? ';animation:stripe-pulse 1.8s ease-in-out infinite' : ''}"></div>`;
  }

  /** Media card gradient footer overlay */
  _mcGrad(grad, inner) {
    return `<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,${grad} 0%,transparent 80%);padding:28px 6px 6px;z-index:1">${inner}</div>`;
  }

  /** Media card badge with text: <span class="badge {cls}">{icon}<span class="b-txt"> {text}</span></span> */
  _badge(cls, icon, text) {
    return `<span class="badge ${cls}">${icon}<span class="b-txt"> ${text}</span></span>`;
  }

  /** Media card badge with mdi icon: <span class="badge {cls}"><ha-icon ...> {text}</span> */
  _badgeIcon(cls, mdiIcon, text) {
    return `<span class="badge ${cls}"><ha-icon icon="${mdiIcon}" style="--mdc-icon-size:9px"></ha-icon> ${text}</span>`;
  }

  /** Download panel status pill: <span class="status-pill {cls}"><ha-icon ...> {text}</span> */
  _pill(cls, mdiIcon, text, style = '') {
    return `<span class="status-pill ${cls}"${style ? ` style="${style}"` : ''}><ha-icon icon="${mdiIcon}" style="--mdc-icon-size:11px"></ha-icon> ${text}</span>`;
  }

  // ─────────────────────────────────────────────
  // Shell build (CSS + skeleton)
  // ─────────────────────────────────────────────

  _buildShell() {
    const sharedSheet = arrSharedSheet();
    const style = sharedSheet ? null : document.createElement('style');
    if (style) style.textContent = this._css();

    // Inject user CSS variables from styles: config block
    // Colors are stored as hex in config; alpha is fixed per-variable.
    const userStyles = this._cfg?.styles || {};
    const perfMode = !!(userStyles.performanceMode || this._cfg?.performanceMode);
    const customVars = [];

    const hexRgba = (hex, alpha) => {
      if (!hex || !hex.startsWith('#')) return null;
      const rgb = this._hexToRgb(hex);
      return rgb ? `rgba(${rgb},${alpha})` : null;
    };

    // cardBackground only applies in perf mode (normal mode uses blur which hides bg)
    if (perfMode && userStyles.cardBackground) {
      const opacityPct = userStyles.cardBackgroundOpacity;
      const alpha = (typeof opacityPct === 'number' && opacityPct >= 0 && opacityPct <= 100)
        ? opacityPct / 100 : 0.90;
      const v = hexRgba(userStyles.cardBackground, alpha);
      if (v) customVars.push(`--card-bg-perf: ${v}`);
    }
    const layout = this._cfg?.layout || 'both';
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    const layoutClass = layout === 'left' ? ' layout-left' : layout === 'right' ? ' layout-right' : '';
    const perfClass = (this._cfg?.styles?.performanceMode || this._cfg?.performanceMode) ? ' perf-mode' : '';
    const swapClass = this._cfg?.swap_sides ? ' swap-sides' : '';
    wrapper.innerHTML = `<div class="card-body${layoutClass}${perfClass}${swapClass}">
      <div class="col col-left" id="col-left"></div>
      <div class="col col-right" id="col-right"></div>
    </div>`;
    // Popup root — separate from .card so overlay covers everything
    const popupRoot = document.createElement('div');
    popupRoot.id = 'popup-root';
    // Adopted sheets cascade after <style> elements; the card's own variables
    // below are not declared in STYLES, so the order changes nothing.
    if (sharedSheet) this.shadowRoot.adoptedStyleSheets = [sharedSheet];
    else this.shadowRoot.appendChild(style);
    // Custom vars appended after main style so they override defaults
    if (customVars.length) {
      const varStyle = document.createElement('style');
      varStyle.textContent = `:host { ${customVars.join('; ')}; }`;
      this.shadowRoot.appendChild(varStyle);
    }
    const calModalRoot = document.createElement('div');
    calModalRoot.id = 'cal-modal-root';
    const tmdbModalRoot = document.createElement('div');
    tmdbModalRoot.id = 'tmdb-modal-root';
    const dlInfoRoot = document.createElement('div');
    dlInfoRoot.id = 'dl-info-root';
    this.shadowRoot.appendChild(wrapper);
    this.shadowRoot.appendChild(popupRoot);
    this.shadowRoot.appendChild(calModalRoot);
    this.shadowRoot.appendChild(tmdbModalRoot);
    this.shadowRoot.appendChild(dlInfoRoot);
    this._applyTheme();
  }

  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────

  _render() {
    const left = this.shadowRoot.getElementById('col-left');
    const right = this.shadowRoot.getElementById('col-right');
    if (!left || !right) return;
    this._measureFlagRatio();
    this._watchOverlays();
    const layout = this._cfg?.layout || 'both';
    if (layout !== 'right') {
      const leftContent = this._renderLeft();
      const leftHtml = this._mobMinWrap('left', leftContent);
      if (leftHtml !== this._lastLeftHtml) {
        this._lastLeftHtml = leftHtml;
        left.innerHTML = leftHtml;
      }
      const body = this.shadowRoot.querySelector('.card-body');
      if (body) body.classList.toggle('no-downloads', !leftContent);
    }
    if (this._requestPending || this._searchActive) return;
    if (layout !== 'left')  right.innerHTML = this._mobMinWrap('right', this._renderRight());
    this._wireSort();
    this._wireActionButtons();
    this._wireRight(right);
    this._syncSecHeights(false);   // the floor is known — apply it before paint
    this._renderPopupEl();
    this._renderCalendarModalEl();
    this._wireMinimize(['left']);   // the right side is wired by _wireRight
    requestAnimationFrame(() => {
      this._syncSecHeights();
      if (!maxWidth(BP.STACKED)) this._measureAndLockHeight();
      requestAnimationFrame(() => { this._checkBadgeOverflow(); this._fixPeerChips(); });
    });
    this._trimActivityCards();
  }

  _renderDlInfoEl() {
    const root = this.shadowRoot?.getElementById('dl-info-root');
    if (!root) return;
    root.innerHTML = this._dlInfoOpen ? this._renderDlInfoModal() : '';
    if (!this._dlInfoOpen) return;
    const close = () => { this._dlInfoOpen = false; this._renderDlInfoEl(); };
    root.querySelector('[data-dl-info-close]')?.addEventListener('click', close);
    root.querySelector('[data-dl-info-modal]')?.addEventListener('click', e => {
      if (!e.target.closest('.info-modal')) close();
    });
  }

  _renderTmdbModalEl() {
    const root = this.shadowRoot?.getElementById('tmdb-modal-root');
    if (!root) return;
    root.innerHTML = this._tmdbInfoOpen ? this._renderTmdbModal() : '';
    if (!this._tmdbInfoOpen) return;
    const close = () => { this._tmdbInfoOpen = false; this._renderTmdbModalEl(); };
    root.querySelector('[data-tmdb-info-close]')?.addEventListener('click', close);
    root.querySelector('[data-info-modal]')?.addEventListener('click', e => {
      if (!e.target.closest('.tmdb-modal')) close();
    });
  }

  _renderCalendarModalEl() {
    const root = this.shadowRoot?.getElementById('cal-modal-root');
    if (!root) return;
    root.innerHTML = this._calendarModalOpen ? this._renderCalendarModal() : '';
    if (this._calendarModalOpen) {
      this._wireCalendarModal();
      this._wirePopup();
      // Segmented controls render in their previous state so the fill can slide
      this._calAnimType = false;
      this._calAnimView = false;
      this._syncSegVars(root);
      root.querySelectorAll('.mt-seg[data-seg-to]').forEach(seg => {
        if (seg.dataset.seg === seg.dataset.segTo) return;
        requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
      });
    }
  }

  _fixPeerChips() {
    this.shadowRoot?.querySelectorAll('.dl-r2 .dm-peer').forEach(el => {
      el.style.display = '';
      const r2 = el.closest('.dl-r2');
      if (!r2) return;
      if (el.getBoundingClientRect().right > r2.getBoundingClientRect().right + 2) {
        el.style.display = 'none';
      }
    });
  }

  // ─────────────────────────────────────────────
  // Left column
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // Mobile minimize / restore
  // ─────────────────────────────────────────────

  // Wraps rendered HTML with minimize bar — call before every innerHTML assignment.
  // Buttons are baked into HTML so they survive all re-renders.
  _mobMinWrap(side, html) {
    if (!maxWidth(BP.STACKED) || !html) return html || '';
    const isMin    = side === 'left' ? this._leftMinimized : this._rightMinimized;
    const btnBase  = 'width:18px;height:18px;border-radius:50%;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(0,0,0,0.25)';
    const minusSvg = `<svg width="10" height="2" viewBox="0 0 10 2"><rect x="0" y="0" width="10" height="2" rx="1" fill="rgba(0,0,0,0.55)"/></svg>`;
    const plusSvg  = `<svg width="10" height="10" viewBox="0 0 10 10"><line x1="5" y1="1" x2="5" y2="9" stroke="rgba(0,0,0,0.55)" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="5" x2="9" y2="5" stroke="rgba(0,0,0,0.55)" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const sectionLabel = side === 'left' ? 'Download Manager' : 'Discovery';
    if (isMin) {
      // Minimized: label centered, green restore at same absolute position as yellow
      return `<div data-min-content="${side}" style="display:none">${html}</div>
      <div style="height:20px;display:flex;align-items:center;justify-content:center">
        <span style="font-size:11px;font-weight:700;color:var(--is-text-muted);text-transform:uppercase;letter-spacing:0.07em">${sectionLabel}</span>
      </div>
      <button data-min-restore="${side}" title="Restore" style="${btnBase};background:rgba(39,201,63,0.85);position:absolute;top:12px;right:14px;z-index:5">${plusSvg}</button>`;
    }
    // Expanded: content fills normally, yellow dot absolutely in top-right corner
    return `<div data-min-content="${side}">${html}</div>
    <button data-min-btn="${side}" title="Minimize" style="${btnBase};background:rgba(255,189,46,0.85);position:absolute;top:12px;right:14px;z-index:5">${minusSvg}</button>`;
  }

  // Wires minimize/restore click events. Must be called after every innerHTML update.
  // `sides` is the column that was redrawn: a path that repaints only the right
  // one used to wire the left one's button again as well. Each button is wired
  // once however many times this runs.
  _wireMinimize(sides = ['left', 'right']) {
    if (!maxWidth(BP.STACKED)) return;
    sides.forEach(side => {
      const col = this.shadowRoot.getElementById(`col-${side}`);
      if (!col) return;
      const minBtn = col.querySelector(`[data-min-btn="${side}"]`);
      const restoreBtn = col.querySelector(`[data-min-restore="${side}"]`);
      if (minBtn?._minWired || restoreBtn?._minWired) return;
      if (minBtn) minBtn._minWired = true;
      if (restoreBtn) restoreBtn._minWired = true;
      minBtn?.addEventListener('click', e => {
        e.stopPropagation();
        if (side === 'left') this._leftMinimized = true;
        else this._rightMinimized = true;
        try { localStorage.setItem(`arr-${side}-minimized`, '1'); } catch {}
        this._render();
      });
      restoreBtn?.addEventListener('click', e => {
        e.stopPropagation();
        if (side === 'left') this._leftMinimized = false;
        else this._rightMinimized = false;
        try { localStorage.removeItem(`arr-${side}-minimized`); } catch {}
        this._render();
      });
    });
  }

  // ─────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────

  get _isMob() { return maxWidth(BP.PHONE); }
  get _isTablet() { return maxWidth(BP.STACKED); }
  // Popup-sized breakpoint: tablets run wider than _isTablet's 900px cut-off —
  // a Nest Hub Max is 1280 — so this one has to clear the widest of them.
  get _isNarrow() { return maxWidth(BP.NARROW); }

  // Selected state for a header tab pill or a segmented control, shared by every
  // category so they stay identical. The label is always white — a selected tab
  // reads as a filled chip, not as tinted text — which means day mode has to
  // carry a near-opaque fill, since white over a 50%-alpha blue on a light
  // background has almost no contrast.
  _tabFill(rgb = '0,122,255') {
    const day = this._isDay;
    return {
      bg:  `rgba(${rgb},${day ? 0.85 : 0.5})`,
      bdr: `rgba(${rgb},${day ? 0.95 : 0.8})`,
      clr: '#fff',
    };
  }

  _importEpLabel(eps) {
    if (!eps || eps.length === 0) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const bySeason = {};
    for (const ep of eps) {
      if (!bySeason[ep.s]) bySeason[ep.s] = [];
      bySeason[ep.s].push(ep.e);
    }
    const seasons = Object.keys(bySeason).map(Number).sort((a, b) => a - b);
    const parts = [];
    for (const s of seasons) {
      const nums = [...new Set(bySeason[s])].sort((a, b) => a - b);
      if (nums.length === 1) {
        parts.push(`S${pad(s)}E${pad(nums[0])}`);
      } else {
        parts.push(`S${pad(s)}E${pad(nums[0])}-E${pad(nums[nums.length - 1])}`);
      }
    }
    return parts.join(' ');
  }
  get _isDay()  { return !!(this._isDaytime && this._config?.styles?.dayNightMode !== false); }

  // ─────────────────────────────────────────────
  // Age rating (certification)
  // ─────────────────────────────────────────────

  // Whose board is asked first: the country set in Home Assistant (Settings →
  // System → General), then the two TMDB fills in for nearly every title.
  // Anything else that answers is still better than a blank.
  static get CERT_FALLBACK() { return ['US', 'GB']; }

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // An image address from another service's API, for a src attribute: a web or
  // site-relative address only, escaped. Anything else — javascript:, data:, a
  // quote meant to close the attribute — draws no picture at all.
  _imgSrc(url) {
    const u = String(url ?? '').trim();
    return /^(https?:\/\/|\/(?!\/))/i.test(u) ? this._escHtml(u) : '';
  }

  // ─────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────

  _css() { return STYLES; }

  getCardSize() {
    return 10;
  }

  // A chunk that cannot be fetched nearly always means the card was updated
  // while this page stayed open: the bundle still in memory asks for chunk names
  // the new release no longer ships. Home Assistant's own toast says what to do.
  _chunkFailed(name, err) {
    console.error(`[arr-card] loading ${name} failed:`, err);
    this.dispatchEvent(new CustomEvent('hass-notification', {
      detail: { message: this._t('chunkReload') }, bubbles: true, composed: true,
    }));
    // A window that cannot be fetched is invisible from here: the card keeps
    // working and nobody reports it. Once per window per session, the ping
    // carries which one it was, so a release that ships an install missing its
    // windows shows up within hours instead of on someone's dashboard.
    this._reportChunkFailure(name);
  }

  // Only an admin editing the dashboard ever opens the editor, so it is fetched
  // then rather than with the card. Home Assistant awaits this.
  static async getConfigElement() {
    await import('./editor.js');
    return document.createElement('arr-stack-card-editor');
  }

  static getStubConfig() {
    return {
      localisation: 'en',
      layout: 'both',
      downloads: { torrentItems: 3, usenetItems: 3 },
      discover: { categoriesCount: 3, oneClickRequest: false, oneClickDefaultMovieProfile: '', oneClickDefaultShowProfile: '', oneClickTvSeasonMode: 'first', oneClickNonAdminOnly: false },
      styles: { performanceMode: false, applicationIcons: 'real', categoryOverlays: true },
    };
  }
}

// ─────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────

function applyMixin(target, mixin) {
  for (const name of Object.getOwnPropertyNames(mixin)) {
    if (name !== 'constructor') {
      Object.defineProperty(target, name, Object.getOwnPropertyDescriptor(mixin, name));
    }
  }
}

applyMixin(ArrStackCard.prototype, uiMixin);
applyMixin(ArrStackCard.prototype, sectionsMixin);
applyMixin(ArrStackCard.prototype, itemsMixin);
applyMixin(ArrStackCard.prototype, brandMixin);
applyMixin(ArrStackCard.prototype, layoutMixin);
applyMixin(ArrStackCard.prototype, certMixin);
applyMixin(ArrStackCard.prototype, pendingMixin);
applyMixin(ArrStackCard.prototype, posterInfoMixin);
applyMixin(ArrStackCard.prototype, pingMixin);
applyMixin(ArrStackCard.prototype, interactiveSearchMixin);
applyMixin(ArrStackCard.prototype, sonarrIsMixin);
applyMixin(ArrStackCard.prototype, autoSearchMixin);
applyMixin(ArrStackCard.prototype, sessionsMixin);
applyMixin(ArrStackCard.prototype, downloadsMixin);
applyMixin(ArrStackCard.prototype, arrMixin);
applyMixin(ArrStackCard.prototype, fetchCalendarMixin);
applyMixin(ArrStackCard.prototype, fetchDiscoverMixin);
applyMixin(ArrStackCard.prototype, fetchRequestsMixin);
applyMixin(ArrStackCard.prototype, fetchSearchMixin);
applyMixin(ArrStackCard.prototype, fetchGrabMixin);
applyMixin(ArrStackCard.prototype, fetchServicesMixin);
applyMixin(ArrStackCard.prototype, fetchMusicMixin);
applyMixin(ArrStackCard.prototype, fetchMusicArtMixin);
applyMixin(ArrStackCard.prototype, fetchMixin);
applyMixin(ArrStackCard.prototype, renderLeftMixin);
applyMixin(ArrStackCard.prototype, renderRightMixin);
applyMixin(ArrStackCard.prototype, searchRenderMixin);
applyMixin(ArrStackCard.prototype, streamsRenderMixin);
applyMixin(ArrStackCard.prototype, requestOverlaysRenderMixin);
applyMixin(ArrStackCard.prototype, mediaCardsMixin);
applyMixin(ArrStackCard.prototype, posterFlagsMixin);
applyMixin(ArrStackCard.prototype, calendarCardsMixin);
applyMixin(ArrStackCard.prototype, discoverCardsMixin);
applyMixin(ArrStackCard.prototype, musicCardsMixin);
applyMixin(ArrStackCard.prototype, activityTilesMixin);
applyMixin(ArrStackCard.prototype, libraryTilesMixin);
applyMixin(ArrStackCard.prototype, musicRowsMixin);
applyMixin(ArrStackCard.prototype, themeMixin);
applyMixin(ArrStackCard.prototype, wireMixin);
applyMixin(ArrStackCard.prototype, wireRequestsMixin);
applyMixin(ArrStackCard.prototype, wireSearchMixin);
applyMixin(ArrStackCard.prototype, wireSectionsMixin);
applyMixin(ArrStackCard.prototype, wireTraktMixin);
applyMixin(ArrStackCard.prototype, popupMixin);
applyMixin(ArrStackCard.prototype, popupOpenMixin);
applyMixin(ArrStackCard.prototype, popupClickMixin);
applyMixin(ArrStackCard.prototype, popupPanelsMixin);
applyMixin(ArrStackCard.prototype, popupQuickActionsMixin);
applyMixin(ArrStackCard.prototype, popupQaStatsMixin);
applyMixin(ArrStackCard.prototype, popupQaCollectionsMixin);
applyMixin(ArrStackCard.prototype, popupQaNavigateMixin);
applyMixin(ArrStackCard.prototype, popupStreamMixin);
applyMixin(ArrStackCard.prototype, popupCalendarMixin);
applyMixin(ArrStackCard.prototype, popupArrActionsMixin);
applyMixin(ArrStackCard.prototype, popupActionsMixin);
applyMixin(ArrStackCard.prototype, popupDetailPartsMixin);
applyMixin(ArrStackCard.prototype, mtKitMixin);
applyMixin(ArrStackCard.prototype, maintainerrTilesMixin);
applyMixin(ArrStackCard.prototype, tracearrTilesMixin);
applyMixin(ArrStackCard.prototype, tautulliTilesMixin);
applyMixin(ArrStackCard.prototype, prowlarrTilesMixin);
applyMixin(ArrStackCard.prototype, jellystatTilesMixin);
applyMixin(ArrStackCard.prototype, similarFetchMixin);
applyMixin(ArrStackCard.prototype, similarRenderMixin);
applyMixin(ArrStackCard.prototype, wireSimilarMixin);

// Tracearr, Tautulli, Jellystat, Prowlarr and Maintainerr are fetched the first
// time one of their modals opens, not with the card (#36): together they are
// the larger part of the bundle, and most installs run few of them, if any.
// Their tiles and the shared UI kit stay in core (render/*-tiles.js,
// render/mt-kit.js). A method core calls into them must either live in core or
// be listed here as an entry — test/lazy-chunks.test.js holds that line.
ArrStackCard._lazy = installLazy(ArrStackCard.prototype, {
  tracearr:    { load: () => import('./chunks/tracearr.js'),    entries: ['_openTracearrModal'] },
  tautulli:    { load: () => import('./chunks/tautulli.js'),    entries: ['_openTautulliModal'] },
  jellystat:   { load: () => import('./chunks/jellystat.js'),   entries: ['_openJellystatModal'] },
  prowlarr:    { load: () => import('./chunks/prowlarr.js'),    entries: ['_openProwlarrModal'] },
  maintainerr: { load: () => import('./chunks/maintainerr.js'), entries: ['_openMaintainerrModal', '_mtOpenCollectionDetail', '_mtLoadTab'] },
  activity:    { load: () => import('./chunks/activity.js'),    entries: ['_openActivityModal', '_actLoadTab'] },
  library:     { load: () => import('./chunks/library.js'),     entries: ['_openLibModal', '_libBodyHtml', '_libFilteredItems', '_wireLibModalBody'] },
  music:       { load: () => import('./chunks/music.js'),       entries: ['_openMusicModal', '_openMusicPreview', '_openAlbumModal', '_openCalAlbumArtist', '_renderMusicModalEl', '_renderAlbumModalEl', '_musQueueSig'] },
}, applyMixin);

customElements.define('arr-stack-card', ArrStackCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'arr-stack-card',
  name: 'Arr Stack Card',
  description: 'Media server dashboard — Radarr, Sonarr, Overseerr, SABnzbd, qBittorrent',
});
