import { POPUP_TYPE } from '../constants.js';
import { dayClass } from '../shared/ui.js';

class _PopupMethods {

// One chip per group — audio or subtitles — carrying its own glyph, at most
// three languages and a count for whatever is left. Follows the card's language
// setting: flags where flags are configured, codes where tags are.
_ppLangChip(kind, codes) {
  const list = [...new Set((codes || []).filter(Boolean))];
  if (!list.length) return '';
  const pc = this._posterCfg();
  const ico = kind === 'audio' ? 'mdi:volume-high' : 'mdi:subtitles';
  const shown = list.slice(0, 3);
  const rest  = list.length - shown.length;
  const body = (pc.langDisplay || 'flags') === 'tags'
    ? `<span class="pp-fi-txt">${shown.map(c => this._escHtml(c)).join(' · ')}</span>`
    : `<span class="pp-fi-flags">${shown.map(c => {
        const art = this._flagSvg(c) || this._flagEmoji(c);
        // A language with no flag of its own still says which one it is
        return art
          ? `<span class="pp-fi-flag" title="${this._escHtml(c)}">${art}</span>`
          : `<span class="pp-fi-txt">${this._escHtml(c)}</span>`;
      }).join('')}</span>`;
  return `<span class="pp-fi-chip pp-fi-${kind}"><ha-icon icon="${ico}" style="--mdc-icon-size:11px"></ha-icon>${body}${
    rest > 0 ? `<span class="pp-fi-more">+${rest}</span>` : ''}</span>`;
}

_wirePopup() {
  this.shadowRoot.querySelectorAll('.mc[data-popup]').forEach(card => {
    // Wired once: the column is wired by several paths, some over cards they did not redraw.
    if (card._popupWired) return;
    card._popupWired = true;
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      // Ignore clicks on the Overseerr add/have buttons inside the card
      if (e.target.closest('.overseerr-add, .btn-add, .req-open, .req-cancel, .req-confirm, .req-overlay, .tv-req-open, .tv-req-cancel, .tv-req-confirm, .tv-req-overlay, .req-withdraw, .pr-approve, .pr-decline')) return;
      const type     = card.dataset.popup;  // 'radarr' | 'sonarr' | 'movie' | 'tv'
      const tmdbId    = card.dataset.tmdbid;
      const tvdbId    = card.dataset.tvdbid;
      const title     = card.dataset.title || '';
      const radarrId  = card.dataset.radarrid  ? parseInt(card.dataset.radarrid,  10) : null;
      const radarr2Id = card.dataset.radarr2id ? parseInt(card.dataset.radarr2id, 10) : null;
      this._openPopup(type, tmdbId, tvdbId, title, radarrId, radarr2Id);
    });
  });

  // A music card that names a Lidarr artist opens the artist modal instead —
  // wired in the music layer, so this one skips it.
  this.shadowRoot.querySelectorAll('.mc[data-stream-entity]:not([data-artist-id])').forEach(card => {
    if (card._streamWired) return;
    card._streamWired = true;
    card.addEventListener('click', () => {
      // For an install that is mostly Plex, Now Playing is the card — opening
      // an entry is the use, the same as opening any of the other modals.
      this._markActivated();
      this._openStreamPopup(
        card.dataset.streamEntity,
        card.dataset.streamType   || '',
        card.dataset.streamTitle  || '',
        card.dataset.streamSeries || '',
      );
    });
  });
}

// ─────────────────────────────────────────────
// Popup: fetch detail data and open modal
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Day/night helper (sun.sun entity)
// ─────────────────────────────────────────────
get _isDaytime() {
  return this._hass?.states?.['sun.sun']?.state === 'above_horizon';
}

_renderPopupEl() {
  if (this._terminateActive) return; // overlay visible — skip re-render
  const root = this.shadowRoot.getElementById('popup-root');
  if (!root) return;

  // Clear popup progress timer on every re-render
  if (this._streamPopupTimer) { clearInterval(this._streamPopupTimer); this._streamPopupTimer = null; }

  if (!this._popup) {
    root.innerHTML = '';
    return;
  }

  // Preserve IS results scroll position across re-renders (desktop: .is-results-wrap, mobile: .popup-body)
  const prevIsWrap  = root.querySelector('.is-results-wrap');
  const prevBody    = root.querySelector('.popup-body');
  const prevSnPanel = root.querySelector('.sn-is-panel');
  const savedIsScroll    = prevIsWrap  ? prevIsWrap.scrollTop  : 0;
  const savedBodyScroll  = prevBody    ? prevBody.scrollTop    : 0;
  const savedSnIsScroll  = prevSnPanel ? prevSnPanel.scrollTop : 0;

  const d = this._popup;
  if (d && !d._loading && !d._streamEntity) {
    const _tmdb = d.tmdbId || d.id;
    const _tvdb = d.externalIds?.tvdbId || d._tvdbId;
    if (_tmdb && !d._radarrId) {
      const m = (this._radarr || []).find(r => String(r.tmdbId) === String(_tmdb));
      if (m) d._radarrId = m.id;
    }
    if (_tmdb && !d._radarr2Id) {
      const m = this._radarr2ByTmdb?.get(String(_tmdb));
      if (m) d._radarr2Id = m.id;
    }
    if ((_tvdb || _tmdb) && !d._sonarrSeries) {
      const s = (this._sonarrAll || this._sonarr || []).find(s =>
        (_tvdb && String(s.tvdbId) === String(_tvdb)) || (_tmdb && String(s.tmdbId) === String(_tmdb))
      );
      if (s) d._sonarrSeries = s;
    }
    if ((_tvdb || _tmdb) && !d._sonarr2Series && this._sonarr2Configured) {
      const s = (this._sonarr2All || this._sonarr2 || []).find(s =>
        (_tvdb && String(s.tvdbId) === String(_tvdb)) || (_tmdb && String(s.tmdbId) === String(_tmdb))
      );
      if (s) d._sonarr2Series = s;
    }
  }

  // The capsule is rebuilt by every re-render — with its blur and transitions
  // that repaint reads as a blink. When its markup has not changed (paging
  // refresh, an animation ending, a poll landing), keep the live node.
  const _oldBar = root.querySelector('.pp-hero-bar');
  const _oldBarHtml = _oldBar?.outerHTML;

  root.innerHTML = this._renderPopup();

  if (_oldBar) {
    const _newBar = root.querySelector('.pp-hero-bar');
    if (_newBar) {
      const oldPills = _oldBar.querySelectorAll('.pp-hero-pill');
      const newPills = _newBar.querySelectorAll('.pp-hero-pill');
      if (_newBar.outerHTML === _oldBarHtml) {
        _newBar.replaceWith(_oldBar);
      } else if (oldPills.length && oldPills.length === newPills.length) {
        // Picking another item changes the markup, but the blurred capsule
        // itself can stay — swapping only its children keeps the surface from
        // being recreated, which is what was blinking.
        oldPills.forEach((pill, i) => {
          const next = newPills[i];
          if (pill.innerHTML !== next.innerHTML) pill.innerHTML = next.innerHTML;
        });
        _newBar.replaceWith(_oldBar);
      }
    }
  }

  // The whole popup is re-rendered, so a fresh sub-track would appear already
  // open. Opening it a frame later gives the roll-out and fade something to
  // animate from — but only when it actually just opened, not on every redraw.
  this._ppWirePanelGrab(root);

  const openKeys = new Set();
  root.querySelectorAll('.pp-hero-pill .pp-sub').forEach(sub => {
    const key = sub.dataset.subKey || 'sub';
    openKeys.add(key);
    // Already-open tracks are rendered open — adding the class here instead
    // let the closed state paint for a frame, which read as a flicker on every
    // re-render.
    if (!sub.classList.contains('is-open')) {
      requestAnimationFrame(() => requestAnimationFrame(() => sub.classList.add('is-open')));
    }
  });
  this._ppSubOpenKeys = openKeys;

  if (savedIsScroll > 0) {
    const newIsWrap = root.querySelector('.is-results-wrap');
    if (newIsWrap) newIsWrap.scrollTop = savedIsScroll;
  }
  if (savedSnIsScroll > 0) {
    const newSnPanel = root.querySelector('.sn-is-panel');
    if (newSnPanel) newSnPanel.scrollTop = savedSnIsScroll;
  }
  if (savedBodyScroll > 0) {
    const newBody = root.querySelector('.popup-body');
    if (newBody) newBody.scrollTop = savedBodyScroll;
  }

  // Anchor an open dropdown under its own trigger
  requestAnimationFrame(() => this._qaPositionMenu());

  // Dynamic IS per-page: measure available space in glass viewport, account for pager height
  if (this._isState === 'results') {
    const _gen = (this._isMeasureGen = ((this._isMeasureGen || 0) + 1));
    requestAnimationFrame(() => {
      if (this._isMeasureGen !== _gen) return;
      const root2   = this.shadowRoot?.getElementById('popup-root');
      const glass   = root2?.querySelector('.popup-glass');
      const panel   = root2?.querySelector('.is-panel');
      const hdr     = root2?.querySelector('.is-panel-hdr');
      const pager   = root2?.querySelector('.is-panel > div[style*="flex-shrink"]');
      const wrap    = root2?.querySelector('.is-results-wrap');
      const rows    = wrap ? [...wrap.querySelectorAll('tbody tr, .is-card')] : [];
      if (!glass || !panel || !hdr || !wrap || !rows.length) return;
      // The entrance animation offsets the panel; measuring mid-flight would
      // read a box 60px lower and hand back a bogus row count.
      if (panel.classList.contains('pp-panel-in')) return;
      const hdrBottom       = hdr.getBoundingClientRect().bottom;
      // A dragged panel is shorter than the sheet, so it — not the glass —
      // decides how many rows fit.
      const _floor          = this._ppPanelH
        ? panel.getBoundingClientRect().bottom
        : glass.getBoundingClientRect().bottom;
      const glassVisBottom  = Math.min(_floor, window.innerHeight);
      const pagerH          = pager ? pager.getBoundingClientRect().height : 0;
      const available       = glassVisBottom - hdrBottom - pagerH - 8;
      const rowH            = Math.max(20, ...rows.map(r => r.getBoundingClientRect().height));
      const fits            = Math.max(1, Math.floor(available / rowH));
      // A/B oscillation guard: measuring changes the layout, which can change the
      // measurement — if we are bouncing between two values, keep the current one.
      this._isFitHist = [...(this._isFitHist || []), fits].slice(-3);
      const _osc = this._isFitHist.length === 3
        && this._isFitHist[0] === this._isFitHist[2]
        && this._isFitHist[0] !== this._isFitHist[1];
      if (_osc) return;
      if (fits !== this._isPerPage) {
        this._isPerPage = fits;
        this._isPage    = Math.min(this._isPage, Math.max(0, Math.ceil(this._applyIsFilters(this._isResults || []).length / fits) - 1));
        this._renderPopupEl();
      }
    });
  }

  // Dynamic seasons-per-page: measure how many season rows fit in the glass viewport
  // (same approach as the IS per-page block above), so paging stays visible but no rows go unused.
  // Skip when a season is expanded — expanded rows have different height, causing oscillation.
  if (this._snIsOpen && !(this._snExpandedSeasons?.size > 0) && !this._snActiveIs) {
    const _snGen = (this._snSeasonsMeasureGen = ((this._snSeasonsMeasureGen || 0) + 1));
    requestAnimationFrame(() => {
      if (this._snSeasonsMeasureGen !== _snGen) return;
      const root2    = this.shadowRoot?.getElementById('popup-root');
      const glass    = root2?.querySelector('.popup-glass');
      const rowsWrap = root2?.querySelector('.sn-seasons-rows');
      const pager    = root2?.querySelector('.sn-is-section > div[style*="padding-bottom"]');
      const rows     = rowsWrap ? [...rowsWrap.children] : [];
      if (!glass || !rowsWrap || !rows.length) return;
      const wrapTop        = rowsWrap.getBoundingClientRect().top;
      const _panel         = root2?.querySelector('.sn-is-section, .sn-is-panel');
      if (_panel?.classList.contains('pp-panel-in')) return;
      const _floor         = (this._ppPanelH && _panel)
        ? _panel.getBoundingClientRect().bottom
        : glass.getBoundingClientRect().bottom;
      const glassVisBottom = Math.min(_floor, window.innerHeight);
      const pagerH         = pager ? pager.getBoundingClientRect().height : 0;
      const available      = glassVisBottom - wrapTop - pagerH;
      const rowH           = Math.round(Math.max(20, ...rows.map(r => r.getBoundingClientRect().height)));
      const gapH           = 4; // matches gap:4px on .sn-seasons-rows
      const fits           = Math.max(3, Math.floor((available + gapH) / (rowH + gapH)));
      this._snFitHist = [...(this._snFitHist || []), `${fits}/${rowH}`].slice(-3);
      const _snOsc = this._snFitHist.length === 3
        && this._snFitHist[0] === this._snFitHist[2]
        && this._snFitHist[0] !== this._snFitHist[1];
      if (_snOsc) return;
      if (fits !== this._snSeasonsPerPage || rowH !== this._snSeasonsRowH) {
        this._snSeasonsPerPage = fits;
        this._snSeasonsRowH    = rowH;
        this._snSeasonsPage    = 0;
        this._renderPopupEl();
      }
    });
  }

  // Wire close handlers
  const overlay = root.querySelector('.popup-overlay');
  const glass   = root.querySelector('.popup-glass');
  const closeBtn = root.querySelector('.popup-close');

  const _resetPopupTransient = () => {
    this._plexCastOpen    = false;
    this._plexCasting     = null;
    this._plexClients     = null;
    this._plexCastBtnRect = null;
  };

  this._ppWireClose(overlay, closeBtn, _resetPopupTransient);

  // ── Jeden click handler na glass: stopPropagation + event delegation ──
  if (glass) glass.addEventListener('click', e => this._ppGlassClick(e, root, d, overlay, glass));

  this._ppWireSeek(root);

  this._ppWireIsPanel(root, glass);

  this._ppStreamProgress(root);
}

// Closing the detail: the overlay and the close button.
_ppWireClose(overlay, closeBtn, _resetPopupTransient) {
  if (overlay) {
    overlay.addEventListener('click', e => {
      // Handle plex cast play buttons inside dropdown (outside glass)
      const playBtn = e.target.closest('[data-action="plex-cast-play"]');
      if (playBtn) {
        const castEntity = playBtn.dataset.entity;
        const dd = this._popup;
        if (!castEntity || !dd) return;
        const _isMovT = dd._type === 'radarr' || dd._type === 'movie';
        const tmdbId = dd.id || dd.tmdbId
          || (dd._radarrId  ? (this._radarr  || []).find(m => m.id === dd._radarrId)?.tmdbId  : null)
          || (dd._radarr2Id ? (this._radarr2 || []).find(m => m.id === dd._radarr2Id)?.tmdbId : null);
        const tvdbId = dd.externalIds?.tvdbId || dd._sonarrSeries?.tvdbId || dd._sonarr2Series?.tvdbId;
        this._plexCasting  = castEntity;
        this._plexCastOpen = false;
        this._renderPopupEl();
        (async () => {
          try {
            const lookupParam = _isMovT ? `tmdbId=${tmdbId}` : `tvdbId=${tvdbId}`;
            const lookup = await this._callApi('GET', `arr_stack/plex/lookup?${lookupParam}`);
            if (!lookup?.plex_key) throw new Error('Plex item not found');
            const contentId = {};
            if (lookup.library) contentId.library_name = lookup.library;
            if (lookup.title)   contentId.title         = lookup.title;
            await this._hass.callService('media_player', 'play_media', {
              entity_id: castEntity,
              media_content_type: 'plex',
              media_content_id: JSON.stringify(contentId),
            });
          } catch (err) { console.warn('[arr-card] Plex cast error:', err); }
          this._plexCasting = null;
          this._renderPopupEl();
        })();
        return;
      }
      // Click inside dropdown (but not on a play button) — keep dropdown open
      if (e.target.closest('.plex-cast-dropdown')) return;
      // Click outside glass + dropdown — close everything
      _resetPopupTransient();
      this._popup = null;
      this._libReturnState = null;
      this._calReturnState = false;
      this._mtReturnState = null;
      this._simReturnState = null;
      this._renderPopupEl();
    });
  }
  if (closeBtn) {
    const _backArrow = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    if (this._libReturnState || this._calReturnState || this._mtReturnState || this._simReturnState) {
      closeBtn.innerHTML = _backArrow;
    }
    closeBtn.addEventListener('click', () => {
      _resetPopupTransient();
      this._popup = null;
      this._isState = null;
      if (!this._popupReturn()) this._renderPopupEl();
    });
  }
}

// Season monitoring toggle button — bookmark outline/filled, spinner while saving
_snMonitorBtn(season) {
  const n = season.seasonNumber;
  if (this._snMonitorBusy === n) {
    return `<button class="btn-person" disabled><span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span></button>`;
  }
  const mon = !!season.monitored;
  const icon = mon
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
  const title = mon
    ? this._t('seasonMonOn')
    : this._t('seasonMonOff');
  return `<button class="btn-person${mon ? ' active' : ''}" data-action="sn-season-monitor" data-season="${n}" title="${title}">${icon}</button>`;
}

// Sonarr instance chip — episode counts from monitored seasons
// green = all monitored episodes downloaded, blue = incomplete or not monitored
_snInstChip(chipFn, label, entry, pct, inst = null) {
  if (!entry) return chipFn(label, 'none', null, inst);
  if (pct !== null) return chipFn(label, 'downloading', pct, inst);
  const notMonitored = !entry.monitored;
  if (notMonitored) {
    const nm = this._t('notMonitored');
    return chipFn(label ? `${label} — ${nm}` : nm, 'added', null, inst);
  }
  const efc = entry.statistics?.episodeFileCount ?? 0;
  const ec  = entry.statistics?.episodeCount ?? 0;
  const cnt = `${efc}/${ec}`;
  const complete = ec > 0 && efc >= ec;
  return chipFn(label ? `${label} ${cnt}` : cnt, complete ? 'available' : 'partial', null, inst);
}

_renderPopup() {
  const d = this._popup;
  if (!d) return '';

  const _state = this._ppStateHtml({ d });
  if (_state !== null) return _state;

  const { title, overview, subLine, backdropStyle, trailer, trailerHtml, posterHtml } = this._ppHeaderParts({ d });

  const { castPanelHtml, castToggleBtn } = this._ppCastParts({ d });

  // Interactive Search tlačítka — jen pro admina
  const isAdmin     = this._hass.user.is_admin;
  const isMovieType = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
  const isSonarrType = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  const isConfirmAdd  = this._isState === 'confirm-add';
  const isActive      = !!this._isState && !isConfirmAdd;
  const snConfirmAdd  = this._snIsOpen && this._snIsState === 'confirm-add';
  const snIsActive    = this._snIsOpen && !snConfirmAdd;

  const personIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;

  const searchSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
  const chevRSvg  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;

  // Instance label helper — use seerr names if both present and short enough, else fallback
  const MAX_INST_LBL = 10;
  const _instLabels = (n1, n2, fb1, fb2) => {
    const use = n1 && n2 && n1.length <= MAX_INST_LBL && n2.length <= MAX_INST_LBL;
    return use ? [n1, n2] : [fb1, fb2];
  };
  // Dual: vždy pokud je Radarr 2 nakonfigurovaný (včetně "staženo v R1 ale ne R2" a naopak)
  const hasDualRadarr  = !!this._radarr2Configured;
  const hasDualSonarr  = !!this._sonarr2Configured;
  // Single instance fallback (když dual není)
  const singleInstance = d._radarrId ? 'radarr' : (d._radarr2Id ? 'radarr2' : 'radarr');
  const [isl1, isl2] = (this._seerrRadarr2?.is4k)
    ? ['HD', '4K']
    : _instLabels(this._seerrRadarr?.name, this._seerrRadarr2?.name, 'Radarr 1', 'Radarr 2');

  // Shared in-lib flags — green only when actually downloaded
  const _re1 = d._radarrId  ? (this._radarr  || []).find(m => m.id === d._radarrId)  : null;
  const _re2 = d._radarr2Id ? (this._radarr2 || []).find(m => m.id === d._radarr2Id) : null;
  const _se1 = d._sonarrSeries?.id  ? (this._sonarr  || []).find(s => s.id === d._sonarrSeries.id)  : null;
  const _se2 = d._sonarr2Series?.id ? (this._sonarr2 || []).find(s => s.id === d._sonarr2Series.id) : null;
  const rInLib1  = !!(_re1?.hasFile);
  const rInLib2  = !!(_re2?.hasFile);
  const snInLib1 = (_se1?.statistics?.episodeFileCount > 0);
  const snInLib2 = (_se2?.statistics?.episodeFileCount > 0);

  // ── Auto Search buttons ──────────────────────────────────────────────────
  const asActive = this._asOpen;
  const _isMovieType = d._type === 'radarr' || d._type === 'movie';
  const asConfirmOnly  = asActive && this._asState === 'confirm';
  const asMovieActive  = asActive && _isMovieType && !asConfirmOnly;
  const asSonarrActive = asActive && !_isMovieType && !asConfirmOnly;
  const _asLoading = (inst) =>
    this._asInstance === inst && (this._asMovieSearching || (asActive && this._asState === 'adding'));
  const _asDone    = (inst) => this._asInstance === inst && (this._asState === 'done' || this._asMovieSearched);
  const _asErr     = (inst) => this._asInstance === inst && this._asState === 'error';
  const _asSpinner = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>`;
  // in-lib class helpers — suppress when downloading
  const _movieDlPct = (inst) => {
    const mId = inst === 'radarr2' ? d._radarr2Id : d._radarrId;
    if (!mId) return null;
    const qPct = inst === 'radarr2' ? (this._radarr2QueuePct || new Map()) : (this._radarrQueuePct || new Map());
    return qPct.has(mId) ? qPct.get(mId) : null;
  };
  const _seriesDlPct = (inst) => {
    const series = inst === 'sonarr2' ? d._sonarr2Series : d._sonarrSeries;
    if (!series?.id) return null;
    const qPct = inst === 'sonarr2' ? (this._sonarr2QueueSeriesPct || new Map()) : (this._sonarrQueueSeriesPct || new Map());
    return qPct.has(series.id) ? qPct.get(series.id) : null;
  };
  const _inLibCls   = (inLib, inst) => (inLib && _movieDlPct(inst)   === null) ? ' in-lib' : '';
  const _snInLibCls = (inLib, inst) => (inLib && _seriesDlPct(inst)  === null) ? ' in-lib' : '';

  const { searchBtnHtml, searchMenuRows } = this._ppSearchParts({ _asSpinner, _instLabels, d, hasDualRadarr, hasDualSonarr, isAdmin, isMovieType, isSonarrType, isl1, isl2, personIconSvg, searchSvg });

  const trashSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
  const stopSvg  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
  const checkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const crossSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const canRemoveRadarr = isAdmin && isMovieType   && (d._radarrId || d._radarr2Id);
  const canRemoveSonarr = isAdmin && isSonarrType  && (d._sonarrSeries?.id || d._sonarr2Series?.id);

  const radarrEntry  = d._radarrId  ? (this._radarr  || []).find(m => m.id === d._radarrId)           : null;
  const radarr2Entry = d._radarr2Id ? (this._radarr2 || []).find(m => m.id === d._radarr2Id)           : null;
  const sonarrEntry  = d._sonarrSeries?.id  ? (this._sonarr  || []).find(s => s.id === d._sonarrSeries.id)  : null;
  const sonarr2Entry = d._sonarr2Series?.id ? (this._sonarr2 || []).find(s => s.id === d._sonarr2Series.id) : null;
  const hasFiles     = !!(radarrEntry?.hasFile || radarr2Entry?.hasFile
                       || (sonarrEntry?.statistics?.episodeFileCount > 0)
                       || (sonarr2Entry?.statistics?.episodeFileCount > 0));

  const { instanceStatusHtml, singleDlTag } = this._ppInstanceChips({ _instLabels, d, isMovieType, isSonarrType, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry });
  // ──────────────────────────────────────────────────────────────────────

  const { popupTagHtml, goneTagHtml } = this._ppTagParts({ d, isMovieType });

  const { removeBtn, removeMenuRows } = this._ppRemoveParts({ _instLabels, canRemoveRadarr, canRemoveSonarr, checkSvg, crossSvg, d, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry, trashSvg });

  const { ratingsRow } = this._ppRatingsRow({ d, isMovieType, isSonarrType, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry });

  const { fileInfoRow } = this._ppFileInfoRow({ isMovieType, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry });

  const { monTitleBtn, monAddLabel } = this._ppMonitorTitle({ _instLabels, d, isAdmin, isMovieType, isSonarrType, isl1, isl2, radarr2Entry, radarrEntry, sonarr2Entry, sonarrEntry });
  const { confirmPanelHtml } = this._ppConfirmPanel({ _instLabels, _isMovieType, asConfirmOnly, hasDualRadarr, hasDualSonarr, isConfirmAdd, isl1, isl2, monAddLabel, snConfirmAdd });

  const wideClass    = '';
  const searchActive = isActive || snIsActive || asSonarrActive;
  // The sheet keeps one height whatever is open — the old 82vh-while-searching
  // made it jump the moment a panel appeared.
  const glassStyle   = '';

  // Phones and tablets: the backdrop's lower half is dead space, and actions
  // parked in the scrolling body kept sliding out of reach. One capsule for the
  // actions, a second for the instance chips — stacked on a phone, side by side
  // on a tablet.
  // Kept in both states: over the backdrop normally, and — when a search panel
  // takes the backdrop's place — pinned to the same spot on the glass itself.
  // In the capsule, expanding Search keeps Search itself on screen and the
  // choices ride along as sub-chips — the way Collections shows Media.
  const heroSearchHtml = searchBtnHtml;

  const heroRemoveHtml = removeBtn;

  const optionsBtn = this._qaBtnHtml(d);
  // Every width gets the capsule. It used to be a narrow-screen layout, so a
  // wide monitor still showed the old button row under the description — the
  // same popup looked like two different designs depending on the display.
  const heroBar = (searchBtnHtml || removeBtn || optionsBtn)
    ? `<div class="pp-hero-bar">
         <div class="pp-hero-pill">${heroSearchHtml}${heroRemoveHtml}${optionsBtn}</div>
       </div>`
    : '';

  // On a phone the description is a full-width block under the poster row, not
  // part of the metadata column — that keeps the ratings and instance chips
  // beside the poster instead of dropping under it.
  const overviewHtml = overview
    ? `<p class="popup-overview">${overview}</p>`
    : `<p class="popup-overview" style="color:rgba(255,255,255,0.35);font-style:italic">${this._t('noDescription')}</p>`;

  const backdropEl = searchActive ? '' : (this._popupCastOpen && castPanelHtml
    ? `
        <div class="popup-backdrop popup-backdrop--cast${heroBar ? ' popup-backdrop--bar' : ''}">
          ${castPanelHtml}
          <div class="popup-backdrop-fade"></div>
          ${heroBar}
          ${castToggleBtn ? `<div class="popup-cast-fab-anchor">${castToggleBtn}</div>` : ''}
        </div>`
    : `
        <div class="popup-backdrop${heroBar ? ' popup-backdrop--bar' : ''}" style="${backdropStyle}">
          <div class="popup-backdrop-fade"></div>
          ${heroBar}
          ${castToggleBtn ? `<div class="popup-cast-fab-anchor">${castToggleBtn}</div>` : ''}
        </div>`);

  const posterHtmlFinal = posterHtml
    ? (searchActive
        ? posterHtml.replace('<img class="popup-poster"', '<img class="popup-poster" style="margin-top:0"')
        : posterHtml)
    : '';

  return `
    <div class="popup-overlay${dayClass(this)}">
      <div class="popup-glass${wideClass}"${glassStyle}>
        <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

        ${backdropEl}
        ${(heroBar && !backdropEl) ? heroBar : ''}
        ${this._qaMenuHtml(d, searchMenuRows, removeMenuRows)}
        <div class="popup-body${(heroBar && !backdropEl) ? ' popup-body--bar' : ''}${searchActive ? ' popup-body--search' : ''}${((snIsActive && !isActive && !asActive) || asSonarrActive) ? ' popup-body--sn-is' : ''}${(asActive || confirmPanelHtml) ? ' popup-body--panel' : ''}">
          <div class="popup-content"${(searchActive && !heroBar) ? ' style="padding-top:52px"' : ''}>
            ${posterHtmlFinal}
            <div class="popup-meta">
              <div style="display:flex;align-items:flex-start;gap:8px;margin:0 0 5px;position:relative">
                <h2 class="popup-title" style="margin:0;flex:1;min-width:0">${title}${monTitleBtn}</h2>
                ${this._qaStatusHtml()}
              </div>
              ${(subLine || ratingsRow) ? `<div class="popup-subrow">${subLine ? `<div class="popup-sub">${subLine}</div>` : ''}${ratingsRow}</div>` : ''}
              ${fileInfoRow}
              ${instanceStatusHtml}
              ${goneTagHtml}
              ${singleDlTag}
              ${popupTagHtml}
              ${this._isMob ? '' : overviewHtml}
              ${d._streamEntity ? this._renderPopupStreamControls(d) : ''}
              ${heroBar ? '' : `<div class="popup-actions">
                ${searchBtnHtml}
                ${removeBtn}
                ${optionsBtn}
              </div>`}
            </div>
          </div>
          ${this._isMob ? `<div class="popup-desc">${overviewHtml}</div>` : ''}
          ${(confirmPanelHtml || isActive || snIsActive || asSonarrActive) ? '' : trailerHtml}
          ${confirmPanelHtml}
          ${(asActive && !asConfirmOnly) ? this._renderAsSection() : ''}
          ${isActive ? this._renderIsPanel() : ''}
          ${snIsActive ? this._renderSonarrIsSection() : ''}
        </div>
      </div>
      ${this._renderPlexCastDropdown()}
    </div>`;
}

}

export const popupMixin = _PopupMethods.prototype;
