import { STATS_FORCE } from './quick-actions.js';
import { POPUP_TYPE } from '../constants.js';

// Quick actions, watch statistics: who watched and when, from Jellystat, Tracearr or Tautulli. Split out of popup/quick-actions.js.

class _PopupQaStatsMethods {

// Shared placeholder for drawers that fetch on open — Tracearr's history can
// take a couple of seconds, and a row of dots reads as "empty", not "working".
_qaLoadingRow() {
  // Indented like its sibling rows. The double indent this used to show came
  // from the spinner box grabbing flex:1, not from the class.
  return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.7">
    <span class="qa-spin"><span class="action-spinner"></span></span>
    <span>${this._t('loading')}</span>
  </div>`;
}

_qaStatsRowsHtml() {
  const st = this._ppStats;
  if (!st) return this._qaLoadingRow();
  if (!st.any) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaStatsNone')}</div>`;
  const row = (label, value) =>
    `<div class="qa-item qa-sub-item qa-static"><span>${label}</span><span class="qa-air-date">${this._escHtml(value)}</span></div>`;
  return [
    st.eps     ? row(this._t('qaStatsEps'),     st.eps)           : '',
    st.lastEp  ? row(this._t('qaStatsLastEp'),  st.lastEp)        : '',
    st.plays   ? row(this._t('qaStatsPlays'),   String(st.plays)) : '',
    st.done    ? row(this._t('qaStatsDone'),    st.done)          : '',
    st.watched ? row(this._t('qaStatsWatched'), st.watched)       : '',
    st.last    ? row(this._t('qaStatsLast'),    st.last)          : '',
    st.top     ? row(this._t('qaStatsTop'),     st.top)           : '',
    st.others  ? row(this._t('qaStatsOthers'),  st.others)        : '',
    st.users   ? row(this._t('qaStatsUsers'),   st.users)         : '',
  ].join('');
}

// Jellystat keys on the Jellyfin item id, so the title has to be resolved on
// the Jellyfin server first. getItemDetails hands back the totals directly;
// getItemHistory fills in who watched and when.
// The Jellyfin item id, cached per popup — both Jellystat and the Tracearr
// matcher need it, and the lookup can walk the whole library.
async _qaJellyfinItemId(d, isTv) {
  if (this._ppJfId?.key === d) return this._ppJfId.id;
  const tmdb = d.tmdbId || d.id || null;
  const _sn = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
           || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
  const tvdb = d.tvdbId || _sn?.tvdbId || null;
  const q = isTv
    ? (tvdb ? `tvdbId=${encodeURIComponent(tvdb)}` : (tmdb ? `tmdbId=${encodeURIComponent(tmdb)}` : null))
    : (tmdb ? `tmdbId=${encodeURIComponent(tmdb)}` : null);
  if (!q) return null;
  const item = await this._callApi('GET', `arr_stack/jellyfin/lookup?${q}`).catch(() => null);
  const id = item?.id || null;
  this._ppJfId = { key: d, id };
  return id;
}

async _qaJellystatStats(d, isTv) {
  const id = await this._qaJellyfinItemId(d, isTv);
  if (!id) return null;

  const det = await this._callApi('POST', 'arr_stack/jellystat/getItemDetails', { Id: id }).catch(() => null);
  const row = Array.isArray(det) ? det[0] : (det?.[0] || det);
  const plays = Number(row?.times_played) || 0;
  const secs  = Number(row?.total_play_time) || 0;
  if (!plays && !secs) return null;

  const hist = await this._callApi('POST', 'arr_stack/jellystat/getItemHistory?size=200&page=1', { itemid: id }).catch(() => null);
  const rows = hist?.results || hist?.rows || (Array.isArray(hist) ? hist : []);
  const perUser = new Map();
  for (const r of rows) {
    const name = r.UserName || r.userName || r.User || '';
    if (!name) continue;
    perUser.set(name, (perUser.get(name) || 0) + (Number(r.PlaybackDuration) || 0));
  }
  const ranked = [...perUser.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const rest = ranked.slice(1);
  const dates = rows.map(r => r.ActivityDateInserted).filter(Boolean).sort();
  const fmt = this._uiDateFmt();
  const mins = Math.round(secs / 60);

  return {
    any: true,
    plays,
    watched: mins ? (mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`) : '',
    last: dates.length ? fmt.format(new Date(dates[dates.length - 1])) : '',
    top: ranked[0] || '',
    others: rest.slice(0, 3).join(', ') + (rest.length > 3 ? ` +${rest.length - 3}` : ''),
  };
}

// Tracearr's per-title aggregate carries no external id and ignores `search`,
// and its titles come from Plex — localised, so "The Secret Life of Pets 2" and
// "Tajný život mazlíčků 2" are the same film under different names. The session
// history is the only place with an id: thumbPath embeds the media-server item,
// so one marker per server is what ties a session back to this title.
// Tracearr 2.x answers per title through its public API; 1.x has no such
// endpoint and has to be matched session by session. One probe decides, cached
// for the session — the answer cannot change without the server restarting.
async _traIsV2() {
  if (this._traV2 !== undefined) return this._traV2;
  this._traV2 = await this._callApi('GET', 'arr_stack/tracearr/v2/public/libraries')
    .then(() => true)
    .catch(() => false);
  return this._traV2;
}

// `movie:tmdb:585` / `show:tvdb:81189` — the ids the popup already carries, so
// none of 1.x's matching through Plex rating keys and Jellyfin item ids applies.
_traMediaRef(d, isTv) {
  const tmdb = d.tmdbId || d.id || null;
  const _sn = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
           || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
  const tvdb = d.tvdbId || _sn?.tvdbId || null;
  if (isTv) return tvdb ? `show:tvdb:${tvdb}` : (tmdb ? `show:tmdb:${tmdb}` : null);
  return tmdb ? `movie:tmdb:${tmdb}` : null;
}

// Tracearr 2.x: totals and viewers in two calls, already de-duplicated across
// servers — the same person on Plex and Jellyfin counts once, and only plays
// past two minutes count at all.
async _qaTracearrV2Stats(d, isTv) {
  const ref = this._traMediaRef(d, isTv);
  if (!ref) return null;
  const enc = encodeURIComponent(ref);
  const [st, wt] = await Promise.all([
    this._callApi('GET', `arr_stack/tracearr/v2/public/media/${enc}/stats`).catch(() => null),
    this._callApi('GET', `arr_stack/tracearr/v2/public/media/${enc}/watchers`).catch(() => null),
  ]);
  const all = st?.windows?.all_time?.combined;
  if (!all) return null;
  if (!all.plays && !all.watch_time_ms) return { any: false };

  const watchers = (wt?.watchers || []).filter(w => w?.user);
  const name = w => w.user.username || w.user.display_name || w.user.name || '';
  const ranked = [...watchers].sort((a, b) => (b.watch_time_ms || 0) - (a.watch_time_ms || 0));
  const rest = ranked.slice(1).map(name).filter(Boolean);
  const mins = Math.round((all.watch_time_ms || 0) / 60000);
  const fmt = this._uiDateFmt();
  const lastDay = ranked.map(w => w.last_watched_day).filter(Boolean).sort().pop();

  const out = {
    any: true,
    watched: mins ? (mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`) : '',
    top: name(ranked[0] || {}) || '',
    others: rest.slice(0, 3).join(', ') + (rest.length > 3 ? ` +${rest.length - 3}` : ''),
    last: lastDay ? fmt.format(new Date(lastDay)) : '',
  };
  if (isTv) {
    // Per viewer, so the highest is the closest thing to "how far the house got"
    const eps = Math.max(0, ...ranked.map(w => w.distinct_episodes_watched || 0));
    const lib = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
             || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
    const total = lib?.statistics?.episodeFileCount || 0;
    if (eps) out.eps = total ? `${eps} / ${total}` : String(eps);
  } else {
    out.plays = all.plays || 0;
  }
  return out;
}

async _qaTracearrStats(d, markers, isTv) {
  const marks = (markers || []).filter(Boolean);
  if (!marks.length) return null;

  // Keyed by session id. The endpoint hands back the same session on every
  // page, so collecting rows blindly counted one viewing twenty times.
  const seen = new Map();
  // Which media servers show up at all. A Tracearr that never sees Jellyfin
  // cannot answer for it, and that is what decides whether Jellystat gets added
  // on top or would be double counting.
  const covers = new Set();
  // Cursor paging: `page`, `offset` and `skip` are all ignored by this endpoint
  // and quietly hand back the newest rows again, so only nextCursor advances.
  let cursor = null;
  for (let i = 0; i < 20; i++) {
    const q = `pageSize=100&order=desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const r = await this._callApi('GET', `arr_stack/tracearr/v1/sessions/history?${q}`);
    const data = r?.data || [];
    let fresh = 0;
    for (const x of data) {
      if (x.server?.type) covers.add(String(x.server.type).toLowerCase());
      if (seen.has(x.id)) continue;
      fresh++;
      seen.set(x.id, marks.some(m => String(x.thumbPath || '').includes(m)) ? x : null);
    }
    cursor = r?.nextCursor || null;
    if (!r?.hasMore || !cursor || !data.length || !fresh) break;
  }
  const rows = [...seen.values()].filter(Boolean);
  if (!rows.length) return null;

  // durationMs is time spent playing — the same figure Tracearr's own totals
  // show. Not to be confused with progressMs, a position in the film, which
  // made skipping to the end register as having watched the whole runtime; nor
  // with pausedDurationMs, which sits alongside durationMs rather than inside
  // it, so subtracting it could drive a real viewing to zero.
  const perUser = new Map();
  for (const r of rows) {
    const uid  = r.serverUserId || r.user?.id || '';
    const name = r.user?.username || r.user?.identityName || '';
    const ms   = Number(r.durationMs) || 0;
    const u    = perUser.get(uid) || { name, ms: 0 };
    u.ms += ms;
    if (name) u.name = name;
    perUser.set(uid, u);
  }

  // Ranked by time watched, not by how many rows they produced — someone who
  // opened it for two minutes should not outrank someone who sat through it.
  const ranked = [...perUser.values()].sort((a, b) => b.ms - a.ms);
  const top    = ranked[0]?.name || '';
  const rest   = ranked.slice(1).map(u => u.name);
  // Three names then a count: the panel is narrow and a long list would clip.
  const others = rest.slice(0, 3).join(', ') + (rest.length > 3 ? ` +${rest.length - 3}` : '');

  const watchedMs = [...perUser.values()].reduce((n, u) => n + u.ms, 0);
  const mins = Math.round(watchedMs / 60000);
  const time = mins ? (mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`) : '';
  const fmt = this._uiDateFmt();

  if (isTv) {
    // A play count says little about a show. How much of it has been seen, and
    // where the viewing got to, is what someone opening this actually wants.
    const code = r => (r.seasonNumber != null && r.episodeNumber != null)
      ? `S${String(r.seasonNumber).padStart(2, '0')}E${String(r.episodeNumber).padStart(2, '0')}`
      : null;
    const seen = new Set(rows.map(code).filter(Boolean));
    const lib = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
             || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
    const total = lib?.statistics?.episodeFileCount || 0;
    const latest = rows
      .filter(r => code(r) && (r.stoppedAt || r.startedAt))
      .sort((a, b) => String(a.stoppedAt || a.startedAt).localeCompare(String(b.stoppedAt || b.startedAt)))
      .pop();
    return {
      any: true,
      eps: seen.size ? (total ? `${seen.size} / ${total}` : String(seen.size)) : '',
      lastEp: latest ? `${code(latest)} · ${fmt.format(new Date(latest.stoppedAt || latest.startedAt))}` : '',
      watched: time,
      top,
      others,
    };
  }

  const newest = rows.map(r => r.stoppedAt || r.startedAt).filter(Boolean).sort().pop();
  return {
    any: true,
    plays: rows.length,
    watched: time,
    last: newest ? fmt.format(new Date(newest)) : '',
    top,
    others,
  };
}

// Tautulli keys history on the Plex item — a show by its own key, since every
// episode row carries the show as its grandparent.
async _qaLoadStats(d, drawerEl) {
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  const done = () => { if (drawerEl && this._ppMenu?.sub === 'stats') drawerEl.innerHTML = this._qaStatsRowsHtml(); };

  // Tracearr watches every server at once, so when it answers it answers for
  // all of them — adding Tautulli on top would count Plex twice. It needs an id
  // per server though: a session only matches through the item it played.
  if (this._tracearrConfigured !== false && (!STATS_FORCE || STATS_FORCE === 'tracearr')) {
    try {
      // 2.x answers by tmdb/tvdb and needs none of the matching below
      if (await this._traIsV2()) {
        // A definite answer either way — including "nothing watched" — ends it;
        // only an unusable reply falls through to the older sources.
        const v2 = await this._qaTracearrV2Stats(d, isTv);
        if (v2) { this._ppStats = v2; done(); return; }
      }
      // Gated on Jellyfin, not on Jellystat: Tracearr matches a session through
      // the item that played it, so the id is worth having even where nothing
      // else queries Jellyfin.
      const [plex, jfId] = await Promise.all([
        this._qaPlexRatingKey(d).catch(() => null),
        this._jellyfinConfigured ? this._qaJellyfinItemId(d, isTv).catch(() => null) : null,
      ]);
      const marks = [
        plex?.ratingKey ? `/library/metadata/${plex.ratingKey}/` : null,
        jfId || null,
      ];
      const tra = await this._qaTracearrStats(d, marks, isTv);
      if (tra) { this._ppStats = tra; done(); return; }
    } catch (_) { /* fall through */ }
  }

  // Otherwise ask whoever can find the title: Tautulli covers Plex, Jellystat
  // covers Jellyfin. They do not overlap, so someone running both servers gets
  // both halves rather than whichever happened to be first.
  if (this._jellystatConfigured !== false && (!STATS_FORCE || STATS_FORCE === 'jellystat')) {
    try {
      const js = await this._qaJellystatStats(d, isTv);
      if (js) { this._ppStats = js; done(); return; }
    } catch (_) { /* fall through */ }
  }

  if (STATS_FORCE && STATS_FORCE !== 'tautulli') { this._ppStats = { any: false }; done(); return; }

  const plex = await this._qaPlexRatingKey(d);
  if (!plex) { this._ppStats = { any: false }; }
  else {
    try {
      const param = isTv ? 'grandparent_rating_key' : 'rating_key';
      const raw = await this._callApi('GET', `arr_stack/tautulli/get_history?${param}=${encodeURIComponent(plex.ratingKey)}&length=500`);
      const rows = raw?.response?.data?.data || [];
      const fmt = this._uiDateFmt();

      // No grouping needed here: a Tautulli row already is one play, and
      // `duration` is seconds actually watched rather than a position.
      const perUser = new Map();
      for (const r of rows) {
        const name = r.friendly_name || r.user;
        if (!name) continue;
        perUser.set(name, (perUser.get(name) || 0) + (Number(r.duration) || 0));
      }
      const ranked = [...perUser.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
      const rest   = ranked.slice(1);
      const secs   = rows.reduce((n, r) => n + (Number(r.duration) || 0), 0);
      const mins   = Math.round(secs / 60);
      const time   = mins ? (mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`) : '';
      const newest = rows.reduce((acc, r) => Math.max(acc, Number(r.date) || 0), 0);
      const base = {
        any: rows.length > 0,
        watched: time,
        top: ranked[0] || '',
        others: rest.slice(0, 3).join(', ') + (rest.length > 3 ? ` +${rest.length - 3}` : ''),
      };

      if (isTv) {
        const code = r => (r.parent_media_index != null && r.media_index != null)
          ? `S${String(r.parent_media_index).padStart(2, '0')}E${String(r.media_index).padStart(2, '0')}`
          : null;
        const seen = new Set(rows.map(code).filter(Boolean));
        const lib = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
                 || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
        const total = lib?.statistics?.episodeFileCount || 0;
        const latest = rows.filter(r => code(r)).sort((a, b) => (Number(a.date) || 0) - (Number(b.date) || 0)).pop();
        this._ppStats = {
          ...base,
          eps: seen.size ? (total ? `${seen.size} / ${total}` : String(seen.size)) : '',
          lastEp: latest ? `${code(latest)} · ${fmt.format(new Date(Number(latest.date) * 1000))}` : '',
        };
      } else {
        this._ppStats = {
          ...base,
          plays: rows.length,
          last: newest ? fmt.format(new Date(newest * 1000)) : '',
        };
      }
    } catch (_) {
      this._ppStats = { any: false };
    }
  }
  if (drawerEl && this._ppMenu?.sub === 'stats') drawerEl.innerHTML = this._qaStatsRowsHtml();
}

}

export const popupQaStatsMixin = _PopupQaStatsMethods.prototype;
