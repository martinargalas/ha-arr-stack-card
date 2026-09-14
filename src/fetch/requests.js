// Fetching for Requests: through Seerr or straight to Radarr and Sonarr. Split out of fetch/arr.js.

class _FetchRequestsMethods {

async _fetchOverseerrSonarrSettings() {
  try {
    const servers = await this._callApi('GET', 'arr_stack/overseerr/sonarr_settings');
    if (!Array.isArray(servers) || servers.length === 0) return;
    const primary = servers.find(s => s.isDefault) || servers[0];
    this._seerrSonarr = {
      serverId:   primary.id,
      profileId:  primary.activeProfileId,
      rootFolder: primary.activeDirectory,
      name:       primary.name || '',
    };
    const secondary = servers.find(s => s.id !== primary.id);
    if (secondary) {
      this._seerrSonarr2 = {
        serverId:   secondary.id,
        profileId:  secondary.activeProfileId,
        rootFolder: secondary.activeDirectory,
        name:       secondary.name || '',
      };
    }
  } catch (e) {
    console.error('[arr-card] Overseerr Sonarr settings fetch error:', e);
  }
}

async _oneClickTvRequest(show) {
  this._markActivated();
  try {
    if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();

    // Resolve profil podle jména z konfigurace
    const profileName = this._cfgGet('discover', 'oneClickDefaultShowProfile', '');
    let profileId = this._seerrSonarr?.profileId ?? null;
    if (profileName) {
      await this._fetchSonarrProfiles();
      const match = this._sonarrProfiles.find(p => p.name === profileName);
      if (match) profileId = match.id;
    }

    // Tag z config
    const tagName = this._cfgGet('discover', 'oneClickDefaultShowTag', '');
    let tagId = null;
    if (tagName && this._sonarrTags.length > 0) {
      const tagMatch = this._sonarrTags.find(t => t.label === tagName);
      if (tagMatch) tagId = tagMatch.id;
    }
    // Root folder z config
    const cfgRootFolder = this._cfgGet('discover', 'oneClickDefaultShowRootFolder', '') || null;

    const tvSeasonMode = this._cfgGet('discover', 'oneClickTvSeasonMode', 'first');
    let seasons = [];
    if (this._overseerrConfigured !== false) {
      const detail = await this._callApi('GET', `arr_stack/overseerr/tv/${show.id}`);
      const allS = (detail.seasons || []).filter(s => s.seasonNumber > 0).sort((a,b) => a.seasonNumber - b.seasonNumber);
      if (tvSeasonMode === 'all') {
        seasons = allS.map(s => s.seasonNumber);
      } else if (tvSeasonMode === 'latest') {
        seasons = allS.length ? [allS[allS.length - 1].seasonNumber] : [];
      } else {
        const s1 = allS.find(s => s.seasonNumber === 1);
        seasons = s1 ? [1] : allS.length ? [allS[0].seasonNumber] : [];
      }
    } else {
      const tvdbId = show.externalIds?.tvdbId || show.tvdbId;
      if (tvdbId) {
        const lookup = await this._callApi('GET', `arr_stack/sonarr/lookup?tvdbId=${tvdbId}`);
        const s = Array.isArray(lookup) ? lookup[0] : lookup;
        const allS = (s?.seasons || []).filter(x => x.seasonNumber > 0).sort((a,b) => a.seasonNumber - b.seasonNumber);
        if (tvSeasonMode === 'all') {
          seasons = allS.map(x => x.seasonNumber);
        } else if (tvSeasonMode === 'latest') {
          seasons = allS.length ? [allS[allS.length - 1].seasonNumber] : [];
        } else {
          seasons = allS.length ? [allS[0].seasonNumber] : [];
        }
      }
    }
    if (seasons.length === 0) return;

    // Optimistický update
    this._optimisticRequested.add(show.id);
    this._withdrawnIds.delete(show.id);
    this._reRenderRight();

    if (this._overseerrConfigured === false) {
      await this._addDirectTvRequest(show, seasons, profileId, tagId, cfgRootFolder);
      return;
    }

    const body = { mediaType: 'tv', mediaId: show.id, seasons };
    if (this._seerrSonarr) {
      body.serverId   = this._seerrSonarr.serverId;
      body.profileId  = profileId;
      body.rootFolder = cfgRootFolder || this._seerrSonarr.rootFolder;
    }
    { const _acct = this._seerrAccountForUser(); if (_acct !== 'admin') body.userMode = _acct; }
    if (tagId !== null) body.tags = [parseInt(tagId)];
    const resp = await this._callApi('POST', 'arr_stack/overseerr/request', body);
    const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
    if (reqId && !this._hass.user.is_admin) {
      this._familyPendingIds.set(Number(show.id), reqId);
      this._savePendingToStorage();
    }
    this._reRenderRight();
  } catch (e) {
    console.error('[arr-card] oneClick TV request error:', e);
    this._optimisticRequested.delete(show.id);
    this._reRenderRight();
  }
}

async _openTvRequestOverlay(m, source = 'tvUpcoming') {
  this._tvRequestPending = { show: m, seasons: null, selected: null, profileId: null, mediaId: m.id, loading: true, source };
  this._reRenderRight();

  // Parallelní fetch: detail seriálu (sezóny + TVDB ID) + Sonarr profily + Sonarr settings
  await Promise.allSettled([
    (async () => {
      let seasons = [];
      if (this._overseerrConfigured !== false) {
        try {
          const detail = await this._callApi('GET', `arr_stack/overseerr/tv/${m.id}`);
          seasons = (detail.seasons || [])
            .filter(s => s.seasonNumber > 0)
            .map(s => s.seasonNumber)
            .sort((a, b) => a - b);
        } catch (_) { /* fallthrough to Sonarr lookup */ }
      }
      // Fallback: Sonarr lookup (needs tvdbId)
      if (!seasons.length) {
        let tvdbId = m.externalIds?.tvdbId || m.tvdbId;
        // When no Overseerr, fetch tvdbId from TMDB
        if (!tvdbId && this._overseerrConfigured === false) {
          try {
            const ext = await this._callApi('GET', `arr_stack/tmdb/tv/${m.id}`);
            tvdbId = ext?.externalIds?.tvdbId;
          } catch (_) {}
        }
        if (tvdbId) {
          try {
            const lookup = await this._callApi('GET', `arr_stack/sonarr/lookup?tvdbId=${tvdbId}`);
            const s = Array.isArray(lookup) ? lookup[0] : lookup;
            seasons = (s?.seasons || [])
              .filter(s => s.seasonNumber > 0)
              .map(s => s.seasonNumber)
              .sort((a, b) => a - b);
          } catch (_) {}
        }
      }
      if (this._tvRequestPending) {
        this._tvRequestPending.seasons  = seasons;
        this._tvRequestPending.selected = new Set(seasons);
      }
    })(),
    this._fetchSonarrProfiles(),
    this._fetchSonarrRootFolders(),
    (async () => {
      if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
    })(),
    (async () => {
      if (this._sonarr2Configured !== false) {
        await Promise.all([
          this._sonarr2Profiles?.length   ? null : this._fetchSonarr2Profiles(),
          this._sonarr2RootFolders?.length ? null : this._fetchSonarr2RootFolders(),
        ].filter(Boolean));
      }
    })(),
  ]);

  if (this._tvRequestPending) {
    this._tvRequestPending.profileId = this._seerrSonarr?.profileId ?? null;
    this._tvRequestPending.loading = false;
    this._reRenderRight();
    this._wireTvOverlay();
  }
}

async _addOverseerrTvRequest(mediaId, seasons, profileId, tagId = null, rootFolder = null, use2 = false) {
  this._markActivated();
  // Optimistický update — showId je Overseerr ID seriálu (ne tvdbId)
  const showId = this._tvRequestPending?.show?.id;
  if (showId) {
    this._optimisticRequested.add(showId);
    this._withdrawnIds.delete(showId);
  }
  this._tvRequestPending = null;
  this._reRenderRight(true);
  if (this._popup) this._renderPopupEl();
  try {
    const seerrCfg = use2 ? this._seerrSonarr2 : this._seerrSonarr;
    if (!seerrCfg) await this._fetchOverseerrSonarrSettings();
    const activeCfg = use2 ? this._seerrSonarr2 : this._seerrSonarr;
    const body = { mediaType: 'tv', mediaId, seasons };
    if (activeCfg) {
      body.serverId   = activeCfg.serverId;
      body.profileId  = profileId !== null ? parseInt(profileId) : activeCfg.profileId;
      body.rootFolder = rootFolder || activeCfg.rootFolder;
    }
    if (tagId !== null) body.tags = [parseInt(tagId)];
    { const _acct = this._seerrAccountForUser(); if (_acct !== 'admin') body.userMode = _acct; }
    const resp = await this._callApi('POST', 'arr_stack/overseerr/request', body);
    const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
    if (reqId && !this._hass.user.is_admin) {
      this._familyPendingIds.set(Number(mediaId), reqId);
      this._savePendingToStorage();
      this._reRenderRight(true);
    }
    this._fetchTvUpcoming().then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); });
    setTimeout(() => this._fetchSonarr().then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); }), 2000);
  } catch (e) {
    if (showId) this._optimisticRequested.delete(showId);
    this._reRenderRight(true);
    console.error('[arr-card] Overseerr TV request error:', e);
  }
}

// ─── Direct add (bez Overseerr) ────────────────────────────────────────────

async _addDirectMovieRequest(tmdbId, profileId, tagId, rootFolder, instance = 'radarr') {
  this._markActivated();
  const svc         = instance === 'radarr2' ? 'radarr2' : 'radarr';
  const profiles    = instance === 'radarr2' ? this._radarr2Profiles    : this._radarrProfiles;
  const rootFolders = instance === 'radarr2' ? this._radarr2RootFolders : this._radarrRootFolders;
  // Optimistický update
  this._optimisticRequested.add(tmdbId);
  this._withdrawnIds?.delete(tmdbId);
  this._requestPending = null;
  this._reRenderRight(true);
  if (this._popup) this._renderPopupEl();
  try {
    const rf  = rootFolder || rootFolders?.[0]?.path || '/movies';
    const pId = profileId  ? parseInt(profileId)   : (profiles?.[0]?.id ?? 1);
    const pd = this._popup;
    const body = { tmdbId: parseInt(tmdbId), title: pd?.title || pd?.name || '', qualityProfileId: pId, rootFolderPath: rf, monitored: true, addOptions: { searchForMovie: true } };
    if (tagId) body.tags = [parseInt(tagId)];
    await this._callApi('POST', `arr_stack/${svc}/movie`, body);
    setTimeout(() => {
      (svc === 'radarr2' ? this._fetchRadarr2() : this._fetchRadarr()).then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); });
    }, 2000);
  } catch (e) {
    this._optimisticRequested.delete(tmdbId);
    this._reRenderRight(true);
    console.error('[arr-card] Direct Radarr add error:', e);
  }
}

async _addDirectTvRequest(show, seasons, profileId, tagId, rootFolder, inst = 'sonarr') {
  this._markActivated();
  const showId = show?.id;
  const tvdbId = show?.externalIds?.tvdbId || show?.tvdbId;
  if (!tvdbId) return;
  const use2 = inst === 'sonarr2';
  // Optimistický update
  if (showId) { this._optimisticRequested.add(showId); this._withdrawnIds?.delete(showId); }
  this._tvRequestPending = null;
  this._reRenderRight(true);
  if (this._popup) this._renderPopupEl();
  try {
    if (use2) {
      await this._fetchSonarr2Profiles();
      await this._fetchSonarr2RootFolders();
    } else {
      await this._fetchSonarrProfiles();
      await this._fetchSonarrRootFolders();
    }
    const svcPath = use2 ? 'sonarr2' : 'sonarr';
    const lookupResults = await this._callApi('GET', `arr_stack/${svcPath}/lookup?tvdbId=${tvdbId}`);
    const seriesData    = Array.isArray(lookupResults) ? lookupResults[0] : lookupResults;
    if (!seriesData) throw new Error('Series not found');
    const profiles    = use2 ? this._sonarr2Profiles    : this._sonarrProfiles;
    const rootFolders = use2 ? this._sonarr2RootFolders : this._sonarrRootFolders;
    const rf  = rootFolder || rootFolders?.[0]?.path || '/tv';
    const pId = profileId  ? parseInt(profileId) : (profiles?.[0]?.id ?? 1);
    const seasonObjs = (seriesData.seasons || []).map(s => ({ ...s, monitored: seasons.includes(s.seasonNumber) }));
    try {
      await this._callApi('POST', `arr_stack/${svcPath}/series`, {
        ...seriesData, seasons: seasonObjs,
        qualityProfileId: pId, rootFolderPath: rf,
        monitored: true, addOptions: { searchForMissingEpisodes: true, searchForCutoffUnmetEpisodes: false },
        ...(tagId ? { tags: [parseInt(tagId)] } : {}),
      });
    } catch (_) { /* Series may already exist */ }
    setTimeout(() => this._fetchSonarr().then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); }), 2000);
  } catch (e) {
    if (showId) this._optimisticRequested.delete(showId);
    this._reRenderRight(true);
    console.error('[arr-card] Direct Sonarr add error:', e);
  }
}


async _fetchOverseerrRadarrSettings() {
  try {
    const servers = await this._callApi('GET', 'arr_stack/overseerr/radarr_settings');
    if (!Array.isArray(servers) || servers.length === 0) {
      this._overseerrConfigured = false;
      return;
    }
    this._overseerrConfigured = true;
    // Primary: prefer default non-4K server; fallback to any non-4K; last resort first server
    const primary = servers.find(s => s.isDefault && !s.is4k)
                 || servers.find(s => !s.is4k)
                 || servers[0];
    this._seerrRadarr = {
      serverId:   primary.id,
      profileId:  primary.activeProfileId,
      rootFolder: primary.activeDirectory,
      name:       primary.name || '',
    };
    // Secondary: prefer explicit 4K server; fallback to any other server (e.g. second non-4K instance)
    const secondary = servers.find(s => s.id !== primary.id && s.is4k)
                   || servers.find(s => s.id !== primary.id);
    if (secondary) {
      this._seerrRadarr2 = {
        serverId:   secondary.id,
        profileId:  secondary.activeProfileId,
        rootFolder: secondary.activeDirectory,
        is4k:       !!secondary.is4k,
        name:       secondary.name || '',
      };
    }
  } catch (e) {
    this._overseerrConfigured = false;
    // Expected when Overseerr is not configured — not an error
  }
}

async _addOverseerrRequest(mediaId, profileId = null, tagId = null, rootFolder = null, use4k = false) {
  this._markActivated();
  // Optimistický update — okamžitě zavřít overlay a zobrazit badge
  this._optimisticRequested.add(mediaId);
  this._withdrawnIds.delete(mediaId);
  this._requestPending = null;
  this._reRenderRight(true);
  if (this._popup) this._renderPopupEl();
  try {
    if (!this._seerrRadarr) await this._fetchOverseerrRadarrSettings();
    const seerr = use4k && this._seerrRadarr2 ? this._seerrRadarr2 : this._seerrRadarr;
    const body = { mediaId, mediaType: 'movie' };
    if (seerr) {
      body.serverId   = seerr.serverId;
      body.profileId  = profileId !== null ? parseInt(profileId) : seerr.profileId;
      body.rootFolder = rootFolder || seerr.rootFolder;
    }
    if (tagId !== null) body.tags = [parseInt(tagId)];
    { const _acct = this._seerrAccountForUser(); if (_acct !== 'admin') body.userMode = _acct; }
    const resp = await this._callApi('POST', 'arr_stack/overseerr/request', body);
    const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
    if (reqId && !this._hass.user.is_admin) {
      this._familyPendingIds.set(Number(mediaId), reqId);
      this._savePendingToStorage();
      this._reRenderRight(true);
    }
    this._fetchOverseerr().then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); });
    setTimeout(() => this._fetchRadarr().then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); }), 2000);
    if (use4k) setTimeout(() => this._fetchRadarr2().then(() => { this._reRenderRight(true); if (this._popup) this._renderPopupEl(); }), 2000);
  } catch (e) {
    this._optimisticRequested.delete(mediaId);
    this._reRenderRight(true);
    console.error('[arr-card] Overseerr add request error:', e);
  }
}

// Recently Requested reads Seerr's own request list when Seerr is configured —
// the section is named after requests, and the Radarr/Sonarr wanted list it used
// to be built from answers a different question. `null` means "no Seerr data",
// which is what makes the getter fall back to the library.
async _fetchSeerrRequests() {
  if (this._overseerrConfigured === false) { this._seerrRequests = null; return; }
  try {
    this._seerrRequestsErr = false;
    const acct = this._seerrAccountForUser();
    // Admins read through the API key and see every user's requests. A family or
    // guest account goes through its own session, so it sees only its own.
    const url = acct === 'admin'
      ? 'arr_stack/overseerr/requests?take=30'
      : `arr_stack/overseerr/my_pending?userMode=${acct}&enrich=1&take=30`;
    const data = await this._callApi('GET', url);
    this._seerrRequests = Array.isArray(data?.results) ? data.results : null;
  } catch (e) {
    console.error('[arr-card] Seerr requests fetch error:', e);
    // Falling back to the library beats an empty section when Seerr is unreachable.
    this._seerrRequests = null;
    this._seerrRequestsErr = true;
  }
}

}

export const fetchRequestsMixin = _FetchRequestsMethods.prototype;
