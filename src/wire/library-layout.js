// Library, the modal's layout: swipe between types, the column grabber and relaying the grid. Split out of wire/library.js.

class _LibraryLayoutMethods {

  // Horizontal swipe over the body pages it. Delegated on the glass, which
  // survives every body re-render, and it drives the paging buttons so the
  // disabled-at-the-ends handling stays in one place.
  _libWireSwipe(glass) {
    if (!this._isMob) return;
    const THRESHOLD = 45;
    let sx = null, sy = null;

    glass.addEventListener('touchstart', e => {
      if (!e.target.closest('#lib-body')) { sx = null; return; }
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
      const btn = glass.querySelector(`[data-lib-page="${dx < 0 ? 'next' : 'prev'}"]`);
      if (btn && !btn.disabled) btn.click();
    }, { passive: true });
  }

  // Swaps in the poster grid for a new column count without repainting the
  // body — the slider lives in the body and a repaint mid-drag would take it
  // out from under the pointer. Poster clicks are delegated on .popup-glass,
  // so the new grid needs no wiring. The first poster on screen stays on the
  // page that is shown.
  _libRelayGrid(el, cols) {
    const m = this._libModal;
    const grid = el.querySelector('#lib-poster-grid');
    if (!m || !grid) return;
    const first = (m.page || 0) * (m._perPage || 1);
    m._libCols = cols;
    m._colsAuto = false;
    const probe = document.createElement('div');
    probe.innerHTML = this._libBodyHtml();          // measures _perPage for this count
    const page = Math.floor(first / (m._perPage || 1));
    if (page !== m.page) { m.page = page; probe.innerHTML = this._libBodyHtml(); }
    const next = probe.querySelector('#lib-poster-grid');
    if (next) grid.replaceWith(next);
  }

  _wireLibDragHandle(el) {
    const handle = el.querySelector('#lib-drag-handle');
    const track  = el.querySelector('#lib-drag-track');
    const thumb  = el.querySelector('#lib-drag-thumb');
    if (!handle || !track) return;
    const MIN = 3, MAX = 12, INSET = 7;
    let startX = 0, startCols = 0, liveCols = null;

    const _thumbPx = (cols, tW) => Math.round((cols - MIN) / (MAX - MIN) * (tW - INSET * 2)) + INSET;
    const _updateUI = cols => {
      const tW = track.getBoundingClientRect().width || 120;
      const px = _thumbPx(cols, tW);
      if (thumb) { thumb.style.left = px + 'px'; }
      const fill = track.firstElementChild;
      if (fill) { fill.style.left = '0'; fill.style.width = px + 'px'; }
      // The page follows the slider while it is held: a new column count means
      // a new poster size and so a new row count, and only re-laying the page
      // shows whole rows. Changing the columns alone left the old page's
      // posters squeezed or cut off until the drop.
      if (cols !== liveCols) {
        liveCols = cols;
        this._libRelayGrid(el, cols);
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
      startX    = e.clientX;
      startCols = this._libModal._libCols || 5;
      liveCols  = startCols;
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
      this._libModal._libCols = newCols;
      this._libModal._colsAuto = false;
      try {
        const s = JSON.parse(localStorage.getItem('arr-lib-tabs') || '{}');
        s.tabCols = newCols;
        localStorage.setItem('arr-lib-tabs', JSON.stringify(s));
      } catch (_) {}
      this._libRerenderBody(el);
    });
  }

}

export const libraryLayoutMixin = _LibraryLayoutMethods.prototype;
