// ──────────────────────────────────────────────────────────────────────────
// Tautulli — poster cards, modal shell, tab routing, history/graphs, API
// (icons/formatters → tautulli-shared.js | libs/users tables → tautulli-table.js)
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass } from '../shared/ui.js';

class _TautulliMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────

  _renderTautulli() {
    const data     = this._tautulli || {};
    const act      = data.activity  || {};
    const stats    = data.stats     || [];
    const showWarn = data.sharingDetected && !data.sharingAcked;
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('tautulli', 25, 75, 0.23)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('tautulli', 24)}
          <span class="col-hdr-title">${this._t('tlStatisticsPlex')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._tlLibCard(data)}
            ${showWarn ? this._tlSharingCard(data) : this._tlUsersCard(stats, act, data)}
            ${this._tlHistoryCard(data)}
            ${this._tlActivityCard(data.playsData)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _tlLibCard(data) {
    const libs = (data.libraries || []).filter(lib => (lib.section_type || '').toLowerCase() !== 'live');
    const rows = libs.map((lib, i) => {
      const type  = (lib.section_type || '').toLowerCase();
      const count = lib.count ?? lib.plays ?? 0;
      const dim   = count === 0 ? ';opacity:0.28' : '';
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:5px;padding:4px 0">`
        + this._tlLibSvgIcon(type, lib.section_name, 'sm')
        + `<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-left:1px">${lib.section_name || '—'}</span>`
        + `<span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0${dim}">${count}</span>`
        + `</div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('tlNoData')}</div>`;
    const sectTag = libs.length > 0
      ? `<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${libs.length}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="libraries">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('tlLibraries')}</span>
        ${sectTag}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  _tlUsersCard(stats, act, data) {
    const userRows = (stats || []).find(s => s.stat_id === 'top_users')?.rows || [];
    const sessions    = act?.sessions || [];
    const activeUsers = new Set(sessions.map(s => s.user_id || s.user)).size;
    const items    = userRows.slice(0, 5).map(r => {
      const name  = r.friendly_name || r.user || '—';
      const plays = r.total_plays ?? 0;
      const thumb = r.user_thumb || '';
      const av    = thumb
        ? `<img src="${thumb}" style="width:14px;height:14px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.18)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,0.14);display:inline-block;flex-shrink:0"></span>`;
      const sep = userRows.indexOf(r) > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:4px 0">${av}<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${name}</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${plays}</span></div>`;
    }).join('') || `<div style="font-size:9px;color:rgba(255,255,255,0.3)">${this._t('tlNoData')}</div>`;
    const activeTag = activeUsers > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${activeUsers} ${this._t('tlActive')}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="users">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap">
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="u-media-badge">${this._t('tlUsers')}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic;padding-left:2px">${this._t('tlLast7Days')}</span>
        </div>
        ${activeTag}
      </div>
      <div class="u-flex-rel">${items}</div>
    </div>`;
  }

  _tlSharingCard(data) {
    const name = (data.sharingUsers || [])[0] || this._t('tlUnknown');
    return `<div class="tl-card tl-card-warn" data-tl-open="users">
      <span class="media-type-tag" style="color:#fff">${this._t('tlSharing')}</span>
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(70,0,0,0.95) 0%,rgba(40,0,0,0.65) 55%,transparent 100%);padding:48px 8px 8px;z-index:1">
        <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${name}</div>
        <div style="font-size:9px;color:rgba(255,150,150,0.7)">${this._t('tlSharingHint')}</div>
      </div>
    </div>`;
  }

  _tlHistoryCard(data) {
    const hist    = data.recentHistory || [];
    const tlMax   = this._actCardMax('tl-history');
    const streams = (data.activity || {}).stream_count ?? 0;
    const items   = hist.length === 0
      ? `<div class="u-xxs-dim">${this._t('tlNoHistory')}</div>`
      : hist.map((h, i) => {
          const title  = h.full_title || h.title || '—';
          const user   = h.friendly_name || h.user || '';
          const ago    = h.date ? this._tlFmtDate(h.date) : '';
          const sep    = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
          const hidden = i >= tlMax ? 'display:none;' : '';
          return `<div style="${hidden}${sep}padding:4px 0"><div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px">${user}${ago ? ' · ' + ago : ''}</div></div>`;
        }).join('');
    const streamTag = streams > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${streams} ${this._t('tlNow')}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="history">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('tlHistory')}</span>
        ${streamTag}
      </div>
      <div data-act-content class="u-flex-ovh-rel">${items}</div>
    </div>`;
  }

  _tlActivityCard(playsData) {
    const days  = (playsData || []).slice(-7);
    const max   = Math.max(...days.map(d => d.value || 0), 1);
    const total = days.reduce((s, d) => s + (d.value || 0), 0);
    const today = new Date().getDate();
    const bars  = days.map(d => {
      const h   = Math.max(d.value ? 4 : 0, Math.round((d.value || 0) / max * 100));
      const gap = 100 - h;
      const isToday = d.date && parseInt((d.date || '').slice(-2), 10) === today;
      const bar = d.value
        ? `<div style="flex:${h};background:linear-gradient(to bottom,rgba(255,255,255,0.75),rgba(255,255,255,0.3));border-radius:3px 3px 0 0"></div>`
        : `<div style="flex:${h};display:none"></div>`;
      return `<div style="flex:1;display:flex;flex-direction:column;padding:0 1.5px"><div style="flex:${gap}"></div>${bar}</div>`;
    }).join('');
    const labels = days.map(d => {
      const day = (d.date || '').slice(-2);
      const isToday = parseInt(day, 10) === today;
      return `<div style="flex:1;font-size:7px;font-weight:${isToday ? '700' : '500'};color:${isToday ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'};text-align:center;padding:2px 0 0">${day}</div>`;
    }).join('');
    const playsTag = total > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(99,179,237,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} ${this._t('tlPlays')}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="graphs">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div>
      <div class="u-row-sb-w">
        <div style="display:flex;flex-direction:column;gap:1px">
          <span class="u-media-badge">${this._t('tlCharts')}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic">${this._t('tlLast7Days')}</span>
        </div>
        ${playsTag}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0">
        <div style="flex:1;display:flex;gap:0">${bars || ''}</div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1px 0"></div>
        <div style="display:flex;gap:0;margin-top:1px">${labels}</div>
      </div>
    </div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Modal — open / close / shell HTML
  // ──────────────────────────────────────────────────────────────────────────

  async _openTautulliModal(tab) {
    this._markActivated();
    tab = tab || 'libraries';
    const prefs = await this._tlLoadColPrefs();
    const hSet  = (key, defs) => prefs[key] ? new Set(prefs[key]) : new Set(defs);
    this._tautulliModal = {
      tab,
      ipReportOpen: true,
      histPage: 0, histPerPage: 10, histSearch: '',
      histUser: null, histMedia: null, histPlayback: null,
      histTotal: 0, histData: [], histUsers: [], histLoading: false,
      histDeleteMode: false,
      histColsOpen: false, histMobColsOpen: false,
      histHiddenCols:    hSet('histHiddenCols',    ['ip','paused','stopped']),
      histMobHiddenCols: hSet('histMobHiddenCols', ['ip','platform','product','player','paused','stopped']),
      graphsSub: 'media', graphsData: null, graphsLoading: false,
      graphsMetric: 'plays', graphsRange: this._isMob ? 7 : 30,
      graphsSelectedUsers: null, graphsUserList: [], graphsDdOpen: false,
      usersPage: 0, usersPerPage: 10, usersSortCol: 'plays', usersSortDir: 'desc',
      usersSearch: '',
      usersData: [], usersTotal: 0,
      usersHiddenCols:    hSet('usersHiddenCols',    ['username','fullname','email']),
      usersColsOpen: false,
      usersMobHiddenCols: hSet('usersMobHiddenCols', ['lastPlayed','platform','player','ip','username','email']),
      usersMobColsOpen: false,
      usersEditMode: false,
      libsPage: 0, libsPerPage: 10, libsSortCol: 'plays', libsSortDir: 'desc',
      libsSearch: '',
      libsData: [], libsTotal: 0,
      libsEditMode: false,
      libsHiddenCols:    hSet('libsHiddenCols',    ['type']),
      libsColsOpen: false,
      libsMobHiddenCols: hSet('libsMobHiddenCols', ['type','parents','children','lastStream']),
      libsMobColsOpen: false,
      // ── user detail ──────────────────────────────────────────────────────
      userDetailId: null, userDetailName: null, userDetailThumb: null,
      userDetailTab: 'profile',
      userDetailProfile: null,
      userDetailHistPage: 0, userDetailHistMedia: null, userDetailHistPlayback: null,
      userDetailHistSearch: '', userDetailHistTotal: 0, userDetailHistData: [],
      userDetailHistDeleteMode: false, userDetailHistLoading: false,
      userDetailHistColsOpen: false, userDetailHistMobColsOpen: false,
      userDetailHistHiddenCols:    hSet('udHistHiddenCols',    ['ip','paused','stopped']),
      userDetailHistMobHiddenCols: hSet('udHistMobHiddenCols', ['ip','platform','product','player','paused','stopped']),
      userDetailHistExpandedRow: null,
      userDetailIpsData: [], userDetailIpsPage: 0,
      userDetailIpsSortCol: 'last_seen', userDetailIpsSortDir: 'desc',
      // ── library detail ───────────────────────────────────────────────────
      libDetailId: null, libDetailName: null,
      libDetailTab: 'profile',
      libDetailProfile: null,
      libDetailHistPage: 0, libDetailHistMedia: null, libDetailHistPlayback: null,
      libDetailHistSearch: '', libDetailHistTotal: 0, libDetailHistData: [],
      libDetailHistDeleteMode: false,
      libDetailHistColsOpen: false, libDetailHistMobColsOpen: false,
      libDetailHistHiddenCols:    hSet('ldHistHiddenCols',    ['ip','paused','stopped']),
      libDetailHistMobHiddenCols: hSet('ldHistMobHiddenCols', ['ip','platform','product','player','paused','stopped']),
      libDetailHistExpandedRow: null,
      libDetailMediaPage: 0, libDetailMediaSearch: '',
      libDetailMediaTotal: 0, libDetailMediaData: [],
      libDetailMediaSort: 'added_at', libDetailMediaDir: 'desc',
      // ── media item detail ────────────────────────────────────────────────
      mediaDetailKey: null, mediaDetailTitle: null, mediaDetailThumb: null,
      mediaDetailTab: 'info',
      mediaDetailData: null,
      mediaDetailHistPage: 0, mediaDetailHistTotal: 0, mediaDetailHistData: [],
      mediaDetailPrev: null,   // 'lib' | 'user'
    };
    this.shadowRoot.querySelector('[data-tl-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._tlModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireTautulliModal(el);
    this._tlLoadTab(tab, el);
  }

  _closeTautulliModal() {
    this.shadowRoot.querySelector('[data-tl-modal]')?.remove();
    this._tautulliModal = null;
  }

  _tlModalHtml(tab) {
    const isMobile = this._isMob;
    const sub = this._tlTabSubtitle(tab);
    // Title dropped — the active tab already names the view. The subtitle stays,
    // moved beside the tabs, since it carries data the tab name does not.
    const hdrInner = `<div id="tl-nav-area" style="min-width:0;flex-shrink:1;overflow:hidden">${this._tlNavHtml(tab)}</div>
         <div id="tl-hdr-sub" style="font-size:12px;color:var(--is-text-sec);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0">${isMobile ? '' : (sub || '')}</div>
         <div style="flex:1;min-width:8px"></div>
         <button class="popup-close" id="tl-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${ICONS.close}</button>`;
    const hdrStyle = isMobile
      ? 'padding:12px 12px 10px;gap:8px;align-items:center'
      : 'padding:14px 22px 10px;gap:12px;align-items:center';
    return `<div class="popup-overlay${dayClass(this)}" data-tl-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="${hdrStyle}">${hdrInner}</div>
        <div class="popup-body" id="tl-body" style="padding:${isMobile ? '12px 14px 16px' : '14px 22px 20px'}">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  _tlNavHtml(tab) {
    const isMobile = this._isMob;
    const _ico = d => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    // Shelves / people / clock / bar chart
    const NAV = [
      { id: 'libraries', icon: _ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>') },
      { id: 'users',     icon: _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>') },
      { id: 'history',   icon: _ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
      { id: 'graphs',    icon: _ico('<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/>') },
    ];
    // Four labelled pills overflow a phone header, so there the glyph carries
    // the meaning and only the active tab keeps its word.
    return `<div id="tl-nav" class="mt-nav"><span class="mt-nav-ind"></span>${
      NAV.map(g => {
        const on = g.id === tab;
        const label = this._tlTabLabel(g.id);
        return `<button class="mt-nav-btn${on ? ' is-on' : ''}" data-tl-tab="${g.id}" title="${this._escHtml(label)}">${g.icon}${(!isMobile || on) ? label : ''}</button>`;
      }).join('')}</div>`;
  }

  _tlTabLabel(t) {
    return { libraries: this._t('tlLibraries'), users: this._t('tlUsers'), history: this._t('tlHistory'), graphs: this._t('tlGraphs') }[t] || t;
  }

  _tlTabIcon(t) {
    return {
      libraries: this._tlSvgLibraries(),
      users:     this._tlSvgUsers(),
      history:   this._tlSvgStreams(),
      graphs:    this._tlSvgGraphs(),
    }[t] || '';
  }

  _tlTabTitle(t) {
    return { libraries: this._t('tlAllLibraries'), users: this._t('tlAllUsers'), history: this._t('tlRecentHistory'), graphs: this._t('tlPlayStatistics') }[t] || '';
  }

  _tlTabSubtitle(t) {
    return { libraries:'', users:'', history:'', graphs:'' }[t] || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Tab loader
  // ──────────────────────────────────────────────────────────────────────────

  async _tlLoadTab(tab, modal) {
    const body = modal.querySelector('#tl-body');
    if (!body) return;
    if (tab === 'libraries') {
      body.innerHTML = `<div class="u-empty-dim">${this._t('loading')}</div>`;
      const ml = this._tautulliModal;
      if (!ml) return;
      const _pp = this._tlCalcPerPage();
      const r = await this._tlApiFetch('get_libraries_table', `length=${_pp}&start=${(ml.libsPage||0)*_pp}&order_column=${ml.libsSortCol||'plays'}&order_dir=${ml.libsSortDir||'desc'}`);
      if (!this._tautulliModal) return;
      ml.libsData  = r?.response?.data?.data || [];
      ml.libsTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || ml.libsData.length;
      body.innerHTML = this._tlBodyLibraries(ml.libsData, ml.libsTotal);
      this._wireTautulliModalBody(body);
    } else if (tab === 'users') {
      body.innerHTML = `<div class="u-empty-dim">${this._t('loading')}</div>`;
      const m2 = this._tautulliModal;
      if (!m2) return;
      const _pp2 = this._tlCalcPerPage();
      const r = await this._tlApiFetch('get_users_table', `length=${_pp2}&start=${(m2.usersPage||0)*_pp2}&order_column=${m2.usersSortCol||'plays'}&order_dir=${m2.usersSortDir||'desc'}`);
      if (!this._tautulliModal) return;
      m2.usersData  = r?.response?.data?.data || [];
      m2.usersTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || m2.usersData.length;
      body.innerHTML = this._tlBodyUsers(m2.usersData, m2.usersTotal);
      this._wireTautulliModalBody(body);
    } else if (tab === 'history') {
      if (!this._tautulliModal) return;
      this._tautulliModal.histLoading = true;
      body.innerHTML = `<div class="u-empty-dim">${this._t('loading')}</div>`;
      const [data, usersR] = await Promise.all([
        this._tlFetchHistory(0, null, null, null, this._tlCalcPerPage({ hasFilter: true })),
        this._tlApiFetch('get_users_table', 'length=100&start=0&order_column=friendly_name&order_dir=asc'),
      ]);
      if (!this._tautulliModal) return;
      this._tautulliModal.histData    = data.data || [];
      this._tautulliModal.histTotal   = data.recordsFiltered || 0;
      this._tautulliModal.histLoading = false;
      this._tautulliModal.histUsers   = usersR?.response?.data?.data || [];
      body.innerHTML = this._tlBodyHistory();
      this._wireTautulliModalBody(body);
    } else if (tab === 'graphs') {
      const mg = this._tautulliModal;
      if (!mg) return;
      // Fetch user list on first open (needed for user dropdown)
      if (!mg.graphsUserList?.length) {
        const ur = await this._tlApiFetch('get_users_table', 'length=100&start=0&order_column=friendly_name&order_dir=asc');
        if (!this._tautulliModal) return;
        mg.graphsUserList = ur?.response?.data?.data || [];
      }
      mg.graphsLoading = true;
      body.innerHTML   = this._tlBodyGraphs();
      const gd = await this._tlFetchGraphs();
      if (!this._tautulliModal) return;
      mg.graphsData    = gd;
      mg.graphsLoading = false;
      body.innerHTML   = this._tlBodyGraphs();
      this._wireGraphControls(body);
      this._tlGTriggerAnim(body);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API helpers
  // ──────────────────────────────────────────────────────────────────────────

  async _tlApiFetch(cmd, params) {
    try {
      return await this._hass.callApi('GET', `arr_stack/tautulli/${cmd}${params ? '?' + params : ''}`);
    } catch (e) {
      console.warn('[arr-card] Tautulli fetch error:', cmd, e);
      return null;
    }
  }

  async _tlFetchHistory(page, user, media, playback, perPage, search) {
    perPage = perPage || 10;
    const start = (page || 0) * perPage;
    let p = `length=${perPage}&start=${start}&order_column=date&order_dir=desc`;
    if (user)     p += `&user_id=${encodeURIComponent(user)}`;
    if (media)    p += `&media_type=${encodeURIComponent(media)}`;
    if (playback) p += `&transcode_decision=${encodeURIComponent(playback)}`;
    if (search)   p += `&search=${encodeURIComponent(search)}`;
    const r = await this._tlApiFetch('get_history', p);
    return r?.response?.data || { data: [], recordsFiltered: 0 };
  }

  async _tlFetchUserProfile(userId) {
    const [wts, ps, hist] = await Promise.all([
      this._tlApiFetch('get_user_watch_time_stats', `user_id=${userId}`),
      this._tlApiFetch('get_user_player_stats',     `user_id=${userId}`),
      this._tlApiFetch('get_history', `user_id=${userId}&length=12&start=0&order_column=date&order_dir=desc`),
    ]);
    return {
      watchTimeStats: wts?.response?.data || [],
      playerStats:    ps?.response?.data  || [],
      recentHistory:  hist?.response?.data?.data || [],
    };
  }

  async _tlFetchUserIps(userId) {
    const r = await this._tlApiFetch('get_user_ips', `user_id=${userId}&length=100&start=0`);
    return r?.response?.data?.data || [];
  }

  async _tlFetchLibProfile(sectionId) {
    const [wts, us, hist] = await Promise.all([
      this._tlApiFetch('get_library_watch_time_stats', `section_id=${sectionId}`),
      this._tlApiFetch('get_library_user_stats',       `section_id=${sectionId}`),
      this._tlApiFetch('get_history', `section_id=${sectionId}&length=12&start=0&order_column=date&order_dir=desc`),
    ]);
    return {
      watchTimeStats: wts?.response?.data || [],
      userStats:      us?.response?.data  || [],
      recentHistory:  hist?.response?.data?.data || [],
    };
  }

  async _tlFetchLibHistory(sectionId, page, media, playback, search, perPage) {
    perPage = perPage || 10;
    let p = `section_id=${sectionId}&length=${perPage}&start=${(page||0)*perPage}&order_column=date&order_dir=desc`;
    if (media)    p += `&media_type=${encodeURIComponent(media)}`;
    if (playback) p += `&transcode_decision=${encodeURIComponent(playback)}`;
    if (search)   p += `&search=${encodeURIComponent(search)}`;
    const r = await this._tlApiFetch('get_history', p);
    return r?.response?.data || { data: [], recordsFiltered: 0 };
  }

  async _tlFetchLibMedia(sectionId, page, sort, dir, search, perPage) {
    perPage = perPage || 25;
    let p = `section_id=${sectionId}&length=${perPage}&start=${(page||0)*perPage}&order_column=${sort||'added_at'}&order_dir=${dir||'desc'}`;
    if (search) p += `&search=${encodeURIComponent(search)}`;
    const r = await this._tlApiFetch('get_library_media_info', p);
    return r?.response?.data || { data: [], recordsTotal: 0, recordsFiltered: 0 };
  }

  async _tlFetchMediaDetail(ratingKey) {
    const [meta, wts, us] = await Promise.all([
      this._tlApiFetch('get_metadata',              `rating_key=${ratingKey}`),
      this._tlApiFetch('get_item_watch_time_stats', `rating_key=${ratingKey}&grouping=0`),
      this._tlApiFetch('get_item_user_stats',       `rating_key=${ratingKey}&grouping=0`),
    ]);
    return {
      metadata:       meta?.response?.data || {},
      watchTimeStats: wts?.response?.data  || [],
      userStats:      us?.response?.data   || [],
    };
  }

  async _tlFetchMediaHistory(ratingKey, page, perPage) {
    perPage = perPage || 10;
    const p = `rating_key=${ratingKey}&length=${perPage}&start=${(page||0)*perPage}&order_column=date&order_dir=desc`;
    const r = await this._tlApiFetch('get_history', p);
    return r?.response?.data || { data: [], recordsFiltered: 0 };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SVG icons (16px, tab icons)
  // ──────────────────────────────────────────────────────────────────────────

  _tlSvgLibraries() { return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M8 3v18M16 3v18"/></svg>`; }
  _tlSvgUsers()     { return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`; }
  _tlSvgStreams()   { return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`; }
  _tlSvgGraphs()    { return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`; }
  _tlSvgWarn()      { return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>`; }
}

export const tautulliMixin = _TautulliMethods.prototype;
