class _LibraryWireMethods {

  _wireLibModal(el) {
    if (this._lidarrConfigured !== false && !this._lidarrArtists?.size) {
      this._fetchLidarrArtists?.().then(() => this._libRerenderBody?.(el)).catch(() => {});
    }
    const glass = el.querySelector('.popup-glass');
    if (!glass) return;

    this._libWireSwipe(glass);

    el.addEventListener('click', e => {
      if (!glass.contains(e.target)) this._closeLibModal();
    });

    glass.addEventListener('click', e => this._libGlassClick(e, el));

    this._wireLibModalBody(el);
    this._wireLibDragHandle(el);

    // Responsive resize — recalibrate bodyH and re-render body on window resize
    let _resizeTimer = null;
    const _onResize = () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        if (!this._libModal || !el.isConnected) {
          window.removeEventListener('resize', _onResize);
          return;
        }
        const bodyEl = el.querySelector('#lib-body');
        if (bodyEl?.clientHeight > 0) {
          this._libModal._bodyH = bodyEl.clientHeight;
        }
        const gw = el.querySelector('#lib-poster-grid')?.clientWidth || 0;
        if (gw > 0) {
          this._libModal._gridW = gw;
          if (this._libModal._colsAuto) this._libModal._libCols = 0;
        }
        this._libRerenderBody(el);
      }, 150);
    };
    window.addEventListener('resize', _onResize);
  }

  _libRerenderModal(el) {
    if (!this._libModal) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = this._libModalHtml();
    const newEl = wrap.firstElementChild;
    el.replaceWith(newEl);
    this._wireLibModal(newEl);

    // Segmented controls render in their previous state so the fill can slide;
    // flip them once the new element is in the document.
    this._libModal._animSegType = false;
    this._libModal._animSegView = false;
    this._libModal._animSegInst = false;
    this._syncSegVars(newEl);
    newEl.querySelectorAll('.mt-seg[data-seg-to]').forEach(seg => {
      if (seg.dataset.seg === seg.dataset.segTo) return;
      requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
    });
  }

  _wireLibModalBody(el) {
    const glass = el.querySelector('.popup-glass');
    if (!glass) return;

    // Sort is handled via custom dropdown clicks in glass.addEventListener('click')

    const filtSel = glass.querySelector('#lib-filter-sel');
    if (filtSel) {
      filtSel.addEventListener('change', () => {
        this._libModal.filter = filtSel.value;
        this._libModal.page   = 0;
        this._libRerenderBody(el);
      });
    }

    const searchEl = glass.querySelector('#lib-search');
    if (searchEl) {
      let _t;
      searchEl.addEventListener('input', () => {
        clearTimeout(_t);
        _t = setTimeout(() => {
          this._libModal.search = searchEl.value;
          this._libModal.page   = 0;
          // Patch only the results subtree — row/poster clicks are wired via delegation on
          // .popup-glass (see _wireLibModal), so nothing needs re-wiring here. Leaving
          // #lib-search untouched keeps the iOS keyboard open while typing.
          this._patchResultsWrap(el, 'lib-results-wrap', () => this._libBodyHtml());
        }, 220);
      });
    }
  }
}

export const libraryWireMixin = _LibraryWireMethods.prototype;
