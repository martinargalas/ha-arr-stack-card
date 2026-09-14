// Music, adding an artist: the preview, the add dialog, Last.fm suggestions. Split out of wire/music.js.

class _WireMusicAddMethods {

  // The detail for an artist Lidarr has never heard of. Everything the record
  // itself carries is drawn as usual; the albums come from MusicBrainz, and the
  // covers from the Cover Art Archive, which answers on a release group's id
  // without a key.
  _musUnownedArtist(mbid) {
    const inSearch = (this._searchResults || [])
      .find(r => r.mediaType === 'music' && r.artist?.foreignArtistId === mbid);
    if (inSearch?.artist) return inSearch.artist;
    const inSug = (this._lastfm || []).find(r => r.artist?.foreignArtistId === mbid);
    return inSug?.artist || null;
  }

  async _openMusicPreview(mbid) {
    const artist = this._musUnownedArtist(mbid);
    if (!artist) return;
    const hit = { artist };
    this._musPanelH = null;
    this._musDescH = null;
    this._musAlbH = null;
    this._musGlassH = null;
    this._musAlbCols = null;
    this._musicModal = {
      artistId: null, artist: hit.artist, albums: [], loading: true, preview: mbid,
    };
    this._renderMusicModalEl();
    let list = [];
    try {
      list = await this._callApi('GET', `arr_stack/lidarr/mbalbums?mbid=${encodeURIComponent(mbid)}`);
    } catch (e) {
      console.warn('[arr-card] MusicBrainz discography failed:', e);
    }
    if (this._musicModal?.preview !== mbid) return;
    // Shaped like a Lidarr album so the grid needs no second version of itself.
    this._musicModal.albums = (Array.isArray(list) ? list : []).map(a => ({
      id: null,
      mbId: a.id,
      title: a.title,
      releaseDate: a.releaseDate,
      statistics: null,
      _mbCover: `https://coverartarchive.org/release-group/${a.id}/front-250`,
    }));
    this._musicModal.loading = false;
    this._renderMusicModalEl();
  }

  // Adding from the preview: unmonitored, nothing searched for, so a search can
  // run against a record that now exists. The overlay's questions are skipped —
  // this is the quick way in, and the detail that follows is where monitoring
  // and profiles are changed.
  async _musAddFromPreview() {
    const m = this._musicModal;
    if (!m?.preview || m.adding) return null;
    m.adding = true;
    try {
      const opts = await this._fetchLidarrAddOptions();
      const res = await this._addLidarrArtist(m.artist, {
        profileId: opts.quality?.[0]?.id ?? 1,
        metadataId: opts.metadata?.[0]?.id ?? 1,
        rootFolder: opts.rootFolders?.[0]?.path || '',
        monitor: 'none',
      });
      if (!res?.id) throw new Error('no id returned');
      await this._openMusicModal(Number(res.id));
      return Number(res.id);
    } catch (e) {
      console.error('[arr-card] add from preview failed:', e);
      if (this._musicModal) { this._musicModal.adding = false; this._renderMusicModalEl(); }
      return null;
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
  _musAddRepaint() {
    if (this._musAddPending?.source === 'lastfm') this._reRenderSection('recommendations');
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
      if (src === 'lastfm') this._reRenderSection('recommendations');
      else this._reRenderSearchResults();
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
        if (src === 'lastfm') this._reRenderSection('recommendations');
        else this._reRenderSearchResults();
        return;
      }
      console.error('[arr-card] Lidarr add failed:', e);
      if (this._musAddPending) { this._musAddPending.busy = false; this._musAddRepaint(); }
    }
  }

}

export const wireMusicAddMixin = _WireMusicAddMethods.prototype;
