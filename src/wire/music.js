import { normName } from '../shared/format.js';

// ──────────────────────────────────────────────────────────────────────────
// Music wire — artist card clicks and the artist modal
// ──────────────────────────────────────────────────────────────────────────

class _WireMusicMethods {

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
    if (stream) this._musLoadTrackQuality(stream);
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

  // A track is keyed by whatever its server keys it by: Plex by the rating key
  // it puts in media_content_id, Jellyfin and Emby by their item id.
  _musTrackKey(streamId) {
    const a = this._streamAttrOf(streamId) || {};
    return String(a.media_content_id || a._jfItemId || a._embyItemId || '');
  }

  // The format and bitrate of what is playing. Jellyfin and Emby carry it in
  // the session; Plex does not, so its track is read once by its rating key and
  // kept — a track does not change while it plays.
  async _musLoadTrackQuality(streamId) {
    if (!streamId) return;
    const a = this._streamAttrOf(streamId) || {};
    const key = this._musTrackKey(streamId);
    if (!key) return;
    this._musTrackQual = this._musTrackQual || new Map();
    if (this._musTrackQual.has(key)) return;
    if (a._audioCodec) {
      this._musTrackQual.set(key, { codec: a._audioCodec, bitrate: a._audioBitrate || 0 });
      if (this._musicModal?.stream === streamId) this._renderMusicModalEl();
      return;
    }
    // Only Plex numbers its tracks this way; anything else has nothing to ask.
    if (!/^\d+$/.test(key) || this._plexConfigured === false) return;
    const raw = await this._callApi('GET', `arr_stack/plex/metadata?ratingKey=${encodeURIComponent(key)}`)
      .catch(() => null);
    const media = raw?.MediaContainer?.Metadata?.[0]?.Media?.[0];
    if (!media?.audioCodec) return;
    this._musTrackQual.set(key, { codec: media.audioCodec, bitrate: media.bitrate || 0 });
    if (this._musicModal?.stream === streamId) this._renderMusicModalEl();
  }

  // A music stream's window, wherever the click came from: the artist's own
  // detail when the library holds them, the same window as a preview when it
  // does not. The bare stream popup is the last resort — a radio station with
  // no artist at all still has to open something.
  async _musOpenForStream(streamId, title = '') {
    const hit = this._musStreamArtist(streamId);
    if (hit) { this._openMusicModal(hit.id, { stream: streamId }); return; }
    const name = String((this._streamAttrOf(streamId) || {}).media_artist || '').trim();
    const mbid = name ? await this._musLookupUnowned(name) : null;
    if (mbid) { this._openMusicPreview(mbid, { stream: streamId }); return; }
    this._openStreamPopup(streamId, 'music', title || (this._streamAttrOf(streamId) || {}).media_title || '', '', { bare: true });
  }

  async _musFollowStream(streamId) {
    const m = this._musicModal;
    if (!m || m.stream !== streamId) return;
    this._musLoadTrackQuality(streamId);
    const hit = this._musStreamArtist(streamId);
    if (hit) {
      if (hit.id !== m.artistId) this._openMusicModal(hit.id, { stream: streamId });
      else this._renderMusicModalEl();
      return;
    }
    // Nobody in the library by that name. The window stays what it is — the
    // preview every unowned artist gets, with their albums from MusicBrainz
    // and the button that adds them — rather than dropping to a bare stream.
    const name = String((this._streamAttrOf(streamId) || {}).media_artist || '').trim();
    const mbid = name ? await this._musLookupUnowned(name) : null;
    // The track may have moved on again while Lidarr was being asked
    if (this._musicModal?.stream !== streamId) return;
    if (mbid) { this._openMusicPreview(mbid, { stream: streamId }); return; }
    this._renderMusicModalEl();
  }

  // An artist by name, as Lidarr's own search knows them. Kept where the
  // preview window looks an artist up, since that is what will ask for it.
  async _musLookupUnowned(name) {
    const ask = async term => {
      const list = await this._callApi('GET', `arr_stack/lidarr/lookup?term=${encodeURIComponent(term)}`)
        .catch(() => []);
      return Array.isArray(list) ? list : [];
    };
    const want = normName(name);
    // Players write a name their own way — Plexamp sends JAŸ‐Z for JAY-Z — and
    // a search on that spelling finds nothing. The plain letters are asked for
    // as well before giving up.
    let rows = await ask(name);
    if (!rows.length && want && want !== name.toLowerCase()) rows = await ask(want);
    // The name has to match: a player naming an artist the search cannot place
    // is better left alone than answered with whoever came first.
    const hit = rows.find(x => normName(x.artistName) === want);
    const mbid = hit?.foreignArtistId || null;
    if (!mbid) return null;
    this._musStreamArtists = this._musStreamArtists || new Map();
    this._musStreamArtists.set(String(mbid).toLowerCase(), hit);
    return mbid;
  }

  _musQueueSig() {
    const m = this._musicModal;
    if (!m) return '';
    const albums = (m.albums || [])
      .map(a => `${a.id}:${this._lidarrQueue?.has(a.id) ? 1 : 0}:${this._lidarrQueuePct?.get(a.id) ?? ''}`)
      .join(',');
    return `${this._lidarrQueueArtists?.get(m.artistId) ?? ''}|${albums}`;
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
    // The same seek bar the popups use, so it is dragged the same way: the
    // artist window only ever had the click, and a finger on the bar moved
    // nothing.
    this._ppWireSeekDrag(el);

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
      // Same three-state cycle the film table uses: down, up, off.
      const sortTh = e.target.closest('[data-mus-issort]');
      if (sortTh) {
        e.stopPropagation();
        const sp = this._musicModal?.search;
        if (!sp) return;
        const c = sortTh.dataset.musIssort;
        const cur = sp.sort || {};
        sp.sort = cur.col !== c ? { col: c, dir: -1 }
                : cur.dir === -1 ? { col: c, dir: 1 }
                : {};
        this._renderMusicModalEl();
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
