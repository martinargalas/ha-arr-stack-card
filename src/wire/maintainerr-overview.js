// Maintainerr, the Overview tab: the library as Maintainerr sees it, paged on the server. Split out of wire/maintainerr.js.

class _WireMaintainerrOverviewMethods {

  // One page of the overview, as Maintainerr serves it. Shared by the full
  // load and by the slider, which fetches while it is still being dragged.
  _mtOverviewPageData(ov, perPage) {
    const lib = (this._maintainerrLibraries || []).find(l => String(l.id) === String(ov.libId));
    const [sortKey, sortOrder] = (ov.sort || 'title-asc').split('-');
    const params = new URLSearchParams({
      page: String((ov.page || 0) + 1),
      limit: String(perPage),
      sort: sortKey,
      sortOrder: sortOrder || 'asc',
    });
    if (lib?.type) params.set('type', lib.type);
    return this._hass.callApi('GET', `arr_stack/maintainerr/media-server/library/${ov.libId}/content?${params}`);
  }

  // Collection list responses carry no media, so Overview pulls each
  // collection's content and merges it into one deletion-ordered list.
  // Overview browses the media server library directly. The list endpoint pages
  // server-side; search returns everything at once and is paged in the renderer.
  async _mtLoadOverview(modal) {
    const m = this._maintainerrModal;
    if (!m) return;
    if (!m.overview) m.overview = { libId: null, page: 0, sort: 'title-asc', search: '', items: [], totalSize: 0 };
    const ov = m.overview;

    if (!this._maintainerrLibraries?.length) {
      try {
        const libs = await this._hass.callApi('GET', 'arr_stack/maintainerr/media-server/libraries').catch(() => null);
        this._maintainerrLibraries = Array.isArray(libs) ? libs : [];
      } catch (_) {}
    }
    if (!ov.libId) ov.libId = this._maintainerrLibraries?.[0]?.id ?? null;
    if (!ov.libId) { ov.loading = false; return; }

    const lib = (this._maintainerrLibraries || []).find(l => String(l.id) === String(ov.libId));
    const { perPage } = this._mtGridCalc(ov, 90);
    const q = (ov.search || '').trim();

    ov.loading = true;
    if (m.tab === 'overview') this._mtLoadTab('overview', modal);

    try {
      if (q) {
        const typeQ = lib?.type ? `?type=${encodeURIComponent(lib.type)}` : '';
        const data = await this._hass.callApi('GET', `arr_stack/maintainerr/media-server/library/${ov.libId}/content/search/${encodeURIComponent(q)}${typeQ}`);
        ov.searchItems = Array.isArray(data) ? data : [];
        ov.items = [];
        ov.totalSize = ov.searchItems.length;
      } else {
        const data = await this._mtOverviewPageData(ov, perPage);
        ov.items = data?.items || [];
        ov.totalSize = data?.totalSize ?? ov.items.length;
        ov.searchItems = null;
      }
    } catch (e) {
      console.warn('[arr-card] Maintainerr overview:', e);
      ov.items = [];
      ov.searchItems = null;
      ov.totalSize = 0;
    }
    if (!this._maintainerrModal) return;
    ov.loading = false;
    if (m.tab === 'overview') this._mtLoadTab('overview', modal);
    this._mtLoadDelMap(modal);
    this._mtResolvePosters(ov.searchItems || ov.items, modal);
  }

  _mtOpenOvDialog(kind, itemId, modal) {
    const m = this._maintainerrModal;
    const ov = m?.overview;
    if (!ov) return;
    const pool = ov.searchItems || ov.items || [];
    const item = pool.find(i => String(i.id) === String(itemId));
    if (!item) return;
    const cols = this._mtCollectionsForLib(ov.libId);
    // Names of the Radarr/Sonarr servers are only loaded with the rule editor.
    // Fetch them once here too, so duplicate collection names can be told apart.
    if (!this._maintainerrArrServers) this._mtLoadArrServers(modal);
    ov.dialog = {
      kind,
      item,
      action: '0',
      // Exclusions default to "All collections"; collection moves need a target
      collectionId: kind === 'exclusion' ? '' : (cols[0]?.id ?? ''),
      busy: false,
    };
    this._mtLoadTab('overview', modal);
  }

  async _mtSubmitOvDialog(modal, removeAll = false) {
    const m = this._maintainerrModal;
    const ov = m?.overview;
    const dlg = ov?.dialog;
    if (!dlg || dlg.busy) return;
    const item = dlg.item;
    const context = { id: String(item.id), type: item.type };
    const colId = dlg.collectionId === '' || dlg.collectionId == null ? null : parseInt(dlg.collectionId);

    dlg.busy = true;
    this._mtLoadTab('overview', modal);
    try {
      if (removeAll) {
        await this._hass.callApi('DELETE', `arr_stack/maintainerr/collections/media?mediaId=${encodeURIComponent(item.id)}`);
      } else if (dlg.kind === 'exclusion') {
        const body = { mediaId: String(item.id), context, action: parseInt(dlg.action) };
        // Omitting collectionId makes Maintainerr apply it across all collections
        if (colId != null) body.collectionId = colId;
        const res = await this._hass.callApi('POST', 'arr_stack/maintainerr/rules/exclusion', body);
        if (res && res.code === 0) throw new Error(res.result || 'failed');
      } else {
        const body = { action: parseInt(dlg.action), mediaId: String(item.id), context };
        if (colId != null) body.collectionId = colId;
        await this._hass.callApi('POST', 'arr_stack/maintainerr/collections/media/add', body);
      }
      ov.dialog = null;
      this._mtShowStatus(this._t('mtDone'), modal);
      // Membership changed, so the cached deletion dates are stale
      this._mtDelMap = null;
      await this._fetchMaintainerr();
      this._mtLoadDelMap(modal);
      if (this._maintainerrModal) this._mtLoadTab('overview', modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr overview action:', e);
      if (!this._maintainerrModal) return;
      dlg.busy = false;
      this._mtShowStatus(`${this._t('mtRunFailed')}: ${e.message || e}`, modal, 8000, { err: true });
      this._mtLoadTab('overview', modal);
    }
  }

}

export const wireMaintainerrOverviewMixin = _WireMaintainerrOverviewMethods.prototype;
