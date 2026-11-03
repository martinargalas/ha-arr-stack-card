import { LIB_BATCH } from '../render/library.js';

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
    this._libWireMore(el);

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
          this._libWireMore(el);
        }, 220);
      });
    }
  }

  // The phone's Library scrolls (#48): the footer under the last batch, once
  // it nears the screen, adds the next batch where it stands — the reader's
  // place and the posters already drawn are left as they are.
  _libWireMore(el) {
    this._libMoreIo?.disconnect();
    this._libMoreIo = null;
    const box = el.querySelector('#lib-scroll');
    const foot = box?.querySelector('[data-lib-more]');
    if (!foot) return;
    this._libMoreIo = new IntersectionObserver(en => {
      if (en.some(x => x.isIntersecting)) this._libMore(el);
    }, { root: box, rootMargin: '0px 0px 600px 0px' });
    this._libMoreIo.observe(foot);
  }

  _libMore(el) {
    const m = this._libModal;
    const box = el.querySelector('#lib-scroll');
    const foot = box?.querySelector('[data-lib-more]');
    if (!m || !foot) return;
    const all = this._libFilteredItems();
    const next = all.slice(m._shown, m._shown + LIB_BATCH);
    m._shown += next.length;
    const list = m.view === 'posters' ? box.querySelector('#lib-poster-grid') : box.firstElementChild;
    list?.insertAdjacentHTML('beforeend', next.map(i => m.view === 'posters' ? this._libPosterCard(i) : this._libOverviewCard(i)).join(''));
    if (m._shown >= all.length) { foot.remove(); this._libMoreIo?.disconnect(); return; }
    // Still in reach after the batch (a tall phone): look again
    this._libMoreIo.unobserve(foot);
    this._libMoreIo.observe(foot);
  }
}

export const libraryWireMixin = _LibraryWireMethods.prototype;
