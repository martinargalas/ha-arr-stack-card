// Tracearr, the tabs' controls: filters, search, sort, paging, periods. Split out of wire/tracearr.js.

class _WireTracearrTabsMethods {

  // Tracearr, the Users tab: search, sort, paging.
  _traWireUsers(body, modal, resolvePage) {
    // ── Users tab ────────────────────────────────────────────────────────

    const usersSearch = body.querySelector('#tra-users-search');
    if (usersSearch) {
      let t;
      usersSearch.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (!this._tracearrModal) return;
          this._tracearrModal.usersSearch = usersSearch.value;
          this._tracearrModal.usersPage   = 0;
          // Client-side filter over the already-fetched full list — no network call needed
          // (matches Tracearr's own web UI). Keeps #tra-users-search untouched too.
          this._patchResultsWrap(body, 'tra-users-results-wrap', () => this._traBodyUsers());
        }, 320);
      });
    }

    body.querySelectorAll('[data-tra-users-sort]').forEach(th => {
      th.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const col = th.dataset.traUsersSort;
        if (this._tracearrModal.usersSortCol === col) {
          this._tracearrModal.usersSortDir = this._tracearrModal.usersSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._tracearrModal.usersSortCol = col;
          this._tracearrModal.usersSortDir = 'asc';
        }
        this._tracearrModal.usersPage = 0;
        this._traLoadTab('users', modal());
      });
    });

    body.querySelectorAll('[data-tra-users-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const pp = this._tlCalcPerPage();
        const totalP = Math.max(1, Math.ceil((this._tracearrModal.usersTotal || 0) / pp));
        this._tracearrModal.usersPage = resolvePage(btn.dataset.traUsersPage, this._tracearrModal.usersPage, totalP);
        this._traLoadTab('users', modal());
      });
    });
  }

  // Tracearr, the Violations tab: severity and status filters.
  _traWireViolations(body, modal, resolvePage) {
    // ── Violations tab ────────────────────────────────────────────────────

    const violsSev = body.querySelector('#tra-viols-sev');
    if (violsSev) {
      violsSev.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.violsSeverity = violsSev.value || null;
        this._tracearrModal.violsPage = 0;
        this._traLoadTab('violations', modal());
      });
    }

    const violsStat = body.querySelector('#tra-viols-stat');
    if (violsStat) {
      violsStat.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.violsStatus = violsStat.value || null;
        this._tracearrModal.violsPage = 0;
        this._traLoadTab('violations', modal());
      });
    }

    body.querySelectorAll('[data-tra-viols-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const pp = this._tlCalcPerPage({ hasFilter: true });
        const totalP = Math.max(1, Math.ceil((this._tracearrModal.violsTotal || 0) / pp));
        this._tracearrModal.violsPage = resolvePage(btn.dataset.traViolsPage, this._tracearrModal.violsPage, totalP);
        this._traLoadTab('violations', modal());
      });
    });
  }

  // Tracearr, the History tab: filters, search, columns, period, a session in detail.
  _traWireHistory(body, m, modal, resolvePage) {
    // ── History tab ───────────────────────────────────────────────────────

    const histServer = body.querySelector('#tra-hist-server');
    if (histServer) {
      histServer.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.histServer = histServer.value || null;
        this._tracearrModal.histPage   = 0;
        this._tracearrModal.histNeedsRefetch = true;
        this._traLoadTab('history', modal());
      });
    }

    const histUser = body.querySelector('#tra-hist-user');
    if (histUser) {
      histUser.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.histUser = histUser.value || null;
        this._tracearrModal.histPage = 0;
        this._tracearrModal.histNeedsRefetch = true;
        this._traLoadTab('history', modal());
      });
    }

    const histMedia = body.querySelector('#tra-hist-media');
    if (histMedia) {
      histMedia.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.histMedia = histMedia.value || null;
        this._tracearrModal.histPage  = 0;
        this._tracearrModal.histNeedsRefetch = true;
        this._traLoadTab('history', modal());
      });
    }

    const histSearch = body.querySelector('#tra-hist-search');
    if (histSearch) {
      let t;
      histSearch.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (!this._tracearrModal) return;
          this._tracearrModal.histSearch = histSearch.value;
          this._tracearrModal.histPage   = 0;
          this._traRefetchHistorySearch(body);
        }, 320);
      });
    }

    body.querySelectorAll('[data-tra-hist-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const isMobH = this._isMob;
        const pp = this._tlCalcPerPage({ hasFilter: true, filterH: isMobH ? 120 : 40, rowH: isMobH ? 80 : 44, bar: 0 });
        const totalP = Math.max(1, Math.ceil((this._tracearrModal.histTotal || 0) / pp));
        this._tracearrModal.histPage = resolvePage(btn.dataset.traHistPage, this._tracearrModal.histPage, totalP);
        this._traLoadTab('history', modal());
      });
    });

    // ── History — columns button ──────────────────────────────────────────

    body.querySelector('#tra-hist-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tracearrModal) return;
      this._tracearrModal.traHistColsOpen = !this._tracearrModal.traHistColsOpen;
      const menu = body.querySelector('#tra-hist-cols-menu');
      if (menu) menu.style.display = this._tracearrModal.traHistColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    body.querySelectorAll('[data-tra-hist-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        if (!this._tracearrModal.traHistHiddenCols) this._tracearrModal.traHistHiddenCols = new Set();
        const col = item.dataset.traHistCol;
        const hidden = this._tracearrModal.traHistHiddenCols;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tracearrModal.traHistColsOpen = true;
        body.innerHTML = this._traBodyHistory();
        this._wireTracearrModalBody(body);
      });
    });

    // ── History — period filter ──────────────────────────────────────────

    // A picker now, not four pills: "all" is the off position.
    body.querySelector('#tra-hist-period')?.addEventListener('change', e => {
      if (!this._tracearrModal) return;
      const p = e.target.value;
      this._tracearrModal.histPeriod = p === 'all' ? null : p;
      this._tracearrModal.histPage   = 0;
      this._traLoadTab('history', modal());
    });

    // ── History — row click → detail view ───────────────────────────────────

    body.querySelectorAll('[data-tra-hist-row]').forEach(row => {
      row.addEventListener('click', async e => {
        if (e.target.closest('button,select,input,a')) return;
        const m = this._tracearrModal;
        if (!m) return;
        const rowId = row.dataset.traHistRow;
        const item = (m.histData || []).find(h => String(h.id) === rowId);
        if (!item) return;
        // Show basic data immediately, then enrich with session detail
        m.histDetailItem = { ...item };
        body.innerHTML = this._traBodyHistDetail();
        this._wireTracearrModalBody(body);
        this._traRefreshHdrActions(body);
        // Fetch poster with auth header → blob URL
        const imgEl = body.querySelector('#tra-hist-poster');
        if (imgEl && item.posterUrl) {
          const proxyUrl = `/api/arr_stack/tracearr${item.posterUrl.replace('/api', '')}`;
          const token = this._hass?.connection?.options?.auth?.data?.access_token || '';
          fetch(proxyUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then(r => r.ok ? r.blob() : null)
            .then(blob => { if (blob && imgEl.isConnected) imgEl.src = URL.createObjectURL(blob); })
            .catch(() => { if (imgEl.isConnected) imgEl.style.display = 'none'; });
        }
      });
    });

    const detailBack = body.querySelector('#tra-hist-detail-back');
    if (detailBack) {
      detailBack.addEventListener('click', () => {
        const m = this._tracearrModal;
        if (!m) return;
        m.histDetailItem = null;
        body.innerHTML = this._traBodyHistory();
        this._wireTracearrModalBody(body);
        this._traRefreshHdrActions(body);
      });
    }
  }

  // Tracearr, the Map tab: user and server pickers.
  _traWireMap(body, m, modal) {
    // ── Activity tab ──────────────────────────────────────────────────────

    // ── Map tab ──────────────────────────────────────────────────────────────

    // A picker now, not four pills.
    body.querySelector('#tra-map-period')?.addEventListener('change', e => {
      if (!this._tracearrModal) return;
      this._tracearrModal.mapData = null;
      this._tracearrModal.mapPeriod = e.target.value;
      this._traLoadTab('map', modal());
    });

    body.querySelectorAll('[data-tra-map-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = this._tracearrModal;
        if (!m) return;
        if (m.mapView === btn.dataset.traMapView) return;
        m.mapView = btn.dataset.traMapView;
        this._traMapPlotData(m);
        const nav = body.querySelector('#tra-map-view-nav');
        if (nav) {
          const from = this._navIndRect(nav);
          nav.querySelectorAll('.mt-nav-btn').forEach(b =>
            b.classList.toggle('is-on', b.dataset.traMapView === m.mapView));
          this._syncNavInd(nav, nav.querySelector('.mt-nav-btn.is-on'), from);
        }
      });
    });

    requestAnimationFrame(() => {
      const nav = body.querySelector('#tra-map-view-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });

    const mapUserSel = body.querySelector('#tra-map-user-sel');
    if (mapUserSel) {
      mapUserSel.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.mapUserId = mapUserSel.value || null;
        this._tracearrModal.mapData = null;
        this._traLoadTab('map', modal());
      });
    }

    const mapSrvSel = body.querySelector('#tra-map-srv-sel');
    if (mapSrvSel) {
      mapSrvSel.addEventListener('change', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.mapServerId = mapSrvSel.value || null;
        this._tracearrModal.mapData = null;
        this._traLoadTab('map', modal());
      });
    }

    modal()?.querySelectorAll('[data-tra-map-srv]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = this._tracearrModal; if (!m) return;
        const id = btn.dataset.traMapSrv;
        m.mapServerId = m.mapServerId === id ? null : id;
        m.mapData = null;
        this._traLoadTab('map', modal());
      });
    });
  }

  // Tracearr, the Activity tab.
  _traWireActivity(body, modal) {
    // ── Activity tab ─────────────────────────────────────────────────────────

    body.querySelectorAll('[data-tra-act-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.activityPeriod = btn.dataset.traActPeriod;
        this._traLoadTab('activity', modal());
      });
    });

    body.querySelectorAll('[data-tra-su-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.statsUsersPeriod = btn.dataset.traSuPeriod;
        this._tracearrModal.statsUsersData = null;
        this._traLoadTab('statsUsers', modal());
      });
    });
  }

  // Tracearr, the Devices tab.
  _traWireDevices(body, m, modal) {
    // ── Devices tab ──────────────────────────────────────────────────────────

    body.querySelectorAll('[data-tra-dev-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const m = this._tracearrModal;
        m.devicesPeriod = btn.dataset.traDevPeriod;
        m.devicesData = null; m.devicesHealth = null; m.devicesHotspots = null; m.devicesMatrix = null; m.devicesUsers = null;
        m.devHealthPage = 0; m.devMatrixPage = 0; m.devHotspotsPage = 0; m.devUsersPage = 0;
        this._traLoadTab('devices', modal());
      });
    });
  }

  // Tracearr, the Quality tab: codec switch, chart period, media type.
  _traWireQuality(body, m) {
    // ── Quality codec tab (Movies/TV vs Music) — partial refresh codecs only ─

    body.querySelectorAll('[data-tra-q-codec-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.qualityCodecTab = btn.dataset.traQCodecTab;
        try { localStorage.setItem('arr-tra-q-codec', this._tracearrModal.qualityCodecTab); } catch(_) {}
        const sec = body.querySelector('[data-tra-q-codecs]');
        if (sec) { sec.innerHTML = this._traQualCodecsCard(); this._wireTracearrModalBody(body); }
      });
    });

    // ── Quality chart period (client-side slice) — partial refresh evol only ─

    body.querySelectorAll('[data-tra-q-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.qualityPeriod = btn.dataset.traQPeriod;
        try { localStorage.setItem('arr-tra-q-period', this._tracearrModal.qualityPeriod); } catch(_) {}
        const sec = body.querySelector('[data-tra-q-evol]');
        if (sec) { sec.innerHTML = this._traQualEvolCard(); this._wireTracearrModalBody(body); }
      });
    });

    // ── Quality mediaType filter — re-fetches evol data, partial refresh evol ─

    body.querySelectorAll('[data-tra-q-mt]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.qualityMediaType = btn.dataset.traQMt || null;
        try { localStorage.setItem('arr-tra-q-mt', this._tracearrModal.qualityMediaType ?? ''); } catch(_) {}
        this._tracearrModal.qualityData = null;
        this._tracearrModal._qualityKey = null;
        const sec = body.querySelector('[data-tra-q-evol]');
        if (sec) {
          const m = this._tracearrModal;
          const _qSrvId = m.qualityServerId || null;
          const _qMt    = m.qualityMediaType || null;
          const _tz     = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
          const _qQ     = ['period=all', `timezone=${_tz}`, _qSrvId && `serverId=${_qSrvId}`, _qMt && `mediaType=${_qMt}`].filter(Boolean).join('&');
          const qr = await this._traLibFetch(`quality?${_qQ}`);
          if (!this._tracearrModal) return;
          m.qualityData = qr;
          m._qualityKey = `${_qSrvId}|${_qMt}`;
          sec.innerHTML = this._traQualEvolCard();
          this._wireTracearrModalBody(body);
        }
      });
    });
  }

  // Tracearr, the Storage tab: chart period and the prediction.
  _traWireStorage(body) {
    // ── Storage chart period + prediction toggle ──────────────────────────

    body.querySelectorAll('[data-tra-stor-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.storagePeriod = btn.dataset.traStorPeriod;
        try { localStorage.setItem('arr-tra-stor-period', this._tracearrModal.storagePeriod); } catch(_) {}
        body.innerHTML = this._traBodyStorage();
        this._wireTracearrModalBody(body);
      });
    });

    body.querySelector('[data-tra-stor-pred]')?.addEventListener('click', () => {
      if (!this._tracearrModal) return;
      this._tracearrModal.storagePredictions = !this._tracearrModal.storagePredictions;
      try { localStorage.setItem('arr-tra-stor-pred', this._tracearrModal.storagePredictions ? '1' : '0'); } catch(_) {}
      body.innerHTML = this._traBodyStorage();
      this._wireTracearrModalBody(body);
    });
  }

  // Tracearr, the Watch tab: movies or shows, period.
  _traWireWatch(body, m, _segTo) {
    // ── Watch tab: top-tab toggle (movies/shows) ─────────────────────────

    body.querySelectorAll('[data-tra-w-top]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.watchTopTab = btn.dataset.traWTop;
        // Partial refresh: only update data rows + button active states
        _segTo(btn);
        const target = body.querySelector('[data-tra-watch-top]');
        if (target) target.innerHTML = this._traWatchTopRowsHtml();
      });
    });

    // ── Watch tab: period filter (7d/30d/90d/all) — re-fetches top ──────

    body.querySelectorAll('[data-tra-w-period]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._tracearrModal;
        if (!m) return;
        m.watchPeriod = btn.dataset.traWPeriod;
        m.watchTopMovies = null; m.watchTopShows = null; m.watchSrvPeriodKey = null;
        // Update button active states immediately
        _segTo(btn);
        // Show loading only in the rows area
        const target = body.querySelector('[data-tra-watch-top]');
        if (target) target.innerHTML = `<div style="grid-column:1/-1;padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:11px">${this._t('loading')}</div>`;
        const _wSrvId = m.watchServerId || m.qualityServerId || m.selectedServerId || null;
        const _wSrvQ  = _wSrvId ? `&serverId=${_wSrvId}` : '';
        const [mov, sh] = await Promise.all([
          this._traLibFetch(`top-movies?period=${m.watchPeriod}&sortBy=plays&sortOrder=desc&page=1&pageSize=5${_wSrvQ}`),
          this._traLibFetch(`top-shows?period=${m.watchPeriod}&sortBy=plays&sortOrder=desc&page=1&pageSize=5${_wSrvQ}`),
        ]);
        if (!this._tracearrModal) return;
        m.watchTopMovies    = mov?.items || mov || [];
        m.watchTopShows     = sh?.items  || sh  || [];
        m.watchSrvPeriodKey = `${_wSrvId}|${m.watchPeriod}`;
        const t2 = body.querySelector('[data-tra-watch-top]');
        if (t2) t2.innerHTML = this._traWatchTopRowsHtml();
      });
    });
  }

  // Tracearr, the stale titles: sub-tabs, sort, paging.
  _traWireStale(body, m, resolvePage) {
    // ── Stale content sub-tabs ────────────────────────────────────────────

    body.querySelector('#tra-stale-type')?.addEventListener('change', e => {
      if (!this._tracearrModal) return;
      this._tracearrModal.staleMediaType = e.target.value || null;
      this._tracearrModal.stalePage = 0;
      this._traRefreshStale(body);
    });

    {
      // Debounced, and the input node survives the refresh, so the keyboard
      // stays open on a phone while typing.
      // The input survives the refresh now, so it must not collect a second
      // listener every time the results are patched.
      let _staleTimer = null;
      const _si = body.querySelector('#tra-stale-search');
      if (_si && !_si._traWired) { _si._traWired = true; _si.addEventListener('input', e => {
        if (!this._tracearrModal) return;
        const v = e.target.value || '';
        clearTimeout(_staleTimer);
        _staleTimer = setTimeout(() => {
          if (!this._tracearrModal) return;
          this._tracearrModal.staleSearch = v;
          this._tracearrModal.stalePage = 0;
          this._traRefreshStale(body);
        }, 300);
      }); }
    }

    body.querySelector('#tra-stale-months')?.addEventListener('change', e => {
      if (!this._tracearrModal) return;
      this._tracearrModal.staleMonths = Number(e.target.value) || 3;
      this._tracearrModal.stalePage = 0;
      this._tracearrModal.staleRaw = null;
      this._traRefreshStale(body);
    });

    body.querySelectorAll('[data-tra-stale-sort]').forEach(th => {
      th.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const m = this._tracearrModal;
        const col = th.dataset.traStaleSort;
        if ((m.staleSort || 'fileSize') === col) {
          m.staleOrder = m.staleOrder === 'asc' ? 'desc' : 'asc';
        } else {
          m.staleSort = col; m.staleOrder = 'desc';
        }
        m.stalePage = 0;
        this._traRefreshStale(body);
      });
    });

    // A picker now, not two pills.
    body.querySelector('#tra-stale-cat')?.addEventListener('change', e => {
      if (!this._tracearrModal) return;
      this._tracearrModal.staleCategory = e.target.value;
      this._tracearrModal.stalePage = 0;
      this._tracearrModal.staleRaw = null;
      this._traRefreshStale(body);
    });

    body.querySelectorAll('[data-tra-stale-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        const m  = this._tracearrModal;
        const pp = m.stalePageSize || 10;
        const totalP = Math.max(1, Math.ceil(m.staleTotal / pp));
        m.stalePage = resolvePage(btn.dataset.traStalePage, m.stalePage, totalP);
        this._traRefreshStale(body);
      });
    });
  }

  // Tracearr, the Bandwidth tab: paging through users.
  _traWireBandwidth(body, m, resolvePage) {
    // ── Bandwidth users paging ────────────────────────────────────────────
    body.querySelectorAll('[data-tra-bw-users-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = this._tracearrModal; if (!m) return;
        const users = Array.isArray(m.bwUsers) ? m.bwUsers : (m.bwUsers?.data || m.bwUsers?.users || []);
        const pp    = m.bwPageSize || 5;
        const pages = Math.max(1, Math.ceil(users.length / pp));
        m.bwUsersPage = resolvePage(btn.dataset.traBwUsersPage, m.bwUsersPage || 0, pages);
        body.innerHTML = this._traBodyBandwidth();
        this._wireTracearrModalBody(body);
      });
    });

    body.querySelectorAll('[data-tra-su-ru-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = this._tracearrModal; if (!m) return;
        const isMob  = this._isMob;
        const ruRowH = isMob ? 52 : 56;
        const ruPP   = this._tlCalcPerPage({ hasFilter: false, filterH: 0, rowH: ruRowH, bar: 0 });
        const runners = (m.statsUsersData || []).slice(3);
        const pages   = Math.max(1, Math.ceil(runners.length / ruPP));
        m.statsUsersRunnerPage = resolvePage(btn.dataset.traSuRuPage, m.statsUsersRunnerPage || 0, pages);
        body.innerHTML = this._traBodyStatsUsers();
        this._wireTracearrModalBody(body);
      });
    });
  }

}

export const wireTracearrTabsMixin = _WireTracearrTabsMethods.prototype;
