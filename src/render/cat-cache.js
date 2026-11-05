// The card's first moments on a slow line. Until every service has answered,
// the right column used to wait for the slowest one and showed nothing of
// substance. Now:
//
// - each category is drawn as soon as its own data is in (_catLoaded), the
//   rest a moment later, at most one repaint per beat (_renderSoon);
// - a category whose data is not in yet shows what it showed last time on this
//   device — its markup kept in localStorage, inert until the real one comes;
// - with nothing kept, the phone's list shows grey poster shapes instead of the
//   apps' icons.
//
// What is kept: one localStorage key, a few cards' worth of markup per
// category, capped (CAT_CACHE_CAP), the two most recent card setups only, and
// thrown away after a fortnight or a new version of the card. Posters are not
// kept here — the browser's own cache holds those.

const CAT_CACHE_KEY = 'arr-cat-cache';
const CAT_CACHE_CAP = 90_000;               // characters of markup per setup
const CAT_CACHE_AGE = 14 * 24 * 3600_000;
const CAT_CACHE_KEEP = 2;                    // card setups (two cards, two dashboards)
// Drawn from what is live this second — a stream that ended, a request since
// approved — and wrong when shown from last time
const CAT_CACHE_SKIP = new Set(['streams', 'pending']);
const CAT_CACHE_EVERY = 5 * 60_000;
const BOOT_KEY = 'arr-boot';

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

class _CatCacheMethods {

// A category counts as in until the card starts tracking (tests, a card built
// by hand) and once the first full round is done
_catIsReady(id) {
  return !this._catReady || this._catAllReady || this._catReady.has(id);
}

// The setup the kept markup belongs to: another config, user, language or
// version of the card draws other markup
get _catCacheId() {
  const ver = typeof __CARD_VERSION__ !== 'undefined' ? __CARD_VERSION__ : '';
  return hash([ver, this._hass?.user?.id || '', this._lg?.() || '', JSON.stringify(this._config || {})].join('|'));
}

_catCacheRead() {
  try { return JSON.parse(localStorage.getItem(CAT_CACHE_KEY) || '{}') || {}; } catch { return {}; }
}

_catCacheLoad() {
  const e = this._catCacheRead()[this._catCacheId];
  this._catCache = e && Date.now() - (e.at || 0) < CAT_CACHE_AGE ? (e.c || null) : null;
}

// What the categories drew with all their data in, newest over what was kept;
// categories on pages not drawn this time keep what they had
_catCacheSave() {
  this._catSavedAt = Date.now();
  const html = this._catHtmlNow || {};
  const peek = this._catPeekNow || {};
  const prev = this._catCache || {};
  const order = [...new Set([...(this._catOrder || []), ...Object.keys(html), ...Object.keys(prev)])];
  const c = {};
  let size = 0;
  for (const id of order) {
    if (CAT_CACHE_SKIP.has(id)) continue;
    const e = {};
    const p = peek[id] || prev[id];
    if (p?.i?.length) { e.t = p.t; e.i = p.i; }
    const h = html[id] ?? prev[id]?.h;
    if (h && size + h.length <= CAT_CACHE_CAP) { e.h = h; size += h.length; }
    if (e.h || e.i) c[id] = e;
  }
  this._catCache = c;
  const all = this._catCacheRead();
  all[this._catCacheId] = { at: Date.now(), c };
  const keep = Object.entries(all).sort((a, b) => (b[1]?.at || 0) - (a[1]?.at || 0)).slice(0, CAT_CACHE_KEEP);
  try { localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(Object.fromEntries(keep))); }
  catch { try { localStorage.removeItem(CAT_CACHE_KEY); } catch { /* storage off */ } }
}

// After a full round of fetching: kept at once the first time, then now and
// then — a poll that changes something every 30 s does not write every 30 s
_catCacheSaveSoon(first) {
  if (!first && Date.now() - (this._catSavedAt || 0) < CAT_CACHE_EVERY) return;
  setTimeout(() => this._catCacheSave(), 1000);
}

// A category's draw, wrapped: the live one once its data is in (noted for
// keeping when everything is), last time's until then
_catFn(id, fn) {
  return () => {
    if (this._catIsReady(id)) {
      const h = fn();
      if (this._catAllReady) (this._catHtmlNow ||= {})[id] = h;
      return h;
    }
    const kept = this._catCache?.[id]?.h;
    return kept ? this._catStale(kept) : fn();
  };
}

// Last time's markup can be looked at, not used: its titles' data is not in
// yet. `inert` takes it out of taps and focus until the live one replaces it.
_catStale(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  for (const el of tpl.content.children) { el.setAttribute('inert', ''); el.classList.add('arr-stale'); }
  return tpl.innerHTML;
}

// The list's peek of a category: what it shows now, noted for next time once
// everything is in; last time's, or grey shapes, until its data comes
_catPeek(id, title, imgs) {
  if (imgs.length) {
    if (this._catAllReady) (this._catPeekNow ||= {})[id] = { t: title, i: imgs };
    return imgs;
  }
  if (this._catIsReady(id)) return imgs;
  return this._catCache?.[id]?.i || null;   // null: not in yet, nothing kept
}

// Start of the first round: what is kept is drawn before anything is asked
_catStart() {
  if (this._catReady) return;
  this._loadLogStart();
  this._catReady = new Set();
  this._catCacheLoad();
  if (this._catCache) { this._render(); this._loadLogMark('kept'); }
}

_catLoaded(ids) {
  if (!this._catReady || this._catAllReady) return;
  for (const id of ids) this._catReady.add(id);
  this._renderSoon();
}

// Several categories come in within moments of each other: one repaint for them
_renderSoon() {
  if (this._renderSoonT) return;
  this._renderSoonT = setTimeout(() => {
    this._renderSoonT = null;
    if (!this._catAllReady && this.isConnected) { this._render(); this._loadLogMark('firstCat'); }
  }, 150);
}

_catDone() {
  this._catAllReady = true;
  clearTimeout(this._renderSoonT);
  this._renderSoonT = null;
  this._loadLogPrint();
}

// ── What the first load spent its time on ─────────────────────────────────
// One collapsed line in the browser's console per page load: how long until
// the first category stood on the screen, until everything did, and each
// service's answer, slowest first. For telling which one holds a phone up.

_loadLogStart() {
  if (this._loadLog) return;
  const at = typeof performance !== 'undefined' ? performance.now() : Date.now();
  this._loadLog = { at, calls: new Map(), done: false };
}

_loadLogCall(path, ms) {
  const log = this._loadLog;
  if (!log || log.done) return;
  const key = String(path).replace(/^arr_stack\//, '').replace(/\?.*$/, '');
  const e = log.calls.get(key) || { n: 0, ms: 0 };
  e.n += 1; e.ms = Math.max(e.ms, ms);
  log.calls.set(key, e);
}

_loadLogMark(what) {
  const log = this._loadLog;
  if (log && !log.done && log[what] == null) log[what] = performance.now() - log.at;
}

_loadLogPrint() {
  const log = this._loadLog;
  if (!log || log.done) return;
  log.done = true;
  const all = Math.round(performance.now() - log.at);
  const first = log.firstCat != null ? Math.round(log.firstCat) : all;
  const rows = [...log.calls].sort((a, b) => b[1].ms - a[1].ms)
    .map(([call, e]) => ({ call, ms: Math.round(e.ms), times: e.n }));
  const kept = log.kept != null ? `, last time's look at ${Math.round(log.kept)} ms` : '';
  try {
    console.groupCollapsed(`[arr-card] first load: everything ${all} ms, first category ${first} ms${kept} (page open ${Math.round(log.at)} ms before)`);
    console.table(rows);
    console.groupEnd();
  } catch { /* a console without groups */ }
}

// ── What the card asks before anything else ───────────────────────────────
// Which services are set up, and which Radarr and Sonarr Seerr requests go to:
// four answers, one after another, before the first title was asked for. They
// hardly ever change, so last time's are used at once and asked again behind.

_bootRead() {
  try { return JSON.parse(localStorage.getItem(BOOT_KEY) || 'null'); } catch { return null; }
}

_bootSave(caps) {
  const boot = {
    at: Date.now(), caps,
    o: this._overseerrConfigured,
    r: this._seerrRadarr || null, r2: this._seerrRadarr2 || null,
    s: this._seerrSonarr || null, s2: this._seerrSonarr2 || null,
  };
  try { localStorage.setItem(BOOT_KEY, JSON.stringify(boot)); } catch { /* storage off */ }
}

// Last time's answers, when there are any young enough: true when used
_bootApply() {
  const b = this._bootRead();
  if (!b?.caps || Date.now() - (b.at || 0) > CAT_CACHE_AGE) return false;
  this._applyCaps(b.caps);
  this._capsLoaded = true;
  if (this._overseerrConfigured !== false && typeof b.o === 'boolean') {
    this._overseerrConfigured = b.o;
    if (b.r) this._seerrRadarr = b.r;
    if (b.r2) this._seerrRadarr2 = b.r2;
    if (b.s) this._seerrSonarr = b.s;
    if (b.s2) this._seerrSonarr2 = b.s2;
  }
  return true;
}

}

export const catCacheMixin = _CatCacheMethods.prototype;
export { CAT_CACHE_KEY, CAT_CACHE_CAP, BOOT_KEY };
