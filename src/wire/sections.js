import { BP, maxWidth } from '../shared/ui.js';

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
      this._overlay = { section: sec, page: startPage, tvPending: null };
      this._reRenderSection(sec);
      // Proaktivně načti data na pozadí, pokud máme málo položek
      const cfg = this._getSectionOverlayConfig(sec);
      if (cfg?.apiEndpoint) this._proactiveSectionLoad(sec);
    }, { signal: ovSig });
  });

  const overlay = sr.querySelector('.trending-overlay');
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
    if (cfg.apiEndpoint && newPage * perPage >= items.length) {
      const apiPage  = this._overlayApiPage[sec] || 0;
      const apiTotal = this._overlayApiTotalPages[sec] || 1;
      if (apiPage < apiTotal) {
        try {
          const nextApiPage = apiPage + 1;
          const data = await this._hass.callApi('GET', `arr_stack/${cfg.apiEndpoint}?page=${nextApiPage}`);
          this[cfg.dataKey] = [...items, ...(data.results || [])];
          this._overlayApiTotalPages[sec] = data.totalPages || apiTotal;
          this._overlayApiPage[sec] = nextApiPage;
        } catch (err) {
          console.error(`[arr-card] ${sec} overlay lazy load error:`, err);
        }
      }
    }

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
_syncSecHeights(measure = true) {
  const right = this.shadowRoot?.getElementById('col-right');
  if (!right) return;
  if (this._overlay?.section || maxWidth(BP.STACKED)) {
    right.style.removeProperty('--sec-min-h');
    right.style.removeProperty('--sec-wrap-h');
    return;
  }
  if (measure) {
    const cards = [...right.querySelectorAll('.sec-card:not(.sec-search)')];
    if (cards.length) {
      // Measured with the floor lifted, or it could only ever grow.
      right.style.setProperty('--sec-min-h', '0px');
      const tallest = Math.max(...cards.map(c => c.offsetHeight));
      // A category still loading is short; the running maximum is what survives
      // that, and a ceiling keeps one freak measurement from stretching the card.
      this._secMaxH = Math.min(900, Math.max(this._secMaxH || 0, tallest));
    }
  }
  if (this._secMaxH) right.style.setProperty('--sec-min-h', `${this._secMaxH}px`);

  // The last page often holds fewer categories than the rest, and without a
  // floor of its own the column would end short there. A full page's height is
  // remembered and every page is held to it.
  const wrap = right.querySelector('.rp-sections');
  if (!wrap) return;
  const perPage = Math.max(2, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3) - 1;
  const shown = wrap.querySelectorAll('.sec-card:not(.sec-search)').length;
  if (measure && shown >= perPage) {
    right.style.removeProperty('--sec-wrap-h');
    this._secWrapH = Math.max(this._secWrapH || 0, wrap.offsetHeight);
  }
  if (this._secWrapH) right.style.setProperty('--sec-wrap-h', `${this._secWrapH}px`);

}

// Rerenderuj jen sloupec kde sekce leží (nezpůsobuje scroll reset stránky)
_reRenderSection(section) {
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

    right.innerHTML = this._mobMinWrap('right', this._renderRight());

    if (isMobile) {
      if (this._overlay?.section) {
        right.style.minHeight = '';
      } else if (this._rightMaxH) {
        right.style.minHeight = this._rightMaxH + 'px';
      }
    } else if (this._overlay?.section && this._overlayLockH) {
      right.style.minHeight = this._overlayLockH + 'px';
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

_swapRightKeepNav(right, scrollState) {
  const isMobile = maxWidth(BP.STACKED);
  const lockH = this._searchActive ? this._searchLockHeight() : this._rightMaxH;
  if (lockH) right.style.minHeight = lockH + 'px';

  // Na mobilu: zachovat existující nav element (zabránit překreslení/bliknutí)
  const oldNav = isMobile ? right.querySelector('.rp-nav') : null;
  const navVisible = oldNav?.classList.contains('rp-nav-visible') ?? false;
  if (oldNav) oldNav.remove();

  // Renderovat nový obsah
  const newHtml = this._renderRight();
  const wrap = this._mobMinWrap('right', newHtml);

  // Parsovat nový nav z renderovaného HTML a aplikovat jeho innerHTML na starý nav
  if (oldNav && navVisible) {
    const tmp = document.createElement('div');
    tmp.innerHTML = wrap;
    const renderedNav = tmp.querySelector('.rp-nav');
    if (renderedNav) {
      oldNav.innerHTML = renderedNav.innerHTML;
      renderedNav.remove();
    }
    right.innerHTML = tmp.innerHTML;
    right.appendChild(oldNav);
  } else {
    right.innerHTML = wrap;
    if (navVisible) {
      const newNav = right.querySelector('.rp-nav');
      if (newNav) { newNav.style.transition = 'none'; newNav.classList.add('rp-nav-visible'); requestAnimationFrame(() => { newNav.style.transition = ''; }); }
    }
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
        this._swapRightKeepNav(right, scrollState);
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
        if (this._searchActive) this._searchPage = targetPage;
        else                    this._rightPage   = targetPage;
        const right = this.shadowRoot.getElementById('col-right');
        if (right) {
          this._swapRightKeepNav(right, scrollState);
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

  // Swipe na rp-nav (pravý panel — přepínání mezi sekcemi)
  const rpNav = this.shadowRoot.querySelector('.rp-nav');
  if (rpNav) {
    let startX = null;

    rpNav.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true, signal: sig });

    rpNav.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < THRESHOLD) return;

      const dir = dx < 0 ? 'next' : 'prev';
      const allCategories = (this._cfg.categories || this._defaultCategories()).filter(c => c.enabled !== false);
      const perPage    = Math.max(1, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
      const totalPages = Math.ceil(allCategories.length / perPage);
      const cur        = this._pages['right'] || 0;

      if (dir === 'next' && cur < totalPages - 1) {
        this._pages['right'] = cur + 1;
      } else if (dir === 'prev' && cur > 0) {
        this._pages['right'] = cur - 1;
      } else {
        return;
      }

      this._reRenderRight(true);
    }, { passive: true, signal: sig });
  }
}

}

export const wireSectionsMixin = _WireSectionsMethods.prototype;
