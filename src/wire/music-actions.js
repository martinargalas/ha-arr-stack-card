// Music, what the modal's buttons do: monitoring, grabbing, deleting, tracks, casting, the menu. Split out of wire/music.js.

class _WireMusicActionsMethods {

  // Monitoring, from the bookmark. Lidarr wants the whole record back rather
  // than a patch, the same as the menu entry that used to do this.
  async _musToggleArtist() {
    const m = this._musicModal;
    if (!m?.artist) return;
    this._markActivated();
    const next = { ...m.artist, monitored: !m.artist.monitored };
    m.artist = next;
    this._renderMusicModalEl();
    try {
      await this._callApi('PUT', `arr_stack/lidarr/artist/${m.artistId}`, next);
    } catch (e) {
      console.error('[arr-card] Lidarr monitor error:', e);
      if (this._musicModal?.artistId === m.artistId) {
        this._musicModal.artist = { ...next, monitored: !next.monitored };
        this._renderMusicModalEl();
      }
      return;
    }
    const full = await this._fetchLidarrArtist(m.artistId);
    if (full && this._musicModal?.artistId === m.artistId) {
      this._musicModal.artist = full;
      this._renderMusicModalEl();
    }
  }

  // The library, on Music, on the page this artist is actually on — the same
  // trip Show in library makes for a film.
  _musShowInLibrary() {
    const id = this._musicModal?.artistId;
    this._closeMusicModal();
    this._libReturnState = null;
    this._openLibModal('music');
    const m = this._libModal;
    if (!m || !id) return;
    m.typeKey = 'music';
    m.qualityKey = null;
    m.search = '';
    m.page = 0;
    const el = this.shadowRoot.querySelector('[data-lib-modal]');
    const body = el?.querySelector('#lib-body');
    if (!body) return;
    body.innerHTML = this._libBodyHtml();
    this._wireLibModalBody(el);

    const idx = (this._libFilteredItems() || []).findIndex(i => i.id === id);
    const per = m._perPage || 0;
    if (idx >= 0 && per > 0) {
      const page = Math.floor(idx / per);
      if (page !== m.page) {
        m.page = page;
        body.innerHTML = this._libBodyHtml();
        this._wireLibModalBody(el);
      }
    }
    this._libFlashArtist = id;
    body.innerHTML = this._libBodyHtml();
    this._wireLibModalBody(el);
    requestAnimationFrame(() => {
      this.shadowRoot
        .querySelector(`[data-lib-modal] [data-artist-id="${id}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
    clearTimeout(this._libFlashTimer);
    this._libFlashTimer = setTimeout(() => {
      this._libFlashArtist = null;
      const b = this.shadowRoot.querySelector('[data-lib-modal] #lib-body');
      const e2 = this.shadowRoot.querySelector('[data-lib-modal]');
      if (b && this._libModal) { b.innerHTML = this._libBodyHtml(); this._wireLibModalBody(e2); }
    }, 2400);
  }

  // Patches one drawer in place: a re-render would close the menu the moment
  // its contents arrived.
  _musPatchDrawer(kind) {
    if (this._musicModal?.menuSub !== kind) return;
    const el = this.shadowRoot?.querySelector('[data-music-modal] .qa-drawer');
    if (!el) return;
    el.innerHTML = kind === 'cast' ? this._musCastRowsHtml() : this._musStatsRowsHtml();
  }

  async _musCast(entityId) {
    const m = this._musicModal;
    const name = m?.artist?.artistName;
    if (!entityId || !name) return;
    this._musCastErr = null;
    try {
      const hit = await this._callApi('GET', `arr_stack/plex/artist?name=${encodeURIComponent(name)}`);
      if (!hit?.plex_key) throw new Error('artist not on Plex');
      const contentId = {};
      if (hit.library) contentId.library_name = hit.library;
      if (hit.title)   contentId.artist_name  = hit.title;
      await this._hass.callService('media_player', 'play_media', {
        entity_id: entityId,
        media_content_type: 'plex',
        media_content_id: JSON.stringify(contentId),
      });
      m.menu = null;
      m.menuSub = null;
      this._renderMusicModalEl();
    } catch (err) {
      console.warn('[arr-card] Plex cast refused:', err?.message || err);
    }
  }

  async _musToggleTracks(albumId) {
    const sp = this._musicModal?.search;
    if (!sp) return;
    sp.tracks = sp.tracks || new Map();
    if (sp.expanded === albumId) { sp.expanded = null; this._renderMusicModalEl(); return; }
    sp.expanded = albumId;
    this._renderMusicModalEl();
    if (sp.tracks.has(albumId)) return;
    try {
      const list = await this._callApi('GET', `arr_stack/lidarr/tracks?albumId=${albumId}`);
      sp.tracks.set(albumId, Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('[arr-card] Lidarr tracks error:', e);
      sp.tracks.set(albumId, []);
    }
    if (this._musicModal?.search === sp) this._renderMusicModalEl();
  }

  async _musDeleteFiles(albumId) {
    const m = this._musicModal;
    const sp = m?.search;
    if (!sp) return;
    sp.delConfirm = null;
    sp.delBusy = albumId;
    this._renderMusicModalEl();
    try {
      // Lidarr deletes by track file, so the album's files are looked up first.
      const files = await this._callApi('GET', `arr_stack/lidarr/trackfiles?albumId=${albumId}`);
      const ids = (Array.isArray(files) ? files : []).map(f => f.id).filter(Boolean);
      if (ids.length) {
        await this._callApi('DELETE', `arr_stack/lidarr/trackfiles?ids=${ids.join(',')}`);
      }
      const fresh = await this._fetchLidarrDiscography(m.artistId);
      if (this._musicModal?.artistId === m.artistId && fresh.length) m.albums = fresh;
      sp.tracks?.delete(albumId);
    } catch (e) {
      console.error('[arr-card] Lidarr delete files error:', e);
    }
    sp.delBusy = null;
    this._renderMusicModalEl();
  }

  async _musToggleAlbum(albumId) {
    const m = this._musicModal;
    const sp = m?.search;
    const album = (m?.albums || []).find(a => a.id === albumId);
    if (!sp || !album) return;
    sp.monBusy = albumId;
    this._renderMusicModalEl();
    try {
      // Lidarr takes the album back whole, the same as an artist.
      const next = { ...album, monitored: !album.monitored };
      await this._callApi('PUT', `arr_stack/lidarr/album/${albumId}`, next);
      m.albums = m.albums.map(a => (a.id === albumId ? next : a));
    } catch (e) {
      console.error('[arr-card] Lidarr album monitor error:', e);
    }
    sp.monBusy = null;
    this._renderMusicModalEl();
  }

  async _musGrab(guid) {
    const sp = this._musicModal?.search;
    if (!sp) return;
    const release = (sp.results || []).find(r => r.guid === guid);
    if (!release) return;
    sp.grabbing = guid;
    this._renderMusicModalEl();
    try {
      // Lidarr wants the release back whole, with the album it belongs to —
      // the same shape Radarr expects for a film.
      await this._callApi('POST', 'arr_stack/lidarr/release', { ...release, albumId: sp.albumId });
      sp.grabbed = sp.grabbed || new Set();
      sp.grabbed.add(guid);
    } catch (e) {
      console.error('[arr-card] Lidarr grab error:', e);
    }
    sp.grabbing = null;
    this._renderMusicModalEl();
    for (const ms of [0, 2000, 5000, 10000, 20000]) {
      setTimeout(async () => {
        if (!this._musicModal) return;
        await this._fetchLidarrQueue();
        if (this._musicModal) this._renderMusicModalEl();
        this._reRenderSection?.('recentlyRequested');
      }, ms);
    }
  }

  // The dropdown belongs under the button that opened it. Anchored in script
  // for the same reason the film popup does it: the three triggers sit in a
  // flex capsule whose widths shift with state, so no fixed offset holds.
  _musPositionMenu(el) {
    const menu = el?.querySelector('.mus-menu');
    if (!menu) return;
    const glass = menu.closest('.popup-glass');
    const trigger = el.querySelector(`[data-mus-menu="${this._musicModal?.menu}"]`);
    if (!glass || !trigger) return;
    const g = glass.getBoundingClientRect();
    const b = trigger.getBoundingClientRect();
    const w = menu.getBoundingClientRect().width;
    const PAD = 12;
    const left = Math.max(PAD, Math.min(b.left - g.left, g.width - w - PAD));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.right = 'auto';
    menu.style.top = `${Math.round(b.bottom - g.top + 6)}px`;
  }

  async _musAction(act) {
    const m = this._musicModal;
    if (!m) return;
    const id = m.artistId;
    this._markActivated();
    m.menu = null;
    m.busy = act.startsWith('search') ? 'search' : act.startsWith('remove') ? 'remove' : 'actions';
    this._renderMusicModalEl();
    try {
      if (act === 'as' || act === 'is') {
        m.busy = null;
        if (m.preview) {
          // Interactive asks in the sheet first; automatic just gets on with it.
          if (act === 'is') {
            m.search = { mode: 'is', confirmAdd: true, searched: new Set(), grabbed: new Set() };
            this._renderMusicModalEl();
            return;
          }
          m.search = { mode: 'as', adding: true, searched: new Set(), grabbed: new Set() };
          this._renderMusicModalEl();
          const id = await this._musAddFromPreview();
          if (!id) return;
          const nm = this._musicModal;
          if (nm) nm.search = { mode: 'as', searched: new Set(), grabbed: new Set() };
          this._renderMusicModalEl();
          return;
        }
        m.search = { mode: act, searched: new Set(), grabbed: new Set() };
        this._renderMusicModalEl();
        return;
      }
      if (act === 'add-yes') {
        m.busy = null;
        const want = m.search?.wantAlbum || null;
        if (m.search) { m.search.confirmAdd = false; m.search.adding = true; }
        this._renderMusicModalEl();
        const id = await this._musAddFromPreview();
        if (!id || !this._musicModal) return;
        this._musicModal.search = { mode: 'is', searched: new Set(), grabbed: new Set() };
        this._renderMusicModalEl();
        if (want) {
          const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const hit = (this._musicModal.albums || []).find(a => norm(a.title) === norm(want));
          if (hit?.id) this._musOpenAlbum(hit.id);
        }
        return;
      }
      if (act === 'add-no') {
        m.busy = null;
        m.search = null;
        this._renderMusicModalEl();
        return;
      }
      if (act === 'show-in-lib') {
        m.busy = null;
        this._musShowInLibrary();
        return;
      }
      if (act === 'cast' || act === 'stats') {
        // A parent row: it opens its own drawer rather than doing anything.
        m.busy = null;
        m.menu = 'actions';
        m.menuSub = m.menuSub === act ? null : act;
        this._renderMusicModalEl();
        if (m.menuSub === 'cast') this._fetchPlexClients({ silent: true, maxAge: 30000 })
          .then(() => this._musPatchDrawer('cast'));
        if (m.menuSub === 'stats') this._musLoadStats();
        return;
      }
      if (act === 'search-missing') {
        await this._callApi('POST', 'arr_stack/lidarr/command', { name: 'ArtistSearch', artistId: id });
      } else if (act === 'refresh') {
        await this._callApi('POST', 'arr_stack/lidarr/command', { name: 'RefreshArtist', artistId: id });
      } else if (act === 'monitor' || act === 'unmonitor') {
        // Lidarr wants the whole record back, not a patch.
        const next = { ...m.artist, monitored: act === 'monitor' };
        await this._callApi('PUT', `arr_stack/lidarr/artist/${id}`, next);
        m.artist = next;
      } else if (act === 'remove-lib' || act === 'remove-disc') {
        const files = act === 'remove-disc' ? 'true' : 'false';
        await this._callApi('DELETE', `arr_stack/lidarr/artist/${id}?deleteFiles=${files}`);
        this._closeMusicModal();
        this._musForgetArtist(id);
        return;
      }
    } catch (e) {
      console.error('[arr-card] Lidarr action error:', act, e);
    }
    if (this._musicModal?.artistId !== id) return;
    this._musicModal.busy = null;
    // Counts and monitoring change server-side, so read the record back rather
    // than guessing what it looks like now.
    const full = await this._fetchLidarrArtist(id);
    if (full && this._musicModal?.artistId === id) this._musicModal.artist = full;
    this._renderMusicModalEl();
  }

  // What the modal draws from the download queue: whether each of its albums is
  // in it and how far along, plus the artist's own furthest album.
  _musStreamAction(el, ev) {
    const eid = el.dataset.entity;
    const act = el.dataset.action;
    if (!eid) return;
    const st = this._hass?.states?.[eid];
    const feats = st?.attributes?.supported_features || 0;
    if (act === 'stream-seek') {
      const rect = el.getBoundingClientRect();
      const x = ev.clientX ?? ev.changedTouches?.[0]?.clientX ?? 0;
      const dur = parseFloat(el.dataset.dur);
      if (dur > 0) {
        const next = Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * dur;
        this._updateStreamFills(eid, next, dur);
        this._doSeek(eid, next);
      }
      return;
    }
    if (act === 'stream-playpause') {
      const playing = st?.state === 'playing';
      const svc = playing
        ? ((feats & 1) ? 'media_pause' : ((feats & 16384) ? 'media_play_pause' : null))
        : ((feats & 16384) ? 'media_play' : ((feats & 1) ? 'media_play_pause' : null));
      if (svc) { try { this._hass.callService('media_player', svc, { entity_id: eid }); } catch (_) {} }
      // The state arrives from Home Assistant a beat later; the icon flips now.
      el.innerHTML = `<ha-icon icon="mdi:${playing ? 'play' : 'pause'}" style="--mdc-icon-size:26px"></ha-icon>`;
      return;
    }
    if (act === 'stream-prev' || act === 'stream-next') {
      const svc = act === 'stream-prev' ? 'media_previous_track' : 'media_next_track';
      try { this._hass.callService('media_player', svc, { entity_id: eid }); } catch (_) {}
      // A skip changes the track, not the queue, so the modal is redrawn on its
      // own rather than by the queue signature.
      setTimeout(() => { if (this._musicModal?.stream === eid) this._renderMusicModalEl(); }, 1500);
      return;
    }
  }

}

export const wireMusicActionsMixin = _WireMusicActionsMethods.prototype;
