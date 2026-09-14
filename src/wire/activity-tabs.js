// Activity, each tab's table body: filters, columns, paging, row actions. Split out of wire/activity.js.

class _WireActivityTabsMethods {

  // Activity, the Queue tab's table: filters, columns, paging, row actions.
  _actWireQueueTab(body, modalEl, signal) {
    body.querySelector('#act-queue-search')?.addEventListener('input', e => {
      if (!this._activityModal) return;
      const val = e.target.value;
      this._activityModal.queueSearch = val;
      this._activityModal.queuePage = 0;
      const m2 = this._activityModal;
      // Patch only the results subtree — leaves #act-queue-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'act-queue-results-wrap', () => this._actQueueTabHtml(m2.queueData?.radarr||[], m2.queueData?.sonarr||[], 0, m2.queuePerPage, m2.queueCols));
      requestAnimationFrame(() => this._actFitFmtTags(body));
      this._wireActBody(body, modalEl, 'queue');
    });


    // Wire Columns button
    body.querySelector('#act-queue-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openQueueColPicker(e.currentTarget, modalEl);
    });

    const _qRerender = () => {
      const m2 = this._activityModal;
      if (!m2) return;
      m2.queuePage = 0;
      this._actSetBodyHtml(body, this._actQueueTabHtml(m2.queueData?.radarr||[], m2.queueData?.sonarr||[], 0, m2.queuePerPage, m2.queueCols));
      this._wireActBody(body, modalEl, 'queue');
    };
    [
      ['#act-queue-svc',     'queueFilterSvc'],
      ['#act-queue-sts',     'queueFilterSts'],
      ['#act-queue-quality', 'queueFilterQuality'],
      ['#act-queue-proto',   'queueFilterProtocol'],
      ['#act-queue-indexer', 'queueFilterIndexer'],
      ['#act-queue-client',  'queueFilterClient'],
    ].forEach(([sel, key]) => {
      body.querySelector(sel)?.addEventListener('change', e => {
        const m2 = this._activityModal;
        if (!m2) return;
        m2[key] = e.target.value;
        _qRerender();
      });
    });

    body.addEventListener('click', async e => {
      if (!this._activityModal) return;
      const removeBtn = e.target.closest('.act-remove-btn');
      if (removeBtn) {
        this._openQueueRemoveModal(removeBtn.dataset, modalEl);
        return;
      }
      const miBtn = e.target.closest('.act-mi-btn');
      if (miBtn) {
        await this._openManualImportModal(miBtn, modalEl);
        return;
      }
      const pBtn = e.target.closest('[data-act-queue-page]');
      if (pBtn) {
        const m2  = this._activityModal;
        const all = [...(m2.queueData?.radarr || []), ...(m2.queueData?.sonarr || [])];
        const tot = Math.max(1, Math.ceil(all.length / m2.queuePerPage));
        const p   = pBtn.dataset.actQueuePage;
        const cur = m2.queuePage;
        const np  = p === 'first' ? 0 : p === 'prev' ? Math.max(0, cur - 1) : p === 'next' ? Math.min(tot - 1, cur + 1) : p === 'last' ? tot - 1 : (parseInt(p) || 0);
        if (np !== cur) {
          m2.queuePage = np;
          this._actSetBodyHtml(body, this._actQueueTabHtml(m2.queueData?.radarr || [], m2.queueData?.sonarr || [], np, m2.queuePerPage, m2.queueCols));
          this._wireActBody(body, modalEl, 'queue');
        }
      }
    }, { signal });
  }

  // Activity, the History tab's table: filters, columns, paging, rows.
  _actWireHistoryTab(body, modalEl, signal) {
    body.querySelector('#act-hist-search')?.addEventListener('input', e => {
      if (!this._activityModal) return;
      const val = e.target.value;
      this._activityModal.histSearch = val;
      this._activityModal.histPage = 0;
      const m2 = this._activityModal;
      // Patch only the results subtree — keeps #act-hist-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'act-hist-results-wrap', () => this._actHistoryTabHtml(m2.histData?.radarr, m2.histData?.sonarr, m2.histFilter, 0, m2.histPerPage));
      requestAnimationFrame(() => this._actFitFmtTags(body));
      this._wireActBody(body, modalEl, 'history');
    });
    body.querySelector('#act-hist-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openHistoryColPicker(e.currentTarget, modalEl);
    });
    body.querySelector('#act-hist-svc')?.addEventListener('change', e => {
      const m2 = this._activityModal;
      if (!m2) return;
      m2.histFilterSvc = e.target.value;
      m2.histPage = 0;
      this._actSetBodyHtml(body, this._actHistoryTabHtml(m2.histData?.radarr, m2.histData?.sonarr, m2.histFilter, 0, m2.histPerPage));
      this._wireActBody(body, modalEl, 'history');
    });
    body.querySelector('#act-hist-filter')?.addEventListener('change', async e => {
      const m2 = this._activityModal;
      if (!m2) return;
      m2.histFilter = e.target.value;
      m2.histPage   = 0;
      m2.histData   = null;
      await this._actLoadTab('history', modalEl);
    });
    const _hRerender = () => {
      const m2 = this._activityModal;
      if (!m2) return;
      m2.histPage = 0;
      this._actSetBodyHtml(body, this._actHistoryTabHtml(m2.histData?.radarr, m2.histData?.sonarr, m2.histFilter, 0, m2.histPerPage));
      this._wireActBody(body, modalEl, 'history');
    };
    [
      ['#act-hist-quality',  'histFilterQuality'],
      ['#act-hist-lang',     'histFilterLang'],
      ['#act-hist-format',   'histFilterFormat'],
      ['#act-hist-client',   'histFilterClient'],
      ['#act-hist-indexer',  'histFilterIndexer'],
      ['#act-hist-relgroup', 'histFilterRelgroup'],
    ].forEach(([sel, key]) => {
      body.querySelector(sel)?.addEventListener('change', e => {
        const m2 = this._activityModal;
        if (!m2) return;
        m2[key] = e.target.value;
        _hRerender();
      });
    });
    body.addEventListener('click', async e => {
      if (!this._activityModal) return;
      const sortBtn = e.target.closest('[data-act-hist-sort]');
      if (sortBtn) {
        const col = sortBtn.dataset.actHistSort;
        const m2 = this._activityModal;
        if (m2.histSort === col) {
          m2.histSortDir = m2.histSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          m2.histSort = col;
          m2.histSortDir = col === 'date' ? 'desc' : 'asc';
        }
        m2.histPage = 0;
        this._actSetBodyHtml(body, this._actHistoryTabHtml(m2.histData?.radarr, m2.histData?.sonarr, m2.histFilter, 0, m2.histPerPage));
        this._wireActBody(body, modalEl, 'history');
        return;
      }
      const pBtn = e.target.closest('[data-act-hist-page]');
      if (pBtn) {
        const m2  = this._activityModal;
        const all = [...(m2.histData?.radarr?.records || []), ...(m2.histData?.sonarr?.records || [])];
        const tot = Math.max(1, Math.ceil(all.length / m2.histPerPage));
        const p   = pBtn.dataset.actHistPage;
        const cur = m2.histPage;
        const np  = p === 'first' ? 0 : p === 'prev' ? Math.max(0, cur - 1) : p === 'next' ? Math.min(tot - 1, cur + 1) : p === 'last' ? tot - 1 : (parseInt(p) || 0);
        if (np !== cur) {
          m2.histPage = np;
          this._actSetBodyHtml(body, this._actHistoryTabHtml(m2.histData?.radarr, m2.histData?.sonarr, m2.histFilter, np, m2.histPerPage));
          this._wireActBody(body, modalEl, 'history');
        }
      }
    }, { signal });
  }

  // Activity, the Missing tab: filters, columns, paging, searching, expanding a series.
  _actWireMissingTab(body, modalEl, m, signal) {
    body.querySelector('#act-missing-search')?.addEventListener('input', e => {
      if (!this._activityModal) return;
      const val = e.target.value;
      this._activityModal.missingSearch = val;
      this._activityModal.missingPage = 0;
      const m2 = this._activityModal;
      const c = this._actMissingCache;
      // Patch only the results subtree — keeps #act-missing-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'act-missing-results-wrap', () => this._actMissingTabHtml(c?.rRecs||[], c?.sRecs||[], m2.missingPage, m2.missingPerPage, m2.missingCols));
      this._wireActBody(body, modalEl, 'missing');
    });

    body.querySelector('#act-missing-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openMissingColPicker(e.currentTarget, modalEl);
    });

    const _mRerender = () => {
      if (!this._activityModal) return;
      this._actRenderMissing(body, modalEl, 0);
    };
    [
      ['#act-missing-svc',       'missingFilterSvc'],
      ['#act-missing-profile',   'missingFilterProfile'],
      ['#act-missing-monitored', 'missingFilterMonitored'],
    ].forEach(([sel, key]) => {
      body.querySelector(sel)?.addEventListener('change', e => {
        const m2 = this._activityModal;
        if (!m2) return;
        m2[key] = e.target.value;
        _mRerender();
      });
    });

    body.addEventListener('click', async e => {
      if (!this._activityModal) return;

      // Monitor bookmark toggle — movie / series / season
      const monT = e.target.closest('.act-mon-toggle');
      if (monT) {
        const kind = monT.dataset.kind;
        const id   = Number(monT.dataset.id);
        const svc  = monT.dataset.svc;
        const cur  = monT.dataset.mon === '1';
        monT.disabled = true;
        monT.innerHTML = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>`;
        try {
          if (kind === 'movie') {
            const arr = svc === 'radarr2' ? this._radarr2 : this._radarr;
            const movie = (arr || []).find(m => m.id === id) || { id };
            const fresh = await this._callApi('PUT', `arr_stack/${svc}/movie/${id}`, { ...movie, monitored: !cur });
            if (fresh && arr) { const idx = arr.findIndex(m => m.id === id); if (idx !== -1) arr[idx] = { ...arr[idx], ...fresh }; }
          } else {
            const arr = (svc === 'sonarr2' ? this._sonarr2 : this._sonarr) || [];
            const series = arr.find(s => s.id === id);
            if (series) {
              const payload = kind === 'season'
                ? { ...series, seasons: (series.seasons || []).map(ss =>
                    ss.seasonNumber === Number(monT.dataset.season) ? { ...ss, monitored: !cur } : ss) }
                : { ...series, monitored: !cur };
              const fresh = await this._callApi('PUT', `arr_stack/${svc}/series/${id}`, payload);
              if (fresh) { const idx2 = arr.findIndex(s => s.id === id); if (idx2 !== -1) arr[idx2] = { ...arr[idx2], ...fresh }; }
            }
          }
          await this._actLoadTab('missing', modalEl);
        } catch {
          monT.disabled = false;
        }
        return;
      }

      const infoBtn = e.target.closest('.act-missing-info-btn');
      if (infoBtn) {
        const tmdb  = infoBtn.dataset.tmdb  || null;
        const tvdb  = infoBtn.dataset.tvdb  || null;
        const title = infoBtn.dataset.title || '';
        const type  = infoBtn.dataset.type  || 'radarr';
        const _pr = this.shadowRoot.getElementById('popup-root');
        if (_pr) this.shadowRoot.appendChild(_pr);
        await this._openPopup(type, tmdb || null, tvdb || null, title);
        if (this._popup) {
          this._popup._infoOnly = true;
          this._renderPopupEl();
        }
        return;
      }

      const sortBtn = e.target.closest('[data-act-missing-sort]');
      if (sortBtn) {
        const col = sortBtn.dataset.actMissingSort;
        const m2 = this._activityModal;
        if (m2.missingSort === col) {
          m2.missingSortDir = m2.missingSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          m2.missingSort = col;
          m2.missingSortDir = col === 'added' ? 'desc' : 'asc';
        }
        this._actRenderMissing(body, modalEl, 0);
        return;
      }

      const expandBtn = e.target.closest('.act-missing-expand-btn');
      if (expandBtn) {
        const key = expandBtn.dataset.key;
        const m2  = this._activityModal;
        if (!m2) return;
        const isCollapse = m2.missingExpanded.has(key);
        m2.missingExpanded.clear();
        if (!isCollapse) m2.missingExpanded.add(key);
        // Expanding: keep current perPage so page slice stays identical (items above don't shift)
        // Collapsing: reset to base so calibration can reclaim correct item count
        this._actRenderMissing(body, modalEl, undefined, !isCollapse);
        return;
      }

      const seasonIsBtn = e.target.closest('.act-missing-season-is-btn');
      if (seasonIsBtn) {
        const seriesId    = Number(seasonIsBtn.dataset.id);
        const svc         = seasonIsBtn.dataset.svc;
        const seasonNumber = Number(seasonIsBtn.dataset.season);
        const title       = seasonIsBtn.dataset.title || '';
        await this._openSeasonIsOverlay(seriesId, svc, seasonNumber, title);
        return;
      }

      const isBtn = e.target.closest('.act-missing-is-btn');
      if (isBtn) {
        const id    = Number(isBtn.dataset.id);
        const svc   = isBtn.dataset.svc;
        const tmdb  = isBtn.dataset.tmdb || null;
        const tvdb  = isBtn.dataset.tvdb || null;
        const title = isBtn.dataset.title || '';
        // Re-append popup-root last in shadowRoot so it renders above activity modal (same z-index, DOM order wins)
        const _pr = this.shadowRoot.getElementById('popup-root');
        if (_pr) this.shadowRoot.appendChild(_pr);
        const isSonarr = svc === 'sonarr' || svc === 'sonarr2';
        if (isSonarr) {
          const inst = svc === 'sonarr2' ? 'sonarr2' : 'sonarr';
          try { await this._openPopup('sonarr', tmdb, tvdb, title); }
          catch (err) {
            if (err?.message !== 'no_id') { console.warn('[arr-card] IS open error:', err); return; }
            // no_id but _openPopup already set this._popup with _sonarrSeries via tvdbId lookup — proceed if found
            if (!this._popup?._sonarrSeries) return;
            delete this._popup._loading; // clear loading state so fromActivity branch renders
          }
          if (this._popup) {
            this._popup._fromActivity = true;
            this._snIsInstance = inst;
            this._snIsOpen     = true;
            this._snIsState    = null;
            this._snSeasonsPage = 0;
            this._renderPopupEl();
          }
        } else {
          try {
          const radarrLib = svc === 'radarr2' ? (this._radarr2 || []) : (this._radarr || []);
          const movie  = radarrLib.find(m => m.id === id);
          const radarrId = movie?.id    ?? id;
          const tmdbId   = movie?.tmdbId ? String(movie.tmdbId) : tmdb;
          const inst     = svc === 'radarr2' ? 'radarr2' : 'radarr';
          await this._openPopup('radarr', tmdbId, null, title, radarrId);
          if (this._popup) {
            this._popup._fromActivity = true;
            this._isInstance = inst;
            this._fetchInteractiveSearch(radarrId, inst);
          }
          } catch (err) { if (err?.message !== 'no_id') console.warn('[arr-card] IS open error:', err); }
        }
        return;
      }

      const asBtn = e.target.closest('.act-missing-as-btn');
      if (asBtn) {
        const id  = asBtn.dataset.id;
        const svc = asBtn.dataset.svc;
        const origHtml = asBtn.innerHTML;
        asBtn.disabled = true;
        asBtn.textContent = '…';
        try {
          if (svc === 'radarr' || svc === 'radarr2') {
            await this._callApi('POST', `arr_stack/${svc}/command`, { name: 'MoviesSearch', movieIds: [Number(id)] });
          } else {
            const season = asBtn.dataset.season != null ? Number(asBtn.dataset.season) : null;
            const cmd = season != null
              ? { name: 'SeasonSearch', seriesId: Number(id), seasonNumber: season }
              : { name: 'SeriesSearch', seriesId: Number(id) };
            await this._callApi('POST', `arr_stack/${svc}/command`, cmd);
          }
          asBtn.textContent = '✓';
          asBtn.style.color = 'rgba(80,200,100,0.9)';
        } catch {
          asBtn.innerHTML = origHtml;
        } finally {
          asBtn.disabled = false;
        }
        return;
      }

      const pBtn = e.target.closest('[data-act-missing-page]');
      if (pBtn) {
        const m2    = this._activityModal;
        const c     = this._actMissingCache;
        const fSvc  = m2.missingFilterSvc      || 'all';
        const fProf = m2.missingFilterProfile  || 'all';
        const fMon  = m2.missingFilterMonitored || 'all';
        const mSrch = (m2.missingSearch || '').toLowerCase().trim();
        const allRows = [
          ...(c?.rRecs||[]).map(r => ({ _svc: r._inst||'radarr', _profile: r._profileName||'', _monitored: r.monitored??true, _title: r.title||'' })),
          ...(c?.sRecs||[]).map(s => ({ _svc: s._inst||'sonarr', _profile: s._profileName||'', _monitored: s.monitored??true, _title: s.title||'' })),
        ];
        const filteredLen = allRows.filter(r => {
          if (fSvc  !== 'all' && r._svc !== fSvc) return false;
          if (fProf !== 'all' && r._profile !== fProf) return false;
          if (fMon  !== 'all' && (fMon === 'monitored' ? !r._monitored : r._monitored)) return false;
          if (mSrch && !r._title.toLowerCase().includes(mSrch)) return false;
          return true;
        }).length;
        const tot = Math.max(1, Math.ceil(filteredLen / m2.missingPerPage));
        const p   = pBtn.dataset.actMissingPage;
        const cur = m2.missingPage;
        const np  = p === 'first' ? 0 : p === 'prev' ? Math.max(0, cur - 1) : p === 'next' ? Math.min(tot - 1, cur + 1) : p === 'last' ? tot - 1 : (parseInt(p) || 0);
        if (np !== cur) {
          this._actRenderMissing(body, modalEl, np, true);
        }
      }
    }, { signal });
  }

  // Activity, the Blocklist tab's table: columns, paging, removing entries.
  _actWireBlocklistTab(body, modalEl, signal) {
    body.querySelector('#act-bl-search')?.addEventListener('input', e => {
      if (!this._activityModal) return;
      const val = e.target.value;
      this._activityModal.blSearch = val;
      this._activityModal.blPage = 0;
      const m2 = this._activityModal;
      // Patch only the results subtree — keeps #act-bl-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'act-bl-results-wrap', () => this._actBlocklistTabHtml(m2.blData?.radarr, m2.blData?.sonarr, 0, m2.blPerPage));
      requestAnimationFrame(() => this._actFitFmtTags(body));
      this._wireActBody(body, modalEl, 'blocklist');
    });


    body.querySelector('#act-bl-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openBlColPicker(e.currentTarget, modalEl);
    });

    const _blRerender = () => {
      const m2 = this._activityModal;
      if (!m2) return;
      m2.blPage = 0;
      this._actSetBodyHtml(body, this._actBlocklistTabHtml(m2.blData?.radarr, m2.blData?.sonarr, 0, m2.blPerPage));
      this._wireActBody(body, modalEl, 'blocklist');
    };
    [
      ['#act-bl-svc',     'blFilterSvc'],
      ['#act-bl-proto',   'blFilterProto'],
      ['#act-bl-quality', 'blFilterQuality'],
      ['#act-bl-lang',    'blFilterLang'],
      ['#act-bl-format',  'blFilterFormat'],
      ['#act-bl-indexer', 'blFilterIndexer'],
    ].forEach(([sel, key]) => {
      body.querySelector(sel)?.addEventListener('change', e => {
        const m2 = this._activityModal;
        if (!m2) return;
        m2[key] = e.target.value;
        _blRerender();
      });
    });

    body.addEventListener('click', async e => {
      if (!this._activityModal) return;
      const sortBtn = e.target.closest('[data-act-bl-sort]');
      if (sortBtn) {
        const col = sortBtn.dataset.actBlSort;
        const m2 = this._activityModal;
        if (m2.blSort === col) {
          m2.blSortDir = m2.blSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          m2.blSort = col;
          m2.blSortDir = col === 'date' ? 'desc' : 'asc';
        }
        m2.blPage = 0;
        this._actSetBodyHtml(body, this._actBlocklistTabHtml(m2.blData?.radarr, m2.blData?.sonarr, 0, m2.blPerPage));
        this._wireActBody(body, modalEl, 'blocklist');
        return;
      }
      const removeBtn = e.target.closest('.act-bl-remove-btn');
      if (removeBtn) {
        // Removing from the blocklist deleted on the first click; it asks in
        // place now, like every other destructive row action.
        this._confirmInline(removeBtn, async () => {
          await this._actRemoveBlocklistItem(Number(removeBtn.dataset.id), removeBtn.dataset.svc, modalEl);
        });
        return;
      }
      const pBtn = e.target.closest('[data-act-bl-page]');
      if (pBtn) {
        const m2  = this._activityModal;
        const all = [...(m2.blData?.radarr?.records || []), ...(m2.blData?.sonarr?.records || [])];
        const tot = Math.max(1, Math.ceil(all.length / m2.blPerPage));
        const p   = pBtn.dataset.actBlPage;
        const cur = m2.blPage;
        const np  = p === 'first' ? 0 : p === 'prev' ? Math.max(0, cur - 1) : p === 'next' ? Math.min(tot - 1, cur + 1) : p === 'last' ? tot - 1 : (parseInt(p) || 0);
        if (np !== cur) {
          m2.blPage = np;
          this._actSetBodyHtml(body, this._actBlocklistTabHtml(m2.blData?.radarr, m2.blData?.sonarr, np, m2.blPerPage));
          this._wireActBody(body, modalEl, 'blocklist');
        }
      }
    }, { signal });
  }

}

export const wireActivityTabsMixin = _WireActivityTabsMethods.prototype;
