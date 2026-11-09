import { BP, maxWidth } from '../shared/ui.js';

// A phone's window in a pop-up with a header of the card's own
// (arr-stack-search with header: true) takes that header over: the window's
// controls go up into it and its close turns into a back chevron, and the
// window drops its own header row and starts just under the pop-up's. Two
// headers one above the other took a sixth of the screen.
//
// The controls in the header are a copy of the window's own, which stay in
// the window, hidden: a press on the copy is passed to the same place in the
// original, so the column's own handlers answer it as before. The original is
// watched, and the copy follows whatever it turns into.
//
// The windows that hand their controls over: how to know one, its header,
// and the parts of that header that go up (its close stays: the header's own
// close stands in for it). Children, not descendants: a window holds other
// headers in its body.
const kid = (el, sel) => [...(el?.children || [])].find(c => c.matches(sel)) || null;
// The windows with a header row of their own: the Library, the services',
// Similar titles. Their dialogs (a form, a manual import) keep theirs.
const SVC = '[data-lib-modal], [data-act-modal], [data-tl-modal], [data-js-modal], [data-pw-modal], [data-mt-modal], [data-tra-modal], [data-sim-modal]';
const SVC_KEY = [['[data-lib-modal]', 'library'], ['[data-act-modal]', 'activity'], ['[data-tl-modal]', 'tautulli'],
  ['[data-js-modal]', 'jellystat'], ['[data-pw-modal]', 'prowlarr'], ['[data-mt-modal]', 'maintainerr'], ['[data-tra-modal]', 'tracearr']];
const svcHdr = w => (w.matches(SVC) ? kid(kid(w, '.popup-glass'), '.is-panel-hdr') : null);
// The windows drawn over a picture, with a round close floating on it and no
// header row: Now Playing, an artist, an album. Their name goes up, their
// controls stay with the picture.
const PIC = '[data-modal="stream"], [data-music-modal], [data-album-modal]';
const heroPill = w => kid(w, '.popup-glass')?.querySelector('.pp-hero-bar .pp-hero-pill') || null;
// Everything in it but the close; a box that holds the close beside other
// things gives up those things. Elements only: the copy is matched to them in
// order, and text between them would merge and shift that order.
// An empty one (a spacer, a box for actions this tab has none of) is left
// out: in the header's row it only added a gap before the controls.
const blank = n => !n.textContent.trim() && !n.querySelector('button, img, svg, input, select, [role="button"]');
const svcParts = h => [...h.children].flatMap(n => {
  if (n.matches('.popup-close')) return [];
  if (kid(n, '.popup-close')) return [...n.children].filter(c => !c.matches('.popup-close'));
  return [n];
}).filter(n => !blank(n) && n.style.display !== 'none');

const TAKERS = [
  { is: w => w.matches('.to-sheet'), hdr: w => kid(w, '.to-sheet-hdr'),
    parts: h => [...(kid(h, '.sh-side:not(.sh-end)')?.children || [])] },
  // Its dates stand where a name would
  { is: w => w.id === 'cal-overlay', hdr: w => kid(kid(w, '#cal-glass'), '.cal-modal-hdr'),
    parts: h => [...h.children].filter(c => c.matches('.is-filter, .cal-week-label')), title: () => '' },
  { is: w => !!svcHdr(w), hdr: svcHdr, parts: svcParts,
    // The name its category goes by in the card
    title: (w, card) => {
      if (w.matches('[data-sim-modal]')) return card._t?.('simTitle');
      const key = SVC_KEY.find(([sel]) => w.matches(sel))?.[1];
      return key && (card._catCache?.[key]?.t || card.shadowRoot?.querySelector(`.mob-row[data-key="${key}"] .mob-row-t b`)?.textContent);
    } },
  // A title's detail: its buttons over the picture (Search, Remove, Actions)
  // go up, their menus drop under the header; no name, the title is right
  // under it in the window
  { is: w => w.matches('[data-modal="detail"], [data-music-modal]') && !!heroPill(w), hdr: heroPill,
    parts: h => [...h.children], title: () => '' },
  { is: w => w.matches(PIC), hdr: w => kid(kid(w, '.popup-glass'), '.popup-close'), parts: () => [],
    title: w => w.querySelector('.popup-title')?.textContent },
];

class _HdrTakeMethods {
  // A phone, and a header of the card's own that closes its pop-up
  get _hdrTakeOn() {
    const bar = this._searchExt;
    return !!bar && !!bar._config?.header && maxWidth(BP.PHONE);
  }

  // A phone with no pop-up header of its own to lend (phone_header): the card
  // puts one of its own over its columns, the search field in it, held at
  // the top of the screen as the page scrolls. A window opened takes it over
  // as it would a pop-up's, its back chevron the way out. Wider screens, and
  // a card that pairs with a header elsewhere (search_in_header), go without.
  _ownBarSync() {
    const want = !!this._config?.phone_header && !this._config?.search_in_header
      && maxWidth(BP.PHONE) && !!customElements.get('arr-stack-search');
    const body = this.shadowRoot?.querySelector('.card > .card-body');
    let bar = this._ownBar;
    if (!want || !body) {
      if (bar) { this._ownBar = null; bar.remove(); }
      return;
    }
    if (!bar) {
      bar = document.createElement('arr-stack-search');
      bar._ownCard = this;
      bar.setAttribute('own', '');
      bar.setConfig({ header: true });
      this._ownBar = bar;
    }
    // Under Home Assistant's own bar when the page itself scrolls; at the top
    // of a box that scrolls the card (a pop-up), which has no bar over it
    const sc = this._findScrollContainer?.();
    const page = !sc || sc === document.documentElement || sc === document.body;
    bar.style.setProperty('--arr-own-hdr-top', page ? 'calc(var(--header-height, 56px) + env(safe-area-inset-top, 0px))' : '0px');
    if (bar.parentNode !== body.parentNode || bar.nextSibling !== body) body.before(bar);
    if (this._hass) bar.hass = this._hass;
  }

  // The topmost window that hands its controls over, with its header
  _hdrTakeSource() {
    // The highest window that is one of these: a dialog over it (a form, a
    // detail) covers the header too, and the window under it keeps its place
    const open = (this._backOpen?.() || [])
      .map((o, i) => ({ o, i, z: parseInt(o.style.zIndex || getComputedStyle(o).zIndex, 10) || 0 }))
      .sort((a, b) => (b.z - a.z) || (b.i - a.i));
    let t = null, top = null;
    for (const { o } of open) { t = TAKERS.find(k => k.is(o)); if (t) { top = o; break; } }
    if (!t) return null;
    // Something else over it (a title's detail, a form) has the screen: the
    // header lets go, or it showed the window's switch over the detail
    const covered = open[0].o !== top;
    const hdr = t?.hdr(top);
    if (!hdr) return null;
    const title = (t.title ? t.title(top, this) : hdr.querySelector('.col-hdr-title')?.textContent) || '';
    return { win: top, hdr, parts: t.parts(hdr), title: title.trim(), covered };
  }

  // Called on every change to the shadow DOM (_watchOverlays) and when the
  // window's header itself changes
  _hdrTakeSync() {
    const on = this._hdrTakeOn;
    try { this.toggleAttribute('hdr-take', on); } catch (_) {}
    const src = on ? this._hdrTakeSource() : null;
    const bar = this._searchExt;
    // Every such window open is marked, for its frame (styles): one under
    // another (a category under an artist opened from it) keeps its place
    for (const o of this._backOpen?.() || []) {
      const taken = on && TAKERS.some(k => k.is(o));
      o.classList.toggle('hdr-taken', taken);
      // A window that is one long list (the Library, Maintainerr's overview)
      // runs on under a bar along the bottom as a category's window does, the
      // list fading out at its top and bottom edges. Known by the window and
      // its tab, not by the list being there: Maintainerr swaps its list while
      // it loads and lays it out by the window's height, and the window
      // jumping between the two heights redrew it without end.
      // Not Tracearr: its menu is a bar along the window's bottom on a phone,
      // which a dock would cover; the window ends above the dock instead.
      const full = taken && (o.matches('[data-lib-modal], [data-act-modal], [data-pw-modal], [data-tl-modal], [data-js-modal], [data-sim-modal], [data-music-modal], [data-album-modal], [data-modal="stream"]')
        || (o.matches('[data-mt-modal]') && !!o.querySelector('#mt-nav .mt-nav-btn.is-on[data-mt-tab="overview"]')));
      o.classList.toggle('hdr-full', full);
      const list = full ? o.querySelector('.popup-glass .lib-scroll.vscroll') : null;
      if (list) this._syncEdgeFade?.(list);
    }
    if (src?.hdr !== this._hdrTakeHdr) {
      this._hdrTakeObs?.disconnect();
      this._hdrTakeHdr = src?.hdr || null;
      if (src) {
        this._hdrTakeObs ||= new MutationObserver(() => this._hdrTakeSync());
        this._hdrTakeObs.observe(src.hdr, { subtree: true, childList: true, attributes: true, characterData: true });
        this._hdrTakeReveal();
        this._syncTopBar(src.win);
        // Once more laid out, where the window's frame is known
        requestAnimationFrame(() => this._syncTopBar(src.win));
      }
    }
    // A window with no controls of its own shows its name: an empty header
    // said nothing about what was open
    const name = () => `<span class="ash-take-title">${this._escHtml(src.title)}</span>`;
    // The pills' place is the window's measure, hidden there (nothing): the
    // header places its own, so it is left out of the copy, or every move of
    // it in the window redrew the header's switch
    const copy = n => {
      const c = n.cloneNode(true);
      c.querySelectorAll('.mt-nav-ind').forEach(i => i.removeAttribute('style'));
      // The lens a detail's buttons bend the picture with is the card's own
      // filter; named from the header it is nothing and drops the blur too
      [c, ...c.querySelectorAll('[style*="arr-liquid"]')].forEach(e => {
        if (e.style?.backdropFilter?.includes('arr-liquid')) { e.style.removeProperty('backdrop-filter'); e.style.removeProperty('-webkit-backdrop-filter'); }
        if (e.getAttribute?.('style') === '') e.removeAttribute('style');
      });
      return c.outerHTML;
    };
    const own = src ? src.parts.map(copy).join('') : '';
    // The window's name after its controls, where there is room for it (the
    // header hides it where there is not: search-card _fitTake)
    const html = src && !src.covered ? own + (src.title ? name() : '') : null;
    if (html === this._hdrTakeHtml) return;
    this._hdrTakeHtml = html;
    bar?._take?.(html);
    // A detail's menu under its button, now in the header
    if (src?.win.matches('[data-modal="detail"]')) this._qaPositionMenu?.();
  }

  // The pop-up's header, close included: the window starts just under it and
  // is exactly as wide. Given in the frame the window is placed in — a pop-up
  // that moves (Bubble Card's slides in) makes that its own box, not the screen.
  _syncTopBar(win) {
    const r = this._searchExt?.getBoundingClientRect?.();
    try {
      if (!r || !(r.height > 0) || !(r.bottom > 0)) {
        for (const k of ['--arr-top-bar', '--arr-take-l', '--arr-take-w']) this.style.removeProperty(k);
        return;
      }
      let dx = 0, dy = 0;
      if (win?.isConnected) {
        const wr = win.getBoundingClientRect(), cs = getComputedStyle(win);
        dx = (wr.left - parseFloat(cs.left)) || 0;
        dy = (wr.top - parseFloat(cs.top)) || 0;
      }
      this.style.setProperty('--arr-top-bar', `${Math.round(r.bottom - dy)}px`);
      this.style.setProperty('--arr-take-l', `${Math.round(r.left - dx)}px`);
      this.style.setProperty('--arr-take-w', `${Math.round(r.width)}px`);
      this._syncFixedFrame?.(win);
    } catch (_) {}
  }

  // The header scrolls with the pop-up: with the list scrolled down (the
  // Library is at its end) it was off the screen, and the window, with no
  // header to sit under, took the whole screen. The pop-up is brought back
  // until the header shows; the scroll lock puts the list back on closing.
  _hdrTakeReveal() {
    const r = this._searchExt?.getBoundingClientRect?.();
    if (!r || r.top >= 0) return;
    // Held while the window is open (_applyScrollLock), and no longer found as
    // a scroller then
    const sc = this._lockedScroller || this._findScrollContainer?.();
    if (!sc) return;
    const top = sc === document.documentElement || sc === document.body ? 0 : sc.getBoundingClientRect().top;
    sc.scrollTop = Math.max(0, sc.scrollTop + r.top - top - 18);
  }

  // A press on the copy in the header: the same place in the original
  _hdrTakeClick(target, root) {
    const parts = this._hdrTakeHdr && this._hdrTakeSource()?.parts;
    if (!parts || !root?.contains(target) || target === root) return false;
    const path = [];
    // The first step counts elements only, as the parts are; inside a part
    // the copy is the same markup, so every node counts
    for (let n = target; n && n !== root; n = n.parentNode) {
      path.unshift(n.parentNode === root ? [...root.children].indexOf(n) : [...n.parentNode.childNodes].indexOf(n));
    }
    let el = parts[path.shift()];
    for (const i of path) { el = el?.childNodes[i]; }
    if (el && el.nodeType !== 1) el = el.parentElement;
    if (!el) return false;
    // Not el.click(): an icon's svg has none
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    return true;
  }

  // The chevron: the topmost window closes, or steps back inside itself
  _hdrTakeBack() {
    const top = this._backTop?.();
    if (top) this._backClose(top);
  }
}

export const hdrTakeMixin = _HdrTakeMethods.prototype;
