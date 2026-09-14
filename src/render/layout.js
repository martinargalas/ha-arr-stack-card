import { BP, maxWidth } from '../shared/ui.js';

// Repainting the right column, sticky navigation, measuring and locking heights, scroll locks. Split out of card.js.

class _LayoutMethods {

  // Odstraní focus před innerHTML zápisem — zabrání neočekávanému chování prohlížeče.
  _blurActive() {
    const el = this.shadowRoot.activeElement || document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  }

  // Floating nav — IntersectionObserver na sentinel.
  // Nav se zobrazí (fade-in) když uživatel scrolluje k pravé sekci.
  // Observer 1 (col-left): zobraz nav když col-left vyjede z viewportu — pro standardní stránky.
  // Observer 2 (col-right): záloha pro krátké stránky kde scroll nestačí ke spuštění obs. 1.
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

    // Každých 150 ms přečteme aktuální BCR — bez závislosti na scroll-událostech
    // (HA scrolluje uvnitř shadow DOM, IntersectionObserver/scroll eventy tam nejsou spolehlivé).
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
    this._navInterval = setInterval(syncNav, 150);   // spolehlivý polling
  }

  _clearNavWatcher() {
    if (this._navObserver)  { this._navObserver.disconnect();  this._navObserver  = null; }
    if (this._navObserver2) { this._navObserver2.disconnect(); this._navObserver2 = null; }
    if (this._navInterval)  { clearInterval(this._navInterval); this._navInterval = null; }
    if (this._navScrollHandler) {
      document.removeEventListener('scroll', this._navScrollHandler, true);
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
    }
    const clearBtn = this.shadowRoot.querySelector('.sec-search .search-bar-clear');
    if (clearBtn) clearBtn.style.display = this._searchActive ? '' : 'none';
    this._wireSearchResultCards(wrap);
  }

  // Everything the right column's content needs once it is drawn. Every path
  // that draws the column ends here - the full render, _reRenderRight, a
  // section repaint, a page switch, the height measurement - so none of them
  // leaves a part of it dead the way the section repaint and the page switch
  // left the statistics posters, the library tiles and the Trakt buttons. Each
  // wiring below is safe to repeat, so calling it twice doubles nothing.
  _wireRight(right) {
    if (!right) return;
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
    if (this._searchActive) {
      const srWrap = right.querySelector('.search-results-wrap');
      if (srWrap) this._wireSearchResultCards(srWrap);
    }
  }

  _reRenderRight(force = false) {
    const right = this.shadowRoot.getElementById('col-right');
    if (!right) return;
    if (!force && (this._requestPending || this._searchActive)) return;
    const enteringSearchLayout = this._searchActive && !this._searchOnlyLayout;
    this._searchOnlyLayout = this._searchActive;
    if (!this._searchActive) this._blurActive();
    if (this._searchActive) {
      // Measure across ALL search-result pages once per search session (not per keystroke) —
      // a normal-browsing height doesn't necessarily cover a sparser/denser search grid.
      if (enteringSearchLayout || this._searchMaxH == null) this._searchMaxH = this._measureSearchMaxHeight();
      const lockH = this._searchLockHeight();
      if (lockH) right.style.minHeight = lockH + 'px';
    }
    right.innerHTML = this._renderRight();
    this._wireRight(right);
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
    if (!right) return 0;
    const savedPage = this._searchPage;
    let maxH = 0;
    right.style.visibility = 'hidden';
    right.style.minHeight  = '';
    for (let p = 0; p < 20; p++) {
      this._searchPage = p;
      right.innerHTML = this._renderRight();
      maxH = Math.max(maxH, right.scrollHeight);
      const hasNext = !!right.querySelector('.rp-btn[data-dir="next"]:not(.rp-btn-hidden):not([disabled])');
      if (!hasNext) break;
    }
    this._searchPage = savedPage;
    right.style.visibility = '';
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
    right.style.visibility = 'hidden';
    right.style.minHeight  = '';

    // Iterujeme stránky stejnou logikou jako _renderRight() — dokud existuje "next".
    // Původní výpočet totalPages byl nesprávný (ignoroval regularPerPage = perPage-1),
    // čímž chyběla poslední stránka (typicky jen Calendar) a nedostala min-height.
    for (let p = 0; p < 20; p++) {
      this._rightPage = p;
      // Měříme s _pages = 0 pro každou sekci — strana 0 = nejvíce položek = nejvyšší grid
      Object.keys(this._pages).forEach(k => { this._pages[k] = 0; });
      right.innerHTML = this._renderRight();
      maxH = Math.max(maxH, right.scrollHeight);
      // Zastavíme na poslední stránce (žádné "next" tlačítko)
      const hasNext = !!right.querySelector('.rp-btn[data-dir="next"]:not(.rp-btn-hidden):not([disabled])');
      if (!hasNext) break;
    }

    this._rightPage = savedPage;
    Object.assign(this._pages, savedPages);  // obnovit section pagination
    right.innerHTML       = this._renderRight();
    right.style.visibility = '';
    this._rightMaxH       = maxH;
    this._rightMaxHFor    = key;
    this._rightMaxHCfg    = this._config;
    right.style.minHeight  = maxH + 'px';

    // Re-wire po finálním renderu
    // Poznámka: _checkBadgeOverflow() volá volající (_reRenderRight) přes druhý RAF
    // pro správné layout měření. Zde ho nevoláme synchronně.
    this._wireRight(right);
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
    const open = !!this.shadowRoot?.querySelector('.popup-overlay');
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
    this._overlayObserver = new MutationObserver(() => this._syncScrollLock());
    this._overlayObserver.observe(this.shadowRoot, { childList: true, subtree: true });
    this._syncScrollLock();
  }
}

export const layoutMixin = _LayoutMethods.prototype;
