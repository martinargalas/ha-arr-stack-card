// Fetching for the services behind the modals: Tautulli, Jellystat, Activity, Prowlarr, Tracearr, Maintainerr. Split out of fetch/arr.js.

class _FetchServicesMethods {

async _fetchTautulli() {
  if (!this._tautulliConfigured) return;
  try {
    const [actRaw, statsRaw, playsRaw, ackRaw, libsRaw, histRaw] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/tautulli/get_activity').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tautulli/get_home_stats?time_range=7&stats_count=5&stats_type=plays').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tautulli/get_plays_by_date?time_range=7&y_axis=plays').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tautulli/sharing_ack').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tautulli/get_libraries_table?length=20&start=0').catch(() => null),
      this._hass.callApi('GET', `arr_stack/tautulli/get_history?length=${this._config?.security?.ip_history_depth ?? 200}&order_column=date&order_dir=desc`).catch(() => null),
    ]);

    if (actRaw === null && statsRaw === null) {
      this._tautulliConfigured = false;
      return;
    }

    const act   = actRaw?.response?.data  || {};
    const stats = statsRaw?.response?.data || [];

    // Build mini-chart data (sum all media types per day)
    const playsD    = playsRaw?.response?.data || {};
    const cats      = playsD.categories || [];
    const series    = playsD.series     || [];
    const movieSeries = series.find(sr => /movie/i.test(sr.name));
    const showSeries  = series.find(sr => /tv|show/i.test(sr.name));
    const musicSeries = series.find(sr => /music|artist/i.test(sr.name));
    const playsData = cats.map((date, i) => ({
      date,
      value: series.reduce((s, sr) => s + ((sr.data || [])[i] || 0), 0),
      movie: (movieSeries?.data || [])[i] || 0,
      show:  (showSeries?.data  || [])[i] || 0,
      music: (musicSeries?.data || [])[i] || 0,
    }));

    // Sharing detection: group history by user → collect unique IPs with timestamps
    const threshold  = this._config?.security?.ip_sharing_threshold ?? 2;
    const histRows   = histRaw?.response?.data?.data || [];
    const byUser     = {};
    histRows.forEach(h => {
      const name = h.friendly_name || h.user || h.username;
      if (!name || !h.ip_address) return;
      if (!byUser[name]) byUser[name] = {};
      const ip = h.ip_address;
      if (!byUser[name][ip]) byUser[name][ip] = { ip, lastSeen: h.date || h.stopped || 0, count: 0 };
      byUser[name][ip].count++;
      if ((h.date || h.stopped || 0) > byUser[name][ip].lastSeen) byUser[name][ip].lastSeen = h.date || h.stopped || 0;
    });

    const ackedIps      = ackRaw?.ackedIps || {};
    const sharingUsers  = [];
    const ipReport      = {}; // name → [{ ip, lastSeen, count }]
    for (const [name, ipMap] of Object.entries(byUser)) {
      const knownIps = new Set(ackedIps[name] || []);
      const newIps   = Object.values(ipMap).filter(e => !knownIps.has(e.ip));
      if (newIps.length >= threshold) {
        sharingUsers.push(name);
        ipReport[name] = Object.values(ipMap).sort((a, b) => b.lastSeen - a.lastSeen);
      }
    }

    this._tautulli = {
      activity:        act,
      stats,
      playsData,
      libraries:       libsRaw?.response?.data?.data || [],
      recentHistory:   histRaw?.response?.data?.data || [],
      sharingDetected: sharingUsers.length > 0,
      sharingAcked:    false,
      sharingUsers,
      ackedIps,
      ipReport,
    };
  } catch (e) {
    console.warn('[arr-card] Tautulli fetch error:', e);
  }
}

async _ackTautulliSharing() {
  if (!this._tautulli) return;
  const { sharingUsers, ackedIps: prev, ipReport } = this._tautulli;

  const updated = { ...prev };
  sharingUsers.forEach(name => {
    const ips = (ipReport?.[name] || []).map(e => e.ip);
    const existing = new Set(prev[name] || []);
    ips.forEach(ip => existing.add(ip));
    updated[name] = [...existing];
  });

  try {
    await this._hass.callApi('POST', 'arr_stack/tautulli/sharing_ack', { ackedIps: updated });
    this._tautulli = { ...this._tautulli, sharingAcked: true, ackedIps: updated };
    this._reRenderRight();
  } catch (e) {
    console.warn('[arr-card] Tautulli ack error:', e);
  }
}

  // ─────────────────────────────────────────────
  // Jellystat
  // ─────────────────────────────────────────────

async _fetchJellystat() {
  if (!this._jellystatConfigured) return;
  try {
    const [libsRaw, usersRaw, histRaw, playsRaw] = await Promise.all([
      this._hass.callApi('GET',  'arr_stack/jellystat/getLibraries').catch(() => null),
      this._hass.callApi('GET',  'arr_stack/jellystat/stats/getAllUserActivity').catch(() => null),
      this._hass.callApi('GET',  'arr_stack/jellystat/getHistory?page=1&size=5').catch(() => null),
      this._hass.callApi('GET',  'arr_stack/jellystat/stats/getViewsOverTime').catch(() => null),
    ]);

    if (libsRaw === null && usersRaw === null) {
      this._jellystatConfigured = false;
      return;
    }

    // Libraries: field is item_count (lowercase)
    const libraries = Array.isArray(libsRaw) ? libsRaw : (libsRaw?.data || libsRaw?.items || []);

    // Users: POST /getUsers returns array or {data:[]}
    const users = Array.isArray(usersRaw) ? usersRaw : (usersRaw?.data || usersRaw?.users || []);

    // History: results key, current_page/pages/size pagination
    const recentHistory = (histRaw?.results || histRaw?.data || (Array.isArray(histRaw) ? histRaw : [])).slice(0, 5);

    // Mini bar chart: getViewsOverTime returns {libraries:[{Id,Name}], stats:[{Key:"Apr 26, 2026", LibName:{count,duration}}]}
    const statsArr = playsRaw?.stats || [];
    const today    = new Date();
    const playsData = Array.from({ length: 7 }, (_, i) => {
      const d       = new Date(today - (6 - i) * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const entry   = statsArr.find(r => { try { return new Date(r.Key).toISOString().slice(0, 10) === dateStr; } catch { return false; } });
      if (!entry) return { date: dateStr, value: 0 };
      const value = Object.values(entry).filter(v => v && typeof v === 'object' && 'count' in v).reduce((s, v) => s + (v.count || 0), 0);
      return { date: dateStr, value };
    });

    users.sort((a, b) => (b.Plays ?? b.TotalPlays ?? 0) - (a.Plays ?? a.TotalPlays ?? 0));

    this._jellystat = { libraries, users, recentHistory, activity: {}, playsData };
  } catch (e) {
    console.warn('[arr-card] Jellystat fetch error:', e);
  }
}

  async _fetchActivityHistory() {
    try {
      const svcs = ['radarr', 'sonarr'];
      const calls = [
        this._callApi('GET', 'arr_stack/radarr/activity/history?page=1&pageSize=30&sortKey=date&sortDir=desc'),
        this._callApi('GET', 'arr_stack/sonarr/activity/history?page=1&pageSize=30&sortKey=date&sortDir=desc'),
      ];
      if (this._radarr2Configured !== false) {
        svcs.push('radarr2');
        calls.push(this._callApi('GET', 'arr_stack/radarr2/activity/history?page=1&pageSize=30&sortKey=date&sortDir=desc'));
      }
      if (this._sonarr2Configured !== false) {
        svcs.push('sonarr2');
        calls.push(this._callApi('GET', 'arr_stack/sonarr2/activity/history?page=1&pageSize=30&sortKey=date&sortDir=desc'));
      }
      const results = await Promise.allSettled(calls);
      const all = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const isRadarr = svcs[i].startsWith('radarr');
        for (const rec of (r.value?.records || [])) {
          const title = isRadarr
            ? (rec.movie?.title || rec.sourceTitle || '—')
            : (rec.series?.title || rec.sourceTitle || '—');
          const ep = !isRadarr && rec.episode
            ? `S${String(rec.episode.seasonNumber).padStart(2,'0')}E${String(rec.episode.episodeNumber).padStart(2,'0')}`
            : null;
          all.push({ title, date: rec.date, eventType: rec.eventType, svc: svcs[i], ep });
        }
      });
      all.sort((a, b) => new Date(b.date) - new Date(a.date));
      this._actHistoryCache = all;
    } catch (e) { /* silent */ }
  }

  async _fetchActivityBlocklist() {
    try {
      const svcs = ['radarr', 'sonarr'];
      const calls = [
        this._callApi('GET', 'arr_stack/radarr/activity/blocklist?page=1&pageSize=30'),
        this._callApi('GET', 'arr_stack/sonarr/activity/blocklist?page=1&pageSize=30'),
      ];
      if (this._radarr2Configured !== false) {
        svcs.push('radarr2');
        calls.push(this._callApi('GET', 'arr_stack/radarr2/activity/blocklist?page=1&pageSize=30'));
      }
      if (this._sonarr2Configured !== false) {
        svcs.push('sonarr2');
        calls.push(this._callApi('GET', 'arr_stack/sonarr2/activity/blocklist?page=1&pageSize=30'));
      }
      const results = await Promise.allSettled(calls);
      const all = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const isRadarr = svcs[i].startsWith('radarr');
        for (const rec of (r.value?.records || [])) {
          const title = isRadarr
            ? (rec.movie?.title || rec.sourceTitle || '—')
            : (rec.series?.title || rec.sourceTitle || '—');
          all.push({ title, date: rec.date, quality: rec.quality?.quality?.name || '', svc: svcs[i] });
        }
      });
      all.sort((a, b) => new Date(b.date) - new Date(a.date));
      this._actBlocklistCache = all;
    } catch (e) { /* silent */ }
  }

async _fetchProwlarr() {
  if (this._prowlarrConfigured === false) return;
  try {
    const endDate  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const startDt  = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const [indexers, status, apps, stats, histResp] = await Promise.all([
      this._callApi('GET', 'arr_stack/prowlarr/indexers'),
      this._callApi('GET', 'arr_stack/prowlarr/indexerstatus'),
      this._callApi('GET', 'arr_stack/prowlarr/applications').catch(() => []),
      this._callApi('GET', `arr_stack/prowlarr/indexerstats?startDate=${startDt}&endDate=${endDate}`).catch(() => null),
      this._callApi('GET', 'arr_stack/prowlarr/history?pageSize=50').catch(() => null),
    ]);
    if (indexers?._notConfigured) { this._prowlarrConfigured = false; return; }
    this._prowlarrConfigured = true;
    // Build status map: indexerId → { disabledTill, mostRecentFailure, escalationLevel }
    const statusMap = {};
    for (const s of (status || [])) statusMap[s.indexerId] = s;
    const prevResults = this._prowlarr?.appTestResults || null;
    this._prowlarr = {
      indexers: (indexers || []).map(idx => ({
        ...idx,
        _status: statusMap[idx.id] || null,
      })),
      apps: apps || [],
      stats: stats || null,
      recentHistory: histResp?.records || [],
      appTestResults: prevResults || {},
      lastFetch: Date.now(),
    };
    // Fire-and-forget background app tests → updates poster when done
    this._prowlarrTestAppsBackground();
  } catch (_) {
    this._prowlarrConfigured = false;
  }
}

async _prowlarrTestAppsBackground() {
  const apps = this._prowlarr?.apps || [];
  if (!apps.length) return;
  if (!this._prowlarr.appTestResults) this._prowlarr.appTestResults = {};
  await Promise.all(apps.map(async app => {
    try {
      const r = await this._callApi('POST', 'arr_stack/prowlarr/apptest', app);
      if (this._prowlarr?.appTestResults)
        this._prowlarr.appTestResults[app.id] = { ok: r?.ok !== false, errors: r?.errors || [] };
    } catch (_) {
      if (this._prowlarr?.appTestResults)
        this._prowlarr.appTestResults[app.id] = { ok: false, errors: [] };
    }
  }));
  // Update Apps poster in DOM without full re-render
  const posterEl = this.shadowRoot?.querySelector('[data-pw-open="apps"]');
  if (posterEl && this._pwAppsCard) {
    const tmp = document.createElement('div');
    tmp.innerHTML = this._pwAppsCard();
    const newEl = tmp.firstElementChild;
    if (newEl) posterEl.replaceWith(newEl);
  }
}

async _fetchTracearr() {
  if (!this._tracearrConfigured) return;
  try {
    const [stats, health, viols, act] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/tracearr/v1/public/stats').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tracearr/v1/public/health').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tracearr/v1/public/violations?pageSize=5').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tracearr/v1/public/activity?days=7').catch(() => null),
    ]);
    if (stats?._notConfigured || stats?.error === 'Tracearr not configured') {
      this._tracearrConfigured = false;
      return;
    }
    const [usersR, topTranscode] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/tracearr/v1/public/users?pageSize=10&sort=trustScore&order=asc').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/tracearr/v1/stats/device-compatibility/top-transcoding-users?period=month').catch(() => null),
    ]);
    this._tracearr = {
      stats:          stats   || {},
      health:         health  || {},
      users:          usersR?.data || [],
      violations:     viols?.data  || [],
      violationTotal: viols?.meta?.total || 0,
      activity:       act     || {},
      topTranscode:   topTranscode?.data || [],
    };
  } catch (_) {
    this._tracearrConfigured = false;
  }
}

async _fetchMaintainerr() {
  if (this._maintainerrConfigured === false) return;
  try {
    // Libraries come along because rule and collection names repeat across
    // instances — the library is the only thing telling them apart on the
    // category cards. The modal reuses the cache instead of refetching.
    const [rules, collections, settings, libraries] = await Promise.all([
      this._hass.callApi('GET', 'arr_stack/maintainerr/rules').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/maintainerr/collections').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/maintainerr/settings').catch(() => null),
      this._hass.callApi('GET', 'arr_stack/maintainerr/media-server/libraries').catch(() => null),
    ]);
    if (Array.isArray(libraries) && libraries.length) this._maintainerrLibraries = libraries;
    if (rules?._notConfigured || collections?._notConfigured) {
      this._maintainerrConfigured = false;
      return;
    }
    this._maintainerr = {
      rules: Array.isArray(rules) ? rules : [],
      collections: Array.isArray(collections) ? collections : [],
      settings: settings || {},
    };
    this._maintainerrConfigured = true;
    // One content request per collection, which is what the deletion schedule
    // needs — /collections truncates each media[] to two rows. Also means the
    // Calendar and Overview tabs open with their dates already resolved.
    await this._mtLoadDelMap();
    this._mtLoadLibTotals();
  } catch (e) {
    console.warn('[arr-card] Maintainerr fetch:', e);
  }
}

// Item count per library, for the Overview card. Asked for once per session
// rather than every poll: it costs one request per library and a media server's
// library sizes do not move on a 30-second timescale.
async _mtLoadLibTotals() {
  if (this._mtLibTotals || this._mtLibTotalsLoading) return;
  const libs = this._maintainerrLibraries || [];
  if (!libs.length) return;
  this._mtLibTotalsLoading = true;
  try {
    const totals = {};
    await Promise.all(libs.map(async l => {
      const params = new URLSearchParams({ page: '1', limit: '1' });
      if (l.type) params.set('type', l.type);
      const data = await this._hass
        .callApi('GET', `arr_stack/maintainerr/media-server/library/${l.id}/content?${params}`)
        .catch(() => null);
      if (data?.totalSize != null) totals[l.id] = data.totalSize;
    }));
    this._mtLibTotals = totals;
  } catch (e) {
    console.warn('[arr-card] Maintainerr library totals:', e);
  } finally {
    this._mtLibTotalsLoading = false;
  }
}

}

export const fetchServicesMixin = _FetchServicesMethods.prototype;
