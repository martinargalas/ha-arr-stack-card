import { POPUP_TYPE } from '../constants.js';

// The detail popup's quick-actions menu: the chevron in the details section,
// what it offers for a title, and the watch statistics, airing and
// collection rows it opens. Split out of popup/index.js.

// Pins Watch statistics to a single source regardless of what else is
// configured, for testing one backend in isolation. null = normal
// coverage-based order (Tracearr → Jellystat → Tautulli).
export const STATS_FORCE = null;

class _PopupQuickActionMethods {

// Maintainerr keys on media-server items, so a title with nothing on disk has
// no Plex entry to point at — offering its actions would only ever fail.
_qaHasFiles(d) {
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  if (isTv) {
    const s1 = (this._sonarr  || []).find(x => x.id === d._sonarrSeries?.id);
    const s2 = (this._sonarr2 || []).find(x => x.id === d._sonarr2Series?.id);
    return (s1?.statistics?.episodeFileCount > 0) || (s2?.statistics?.episodeFileCount > 0);
  }
  const m1 = (this._radarr  || []).find(x => x.id === d._radarrId);
  const m2 = (this._radarr2 || []).find(x => x.id === d._radarr2Id);
  return !!(m1?.hasFile || m2?.hasFile);
}

// The request the signed-in user could still take back. Admins manage requests
// in the pending list instead, so this is only offered to the requester.
_qaWithdrawable(d) {
  if (this._overseerrConfigured === false) return null;
  if (this._hass?.user?.is_admin) return null;
  const tmdb = d.tmdbId || d.id || null;
  const reqId = d.mediaInfo?.requests?.[0]?.id
             || (tmdb ? this._familyPendingIds?.get(Number(tmdb)) : null);
  return reqId ? { reqId: Number(reqId), mediaId: Number(tmdb) } : null;
}

_qaItems(d) {
  // Ordered by what an entry does, not by which app answers it — the icons
  // already say that. Show in library pinned to the top and watch statistics to
  // the bottom, so the two always worth finding sit at fixed ends. In between:
  // navigation, playback, the Maintainerr trio, requests, then what is left.
  const items = [];

  const inLib = this._qaLibTargets(d);
  if (inLib.length) {
    items.push({
      key: 'lib', label: this._t('qaShowInLib'),
      icon: (d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV) ? 'sonarr' : 'radarr',
      // One instance needs no choice; two do, so it cascades only then
      direct: inLib.length === 1,
    });
  }
  if (this._qaQueueTarget(d)) {
    items.push({
      key: 'queue', label: this._t('qaJumpDl'), direct: true,
      icon: (d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV) ? 'sonarr' : 'radarr',
    });
  }

  // Every server the terminate handler knows, not just Plex — a popup carries
  // exactly one session id, whichever source it was opened from.
  const stopSrc = d._plexSessionId ? 'plex'
                : d._jfSessionId   ? 'jellyfin'
                : d._embySessionId ? 'emby'
                : d._kodiEntityId  ? 'kodi'
                : null;
  if (stopSrc && d._streamEntity && this._hass?.user?.is_admin) {
    items.push({ key: 'stop', label: this._t('stopPlayback'), icon: stopSrc, direct: true });
  }
  // Nothing on disk means nothing to cast — the device list would load only to
  // fail on whichever one was picked.
  if (this._plexConfigured !== false && this._qaHasFiles(d)) {
    items.push({ key: 'cast', label: this._t('qaCast'), icon: 'plex' });
  }

  if (this._qaMaintainerrReady() && this._qaHasFiles(d) && this._qaCollectionsFor(d).length) {
    items.push({ key: 'mtCol', label: this._t('qaMtAddCol'), icon: 'maintainerr' });
    // Only worth offering when it is in one — Maintainerr's endpoint clears the
    // title from every collection at once, so there is nothing to choose.
    if (this._qaInCollection(d)) {
      items.push({ key: 'mtRemove', label: this._t('qaMtRemove'), icon: 'maintainerr' });
    }
    items.push({ key: 'mtExcl', label: this._t('qaMtAddExcl'), icon: 'maintainerr' });
  }
  if (this._qaWithdrawable(d)) {
    items.push({
      key: 'seerrWithdraw', label: this._t('qaWithdraw'), direct: true,
      icon: this._discoverIconKey ? this._discoverIconKey() : 'overseerr',
    });
  }
  if (this._qaAiringSeriesId(d)) {
    items.push({ key: 'airing', label: this._t('qaAiring'), icon: 'sonarr' });
  }

  // Last, whatever else is on offer. Icon names whichever source will be asked
  // first: Tracearr spans every server, Tautulli keys on the Plex item the
  // Maintainerr actions look up, and a Jellyfin-only setup runs on Jellystat.
  const statsSrc = STATS_FORCE ? STATS_FORCE
                 : this._tracearrConfigured !== false && (this._plexConfigured !== false || this._jellyfinConfigured) ? 'tracearr'
                 : this._jellystatConfigured !== false ? 'jellystat'
                 : this._tautulliConfigured !== false && this._plexConfigured !== false ? 'tautulli'
                 : null;
  if (statsSrc && this._qaHasFiles(d)) {
    items.push({ key: 'stats', label: this._t('qaStats'), icon: statsSrc });
  }
  return items;
}

// Only for series that are actually in Sonarr — the air dates come from there.
_qaAiringSeriesId(d) {
  const isTv = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
  if (!isTv) return null;
  return d._sonarrSeries?.id ?? d._sonarr2Series?.id ?? null;
}

// The calendar answers "what airs this week" across everything; this answers
// "when does this show come back", which is a list, not a date window.
async _qaLoadAiring(d, drawerEl) {
  const id = this._qaAiringSeriesId(d);
  if (id == null) return;
  const inst = d._sonarrSeries?.id === id ? 'sonarr' : 'sonarr2';
  try {
    const eps = await this._callApi('GET', `arr_stack/${inst}/episodes?seriesId=${encodeURIComponent(id)}`);
    const now = Date.now();
    const fmt = this._uiDateFmt({ weekday: 'short', day: 'numeric', month: 'short' });
    this._ppAiring = (Array.isArray(eps) ? eps : [])
      .filter(e => e.airDateUtc && new Date(e.airDateUtc).getTime() > now)
      .sort((a, b) => new Date(a.airDateUtc) - new Date(b.airDateUtc))
      .slice(0, 8)
      .map(e => ({
        code: `S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}`,
        when: fmt.format(new Date(e.airDateUtc)),
      }));
  } catch (_) {
    this._ppAiring = [];
  }
  // Patch the drawer in place — re-rendering the popup would close it
  if (drawerEl && this._ppMenu?.sub === 'airing') {
    drawerEl.innerHTML = this._qaAiringRowsHtml();
  }
}

_qaCastRowsHtml() {
  const list = this._plexClients;
  if (list === null || list === undefined) return this._qaLoadingRow();
  if (!list.length) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaCastNone')}</div>`;
  return list.map(p =>
    `<button class="qa-item qa-sub-item" data-action="plex-cast-play" data-entity="${this._escHtml(p.entityId)}"><span>${this._escHtml(p.name)}</span></button>`
  ).join('');
}

_qaAiringRowsHtml() {
  const rows = this._ppAiring;
  if (!rows) return this._qaLoadingRow();
  if (!rows.length) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaAiringNone')}</div>`;
  return rows.map(r => `<div class="qa-item qa-sub-item qa-static"><span>${this._escHtml(r.code)}</span><span class="qa-air-date">${this._escHtml(r.when)}</span></div>`).join('');
}

async _qaWithdraw(d) {
  const hit = this._qaWithdrawable(d);
  if (!hit) return;
  this._ppMenu = null;
  this._qaShowStatus(this._t('mtProcessing') || '…', { spin: true }, 0);
  try {
    await this._withdrawOverseerrRequest(hit.reqId, hit.mediaId);
    this._qaShowStatus(this._t('qaWithdrawn'));
  } catch (e) {
    this._qaShowStatus(`${this._t('qaFailed')}: ${this._qaErrText(e)}`, { err: true }, 7000);
  }
}

_qaBtnHtml(d) {
  if (!this._qaItems(d).length) return '';
  // Explicit panel identity: the drawer state is shared with Search and Remove,
  // so a truthy _ppMenu alone does not mean this panel is the open one.
  const open = this._ppMenu?.panel === 'options';
  // Same pill as Search and Remove — it is a peer action, not a separate control
  const dots = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="flex-shrink:0"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
  const chev = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

  // The button reports its own outcome: while a status is up it wears that
  // status instead of its label, then goes back. A pill elsewhere on the popup
  // would say the same thing further from where the click happened.
  const st = this._ppStatus;
  const label = `${dots}<span class="pp-lbl">${this._t('qaTitle')} ${chev}</span>`;
  if (st?.msg) {
    // Blue while it runs, then green or red for the outcome — a green tick that
    // was already green while working would say nothing when it finished.
    const rgb  = st.spin ? '96,165,250' : (st.err ? '248,113,113' : '52,211,153');
    const tick = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>`;
    const cross = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="flex-shrink:0"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    const ico = st.spin ? `<span class="is-spin" style="flex-shrink:0"></span>` : (st.err ? cross : tick);
    // The label stays in the box, invisible, purely to hold the width — the
    // status is laid over it, so the button cannot resize under the pointer.
    return `<div class="is-btn-row">
      <button class="is-open-btn qa-opt-btn qa-st-btn" style="--qa-st:${rgb}" title="${this._escHtml(st.msg)}" disabled>
        <span class="qa-st-ghost">${label}</span>
        <span class="qa-st-ov">${ico}<span>${this._escHtml(this._qaShortStatus(st.msg))}</span></span>
      </button>
    </div>`;
  }
  return `<div class="is-btn-row">
    <button class="is-open-btn qa-opt-btn${open ? ' active' : ''}" data-qa-toggle>${label}</button>
  </div>`;
}

// The button is one word wide — anything past the colon is the raw API text,
// which belongs in the tooltip rather than on the control.
_qaShortStatus(msg) {
  const head = String(msg || '').split(':')[0].trim();
  return head.length > 16 ? `${head.slice(0, 15)}…` : head;
}

_qaMenuHtml(d, searchRows = '', removeRows = '') {
  // Search, Remove and Options share one dropdown component — one open at a
  // time, anchored on the glass so it can overlay the sections below.
  if (this._searchExpand && searchRows) {
    return `<div class="qa-menu" data-qa-menu><div class="qa-list">${searchRows}</div></div>`;
  }
  if (this._removeConfirm && removeRows) {
    return `<div class="qa-menu" data-qa-menu><div class="qa-list">${removeRows}</div></div>`;
  }
  const menu = this._ppMenu;
  if (menu?.panel !== 'options') return '';
  const items = this._qaItems(d);
  if (!items.length) return '';

  // Sub-items roll down under their own parent rather than opening beside it.
  const subRows = key => {
    if (key === 'cast') return this._qaCastRowsHtml();
    if (key === 'stats') return this._qaStatsRowsHtml();
    if (key === 'airing') return this._qaAiringRowsHtml();
    if (key === 'lib') {
      return this._qaLibTargets(d)
        .map(t => `<button class="qa-item qa-sub-item" data-qa-lib="${t.inst}">${this._escHtml(t.label)}</button>`).join('');
    }
    // Season picker takes over the drawer once a season-level collection is
    // chosen — a third nesting level would be a drawer inside a drawer.
    if (this._ppSeasonPick?.kind === key) return this._qaSeasonRowsHtml();
    return this._qaColRowsHtml(key, d);
  };

  const chev = `<svg class="qa-chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const ico  = it => it.icon ? `<span class="qa-ico">${this._appIcon(it.icon, 16)}</span>` : '';

  const rows = items.map(it => {
    if (it.key === 'stop') {
      // Emits the existing terminate action so its confirmation flow is reused
      return `<button class="qa-item" data-action="stream-terminate-show" data-session-id="${this._escHtml(String(d._plexSessionId || ''))}">${ico(it)}<span>${it.label}</span></button>`;
    }
    if (it.direct) {
      return `<button class="qa-item" data-qa-do="${it.key}">${ico(it)}<span>${it.label}</span></button>`;
    }
    const open = menu.sub === it.key;
    // Content is always present so the drawer has a height to animate to; the
    // open class lands a frame later (see the toggle handler) or there is no
    // transition to watch, only a jump.
    return `<div class="qa-group">
      <button class="qa-item qa-item-parent${open ? ' qa-item-on' : ''}" data-qa-sub="${it.key}">
        ${ico(it)}<span>${it.label}</span>${chev}
      </button>
      <div class="qa-drawer" data-qa-drawer="${it.key}">${subRows(it.key)}</div>
    </div>`;
  }).join('');

  // qa-list-actions holds the width steady: the statistics drawer loads rows
  // wider than anything above it, and a menu that grows under the pointer after
  // the click reads as a glitch.
  return `<div class="qa-menu" data-qa-menu><div class="qa-list qa-list-actions">${rows}</div></div>`;
}

// The drawer is rebuilt collapsed on every render, so the open state has to be
// applied after the browser has seen the collapsed one — two frames, the same
// trick the nav indicator and the sources panel use.
_qaOpenDrawer(key) {
  if (!key) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    this.shadowRoot
      ?.querySelector(`[data-qa-drawer="${key}"]`)
      ?.classList.add('is-open');
  }));
}

_qaStatusHtml() {
  const st = this._ppStatus;
  if (!st?.msg) return '';
  // The Actions button wears the status itself when it is on screen; a second
  // copy of the same words beside the title would only repeat it.
  if (this._popup && this._qaItems(this._popup).length) return '';
  const rgb = st.err ? '248,113,113' : '52,211,153';
  const spin = st.spin ? '<span class="is-spin" style="margin-right:6px;vertical-align:-1px"></span>' : '';
  const mob = this._isMob;
  const bg  = mob ? (this._isDay ? '#fafafc' : '#14141a') : `rgba(${rgb},0.12)`;
  // Same treatment as the Prowlarr and Maintainerr pills: on a phone it has to
  // leave the flow, or the text beside it reads straight through.
  const pos = mob
    ? ';position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1200;padding:5px 14px;box-shadow:0 4px 16px rgba(0,0,0,0.55)'
    : '';
  return `<span style="font-size:11px;font-weight:600;color:rgba(${rgb},0.9);background:${bg};border:1px solid rgba(${rgb},0.45);border-radius:999px;padding:2px 12px;white-space:nowrap;flex-shrink:0${pos}">${spin}${this._escHtml(st.msg)}</span>`;
}

// hass.callApi rejects with { error, status_code, body }, which has no .message
// — printing it raw is how the status ended up reading "[object Object]".
_qaErrText(e) {
  if (!e) return 'error';
  if (typeof e === 'string') return e;
  const body = e.body;
  const detail = (body && (body.error || body.message || body.detail))
              || e.error || e.message || '';
  const code = e.status_code || e.status || (body && body.status) || '';
  const text = [detail, code ? `HTTP ${code}` : ''].filter(Boolean).join(' · ');
  return text || 'error';
}

_qaShowStatus(msg, opts = {}, duration = 3500) {
  this._ppStatus = { msg, err: !!opts.err, spin: !!opts.spin };
  this._renderPopupEl();
  clearTimeout(this._ppStatusTimer);
  if (!duration) return;
  this._ppStatusTimer = setTimeout(() => {
    this._ppStatus = null;
    if (this._popup) this._renderPopupEl();
  }, duration);
}

// The dropdown belongs under the control that opened it. Anchored in script
// rather than CSS because all three triggers live in a flex capsule whose
// widths shift with state, so no fixed offset stays correct.
_qaPositionMenu() {
  const root = this.shadowRoot?.getElementById('popup-root');
  const menu = root?.querySelector('.qa-menu');
  if (!menu) return;
  const glass = menu.closest('.popup-glass');
  const trigger = this._searchExpand ? root.querySelector('.is-search-btn')
                : this._removeConfirm ? root.querySelector('.remove-lib-btn')
                : root.querySelector('.qa-opt-btn');
  if (!glass || !trigger) return;
  const g = glass.getBoundingClientRect();
  const b = trigger.getBoundingClientRect();
  const w = menu.getBoundingClientRect().width;
  const PAD = 12;
  // Left edges line up, unless that would push the panel past the glass
  const left = Math.max(PAD, Math.min(b.left - g.left, g.width - w - PAD));
  menu.style.left = `${Math.round(left)}px`;
  menu.style.right = 'auto';
  // Sits just under its own button, not at a fixed offset from the top: the
  // capsule's height and position differ between phone and desktop.
  menu.style.top = `${Math.round(b.bottom - g.top + 6)}px`;
}

}

export const popupQuickActionsMixin = _PopupQuickActionMethods.prototype;
