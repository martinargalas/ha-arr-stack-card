import { POPUP_TYPE } from '../constants.js';

// Quick actions, going to the title elsewhere: its place in the Library, its row in the queue. Split out of popup/quick-actions.js.

class _PopupQaNavigateMethods {

// Which instances actually hold this title. Drives both whether the entry is
// offered at all and whether it needs a submenu.
_qaLibTargets(d) {
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  const tmdb = d.tmdbId || d.id || null;
  const out = [];
  if (isTv) {
    const tvdb = d.tvdbId || null;
    const has = lib => (lib || []).some(x =>
      (tvdb && String(x.tvdbId) === String(tvdb)) || (tmdb && String(x.tmdbId) === String(tmdb)));
    if (has(this._sonarr))  out.push({ inst: 'sonarr',  label: this._arrInstLabels('sonarr')[0] });
    if (has(this._sonarr2)) out.push({ inst: 'sonarr2', label: this._arrInstLabels('sonarr')[1] });
  } else {
    const has = lib => (lib || []).some(x => tmdb && String(x.tmdbId) === String(tmdb));
    if (has(this._radarr))  out.push({ inst: 'radarr',  label: this._arrInstLabels('radarr')[0] });
    if (has(this._radarr2)) out.push({ inst: 'radarr2', label: this._arrInstLabels('radarr')[1] });
  }
  return out;
}

// Opens the Library on this title: the right instance, the page the title
// actually sits on, and a couple of slow pulses so the eye finds it. Matching is
// by tmdb/tvdb id — titles repeat across remakes and localisations.
_qaShowInLibrary(d, inst) {
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  const tmdb = d.tmdbId || d.id || null;
  const tvdb = d.tvdbId || null;
  // Remembered so the library's back arrow can rebuild this popup
  this._libPopupReturn = {
    type: d._type,
    tmdbId: tmdb ? String(tmdb) : null,
    tvdbId: tvdb ? String(tvdb) : null,
    title: d.title || d.name || '',
  };
  this._ppMenu = null;
  this._popup  = null;
  this._renderPopupEl();
  // The Library's own code loads the first time it opens, so everything that
  // reaches into the modal waits for that to finish.
  Promise.resolve(this._openLibModal(isTv ? 'tv' : 'movies')).then(() => {
    const m = this._libModal;
    if (!m) return;
    m.search = '';
    m.page   = 0;
    if (inst) m.instFilter = inst;

    const el = this.shadowRoot.querySelector('[data-lib-modal]');
    const body = el?.querySelector('#lib-body');
    if (!body) return;
    // First pass establishes the measured perPage for the current view
    body.innerHTML = this._libBodyHtml();
    this._wireLibModalBody(el);

    const matches = x => (tvdb && String(x.tvdbId) === String(tvdb))
                      || (tmdb && String(x.tmdbId) === String(tmdb));
    const idx = (this._libFilteredItems() || []).findIndex(matches);
    const per = m._perPage || 0;
    if (idx >= 0 && per > 0) {
      const page = Math.floor(idx / per);
      if (page !== m.page) {
        m.page = page;
        body.innerHTML = this._libBodyHtml();
        this._wireLibModalBody(el);
      }
    }
    this._qaBlinkInLibrary(tmdb, tvdb);
  });
}

// Two slow pulses so the eye lands on the right card without a jarring flash.
_qaBlinkInLibrary(tmdb, tvdb) {
  requestAnimationFrame(() => {
    const el = this.shadowRoot.querySelector('[data-lib-modal]');
    const card = tmdb ? el?.querySelector(`[data-tmdbid="${tmdb}"]`) : null;
    const target = card || (tvdb ? el?.querySelector(`[data-tvdbid="${tvdb}"]`) : null);
    if (!target) return;
    target.scrollIntoView({ block: 'nearest' });
    target.style.transition = 'opacity 0.55s ease';
    let n = 0;
    const pulse = () => {
      if (n >= 4) { target.style.opacity = ''; return; }
      target.style.opacity = (n % 2 === 0) ? '0.25' : '1';
      n++;
      setTimeout(pulse, 560);
    };
    pulse();
  });
}


// Only the live queues, never the history maps: an imported download leaves the
// arr queue, and that is exactly the case where there is nothing to jump to.
_qaQueueTarget(d) {
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  const ids = isTv
    ? [d._sonarrSeries?.id, d._sonarr2Series?.id]
    : [d._radarrId, d._radarr2Id];
  const maps = isTv
    ? [this._dlMediaSonarr, this._dlMediaSonarr2]
    : [this._dlMediaRadarr, this._dlMediaRadarr2];
  for (let i = 0; i < maps.length; i++) {
    const arrId = ids[i];
    if (arrId == null || !maps[i]) continue;
    for (const [dlId, mappedId] of maps[i]) {
      if (String(mappedId) === String(arrId)) return dlId;
    }
  }
  return null;
}

async _qaJumpToQueue(d) {
  const key = this._qaQueueTarget(d);
  if (!key) return;
  const title = d.title || d.name || '';
  this._actPopupReturn = {
    type: d._type,
    tmdbId: d.tmdbId ? String(d.tmdbId) : (d.id ? String(d.id) : null),
    tvdbId: d.tvdbId ? String(d.tvdbId) : null,
    title,
  };
  this._ppMenu = null;
  this._popup  = null;
  this._renderPopupEl();
  await this._openActivityModal('queue');

  // Filter rather than page-hunt: the queue's ordering and page size live inside
  // the table renderer, and narrowing it to this title puts the row on page one
  // whatever those happen to be. A series shows all its queued episodes at once,
  // which is the useful view when an import is stuck.
  const m = this._activityModal;
  const el = () => this.shadowRoot.querySelector('[data-act-modal]');
  if (m && title) {
    m.queueSearch = title;
    m.queuePage   = 0;
    await this._actLoadTab('queue', el());
    await new Promise(r => requestAnimationFrame(r));
  }
  const row = el()?.querySelector(`[data-q-key="${key}"]`);
  if (row) this._qaBlinkRow(row);
}

// Two slow pulses, same as the library jump
_qaBlinkRow(row) {
  row.scrollIntoView({ block: 'nearest' });
  row.style.transition = 'opacity 0.55s ease';
  let n = 0;
  const pulse = () => {
    if (n >= 4) { row.style.opacity = ''; return; }
    row.style.opacity = (n % 2 === 0) ? '0.25' : '1';
    n++;
    setTimeout(pulse, 560);
  };
  pulse();
}

}

export const popupQaNavigateMixin = _PopupQaNavigateMethods.prototype;
