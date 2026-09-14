// ──────────────────────────────────────────────────────────────────────────
// Activity wire — card clicks, modal event handling
// ──────────────────────────────────────────────────────────────────────────
// Note: innerHTML usage mirrors the established pattern in tautulli.js/jellystat.js.
// All dynamic content originates from the arr-stack proxy (same-origin HA API).

class _WireActivityMethods {

  _wireActivityPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._actWired) return;
    right._actWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-act-open]');
      if (!card) return;
      this._openActivityModal(card.dataset.actOpen);
    });
  }

  async _openActivityModal(tab) {
    this._markActivated();
    tab = tab || 'queue';
    const _defaultCols = new Set(['source', 'quality', 'size', 'timeleft', 'formats', 'status']);
    const _savedCols = (() => {
      try {
        const s = localStorage.getItem('arr-stack-queue-cols');
        if (s) { const arr = JSON.parse(s); if (arr.length) { const set = new Set(arr); if (!set.has('formats')) { set.add('formats'); try { localStorage.setItem('arr-stack-queue-cols', JSON.stringify([...set])); } catch {} } return set; } }
      } catch {}
      return null;
    })();
    this._activityModal = {
      tab,
      queueData:       null,
      histData:        null,
      blData:          null,
      histFilter:      'all',
      queuePage:       0,
      queuePerPage:    15,
      histPage:        0,
      histPerPage:     15,
      blPage:          0,
      blPerPage:       15,
      queueCols:        _savedCols || _defaultCols,
      queueDeleteMode:  false,
      queueSearch:         '',
      queueFilterSvc:      'all',
      queueFilterSts:      'all',
      queueFilterQuality:  'all',
      queueFilterProtocol: 'all',
      queueFilterIndexer:  'all',
      queueFilterClient:   'all',
      histFilterSvc:       'all',
      histFilterQuality:   'all',
      histFilterLang:      'all',
      histFilterFormat:    'all',
      histFilterClient:    'all',
      histFilterIndexer:   'all',
      histFilterRelgroup:  'all',
      histSearch:       '',
      histSort:         'date',
      histSortDir:      'desc',
      histCols:         (() => { try { const s = localStorage.getItem('arr-stack-hist-cols'); if (s) { const a = JSON.parse(s); if (a.length) return new Set(a); } } catch {} return new Set(['event','quality','date']); })(),
      blFilterSvc:      'all',
      blFilterProto:    'all',
      blSearch:         '',
      blCols:          (() => { try { const s = localStorage.getItem('arr-stack-bl-cols'); if (s) { const a = JSON.parse(s); if (a.length) return new Set(a); } } catch {} return new Set(['quality', 'date', 'source']); })(),
      blSort:          'date',
      blSortDir:       'desc',
      blDeleteMode:    false,
      blFilterQuality: 'all',
      blFilterLang:    'all',
      blFilterFormat:  'all',
      blFilterIndexer: 'all',
      missingPage:          0,
      missingPerPage:       15,
      missingSearch:        '',
      missingFilterSvc:       'all',
      missingFilterProfile:   'all',
      missingFilterMonitored: 'all',
      missingSort:            'added',
      missingSortDir:       'desc',
      missingExpanded: new Set(),
      missingCols: (() => { try { const s = localStorage.getItem('arr-stack-missing-cols'); if (s) { const a = JSON.parse(s); if (a.length) return new Set(a); } } catch {} return new Set(['monitored', 'source', 'year', 'missing']); })(),
    };
    this.shadowRoot.querySelector('[data-act-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._actModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);

    // Compute perPage from actual body height so content fits without scrollbar
    const bodyEl = el.querySelector('#act-body');
    if (bodyEl) {
      const bodyH  = bodyEl.clientHeight || 500;
      const mobile = this._isMob;
      const rowH      = mobile ? 58 : 40;    // px per row
      const ovhFlt    = mobile ? 80 : 78;    // filter pills + pagination
      const ovhQ      = mobile ? 46 : 68;    // queue: header + pagination (no filter pills)
      const ovhMissing = mobile ? 130 : 120; // 2 toolbar rows + thead + pagination
      const perPageFlt     = Math.max(4, Math.floor((bodyH - ovhFlt)     / rowH));
      const perPageQueue   = Math.max(4, Math.floor((bodyH - ovhQ)       / rowH));
      const perPageMissing = Math.max(4, Math.floor((bodyH - ovhMissing) / rowH));
      this._activityModal.histPerPage    = perPageFlt;
      this._activityModal.blPerPage      = perPageFlt;
      this._activityModal.queuePerPage   = perPageQueue;
      this._activityModal.missingPerPage     = perPageMissing;
      this._activityModal.missingPerPageBase = perPageMissing;
    }

    this._wireActivityModal(el);
    await this._actLoadTab(tab, el);
  }

  _closeActivityModal() {
    this.shadowRoot.querySelector('[data-act-modal]')?.remove();
    this._activityModal = null;
  }

  _wireActivityModal(el) {
    el.querySelector('#act-close')?.addEventListener('click', () => {
      const back = this._actPopupReturn;
      this._actPopupReturn = null;
      this._closeActivityModal();
      if (back) this._openPopup(back.type, back.tmdbId, back.tvdbId, back.title);
    });
    el.addEventListener('click', e => {
      if (e.target === el) this._closeActivityModal();
    });
    // Delegated on the header area: the nav is rewritten whenever the tab
    // changes, because on a phone only the active tab carries its label.
    el.querySelector('#act-nav-area')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-act-tab]');
      if (!btn || !this._activityModal) return;
      const t = btn.dataset.actTab;
      if (!t || t === this._activityModal.tab) return;
      const from = this._navIndRect(el.querySelector('#act-nav'));
      this._activityModal.tab = t;
      el.querySelector('#act-nav-area').innerHTML = this._actModalNavHtml(t);
      const nav = el.querySelector('#act-nav');
      this._syncNavInd(nav, nav?.querySelector(`.mt-nav-btn[data-act-tab="${t}"]`), from);
      await this._actLoadTab(t, el);
    });
    requestAnimationFrame(() => {
      const nav = el.querySelector('#act-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });
  }

  async _actLoadTab(tab, el) {
    const m = this._activityModal;
    if (!m) return;
    const body = el.querySelector('#act-body');
    if (!body) return;
    body.innerHTML = '<div class="is-loading"><span>Loading…</span></div>';

    const hasR2 = this._radarr2Configured === true;
    const hasS2 = this._sonarr2Configured === true;
    const hasLi = this._lidarrConfigured !== false;

    if (tab === 'queue') {
      const calls = [
        this._callApi('GET', 'arr_stack/radarr/queue?includeUnknownMovieItems=true'),
        this._callApi('GET', 'arr_stack/sonarr/queue?includeUnknownSeriesItems=true'),
        hasR2 ? this._callApi('GET', 'arr_stack/radarr2/queue?includeUnknownMovieItems=true') : Promise.resolve(null),
        hasS2 ? this._callApi('GET', 'arr_stack/sonarr2/queue?includeUnknownSeriesItems=true') : Promise.resolve(null),
        hasLi ? this._callApi('GET', 'arr_stack/lidarr/queue?pageSize=100') : Promise.resolve(null),
      ];
      const [rq, sq, rq2, sq2, lq] = await Promise.allSettled(calls);
      if (!this._activityModal) return;
      const _toArr = v => Array.isArray(v) ? v : (Array.isArray(v?.records) ? v.records : []);
      // Enrich Radarr records with movie title from already-loaded library
      const rMovieMap  = new Map((this._radarr  || []).map(m => [m.id, m.title]));
      const rMovieMap2 = new Map((this._radarr2 || []).map(m => [m.id, m.title]));
      const rRaw  = rq.status  === 'fulfilled' && rq.value  ? _toArr(rq.value)  : [];
      const rRaw2 = rq2.status === 'fulfilled' && rq2.value ? _toArr(rq2.value) : [];
      const rRecords = [
        ...rRaw.map(r  => ({ ...r,  _svc: 'radarr',  _enrichedTitle: rMovieMap.get(r.movieId)   || r.movie?.title || r.title || null })),
        ...rRaw2.map(r => ({ ...r,  _svc: 'radarr2', _enrichedTitle: rMovieMap2.get(r.movieId)  || r.movie?.title || r.title || null })),
      ];
      // Enrich Sonarr records with series title from already-loaded library
      const sSeriesMap  = new Map((this._sonarr  || []).map(s => [s.id, s.title]));
      const sSeriesMap2 = new Map((this._sonarr2 || []).map(s => [s.id, s.title]));
      const sRaw  = sq.status  === 'fulfilled' && sq.value  ? _toArr(sq.value)  : [];
      const sRaw2 = sq2.status === 'fulfilled' && sq2.value ? _toArr(sq2.value) : [];
      const sRecords = [
        ...sRaw.map(r  => ({ ...r, _svc: 'sonarr',  _enrichedTitle: sSeriesMap.get(r.seriesId)  || r.series?.title || r.title || null })),
        ...sRaw2.map(r => ({ ...r, _svc: 'sonarr2', _enrichedTitle: sSeriesMap2.get(r.seriesId) || r.series?.title || r.title || null })),
      ];
      // Fetch MI rejection reasons for bad items in parallel
      const _isBadItem = r => r.trackedDownloadStatus === 'warning' || r.trackedDownloadStatus === 'error' || r.trackedDownloadState === 'importFailed' || r.status === 'failed';
      const badItems = [
        ...rRecords.filter(r => _isBadItem(r) && r.downloadId).map(r => ({ r, svc: r._svc, qs: `downloadId=${encodeURIComponent(r.downloadId)}&movieId=${r.movieId||''}` })),
        ...sRecords.filter(r => _isBadItem(r) && r.downloadId).map(r => ({ r, svc: r._svc, qs: `downloadId=${encodeURIComponent(r.downloadId)}&seriesId=${r.seriesId||''}` })),
      ];
      if (badItems.length) {
        const miResults = await Promise.allSettled(badItems.map(b => this._callApi('GET', `arr_stack/${b.svc}/manualimport?${b.qs}`)));
        miResults.forEach((res, i) => {
          if (res.status === 'fulfilled') {
            const candidates = Array.isArray(res.value) ? res.value : [];
            const rej = candidates[0]?.rejections?.[0]?.reason;
            if (rej) badItems[i].r._miRejection = rej;
          }
        });
      }
      const lRaw = lq?.status === 'fulfilled' && lq.value ? _toArr(lq.value) : [];
      const lArtists = this._lidarrArtists || new Map();
      const lRecords = lRaw.map(r => {
        const who = r.artist?.artistName || lArtists.get(r.artistId)?.artistName || '';
        const alb = r.album?.title || r.title || '';
        return { ...r, _svc: 'lidarr', _enrichedTitle: [who, alb].filter(Boolean).join(' — ') || r.title || null };
      });
      m.queueData = { radarr: rRecords, sonarr: [...sRecords, ...lRecords] };
      this._actRenderQueue(body, el);
    }
    else if (tab === 'history') {
      const et = m.histFilter === 'all' ? '' : ('&eventType=' + encodeURIComponent(m.histFilter));
      const calls = [
        this._callApi('GET', 'arr_stack/radarr/activity/history?page=1&pageSize=500&sortKey=date&sortDir=desc' + et),
        this._callApi('GET', 'arr_stack/sonarr/activity/history?page=1&pageSize=100&sortKey=date&sortDir=desc' + et),
        hasR2 ? this._callApi('GET', 'arr_stack/radarr2/activity/history?page=1&pageSize=200&sortKey=date&sortDir=desc' + et) : Promise.resolve(null),
        hasS2 ? this._callApi('GET', 'arr_stack/sonarr2/activity/history?page=1&pageSize=100&sortKey=date&sortDir=desc' + et) : Promise.resolve(null),
        hasLi ? this._callApi('GET', 'arr_stack/lidarr/activity/history?page=1&pageSize=100&sortKey=date&sortDir=desc' + et) : Promise.resolve(null),
      ];
      const [rh, sh, rh2, sh2, lh] = await Promise.allSettled(calls);
      if (!this._activityModal) return;
      const _mergeHist = (a, b) => {
        if (!a && !b) return null;
        const recs = [...(a?.records || []), ...(b?.records || [])];
        return { records: recs, totalRecords: recs.length };
      };
      const _lidarrHist = (raw) => {
        if (!raw?.records) return null;
        const artists = this._lidarrArtists || new Map();
        return { records: raw.records.map(r => {
          const who = r.artist?.artistName || artists.get(r.artistId)?.artistName || '';
          const alb = r.album?.title || '';
          return { ...r, _svc: 'lidarr', _enrichedTitle: [who, alb].filter(Boolean).join(' — ') || r.sourceTitle };
        }) };
      };
      m.histData = {
        radarr: _mergeHist(rh.status === 'fulfilled' ? rh.value : null, rh2.status === 'fulfilled' ? rh2.value : null),
        sonarr: _mergeHist(
          _mergeHist(sh.status === 'fulfilled' ? sh.value : null, sh2.status === 'fulfilled' ? sh2.value : null),
          _lidarrHist(lh.status === 'fulfilled' ? lh.value : null),
        ),
      };
      this._actSetBodyHtml(body, this._actHistoryTabHtml(m.histData.radarr, m.histData.sonarr, m.histFilter, m.histPage, m.histPerPage));
      this._wireActBody(body, el, 'history');
    }
    else if (tab === 'blocklist') {
      const calls = [
        this._callApi('GET', 'arr_stack/radarr/activity/blocklist?page=1&pageSize=100'),
        this._callApi('GET', 'arr_stack/sonarr/activity/blocklist?page=1&pageSize=100'),
        hasR2 ? this._callApi('GET', 'arr_stack/radarr2/activity/blocklist?page=1&pageSize=100') : Promise.resolve(null),
        hasS2 ? this._callApi('GET', 'arr_stack/sonarr2/activity/blocklist?page=1&pageSize=100') : Promise.resolve(null),
        hasLi ? this._callApi('GET', 'arr_stack/lidarr/activity/blocklist?page=1&pageSize=100') : Promise.resolve(null),
      ];
      const [rb, sb, rb2, sb2, lb] = await Promise.allSettled(calls);
      if (!this._activityModal) return;
      const _mergeBl = (a, b) => {
        if (!a && !b) return null;
        const recs = [...(a?.records || []), ...(b?.records || [])];
        return { records: recs, totalRecords: recs.length };
      };
      const _lidarrBl = (raw) => {
        if (!raw?.records) return null;
        const artists = this._lidarrArtists || new Map();
        return { records: raw.records.map(r => ({
          ...r, _svc: 'lidarr',
          _enrichedTitle: artists.get(r.artistId)?.artistName || r.artist?.artistName || r.sourceTitle,
        })) };
      };
      m.blData = {
        radarr: _mergeBl(rb.status === 'fulfilled' ? rb.value : null, rb2.status === 'fulfilled' ? rb2.value : null),
        sonarr: _mergeBl(
          _mergeBl(sb.status === 'fulfilled' ? sb.value : null, sb2.status === 'fulfilled' ? sb2.value : null),
          _lidarrBl(lb.status === 'fulfilled' ? lb.value : null),
        ),
      };
      this._actSetBodyHtml(body, this._actBlocklistTabHtml(m.blData.radarr, m.blData.sonarr, m.blPage, m.blPerPage));
      this._wireActBody(body, el, 'blocklist');
    }
    else if (tab === 'missing') {
      if (!this._activityModal) return;
      await Promise.allSettled([
        this._fetchSonarrProfiles(),
        this._fetchRadarrProfiles(),
      ]);
      if (!this._activityModal) return;
      this._computeActMissingCache();
      this._actRenderMissing(body, el);
    }
  }

  _actRenderQueue(body, el, pageOverride) {
    const m = this._activityModal;
    if (!m) return;
    if (pageOverride !== undefined) m.queuePage = pageOverride;
    body.innerHTML = this._actQueueTabHtml(m.queueData?.radarr || [], m.queueData?.sonarr || [], m.queuePage, m.queuePerPage, m.queueCols);
    requestAnimationFrame(() => {
      if (!this._activityModal) return;
      const clip = body.querySelector('[data-act-clip]');
      if (clip) {
        const m2 = this._activityModal;
        // Reserve space for pagination controls even if not yet rendered (totPages may flip to >1).
        // Without this, when totPages===1 the clip fills full height and no overflow is detected —
        // but once we add one more page the clip shrinks by ~pagH and the last row gets clipped.
        const isMob = !clip.querySelector('table');
        // Reserve space for pagination bar (it doesn't exist yet when totPages=1,
        // but once we reduce perPage below totalItems it will appear and take ~pagH px).
        const pagH = isMob ? 44 : 40;
        const effectiveClipB = clip.getBoundingClientRect().bottom - pagH;
        const items = isMob
          ? [...clip.children]
          : [...clip.querySelectorAll('tbody tr')];
        // Count items that physically fit within the effective clip area.
        // Use this as the new perPage so pagination appears for the remaining items.
        const fitting = items.filter(el => el.getBoundingClientRect().bottom <= effectiveClipB + 2).length;
        if (fitting < items.length && fitting >= 1) {
          m2.queuePerPage = fitting;
          body.innerHTML = this._actQueueTabHtml(m2.queueData?.radarr || [], m2.queueData?.sonarr || [], m2.queuePage, m2.queuePerPage, m2.queueCols);
        }
      }
      this._wireActBody(body, el, 'queue');
    });
  }

  _actRenderMissing(body, el, pageOverride, skipBaseReset) {
    const m = this._activityModal;
    if (!m) return;
    if (pageOverride !== undefined) m.missingPage = pageOverride;
    if (!skipBaseReset && m.missingPerPageBase) m.missingPerPage = m.missingPerPageBase;
    const c = this._actMissingCache;
    body.innerHTML = this._actMissingTabHtml(c?.rRecs||[], c?.sRecs||[], m.missingPage, m.missingPerPage, m.missingCols);
    requestAnimationFrame(() => {
      if (!this._activityModal) return;
      const clip = body.querySelector('[data-act-clip]');
      if (clip) {
        const m2 = this._activityModal;
        const clipB = clip.getBoundingClientRect().bottom;
        const isMobileClip = !clip.querySelector('table');
        const items = isMobileClip
          ? [...clip.children]
          : [...clip.querySelectorAll('tbody tr:not([data-act-season])')];
        const isExpandedRow = el => isMobileClip && !!el.querySelector('[data-act-season]');
        const hasExpandedRow = isMobileClip
          ? items.some(el => isExpandedRow(el))
          : !!clip.querySelector('[data-act-season]');
        // Skip perPage calibration when expanded rows present — calibration re-renders body which
        // stales the clip reference, making the subsequent expandedOverflow check always false.
        if (!hasExpandedRow) {
          const overflowing = items.filter(el => el.getBoundingClientRect().bottom > clipB + 2).length;
          if (overflowing > 0) {
            this._activityModal.missingPerPage = Math.max(4, this._activityModal.missingPerPage - overflowing);
            const m2 = this._activityModal;
            const c2 = this._actMissingCache;
            body.innerHTML = this._actMissingTabHtml(c2?.rRecs||[], c2?.sRecs||[], m2.missingPage, m2.missingPerPage, m2.missingCols);
          }
        }
        const expandedOverflow = isMobileClip
          ? hasExpandedRow && items.some(el => isExpandedRow(el) && el.getBoundingClientRect().bottom > clipB + 2)
          : hasExpandedRow && [...clip.querySelectorAll('[data-act-season]')].some(el => el.getBoundingClientRect().bottom > clipB + 2);
        clip.style.overflowY = expandedOverflow ? 'auto' : '';
        if (isMobileClip) clip.style.paddingRight = expandedOverflow ? '14px' : '';
        if (expandedOverflow && isMobileClip) {
          const expandedRowEl = items.find(el => isExpandedRow(el));
          if (expandedRowEl) {
            const rowBottom = expandedRowEl.getBoundingClientRect().bottom;
            const overflow = rowBottom - clipB;
            if (overflow > 0) clip.scrollTop = overflow + 8;
          }
        }
      }
      this._wireActBody(body, el, 'missing');
    });
  }

  _computeActMissingCache() {
    const _buildProfMap = (...profArrays) => {
      const map = new Map();
      for (const arr of profArrays) for (const p of (arr || [])) if (p.id != null && p.name) map.set(p.id, p.name);
      return map;
    };
    const rProfMap = _buildProfMap(this._radarrProfiles, this._radarr2Profiles);
    const sProfMap = _buildProfMap(this._sonarrProfiles, this._sonarr2Profiles);
    const rRecs = [
      ...(this._radarr  || []).filter(m => !m.hasFile).map(m => ({ ...m, _inst: 'radarr',  _profileName: rProfMap.get(m.qualityProfileId) || '' })),
      ...(this._radarr2 || []).filter(m => !m.hasFile).map(m => ({ ...m, _inst: 'radarr2', _profileName: rProfMap.get(m.qualityProfileId) || '' })),
    ];
    const sRecs = [
      ...(this._sonarr  || []).map(s => { const s0 = (s.seasons||[]).find(ss=>ss.seasonNumber===0); const mc = Math.max(0, ((s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)) - ((s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0))); const tc = Math.max(0,(s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)); const fc = Math.max(0,(s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0)); return { ...s, _inst: 'sonarr',  _profileName: sProfMap.get(s.qualityProfileId) || '', _missingCount: mc, _totalCount: tc, _fileCount: fc }; }).filter(s => s._missingCount > 0),
      ...(this._sonarr2 || []).map(s => { const s0 = (s.seasons||[]).find(ss=>ss.seasonNumber===0); const mc = Math.max(0, ((s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)) - ((s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0))); const tc = Math.max(0,(s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)); const fc = Math.max(0,(s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0)); return { ...s, _inst: 'sonarr2', _profileName: sProfMap.get(s.qualityProfileId) || '', _missingCount: mc, _totalCount: tc, _fileCount: fc }; }).filter(s => s._missingCount > 0),
    ];
    this._actMissingCache = { movieCount: rRecs.length, seriesCount: sRecs.length, rRecs, sRecs };
  }

  _wireActBody(body, modalEl, tab) {
    const m = this._activityModal;
    if (!m) return;
    if (body._wireAbort) body._wireAbort.abort();
    body._wireAbort = new AbortController();
    const signal = body._wireAbort.signal;

    // Swipe pagination (mobile)
    const _clipEl = body.querySelector('[data-act-clip]');
    if (_clipEl && this._isMob) {
      let _tsx = 0;
      _clipEl.addEventListener('touchstart', e => { _tsx = e.touches[0].clientX; }, { signal, passive: true });
      _clipEl.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - _tsx;
        if (Math.abs(dx) < 50) return;
        const dir  = dx < 0 ? 'next' : 'prev';
        const attr = tab === 'queue' ? 'act-queue-page' : tab === 'history' ? 'act-hist-page' : tab === 'missing' ? 'act-missing-page' : 'act-bl-page';
        body.querySelector(`[data-${attr}="${dir}"]`)?.click();
      }, { signal });
    }

    if (tab === 'queue') {
      this._actWireQueueTab(body, modalEl, signal);
    }

    if (tab === 'history') {
      this._actWireHistoryTab(body, modalEl, signal);
    }

    if (tab === 'missing') {
      this._actWireMissingTab(body, modalEl, m, signal);
    }

    if (tab === 'blocklist') {
      this._actWireBlocklistTab(body, modalEl, signal);
    }
  }

  // Drop the custom-format tags that don't fit the cell's two lines and replace
  // them with a "+N" chip, so a long format list never renders half-clipped.
  _actFitFmtTags(root) {
    root.querySelectorAll('.act-fmt-tags').forEach(wrap => {
      if (wrap.querySelector('.act-fmt-more')) return;
      if (wrap.scrollHeight <= wrap.clientHeight) return;
      const tags = [...wrap.querySelectorAll('.act-fmt-tag')];
      const more = document.createElement('span');
      more.className = 'act-fmt-tag act-fmt-more ui-badge';
      more.style.cssText = '--bdg:150,150,165';
      wrap.appendChild(more);
      let hidden = 0;
      while (tags.length > 1 && wrap.scrollHeight > wrap.clientHeight) {
        tags.pop().remove();
        hidden++;
        more.textContent = `+${hidden}`;
      }
      if (!hidden) more.remove();
    });
  }

  // Set body content and clip any partially-visible rows
  _actSetBodyHtml(body, html) {
    body.innerHTML = html;
    requestAnimationFrame(() => {
      this._actFitFmtTags(body);
      const clip = body.querySelector('[data-act-clip]');
      if (!clip || clip.hasAttribute('data-act-notrim')) return;
      const clipBottom = clip.getBoundingClientRect().bottom;
      // Desktop tables — clip partial <tr> rows (skip season sub-rows)
      clip.querySelectorAll('tbody tr').forEach(row => {
        if (row.dataset.actSeason !== undefined) return;
        if (row.getBoundingClientRect().bottom > clipBottom + 1) row.remove();
      });
      // Mobile — clip partial direct <div> children
      if (!clip.querySelector('table')) {
        [...clip.children].forEach(child => {
          if (child.getBoundingClientRect().bottom > clipBottom + 1) child.remove();
        });
      }
    });
  }

  // The import closes its dialog and then works in the background, so without
  // this nothing said whether it had started or finished. On desktop the pill
  // sits in the modal header next to the tabs; a phone header has no room for
  // it, so there it floats over the bottom of the screen instead.
  _actShowStatus(msg, opts = {}, duration = 4000) {
    const host = this.shadowRoot;
    if (!host) return;
    host.querySelector('[data-act-status]')?.remove();
    clearTimeout(this._actStatusTimer);
    if (!msg) return;
    const rgb = opts.err ? '248,113,113' : (opts.spin ? '96,165,250' : '52,211,153');
    const slot = this._isMob ? null : host.querySelector('#act-status-slot');
    const pos = slot
      ? ''
      : `position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:1300;box-shadow:0 4px 18px rgba(0,0,0,0.5);`;
    const el = document.createElement('div');
    el.innerHTML = `<div data-act-status style="${pos}display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:rgba(${rgb},0.95);background:${this._isDay ? '#fafafc' : '#14141a'};border:1px solid rgba(${rgb},0.45);border-radius:999px;padding:6px 16px;white-space:nowrap">
      ${opts.spin ? '<span class="is-spin"></span>' : ''}${this._escHtml(msg)}
    </div>`;
    (slot || host).appendChild(el.firstElementChild);
    if (!duration) return;
    this._actStatusTimer = setTimeout(() => {
      this.shadowRoot?.querySelector('[data-act-status]')?.remove();
    }, duration);
  }

  // Pulls the queue state the Activity card renders from and repaints it, so an
  // action taken in the modal shows on the dashboard without waiting for a poll.
  async _refreshQueueCounters() {
    await Promise.all([
      this._fetchRadarrQueue(),
      this._fetchRadarr2Queue(),
      this._fetchSonarrQueue('sonarr'),
      this._fetchSonarrQueue('sonarr2'),
    ]).catch(() => {});
    this._reRenderSection('activity');
  }
}

export const wireActivityMixin = _WireActivityMethods.prototype;
