import { POPUP_TYPE } from '../constants.js';

// Quick actions, collections: which Maintainerr collections hold the title, seasons, adding and removing. Split out of popup/quick-actions.js.

class _PopupQaCollectionsMethods {

// ── Quick actions ────────────────────────────────────────────────────────────
// A chevron in the details section. Every entry is gated on its own prerequisite,
// so the menu never offers something that would fail — and when nothing is
// available the chevron itself is not rendered.

// Maintainerr keys media by the media-server item, not by TMDB, and it is a
// Plex-only tool. Without Plex configured there is no way to resolve the id.
_qaMaintainerrReady() {
  return this._plexConfigured !== false
      && this._maintainerrConfigured !== false
      && (this._maintainerr?.collections || []).length > 0;
}

_qaCollectionsFor(d) {
  const isMovie = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
  const want = isMovie ? ['movie'] : ['show', 'season', 'episode'];
  const rules = this._maintainerr?.rules || [];
  return (this._maintainerr?.collections || []).filter(c => {
    const type = c.type || rules.find(r => r.collectionId === c.id)?.dataType;
    return want.includes(type);
  });
}

// tmdbId is meaningless to Maintainerr — it keys on the Plex item.
async _qaPlexRatingKey(d) {
  // The popup carries the TMDB id in `id` for library entries and in `tmdbId`
  // for discover ones — the same `tmdbId || id` pattern used by the remove flow.
  const tmdb = d.tmdbId || d.id || null;
  // A series popup does not always carry tvdbId, but Sonarr's own entry does —
  // and Plex indexes shows by tvdb, so without it the lookup is a certain 404.
  const _snEntry = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
                || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id)
                || d._sonarrSeries || d._sonarr2Series || null;
  const tvdb = d.tvdbId || _snEntry?.tvdbId || null;
  // Shows are matched in Plex by their TVDB guid; asking with a TMDB id finds
  // nothing, which is what made every Maintainerr action fail for series.
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  const first  = isTv ? (tvdb && `tvdbId=${encodeURIComponent(tvdb)}`) : (tmdb && `tmdbId=${encodeURIComponent(tmdb)}`);
  const second = isTv ? (tmdb && `tmdbId=${encodeURIComponent(tmdb)}`) : (tvdb && `tvdbId=${encodeURIComponent(tvdb)}`);
  const q = first || second;
  if (!q) return null;
  try {
    // The proxy answers { plex_key: "/library/metadata/<ratingKey>", type, ... }
    // — the bare ratingKey is not in the payload, only the path.
    let raw = await this._callApi('GET', `arr_stack/plex/lookup?${q}`).catch(() => null);
    // Old Plex agents store the other provider's guid, so try both before giving up
    if (!raw?.plex_key && second && second !== q) {
      raw = await this._callApi('GET', `arr_stack/plex/lookup?${second}`).catch(() => null);
    }
    const key = String(raw?.plex_key || '').split('/').filter(Boolean).pop();
    return key && /^\d+$/.test(key) ? { ratingKey: key, type: raw?.type || null } : null;
  } catch (_) { return null; }
}

// A deletion date exists only for titles that sit in some collection, so the
// same map that paints the "Gone in" badge answers membership.
_qaInCollection(d) {
  const ext = this._mtDelExt;
  if (!ext || !ext.size) return false;
  const isMovie = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
  const tmdb = d.tmdbId || d.id || null;
  const tvdb = d.tvdbId || null;
  if (isMovie) return !!(tmdb && ext.get(`mv:${tmdb}`));
  return !!((tvdb && ext.get(`tv:tvdb:${tvdb}`)) || (tmdb && ext.get(`tv:tmdb:${tmdb}`)));
}


// A collection's level comes from the rule that built it — show, season or
// episode. Anything but "show" needs a more specific media id than the series.
_qaColType(c) {
  const rules = this._maintainerr?.rules || [];
  return c.type || rules.find(r => r.collectionId === c.id)?.dataType || 'movie';
}

// A tick box and a label. Several of these can be armed before anything runs,
// so the row is a toggle rather than the action itself.
_qaCbRow(attrs, label, checked) {
  const tick = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  return `<button class="qa-item qa-sub-item qa-cb-row" ${attrs}>
    <span class="qa-cb${checked ? ' is-on' : ''}">${checked ? tick : ''}</span>
    <span>${this._escHtml(label)}</span>
  </button>`;
}

// The row that fires whatever is ticked. Disabled while nothing is, so the
// menu never offers an action that would do nothing.
_qaApplyRowHtml(kind, count) {
  const lbl = count ? `${this._t('qaApply')} (${count})` : this._t('qaApply');
  return `<button class="qa-item qa-sub-item qa-apply${count ? '' : ' is-off'}" data-qa-apply="${kind}"${count ? '' : ' disabled'}>
    <span>${lbl}</span>
  </button>`;
}

// Collections stay single-click: each row is one destination, and picking it
// is the whole decision. Only seasons multi-select, since a show has many and
// arming them one at a time would mean reopening the menu for each.
// Collection ids this title currently sits in. Unlike _qaInCollection it does
// not go through the "Gone in" poster setting — the menu should say where a
// title is regardless of whether the badge is switched on.
_qaColMembership(d) {
  const m = this._mtColMemb;
  if (!m || !m.size) return new Set();
  const isMovie = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
  const tmdb = d.tmdbId || d.id || null;
  const _sn = (this._sonarr || []).find(x => x.id === d._sonarrSeries?.id)
           || (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
  const tvdb = d.tvdbId || _sn?.tvdbId || null;
  const hit = isMovie
    ? (tmdb && m.get(`mv:${tmdb}`))
    : ((tvdb && m.get(`tv:tvdb:${tvdb}`)) || (tmdb && m.get(`tv:tmdb:${tmdb}`)));
  return hit || new Set();
}

_qaColRowsHtml(kind, d) {
  const cols = this._qaCollectionsFor(d);
  // For a show, "all collections" still has to say which seasons — the request
  // carries one media item, and for a series that item is a season.
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  // A dot marks the collections the title is already in, so adding somewhere it
  // already sits, or looking for where to remove it from, needs no guessing.
  const memb = this._qaColMembership(d);
  const dot = `<span class="qa-dot" title="${this._escHtml(this._t('qaInCollection'))}"></span>`;
  return [
    ...((kind === 'mtExcl' || kind === 'mtRemove')
      ? [`<button class="qa-item qa-sub-item" data-qa-run="${kind}" data-qa-col=""${isTv ? ' data-qa-type="season"' : ''}>${this._t('qaAllCollections')}</button>`] : []),
    ...cols.map(c => `<button class="qa-item qa-sub-item" data-qa-run="${kind}" data-qa-col="${c.id}" data-qa-type="${this._qaColType(c)}"><span>${this._escHtml(this._mtColLabel(c, cols))}</span>${memb.has(String(c.id)) ? dot : ''}</button>`),
  ].join('');
}

_qaSeasonRowsHtml() {
  const p = this._ppSeasonPick;
  if (!p) return '';
  if (!p.seasons) return this._qaLoadingRow();
  if (!p.seasons.length) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaAiringNone')}</div>`;
  const sel = p.sel || new Set();
  const allOn = p.seasons.length > 0 && p.seasons.every(sn => sel.has(String(sn.key)));
  return [
    this._qaCbRow('data-qa-season-pick="*"', this._t('qaAllSeasons'), allOn),
    ...p.seasons.map(sn => this._qaCbRow(
      `data-qa-season-pick="${sn.key}"`, sn.title, sel.has(String(sn.key)))),
    this._qaApplyRowHtml(p.kind, sel.size),
  ].join('');
}

// Seasons live under the show in Plex, so this needs the show's rating key first.
async _qaLoadSeasons(d, drawerEl) {
  const plex = await this._qaPlexRatingKey(d);
  if (!plex) { this._ppSeasonPick = null; this._qaShowStatus(this._t('qaNoPlexItem'), { err: true }, 5000); return; }
  try {
    const raw = await this._callApi('GET', `arr_stack/plex/children?ratingKey=${encodeURIComponent(plex.ratingKey)}`);
    const items = raw?.MediaContainer?.Metadata || [];
    if (this._ppSeasonPick) {
      this._ppSeasonPick.seasons = items
        .filter(i => i.ratingKey && i.type === 'season')
        .map(i => ({ key: String(i.ratingKey), title: i.title || `Season ${i.index}` }));
    }
  } catch (_) {
    if (this._ppSeasonPick) this._ppSeasonPick.seasons = [];
  }
  if (drawerEl && this._ppSeasonPick) drawerEl.innerHTML = this._qaSeasonRowsHtml();
}

// One collection, one optional season. Kept apart from the runner below so a
// batch can fire every job before anything is refetched.
async _qaMtCall(kind, colId, d, plex, seasonKey = null) {
  const isMovie = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
  // A season-level collection wants the season's own item, not the show's
  const mediaId = seasonKey || plex.ratingKey;
  const type = seasonKey ? 'season' : (plex.type || (isMovie ? 'movie' : 'show'));
  const context = { id: mediaId, type };
  // action 1 is Maintainerr's "remove from collection"; 0 adds.
  const body = { action: kind === 'mtRemove' ? 1 : 0, mediaId, context };
  if (colId) body.collectionId = parseInt(colId);
  if (kind === 'mtRemove' && !colId) {
    // No collection chosen — the dedicated endpoint clears every one at once
    await this._callApi('DELETE', `arr_stack/maintainerr/collections/media?mediaId=${encodeURIComponent(mediaId)}`);
  } else if (kind === 'mtExcl') {
    const res = await this._callApi('POST', 'arr_stack/maintainerr/rules/exclusion', body);
    if (res && res.code === 0) throw new Error(res.result || 'failed');
  } else {
    await this._callApi('POST', 'arr_stack/maintainerr/collections/media/add', body);
  }
}

// jobs: [{ colId, seasonKey }]. The Plex lookup and the refetch happen once for
// the whole set — per-job refreshes made a multi-select flicker and re-render
// the popup underneath the menu on every step.
async _qaRunMaintainerrBatch(kind, jobs, d) {
  this._ppMenu = null;
  this._ppSeasonPick = null;
  if (!jobs.length) { this._renderPopupEl(); return; }
  this._qaShowStatus(this._t('mtProcessing') || '…', { spin: true }, 0);
  try {
    const plex = await this._qaPlexRatingKey(d);
    if (!plex) { this._qaShowStatus(this._t('qaNoPlexItem'), { err: true }, 5000); return; }
    for (const j of jobs) await this._qaMtCall(kind, j.colId, d, plex, j.seasonKey || null);
    // Membership changed, so every cached deletion date is stale. Rebuild them
    // and repaint before the status clears — the "Gone in" badge on the poster
    // and in this popup is the confirmation that the action landed.
    this._mtDelMap = null;
    this._mtDelExt = null;
    this._mtColMemb = null;
    this._qaShowStatus(this._t('qaDone'));
    await this._fetchMaintainerr();
    if (this._popup) this._renderPopupEl();
    this._reRenderRight(true);
  } catch (e) {
    console.warn('[arr-card] quick action:', e);
    this._qaShowStatus(`${this._t('qaFailed')}: ${this._qaErrText(e)}`, { err: true }, 7000);
  }
}

async _qaRunMaintainerr(kind, colId, d, seasonKey = null) {
  return this._qaRunMaintainerrBatch(kind, [{ colId, seasonKey }], d);
}

// Runs the ticked seasons, all in one batch against the collection whose row
// opened the picker.
async _qaApplyPicks(kind) {
  const d = this._popup;
  const sp = this._ppSeasonPick;
  if (!d || sp?.kind !== kind || !sp.seasons) return;
  const jobs = [...(sp.sel || [])].map(seasonKey => ({ colId: sp.colId, seasonKey }));
  return this._qaRunMaintainerrBatch(kind, jobs, d);
}

}

export const popupQaCollectionsMixin = _PopupQaCollectionsMethods.prototype;
