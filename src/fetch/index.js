class _FetchMethods {
async _fetchAll() {
  await Promise.allSettled([
    this._fetchRadarr(),
    this._fetchSonarr(),
    this._fetchCalendar(),
    this._fetchOverseerr(),
    this._fetchTvUpcoming(),
    this._fetchTrending(),
    this._fetchPopular(),
    this._fetchSab(),
    this._fetchSabHistory(),
    this._fetchQbit(),
    this._fetchBazarr(),
    this._fetchRadarrQueue(),
    this._fetchPendingRequests(),
    this._fetchMyPendingRequests(),
  ]);
  this._render();
}

async _fetchDownloadsAndRender() {
  await Promise.allSettled([
    this._fetchQbit(),
    this._fetchSab(),
    this._fetchSabHistory(),
  ]);
  const left = this.shadowRoot.getElementById('col-left');
  if (!left) return;
  const newHtml = this._renderLeft();
  if (left.innerHTML !== newHtml) {
    left.innerHTML = newHtml;
    this._wireSort();
    this._wireActionButtons();
    this._wirePageButtons();
  }
}

async _fetchRadarr() {
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/radarr/movies');
    const radarrFiltered = data.filter(m => m.added && m.added !== '0001-01-01T00:00:00Z');
    this._radarrTotal = radarrFiltered.length;
    this._radarr = radarrFiltered
      .sort((a, b) => new Date(b.added) - new Date(a.added));
  } catch (e) {
    console.error('[arr-card] Radarr fetch error:', e);
  }
}

async _fetchSonarr() {
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/sonarr/series');
    const sonarrFiltered = data.filter(s => s.added && s.added !== '0001-01-01T00:00:00Z');
    this._sonarrTotal = sonarrFiltered.length;
    this._sonarr = sonarrFiltered
      .sort((a, b) => new Date(b.added) - new Date(a.added));
  } catch (e) {
    console.error('[arr-card] Sonarr fetch error:', e);
  }
}

async _fetchCalendar() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
    const data = await this._hass.callApi('GET', `arr_stack/sonarr/calendar?start=${today}&end=${end}`);
    // Deduplicate by seriesId, take earliest episode per series
    const seen = new Map();
    for (const ep of data) {
      const sid = ep.seriesId;
      if (!seen.has(sid) || new Date(ep.airDate) < new Date(seen.get(sid).airDate)) {
        seen.set(sid, ep);
      }
    }
    this._calendar = Array.from(seen.values())
      .sort((a, b) => new Date(a.airDate) - new Date(b.airDate))
      .slice(0, 32);
  } catch (e) {
    console.error('[arr-card] Sonarr calendar fetch error:', e);
  }
}

async _fetchOverseerr() {
  try {
    const [d1, d2] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/overseerr/upcoming?page=1'),
      this._hass.callApi('GET', 'arr_stack/overseerr/upcoming?page=2'),
    ]);
    this._upcoming = [...(d1.results || []), ...(d2.results || [])];
    this._upcomingError = null;
  } catch (e) {
    this._upcomingError = e.message;
    console.error('[arr-card] Overseerr fetch error:', e);
  }
}

async _fetchTrending() {
  try {
    const [d1, d2] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/overseerr/trending?page=1'),
      this._hass.callApi('GET', 'arr_stack/overseerr/trending?page=2').catch(() => ({ results: [] })),
    ]);
    this._trending = [...(d1.results || []), ...(d2.results || [])];
    this._overlayApiTotalPages.trending = d1.totalPages || 1;
    this._overlayApiPage.trending = 2;
    // Pokud je overlay otevřený pro trending a aktuální stránka by byla mimo rozsah, reset na 0
    if (this._overlay?.section === 'trending') {
      const isMobile = window.matchMedia('(max-width: 480px)').matches;
      const rows     = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
      const perPage  = isMobile ? rows * 2 : rows * 4;
      const maxPage  = Math.max(0, Math.ceil(this._trending.length / perPage) - 1);
      if (this._overlay.page > maxPage) this._overlay.page = 0;
    }
  } catch (e) {
    console.error('[arr-card] Overseerr trending fetch error:', e);
  }
}

// Proaktivně načte další API stránky na pozadí, pokud overlay nemá dost dat
async _proactiveSectionLoad(section) {
  const cfg = this._getSectionOverlayConfig(section);
  if (!cfg?.apiEndpoint) return;
  const isMobile = window.matchMedia('(max-width: 480px)').matches;
  const rows     = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
  const perPage  = isMobile ? rows * 2 : rows * 4;
  // Načítáme, dokud nemáme aspoň 2 plné stránky overlaye nebo dojdou API stránky
  while (
    this._overlay?.section === section &&
    (this[cfg.dataKey] || []).length < perPage * 2 &&
    (this._overlayApiPage[section] || 0) < (this._overlayApiTotalPages[section] || 1)
  ) {
    try {
      const nextApiPage = (this._overlayApiPage[section] || 0) + 1;
      const data = await this._hass.callApi('GET', `arr_stack/${cfg.apiEndpoint}?page=${nextApiPage}`);
      this[cfg.dataKey] = [...(this[cfg.dataKey] || []), ...(data.results || [])];
      this._overlayApiTotalPages[section] = data.totalPages || this._overlayApiTotalPages[section] || 1;
      this._overlayApiPage[section] = nextApiPage;
      this._reRenderSection(section);
    } catch (err) {
      console.error(`[arr-card] ${section} proactive load error:`, err);
      break;
    }
  }
}

async _fetchPopular() {
  try {
    const [d1, d2] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/overseerr/popular?page=1'),
      this._hass.callApi('GET', 'arr_stack/overseerr/popular?page=2'),
    ]);
    this._popular = [...(d1.results || []), ...(d2.results || [])];
    this._overlayApiTotalPages.popular = d1.totalPages || 1;
    this._overlayApiPage.popular = 2;
  } catch (e) {
    console.error('[arr-card] Overseerr popular fetch error:', e);
  }
}

async _fetchTvUpcoming() {
  try {
    const [d1, d2] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/overseerr/tv_upcoming?page=1'),
      this._hass.callApi('GET', 'arr_stack/overseerr/tv_upcoming?page=2'),
    ]);
    this._tvUpcoming = [...(d1.results || []), ...(d2.results || [])];
    this._overlayApiTotalPages.tvUpcoming = d1.totalPages || 1;
    this._overlayApiPage.tvUpcoming = 2;
  } catch (e) {
    console.error('[arr-card] Overseerr TV upcoming fetch error:', e);
  }
}

async _fetchOverseerrSonarrSettings() {
  try {
    const servers = await this._hass.callApi('GET', 'arr_stack/overseerr/sonarr_settings');
    if (!Array.isArray(servers) || servers.length === 0) return;
    const server = servers.find(s => s.isDefault) || servers[0];
    this._seerrSonarr = {
      serverId:   server.id,
      profileId:  server.activeProfileId,
      rootFolder: server.activeDirectory,
    };
  } catch (e) {
    console.error('[arr-card] Overseerr Sonarr settings fetch error:', e);
  }
}

async _fetchSonarrProfiles() {
  if (this._sonarrProfiles.length > 0) return;
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/sonarr/profiles');
    if (Array.isArray(data)) this._sonarrProfiles = data;
  } catch (e) {
    console.error('[arr-card] Sonarr profiles fetch error:', e);
  }
}

async _openTvRequestOverlay(m, source = 'tvUpcoming') {
  // Nastav loading stav a hned re-renderuj overlay
  // source = 'tvUpcoming' | 'trending' — určuje, ve které sekci se overlay zobrazí
  this._tvRequestPending = { show: m, seasons: null, selected: null, profileId: null, mediaId: m.id, loading: true, source };
  this._reRenderRight();

  // Parallelní fetch: detail seriálu (sezóny + TVDB ID) + Sonarr profily + Sonarr settings
  await Promise.allSettled([
    (async () => {
      const detail = await this._hass.callApi('GET', `arr_stack/overseerr/tv/${m.id}`);
      const seasons = (detail.seasons || [])
        .filter(s => s.seasonNumber > 0)
        .map(s => s.seasonNumber)
        .sort((a, b) => a - b);
      if (this._tvRequestPending) {
        this._tvRequestPending.seasons = seasons;
        this._tvRequestPending.selected = new Set(seasons);
        // mediaId zůstává m.id (TMDB ID) — Overseerr /request endpoint očekává TMDB ID
      }
    })(),
    this._fetchSonarrProfiles(),
    (async () => {
      if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
    })(),
  ]);

  if (this._tvRequestPending) {
    this._tvRequestPending.profileId = this._seerrSonarr?.profileId ?? null;
    this._tvRequestPending.loading = false;
    this._reRenderRight();
    this._wireTvOverlay();
  }
}

async _addOverseerrTvRequest(mediaId, seasons, profileId) {
  // Optimistický update — showId je Overseerr ID seriálu (ne tvdbId)
  const showId = this._tvRequestPending?.show?.id;
  if (showId) {
    this._optimisticRequested.add(showId);
    this._withdrawnIds.delete(showId);
  }
  this._tvRequestPending = null;
  this._reRenderRight();
  try {
    if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
    const body = { mediaType: 'tv', mediaId, seasons };
    if (this._seerrSonarr) {
      body.serverId   = this._seerrSonarr.serverId;
      body.profileId  = profileId !== null ? parseInt(profileId) : this._seerrSonarr.profileId;
      body.rootFolder = this._seerrSonarr.rootFolder;
    }
    if (!this._hass.user.is_admin) body.userMode = 'family';
    const resp = await this._hass.callApi('POST', 'arr_stack/overseerr/request', body);
    // Ihned uložit requestId pro ✕ tlačítko a přežití page refresh
    // Overseerr může vrátit objekt nebo pole (pro TV série)
    const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
    if (reqId && !this._hass.user.is_admin) {
      this._familyPendingIds.set(Number(mediaId), reqId);
      this._savePendingToStorage();
      this._reRenderRight();
    }
    this._fetchTvUpcoming().then(() => this._reRenderRight());
    // Sonarr přidá seriál ihned po requestu
    setTimeout(() => this._fetchSonarr().then(() => this._reRenderRight()), 2000);
  } catch (e) {
    if (showId) this._optimisticRequested.delete(showId);
    this._reRenderRight();
    console.error('[arr-card] Overseerr TV request error:', e);
  }
}

async _fetchBazarr() {
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/bazarr/movies');
    const map = {};
    for (const movie of (data.data || [])) {
      map[movie.radarrId] = {
        subtitles: movie.subtitles || [],
        missing:   movie.missing_subtitles || []
      };
    }
    this._bazarr = map;
    this._bazarrConfigured = true;
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    this._bazarrConfigured = status !== 503;
    console.error('[arr-card] Bazarr fetch error:', e);
  }
}

async _fetchRadarrQueue() {
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/radarr/queue');
    const records = data.records || data;
    const failed = new Set();
    const active = new Set();
    for (const item of (Array.isArray(records) ? records : [])) {
      if (!item.movieId) continue;
      const bad = item.trackedDownloadStatus === 'warning' ||
                  item.trackedDownloadStatus === 'error'   ||
                  item.trackedDownloadState  === 'importFailed' ||
                  item.status === 'failed';
      if (bad) {
        failed.add(item.movieId);
      } else {
        active.add(item.movieId);
      }
    }
    this._radarrQueueFailed = failed;
    this._radarrQueueActive = active;
  } catch (e) {
    console.error('[arr-card] Radarr queue fetch error:', e);
  }
}

async _fetchSab() {
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/sabnzbd/queue');
    this._sab = data.queue || {};
    this._sabConfigured = true;
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    this._sabConfigured = status !== 503;
    console.error('[arr-card] SABnzbd fetch error:', e);
  }
}

async _fetchSabHistory() {
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/sabnzbd/history');
    const slots = data?.history?.slots || [];
    this._sabFailed = slots.filter(s => s.status === 'Failed');
  } catch (e) {
    console.error('[arr-card] SABnzbd history fetch error:', e);
  }
}

async _sabHistoryDelete(nzoId) {
  this._sabDeleteBusy = nzoId;
  this._reRenderLeft();
  try {
    await this._hass.callApi('POST', 'arr_stack/sabnzbd/action', { mode: 'history', name: 'delete', nzo_id: nzoId });
  } catch (e) {
    console.error('[arr-card] SABnzbd history delete error:', e);
  } finally {
    await this._fetchSabHistory();
    this._sabDeleteBusy = null;
    this._reRenderLeft();
  }
}

async _sabRetry(nzoId) {
  this._sabRetryBusy = nzoId;
  this._reRenderLeft();
  try {
    await this._hass.callApi('POST', 'arr_stack/sabnzbd/action', { mode: 'retry', nzo_id: nzoId });
  } catch (e) {
    console.error('[arr-card] SABnzbd retry error:', e);
  } finally {
    await new Promise(r => setTimeout(r, 1000));
    await Promise.all([this._fetchSab(), this._fetchSabHistory()]);
    this._sabRetryBusy = null;
    this._reRenderLeft();
  }
}

async _fetchQbit() {
  try {
    const [torrents, transfer] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/qbit/torrents'),
      this._hass.callApi('GET', 'arr_stack/qbit/transfer'),
    ]);
    this._qbit = torrents;
    this._qbitTransfer = transfer;
    this._qbitConfigured = true;
  } catch (e) {
    // 503 = not configured, anything else = connection error
    const status = e?.status ?? e?.response?.status;
    this._qbitConfigured = status !== 503;
    console.error('[arr-card] qBittorrent fetch error:', e);
  }
}

async _fetchOverseerrRadarrSettings() {
  try {
    const servers = await this._hass.callApi('GET', 'arr_stack/overseerr/radarr_settings');
    if (!Array.isArray(servers) || servers.length === 0) return;
    const server = servers.find(s => s.isDefault) || servers[0];
    this._seerrRadarr = {
      serverId:   server.id,
      profileId:  server.activeProfileId,
      rootFolder: server.activeDirectory,
    };
  } catch (e) {
    console.error('[arr-card] Overseerr Radarr settings fetch error:', e);
  }
}

async _fetchRadarrProfiles() {
  if (this._radarrProfiles.length > 0) return; // cache hit
  try {
    const data = await this._hass.callApi('GET', 'arr_stack/radarr/profiles');
    if (Array.isArray(data)) this._radarrProfiles = data;
  } catch (e) {
    console.error('[arr-card] Radarr profiles fetch error:', e);
  }
}

// ─────────────────────────────────────────────
// Sonarr Interactive Search
// ─────────────────────────────────────────────

async _fetchSonarrEpisodes(seriesId, seasonNumber) {
  try {
    const data = await this._hass.callApi('GET', `arr_stack/sonarr/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
    const eps = (Array.isArray(data) ? data : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
    this._snEpisodes.set(seasonNumber, eps);
  } catch (e) {
    console.error('[arr-card] Sonarr episodes fetch error:', e);
    this._snEpisodes.set(seasonNumber, []);
  }
  this._renderPopupEl();
}

async _fetchSonarrSeasonIS(seriesId, seasonNumber) {
  this._snIsState   = 'loading';
  this._snIsResults = [];
  this._snIsError   = null;
  this._snIsGrabbing = null;
  this._snIsGrabbed  = new Set();
  this._snIsHistory  = {};
  this._renderPopupEl();
  try {
    // Sonarr /api/v3/release vyžaduje episodeId — použijeme první epizodu sezóny
    // (vrátí i season packy pro tu sezónu)
    let eps = this._snEpisodes.get(seasonNumber);
    if (!eps || eps.length === 0) {
      const epData = await this._hass.callApi('GET', `arr_stack/sonarr/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
      eps = (Array.isArray(epData) ? epData : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
      if (eps.length > 0) this._snEpisodes.set(seasonNumber, eps);
    }
    const firstEp = eps[0];
    if (!firstEp) throw new Error(this._t('snNoEpisodes'));

    const [data, histRaw] = await Promise.all([
      this._hass.callApi('GET', `arr_stack/sonarr/release?episodeId=${firstEp.id}`),
      this._hass.callApi('GET', `arr_stack/sonarr/history?seriesId=${seriesId}`).catch(() => null),
    ]);
    this._snIsHistory = this._buildSnHistoryMap(histRaw);
    this._snIsResults = this._sortIsResults(Array.isArray(data) ? data : []);
    this._snIsState   = 'results';
  } catch (e) {
    this._snIsState = 'error';
    this._snIsError = e.message || this._t('isLoadError');
  }
  this._renderPopupEl();
}

async _fetchSonarrEpIS(episodeId, seriesId) {
  this._snIsState   = 'loading';
  this._snIsResults = [];
  this._snIsError   = null;
  this._snIsGrabbing = null;
  this._snIsGrabbed  = new Set();
  this._snIsHistory  = {};
  this._renderPopupEl();
  try {
    const [data, histRaw] = await Promise.all([
      this._hass.callApi('GET', `arr_stack/sonarr/release?episodeId=${episodeId}`),
      this._hass.callApi('GET', `arr_stack/sonarr/history?seriesId=${seriesId}`).catch(() => null),
    ]);
    this._snIsHistory = this._buildSnHistoryMap(histRaw);
    this._snIsResults = this._sortIsResults(Array.isArray(data) ? data : []);
    this._snIsState   = 'results';
  } catch (e) {
    this._snIsState = 'error';
    this._snIsError = e.message || this._t('isLoadError');
  }
  this._renderPopupEl();
}

_buildSnHistoryMap(histRaw) {
  const records = Array.isArray(histRaw) ? histRaw : (histRaw?.records ?? []);
  const dlIdOutcome = {};
  records.forEach(h => {
    if (!h.downloadId || h.downloadId in dlIdOutcome) return;
    if (h.eventType === 'downloadFailed') dlIdOutcome[h.downloadId] = 'failed';
    else if (h.eventType === 'downloadFolderImported' || h.eventType === 'episodeFileImported') dlIdOutcome[h.downloadId] = 'imported';
  });
  const histMap = {};
  records.forEach(h => {
    if (h.eventType !== 'grabbed') return;
    const guid = h.data?.guid;
    if (!guid || guid in histMap) return;
    histMap[guid] = dlIdOutcome[h.downloadId] ?? 'grabbed';
  });
  return histMap;
}

_sortIsResults(data) {
  return data.sort((a, b) => {
    if (a.approved !== b.approved) return a.approved ? -1 : 1;
    return (b.customFormatScore ?? 0) - (a.customFormatScore ?? 0);
  });
}

async _sonarrGrab(guid, indexerId) {
  this._snIsGrabbing = guid;
  this._renderPopupEl();
  try {
    const release = this._snIsResults.find(r => r.guid === guid) || { guid, indexerId };
    await this._hass.callApi('POST', 'arr_stack/sonarr/release', release);
    this._snIsGrabbed.add(guid);
  } catch (e) {
    console.error('[arr-card] Sonarr grab error:', e);
    const prev = this._snIsError;
    this._snIsError = this._t('isGrabError') + ': ' + (e.message || '');
    this._renderPopupEl();
    setTimeout(() => { this._snIsError = prev; this._renderPopupEl(); }, 3000);
  } finally {
    this._snIsGrabbing = null;
    this._renderPopupEl();
  }
}

async _addOverseerrRequest(mediaId, profileId = null) {
  // Optimistický update — okamžitě zavřít overlay a zobrazit badge
  this._optimisticRequested.add(mediaId);
  this._withdrawnIds.delete(mediaId);
  this._requestPending = null;
  this._reRenderRight();
  try {
    if (!this._seerrRadarr) await this._fetchOverseerrRadarrSettings();
    const body = { mediaId, mediaType: 'movie' };
    if (this._seerrRadarr) {
      body.serverId   = this._seerrRadarr.serverId;
      body.profileId  = profileId !== null ? parseInt(profileId) : this._seerrRadarr.profileId;
      body.rootFolder = this._seerrRadarr.rootFolder;
    }
    if (!this._hass.user.is_admin) body.userMode = 'family';
    const resp = await this._hass.callApi('POST', 'arr_stack/overseerr/request', body);
    // Ihned uložit requestId pro ✕ tlačítko a přežití page refresh
    const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
    if (reqId && !this._hass.user.is_admin) {
      this._familyPendingIds.set(Number(mediaId), reqId);
      this._savePendingToStorage();
      this._reRenderRight();
    }
    // Background sync — odstraní optimistický stav jakmile přijdou reálná data
    this._fetchOverseerr().then(() => this._reRenderRight());
    // Radarr přidá film ihned po requestu — krátký delay aby ho Radarr zpracoval
    setTimeout(() => this._fetchRadarr().then(() => this._reRenderRight()), 2000);
  } catch (e) {
    // Rollback optimistického stavu
    this._optimisticRequested.delete(mediaId);
    this._reRenderRight();
    console.error('[arr-card] Overseerr add request error:', e);
  }
}

}

export const fetchMixin = _FetchMethods.prototype;
