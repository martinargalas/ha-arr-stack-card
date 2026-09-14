// ──────────────────────────────────────────────────────────────────────────
// Music wire — artist card clicks and the artist modal
// ──────────────────────────────────────────────────────────────────────────

class _WireMusicMethods {

  // Delegated on col-right, which survives every re-render of the sections
  // inside it — a listener on the cards themselves would be lost on the next
  // repaint, which is how this row lost its clicks the first time round.
  _wireMusicCards(right) {
    if (!right || right._musicWired) return;
    right._musicWired = true;
    right.addEventListener('click', e => {
      const albumCard = e.target.closest('[data-album-cal]');
      if (albumCard) {
        e.stopPropagation();
        this._openCalAlbumArtist(Number(albumCard.dataset.albumCal));
        return;
      }
      const likeOl = e.target.closest('.mus-like-ol');
      if (likeOl) {
        e.stopPropagation();
        this._musDropSuggestion(likeOl.dataset.musMbid, 'like', likeOl.closest('.mc'));
        return;
      }
      const skipOl = e.target.closest('.mus-skip-ol');
      if (skipOl) {
        e.stopPropagation();
        this._musDropSuggestion(skipOl.dataset.musMbid, 'skip', skipOl.closest('.mc'));
        return;
      }
      const addBtn = e.target.closest('[data-mus-add]');
      if (addBtn) {
        e.stopPropagation();
        // Which row it was pressed in decides where the overlay is drawn.
        const inSearch = !!addBtn.closest('.search-results-wrap');
        this._musOpenAdd(addBtn.dataset.musAdd, inSearch ? 'search' : 'lastfm');
        return;
      }
      if (e.target.closest('.mus-add-cancel')) {
        e.stopPropagation();
        const src = this._musAddPending?.source;
        const mbid = String(this._musAddPending?.artist?.foreignArtistId || '').toLowerCase();
        this._musAddPending = null;
        if (src === 'lastfm') this._reRenderSection('recommendations');
        else this._reRenderSearchResults();
        const hit = mbid ? [...(this._lidarrArtists?.values() || [])]
          .find(a => String(a.foreignArtistId || '').toLowerCase() === mbid) : null;
        if (hit?.id && this._musicModal?.preview === mbid) this._openMusicModal(hit.id);
        this._musScheduleLastfmRefresh();
        return;
      }
      if (e.target.closest('.mus-add-confirm')) {
        e.stopPropagation();
        this._musConfirmAdd();
        return;
      }
      const unowned = e.target.closest('[data-artist-unowned]');
      if (unowned) {
        e.stopPropagation();
        this._openMusicPreview(unowned.dataset.artistUnowned);
        return;
      }
      const card = e.target.closest('.mc-music[data-artist-id]');
      if (!card) return;
      e.stopPropagation();
      this._openMusicModal(Number(card.dataset.artistId), { stream: card.dataset.streamEntity || null });
    });
  }

  async _openMusicModal(artistId, { stream = null } = {}) {
    if (!artistId) return;
    this._markActivated();
    const artist = this._lidarrArtists?.get(artistId)
                || (this._lidarrArtistFeed || []).find(e => e.id === artistId)?.artist
                || null;
    if (!artist) return;

    this._musPanelH = null;
    this._musDescH = null;
    this._musAlbH = null;   // measured on the first paint of this artist
    this._musGlassH = null;
    this._musAlbCols = null;
    this._musQueueSigLast = null;
    this._musicModal = { artistId, artist, albums: [], loading: true, stream };
    // No picture from Lidarr: Deezer's stand-in is asked for ahead of the rest.
    if (!(artist.images || []).some(i => i.coverType === 'poster')) this._altArtPrioritize(artist.foreignArtistId);
    this._renderMusicModalEl();

    // The artist attached to an album carries no overview and no statistics, so
    // the detail asks Lidarr for the full record rather than making do.
    const [full, albums] = await Promise.all([
      this._fetchLidarrArtist(artistId),
      this._fetchLidarrDiscography(artistId),
      this._fetchLidarrQueue(),
    ]);
    if (full && this._musicModal?.artistId === artistId) this._musicModal.artist = full;
    // The modal may have been closed, or another artist opened, while the
    // discography was in flight.
    if (this._musicModal?.artistId !== artistId) return;
    this._musicModal.albums = albums;
    this._musicModal.loading = false;
    this._renderMusicModalEl();
  }

  // A deleted artist is still sitting in every list the card holds — the
  // library grid, Recently Requested, the recently added row, the queue tally,
  // the Last.fm card marked as added — and the next poll is minutes away. Drop
  // it from all of them at once rather than leaving posters that 404 on click.
  _musForgetArtist(id) {
    this._lidarrArtists?.delete(id);
    this._lidarrArtistFeed = (this._lidarrArtistFeed || []).filter(e => e.id !== id);
    this._lidarrQueueArtists?.delete(id);
    for (const [mbid, row] of (this._musAddedEntries || new Map())) {
      if ((row?.artist?.id ?? row?.id) === id) {
        this._musAddedEntries.delete(mbid);
        this._musAdded?.delete(mbid);
      }
    }
    // One call: the whole right column is rebuilt, so every music section in it
    // — Recently Requested included — comes back without the artist.
    this._reRenderSection?.('recentlyAdded');
    const libEl = this.shadowRoot?.querySelector('[data-lib-modal]');
    if (libEl && this._libModal) this._libRerenderBody?.(libEl);
  }

  _musQueueSig() {
    const m = this._musicModal;
    if (!m) return '';
    const albums = (m.albums || [])
      .map(a => `${a.id}:${this._lidarrQueue?.has(a.id) ? 1 : 0}:${this._lidarrQueuePct?.get(a.id) ?? ''}`)
      .join(',');
    return `${this._lidarrQueueArtists?.get(m.artistId) ?? ''}|${albums}`;
  }

  _closeMusicModal() {
    this._musQueueSigLast = null;
    this._musicModal = null;
    this.shadowRoot?.querySelector('[data-music-modal]')?.remove();
  }

  _renderMusicModalEl() {
    const root = this.shadowRoot;
    if (!root) return;
    // The element is rebuilt wholesale, so anything the user had scrolled to
    // would jump back to the top — expanding one album should not move the rest.
    const prev = root.querySelector('[data-music-modal]');
    const keepScroll = prev?.querySelector('.sn-seasons-rows')?.scrollTop || 0;
    prev?.remove();
    if (!this._musicModal) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = this._musicModalHtml();
    const el = wrap.firstElementChild;
    if (!el) return;
    root.appendChild(el);

    if (keepScroll) {
      const rows = el.querySelector('.sn-seasons-rows');
      if (rows) rows.scrollTop = keepScroll;
    }

    requestAnimationFrame(() => {
      this._musPositionMenu(el);
      this._musSizePanel(el);
      this._musFitAlbums(el);
      this._musMeasureCols(el);
    });
    this._wireMusPanelDrag(el);
    this._wireMusAlbDrag(el);
    this._wireMusSwipe(el);


    el.addEventListener('click', e => {
      const menuBtn = e.target.closest('[data-mus-menu]');
      if (menuBtn) {
        e.stopPropagation();
        const kind = menuBtn.dataset.musMenu;
        // With the sources open, Search closes them rather than offering the
        // choice again — the button is the panel's own switch.
        if (kind === 'search' && this._musicModal.search) {
          this._musicModal.search = null;
          this._musicModal.menu = null;
        } else {
          this._musicModal.menu = this._musicModal.menu === kind ? null : kind;
          if (!this._musicModal.menu) this._musicModal.menuSub = null;
        }
        this._renderMusicModalEl();
        return;
      }
      const act = e.target.closest('[data-mus-act]');
      if (act) {
        e.stopPropagation();
        this._musAction(act.dataset.musAct);
        return;
      }
      // The same shortcut from a preview: the artist has to exist first, so it
      // asks the way the search pill does and picks the album up afterwards.
      const prevTile = e.target.closest('[data-mus-prev-album]');
      if (prevTile) {
        e.stopPropagation();
        const m = this._musicModal;
        if (!m?.preview) return;
        m.search = {
          mode: 'is', confirmAdd: true, wantAlbum: prevTile.dataset.musPrevAlbum,
          searched: new Set(), grabbed: new Set(),
        };
        this._renderMusicModalEl();
        return;
      }
      // A cover in the grid is a shortcut into the sources panel: same list, same
      // row, already searching — rather than a second surface with the same
      // actions on it.
      const tile = e.target.closest('.mus-alb[data-album-id]');
      if (tile) {
        e.stopPropagation();
        this._musOpenAlbum(Number(tile.dataset.albumId));
        return;
      }
      const pg = e.target.closest('[data-mus-page]');
      if (pg) {
        e.stopPropagation();
        const dir = pg.dataset.musPage === 'next' ? 1 : -1;
        this._musicModal.albPage = Math.max(0, (this._musicModal.albPage || 0) + dir);
        this._renderMusicModalEl();
        return;
      }
      const exp = e.target.closest('[data-mus-expand]');
      if (exp) {
        e.stopPropagation();
        this._musToggleTracks(Number(exp.dataset.musExpand));
        return;
      }
      const delBtn = e.target.closest('[data-mus-del]');
      if (delBtn) {
        e.stopPropagation();
        this._musicModal.search.delConfirm = Number(delBtn.dataset.musDel);
        this._renderMusicModalEl();
        return;
      }
      if (e.target.closest('[data-mus-del-no]')) {
        e.stopPropagation();
        this._musicModal.search.delConfirm = null;
        this._renderMusicModalEl();
        return;
      }
      const delYes = e.target.closest('[data-mus-del-yes]');
      if (delYes) {
        e.stopPropagation();
        this._musDeleteFiles(Number(delYes.dataset.musDelYes));
        return;
      }
      // The bookmark beside the artist's name — where monitoring is turned off
      // now that the Actions menu no longer carries it.
      // Transport for a track opened from Now Playing. The stream popup's own
      // handlers live on its glass, which this modal is not inside.
      const strBtn = e.target.closest('[data-action^="stream-"]');
      if (strBtn) {
        e.stopPropagation();
        this._musStreamAction(strBtn, e);
        return;
      }
      const artistMon = e.target.closest('.mus-mon');
      if (artistMon) {
        e.stopPropagation();
        this._musToggleArtist();
        return;
      }
      const castBtn = e.target.closest('[data-mus-cast]');
      if (castBtn) {
        e.stopPropagation();
        this._musCast(castBtn.dataset.musCast);
        return;
      }
      const mon = e.target.closest('[data-mus-mon]');
      if (mon) {
        e.stopPropagation();
        this._musToggleAlbum(Number(mon.dataset.musMon));
        return;
      }
      const pick = e.target.closest('[data-mus-album]');
      if (pick) {
        e.stopPropagation();
        this._musPickAlbum(Number(pick.dataset.musAlbum));
        return;
      }
      const grab = e.target.closest('[data-mus-grab]');
      if (grab) {
        e.stopPropagation();
        this._musGrab(grab.dataset.musGrab);
        return;
      }
      if (e.target.closest('[data-music-close]') || e.target === el) {
        this._closeMusicModal();
        // Straight back to the library, on the page and filter it was left on.
        this._popupReturn?.();
        return;
      }
      // Nothing above claimed the click, so it landed on the modal itself. With
      // the sources sheet up, that is the way back to the discography — bar the
      // sheet and its grabber, where a click belongs to the sheet.
      if (this._musicModal?.search
          && !e.target.closest('.mus-search')
          && !e.target.closest('[data-mus-grab-handle]')) {
        this._musCloseSearch();
      }
    });
  }

  // The sheet drops out of sight before the state changes, so the discography
  // appears once it is gone rather than behind it mid-animation.
  _musCloseSearch() {
    const panel = this.shadowRoot?.querySelector('[data-music-modal] .mus-search');
    const done = () => {
      if (!this._musicModal) return;
      this._musicModal.search = null;
      this._renderMusicModalEl();
    };
    if (!panel) { done(); return; }
    panel.classList.add('mus-fall');
    setTimeout(done, 200);
  }

}

export const wireMusicMixin = _WireMusicMethods.prototype;
