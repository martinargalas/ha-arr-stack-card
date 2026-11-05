// Sonarr's posters from Sonarr itself. A show's remote poster is TheTVDB's
// original, a few hundred kB apiece; Sonarr keeps a copy 500 px wide, a tenth
// of that, served by the integration (sonarr/image; its capabilities say arrImage) to a
// path Home Assistant signs — the API key stays in the integration.
//
// Signatures are asked for in batches and kept in localStorage for the next
// load (ARR_IMG_KEEP of them, a month each), so a returning visitor's posters
// need no round trip. A path that fails — an older Sonarr, a show with no
// cached poster, a signature gone stale — falls back to TheTVDB's address.

import { tmdbSized } from '../shared/ui.js';

const ARR_IMG_KEY = 'arr-img-sig';
const ARR_IMG_KEEP = 200;
const ARR_IMG_LIFE = 30 * 24 * 3600;          // seconds, as sign_path takes it
const ARR_IMG_RENEW = 3 * 24 * 3600_000;      // a signature this close to its end is asked again
const ARR_IMG_FILE = 'poster-500.jpg';

class _ArrImgMethods {

// The poster of a Sonarr show: Sonarr's own smaller copy when the integration
// serves it, TheTVDB's otherwise. null while the signature is on its way.
_getSonarrPoster(s) {
  if (!s?.images) return null;
  const img = s.images.find(i => i.coverType === 'poster');
  if (!img) return null;
  const remote = tmdbSized(img.remoteUrl) || null;
  const svc = this._arrImageCap ? this._sonarrSvcOf(s) : null;
  if (!svc) return remote;
  const v = (String(img.url || '').match(/lastWrite=(\d+)/) || [])[1] || '';
  const path = `/api/arr_stack/${svc}/image?id=${s.id}&file=${ARR_IMG_FILE}${v ? `&v=${v}` : ''}`;
  const own = this._arrImg(path);
  return own === undefined ? null : (own || remote);
}

// Which Sonarr the show is in, checked against that instance's own list: an
// object that is not tagged as the second instance's is still only taken for
// the first one's when the id and the TVDB id both match there
_sonarrSvcOf(s) {
  if (!s.id || s.tvdbId == null) return null;
  const has = list => String(this._snIdx(list).get(s.id) ?? '') === String(s.tvdbId);
  const one = this._sonarrAll?.length ? this._sonarrAll : this._sonarr;
  const two = this._sonarr2All?.length ? this._sonarr2All : this._sonarr2;
  if (!s._isSonarr2 && has(one)) return 'sonarr';
  if (has(two)) return 'sonarr2';
  return null;
}

// id → tvdbId of a library, built once per list it is asked of
_snIdx(list) {
  this._snIdxCache ||= new WeakMap();
  if (!Array.isArray(list)) return new Map();
  let m = this._snIdxCache.get(list);
  if (!m) {
    m = new Map(list.map(x => [x.id, x.tvdbId]));
    this._snIdxCache.set(list, m);
  }
  return m;
}

// A signed path for `path`; undefined while it is asked for, null when it
// cannot be had
_arrImg(path) {
  this._wireArrImgDead();
  if (this._arrImgDead?.has(path)) return null;
  const sig = this._arrImgSigs().get(path);
  if (sig && sig[1] - Date.now() > ARR_IMG_RENEW) return sig[0];
  if (sig === null) return null;
  (this._arrImgQueue ||= new Set()).add(path);
  this._arrImgSignSoon();
  // An old signature still good for a few days is used while a new one comes
  return sig && sig[1] > Date.now() ? sig[0] : undefined;
}

_arrImgSigs() {
  if (!this._arrImgSig) {
    this._arrImgSig = new Map();
    try {
      const kept = JSON.parse(localStorage.getItem(ARR_IMG_KEY) || '{}') || {};
      const now = Date.now();
      for (const [p, v] of Object.entries(kept)) if (Array.isArray(v) && v[1] > now) this._arrImgSig.set(p, v);
    } catch { /* storage off */ }
  }
  return this._arrImgSig;
}

_arrImgKeep() {
  const keep = [...this._arrImgSigs()].filter(([, v]) => Array.isArray(v)).slice(-ARR_IMG_KEEP);
  try { localStorage.setItem(ARR_IMG_KEY, JSON.stringify(Object.fromEntries(keep))); }
  catch { /* storage off or full: they are asked again next time */ }
}

// A row of posters asks for a dozen signatures in the same moment: one batch,
// one repaint
_arrImgSignSoon() {
  if (this._arrImgTimer) return;
  this._arrImgTimer = setTimeout(async () => {
    this._arrImgTimer = null;
    const paths = [...(this._arrImgQueue || [])];
    this._arrImgQueue = new Set();
    if (!paths.length) return;
    const sigs = this._arrImgSigs();
    let changed = false;
    await Promise.all(paths.map(async path => {
      try {
        const res = await this._hass.callWS({ type: 'auth/sign_path', path, expires: ARR_IMG_LIFE });
        if (res?.path) {
          sigs.delete(path);     // newest last: the ones kept are the ones used lately
          sigs.set(path, [res.path, Date.now() + ARR_IMG_LIFE * 1000]);
          changed = true;
        }
      } catch {
        sigs.set(path, null);    // not asked again this session
        changed = true;
      }
    }));
    if (!changed) return;
    this._arrImgKeep();
    this._arrImgRepaint();
  }, 40);
}

// Everything a Sonarr poster is drawn on
_arrImgRepaint() {
  if (!this.isConnected) return;
  this._reRenderRight?.();
  this._lidarrRepaint?.();
}

// A path that does not load is noted and the next paint takes TheTVDB's
// address; its signature is forgotten so the next load asks afresh
_wireArrImgDead() {
  if (this._arrImgDeadWired || !this.shadowRoot) return;
  this._arrImgDeadWired = true;
  this.shadowRoot.addEventListener('error', ev => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src') || '';
    if (!/\/api\/arr_stack\/sonarr2?\/image\?/.test(src)) return;
    const path = src.replace(/^https?:\/\/[^/]+/, '').replace(/&authSig=[^&]*/, '');
    if (this._arrImgDead?.has(path)) return;
    (this._arrImgDead ||= new Set()).add(path);
    this._arrImgSigs().delete(path);
    this._arrImgKeep();
    this._arrImgRepaint();
  }, true);
}

}

export const arrImgMixin = _ArrImgMethods.prototype;
export { ARR_IMG_KEY };
