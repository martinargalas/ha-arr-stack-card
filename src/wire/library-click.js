// Every click inside the Library modal's glass. Split out of wire/library.js.

class _LibraryClickMethods {

  // Every click inside the Library modal's glass: close, selection, the bulk actions, opening a title, view, type, instance and quality tabs, sorting, paging.
  _libGlassClick(e, el) {
    e.stopPropagation();

    if (e.target.closest('#lib-close')) {
      const back = this._libPopupReturn;
      this._libPopupReturn = null;
      this._closeLibModal();
      // Rebuild the detail the user came from instead of dropping to the card
      if (back) this._openPopup(back.type, back.tmdbId, back.tvdbId, back.title);
      return;
    }

    const selEl = e.target.closest('[data-lib-sel]');
    if (selEl) {
      const key = selEl.dataset.libSel;
      const m = this._libModal;
      if (!m?._editMode) return;
      if (m._selected.has(key)) m._selected.delete(key);
      else m._selected.add(key);
      this._libRerenderBody(el);
      return;
    }

    const actionBtn = e.target.closest('[data-lib-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.libAction;
      const m = this._libModal;

      if (action === 'start-edit') {
        m._editMode = true;
        m._selected = new Set();
        this._libRerenderBody(el);
        return;
      }
      if (action === 'stop-edit') {
        m._editMode = false;
        m._selected = new Set();
        this._libRerenderBody(el);
        return;
      }
      if (action === 'select-toggle') {
        const allItems = this._libFilteredItems();
        const allSelected = m._selected.size >= allItems.length;
        if (allSelected) { m._selected = new Set(); }
        else { allItems.forEach(i => m._selected.add(`${i._libType}-${i._libInst||'1'}-${i.id}`)); }
        this._libRerenderBody(el);
        return;
      }
      if (action === 'bulk-edit') {
        m._bulkDialog = 'edit'; this._libRerenderBody(el);
        const fetches = [];
        if (!this._radarrProfiles?.length)  fetches.push(this._fetchRadarrProfiles?.());
        if (!this._sonarrProfiles?.length)  fetches.push(this._fetchSonarrProfiles?.());
        if (!this._radarr2Profiles?.length && this._radarr2Configured) fetches.push(this._fetchRadarr2Profiles?.());
        if (fetches.length) Promise.all(fetches).then(() => { if (this._libModal?._bulkDialog === 'edit') this._libRerenderBody(el); }).catch(()=>{});
        return;
      }
      if (action === 'bulk-tags')   { m._bulkDialog = 'tags';   this._libRerenderBody(el); return; }
      if (action === 'bulk-delete') { m._bulkDialog = 'delete'; this._libRerenderBody(el); return; }
      if (action === 'bulk-cancel') { m._bulkDialog = null;     this._libRerenderBody(el); return; }

      if (action === 'bulk-delete-confirm') {
        const dlg = el.querySelector('#lib-body');
        const exclEl  = dlg?.querySelector('#bd-excl');
        const filesEl = dlg?.querySelector('#bd-files');
        if (exclEl)  m._bulkDelete.addImportExclusion = exclEl.checked;
        if (filesEl) m._bulkDelete.deleteFiles        = filesEl.checked;
        const selArr = [...m._selected];
        const allItems = this._libAllItems();
        const selItems = allItems.filter(i => selArr.includes(`${i._libType}-${i._libInst||'1'}-${i.id}`));
        const movies1  = selItems.filter(i=>i._libType==='movie'&&(i._libInst||'1')==='1').map(i=>i.id);
        const movies2  = selItems.filter(i=>i._libType==='movie'&&i._libInst==='2').map(i=>i.id);
        const series1  = selItems.filter(i=>i._libType==='tv'&&(i._libInst||'1')==='1').map(i=>i.id);
        const series2  = selItems.filter(i=>i._libType==='tv'&&i._libInst==='2').map(i=>i.id);
        const body = { addImportExclusion: m._bulkDelete.addImportExclusion, deleteFiles: m._bulkDelete.deleteFiles };
        const calls = [];
        if (movies1.length)  calls.push(this._callApi('DELETE','arr_stack/radarr/movie-editor',  {...body, movieIds:movies1}));
        if (movies2.length)  calls.push(this._callApi('DELETE','arr_stack/radarr2/movie-editor', {...body, movieIds:movies2}));
        if (series1.length)  calls.push(this._callApi('DELETE','arr_stack/sonarr/series-editor', {...body, seriesIds:series1}));
        if (series2.length)  calls.push(this._callApi('DELETE','arr_stack/sonarr2/series-editor',{...body, seriesIds:series2}));
        Promise.all(calls).then(()=>{
          const m1s = new Set(movies1), m2s = new Set(movies2), s1s = new Set(series1), s2s = new Set(series2);
          if (m1s.size) this._radarr  = (this._radarr  ||[]).filter(x=>!m1s.has(x.id));
          if (m2s.size) this._radarr2 = (this._radarr2 ||[]).filter(x=>!m2s.has(x.id));
          if (s1s.size) this._sonarr  = (this._sonarr  ||[]).filter(x=>!s1s.has(x.id));
          if (s2s.size) this._sonarr2 = (this._sonarr2 ||[]).filter(x=>!s2s.has(x.id));
          m._bulkDialog=null; m._editMode=false; m._selected=new Set();
          this._libRerenderBody(el); this._fetchAll();
        }).catch(e=>console.warn('[lib] bulk delete failed',e));
        return;
      }

      if (action === 'bulk-tags-confirm') {
        const dlg = el.querySelector('#lib-body');
        const tagsEl = dlg?.querySelector('#bt-tags');
        const modeEl = dlg?.querySelector('#bt-mode');
        m._bulkTags.tags     = tagsEl?.value || '';
        m._bulkTags.applyTags = modeEl?.value || 'add';
        const selArr = [...m._selected];
        const allItems = this._libAllItems();
        const selItems = allItems.filter(i => selArr.includes(`${i._libType}-${i._libInst||'1'}-${i.id}`));
        const movies1  = selItems.filter(i=>i._libType==='movie'&&(i._libInst||'1')==='1').map(i=>i.id);
        const movies2  = selItems.filter(i=>i._libType==='movie'&&i._libInst==='2').map(i=>i.id);
        const series1  = selItems.filter(i=>i._libType==='tv'&&(i._libInst||'1')==='1').map(i=>i.id);
        const series2  = selItems.filter(i=>i._libType==='tv'&&i._libInst==='2').map(i=>i.id);
        const tagNames   = m._bulkTags.tags.split(',').map(t=>t.trim()).filter(Boolean);
        const calls = [];
        if (movies1.length)  calls.push(this._callApi('PUT','arr_stack/radarr/movie-editor',  {movieIds:movies1,  tags:tagNames, applyTags:m._bulkTags.applyTags}));
        if (movies2.length)  calls.push(this._callApi('PUT','arr_stack/radarr2/movie-editor', {movieIds:movies2,  tags:tagNames, applyTags:m._bulkTags.applyTags}));
        if (series1.length)  calls.push(this._callApi('PUT','arr_stack/sonarr/series-editor', {seriesIds:series1, tags:tagNames, applyTags:m._bulkTags.applyTags}));
        if (series2.length)  calls.push(this._callApi('PUT','arr_stack/sonarr2/series-editor',{seriesIds:series2, tags:tagNames, applyTags:m._bulkTags.applyTags}));
        Promise.all(calls).then(()=>{ m._bulkDialog=null; this._libRerenderBody(el); }).catch(e=>console.warn('[lib] bulk tags failed',e));
        return;
      }

      if (action === 'bulk-edit-confirm') {
        const dlg = el.querySelector('#lib-body');
        const dlgEl = el.querySelector('#lib-body');
        m._bulkEdit.monitored           = dlgEl?.querySelector('#be-mon')?.value     || '';
        m._bulkEdit.qualityProfileId    = dlgEl?.querySelector('#be-qual')?.value    || '';
        m._bulkEdit.minimumAvailability = dlgEl?.querySelector('#be-avail')?.value   || '';
        m._bulkEdit.monitorNewItems     = dlgEl?.querySelector('#be-monnew')?.value  || '';
        m._bulkEdit.seriesType          = dlgEl?.querySelector('#be-sertype')?.value || '';
        m._bulkEdit.seasonFolder        = dlgEl?.querySelector('#be-sf')?.value      || '';
        const selArr = [...m._selected];
        const allItems = this._libAllItems();
        const selItems = allItems.filter(i => selArr.includes(`${i._libType}-${i._libInst||'1'}-${i.id}`));
        const movies1  = selItems.filter(i=>i._libType==='movie'&&(i._libInst||'1')==='1').map(i=>i.id);
        const movies2  = selItems.filter(i=>i._libType==='movie'&&i._libInst==='2').map(i=>i.id);
        const series1  = selItems.filter(i=>i._libType==='tv'&&(i._libInst||'1')==='1').map(i=>i.id);
        const series2  = selItems.filter(i=>i._libType==='tv'&&i._libInst==='2').map(i=>i.id);
        const _selProfName = m._bulkEdit.qualityProfileId || null;
        const _resolvePid = profs => _selProfName ? (profs.find(p=>p.name===_selProfName)?.id ?? null) : null;
        const mkMovieBody = (ids, profs) => {
          const b = { movieIds: ids };
          if (m._bulkEdit.monitored)           b.monitored           = m._bulkEdit.monitored === 'true';
          const pid = _resolvePid(profs); if (pid) b.qualityProfileId = pid;
          if (m._bulkEdit.minimumAvailability)  b.minimumAvailability = m._bulkEdit.minimumAvailability;
          return b;
        };
        const mkSeriesBody = (ids, profs) => {
          const b = { seriesIds: ids };
          if (m._bulkEdit.monitored)        b.monitored        = m._bulkEdit.monitored === 'true';
          const pid = _resolvePid(profs); if (pid) b.qualityProfileId = pid;
          if (m._bulkEdit.monitorNewItems)   b.monitorNewItems  = m._bulkEdit.monitorNewItems;
          if (m._bulkEdit.seriesType)        b.seriesType       = m._bulkEdit.seriesType;
          if (m._bulkEdit.seasonFolder)      b.seasonFolder     = m._bulkEdit.seasonFolder === 'true';
          return b;
        };
        const calls = [];
        if (movies1.length)  calls.push(this._callApi('PUT','arr_stack/radarr/movie-editor',   mkMovieBody(movies1, this._radarrProfiles||[])));
        if (movies2.length)  calls.push(this._callApi('PUT','arr_stack/radarr2/movie-editor',  mkMovieBody(movies2, this._radarr2Profiles||[])));
        if (series1.length)  calls.push(this._callApi('PUT','arr_stack/sonarr/series-editor',  mkSeriesBody(series1, this._sonarrProfiles||[])));
        if (series2.length)  calls.push(this._callApi('PUT','arr_stack/sonarr2/series-editor', mkSeriesBody(series2, this._sonarr2Profiles||[])));
        Promise.all(calls).then(()=>{ m._bulkDialog=null; this._libRerenderBody(el); this._fetchAll(); }).catch(e=>console.warn('[lib] bulk edit failed',e));
        return;
      }
      const inst = m?.instFilter || 'all';
      const isMusic = m?.typeKey === 'music';
      const useR = !isMusic && m?.typeKey !== 'tv';
      const useS = !isMusic && m?.typeKey !== 'movies';
      if (action === 'update-all' && ((useR && useS) || inst === 'all')) {
        const label = action === 'rss-sync' ? this._t('libRssSync') : this._t('libUpdateAll');
        const allTypes = useR && useS;
        const allInst  = inst === 'all' && (this._radarr2Configured || this._sonarr2Configured);
        const parts = [];
        if (allTypes) parts.push(this._t('libMoviesTv'));
        if (allInst)  parts.push('all instances');
        const scope = parts.length ? ` for ${parts.join(' and ')}` : '';
        // Asked in the toolbar rather than through a browser dialog: the
        // button turns into a tick and a cross with the scope spelled out.
        if (!actionBtn._confirmed) {
          this._confirmInline(actionBtn, () => {
            actionBtn._confirmed = true;
            actionBtn.click();
          }, `${label}${scope}?`);
          return;
        }
        actionBtn._confirmed = false;
      }
      const svcs = [];
      if (isMusic) svcs.push('lidarr');
      if (useR) {
        if (inst !== '2') svcs.push('radarr');
        if (inst !== '1' && this._radarr2Configured) svcs.push('radarr2');
      }
      if (useS) {
        if (inst !== '2') svcs.push('sonarr');
        if (inst !== '1' && this._sonarr2Configured) svcs.push('sonarr2');
      }
      const cmdName = (svc, a) => {
        if (a === 'rss-sync') return 'RssSync';
        if (svc === 'lidarr') return 'RefreshArtist';
        return svc.startsWith('sonarr') ? 'RefreshSeries' : 'RefreshMovie';
      };
      const _setStatus = (txt) => {
        const s = this.shadowRoot?.querySelector('#lib-cmd-status');
        if (s) s.textContent = txt;
      };
      const _pollCmd = async (svc, id) => {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          if (!this._libModal) return;
          try {
            const c = await this._callApi('GET', `arr_stack/${svc}/command/${id}`);
            const msg = c?.message || '';
            _setStatus(`${svc}: ${msg}`);
            if (c?.status === 'completed' || c?.status === 'failed') { return; }
          } catch {}
        }
      };
      actionBtn.style.opacity = '0.5';
      setTimeout(() => { if (actionBtn.isConnected) actionBtn.style.opacity = ''; }, 800);
      const _status = action === 'rss-sync' ? () => {} : _setStatus;
      _status(this._t('libStarting'));
      svcs.forEach(async svc => {
        try {
          const res = await this._callApi('POST', `arr_stack/${svc}/command`, { name: cmdName(svc, action) });
          if (res?.id) { _status(`${svc}: ${res.message || this._t('mtRunning')}`); if (action !== 'rss-sync') _pollCmd(svc, res.id); }
        } catch (err) { console.warn(`[lib] ${svc} ${action} failed:`, err); }
      });
      return;
    }

    // An artist opens its own detail, not the film popup — the two share the
    // card shape but nothing else.
    const artistCard = e.target.closest('[data-artist-id]');
    if (artistCard) {
      this._libReturnState = { ...this._libModal };
      this._closeLibModal();
      this._openMusicModal(Number(artistCard.dataset.artistId));
      return;
    }

    const card = e.target.closest('[data-lib-popup]');
    if (card) {
      const type   = card.dataset.libPopup;
      const tmdbId = card.dataset.tmdbid  || null;
      const tvdbId = card.dataset.tvdbid  || null;
      const title  = card.dataset.title   || '';
      this._libReturnState = { ...this._libModal };
      this._closeLibModal();
      this._openPopup(type, tmdbId, tvdbId, title);
      return;
    }

    const viewSegBtn = e.target.closest('[data-lib-view]');
    if (viewSegBtn) {
      const v = viewSegBtn.dataset.libView;
      if (v !== this._libModal.view) {
        this._libModal._prevView = this._libModal.view;
        this._libModal._animSegView = true;
        this._libModal.view = v;
        this._libModal.page = 0;
        // _libModalHtml persists prefs on render, view included
        this._libRerenderModal(el);
      }
      return;
    }

    const typeTab = e.target.closest('[data-lib-tab-type]');
    if (typeTab) {
      this._markActivated();
      const key = typeTab.dataset.libTabType;
      if (key !== this._libModal.typeKey) {
        this._libSaveTypePrefs();
        const prefs = this._libTypePrefs(key) || {};
        this._libModal._prevTypeKey = this._libModal.typeKey;
        this._libModal._animSegType = true;
        this._libModal.typeKey = key;
        this._libModal.sort    = this._libModal.qualityKey === 'toprated'
          ? (key === 'music' ? 'rating' : 'imdb')
          : (prefs.sort || 'added');
        this._libModal.sortDir = prefs.sortDir || 'desc';
        this._libModal.filter  = prefs.filter || 'all';
        this._libModal.view    = prefs.view || this._libModal.view;
        this._libModal.search  = '';
        this._libModal.page    = 0;
        this._libRerenderModal(el);
      }
      return;
    }

    const instTab = e.target.closest('[data-lib-tab-inst]');
    if (instTab) {
      const key = instTab.dataset.libTabInst;
      if (key !== (this._libModal.instFilter || 'all')) {
        this._libModal._prevInstFilter = this._libModal.instFilter || 'all';
        this._libModal._animSegInst = true;
        this._libModal.instFilter = key;
        this._libModal.page = 0;
        this._libRerenderModal(el);
      }
      return;
    }

    const qualTab = e.target.closest('[data-lib-tab-quality]');
    if (qualTab) {
      this._markActivated();
      const key = qualTab.dataset.libTabQuality;
      if (key === this._libModal.qualityKey) {
        this._libModal.qualityKey = null;
        this._libModal.sort = 'added';
      } else {
        this._libModal.qualityKey = key;
        this._libModal.sort       = key === 'toprated' ? 'imdb' : 'quality';
        if (key === 'topquality') this._libModal.typeKey = 'movies';
      }
      this._libModal.sortDir = 'desc';
      this._libModal.page    = 0;
      this._libRerenderModal(el);
      return;
    }

    // Sort dropdown toggle
    if (e.target.closest('#lib-sort-btn')) {
      this._libModal._sortOpen = !this._libModal._sortOpen;
      this._libRerenderBody(el);
      return;
    }

    // Sort option selected
    const sortOpt = e.target.closest('[data-lib-sort-opt]');
    if (sortOpt) {
      const v = sortOpt.dataset.libSortOpt;
      if (v === this._libModal.sort) {
        this._libModal.sortDir = this._libModal.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        this._libModal.sort    = v;
        this._libModal.sortDir = 'desc';
      }
      this._libModal._sortOpen = false;
      this._libModal.page = 0;
      this._libRerenderBody(el);
      return;
    }

    // Table column header sort
    const thSort = e.target.closest('[data-lib-th-sort]');
    if (thSort) {
      const v = thSort.dataset.libThSort;
      if (v === this._libModal.sort) {
        this._libModal.sortDir = this._libModal.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        this._libModal.sort    = v;
        this._libModal.sortDir = 'desc';
      }
      this._libModal.page = 0;
      this._libRerenderBody(el);
      return;
    }

    // Close sort dropdown on outside click
    if (this._libModal._sortOpen && !e.target.closest('#lib-sort-wrap')) {
      this._libModal._sortOpen = false;
      this._libRerenderBody(el);
      return;
    }

    const pageBtn = e.target.closest('[data-lib-page]');
    if (pageBtn && !pageBtn.disabled) {
      const val = pageBtn.dataset.libPage;
      const tp  = this._libModal._totalPages || 1;
      let p = this._libModal.page;
      if      (val === 'first') p = 0;
      else if (val === 'prev')  p = Math.max(0, p - 1);
      else if (val === 'next')  p = Math.min(tp - 1, p + 1);
      else if (val === 'last')  p = tp - 1;
      else                      p = parseInt(val, 10);
      this._libModal.page = p;
      this._libRerenderBody(el);
      return;
    }
  }

}

export const libraryClickMixin = _LibraryClickMethods.prototype;
