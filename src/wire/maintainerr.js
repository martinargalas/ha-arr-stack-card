// ──────────────────────────────────────────────────────────────────────────
// Maintainerr wire — card clicks, modal event handling, CRUD, rule editor
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass, isMobile } from '../shared/ui.js';

class _WireMaintainerrMethods {

  // ── Poster clicks → open modal ────────────────────────────────────────────

  // ── Modal lifecycle ───────────────────────────────────────────────────────

  async _openMaintainerrModal(tab) {
    this._markActivated();
    tab = tab || 'rules';
    this._maintainerrModal = {
      tab, search: '', page: 0,
      filterLib: 'all', filterStatus: 'all',
      // View switches are remembered across sessions; offsets and pages are not
      view: this._mtPref('rules-view', 'cards', ['cards', 'table']),
      colView: this._mtPref('col-view', 'cards', ['cards', 'table']),
      cal: { weekOffset: 0, monthOffset: 0, view: this._mtPref('cal-view', 'week', ['week', 'month']), dayModal: null },
      editor: null,
      execStatus: null,
      runningId: null,
      handlingId: null,
      colSearch: '',
      colSubTab: null,
    };

    if (!this._maintainerrLibraries?.length) {
      try {
        const libs = await this._hass.callApi('GET', 'arr_stack/maintainerr/media-server/libraries').catch(() => null);
        this._maintainerrLibraries = Array.isArray(libs) ? libs : [];
      } catch (_) {}
    }

    this.shadowRoot.querySelector('[data-mt-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._mtModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireMaintainerrModal(el);
    this._mtLoadTab(tab, el);
  }

  // Remembered UI choices. localStorage can throw in locked-down browsers, and
  // a stale value must never leave the control in a state it cannot render.
  _mtPref(key, dflt, allowed) {
    try {
      const v = localStorage.getItem(`arr-mt-${key}`);
      if (v && (!allowed || allowed.includes(v))) return v;
    } catch (_) {}
    return dflt;
  }

  _mtPrefSet(key, value) {
    try { localStorage.setItem(`arr-mt-${key}`, value); } catch (_) {}
  }

  _closeMaintainerrModal() {
    this.shadowRoot.querySelector('[data-mt-modal]')?.remove();
    this._maintainerrModal = null;
    this._mtPopupReturn = null;
  }

  // ── Tab loading ───────────────────────────────────────────────────────────

  _mtLoadTab(tab, modal) {
    const el = modal || this.shadowRoot.querySelector('[data-mt-modal]');
    const body = el?.querySelector('#mt-body');
    if (!body) return;
    const m = this._maintainerrModal;
    if (!m) return;
    m.tab = tab;

    // Replacing the body drops focus, so a debounced search would eat the rest
    // of the word being typed. Remember the focused search box and restore it.
    const active = this.shadowRoot?.activeElement;
    const focusedId = (active && active.tagName === 'INPUT' && body.contains(active)) ? active.id : null;
    const caret = focusedId ? active.selectionStart : null;

    this._mtRefreshTabBtns(el);

    if (tab === 'overview')    body.innerHTML = this._mtOverviewTabHtml();
    else if (tab === 'rules')       body.innerHTML = this._mtRulesTabHtml();
    else if (tab === 'collections') body.innerHTML = this._mtCollectionsTabHtml();
    else if (tab === 'calendar')    body.innerHTML = this._mtCalendarTabHtml();

    if (focusedId) {
      const inp = body.querySelector(`#${focusedId}`);
      if (inp) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (_) {} }
    }

    // Views that lay themselves out and pin their own footer. Rules joins them
    // so its paging and view switch stay at the bottom of the modal.
    // The rule editor lives inside the Rules tab but is a plain scrolling
    // document, not a grid with a pinned footer — treating it like one hid its
    // overflow and there was no way to reach the lower sections.
    const editing = tab === 'rules' && !!m.editor;
    const posterView = !editing && (tab === 'overview' || tab === 'calendar'
      || tab === 'rules' || tab === 'collections');
    // Undo the editor's block display — the list views lay themselves out as
    // flex columns with a pinned footer.
    body.style.display = editing ? 'block' : '';
    // Same !important as the editor path: a plain inline value is overridden.
    body.style.setProperty('overflow-y', posterView ? 'hidden' : 'auto', 'important');
    // Reclaim the body's padding for poster grids — it was the difference
    // between fitting one row and two at some slider positions. The capsule
    // toolbar is taller than the boxed one it replaced, so the top gap has to
    // give the same amount back or a row is lost outright.
    body.style.paddingBottom = posterView ? '8px' : (isMobile() ? '16px' : '20px');
    body.style.paddingTop = posterView ? '8px' : (isMobile() ? '12px' : '14px');
    if (posterView) { this._mtWireDragHandle(el); this._mtMeasureGrid(el); }

    if (tab === 'overview' && !m.overview) this._mtLoadOverview(el);
    if (tab === 'calendar' && !this._mtDelItems) this._mtLoadDelMap(el);
    if (tab === 'rules' && !m.editor) this._mtMeasureRules(el);
    if (tab === 'collections' && !m.colDetail) this._mtMeasureRules(el, 'col');
    // Segmented controls render in their previous state after a toggle; flip
    // them on the next frame so the fill actually slides.
    m.cal && (m.cal._animSeg = false);
    m._animView = false;
    m._animColView = false;
    el.querySelectorAll('.mt-seg[data-seg-to]').forEach(seg => {
      if (seg.dataset.seg === seg.dataset.segTo) return;
      requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
    });
    if (tab === 'collections' && m.colDetail && m.colSubTab === 'info') {
      if (!m.colDetail.logs) this._mtLoadColLogs(el);
      else this._mtMeasureLogs(el);
    }
  }

  // Measure the gap between the top of the grid and the paging row. Reading the
  // grid wrapper's own clientHeight was unreliable — it reports content height
  // whenever the flex chain above it is not filling — which pinned the view to
  // a single row. Comparing two viewport rects does not care about that.
  _mtMeasureGrid(el) {
    const m = this._maintainerrModal;
    if (!m || this._mtMeasuring) return;
    const grid = el?.querySelector('#mt-poster-grid');
    const body = el?.querySelector('#mt-body');
    if (!grid || !body) return;

    const gridTop = grid.getBoundingClientRect().top;
    const pag = el.querySelector('#mt-pag-wrap');
    const bottom = pag ? pag.getBoundingClientRect().top : body.getBoundingClientRect().bottom;
    const h = Math.round(bottom - gridTop);
    // The grid can be capped narrower than the space it sits in; measuring the
    // grid itself would feed that back in and shrink the posters each pass.
    const w = grid.parentElement?.clientWidth || grid.clientWidth;
    if (h <= 0 || !w) return;
    if (m._gridAvailH === h && m._gridW === w) return;
    m._gridAvailH = h;
    m._gridW = w;

    this._mtMeasuring = true;
    try {
      // Overview pages server-side, so a changed page size needs a refetch
      if (m.tab === 'overview') this._mtLoadOverview(el);
      else this._mtLoadTab(m.tab, el);
    } finally {
      this._mtMeasuring = false;
    }
  }

  _mtNavIndRect(el) {
    return this._navIndRect(el?.querySelector('#mt-nav'));
  }

  // Places the sliding fill under the active tab. `from` is the fill's previous
  // geometry; applying it first and only then moving gives the transition a
  // changed value to animate, which a freshly written element never has.
  _mtSyncNavInd(el, from) {
    const nav = el?.querySelector('#mt-nav');
    const subFrom = this._navIndRect(nav?.querySelector('.mt-nav-sub-wrap.is-open'));
    this._syncNavInd(nav, nav?.querySelector(`.mt-nav-btn[data-mt-tab="${this._maintainerrModal?.tab}"]`), from);
    // The track animates its width open, so its fill is measured once that has
    // settled — before then the buttons have no usable geometry.
    requestAnimationFrame(() => this._syncSubNavInd(nav, subFrom));
  }

  _mtRefreshTabBtns(el) {
    const m = this._maintainerrModal;
    if (!m) return;
    const navEl = el?.querySelector('#mt-nav-area');
    if (navEl) {
      const from = this._mtNavIndRect(el);
      navEl.innerHTML = this._mtNavHtml(m.tab);
      this._mtWireTabBtns(el);
      this._mtSyncNavInd(el, from);
      // One-shot expand animation when a collection detail was just opened.
      if (m._animateSub) {
        m._animateSub = false;
        const subEl = navEl.querySelector('[data-mt-sub]');
        if (subEl) {
          subEl.style.maxWidth = '0';
          requestAnimationFrame(() => {
            subEl.style.maxWidth = '420px';
            // Widths change as the sub-tabs unfold, so the fill has to follow
            setTimeout(() => this._mtSyncNavInd(el), 260);
          });
        }
      }
    }
    const statusEl = el?.querySelector('#mt-status');
    if (statusEl) statusEl.innerHTML = this._mtStatusHtml();
    const saveEl = el?.querySelector('#mt-hdr-save');
    if (saveEl) saveEl.innerHTML = this._mtHdrSaveHtml();
    const btnEl = el?.querySelector('#mt-hdr-btn');
    if (btnEl) { btnEl.innerHTML = this._mtHdrBtnHtml(); this._mtWireHdrBtn(el); }
  }

  _mtWireHdrBtn(el) {
    el.querySelector('#mt-close')?.addEventListener('click', () => this._closeMaintainerrModal());
    el.querySelector('#mt-hdr-back')?.addEventListener('click', () => {
      const m = this._maintainerrModal;
      if (!m) return;
      // Arrived here from a title's deletion badge — go back to that title
      if (this._mtPopupReturn && m.colDetail && !m.editor && !m.cal?.dayModal) {
        const r = this._mtPopupReturn;
        this._mtPopupReturn = null;
        this._closeMaintainerrModal();
        this._openPopup(r.type, r.tmdbId, r.tvdbId, r.title);
        return;
      }
      if (m.cal?.dayModal) { m.cal.dayModal = null; this._mtLoadTab('calendar', el); }
      else if (m.editor) { m.editor = null; this._mtLoadTab('rules', el); }
      else if (m.colDetail) { m.colDetail = null; m.colSubTab = null; this._mtLoadTab('collections', el); }
    });
  }

  _mtWireTabBtns(el) {
    el.querySelectorAll('[data-mt-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.mtTab;
        if (!t || !this._maintainerrModal) return;
        this._mtPopupReturn = null;
        this._maintainerrModal.page = 0;
        this._maintainerrModal.editor = null;
        this._maintainerrModal.colDetail = null;
        this._maintainerrModal.colSubTab = null;
        if (this._maintainerrModal.cal) this._maintainerrModal.cal.dayModal = null;
        this._mtLoadTab(t, el);
      });
    });
    el.querySelectorAll('[data-mt-col-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.mtColTab;
        if (!t || !this._maintainerrModal) return;
        this._maintainerrModal.colSubTab = t;
        this._mtLoadTab('collections', el);
      });
    });
  }

  // Horizontal swipe over a poster grid pages it. Delegated on the glass, which
  // survives every body re-render, and it drives the paging buttons rather than
  // the page state so the disabled-at-the-ends handling stays in one place.
  _mtWireSwipe(glass) {
    if (!this._isMob) return;
    const THRESHOLD = 45;
    let sx = null, sy = null;

    glass.addEventListener('touchstart', e => {
      if (!e.target.closest('#mt-poster-grid')) { sx = null; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });

    glass.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      sx = null;
      // A mostly-vertical drag is a scroll, not a page turn
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const which = dx < 0 ? 'next' : 'prev';
      const btn = glass.querySelector(
        `[data-mt-ov-page="${which}"],[data-mt-col-d-page="${which}"],[data-mt-col-excl-page="${which}"]`
      );
      if (btn && !btn.disabled) btn.click();
    }, { passive: true });
  }

  // ── Modal wiring ──────────────────────────────────────────────────────────

  _wireMaintainerrModal(el) {
    el.addEventListener('click', e => { if (e.target === el) this._closeMaintainerrModal(); });

    this._mtWireTabBtns(el);
    this._mtWireHdrBtn(el);
    requestAnimationFrame(() => this._mtSyncNavInd(el));

    const glass = el.querySelector('.popup-glass');
    if (!glass) return;

    this._mtWireSwipe(glass);

    glass.addEventListener('click', e => {
      const m = this._maintainerrModal;
      if (!m) return;

      const pageBtn = e.target.closest('[data-mt-page]');
      if (pageBtn) { m.page = this._mtParsePageN(pageBtn.dataset.mtPage, m.page || 0, m.rulesPages || 1); this._mtLoadTab(m.tab, el); return; }

      const runBtn = e.target.closest('[data-mt-run]');
      if (runBtn) { this._mtRunRule(parseInt(runBtn.dataset.mtRun), el); return; }

      if (e.target.closest('[data-mt-run-all]')) { this._mtRunAllRules(el); return; }

      const delBtn = e.target.closest('[data-mt-delete]');
      if (delBtn) { m.confirmDelete = parseInt(delBtn.dataset.mtDelete); this._mtLoadTab(m.tab, el); return; }

      // Table and mobile rows have nowhere to host the in-place overlay
      const delNow = e.target.closest('[data-mt-delete-now]');
      if (delNow) {
        if (confirm(this._t('mtConfirmDelete'))) this._mtDeleteRule(parseInt(delNow.dataset.mtDeleteNow), el);
        return;
      }

      const delOk = e.target.closest('[data-mt-del-confirm]');
      if (delOk) { m.confirmDelete = null; this._mtDeleteRule(parseInt(delOk.dataset.mtDelConfirm), el); return; }

      if (e.target.closest('[data-mt-del-cancel]')) { m.confirmDelete = null; this._mtLoadTab(m.tab, el); return; }

      const editBtn = e.target.closest('[data-mt-edit]');
      if (editBtn) { this._mtOpenEditor(parseInt(editBtn.dataset.mtEdit), el); return; }

      if (e.target.closest('[data-mt-new]')) { this._mtOpenEditor(null, el); return; }

      if (e.target.closest('[data-mt-cancel]')) { m.editor = null; this._mtLoadTab('rules', el); return; }

      // Disabled buttons swallow clicks, but guard the state too
      if (e.target.closest('[data-mt-save]')) { if (m.editor?._dirty) this._mtSaveRule(el); return; }

      const edSec = e.target.closest('[data-mt-ed-sec]');
      if (edSec && m.editor) {
        const key = edSec.dataset.mtEdSec;
        this._mtSyncEditorFields(el);
        // Only one section open at a time; clicking the open one closes it
        m.editorSection = m.editorSection === key ? null : key;
        this._mtReRenderEditor(el);
        return;
      }

      if (m.editor && e.target.closest('[data-mt-add-section],[data-mt-add-rule],[data-mt-del-rule],[data-mt-del-section],[data-mt-toggle-sec-op],[data-mt-toggle-op]')) {
        m.editor._dirty = true;
      }

      if (e.target.closest('[data-mt-add-section]')) { this._mtAddSection(el); return; }

      const addRuleBtn = e.target.closest('[data-mt-add-rule]');
      if (addRuleBtn) { this._mtAddRuleToSection(parseInt(addRuleBtn.dataset.mtAddRule), el); return; }

      const delRuleBtn = e.target.closest('[data-mt-del-rule]');
      if (delRuleBtn) { this._mtDeleteEditorRule(delRuleBtn.dataset.mtDelRule, el); return; }

      const delSecBtn = e.target.closest('[data-mt-del-section]');
      if (delSecBtn) { this._mtDeleteSection(parseInt(delSecBtn.dataset.mtDelSection), el); return; }

      const togSecOp = e.target.closest('[data-mt-toggle-sec-op]');
      if (togSecOp) { this._mtToggleSectionOp(parseInt(togSecOp.dataset.mtToggleSecOp), el); return; }

      const togOp = e.target.closest('[data-mt-toggle-op]');
      if (togOp) { this._mtToggleRuleOp(togOp.dataset.mtToggleOp, el); return; }

      const colViewSeg = e.target.closest('[data-mt-col-view-seg]');
      if (colViewSeg) {
        m.colView = m.colView === 'table' ? 'cards' : 'table';
        m.colPage = 0;
        m.colPerPage = null;
        this._mtPrefSet('col-view', m.colView);
        m._animColView = true;
        this._mtLoadTab('collections', el);
        return;
      }

      const colPageBtn = e.target.closest('[data-mt-col-page]');
      if (colPageBtn) { m.colPage = this._mtParsePageN(colPageBtn.dataset.mtColPage, m.colPage || 0, m.colPages || 1); this._mtLoadTab('collections', el); return; }

      const viewSeg = e.target.closest('[data-mt-view-seg]');
      if (viewSeg) {
        m.view = m.view === 'table' ? 'cards' : 'table';
        m.page = 0;
        m.rulesPerPage = null;
        this._mtPrefSet('rules-view', m.view);
        m._animView = true;
        this._mtLoadTab(m.tab, el);
        return;
      }

      const calSeg = e.target.closest('[data-mt-cal-seg]');
      if (calSeg && m.cal) {
        m.cal.view = m.cal.view === 'month' ? 'week' : 'month';
        m.cal.dayModal = null;
        m.cal._animSeg = true;
        this._mtPrefSet('cal-view', m.cal.view);
        this._mtLoadTab('calendar', el);
        return;
      }

      const calNav = e.target.closest('[data-mt-cal-nav]');
      if (calNav) {
        const cal = m.cal || (m.cal = { weekOffset: 0, monthOffset: 0, view: 'week', dayModal: null });
        const v = calNav.dataset.mtCalNav;
        // Month view steps whole months; week view steps weeks, with the
        // double chevrons jumping four weeks at a time.
        if (cal.view === 'month') {
          if (v === 'today') cal.monthOffset = 0;
          else if (v === 'prev') cal.monthOffset = (cal.monthOffset || 0) - 1;
          else if (v === 'next') cal.monthOffset = (cal.monthOffset || 0) + 1;
        } else {
          if (v === 'today') cal.weekOffset = 0;
          else if (v === 'prev') cal.weekOffset -= 1;
          else if (v === 'next') cal.weekOffset += 1;
          else if (v === 'prev-month') cal.weekOffset -= 4;
          else if (v === 'next-month') cal.weekOffset += 4;
        }
        this._mtLoadTab('calendar', el);
        return;
      }

      const calDay = e.target.closest('[data-mt-cal-day]');
      if (calDay) {
        const cal = m.cal || (m.cal = {});
        cal.dayModal = calDay.dataset.mtCalDay;
        cal.dayPage = 0;
        this._mtLoadTab('calendar', el);
        return;
      }

      const calDayPage = e.target.closest('[data-mt-cal-day-page]');
      if (calDayPage && m.cal) {
        m.cal.dayPage = this._mtParsePageN(calDayPage.dataset.mtCalDayPage, m.cal.dayPage || 0, m.cal.dayPages || 1);
        this._mtLoadTab('calendar', el);
        return;
      }

      const calCol = e.target.closest('[data-mt-cal-col]');
      if (calCol) {
        m.cal.dayModal = null;
        m.colSubTab = 'media';
        this._mtOpenCollectionDetail(parseInt(calCol.dataset.mtCalCol), el);
        return;
      }

      const calItem = e.target.closest('[data-mt-cal-item]');
      if (calItem) {
        const it = (this._mtDelItems || [])[parseInt(calItem.dataset.mtCalItem)];
        if (it && (it.tmdbId || it.tvdbId)) {
          this._mtReturnState = { tab: m.tab, overview: m.overview, colDetail: m.colDetail, colSubTab: m.colSubTab, cal: m.cal };
          this._closeMaintainerrModal();
          this._openPopup(it.popupType, it.tmdbId ? String(it.tmdbId) : null, it.tvdbId ? String(it.tvdbId) : null, it.title);
        }
        return;
      }

      if (e.target.closest('[data-mt-cal-close]') || e.target.matches('[data-mt-cal-backdrop]')) {
        m.cal.dayModal = null; this._mtLoadTab('calendar', el); return;
      }

      if (e.target.closest('[data-mt-handle-all]')) { this._mtHandleAllCollections(el); return; }

      const handleBtn = e.target.closest('[data-mt-handle]');
      if (handleBtn) { this._mtHandleCollection(parseInt(handleBtn.dataset.mtHandle), el); return; }

      const detailBtn = e.target.closest('[data-mt-col-detail]');
      if (detailBtn) { this._mtOpenCollectionDetail(parseInt(detailBtn.dataset.mtColDetail), el); return; }

      const ovPage = e.target.closest('[data-mt-ov-page]');
      if (ovPage && m.overview) {
        const ov = m.overview;
        const searching = !!(ov.search || '').trim();
        const total = searching ? (ov.searchItems || []).length : (ov.totalSize || 0);
        ov.page = this._mtParsePage(ovPage.dataset.mtOvPage, ov.page || 0, total, ov);
        // Unsearched pages come from the server, so a page change needs a refetch
        if (searching) this._mtLoadTab('overview', el);
        else this._mtLoadOverview(el);
        return;
      }

      const logPage = e.target.closest('[data-mt-log-page]');
      if (logPage && m.colDetail?.logs) {
        const lg = m.colDetail.logs;
        lg.page = this._mtParsePageN(logPage.dataset.mtLogPage, lg.page || 0, Math.ceil((lg.total || 0) / (lg.perPage || 25)));
        this._mtLoadColLogs(el);
        return;
      }

      const ovAdd = e.target.closest('[data-mt-ov-add]');
      if (ovAdd) { this._mtOpenOvDialog('collection', ovAdd.dataset.mtOvAdd, el); return; }

      const ovExcl = e.target.closest('[data-mt-ov-excl]');
      if (ovExcl) { this._mtOpenOvDialog('exclusion', ovExcl.dataset.mtOvExcl, el); return; }

      if (e.target.closest('[data-mt-ov-dlg-cancel]')) { m.overview.dialog = null; this._mtLoadTab('overview', el); return; }
      if (e.target.closest('[data-mt-ov-dlg-submit]')) { this._mtSubmitOvDialog(el); return; }
      if (e.target.closest('[data-mt-ov-dlg-removeall]')) { this._mtSubmitOvDialog(el, true); return; }
      if (e.target.matches('[data-mt-ov-dlg-backdrop]')) { m.overview.dialog = null; this._mtLoadTab('overview', el); return; }

      const colDPage = e.target.closest('[data-mt-col-d-page]');
      if (colDPage && m.colDetail) { m.colDetail.page = this._mtParsePage(colDPage.dataset.mtColDPage, m.colDetail.page, m.colDetail.items?.length || 0, m.colDetail); this._mtLoadTab('collections', el); return; }

      const unexclBtn = e.target.closest('[data-mt-unexclude]');
      if (unexclBtn && m.colDetail) { this._mtUnexcludeItem(parseInt(unexclBtn.dataset.mtUnexclude), el); return; }

      const exclPageBtn = e.target.closest('[data-mt-col-excl-page]');
      if (exclPageBtn && m.colDetail) { m.colDetail.exclPage = this._mtParsePage(exclPageBtn.dataset.mtColExclPage, m.colDetail.exclPage || 0, (m.colDetail.exclusionItems || []).length, m.colDetail); this._mtLoadTab('collections', el); return; }

      const exclBtn = e.target.closest('[data-mt-exclude]');
      if (exclBtn && m.colDetail) { m.colDetail.confirmExclude = exclBtn.dataset.mtExclude; this._mtLoadTab('collections', el); return; }

      const exclCancel = e.target.closest('[data-mt-exclude-cancel]');
      if (exclCancel && m.colDetail) { m.colDetail.confirmExclude = null; this._mtLoadTab('collections', el); return; }

      const exclConfirm = e.target.closest('[data-mt-exclude-confirm]');
      if (exclConfirm && m.colDetail) { this._mtExcludeItem(exclConfirm.dataset.mtExcludeConfirm, el); return; }

      // Last: every poster action button lives inside the card that carries
      // data-mt-popup, so this must not pre-empt them.
      const ovCard = e.target.closest('[data-mt-popup]');
      if (ovCard) {
        this._mtReturnState = { tab: m.tab, overview: m.overview, colDetail: m.colDetail, colSubTab: m.colSubTab, cal: m.cal };
        this._closeMaintainerrModal();
        this._openPopup(ovCard.dataset.mtPopup, ovCard.dataset.tmdbid || null, ovCard.dataset.tvdbid || null, ovCard.dataset.title || '');
        return;
      }
    });

    // Search debounce
    glass.addEventListener('input', e => {
      const m = this._maintainerrModal;
      if (!m) return;
      this._mtMarkEditorDirty(el, e.target);

      if (e.target.id === 'mt-search') {
        clearTimeout(m._searchTimer);
        const v = e.target.value;
        m._searchTimer = setTimeout(() => { m.search = v; m.page = 0; this._mtLoadTab(m.tab, el); }, 600);
        return;
      }
      if (e.target.id === 'mt-col-search') {
        clearTimeout(m._colSearchTimer);
        const v = e.target.value;
        m._colSearchTimer = setTimeout(() => { m.colSearch = v; this._mtLoadTab(m.tab, el); }, 600);
        return;
      }
      if (e.target.id === 'mt-log-search' && m.colDetail?.logs) {
        clearTimeout(m._logSearchTimer);
        const v = e.target.value;
        m._logSearchTimer = setTimeout(() => this._mtLoadColLogs(el, { search: v, page: 0 }), 600);
        return;
      }
      if (e.target.id === 'mt-ov-search' && m.overview) {
        clearTimeout(m._ovSearchTimer);
        const v = e.target.value;
        m._ovSearchTimer = setTimeout(() => { m.overview.search = v; m.overview.page = 0; this._mtLoadOverview(el); }, 600);
        return;
      }
      if (e.target.id === 'mt-col-d-search' && m.colDetail) {
        clearTimeout(m._colDSearchTimer);
        const v = e.target.value;
        m._colDSearchTimer = setTimeout(() => { m.colDetail.search = v; m.colDetail.page = 0; this._mtLoadTab(m.tab, el); }, 600);
        return;
      }
      if (e.target.id === 'mt-col-excl-search' && m.colDetail) {
        clearTimeout(m._colExclSearchTimer);
        const v = e.target.value;
        m._colExclSearchTimer = setTimeout(() => { m.colDetail.exclSearch = v; m.colDetail.exclPage = 0; this._mtLoadTab(m.tab, el); }, 600);
        return;
      }
    });

    // Filter selects
    glass.addEventListener('change', e => {
      const m = this._maintainerrModal;
      if (!m) return;
      this._mtMarkEditorDirty(el, e.target);

      this._tbSyncSelect(e.target);

      if (e.target.id === 'mt-log-sort' && m.colDetail?.logs)   { this._mtLoadColLogs(el, { sort: e.target.value, page: 0 }); return; }
      if (e.target.id === 'mt-log-filter' && m.colDetail?.logs) { this._mtLoadColLogs(el, { filter: e.target.value, page: 0 }); return; }

      if (e.target.id === 'mt-ov-lib' && m.overview)  { m.overview.libId = e.target.value; m.overview.page = 0; this._mtLoadOverview(el); return; }
      if (e.target.id === 'mt-ov-sort' && m.overview) { m.overview.sort = e.target.value; m.overview.page = 0; this._mtLoadOverview(el); return; }
      if (e.target.id === 'mt-ov-dlg-action' && m.overview?.dialog) { m.overview.dialog.action = e.target.value; return; }
      if (e.target.id === 'mt-ov-dlg-col' && m.overview?.dialog)    { m.overview.dialog.collectionId = e.target.value; return; }

      if (e.target.id === 'mt-filter-lib')    { m.filterLib = e.target.value; m.page = 0; this._mtLoadTab(m.tab, el); return; }
      if (e.target.id === 'mt-filter-status') { m.filterStatus = e.target.value; m.page = 0; this._mtLoadTab(m.tab, el); return; }
      if (e.target.id === 'mt-col-filter-lib') { m.colFilterLib = e.target.value; this._mtLoadTab(m.tab, el); return; }
      if (e.target.id === 'mt-col-d-sort' && m.colDetail) { this._mtRefetchColMedia(e.target.value, el); return; }
      if (e.target.id === 'mt-col-excl-sort' && m.colDetail) { this._mtRefetchColExclusions(e.target.value, el); return; }

      // Editor field changes — re-render on first value change to update action possibilities
      if (m.editor) {
        this._mtSyncEditorFields(el);
        const fvSel = e.target.closest('[data-mt-firstval]');
        if (fvSel) { this._mtReRenderEditor(el); return; }
        // Second value switches the Custom Value field between text/number/date/boolean
        const svSel = e.target.closest('[data-mt-secondval]');
        if (svSel) { this._mtReRenderEditor(el); return; }
      }
    });
  }

  // opts: { err } red badge, { spin } leading spinner.
  // duration 0 keeps the badge until the next _mtShowStatus call.
  _mtShowStatus(msg, modal, duration = 4000, opts = {}) {
    const m = this._maintainerrModal;
    if (!m) return;
    m._statusMsg = msg;
    m._statusErr = !!opts.err;
    m._statusSpin = !!opts.spin;
    // { done, total } draws a real bar; true alone draws an indeterminate one
    m._statusProg = opts.prog ?? null;
    const status = (modal || this.shadowRoot.querySelector('[data-mt-modal]'))?.querySelector('#mt-status');
    if (status) status.innerHTML = this._mtStatusHtml();
    clearTimeout(m._statusTimer);
    if (!duration) return;
    m._statusTimer = setTimeout(() => {
      if (this._maintainerrModal === m) {
        m._statusMsg = null;
        m._statusErr = false;
        m._statusSpin = false;
        m._statusProg = null;
        const s2 = (modal || this.shadowRoot.querySelector('[data-mt-modal]'))?.querySelector('#mt-status');
        if (s2) s2.innerHTML = this._mtStatusHtml();
      }
    }, duration);
  }

  // Maintainerr's execute/handle endpoints only enqueue, so completion has to be
  // polled. Resolves true once `check` reports done, false on timeout or if the
  // modal closed in the meantime.
  async _mtPollUntil(check, interval = 2000, timeout = 900000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      await new Promise(r => setTimeout(r, interval));
      if (!this._maintainerrModal) return false;
      try { if (await check()) return true; } catch (_) { /* keep polling */ }
    }
    return false;
  }

  _mtParsePage(val, curPage, totalItems, cd) {
    const { perPage } = this._mtGridCalc(cd, 90);
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    if (val === 'first') return 0;
    if (val === 'prev') return Math.max(0, curPage - 1);
    if (val === 'next') return Math.min(totalPages - 1, curPage + 1);
    if (val === 'last') return totalPages - 1;
    return parseInt(val) || 0;
  }

  // Swaps in the poster grid for a new column count without repainting the
  // body — the slider lives in the body, and a repaint mid-drag would take it
  // out from under the pointer. The first poster on screen stays on the page
  // that is shown. The overview only holds the page it fetched, so it is
  // re-laid from that at once and then, a moment later, from the right page.
  _mtRelayGrid(el, cd, cols) {
    const m = this._maintainerrModal;
    if (!m || !cd || !el.querySelector('#mt-poster-grid')) return;
    const ov = m.tab === 'overview';
    const excl = !ov && m.colSubTab === 'exclusions';
    const key = excl ? 'exclPage' : 'page';
    const reserve = excl ? 48 : 90;
    const first = (cd[key] || 0) * this._mtGridCalc(cd, reserve).perPage;
    cd._mtCols = cols;
    const per = this._mtGridCalc(cd, reserve).perPage;
    cd[key] = Math.floor(first / per);

    const swap = () => {
      const live = el.querySelector('#mt-poster-grid');
      if (!live) return;
      const probe = document.createElement('div');
      probe.innerHTML = ov ? this._mtOverviewTabHtml() : this._mtCollectionsTabHtml();
      const next = probe.querySelector('#mt-poster-grid');
      if (next) live.replaceWith(next);
    };
    swap();

    if (!ov || (cd.search || '').trim() || !cd.libId) return;
    clearTimeout(cd._liveT);
    const tok = cd._liveTok = (cd._liveTok || 0) + 1;
    cd._liveT = setTimeout(async () => {
      try {
        const data = await this._mtOverviewPageData(cd, per);
        if (tok !== cd._liveTok) return;   // a newer column count has taken over
        cd.items = data?.items || [];
        cd.totalSize = data?.totalSize ?? cd.items.length;
        cd._liveKey = `${cols}:${cd.page || 0}`;
        swap();
      } catch (_) {}
    }, 150);
  }

  _mtWireDragHandle(el) {
    const handle = el.querySelector('#mt-drag-handle');
    const track  = el.querySelector('#mt-drag-track');
    const thumb  = el.querySelector('#mt-drag-thumb');
    if (!handle || !track) return;
    const MIN = 3, MAX = 12, INSET = 7;
    let startX = 0, startCols = 0, liveCols = null;
    const m = this._maintainerrModal;
    // Overview and the collection media grid share the slider
    const cd = m?.tab === 'overview' ? m.overview : m?.colDetail;
    if (!cd) return;

    const _thumbPx = (cols, tW) => Math.round((cols - MIN) / (MAX - MIN) * (tW - INSET * 2)) + INSET;
    const _updateUI = cols => {
      const tW = track.getBoundingClientRect().width || 120;
      const px = _thumbPx(cols, tW);
      if (thumb) thumb.style.left = px + 'px';
      const fill = track.firstElementChild;
      if (fill) { fill.style.left = '0'; fill.style.width = px + 'px'; }
      // Re-laid while the slider is held, so the page always shows whole rows —
      // changing the columns alone squeezed or cut the old page until the drop.
      if (cols !== liveCols) {
        liveCols = cols;
        this._mtRelayGrid(el, cd, cols);
      }
    };
    const _colsFromDx = dx => {
      const tW = track.getBoundingClientRect().width || 120;
      const eff = tW - INSET * 2;
      const startPx = _thumbPx(startCols, tW) - INSET;
      const newFrac = Math.max(0, Math.min(1, (startPx + dx) / eff));
      return Math.max(MIN, Math.min(MAX, MIN + Math.round(newFrac * (MAX - MIN))));
    };

    handle.addEventListener('pointerdown', e => {
      startX = e.clientX;
      startCols = cd._mtCols || 7;
      liveCols = startCols;
      cd._liveKey = null;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', e => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      _updateUI(_colsFromDx(e.clientX - startX));
    });
    handle.addEventListener('pointerup', e => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      const newCols = _colsFromDx(e.clientX - startX);
      cd._mtCols = newCols;
      try { localStorage.setItem('arr-mt-cols', String(newCols)); } catch (_) {}
      // Overview pages server-side, so a new column count changes the page size.
      // If the drag already fetched the page for this count, only repaint —
      // fetching again would flash the loading state for nothing.
      if (m.tab === 'overview') {
        const searching = !!(cd.search || '').trim();
        if (searching || cd._liveKey === `${newCols}:${cd.page || 0}`) {
          this._mtLoadTab('overview', el);
        } else {
          clearTimeout(cd._liveT);
          cd._liveTok = (cd._liveTok || 0) + 1;   // a late live fetch must not land on top
          this._mtLoadOverview(el);
        }
      }
      else this._mtLoadTab(m.tab, el);
    });
  }

  // Fill in artwork the *arr libraries could not supply. Maintainerr answers one
  // item at a time, so results are cached and the grid is repainted once.
  async _mtResolvePosters(items, modal) {
    if (!this._mtPosterCache) this._mtPosterCache = new Map();
    const cache = this._mtPosterCache;
    const pending = [];
    for (const item of items || []) {
      if (this._mtPosterFor(item)) continue;
      const key = this._mtPosterKey(item);
      if (!key || cache.has(key)) continue;
      cache.set(key, '');
      pending.push({ item, key });
    }
    if (!pending.length) return;

    let changed = false;
    for (let i = 0; i < pending.length; i += 8) {
      if (!this._maintainerrModal) return;
      await Promise.all(pending.slice(i, i + 8).map(async ({ item, key }) => {
        const [type, prov, id] = key.split(':');
        try {
          const res = await this._hass.callApi('GET', `arr_stack/maintainerr/metadata/image/${type}?${prov}Id=${encodeURIComponent(id)}`);
          if (res?.url) { cache.set(key, res.url); changed = true; }
        } catch (_) { /* leave blank */ }
      }));
    }
    if (changed && this._maintainerrModal?.tab === 'overview') this._mtLoadTab('overview', modal);
  }

}

export const wireMaintainerrMixin = _WireMaintainerrMethods.prototype;
