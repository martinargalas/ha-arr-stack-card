// Fetching for Music: Lidarr, adding artists, Last.fm suggestions, play stats and origin. Split out of fetch/arr.js.

class _FetchMusicMethods {

async _fetchLidarrAddOptions() {
  if (this._lidarrAddOpts) return this._lidarrAddOpts;
  try {
    const o = await this._callApi('GET', 'arr_stack/lidarr/addoptions');
    this._lidarrAddOpts = {
      quality: o?.quality || [],
      metadata: o?.metadata || [],
      rootFolders: o?.rootFolders || [],
    };
  } catch (e) {
    console.warn('[arr-card] Lidarr add options failed:', e);
    this._lidarrAddOpts = { quality: [], metadata: [], rootFolders: [] };
  }
  return this._lidarrAddOpts;
}

// Lidarr wants the whole looked-up record back with the choices folded in —
// the same shape its own Add screen posts.
async _addLidarrArtist(artist, { profileId, metadataId, rootFolder, monitor }) {
  const body = {
    ...artist,
    id: 0,
    qualityProfileId: Number(profileId),
    metadataProfileId: Number(metadataId),
    rootFolderPath: rootFolder,
    monitored: monitor !== 'none',
    monitorNewItems: monitor === 'all' ? 'all' : 'new',
    addOptions: {
      monitor: ['all', 'future', 'latest', 'none'].includes(monitor) ? monitor : 'future',
      // Whatever was chosen to monitor is searched for: monitoring an album and
      // then not looking for it leaves a library that never fills. Future-only
      // has nothing to find today, so this costs nothing there.
      searchForMissingAlbums: monitor === 'all' || monitor === 'latest',
      searchForMissingTracks: monitor === 'all' || monitor === 'latest',
    },
  };
  const res = await this._callApi('POST', 'arr_stack/lidarr/artist', body);
  this._lidarrArtistsAt = 0;   // the library gained one
  await this._fetchLidarrArtists();
  // Lidarr fetches the discography after the add returns, and applies
  // addOptions.monitor to whatever exists at that instant — which on a real
  // add is nothing, or a couple of albums out of five. Three artists added
  // with the same choice came out 0/5, 1/3 and 1/2 monitored. So the scope is
  // applied here, on the finished discography, rather than trusted to that race.
  if (res?.id) this._lidarrApplyMonitor(res.id, monitor).catch(() => {});
  await this._fetchLidarrQueue();
  return res;
}

// The album side of the Monitor choice in the add overlay. Albums only exist
// once Lidarr's refresh has run, so this waits for them before deciding.
async _lidarrApplyMonitor(artistId, monitor) {
  if (monitor === 'future' || monitor === 'none') return;
  let albums = [];
  for (let i = 0; i < 10; i++) {
    albums = await this._fetchLidarrDiscography(artistId);
    if (albums.length) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!albums.length) return;

  const today = new Date().toISOString().slice(0, 10);
  const released = albums.filter(a => (a.releaseDate || '') && a.releaseDate.slice(0, 10) <= today);
  const newest = (released.length ? released : albums)
    .slice().sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')))[0];
  const want = monitor === 'all'
    ? albums.map(a => a.id)
    : (newest ? [newest.id] : []);
  const wantSet = new Set(want);
  const off = albums.filter(a => a.monitored && !wantSet.has(a.id)).map(a => a.id);
  const on  = albums.filter(a => !a.monitored && wantSet.has(a.id)).map(a => a.id);

  if (off.length) await this._callApi('PUT', 'arr_stack/lidarr/albums/monitor', { albumIds: off, monitored: false });
  if (on.length)  await this._callApi('PUT', 'arr_stack/lidarr/albums/monitor', { albumIds: on,  monitored: true });

  // Monitoring alone finds nothing: the add's own search ran against the same
  // half-built list, so anything switched on here has to be asked for.
  const search = albums.filter(a => wantSet.has(a.id) && !(a.statistics?.trackFileCount > 0)).map(a => a.id);
  if (search.length) {
    await this._callApi('POST', 'arr_stack/lidarr/command', { name: 'AlbumSearch', albumIds: search });
  }
  await this._fetchLidarrQueue();
  this._reRenderSection?.('recentlyAdded');
}

async _fetchLastfm({ refresh = false } = {}) {
  if (!this._lastfmConfigured) { this._lastfm = []; return; }
  try {
    const list = await this._callApi('GET', `arr_stack/lastfm/suggested?limit=24${refresh ? '&refresh=1' : ''}`);
    const fresh = (Array.isArray(list) ? list : [])
      .filter(r => !this._musSkipped?.has(String(r.artist?.foreignArtistId || '').toLowerCase()));
    // Artists added this session are no longer offered by the server, but the
    // row keeps them until they are liked or skipped.
    const held = [...(this._musAddedEntries?.values() || [])]
      .filter(h => !fresh.some(r => String(r.artist?.foreignArtistId || '').toLowerCase()
        === String(h.artist?.foreignArtistId || '').toLowerCase()));
    this._lastfm = [...held, ...fresh];
    // The server holds its answer for six hours, so a row worn down by skips
    // stays short for the rest of that window however often the card asks.
    // A row this thin is rebuilt once, in the background, rather than waiting
    // the cache out.
    if (!refresh && fresh.length < 8 && !this._lastfmToppedUp) {
      this._lastfmToppedUp = true;
      this._musScheduleLastfmRefresh?.(400);
    }
  } catch (e) {
    console.warn('[arr-card] Last.fm suggestions failed:', e);
    this._lastfm = [];
  }
}

// ── Lidarr ────────────────────────────────────────────────────────────────
// An album has no "added" date and the full album list runs to tens of
// megabytes, so recently added music is assembled the other way round: read the
// import history, which is ordered and small, then fetch only the albums it
// names.
async _fetchLidarr() {
  if (this._lidarrConfigured === false) return;
  try {
    const hist = await this._callApi('GET', 'arr_stack/lidarr/history?pageSize=200&eventType=3');
    if (hist && hist._notConfigured) { this._lidarrConfigured = false; return; }
    this._lidarrConfigured = true;

    // Records arrive one per track, several to an album, and an artist can have
    // had a handful of albums land at once. The row lists artists — the way
    // Lidarr's own library does, and the way this card already treats series —
    // so fold all of that down to one entry per artist, newest first.
    const albumSeen  = new Map();   // albumId → import date
    const artistOrder = [];          // artistIds, newest first
    const artistAlbums = new Map();  // artistId → [albumId]
    for (const r of (hist?.records || [])) {
      const albumId = r.albumId;
      const artistId = r.artistId;
      if (!albumId || !artistId) continue;
      if (!albumSeen.has(albumId)) albumSeen.set(albumId, r.date || '');
      if (!artistAlbums.has(artistId)) { artistAlbums.set(artistId, []); artistOrder.push(artistId); }
      const list = artistAlbums.get(artistId);
      if (!list.includes(albumId)) list.push(albumId);
      if (artistOrder.length >= 40 && albumSeen.size >= 60) break;
    }
    if (artistOrder.length === 0) { this._lidarrArtistFeed = []; return; }

    await this._fetchLidarrArtists();

    // Only the newest album of each artist is needed for the card — the rest of
    // the discography is read when the modal opens.
    const wanted = artistOrder.map(id => artistAlbums.get(id)[0]);
    const albums = await this._callApi('GET', `arr_stack/lidarr/albums?ids=${wanted.join(',')}`);
    const byId = new Map((Array.isArray(albums) ? albums : []).map(a => [a.id, a]));

    this._lidarrArtistFeed = artistOrder.map(artistId => {
      const newestId = artistAlbums.get(artistId)[0];
      const album = byId.get(newestId) || null;
      const artist = this._lidarrArtists?.get(artistId) || album?.artist || null;
      if (!artist) return null;
      return {
        id: artistId,
        artist,
        newestAlbum: album,
        newAlbumCount: artistAlbums.get(artistId).length,
        _importedAt: albumSeen.get(newestId) || '',
      };
    }).filter(Boolean);

    await this._fetchLidarrQueue();
  } catch (e) {
    if (this._lidarrConfigured === null) this._lidarrConfigured = false;
    console.error('[arr-card] Lidarr fetch error:', e);
  }
}

// One artist's discography, read when their card is opened. Small enough to
// take whole — the full album list across the library is not.
async _fetchLidarrArtist(artistId) {
  try {
    const a = await this._callApi('GET', `arr_stack/lidarr/artist?id=${artistId}`);
    if (a?.id) this._lidarrArtists?.set(a.id, a);
    return a?.id ? a : null;
  } catch (e) {
    // 404 means the artist is gone from Lidarr — deleted from another client, or
    // from a card on a different device. Whatever the card still shows of them
    // would only 404 again on the next click.
    if (e?.status_code === 404) {
      if (this._musicModal?.artistId === artistId) this._closeMusicModal?.();
      this._musForgetArtist?.(artistId);
      return null;
    }
    console.error('[arr-card] Lidarr artist error:', e);
    return null;
  }
}

async _fetchLidarrDiscography(artistId) {
  try {
    const albums = await this._callApi('GET', `arr_stack/lidarr/albums?artistId=${artistId}`);
    return Array.isArray(albums) ? albums : [];
  } catch (e) {
    console.error('[arr-card] Lidarr discography error:', e);
    return [];
  }
}

// Hundreds of artists rather than thousands of albums, so this one can be read
// whole — and it carries the fanart the album cards sit on. Refreshed at most
// hourly; new artists are rare and the payload is the largest of the three.
async _fetchLidarrArtists() {
  const now = Date.now();
  if (this._lidarrArtists?.size && now - (this._lidarrArtistsAt || 0) < 3600_000) return;
  try {
    const list = await this._callApi('GET', 'arr_stack/lidarr/artists');
    if (!Array.isArray(list)) return;
    this._lidarrArtists = new Map(list.map(a => [a.id, a]));
    // Deezer's stand-in for every artist Lidarr has no picture of is asked for
    // now, so it is there before the artist is ever opened.
    for (const a of list) {
      if (!(a.images || []).some(i => i.coverType === 'poster')) this._altArtEntry(a.foreignArtistId);
    }
    this._lidarrArtistsAt = now;
  } catch (_) { /* the cards fall back to a blurred cover */ }
}

async _fetchLidarrQueue() {
  try {
    const q = await this._callApi('GET', 'arr_stack/lidarr/queue?pageSize=100');
    const recs = Array.isArray(q) ? q : (q?.records || []);
    this._lidarrQueue = new Set(recs.map(r => r.albumId).filter(Boolean));
    const pct = new Map();
    const artists = new Map();
    // The torrent hash or nzo_id back to the artist, so a row in the download
    // queue on the left opens the artist it belongs to — as a film's row opens
    // its title
    const dlIds = new Map();
    for (const r of recs) {
      const size = Number(r.size) || 0;
      const left = Number(r.sizeleft) || 0;
      const done = size > 0 ? Math.max(0, Math.min(100, Math.round((1 - left / size) * 100))) : -1;
      if (r.albumId) pct.set(r.albumId, done);
      const aid = r.artistId ?? r.artist?.id;
      if (aid && r.downloadId) dlIds.set(String(r.downloadId).toLowerCase(), aid);
      if (aid) {
        const cur = artists.get(aid);
        // An artist's figure is the album that has come furthest, which is what
        // a row of one bar can honestly say.
        if (cur === undefined || done > cur) artists.set(aid, done);
      }
    }
    this._lidarrQueuePct = pct;
    this._lidarrQueueArtists = artists;
    this._dlMediaLidarr = dlIds;
  } catch (_) {
    this._lidarrQueue = new Set();
    this._lidarrQueuePct = new Map();
    this._lidarrQueueArtists = new Map();
    this._dlMediaLidarr = new Map();
  }
}

// Which backend can answer for music at all. Tracearr 2.x keys its lookups on
// tmdb and tvdb ids, which no artist has, so the order the popup uses drops to
// the two that key on the media server's own item: Jellystat through Jellyfin,
// Tautulli through Plex.
_musStatsSource() {
  if (this._tracearrConfigured !== false) return 'tracearr';
  if (this._jellystatConfigured !== false && this._jellyfinConfigured) return 'jellystat';
  if (this._tautulliConfigured !== false && this._plexConfigured !== false) return 'tautulli';
  return null;
}

// Tracearr has no server-side filter worth using — mediaType and artistName are
// ignored, and search matches the track title only — so the history is walked
// the way the film popup walks it, and the artist is matched in the card.
async _musTracearrStats(name, fmt, asTime) {
  const want = String(name).toLowerCase();
  const seen = new Map();
  let cursor = null;
  let anyTrack = false;
  for (let i = 0; i < 20; i++) {
    const q = `pageSize=100&order=desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const r = await this._callApi('GET', `arr_stack/tracearr/v1/sessions/history?${q}`);
    const data = r?.data || [];
    let fresh = 0;
    for (const x of data) {
      if (seen.has(x.id)) continue;
      fresh++;
      if (x.mediaType !== 'track') { seen.set(x.id, null); continue; }
      anyTrack = true;
      seen.set(x.id, String(x.artistName || '').toLowerCase() === want ? x : null);
    }
    cursor = r?.nextCursor || null;
    if (!r?.hasMore || !cursor || !data.length || !fresh) break;
  }
  const rows = [...seen.values()].filter(Boolean);
  // No music in the history at all means Tracearr cannot answer for this, which
  // is a different thing from an artist nobody has played.
  if (!rows.length) return anyTrack ? { any: false } : null;

  const perUser = new Map();
  for (const r of rows) {
    const uid  = r.serverUserId || r.user?.id || '';
    const who  = r.user?.username || r.user?.identityName || '';
    const u    = perUser.get(uid) || { name: who, ms: 0 };
    u.ms += Number(r.durationMs) || 0;
    if (who) u.name = who;
    perUser.set(uid, u);
  }
  const ranked = [...perUser.values()].sort((a, b) => b.ms - a.ms);
  const rest = ranked.slice(1).map(u => u.name).filter(Boolean);
  const newest = rows.map(r => r.stoppedAt || r.startedAt).filter(Boolean).sort().pop();
  return {
    any: true,
    tracks: new Set(rows.map(r => r.mediaTitle).filter(Boolean)).size,
    plays: rows.length,
    watched: asTime(ranked.reduce((n, u) => n + u.ms, 0) / 1000),
    last: newest ? fmt.format(new Date(newest)) : '',
    top: ranked[0]?.name || '',
    others: rest.slice(0, 3).join(', ') + (rest.length > 3 ? ` +${rest.length - 3}` : ''),
  };
}

// Whether either backend could answer, which is what decides if the entry is
// offered at all — the one that runs first may still come up empty.
_musStatsPossible() {
  return this._musStatsSource() !== null;
}

async _musLoadStats() {
  const m = this._musicModal;
  const name = m?.artist?.artistName;
  if (!name) return;
  this._musStats = null;
  const id = m.artistId;
  const done = (st) => {
    if (this._musicModal?.artistId !== id) return;
    this._musStats = st;
    this._musPatchDrawer('stats');
  };
  const fmt = this._uiDateFmt();
  const asTime = (secs) => {
    const mins = Math.round(secs / 60);
    if (!mins) return '';
    return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  };

  const src = this._musStatsSource();
  try {
    if (src === 'tracearr') {
      const tra = await this._musTracearrStats(name, fmt, asTime).catch(() => null);
      if (tra) { done(tra); return; }
      // Tracearr saw no music at all — let the per-server sources try.
    }
    if (this._jellystatConfigured !== false && this._jellyfinConfigured) {
      const mbid = m.artist?.foreignArtistId || '';
      const q = `name=${encodeURIComponent(name)}${mbid ? `&mbid=${encodeURIComponent(mbid)}` : ''}`;
      const hit = await this._callApi('GET', `arr_stack/jellyfin/artist?${q}`).catch(() => null);
      if (hit?.id) {
        const det = await this._callApi('POST', 'arr_stack/jellystat/getItemDetails', { Id: hit.id }).catch(() => null);
        const row = Array.isArray(det) ? det[0] : (det?.[0] || det);
        const plays = Number(row?.times_played) || 0;
        const secs  = Number(row?.total_play_time) || 0;
        if (plays || secs) {
          const hist = await this._callApi('POST', 'arr_stack/jellystat/getItemHistory?size=200&page=1', { itemid: hit.id }).catch(() => null);
          const rows = hist?.results || hist?.rows || (Array.isArray(hist) ? hist : []);
          const perUser = new Map();
          for (const r of rows) {
            const who = r.UserName || r.userName || r.User || '';
            if (who) perUser.set(who, (perUser.get(who) || 0) + (Number(r.PlaybackDuration) || 0));
          }
          const ranked = [...perUser.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
          const dates = rows.map(r => r.ActivityDateInserted).filter(Boolean).sort();
          done({
            any: true, plays, watched: asTime(secs),
            last: dates.length ? fmt.format(new Date(dates[dates.length - 1])) : '',
            top: ranked[0] || '',
            others: ranked.slice(1, 4).join(', ') + (ranked.length > 4 ? ` +${ranked.length - 4}` : ''),
          });
          return;
        }
      }
      // Jellyfin may hold no music at all, which is not the same answer as
      // never played — so this falls through to Tautulli rather than settling.
    }

    if (this._tautulliConfigured === false || this._plexConfigured === false) {
      done({ any: false });
      return;
    }

    // Tautulli logs a play per track, and every track carries its artist as the
    // grandparent — so one query by the artist's Plex key is the whole history.
    const hit = await this._callApi('GET', `arr_stack/plex/artist?name=${encodeURIComponent(name)}`).catch(() => null);
    if (!hit?.plex_key) { done({ any: false }); return; }
    const raw = await this._callApi('GET', `arr_stack/tautulli/get_history?grandparent_rating_key=${encodeURIComponent(hit.plex_key)}&length=500`);
    const rows = raw?.response?.data?.data || [];
    if (!rows.length) { done({ any: false }); return; }
    const perUser = new Map();
    for (const r of rows) {
      const who = r.friendly_name || r.user;
      if (who) perUser.set(who, (perUser.get(who) || 0) + (Number(r.duration) || 0));
    }
    const ranked = [...perUser.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const secs = rows.reduce((n, r) => n + (Number(r.duration) || 0), 0);
    const newest = rows.reduce((acc, r) => Math.max(acc, Number(r.date) || 0), 0);
    done({
      any: true,
      // Distinct tracks says more about an artist than the raw count of plays,
      // which a single album on repeat runs away with.
      tracks: new Set(rows.map(r => r.title).filter(Boolean)).size,
      plays: rows.length,
      watched: asTime(secs),
      last: newest ? fmt.format(new Date(newest * 1000)) : '',
      top: ranked[0] || '',
      others: ranked.slice(1, 4).join(', ') + (ranked.length > 4 ? ` +${ranked.length - 4}` : ''),
    });
  } catch (e) {
    console.warn('[arr-card] listen stats failed:', e);
    done({ any: false });
  }
}

_musOrigin(artist) {
  const mbid = artist?.foreignArtistId;
  if (!mbid) return [];
  this._musOriginMap = this._musOriginMap || new Map();
  if (this._musOriginMap.has(mbid)) {
    const cc = this._musOriginMap.get(mbid);
    return cc ? [cc] : [];
  }
  // Anything being drawn is on screen, so the queue is ordered by how recently
  // it was asked for: re-adding moves an id to the end, and the batch is taken
  // from there. Turning a page of the library, or opening one at all, therefore
  // overtakes whatever the last page left behind.
  this._musOriginQueue = this._musOriginQueue || new Set();
  this._musOriginQueue.delete(mbid);
  this._musOriginQueue.add(mbid);
  this._musOriginSoon();
  return [];
}

_musOriginSoon() {
  if (this._musOriginBusy) return;
  this._musOriginBusy = true;
  setTimeout(async () => {
    // Twenty at a time: MusicBrainz answers a whole batch to one search, which
    // is the difference between a second and twenty of them.
    while (this._musOriginQueue?.size) {
      const batch = [...this._musOriginQueue].slice(-20);
      batch.forEach(id => this._musOriginQueue.delete(id));
      try {
        const r = await this._callApi('GET', `arr_stack/lidarr/origins?mbids=${batch.join(',')}`);
        let changed = false;
        for (const id of batch) {
          const cc = r?.[id] ?? null;
          this._musOriginMap.set(id, cc);
          if (cc) changed = true;
        }
        // Repaint per batch rather than at the end, so what is on screen fills
        // in without waiting for the rest of the library.
        if (changed) this._lidarrRepaint();
      } catch (_) {
        batch.forEach(id => this._musOriginMap.set(id, null));
      }
    }
    this._musOriginBusy = false;
  }, 80);
}

}

export const fetchMusicMixin = _FetchMusicMethods.prototype;
