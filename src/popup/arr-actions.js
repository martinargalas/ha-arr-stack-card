// What the detail popup writes to Radarr and Sonarr: adding a title,
// removing it, and monitoring the title or a season. Split out of
// popup/index.js.

class _PopupArrActionMethods {

// Toggle movie/series monitored flag from popup title bookmark
async _togglePopupMonitor(inst) {
  const d = this._popup;
  try {
    if (inst === 'radarr' || inst === 'radarr2') {
      const arr = inst === 'radarr2' ? this._radarr2 : this._radarr;
      const id  = inst === 'radarr2' ? d?._radarr2Id : d?._radarrId;
      const movie = (arr || []).find(m => m.id === id);
      if (movie) {
        const fresh = await this._callApi('PUT', `arr_stack/${inst}/movie/${id}`, { ...movie, monitored: !movie.monitored });
        const upd = (fresh && fresh.id) ? fresh : { ...movie, monitored: !movie.monitored };
        const i = arr.findIndex(m => m.id === id);
        if (i >= 0) arr[i] = { ...arr[i], ...upd };
      }
    } else {
      const series = inst === 'sonarr2' ? d?._sonarr2Series : d?._sonarrSeries;
      if (series?.id) {
        const pool = inst === 'sonarr2' ? this._sonarr2 : this._sonarr;
        const cur  = (pool || []).find(s => s.id === series.id) || series;
        const fresh = await this._callApi('PUT', `arr_stack/${inst}/series/${series.id}`, { ...cur, monitored: !cur.monitored });
        const upd = (fresh && fresh.id) ? fresh : { ...cur, monitored: !cur.monitored };
        if (inst === 'sonarr2') {
          if (d?._sonarr2Series?.id === series.id) d._sonarr2Series = upd;
        } else if (d?._sonarrSeries?.id === series.id) {
          d._sonarrSeries = upd;
        }
        for (const p of (inst === 'sonarr2' ? [this._sonarr2] : [this._sonarr, this._sonarrAll])) {
          const i = (p || []).findIndex(s => s.id === series.id);
          if (i >= 0) p[i] = { ...p[i], ...upd };
        }
      }
    }
  } catch (e) {
    console.error('[arr-card] popup monitor toggle failed:', e);
  }
  this._popupMonBusy = null;
  this._renderPopupEl();
}

// Toggle season monitored flag via Sonarr PUT /series/{id}
async _toggleSeasonMonitor(series, seasonNumber, inst) {
  try {
    const svc = inst === 'sonarr2' ? 'sonarr2' : 'sonarr';
    const updated = {
      ...series,
      seasons: (series.seasons || []).map(s =>
        s.seasonNumber === seasonNumber ? { ...s, monitored: !s.monitored } : s),
    };
    const res = await this._callApi('PUT', `arr_stack/${svc}/series/${series.id}`, updated);
    const fresh = (res && res.id) ? res : updated;
    if (inst === 'sonarr2') {
      if (this._popup?._sonarr2Series?.id === series.id) this._popup._sonarr2Series = fresh;
      const i = (this._sonarr2 || []).findIndex(s => s.id === series.id);
      if (i >= 0) this._sonarr2[i] = fresh;
    } else {
      if (this._popup?._sonarrSeries?.id === series.id) this._popup._sonarrSeries = fresh;
      for (const pool of [this._sonarr, this._sonarrAll]) {
        const i = (pool || []).findIndex(s => s.id === series.id);
        if (i >= 0) pool[i] = fresh;
      }
    }
  } catch (e) {
    console.error('[arr-card] season monitor toggle failed:', e);
  }
  this._snMonitorBusy = null;
  this._renderPopupEl();
}

// ─────────────────────────────────────────────
// Interactive Search — panel HTML
// ─────────────────────────────────────────────

async _removeFromLibrary(deleteFiles = false, addExclusion = false) {
  const d = this._popup;
  if (!d) return;
  const df = deleteFiles ? 'true' : 'false';
  const ex = addExclusion ? 'true' : 'false';
  // Determine instance — use _removeInstance if set, else fall back to whichever id exists
  const inst = this._removeInstance
    || (d._radarrId  ? 'radarr'  : d._radarr2Id  ? 'radarr2'
      : d._sonarrSeries?.id ? 'sonarr' : 'sonarr2');
  try {
    if (inst === 'radarr2' && d._radarr2Id) {
      await this._hass.callApi('DELETE', `arr_stack/radarr2/movie/${d._radarr2Id}?deleteFiles=${df}&addExclusion=${ex}`);
      this._radarr2 = (this._radarr2 || []).filter(m => m.id !== d._radarr2Id);
      const map = new Map(); for (const m of (this._radarr2 || [])) if (m.tmdbId) map.set(String(m.tmdbId), m);
      this._radarr2ByTmdb = map;
    } else if ((inst === 'radarr' || !inst.startsWith('sonarr')) && d._radarrId) {
      await this._hass.callApi('DELETE', `arr_stack/radarr/movie/${d._radarrId}?deleteFiles=${df}&addExclusion=${ex}`);
      this._radarr = (this._radarr || []).filter(m => m.id !== d._radarrId);
    } else if (inst === 'sonarr2' && d._sonarr2Series?.id) {
      await this._hass.callApi('DELETE', `arr_stack/sonarr2/series/${d._sonarr2Series.id}?deleteFiles=${df}&addExclusion=${ex}`);
      this._sonarr2 = (this._sonarr2 || []).filter(s => s.id !== d._sonarr2Series.id);
      if (this._sonarr2All) this._sonarr2All = this._sonarr2All.filter(s => s.id !== d._sonarr2Series.id);
    } else if (d._sonarrSeries?.id) {
      await this._hass.callApi('DELETE', `arr_stack/sonarr/series/${d._sonarrSeries.id}?deleteFiles=${df}&addExclusion=${ex}`);
      this._sonarr = (this._sonarr || []).filter(s => s.id !== d._sonarrSeries.id);
      if (this._sonarrAll) this._sonarrAll = this._sonarrAll.filter(s => s.id !== d._sonarrSeries.id);
    }
  } catch (e) {
    console.error('[ArrStack] Remove failed:', e);
  }
  this._removeConfirm  = false;
  this._removeInstance = null;
  const stillInOther = (inst === 'radarr' && d._radarr2Id)
    || (inst === 'radarr2' && d._radarrId)
    || (inst === 'sonarr' && d._sonarr2Series?.id)
    || (inst === 'sonarr2' && d._sonarrSeries?.id);
  // Every other place keys these by the number TMDB and Seerr hand out, so
  // deleting a string missed every time and the poster stayed "requested":
  // the status stripe kept its colour and the plus never came back.
  const _tmdb = Number(d.tmdbId || d.id) || null;
  if (_tmdb) {
    this._optimisticRequested?.delete(_tmdb);
    this._optimisticRequested?.delete(String(_tmdb));
    this._familyPendingIds?.delete(_tmdb);
  }
  if (stillInOther) {
    if (inst === 'radarr')  d._radarrId = null;
    if (inst === 'radarr2') d._radarr2Id = null;
    if (inst === 'sonarr')  d._sonarrSeries = null;
    if (inst === 'sonarr2') d._sonarr2Series = null;
    this._renderPopupEl();
    this._reRenderRight(true);
  } else {
    // Gone from both instances. Seerr still has the request on file and goes on
    // reporting it until the next fetch lands — and a title it calls merely
    // pending is not stale enough for the card to discount on its own — so it
    // is marked taken back, the same way withdrawing a request marks it. The
    // next request for this title clears the mark again.
    if (_tmdb) this._withdrawnIds?.add(_tmdb);
    this._popup = null;
    // The overlay is taken down here rather than left to the repaint below.
    // _render() returns before it clears the popup — and before it repaints the
    // column — while a search is on screen, so deleting from a search result
    // left the detail standing over the results with its title already gone.
    this._renderPopupEl();
    // Deleting from inside the Library or a Maintainerr tab must land back in
    // that tab, not on the category list the user was two levels above. A
    // search is the same early return again: the results only repaint when
    // asked directly, or the poster keeps its stripe and withholds the plus.
    if (this._popupReturn() || this._searchActive) {
      this._reRenderRight(true);
    } else {
      this._render();
    }
  }
  this._fetchAll();
}

async _addSeriesToSonarr(instance = 'sonarr', addMonitored = false) {
  this._markActivated();
  this._snIsState = 'adding';
  this._renderPopupEl();
  const svc = instance === 'sonarr2' ? 'sonarr2' : 'sonarr';
  try {
    const d = this._popup;
    const tvdbId = d.externalIds?.tvdbId || d._tvdbId;
    if (!tvdbId) throw new Error(this._t('snNoSonarrId'));

    const lookupResults = await this._callApi('GET', `arr_stack/${svc}/lookup?tvdbId=${tvdbId}`);
    const seriesData = Array.isArray(lookupResults) ? lookupResults[0] : lookupResults;
    if (!seriesData) throw new Error(this._t('snNoSonarrId'));

    const seerr = instance === 'sonarr2' ? this._seerrSonarr2 : this._seerrSonarr;
    if (this._overseerrConfigured !== false && !seerr) await this._fetchOverseerrSonarrSettings();
    let profileId, rootFolder;
    if (seerr) {
      profileId  = seerr.profileId ?? 1;
      rootFolder = seerr.rootFolder ?? '/tv';
    } else if (instance === 'sonarr2') {
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

    if (!addMonitored && seriesData.seasons) {
      seriesData.seasons = seriesData.seasons.map(s => ({ ...s, monitored: false }));
    }
    let added;
    try {
      added = await this._callApi('POST', `arr_stack/${svc}/series`, {
        ...seriesData,
        qualityProfileId: parseInt(profileId),
        rootFolderPath: rootFolder,
        monitored: addMonitored,
        addOptions: { searchForMissingEpisodes: false, searchForCutoffUnmetEpisodes: false, monitor: addMonitored ? 'all' : 'none' },
      });
    } catch (addErr) {
      // Series may already exist — refresh and find it
      if (instance === 'sonarr2') await this._fetchSonarr2(); else await this._fetchSonarr();
      const pool = instance === 'sonarr2' ? (this._sonarr2All || []) : (this._sonarrAll || []);
      added = pool.find(s => String(s.tvdbId) === String(tvdbId));
    }

    if (instance === 'sonarr2') await this._fetchSonarr2(); else await this._fetchSonarr();
    const pool = instance === 'sonarr2' ? (this._sonarr2All || []) : (this._sonarrAll || []);
    const refreshed = pool.find(s =>
      String(s.tvdbId) === String(tvdbId) || (added?.id && s.id === added.id)
    ) || added;

    if (!refreshed) throw new Error(this._t('snNoSonarrId'));
    if (instance === 'sonarr2') this._popup._sonarr2Series = refreshed;
    else this._popup._sonarrSeries = refreshed;
    if (tvdbId) this._pendingRequestedShows.add(String(tvdbId));
    this._snIsState = null;
    if (addMonitored) {
      this._popupMonAddBusy = null;
      this._popupMonAddSearch = instance;
      this._popupMonAddInst = null;
      this._render();
      return;
    }
    this._render();
  } catch (e) {
    this._snIsState = 'error';
    this._snIsError = e.message || this._t('isLoadError');
  }
  this._renderPopupEl();
}

// Add a movie to Radarr unmonitored, without opening Interactive Search afterward — used
// by the missing-instance "+" tag next to the popup title (dual-instance monitor row).
async _addMovieToRadarr(instance = 'radarr', addMonitored = false) {
  this._markActivated();
  this._popupMonAddBusy = instance;
  this._renderPopupEl();
  const svc = instance === 'radarr2' ? 'radarr2' : 'radarr';
  try {
    const d = this._popup;
    const tmdbId = d?.tmdbId || d?.id;
    const title  = d?.title || d?.originalTitle || '';
    if (!tmdbId) throw new Error(this._t('isMissingTmdb'));
    const seerr = instance === 'radarr2' ? this._seerrRadarr2 : this._seerrRadarr;
    if (this._overseerrConfigured !== false && !seerr) await this._fetchOverseerrRadarrSettings();
    if (instance === 'radarr2') {
      if (!this._radarr2Profiles?.length)    await this._fetchRadarr2Profiles();
      if (!this._radarr2RootFolders?.length) await this._fetchRadarr2RootFolders();
    } else {
      if (!this._radarrProfiles?.length)    await this._fetchRadarrProfiles();
      if (!this._radarrRootFolders?.length) await this._fetchRadarrRootFolders();
    }
    const profiles    = instance === 'radarr2' ? this._radarr2Profiles    : this._radarrProfiles;
    const rootFolders = instance === 'radarr2' ? this._radarr2RootFolders : this._radarrRootFolders;
    const profileId  = seerr?.profileId ?? (profiles?.[0]?.id ?? 1);
    const rootFolder = seerr?.rootFolder ?? rootFolders?.[0]?.path ?? '/movies';

    let addedMovie;
    try {
      addedMovie = await this._callApi('POST', `arr_stack/${svc}/movie`, {
        tmdbId: parseInt(tmdbId),
        title,
        qualityProfileId: parseInt(profileId),
        rootFolderPath: rootFolder,
        monitored: addMonitored,
        addOptions: { searchForMovie: false, monitor: addMonitored ? 'movieOnly' : 'none' },
      });
    } catch (addErr) {
      // Movie may already exist — refresh and find it
      if (instance === 'radarr2') await this._fetchRadarr2(); else await this._fetchRadarr();
      const pool = instance === 'radarr2' ? (this._radarr2 || []) : (this._radarr || []);
      addedMovie = pool.find(m => String(m.tmdbId) === String(tmdbId));
    }

    if (instance === 'radarr2') await this._fetchRadarr2(); else await this._fetchRadarr();
    const pool = instance === 'radarr2' ? (this._radarr2 || []) : (this._radarr || []);
    const refreshed = pool.find(m =>
      String(m.tmdbId) === String(tmdbId) || (addedMovie?.id && m.id === addedMovie.id)
    ) || addedMovie;

    if (!refreshed) throw new Error(this._t('isNoRadarrId'));
    if (instance === 'radarr2') this._popup._radarr2Id = refreshed.id;
    else this._popup._radarrId = refreshed.id;
    if (tmdbId) this._pendingRequestedMovies.add(String(tmdbId));
    this._popupMonAddBusy = null;
    this._popupMonAddSearch = instance;
    this._popupMonAddInst = null;
    this._render();
    return;
  } catch (e) {
    console.error('[arr-card] add movie to instance failed:', e);
  }
  this._popupMonAddBusy = null;
  this._popupMonAddInst = null;
  this._render();
}

}

export const popupArrActionsMixin = _PopupArrActionMethods.prototype;
