import { BP, maxWidth, SCREEN_OVERLAYS } from '../shared/ui.js';
import { SHEET_BATCH } from './sections.js';

// Repainting the right column, sticky navigation, measuring and locking heights, scroll locks. Split out of card.js.

// Two elements from parsed markup that open the same way: tag and attributes
const sameOpening = (a, b) => {
  if (a.tagName !== b.tagName || a.attributes.length !== b.attributes.length) return false;
  for (const at of a.attributes) if (b.getAttribute(at.name) !== at.value) return false;
  return true;
};

// A button that only turns disabled, or a dot that only becomes the active
// one, is updated where it stands. Replacing it rebuilt the icon inside, and
// an ha-icon draws a frame empty before its glyph arrives — the pager blinked
// on every page. Classes are changed one by one, so those the card added
// since (a pill shown, a ping running) stay.
const FLIPS = new Set(['class', 'disabled']);
const flipsOnly = (live, a, b) => {
  const names = new Set([...a.getAttributeNames(), ...b.getAttributeNames()]);
  for (const k of names) if (a.getAttribute(k) !== b.getAttribute(k) && !FLIPS.has(k)) return false;
  const was = new Set(a.classList), now = new Set(b.classList);
  for (const c of was) if (!now.has(c)) live.classList.remove(c);
  for (const c of now) if (!was.has(c)) live.classList.add(c);
  live.toggleAttribute('disabled', b.hasAttribute('disabled'));
  return true;
};

// A picture whose address alone changed — Home Assistant renews a player's
// artwork token every few minutes, the picture itself the same — keeps showing
// the old one until the new has loaded. Swapped at once it drew empty for a
// moment and every refresh blinked the row it was in.
const srcOnly = (a, b) => {
  if (a.tagName !== 'IMG' || b.tagName !== 'IMG') return false;
  const names = new Set([...a.getAttributeNames(), ...b.getAttributeNames()]);
  for (const k of names) if (k !== 'src' && a.getAttribute(k) !== b.getAttribute(k)) return false;
  return true;
};
const swapWhenLoaded = (live, src) => {
  live._arrNextSrc = src;
  // One that shows nothing yet — still loading on a slow line, or its address
  // gone stale — has nothing to keep: it takes the new address at once. Held
  // back, it waited on a load the next refresh started over, and stayed empty.
  if (!live.complete || !live.naturalWidth) { live.setAttribute('src', src); return; }
  const pre = new Image();
  pre.onload = pre.onerror = () => { if (live._arrNextSrc === src) live.setAttribute('src', src); };
  pre.src = src;
};

// Brings `live` from what `prev` described to what `next` describes, replacing
// only the nodes that differ. A node the two agree on is left alone — its
// pictures loaded, its scroll position, what the card added to it since. One
// whose opening tag is the same is walked into, so a changed poster replaces
// that poster and not its whole row. Returns false when the shapes differ;
// the caller then replaces the node whole.
function morph(live, prev, next, depth) {
  const a = live.childNodes, p = prev.childNodes, n = next.childNodes;
  if (a.length !== p.length || p.length !== n.length) return false;
  const swaps = [];
  for (let i = 0; i < n.length; i++) {
    if (p[i].isEqualNode(n[i])) continue;
    if (p[i].nodeType === 1 && n[i].nodeType === 1 && a[i].nodeType === 1 && a[i].tagName === 'IMG'
        && srcOnly(p[i], n[i])) { swapWhenLoaded(a[i], n[i].getAttribute('src')); continue; }
    if (depth < 16 && p[i].nodeType === 1 && n[i].nodeType === 1 && a[i].nodeType === 1
        && a[i].tagName === n[i].tagName && (sameOpening(p[i], n[i]) || flipsOnly(a[i], p[i], n[i]))
        && morph(a[i], p[i], n[i], depth + 1)) continue;
    swaps.push([a[i], n[i]]);
  }
  for (const [old, fresh] of swaps) old.replaceWith(document.importNode(fresh, true));
  return true;
}

const parse = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };

class _LayoutMethods {

  // Puts a column's new markup in place, touching only what changed. Every
  // refresh used to swap the whole column, so each answer that came back
  // rebuilt every poster and the card blinked a few times on every load.
  // The markup last painted is kept on the element; unchanged markup paints
  // nothing, and changed markup replaces only the nodes that differ. A write
  // to the column that bypasses this must clear el._arrHtml.
  _paintCol(el, html) {
    // While a tablet's pages are measured the column's state is the probe's:
    // painted then, it showed every tile at once for a moment
    if (this._flowMeasuring && el.id === 'col-right') return false;
    html = html || '';
    if (el._arrHtml === html && el.firstChild) return false;
    const prev = el._arrHtml;
    el._arrHtml = html;
    const next = parse(html);
    if (prev != null && el.firstChild && morph(el, parse(prev), next, 0)) return true;
    el.replaceChildren(document.importNode(next, true));
    return true;
  }

  // A hidden copy of the right column to measure pages in, so measuring never
  // touches what is on screen
  _rightProbe(right) {
    const probe = right.cloneNode(false);
    probe.removeAttribute('id');
    probe._arrHtml = null;
    Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: right.clientWidth + 'px', minHeight: '' });
    right.after(probe);
    return probe;
  }

  // Odstraní focus před innerHTML zápisem — zabrání neočekávanému chování prohlížeče.
  _blurActive() {
    const el = this.shadowRoot.activeElement || document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  }

  // Floating nav na stackovaném layoutu: zobrazí se (fade-in), když uživatel doscrolluje k pravé sekci.
  // Podmínka 1: první sloupec vyjel z viewportu — pro standardní stránky.
  // Podmínka 2: druhý sloupec je skoro celý vidět — záloha pro krátké stránky, kde 1 nenastane.
  _wireStickyNav() {
    // Pouze na stackovaném layoutu (mobil/tablet ≤ 900px)
    if (window.matchMedia('(min-width: 901px)').matches) return;

    const colLeft  = this.shadowRoot.getElementById('col-left');
    const colRight = this.shadowRoot.getElementById('col-right');
    if (!colLeft) return;

    this._clearNavWatcher();

    // sticky_nav_offset: jak brzo před opuštěním col-left se nav zobrazí (výchozí 100 px)
    const raw    = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
    const offset = raw != null ? Math.max(0, parseInt(raw)) : 100;

    // swap_sides na mobilu: col-right je vizuálně nahoře → sleduj jeho odchod
    const swapped = !!(this._cfg?.swap_sides);
    const left  = swapped ? colRight : colLeft;
    const right = swapped ? colLeft  : colRight;

    const syncNav = () => {
      const nav = this.shadowRoot.querySelector('.rp-nav');
      if (!nav) return;
      const lRect = left.getBoundingClientRect();

      // Podmínka 1: vizuálně první sloupec vyjel nad viewport o alespoň `offset` px
      const leftIsGone = lRect.bottom < offset;

      // Podmínka 2 (záloha pro krátké stránky): vizuálně druhý sloupec je z ≥ 90 % viditelný
      // a první se aspoň trochu schoval nad viewport
      let rightEnough = false;
      if (right && lRect.top < 0) {
        const rRect   = right.getBoundingClientRect();
        const vh      = window.innerHeight;
        const visible = Math.min(rRect.bottom, vh) - Math.max(rRect.top, 0);
        rightEnough   = rRect.height > 0 && visible / rRect.height >= 0.9;
      }

      nav.classList.toggle('rp-nav-visible', leftIsGone || rightEnough);
    };

    syncNav();                                        // okamžitý stav

    // The nav only changes when something moves, so it is recomputed then (PR
    // #37, David Coulson) rather than every 150 ms. Scroll is composed:false:
    // a listener on document never hears HA scrolling a container inside its
    // shadow DOM, so it goes on the scroller itself, found across shadow
    // boundaries, and on the window for a page that scrolls the document. An
    // IntersectionObserver on both columns sees any scroller. A slow poll stays
    // as the backstop: the observer only fires at its thresholds, and HA can
    // swap the scroller between two renders.
    let queued = false;
    const trigger = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; syncNav(); });
    };
    this._navScrollHandler = trigger;
    this._navScroller = this._findScrollContainer();
    this._navScroller?.addEventListener('scroll', trigger, { passive: true });
    window.addEventListener('scroll', trigger, { passive: true });
    window.addEventListener('resize', trigger, { passive: true });
    if (typeof IntersectionObserver === 'function') {
      this._navObserver = new IntersectionObserver(trigger, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
      this._navObserver.observe(left);
      if (right) this._navObserver.observe(right);
    }
    this._navInterval = setInterval(syncNav, 1000);
  }

  _clearNavWatcher() {
    if (this._navObserver)  { this._navObserver.disconnect();  this._navObserver  = null; }
    if (this._navInterval)  { clearInterval(this._navInterval); this._navInterval = null; }
    if (this._navScrollHandler) {
      this._navScroller?.removeEventListener('scroll', this._navScrollHandler);
      window.removeEventListener('scroll', this._navScrollHandler);
      window.removeEventListener('resize', this._navScrollHandler);
      this._navScroller = null;
      this._navScrollHandler = null;
    }
  }

  // Po přepnutí stránky pravého sloupce (rp-btn / rp-dot):
  // Zachytí scroll stav těsně před re-renderem pravého sloupce.
  // Musí být voláno PŘED right.innerHTML = ..., proto jako samostatná metoda.
  _captureScrollState() {
    if (!maxWidth(BP.STACKED)) return null;
    const sc      = this._findScrollContainer();
    const colLeft  = this.shadowRoot.getElementById('col-left');
    const colRight = this.shadowRoot.getElementById('col-right');
    if (!sc) return null;

    // swap_sides: col-right is visually on top → treat as "left" (first panel)
    const swapped = !!(this._cfg?.swap_sides);
    const topCol    = swapped ? colRight : colLeft;
    const bottomCol = swapped ? colLeft  : colRight;

    const prevScrollTop = sc.scrollTop;
    const atBottom      = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 60;

    // "Krátká stránka" = jsme na konci, ale spodní panel se celý vešel do viewportu
    // a horní panel aspoň trochu vyjel (navbar byl viditelný).
    let shortPage = false;
    if (atBottom && topCol && bottomCol) {
      const rRect = bottomCol.getBoundingClientRect();
      const lRect = topCol.getBoundingClientRect();
      shortPage = rRect.top >= 0 && lRect.top < 0;
    }

    return { sc, prevScrollTop, atBottom, shortPage };
  }

  // Po přepnutí stránky pravého sloupce (rp-btn / rp-dot):
  // Na mobilu přeskočíme _measureAndLockHeight() — zabrání scroll-to-top (stejný princip jako u pg-btn).
  // Na desktopu měříme výšky normálně.
  // scrollState musí být zachycen PŘED renderem (viz _captureScrollState).
  _afterRightPageSwitch(scrollState = null) {
    const isMobile = maxWidth(BP.STACKED);

    requestAnimationFrame(() => {
      // _measureAndLockHeight() zde záměrně nevoláme — _rightMaxH je cachován z posledního
      // _render() a byl aplikován synchronně před innerHTML swapem v click handleru.
      // Volání _measureAndLockHeight() by způsobilo minHeight collapse (layout reflow).
      requestAnimationFrame(() => {
        this._checkBadgeOverflow();

        if (!isMobile || !scrollState) return;
        const { sc, prevScrollTop, atBottom, shortPage } = scrollState;

        if (shortPage) {
          // Krátká stránka: scrollni přesně na pozici, kde se navbar zobrazí.
          // Navbar se zobrazí, když vizuálně první sloupec.bottom < offset.
          const swapped = !!(this._cfg?.swap_sides);
          const topColId = swapped ? 'col-right' : 'col-left';
          const topCol = this.shadowRoot.getElementById(topColId);
          if (topCol) {
            const raw    = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
            const offset = raw != null ? Math.max(0, parseInt(raw)) : 100;
            const lRect  = topCol.getBoundingClientRect();
            sc.scrollTop += lRect.bottom - offset + 1; // +1 px: syncNav používá < (striktně)
          }
        } else if (atBottom) {
          // Dlouhá stránka, byl na konci → zůstaň na konci nové stránky.
          sc.scrollTop = sc.scrollHeight;
        } else {
          // Byl uprostřed → obnov přesnou pozici.
          sc.scrollTop = prevScrollTop;
        }
      });
    });
    // Re-measure activity card limits whenever a new page renders
    // (pagination bypasses _render(), so trim must be triggered separately)
    this._trimActivityCards();
  }

  // Projde DOM stromem nahoru přes shadow DOM hranice a vrátí první scroll container.
  // scrollIntoView() / window.scroll nejsou spolehlivé v HA shadow DOM na Android Chrome.
  _findScrollContainer() {
    let node = this;
    for (let i = 0; i < 20; i++) {
      const next = node.parentNode
        ?? (node.getRootNode?.() !== document ? node.getRootNode?.()?.host : null);
      if (!next || next === document || next === window) break;
      node = next;
      if (node.nodeType !== 1) continue;
      try {
        const oy = window.getComputedStyle(node).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
          return node;
        }
      } catch (_) { /* cross-origin guard */ }
    }
    return document.documentElement;
  }

  // Generic helper for modal/table search bars — recomputes the full render via `renderFn`
  // (unavoidable, cheapest option given how these render functions are written) but only
  // patches the `.wrapClass` subtree's innerHTML, never touching whatever lives outside it
  // (the search input, filter/sort selects, tab buttons). Recreating an <input> the user is
  // actively typing into is what closes the keyboard on iOS — this keeps it untouched.
  _patchResultsWrap(root, wrapClass, renderFn) {
    const target = root?.querySelector(`.${wrapClass}`);
    if (!target) { root.innerHTML = renderFn(); return; }
    const temp = document.createElement('div');
    temp.innerHTML = renderFn();
    const fresh = temp.querySelector(`.${wrapClass}`);
    if (!fresh) { root.innerHTML = renderFn(); return; }
    target.innerHTML = fresh.innerHTML;
  }

  // Updates only the search results grid (+ inline TV overlay), never touching
  // .search-bar-wrap — recreating the <input> there closes the keyboard on iOS
  // every time results refresh while the user is still typing.
  // Only safe once the right panel is already in the search-only layout
  // (_renderRight()'s searchActive branch) — otherwise other categories
  // still shown alongside the search bar would never get hidden.
  _reRenderSearchResults() {
    if (!this._searchOnlyLayout) { this._reRenderRight(true); return; }
    const wrap = this.shadowRoot.querySelector('.sec-search .search-results-wrap');
    if (!wrap) { this._reRenderRight(true); return; }
    const html = this._renderSearchResultsInner();
    if (html !== this._searchResultsHtml || !wrap.firstElementChild) {
      this._searchResultsHtml = html;
      wrap.innerHTML = html;
      // Written into the column past _paintCol: its next paint starts over
      const col = this.shadowRoot.getElementById('col-right');
      if (col) col._arrHtml = null;
    }
    const clearBtn = this.shadowRoot.querySelector('.sec-search .search-bar-clear');
    if (clearBtn) clearBtn.style.display = this._searchActive ? '' : 'none';
    this._wireSearchResultCards(wrap);
    // The cards are only half of it: an add overlay painted here brings its own
    // cancel, confirm, instance tabs and season pager, and those are wired over
    // there. A film's overlay never noticed — its plus forces a full column
    // redraw — but a series' arrives through this path alone, and its buttons
    // did nothing at all. Every binding below is flagged, so this repeats free.
    this._wireOverseerrButtons();
  }

  // Everything the right column's content needs once it is drawn. Every path
  // that draws the column ends here - the full render, _reRenderRight, a
  // section repaint, a page switch, the height measurement - so none of them
  // leaves a part of it dead the way the section repaint and the page switch
  // left the statistics posters, the library tiles and the Trakt buttons. Each
  // wiring below is safe to repeat, so calling it twice doubles nothing.
  _wireRight(right) {
    if (!right) return;
    // A tablet's shelves and list are held to the pages' height from their
    // first paint: until their own pages are measured they would show every
    // tile at once
    const hold = this._flowFits && this._rightMaxH ? this._rightMaxH + 'px' : '';
    right.style.maxHeight = hold;
    right.classList.toggle('flow-held', !!hold);
    if (hold) right.style.minHeight = hold;
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
    this._wireSearch();
    this._wireTraktButtons();
    this._wireTautulliPosters(right);
    this._wireJellystatPosters(right);
    this._wireTracearrPosters(right);
    this._wireActivityPosters(right);
    this._wireProwlarrPosters(right);
    this._wireMaintainerrPosters(right);
    this._wireTmdbNotice(right);
    this._wireLibraryTiles(right);
    this._wireMinimize(['right']);
    this._wireMobList(right);
    if (right.querySelector('.mob-shelves')) requestAnimationFrame(() => this._wireShelfFade());
    if (right.querySelector('.to-sheet-hdr')) requestAnimationFrame(() => {
      this._fitSheetHdr(right);
      this._wireSheetSize(right);
      right.querySelectorAll('.to-sheet-body').forEach(b => this._syncEdgeFade(b));
    });
    if (this._searchActive) {
      const srWrap = right.querySelector('.search-results-wrap');
      if (srWrap) this._wireSearchResultCards(srWrap);
    }
  }

  // The phone's list layout: a tile opens its category over the whole screen
  // — a poster category as See More, the rest in a sheet of their own — and
  // the sheet's arrow puts it away.
  _wireMobList(right) {
    if (right._mobListWired) return;
    right._mobListWired = true;
    right.addEventListener('click', e => {
      // A tablet's sheet is a window over a dimmed screen: a tap beside it
      // closes it, as its own close button does
      if (e.target.closest('.to-sheet-veil')) {
        e.stopPropagation();
        right.querySelector('.to-sheet .sheet-x')?.click();
        return;
      }
      if (e.target.closest('[data-mob-sheet-close]')) {
        e.stopPropagation();
        this._mobSheet = null;
        this._reRenderRight(true);
        return;
      }
      const row = e.target.closest('[data-mob-open]');
      if (!row) return;
      e.stopPropagation();
      const id = row.dataset.mobOpen;
      const cfg = this._getSectionOverlayConfig(id);
      if (cfg) {
        this._overlay = { section: id, page: 0, tvPending: null, shown: SHEET_BATCH };
        this._sheetFetchFailed = null;
        this._reRenderSection(id);
        if (cfg.apiEndpoint) this._proactiveSectionLoad(id);
        return;
      }
      this._mobSheet = id;
      this._reRenderRight(true);
    });
  }

  _reRenderRight(force = false) {
    const right = this.shadowRoot.getElementById('col-right');
    if (!right) return;
    if (!force && (this._requestPending || this._searchActive)) return;
    const enteringSearchLayout = this._searchActive && !this._searchOnlyLayout;
    this._searchOnlyLayout = this._searchActive;
    // The search field keeps the caret through a redraw — the first letter,
    // the last one deleted, the clear button, a background refresh — until
    // something else is clicked, as the field in Similar titles does. Anything
    // else focused is let go, as before.
    const was = this.shadowRoot.activeElement;
    const keepSearch = this._searchKeepFocus || !!was?.classList?.contains('search-bar-input');
    const caret = keepSearch && was?.classList?.contains('search-bar-input') ? was.selectionStart : null;
    this._searchKeepFocus = false;
    if (!this._searchActive && !keepSearch) this._blurActive();
    if (this._searchActive) {
      // Measure across ALL search-result pages once per search session (not per keystroke) —
      // a normal-browsing height doesn't necessarily cover a sparser/denser search grid.
      if (enteringSearchLayout || this._searchMaxH == null) this._searchMaxH = this._measureSearchMaxHeight();
      const lockH = this._searchLockHeight();
      if (lockH) right.style.minHeight = lockH + 'px';
    }
    // The same wrapper _render paints on a phone; without it, each switch
    // between the two paths rebuilt the whole column
    this._paintCol(right, this._mobMinWrap('right', this._renderRight()));
    this._wireRight(right);
    if (keepSearch) {
      const fresh = right.querySelector('.search-bar-input');
      if (fresh) {
        fresh.focus();
        const at = caret ?? fresh.value.length;
        try { fresh.setSelectionRange(at, at); } catch (_) {}
      }
    }
    this._syncSecHeights(false);
    requestAnimationFrame(() => this._syncSecHeights());
    this._trimActivityCards();
    // Při aktivním vyhledávání přeskočíme — výška se zachovává z _rightMaxH.
    // Na mobilu/tabletu uložíme scroll pozici před měřením a obnovíme ji po něm,
    // aby collapse min-height nezpůsobil scroll-to-top.
    requestAnimationFrame(() => {
      if (!this._searchActive) {
        const isMobile = maxWidth(BP.STACKED);
        if (isMobile) {
          const sc = this._findScrollContainer();
          const savedTop = sc ? sc.scrollTop : 0;
          this._measureAndLockHeight();
          if (sc) sc.scrollTop = savedTop;
        } else {
          this._measureAndLockHeight();
        }
      }
      requestAnimationFrame(() => this._checkBadgeOverflow());
    });
  }

  // Combined height lock while search is active — the greater of the cached
  // normal-browsing height and the search grid's own max-across-pages height.
  _searchLockHeight() {
    return Math.max(this._rightMaxH || 0, this._searchMaxH || 0) || null;
  }

  // Přeměří všechny stránky search výsledků a vrátí nejvyšší scrollHeight —
  // stejná logika jako _measureAndLockHeight(), ale iteruje _searchPage místo _rightPage.
  _measureSearchMaxHeight() {
    const right = this.shadowRoot.getElementById('col-right');
    // Results a phone scrolls through only grow: held to the tallest, a short
    // answer after a long one would sit above an empty screen
    if (!right || this._searchScroll) return 0;
    const savedPage = this._searchPage;
    let maxH = 0;
    const probe = this._rightProbe(right);
    for (let p = 0; p < 20; p++) {
      this._searchPage = p;
      probe.innerHTML = this._mobMinWrap('right', this._renderRight());
      maxH = Math.max(maxH, probe.scrollHeight);
      const hasNext = !!probe.querySelector('.rp-btn[data-dir="next"]:not(.rp-btn-hidden):not([disabled])');
      if (!hasNext) break;
    }
    probe.remove();
    this._searchPage = savedPage;
    return maxH;
  }

  // What the measured height depends on: the data, the column's width, an
  // open overlay, the layout, a minimised side and the language. Paging
  // through the column changes none of them.
  _rightMaxHKey() {
    const right = this.shadowRoot.getElementById('col-right');
    return [this._dataFingerprint(), right ? right.clientWidth : 0, this._overlay?.section || '',
      this._cfg?.layout || 'both', this._rightMinimized ? 1 : 0, this._lg()].join('|');
  }

  // Přeměří všechny stránky pravého sloupce a nastaví min-height na nejvyšší.
  // Každá outer stránka se měří se všemi _pages sekcí = 0 (nejvyšší možná varianta).
  // Vše proběhne synchronně v jednom JS tiku — browser nestihne malovat.
  _measureAndLockHeight() {
    const right = this.shadowRoot.getElementById('col-right');
    if (!right) return;

    // A phone's shelves and list have no pages to hold the column to: it is as
    // tall as what it shows, and grows and shrinks with a category opened
    if (this._mobFlow && !this._flowFits) {
      this._rightMaxH = 0;
      this._rightMaxHFor = null;
      this._flowPages = null;
      right.style.minHeight = '';
      return;
    }
    if (this._flowFits) { this._measureFlowPages(right); return; }
    this._flowPages = null;

    // Overlay otevřen → na mobilu nenastavovat cached výšku (overlay má jen 1 kategorii),
    // na desktopu aplikovat cached výšku jako dříve
    if (this._overlay?.section && this._rightMaxH) {
      if (!maxWidth(BP.STACKED)) {
        right.style.minHeight = this._rightMaxH + 'px';
      }
      // Nothing was redrawn here, so there is nothing new to wire - wiring the
      // same cards again gave each of them a second click listener.
      return;
    }

    // Measuring renders every page of the column; nothing that decides the
    // height has changed since the last time, so its answer still holds. The
    // caller has already painted and wired the column.
    const key = this._rightMaxHKey();
    if (this._rightMaxHFor === key && this._rightMaxHCfg === this._config) {
      right.style.minHeight = this._rightMaxH + 'px';
      return;
    }

    const savedPage  = this._rightPage;
    const savedPages = { ...this._pages };  // uložit stav section pagination

    let maxH = 0;
    // Every page is drawn into a hidden copy; the column on screen stays as it is
    const probe = this._rightProbe(right);

    // Iterujeme stránky stejnou logikou jako _renderRight() — dokud existuje "next".
    // Původní výpočet totalPages byl nesprávný (ignoroval regularPerPage = perPage-1),
    // čímž chyběla poslední stránka (typicky jen Calendar) a nedostala min-height.
    for (let p = 0; p < 20; p++) {
      this._rightPage = p;
      // Měříme s _pages = 0 pro každou sekci — strana 0 = nejvíce položek = nejvyšší grid
      Object.keys(this._pages).forEach(k => { this._pages[k] = 0; });
      probe.innerHTML = this._mobMinWrap('right', this._renderRight());
      maxH = Math.max(maxH, probe.scrollHeight);
      // Zastavíme na poslední stránce (žádné "next" tlačítko)
      const hasNext = !!probe.querySelector('.rp-btn[data-dir="next"]:not(.rp-btn-hidden):not([disabled])');
      if (!hasNext) break;
    }
    probe.remove();

    this._rightPage = savedPage;
    Object.assign(this._pages, savedPages);  // obnovit section pagination
    this._paintCol(right, this._mobMinWrap('right', this._renderRight()));
    this._rightMaxH       = maxH;
    this._rightMaxHFor    = key;
    this._rightMaxHCfg    = this._config;
    right.style.minHeight  = maxH + 'px';

    // Re-wire po finálním renderu
    // Poznámka: _checkBadgeOverflow() volá volající (_reRenderRight) přes druhý RAF
    // pro správné layout měření. Zde ho nevoláme synchronně.
    this._wireRight(right);
  }

  // A tablet's shelves or list: the column is held to the height its
  // categories have as pages (categoriesCount), and what it shows is cut into
  // pages that keep to it — each a run of tiles or shelves, a list's broken
  // where a row of tiles ends.
  _measureFlowPages(right) {
    const key = this._rightMaxHKey() + '|' + this._mobLayout + '|' + this._cfgGet('discover', 'categoriesCount', 3);
    if (this._rightMaxHFor === key && this._rightMaxHCfg === this._config) {
      right.style.minHeight = this._rightMaxH + 'px';
      return;
    }
    // Measured without what lies over the column: a category opened over the
    // screen, See More
    const saved = { page: this._rightPage, pages: { ...this._pages }, sheet: this._mobSheet, overlay: this._overlay, flow: this._flowPages };
    this._mobSheet = null;
    this._overlay = null;
    this._flowMeasuring = true;
    const probe = this._rightProbe(right);
    let pages = saved.flow ? [...saved.flow] : [];
    let maxH = this._rightMaxH || 0;
    try {
    // The height the categories have as pages, the tallest page of them. As
    // on screen every category stands as tall as the tallest (_syncSecHeights):
    // found first with nothing held, then the pages measured holding to it.
    // What the column holds now belongs to shelves or a list, not to pages.
    this._measuringPages = true;
    probe.style.setProperty('--sec-wrap-h', 'auto');
    const eachPage = fn => {
      for (let p = 0; p < 20; p++) {
        this._rightPage = p;
        Object.keys(this._pages).forEach(k => { this._pages[k] = 0; });
        probe.innerHTML = this._mobMinWrap('right', this._renderRight());
        fn();
        if (!probe.querySelector('.rp-btn[data-dir="next"]:not(.rp-btn-hidden):not([disabled])')) break;
      }
    };
    let tallest = 0;
    if (!maxWidth(BP.STACKED)) {
      probe.style.setProperty('--sec-min-h', '0px');
      eachPage(() => probe.querySelectorAll('.sec-card:not(.sec-search)').forEach(c => { tallest = Math.max(tallest, c.offsetHeight); }));
      probe.style.setProperty('--sec-min-h', `${Math.min(900, tallest)}px`);
    }
    // A shelf stands as tall as a category does as pages; measured on screen
    // its posters, sized from the last measurement, would only let it grow
    this._flowSecH = tallest ? Math.min(900, tallest) : 0;
    maxH = 0;
    eachPage(() => { maxH = Math.max(maxH, probe.scrollHeight); });
    this._measuringPages = false;
    probe.style.removeProperty('--sec-wrap-h');
    // Everything at once, with a pager under it, to see where each part ends
    // and how much the pager and the column's padding take below the last
    this._flowPages = [[0, 999], [999, 999]];
    this._rightPage = 0;
    probe.innerHTML = this._mobMinWrap('right', this._renderRight());
    const units = [...probe.querySelectorAll('.rp-sections > .mob-rows > .mob-row, .rp-sections > .mob-cat')];
    const top0 = probe.getBoundingClientRect().top;
    const box = u => { const r = u.getBoundingClientRect(); return { top: r.top - top0, bottom: r.bottom - top0 }; };
    const boxes = units.map(box);
    pages = [];
    if (this._mobLayout === 'shelves') {
      // A shelf stands where a category stood, as tall: a page holds as many
      // as a page of categories does (categoriesCount)
      const per = Math.max(2, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3)
        - (this._cfgGet('discover', 'showSearch', true) !== false ? 1 : 0);
      for (let i = 0; i < units.length; i += per) pages.push([i, Math.min(units.length, i + per)]);
    } else if (boxes.length) {
      const tail = probe.scrollHeight - Math.max(...boxes.map(b => b.bottom));
      const limit = maxH - tail;
      let start = 0;
      while (start < boxes.length) {
        // A later page starts where the first did, under the search
        const shift = boxes[start].top - boxes[0].top;
        let end = start + 1;
        while (end < boxes.length && boxes[end].bottom - shift <= limit) end++;
        // Never part of a row of tiles on one page and the rest on the next
        while (end < boxes.length && end > start + 1 && boxes[end].top === boxes[end - 1].top) end--;
        pages.push([start, end]);
        start = end;
      }
    }
    } finally {
      probe.remove();
      this._measuringPages = false;
      this._flowMeasuring = false;
    }
    this._flowPages = pages.length > 1 ? pages : null;
    this._mobSheet = saved.sheet;
    this._overlay = saved.overlay;
    Object.assign(this._pages, saved.pages);
    this._rightPage = Math.min(saved.page || 0, Math.max(0, pages.length - 1));
    this._paintCol(right, this._mobMinWrap('right', this._renderRight()));
    this._rightMaxH    = maxH;
    this._rightMaxHFor = key;
    this._rightMaxHCfg = this._config;
    right.style.minHeight = maxH + 'px';
    this._wireRight(right);
    // The shelves take the categories' height just measured, and their
    // posters the height left under each heading
    this._syncSecHeights(false);
    requestAnimationFrame(() => this._syncSecHeights());
  }

  _checkBadgeOverflow() {
    // Pro každou kartu: pokud badge řádek (mc-act nebo mc-badges) přetéká → badge-compact
    this.shadowRoot.querySelectorAll('.mc').forEach(card => {
      const row = card.querySelector('.mc-act') || card.querySelector('.mc-badges');
      if (!row) return;
      const overflows = row.scrollWidth > row.clientWidth + 1;
      card.classList.toggle('badge-compact', overflows);
    });
  }

  // Any modal in this card is a full-screen overlay, so the page behind it must
  // not keep scrolling under the finger. Watched rather than wired into each
  // open/close: there are two dozen places that mount an overlay, and a missed
  // one would leave the page locked. Phone only — on a desktop the page behind
  // a dialog scrolling is normal and harmless.
  _syncScrollLock() {
    if (!this._isMob) {
      if (this._scrollLocked) this._applyScrollLock(false);
      return;
    }
    const open = !!this.shadowRoot?.querySelector(SCREEN_OVERLAYS);
    if (open !== !!this._scrollLocked) this._applyScrollLock(open);
  }

  _applyScrollLock(on) {
    this._scrollLocked = on;
    const html = document.documentElement;
    const body = document.body;
    if (on) {
      // overflow:hidden makes the scroller non-scrollable and the browser clamps
      // its offset to zero, so closing the modal would otherwise dump the user
      // back at the top of the page. Remember where they were.
      const el = this._findScrollContainer();
      this._scrollRestore = {
        el:  el && el !== html ? el : null,
        top: el ? el.scrollTop : 0,
        win: window.scrollY || window.pageYOffset || html.scrollTop || 0,
      };
      this._prevHtmlOverflow = html.style.overflow;
      this._prevBodyOverflow = body.style.overflow;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
    } else {
      html.style.overflow = this._prevHtmlOverflow || '';
      body.style.overflow = this._prevBodyOverflow || '';
      body.style.overscrollBehavior = '';

      const saved = this._scrollRestore;
      this._scrollRestore = null;
      if (!saved || (!saved.top && !saved.win)) return;
      // Twice: once now, once after the browser has re-laid out the page it just
      // made scrollable again — the first write lands on a document that is
      // still the height of the viewport and gets clamped away.
      const restore = () => {
        if (saved.el) saved.el.scrollTop = saved.top;
        if (saved.win) {
          window.scrollTo(0, saved.win);
          if (!window.scrollY) html.scrollTop = saved.win;
        }
      };
      restore();
      requestAnimationFrame(() => requestAnimationFrame(restore));
    }
  }

  _watchOverlays() {
    if (this._overlayObserver || !this.shadowRoot) return;
    this._overlayObserver = new MutationObserver(() => { this._syncScrollLock(); this._backSync(); this._liquidHeroMaybe(); });
    this._overlayObserver.observe(this.shadowRoot, { childList: true, subtree: true });
    this._syncScrollLock();
    this._backInit();
    this._wireToTop();
    this._isWireSheet();
    this._ddInit();
    this._ppWatchViewport();
  }
}

export const layoutMixin = _LayoutMethods.prototype;
