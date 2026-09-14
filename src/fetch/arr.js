// Fetching for Radarr and Sonarr themselves: libraries, queues, the lists
// each instance hands out, Bazarr, deleting files.
class _ArrMethods {

async _fetchRadarr() {
  try {
    const data = await this._callApi('GET', 'arr_stack/radarr/movies');
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
    const data = await this._callApi('GET', 'arr_stack/sonarr/series');
    const sonarrFiltered = data.filter(s => s.added && s.added !== '0001-01-01T00:00:00Z');
    this._sonarrAll = Array.isArray(data) ? data : [];
    this._sonarrTotal = sonarrFiltered.length;
    this._sonarr = sonarrFiltered
      .sort((a, b) => new Date(b.added) - new Date(a.added));
    await this._fetchSonarrRecentImports();
  } catch (e) {
    console.error('[arr-card] Sonarr fetch error:', e);
  }
}

_is503(e) {
  // HA callApi throws { status, body } or Error with message
  return e?.status === 503
    || Number(e?.statusCode) === 503
    || (typeof e?.message === 'string' && e.message.includes('503'));
}

async _fetchRadarr2() {
  if (this._radarr2Configured === false) return; // confirmed not configured — skip
  try {
    const data = await this._callApi('GET', 'arr_stack/radarr2/movies');
    if (data && data._notConfigured) { this._radarr2Configured = false; return; }
    // Tagged at the source the way Sonarr's second instance already is, so every
    // consumer — queue lookups, badges, the popup's instance ids — can tell which
    // Radarr an entry came from without searching both lists.
    const tagged = (Array.isArray(data) ? data : []).map(m => ({ ...m, _isRadarr2: true }));
    const filtered = tagged.filter(m => m.added && m.added !== '0001-01-01T00:00:00Z');
    this._radarr2 = filtered.sort((a, b) => new Date(b.added) - new Date(a.added));
    this._radarr2Total = filtered.length;
    this._radarr2Configured = true;
    // Build tmdbId lookup map
    const map = new Map();
    for (const m of filtered) if (m.tmdbId) map.set(String(m.tmdbId), m);
    this._radarr2ByTmdb = map;
  } catch (e) {
    // First probe failed (null) → stop probing; already confirmed error (true→error) → keep retrying
    if (this._radarr2Configured === null) this._radarr2Configured = false;
  }
}

async _fetchSonarr2() {
  if (this._sonarr2Configured === false) return; // confirmed not configured — skip
  try {
    const data = await this._callApi('GET', 'arr_stack/sonarr2/series');
    if (data && data._notConfigured) { this._sonarr2Configured = false; return; }
    // Tagged here so every consumer — poster, calendar, language lookup — can
    // tell which instance a series belongs to without re-searching both lists.
    const tagged = (Array.isArray(data) ? data : []).map(s => ({ ...s, _isSonarr2: true }));
    this._sonarr2All = tagged;
    const filtered = tagged.filter(s => s.added && s.added !== '0001-01-01T00:00:00Z');
    this._sonarr2 = filtered.sort((a, b) => new Date(b.added) - new Date(a.added));
    this._sonarr2Total = filtered.length;
    this._sonarr2Configured = true;
    // Build tvdbId lookup map
    const map = new Map();
    for (const s of filtered) if (s.tvdbId) map.set(String(s.tvdbId), s);
    this._sonarr2ByTvdb = map;
    await this._fetchSonarr2RecentImports();
  } catch (e) {
    // First probe failed (null) → stop probing; already confirmed error (true→error) → keep retrying
    if (this._sonarr2Configured === null) this._sonarr2Configured = false;
  }
}

// Which series got episodes lately, and which ones: the newest import date per
// series and the episodes imported, for the "new" badges.
async _fetchRecentImports(svc) {
  try {
    const data = await this._callApi('GET', `arr_stack/${svc}/recentimports`);
    const records = (data.records || []).filter(r => r.eventType === 'downloadFolderImported');
    const dateMap = {};
    const epMap   = {};
    for (const r of records) {
      if (!(r.seriesId in dateMap)) dateMap[r.seriesId] = r.date;
      const sn = r.episode?.seasonNumber;
      const en = r.episode?.episodeNumber;
      if (sn != null && en != null) {
        if (!epMap[r.seriesId]) epMap[r.seriesId] = [];
        epMap[r.seriesId].push({ s: sn, e: en });
      }
    }
    this[`_${svc}ImportDates`] = dateMap;
    this[`_${svc}ImportEps`]   = epMap;
  } catch (e) {
    if (svc === 'sonarr') console.error('[arr-card] Sonarr recent imports fetch error:', e);
    this[`_${svc}ImportDates`] = {};
    this[`_${svc}ImportEps`]   = {};
  }
}

_fetchSonarrRecentImports()  { return this._fetchRecentImports('sonarr'); }
_fetchSonarr2RecentImports() { return this._fetchRecentImports('sonarr2'); }

async _fetchSonarrEpisodeFiles() {
  try {
    const allSeries = (this._sonarr || []).filter(s => (s.statistics?.episodeFileCount ?? 0) > 0);
    const importDates = this._sonarrImportDates || {};
    const withImports = allSeries
      .filter(s => s.id in importDates)
      .sort((a, b) => importDates[b.id].localeCompare(importDates[a.id]))
      .slice(0, 20);
    const withoutImports = allSeries
      .filter(s => !(s.id in importDates))
      .slice(0, Math.max(0, 20 - withImports.length));
    const recent = [...withImports, ...withoutImports];
    if (!recent.length) return;
    const results = await Promise.allSettled(
      recent.map(s => this._callApi('GET', `arr_stack/sonarr/episodefiles?seriesId=${s.id}`))
    );
    const epFiles = {};
    for (let i = 0; i < recent.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        const epNum = f => {
          const m = (f.relativePath || '').match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
          return m ? parseInt(m[1]) * 10000 + parseInt(m[2]) : 0;
        };
        const sorted = r.value.sort((a, b) => epNum(b) - epNum(a));
        epFiles[recent[i].id] = sorted[0];
      }
    }
    this._sonarrEpFiles = epFiles;
  } catch (e) {
    console.error('[arr-card] Sonarr episode files fetch error:', e);
  }
}

_pickReleaseDate(m) {
  return m.digitalRelease || m.inCinemasDate || m.physicalRelease || null;
}

// The lists an instance hands out once — profiles, tags, root folders, disks.
// Kept after the first answer; a second instance known to be missing is not
// asked at all. Profiles are the ones worth a console line when they fail:
// without them nothing can be added.
async _fetchArrList(svc, kind, field, { loud = false } = {}) {
  if (svc.endsWith('2') && this[`_${svc}Configured`] === false) return;
  if (this[field]?.length > 0) return;
  try {
    const data = await this._callApi('GET', `arr_stack/${svc}/${kind}`);
    if (Array.isArray(data)) this[field] = data;
  } catch (e) {
    if (loud) console.error(`[arr-card] ${svc} ${kind} fetch error:`, e);
  }
}

_fetchRadarrProfiles() { return this._fetchArrList('radarr', 'profiles', '_radarrProfiles', { loud: true }); }
_fetchRadarrTags() { return this._fetchArrList('radarr', 'tags', '_radarrTags'); }
_fetchRadarrRootFolders() { return this._fetchArrList('radarr', 'rootfolders', '_radarrRootFolders'); }
_fetchRadarrDiskspace() { return this._fetchArrList('radarr', 'diskspace', '_radarrDiskspace'); }
_fetchRadarr2Profiles() { return this._fetchArrList('radarr2', 'profiles', '_radarr2Profiles'); }
_fetchRadarr2Tags() { return this._fetchArrList('radarr2', 'tags', '_radarr2Tags'); }
_fetchRadarr2RootFolders() { return this._fetchArrList('radarr2', 'rootfolders', '_radarr2RootFolders'); }
_fetchRadarr2Diskspace() { return this._fetchArrList('radarr2', 'diskspace', '_radarr2Diskspace'); }
_fetchSonarrProfiles() { return this._fetchArrList('sonarr', 'profiles', '_sonarrProfiles', { loud: true }); }
_fetchSonarrTags() { return this._fetchArrList('sonarr', 'tags', '_sonarrTags'); }
_fetchSonarrRootFolders() { return this._fetchArrList('sonarr', 'rootfolders', '_sonarrRootFolders'); }
_fetchSonarrDiskspace() { return this._fetchArrList('sonarr', 'diskspace', '_sonarrDiskspace'); }
_fetchSonarr2Profiles() { return this._fetchArrList('sonarr2', 'profiles', '_sonarr2Profiles'); }
_fetchSonarr2RootFolders() { return this._fetchArrList('sonarr2', 'rootfolders', '_sonarr2RootFolders'); }
_fetchSonarr2Diskspace() { return this._fetchArrList('sonarr2', 'diskspace', '_sonarr2Diskspace'); }

// ──────────────────────────────────────────────────────────────────────────

async _fetchBazarr() {
  try {
    const data = await this._callApi('GET', 'arr_stack/bazarr/movies');
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
    const status = e?.status_code ?? e?.status ?? e?.response?.status;
    const body   = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
    this._bazarrConfigured = !(status === 503 || body.includes('not configured'));
    console.error('[arr-card] Bazarr fetch error:', e);
  }
}

async _fetchBazarrEpisodes() {
  if (!this._bazarrConfigured) return;
  try {
    const seriesIds = Object.keys(this._sonarrEpFiles || {});
    if (!seriesIds.length) return;
    const results = await Promise.allSettled(
      seriesIds.map(sid => this._callApi('GET', `arr_stack/bazarr/episodes?seriesId=${sid}`))
    );
    const map = {};
    for (let i = 0; i < seriesIds.length; i++) {
      const r = results[i];
      if (r.status !== 'fulfilled') continue;
      for (const ep of (r.value?.data || [])) {
        map[ep.sonarrEpisodeFileId] = {
          subtitles: ep.subtitles || [],
          missing:   ep.missing_subtitles || [],
        };
      }
    }
    this._bazarrEpisodes = map;
  } catch (e) {
    console.error('[arr-card] Bazarr episodes fetch error:', e);
  }
}

// A Radarr queue as the posters need it: failed and active movie ids, progress
// per movie, rows for the Activity card, and downloadId → movieId.
async _fetchRadarrQueueOf(svc) {
  if (svc === 'radarr2' && this._radarr2Configured === false) return;
  try {
    const data    = await this._callApi('GET', `arr_stack/${svc}/queue?includeUnknownMovieItems=true`);
    const records = Array.isArray(data) ? data : (data.records || []);
    const failed  = new Set();
    const active  = new Set();
    const pct     = new Map(); // movieId → 0-100
    const dlIds   = new Map(); // downloadId → movieId
    const items   = [];       // enriched rows for Activity card
    for (const item of records) {
      const bad   = item.trackedDownloadStatus === 'warning' ||
                    item.trackedDownloadStatus === 'error'   ||
                    item.trackedDownloadState  === 'importFailed' ||
                    item.status === 'failed';
      const sz    = item.size || 0;
      const sl    = item.sizeleft || 0;
      const done  = item.trackedDownloadState === 'importPending' || item.trackedDownloadState === 'importBlocked' || item.status === 'completed';
      const p     = sz > 0 ? Math.round(((sz - sl) / sz) * 100) : (done ? 100 : 0);
      items.push({ title: item.movie?.title || item.title || '—', svc, failed: bad, pct: p });
      // downloadId is the torrent hash / SAB nzo_id — an exact key back to the
      // download client, so a queue row can open the right title without
      // guessing from the release name.
      if (item.downloadId && item.movieId) dlIds.set(String(item.downloadId).toLowerCase(), item.movieId);
      if (!item.movieId) continue;
      if (bad) { failed.add(item.movieId); continue; }
      active.add(item.movieId);
      pct.set(item.movieId, p);
    }
    this[`_${svc}QueueFailed`] = failed;
    this[`_${svc}QueueActive`] = active;
    this[`_${svc}QueuePct`]    = pct;
    this[`_${svc}QueueItems`]  = items;
    this[svc === 'radarr' ? '_dlMediaRadarr' : '_dlMediaRadarr2'] = dlIds;
  } catch (e) {
    // The second instance may simply not be there
    if (svc === 'radarr') console.error('[arr-card] Radarr queue fetch error:', e);
  }
}

_fetchRadarrQueue()  { return this._fetchRadarrQueueOf('radarr'); }
_fetchRadarr2Queue() { return this._fetchRadarrQueueOf('radarr2'); }

// Once a download is imported the arr queue forgets it, but the torrent usually
// keeps seeding in the client. Recent history still ties downloadId to the media,
// so those rows stay clickable instead of going dead the moment the import runs.
async _fetchDlHistory() {
  const jobs = [
    ['radarr',  '_dlHistRadarr',  'movieId',  this._radarr2Configured],
    ['radarr2', '_dlHistRadarr2', 'movieId',  this._radarr2Configured],
    ['sonarr',  '_dlHistSonarr',  'seriesId', this._sonarr2Configured],
    ['sonarr2', '_dlHistSonarr2', 'seriesId', this._sonarr2Configured],
  ];
  await Promise.all(jobs.map(async ([svc, key, idField, secondCfg]) => {
    if ((svc === 'radarr2' || svc === 'sonarr2') && secondCfg === false) return;
    try {
      const data = await this._callApi(
        'GET',
        `arr_stack/${svc}/activity/history?page=1&pageSize=100&sortKey=date&sortDir=desc`,
      );
      const recs = Array.isArray(data) ? data : (data?.records || []);
      const map  = new Map();
      for (const h of recs) {
        const arrId = h?.[idField];
        if (h?.downloadId && arrId != null) {
          map.set(String(h.downloadId).toLowerCase(), arrId);
        }
      }
      this[key] = map;
    } catch (_) { /* history is a nicety — a failure just means fewer clickable rows */ }
  }));
}

async _fetchSonarrQueue(instance = 'sonarr') {
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  const seasonsKey    = instance === 'sonarr2' ? '_sonarr2QueueSeasons'    : '_sonarrQueueSeasons';
  const episodesKey   = instance === 'sonarr2' ? '_sonarr2QueueEpisodes'   : '_sonarrQueueEpisodes';
  const epPctKey      = instance === 'sonarr2' ? '_sonarr2QueueEpPct'      : '_sonarrQueueEpPct';
  const seasonPctKey  = instance === 'sonarr2' ? '_sonarr2QueueSeasonPct'  : '_sonarrQueueSeasonPct';
  const seriesPctKey  = instance === 'sonarr2' ? '_sonarr2QueueSeriesPct'  : '_sonarrQueueSeriesPct';
  const firstEpKey    = instance === 'sonarr2' ? '_sonarr2QueueFirstEp'    : '_sonarrQueueFirstEp';
  try {
    const data    = await this._callApi('GET', `arr_stack/${svc}/queue`);
    const records = Array.isArray(data) ? data : (data.records || []);
    const seasons    = new Set();
    const episodes   = new Set();
    const epPct      = new Map();   // episodeId → pct 0-100
    const seasonData = new Map();   // "seriesId:seasonN" → { size, sizeleft }
    const seriesData = new Map();   // seriesId → { size, sizeleft }
    const firstEpMap = new Map();   // seriesId → { season, episode, count }
    const dlIds      = new Map();   // downloadId → seriesId
    for (const item of records) {
      const sz  = item.size     || 0;
      const sl  = item.sizeleft || 0;
      const pct = sz > 0 ? Math.round(((sz - sl) / sz) * 100) : 0;
      // Exact key back to the download client — see the Radarr queue above.
      if (item.downloadId && item.seriesId != null) {
        dlIds.set(String(item.downloadId).toLowerCase(), item.seriesId);
      }
      if (item.seriesId != null && item.seasonNumber != null) {
        const sk = `${item.seriesId}:${item.seasonNumber}`;
        seasons.add(sk);
        const prev = seasonData.get(sk) || { size: 0, sizeleft: 0 };
        seasonData.set(sk, { size: prev.size + sz, sizeleft: prev.sizeleft + sl });
        const sprev = seriesData.get(item.seriesId) || { size: 0, sizeleft: 0 };
        seriesData.set(item.seriesId, { size: sprev.size + sz, sizeleft: sprev.sizeleft + sl });
        const epNum = item.episode?.episodeNumber ?? item.episodeNumber;
        if (epNum != null) {
          if (!firstEpMap.has(item.seriesId)) {
            firstEpMap.set(item.seriesId, { season: item.seasonNumber, episode: epNum, count: 0 });
          }
          firstEpMap.get(item.seriesId).count++;
        }
      }
      if (item.episodeId != null) {
        episodes.add(item.episodeId);
        epPct.set(item.episodeId, pct);
      }
    }
    const seasonPct = new Map();
    for (const [sk, { size, sizeleft }] of seasonData)
      seasonPct.set(sk, size > 0 ? Math.round(((size - sizeleft) / size) * 100) : 0);
    const seriesPct = new Map();
    for (const [sid, { size, sizeleft }] of seriesData)
      seriesPct.set(sid, size > 0 ? Math.round(((size - sizeleft) / size) * 100) : 0);
    this[seasonsKey]   = seasons;
    this[episodesKey]  = episodes;
    this[epPctKey]     = epPct;
    this[seasonPctKey] = seasonPct;
    this[seriesPctKey] = seriesPct;
    this[firstEpKey]   = firstEpMap;
    this[instance === 'sonarr2' ? '_dlMediaSonarr2' : '_dlMediaSonarr'] = dlIds;
  } catch (e) { /* silent */ }
}

async _deleteEpisodeFile(episodeFileId, seasonNumber, instance = 'sonarr') {
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  this._epFileDeleting = episodeFileId;
  this._renderPopupEl();
  try {
    await this._callApi('DELETE', `arr_stack/${svc}/episodefile/${episodeFileId}`);
    this._snEpisodes.delete(seasonNumber);
    const series = instance === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
    if (series) {
      const s = (series.seasons || []).find(s => s.seasonNumber === seasonNumber);
      if (s?.statistics) s.statistics.episodeFileCount = Math.max(0, (s.statistics.episodeFileCount || 0) - 1);
    }
    const sid = series?.id;
    if (sid) this._fetchSonarrEpisodes(sid, seasonNumber, instance);
  } catch (e) {
    console.error('[arr-card] Episode file delete error:', e);
  }
  this._epFileDeleting = null;
  this._renderPopupEl();
}

async _deleteSeasonFiles(seasonNumber, instance = 'sonarr') {
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  const series = instance === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
  const sid = series?.id;
  if (!sid) return;
  this._seasonFileDeleting = seasonNumber;
  this._renderPopupEl();
  try {
    const data = await this._callApi('GET', `arr_stack/${svc}/episodefiles?seriesId=${sid}`);
    const files = (Array.isArray(data) ? data : []).filter(f => {
      const eps = this._snEpisodes.get(seasonNumber);
      if (eps) return eps.some(ep => ep.episodeFileId === f.id);
      return f.seasonNumber === seasonNumber;
    });
    if (files.length > 0) {
      const ids = files.map(f => f.id);
      await this._callApi('DELETE', `arr_stack/${svc}/episodefile-bulk`, { episodeFileIds: ids });
    }
    this._snEpisodes.delete(seasonNumber);
    const s = (series.seasons || []).find(s => s.seasonNumber === seasonNumber);
    if (s?.statistics) s.statistics.episodeFileCount = 0;
    this._fetchSonarrEpisodes(sid, seasonNumber, instance);
  } catch (e) {
    console.error('[arr-card] Season files delete error:', e);
  }
  this._seasonFileDeleting = null;
  this._renderPopupEl();
}

}

export const arrMixin = _ArrMethods.prototype;
