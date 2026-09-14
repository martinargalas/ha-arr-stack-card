// Fetching for Music artwork: Lidarr covers, signed URLs, and the Deezer fallback. Split out of fetch/arr.js.

class _FetchMusicArtMethods {

// Cover, and the backdrop it sits on. Album art is square and the card's grid
// is 2:3, so the frame is filled with the artist's fanart where there is one —
// covers are on 99% of albums, fanart on 82% of artists, so the blurred cover
// stands in for the rest rather than leaving a flat panel.
_lidarrCover(album) {
  if (album?._mbCover) return album._mbCover;
  this._wireLidarrDeadImgs();
  // The proxy first, and only because it can shrink: the remote address the
  // record carries answers with the same full-size file whichever size is asked
  // for — measured, -500 and -1200 both come back at 59 kB. The absolute URL is
  // the fallback for a cover Lidarr never wrote to disk.
  const img = (album?.images || []).find(i => i.coverType === 'cover');
  if (img && album?.id) {
    const viaApi = this._lidarrImg('album', album.id, `cover${img.extension || '.jpg'}`, 400);
    if (viaApi !== null) return viaApi;
  }
  return this._lidarrCoverOf(album?.images, 'cover') || this._altAlbumCover(album);
}

// Cover Art Archive publishes a 250 and a 500 alongside every 1200 it stores,
// and the address Lidarr hands out is always the 1200 — a third of a megabyte
// for a cover drawn at a couple of hundred pixels. The 500 is a fifth of that
// and still sharp on a retina grid.
_lidarrThumbUrl(u) {
  return typeof u === 'string' ? u.replace(/-1200(\.(?:jpg|jpeg|png))(\?.*)?$/i, '-500$1$2') : u;
}

_lidarrBackdrop(album) {
  const artist = this._lidarrArtists?.get(album?.artistId);
  return this._lidarrArtistImage(artist, 'fanart');
}

// Artist artwork comes in four shapes and none of them is 2:3 — measured on a
// real library, `poster` is a 1000x1000 square, fanart 16:9, banner and logo
// wider still. So the square is what a card shows, over the fanart.
// Lidarr rewrites artwork URLs to container paths once it has cached the files,
// so most artists end up with nothing the browser can load. Its mediacover API
// serves the same files to an API key, and Home Assistant will sign a path so an
// <img> can fetch it without the key ever reaching the page. Signatures are
// asked for once per image and cached; anything still unsigned renders from
// whatever absolute URL the payload happens to have.
// `width` asks the proxy for a downscaled copy: Lidarr keeps no small version
// of an album cover, so a tile a couple of hundred pixels wide otherwise pulls
// the full 59 kB original apiece.
_lidarrImg(kind, id, file, width = 0) {
  if (!id || !file) return null;
  this._wireLidarrDeadImgs();
  const path = `/api/arr_stack/lidarr/image?kind=${kind}&id=${id}&file=${encodeURIComponent(file)}${width ? `&w=${width}` : ''}`;
  this._lidarrSigned = this._lidarrSigned || new Map();
  if (this._lidarrDead?.has(path)) return null;
  if (this._lidarrSigned.has(path)) return this._lidarrSigned.get(path);
  this._lidarrSignQueue = this._lidarrSignQueue || new Set();
  if (!this._lidarrSignQueue.has(path)) {
    this._lidarrSignQueue.add(path);
    this._lidarrSignSoon();
  }
  return undefined;   // signature pending, not absent
}

// Batched: a row of cards asks for a dozen signatures in the same tick, and one
// re-render at the end beats one per image.
_lidarrSignSoon() {
  if (this._lidarrSignTimer) return;
  this._lidarrSignTimer = setTimeout(async () => {
    this._lidarrSignTimer = null;
    const paths = [...(this._lidarrSignQueue || [])];
    this._lidarrSignQueue = new Set();
    if (!paths.length) return;
    let changed = false;
    await Promise.all(paths.map(async path => {
      try {
        const res = await this._hass.callWS({ type: 'auth/sign_path', path, expires: 60 * 60 * 12 });
        if (res?.path) { this._lidarrSigned.set(path, res.path); changed = true; }
      } catch (_) {
        this._lidarrSigned.set(path, null);   // do not ask again this session
      }
    }));
    if (!changed) return;
    this._lidarrRepaint();
  }, 60);
}

// Everything Lidarr artwork is drawn on: the row in the right column, the
// artist modal, the calendar and the library — the last two hang off the shadow
// root and are reached by neither of the others, so a cover that arrived after
// the first paint never appeared there. That is why the calendar showed
// initials where an album has a perfectly good cover.
_lidarrRepaint() {
  if (this._musicModal) this._renderMusicModalEl();
  if (this._calendarModalOpen) this._renderCalendarModalEl();
  const lib = this.shadowRoot?.querySelector('[data-lib-modal]');
  if (lib && this._libModal) this._libRerenderBody(lib);
  this._reRenderSection?.('recentlyAdded');
  // The search results too: an artist from the library found by a search drew
  // its initial while the signature was fetched, and nothing redrew the grid
  // once it came - opening the artist showed the picture at once.
  if (this._searchActive) this._reRenderSearchResults?.();
}

// Lidarr's mediacover API answers for most artwork it lists and 404s for the
// rest — a file it never wrote, or wrote under a name it no longer reports.
// One listener over the whole card notes those paths so the next paint reaches
// for the remote address instead, and no page of the library asks twice.
_wireLidarrDeadImgs() {
  if (this._lidarrDeadWired || !this.shadowRoot) return;
  this._lidarrDeadWired = true;
  this.shadowRoot.addEventListener('load', ev => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src');
    if (!src || !img.closest('.mus-alb-art')) return;
    this._musArtSeen = this._musArtSeen || new Set();
    this._musArtSeen.add(src);
  }, true);
  this.shadowRoot.addEventListener('error', ev => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src') || '';
    if (!src.includes('/api/arr_stack/lidarr/image?')) return;
    // Back to the unsigned path _lidarrImg builds, which is what it looks up.
    const path = src.replace(/^https?:\/\/[^/]+/, '').replace(/&authSig=[^&]*/, '');
    this._lidarrDead = this._lidarrDead || new Set();
    if (this._lidarrDead.has(path)) return;
    this._lidarrDead.add(path);
    // A page of covers fails together; repaint once at the end of the burst.
    clearTimeout(this._lidarrDeadTimer);
    this._lidarrDeadTimer = setTimeout(() => this._lidarrRepaint(), 120);
  }, true);
}

_lidarrArtistImage(artist, type, { full = false, w = 0 } = {}) {
  const img = (artist?.images || []).find(i => i.coverType === type);
  if (!img) return this._altArtistImage(artist, type, { full, w });
  // Lidarr downscales what it caches — a poster to 500px, fanart to 360, a
  // banner to 70 — and nothing here draws artwork anywhere near full size. The
  // thumbnail lives behind the API key while the remote address only ever has
  // the original, which is why the proxy is asked first now: measured on this
  // library a poster is 460 kB against 65, fanart 1.5 MB against 90.
  const size = full ? 0 : ({ poster: 500, fanart: 360, banner: 70 })[type];
  const ext  = img.extension || '.jpg';
  // `w` shrinks it further in the proxy: a poster tile is a couple of hundred
  // pixels wide and Lidarr's smallest copy is 500 — 78 kB apiece, which a row
  // of them makes you wait for.
  const viaApi = this._lidarrImg('artist', artist.id, size ? `${type}-${size}${ext}` : `${type}${ext}`, w);
  if (viaApi) return viaApi;
  // Undefined means the signature is one tick away — a frame of placeholder
  // beats starting a download of the full-size copy we are trying to avoid.
  if (viaApi === undefined) return null;
  // Which field holds a usable address depends on where the artist came from:
  // /artist gives a local /MediaCover path in `url` and the source in
  // `remoteUrl` — but on more than half this library that `remoteUrl` is a
  // container path too. The copy embedded in an album has only `url`, absolute.
  // So take whichever is actually a URL.
  const abs = [img.remoteUrl, img.url].find(u => typeof u === 'string' && u.startsWith('http'));
  return abs || this._altArtistImage(artist, type, { full, w });
}

// ── Deezer stand-in artwork ─────────────────────────────────────────────────
// Lidarr's image sources (fanart.tv, TheAudioDB) barely cover Russian music:
// measured on a real library, 43 of 302 artists had no picture at all. The
// proxy finds where Deezer keeps the picture - through MusicBrainz's link to
// Deezer first, a matching album otherwise - and remembers it. The <img> then
// loads straight from Deezer's CDN at the size it is drawn, which is also the
// quickest way to it: a 250px picture is 7 kB and a tenth of a second. Answers
// are kept in localStorage too, so a reload has them before the first paint.
_altArtKey(s) {
  return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

_altArtUrl(kind, hash, px) {
  const s = Math.max(120, Math.min(1000, Math.round(px)));
  return `https://cdn-images.dzcdn.net/images/${kind}/${hash}/${s}x${s}-000000-80-0-0.jpg`;
}

_altArtistImage(artist, type, { full = false, w = 0 } = {}) {
  const e = this._altArtEntry(artist?.foreignArtistId);
  if (!e?.p) return null;
  // Deezer has one square picture. It stands in for the fanart as well, as a
  // backdrop, at the size a backdrop needs.
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const px = (full || type === 'fanart') ? 1000 : (w || 500) * dpr;
  return this._altArtUrl('artist', e.p, px);
}

_altAlbumCover(album) {
  const mbid = album?.artist?.foreignArtistId
    || this._lidarrArtists?.get(album?.artistId)?.foreignArtistId;
  const e = this._altArtEntry(mbid);
  const h = e?.a?.[this._altArtKey(album?.title)];
  return h ? this._altArtUrl('cover', h, 500) : null;
}

// The entry for an artist: { p, a } when Deezer has something, { t } for a
// known miss, null while it is still being looked up (and asked for now).
_altArtEntry(mbid) {
  const key = String(mbid || '').toLowerCase();
  if (!key || this._altArtOff) return null;
  if (!this._altArt) this._altArtLoad();
  const e = this._altArt.get(key);
  if (e) return e;
  this._altArtAsk(key);
  return null;
}

_altArtLoad() {
  this._altArt = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem('arr-altart-v1') || '{}');
    const now = Date.now();
    for (const [k, v] of Object.entries(saved)) {
      const found = !!(v?.p || v?.a);
      // A find is kept a month, a miss a week - the proxy may have found it since.
      if (now - (v?.t || 0) < (found ? 30 : 7) * 864e5) this._altArt.set(k, v);
    }
  } catch (_) {}
}

_altArtSave() {
  try {
    localStorage.setItem('arr-altart-v1', JSON.stringify(Object.fromEntries(this._altArt)));
  } catch (_) {}
}

// Batched, and no artist is asked twice within fifteen seconds: every paint of
// an artist still being looked up comes through here. `first` is the artist
// being opened: the proxy takes it ahead of the rest, and it is asked at once.
_altArtAsk(key, first = false) {
  this._altArtAsked = this._altArtAsked || new Map();
  const at = this._altArtAsked.get(key);
  if (!first && at && Date.now() - at < 15000) return;
  this._altArtAsked.set(key, Date.now());
  this._altArtQueue = this._altArtQueue || new Set();
  this._altArtQueue.add(key);
  if (first) this._altArtFirst = key;
  if (this._altArtTimer && !first) return;
  clearTimeout(this._altArtTimer);
  this._altArtTimer = setTimeout(() => this._altArtFlush(), first ? 0 : 80);
}

// Opening an artist Deezer has not been asked about yet puts it first in line.
_altArtPrioritize(mbid) {
  const key = String(mbid || '').toLowerCase();
  if (!key || this._altArtOff) return;
  if (!this._altArt) this._altArtLoad();
  if (!this._altArt.has(key)) this._altArtAsk(key, true);
}

async _altArtFlush() {
  this._altArtTimer = null;
  const keys = [...(this._altArtQueue || [])].filter(k => !this._altArt?.has(k));
  const first = this._altArtFirst && keys.includes(this._altArtFirst) ? this._altArtFirst : '';
  this._altArtQueue = new Set();
  this._altArtFirst = null;
  if (!keys.length) return;
  let res;
  try {
    res = await this._callApi('GET', `arr_stack/lidarr/altart?artists=${keys.join(',')}${first ? `&first=${first}` : ''}`);
  } catch (e) {
    // An integration older than the endpoint answers 404: stop asking.
    if (e?.status === 404) this._altArtOff = true;
    return;
  }
  if (!this._altArt) this._altArtLoad();
  let found = false;
  const now = Date.now();
  for (const k of keys) {
    if (!res || !(k in res)) continue;            // still being looked up
    const v = res[k];
    this._altArt.set(k, v ? { p: v.p || null, a: v.a || {}, t: now } : { t: now });
    if (v) found = true;
  }
  this._altArtSave();
  if (found) {
    this._lidarrRepaint();
    this._reRenderSection?.('recommendations');
    this._reRenderSection?.('recentlyRequested');
  }
  // What is left is still being looked up: ask again shortly - within a few
  // seconds for the artist someone is looking at, which the proxy does first.
  const left = keys.filter(k => !this._altArt.has(k));
  if (left.length && res?._pending) {
    const soon = first && left.includes(first);
    setTimeout(() => left.forEach(k => this._altArtAsk(k, soon && k === first)), soon ? 4000 : 16000);
  }
}

_lidarrCoverOf(images, type) {
  const img = (images || []).find(i => i.coverType === type);
  if (!img) return null;
  const abs = [img.remoteUrl, img.url].find(u => typeof u === 'string' && u.startsWith('http'));
  return abs ? this._lidarrThumbUrl(abs) : null;
}

}

export const fetchMusicArtMixin = _FetchMusicArtMethods.prototype;
