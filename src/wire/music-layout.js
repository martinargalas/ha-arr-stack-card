// Music, the artist modal's layout: swipe, the panel and album grabbers, fitting the albums. Split out of wire/music.js.

class _WireMusicLayoutMethods {

  // Same gesture and threshold the poster rows use, so paging the covers feels
  // like paging anything else in the card.
  _wireMusSwipe(el) {
    const wrap = el?.querySelector('.mus-alb-wrap');
    if (!wrap) return;
    const THRESHOLD = 40;
    let startX = null;
    wrap.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true });
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
    }, { passive: true });
  }

  // How many covers fit across is a layout answer, not a guess: read it from the
  // grid the browser has just laid out, and only redraw if the page size changed.
  _musMeasureCols(el) {
    const grid = el?.querySelector('.mus-alb-grid');
    const tile = el?.querySelector('.mus-alb');
    const m = this._musicModal;
    if (!grid || !m) return;
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
  _wireMusPanelDrag(el) {
    const handle = el.querySelector('[data-mus-grab-handle]');
    const panel = el.querySelector('.mus-search');
    if (!handle || !panel) return;
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
    });
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
    const rowGap = this._isMob ? 8 : 12;   // .mus-alb-grid
    const chrome = (grab?.getBoundingClientRect().height || 0) + 8 + 18;   // grabber, its margin, the sheet's own padding
    // Two rows of covers by default. With the transport in the header there is
    // one line more to clear, and the sheet would sit over the buttons — so a
    // track opened from Now Playing gets a single row.
    const rows = this._musicModal?.stream ? 1 : 2;
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

  // As far up as the backdrop, which is where the sources panel stops too.
  _musAlbMax(el) {
    const body = el?.querySelector('.mus-modal-body');
    const back = el?.querySelector('.mus-backdrop');
    if (!body) return 400;
    const bottom = body.getBoundingClientRect().bottom;
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
    if (!handle || !panel) return;
    handle.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const startY = ev.clientY;
      const startH = panel.getBoundingClientRect().height;
      const max = this._musAlbMax(el);
      // Snapped to whole rows while dragging. Free-running, the sheet shrank
      // faster than the covers inside it could be re-laid out, so the grabber
      // slid in behind a row and there was nothing left to take hold of.
      const tileH = el.querySelector('.mus-alb')?.getBoundingClientRect().height || 0;
      const gap = this._isMob ? 8 : 12;
      const chrome = (handle.getBoundingClientRect().height || 0) + 8 + 18;
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
    });
  }

}

export const wireMusicLayoutMixin = _WireMusicLayoutMethods.prototype;
