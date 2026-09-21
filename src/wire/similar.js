import { POPUP_TYPE } from '../constants.js';

// Similar titles: opening the modal, the search that picks a title, the type,
// sort and hide-owned filters, paging, the column slider, and the way back
// from a title's detail.

const SIM_TYPES = ['all', 'movies', 'tv', 'music'];
const SIM_SORTS = ['rel', 'rating', 'year', 'title'];
const SIM_TOOLBAR_H = 110;

class _WireSimilarMethods {

  // Opens on a title when one is given (a detail's Similar titles), otherwise
  // on an empty search. `restore` is the state left when a result was opened.
  // `fromSearch`: opened from a search result, so back closes it onto them.
  _openSimModal(seed = null, restore = null, { fromSearch = false } = {}) {
    this._markActivated();
    let s = restore;
    if (!s) {
      const pref = (key, ok, dflt) => {
        try { const v = localStorage.getItem(key); return ok.includes(v) ? v : dflt; } catch (_) { return dflt; }
      };
      // Year and country are remembered as the type, sort and hide-owned are;
      // a stored value that no longer fits is dropped rather than drawn
      const cy = new Date().getFullYear();
      const year = key => {
        try { const v = parseInt(localStorage.getItem(key)); return v >= 1900 && v <= cy ? v : null; } catch (_) { return null; }
      };
      // Several countries are remembered now; a single one stored by an
      // older build is still read, so the filter survives the upgrade.
      let countries = [];
      try {
        const raw = localStorage.getItem('arr-sim-countries');
        const list = raw ? JSON.parse(raw) : [localStorage.getItem('arr-sim-country') || ''];
        if (Array.isArray(list)) countries = list.filter(c => /^[A-Z]{2}$/.test(c)).slice(0, 8);
      } catch (_) {}
      // Genres left out are remembered too — "never animation" holds for any
      // title. Genres included are not: Action and War together fit one title
      // and would empty the next.
      let genresEx = [];
      try {
        const g = JSON.parse(localStorage.getItem('arr-sim-genres-ex') || '[]');
        if (Array.isArray(g)) genresEx = g.map(String).filter(x => /^\d+$/.test(x)).slice(0, 20);
      } catch (_) {}
      let countriesEx = [];
      try {
        const ex = JSON.parse(localStorage.getItem('arr-sim-countries-ex') || '[]');
        if (Array.isArray(ex)) countriesEx = ex.filter(c => /^[A-Z]{2}$/.test(c) && !countries.includes(c)).slice(0, 8);
      } catch (_) {}
      s = {
        seed: null, query: '', mode: 'results', cands: null, items: null, page: 0, genres: [],
        since: year('arr-sim-since'), until: year('arr-sim-until'), countries, countriesEx, genresEx, castEx: [],
        type: pref('arr-sim-type', SIM_TYPES, 'all'),
        sort: pref('arr-sim-sort', SIM_SORTS, 'rel'),
        hideOwned: pref('arr-sim-hide', ['1', '0'], '0') === '1',
      };
      try { const c = parseInt(localStorage.getItem('arr-sim-cols')); if (c >= 3 && c <= 12) s._mtCols = c; } catch (_) {}
    }
    // Measured again for this window; the modal may open at another size
    s._gridW = null;
    s._gridAvailH = null;
    s._segAnim = false;
    if (!restore) s._fromSearch = fromSearch;
    this._simModal = s;

    this.shadowRoot.querySelector('[data-sim-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._simModalHtml();
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireSimModal(el);
    this._simAfterRender(el);
    if (seed) this._simSetSeed(seed, el);
  }

  // Back to what the last pick left: the search and its titles, or the title
  // before. A fresh object, so an answer still on its way for the one left
  // behind is dropped when it lands.
  _simBack(el) {
    const s = this._simModal;
    const prev = s?._hist?.length ? s._hist[s._hist.length - 1] : null;
    // Nothing further back than the search results it was opened from
    if (!prev) { if (s?._fromSearch) this._closeSimModal(); return; }
    clearTimeout(this._simTypeT);
    clearTimeout(this._simCastT);
    this._simModal = { ...prev, _hist: s._hist.slice(0, -1), _mtCols: s._mtCols, _gridW: s._gridW, _gridAvailH: s._gridAvailH };
    const tb = el.querySelector('#sim-tb');
    if (tb) tb.innerHTML = this._simToolbarHtml();
    this._simRender(el);
  }

  _closeSimModal() {
    clearTimeout(this._simTypeT);
    this.shadowRoot.querySelector('[data-sim-modal]')?.remove();
    this._simModal = null;
  }

  // From a film's or series' detail: its Similar titles entry
  _qaOpenSimilar(d) {
    const tv = d?._type === POPUP_TYPE.SONARR || d?._type === POPUP_TYPE.TV;
    const id = d?.id || d?._sonarrSeries?.tmdbId || d?._sonarr2Series?.tmdbId;
    if (!id) return;
    this._popup = null;
    this._ppMenu = null;
    this._renderPopupEl();
    const year = String(d.year || d.releaseDate || d.firstAirDate || d.inCinemas || '').slice(0, 4);
    this._simOpenFor({ kind: tv ? 'tv' : 'movie', id, title: d.title || d.name || '', year: /^\d{4}$/.test(year) ? year : null });
  }

  // Similar titles for one title or artist, from its detail or its window.
  // Opened from Similar titles in the first place, it goes back into that
  // modal, as it was, and takes the new one from there — so its back button
  // steps back to where it was before.
  _simOpenFor(seed) {
    const saved = this._simReturnState;
    this._simReturnState = null;
    if (!saved) { this._openSimModal(seed); return; }
    this._openSimModal(null, saved);
    const el = this.shadowRoot?.querySelector('[data-sim-modal]');
    if (el) this._simSetSeed(seed, el);
  }

  // Header and grid; the toolbar is left alone (see _simToolbarHtml)
  _simRender(el) {
    el = el || this.shadowRoot.querySelector('[data-sim-modal]');
    const s = this._simModal;
    if (!el || !s) return;
    const hdr = el.querySelector('#sim-hdr');
    if (hdr) hdr.innerHTML = this._simHdrHtml();
    // The peanut is drawn where it was, then slides to the new choice
    const seg = hdr?.querySelector('.mt-seg[data-seg-to]');
    if (seg && seg.dataset.seg !== seg.dataset.segTo) requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
    s._segAnim = false;
    const f = el.querySelector('#sim-filters');
    if (f) f.style.display = (s.mode === 'pick' || !s.seed) ? 'none' : (f.dataset.shown || 'flex');
    const inp = el.querySelector('#sim-search');
    if (inp) inp.placeholder = this._simPlaceholder();
    const c = el.querySelector('#sim-content');
    if (c) c.innerHTML = this._simContentHtml();
    this._simAfterRender(el);
  }

  // A panel right under its trigger, its left edge on the trigger's. Fixed, so
  // the toolbar and the body cannot clip it — but the modal's glass (its
  // backdrop-filter) is what a fixed box is placed against, not the window, so
  // where 0,0 actually lands is measured and taken off. Kept inside the glass.
  _simPlacePop(btn, pop) {
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    Object.assign(pop.style, { position: 'fixed', top: '0px', left: '0px', right: 'auto' });
    const o = pop.getBoundingClientRect();
    const edge = btn.closest('.popup-glass')?.getBoundingClientRect().right ?? window.innerWidth;
    const left = Math.max(8, Math.min(r.left, edge - o.width - 8));
    pop.style.left = `${Math.round(left - o.left)}px`;
    pop.style.top = `${Math.round(r.bottom + 6 - o.top)}px`;
  }

  // One panel open at a time
  _simClosePops(el) {
    const s = this._simModal;
    if (s._yearOpen) { s._yearOpen = false; this._simRefreshYear(el); }
    if (s._castOpen) { s._castOpen = false; this._simRefreshCast(el); }
    if (s._genreOpen) { s._genreOpen = false; this._simRefreshGenre(el); }
    if (s._countryOpen) { s._countryOpen = false; this._simRefreshCountry(el); }
  }

  _simRefreshCountry(el) {
    const w = el.querySelector('#sim-country-wrap');
    if (!w) return;
    w.innerHTML = this._simCountryHtml();
    const pop = w.querySelector('#sim-country-pop');
    if (pop) this._simPlacePop(w.querySelector('#sim-country-btn'), pop);
    this._simSlideSeg(w, '_countryViewPrev');
  }

  // The Include | Exclude peanut is drawn where it was, then slides — once
  _simSlideSeg(w, prevKey) {
    if (this._simModal) this._simModal[prevKey] = null;
    const seg = w.querySelector('.mt-seg[data-seg-to]');
    if (seg && seg.dataset.seg !== seg.dataset.segTo) requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
  }

  // A pick goes to the list its panel's view shows, and leaves the other one
  _simTogglePick(s, incKey, exKey, view, item) {
    const [to, from] = view === 'ex' ? [exKey, incKey] : [incKey, exKey];
    const set = new Set(s[to] || []);
    if (set.has(item)) set.delete(item); else set.add(item);
    s[to] = [...set];
    s[from] = (s[from] || []).filter(x => x !== item);
  }

  _simRefreshGenre(el) {
    const w = el.querySelector('#sim-genre-wrap');
    if (!w) return;
    w.innerHTML = this._simGenreHtml();
    const pop = w.querySelector('#sim-genre-pop');
    if (pop) this._simPlacePop(w.querySelector('#sim-genre-btn'), pop);
    this._simSlideSeg(w, '_genreViewPrev');
  }

  _simRefreshCast(el) {
    const w = el.querySelector('#sim-cast-wrap');
    if (!w) return;
    w.innerHTML = this._simCastHtml();
    const pop = w.querySelector('#sim-cast-pop');
    if (pop) this._simPlacePop(w.querySelector('#sim-cast-btn'), pop);
    this._simSlideSeg(w, '_castViewPrev');
  }

  // The tags come from the artist asked about, or for a film or series from
  // the first artist of its music; loaded once per title
  async _simLoadMusicTags(el) {
    const s = this._simModal;
    if (!s?.seed || s.mTags) return;
    const seed = s.seed;
    const first = (s.items || []).find(it => it.mediaType === 'music');
    const ref = seed.kind === 'music' ? { mbid: seed.mbid, name: seed.title } : first ? { mbid: first.mbid, name: first.title } : null;
    s.mTags = [];
    if (!ref || this._lastfmConfigured === false) return;
    const tags = await this._simFetchTags(ref);
    if (this._simModal !== s || s.seed !== seed) return;
    s.mTags = tags;
    if (s.type === 'music' || seed.kind === 'music') this._simRender(el);
  }

  async _simLoadTagArtists(el) {
    const s = this._simModal;
    if (!s) return;
    const tags = s.mUsed || [];
    s.page = 0;
    if (!tags.length) { s.mTagItems = null; this._simRender(el); return; }
    s.mLoading = true;
    this._simRender(el);
    const tok = s._tagTok = (s._tagTok || 0) + 1;
    const items = await this._simFetchTagArtists(tags);
    if (this._simModal !== s || tok !== s._tagTok) return;
    s.mTagItems = items;
    s.mLoading = false;
    this._simRender(el);
  }

  _simRefreshYear(el) {
    const w = el.querySelector('#sim-year-wrap');
    if (!w) return;
    w.innerHTML = this._simYearHtml();
    // Out of the toolbar's box, which would clip it
    const pop = w.querySelector('#sim-year-pop');
    if (pop) this._simPlacePop(w.querySelector('#sim-year-btn'), pop);
  }

  // The keyword matches are asked for within the years, so more of them are
  // left than a filter over the ones already here would leave
  _simYearChanged(el) {
    const s = this._simModal;
    try {
      localStorage.setItem('arr-sim-since', s.since ? String(s.since) : '');
      localStorage.setItem('arr-sim-until', s.until ? String(s.until) : '');
    } catch (_) {}
    this._simRefreshYear(el);
    if (s.seed && s.seed.kind !== 'music') this._simLoadResults(el, s.used);
    else this._simRender(el);
  }

  _simAfterRender(el) {
    this._simWireDragHandle(el);
    this._simSealReq(el);
    // The season pager is the one part of the series overlay that is the same
    // work here as in the rows, and it is found by id inside this shadow root
    if (this._tvRequestPending?.source === 'sim') this._wireTvOverlay();
    el.querySelectorAll('.req-tabs').forEach(nav =>
      requestAnimationFrame(() => this._syncNavInd(nav, nav.querySelector('.req-tab--active'))));
    requestAnimationFrame(() => this._simMeasureGrid(el));
  }

  // The first paint only estimates the room the grid has. Once it is on screen
  // its real box decides the rows and columns — the same as Maintainerr's grid.
  _simMeasureGrid(el) {
    const s = this._simModal;
    const grid = el?.querySelector('#sim-grid');
    const body = el?.querySelector('#sim-body');
    if (!s || !grid || !body) return;
    const top = grid.getBoundingClientRect().top;
    const pag = el.querySelector('#sim-pag-wrap');
    const bottom = pag ? pag.getBoundingClientRect().top : body.getBoundingClientRect().bottom;
    const h = Math.round(bottom - top);
    // The grid can be capped narrower than the space it sits in; measuring the
    // grid itself would feed that back in and shrink the posters each pass.
    const w = grid.parentElement?.clientWidth || grid.clientWidth;
    if (h <= 0 || !w || (s._gridAvailH === h && s._gridW === w)) return;
    s._gridAvailH = h;
    s._gridW = w;
    const c = el.querySelector('#sim-content');
    if (c) c.innerHTML = this._simContentHtml();
    this._simWireDragHandle(el);
    this._simSealReq(el);
  }

  _wireSimModal(el) {
    el.addEventListener('click', e => { if (e.target === el) this._closeSimModal(); });
    const glass = el.querySelector('.popup-glass');
    if (!glass) return;

    glass.addEventListener('input', e => {
      if (e.target.id === 'sim-search') this._simOnInput(e.target.value, el);
    });
    glass.addEventListener('change', e => {
      const s = this._simModal;
      const id = e.target.id;
      // The add overlays' selects are the shared field-select shape: the label
      // on show is ours, so what was chosen is mirrored onto it. The artist
      // overlay keeps the choice, as it does in the rows outside.
      if (e.target.closest('.req-panel, .mus-add-overlay')) {
        this._tbSyncSelect(e.target);
        const p = this._musAddPending;
        if (p) {
          if (id === 'mus-add-profile') p.profileId  = e.target.value;
          if (id === 'mus-add-monitor') p.monitor    = e.target.value;
          if (id === 'mus-add-meta')    p.metadataId = e.target.value;
          if (id === 'mus-add-root')    p.rootFolder = e.target.value;
        }
        return;
      }
      if (!s || !['sim-sort', 'sim-year-from', 'sim-year-to'].includes(id)) return;
      s.page = 0;
      if (id === 'sim-year-from' || id === 'sim-year-to') {
        const cy = new Date().getFullYear();
        const v = parseInt(e.target.value);
        s[id === 'sim-year-from' ? 'since' : 'until'] = v >= 1900 && v <= cy ? v : null;
        if (s.since && s.until && s.since > s.until) [s.since, s.until] = [s.until, s.since];
        this._simYearChanged(el);
        return;
      }
      this._tbSyncSelect(e.target);
      if (id === 'sim-sort') {
        s.sort = SIM_SORTS.includes(e.target.value) ? e.target.value : 'rel';
        try { localStorage.setItem('arr-sim-sort', s.sort); } catch (_) {}
      }
      this._simRender(el);
    });

    glass.addEventListener('click', e => {
      const s = this._simModal;
      if (!s) return;
      if (e.target.closest('[data-sim-close]')) { this._closeSimModal(); return; }
      if (e.target.closest('[data-sim-back]')) { this._simBack(el); return; }

      // The year panel: opened and closed on its trigger, a span picked from
      // it, closed by any click outside it
      if (e.target.closest('#sim-year-btn')) {
        const open = !s._yearOpen;
        this._simClosePops(el);
        s._yearOpen = open;
        this._simRefreshYear(el);
        return;
      }

      // Include | Exclude in a filter's panel: which list the next picks go to
      const fv = e.target.closest('[data-sim-fview]');
      if (fv) {
        const [f, v] = fv.dataset.simFview.split(':');
        if (!['genre', 'cast', 'country'].includes(f)) return;
        s[`_${f}ViewPrev`] = s[`_${f}View`] || 'in';
        s[`_${f}View`] = v === 'ex' ? 'ex' : 'in';
        if (f === 'genre') this._simRefreshGenre(el);
        else if (f === 'cast') this._simRefreshCast(el);
        else this._simRefreshCountry(el);
        return;
      }

      // Genres: any number picked, the grid narrowed at once
      if (e.target.closest('#sim-genre-btn')) {
        const open = !s._genreOpen;
        this._simClosePops(el);
        s._genreOpen = open;
        this._simRefreshGenre(el);
        return;
      }
      const gb = e.target.closest('[data-sim-genre]');
      if (gb || e.target.closest('[data-sim-genre-clear]')) {
        const view = s._genreView || 'in';
        if (gb) this._simTogglePick(s, 'genres', 'genresEx', view, gb.dataset.simGenre);
        else s[view === 'ex' ? 'genresEx' : 'genres'] = [];
        try { localStorage.setItem('arr-sim-genres-ex', JSON.stringify(s.genresEx || [])); } catch (_) {}
        s.page = 0;
        this._simRefreshGenre(el);
        this._simRender(el);
        return;
      }
      if (s._genreOpen && !e.target.closest('#sim-genre-wrap')) { s._genreOpen = false; this._simRefreshGenre(el); }

      // Countries: any number picked, and where a title comes from is checked
      // by the proxy, so the answer is asked for again rather than filtered here
      if (e.target.closest('#sim-country-btn')) {
        const open = !s._countryOpen;
        this._simClosePops(el);
        s._countryOpen = open;
        this._simRefreshCountry(el);
        return;
      }
      const cb = e.target.closest('[data-sim-country]');
      if (cb || e.target.closest('[data-sim-country-clear]')) {
        const view = s._countryView || 'in';
        if (cb) this._simTogglePick(s, 'countries', 'countriesEx', view, cb.dataset.simCountry);
        else s[view === 'ex' ? 'countriesEx' : 'countries'] = [];
        s.countries = (s.countries || []).slice(0, 8);
        s.countriesEx = (s.countriesEx || []).slice(0, 8);
        s.page = 0;
        try {
          localStorage.setItem('arr-sim-countries', JSON.stringify(s.countries));
          localStorage.setItem('arr-sim-countries-ex', JSON.stringify(s.countriesEx));
        } catch (_) {}
        this._simRefreshCountry(el);
        if (s.seed) this._simLoadResults(el, s.used); else this._simRender(el);
        return;
      }
      if (s._countryOpen && !e.target.closest('#sim-country-wrap')) { s._countryOpen = false; this._simRefreshCountry(el); }

      // The actor picker: kept open while actors are ticked; the titles are
      // asked for once the ticking pauses
      if (e.target.closest('#sim-cast-btn')) {
        const open = !s._castOpen;
        this._simClosePops(el);
        s._castOpen = open;
        this._simRefreshCast(el);
        return;
      }
      const actor = e.target.closest('[data-sim-actor]');
      if (actor || e.target.closest('[data-sim-actor-clear]')) {
        const view = s._castView || 'in';
        if (actor) this._simTogglePick(s, 'castSel', 'castEx', view, parseInt(actor.dataset.simActor));
        else s[view === 'ex' ? 'castEx' : 'castSel'] = [];
        // In the order the title credits them, both lists
        const order = (s.cast || []).map(c => c.id);
        s.castSel = order.filter(id => (s.castSel || []).includes(id));
        s.castEx = order.filter(id => (s.castEx || []).includes(id));
        s.page = 0;
        this._simRefreshCast(el);
        clearTimeout(this._simCastT);
        this._simCastT = setTimeout(() => this._simLoadResults(el, s.used), 450);
        return;
      }
      if (s._castOpen && !e.target.closest('#sim-cast-wrap')) { s._castOpen = false; this._simRefreshCast(el); }
      const yr = e.target.closest('[data-sim-year]');
      if (yr) {
        const [a, b] = yr.dataset.simYear.split(':');
        s.since = parseInt(a) || null;
        s.until = parseInt(b) || null;
        s._yearOpen = false;
        s.page = 0;
        this._simYearChanged(el);
        return;
      }
      if (s._yearOpen && !e.target.closest('#sim-year-wrap')) { s._yearOpen = false; this._simRefreshYear(el); }

      const seg = e.target.closest('[data-sim-type]');
      if (seg) {
        const v = seg.dataset.simType;
        if (v === s.type || !SIM_TYPES.includes(v)) return;
        s._segPrev = s.type;
        s._segAnim = true;
        s.type = v;
        try { localStorage.setItem('arr-sim-type', v); } catch (_) {}
        s.page = 0;
        this._simRender(el);
        return;
      }

      const hide = e.target.closest('[data-sim-hide-owned]');
      if (hide) {
        s.hideOwned = !s.hideOwned;
        hide.outerHTML = this._simHideHtml();
        try { localStorage.setItem('arr-sim-hide', s.hideOwned ? '1' : '0'); } catch (_) {}
        s.page = 0;
        this._simRender(el);
        return;
      }

      // A keyword switched off or back on: the match is asked again with the
      // ones left, the grid kept on screen until the answer is in
      const kw = e.target.closest('[data-sim-kw]');
      if (kw) {
        const id = parseInt(kw.dataset.simKw);
        const used = new Set(s.used || []);
        if (used.has(id)) used.delete(id); else used.add(id);
        s.used = (s.keywords || []).map(k => k.id).filter(k => used.has(k));
        this._simLoadResults(el, s.used);
        return;
      }

      // A music tag: its artists join the music, or leave it
      const mtag = e.target.closest('[data-sim-mtag]');
      if (mtag) {
        const t = mtag.dataset.simMtag;
        const used = new Set(s.mUsed || []);
        if (used.has(t)) used.delete(t); else used.add(t);
        s.mUsed = (s.mTags || []).filter(x => used.has(x));
        this._simLoadTagArtists(el);
        return;
      }

      const pg = e.target.closest('[data-sim-page]');
      if (pg) {
        const { perPage } = this._mtGridCalc(s, SIM_TOOLBAR_H, s);
        const total = Math.max(1, Math.ceil(this._simVisible().length / perPage));
        s.page = this._mtParsePageN(pg.dataset.simPage, s.page || 0, total);
        this._simRender(el);
        return;
      }

      // Find similar: that title becomes the one to start from
      const find = e.target.closest('[data-sim-find]');
      if (find) {
        e.stopPropagation();
        const it = this._simVisible()[parseInt(find.dataset.simFind)];
        if (it) this._simSetSeed(this._simSeedOf(it), el);
        return;
      }

      // The add overlays: a film's in its own card, a series' and an artist's
      // over the grid. Answered here because the right column's re-render,
      // which is what every other row relies on, does not reach this modal.
      if (this._simReqClick(e, el)) return;

      // Artists open the music windows, as the main search's do: the preview
      // for one not in Lidarr, the artist window for one that is. Closing
      // either comes back here.
      const unowned = e.target.closest('[data-artist-unowned]');
      if (unowned) {
        if (!unowned.dataset.artistUnowned) return;
        this._simReturnState = s;
        this._closeSimModal();
        this._openMusicPreview(unowned.dataset.artistUnowned);
        return;
      }
      const artist = e.target.closest('.mc-music[data-artist-id]');
      if (artist) {
        this._simReturnState = s;
        this._closeSimModal();
        this._openMusicModal(Number(artist.dataset.artistId));
        return;
      }

      // A film or series opens its detail; closing that comes back here
      const card = e.target.closest('.mc[data-popup]');
      if (card) {
        const d = card.dataset;
        this._simReturnState = s;
        this._closeSimModal();
        this._openPopup(d.popup, d.tmdbid || null, d.tvdbid || null, d.title || '',
          d.radarrid ? parseInt(d.radarrid, 10) : null, d.radarr2id ? parseInt(d.radarr2id, 10) : null);
      }
    });
  }

  // True when the click belonged to an add overlay, so the card under it is
  // left alone.
  _simReqClick(e, el) {
    const scrim = e.target.closest('.sim-req-scrim');
    if (scrim && e.target === scrim) { this._simReqCancel(el); return true; }

    const open = e.target.closest('.req-open');
    if (open) { e.stopPropagation(); this._simMovieReqOpen(open, el); return true; }
    const tvOpen = e.target.closest('.tv-req-open');
    if (tvOpen) { e.stopPropagation(); this._simTvReqOpen(tvOpen, el); return true; }
    const add = e.target.closest('[data-mus-add]');
    if (add) { e.stopPropagation(); this._musOpenAdd(add.dataset.musAdd, 'sim'); return true; }

    // Each of these carries the shared class as well, so the narrower one is
    // asked for first
    if (e.target.closest('.req-cancel, .mus-add-cancel')) { e.stopPropagation(); this._simReqCancel(el); return true; }
    if (e.target.closest('.mus-add-confirm')) { e.stopPropagation(); this._musConfirmAdd(); return true; }
    const tvOk = e.target.closest('.tv-req-confirm');
    if (tvOk) { e.stopPropagation(); this._simTvReqConfirm(tvOk, el); return true; }
    const ok = e.target.closest('.req-confirm');
    if (ok) { e.stopPropagation(); this._simMovieReqConfirm(ok, el); return true; }

    const tab = e.target.closest('.req-tab');
    if (tab) { e.stopPropagation(); this._simReqTab(tab); return true; }
    // Anything else inside an overlay — a select, the season switches — is the
    // overlay's own; it must not open the title under it
    return !!e.target.closest('.req-overlay');
  }

  _simReqCancel(el) {
    if (this._musAddPending?.source === 'sim') this._musAddPending = null;
    if (this._tvRequestPending?.source === 'sim') this._tvRequestPending = null;
    this._requestPending = null;
    this._simRender(el);
  }

  // The card's own setting: one press adds without asking anything
  _simOneClick() {
    return (this._cfgGet('discover', 'oneClickRequest', false)
         || this._cfgGet('discover', 'oneClickMovieRequest', false))
      && !(this._cfgGet('discover', 'oneClickNonAdminOnly', false) && this._hass.user.is_admin);
  }

  async _simMovieReqOpen(btn, el) {
    const movieId = parseInt(btn.dataset.movieid, 10);
    const tmdbId  = parseInt(btn.dataset.tmdb, 10);
    if (!movieId) return;
    btn.disabled = true;
    if (this._simOneClick()) {
      const profileName = this._cfgGet('discover', 'oneClickDefaultMovieProfile', '');
      let profileId = null;
      if (profileName) {
        await this._fetchRadarrProfiles();
        profileId = (this._radarrProfiles || []).find(p => p.name === profileName)?.id ?? null;
      }
      const tagName = this._cfgGet('discover', 'oneClickDefaultMovieTag', '') || '';
      const tagId = tagName ? ((this._radarrTags || []).find(t => t.label === tagName)?.id ?? null) : null;
      const rootFolder = this._cfgGet('discover', 'oneClickDefaultMovieRootFolder', '') || null;
      if (this._overseerrConfigured === false) await this._addDirectMovieRequest(tmdbId, profileId, tagId, rootFolder, 'radarr');
      else await this._addOverseerrRequest(tmdbId, profileId, tagId, rootFolder);
      this._simRender(el);
      return;
    }
    await Promise.all([this._fetchRadarrProfiles(), this._fetchRadarrTags(), this._fetchRadarrRootFolders()]);
    this._requestPending = { movieId, tmdbId, reqKey: btn.dataset.reqkey || String(tmdbId) };
    this._simRender(el);
  }

  async _simMovieReqConfirm(btn, el) {
    const movieId = parseInt(btn.dataset.movieid, 10);
    const tmdbId  = parseInt(btn.dataset.tmdb, 10);
    const ov   = btn.closest('.req-overlay');
    const use2 = (ov?.querySelector('.req-tab--active')?.dataset.tab ?? 'r1') === 'r2';
    const sfx  = use2 ? '2' : '';
    const val  = id => ov?.querySelector(`#${id}`)?.value ?? null;
    const profileId  = val(`req-select${sfx}-${movieId}`);
    const tagId      = val(`req-tag${sfx}-${movieId}`) || null;
    const rootFolder = val(`req-rootfolder${sfx}-${movieId}`) || null;
    btn.disabled = true;
    btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
    if (this._overseerrConfigured === false) await this._addDirectMovieRequest(tmdbId, profileId, tagId, rootFolder, use2 ? 'radarr2' : 'radarr');
    else await this._addOverseerrRequest(tmdbId, profileId, tagId, rootFolder, use2);
    this._simRender(el);
  }

  async _simTvReqOpen(btn, el) {
    const id = parseInt(btn.dataset.showid, 10);
    const it = this._simVisible().find(x => x.id === id && x.mediaType === 'tv');
    if (!it) return;
    btn.disabled = true;
    const show = { ...it, name: it.name || it.title };
    if (this._simOneClick()) { await this._oneClickTvRequest(show); this._simRender(el); return; }
    await this._openTvRequestOverlay(show, 'sim');
  }

  async _simTvReqConfirm(btn, el) {
    const p = this._tvRequestPending;
    if (!p || p.source !== 'sim') return;
    const ov = btn.closest('.req-overlay');
    const seasons = [...ov.querySelectorAll('.sv-input:checked')]
      .map(i => parseInt(i.dataset.season, 10)).filter(Boolean);
    if (!seasons.length) return;
    const use2 = (ov.querySelector('.req-panel:not(.req-panel--hidden)')?.dataset.panel || 's1') === 's2';
    const val = id => ov.querySelector(`#${id}`)?.value ?? null;
    const profileId  = val(use2 ? 'tv-req-profile2' : 'tv-req-profile');
    const tagId      = val(use2 ? 'tv-req-tag2' : 'tv-req-tag') || null;
    const rootFolder = val(use2 ? 'tv-req-rootfolder2' : 'tv-req-rootfolder') || null;
    btn.disabled = true;
    btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
    const mediaId = parseInt(btn.dataset.mediaid, 10);
    if (this._overseerrConfigured === false) await this._addDirectTvRequest(p.show, seasons, profileId, tagId, rootFolder, use2 ? 'sonarr2' : 'sonarr');
    else await this._addOverseerrTvRequest(mediaId, seasons, profileId, tagId, rootFolder, use2);
    this._simRender(el);
  }

  // The instance tabs, with the sliding fill the modal navs carry. The series'
  // panels are laid out inline, so the class alone would not hide one.
  _simReqTab(tab) {
    const ov = tab.closest('.req-overlay');
    const nav = tab.closest('.req-tabs');
    if (!ov || !nav) return;
    const from = this._navIndRect(nav);
    const want = tab.dataset.tab;
    ov.querySelectorAll('.req-tab').forEach(t => t.classList.toggle('req-tab--active', t.dataset.tab === want));
    this._syncNavInd(nav, tab, from);
    ov.querySelectorAll('.req-panel').forEach(p => {
      const on = p.dataset.panel === want;
      p.classList.toggle('req-panel--hidden', !on);
      if (p.style.display) p.style.display = on ? 'flex' : 'none';
    });
  }

  // The right column's wiring walks the whole shadow root, this modal included,
  // and would bind its handlers on top of these — a second listener on confirm
  // is a second request. Its flags are set here first, so it skips what the
  // modal answers itself.
  _simSealReq(el) {
    const mark = (sel, ...flags) => el.querySelectorAll(sel).forEach(n => flags.forEach(f => { n[f] = true; }));
    mark('.req-open', '_ow2');
    mark('.tv-req-open', '_owTv');
    mark('.req-cancel', '_ow3', '_ow8');
    mark('.req-panel select, .mus-add-overlay select', '_ow4', '_qSync', '_musWired');
    mark('.req-tabs', '_ow5');
    mark('.req-tab', '_ow6');
    mark('.req-confirm', '_ow7', '_ow9');
  }

  _simOnInput(value, el) {
    const s = this._simModal;
    if (!s) return;
    s.query = value;
    clearTimeout(this._simTypeT);
    if (!value.trim()) {
      // Back to the titles found for the one picked last, where they were left
      if (s.mode === 'pick') { s.mode = 'results'; s.page = s.resultsPage || 0; }
      s.cands = null;
      this._simRender(el);
      return;
    }
    this._simTypeT = setTimeout(() => this._simSearch(el), 350);
  }

  async _simSearch(el) {
    const s = this._simModal;
    const q = (s?.query || '').trim();
    if (!q) return;
    if (s.mode !== 'pick') s.resultsPage = s.page || 0;
    s.mode = 'pick';
    s.candLoading = true;
    s.page = 0;
    this._simRender(el);
    const tok = s._candTok = (s._candTok || 0) + 1;
    const cands = await this._simFetchSeeds(q);
    if (this._simModal !== s || tok !== s._candTok) return;   // closed, or typed on
    s.cands = cands;
    s.candLoading = false;
    this._simRender(el);
  }

  _simSeedOf(it) {
    if (it.mediaType === 'music') {
      const mbid = it.artist?.foreignArtistId || it.mbid || null;
      return { kind: 'music', id: mbid || it.title, mbid, title: it.title };
    }
    // The year narrows the soundtrack search, where a title alone is often
    // another film's
    const year = String(it.releaseDate || it.firstAirDate || '').slice(0, 4);
    return { kind: it.mediaType, id: it.id, title: it.title || it.name || '', year: /^\d{4}$/.test(year) ? year : null };
  }

  async _simSetSeed(seed, el) {
    const s = this._simModal;
    if (!s || !seed?.id) return;
    clearTimeout(this._simTypeT);
    // Where this came from — a search and what it found, or the last title's
    // results — so the header's back button can return there
    if (s.seed || (s.mode === 'pick' && s.cands)) {
      const { _hist, _gridW, _gridAvailH, _mtCols, ...snap } = s;
      s._hist = [...(_hist || []), { ...snap, _castOpen: false, _genreOpen: false, _yearOpen: false }].slice(-10);
    }
    Object.assign(s, {
      seed, mode: 'results', items: null, keywords: null, used: null, page: 0, cands: null, query: '', genres: [], _genreOpen: false,
      cast: null, castSel: [], castEx: [], castItems: null, _castOpen: false, mTags: null, mUsed: [], mTagItems: null,
    });
    // A film or series finds films, series and its soundtrack; an artist finds
    // only artists, so a film or series type would hide all of it
    if (seed.kind === 'music' && (s.type === 'movies' || s.type === 'tv')) { s._segPrev = s.type; s._segAnim = true; s.type = 'all'; }
    const inp = el.querySelector('#sim-search');
    if (inp) { inp.value = ''; inp.blur(); }
    await this._simLoadResults(el, null);
  }

  // `kw` null lets the proxy choose the keywords; the answer says which it used
  async _simLoadResults(el, kw) {
    const s = this._simModal;
    if (!s?.seed) return;
    const seed = s.seed;
    s.loading = true;
    this._simRender(el);
    const tok = s._resTok = (s._resTok || 0) + 1;
    const res = await this._simFetch(seed, kw, { since: s.since, until: s.until, country: s.countries || [], cast: s.castSel, xcountry: s.countriesEx || [], xcast: s.castEx || [] })
      .catch(() => ({ items: [], keywords: [], used: [], genreNames: {}, cast: [], castItems: [] }));
    if (this._simModal !== s || s.seed !== seed || tok !== s._resTok) return;   // closed, re-picked, or clicked on
    s.items = res.items;
    if (res.keywords.length || !s.keywords) s.keywords = res.keywords;
    s.used = res.used;
    s.genreNames = res.genreNames || {};
    s.castItems = res.castItems || [];
    if (res.cast?.length || !s.cast) s.cast = res.cast || [];
    s.loading = false;
    s.page = 0;
    if (!s._genreOpen) this._simRefreshGenre(el);
    if (!s._yearOpen) this._simRefreshYear(el);   // hidden for an artist
    if (!s._castOpen) this._simRefreshCast(el);
    if (!s._countryOpen) this._simRefreshCountry(el);
    this._simLoadMusicTags(el);
    this._simRender(el);
  }

  // The column slider Maintainerr's grids have. The grid is re-laid while it is
  // held, keeping the first title of the page on it; the count is remembered.
  _simWireDragHandle(el) {
    const handle = el.querySelector('#mt-drag-handle');
    const track = el.querySelector('#mt-drag-track');
    const thumb = el.querySelector('#mt-drag-thumb');
    const s = this._simModal;
    if (!handle || !track || !s) return;
    const MIN = 3, MAX = 12, INSET = 7;
    let startX = 0, startCols = 0, live = null;
    const px = (c, tW) => Math.round((c - MIN) / (MAX - MIN) * (tW - INSET * 2)) + INSET;
    const colsAt = dx => {
      const tW = track.getBoundingClientRect().width || 120;
      const f = Math.max(0, Math.min(1, (px(startCols, tW) - INSET + dx) / (tW - INSET * 2)));
      return MIN + Math.round(f * (MAX - MIN));
    };
    const relay = cols => {
      const tW = track.getBoundingClientRect().width || 120;
      const p = px(cols, tW);
      if (thumb) thumb.style.left = p + 'px';
      if (track.firstElementChild) track.firstElementChild.style.width = p + 'px';
      if (cols === live) return;
      live = cols;
      const first = (s.page || 0) * this._mtGridCalc(s, SIM_TOOLBAR_H, s).perPage;
      s._mtCols = cols;
      s.page = Math.floor(first / this._mtGridCalc(s, SIM_TOOLBAR_H, s).perPage);
      const probe = document.createElement('div');
      probe.innerHTML = this._simContentHtml();
      const next = probe.querySelector('#sim-grid');
      const grid = el.querySelector('#sim-grid');
      if (grid && next) grid.replaceWith(next);
    };
    handle.addEventListener('pointerdown', e => {
      startX = e.clientX;
      startCols = s._mtCols || 7;
      live = startCols;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', e => {
      if (handle.hasPointerCapture(e.pointerId)) relay(colsAt(e.clientX - startX));
    });
    handle.addEventListener('pointerup', e => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      s._mtCols = colsAt(e.clientX - startX);
      try { localStorage.setItem('arr-sim-cols', String(s._mtCols)); } catch (_) {}
      this._simRender(el);
    });
  }

}

export const wireSimilarMixin = _WireSimilarMethods.prototype;
