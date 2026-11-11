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

import { authTag, sigDead, dropDeadSigs } from '../shared/signed.js';

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
  if (this._catCache) this._catCache = this._catDropDeadSigs(this._catCache, e.s === authTag(this._hass));
}

// Pictures kept with a signature that no longer loads — another login's, or
// one past its end (Lidarr's last half a day) — are left out rather than
// asked for: each would be a 401 in the console and a broken picture
_catDropDeadSigs(c, sameLogin) {
  const now = Date.now();
  const out = {};
  for (const [id, e] of Object.entries(c)) {
    const n = { ...e };
    if (n.h) n.h = dropDeadSigs(n.h, sameLogin, now);
    if (n.i) {
      n.i = n.i.filter(u => !sigDead(u, sameLogin, now));
      if (!n.i.length) delete n.i;
    }
    out[id] = n;
  }
  return out;
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
  all[this._catCacheId] = { at: Date.now(), s: authTag(this._hass), c };
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

// The list's peeks change once, not at every step of the first load. Until
// every category is in and the posters' signatures have come (render/
// arr-img.js), a peek keeps what it showed last time, or grey shapes; then
// each takes its own posters in one go, and is dealt in once. Latched: once
// settled, a signature asked later (the Library opening) changes nothing here.
get _peeksSettled() {
  if (!this._catReady || this._peeksSettledOnce) return true;
  if (!this._catAllReady || this._arrImgBusy) return false;
  this._peeksSettledOnce = true;
  return true;
}

// The list's peek of a category: what it shows now, noted for next time once
// everything is in; last time's, or grey shapes, until then
_catPeek(id, title, imgs) {
  if (!this._peeksSettled) {
    const kept = this._catCache?.[id]?.i;
    if (kept?.length) return kept;
    // A category with nothing kept shows its own posters when they are in,
    // as long as none is still waiting for its signature
    if (!this._catIsReady(id)) return null;   // null: grey shapes
    // One never kept (Now Playing, pending requests) has nothing of last
    // time's to show meanwhile: it waited on every other category and every
    // poster's signature, the longest of all. Its own pictures as soon as
    // they are in.
    if (CAT_CACHE_SKIP.has(id)) return imgs;
    if (this._arrImgBusy) return null;
    return imgs;
  }
  if (imgs.length && this._catAllReady) (this._catPeekNow ||= {})[id] = { t: title, i: imgs };
  return imgs;
}

// Start of the first round: what is kept is drawn before anything is asked
_catStart() {
  if (this._catReady) return;
  this._heightLogStart();
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
  this._heightsLoading = false;
  // The heights measured while loading are dropped: measured afresh with
  // everything in (wire/sections.js _syncSecHeights, render/layout.js)
  this._secMaxH = 0;
  this._secWrapH = 0;
  this._rightMaxHFor = null;
  clearTimeout(this._renderSoonT);
  this._renderSoonT = null;
  this._loadLogPrint();
}

// ── What the first load spent its time on (debug, off unless asked for) ───
// localStorage.setItem('arr-debug-load', '1') and reload: one collapsed line
// in the browser's console per page load — how long until the first category
// stood on the screen, until everything did, and each service's answer,
// slowest first. For telling which one holds a phone up.

_loadLogStart() {
  if (this._loadLog) return;
  let on = false;
  try { on = localStorage.getItem('arr-debug-load') === '1'; } catch { /* storage off */ }
  if (!on) return;
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

// ── Why the columns grow (debug, off unless asked for) ─────────────────────
// localStorage.setItem('arr-debug-height', '1') and reload: every change of
// the columns' height and of what decides it is written to the console for
// the first 20 s, with the card's state at that moment, and a table at the end.

_heightLogStart() {
  let on = false;
  try { on = localStorage.getItem('arr-debug-height') === '1'; } catch { /* storage off */ }
  if (!on || this._heightLog) return;
  const t0 = performance.now();
  const rows = (this._heightLog = []);
  let last = '';
  const snap = why => {
    const sr = this.shadowRoot;
    const r = sr?.getElementById('col-right');
    const l = sr?.getElementById('col-left');
    if (!r) return;
    const cards = [...r.querySelectorAll('.sec-card:not(.sec-search)')];
    const item = r.querySelector('.mgrid > *, .tl-row > *');
    const row = {
      ms: Math.round(performance.now() - t0),
      why,
      layout: this._mobLayout,
      body: sr.querySelector('.card-body')?.className.replace('card-body', '').trim(),
      win: `${innerWidth}x${innerHeight}`,
      rW: r.clientWidth,
      R: r.offsetHeight,
      L: l?.offsetHeight,
      rMin: r.style.minHeight,
      rMax: r.style.maxHeight,
      lMin: l?.style.minHeight,
      secMin: r.style.getPropertyValue('--sec-min-h'),
      secWrap: r.style.getPropertyValue('--sec-wrap-h'),
      shelf: r.style.getPropertyValue('--shelf-h'),
      cards: cards.map(c => c.offsetHeight).join('/'),
      item: item ? `${item.offsetWidth}x${item.offsetHeight}` : '',
      rightMaxH: this._rightMaxH,
      flowSecH: this._flowSecH,
      secMaxH: this._secMaxH,
      over: this._shelfOver,
      pages: this._flowPages?.length ?? null,
      ready: this._catAllReady ? 'all' : (this._catReady?.size ?? '-'),
      caps: !!this._capsLoaded,
      overlay: this._overlay?.section || '',
      search: !!this._searchActive,
    };
    const key = JSON.stringify({ ...row, ms: 0, why: '' });
    if (key === last) return;
    last = key;
    rows.push(row);
    console.log('[arr-height]', row.ms, why, row);
  };
  this._heightSnap = snap;
  const watch = () => {
    const sr = this.shadowRoot;
    const r = sr?.getElementById('col-right');
    if (!r) { requestAnimationFrame(watch); return; }
    const l = sr.getElementById('col-left');
    const mo = new MutationObserver(ms => snap('attr:' + [...new Set(ms.map(m => `${m.target.id || m.target.className}.${m.attributeName}`))].join(',')));
    for (const el of [r, l, sr.querySelector('.card-body')].filter(Boolean)) mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    const ro = new ResizeObserver(() => snap('resize'));
    ro.observe(r); if (l) ro.observe(l);
    const tick = setInterval(() => snap('tick'), 250);
    setTimeout(() => {
      mo.disconnect(); ro.disconnect(); clearInterval(tick);
      this._heightSnap = null;
      try {
        console.groupCollapsed(`[arr-height] ${rows.length} changes in 20 s — copy this table`);
        console.table(rows);
        console.log(JSON.stringify(rows));
        console.groupEnd();
      } catch { /* a console without groups */ }
    }, 20000);
  };
  watch();
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
