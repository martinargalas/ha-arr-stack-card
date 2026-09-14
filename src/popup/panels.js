// The detail's sliding panels: the grabber and the Interactive Search panel.

class _PopupPanelsMethods {

// While the popup is open the regular polling is paused, so nothing would ever
// clear the spinner on its own. This asks only the queue of the instance that
// was grabbed into, until its download shows up or the wait expires.
_ppGrabPollStart() {
  if (this._ppGrabTimer) return;
  const tick = async () => {
    const w = this._ppGrabWait;
    if (!w || !this._popup || Date.now() > w.until) {
      clearInterval(this._ppGrabTimer);
      this._ppGrabTimer = null;
      if (w && Date.now() > w.until) this._ppGrabWait = null;
      if (this._popup) this._renderPopupEl();
      return;
    }
    try {
      if (w.inst === 'radarr')       await this._fetchRadarrQueue();
      else if (w.inst === 'radarr2') await this._fetchRadarr2Queue();
      else                           await this._fetchSonarrQueue(w.inst);
    } catch (_) { /* keep waiting */ }
    const pct = w.inst === 'radarr'   ? this._radarrQueuePct
              : w.inst === 'radarr2'  ? this._radarr2QueuePct
              : w.inst === 'sonarr'   ? this._sonarrQueueSeriesPct
              :                         this._sonarr2QueueSeriesPct;
    // The id the grab was started with, not whatever popup happens to be open —
    // otherwise walking to another title left this polling for the wrong one.
    const id = w.id ?? (w.inst.startsWith('radarr')
      ? (w.inst === 'radarr2' ? this._popup?._radarr2Id : this._popup?._radarrId)
      : (w.inst === 'sonarr2' ? this._popup?._sonarr2Series?.id : this._popup?._sonarrSeries?.id));
    if (id != null && pct?.has(id)) {
      this._ppGrabWait = null;
      clearInterval(this._ppGrabTimer);
      this._ppGrabTimer = null;
    }
    if (this._popup) this._renderPopupEl();
  };
  this._ppGrabTimer = setInterval(tick, 5000);
  tick();
}

// ─────────────────────────────────────────────
// Popup: render popup HTML into popup-root
// ─────────────────────────────────────────────

// A phone's sources list is the part worth more room, so it gets a grabber:
// drag it up to take height from the description, down to give it back. The
// ceiling is the action capsule — the panel never hides it.
_ppWirePanelGrab(root) {
  // AS renders .sn-is-section, IS .is-panel, Sonarr IS .sn-is-panel
  const panel = root.querySelector('.popup-body .is-panel, .popup-body .sn-is-panel, .popup-body .sn-is-section');
  // The confirm-add dialog reuses .is-panel but is a prompt, not a sources
  // sheet — nothing there to resize.
  if (!panel || panel.querySelector('.is-confirm-wrap')) { this._ppPanelWasOpen = false; return; }

  // Slides up from the bottom edge on opening — it advertises that the panel is
  // a draggable sheet. The window matters: the panel first renders as a loading
  // placeholder and is replaced by the results a moment later, so keying off the
  // very first node would animate something nobody sees.
  if (!this._ppPanelWasOpen) {
    this._ppPanelWasOpen = true;
    this._ppPanelAnimDone = false;
    this._isFitHist = null;
    this._snFitHist = null;
  }
  // Once, per opening. The panel is re-rendered several times while the sources
  // load, and re-adding the class each time made it flicker.
  if (!this._ppPanelAnimDone) {
    panel.classList.add('pp-panel-in');
    panel.addEventListener('animationend', () => {
      this._ppPanelAnimDone = true;
      panel.classList.remove('pp-panel-in');
      // Row counts were skipped while the panel was in flight — measure now
      this._renderPopupEl();
    }, { once: true });
  }
  const bodyEl = root.querySelector('.popup-body');
  // The panel may never be taller than the scrolling body — beyond that its
  // pager slides out of the sheet.
  const clampH = h => {
    const bodyR = bodyEl?.getBoundingClientRect();
    const barR  = root.querySelector('.pp-hero-bar')?.getBoundingClientRect();
    // The sheet floats over the body, so its ceiling is the action capsule —
    // without this it could be dragged right over the menu.
    const top   = Math.max(bodyR?.top ?? 0, barR ? barR.bottom + 10 : 0);
    const max   = bodyR ? bodyR.bottom - top : (glass?.getBoundingClientRect().height || 600) - 120;
    return Math.min(Math.max(120, h), Math.max(160, max));
  };
  const applyH = h => {
    // The panel's own min-height/flex rules would fight the drag, so they are
    // overridden inline for as long as the user has set a height.
    panel.style.flex = `0 0 ${h}px`;
    panel.style.height = `${h}px`;
    panel.style.minHeight = '0';
    panel.style.maxHeight = 'none';
  };
  if (this._ppPanelH) {
    this._ppPanelH = clampH(this._ppPanelH);
    applyH(this._ppPanelH);
  } else {
    // Default: the panel's top edge sits just under the poster, so the sources
    // begin where the artwork ends.
    requestAnimationFrame(() => {
      if (this._ppPanelH) return;
      const poster = root.querySelector('.popup-poster');
      const bodyR  = bodyEl?.getBoundingClientRect();
      if (!poster || !bodyR) return;
      // A touch below the poster rather than flush with it — the artwork keeps
      // a little air under it.
      const h = clampH(bodyR.bottom - poster.getBoundingClientRect().bottom - 18);
      this._ppPanelH = h;
      applyH(h);
    });
  }
  if (panel.querySelector('.pp-grab')) return;

  const grab = document.createElement('div');
  grab.className = 'pp-grab';
  grab.innerHTML = '<span></span>';
  panel.insertBefore(grab, panel.firstChild);

  const glass = root.querySelector('.popup-glass');
  let startY = 0, startH = 0;

  const onMove = e => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    let h = clampH(startH + (startY - y));
    applyH(h);
    // The middle section refuses to shrink past its own content, so a numeric
    // ceiling is not enough — measure the spill and take it back.
    const spill = panel.getBoundingClientRect().bottom
      - (bodyEl?.getBoundingClientRect().bottom ?? Infinity);
    if (spill > 0.5) { h = Math.max(120, h - spill); applyH(h); }
    this._ppPanelH = h;
    e.preventDefault();
  };
  const onUp = () => {
    grab.classList.remove('is-dragging');
    // Paging is measured from the panel's box, so a new height can mean a new
    // rows-per-page. Re-rendering rebuilds the whole popup — including the
    // capsule, which visibly blinks — so only do it once the height has moved
    // by at least a row.
    const rowEl = panel.querySelector('.sn-season-row, .sn-seasons-rows > *, tbody tr, .is-card');
    const rowH  = rowEl ? rowEl.getBoundingClientRect().height : 40;
    const last  = this._ppRenderedH ?? startH;
    if (Math.abs((this._ppPanelH || 0) - last) >= Math.max(24, rowH * 0.9)) {
      this._ppRenderedH = this._ppPanelH;
      this._snSeasonsPerPage = null;
      this._isPerPage = null;
      this._renderPopupEl();
    }
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  };
  const onDown = e => {
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startH = panel.getBoundingClientRect().height;
    grab.classList.add('is-dragging');
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    e.preventDefault();
    e.stopPropagation();
  };
  grab.addEventListener('pointerdown', onDown);
  grab.addEventListener('touchstart', onDown, { passive: false });
}

// The Interactive Search panel: swipe on a phone, the filter selects.
_ppWireIsPanel(root, glass) {
  // ── IS filter selects — change event delegation ──
  // ── IS panel swipe (mobile) ──
  const isPanel = root.querySelector('.is-panel');
  if (isPanel) {
    let _swipeX = null;
    isPanel.addEventListener('touchstart', e => { _swipeX = e.touches[0].clientX; }, { passive: true });
    isPanel.addEventListener('touchend', e => {
      if (_swipeX === null) return;
      const dx = e.changedTouches[0].clientX - _swipeX;
      _swipeX = null;
      if (Math.abs(dx) < 40) return;
      const visible = this._applyIsFilters(this._isResults || []);
      const totalPages = Math.max(1, Math.ceil(visible.length / (this._isPerPage || 8)));
      const p = dx < 0
        ? Math.min(totalPages - 1, (this._isPage || 0) + 1)
        : Math.max(0, (this._isPage || 0) - 1);
      if (p !== this._isPage) { this._isPage = p; this._renderPopupEl(); }
    }, { passive: true });
  }

  if (glass) glass.addEventListener('change', e => {
    const sel = e.target.closest('[data-isselect],[data-snisselect]');
    if (!sel) return;
    if (sel.dataset.isselect !== undefined) {
      this._isFilters = { ...this._isFilters, [sel.dataset.isselect]: sel.value };
      this._isPage = 0;
    } else if (sel.dataset.snisselect !== undefined) {
      this._snIsFilters = { ...this._snIsFilters, [sel.dataset.snisselect]: sel.value };
    }
    this._renderPopupEl();
  });
}

}

export const popupPanelsMixin = _PopupPanelsMethods.prototype;
