// Every click inside the detail's glass.

class _PopupClickMethods {

// Every click inside the detail's glass: quick actions, menus, panels, the data-action buttons (popup/actions.js), Interactive Search sort and grab.
_ppGlassClick(e, root, d, overlay, glass) {
  e.stopPropagation();

  // ── Quick actions menu ──
  if (e.target.closest('[data-qa-toggle]')) {
    // Only one dropdown at a time — opening this one puts the others away.
    const opening = this._ppMenu?.panel !== 'options';
    this._ppMenu = opening ? { panel: 'options', sub: null } : null;
    if (opening) {
      this._ppSeasonPick = null;
      this._searchExpand = null;
      this._searchPickInst = null;
      this._removeConfirm = false;
      this._removeArmed = null;
    }
    this._renderPopupEl();
    return;
  }
  // Choosing something in the Actions menu counts as using the card. Merely
  // expanding a branch does not — that is still looking around.
  if (e.target.closest('[data-qa-do],[data-qa-lib],[data-qa-run],[data-qa-apply],[data-qa-season-pick],[data-action="plex-cast-play"],[data-action="stream-terminate-show"]')) {
    this._markActivated();
  }
  const qaSub = e.target.closest('[data-qa-sub]');
  if (qaSub) {
    const key = qaSub.dataset.qaSub;
    const menuEl = e.target.closest('[data-qa-menu]');
    const next = this._ppMenu?.sub === key ? null : key;
    // Which drawer is open is shared by all three panels; the panel itself is
    // decided by _searchExpand / _removeConfirm, so this must not clear those.
    this._ppMenu = { ...(this._ppMenu || {}), sub: next };
    // A picker belongs to the drawer that opened it — moving to another one
    // drops it rather than carrying a season list somewhere it never applied.
    if (next !== this._ppSeasonPick?.kind) this._ppSeasonPick = null;
    // Toggle in place. Re-rendering the popup would rebuild the menu node, so
    // the panel would blink and replay its drop-in animation on every click.
    if (next === 'cast') {
      // Opens with whatever was prefetched when the popup did; a stale list is
      // refreshed quietly behind it and patched in, never re-rendered.
      const dr = menuEl?.querySelector('[data-qa-drawer="cast"]');
      if (dr) dr.innerHTML = this._qaCastRowsHtml();
      // Always re-checked on open, never cached here: a device switched on
      // while the card was sitting there would otherwise never appear.
      this._fetchPlexClients({ silent: true }).then(() => {
        const dr2 = this.shadowRoot?.querySelector('[data-qa-drawer="cast"]');
        if (dr2 && this._ppMenu?.sub === 'cast') dr2.innerHTML = this._qaCastRowsHtml();
      });
    }
    if (next === 'stats') {
      this._ppStats = null;
      const dr = menuEl?.querySelector('[data-qa-drawer="stats"]');
      if (dr) dr.innerHTML = this._qaStatsRowsHtml();
      this._qaLoadStats(this._popup, dr);
    }
    if (next === 'airing') {
      this._ppAiring = null;
      const dr = menuEl?.querySelector('[data-qa-drawer="airing"]');
      if (dr) dr.innerHTML = this._qaAiringRowsHtml();
      this._qaLoadAiring(this._popup, dr);
    }
    if (menuEl) {
      menuEl.querySelectorAll('.qa-drawer').forEach(dr => {
        dr.classList.toggle('is-open', dr.dataset.qaDrawer === next);
      });
      menuEl.querySelectorAll('.qa-item-parent').forEach(btn => {
        btn.classList.toggle('qa-item-on', btn.dataset.qaSub === next);
      });
    } else {
      this._renderPopupEl();
      this._qaOpenDrawer(next);
    }
    return;
  }
  const qaDo = e.target.closest('[data-qa-do]');
  if (qaDo) {
    const k = qaDo.dataset.qaDo;
    if (k === 'seerrWithdraw') this._qaWithdraw(this._popup);
    if (k === 'lib') this._qaShowInLibrary(this._popup, this._qaLibTargets(this._popup)[0]?.inst);
    if (k === 'queue') this._qaJumpToQueue(this._popup);
    return;
  }
  const qaLib = e.target.closest('[data-qa-lib]');
  if (qaLib) { this._qaShowInLibrary(this._popup, qaLib.dataset.qaLib); return; }
  // Ticking a season
  const qaSn = e.target.closest('[data-qa-season-pick]');
  if (qaSn && this._ppSeasonPick) {
    const p = this._ppSeasonPick;
    p.sel = p.sel || new Set();
    const key = qaSn.dataset.qaSeasonPick;
    const keys = (p.seasons || []).map(sn => String(sn.key));
    if (key === '*') {
      const allOn = keys.length > 0 && keys.every(k => p.sel.has(k));
      p.sel.clear();
      if (!allOn) keys.forEach(k => p.sel.add(k));
    } else if (p.sel.has(key)) p.sel.delete(key);
    else p.sel.add(key);
    const dr = e.target.closest('[data-qa-menu]')?.querySelector(`[data-qa-drawer="${p.kind}"]`);
    if (dr) dr.innerHTML = this._qaSeasonRowsHtml();
    return;
  }
  const qaApply = e.target.closest('[data-qa-apply]');
  if (qaApply) { this._qaApplyPicks(qaApply.dataset.qaApply); return; }
  const qaRun = e.target.closest('[data-qa-run]');
  if (qaRun) {
    const kind = qaRun.dataset.qaRun;
    const col  = qaRun.dataset.qaCol;
    const season = qaRun.dataset.qaSeason;
    // A season-level collection cannot take the show, so the drawer turns into
    // a season picker instead of firing straight away.
    if (!season && qaRun.dataset.qaType === 'season') {
      this._ppSeasonPick = { kind, colId: col, seasons: null, sel: new Set() };
      const dr = e.target.closest('[data-qa-menu]')?.querySelector(`[data-qa-drawer="${kind}"]`);
      if (dr) dr.innerHTML = this._qaSeasonRowsHtml();
      this._qaLoadSeasons(this._popup, dr);
      return;
    }
    this._qaRunMaintainerr(kind, col, this._popup, season || null);
    return;
  }
  // Any other click inside the glass closes an open Options panel
  if (this._ppMenu?.panel === 'options' && !e.target.closest('[data-qa-menu]')) {
    this._ppMenu = null;
    this._renderPopupEl();
  }

  // Tapping outside the sources panel closes it — it slides down first, so it
  // reads as being put away rather than blinking out.
  const _panelOpen = this._isState || this._asOpen || this._snIsOpen;
  if (_panelOpen
      && !e.target.closest('.is-panel, .sn-is-panel, .sn-is-section, .pp-hero-bar, .qa-menu')) {
    const panelEl = glass.querySelector('.is-panel, .sn-is-panel, .sn-is-section');
    const finish = () => {
      this._isState = null; this._isExpanded = false;
      this._asOpen = false; this._asExpanded = false; this._asState = null;
      this._snIsOpen = false; this._snIsExpanded = false;
      this._snIsState = null; this._snActiveIs = null;
      this._searchExpand = null;
      this._renderPopupEl();
    };
    if (panelEl) {
      panelEl.classList.add('pp-panel-out');
      setTimeout(finish, 220);
    } else finish();
    return;
  }

  // Clicking away from the capsule folds it back to Search + Remove, the way
  // any menu closes when you look elsewhere.
  // Working inside the sources sheet — its rows, its grabber, its pager —
  // must not fold the capsule; only a click on the popup's own chrome does.
  // .qa-menu is on the list because the dropdown lives on the glass now, not
  // inside the capsule — without it, clicking a row counted as clicking away
  // and the state was torn down before the action ran.
  if (!e.target.closest('.pp-hero-bar, .qa-menu, .is-panel, .sn-is-panel, .sn-is-section, .pp-grab, [data-is-page], [data-sn-spage], [data-issort], [data-isfil], [data-snisfilter], [data-snissort]')
      && (this._searchExpand || this._removeConfirm || this._removeArmed)) {
    this._searchExpand = null;
    this._removeConfirm = false;
    this._removeArmed = null;
    this._removeInstance = null;
    this._renderPopupEl();
    return;
  }

  // The deletion badge jumps to the Maintainerr collection holding the title
  const goneCol = e.target.closest('[data-gone-col]');
  if (goneCol) {
    const colId = parseInt(goneCol.dataset.goneCol);
    // Enough to rebuild this popup, so Maintainerr's back arrow can return here
    this._mtPopupReturn = {
      type: d._type,
      tmdbId: d.tmdbId ? String(d.tmdbId) : (d.id ? String(d.id) : null),
      tvdbId: d.tvdbId ? String(d.tvdbId) : null,
      title: d.title || d.name || '',
    };
    this._popup = null;
    this._renderPopupEl();
    this._openMaintainerrModal('collections').then(() => {
      const el = this.shadowRoot.querySelector('[data-mt-modal]');
      if (!el || !this._maintainerrModal) return;
      this._maintainerrModal.colSubTab = 'media';
      this._mtOpenCollectionDetail(colId, el);
    });
    return;
  }

  const t = e.target.closest('[data-action],[data-isfil],[data-snisfilter],[data-issort],[data-snissort],[data-grab],[data-sngrab],[data-guid],[data-sn-spage],[data-is-page]');
  if (!t) return;

  // Every data-action button in the detail — popup/actions.js.
  if (this._ppRunAction(t, e, { root, overlay })) return;

  // (data-isfil reserved, currently unused)

  // Radarr IS column sort
  if (t.dataset.issort !== undefined) {
    const col = t.dataset.issort;
    if (this._isSort.col === col) {
      this._isSort = { col, dir: this._isSort.dir * -1 };
    } else {
      this._isSort = { col, dir: -1 }; // první klik → sestupně
    }
    this._renderPopupEl();
    return;
  }

  // Radarr grab
  if (t.dataset.grab !== undefined) {
    this._grabRelease(t.dataset.grab, parseInt(t.dataset.indexerid));
    return;
  }

  // Sonarr IS filter (legacy — kept for safety)
  if (t.dataset.snisfilter !== undefined) {
    this._snIsFilter = t.dataset.snisfilter;
    this._renderPopupEl();
    return;
  }

  // Sonarr IS column sort
  if (t.dataset.snissort !== undefined) {
    const col = t.dataset.snissort;
    if (this._snIsSort.col === col) {
      this._snIsSort = { col, dir: this._snIsSort.dir * -1 };
    } else {
      this._snIsSort = { col, dir: -1 };
    }
    this._renderPopupEl();
    return;
  }

  // Sonarr grab
  if (t.dataset.sngrab !== undefined) {
    this._sonarrGrab(t.dataset.sngrab, parseInt(t.dataset.indexerid));
    return;
  }

  {
    const snSpageBtn = t.closest('[data-sn-spage]') || (t.dataset.snSpage !== undefined ? t : null);
    if (snSpageBtn) {
      const _snInst = this._snIsInstance || 'sonarr';
      const series = _snInst === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
      const total = (series?.seasons || []).filter(s => s.seasonNumber > 0).length;
      const totalPages = Math.max(1, Math.ceil(total / (this._snSeasonsPerPage || 6)));
      const val = snSpageBtn.dataset.snSpage;
      let p = this._snSeasonsPage || 0;
      if      (val === 'first') p = 0;
      else if (val === 'prev')  p = Math.max(0, p - 1);
      else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
      else if (val === 'last')  p = totalPages - 1;
      else p = parseInt(val) || 0;
      if (p !== this._snSeasonsPage) {
        this._snSeasonsPage = p;
        this._renderPopupEl();
      }
      return;
    }
  }

  {
    const isPageBtn = t.closest('[data-is-page]') || (t.dataset.isPage !== undefined ? t : null);
    if (isPageBtn) {
      const visible = this._applyIsFilters(this._isResults || []);
      const totalPages = Math.max(1, Math.ceil(visible.length / (this._isPerPage || 8)));
      const val = isPageBtn.dataset.isPage;
      let p = this._isPage || 0;
      if      (val === 'first') p = 0;
      else if (val === 'prev')  p = Math.max(0, p - 1);
      else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
      else if (val === 'last')  p = totalPages - 1;
      else p = parseInt(val) || 0;
      if (p !== this._isPage) {
        this._isPage = p;
        this._renderPopupEl();
      }
      return;
    }
  }

}

}

export const popupClickMixin = _PopupClickMethods.prototype;
