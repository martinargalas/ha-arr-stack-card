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

// Opening the title on the server it is playing on. The card shows what a
// media server knows about a title; the server itself is where it is watched,
// and getting there meant finding it by hand.
//
// Everything comes from the session, never from a lookup: the session already
// names the server, the item and — for Plex — the library key, so the link
// cannot land on a different title, and a Jellyfin library that carries no
// TMDB ids is no obstacle.

// The session behind the popup, whichever server it came from.
_qaStreamSession(d) {
  const eid = d?._streamEntity || '';
  if (!eid) return null;
  if (d._jfSessionId) {
    const hit = (this._jellyfinSessions || []).find(x => x.id === eid);
    return hit ? { kind: 'jellyfin', attr: hit.attr } : null;
  }
  if (d._embySessionId) {
    const hit = (this._embySessions || []).find(x => x.id === eid);
    return hit ? { kind: 'emby', attr: hit.attr } : null;
  }
  // Plex reaches the popup either as a proxy session, keyed by its player, or
  // as one of Home Assistant's own media players — then the session id the
  // popup was given is what ties the two together. The library key sits on the
  // session itself rather than among the media attributes.
  const px = (this._plexSessions || []).find(x => x.id === eid)
          || (d._plexSessionId
              ? (this._plexSessions || []).find(x => x._plexSessionId === d._plexSessionId)
              : null);
  return px ? { kind: 'plex', attr: px } : null;
}

// Whether there is anywhere to go. Kodi plays to a screen rather than to a
// library, so it has no page to open and is not offered one.
_qaOpenServerKind(d) {
  const sess = this._qaStreamSession(d);
  if (!sess) return null;
  if (sess.kind === 'plex') return sess.attr?._plexRatingKey ? 'plex' : null;
  const itemId = sess.kind === 'jellyfin' ? sess.attr?._jfItemId : sess.attr?._embyItemId;
  if (!itemId) return null;
  // Jellyfin's address comes from the session, or from JellyHA when the
  // session is one of its own; either way there is somewhere to go.
  if (sess.kind === 'jellyfin') return (sess.attr?._jfServerUrl || this._jhInstalled()) ? 'jellyfin' : null;
  return sess.attr?._embyServerUrl ? 'emby' : null;
}

async _qaOpenOnServer(d) {
  const url = await this._qaServerWebUrl(d);
  if (!url) {
    this.dispatchEvent(new CustomEvent('hass-notification', {
      detail: { message: this._t('qaOpenFailed') }, bubbles: true, composed: true,
    }));
    return;
  }
  // A new tab rather than this one: the card is a dashboard somebody is in
  // the middle of using.
  window.open(url, '_blank', 'noopener');
}

async _qaServerWebUrl(d) {
  const sess = this._qaStreamSession(d);
  if (!sess) return '';
  const a = sess.attr || {};
  if (sess.kind === 'plex') {
    if (!a._plexRatingKey) return '';
    // app.plex.tv rather than the server's own address: it is reachable from
    // wherever the dashboard is open and hands off to the desktop app where
    // that is installed. It keys on the server's identifier, which is not the
    // player's — the session carries the player's.
    if (!this._plexServerId) {
      const raw = await this._callApi('GET', 'arr_stack/plex/identity').catch(() => null);
      this._plexServerId = raw?.machineIdentifier || '';
    }
    if (!this._plexServerId) return '';
    const key = encodeURIComponent(`/library/metadata/${a._plexRatingKey}`);
    return `https://app.plex.tv/desktop/#!/server/${encodeURIComponent(this._plexServerId)}/details?key=${key}`;
  }
  // Jellyfin and Emby both host their own web client at the address the
  // session was read from, and both name the item the same way.
  const itemId   = sess.kind === 'jellyfin' ? a._jfItemId : a._embyItemId;
  let   base     = String(sess.kind === 'jellyfin' ? a._jfServerUrl : a._embyServerUrl).replace(/\/+$/, '');
  const serverId = sess.kind === 'jellyfin' ? a._jfServerId : a._embyServerId;
  // A stream known only through JellyHA carries no server address, so JellyHA
  // is asked where its own server is.
  if (!base && sess.kind === 'jellyfin') {
    if (this._jhWebBase == null) {
      const raw = await this._callApi('GET', 'arr_stack/jellyha/server').catch(() => null);
      this._jhWebBase = String(raw?.url || '').replace(/\/+$/, '');
    }
    base = this._jhWebBase;
  }
  if (!itemId || !base) return '';
  const srv = serverId ? `&serverId=${encodeURIComponent(serverId)}` : '';
  return sess.kind === 'jellyfin'
    ? `${base}/web/index.html#/details?id=${encodeURIComponent(itemId)}${srv}`
    : `${base}/web/index.html#!/item?id=${encodeURIComponent(itemId)}${srv}`;
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
