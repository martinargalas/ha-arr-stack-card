// Music, adding an artist: the preview, the add dialog, Last.fm suggestions. Split out of wire/music.js.

class _WireMusicAddMethods {

  async _openMusicPreview(mbid, { stream = null } = {}) {
    const artist = this._musUnownedArtist(mbid);
    if (!artist) return;
    const hit = { artist };
    this._musPanelH = null;
    this._musDescH = null;
    this._musAlbH = null;
    this._musGlassH = null;
    this._musAlbCols = null;
    this._musicModal = {
      artistId: null, artist: hit.artist, albums: [], loading: true, preview: mbid, stream,
    };
    if (stream) this._musLoadTrackQuality(stream);
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

}

export const wireMusicAddMixin = _WireMusicAddMethods.prototype;
