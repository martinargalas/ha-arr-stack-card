// Tracearr, loading each tab: what it fetches and paints. Split out of render/tracearr.js.

class _TracearrLoadMethods {

  // Tracearr: loads and paints the overview tab.
  async _traLoadOverview(body, m) {
    const [stats, health, viols, act] = await Promise.all([
      this._traApiFetch('stats'),
      this._traApiFetch('health'),
      this._traApiFetch('violations?pageSize=5'),
      this._traApiFetch('activity?days=7'),
    ]);
    if (!this._tracearrModal) return;
    m.overviewStats  = stats;
    m.overviewHealth = health;
    m.overviewViols  = viols?.data || [];
    m.overviewAct    = act;
    body.innerHTML = this._traBodyOverview();
    this._wireTracearrModalBody(body);

  }

  // Tracearr: loads and paints the users tab.
  async _traLoadUsers(modal, body, m) {
    if (!m.staleServers) {
      const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
      if (this._tracearrModal) {
        const srvMap = new Map();
        for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
        m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
      }
    }
    if (!this._tracearrModal) return;
    await this._traEnrichServerTypes(m);
    if (!this._tracearrModal) return;
    if (!m.usersServerId && (m.staleServers || []).length > 0) {
      m.usersServerId = this._traAutoPickSrv(m.staleServers);
    }
    const _uSrvQ = m.usersServerId ? `&serverId=${m.usersServerId}` : '';
    // Tracearr's own web UI searches users client-side (no network call on typing) — fetch
    // the full list once (sort/server filters are still server-side) and filter/paginate
    // locally in _traBodyUsers().
    const r  = await this._traApiFetch(`users?pageSize=100&page=1&sort=${m.usersSortCol}&order=${m.usersSortDir}${_uSrvQ}`);
    if (!this._tracearrModal) return;
    m.usersData  = r?.data || [];
    m.usersTotal = r?.meta?.total || 0;
    body.innerHTML = this._traBodyUsers();
    this._wireTracearrModalBody(body);
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.staleServers, m.usersServerId, 'data-tra-usr-srv');

  }

  // Tracearr: loads and paints the violations tab.
  async _traLoadViolations(modal, body, m) {
    const pp = this._tlCalcPerPage({ hasFilter: true });
    let q = `pageSize=${pp}&page=${m.violsPage + 1}&orderBy=createdAt&orderDir=desc`;
    if (m.violsSeverity) q += `&severity=${m.violsSeverity}`;
    if (m.violsStatus)   q += `&status=${m.violsStatus}`;
    if (m.violsServerId) q += `&serverId=${m.violsServerId}`;
    const [vr, sr] = await Promise.all([
      this._traApiFetch(`violations?${q}`),
      this._traApiFetch('health'),
    ]);
    if (!this._tracearrModal) return;
    m.violsData    = vr?.data || [];
    m.violsTotal   = vr?.meta?.total || 0;
    m.violsServers = sr?.servers || [];
    if (m.violsServerId === null && m.violsServers.length > 0) {
      m.violsServerId = this._traAutoPickSrv(m.violsServers, s => s.type || '');
      if (m.violsServerId) { this._traLoadTab('violations', modal); return; }
    }
    body.innerHTML = this._traBodyViolations();
    this._wireTracearrModalBody(body);
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.violsServers, m.violsServerId, 'data-tra-viols-srv', s => { const t=(s.type||'').toLowerCase(); return ['plex','jellyfin','emby'].includes(t)?t:null; });

  }

  // Tracearr: loads and paints the history tab.
  async _traLoadHistory(modal, body, m) {
    const isMobH = this._isMob;
    const pp = this._tlCalcPerPage({ hasFilter: true, filterH: isMobH ? 120 : 40, rowH: isMobH ? 80 : 44, bar: 0 });
    let q = `pageSize=${pp}&page=${m.histPage + 1}&order=desc`;
    if (m.histServer) q += `&serverId=${m.histServer}`;
    if (m.histUser)   q += `&userId=${m.histUser}`;
    if (m.histMedia)  q += `&mediaType=${m.histMedia}`;
    if (m.histSearch) q += `&search=${encodeURIComponent(m.histSearch)}`;
    if (m.histPeriod) {
      const days = m.histPeriod === 'week' ? 7 : m.histPeriod === 'month' ? 30 : 365;
      const end  = new Date(); end.setHours(23,59,59,0);
      const start = new Date(Date.now() - days * 86400000); start.setHours(0,0,0,0);
      const fmt = d => d.toISOString().slice(0,10);
      q += `&startDate=${fmt(start)}&endDate=${fmt(end)}`;
    }
    const [hr, ur, sr] = await Promise.all([
      this._traSessionsFetch(`history?${q}`),
      this._traApiFetch('users?pageSize=100'),
      this._traApiFetch('health'),
    ]);
    if (!this._tracearrModal) return;
    m.histData    = hr?.data || [];
    m.histTotal   = hr?.meta?.total || 0;
    m.histUsers   = ur?.data || [];
    m.histServers = sr?.servers || [];
    // Auto-select server on first open
    if (m.histServer === null && m.histServers.length > 0) {
      m.histServer = this._traAutoPickSrv(m.histServers, s => s.type || '');
      if (m.histServer) { this._traLoadTab('history', modal); return; }
    }
    body.innerHTML = this._traBodyHistory();
    this._wireTracearrModalBody(body);
    // Populate server buttons in modal header
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.histServers, m.histServer, 'data-tra-hist-srv', s => { const t=(s.type||'').toLowerCase(); return ['plex','jellyfin','emby'].includes(t)?t:null; });

  }

  // Tracearr: loads and paints the activity tab.
  async _traLoadActivity(modal, body, m) {
    // Ensure server list available (reuse staleServers from quality/storage/watch)
    if (!m.staleServers) {
      const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
      if (this._tracearrModal) {
        const srvMap = new Map();
        for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
        m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
      }
    }
    if (!this._tracearrModal) return;
    await this._traEnrichServerTypes(m);
    if (!this._tracearrModal) return;
    // Auto-select server on first open
    if (!m.activityServerId && (m.staleServers || []).length > 0) {
      m.activityServerId = this._traAutoPickSrv(m.staleServers);
    }
    const _actSrvQ = m.activityServerId ? `&serverId=${m.activityServerId}` : '';
    const ar = await this._traApiFetch(`activity?period=${m.activityPeriod || 'month'}${_actSrvQ}`);
    if (!this._tracearrModal) return;
    m.activityData = ar;
    body.innerHTML = this._traBodyActivity();
    this._wireTracearrModalBody(body);
    // Populate server buttons in modal header
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.staleServers, m.activityServerId, 'data-tra-act-srv');

  }

  // Tracearr: loads and paints the statsUsers tab.
  async _traLoadStatsUsers(modal, body, m) {
    const _tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const _p  = m.statsUsersPeriod || 'month';
    const _suKeyFn = s => { const t=(s.type||s.name||'').toLowerCase(); return t.includes('jellyfin')?'jellyfin':t.includes('plex')?'plex':t.includes('emby')?'emby':null; };
    // First open without known server list — fetch without serverId to discover available servers
    if (!m.statsUsersServers) {
      const _r0 = await this._traStatsFetch(`top-users?period=${_p}&timezone=${_tz}`);
      if (!this._tracearrModal) return;
      const _avail = _r0?.availableFilters?.servers;
      if (_avail?.length) {
        m.statsUsersServers = _avail;
      } else if (!m.staleServers) {
        const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
        if (this._tracearrModal) {
          const srvMap = new Map();
          for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
          m.statsUsersServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
        }
      } else {
        m.statsUsersServers = m.staleServers;
      }
      if (!this._tracearrModal) return;
      // Auto-select best server
      if (!m.statsUsersServerId && (m.statsUsersServers || []).length > 0) {
        const _pk = s => { const t=_suKeyFn(s); return t==='jellyfin'?0:t==='plex'?1:t==='emby'?2:99; };
        let _saved = null;
        _saved = this._traReadSavedSrv();
        const _validSaved = _saved && m.statsUsersServers.find(s => s.id === _saved);
        m.statsUsersServerId = _validSaved ? _saved : ([...m.statsUsersServers].sort((a,b)=>_pk(a)-_pk(b))[0]?.id || null);
      }
    }
    const _sQ = m.statsUsersServerId ? `&serverId=${m.statsUsersServerId}` : '';
    const r   = await this._traStatsFetch(`top-users?period=${_p}&timezone=${_tz}${_sQ}`);
    if (!this._tracearrModal) return;
    m.statsUsersData = r?.data || r || [];
    body.innerHTML = this._traBodyStatsUsers();
    this._wireTracearrModalBody(body);
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.statsUsersServers || [], m.statsUsersServerId, 'data-tra-su-srv', _suKeyFn);

  }

  // Tracearr: loads and paints the quality tab.
  async _traLoadQuality(body, m) {
    // Ensure server list is available
    if (!m.staleServers) {
      const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
      if (this._tracearrModal) {
        const srvMap = new Map();
        for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
        m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
      }
    }
    if (!this._tracearrModal) return;
    // Auto-select server: prefer localStorage last-used, fallback to type priority (JF → Plex → Emby)
    if (!m.qualityServerId && (m.staleServers || []).length > 0) {
      let _saved = null;
      _saved = this._traReadSavedSrv();
      const _validSaved = _saved && m.staleServers.find(s => s.id === _saved);
      if (_validSaved) {
        m.qualityServerId = _saved;
      } else {
        const _pk = n => { const s = (n||'').toLowerCase(); return s.includes('jellyfin') ? 0 : s.includes('plex') ? 1 : s.includes('emby') ? 2 : 99; };
        const _first = [...(m.staleServers)].sort((a,b) => _pk(a.name) - _pk(b.name))[0];
        if (_first) m.qualityServerId = _first.id;
      }
    }
    const _qSrvId = m.qualityServerId || null;
    const _qMt    = m.qualityMediaType || null;
    const _qKey   = `${_qSrvId}|${_qMt}`;
    const _tz     = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const _qQ     = ['period=all', `timezone=${_tz}`, _qSrvId && `serverId=${_qSrvId}`, _qMt && `mediaType=${_qMt}`].filter(Boolean).join('&');
    const _qSrvQ  = `?${_qQ}`;
    // Per-server (no mediaType): resolution + codecs — only refetch when server changes
    if (!m.qualityResolution || m._qualityResSrvId !== _qSrvId) {
      const _srvSuffix = _qSrvId ? `?serverId=${_qSrvId}` : '';
      const [res, cod] = await Promise.all([
        this._traLibFetch(`resolution${_srvSuffix}`),
        this._traLibFetch(`codecs${_srvSuffix}`),
      ]);
      if (!this._tracearrModal) return;
      m.qualityResolution = res;
      m.qualityCodecs     = cod;
      m._qualityResSrvId  = _qSrvId;
    }
    // Per-server+mediaType: quality evolution — refetch when server OR mediaType changes
    if (!m.qualityData || m._qualityKey !== _qKey) {
      const qr = await this._traLibFetch(`quality${_qSrvQ}`);
      if (!this._tracearrModal) return;
      m.qualityData = qr;
      m._qualityKey = _qKey;
    }
    body.innerHTML = this._traBodyQuality();
    this._wireTracearrModalBody(body);
    // Populate server icons in modal header (only if multiple servers)
    this._traPopSrvEl(body.closest('[data-tra-modal]')?.querySelector('#tra-hdr-server'), m.staleServers, m.qualityServerId, 'data-tra-quality-srv');

  }

  // Tracearr: loads and paints the storage tab.
  async _traLoadStorage(body, m) {
    try {
      const _effectiveSrv = m.selectedServerId || null;
      const _srvQ = _effectiveSrv ? `&serverId=${_effectiveSrv}` : '';

      // Storage + stats (server-aware); period=all fetches full history
      if (!m.storageData || m._storageServerId !== _effectiveSrv) {
        const [sr, st] = await Promise.all([
          this._traLibFetch(`storage?period=all${_srvQ}`),
          this._traLibFetch(`stats${_effectiveSrv ? `?serverId=${_effectiveSrv}` : ''}`),
        ]);
        if (!this._tracearrModal) return;
        m.storageData = sr; m.storageStats = st; m._storageServerId = _effectiveSrv;
      }

      // Duplicates summary (server-aware)
      if (!m.dupsSummary || m._dupsServerId !== _effectiveSrv) {
        const dupPath = _effectiveSrv ? `duplicates?serverId=${_effectiveSrv}&pageSize=1` : 'duplicates?pageSize=1';
        const dupR = await this._traLibFetch(dupPath);
        if (!this._tracearrModal) return;
        m.dupsSummary = dupR?.summary || null;
        m._dupsServerId = _effectiveSrv;
      }

      const _isMobSt = this._isMob;
      // A phone gets at least ten rows even if that means scrolling — paging
      // through three at a time is worse than a scroll.
      m.stalePageSize = _isMobSt
        ? Math.max(10, Math.floor((window.innerHeight * 0.88 - 594) / 54))
        : Math.max(3, this._tlCalcPerPage({ bar: 320, rowH: 34 }));

      // Stale fetch — server-aware for correct summary counts
      const _staleCat  = m.staleCategory || 'never_watched';
      const _staleMo   = _staleCat === 'stale' ? (m.staleMonths || 3) : null;
      const _staleKey  = `${_staleCat}|${_effectiveSrv || ''}|${_staleMo || ''}`;
      if (!m.staleRaw || m.staleRaw._key !== _staleKey) {
        const srvParam = _effectiveSrv ? `&serverId=${_effectiveSrv}` : '';
        const moParam  = _staleMo ? `&months=${_staleMo}` : '';
        const staleR = await this._traLibFetch(
          `stale?category=${_staleCat}&page=1&pageSize=100&sort=${m.staleSort || 'fileSize'}&order=${m.staleOrder || 'desc'}${srvParam}${moParam}`
        );
        if (!this._tracearrModal) return;
        m.staleSummary = staleR?.summary || null;
        const rawItems = staleR?.items || [];
        m.staleRaw = Object.assign([...rawItems], { _key: _staleKey });
        m.staleDeduped = null;
        // Build server list only from global fetch (no server selected)
        if (!_effectiveSrv) {
          const srvMap = new Map();
          for (const it of rawItems) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
          m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
          // Auto-select server: prefer localStorage last-used, fallback to first
          if (!m.selectedServerId && m.staleServers.length > 0) {
            let _savedStor = null;
            _savedStor = this._traReadSavedSrv();
            const _validStor = _savedStor && m.staleServers.find(s => s.id === _savedStor);
            m.selectedServerId = _validStor ? _savedStor : m.staleServers[0].id;
            const _modalEl = body.closest('[data-tra-modal]');
            if (_modalEl) { this._traLoadTab('storage', _modalEl); return; }
          }
        }
      }

      this._traPopSrvEl(body.closest('[data-tra-modal]')?.querySelector('#tra-hdr-server'), m.staleServers, m.selectedServerId, 'data-tra-server');

      // Client-side dedup only for "All" view
      let _filtered;
      if (_effectiveSrv) {
        _filtered = m.staleRaw || [];  // already server-filtered by API
      } else {
        if (!m.staleDeduped) {
          const seen = new Map();
          for (const it of (m.staleRaw || [])) {
            const key = `${it.title?.toLowerCase()}|${it.year}|${it.mediaType}`;
            if (seen.has(key)) {
              const ex = seen.get(key);
              ex.serverName = [...new Set([ex.serverName, it.serverName].filter(Boolean))].join(', ');
              if (Number(it.fileSize) > Number(ex.fileSize)) ex.fileSize = it.fileSize;
            } else {
              seen.set(key, { ...it });
            }
          }
          m.staleDeduped = [...seen.values()];
        }
        _filtered = m.staleDeduped;
      }
      // Search runs over the whole fetched set, not the visible page, so the
      // count under it means what it says.
      const _q = (m.staleSearch || '').trim().toLowerCase();
      if (_q) _filtered = _filtered.filter(it => (it.title || '').toLowerCase().includes(_q));
      const _pp    = m.stalePageSize;
      const _start = (m.stalePage || 0) * _pp;
      m.staleItems = _filtered.slice(_start, _start + _pp);
      m.staleTotal = _filtered.length;
      body.innerHTML = this._traBodyStorage();
      this._wireTracearrModalBody(body);
    } catch (err) {
      console.error('[arr-card] Storage tab error:', err);
      body.innerHTML = `<div style="color:rgba(252,165,165,0.9);padding:20px;font-size:12px;font-family:monospace">${this._t('traStorageErr').replace('{e}', () => String(err?.message || err))}</div>`;
    }

  }

  // Tracearr: loads and paints the watch tab.
  async _traLoadWatch(body, m) {
    // Ensure staleServers populated (same source as quality/storage)
    if (!m.staleServers) {
      const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
      if (this._tracearrModal) {
        const srvMap = new Map();
        for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
        m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
      }
    }
    if (!this._tracearrModal) return;
    // Auto-select: localStorage → type priority (JF→Plex→Emby)
    if (!m.watchServerId && (m.staleServers || []).length > 0) {
      let _saved = null;
      _saved = this._traReadSavedSrv();
      const _valid = _saved && m.staleServers.find(s => s.id === _saved);
      if (_valid) {
        m.watchServerId = _saved;
      } else {
        const _pk = n => { const s = (n||'').toLowerCase(); return s.includes('jellyfin') ? 0 : s.includes('plex') ? 1 : s.includes('emby') ? 2 : 99; };
        const _first = [...m.staleServers].sort((a,b) => _pk(a.name)-_pk(b.name))[0];
        if (_first) m.watchServerId = _first.id;
      }
    }
    const _wSrvId  = m.watchServerId || null;
    const _wPeriod = m.watchPeriod || '30d';
    const _wPKey   = `${_wSrvId}|${_wPeriod}`;
    const _wSKey   = _wSrvId || '';
    const _wTz     = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const _wSrvQ   = _wSrvId ? `&serverId=${_wSrvId}` : '';
    const _wSrvQS  = _wSrvId ? `?serverId=${_wSrvId}` : '';
    const fetches = [];
    if (!m.watchPatterns || m.watchSrvKey !== _wSKey) {
      fetches.push(Promise.all([
        this._traLibFetch(`patterns?periodWeeks=12&timezone=${_wTz}${_wSrvQ}`),
        this._traLibFetch(`status${_wSrvQS}`),
        this._traLibFetch(`completion?aggregateLevel=item&page=1&pageSize=1&mediaType=movie${_wSrvQ}`),
        this._traLibFetch(`completion?aggregateLevel=item&page=1&pageSize=1&mediaType=episode${_wSrvQ}`),
        this._traLibFetch(`watch?page=1&pageSize=1${_wSrvQ}`),
      ]).then(([pat, stat, compMov, compEp, watchList]) => {
        if (!this._tracearrModal) return;
        m.watchPatterns   = pat;
        m.watchStatus     = stat;
        m.watchCompletion = { movie: compMov, episode: compEp };
        m.watchedTotal    = watchList?.pagination?.total ?? watchList?.total ?? null;
        m.watchSrvKey     = _wSKey;
      }));
    }
    if (!m.watchTopMovies || m.watchSrvPeriodKey !== _wPKey) {
      fetches.push(Promise.all([
        this._traLibFetch(`top-movies?period=${_wPeriod}&sortBy=plays&sortOrder=desc&page=1&pageSize=5${_wSrvQ}`),
        this._traLibFetch(`top-shows?period=${_wPeriod}&sortBy=plays&sortOrder=desc&page=1&pageSize=5${_wSrvQ}`),
      ]).then(([mov, sh]) => {
        if (!this._tracearrModal) return;
        m.watchTopMovies    = mov?.items || mov || [];
        m.watchTopShows     = sh?.items  || sh  || [];
        m.watchSrvPeriodKey = _wPKey;
      }));
    }
    await Promise.all(fetches);
    if (!this._tracearrModal) return;
    body.innerHTML = this._traBodyWatch();
    this._wireTracearrModalBody(body);
    // Populate server icons in #tra-hdr-server
    this._traPopSrvEl(body.closest('[data-tra-modal]')?.querySelector('#tra-hdr-server'), m.staleServers, m.watchServerId, 'data-tra-watch-srv');

  }

  // Tracearr: loads and paints the devices tab.
  async _traLoadDevices(modal, body, m) {
    // Ensure server list
    if (!m.staleServers) {
      const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
      if (this._tracearrModal) {
        const srvMap = new Map();
        for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
        m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
      }
    }
    if (!this._tracearrModal) return;
    // Auto-select server
    if (!m.devicesServerId && (m.staleServers || []).length > 0) {
      const _pk = n => { const s=(n||'').toLowerCase(); return s.includes('jellyfin')?0:s.includes('plex')?1:s.includes('emby')?2:99; };
      let _saved = null;
      _saved = this._traReadSavedSrv();
      const _validSaved = _saved && m.staleServers.find(s => s.id === _saved);
      m.devicesServerId = _validSaved ? _saved : ([...m.staleServers].sort((a,b)=>_pk(a.name)-_pk(b.name))[0]?.id || null);
    }
    if (!m.devicesData) {
      const _tz   = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
      const _dp   = m.devicesPeriod || 'month';
      const _dSrv = m.devicesServerId ? `&serverId=${m.devicesServerId}` : '';
      const _dQ   = `period=${_dp}${_dSrv}&timezone=${_tz}`;
      const [dc, dh, dhot, dmat, dtu] = await Promise.all([
        this._traStatsFetch(`device-compatibility?${_dQ}&minSessions=5`),
        this._traStatsFetch(`device-compatibility/health?${_dQ}`),
        this._traStatsFetch(`device-compatibility/hotspots?${_dQ}`),
        this._traStatsFetch(`device-compatibility/matrix?${_dQ}&minSessions=5`),
        this._traStatsFetch(`device-compatibility/top-transcoding-users?${_dQ}`),
      ]);
      if (!this._tracearrModal) return;
      m.devicesData     = dc;
      m.devicesHealth   = dh;
      m.devicesHotspots = dhot;
      m.devicesMatrix   = dmat;
      m.devicesUsers    = dtu;
    }
    body.innerHTML = this._traBodyDevices();
    this._wireTracearrModalBody(body);
    // Server buttons in header
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.staleServers, m.devicesServerId, 'data-tra-dev-srv');

  }

  // Tracearr: loads and paints the bandwidth tab.
  async _traLoadBandwidth(modal, body, m) {
    if (!m.staleServers) {
      const _sr = await this._traLibFetch('stale?category=never_watched&page=1&pageSize=50');
      if (this._tracearrModal) {
        const srvMap = new Map();
        for (const it of (_sr?.items || [])) if (it.serverId) srvMap.set(it.serverId, it.serverName || it.serverId);
        m.staleServers = [...srvMap.entries()].map(([id, name]) => ({ id, name }));
      }
    }
    if (!this._tracearrModal) return;
    if (!m.bwServerId && (m.staleServers || []).length > 0) {
      const _pk = n => { const s=(n||'').toLowerCase(); return s.includes('jellyfin')?0:s.includes('plex')?1:s.includes('emby')?2:99; };
      let _saved = null;
      _saved = this._traReadSavedSrv();
      const _validSaved = _saved && m.staleServers.find(s => s.id === _saved);
      m.bwServerId = _validSaved ? _saved : ([...m.staleServers].sort((a,b)=>_pk(a.name)-_pk(b.name))[0]?.id || null);
    }
    if (!m.bwSummary) {
      const _tz  = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
      const _bp  = m.bwPeriod || 'month';
      const _bSrv= m.bwServerId ? `&serverId=${m.bwServerId}` : '';
      const _bQ  = `period=${_bp}${_bSrv}&timezone=${_tz}`;
      const [bws, bwd, bwu] = await Promise.all([
        this._traStatsFetch(`bandwidth/summary?${_bQ}`),
        this._traStatsFetch(`bandwidth/daily?${_bQ}`),
        this._traStatsFetch(`bandwidth/top-users?${_bQ}`),
      ]);
      if (!this._tracearrModal) return;
      m.bwSummary = bws; m.bwDaily = bwd; m.bwUsers = bwu;
    }
    body.innerHTML = this._traBodyBandwidth();
    this._wireTracearrModalBody(body);
    this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), m.staleServers, m.bwServerId, 'data-tra-bw-srv');
  }

  // Lightweight history-tab refetch for the search box — histUsers/histServers are already
  // populated from the initial _traLoadTab('history', ...) call, so this only redoes the
  // paginated history fetch. Patches only .tra-hist-results-wrap so #tra-hist-search is
  // never recreated — that's what closes the iOS keyboard while typing.
  async _traRefetchHistorySearch(body) {
    const m = this._tracearrModal;
    if (!m) return;
    const resultsWrap = body.querySelector('.tra-hist-results-wrap');
    if (resultsWrap) resultsWrap.innerHTML = `<div class="u-empty-dim">${this._t('loading')}</div>`;
    const isMobH = this._isMob;
    const pp = this._tlCalcPerPage({ hasFilter: true, filterH: isMobH ? 120 : 40, rowH: isMobH ? 80 : 44, bar: 0 });
    let q = `pageSize=${pp}&page=${m.histPage + 1}&order=desc`;
    if (m.histServer) q += `&serverId=${m.histServer}`;
    if (m.histUser)   q += `&userId=${m.histUser}`;
    if (m.histMedia)  q += `&mediaType=${m.histMedia}`;
    if (m.histSearch) q += `&search=${encodeURIComponent(m.histSearch)}`;
    if (m.histPeriod) {
      const days = m.histPeriod === 'week' ? 7 : m.histPeriod === 'month' ? 30 : 365;
      const end  = new Date(); end.setHours(23,59,59,0);
      const start = new Date(Date.now() - days * 86400000); start.setHours(0,0,0,0);
      const fmt = d => d.toISOString().slice(0,10);
      q += `&startDate=${fmt(start)}&endDate=${fmt(end)}`;
    }
    const hr = await this._traSessionsFetch(`history?${q}`);
    if (!this._tracearrModal) return;
    m.histData  = hr?.data || [];
    m.histTotal = hr?.meta?.total || 0;
    this._patchResultsWrap(body, 'tra-hist-results-wrap', () => this._traBodyHistory());
    this._wireTracearrModalBody(body);
  }

  // ── Refresh stale section only (no chart/tiles re-render) ────────────────
  async _traRefreshStale(body) {
    const m = this._tracearrModal;
    if (!m) return;
    try {
      const _effectiveSrv = m.selectedServerId || null;
      const _staleCat = m.staleCategory || 'never_watched';
      const _staleMo  = _staleCat === 'stale' ? (m.staleMonths || 3) : null;
      const _staleKey = `${_staleCat}|${_effectiveSrv || ''}|${_staleMo || ''}`;
      const _isMobSt = this._isMob;
      m.stalePageSize = _isMobSt
        ? Math.max(10, Math.floor((window.innerHeight * 0.88 - 594) / 54))
        : Math.max(3, this._tlCalcPerPage({ bar: 320, rowH: 34 }));
      if (!m.staleRaw || m.staleRaw._key !== _staleKey) {
        const srvParam = _effectiveSrv ? `&serverId=${_effectiveSrv}` : '';
        const moParam  = _staleMo ? `&months=${_staleMo}` : '';
        const staleR = await this._traLibFetch(
          `stale?category=${_staleCat}&page=1&pageSize=100&sort=${m.staleSort || 'fileSize'}&order=${m.staleOrder || 'desc'}${srvParam}${moParam}`
        );
        if (!this._tracearrModal) return;
        m.staleSummary = staleR?.summary || null;
        const rawItems = staleR?.items || [];
        m.staleRaw = Object.assign([...rawItems], { _key: _staleKey });
        m.staleDeduped = null;
      }
      let _filtered;
      if (_effectiveSrv) {
        _filtered = m.staleRaw || [];
      } else {
        if (!m.staleDeduped) {
          const seen = new Map();
          for (const it of (m.staleRaw || [])) {
            const key = `${it.title?.toLowerCase()}|${it.year}|${it.mediaType}`;
            if (seen.has(key)) {
              const ex = seen.get(key);
              ex.serverName = [...new Set([ex.serverName, it.serverName].filter(Boolean))].join(', ');
              if (Number(it.fileSize) > Number(ex.fileSize)) ex.fileSize = it.fileSize;
            } else { seen.set(key, { ...it }); }
          }
          m.staleDeduped = [...seen.values()];
        }
        _filtered = m.staleDeduped;
      }
      // Client-side sort
      const _sCol = m.staleSort || 'fileSize';
      const _sDir = m.staleOrder === 'asc' ? 1 : -1;
      _filtered = [..._filtered].sort((a, b) => {
        let va = a[_sCol], vb = b[_sCol];
        if (_sCol === 'fileSize' || _sCol === 'playCount' || _sCol === 'watchCount') { va = Number(va) || 0; vb = Number(vb) || 0; }
        if (va < vb) return -_sDir;
        if (va > vb) return _sDir;
        return 0;
      });
      // Client-side media type filter
      if (m.staleMediaType) _filtered = _filtered.filter(it => it.mediaType === m.staleMediaType);
      const _pp = m.stalePageSize;
      const _q = (m.staleSearch || '').trim().toLowerCase();
      if (_q) _filtered = _filtered.filter(it => (it.title || '').toLowerCase().includes(_q));
      m.staleItems = _filtered.slice((m.stalePage || 0) * _pp, ((m.stalePage || 0) + 1) * _pp);
      m.staleTotal = _filtered.length;
      const wrap = body.querySelector('[data-tra-stale-wrap]');
      if (wrap) {
        // Only the results are replaced. Rewriting the whole section would
        // recreate the search input, and with it go the caret and the focus.
        this._patchResultsWrap(wrap, 'tra-stale-results-wrap', () => this._traBodyStaleSection());
        const pagEl = body.querySelector('[data-tra-stale-pag]');
        if (pagEl) pagEl.innerHTML = this._traStalePagHtml();
        this._wireTracearrModalBody(body);
      }
    } catch (err) {
      console.error('[arr-card] Stale refresh error:', err);
    }
  }

}

export const tracearrLoadMixin = _TracearrLoadMethods.prototype;
