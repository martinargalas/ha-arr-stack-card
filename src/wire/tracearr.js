// ──────────────────────────────────────────────────────────────────────────
// Tracearr — wiring: poster clicks, modal, tab switching, filters, pagination
// ──────────────────────────────────────────────────────────────────────────
import { ICONS } from '../shared/ui.js';

class _WireTraceaRrMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — delegate clicks to open modal on correct tab
  // ──────────────────────────────────────────────────────────────────────────

  _wireTracearrPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._traWired) return;
    right._traWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-tra-open]');
      if (!card) return;
      this._openTracearrModal(card.dataset.traOpen);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Modal outer wiring (close button, overlay click, tab buttons)
  // ──────────────────────────────────────────────────────────────────────────

  _wireTracearrModal(el) {
    const glass = el.querySelector('.popup-glass');

    // Place the header (or, on a phone, the bottom bar's) fill once the markup
    // is in the document.
    requestAnimationFrame(() => {
      const nav = glass.querySelector('#tra-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
      this._syncSubNavInd(nav);
      glass.querySelectorAll('.tra-mnav-row').forEach(row =>
        this._syncNavInd(row, row.querySelector('.tra-mnav-btn.is-on')));
    });

    el.addEventListener('click', e => {
      if (!glass.contains(e.target)) this._closeTracearrModal();
    });

    glass.addEventListener('click', e => {
      e.stopPropagation();

      const closeEl = e.target.closest('#tra-close');
      if (closeEl) {
        // While a rule is being made it walks back one step instead of closing.
        if (closeEl.dataset.traBack === '1') {
          const live = glass.querySelector('#tra-body');
          const back = live?.querySelector('#tra-rf-cancel') || live?.querySelector('#tra-hist-detail-back');
          if (back) { back.click(); return; }
          this._traLoadTab('rules', el);
          return;
        }
        this._closeTracearrModal();
        return;
      }

      const srvBtn = e.target.closest('[data-tra-server]');
      if (srvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = srvBtn.dataset.traServer;
        m.selectedServerId = sid;
        this._traSaveSrv(sid);
        m.stalePage = 0;
        m.staleDeduped = null;
        glass.querySelectorAll('[data-tra-server]').forEach(b => b.classList.toggle('active', b === srvBtn));
        this._traLoadTab('storage', el);
        return;
      }

      const qualSrvBtn = e.target.closest('[data-tra-quality-srv]');
      if (qualSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        m.qualityServerId = qualSrvBtn.dataset.traQualitySrv || null;
        this._traSaveSrv(m.qualityServerId);
        m.qualityData = null; m._qualityKey = null; m.qualityResolution = null;
        glass.querySelectorAll('[data-tra-quality-srv]').forEach(b => b.classList.toggle('active', b === qualSrvBtn));
        this._traLoadTab('quality', el);
        return;
      }

      const watchSrvBtn = e.target.closest('[data-tra-watch-srv]');
      if (watchSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = watchSrvBtn.dataset.traWatchSrv || null;
        m.watchServerId = sid;
        this._traSaveSrv(sid);
        m.watchPatterns = null; m.watchStatus = null; m.watchCompletion = null;
        m.watchTopMovies = null; m.watchTopShows = null;
        m.watchSrvKey = null; m.watchSrvPeriodKey = null;
        glass.querySelectorAll('[data-tra-watch-srv]').forEach(b => b.classList.toggle('active', b === watchSrvBtn));
        this._traLoadTab('watch', el);
        return;
      }

      const devMobTab = e.target.closest('[data-tra-dev-mob-tab]');
      if (devMobTab) {
        const m = this._tracearrModal;
        if (!m) return;
        m.devMobView = devMobTab.dataset.traDevMobTab;
        m.devHealthPage = 0; m.devMatrixPage = 0; m.devHotspotsPage = 0; m.devUsersPage = 0;
        const _b0 = el.querySelector('#tra-body');
        // Rewire too: the sliding fill is placed by measurement there, and
        // without it the group renders with a zero-width indicator.
        if (_b0) { _b0.innerHTML = this._traBodyDevices(); this._wireTracearrModalBody(_b0); }
        return;
      }

      const devRightTab = e.target.closest('[data-tra-dev-right-tab]');
      if (devRightTab) {
        const m = this._tracearrModal;
        if (!m) return;
        m.devicesRightView = devRightTab.dataset.traDevRightTab;
        m.devHotspotsPage = 0; m.devUsersPage = 0;
        const _b1 = el.querySelector('#tra-body');
        if (_b1) { _b1.innerHTML = this._traBodyDevices(); this._wireTracearrModalBody(_b1); }
        return;
      }

      const devLeftTab = e.target.closest('[data-tra-dev-left-tab]');
      if (devLeftTab) {
        const m = this._tracearrModal;
        if (!m) return;
        m.devicesLeftView = devLeftTab.dataset.traDevLeftTab;
        m.devHealthPage = 0; m.devMatrixPage = 0;
        const _b2 = el.querySelector('#tra-body');
        if (_b2) { _b2.innerHTML = this._traBodyDevices(); this._wireTracearrModalBody(_b2); }
        return;
      }

      const devPage = e.target.closest('[data-tra-dev-page]');
      if (devPage) {
        const m = this._tracearrModal;
        if (!m) return;
        const [view, dir] = devPage.dataset.traDevPage.split('-');
        const delta = dir === 'next' ? 1 : -1;
        const PAGE = 6;
        const lens = { health: (m.devicesHealth?.data||[]).length, matrix: (m.devicesMatrix?.devices||[]).length, hotspots: (m.devicesHotspots?.data||[]).length, users: (m.devicesUsers?.data||[]).length };
        const keys = { health: 'devHealthPage', matrix: 'devMatrixPage', hotspots: 'devHotspotsPage', users: 'devUsersPage' };
        const key = keys[view];
        if (!key) return;
        const max = Math.max(0, Math.ceil(lens[view] / PAGE) - 1);
        m[key] = Math.max(0, Math.min(max, (m[key] || 0) + delta));
        const _b3 = el.querySelector('#tra-body'); if (_b3) { _b3.innerHTML = this._traBodyDevices(); this._wireTracearrModalBody(_b3); }
        return;
      }

      const devSrvBtn = e.target.closest('[data-tra-dev-srv]');
      if (devSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        m.devicesServerId = devSrvBtn.dataset.traDevSrv || null;
        m.devicesData = null; m.devicesHealth = null; m.devicesHotspots = null; m.devicesMatrix = null; m.devicesUsers = null;
        m.devHealthPage = 0; m.devMatrixPage = 0; m.devHotspotsPage = 0; m.devUsersPage = 0;
        this._traSaveSrv(m.devicesServerId);
        glass.querySelectorAll('[data-tra-dev-srv]').forEach(b => b.classList.toggle('active', b === devSrvBtn));
        this._traLoadTab('devices', el);
        return;
      }

      const bwSrvBtn = e.target.closest('[data-tra-bw-srv]');
      if (bwSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        m.bwServerId = bwSrvBtn.dataset.traBwSrv || null;
        m.bwSummary = null; m.bwDaily = null; m.bwUsers = null; m.bwUsersPage = 0;
        try { localStorage.setItem('arr-tra-srv', m.bwServerId); } catch(_) {}
        glass.querySelectorAll('[data-tra-bw-srv]').forEach(b => b.classList.toggle('active', b === bwSrvBtn));
        this._traLoadTab('bandwidth', el);
        return;
      }

      const bwPeriodBtn = e.target.closest('[data-tra-bw-period]');
      if (bwPeriodBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        m.bwPeriod = bwPeriodBtn.dataset.traBwPeriod || 'month';
        m.bwSummary = null; m.bwDaily = null; m.bwUsers = null; m.bwUsersPage = 0;
        this._traLoadTab('bandwidth', el);
        return;
      }


      const violsSrvBtn = e.target.closest('[data-tra-viols-srv]');
      if (violsSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = violsSrvBtn.dataset.traViolsSrv || null;
        m.violsServerId = sid;
        m.violsPage = 0;
        this._traSaveSrv(sid);
        glass.querySelectorAll('[data-tra-viols-srv]').forEach(b => b.classList.toggle('active', b === violsSrvBtn));
        this._traLoadTab('violations', el);
        return;
      }

      const histSrvBtn = e.target.closest('[data-tra-hist-srv]');
      if (histSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = histSrvBtn.dataset.traHistSrv || null;
        m.histServer = sid;
        m.histPage = 0;
        this._traSaveSrv(sid);
        glass.querySelectorAll('[data-tra-hist-srv]').forEach(b => b.classList.toggle('active', b === histSrvBtn));
        this._traLoadTab('history', el);
        return;
      }

      const actSrvBtn = e.target.closest('[data-tra-act-srv]');
      if (actSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = actSrvBtn.dataset.traActSrv || null;
        m.activityServerId = sid;
        m.activityData = null;
        this._traSaveSrv(sid);
        glass.querySelectorAll('[data-tra-act-srv]').forEach(b => b.classList.toggle('active', b === actSrvBtn));
        this._traLoadTab('activity', el);
        return;
      }

      const suSrvBtn = e.target.closest('[data-tra-su-srv]');
      if (suSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = suSrvBtn.dataset.traSuSrv || null;
        m.statsUsersServerId = sid;
        m.statsUsersData = null;
        this._traSaveSrv(sid);
        glass.querySelectorAll('[data-tra-su-srv]').forEach(b => b.classList.toggle('active', b === suSrvBtn));
        this._traLoadTab('statsUsers', el);
        return;
      }

      const usrSrvBtn = e.target.closest('[data-tra-usr-srv]');
      if (usrSrvBtn) {
        const m = this._tracearrModal;
        if (!m) return;
        const sid = usrSrvBtn.dataset.traUsrSrv || null;
        m.usersServerId = sid;
        m.usersPage = 0;
        this._traSaveSrv(sid);
        glass.querySelectorAll('[data-tra-usr-srv]').forEach(b => b.classList.toggle('active', b === usrSrvBtn));
        this._traLoadTab('users', el);
        return;
      }

      const _TRA_NAV = [
        { id: 'map',         tab: 'map'         },
        { id: 'history',     tab: 'history'     },
        { id: 'stats',       sub: [['activity',this._t('actActivity')],['statsUsers',this._t('tlUsers')]]                           },
        { id: 'library',     sub: [['quality',this._t('actColQuality')],['storage',this._t('storage')],['watch',this._t('traWatchTab')]]             },
        { id: 'performance', sub: [['devices',this._t('traDevices')],['bandwidth',this._t('traBandwidth')]]                          },
        { id: 'users',       tab: 'users'       },
        { id: 'rules',       tab: 'rules'       },
        { id: 'violations',  tab: 'violations'  },
      ];
      const _SRV_TABS = ['storage','quality','history','activity','statsUsers','users','watch','devices','bandwidth','map','violations'];
      const _day = this._isDay;

      const _updateMobileNav = () => {
        const panel = glass.querySelector('#tra-mobile-nav');
        if (!panel) return;
        const m = this._tracearrModal;
        // Where each row's fill sits right now, so the rebuilt bar can slide it
        // rather than have it jump — same trick as the desktop header menu.
        const before = [...panel.querySelectorAll('.tra-mnav-row')].map(r => this._navIndRect(r));
        const wasSub = !!panel.querySelector('.tra-mnav-sub');
        const tmp = document.createElement('div');
        tmp.innerHTML = this._traMobileNavHtml(m.tab, m.navGroup);
        panel.innerHTML = tmp.firstElementChild.innerHTML;
        const rows = [...panel.querySelectorAll('.tra-mnav-row')];
        const hasSub = !!panel.querySelector('.tra-mnav-sub');
        rows.forEach((row, i) => {
          // A sub row appearing or vanishing shifts which row is which, so its
          // fill starts fresh instead of sliding from the other row's place.
          const from = (wasSub === hasSub) ? before[i] : null;
          this._syncNavInd(row, row.querySelector('.tra-mnav-btn.is-on'), from);
        });
      };

      // The whole header nav is rebuilt on every change — its sub-tab track
      // opens and closes with the selected group, so patching inline styles
      // could never express it.
      const _redrawNav = () => {
        const area = glass.querySelector('#tra-nav-area');
        const m = this._tracearrModal;
        if (!area || !m) return null;
        const from = this._navIndRect(glass.querySelector('#tra-nav'));
        const subFrom = this._navIndRect(glass.querySelector('#tra-nav .mt-nav-sub-wrap.is-open'));
        area.innerHTML = this._traNavHtml(m.tab, m.navGroup);
        const nav = glass.querySelector('#tra-nav');
        this._syncNavInd(nav, nav?.querySelector(`.mt-nav-btn[data-tra-nav="${m.navGroup}"]`), from);
        // The sub-tab track animates its width open, so its own fill waits a
        // frame for the buttons to have usable geometry.
        requestAnimationFrame(() => this._syncSubNavInd(nav, subFrom));
        return nav;
      };

      const navBtn = e.target.closest('[data-tra-nav]');
      if (navBtn) {
        const m = this._tracearrModal; if (!m) return;
        const groupId = navBtn.dataset.traNav;
        const grp = _TRA_NAV.find(g => g.id === groupId);
        if (!grp || (!grp.tab && !grp.sub)) return;

        if (grp.sub?.length) {
          // Opening a group lands on its first sub-tab; clicking it again folds
          // the track back up without changing what is shown.
          const expanding = m.navGroup !== groupId;
          m.navGroup = expanding ? groupId : null;
          _redrawNav();
          _updateMobileNav();
          if (expanding && !grp.sub.some(([tid]) => tid === m.tab)) {
            m.tab = grp.sub[0][0];
            _redrawNav();
            _updateMobileNav();
            this._traLoadTab(m.tab, el);
          }
        } else if (grp.tab) {
          m.navGroup = groupId;
          m.tab = grp.tab;
          _redrawNav();
          const srvEl = glass.querySelector('#tra-hdr-server');
          if (srvEl && !_SRV_TABS.includes(grp.tab)) srvEl.style.display = 'none';
          _updateMobileNav();
          this._traLoadTab(grp.tab, el);
        }
        return;
      }

      const tabBtn = e.target.closest('[data-tra-tab]');
      if (tabBtn) {
        const m = this._tracearrModal; if (!m) return;
        const tab = tabBtn.dataset.traTab;
        if (m.tab === tab) return;
        m.tab = tab;
        _redrawNav();
        const srvEl = glass.querySelector('#tra-hdr-server');
        if (srvEl && !_SRV_TABS.includes(tab)) srvEl.style.display = 'none';
        _updateMobileNav();
        this._traLoadTab(tab, el);
      }
    });

    // Re-render on viewport resize — full modal rebuild on mobile↔desktop cross
    const _getBucket = () => window.innerWidth > 600 ? (window.innerWidth > 860 ? 2 : 1) : 0;
    let _lastBucket = _getBucket();
    let _resizeTimer = null;
    const _onResize = () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        if (!this._tracearrModal || !el.isConnected) {
          window.removeEventListener('resize', _onResize);
          return;
        }
        const bucket = _getBucket();
        if (bucket === _lastBucket) return;
        const crossedMobile = (_lastBucket === 0) !== (bucket === 0);
        _lastBucket = bucket;
        if (crossedMobile) {
          // Rebuild entire modal shell (mobile nav vs desktop nav differ in HTML)
          const m   = this._tracearrModal;
          const tab = m.tab;
          const navGroup = m.navGroup;
          el.remove();
          const wrap2 = document.createElement('div');
          wrap2.innerHTML = this._traModalHtml(tab, navGroup);
          const el2 = wrap2.firstElementChild;
          this.shadowRoot.appendChild(el2);
          this._wireTracearrModal(el2);
          this._traLoadTab(tab, el2);
        } else {
          this._traLoadTab(this._tracearrModal.tab, el);
        }
      }, 150);
    };
    window.addEventListener('resize', _onResize);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Modal body wiring — called after every innerHTML replace
  // ──────────────────────────────────────────────────────────────────────────

  _wireTracearrModalBody(body) {
    const m = this._tracearrModal;
    if (!m) return;

    // Every in-card switch is a header-menu group whose fill is placed by
    // measurement, so each one gets positioned once the body is in the
    // document. Doing it here covers all of them, however deep they sit.
    requestAnimationFrame(() => {
      body.querySelectorAll('.mt-nav--inline').forEach(nav =>
        this._syncNavInd(nav, nav.querySelector('.mt-nav-btn.is-on')));
    });

    // For the switches that refresh only their own rows, the group has to be
    // re-flagged and its fill slid across by hand.
    const _segTo = btn => {
      const nav = btn.closest('.mt-nav--inline');
      if (!nav) return;
      const from = this._navIndRect(nav);
      nav.querySelectorAll('.mt-nav-btn').forEach(b => b.classList.toggle('is-on', b === btn));
      this._syncNavInd(nav, btn, from);
    };

    const modal = () => body.closest('[data-tra-modal]');

    // Pagination helper — resolves first/prev/next/last/numeric
    const resolvePage = (val, current, total) => {
      if (val === 'first') return 0;
      if (val === 'prev')  return Math.max(0, current - 1);
      if (val === 'next')  return Math.min(total - 1, current + 1);
      if (val === 'last')  return total - 1;
      const n = parseInt(val, 10);
      return isNaN(n) ? current : n;
    };

    this._traWireRules(body, modal);

    this._traWireUsers(body, modal, resolvePage);

    this._traWireViolations(body, modal, resolvePage);

    this._traWireHistory(body, m, modal, resolvePage);

    this._traWireMap(body, m, modal);

    this._traWireActivity(body, modal);

    this._traWireDevices(body, m, modal);

    this._traWireQuality(body, m);

    this._traWireStorage(body);

    this._traWireWatch(body, m, _segTo);

    this._traWireStale(body, m, resolvePage);

    this._traWireBandwidth(body, m, resolvePage);

    // ── Shared chart wiring (tooltips + SVG fix) ──────────────────────────
    this._wireChartCards(body);
    this._tlGTriggerAnim(body);

    // ── Donut hover ──────────────────────────────────────────────────────
    body.querySelectorAll('.donut-wrap').forEach(wrap => {
      const arcs  = wrap.querySelectorAll('.donut-arc');
      const rings = wrap.querySelectorAll('.donut-ring');
      const tt    = wrap.querySelector('.donut-tt');
      if (!tt) return;
      arcs.forEach((arc, i) => {
        arc.addEventListener('mouseenter', () => {
          if (rings[i]) rings[i].style.strokeOpacity = '0.22';
          tt.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:2px">${arc.dataset.label}</div><div style="font-size:10px;opacity:0.65">${this._t('traItemsPct').replace('{n}', arc.dataset.value).replace('{p}', arc.dataset.pct)}</div>`;
          tt.style.display = 'block';
        });
        arc.addEventListener('mousemove', e => {
          const rect = wrap.getBoundingClientRect();
          let x = e.clientX - rect.left + 10;
          let y = e.clientY - rect.top  - 38;
          tt.style.left = x + 'px';
          tt.style.top  = y + 'px';
        });
        arc.addEventListener('mouseleave', () => {
          if (rings[i]) rings[i].style.strokeOpacity = '0';
          tt.style.display = 'none';
        });
      });
    });
  }

  _traRefreshHdrActions(body) {
    const modal = body.closest('[data-tra-modal]');
    if (!modal) return;
    const hdr = modal.querySelector('#tra-hdr-actions');
    if (!hdr) return;

    const CHECK = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
    const BACK  = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="15 18 9 12 15 6"/></svg>`;
    const PLUS  = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    const S = 30;

    const hasForm   = !!body.querySelector('#tra-rf-save');
    const hasList   = !!body.querySelector('#tra-rules-list');
    const hasPicker = !!body.querySelector('[data-tra-rule-template]');
    const hasDetail = !!body.querySelector('#tra-hist-detail');

    // Save and Add live here rather than at the foot of the form — the same
    // arrangement Maintainerr's editor uses. Going back is not a button of its
    // own: the modal's close turns into it, as it does there.
    const parts = [];
    // Nothing to save until something changes — the check stays grey until the
    // form is touched, so it never invites a pointless write.
    const dirty = !!body.querySelector('[data-tra-dirty="1"]');
    if (hasForm) parts.push(this._mtRoundBtn('data-tra-hdr-save', CHECK, this._t('mtSave'), { size: S, tone: 'blue', active: dirty, disabled: !dirty }));
    if (hasList) parts.push(this._mtRoundBtn('data-tra-hdr-add', PLUS, this._t('mtAddRule'), { size: S, tone: 'blue' }));
    hdr.innerHTML = parts.join('');

    const closeBtn = modal.querySelector('#tra-close');
    const isBack   = hasForm || hasPicker || hasDetail;
    if (closeBtn) {
      closeBtn.dataset.traBack = isBack ? '1' : '';
      closeBtn.innerHTML = isBack ? BACK : ICONS.close;
      closeBtn.title = isBack ? this._t('mtCancel') : '';
    }

    if (hdr._traWired) return;
    hdr._traWired = true;
    hdr.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const live = modal.querySelector('#tra-body') || body;
      if (b.hasAttribute('data-tra-hdr-save')) {
        live.querySelector('#tra-rf-save')?.click();
      } else if (b.hasAttribute('data-tra-hdr-add')) {
        // Desktop offers the classic/custom choice in a small menu anchored to
        // the list; a phone has no room for it and goes straight to templates.
        const menu = live.querySelector('#tra-rules-add-menu');
        if (menu && !this._isMob) { menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; return; }
        live.innerHTML = this._traRuleTemplatePicker();
        this._wireTracearrModalBody(live);
        this._traRefreshHdrActions(live);
      }
    });
  }
}

export const wireTracearrMixin = _WireTraceaRrMethods.prototype;
