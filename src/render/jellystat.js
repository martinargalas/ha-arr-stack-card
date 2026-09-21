// ──────────────────────────────────────────────────────────────────────────
// Jellystat — poster cards, modal shell, tab routing, API
// (shared helpers → use tautulli-shared.js | tables → jellystat-table.js | graphs → jellystat-graphs.js)
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass } from '../shared/ui.js';

class _JellystatMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────

  async _openJellystatModal(tab) {
    this._markActivated();
    tab = tab || 'libraries';
    const prefs = await this._jsLoadColPrefs();
    const hSet  = (key, defs) => prefs[key] ? new Set(prefs[key]) : new Set(defs);
    this._jellystatModal = {
      tab,
      histPage: 0, histSearch: '', histUser: null, histPlayMethod: null,
      histTotal: 0, histData: [], histUsers: [], histLoading: false,
      histColsOpen: false, histMobColsOpen: false,
      histHiddenCols:    hSet('histHiddenCols',    ['playMethod']),
      histMobHiddenCols: hSet('histMobHiddenCols', ['client','device','playMethod']),
      graphsSub: 'media', graphsData: null, graphsLoading: false,
      graphsMetric: 'plays', graphsRange: this._isMob ? 7 : 30,
      usersPage: 0, usersSearch: '',
      usersData: [], usersTotal: 0,
      usersHiddenCols:    hSet('usersHiddenCols',    ['userId']),
      usersMobHiddenCols: hSet('usersMobHiddenCols', ['lastSeen','userId']),
      usersColsOpen: false, usersMobColsOpen: false,
      libsPage: 0, libsSearch: '',
      libsData: [], libsTotal: 0,
      libsHiddenCols:    hSet('libsHiddenCols',    ['type']),
      libsMobHiddenCols: hSet('libsMobHiddenCols', ['type']),
      libsColsOpen: false, libsMobColsOpen: false,
    };
    this.shadowRoot.querySelector('[data-js-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._jsModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireJellystatModal(el);
    this._jsLoadTab(tab, el);
  }

  _closeJellystatModal() {
    this.shadowRoot.querySelector('[data-js-modal]')?.remove();
    this._jellystatModal = null;
  }

  _jsModalHtml(tab) {
    const isMobile = this._isMob;
    // Title dropped — the active tab already names the view
    const hdrInner = '<div id="js-nav-area" style="min-width:0;flex-shrink:1;overflow:hidden">' + this._jsNavHtml(tab) + '</div>'
      + '<div style="flex:1;min-width:8px"></div>'
      + '<button class="popup-close" id="js-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">' + ICONS.close + '</button>';
    const hdrStyle = isMobile
      ? 'padding:12px 12px 10px;gap:8px;align-items:center'
      : 'padding:14px 22px 10px;gap:12px;align-items:center';
    return '<div class="popup-overlay' + dayClass(this) + '" data-js-modal>'
      + '<div class="popup-glass tl-wide">'
      + '<div class="is-panel-hdr" style="' + hdrStyle + '">' + hdrInner + '</div>'
      + '<div class="popup-body" id="js-body" style="padding:' + (isMobile ? '12px 14px 16px' : '14px 22px 20px') + '"><div class="is-loading"><span>' + this._t('loading') + '</span></div></div>'
      + '</div></div>';
  }

  _jsNavHtml(tab) {
    const isMobile = this._isMob;
    const _ico = d => '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' + d + '</svg>';
    // Shelves / people / clock / bar chart — the same set Tautulli's header uses
    const NAV = [
      { id: 'libraries', icon: _ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>') },
      { id: 'users',     icon: _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>') },
      { id: 'history',   icon: _ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
      { id: 'graphs',    icon: _ico('<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/>') },
    ];
    // Four labelled pills overflow a phone header, so there the glyph carries
    // the meaning and only the active tab keeps its word.
    return '<div id="js-nav" class="mt-nav"><span class="mt-nav-ind"></span>' + NAV.map(g => {
      const on = g.id === tab;
      const label = this._jsTabLabel(g.id);
      return '<button class="mt-nav-btn' + (on ? ' is-on' : '') + '" data-js-tab="' + g.id + '" title="' + this._escHtml(label) + '">' + g.icon + ((!isMobile || on) ? label : '') + '</button>';
    }).join('') + '</div>';
  }

  _jsTabLabel(t) {
    return { libraries: this._t('tlLibraries'), users: this._t('tlUsers'), history: this._t('tlHistory'), graphs: this._t('tlGraphs') }[t] || t;
  }

  _jsTabTitle(t) {
    return { libraries: this._t('tlAllLibraries'), users: this._t('tlAllUsers'), history: this._t('tlRecentHistory'), graphs: this._t('tlPlayStatistics') }[t] || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Tab loader
  // ──────────────────────────────────────────────────────────────────────────

  async _jsLoadTab(tab, modal) {
    const body = modal.querySelector('#js-body');
    if (!body) return;

    if (tab === 'libraries') {
      body.innerHTML = `<div class="u-empty-dim">${this._t('loading')}</div>`;
      const m = this._jellystatModal;
      if (!m) return;
      const raw = await this._jsApiFetch('stats/getLibraryCardStats');
      if (!this._jellystatModal) return;
      m.libsData  = Array.isArray(raw) ? raw : (raw?.data || []);
      m.libsTotal = m.libsData.length;
      body.innerHTML = this._jsBodyLibraries();
      this._wireJellystatModalBody(body);

    } else if (tab === 'users') {
      body.innerHTML = '<div class="u-empty-dim">' + this._t('loading') + '</div>';
      const m = this._jellystatModal;
      if (!m) return;
      const raw = await this._jsApiFetch('stats/getAllUserActivity');
      if (!this._jellystatModal) return;
      m.usersData  = Array.isArray(raw) ? raw : (raw?.data || raw?.users || []);
      m.usersTotal = m.usersData.length;
      body.innerHTML = this._jsBodyUsers();
      this._wireJellystatModalBody(body);

    } else if (tab === 'history') {
      body.innerHTML = '<div class="u-empty-dim">' + this._t('loading') + '</div>';
      const m = this._jellystatModal;
      if (!m) return;
      m.histLoading = true;
      const perPage = this._tlCalcPerPage({ hasFilter: true });
      const [histRaw, usersRaw] = await Promise.all([
        this._jsApiFetch('getHistory?page=1&size=' + perPage),
        this._jsApiFetch('stats/getAllUserActivity'),
      ]);
      if (!this._jellystatModal) return;
      m.histData    = histRaw?.results || (Array.isArray(histRaw) ? histRaw : []);
      m.histTotal   = histRaw?.pages != null ? histRaw.pages * perPage : (histRaw?.totalCount ?? m.histData.length);
      m.histUsers   = Array.isArray(usersRaw) ? usersRaw : (usersRaw?.data || []);
      m.histLoading = false;
      body.innerHTML = this._jsBodyHistory();
      this._wireJellystatModalBody(body);

    } else if (tab === 'graphs') {
      const mg = this._jellystatModal;
      if (!mg) return;
      mg.graphsLoading = true;
      body.innerHTML   = this._jsBodyGraphs();
      const gd = await this._jsFetchGraphs();
      if (!this._jellystatModal) return;
      mg.graphsData    = gd;
      mg.graphsLoading = false;
      body.innerHTML   = this._jsBodyGraphs();
      this._wireJsGraphControls(body);
      this._tlGTriggerAnim(body);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API helper
  // ──────────────────────────────────────────────────────────────────────────

  async _jsApiFetch(endpoint, body) {
    try {
      const method = body !== undefined ? 'POST' : 'GET';
      return await this._hass.callApi(method, 'arr_stack/jellystat/' + endpoint, body);
    } catch (e) {
      console.warn('[arr-card] Jellystat fetch error:', endpoint, e);
      return null;
    }
  }
}

export const jellystatMixin = _JellystatMethods.prototype;
