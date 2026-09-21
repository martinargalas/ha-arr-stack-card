// Library, what it lists: films, series, music, top rated, best quality, filtering and sorting. Split out of render/library.js.

class _LibraryDataMethods {

  // ─── Tile data ────────────────────────────────────────────────────────────

  // ─── Data helpers ─────────────────────────────────────────────────────────

  _libFilteredItems() {
    const m = this._libModal;
    let items = this._libAllItems();

    // Radarr-style filter
    if (m.filter === 'monitored')   items = items.filter(i => i.monitored);
    if (m.filter === 'unmonitored') items = items.filter(i => !i.monitored);
    const _onDisk = (i) => i._libType === 'movie' ? !!i.hasFile
      : i._libType === 'music' ? (i.statistics?.trackFileCount || 0) > 0
      : (i.statistics?.episodeFileCount || 0) > 0;
    if (m.filter === 'missing')     items = items.filter(i => !_onDisk(i));
    if (m.filter === 'wanted')      items = items.filter(i => i.monitored && !_onDisk(i));
    if (m.filter === 'cutoff')      items = items.filter(i => i._libType === 'movie' ? !!i.movieFile?.qualityCutoffNotMet : false);

    // Search
    if (m.search) {
      const q = m.search.toLowerCase();
      items = items.filter(i => (i.title || '').toLowerCase().includes(q) || (i.originalTitle || '').toLowerCase().includes(q));
    }

    const dir = m.sortDir === 'desc' ? -1 : 1;
    return [...items].sort((a, b) => {
      switch (m.sort) {
        case 'status':    return dir * ((a.monitored?1:0) - (b.monitored?1:0)) || dir * ((a.hasFile||a.statistics?.episodeFileCount?1:0) - (b.hasFile||b.statistics?.episodeFileCount?1:0));
        case 'title':     return dir * (a.title || '').localeCompare(b.title || '');
        case 'studio':    return dir * (a.studio || '').localeCompare(b.studio || '');
        case 'qualprof':  return dir * (a.qualityProfileName || '').localeCompare(b.qualityProfileName || '');
        case 'added':     return dir * (new Date(a.added || 0) - new Date(b.added || 0));
        case 'year':      return dir * ((a.year || 0) - (b.year || 0));
        case 'cinema':    return dir * (new Date(a.inCinemas || 0) - new Date(b.inCinemas || 0));
        case 'digital':   return dir * (new Date(a.digitalRelease || 0) - new Date(b.digitalRelease || 0));
        case 'physical':  return dir * (new Date(a.physicalRelease || 0) - new Date(b.physicalRelease || 0));
        case 'tmdb':      return dir * ((a.ratings?.tmdb?.value || 0) - (b.ratings?.tmdb?.value || 0));
        case 'imdb': { const ra = a.ratings?.imdb?.value||a.ratings?.tmdb?.value||a.ratings?.tvdb?.value||a.ratings?.tvMaze?.value||a.ratings?.trakt?.value||a.ratings?.value||0; const rb = b.ratings?.imdb?.value||b.ratings?.tmdb?.value||b.ratings?.tvdb?.value||b.ratings?.tvMaze?.value||b.ratings?.trakt?.value||b.ratings?.value||0; return dir*(ra-rb); }
        case 'popularity':return dir * ((a.popularity || 0) - (b.popularity || 0));
        case 'albums':    return dir * ((a.statistics?.albumCount || 0) - (b.statistics?.albumCount || 0));
        case 'tracks':    return dir * ((a.statistics?.trackFileCount || 0) - (b.statistics?.trackFileCount || 0));
        case 'rating':    return dir * ((a.ratings?.value || 0) - (b.ratings?.value || 0));
        case 'size':      return dir * ((a.movieFile?.size || a.statistics?.sizeOnDisk || 0) - (b.movieFile?.size || b.statistics?.sizeOnDisk || 0));
        case 'cert':      return dir * (a.certification || '').localeCompare(b.certification || '');
        case 'origtitle': return dir * (a.originalTitle || '').localeCompare(b.originalTitle || '');
        case 'origlang':  return dir * ((a.originalLanguage?.name || '').localeCompare(b.originalLanguage?.name || ''));
        case 'quality': {
          const Q = ['2160p','1080p','720p','480p'];
          const qa = Q.findIndex(r => (a.movieFile?.quality?.quality?.name || '').includes(r));
          const qb = Q.findIndex(r => (b.movieFile?.quality?.quality?.name || '').includes(r));
          const ra = qa === -1 ? -1 : Q.length - qa;
          const rb = qb === -1 ? -1 : Q.length - qb;
          return dir * (ra - rb);
        }
        default: return 0;
      }
    });
  }

  _libAllItems() {
    const m = this._libModal;
    const rp1 = new Map((this._radarrProfiles || []).map(p => [p.id, p.name]));
    const rp2 = new Map((this._radarr2Profiles || []).map(p => [p.id, p.name]));
    const sp1 = new Map((this._sonarrProfiles || []).map(p => [p.id, p.name]));
    const sp2 = new Map((this._sonarr2Profiles || []).map(p => [p.id, p.name]));
    const r1 = (this._radarr  || []);
    const r2 = (this._radarr2Configured ? (this._radarr2 || []) : []);
    const s1 = (this._sonarr  || []);
    const s2 = (this._sonarr2Configured ? (this._sonarr2 || []) : []);
    const inst = m.instFilter || 'all';
    const movieSrc = inst === '1' ? r1.map(i=>({...i,_libInst:'1'})) : inst === '2' ? r2.map(i=>({...i,_libInst:'2'})) : [...r1.map(i=>({...i,_libInst:'1'})), ...r2.map(i=>({...i,_libInst:'2'}))];
    const tvSrc    = inst === '1' ? s1.map(i=>({...i,_libInst:'1'})) : inst === '2' ? s2.map(i=>({...i,_libInst:'2'})) : [...s1.map(i=>({...i,_libInst:'1'})), ...s2.map(i=>({...i,_libInst:'2'}))];
    const movies = movieSrc.map(i => ({ ...i, _libType: 'movie', qualityProfileName: (i._libInst === '2' ? rp2 : rp1).get(i.qualityProfileId) || '' }));
    const tv     = tvSrc.map(i => ({ ...i, _libType: 'tv', qualityProfileName: (i._libInst === '2' ? sp2 : sp1).get(i.qualityProfileId) || '' }));
    const music = (this._lidarrConfigured === false ? [] : [...(this._lidarrArtists?.values() || [])])
      .map(a => ({ ...a, _libType: 'music', title: a.artistName || '', _libInst: '1' }));
    let base;
    if      (m.typeKey === 'movies') base = movies;
    else if (m.typeKey === 'tv')     base = tv;
    else if (m.typeKey === 'music')  base = music;
    else                             base = [...movies, ...tv];
    if (m.qualityKey === 'topquality') base = base.filter(i => i._libType !== 'music');
    if (m.qualityKey === 'toprated')  base = base.filter(i => (i.ratings?.imdb?.value || i.ratings?.tmdb?.value || i.ratings?.tvdb?.value || i.ratings?.tvMaze?.value || i.ratings?.trakt?.value || i.ratings?.value || 0) > 0);
    if (m.qualityKey === 'topquality') base = base.filter(i => i._libType === 'movie' && !!i.hasFile);
    return base;
  }

  _libSortOptions() {
    const m = this._libModal;
    const all = [
      { v: 'status',    label: this._t('libSortStatus') },
      { v: 'title',     label: this._t('libTitle') },
      { v: 'studio',    label: this._t('libStudio') },
      { v: 'qualprof',  label: this._t('libQualityProfile') },
      { v: 'added',     label: this._t('badgeAdded') },
      { v: 'year',      label: this._t('actColYear') },
      { v: 'cinema',    label: this._t('libInCinemas') },
      { v: 'digital',   label: this._t('libDigital') },
      { v: 'physical',  label: this._t('libPhysical') },
      { v: 'tmdb',      label: this._t('libTmdbRating') },
      { v: 'imdb',      label: this._t('libImdbRating') },
      { v: 'popularity',label: this._t('libPopularity') },
      { v: 'quality',   label: this._t('actColQuality') },
      { v: 'size',      label: this._t('libSizeOnDisk') },
      { v: 'cert',      label: this._t('libCert') },
      { v: 'origtitle', label: this._t('libOrigTitle') },
      { v: 'origlang',  label: this._t('libOrigLang') },
    ];
    if (m.typeKey === 'music') return [
      { v: 'status',  label: this._t('libSortStatus') },
      { v: 'title',   label: this._t('typeArtist') },
      { v: 'added',   label: this._t('badgeAdded') },
      { v: 'albums',  label: this._t('libAlbums') },
      { v: 'tracks',  label: this._t('libTracksOnDisk') },
      { v: 'rating',  label: this._t('libRating') },
      { v: 'size',    label: this._t('libSizeOnDisk') },
    ];
    if (m.typeKey === 'tv' && !m.qualityKey) return all.filter(o => !['studio','cinema','digital','physical','cert','quality'].includes(o.v));
    return all;
  }

}

export const libraryDataMixin = _LibraryDataMethods.prototype;
