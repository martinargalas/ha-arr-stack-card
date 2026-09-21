// The main search: typing, the type switch, result cards and paging. Split out of wire/index.js.

class _WireSearchMethods {

// Scoped wiring for cards inside .search-results-wrap only — used by _reRenderSearchResults()
// so we don't re-wire (and double-bind) cards elsewhere in the right panel that weren't touched.
_sizeSearchOverlay(root) {
  const anchor = root?.querySelector('.tv-req-anchor')
    || this.shadowRoot?.querySelector('#col-right .tv-req-anchor');
  const ov = anchor?.querySelector(':scope > .req-overlay');
  const grid = anchor?.querySelector('.mgrid, .to-grid');
  if (!ov || !grid) return;
  const cards = [...grid.children];
  if (!cards.length) return;
  // Offsets, not client rects: something above this is scaled, so a rect
  // measured in screen pixels and written back as a CSS width came out about a
  // tenth too wide — and a tenth too tall. offsetLeft and friends are layout
  // pixels against the anchor, which is what a style has to be written in.
  // See More lays the same row out over several lines, so the overlay has to
  // find the card the plus was pressed on rather than assume the first one.
  const mb = String(this._musAddPending?.artist?.foreignArtistId || '').toLowerCase();
  // A series' overlay belongs to the row holding the card its plus was pressed
  // on. Falling through to the first card put it on the top row whichever
  // result was asked for — right where the results begin, not where the press
  // was.
  const tv = this._tvRequestPending?.source === 'search'
    ? String(this._tvRequestPending.show?.id ?? '') : '';
  const target = (mb && cards.find(c =>
    String(c.querySelector('[data-mus-add]')?.dataset.musAdd || '').toLowerCase() === mb
    || String(c.dataset.artistUnowned || '').toLowerCase() === mb))
    || (tv && cards.find(c => c.dataset.tmdbid === tv))
    || ((mb || tv) ? null : cards[0]);
  // Paged away from the card it was opened on: there is no row here that the
  // overlay belongs to, and covering the first one would park it on a title
  // the reader never pressed.
  if (!target) { ov.style.display = 'none'; return; }
  ov.style.display = '';
  const row = cards.filter(c => c.offsetTop === target.offsetTop);
  const first = row[0];
  const last = row[row.length - 1];
  ov.style.left   = `${first.offsetLeft}px`;
  ov.style.right  = 'auto';
  ov.style.width  = `${last.offsetLeft + last.offsetWidth - first.offsetLeft}px`;
  ov.style.top    = `${first.offsetTop}px`;
  ov.style.bottom = 'auto';
  ov.style.height = `${first.offsetHeight}px`;
}

_wireSearchResultCards(root) {
  requestAnimationFrame(() => this._sizeSearchOverlay(root));
  root.querySelectorAll('.pg-btn[data-search-dir]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const per = Math.max(2, Math.min(10, parseInt(this._cfgGet('discover', 'itemsPerCategory', 4)) || 4)) * 2;
      const total = Math.max(1, Math.ceil((this._searchResults || []).length / per));
      const cur = this._searchPage || 0;
      const next = btn.dataset.searchDir === 'next' ? Math.min(cur + 1, total - 1) : Math.max(cur - 1, 0);
      if (next === cur) return;
      this._searchPage = next;
      this._reRenderSearchResults();
    });
  });
  this._wireMusAddSelects(root);
  // Find similar on a result: Similar titles opens on it, and its back button
  // closes it again onto these results. Kept from the card under it.
  root.querySelectorAll('.sim-seed').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const d = btn.dataset;
      const music = d.simKind === 'music';
      this._simReturnState = null;
      this._openSimModal({
        kind: d.simKind, id: music ? d.simMbid : Number(d.simId), mbid: d.simMbid || null,
        title: d.simTitle || '', year: d.simYear || null,
      }, null, { fromSearch: true });
    });
  });
  root.querySelectorAll('.mc[data-popup]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('.sim-seed, .overseerr-add, .btn-add, .req-open, .req-cancel, .req-confirm, .req-overlay, .tv-req-open, .tv-req-cancel, .tv-req-confirm, .tv-req-overlay, .req-withdraw, .pr-approve, .pr-decline')) return;
      const type     = card.dataset.popup;
      const tmdbId    = card.dataset.tmdbid;
      const tvdbId    = card.dataset.tvdbid;
      const title     = card.dataset.title || '';
      const radarrId  = card.dataset.radarrid  ? parseInt(card.dataset.radarrid,  10) : null;
      const radarr2Id = card.dataset.radarr2id ? parseInt(card.dataset.radarr2id, 10) : null;
      this._openPopup(type, tmdbId, tvdbId, title, radarrId, radarr2Id);
    });
  });

  // The column's wiring walks these same buttons with the same flags, so the
  // one that arrives second skips them: two listeners would send two requests.
  root.querySelectorAll('.req-open').forEach(btn => {
    if (btn._ow2) return;
    btn._ow2 = true;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const movieId = parseInt(btn.dataset.movieid, 10);
      const tmdbId  = parseInt(btn.dataset.tmdb, 10);
      if (!movieId) return;
      btn.disabled = true;
      btn.textContent = '…';
      const oneClick = (this._cfgGet('discover', 'oneClickRequest', false)
                    || this._cfgGet('discover', 'oneClickMovieRequest', false))
                    && !(this._cfgGet('discover', 'oneClickNonAdminOnly', false) && this._hass.user.is_admin);
      if (oneClick) {
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

  root.querySelectorAll('.tv-req-open').forEach(btn => {
    if (btn._owTv) return;
    btn._owTv = true;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const showId = parseInt(btn.dataset.showid, 10);
      if (!showId) return;
      const tvSource = btn.dataset.source || 'tvUpcoming';
      const show = (this._searchResults || []).find(m => m.id === showId && m.mediaType === 'tv');
      if (!show) return;
      btn.disabled = true;
      btn.textContent = '…';
      const oneClick = (this._cfgGet('discover', 'oneClickRequest', false)
                    || this._cfgGet('discover', 'oneClickMovieRequest', false))
                    && !(this._cfgGet('discover', 'oneClickNonAdminOnly', false) && this._hass.user.is_admin);
      if (oneClick) {
        await this._oneClickTvRequest(show);
        btn.disabled = false;
        return;
      }
      await this._openTvRequestOverlay(show, tvSource);
    });
  });

  root.querySelectorAll('.req-withdraw').forEach(btn => {
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
}

// A choice made in the phone's pop-out filter is shown before it is acted on:
// the peanut marks the chosen half, folds away, and only then does the row
// underneath change. Acting first would rebuild the header mid-animation, so
// the reader would never see which one they hit.
_applyTypeSeg(el, spec) {
  const cur = this[spec.cur] || 'all';
  const wrap = el.closest('.hdr-filter');
  const open = !!wrap?.classList.contains('is-open');
  const commit = (animate) => {
    this[spec.prev] = cur;
    this[spec.anim] = animate;
    this[spec.cur] = spec.v;
    try { localStorage.setItem(spec.ls, spec.v); } catch (_) {}
    this._pages[spec.sec] = 0;
    // See More pages on its own counter; left alone, a narrower list could
    // leave it on a page that no longer exists.
    if (this._overlay?.section === spec.sec) this._overlay.page = 0;
    this._hdrFilterOpen = null;
    this._reRenderSection(spec.sec);
  };
  if (spec.v === cur) {
    // Same choice: nothing to apply, but the pop-out has served its purpose.
    if (open) { wrap.classList.remove('is-open'); this._hdrFilterOpen = null; }
    return;
  }
  if (!open) { commit(true); return; }

  const seg = el.closest('.mt-seg');
  const half = el.closest('.mt-seg-half');
  const idx = seg && half ? [...seg.querySelectorAll('.mt-seg-half')].indexOf(half) : -1;
  if (idx >= 0) seg.dataset.seg = String(idx);   // the fill slides onto it
  setTimeout(() => {
    wrap.classList.remove('is-open');            // then the peanut folds away
    setTimeout(() => commit(false), 300);        // and last the row follows
  }, 340);
}

_wireSearch() {
  const root = this.shadowRoot;
  const _srWrap = root.querySelector('.search-results-wrap');
  const _right = this.shadowRoot?.getElementById('col-right');
  if (_srWrap || _right) {
    requestAnimationFrame(() => this._sizeSearchOverlay(_srWrap || _right));
    this._wireMusAddSelects(_right || _srWrap);
  }
  this._syncSegVars(root);
  root.querySelectorAll('.search-type-seg .mt-seg[data-seg-to]').forEach(seg => {
    if (seg.dataset.seg === seg.dataset.segTo) return;
    requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
  });
  this._searchSegAnim = false;
  this._rqSegAnim = false;
  this._raSegAnim = false;
  this._calCatSegAnim = false;
  this._recSegAnim = false;
  const input = root.querySelector('.search-bar-input');
  if (!input) return;
  if (this._searchAbort) this._searchAbort.abort();
  this._searchAbort = new AbortController();
  const sig = this._searchAbort.signal;
  const headingColor    = this._cfgGet('styles', 'headingTextColor', '#fff') || '#fff';
  const iconDefaultColor = this._cfgGet('styles', 'searchBarIconColor', '') || '';
  const _setSearchColors = (on) => {
    const wrap = input.closest('.search-bar-wrap');
    if (!wrap) return;
    const icon  = wrap.querySelector('ha-icon');
    const clear = wrap.querySelector('.search-bar-clear');
    if (icon)  icon.style.color  = on ? headingColor : iconDefaultColor;
    if (clear) clear.style.color = on ? headingColor : '';
    input.style.color = on ? headingColor : '';
  };
  input.addEventListener('focus', () => _setSearchColors(true), { signal: sig });
  input.addEventListener('blur', () => {
    if (!this._searchQuery?.trim()) _setSearchColors(false);
  }, { signal: sig });
  input.addEventListener('input', () => {
    const q = input.value.trim();
    this._searchQuery = input.value;
    this._searchPage  = 0;
    clearTimeout(this._searchTimer);
    _setSearchColors(!!q || document.activeElement === input);
    if (!q) {
      this._searchActive  = false;
      this._searchResults = [];
      this._searchMaxH    = null;
      this._reRenderRight(true);
      return;
    }
    this._searchActive = true;
    // The column becomes the search at the first letter, not when the results
    // arrive — until then the categories stayed on the page under the search
    // bar. The redraw carries focus and caret over (see _reRenderRight).
    if (!this._searchOnlyLayout) {
      this._searchLoading = true;
      this._reRenderSearchResults();
    }
    // Asked as soon as typing pauses, as Similar titles' search is
    this._searchTimer = setTimeout(() => this._fetchSearch(q), 350);
  }, { signal: sig });
  root.addEventListener('mousedown', (e) => {
    if (e.target.closest('.search-type-seg')) e.preventDefault();
  }, { signal: sig });
  root.addEventListener('click', (e) => {
    // The funnel opens its peanut in place. Toggled on the element rather than
    // through a re-render: a freshly built peanut would jump to its full width
    // instead of growing into it.
    const funnel = e.target.closest('[data-hdr-filter-btn]');
    if (funnel) {
      e.stopPropagation();
      const wrap = funnel.closest('.hdr-filter');
      root.querySelectorAll('.hdr-filter.is-open').forEach(w => { if (w !== wrap) w.classList.remove('is-open'); });
      const open = wrap?.classList.toggle('is-open');
      // Remembered as well as toggled: the card rebuilds this column every few
      // seconds on its own, and a class set only on the element would be lost
      // with it — the peanut folded itself away under the reader's hand.
      this._hdrFilterOpen = open ? (wrap?.dataset.hdrFilter || null) : null;
      return;
    }
    const typeBtn = e.target.closest('[data-rec-type],[data-ra-type],[data-rq-type],[data-calcat-type]');
    if (!typeBtn && !e.target.closest('.hdr-filter')) {
      root.querySelectorAll('.hdr-filter.is-open').forEach(w => w.classList.remove('is-open'));
      this._hdrFilterOpen = null;
    }
    if (typeBtn) {
      const d = typeBtn.dataset;
      const spec = d.recType    ? { v: d.recType,     cur: '_recType',    prev: '_recSegPrev',    anim: '_recSegAnim',    ls: 'arr-rec-type', sec: 'recommendations' }
                 : d.raType     ? { v: d.raType,      cur: '_raType',     prev: '_raSegPrev',     anim: '_raSegAnim',     ls: 'arr-ra-type',  sec: 'recentlyAdded' }
                 : d.rqType     ? { v: d.rqType,      cur: '_rqType',     prev: '_rqSegPrev',     anim: '_rqSegAnim',     ls: 'arr-rq-type',  sec: 'recentlyRequested' }
                 :                { v: d.calcatType,  cur: '_calCatType', prev: '_calCatSegPrev', anim: '_calCatSegAnim', ls: 'arr-cal-type', sec: 'calendar' };
      this._applyTypeSeg(typeBtn, spec);
      return;
    }
    const seg = e.target.closest('[data-search-type]');
    if (seg) {
      const next = seg.dataset.searchType;
      if (next !== this._searchType) {
        this._searchSegPrev = this._searchType;
        this._searchSegAnim = true;
        try { localStorage.setItem('arr-search-type', next); } catch (_) {}
        this._searchPage = 0;
        const segEl = seg.closest('.mt-seg');
        if (segEl) {
          const idx = [...segEl.querySelectorAll('.mt-seg-half')].indexOf(seg);
          if (idx >= 0) {
            segEl.dataset.segTo = String(idx);
            requestAnimationFrame(() => { segEl.dataset.seg = String(idx); });
          }
        }
        this._searchSegAnim = false;
        // Narrowing changes what the answer is, so what is typed is asked again
        // rather than waiting for the next keystroke.
        const q = (this._searchQuery || '').trim();
        clearTimeout(this._searchTimer);
        if (q) this._fetchSearch(q);
        else this._reRenderSearchResults();
      }
      return;
    }
    if (e.target.closest('.search-bar-clear')) {
      clearTimeout(this._searchTimer);
      // Cleared, not left: the caret stays for the next search
      this._searchKeepFocus = true;
      this._searchQuery   = '';
      this._searchActive  = false;
      this._searchPage    = 0;
      this._searchResults = [];
      this._searchMaxH    = null;
      this._reRenderRight(true);
    }
  }, { signal: sig });
}

}

export const wireSearchMixin = _WireSearchMethods.prototype;
