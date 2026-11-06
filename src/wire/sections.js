import { BP, maxWidth } from '../shared/ui.js';
import { SHEET_BATCH, SHEET_COLS_MAX, SHEET_COLS_MIN } from '../render/sections.js';

const SHELF_KEY = 'arr-shelf-h';
const SEC_KEY = 'arr-sec-h2';   // arr-sec-h held heights measured with no data
// A shelf's poster is never taller than this, whatever a measurement says
const SHELF_POSTER_MAX = 340;
// …and its category no taller than that poster under its heading
const SHELF_HEAD_MAX = 60;

// The right column's sections: See More overlays, paging, swipe, repainting one section. Split out of wire/index.js.

class _WireSectionsMethods {

_wireSectionOverlay() {
  const sr = this.shadowRoot;
  // Every background refresh re-wires, and without dropping the previous
  // listeners the same button collected one per pass — a single click then
  // paged forward as many times as the card had re-wired since it opened.
  if (this._ovAbort) this._ovAbort.abort();
  this._ovAbort = new AbortController();
  const ovSig = this._ovAbort.signal;

  // Otevřít overlay (klik na see-more kartu v hlavním gridu)
  sr.querySelectorAll('[data-action="overlay-open"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const sec = el.dataset.sec;
      if (!sec) return;
      let startPage;
      if (el.dataset.page !== undefined) {
        // Explicit page (e.g. header button always opens at page 0)
        startPage = parseInt(el.dataset.page) || 0;
      } else {
        // Otevři overlay na stránce, kde začínají položky skryté za "more" kartou
        const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
        const cols         = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
        const itemsBefore  = showMorePage * cols - 1;
        const isMobile     = maxWidth(BP.PHONE_S);
        const perPage      = isMobile ? cols : cols * 2;
        startPage          = Math.floor(itemsBefore / perPage);
      }
      // See More shows one category where several stood, so the column would
      // otherwise collapse to the height of that one — the page jumps and
      // whatever is under the card moves with it. Its height is held for as
      // long as the overlay is open.
      const _rc = this.shadowRoot?.getElementById('col-right');
      this._overlayLockH = _rc ? _rc.offsetHeight : 0;
      this._overlay = { section: sec, page: startPage, tvPending: null, shown: SHEET_BATCH };
      this._sheetFetchFailed = null;
      this._reRenderSection(sec);
      // Proaktivně načti data na pozadí, pokud máme málo položek
      const cfg = this._getSectionOverlayConfig(sec);
      if (cfg?.apiEndpoint) this._proactiveSectionLoad(sec);
    }, { signal: ovSig });
  });

  const overlay = sr.querySelector('.trending-overlay');
  this._sheetIo?.disconnect();
  this._sheetIo = null;
  if (!overlay) return;

  // Swipe doleva/doprava v overlay (mobile)
  let _swipeStartX = null;
  overlay.addEventListener('touchstart', e => {
    _swipeStartX = e.touches[0].clientX;
  }, { passive: true, signal: ovSig });
  overlay.addEventListener('touchend', e => {
    if (_swipeStartX === null) return;
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    _swipeStartX = null;
    if (Math.abs(dx) < 40) return;
    const action = dx < 0 ? 'overlay-next' : 'overlay-prev';
    sr.querySelector(`[data-action="${action}"]`)?.click();
  }, { passive: true, signal: ovSig });

  // Zavřít overlay
  overlay.querySelector('[data-action="overlay-close"]')?.addEventListener('click', e => {
    e.stopPropagation();
    const sec = this._overlay?.section;
    this._overlay = { section: null, page: 0, tvPending: null };
    this._overlayLockH = 0;
    this._reRenderSection(sec || 'trending');
  }, { signal: ovSig });

  if (overlay.classList.contains('to-sheet')) {
    // Every wiring watches afresh, and a fresh observer reports at once: a page
    // of posters too short to push the footer off screen loads the next one too.
    const foot = overlay.querySelector('[data-sheet-more]');
    if (foot) {
      this._sheetIo = new IntersectionObserver(en => {
        if (en.some(x => x.isIntersecting)) this._sheetMore();
      }, { root: overlay.querySelector('.to-sheet-body'), rootMargin: '0px 0px 600px 0px' });
      this._sheetIo.observe(foot);
    }
    if (this._overlay.tvPending) requestAnimationFrame(() => this._positionTvOverlay());
    return;
  }

  // První stránka overlay
  sr.querySelector('[data-action="overlay-first"]')?.addEventListener('click', e => {
    e.stopPropagation();
    this._overlay.page = 0;
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
    this._scrollToSectionOverlay();
  }, { signal: ovSig });

  // Předchozí stránka — tlačítko je v rp-nav (vně overlay divu)
  sr.querySelector('[data-action="overlay-prev"]')?.addEventListener('click', e => {
    e.stopPropagation();
    this._overlay.page = Math.max(0, (this._overlay.page || 0) - 1);
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
    this._scrollToSectionOverlay();
  }, { signal: ovSig });

  // Další stránka — s lazy loadingem; tlačítko je v rp-nav (vně overlay divu)
  sr.querySelector('[data-action="overlay-next"]')?.addEventListener('click', async e => {
    e.stopPropagation();
    const sec = this._overlay?.section;
    const cfg = this._getSectionOverlayConfig(sec);
    if (!cfg) return;
    const isMobile = maxWidth(BP.PHONE_S);
    const rows     = Math.max(1, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
    const perPage  = isMobile ? rows * 2 : rows * 4;
    const items    = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
    const newPage  = (this._overlay.page || 0) + 1;

    // Načti další API stránku, pokud máme málo položek a existuje endpoint
    if (cfg.apiEndpoint && newPage * perPage >= items.length) await this._overlayFetchNext(sec, cfg);

    // Clamp against what is actually loaded — a lazy load that brings nothing
    // back would otherwise leave the overlay on an empty page past the end.
    const finalItems = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
    const cols       = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
    const pageSize   = isMobile ? cols : cols * 2;
    const lastPage   = Math.max(0, Math.ceil(finalItems.length / pageSize) - 1);
    this._overlay.page = Math.min(newPage, lastPage);
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
    this._scrollToSectionOverlay();
  }, { signal: ovSig });

  // Poslední stránka overlay
  sr.querySelector('[data-action="overlay-last"]')?.addEventListener('click', e => {
    e.stopPropagation();
    const sec = this._overlay?.section;
    const cfg = this._getSectionOverlayConfig(sec);
    if (!cfg) return;
    const isMobile = maxWidth(BP.PHONE_S);
    const cols    = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
    const perPage = isMobile ? cols : cols * 2;
    const items   = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
    const totalPages = Math.ceil(items.length / perPage);
    this._overlay.page = Math.max(0, totalPages - 1);
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
    this._scrollToSectionOverlay();
  }, { signal: ovSig });

  // Tečky (přímý skok) — rp-dot s data-topage v rp-nav
  sr.querySelectorAll('.rp-dot[data-topage]').forEach(dot => {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      const pg = parseInt(dot.dataset.topage, 10);
      if (!isNaN(pg)) {
        this._overlay.page = pg;
        this._overlay.tvPending = null;
        this._reRenderSection(this._overlay.section);
        this._scrollToSectionOverlay();
      }
    }, { signal: ovSig });
  });

  // TV overlay nad řádkem — pozicuj po vykreslení
  if (this._overlay.tvPending) {
    requestAnimationFrame(() => this._positionTvOverlay());
  }
}

// The next page of a category from the server, added to what is loaded.
// False when there was none or it failed.
async _overlayFetchNext(sec, cfg) {
  const apiPage  = this._overlayApiPage[sec] || 0;
  const apiTotal = this._overlayApiTotalPages[sec] || 1;
  if (apiPage >= apiTotal) return false;
  try {
    const nextApiPage = apiPage + 1;
    const data = await this._hass.callApi('GET', `arr_stack/${cfg.apiEndpoint}?page=${nextApiPage}`);
    const items = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
    this[cfg.dataKey] = [...items, ...(data.results || [])];
    this._overlayApiTotalPages[sec] = data.totalPages || apiTotal;
    this._overlayApiPage[sec] = nextApiPage;
    return true;
  } catch (err) {
    console.error(`[arr-card] ${sec} overlay lazy load error:`, err);
    return false;
  }
}

// The phone's See More nears its end: show the next posters, from the server
// when everything loaded is already on screen
async _sheetMore() {
  const sec = this._overlay?.section;
  const cfg = this._getSectionOverlayConfig(sec);
  if (!cfg || this._sheetLoading) return;
  const items = (cfg.getItems ? cfg.getItems() : this[cfg.dataKey]) || [];
  const shown = this._overlay.shown || SHEET_BATCH;
  if (shown >= items.length) {
    if (!this._sheetCanFetch(sec, cfg)) return;
    this._sheetLoading = true;
    const ok = await this._overlayFetchNext(sec, cfg);
    this._sheetLoading = false;
    // A failed page is not asked for again until See More is opened afresh,
    // or the footer, still in view, would ask for it in a loop
    if (!ok) this._sheetFetchFailed = sec;
    if (this._overlay?.section !== sec) return;
  }
  this._overlay.shown = shown + SHEET_BATCH;
  this._reRenderSection(sec);
}

_scrollToSectionOverlay() {
  // Na tabletu/desktopu karta viditelná — nescrollovat.
  // Na mobilu overlay může být pod foldem — scrolluj jen pokud chybí.
  if (!maxWidth(BP.PHONE_S)) return;
  requestAnimationFrame(() => {
    const rect = this.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom <= viewportH) return;
    const sc = this._findScrollContainer();
    if (!sc) return;
    sc.scrollBy({ top: rect.bottom - viewportH + 8, behavior: 'smooth' });
  });
}

// Categories are not the same height — a row of posters stands taller than the
// statistics tiles — so paging through them resized the whole card, and with it
// everything below it on the dashboard. The tallest category seen becomes the
// floor for all of them, carried on the column as --sec-min-h so it applies the
// moment a page is drawn rather than a frame later. Desktop only: on a phone the
// column is one category wide and scrolls anyway.
// The slider in a tablet's window header: dragged, the window's grid takes
// that many posters a row at once, with nothing redrawn; let go, the count is
// kept in this browser for every window after
_wireSheetSize(root) {
  const span = SHEET_COLS_MAX - SHEET_COLS_MIN;
  const clamp = n => Math.max(SHEET_COLS_MIN, Math.min(SHEET_COLS_MAX, n));
  for (const sl of root?.querySelectorAll('[data-sheet-size]') || []) {
    if (sl._arrWired) continue;
    sl._arrWired = true;
    const sheet = sl.closest('.to-sheet');
    const track = sl.querySelector('.sz-track');
    if (!sheet || !track) continue;
    const place = n => sl.style.setProperty('--sz', String((n - SHEET_COLS_MIN) / span));
    // Where it starts: the count kept, or the one the grid has now
    const grid = sheet.querySelector('.to-grid-sheet, .to-sheet-body .mgrid');
    let live = this._sheetCols
      || clamp(grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 6);
    place(live);
    const at = x => {
      const r = track.getBoundingClientRect();
      return SHEET_COLS_MIN + Math.round(Math.max(0, Math.min(1, (x - r.left) / (r.width || 1))) * span);
    };
    const set = n => {
      place(n);
      if (n === live && sheet.style.getPropertyValue('--arr-tab-grid')) return;
      live = n;
      sheet.style.setProperty('--arr-tab-grid', `repeat(${n},minmax(0,1fr))`);
    };
    sl.addEventListener('pointerdown', e => {
      sl.setPointerCapture(e.pointerId);
      set(at(e.clientX));
      e.preventDefault();
      e.stopPropagation();
    });
    sl.addEventListener('pointermove', e => {
      if (sl.hasPointerCapture(e.pointerId)) set(at(e.clientX));
    });
    const done = e => {
      if (!sl.hasPointerCapture(e.pointerId)) return;
      sl.releasePointerCapture(e.pointerId);
      try { localStorage.setItem('arr-sheet-cols', String(live)); } catch (_) {}
    };
    sl.addEventListener('pointerup', done);
    sl.addEventListener('pointercancel', done);
    sl.addEventListener('click', e => e.stopPropagation());
  }
}

// A tablet's shelf height, kept for the next load at the column's width:
// the pages it is measured from are drawn only once the data is in
_shelfKept(w, what = 'h') {
  try {
    const k = JSON.parse(localStorage.getItem(SHELF_KEY) || 'null');
    return k && Math.abs(k.w - w) <= 2 ? (k[what] || 0) : 0;
  } catch { return 0; }
}

// A category's height as pages and a page's, at the column's width, kept
// for the next load's first moments
_secKept(w) {
  try {
    const k = JSON.parse(localStorage.getItem(SEC_KEY) || 'null');
    return k && Math.abs(k.w - w) <= 2 ? k : {};
  } catch { return {}; }
}

_secKeep(w, what) {
  if (!w) return;
  try {
    const k = this._secKept(w);
    localStorage.setItem(SEC_KEY, JSON.stringify({ ...k, ...what, w }));
  } catch { /* storage off */ }
}

// The category's height and what of it is not the shelf (o)
_shelfKeep(w, h, o = this._shelfOver || 0) {
  if (!w || !h) return;
  try { localStorage.setItem(SHELF_KEY, JSON.stringify({ w, h, o })); } catch { /* storage off */ }
}

_syncSecHeights(measure = true) {
  const right = this.shadowRoot?.getElementById('col-right');
  if (!right) return;
  if (this._overlay?.section || maxWidth(BP.STACKED)) {
    right.style.removeProperty('--sec-min-h');
    right.style.removeProperty('--sec-wrap-h');
    return;
  }
  // From the card's first paint — before the categories are even tracked,
  // drawn with no data at all — until every one of them is in
  const loading = !!this._heightsLoading || (!!this._catReady && !this._catAllReady);
  const kept = loading ? this._secKept(right.clientWidth) : {};
  if (this._mobFlow) {
    // Shelves are held to what the categories measure as pages, nothing else:
    // measured on screen during the first load, a category alone in the column
    // stood as tall as the column and its posters with it. Until the pages are
    // measured, last time's height at this width, or the posters' own.
    this._secMaxH = Math.min(SHELF_POSTER_MAX + SHELF_HEAD_MAX, this._flowSecH || this._shelfKept(right.clientWidth) || 0);
    if (!this._secMaxH) right.style.removeProperty('--sec-min-h');
  } else if (loading && kept.sec) {
    // During the first load the categories are drawn from last time, from
    // grey shapes or half their data: measured then, one stood twice as tall
    // and the running maximum held every page to it for good. Last time's
    // height at this width until everything is in, measured afresh then.
    this._secMaxH = kept.sec;
  } else if (loading) {
    // Nothing kept: no floor at all until the categories have their data
    this._secMaxH = 0;
    right.style.removeProperty('--sec-min-h');
  } else if (measure) {
    const cards = [...right.querySelectorAll('.sec-card:not(.sec-search)')];
    if (cards.length) {
      // Measured with the floor lifted, or it could only ever grow.
      right.style.setProperty('--sec-min-h', '0px');
      const tallest = Math.max(...cards.map(c => c.offsetHeight));
      // A category still loading is short; the running maximum is what survives
      // that, and a ceiling keeps one freak measurement from stretching the card.
      // While loading, nothing is kept from one measurement to the next.
      this._secMaxH = Math.min(900, Math.max(this._secMaxH || 0, tallest));
      this._secKeep(right.clientWidth, { sec: this._secMaxH });
    }
  }
  if (this._secMaxH) right.style.setProperty('--sec-min-h', `${this._secMaxH}px`);
  // A shelf's posters take the height its category has left under the
  // heading; a percentage of a box sized by min-height resolves to nothing.
  // Taken from the category's height less what is not the shelf — the shelf's
  // own height is its posters', so measuring it only gave back the last value
  // and the category stood a heading taller than the rest, then grew with
  // every measurement up to the ceiling.
  // A statistics' row of tiles is a shelf as well. What a category takes
  // besides its shelf is the most any heading takes (measured with every
  // category at once, _measureFlowPages), so the posters on every page are
  // as tall; until then the most of the ones on screen.
  const rows = [...right.querySelectorAll('.shelf-fill .sec-card :is(.mgrid.shelf, .tl-row)')];
  if (rows.length && this._secMaxH) {
    const over = this._shelfOver || this._shelfKept(right.clientWidth, 'o')
      || Math.max(...rows.map(r => r.closest('.sec-card').offsetHeight - r.offsetHeight));
    const pad = parseFloat(getComputedStyle(rows[0]).paddingBottom) || 0;
    const h = Math.round(this._secMaxH - over - pad);
    if (h > 40) right.style.setProperty('--shelf-h', `${Math.min(SHELF_POSTER_MAX, h)}px`);
  } else if (!rows.length && !right.querySelector('.shelf-fill')) right.style.removeProperty('--shelf-h');

  // The last page often holds fewer categories than the rest, and without a
  // floor of its own the column would end short there. A full page's height is
  // remembered and every page is held to it.
  const wrap = right.querySelector('.rp-sections');
  if (!wrap) return;
  // Shelves and the list hold no page of categories to take the height of:
  // measured, they gave every category at once as a page, thousands of pixels
  if (this._mobFlow) {
    right.style.removeProperty('--sec-wrap-h');
    return;
  }
  const perPage = Math.max(2, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3) - 1;
  const shown = wrap.querySelectorAll('.sec-card:not(.sec-search)').length;
  if (loading) {
    this._secWrapH = kept.wrap || 0;
    if (!this._secWrapH) right.style.removeProperty('--sec-wrap-h');
  } else if (measure && shown >= perPage) {
    right.style.removeProperty('--sec-wrap-h');
    this._secWrapH = Math.max(this._secWrapH || 0, wrap.offsetHeight);
    this._secKeep(right.clientWidth, { wrap: this._secWrapH });
  }
  if (this._secWrapH) right.style.setProperty('--sec-wrap-h', `${this._secWrapH}px`);

}

// Rerenderuj jen sloupec kde sekce leží (nezpůsobuje scroll reset stránky)
_reRenderSection(section) {
  this._holdScroll?.();
  const leftSections = new Set(['qbit', 'sab']);
  if (leftSections.has(section)) {
    this._reRenderLeft();
  } else {
    // Sekce paging nemění strukturu pravého sloupce — přeskočíme _measureAndLockHeight()
    // (ta dočasně vynuluje min-height, což způsobuje scrollování na Androidu)
    const right = this.shadowRoot.getElementById('col-right');
    if (!right) return;
    if (this._searchActive) return;

    const isMobile = maxWidth(BP.STACKED);

    // ── Bug 2: navbar by probliknul (opacity 0→1 přechod) ─────────────────
    // Zachytíme viditelnost starého nav PŘED innerHTML swap a okamžitě ji
    // obnovíme na novém nav bez CSS přechodu.
    const navWasVisible = right.querySelector('.rp-nav')
      ?.classList.contains('rp-nav-visible') ?? false;

    // ── Bug 1: při zkrácení stránky prohlížeč auto-scrolluje nahoru ────────
    // Zachytíme stav scroll containeru před renderem, abychom ho mohli opravit.
    const sc   = isMobile ? this._findScrollContainer() : null;
    const raw  = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
    const navOffset = raw != null ? Math.max(0, parseInt(raw)) : 100;
    const left = isMobile ? this.shadowRoot.getElementById('col-left') : null;
    const navWasMet = isMobile && left
      ? left.getBoundingClientRect().bottom < navOffset
      : false;

    this._paintCol(right, this._mobMinWrap('right', this._renderRight()));

    if (isMobile) {
      if (this._overlay?.section) {
        right.style.minHeight = '';
      } else if (this._rightMaxH) {
        right.style.minHeight = this._rightMaxH + 'px';
      }
    } else if (this._overlay?.section && this._overlayLockH) {
      right.style.minHeight = this._overlayLockH + 'px';
    } else if (this._flowFits && this._rightMaxH) {
      // A tablet's shelves and list hold to the pages' height by this alone
      right.style.minHeight = this._rightMaxH + 'px';
    } else {
      right.style.minHeight = '';
    }

    // Okamžitě obnov viditelnost nav bez přechodu (zabrání bliknutí)
    if (navWasVisible) {
      const newNav = right.querySelector('.rp-nav');
      if (newNav) {
        newNav.style.transition = 'none';
        newNav.classList.add('rp-nav-visible');
        requestAnimationFrame(() => { newNav.style.transition = ''; });
      }
    }

    this._wireRight(right);
    this._syncSecHeights(false);   // the floor is known — apply it before paint
    requestAnimationFrame(() => {
      this._syncSecHeights();
      this._checkBadgeOverflow();

      // ── Obnov scroll po změně výšky sekce ───────────────────────────────
      // Navbar zobrazíme (col-left.bottom = navOffset - 1) pokud:
      //   A) navbar byl viditelný před renderem (navWasMet) — stránka se zkrátila
      //   B) jsme na "krátké stránce" (col-right se vejde do viewportu) a col-left
      //      je aspoň trochu za viewport (lRect.top < 0) — stránka se prodloužila
      //      zpět (1 film → 4 filmy) a navbar je opět dosažitelný
      if (isMobile && sc && left) {
        const lRect      = left.getBoundingClientRect();
        const rightEl    = this.shadowRoot.getElementById('col-right');
        const rRect      = rightEl ? rightEl.getBoundingClientRect() : null;
        const isShortPage = rRect ? rRect.height <= window.innerHeight : false;

        // V more overlay scroll řídíme ručně přes _scrollToSectionOverlay
        if (!this._overlay?.section &&
            lRect.bottom >= navOffset && (navWasMet || (isShortPage && lRect.top < 0))) {
          sc.scrollTop += lRect.bottom - navOffset + 1;
        }
      }
    });
  }
}

_swapRightKeepNav(right, scrollState, fromPage) {
  const isMobile = maxWidth(BP.STACKED);
  const lockH = this._searchActive ? this._searchLockHeight() : this._rightMaxH;
  if (lockH) right.style.minHeight = lockH + 'px';

  // The floating nav on a phone stays the node it is: painting the column
  // keeps it and changes only the dots and buttons that moved. Taking it out
  // and putting it back, as this used to, recreated its blurred capsule — a
  // blink on every page.
  const navVisible = isMobile && !!right.querySelector('.rp-nav.rp-nav-visible');
  // The page slides in the way it was turned — what arrives from the right
  // is the next page. Only what changed moves: a search bar that stays on
  // every page stays put. Compared by markup, since painting keeps a section's
  // own node and changes what is inside it.
  const pageNow = () => (this._searchActive ? this._searchPage : this._rightPage) || 0;
  const dir = typeof fromPage === 'number' && pageNow() !== fromPage
    ? (pageNow() > fromPage ? 'next' : 'prev') : null;
  const before = new Set([...(right.querySelector('.rp-sections')?.children || [])].map(el => el.outerHTML));
  this._paintCol(right, this._mobMinWrap('right', this._renderRight()));
  if (dir) {
    for (const el of right.querySelector('.rp-sections')?.children || []) {
      if (before.has(el.outerHTML) || !el.offsetHeight) continue;
      el.classList.add(`rp-turn-${dir}`);
      el.addEventListener('animationend', () => el.classList.remove(`rp-turn-${dir}`), { once: true });
    }
  }
  const newNav = navVisible ? right.querySelector('.rp-nav') : null;
  if (newNav && !newNav.classList.contains('rp-nav-visible')) {
    // Replaced after all (the column changed shape): shown without fading in
    newNav.style.transition = 'none';
    newNav.classList.add('rp-nav-visible');
    requestAnimationFrame(() => { newNav.style.transition = ''; });
  }

  this._wireRight(right);
  // Paging swaps the column's contents on its own path — without this the
  // category floor was left off the page that was just drawn, and a short last
  // page ended above where every other page ends.
  this._syncSecHeights(false);
  requestAnimationFrame(() => this._syncSecHeights());
  this._afterRightPageSwitch(scrollState);
  this._resetFetchInterval();
  this._fetchVisibleCats();
}

_wirePageButtons(scope = this.shadowRoot) {
  // ── Zrušíme VŠECHNY předchozí page-button listenery najednou ──────────────
  // AbortController zaručí, že na každém tlačítku je vždy právě jeden listener,
  // i kdyby byl _wirePageButtons() zavolán desítkykrát (background refresh atd.).
  if (this._pageBtnAbort) this._pageBtnAbort.abort();
  this._pageBtnAbort = new AbortController();
  const sig = this._pageBtnAbort.signal;

  // ── Pravý sloupec: rp-btn (prev / next) ───────────────────────────────────
  if (scope === this.shadowRoot) scope.querySelectorAll('.rp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Tlačidlá section overlay majú data-action — spravuje ich _wireSectionOverlay, preskočiť
      if (btn.dataset.action) return;
      btn.classList.add('rp-btn-ping');
      btn.addEventListener('animationend', () => btn.classList.remove('rp-btn-ping'), { once: true });

      const scrollState = this._captureScrollState(); // ← PŘED renderem

      const dir = btn.dataset.dir;
      const fromPage = (this._searchActive ? this._searchPage : this._rightPage) || 0;
      if (this._searchActive) {
        const _sc = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4));
        const searchTotal = Math.ceil((this._searchResults || []).length / (_sc * 2));
        const cur = this._searchPage || 0;
        if      (dir === 'next')  this._searchPage = Math.min(cur + 1, searchTotal - 1);
        else if (dir === 'prev')  this._searchPage = Math.max(cur - 1, 0);
        else if (dir === 'first') this._searchPage = 0;
        else if (dir === 'last')  this._searchPage = Math.max(0, searchTotal - 1);
      } else {
        const totalPages = this._rightTotalPages || this.shadowRoot.querySelectorAll('.rp-dot').length || 1;
        const cur        = typeof this._rightPage === 'number' ? this._rightPage : 0;
        if      (dir === 'next')  this._rightPage = Math.min(cur + 1, totalPages - 1);
        else if (dir === 'prev')  this._rightPage = Math.max(cur - 1, 0);
        else if (dir === 'first') this._rightPage = 0;
        else if (dir === 'last')  this._rightPage = Math.max(0, totalPages - 1);
      }
      const right = this.shadowRoot.getElementById('col-right');
      if (right) {
        this._swapRightKeepNav(right, scrollState, fromPage);
      }
    }, { signal: sig });
  });

  // ── Pravý sloupec: rp-dot (přímý skok) ────────────────────────────────────
  if (scope === this.shadowRoot) this.shadowRoot.querySelectorAll('.rp-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      // Tečky section overlay majú data-topage — spravuje ich _wireSectionOverlay, preskočiť
      if (dot.dataset.topage !== undefined) return;
      const targetPage = parseInt(dot.dataset.page, 10);
      if (!isNaN(targetPage)) {
        const scrollState = this._captureScrollState(); // ← PŘED renderem
        const fromPage = (this._searchActive ? this._searchPage : this._rightPage) || 0;
        if (this._searchActive) this._searchPage = targetPage;
        else                    this._rightPage   = targetPage;
        const right = this.shadowRoot.getElementById('col-right');
        if (right) {
          this._swapRightKeepNav(right, scrollState, fromPage);
        }
      }
    }, { signal: sig });
  });

  // ── Swipe gesta (pg-wrap) — jen pro celý shadow root ──────────────────────
  if (scope === this.shadowRoot) this._wireSwipe(sig);

  // ── Sticky nav — přepojit po každém přepsání innerHTML pravého sloupce ────
  if (scope === this.shadowRoot) this._wireStickyNav();

  // ── Calendar modal open button ─────────────────────────────────────────────
  scope.querySelectorAll('[data-action="open-cal-modal"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      this._markActivated();
      this._calendarModalOpen   = true;
      this._calendarWeekOffset  = 0;
      this._calendarMonthOffset = 0;
      this._calDayOpen          = null;
      this._calendarModalData   = [];
      this._renderCalendarModalEl();
      // Honours the remembered week/month view
      await this._fetchCalendarWindow();
    }, { signal: sig });
  });

  // ── Levý/pravý sloupec: pg-btn (sekce prev / next) ────────────────────────
  scope.querySelectorAll('.pg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      const dir     = btn.dataset.dir;
      const data    = this._getPageData(section);
      const perPage = this._perPage(section);
      // See-More collapses the tail into one card, so the raw item count is not
      // the page count. Only for sections that actually render one — _smpPageCount
      // is computed from the category column config and means nothing for qbit/sab.
      const count   = this._hasSeeMore(section) ? this._smpPageCount(data, section) : data.length;
      const total   = Math.ceil(count / perPage);
      const cur     = this._pages[section] || 0;
      if (dir === 'next' && cur < total - 1) {
        this._pages[section]   = cur + 1;
        this._pageDir[section] = 'next';
      } else if (dir === 'prev' && cur > 0) {
        this._pages[section]   = cur - 1;
        this._pageDir[section] = 'prev';
      } else {
        return;
      }
      this._reRenderSection(section);
      Object.keys(this._pageDir).forEach(k => { this._pageDir[k] = ''; });
    }, { signal: sig });
  });

  // ── Disk chip paging (root folder disks) ──────────────────────────────────
  scope.querySelectorAll('.dc-chev').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.diskkey;
      const dir = btn.dataset.diskdir;
      if (!key || btn.disabled) return;
      let roots;
      if (key === 'left') {
        roots = [...(this._radarrRootFolders || []), ...(this._sonarrRootFolders || [])];
      } else {
        roots = key === 'radarr' ? this._radarrRootFolders : this._sonarrRootFolders;
      }
      const DISK_ROUND = 100 * 1024 * 1024;
      const diskMap = new Map();
      for (const r of roots) {
        const key = Math.round(r.freeSpace / DISK_ROUND);
        if (!diskMap.has(key)) diskMap.set(key, true);
      }
      const total = diskMap.size;
      const cur   = this._diskPage[key] ?? 0;
      if (dir === 'next' && cur < total - 1) this._diskPage[key] = cur + 1;
      else if (dir === 'prev' && cur > 0)    this._diskPage[key] = cur - 1;
      else return;
      if (key === 'left') {
        this._reRenderLeft();
      } else {
        this._reRenderSection(key);
      }
    }, { signal: sig });
  });
}

// ─────────────────────────────────────────────
// Swipe gesta pro stránkování sekcí (touch)
// ─────────────────────────────────────────────

_wireSwipe(sig) {
  const THRESHOLD = 40;

  // Swipe na jednotlivých sekcích (pg-wrap)
  this.shadowRoot.querySelectorAll('.pg-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.pg-btn[data-section]');
    if (!btn) return;
    const section = btn.dataset.section;

    let startX = null;

    wrap.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true, signal: sig });

    wrap.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < THRESHOLD) return;

      const dir     = dx < 0 ? 'next' : 'prev';
      const data    = this._getPageData(section);
      const perPage = this._perPage(section);
      const total   = Math.ceil(this._smpPageCount(data, section) / perPage);
      const cur     = this._pages[section] || 0;

      if (dir === 'next' && cur < total - 1) {
        this._pages[section]   = cur + 1;
        this._pageDir[section] = 'next';
      } else if (dir === 'prev' && cur > 0) {
        this._pages[section]   = cur - 1;
        this._pageDir[section] = 'prev';
      } else {
        return;
      }

      this._reRenderSection(section);
      Object.keys(this._pageDir).forEach(k => { this._pageDir[k] = ''; });
    }, { passive: true, signal: sig });
  });

  // A swipe across the right column's pager — the floating one on a phone —
  // turns one page, by pressing the arrow it would have pressed. The arrows
  // know how pages are counted (filled to fit, search results) and keep the
  // pager in place while the page changes; counting here as well got both
  // wrong.
  const rpNav = this.shadowRoot.querySelector('.rp-nav');
  if (rpNav) {
    let startX = null, startY = 0;

    rpNav.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true, signal: sig });

    rpNav.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) < THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
      const arrow = rpNav.querySelector(`.rp-btn[data-dir="${dx < 0 ? 'next' : 'prev'}"]`);
      if (arrow && !arrow.disabled) arrow.click();
    }, { passive: true, signal: sig });
  }
}

}

export const wireSectionsMixin = _WireSectionsMethods.prototype;
