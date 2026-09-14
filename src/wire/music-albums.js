// Music, one album: its modal, opening it from the artist or the calendar. Split out of wire/music.js.

class _WireMusicAlbumsMethods {

  async _openAlbumModal(album) {
    if (!album?.id) return;
    if (this._calendarModalOpen) {
      this._albumCalReturn = true;
      this._calendarModalOpen = false;
      this._renderCalendarModalEl();
    }
    const artist = this._lidarrArtists?.get(album.artistId) || album.artist || {};
    this._albumModal = { albumId: album.id, album, artist, tracks: null };
    this._renderAlbumModalEl();
    try {
      const list = await this._callApi('GET', `arr_stack/lidarr/tracks?albumId=${album.id}`);
      if (this._albumModal?.albumId !== album.id) return;
      this._albumModal.tracks = Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('[arr-card] Lidarr tracks failed:', e);
      if (this._albumModal?.albumId === album.id) this._albumModal.tracks = [];
    }
    this._renderAlbumModalEl();
  }

  // The record the tile was drawn from, wherever it came from — the row's
  // calendar or the modal's own window.
  // A calendar tile is an album, but what the reader wants behind it is the
  // artist — the discography, the monitoring, the search. The album detail is
  // still one click further in, from its own row.
  _openCalAlbumArtist(albumId) {
    const album = this._calAlbumById(albumId);
    const artistId = album?.artistId || album?.artist?.id;
    if (artistId) this._openMusicModal(Number(artistId));
    else if (album) this._openAlbumModal(album);
  }

  _calAlbumById(id) {
    return (this._calendar || []).find(e => e._mediaType === 'music' && e.id === id)
        || (this._calendarModalData || []).find(e => e._mediaType === 'music' && e.id === id)
        || null;
  }

  _closeAlbumModal() {
    this._albumModal = null;
    this._renderAlbumModalEl();
    if (this._albumCalReturn) {
      this._albumCalReturn = false;
      this._calendarModalOpen = true;
      this._renderCalendarModalEl();
    }
  }

  _renderAlbumModalEl() {
    const root = this.shadowRoot;
    if (!root) return;
    root.querySelector('[data-album-modal]')?.remove();
    if (!this._albumModal) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = this._albumModalHtml();
    const el = wrap.firstElementChild;
    if (!el) return;
    root.appendChild(el);
    el.addEventListener('click', e => {
      if (e.target.closest('[data-album-close]') || e.target === el) {
        this._closeAlbumModal();
      }
    });
  }

  async _musOpenAlbum(albumId) {
    const m = this._musicModal;
    if (!m || !albumId) return;
    if (!m.search) {
      m.search = { mode: 'is', searched: new Set(), grabbed: new Set() };
      m.menu = null;
    } else {
      m.search.mode = 'is';
    }
    await this._musPickAlbum(albumId);
    // Bring the row into view — with a long discography it can be well down the
    // list, and an opened panel below an unseen row reads as nothing happening.
    requestAnimationFrame(() => {
      const row = this.shadowRoot
        ?.querySelector(`[data-music-modal] [data-album-row="${albumId}"]`);
      row?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  async _musPickAlbum(albumId) {
    const m = this._musicModal;
    const sp = m?.search;
    if (!sp || !albumId) return;
    const album = (m.albums || []).find(a => a.id === albumId);

    if (sp.mode === 'as') {
      // Auto Search hands the album to Lidarr and lets it choose — the row just
      // reports that it went, the way the series panel does.
      sp.busyAlbum = albumId;
      this._renderMusicModalEl();
      try {
        await this._callApi('POST', 'arr_stack/lidarr/command', { name: 'AlbumSearch', albumIds: [albumId] });
        sp.searched = sp.searched || new Set();
        sp.searched.add(albumId);
      } catch (e) {
        console.error('[arr-card] Lidarr album search error:', e);
      }
      sp.busyAlbum = null;
      this._renderMusicModalEl();
      return;
    }

    // Pressing the same album again rolls the sources back up, the way the
    // button reads — it is a toggle, not a re-run.
    if (sp.albumId === albumId) {
      sp.albumId = null;
      sp.state = null;
      sp.results = [];
      this._renderMusicModalEl();
      return;
    }
    sp.state = 'loading';
    sp.albumId = albumId;
    sp.albumTitle = album?.title || '';
    this._renderMusicModalEl();
    try {
      const res = await this._callApi('GET', `arr_stack/lidarr/release?albumId=${albumId}`);
      if (this._musicModal?.search !== sp) return;
      sp.results = (Array.isArray(res) ? res : []).sort((a, b) =>
        (b.customFormatScore ?? 0) - (a.customFormatScore ?? 0) || (b.seeders ?? 0) - (a.seeders ?? 0));
      sp.state = 'results';
    } catch (e) {
      sp.state = 'error';
      sp.error = e?.body?.message || String(e?.error || e);
    }
    this._renderMusicModalEl();
  }

}

export const wireMusicAlbumsMixin = _WireMusicAlbumsMethods.prototype;
