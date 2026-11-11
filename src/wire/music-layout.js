import { sheetMoving, wireSheetPill } from '../shared/ui.js';
// Music, the artist modal's layout: swipe, the panel and album grabbers, fitting the albums. Split out of wire/music.js.

class _WireMusicLayoutMethods {

  // Same gesture and threshold the poster rows use, so paging the covers feels
  // like paging anything else in the card.
  _wireMusSwipe(el) {
    const wrap = el?.querySelector('.mus-alb-wrap');
    if (!wrap || this._isNarrow) return;   // a phone's covers scroll, not page
    const THRESHOLD = 40;
    let startX = null;
    wrap.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true, signal: this._musAbort?.signal });
    wrap.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < THRESHOLD) return;
      const m = this._musicModal;
      if (!m) return;
      const per   = Math.max(2, (m.cols || 4) * 2);
      const pages = Math.max(1, Math.ceil((m.albums || []).length / per));
      const cur   = m.albPage || 0;
      const next  = dx < 0 ? cur + 1 : cur - 1;
      if (next < 0 || next > pages - 1) return;
      m.albPage = next;
      this._renderMusicModalEl();
    }, { passive: true, signal: this._musAbort?.signal });
  }

  // How many covers fit across is a layout answer, not a guess: read it from the
  // grid the browser has just laid out, and only redraw if the page size changed.
  _musMeasureCols(el) {
    const grid = el?.querySelector('.mus-alb-grid');
    const tile = el?.querySelector('.mus-alb');
    const m = this._musicModal;
    if (!grid || !m || this._isNarrow) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
    const tileH = tile?.getBoundingClientRect().height || 0;
    const wrap = el.querySelector('.mus-alb-wrap') || grid;
    const gap = this._isMob ? 8 : 12;   // .mus-alb-grid
    const avail = wrap.getBoundingClientRect().height;
    const rows = !tileH
      ? 2
      : Math.max(1, Math.floor((avail + gap) / (tileH + gap)));
    if ((!cols || cols === m.cols) && rows === m.rows) return;
    const per = Math.max(2, (cols || m.cols || 4) * rows);
    const pages = Math.max(1, Math.ceil((m.albums?.length || 0) / per));
    m.albPage = Math.min(m.albPage || 0, pages - 1);
    if (cols) m.cols = cols;
    m.rows = rows;
    this._renderMusicModalEl();
  }

  // Opens reaching up to just under the header rather than to its own content
  // height, so two albums fill the modal the same as twenty. Once dragged, the
  // height the user chose wins.
  _musSizePanel(el) {
    const panel = el?.querySelector('.mus-search');
    const body = el?.querySelector('.mus-modal-body');
    const head = el?.querySelector('.mus-content');
    if (!panel || !body) return;
    // A phone: under the header, or raised by its chevron to the window's top
    if (this._isNarrow) {
      const bottom = body.getBoundingClientRect().bottom;
      const top = this._musSheetUp
        ? el.querySelector('.popup-glass')?.getBoundingClientRect().top
        : head?.getBoundingClientRect().bottom + 8;
      // A height dragged to (_wireMusSheetDrag) holds for both sheets
      const h = (!this._musSheetUp && this._musSheetH) || Math.round(bottom - (top ?? 0));
      if (h > 80) {
        panel.style.height = `${h}px`;
        this._musPanelH = h;
        // The covers come back at the same place when the sources close
        this._musAlbPhoneH = this._musSheetUp ? h : h - 7;
      }
      return;
    }
    const h = this._musPanelH || Math.round(
      body.getBoundingClientRect().bottom - (head?.getBoundingClientRect().bottom ?? 0) - 8
    );
    if (h > 80) {
      panel.style.height = `${h}px`;
      this._musPanelH = h;
    }
  }

  // The grabber trades height between the sources panel and the discography.
  // Applied inline while dragging rather than through a re-render — repainting
  // the release table on every pointer move is what makes that feel sticky.
  // A drag on a grabber is the grabber's alone: let through, Bubble Card's
  // pop-up took it for its own swipe and pulled the whole window down with it
  _musGrabOwnTouch(handle) {
    const signal = this._musAbort?.signal;
    handle.addEventListener('touchstart', e => e.stopPropagation(), { passive: true, signal });
    handle.addEventListener('touchmove', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false, signal });
  }

  _wireMusPanelDrag(el) {
    const handle = el.querySelector('[data-mus-grab-handle]');
    const panel = el.querySelector('.mus-search');
    if (!handle || !panel) return;
    this._musGrabOwnTouch(handle);
    const glass = panel.closest('.popup-glass');
    handle.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const startY = ev.clientY;
      const startH = panel.getBoundingClientRect().height;
      const max = Math.max(200, (glass?.getBoundingClientRect().height || 600) * 0.7);
      handle.classList.add('is-dragging');
      handle.setPointerCapture(ev.pointerId);
      const move = e => {
        const h = Math.round(Math.min(max, Math.max(120, startH - (e.clientY - startY))));
        panel.style.height = `${h}px`;
        this._musPanelH = h;
      };
      const up = e => {
        handle.classList.remove('is-dragging');
        try { handle.releasePointerCapture(ev.pointerId); } catch (_) {}
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    }, { signal: this._musAbort?.signal });
  }

  // Two rows of covers is what the sheet opens on: measured once from a real
  // tile, since a cover's height depends on how many fit across. A drag then
  // sets the height and that is what the modal keeps.
  _musFitAlbums(el) {
    if (!el?.isConnected) return;
    // A phone was left out of this and took a fixed two rows, which is one row
    // more than a shorter screen has room for — the second was simply cut off.
    if (this._musAlbH != null) return;
    const albums = el?.querySelector('.mus-albums');
    const tile   = el?.querySelector('.mus-alb');
    const grab   = el?.querySelector('.mus-alb-grab');
    if (!albums || !tile) return;
    // A phone's sheet holds every cover and scrolls: it takes all the room
    // under the header, down to the screen's bottom
    // under the header, down to the screen's bottom — or as high as its
    // grabber was pulled (_wireMusAlbDrag)
    if (this._isNarrow) {
      const bodyR = el.querySelector('.mus-modal-body')?.getBoundingClientRect();
      if (!bodyR) return;
      // The description as long as it is, short of leaving no room for one
      // row of covers under it (above the dock, where the window runs on
      // under one); longer, it scrolls in its own box
      const desc = el.querySelector('.mus-full > .mus-overview');
      if (desc && !this._musDescH) {
        const under = el.classList.contains('hdr-full')
          ? parseFloat(getComputedStyle(this).getPropertyValue('--arr-bottom-bar')) || 0 : 0;
        const row = (grab?.getBoundingClientRect().height || 0) + 8 + tile.getBoundingClientRect().height + 12 + under;
        desc.style.maxHeight = 'none';
        const full = desc.scrollHeight;
        const room = Math.round(bodyR.bottom - desc.getBoundingClientRect().top - 15 - row);
        const h = Math.max(34, Math.min(full, room));
        desc.style.maxHeight = `${h}px`;
        desc.style.overflowY = full > h ? 'auto' : 'hidden';
        this._musDescH = h;
      }
      const headR = el.querySelector('.mus-content')?.getBoundingClientRect();
      if (!headR) return;
      // A phone: the covers in one row, scrolled sideways, until the sheet
      // has the whole window — then a grid, scrolled down
      albums.classList.toggle('mus-row', !!this._isMob && !this._musSheetUp && !(this._musSheetRows > 1));
      this._musWireRowScroll(albums);
      const rowH = this._isMob ? this._musAlbRowH(el) : null;
      let rows = Math.max(1, this._musSheetRows || 1);
      const g = this._musAlbGeom;
      // Opening (nothing dragged yet): as many whole rows as the room under
      // the header and the description takes — an artist with no description
      // shows several rows at once, the grid
      if (this._isMob && !this._musSheetUp && !this._musSheetRows && rowH && g) {
        const descB = el.querySelector('.mus-full')?.getBoundingClientRect().bottom || 0;
        const room = bodyR.bottom - Math.max(headR.bottom, descB) - 15;
        while (g.base + (rows + 1) * g.gridH + rows * 8 <= room && rows < 20) rows++;
        if (rows > 1) albums.classList.remove('mus-row');
      }
      const atRows = rows > 1 && g ? Math.round(g.base + rows * g.gridH + (rows - 1) * 8) : rowH;
      const h = this._musSheetUp ? this._musAlbMax(el)
        : this._isMob ? (rowH ? Math.min(this._musAlbMax(el) - 1, atRows) : Math.round(bodyR.bottom - headR.bottom - 15))
        : (this._musSheetH || Math.round(bodyR.bottom - headR.bottom - 15));
      if (h > 120) {
        this._musAlbPhoneH = Math.min(h, this._musAlbMax(el));
        albums.style.height = `${this._musAlbPhoneH}px`;
      }
      albums.classList.add('is-sized');
      return;
    }
    const rowGap = this._isMob ? 8 : 12;   // .mus-alb-grid
    const chrome = (grab?.getBoundingClientRect().height || 0) + 8 + this._musSheetPad(albums);   // grabber, its margin, the sheet's own padding
    // Two rows of covers by default. With the transport in the header there is
    // one line more to clear, and the sheet would sit over the buttons — so a
    // track opened from Now Playing gets a single row. Not on a phone, whose
    // window is tall enough for two under the transport: the one row left
    // half of it empty. The cap below keeps the sheet off the buttons anyway.
    const rows = this._musicModal?.stream && !this._isMob ? 1 : 2;
    const tileH = tile.getBoundingClientRect().height;
    // Desktop: the modal grows to hold the header and the rows under it, so
    // the discography opens beneath the artist instead of over the portrait
    // and the facts line. Kept on the card so every repaint, and the album
    // modal opened from here, carry the same height.
    const glass = el.querySelector('.popup-glass');
    const head  = el.querySelector('.mus-content');
    if (glass && head && window.innerWidth > 1400) {
      const sheet = Math.round(tileH * rows + rowGap * (rows - 1) + chrome);
      const headBottom = head.getBoundingClientRect().bottom - glass.getBoundingClientRect().top;
      const total = Math.min(Math.round(window.innerHeight * 0.85), Math.round(headBottom + 15 + sheet));
      if (total > glass.getBoundingClientRect().height) {
        this._musGlassH = total;
        glass.style.height = `${total}px`;
      }
    }
    const max = this._musAlbMax(el);
    // The sheet opens 15px under the header, never on it: the portrait, the
    // facts line and the chips stay clear however many albums there are. A
    // drag can still take it higher — that limit is _musAlbMax's.
    const bodyR = el.querySelector('.mus-modal-body')?.getBoundingClientRect();
    const headR = head?.getBoundingClientRect();
    const cap = (bodyR && headR) ? Math.min(max, Math.round(bodyR.bottom - headR.bottom - 15)) : max;
    // Tablet: two rows are worth smaller covers. The tiles shrink until both
    // fit under the header, rather than the sheet dropping to a single row —
    // and the width they give up goes to another column, so the row stays
    // full edge to edge instead of four small covers with gaps either side.
    let tH = tileH;
    const grid = el.querySelector('.mus-alb-grid');
    const tablet = window.innerWidth > 600 && window.innerWidth <= 1400;
    if (grid && tablet && rows > 1 && tileH * rows + rowGap * (rows - 1) + chrome > cap) {
      const w = tile.getBoundingClientRect().width;
      const under = tileH - w;   // the status stripe below the square cover
      const maxW = Math.max(96, Math.floor((cap - chrome - rowGap * (rows - 1)) / rows - under));
      const gridW = grid.getBoundingClientRect().width;
      const cols = Math.min(8, Math.ceil((gridW + rowGap) / (maxW + rowGap)));
      if (maxW < w && cols > 4) {
        this._musAlbCols = cols;
        grid.style.setProperty('--mus-alb-cols', cols);
        tH = tile.getBoundingClientRect().height;
      }
    }
    // Whole rows only: a height that leaves half a cover showing is what the
    // phone was doing, and a cut-off row reads as a mistake rather than as more
    // to scroll to.
    const fit = Math.max(1, Math.floor((cap - chrome + rowGap) / (tH + rowGap)));
    const want = Math.min(rows, fit);
    const h = Math.round(tH * want + rowGap * (want - 1) + chrome);
    this._musAlbH = Math.max(120, Math.min(cap, h));
    albums.style.height = `${this._musAlbH}px`;
  }

  // A phone's covers sheet holding one row: its chevron, the row and the
  // padding under it (the dock's height, where there is one). A row's cover
  // is .85 of a grid's, so the next one shows at the edge.
  _musAlbRowH(el) {
    const sheet = el?.querySelector('.mus-albums');
    const list = sheet?.querySelector('.mus-alb-scroll');
    const tile = list?.querySelector('.mus-alb');
    if (!tile) return null;
    const t = tile.getBoundingClientRect();
    const under = t.height - t.width;   // the status stripe below the square cover
    const inRow = sheet.classList.contains('mus-row');
    const w = inRow ? t.width : t.width * 0.85;
    const wGrid = inRow ? t.width / 0.85 : t.width;
    const sR = sheet.getBoundingClientRect(), lR = list.getBoundingClientRect();
    const cs = getComputedStyle(list);
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const base = (lR.top - sR.top) + pad + Math.max(0, sR.bottom - lR.bottom);
    // Two rows and more are the grid's covers (a stop a row: _wireMusSheetDrag)
    this._musAlbGeom = { base, gridH: wGrid + under };
    const row = Math.round(base + w + under);
    this._musAlbRowPx = row;
    return row;
  }

  // How many rows of covers a phone's sheet shows at a height
  _musRowsAt(h) {
    const row = this._musAlbRowPx, g = this._musAlbGeom;
    if (!row || !g || h <= row + 1) return 1;
    return Math.max(2, Math.round((h - g.base + 8) / (g.gridH + 8)));
  }

  // A row scrolled sideways is the covers' own, not the window's swipe
  _musWireRowScroll(albums) {
    const list = albums?.querySelector('.mus-alb-scroll');
    if (!list || list._rowWired) return;
    list._rowWired = true;
    for (const ev of ['touchstart', 'touchmove']) list.addEventListener(ev, e => { if (albums.classList.contains('mus-row')) e.stopPropagation(); }, { passive: true, signal: this._musAbort?.signal });
  }

  // The sheet's padding above and below its covers, read from the sheet: under
  // a dock along the bottom of the screen it holds the dock's height too
  _musSheetPad(sheet) {
    const cs = sheet ? getComputedStyle(sheet) : null;
    const pad = cs ? (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) : 0;
    return pad || 18;
  }

  // A phone's chevron: the sheet to the window's top, or back where it opened.
  // In place, the height easing over (styles), nothing redrawn.
  _musSheetToggle(el, which) {
    sheetMoving(el.querySelector(which === 'alb' ? '.mus-albums' : '.mus-search'));
    // One state for both sheets: the covers raised stay raised for an
    // album's sources opened from them, and the other way round
    // A tap on the pill: from where the sheet opened, to the top; from
    // anywhere else (raised, or dragged up or down a few rows), back to
    // where it opened
    const atDefault = !this._musSheetUp && !this._musSheetH && !(this._musSheetRows > 1);
    this._musSheetUp = atDefault;
    this._musSheetH = null;
    this._musSheetRows = 0;
    if (which === 'alb') this._musFitAlbums(el); else this._musSizePanel(el);
    const up = this._musSheetUp;
    const btn = el.querySelector(`[data-mus-sheet-toggle="${which}"]`);
    if (btn) { btn.innerHTML = this._musChevSvg(up); btn.setAttribute('aria-label', up ? 'Down' : 'Up'); }
  }

  // A phone's sheet (the covers, or an album's sources) dragged by its pill a
  // row at a time while held, to no less than one row; the height holds for
  // the other sheet too. A tap on the pill goes to the top and back.
  _wireMusSheetDrag(el, which) {
    const sheet = el.querySelector(which === 'alb' ? '.mus-albums' : '.mus-search');
    const list = sheet?.querySelector(which === 'alb' ? '.mus-alb-scroll' : '.sn-seasons-rows');
    const pill = sheet?.querySelector('[data-mus-sheet-toggle]');
    if (!sheet || !pill) return;
    wireSheetPill(pill, {
      getH: () => sheet.getBoundingClientRect().height,
      setH: (h, ease) => {
        if (ease) sheetMoving(sheet);
        sheet.style.height = `${h}px`;
        // A phone's covers: rows sideways short of the whole window
        if (which === 'alb' && this._isMob) sheet.classList.toggle('mus-row', h <= (this._musAlbRowPx ?? Infinity) + 1);
      },
      metrics: () => {
        const max = this._musAlbMax(el);
        // A phone's covers: two places only, one row or the whole window
        if (which === 'alb' && this._isMob) {
          const row = Math.min(max, this._musAlbRowH(el) || max);
          // A row at a time, up and down, however many albums there are:
          // one row sideways, from two the grid scrolled down
          const g = this._musAlbGeom;
          const stops = [row];
          for (let k = 2; g; k++) {
            const h = Math.round(g.base + k * g.gridH + (k - 1) * 8);
            if (h >= max - g.gridH / 2) break;
            stops.push(h);
          }
          stops.push(max);
          return { min: row, max, stops };
        }
        const item = list?.querySelector(which === 'alb' ? '.mus-alb' : '.sn-season-row');
        const itemH = item?.getBoundingClientRect().height || 120;
        const pad = list ? parseFloat(getComputedStyle(list).paddingBottom) || 0 : 0;
        const chrome = sheet.getBoundingClientRect().height - (list?.clientHeight || 0);
        return { step: itemH + (which === 'alb' ? 8 : 4), min: Math.round(chrome + itemH + pad), max };
      },
      done: (h, m) => {
        this._musSheetUp = h >= m.max - 1;
        this._musSheetH = this._musSheetUp || m.stops ? null : h;
        // A phone's covers keep how many rows (re-measured on a repaint)
        if (m.stops) this._musSheetRows = this._musSheetUp ? 0 : this._musRowsAt(h);
        this._musAlbPhoneH = h;
        if (which === 'search') this._musPanelH = h;
        pill.setAttribute('aria-label', this._musSheetUp ? 'Down' : 'Up');
      },
    });
  }

  // As far up as the backdrop, which is where the sources panel stops too.
  // A phone's sheet goes on over the picture to the window's top: its covers
  // scroll, and pulled up they have the whole window.
  _musAlbMax(el) {
    const body = el?.querySelector('.mus-modal-body');
    const back = el?.querySelector('.mus-backdrop');
    if (!body) return 400;
    const bottom = body.getBoundingClientRect().bottom;
    const glass = el.querySelector('.popup-glass');
    if (this._isNarrow && glass) return Math.max(160, Math.round(bottom - glass.getBoundingClientRect().top));
    const top = back?.getBoundingClientRect().bottom ?? body.getBoundingClientRect().top;
    return Math.max(160, Math.round(bottom - top));
  }

  // The grabber the sources panel has, on the discography — applied inline
  // while dragging for the same reason: repainting a page of covers on every
  // pointer move is what makes it feel sticky.
  // Re-lays the covers for a new row count without repainting the modal — the
  // grabber is mid-drag and a full repaint would take it out from under the
  // pointer. The first cover on screen stays on the page that is shown.
  _musRelayAlbums(el, rows) {
    const m = this._musicModal;
    const wrap = el?.querySelector('.mus-alb-wrap');
    if (!m || !wrap) return;
    const first = (m.albPage || 0) * Math.max(2, (m.cols || 4) * (m.rows || 2));
    m.rows = rows;
    m.albPage = Math.floor(first / Math.max(2, (m.cols || 4) * rows));
    wrap.outerHTML = this._musicAlbumsHtml();
    this._wireMusSwipe(el);
  }

  _wireMusAlbDrag(el) {
    const handle = el.querySelector('[data-mus-alb-handle]');
    const panel = el.querySelector('.mus-albums');
    // A phone's scrolled covers keep their swipes: pulled down at their top,
    // the pop-up under them closed instead
    const list = panel?.querySelector('.mus-alb-scroll');
    if (list) {
      list.addEventListener('touchstart', e => e.stopPropagation(), { passive: true, signal: this._musAbort?.signal });
      list.addEventListener('touchmove', e => e.stopPropagation(), { passive: true, signal: this._musAbort?.signal });
    }
    if (!handle || !panel) return;
    this._musGrabOwnTouch(handle);
    handle.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const startY = ev.clientY;
      const startH = panel.getBoundingClientRect().height;
      const max = this._musAlbMax(el);
      // A phone's covers scroll: the sheet follows the finger freely, up to
      // the picture, and the list inside it scrolls at whatever height it is
      if (this._isNarrow) {
        handle.classList.add('is-dragging');
        handle.setPointerCapture(ev.pointerId);
        const move = e => {
          const h = Math.round(Math.min(max, Math.max(160, startH - (e.clientY - startY))));
          panel.style.height = `${h}px`;
          this._musAlbMobH = h;
        };
        const up = () => {
          handle.classList.remove('is-dragging');
          try { handle.releasePointerCapture(ev.pointerId); } catch (_) {}
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        return;
      }
      // Snapped to whole rows while dragging. Free-running, the sheet shrank
      // faster than the covers inside it could be re-laid out, so the grabber
      // slid in behind a row and there was nothing left to take hold of.
      const tileH = el.querySelector('.mus-alb')?.getBoundingClientRect().height || 0;
      const gap = this._isMob ? 8 : 12;
      const chrome = (handle.getBoundingClientRect().height || 0) + 8 + this._musSheetPad(panel);
      const snap = raw => {
        if (!tileH) return Math.max(120, raw);
        const rows = Math.max(1, Math.round((raw - chrome + gap) / (tileH + gap)));
        return Math.round(chrome + rows * tileH + gap * (rows - 1));
      };
      const rowsOf = h => tileH
        ? Math.max(1, Math.round((h - chrome + gap) / (tileH + gap)))
        : null;
      let liveRows = null;
      handle.classList.add('is-dragging');
      handle.setPointerCapture(ev.pointerId);
      const move = e => {
        const raw = startH - (e.clientY - startY);
        const h = Math.round(Math.min(max, Math.max(120, snap(raw))));
        panel.style.height = `${h}px`;
        this._musAlbH = h;
        // The covers follow the sheet while it is still held: once the height
        // crosses a row, the page is re-laid for that many rows. Left for the
        // drop, a one-row sheet showed half of each of the two rows.
        const rows = rowsOf(h);
        if (rows && rows !== (liveRows ?? this._musicModal?.rows)) {
          liveRows = rows;
          this._musRelayAlbums(el, rows);
        }
      };
      const up = () => {
        handle.classList.remove('is-dragging');
        try { handle.releasePointerCapture(ev.pointerId); } catch (_) {}
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        // The drag already settled the row count, so the repaint keeps it —
        // clearing it here let the page jump once the default was re-measured.
        const m = this._musicModal;
        if (m) m.rows = liveRows ?? null;
        this._renderMusicModalEl();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    }, { signal: this._musAbort?.signal });
  }

}

export const wireMusicLayoutMixin = _WireMusicLayoutMethods.prototype;
