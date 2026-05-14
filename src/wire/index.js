class _WireMethods {
async _qbitAction(hash, action, deleteFiles = false) {
  const isGlobal = action === 'pauseAll' || action === 'resumeAll';
  if (isGlobal) {
    this._qbitBusy = true;
  } else {
    this._qbitItemBusy = hash;
  }
  this._reRenderLeft();
  try {
    await this._hass.callApi('POST', 'arr_stack/qbit/action', { action, hash, deleteFiles });
  } catch (e) {
    console.error('[arr-card] qBit action error:', e);
  } finally {
    this._confirmRemove = null;
    await new Promise(r => setTimeout(r, 2000));
    await this._fetchQbit();
    this._qbitBusy = false;
    this._qbitItemBusy = null;
    this._reRenderLeft();
  }
}

// ─────────────────────────────────────────────
// SABnzbd action API
// ─────────────────────────────────────────────

async _sabAction(mode) {
  this._sabBusy = true;
  this._reRenderLeft();
  try {
    await this._hass.callApi('POST', 'arr_stack/sabnzbd/action', { mode });
  } catch (e) {
    console.error('[arr-card] SAB action error:', e);
  } finally {
    await this._fetchSab();    // spinner stále viditelný během fetche
    this._sabBusy = false;     // teprve po dokončení fetche schovat spinner
    this._reRenderLeft();
  }
}

// ─────────────────────────────────────────────
// Re-render only the left column (downloads)
// ─────────────────────────────────────────────

_reRenderLeft() {
  const left = this.shadowRoot.getElementById('col-left');
  if (!left) return;
  this._blurActive();
  left.innerHTML = this._renderLeft();
  this._wireSort();
  this._wireActionButtons();
  // Scope na levý sloupec — nevkládá duplicitní listenery na rp-btn/rp-dot pravého sloupce
  this._wirePageButtons(left);
}

// ─────────────────────────────────────────────
// Wire up action buttons (global + per-torrent)
// ─────────────────────────────────────────────

_wireActionButtons() {
  // ── qBit global pause / resume ──
  const qbitToggle = this.shadowRoot.querySelector('.qbit-global-toggle');
  if (qbitToggle) {
    qbitToggle.addEventListener('click', () => {
      const paused = qbitToggle.classList.contains('paused');
      this._qbitAction(null, paused ? 'resumeAll' : 'pauseAll');
    });
  }

  // ── SAB global pause / resume ──
  const sabToggle = this.shadowRoot.querySelector('.sab-global-toggle');
  if (sabToggle) {
    sabToggle.addEventListener('click', () => {
      const paused = sabToggle.classList.contains('paused');
      this._sabAction(paused ? 'resume' : 'pause');
    });
  }

  // ── SAB retry buttons ──
  this.shadowRoot.querySelectorAll('.tb-retry').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nzoId = btn.dataset.nzoid;
      if (nzoId) this._sabRetry(nzoId);
    });
  });

  // ── SAB history delete buttons ──
  this.shadowRoot.querySelectorAll('.tb-hist-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nzoId = btn.dataset.nzoid;
      if (nzoId) this._sabHistoryDelete(nzoId);
    });
  });

  // ── Per-torrent action buttons ──
  this.shadowRoot.querySelectorAll('[data-tb-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.tbAction;
      const hash   = btn.dataset.hash || '';

      if (action === 'pause') {
        this._qbitAction(hash, 'pause');
      } else if (action === 'resume') {
        this._qbitAction(hash, 'resume');
      } else if (action === 'remove-confirm') {
        this._confirmRemove = hash;
        this._reRenderLeft();
      } else if (action === 'cancel-remove') {
        this._confirmRemove = null;
        this._reRenderLeft();
      } else if (action === 'remove-keep') {
        this._qbitAction(hash, 'delete', false);
      } else if (action === 'remove-del') {
        this._qbitAction(hash, 'delete', true);
      }
    });
  });
}

// ─────────────────────────────────────────────
// Wire up sort buttons (only re-renders torrent list)
// ─────────────────────────────────────────────

_wireSort() {
  const btns = this.shadowRoot.querySelectorAll('.sort-btns .sb');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      this._sort = btn.dataset.sort || 'progress_desc';
      this._pages.qbit = 0; // reset to first page on sort change
      this._render();
    });
  });
}

// ─────────────────────────────────────────────
// Wire up Overseerr add buttons
// ─────────────────────────────────────────────

_wireOverseerrButtons() {
  // Stará cesta (overseerr-add) — zachována pro zpětnou kompatibilitu
  this.shadowRoot.querySelectorAll('.overseerr-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const mediaId = parseInt(btn.dataset.mediaid, 10);
      if (mediaId) {
        btn.disabled = true;
        btn.textContent = '…';
        this._addOverseerrRequest(mediaId);
      }
    });
  });

  // Otevřít overlay výběru profilu (nebo rovnou odeslat při oneClickMovieRequest)
  this.shadowRoot.querySelectorAll('.req-open').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const movieId = parseInt(btn.dataset.movieid, 10);
      const tmdbId  = parseInt(btn.dataset.tmdb, 10);
      if (!movieId) return;
      btn.disabled = true;
      btn.textContent = '…';
      if (this._cfgGet('discover', 'oneClickMovieRequest', false)) {
        // Přímý request bez overlay — použij defaultní profil
        await this._addOverseerrRequest(tmdbId, null);
      } else {
        await this._fetchRadarrProfiles();
        this._requestPending = { movieId, tmdbId };
        this._reRenderRight();
      }
    });
  });

  // Zrušit film overlay
  this.shadowRoot.querySelectorAll('.req-cancel:not(.tv-req-cancel)').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this._requestPending = null;
      this._reRenderRight();
    });
  });

  // Potvrdit film žádost
  this.shadowRoot.querySelectorAll('.req-confirm:not(.tv-req-confirm)').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const movieId = parseInt(btn.dataset.movieid, 10);
      const tmdbId  = parseInt(btn.dataset.tmdb, 10);
      const sel = this.shadowRoot.getElementById(`req-select-${movieId}`);
      const profileId = sel ? sel.value : null;
      btn.disabled = true;
      btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
      await this._addOverseerrRequest(tmdbId, profileId);
    });
  });

  // ── TV seriál: otevřít overlay ──
  this.shadowRoot.querySelectorAll('.tv-req-open').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const showId = parseInt(btn.dataset.showid, 10);
      if (!showId) return;
      const fromTrending = this._trending.some(m => m.id === showId && m.mediaType === 'tv');
      const show = fromTrending
        ? this._trending.find(m => m.id === showId)
        : this._tvUpcoming.find(m => m.id === showId);
      if (!show) return;
      btn.disabled = true;
      btn.textContent = '…';

      // Pokud je tlačítko uvnitř section overlay, použij overlay-specifický stav
      if (btn.closest('.trending-overlay')) {
        const grid = btn.closest('.to-grid');
        const card = btn.closest('.mc[data-oi]');
        const cardIndex = card ? parseInt(card.dataset.oi, 10) : 0;
        const colCount = grid
          ? Math.round(getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length)
          : 4;
        await this._openOverlayTvRequest(show, cardIndex, colCount);
      } else {
        await this._openTvRequestOverlay(show, fromTrending ? 'trending' : 'tvUpcoming');
      }
    });
  });

  // ── TV seriál: zrušit overlay ──
  this.shadowRoot.querySelectorAll('.tv-req-cancel').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this._tvRequestPending = null;
      this._reRenderRight();
    });
  });

  // ── TV seriál: potvrdit ──
  this.shadowRoot.querySelectorAll('.tv-req-confirm').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const mediaId = parseInt(btn.dataset.mediaid, 10);
      // Přečti zaškrtnuté sezóny z DOM
      const checked = [...this.shadowRoot.querySelectorAll('.sv-input:checked')];
      const seasons = checked.map(el => parseInt(el.dataset.season, 10)).filter(Boolean);
      if (!seasons.length) return;
      const profileSel = this.shadowRoot.getElementById('tv-req-profile');
      const profileId = profileSel ? profileSel.value : null;
      btn.disabled = true;
      btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
      await this._addOverseerrTvRequest(mediaId, seasons, profileId);
    });
  });

  // Stažení žádosti (neadmin)
  this.shadowRoot.querySelectorAll('.req-withdraw').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const reqId   = parseInt(btn.dataset.reqid, 10);
      const mediaId = parseInt(btn.dataset.mediaid, 10);
      btn.disabled = true;
      btn.innerHTML = '<span class="action-spinner" style="width:8px;height:8px;border-width:1.5px"></span>';
      this._withdrawOverseerrRequest(reqId, mediaId);
    });
  });

  // Schválení / zamítnutí čekajících žádostí (pouze admin)
  this.shadowRoot.querySelectorAll('.pr-approve').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const reqId = parseInt(btn.dataset.reqid, 10);
      btn.disabled = true;
      btn.textContent = '…';
      this._approvePendingRequest(reqId);
    });
  });
  this.shadowRoot.querySelectorAll('.pr-decline').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const reqId = parseInt(btn.dataset.reqid, 10);
      btn.disabled = true;
      btn.textContent = '…';
      this._declinePendingRequest(reqId);
    });
  });

  // Wire TV overlay chevrons + dots
  this._wireTvOverlay();

  // Wire full section overlay (see-more + pagination + TV/movie req inside overlay)
  this._wireSectionOverlay();
}

_wireTvOverlay() {
  const scroll = this.shadowRoot.getElementById('sv-scroll');
  if (!scroll) return;

  const prev = this.shadowRoot.querySelector('.sv-prev');
  const next = this.shadowRoot.querySelector('.sv-next');
  const dots = this.shadowRoot.querySelectorAll('.sv-dot');

  const pageWidth = () => scroll.offsetWidth;

  const updateState = () => {
    const sl = scroll.scrollLeft;
    const pw = pageWidth();
    const maxSl = scroll.scrollWidth - pw;
    if (prev) prev.disabled = sl <= 2;
    if (next) next.disabled = sl >= maxSl - 2;
    if (dots.length) {
      const pg = Math.round(sl / pw);
      dots.forEach((d, i) => d.classList.toggle('sv-dot-active', i === pg));
    }
  };

  scroll.addEventListener('scroll', updateState, { passive: true });
  if (prev) prev.addEventListener('click', e => {
    e.stopPropagation();
    scroll.scrollBy({ left: -pageWidth(), behavior: 'smooth' });
  });
  if (next) next.addEventListener('click', e => {
    e.stopPropagation();
    scroll.scrollBy({ left: pageWidth(), behavior: 'smooth' });
  });

  updateState();
}

_wireSectionOverlay() {
  const sr = this.shadowRoot;

  // Otevřít overlay (klik na see-more kartu v hlavním gridu)
  sr.querySelectorAll('[data-action="overlay-open"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const sec = el.dataset.sec;
      if (!sec) return;
      this._overlay = { section: sec, page: 0, tvPending: null };
      this._reRenderSection(sec);
      // Proaktivně načti data na pozadí, pokud máme málo položek
      const cfg = this._getSectionOverlayConfig(sec);
      if (cfg?.apiEndpoint) this._proactiveSectionLoad(sec);
    });
  });

  const overlay = sr.querySelector('.trending-overlay');
  if (!overlay) return;

  // Zavřít overlay
  overlay.querySelector('[data-action="overlay-close"]')?.addEventListener('click', e => {
    e.stopPropagation();
    const sec = this._overlay?.section;
    this._overlay = { section: null, page: 0, tvPending: null };
    this._reRenderSection(sec || 'trending');
  });

  // Předchozí stránka — tlačítko je v rp-nav (vně overlay divu)
  sr.querySelector('[data-action="overlay-prev"]')?.addEventListener('click', e => {
    e.stopPropagation();
    this._overlay.page = Math.max(0, (this._overlay.page || 0) - 1);
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
    this._scrollToSectionOverlay();
  });

  // Další stránka — s lazy loadingem; tlačítko je v rp-nav (vně overlay divu)
  sr.querySelector('[data-action="overlay-next"]')?.addEventListener('click', async e => {
    e.stopPropagation();
    const sec = this._overlay?.section;
    const cfg = this._getSectionOverlayConfig(sec);
    if (!cfg) return;
    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    const rows     = Math.max(1, parseInt(this._cfgGet('discover', 'categoriesCount', 3)) || 3);
    const perPage  = isMobile ? rows * 2 : rows * 4;
    const items    = this[cfg.dataKey] || [];
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

    this._overlay.page = newPage;
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
    this._scrollToSectionOverlay();
  });

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
    });
  });

  // TV overlay nad řádkem — pozicuj po vykreslení
  if (this._overlay.tvPending) {
    requestAnimationFrame(() => this._positionTvOverlay());
  }
}

// Po kliknutí next/prev v more overlay scrolluj viewport na maximum —
// spodok col-right bude na spodku viewportu, navbar presne pod kartami
_scrollToSectionOverlay() {
  requestAnimationFrame(() => {
    const sc = this._findScrollContainer();
    if (!sc) return;
    sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  });
}

async _openOverlayTvRequest(show, cardIndex, colCount) {
  this._overlay.tvPending = {
    show, seasons: null, selected: null, profileId: null, mediaId: show.id,
    loading: true, cardIndex, colCount,
  };
  // Ukaž spinner nad kartou
  requestAnimationFrame(() => this._positionTvOverlay());

  await Promise.allSettled([
    (async () => {
      const detail = await this._hass.callApi('GET', `arr_stack/overseerr/tv/${show.id}`);
      const seasons = (detail.seasons || [])
        .filter(s => s.seasonNumber > 0)
        .map(s => s.seasonNumber)
        .sort((a, b) => a - b);
      if (this._overlay.tvPending) {
        this._overlay.tvPending.seasons = seasons;
        this._overlay.tvPending.selected = new Set(seasons);
      }
    })(),
    this._fetchSonarrProfiles(),
    (async () => { if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings(); })(),
  ]);

  if (this._overlay.tvPending) {
    this._overlay.tvPending.profileId = this._seerrSonarr?.profileId ?? null;
    this._overlay.tvPending.loading = false;
    // Aktualizuj overlay v místě (bez re-renderu celého sloupce)
    requestAnimationFrame(() => this._positionTvOverlay());
  }
}

_positionTvOverlay() {
  const tvp = this._overlay.tvPending;
  const grid = this.shadowRoot.querySelector('.to-grid');
  if (!grid || !tvp) return;

  // Kontejner = pg-wrap (stejná šířka jako standardní sec-card, včetně oblasti chevronu)
  const container = grid.parentElement;
  container.querySelector('.to-tv-abs-overlay')?.remove();

  const card = grid.querySelector(`.mc[data-oi="${tvp.cardIndex}"]`);
  if (!card) return;

  const ctnRect = container.getBoundingClientRect();
  const cRect   = card.getBoundingClientRect();

  // Počet sloupců gridu
  const colCount = Math.round(getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length) || 4;

  // Karta v předchozím řádku (pokud existuje)
  const prevCard = tvp.cardIndex >= colCount
    ? grid.querySelector(`.mc[data-oi="${tvp.cardIndex - colCount}"]`)
    : null;

  let topPx, heightPx;
  if (prevCard) {
    // Overlay začíná 10 px pod spodní hranou předchozího řádku a končí se spodní hranou aktuálního řádku
    const prevBottom = prevCard.getBoundingClientRect().top + prevCard.getBoundingClientRect().height;
    topPx   = prevBottom + 10 - ctnRect.top;
    heightPx = (cRect.top + cRect.height) - (prevBottom + 10);
  } else {
    // První řádek — overlay pokrývá jen výšku karty (bez mezery nahoře)
    topPx   = cRect.top - ctnRect.top;
    heightPx = cRect.height;
  }

  const el = document.createElement('div');
  el.className = 'to-tv-abs-overlay';
  el.style.cssText = `top:${topPx}px;height:${heightPx}px`;
  el.innerHTML = this._renderTvOverlayCompact(tvp);
  container.appendChild(el);

  if (!tvp.loading && tvp.seasons) {
    this._wireTvAbsOverlay(el, tvp);
  }
}

_wireTvAbsOverlay(el, tvp) {
  // ── Paging sezón (stejná logika jako _wireTvOverlay) ──
  const scroll = el.querySelector('#sv-scroll-abs');
  const prev   = el.querySelector('.sv-prev-abs');
  const next   = el.querySelector('.sv-next-abs');
  const dots   = el.querySelectorAll('.sv-dot');

  if (scroll) {
    const pageWidth = () => scroll.offsetWidth;
    const updateState = () => {
      const sl  = scroll.scrollLeft;
      const pw  = pageWidth();
      const max = scroll.scrollWidth - pw;
      if (prev) prev.disabled = sl <= 2;
      if (next) next.disabled = sl >= max - 2;
      if (dots.length) {
        const pg = Math.round(sl / pw);
        dots.forEach((d, i) => d.classList.toggle('sv-dot-active', i === pg));
      }
    };
    scroll.addEventListener('scroll', updateState, { passive: true });
    prev?.addEventListener('click', e => { e.stopPropagation(); scroll.scrollBy({ left: -pageWidth(), behavior: 'smooth' }); });
    next?.addEventListener('click', e => { e.stopPropagation(); scroll.scrollBy({ left: pageWidth(), behavior: 'smooth' }); });
    updateState();
  }

  // ── Cancel ── překresli overlay grid aby se Add tlačítko vrátilo do původního stavu
  el.querySelector('.to-tv-cancel-abs')?.addEventListener('click', e => {
    e.stopPropagation();
    this._overlay.tvPending = null;
    this._reRenderSection(this._overlay.section);
  });

  // ── Confirm ──
  el.querySelector('.to-tv-confirm-abs')?.addEventListener('click', async e => {
    e.stopPropagation();
    // Přečti vybrané sezóny z checkboxů (uživatel mohl změnit přepínače)
    const checkedSeasons = [...el.querySelectorAll('.sv-input:checked')]
      .map(cb => parseInt(cb.dataset.season, 10))
      .filter(Boolean);
    if (!checkedSeasons.length) return;
    const profileSel = el.querySelector('.req-select');
    const profileId  = profileSel ? profileSel.value : null;
    const mediaId    = parseInt(e.currentTarget.dataset.mediaid, 10);
    e.currentTarget.disabled = true;
    e.currentTarget.innerHTML = '<span class="action-spinner" style="width:10px;height:10px;border-width:1.5px"></span>';
    const show = tvp.show;
    this._optimisticRequested.add(show.id);
    this._withdrawnIds.delete(show.id);
    this._overlay.tvPending = null;
    el.remove();
    try {
      if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const body = { mediaType: 'tv', mediaId, seasons: checkedSeasons };
      if (this._seerrSonarr) {
        body.serverId   = this._seerrSonarr.serverId;
        body.profileId  = profileId !== null ? parseInt(profileId) : this._seerrSonarr.profileId;
        body.rootFolder = this._seerrSonarr.rootFolder;
      }
      if (!this._hass.user.is_admin) body.userMode = 'family';
      await this._hass.callApi('POST', 'arr_stack/overseerr/request', body);
    } catch (err) {
      console.error('[arr-card] overlay TV request error:', err);
      this._optimisticRequested.delete(show.id);
    }
    await this._fetchAll();
  });
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

    const isMobile = window.matchMedia('(max-width: 900px)').matches;

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

    right.innerHTML = this._renderRight();

    // Okamžitě obnov viditelnost nav bez přechodu (zabrání bliknutí)
    if (navWasVisible) {
      const newNav = right.querySelector('.rp-nav');
      if (newNav) {
        newNav.style.transition = 'none';
        newNav.classList.add('rp-nav-visible');
        requestAnimationFrame(() => { newNav.style.transition = ''; });
      }
    }

    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
    requestAnimationFrame(() => {
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

      const dir        = btn.dataset.dir;
      const totalPages = this.shadowRoot.querySelectorAll('.rp-dot').length || 1;
      const cur        = typeof this._rightPage === 'number' ? this._rightPage : 0;
      if (dir === 'next') this._rightPage = Math.min(cur + 1, totalPages - 1);
      else                this._rightPage = Math.max(cur - 1, 0);
      const right = this.shadowRoot.getElementById('col-right');
      if (right) {
        if (this._rightMaxH) right.style.minHeight = this._rightMaxH + 'px';
        right.innerHTML = this._renderRight();
        this._wirePageButtons();
        this._wirePopup();
        this._wireOverseerrButtons();
        this._afterRightPageSwitch(scrollState);
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
        this._rightPage = targetPage;
        const right = this.shadowRoot.getElementById('col-right');
        if (right) {
          if (this._rightMaxH) right.style.minHeight = this._rightMaxH + 'px';
          right.innerHTML = this._renderRight();
          this._wirePageButtons();
          this._wirePopup();
          this._wireOverseerrButtons();
          this._afterRightPageSwitch(scrollState);
        }
      }
    }, { signal: sig });
  });

  // ── Swipe gesta (pg-wrap) — jen pro celý shadow root ──────────────────────
  if (scope === this.shadowRoot) this._wireSwipe(sig);

  // ── Sticky nav — přepojit po každém přepsání innerHTML pravého sloupce ────
  if (scope === this.shadowRoot) this._wireStickyNav();

  // ── Levý/pravý sloupec: pg-btn (sekce prev / next) ────────────────────────
  scope.querySelectorAll('.pg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      const dir     = btn.dataset.dir;
      const data    = this._getPageData(section);
      const perPage = this._perPage(section);
      const total   = Math.ceil(data.length / perPage);
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
}

// ─────────────────────────────────────────────
// Swipe gesta pro stránkování sekcí (touch)
// ─────────────────────────────────────────────

_wireSwipe(sig) {
  const THRESHOLD = 40;

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
      const total   = Math.ceil(data.length / perPage);
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
}
}

export const wireMixin = _WireMethods.prototype;
