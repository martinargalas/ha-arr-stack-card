// Request buttons and the request overlays on posters. Split out of wire/index.js.

class _WireRequestsMethods {

// ─────────────────────────────────────────────
// Wire up Overseerr add buttons
// ─────────────────────────────────────────────

_wireOverseerrButtons() {
  // Trakt stagger animace — přidá třídu PO renderu přes rAF, takže se spolehlivě přehraje
  if (this._traktAnimateNext) {
    this._traktAnimateNext = false;
    requestAnimationFrame(() => {
      const sec = this.shadowRoot.querySelector('[data-trakt-sec]');
      if (!sec) return;
      sec.classList.remove('trakt-animate');
      // Force reflow, pak přidej třídu → browser vždy spustí animaci znovu
      void sec.offsetWidth;
      sec.classList.add('trakt-animate');
    });
  }

  // Stará cesta (overseerr-add) — zachována pro zpětnou kompatibilitu
  this.shadowRoot.querySelectorAll('.overseerr-add').forEach(btn => {
    if (btn._ow1) return;
    btn._ow1 = true;
    btn.addEventListener('click', () => {
      const mediaId = parseInt(btn.dataset.mediaid, 10);
      if (mediaId) {
        btn.disabled = true;
        btn.textContent = '…';
        this._addOverseerrRequest(mediaId);
      }
    });
  });

  // Otevřít overlay výběru profilu (nebo rovnou odeslat při oneClickRequest)
  this.shadowRoot.querySelectorAll('.req-open').forEach(btn => {
    if (btn._ow2) return;
    btn._ow2 = true;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const movieId = parseInt(btn.dataset.movieid, 10);
      const tmdbId  = parseInt(btn.dataset.tmdb, 10);
      if (!movieId) return;
      btn.disabled = true;
      btn.textContent = '…';
      // backward compat: oneClickRequest OR old oneClickMovieRequest
      const oneClick = (this._cfgGet('discover', 'oneClickRequest', false)
                    || this._cfgGet('discover', 'oneClickMovieRequest', false))
                    && !(this._cfgGet('discover', 'oneClickNonAdminOnly', false) && this._hass.user.is_admin);
      if (oneClick) {
        // Přímý request bez overlay — najdi profil podle jména nebo použij výchozí
        const profileName = this._cfgGet('discover', 'oneClickDefaultMovieProfile', '');
        let profileId = null;
        if (profileName) {
          await this._fetchRadarrProfiles();
          const match = this._radarrProfiles.find(p => p.name === profileName);
          profileId = match ? match.id : null;
        }
        const cfgMovieTag = this._cfgGet('discover', 'oneClickDefaultMovieTag', '') || '';
        let movieTagId = null;
        if (cfgMovieTag && this._radarrTags.length > 0) {
          const tm = this._radarrTags.find(t => t.label === cfgMovieTag);
          if (tm) movieTagId = tm.id;
        }
        const cfgMovieRootFolder = this._cfgGet('discover', 'oneClickDefaultMovieRootFolder', '') || null;
        if (this._overseerrConfigured === false) {
          await this._addDirectMovieRequest(tmdbId, profileId, movieTagId, cfgMovieRootFolder, 'radarr');
        } else {
          await this._addOverseerrRequest(tmdbId, profileId, movieTagId, cfgMovieRootFolder);
        }
      } else {
        await Promise.all([this._fetchRadarrProfiles(), this._fetchRadarrTags(), this._fetchRadarrRootFolders()]);
        const reqKey = btn.dataset.reqkey || String(tmdbId);
        this._requestPending = { movieId, tmdbId, reqKey };
        this._reRenderRight(true);
      }
    });
  });

  // Zrušit film overlay
  this.shadowRoot.querySelectorAll('.req-cancel:not(.tv-req-cancel):not(.mus-add-cancel)').forEach(btn => {
    if (btn._ow3) return;
    btn._ow3 = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this._requestPending = null;
      this._reRenderRight(true);
    });
  });

  // The request overlay's selects are the shared field-select shape: the visible
  // label is ours, so mirror the chosen option onto it.
  this.shadowRoot.querySelectorAll('.req-panel select').forEach(sel => {
    if (sel._ow4) return;
    sel._ow4 = true;
    if (sel._qSync) return;
    sel._qSync = true;
    sel.addEventListener('change', e => this._tbSyncSelect(e.target));
  });

  // Instance tabs carry the same sliding fill as the modal navs — place it on
  // the active tab once the bar has been laid out.
  this.shadowRoot.querySelectorAll('.req-tabs').forEach(nav => {
    if (nav._ow5) return;
    nav._ow5 = true;
    requestAnimationFrame(() => this._syncNavInd(nav, nav.querySelector('.req-tab--active')));
  });

  // Tab switching v request overlay
  this.shadowRoot.querySelectorAll('.req-tab').forEach(tab => {
    if (tab._ow6) return;
    tab._ow6 = true;
    tab.addEventListener('click', e => {
      e.stopPropagation();
      const overlay = tab.closest('.req-overlay');
      if (!overlay) return;
      const targetPanel = tab.dataset.tab;
      const nav  = tab.closest('.req-tabs');
      const from = this._navIndRect(nav);
      // toggle active tab
      overlay.querySelectorAll('.req-tab').forEach(t => t.classList.toggle('req-tab--active', t.dataset.tab === targetPanel));
      this._syncNavInd(nav, tab, from);
      // toggle panel visibility
      overlay.querySelectorAll('.req-panel').forEach(p => p.classList.toggle('req-panel--hidden', p.dataset.panel !== targetPanel));
    });
  });

  // Potvrdit film žádost — čte aktivní tab, správné selecty
  this.shadowRoot.querySelectorAll('.req-confirm:not(.tv-req-confirm):not(.mus-add-confirm)').forEach(btn => {
    if (btn._ow7) return;
    btn._ow7 = true;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const movieId   = parseInt(btn.dataset.movieid, 10);
      const tmdbId    = parseInt(btn.dataset.tmdb, 10);
      const overlay   = btn.closest('.req-overlay');
      const activeTab = overlay?.querySelector('.req-tab--active')?.dataset.tab ?? 'r1';
      const use2      = activeTab === 'r2';
      const suffix    = use2 ? '2' : '';
      const sel    = this.shadowRoot.getElementById(`req-select${suffix}-${movieId}`);
      const tagSel = this.shadowRoot.getElementById(`req-tag${suffix}-${movieId}`);
      const rfSel  = this.shadowRoot.getElementById(`req-rootfolder${suffix}-${movieId}`);
      const profileId  = sel    ? sel.value    : null;
      const tagId      = tagSel ? tagSel.value : null;
      const rootFolder = rfSel?.value || null;
      btn.disabled = true;
      btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
      if (this._overseerrConfigured === false) {
        await this._addDirectMovieRequest(tmdbId, profileId, tagId || null, rootFolder, use2 ? 'radarr2' : 'radarr');
      } else {
        await this._addOverseerrRequest(tmdbId, profileId, tagId || null, rootFolder, use2);
      }
    });
  });

  // ── TV seriál: otevřít overlay ──
  const tvBtns = this.shadowRoot.querySelectorAll('.tv-req-open');
  tvBtns.forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const showId = parseInt(btn.dataset.showid, 10);
      if (!showId) return;
      const tvSource = btn.dataset.source || 'tvUpcoming';
      const show =
        tvSource === 'trending'   ? this._trending.find(m => m.id === showId && m.mediaType === 'tv') :
        tvSource === 'search'     ? (this._searchResults || []).find(m => m.id === showId && m.mediaType === 'tv') :
        tvSource === 'trakt'      ? (this._trakt || []).find(m => m.id === showId && m.mediaType === 'tv') :
        tvSource === 'popular'    ? (this._popular || []).find(m => m.id === showId && m.mediaType === 'tv') :
        tvSource === 'suggestarr' ? (this._suggestarr || []).find(m => m.id === showId && m.mediaType === 'tv') :
                                    (this._tvUpcoming || []).find(m => m.id === showId);
      const fromTrending = tvSource === 'trending';
      const fromSearch   = tvSource === 'search';
      if (!show) return;
      btn.disabled = true;
      btn.textContent = '…';

      // One-click TV request — přeskočí overlay, requestuje automaticky Season 1
      const oneClick = (this._cfgGet('discover', 'oneClickRequest', false)
                    || this._cfgGet('discover', 'oneClickMovieRequest', false))
                    && !(this._cfgGet('discover', 'oneClickNonAdminOnly', false) && this._hass.user.is_admin);
      if (oneClick) {
        await this._oneClickTvRequest(show);
        btn.disabled = false;
        return;
      }

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
        await this._openTvRequestOverlay(show, tvSource);
      }
    });
  });

  // ── TV seriál: zrušit overlay ──
  this.shadowRoot.querySelectorAll('.tv-req-cancel').forEach(btn => {
    if (btn._ow8) return;
    btn._ow8 = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this._tvRequestPending = null;
      this._reRenderRight(true);
    });
  });

  // ── TV seriál: potvrdit ──
  this.shadowRoot.querySelectorAll('.tv-req-confirm').forEach(btn => {
    if (btn._ow9) return;
    btn._ow9 = true;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const mediaId = parseInt(btn.dataset.mediaid, 10);
      // Přečti zaškrtnuté sezóny z DOM
      const checked = [...this.shadowRoot.querySelectorAll('.sv-input:checked')];
      const seasons = checked.map(el => parseInt(el.dataset.season, 10)).filter(Boolean);
      if (!seasons.length) return;
      // Zjisti aktivní panel (s1 = Sonarr, s2 = Sonarr 2)
      const activePanel = this.shadowRoot.querySelector('.req-panel:not(.req-panel--hidden)')?.dataset.panel || 's1';
      const use2 = activePanel === 's2';
      const profileSel = this.shadowRoot.getElementById(use2 ? 'tv-req-profile2' : 'tv-req-profile');
      const tagSel     = this.shadowRoot.getElementById(use2 ? 'tv-req-tag2'     : 'tv-req-tag');
      const rfSel      = this.shadowRoot.getElementById(use2 ? 'tv-req-rootfolder2' : 'tv-req-rootfolder');
      const profileId  = profileSel ? profileSel.value : null;
      const tagId      = tagSel?.value || null;
      const rootFolder = rfSel?.value || null;
      btn.disabled = true;
      btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
      if (this._overseerrConfigured === false) {
        await this._addDirectTvRequest(this._tvRequestPending?.show, seasons, profileId, tagId, rootFolder, use2 ? 'sonarr2' : 'sonarr');
      } else {
        await this._addOverseerrTvRequest(mediaId, seasons, profileId, tagId, rootFolder, use2);
      }
    });
  });

  this._wireTraktButtons();

  // Stažení žádosti (neadmin)
  this.shadowRoot.querySelectorAll('.req-withdraw').forEach(btn => {
    if (btn._ow10) return;
    btn._ow10 = true;
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
    if (btn._ow11) return;
    btn._ow11 = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const ids = btn.dataset.reqid.split(',').map(Number);
      btn.disabled = true;
      btn.innerHTML = '…';
      this._markActivated();
      ids.forEach(id => this._approvePendingRequest(id));
    });
  });
  this.shadowRoot.querySelectorAll('.pr-decline').forEach(btn => {
    if (btn._ow12) return;
    btn._ow12 = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const ids = btn.dataset.reqid.split(',').map(Number);
      btn.disabled = true;
      btn.innerHTML = '…';
      this._markActivated();
      ids.forEach(id => this._declinePendingRequest(id));
    });
  });

  // Wire TV overlay chevrons + dots
  this._wireTvOverlay();

  // Wire full section overlay (see-more + pagination + TV/movie req inside overlay)
  this._wireSectionOverlay();

  this._alignReqOverlay();

  const _rightCol = this.shadowRoot?.getElementById('col-right');
  if (_rightCol) this._wireMusicCards(_rightCol);
}

// The overlay's anchor wraps the paging chevrons as well as the posters, so
// inset:0 spilled it over the arrows on both sides. Measured rather than
// hardcoded — the chevrons have no fixed width and the grid's own columns
// follow the card's settings.
_alignReqOverlay() {
  this.shadowRoot?.querySelectorAll('.tv-req-anchor > .req-overlay').forEach(ov => {
    const anchor = ov.parentElement;
    const grid = anchor?.querySelector('.mgrid');
    if (!grid || !grid.offsetWidth || !anchor.offsetWidth) return;
    // offsetLeft, not getBoundingClientRect: several rows animate their grid in
    // with a transform, and a rect measured mid-animation put the overlay a
    // whole poster off. Offsets ignore transforms, so they hold either way.
    let left = 0;
    for (let el = grid; el && el !== anchor; el = el.offsetParent) left += el.offsetLeft;
    ov.style.left  = `${Math.max(0, Math.round(left))}px`;
    ov.style.right = `${Math.max(0, Math.round(anchor.offsetWidth - left - grid.offsetWidth))}px`;
  });
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

  if (scroll._tvWired) return;   // a repeat call over the same overlay
  scroll._tvWired = true;
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
  grid.querySelector('.to-tv-abs-overlay')?.remove();
  container.querySelector('.to-tv-abs-overlay')?.remove();
  grid.style.position = 'relative';

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

  const topPx = card.offsetTop;
  const heightPx = card.offsetHeight;

  const el = document.createElement('div');
  el.className = 'to-tv-abs-overlay';
  el.style.cssText = `top:${topPx}px;height:${heightPx}px`;
  el.innerHTML = this._renderTvOverlayCompact(tvp);
  grid.appendChild(el);

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
    this._markActivated();
    const profileSel = el.querySelector('#tv-req-profile-abs');
    const tagSel     = el.querySelector('#tv-req-tag-abs');
    const rfSel      = el.querySelector('#tv-req-rootfolder-abs');
    const profileId  = profileSel ? profileSel.value : null;
    const tagId      = tagSel?.value || null;
    const rootFolder = rfSel?.value || null;
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
        body.rootFolder = rootFolder || this._seerrSonarr.rootFolder;
      }
      if (tagId) body.tags = [parseInt(tagId)];
      { const _acct = this._seerrAccountForUser(); if (_acct !== 'admin') body.userMode = _acct; }
      await this._hass.callApi('POST', 'arr_stack/overseerr/request', body);
    } catch (err) {
      console.error('[arr-card] overlay TV request error:', err);
      this._optimisticRequested.delete(show.id);
    }
    await this._fetchAll();
  });
}

}

export const wireRequestsMixin = _WireRequestsMethods.prototype;
