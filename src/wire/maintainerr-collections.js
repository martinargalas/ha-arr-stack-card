// Maintainerr, the Collections tab: the collections, one collection's media, exclusions and info. Split out of wire/maintainerr.js.

class _WireMaintainerrCollectionsMethods {

  async _mtHandleCollection(id, modal) {
    const m = this._maintainerrModal;
    if (!m) return;
    const col = (this._maintainerr?.collections || []).find(c => c.id === id);
    const colName = col?.title || col?.name || `#${id}`;
    m.handlingId = id;
    this._mtLoadTab(m.tab, modal);
    try {
      await this._hass.callApi('POST', `arr_stack/maintainerr/collections/${id}/handle`);
      this._mtShowStatus(`${this._t('mtFinishedHandle')} '${colName}'`, modal);
    } catch (e) { console.warn('[arr-card] Maintainerr handle:', e); }
    m.handlingId = null;
    await this._fetchMaintainerr();
    if (this._maintainerrModal) this._mtLoadTab(m.tab, modal);
  }

  async _mtHandleAllCollections(modal) {
    const m = this._maintainerrModal;
    if (!m) return;
    try {
      await this._hass.callApi('POST', 'arr_stack/maintainerr/collections/handle');
      m.execStatus = 'running';
      this._mtShowStatus(this._t('mtRunning'), modal, 0, { spin: true });
      this._mtLoadTab(m.tab, modal);
      // No queue endpoint for the handler — its task record carries the state
      await this._mtPollUntil(async () => {
        const s = await this._hass.callApi('GET', `arr_stack/maintainerr/tasks/${encodeURIComponent('Collection Handler')}/status`);
        return s?.running === false;
      }, 2500);
      if (!this._maintainerrModal) return;
      m.execStatus = null;
      this._mtShowStatus(this._t('mtFinishedHandleAll'), modal);
      await this._fetchMaintainerr();
      if (this._maintainerrModal) this._mtLoadTab(m.tab, modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr handle all:', e);
      m.execStatus = null;
      this._mtShowStatus(`${this._t('mtRunFailed')}: ${e.message || e}`, modal, 8000, { err: true });
      this._mtLoadTab(m.tab, modal);
    }
  }

  async _mtRefetchColMedia(sortVal, modal) {
    const m = this._maintainerrModal;
    if (!m?.colDetail) return;
    const cd = m.colDetail;
    cd.sort = sortVal;
    cd.page = 0;
    const [sortKey, sortOrder] = sortVal.split('-');
    const body = modal?.querySelector('#mt-body');
    if (body) body.innerHTML = `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
    try {
      const data = await this._hass.callApi('GET', `arr_stack/maintainerr/collections/media/${cd.id}/content/1?sort=${sortKey}&sortOrder=${sortOrder || 'asc'}&size=500`);
      cd.items = Array.isArray(data) ? data : data?.items || data?.data || [];
    } catch (e) { console.warn('[arr-card] Maintainerr refetch media:', e); }
    this._mtLoadTab('collections', modal);
  }

  async _mtRefetchColExclusions(sortVal, modal) {
    const m = this._maintainerrModal;
    if (!m?.colDetail) return;
    const cd = m.colDetail;
    cd.exclSort = sortVal;
    cd.exclPage = 0;
    const [sortKey, sortOrder] = sortVal.split('-');
    const body = modal?.querySelector('#mt-body');
    if (body) body.innerHTML = `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
    try {
      const exclResp = await this._hass.callApi('GET', `arr_stack/maintainerr/collections/exclusions/${cd.id}/content/1?sort=${sortKey}&sortOrder=${sortOrder || 'desc'}&size=500`);
      const exclArr = exclResp?.items || (Array.isArray(exclResp) ? exclResp : []);
      const tmdbPosterMap = new Map();
      (this._radarr || []).forEach(m => {
        if (m.tmdbId) {
          const p = (m.images || []).find(i => i.coverType === 'poster');
          if (p?.remoteUrl) tmdbPosterMap.set(String(m.tmdbId), p.remoteUrl);
        }
      });
      cd.exclusionItems = exclArr.map(e => {
        const md = e.mediaData || {};
        const tmdbArr = md.providerIds?.tmdb || [];
        const tmdbId = tmdbArr[0] || null;
        return {
          id: e.id,
          mediaServerId: e.mediaServerId,
          title: md.title || `ID ${e.mediaServerId || '?'}`,
          type: e.type || md.type || 'movie',
          tmdbId,
          image_path: (tmdbId && tmdbPosterMap.has(String(tmdbId))) ? tmdbPosterMap.get(String(tmdbId)) : '',
        };
      });
    } catch (e) { console.warn('[arr-card] Maintainerr refetch exclusions:', e); }
    this._mtLoadTab('collections', modal);
  }

  // Fit the log table to the space between the toolbar and the paging row so it
  // pages instead of scrolling. Row height comes from a rendered row rather
  // than a guess, since it follows the shared table styling.
  _mtMeasureLogs(el) {
    const m = this._maintainerrModal;
    const lg = m?.colDetail?.logs;
    if (!lg || lg.loading || this._mtMeasuring) return;
    const wrap = el?.querySelector('#mt-log-wrap');
    const row = wrap?.querySelector('tbody tr, .mt-log-row');
    const head = wrap?.querySelector('thead');
    if (!wrap || !row) return;

    const pag = el.querySelector('#mt-log-pag');
    const bottom = pag ? pag.getBoundingClientRect().top : wrap.getBoundingClientRect().bottom;
    const avail = bottom - wrap.getBoundingClientRect().top - (head?.offsetHeight || 0);
    const rowH = row.offsetHeight;
    if (rowH <= 0 || avail <= 0) return;

    const fit = Math.max(1, Math.floor((avail + 1) / rowH));
    if (fit === lg.perPage) return;

    this._mtMeasuring = true;
    try {
      this._mtLoadColLogs(el, { perPage: fit, page: 0 });
    } finally {
      this._mtMeasuring = false;
    }
  }

  // Collection log feed — server-side paging, search, sort and type filter
  async _mtLoadColLogs(modal, patch = {}) {
    const m = this._maintainerrModal;
    const cd = m?.colDetail;
    if (!cd) return;
    const lg = cd.logs || (cd.logs = { items: [], total: 0, page: 0, search: '', sort: 'DESC', filter: '' });
    Object.assign(lg, patch);

    lg.loading = true;
    if (m.colSubTab === 'info') this._mtLoadTab('collections', modal);

    const PAGE = lg.perPage || 25;
    const params = new URLSearchParams({ size: String(PAGE), sort: lg.sort || 'DESC' });
    if (lg.search) params.set('search', lg.search);
    if (lg.filter !== '' && lg.filter != null) params.set('filter', String(lg.filter));

    try {
      const data = await this._hass.callApi('GET', `arr_stack/maintainerr/collections/logs/${cd.id}/content/${(lg.page || 0) + 1}?${params}`);
      lg.items = data?.items || [];
      lg.total = data?.totalSize ?? lg.items.length;
    } catch (e) {
      console.warn('[arr-card] Maintainerr collection logs:', e);
      lg.items = [];
      lg.total = 0;
    }
    if (!this._maintainerrModal) return;
    lg.loading = false;
    if (m.colSubTab === 'info') this._mtLoadTab('collections', modal);
  }


  async _mtOpenCollectionDetail(id, modal) {
    const m = this._maintainerrModal;
    if (!m) return;
    const body = modal?.querySelector('#mt-body');
    if (!body) return;
    body.innerHTML = `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
    try {
      const col = (this._maintainerr?.collections || []).find(c => c.id === id);
      const rules = this._maintainerr?.rules || [];
      const rule = col ? this._mtFindRuleForCol(col, rules) : null;
      const sortKey = 'deleteSoonest';
      const sortOrder = 'asc';
      const data = await this._hass.callApi('GET', `arr_stack/maintainerr/collections/media/${id}/content/1?sort=${sortKey}&sortOrder=${sortOrder}&size=500`);
      const items = Array.isArray(data) ? data : data?.items || data?.data || [];

      let excludedIds = new Set();
      let exclusionItems = [];
      try {
        const exclResp = await this._hass.callApi('GET', `arr_stack/maintainerr/collections/exclusions/${id}/content/1?size=500`);
        const exclArr = exclResp?.items || (Array.isArray(exclResp) ? exclResp : []);
        exclusionItems = exclArr.map(e => {
          const md = e.mediaData || {};
          const tmdbArr = md.providerIds?.tmdb || [];
          return {
            id: e.id,
            mediaServerId: e.mediaServerId,
            title: md.title || `ID ${e.mediaServerId || '?'}`,
            type: e.type || md.type || 'movie',
            tmdbId: tmdbArr[0] || null,
            year: md.year || null,
            image_path: '',
          };
        });
        const tmdbPosterMap = new Map();
        (this._radarr || []).forEach(m => {
          if (m.tmdbId) {
            const p = (m.images || []).find(i => i.coverType === 'poster');
            if (p?.remoteUrl) tmdbPosterMap.set(String(m.tmdbId), p.remoteUrl);
          }
        });
        exclusionItems.forEach(ei => {
          if (ei.tmdbId && tmdbPosterMap.has(String(ei.tmdbId))) {
            ei.image_path = tmdbPosterMap.get(String(ei.tmdbId));
          }
        });
        exclArr.forEach(e => {
          if (e.mediaServerId) excludedIds.add(String(e.mediaServerId));
        });
      } catch (_) {}

      m.colDetail = {
        id,
        ruleGroupId: rule?.id || col?.ruleGroupId || col?.ruleGroup?.id || null,
        title: col?.title || col?.name || '—',
        items,
        excludedIds,
        exclusionItems,
        deleteAfterDays: col?.deleteAfterDays ?? rule?.collection?.deleteAfterDays ?? null,
        mediaType: rule?.dataType || 'movie',
        search: '',
        sort: 'deleteSoonest-asc',
        exclSort: 'excluded-desc',
        page: 0,
        exclPage: 0,
        _cols: 0,
        confirmExclude: null,
      };
      m.colSubTab = 'media';
      m._animateSub = true;
      this._mtLoadTab('collections', modal);
    } catch (e) {
      body.innerHTML = `<div class="u-empty-dim">Error: ${this._escHtml(e?.message || e)}</div>`;
    }
  }

  async _mtExcludeItem(mediaServerId, modal) {
    const m = this._maintainerrModal;
    if (!m?.colDetail) return;
    const cd = m.colDetail;
    try {
      await this._hass.callApi('POST', 'arr_stack/maintainerr/rules/exclusion', {
        mediaId: parseInt(mediaServerId),
        mediaServerId: String(mediaServerId),
        ruleGroupId: cd.ruleGroupId,
      });
      if (!cd.excludedIds) cd.excludedIds = new Set();
      cd.excludedIds.add(String(mediaServerId));
      cd.confirmExclude = null;
      this._mtShowStatus(`Excluded`, modal);
      this._mtLoadTab('collections', modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr exclude:', e);
      cd.confirmExclude = null;
      this._mtLoadTab('collections', modal);
    }
  }

  async _mtUnexcludeItem(exclId, modal) {
    const m = this._maintainerrModal;
    if (!m?.colDetail) return;
    const cd = m.colDetail;
    try {
      await this._hass.callApi('DELETE', `arr_stack/maintainerr/rules/exclusion/${exclId}`);
      cd.exclusionItems = (cd.exclusionItems || []).filter(e => e.id !== exclId);
      const removed = cd.exclusionItems.find(e => e.id === exclId);
      if (removed?.mediaServerId) cd.excludedIds?.delete?.(String(removed.mediaServerId));
      this._mtShowStatus(this._t('mtUnexcluded'), modal);
      this._mtLoadTab('collections', modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr unexclude:', e);
    }
  }

}

export const wireMaintainerrCollectionsMixin = _WireMaintainerrCollectionsMethods.prototype;
