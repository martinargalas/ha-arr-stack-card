// Music in the rows: the cards' clicks, the add-an-artist overlay in the search
// results and the suggestions, and the two blocks the title detail borrows.
// Core, because the rows draw and wire them without a modal; the artist and
// album windows load on demand (chunks/music.js).

class _MusicRowsMethods {

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
        this._musAddPaintFor(src);
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

  _closeMusicModal() {
    this._musQueueSigLast = null;
    this._musicModal = null;
    this.shadowRoot?.querySelector('[data-music-modal]')?.remove();
    // Opened from Similar titles: back to it — unless the close was the preview
    // handing over to the artist window, or anything else opening in its place
    if (this._simReturnState) {
      setTimeout(() => {
        if (!this._simReturnState || this._musicModal || this._popup) return;
        const saved = this._simReturnState;
        this._simReturnState = null;
        this._openSimModal(null, saved);
      }, 0);
    }
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

  // Patches one drawer in place: a re-render would close the menu the moment
  // its contents arrived.
  _musPatchDrawer(kind) {
    if (this._musicModal?.menuSub !== kind) return;
    const el = this.shadowRoot?.querySelector('[data-music-modal] .qa-drawer');
    if (!el) return;
    el.innerHTML = kind === 'cast' ? this._musCastRowsHtml() : this._musStatsRowsHtml();
  }

  // The artist behind the plus, and what Lidarr needs to be told before it can
  // hold one.
  async _musOpenAdd(mbid, source = 'search') {
    const artist = this._musUnownedArtist(mbid);
    if (!artist) return;
    const hit = { artist };
    this._musAddPending = { artist: hit.artist, loading: true, opts: null, source };
    this._musAddRepaint();
    const opts = await this._fetchLidarrAddOptions();
    if (!this._musAddPending) return;
    this._musAddPending = {
      source,
      artist: hit.artist,
      loading: false,
      opts,
      profileId: opts.quality?.[0]?.id ?? 1,
      metadataId: opts.metadata?.[0]?.id ?? 1,
      rootFolder: opts.rootFolders?.[0]?.path || '',
      // Adding an act should not pull its back catalogue by surprise; the
      // discography in the detail is where albums are chosen.
      monitor: 'future',
      busy: false,
    };
    this._musAddRepaint();
  }

  // The overlay lives in whichever row it was opened from.
  _musAddRepaint() { this._musAddPaintFor(this._musAddPending?.source); }

  // Which of the three the overlay was opened in: the suggestions row, the
  // search results, or Similar titles — whose modal neither re-render touches.
  _musAddPaintFor(src) {
    if (src === 'sim') this._simRender();
    else if (src === 'lastfm') this._reRenderSection('recommendations');
    else this._reRenderSearchResults();
  }

  _wireMusAddSelects(root) {
    root?.querySelectorAll('.mus-add-overlay select').forEach(sel => {
      if (sel._musWired) return;
      sel._musWired = true;
      sel.addEventListener('change', () => {
        this._tbSyncSelect(sel);
        const p = this._musAddPending;
        if (!p) return;
        if (sel.id === 'mus-add-profile') p.profileId  = sel.value;
        if (sel.id === 'mus-add-monitor') p.monitor    = sel.value;
        if (sel.id === 'mus-add-meta')    p.metadataId = sel.value;
        if (sel.id === 'mus-add-root')    p.rootFolder = sel.value;
      });
    });
  }

  async _musConfirmAdd() {
    const p = this._musAddPending;
    if (!p || p.busy || !p.artist) return;
    this._markActivated();
    const root = this.shadowRoot;
    const _val = (id, fallback) => root.querySelector(`#${id}`)?.value ?? fallback;
    p.profileId  = _val('mus-add-profile', p.profileId);
    p.monitor    = _val('mus-add-monitor', p.monitor);
    p.metadataId = _val('mus-add-meta', p.metadataId);
    p.rootFolder = _val('mus-add-root', p.rootFolder);
    p.busy = true;
    this._musAddRepaint();
    const src = p.source;
    try {
      const res = await this._addLidarrArtist(p.artist, p);
      const mbid = String(p.artist?.foreignArtistId || '').toLowerCase();
      if (mbid) {
        this._musAdded.add(mbid);
        this._musAddedEntries = this._musAddedEntries || new Map();
        const kept = (this._lastfm || []).find(r => String(r.artist?.foreignArtistId || '').toLowerCase() === mbid)
                  || { artist: p.artist, score: 0, seed: '' };
        this._musAddedEntries.set(mbid, kept);
      }
      await this._fetchLidarrQueue();
      p.busy = false;
      p.done = true;
      this._musAddRepaint();
      await new Promise(r => setTimeout(r, 900));
      if (this._musAddPending !== p) return;
      this._musAddPending = null;
      this._musAddPaintFor(src);
      // A preview standing open for this artist is now out of date — it was
      // built from the lookup record, which reports neither monitoring nor
      // anything on disk. Reopen it on the record Lidarr actually holds.
      if (res?.id && this._musicModal?.preview === mbid) this._openMusicModal(res.id);
      // The artist is owned now, so the server would no longer offer them —
      // and has room for one more suggestion in their place.
      this._musScheduleLastfmRefresh();
    } catch (e) {
      const already = JSON.stringify(e?.body || '').includes('ArtistExistsValidator');
      if (already) {
        const mbid = String(p.artist?.foreignArtistId || '').toLowerCase();
        this._lidarrArtistsAt = 0;
        await this._fetchLidarrArtists();
        if (mbid) {
          this._musAdded.add(mbid);
          this._musAddedEntries = this._musAddedEntries || new Map();
          const kept = (this._lastfm || []).find(r => String(r.artist?.foreignArtistId || '').toLowerCase() === mbid)
                    || { artist: p.artist, score: 0, seed: '' };
          this._musAddedEntries.set(mbid, kept);
        }
        await this._fetchLidarrQueue();
        p.busy = false;
        p.done = true;
        this._musAddRepaint();
        await new Promise(r => setTimeout(r, 900));
        if (this._musAddPending !== p) return;
        this._musAddPending = null;
        this._musAddPaintFor(src);
        return;
      }
      console.error('[arr-card] Lidarr add failed:', e);
      if (this._musAddPending) { this._musAddPending.busy = false; this._musAddRepaint(); }
    }
  }

  async _musDropSuggestion(mbid, verdict, cardEl) {
    const id = String(mbid || '').toLowerCase();
    if (!id) return;
    this._markActivated();
    const skip = verdict === 'skip';
    if (cardEl) {
      cardEl.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'scale(0.85)';
      await new Promise(r => setTimeout(r, 280));
    }
    this._lastfm = (this._lastfm || [])
      .filter(r => String(r.artist?.foreignArtistId || '').toLowerCase() !== id);
    this._musSkipped = (this._musSkipped || new Set()).add(id);
    this._musAddedEntries?.delete(id);
    this._musAdded?.delete(id);
    // The last card on the last page leaves that page empty; step back rather
    // than leave the reader looking at nothing.
    const perPage = this._perPage('recommendations');
    const count   = this._hasSeeMore('recommendations')
      ? this._smpPageCount(this._recItems(), 'recommendations')
      : (this._lastfm || []).length;
    const last    = Math.max(0, Math.ceil(count / perPage) - 1);
    if ((this._pages.recommendations || 0) > last) {
      this._pages.recommendations   = last;
      this._pageDir.recommendations = 'prev';
    }
    this._reRenderSection('recommendations');
    this._pageDir.recommendations = '';
    try {
      // Liking one keeps it out of the row the same way, but tells the server
      // to seed from it — the answer to "more like this".
      await this._callApi('POST', `arr_stack/lastfm/${skip ? 'skips' : 'likes'}`, { mbid: id });
    } catch (e) {
      console.warn('[arr-card] suggestion verdict failed:', e);
    }
    // A verdict changes what the server would suggest, so the row is rebuilt
    // rather than left to run down to nothing. An empty row cannot wait for the
    // debounce — there is nothing on screen meanwhile.
    if (!(this._lastfm || []).length) {
      await this._fetchLastfm({ refresh: true });
      this._reRenderSection('recommendations');
      return;
    }
    this._musScheduleLastfmRefresh();
  }

  // Rebuilding the suggestions costs a Last.fm round per seed plus a Lidarr
  // lookup per hit, so a run of clicks waits for the last one. It also runs in
  // the background: the row the reader is working through stays as it is until
  // the answer arrives.
  _musScheduleLastfmRefresh(delay = 1500) {
    clearTimeout(this._lastfmRefreshT);
    this._lastfmRefreshT = setTimeout(async () => {
      if (this._lastfmRefreshing) { this._musScheduleLastfmRefresh(800); return; }
      this._lastfmRefreshing = true;
      try {
        await this._fetchLastfm({ refresh: true });
        // Not while the add overlay is up — re-rendering the column would take
        // the overlay with it. The list is in hand; the next paint shows it.
        if (!this._musAddPending) this._reRenderSection('recommendations');
      } catch (e) {
        console.warn('[arr-card] suggestion refresh failed:', e);
      } finally {
        this._lastfmRefreshing = false;
      }
    }, delay);
  }

  _musStatsRowsHtml() {
    const st = this._musStats;
    if (!st) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('loading')}</div>`;
    if (!st.any) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaStatsNone')}</div>`;
    const row = (label, value) =>
      `<div class="qa-item qa-sub-item qa-static"><span>${label}</span><span class="qa-air-date">${this._escHtml(String(value))}</span></div>`;
    return [
      st.tracks  ? row(this._t('musStatsTracks'), st.tracks)  : '',
      st.plays   ? row(this._t('qaStatsPlays'),   st.plays)   : '',
      st.watched ? row(this._t('musStatsTime'),   st.watched) : '',
      st.last    ? row(this._t('qaStatsLast'),    st.last)    : '',
      st.top     ? row(this._t('musStatsTop'),    st.top)     : '',
      st.others  ? row(this._t('qaStatsOthers'),  st.others)  : '',
    ].join('');
  }

  _musCastRowsHtml() {
    const list = this._plexClients;
    if (!list) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('loading')}</div>`;
    if (!list.length) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaCastNone')}</div>`;
    const PLAY_MEDIA = 512;
    return list.map(p => {
      const feats = Number(this._hass?.states?.[p.entityId]?.attributes?.supported_features) || 0;
      const can = !feats || (feats & PLAY_MEDIA);
      return `<button class="qa-item qa-sub-item" data-mus-cast="${this._escHtml(p.entityId)}"${
        can ? '' : ' style="opacity:0.45"'}><span>${this._escHtml(p.name)}</span></button>`;
    }).join('');
  }


  // The detail for an artist Lidarr has never heard of. Everything the record
  // itself carries is drawn as usual; the albums come from MusicBrainz, and the
  // covers from the Cover Art Archive, which answers on a release group's id
  // without a key.
  _musUnownedArtist(mbid) {
    const inSearch = (this._searchResults || [])
      .find(r => r.mediaType === 'music' && r.artist?.foreignArtistId === mbid);
    if (inSearch?.artist) return inSearch.artist;
    const inSug = (this._lastfm || []).find(r => r.artist?.foreignArtistId === mbid);
    if (inSug?.artist) return inSug.artist;
    return this._simArtists?.get(String(mbid).toLowerCase()) || null;
  }
}

export const musicRowsMixin = _MusicRowsMethods.prototype;
