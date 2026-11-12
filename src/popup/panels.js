import { sheetChevSvg, sheetMoving, wireSheetPill } from '../shared/ui.js';
// The detail's sliding panels: the grabber and the Interactive Search panel.

class _PopupPanelsMethods {

// While the popup is open the regular polling is paused, so nothing would ever
// clear the spinner on its own. This asks only the queue of the instance that
// was grabbed into, until its download shows up or the wait expires.
_ppGrabPollStart() {
  if (this._ppGrabTimer) return;
  const tick = async () => {
    const w = this._ppGrabWait;
    if (!w || !this._popup || Date.now() > w.until) {
      clearInterval(this._ppGrabTimer);
      this._ppGrabTimer = null;
      if (w && Date.now() > w.until) this._ppGrabWait = null;
      if (this._popup) this._renderPopupEl();
      return;
    }
    try {
      if (w.inst === 'radarr')       await this._fetchRadarrQueue();
      else if (w.inst === 'radarr2') await this._fetchRadarr2Queue();
      else                           await this._fetchSonarrQueue(w.inst);
    } catch (_) { /* keep waiting */ }
    const pct = w.inst === 'radarr'   ? this._radarrQueuePct
              : w.inst === 'radarr2'  ? this._radarr2QueuePct
              : w.inst === 'sonarr'   ? this._sonarrQueueSeriesPct
              :                         this._sonarr2QueueSeriesPct;
    // The id the grab was started with, not whatever popup happens to be open —
    // otherwise walking to another title left this polling for the wrong one.
    const id = w.id ?? (w.inst.startsWith('radarr')
      ? (w.inst === 'radarr2' ? this._popup?._radarr2Id : this._popup?._radarrId)
      : (w.inst === 'sonarr2' ? this._popup?._sonarr2Series?.id : this._popup?._sonarrSeries?.id));
    if (id != null && pct?.has(id)) {
      this._ppGrabWait = null;
      clearInterval(this._ppGrabTimer);
      this._ppGrabTimer = null;
    }
    if (this._popup) this._renderPopupEl();
  };
  this._ppGrabTimer = setInterval(tick, 5000);
  tick();
}

// ─────────────────────────────────────────────
// Popup: render popup HTML into popup-root
// ─────────────────────────────────────────────

// A series' seasons in its detail (one in Sonarr), as the artist window has
// its albums: a sheet of season posters along the bottom, the newest first,
// under the description — folded away to its pill (above a dock, where there is
// one), raised over the picture by it (a tap, or a row at a time as it is
// dragged). A tile opens that season's sources. The posters are Seerr's,
// or TMDB's where Seerr has none or is not there (asked for once).
_ppSnTilesHtml(d) {
  const series = d?._sonarrSeries || d?._sonarr2Series;
  // A phone and a tablet; a desktop's detail keeps its season list
  if (!series || !this._isNarrow) return '';
  const seasons = (series.seasons || []).filter(s => s.seasonNumber > 0)
    .sort((a, b) => b.seasonNumber - a.seasonNumber);
  if (!seasons.length) return '';
  const pics = new Map();
  for (const s of d._tmdbSeasons || []) if (s?.posterPath) pics.set(s.seasonNumber, s.posterPath);
  for (const s of d.seasons || []) if (s?.posterPath) pics.set(s.seasonNumber, s.posterPath);
  const tmdbId = d.tmdbId || d.id || series.tmdbId;
  if (seasons.some(s => !pics.has(s.seasonNumber)) && !d._tmdbSeasonsAsked && tmdbId) {
    d._tmdbSeasonsAsked = true;
    this._callApi('GET', `arr_stack/tmdb/tv/${tmdbId}`).then(det => {
      if (this._popup !== d || !det?.seasons?.length) return;
      d._tmdbSeasons = det.seasons;
      this._renderPopupEl();
    }).catch(() => {});
  }
  const img = path => path ? (path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w342${path}`) : '';
  const fallback = img(d.posterPath) || '';
  const tiles = seasons.map(s => {
    const n = s.seasonNumber;
    const src = img(pics.get(n)) || fallback;
    const st = s.statistics || {};
    const have = st.episodeFileCount || 0;
    const tot = st.totalEpisodeCount || st.episodeCount || 0;
    const pct = tot ? Math.round(have / tot * 100) : 0;
    const tone = tot && have >= tot ? 'ok' : have ? 'part' : 'none';
    return `<button class="sn-tile" data-action="sn-tile" data-season="${n}">
      <span class="sn-tile-art">${src ? `<img src="${this._escHtml(src)}" alt="" loading="lazy" decoding="async">` : ''}${pics.has(n) ? '' : `<span class="sn-tile-num">${n}</span>`}</span>
      <span class="media-type-tag sn-tile-tag">${this._escHtml(this._t('snSeasonTitle'))} ${n}</span>
      <span class="sn-tile-cap"><span>${have}/${tot}</span></span>
      <span class="sn-tile-bar sn-tile-${tone}" style="width:${tot ? Math.max(pct, have ? 6 : 100) : 100}%"></span>
    </button>`;
  }).join('');
  const h = this._snTilesPx ? ` style="height:${this._snTilesPx}px"` : '';
  // Folded, only the posters' top edge shows: their names and bars sit there
  // until the sheet is raised (_ppWireSnTiles moves them, eased)
  const folded = !this._snTilesUp && !this._snTilesH && !this._snTilesRow ? ' sn-folded' : '';
  // A phone's posters in one row, sideways, short of the whole window —
  // unless they all fit the width: then a grid's row, nothing to scroll
  const few = seasons.length <= (this._mobCols || 3);
  const row = this._isMob && !this._snTilesUp && !few ? ' sn-row' : '';
  // A phone's sheet waits below the window until the dock is known, then rises
  const wait = this._isMob && !this._snTilesShown ? ' sn-wait' : '';
  return `<div class="sn-tiles-sheet sn-init${wait}${folded}${row}"${few ? ' data-few' : ''}${h}>
    <button class="sheet-chev" data-sn-tiles-pill aria-label="${this._snTilesUp ? 'Down' : 'Up'}">${sheetChevSvg()}</button>
    <div class="sn-tiles-scroll"><div class="sn-tiles-grid">${tiles}</div></div>
  </div>`;
}

// A phone's or a tablet's tap outside a raised sheet folds it back to where
// it opened: a season's view opened from its poster, else the seasons'
// posters. The sources sheets opened by the IS and AS buttons stay as they are.
_ppFoldOnOutside(e) {
  if (!this._isNarrow) return;
  const t = e.target;
  if (this._snFromTile != null && this._snIsOpen) {
    if (!t.closest?.('.popup-body > .sn-is-section')) this._ppPanelFold?.();
    return;
  }
  if (!t.closest?.('.sn-tiles-sheet, .popup-body > :is(.is-panel, .sn-is-panel, .sn-is-section)')) this._snTilesFold?.();
}

// The seasons' sheet laid out: its height (one row, where it was dragged to,
// or the window's top) and the room it keeps under the description
_ppWireSnTiles(root) {
  const sheet = root.querySelector('.popup-body > .sn-tiles-sheet');
  const body = root.querySelector('.popup-body');
  if (!sheet || !body) { body?.style.removeProperty('--sn-sheet-h'); this._snTilesFold = null; this._snTilesRelay = null; return; }
  const pill = sheet.querySelector('[data-sn-tiles-pill]');
  const scroll = sheet.querySelector('.sn-tiles-scroll');
  // Taps and swipes in the sheet are its own, not Bubble Card's pop-up's
  for (const ev of ['touchstart', 'touchmove']) scroll?.addEventListener(ev, e => e.stopPropagation(), { passive: true, signal: this._ppAbort?.signal });
  const lay = () => {
    const tile = sheet.querySelector('.sn-tile');
    if (!tile) return null;
    const tileH = tile.getBoundingClientRect().height;
    // Folded away as it opens: its pill and the posters' top edge show above
    // a dock where there is one (the list's own padding carries the dock's
    // height). Under the dock the posters fade, as lists do everywhere else,
    // so the edge that says there are seasons here sits above it.
    let bar = Math.max(0, (parseFloat(getComputedStyle(scroll).paddingBottom) || 12) - 12);
    // With a dock: where it really begins on the screen (a pop-up may run on
    // under the screen's edge), and the posters' fade above it (28px, the
    // list's mask) — what counts as shown is what stands clear of both, so
    // three quarters show sharp, and a whole poster means a whole clear one
    if (bar > 0) {
      const dockTop = this._bottomBarTop;
      // The body's foot, where the sheet stands (the sheet itself may still
      // wait below the window, moved down)
      const sb = body.getBoundingClientRect().bottom;
      if (dockTop != null && sb > 0) bar = Math.max(bar, Math.round(sb - dockTop + 14));
      bar += 28;
    }
    // Folded, three quarters of the posters show above the dock: they are
    // plainly posters, the rest a drag away
    const peek = Math.round(tileH * 0.75);
    // What stands above the posters: the pill (and a film's sheet's label),
    // read from where the scrolled posters begin
    const head = Math.max((pill?.getBoundingClientRect().height || 24) + 8,
      scroll.getBoundingClientRect().top - sheet.getBoundingClientRect().top + 4);
    // Where it rests folded, moved by dock_offset (editor): up for more of
    // the posters, down for less — never below the pill, never past a row.
    // A dock the card doesn't know is the offset itself (already in bar).
    const off = this._dockFound || this._dockOffset() < 0 ? this._dockOffset() : 0;
    let min = Math.max(Math.round(head + 12), Math.round(head + peek + bar + off));
    this._snTilesMin = min;
    const g = root.querySelector('.popup-glass')?.getBoundingClientRect();
    const barR = root.querySelector('.pp-hero-bar')?.getBoundingClientRect();
    const top = barR?.height ? barR.bottom + 10 : (g?.top ?? 0);
    const max = Math.round(body.getBoundingClientRect().bottom - top);
    this._snTilesMaxPx = max;
    // From this height a whole poster shows: below it the posters are cut,
    // and their names, ratings and bars sit at the top edge (sn-folded)
    if (!this._isMob) {
      this._snTilesFull = Math.round(head + 12 + bar + tileH);
      return { min, max, step: tileH + 10 };
    }
    // A phone: the posters in one row, scrolled sideways, until the sheet
    // has the whole window — then a grid, scrolled down. Three places only:
    // folded, one row, the window. A row's poster is nine tenths of a grid's
    // (the next one shows at the edge), a poster all picture (2:3).
    // One row is scrolled sideways; two rows and more are the grid, scrolled
    // down. Dragged, the sheet stops a row at a time either way, however
    // many seasons there are. A row's poster is nine tenths of a grid's (the
    // next one shows at the edge), a poster all picture (2:3).
    // As many posters as the width takes or fewer: one row of the grid's own
    const few = sheet.hasAttribute('data-few');
    const inRow = sheet.classList.contains('sn-row');
    const rowTileH = inRow || few ? tileH : tileH * 0.9;
    const gridTileH = inRow && !few ? tileH / 0.9 : tileH;
    const base = head + 12 + bar;
    const row = Math.min(max, Math.round(base + rowTileH));
    // Folded stays short of the row (a whole row is the next place up)
    if (min > row - 20) { min = Math.max(Math.round(head + 12), row - 20); this._snTilesMin = min; }
    const stops = [min, row];
    for (let k = 2; ; k++) {
      const h = Math.round(base + k * gridTileH + (k - 1) * 10);
      if (h >= max - gridTileH / 2) break;
      stops.push(h);
    }
    stops.push(max);
    this._snTilesRowGeom = { row, base, gridTileH };
    this._snTilesFull = row;
    return { min, max, row, stops };
  };
  // How many rows show at a height: one when folded or at one row
  const rowsAt = h => {
    const g = this._snTilesRowGeom;
    if (!g || h <= g.row + 1) return 1;
    return Math.max(2, Math.round((h - g.base + 10) / (g.gridTileH + 10)));
  };
  const setH = (h, ease) => {
    if (ease) sheetMoving(sheet);
    sheet.style.height = `${h}px`;
    this._snTilesPx = h;
    // While the posters are cut, the names, ratings and bars sit at their
    // top edge, the part that shows; once a whole poster shows (a row, more
    // rows, the window), they ease back down to the foot, and up again
    const full = this._snTilesFull ?? ((this._snTilesMin ?? 0) + 2);
    sheet.classList.toggle('sn-folded', h < full - 1);
    // A phone's posters lie in one row short of the whole window
    // A phone's posters lie in one row, sideways, only while one row shows
    if (this._isMob) sheet.classList.toggle('sn-row', !sheet.hasAttribute('data-few') && h <= (this._snTilesRowGeom?.row ?? Infinity) + 1);
    const bodyH = body.getBoundingClientRect().height;
    if (h > bodyH + 1) sheet.classList.add('pp-up');
    else setTimeout(() => { if ((this._snTilesPx || 0) <= bodyH + 1) sheet.classList.remove('pp-up'); }, ease ? 340 : 0);
  };
  // A series' and a film's sheet always open folded: the posters' top edge
  // shows under the description, the rest is a drag or a tap on the pill away
  const fitH = m => m.min;
  const place = () => {
    const m = lay();
    if (!m) return false;
    const open = fitH(m);
    // The description keeps clear of the sheet as it opened
    body.style.setProperty('--sn-sheet-h', `${open}px`);
    setH(this._snTilesUp ? m.max
      : (this._isMob && this._snTilesRow) ? (m.stops[Math.min(this._snTilesRow, m.stops.length - 1)] ?? m.row)
      : this._snTilesH ? Math.min(m.max, Math.max(m.min, this._snTilesH))
      : open);
    return true;
  };
  requestAnimationFrame(() => {
    const arrive = sheet.classList.contains('sn-wait');
    const go = () => {
      if (!sheet.isConnected || !place()) return;
      this._snTilesShown = true;
      // Painted where it stands, with no easing: the posters' names and bars
      // move only when the sheet is moved, never as it first shows. Then, the
      // first time, it rises from below the window.
      requestAnimationFrame(() => {
        sheet.classList.remove('sn-init');
        if (!arrive) return;
        requestAnimationFrame(() => {
          sheet.classList.add('sn-arrive');
          sheet.classList.remove('sn-wait');
          setTimeout(() => sheet.classList.remove('sn-arrive'), 460);
        });
      });
    };
    if (arrive) this._dockWait(go); else go();
  });
  // The dock found or changed after this (_syncBottomBar): measured again,
  // the sheet kept where it stood (folded, a row, the window)
  this._snTilesRelay = () => {
    if (!sheet.isConnected) return;
    const m = lay();
    if (!m) return;
    body.style.setProperty('--sn-sheet-h', `${fitH(m)}px`);
    setH(this._snTilesUp ? m.max
      : (this._isMob && this._snTilesRow) ? (m.stops[Math.min(this._snTilesRow, m.stops.length - 1)] ?? m.row)
      : this._snTilesH ? Math.min(m.max, Math.max(m.min, this._snTilesH))
      : fitH(m));
  };
  // A tap anywhere outside the sheet folds it back (_ppFoldOnOutside)
  this._snTilesFold = () => {
    if (!sheet.isConnected || (!this._snTilesUp && !this._snTilesH && !this._snTilesRow)) return;
    const m = lay();
    if (!m) return;
    this._snTilesUp = false; this._snTilesH = null; this._snTilesRow = false; this._ppPanelUp = false;
    setH(fitH(m), true);
  };
  if (pill) {
    pill.onclick = e => {
      e.stopPropagation();
      if (pill._dragged) return;
      const m = lay();
      if (!m) return;
      // From where it opened, to the top; from anywhere else, back
      const atDefault = !this._snTilesUp && !this._snTilesH && !this._snTilesRow;
      this._snTilesUp = atDefault;
      this._snTilesH = null;
      this._snTilesRow = false;
      this._ppPanelUp = this._snTilesUp;   // a season's sources open where the sheet stood
      setH(atDefault ? m.max : fitH(m), true);
    };
    wireSheetPill(pill, {
      getH: () => sheet.getBoundingClientRect().height,
      setH,
      metrics: () => lay(),
      // Taken anywhere above the posters, or on them while they lie in one row
      area: sheet,
      headBottom: () => scroll.getBoundingClientRect().top,
      // (or, all fitting the width, while their one row shows: no sideways scroll there)
      swipe: t => !!t.closest?.('.sn-tiles-scroll') && (sheet.classList.contains('sn-row')
        || (sheet.hasAttribute('data-few') && this._isMob && sheet.getBoundingClientRect().height <= (this._snTilesFull ?? 0) + 1)),
      done: (h, m) => {
        this._snTilesUp = h >= m.max - 1;
        // A phone keeps which place, not the pixels (a row is re-measured)
        // (how many rows: they are re-measured)
        this._snTilesRow = (m.stops && !this._snTilesUp && h > m.min + 1) ? rowsAt(h) : 0;
        this._snTilesH = this._snTilesUp || m.stops ? null : h;
        this._ppPanelUp = this._snTilesUp;
      },
    });
  }
}

// A phone's sources list is the part worth more room, so it gets a grabber:
// drag it up to take height from the description, down to give it back. The
// ceiling is the action capsule — the panel never hides it.
_ppWirePanelGrab(root) {
  // AS renders .sn-is-section, IS .is-panel, Sonarr IS .sn-is-panel
  const panel = root.querySelector('.popup-body .is-panel, .popup-body .sn-is-panel, .popup-body .sn-is-section');
  // The confirm-add dialog reuses .is-panel but is a prompt, not a sources
  // sheet — nothing there to resize.
  if (!panel || panel.querySelector('.is-confirm-wrap')) { this._ppPanelWasOpen = false; this._ppPanelUp = false; this._ppPanelDragH = null; this._ppPanelFold = null; return; }

  // Slides up from the bottom edge on opening — it advertises that the panel is
  // a draggable sheet. The window matters: the panel first renders as a loading
  // placeholder and is replaced by the results a moment later, so keying off the
  // very first node would animate something nobody sees.
  if (!this._ppPanelWasOpen) {
    this._ppPanelWasOpen = true;
    // A phone's sheet opens raised to the top, whichever button opened it
    if (this._isMob) { this._ppPanelUp = true; this._ppPanelDragH = null; }
    this._ppPanelAnimDone = false;
    this._isFitHist = null;
    this._snFitHist = null;
  }
  // Once, per opening. The panel is re-rendered several times while the sources
  // load, and re-adding the class each time made it flicker.
  if (!this._ppPanelAnimDone && !panel._ppAnimWired) {
    panel._ppAnimWired = true;
    panel.classList.add('pp-panel-in');
    panel.addEventListener('animationend', () => {
      this._ppPanelAnimDone = true;
      panel.classList.remove('pp-panel-in');
      // Row counts were skipped while the panel was in flight — measure now
      this._renderPopupEl();
    }, { once: true });
  }
  const bodyEl = root.querySelector('.popup-body');
  // The panel may never be taller than the scrolling body — beyond that its
  // pager slides out of the sheet.
  const clampH = h => {
    const bodyR = bodyEl?.getBoundingClientRect();
    const barR  = root.querySelector('.pp-hero-bar')?.getBoundingClientRect();
    // The sheet floats over the body, so its ceiling is the action capsule —
    // without this it could be dragged right over the menu.
    const top   = Math.max(bodyR?.top ?? 0, barR ? barR.bottom + 10 : 0);
    const max   = bodyR ? bodyR.bottom - top : (glass?.getBoundingClientRect().height || 600) - 120;
    return Math.min(Math.max(120, h), Math.max(160, max));
  };
  const applyH = h => {
    // The panel's own min-height/flex rules would fight the drag, so they are
    // overridden inline for as long as the user has set a height.
    panel.style.flex = `0 0 ${h}px`;
    panel.style.height = `${h}px`;
    panel.style.minHeight = '0';
    panel.style.maxHeight = 'none';
  };
  if (this._ppPanelH) {
    this._ppPanelH = clampH(this._ppPanelH);
    applyH(this._ppPanelH);
  } else {
    // Default: the panel's top edge sits just under the poster, so the sources
    // begin where the artwork ends.
    requestAnimationFrame(() => {
      if (this._ppPanelH) return;
      const poster = root.querySelector('.popup-poster');
      const bodyR  = bodyEl?.getBoundingClientRect();
      if (!poster || !bodyR) return;
      // A touch below the poster rather than flush with it — the artwork keeps
      // a little air under it.
      const h = clampH(bodyR.bottom - poster.getBoundingClientRect().bottom - 18);
      this._ppPanelH = h;
      applyH(h);
    });
  }
  // A phone raises the sheet by a chevron instead of a grabber: up, to the
  // window's top over the picture (short of the action capsule while it is
  // on the picture); down, back under the poster
  if (this._isNarrow) {
    const upH = () => {
      const bodyR = bodyEl?.getBoundingClientRect();
      const g = root.querySelector('.popup-glass')?.getBoundingClientRect();
      const barR = root.querySelector('.pp-hero-bar')?.getBoundingClientRect();
      const top = barR?.height ? barR.bottom + 10 : (g?.top ?? 0);
      return Math.round((bodyR?.bottom ?? 0) - top);
    };
    // A season opened from its poster opens at the full height and folds to
    // its least: the pill and a row
    const minH = () => {
      const row = panel.querySelector('.sn-ep-item, .is-card, .sn-season-row, tbody tr');
      const pr = panel.getBoundingClientRect();
      const rr = row?.getBoundingClientRect();
      return Math.round(Math.max(140, (rr ? rr.top - pr.top : 60) + (rr?.height || 56) + 44));
    };
    const fromTile = this._snFromTile != null || this._isMob;
    // The detail under it keeps clear of the sheet folded to its least
    if (fromTile) requestAnimationFrame(() => {
      if (panel.isConnected) bodyEl?.style.setProperty('--sn-sheet-h', `${minH()}px`);
    });
    const downH = () => {
      if (fromTile) return minH();
      const poster = root.querySelector('.popup-poster');
      const bodyR = bodyEl?.getBoundingClientRect();
      return poster && bodyR ? clampH(bodyR.bottom - poster.getBoundingClientRect().bottom - 18) : clampH(320);
    };
    // Taller than the body, the body lets the sheet run on over the picture;
    // back within it, only once it has eased back, or it would clip it mid-way
    const bodyH = () => Math.round(bodyEl?.getBoundingClientRect().height || 0);
    const setH = (h, ease) => {
      if (ease) sheetMoving(panel);
      if (h > bodyH() + 1) panel.classList.add('pp-up');
      else setTimeout(() => { if ((this._ppPanelH || 0) <= bodyH() + 1) panel.classList.remove('pp-up'); }, ease ? 340 : 0);
      this._ppPanelH = h;
      applyH(h);
    };
    // The rows a page holds follow the new height, once it has eased over
    const repage = h => {
      clearTimeout(this._ppChevT);
      this._ppChevT = setTimeout(() => {
        this._ppRenderedH = h;
        this._snSeasonsPerPage = null;
        this._isPerPage = null;
        if (this._popup) this._renderPopupEl();
      }, 360);
    };
    if (this._ppPanelUp) setH(upH());
    else if (this._ppPanelDragH) setH(Math.min(this._ppPanelDragH, upH()));
    // A tap outside a season's view opened from its poster folds it back to
    // where it opened (_ppFoldOnOutside)
    this._ppPanelFold = () => {
      if (!panel.isConnected || (!this._ppPanelUp && !this._ppPanelDragH)) return;
      this._ppPanelUp = false; this._ppPanelDragH = null;
      const h = downH();
      setH(h, true);
      repage(h);
    };
    panel.querySelector(':scope > .pp-grab')?.remove();
    let chev = panel.querySelector(':scope > .sheet-chev');
    if (!chev) {
      chev = document.createElement('button');
      chev.className = 'sheet-chev';
      panel.insertBefore(chev, panel.firstChild);
    }
    chev.innerHTML = sheetChevSvg();
    chev.setAttribute('aria-label', this._ppPanelUp ? 'Down' : 'Up');
    chev.onclick = e => {
      e.stopPropagation();
      if (chev._dragged) return;   // the end of a drag, not a tap
      // From where the sheet opened, to the top; from anywhere else (raised,
      // or dragged a few rows), back to where it opened
      this._ppPanelUp = !this._ppPanelUp && !this._ppPanelDragH;
      this._ppPanelDragH = null;
      const h = this._ppPanelUp ? upH() : downH();
      setH(h, true);
      chev.setAttribute('aria-label', this._ppPanelUp ? 'Down' : 'Up');
      repage(h);
    };
    // Dragged by its pill a row at a time while held, to no less than one row
    wireSheetPill(chev, {
      // Taken anywhere across the pill's strip, not only on the pill
      area: panel,
      headBottom: () => chev.getBoundingClientRect().bottom + 6,
      getH: () => panel.getBoundingClientRect().height,
      setH: (h, ease) => setH(h, ease),
      metrics: () => {
        const row = panel.querySelector('.is-card, .sn-season-row, tbody tr');
        const pr = panel.getBoundingClientRect();
        const rr = row?.getBoundingClientRect();
        const rowH = rr?.height || 56;
        return { step: rowH + 6, min: Math.round(Math.max(140, (rr ? rr.top - pr.top : 60) + rowH + 44)), max: upH() };
      },
      done: (h, m) => {
        this._ppPanelUp = h >= m.max - 1;
        this._ppPanelDragH = this._ppPanelUp ? null : h;
        chev.setAttribute('aria-label', this._ppPanelUp ? 'Down' : 'Up');
        repage(h);
      },
    });
    return;
  }
  // A panel kept from the last paint still has its grabber; its listeners
  // went with that paint, so they are added again below.
  let grab = panel.querySelector(':scope > .pp-grab');
  if (!grab) {
    grab = document.createElement('div');
    grab.className = 'pp-grab';
    grab.innerHTML = '<span></span>';
    panel.insertBefore(grab, panel.firstChild);
  }

  const glass = root.querySelector('.popup-glass');
  let startY = 0, startH = 0;

  const onMove = e => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    let h = clampH(startH + (startY - y));
    applyH(h);
    // The middle section refuses to shrink past its own content, so a numeric
    // ceiling is not enough — measure the spill and take it back.
    const spill = panel.getBoundingClientRect().bottom
      - (bodyEl?.getBoundingClientRect().bottom ?? Infinity);
    if (spill > 0.5) { h = Math.max(120, h - spill); applyH(h); }
    this._ppPanelH = h;
    e.preventDefault();
  };
  const onUp = () => {
    grab.classList.remove('is-dragging');
    // Paging is measured from the panel's box, so a new height can mean a new
    // rows-per-page. Re-rendering rebuilds the whole popup — including the
    // capsule, which visibly blinks — so only do it once the height has moved
    // by at least a row.
    const rowEl = panel.querySelector('.sn-season-row, .sn-seasons-rows > *, tbody tr, .is-card');
    const rowH  = rowEl ? rowEl.getBoundingClientRect().height : 40;
    const last  = this._ppRenderedH ?? startH;
    if (Math.abs((this._ppPanelH || 0) - last) >= Math.max(24, rowH * 0.9)) {
      this._ppRenderedH = this._ppPanelH;
      this._snSeasonsPerPage = null;
      this._isPerPage = null;
      this._renderPopupEl();
    }
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  };
  const onDown = e => {
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startH = panel.getBoundingClientRect().height;
    grab.classList.add('is-dragging');
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    e.preventDefault();
    e.stopPropagation();
  };
  const signal = this._ppAbort?.signal;
  grab.addEventListener('pointerdown', onDown, { signal });
  grab.addEventListener('touchstart', onDown, { passive: false, signal });
}

// Turning a phone or a tablet changes which layout the sources get (cards or a
// table) and how many fit on a page; without this the detail kept the ones it
// was opened with until something else redrew it. Only the width counts: a
// phone's address bar sliding away changes the height on every scroll.
_ppWatchViewport() {
  if (this._ppViewportWired) return;
  this._ppViewportWired = true;
  let timer = null, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      if (!this._popup || !this.isConnected) return;
      this._isFitHist = null; this._snFitHist = null;
      this._isPerPage = null; this._snSeasonsPerPage = null;
      this._ppPanelH = null; this._ppRenderedH = null;
      this._renderPopupEl();
    }, 200);
  }, { passive: true });
}

// The Interactive Search panel: swipe on a phone, the filter selects.
_ppWireIsPanel(root, glass) {
  // ── IS filter selects — change event delegation ──
  // ── IS panel swipe (mobile) ──
  const signal = this._ppAbort?.signal;
  const isPanel = this._isMob ? null : root.querySelector('.is-panel');
  if (isPanel) {
    let _swipeX = null;
    isPanel.addEventListener('touchstart', e => { _swipeX = e.touches[0].clientX; }, { passive: true, signal });
    isPanel.addEventListener('touchend', e => {
      if (_swipeX === null) return;
      const dx = e.changedTouches[0].clientX - _swipeX;
      _swipeX = null;
      if (Math.abs(dx) < 40) return;
      const visible = this._applyIsFilters(this._isResults || []);
      const totalPages = Math.max(1, Math.ceil(visible.length / (this._isPerPage || 8)));
      const p = dx < 0
        ? Math.min(totalPages - 1, (this._isPage || 0) + 1)
        : Math.max(0, (this._isPage || 0) - 1);
      if (p !== this._isPage) { this._isPage = p; this._renderPopupEl(); }
    }, { passive: true, signal });
  }

  if (glass) glass.addEventListener('change', e => {
    const sel = e.target.closest('[data-isselect],[data-snisselect]');
    if (!sel) return;
    if (sel.dataset.isselect !== undefined) {
      this._isFilters = { ...this._isFilters, [sel.dataset.isselect]: sel.value };
      this._isPage = 0;
      this._isScrollTop = true;
    } else if (sel.dataset.snisselect !== undefined) {
      this._snIsFilters = { ...this._snIsFilters, [sel.dataset.snisselect]: sel.value };
    }
    this._renderPopupEl();
  }, { signal });
}

}

export const popupPanelsMixin = _PopupPanelsMethods.prototype;
