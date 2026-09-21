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

}

export const libraryLayoutMixin = _LibraryLayoutMethods.prototype;
