// Fetching for Sonarr's Interactive Search and the automatic searches for both. Split out of fetch/arr.js.

class _FetchGrabMethods {

async _fetchSonarrEpisodes(seriesId, seasonNumber, instance = 'sonarr') {
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  try {
    const data = await this._callApi('GET', `arr_stack/${svc}/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
    const eps = (Array.isArray(data) ? data : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
    this._snEpisodes.set(seasonNumber, eps);
  } catch (e) {
    console.error('[arr-card] Sonarr episodes fetch error:', e);
    this._snEpisodes.set(seasonNumber, []);
  }
  this._renderPopupEl();
}

async _fetchSonarrSeasonIS(seriesId, seasonNumber, instance = 'sonarr') {
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  this._snIsState   = 'loading';
  this._snIsResults = [];
  this._snIsError   = null;
  this._snIsGrabbing = null;
  this._snIsHistory  = {};
  this._renderPopupEl();
  try {
    // Sonarr /api/v3/release vyžaduje episodeId — použijeme první epizodu sezóny
    // (vrátí i season packy pro tu sezónu)
    let eps = this._snEpisodes.get(seasonNumber);
    if (!eps || eps.length === 0) {
      const epData = await this._callApi('GET', `arr_stack/${svc}/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
      eps = (Array.isArray(epData) ? epData : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
      if (eps.length > 0) this._snEpisodes.set(seasonNumber, eps);
    }
    const firstEp = eps[0];
    if (!firstEp) throw new Error(this._t('snNoEpisodes'));

    const [data, histRaw] = await Promise.all([
      this._callApi('GET', `arr_stack/${svc}/release?episodeId=${firstEp.id}`),
      this._callApi('GET', `arr_stack/${svc}/history?seriesId=${seriesId}`).catch(() => null),
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

async _fetchSonarrEpIS(episodeId, seriesId, instance = 'sonarr') {
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  this._snIsState   = 'loading';
  this._snIsResults = [];
  this._snIsError   = null;
  this._snIsGrabbing = null;
  this._snIsHistory  = {};
  this._renderPopupEl();
  try {
    const [data, histRaw] = await Promise.all([
      this._callApi('GET', `arr_stack/${svc}/release?episodeId=${episodeId}`),
      this._callApi('GET', `arr_stack/${svc}/history?seriesId=${seriesId}`).catch(() => null),
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
    const snSvc = this._snIsInstance === 'sonarr2' ? 'sonarr2' : 'sonarr';
    await this._callApi('POST', `arr_stack/${snSvc}/release`, release);
    this._snIsGrabbed.add(guid);
    const snGrabId = snSvc === 'sonarr2' ? this._popup?._sonarr2Series?.id : this._popup?._sonarrSeries?.id;
    this._ppGrabWait = { inst: snSvc, id: snGrabId, until: Date.now() + 180000 };
    this._ppGrabPollStart();
    this._dlTriggeredBy = 'is';
    // Set series + season monitored after grab
    const seriesId = release.seriesId;
    const seasonNumber = release.seasonNumber;
    const snCache = this._snIsInstance === 'sonarr2' ? (this._sonarr2 || []) : (this._sonarr || []);
    const series = snCache.find(s => s.id === seriesId);
    if (series && seriesId) {
      const updated = {
        ...series,
        monitored: true,
        seasons: (series.seasons || []).map(s =>
          s.seasonNumber === seasonNumber ? { ...s, monitored: true } : s
        ),
      };
      this._callApi('PUT', `arr_stack/${snSvc}/series/${seriesId}`, updated).catch(() => {});
      if (this._snIsInstance === 'sonarr2') this._sonarr2 = snCache.map(s => s.id === seriesId ? updated : s);
      else this._sonarr = snCache.map(s => s.id === seriesId ? updated : s);
    }
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

  // ─────────────────────────────────────────────
  // Auto Search — Radarr
  // ─────────────────────────────────────────────

  async _triggerRadarrAutoSearch(instance = 'radarr') {
    this._markActivated();
    const svc     = instance === 'radarr2' ? 'radarr2' : 'radarr';
    const d       = this._popup;
    const movieId = instance === 'radarr2' ? d._radarr2Id : d._radarrId;

    const _asDelay = ms => new Promise(r => setTimeout(r, ms));
    this._dlTriggeredBy = 'as';
    if (movieId) {
      // Movie already in Radarr — fire command directly
      this._asMovieSearching = true;
      this._renderPopupEl();
      try {
        await Promise.all([
          this._callApi('POST', `arr_stack/${svc}/command`, { name: 'MoviesSearch', movieIds: [movieId] }),
          _asDelay(1000),
        ]);
        this._asMovieSearched = true;
        this._asState = 'done';
        this._asPollForDownload(`movie:${instance}`, svc, movieId);
      } catch (e) {
        this._asState = 'error';
        this._asError = e.message || this._t('isLoadError');
        this._asOpen = false; this._asState = null;
      }
      this._asMovieSearching = false;
      this._renderPopupEl();
    } else {
      // Movie not in Radarr — add as monitored with searchForMovie:true
      this._asState = 'adding';
      this._renderPopupEl();
      try {
        const tmdbId = d.id || d.tmdbId;
        if (!tmdbId) throw new Error(this._t('isMissingTmdb'));
        const seerr = instance === 'radarr2' ? this._seerrRadarr2 : this._seerrRadarr;
        if (instance === 'radarr2') {
          if (!this._radarr2Profiles?.length)    await this._fetchRadarr2Profiles();
          if (!this._radarr2RootFolders?.length) await this._fetchRadarr2RootFolders();
        } else {
          if (!this._radarrProfiles?.length)    await this._fetchRadarrProfiles();
          if (!this._radarrRootFolders?.length) await this._fetchRadarrRootFolders();
        }
        const profiles    = instance === 'radarr2' ? this._radarr2Profiles    : this._radarrProfiles;
        const rootFolders = instance === 'radarr2' ? this._radarr2RootFolders : this._radarrRootFolders;
        const pId = seerr?.profileId ? parseInt(seerr.profileId) : (profiles?.[0]?.id ?? 1);
        const rf  = seerr?.rootFolder || rootFolders?.[0]?.path || '/movies';
        const body = { tmdbId: parseInt(tmdbId), title: d.title || d.name || '', qualityProfileId: pId, rootFolderPath: rf, monitored: true, addOptions: { searchForMovie: true } };
        const [added] = await Promise.all([
          this._callApi('POST', `arr_stack/${svc}/movie`, body),
          _asDelay(1000),
        ]);
        if (added?.id) {
          if (instance === 'radarr2') d._radarr2Id = added.id;
          else d._radarrId = added.id;
        }
        if (instance === 'radarr2') await this._fetchRadarr2(); else await this._fetchRadarr();
        this._asMovieSearched = true;
        this._asState = 'done';
        const newMovieId = instance === 'radarr2' ? d._radarr2Id : d._radarrId;
        if (newMovieId) this._asPollForDownload(`movie:${instance}`, svc, newMovieId);
      } catch (e) {
        this._asState = 'error';
        this._asError = e.message || this._t('isLoadError');
        this._asOpen = false; this._asState = null;
      }
      this._renderPopupEl();
    }
  }

  // ─────────────────────────────────────────────
  // Auto Search — Sonarr (add series + seasons)
  // ─────────────────────────────────────────────

  async _addSeriesForAs(instance = 'sonarr') {
    this._markActivated();
    const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
    this._dlTriggeredBy = 'as';
    this._asState = 'adding';
    this._renderPopupEl();
    try {
      const d = this._popup;
      const tvdbId = d.externalIds?.tvdbId || d._tvdbId;
      if (!tvdbId) throw new Error(this._t('snNoSonarrId'));
      const lookupResults = await this._callApi('GET', `arr_stack/${svc}/lookup?tvdbId=${tvdbId}`);
      const seriesData = Array.isArray(lookupResults) ? lookupResults[0] : lookupResults;
      if (!seriesData) throw new Error(this._t('snNoSonarrId'));
      if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const seerr = instance === 'sonarr2' ? this._seerrSonarr2 : this._seerrSonarr;
      let profileId, rootFolder;
      if (seerr) {
        profileId  = seerr.profileId ?? 1;
        rootFolder = seerr.rootFolder ?? '/tv';
      } else {
        if (instance === 'sonarr2') {
          if (!this._sonarr2Profiles?.length)    await this._fetchSonarr2Profiles();
          if (!this._sonarr2RootFolders?.length) await this._fetchSonarr2RootFolders();
          profileId  = this._sonarr2Profiles?.[0]?.id ?? 1;
          rootFolder = this._sonarr2RootFolders?.[0]?.path ?? '/tv';
        } else {
          await this._fetchSonarrProfiles();
          await this._fetchSonarrRootFolders();
          profileId  = this._sonarrProfiles?.[0]?.id ?? 1;
          rootFolder = this._sonarrRootFolders?.[0]?.path ?? '/tv';
        }
      }
      let added;
      try {
        added = await this._callApi('POST', `arr_stack/${svc}/series`, {
          ...seriesData,
          qualityProfileId: parseInt(profileId),
          rootFolderPath: rootFolder,
          monitored: false,
          addOptions: { searchForMissingEpisodes: false, searchForCutoffUnmetEpisodes: false, monitor: 'none' },
        });
      } catch (_) { /* May already exist */ }
      if (instance === 'sonarr2') {
        await this._fetchSonarr2();
        const found = (this._sonarr2 || []).find(s =>
          String(s.tvdbId) === String(tvdbId) || (added?.id && s.id === added.id)
        ) || added;
        if (found) d._sonarr2Series = found;
      } else {
        await this._fetchSonarr();
        const found = (this._sonarrAll || []).find(s =>
          String(s.tvdbId) === String(tvdbId) || (added?.id && s.id === added.id)
        ) || added;
        if (found) d._sonarrSeries = found;
      }
      if (tvdbId) this._pendingRequestedShows.add(String(tvdbId));
      this._render();
      this._asState = 'seasons';
    } catch (e) {
      this._asState = 'error';
      this._asError = e.message || this._t('isLoadError');
    }
    this._renderPopupEl();
  }

  async _triggerSonarrSeasonSearch(seasonNumber, instance = 'sonarr') {
    const svc    = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
    const d      = this._popup;
    const series = instance === 'sonarr2' ? d._sonarr2Series : d._sonarrSeries;
    if (!series?.id) return;
    const seriesId = series.id;
    const key = `season:${seasonNumber}`;
    this._dlTriggeredBy = 'as';
    this._asSearchingItems.add(key);
    this._renderPopupEl();
    try {
      // Mark series + specific season as monitored
      const cache   = instance === 'sonarr2' ? (this._sonarr2 || []) : (this._sonarr || []);
      const full    = cache.find(s => s.id === seriesId) || series;
      const updated = {
        ...full,
        monitored: true,
        seasons: (full.seasons || []).map(s =>
          s.seasonNumber === seasonNumber ? { ...s, monitored: true } : s
        ),
      };
      await this._callApi('PUT', `arr_stack/${svc}/series/${seriesId}`, updated);
      if (instance === 'sonarr2') {
        this._sonarr2 = (this._sonarr2 || []).map(s => s.id === seriesId ? updated : s);
        d._sonarr2Series = updated;
      } else {
        this._sonarr = (this._sonarr || []).map(s => s.id === seriesId ? updated : s);
        d._sonarrSeries = updated;
      }
      this._render(); // recentlyRequested refresh — series is now monitored
      // Fire search (min 1s spinner)
      await Promise.all([
        this._callApi('POST', `arr_stack/${svc}/command`, { name: 'SeasonSearch', seriesId, seasonNumber }),
        new Promise(r => setTimeout(r, 1000)),
      ]);
      this._asSearchedItems.add(key);
      this._asPollForDownload(key, svc, seriesId);
    } catch (e) {
      console.error('[arr-card] Season search error:', e);
    }
    this._asSearchingItems.delete(key);
    this._renderPopupEl();
  }

  async _triggerSonarrEpisodeSearch(episodeId, seasonNumber, instance = 'sonarr') {
    const svc    = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
    const d      = this._popup;
    const series = instance === 'sonarr2' ? d._sonarr2Series : d._sonarrSeries;
    const key = `ep:${episodeId}`;
    this._asSearchingItems.add(key);
    this._renderPopupEl();
    try {
      await Promise.all([
        this._callApi('POST', `arr_stack/${svc}/command`, { name: 'EpisodeSearch', episodeIds: [episodeId] }),
        new Promise(r => setTimeout(r, 1000)),
      ]);
      this._asSearchedItems.add(key);
      if (series?.id) this._asPollForDownload(key, svc, series.id);
    } catch (e) {
      console.error('[arr-card] Episode search error:', e);
    }
    this._asSearchingItems.delete(key);
    this._renderPopupEl();
  }

  // ─────────────────────────────────────────────
  // Auto Search — poll queue after search fired
  // key: 'movie' | 'season:N' | 'ep:ID'
  // movieOrSeriesId: Radarr movieId or Sonarr seriesId
  // ─────────────────────────────────────────────
  async _asPollForDownload(key, svc, movieOrSeriesId) {
    const isRadarr = svc === 'radarr' || svc === 'radarr2';
    const endpoint = `arr_stack/${svc}/queue`;
    this._asPolling.add(key);
    this._renderPopupEl();
    const delays = [1000, 2000, 2000, 2000];
    for (let i = 0; i < delays.length; i++) {
      await new Promise(r => setTimeout(r, delays[i]));
      if (!this._asOpen) { this._asPolling.delete(key); return; } // popup closed — stop polling
      try {
        const data    = await this._callApi('GET', endpoint);
        const records = Array.isArray(data) ? data : (data.records || []);
        const found   = records.some(item => {
          if (isRadarr) return item.movieId === movieOrSeriesId;
          return item.seriesId === movieOrSeriesId;
        });
        if (found) {
          this._asPolling.delete(key);
          this._asDownloadingItems.add(key);
          if (isRadarr) { this._asOpen = false; this._asState = null; }
          this._renderPopupEl();
          return;
        }
      } catch (_) { /* ignore */ }
    }
    this._asPolling.delete(key);
    // Poll exhausted — nothing found; show pill for 5s then close AS
    if (this._asOpen) {
      this._asNotFound.add(key);
      this._renderPopupEl();
      setTimeout(() => {
        this._asNotFound.delete(key);
        if (isRadarr) { this._asOpen = false; this._asState = null; }
        this._renderPopupEl();
      }, 5000);
    }
  }

}

export const fetchGrabMixin = _FetchGrabMethods.prototype;
