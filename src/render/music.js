// ──────────────────────────────────────────────────────────────────────────
// Music — artist detail modal (Lidarr)
//
// Built on the same shell as the film and series popup — overlay, glass,
// backdrop — so it reads as part of the card rather than a bolted-on panel.
// The backdrop is the artist's fanart, which is 16:9 and exactly what that
// band wants; the portrait beside the name is the square one.
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass } from '../shared/ui.js';
import { fmtBytes } from '../shared/format.js';

class _MusicRenderMethods {

  _musicModalHtml() {
    const m = this._musicModal;
    if (!m) return '';
    const artist = m.artist || {};
    const name   = this._escHtml(artist.artistName || '');
    const fan    = this._lidarrArtistImage(artist, 'fanart');
    const shot   = this._lidarrArtistImage(artist, 'poster');
    const perf   = this._cfgGet('styles', 'performanceMode', false);

    // Same shape as a film's: a quiet line of facts, then the score beside it.
    const st      = artist.statistics || {};
    const subLine = [
      (artist.genres || []).slice(0, 3).join(' · '),
      st.albumCount ? `${st.albumCount} ${this._t('musicAlbums')}` : '',
    ].filter(Boolean).join(' · ');

    const rv = artist.ratings?.value;
    const mbIcon = `<svg width="22" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#BA478F"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="900" fill="#fff">MB</text></svg>`;
    const votes = artist.ratings?.votes;
    const ratingsRow = rv
      ? `<div class="popup-ratings" title="MusicBrainz${votes ? ` · ${votes} ${votes === 1 ? 'vote' : 'votes'}` : ''}"><span style="display:inline-flex;align-items:center;gap:4px">${mbIcon}<b style="font-size:12px;color:var(--is-text);line-height:1;display:block;margin-top:-1px">${(Math.round(rv * 10) / 10).toFixed(1)}</b></span></div>`
      : '';

    // Where the act is from, next to what it is rated — the flag reads as part
    // of the same line rather than a row of its own.
    const originFlag = this._musOriginFlag(artist);

    const backdropStyle = (fan && !perf)
      ? `background-image:url('${fan}')`
      : `background:linear-gradient(135deg,rgba(21,158,90,0.35),rgba(10,10,14,0.9))`;

    return `
      <div class="popup-overlay${dayClass(this)}" data-music-modal>
        <div class="popup-glass is-wide"${this._musGlassH ? ` style="height:${this._musGlassH}px"` : ''}>
          <button class="popup-close" data-music-close>${this._libReturnState
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
            : ICONS.close}</button>
          <div class="popup-backdrop mus-backdrop" style="${backdropStyle}">
            <div class="popup-backdrop-fade"></div>
            ${this._musHeroBar()}
          </div>
          ${this._musicModal?.menu ? this._musMenuHtml(this._musicModal.menu) : ''}
          <div class="popup-body mus-modal-body">
            <div class="popup-content mus-content">
              ${shot
                ? `<img class="popup-poster mus-poster" src="${shot}" loading="lazy" onerror="this.style.display='none'">`
                : `<div class="popup-poster mus-poster mus-cover-ph">${this._escHtml(this._musInitials(artist.artistName))}</div>`}
              <div class="popup-meta">
                <div style="display:flex;align-items:flex-start;gap:8px;margin:0 0 5px">
                  <h2 class="popup-title" style="margin:0;flex:1;min-width:0">${name}${this._musMonMark(artist)}</h2>
                </div>
                ${(subLine || ratingsRow || originFlag) ? `<div class="popup-subrow">${subLine ? `<div class="popup-sub">${subLine}</div>` : ''}${originFlag}${ratingsRow}</div>` : ''}
                ${this._musInstChip(artist)}
                ${this._musStreamBar()}
                ${artist.overview
                  ? `<p class="popup-overview mus-overview"${this._musDescH ? ` style="max-height:${this._musDescH}px"` : ''}>${this._escHtml(artist.overview)}</p>`
                  : ''}
              </div>
            </div>
            ${this._musSearchPanel()}
            ${m.search ? '' : `<div class="mus-albums${this._musAlbH ? ' is-sized' : ''}" data-music-albums${this._musAlbH ? ` style="height:${this._musAlbH}px"` : ''}>
              <div class="pp-grab mus-alb-grab" data-mus-alb-handle><span></span></div>
              ${m.loading
                ? `<div class="is-loading"><span>${this._t('loading')}</span></div>`
                : this._musicAlbumsHtml()}
            </div>`}
          </div>
        </div>
      </div>`;
  }

  // Country of origin, from MusicBrainz. Quality has no place beside it: that
  // is per album, and the album rows below say it each for themselves.
  _musOriginFlag(artist) {
    const origin = (this._musOrigin(artist) || [])[0] || '';
    const flag = origin ? (this._flagSvg(origin) || this._flagEmoji(origin)) : '';
    if (!flag) return '';
    return `<span class="pp-fi-chip mus-origin-chip"><span class="pp-fi-flags">`
      + `<span class="pp-fi-flag" title="${this._escHtml(origin)}">${flag}</span></span></span>`;
  }

  // The transport for a track opened from Now Playing: the same seek bar and
  // buttons the stream popup carries, sitting under the artist's own line.
  // data-state on the fill is what the streams timer looks for, so the bar
  // keeps moving between renders without a second timer of its own.
  _musStreamBar() {
    const eid = this._musicModal?.stream;
    if (!eid) return '';
    const st = this._hass?.states?.[eid];
    if (!st) return '';
    const attr = st.attributes || {};
    const playing = st.state === 'playing';
    const dur = attr.media_duration || 0;
    const pos = attr.media_position || 0;
    const updatedAt = attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now();
    const cur = Math.min(pos + (playing ? (Date.now() - updatedAt) / 1000 : 0), dur);
    const pct = dur > 0 ? (cur / dur * 100).toFixed(2) : 0;
    const fmt = v => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(Math.floor(v % 60)).padStart(2, '0')}`;

    const feats = attr.supported_features || 0;
    const canSeek = !!(feats & 2);
    const canControl = !!(feats & 1) || !!(feats & 16384);
    const _e = this._escHtml(eid);

    const bar = dur > 0 ? `
      <div ${canSeek ? `class="stream-seek-wrap mus-seek" data-action="stream-seek" data-entity="${_e}" data-dur="${dur}" style="cursor:pointer;padding:5px 0"` : 'style="padding:5px 0"'}>
        <div class="stream-prog-track" style="height:4px;position:relative;bottom:auto;left:auto;right:auto;border-radius:2px">
          <div class="stream-prog-fill" data-entity="${_e}" data-pos="${pos}" data-dur="${dur}" data-updated="${updatedAt}" data-state="${st.state}" style="width:${pct}%;transition:none;border-radius:2px"></div>
        </div>
      </div>
      <div class="stream-popup-time" style="font-size:10px;color:var(--is-dim,rgba(255,255,255,0.4))">${fmt(cur)} / ${fmt(dur)}</div>` : '';

    const controls = canControl ? `
      <div style="display:flex;align-items:center;gap:14px;margin-top:6px">
        <button class="popup-ctrl-btn" data-action="stream-prev" data-entity="${_e}"><ha-icon icon="mdi:skip-previous" style="--mdc-icon-size:22px"></ha-icon></button>
        <button class="popup-ctrl-btn popup-ctrl-btn-main" data-action="stream-playpause" data-entity="${_e}"><ha-icon icon="mdi:${playing ? 'pause' : 'play'}" style="--mdc-icon-size:26px"></ha-icon></button>
        <button class="popup-ctrl-btn" data-action="stream-next" data-entity="${_e}"><ha-icon icon="mdi:skip-next" style="--mdc-icon-size:22px"></ha-icon></button>
      </div>` : '';

    return `<div class="mus-stream-bar">${bar}${controls}</div>`;
  }

  // The instance chip a series gets — label plus how much of it is on disk —
  // reading tracks instead of episodes.
  _musInstChip(artist) {
    const st = artist?.statistics;
    if (!st) return '';
    if (!artist.monitored) {
      const nm = this._t('notMonitored');
      return `<div class="instance-status-row"><span class="inst-chip ic--added">${nm}</span></div>`;
    }
    const have  = st.trackFileCount ?? 0;
    const total = st.trackCount ?? 0;           // what the monitored albums hold
    const allTr = st.totalTrackCount ?? total;  // everything the artist released
    const done  = total > 0 && have >= total;
    const dlPct = this._lidarrQueueArtists?.get(artist.id);
    const sp = this._musicModal?.search;
    const waiting = !!(sp?.grabbing || (sp?.grabbed?.size && dlPct === undefined));
    const dl = dlPct !== undefined
      ? `<span class="inst-chip ic--downloading">${
          dlPct >= 0
            ? `<span class="ic-bar"><span style="width:${dlPct}%"></span></span> ${dlPct}%`
            : `↓ ${this._t('badgeDownloading')}`
        }</span>`
      : (waiting
        ? `<span class="inst-chip ic--downloading"><span class="is-spin" style="width:10px;height:10px;border-width:1.5px"></span></span>`
        : '');
    // Same four states the poster stripe reads: everything wanted and nothing
    // left unmonitored is green, complete within its monitoring is blue, part
    // of it here is red, none of it yet is neutral.
    const cls   = done
      ? (allTr > total ? 'ic--monitored' : 'ic--available')
      : (have > 0 ? 'ic--behind' : 'ic--idle');
    const icon  = done ? ' <span class="ic-icon">✓</span>' : '';
    return `<div class="instance-status-row">${dl}<span class="inst-chip ${cls}">${have}/${total}${icon}</span></div>`;
  }

  // Same bookmark the film and series popup puts beside a title, so monitoring
  // reads the same way whichever library a detail came from.
  _musMonMark(artist) {
    const on = !!artist?.monitored;
    const svg = on
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    const tip = on ? this._t('musicMonitored') : this._t('musicUnmonitored');
    return `<span class="popup-mon-btn mus-mon" title="${tip}" style="vertical-align:middle;margin-left:7px">${svg}</span>`;
  }

  // The film popup's capsule, with the three things an artist can be asked for.
  // Admin only: everything behind these buttons writes, and the proxy refuses
  // writes from anyone else anyway.
  _musHeroBar() {
    if (!this._hass?.user?.is_admin) return '';
    const m = this._musicModal;
    const busy = m?.busy;
    if (m?.preview) return this._musPreviewBar();
    const chev = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const searchSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>`;
    const trashSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    const dotsSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
    const spin = `<span class="is-spin" style="width:12px;height:12px;border-width:1.5px"></span>`;
    const open = m?.menu;
    return `
      <div class="pp-hero-bar">
        <div class="pp-hero-pill">
          <button class="is-open-btn${(open === 'search' || m?.search) ? ' active' : ''}" data-mus-menu="search">${busy === 'search' ? spin : searchSvg}<span class="pp-lbl">${this._t('musSearch')} ${chev}</span></button>
          <button class="is-open-btn${open === 'remove' ? ' active' : ''}" data-mus-menu="remove">${busy === 'remove' ? spin : trashSvg}<span class="pp-lbl">${this._t('musRemove')} ${chev}</span></button>
          <button class="is-open-btn${open === 'actions' ? ' active' : ''}" data-mus-menu="actions">${dotsSvg}<span class="pp-lbl">${this._t('musActions')} ${chev}</span></button>
        </div>
      </div>`;
  }

  _musPreviewBar() {
    const m = this._musicModal;
    const chev = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const searchSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>`;
    const spin = `<span class="is-spin" style="width:12px;height:12px;border-width:1.5px"></span>`;
    return `
      <div class="pp-hero-bar">
        <div class="pp-hero-pill">
          <button class="is-open-btn${m?.menu === 'search' ? ' active' : ''}" data-mus-menu="search">${m?.adding ? spin : searchSvg}<span class="pp-lbl">${this._t('musSearch')} ${chev}</span></button>
        </div>
      </div>`;
  }

  _musMenuHtml(kind) {
    const m = this._musicModal;
    const artist = m?.artist || {};
    const row = (act, label, sub = '') =>
      `<button class="qa-item" data-mus-act="${act}"><span>${label}</span>${sub ? `<span class="mus-sub">${sub}</span>` : ''}</button>`;

    let rows = '';
    if (kind === 'search') {
      const magnifier = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
      const person = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      const iconRow = (act, icon, label) =>
        `<button class="qa-item" data-mus-act="${act}"><span class="qa-ico">${icon}</span><span>${label}</span></button>`;
      rows = iconRow('as', magnifier, 'Automatic') + iconRow('is', person, 'Interactive');
    } else if (kind === 'remove') {
      rows = row('remove-lib', this._t('musRemoveLib'))
           + row('remove-disc', this._t('musRemoveDisc'));
    } else {
      const sub = m?.menuSub;
      const drawer = (key, html) => sub === key
        ? `<div class="qa-drawer is-open">${html}</div>`
        : '';
      const chev = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5"><polyline points="9 6 15 12 9 18"/></svg>`;
      const parent = (key, label) =>
        `<button class="qa-item${sub === key ? ' qa-open' : ''}" data-mus-act="${key}"><span>${label}</span>${chev}</button>`;

      rows = row('show-in-lib', this._t('qaShowInLib'));
      if (this._plexConfigured !== false && (artist.statistics?.trackFileCount || 0) > 0) {
        rows += parent('cast', this._t('qaCast')) + drawer('cast', this._musCastRowsHtml());
      }
      if (this._musStatsSource() && (artist.statistics?.trackFileCount || 0) > 0) {
        rows += parent('stats', this._t('musListenStats')) + drawer('stats', this._musStatsRowsHtml());
      }
    }
    return `<div class="qa-menu mus-menu"><div class="qa-list">${rows}</div></div>`;
  }

  _musPreviewAlbumTile(album) {
    const pc    = this._posterCfg();
    const cover = this._lidarrCover(album);
    const title = this._escHtml(album.title || '');
    const year  = (album.releaseDate || '').slice(0, 4);
    return `
      <div class="mus-alb" data-mus-prev-album="${this._escHtml(album.title || '')}" title="${title}">
        <div class="mus-alb-art${this._musArtSeen?.has(cover) ? ' art-done' : ''}">
          ${cover
            ? `${this._musArtSeen?.has(cover) ? '' : '<span class="action-spinner mus-alb-spin"></span>'}
               <img src="${cover}" loading="lazy" decoding="async"
                    onload="this.parentElement.classList.add('art-done')"
                    onerror="this.style.display='none';this.parentElement.classList.add('art-done')">`
            : `<div class="mus-cover-ph" style="width:100%;height:100%">${this._escHtml(title.slice(0, 1) || '?')}</div>`}
          ${pc.mediaType ? `<span class="media-type-tag">${this._t('typeAlbum')}</span>` : ''}
          <div class="mus-alb-cap">
            ${year ? `<div class="mus-alb-year">${year}</div>` : ''}
            <div class="mus-alb-title">${title}</div>
          </div>
        </div>
      </div>`;
  }

  _musCastRowsHtml() {
    const list = this._plexClients;
    if (!list) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('loading')}</div>`;
    if (!list.length) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaCastNone')}</div>`;
    const PLAY_MEDIA = 512;
    return list.map(p => {
      const feats = Number(this._hass?.states?.[p.entityId]?.attributes?.supported_features) || 0;
      const can = !feats || (feats & PLAY_MEDIA);
      return `<button class="qa-item qa-sub-item" data-mus-cast="${this._escHtml(p.entityId)}"${
        can ? '' : ' style="opacity:0.45"'}><span>${this._escHtml(p.name)}</span></button>`;
    }).join('');
  }

  _musStatsRowsHtml() {
    const st = this._musStats;
    if (!st) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('loading')}</div>`;
    if (!st.any) return `<div class="qa-item qa-sub-item qa-static" style="opacity:0.6">${this._t('qaStatsNone')}</div>`;
    const row = (label, value) =>
      `<div class="qa-item qa-sub-item qa-static"><span>${label}</span><span class="qa-air-date">${this._escHtml(String(value))}</span></div>`;
    return [
      st.tracks  ? row(this._t('musStatsTracks'), st.tracks)  : '',
      st.plays   ? row(this._t('qaStatsPlays'),   st.plays)   : '',
      st.watched ? row(this._t('musStatsTime'),   st.watched) : '',
      st.last    ? row(this._t('qaStatsLast'),    st.last)    : '',
      st.top     ? row(this._t('musStatsTop'),    st.top)     : '',
      st.others  ? row(this._t('qaStatsOthers'),  st.others)  : '',
    ].join('');
  }

  // The Sonarr panel, with albums where it has seasons: a row per album with
  // its progress, a monitor toggle and the search button, and the releases
  // opening underneath the row they belong to.
  _musSearchPanel() {
    const sp = this._musicModal?.search;
    if (!sp) return '';
    if (sp.confirmAdd || sp.adding) {
      const h = this._musPanelH ? ` style="height:${this._musPanelH}px"` : '';
      const rise = sp.entered ? '' : ' mus-rise';
      sp.entered = true;
      const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      const body = sp.adding
        ? `<div class="is-loading">
             <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>
             <span>${this._t('musAdding')}</span>
           </div>`
        : `<div class="is-confirm-wrap">
             <div class="is-confirm-msg">${this._t('musConfirmMsg')}</div>
             <div class="is-confirm-actions">
               <button class="is-confirm-btn is-confirm-yes" data-mus-act="add-yes">${checkSvg}</button>
               <button class="is-confirm-btn is-confirm-no" data-mus-act="add-no">${crossSvg}</button>
             </div>
           </div>`;
      return `<div class="sn-is-section mus-search${rise}"${h}>
        <div class="pp-grab" data-mus-grab-handle><span></span></div>
        ${body}
      </div>`;
    }
    const albums = [...(this._musicModal?.albums || [])].sort((a, b) =>
      String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')));
    const label = sp.mode === 'as' ? this._t('musAutoSearch') : this._t('musInteractive');
    const rows = albums.map(a => this._musAlbumRow(a, sp)).join('');
    const h = this._musPanelH ? ` style="height:${this._musPanelH}px"` : '';
    const rise = sp.entered ? '' : ' mus-rise';
    sp.entered = true;
    return `<div class="sn-is-section mus-search${rise}"${h}>
      <div class="pp-grab" data-mus-grab-handle><span></span></div>
      <div class="sn-seasons-label">${label}</div>
      <div class="sn-seasons-rows" style="display:flex;flex-direction:column;gap:4px">${rows}</div>
    </div>`;
  }

  _musAlbumRow(album, sp) {
    const st    = album.statistics || {};
    const have  = st.trackFileCount ?? 0;
    const tot   = st.trackCount ?? 0;
    const pct   = tot > 0 ? Math.round((have / tot) * 100) : 0;
    const year  = (album.releaseDate || '').slice(0, 4);
    const active = sp.albumId === album.id && sp.mode === 'is';
    const busy   = sp.busyAlbum === album.id;
    const sent   = sp.searched?.has(album.id);
    const exp    = sp.expanded === album.id;
    const isAdmin = !!this._hass?.user?.is_admin;

    const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;
    const chevron = `<svg class="sn-season-chevron${exp ? ' open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;
    const trashSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

    const monBtn = this._musMonBtn(album, sp);

    let trashBtn = '';
    if (have > 0 && isAdmin) {
      if (sp.delBusy === album.id) {
        trashBtn = `<span class="action-spinner" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0"></span>`;
      } else if (sp.delConfirm === album.id) {
        const chk = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        const cross = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        trashBtn = `<span class="ep-del-confirm"><button class="btn-ep-trash btn-ep-del-yes" data-mus-del-yes="${album.id}">${chk}</button><button class="btn-person" data-mus-del-no>${cross}</button></span>`;
      } else {
        trashBtn = `<button class="btn-ep-trash" data-mus-del="${album.id}" title="${this._t('musDeleteFiles')}">${trashSvg}</button>`;
      }
    }

    const searchBtn = busy
      ? `<span class="action-spinner" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0"></span>`
      : sp.mode === 'as'
        ? `<button class="btn-person${sent ? ' active' : ''}" data-mus-album="${album.id}" title="${this._t('musAutoSearch')}">${sent
            ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`}</button>`
        : `<button class="btn-person${active ? ' active' : ''}" data-mus-album="${album.id}" title="${this._t('musInteractive')}">${personIcon}</button>`;

    const statHtml = sp.delConfirm === album.id
      ? `<span class="ep-del-msg">${this._t('delSeasonConfirm') || 'Delete all from disk?'}</span>`
      : `<span class="sn-season-stat">${have}/${tot}</span>
         <div class="sn-season-bar"><div class="sn-season-bar-fill" style="width:${pct}%"></div></div>`;

    return `<div class="sn-season-row" data-album-row="${album.id}">
      <div class="sn-season-header mus-alb-header">
        <button class="sn-expand" data-mus-expand="${album.id}" title="${this._t('musTracks')}">
          ${chevron}
        </button>
        <span class="sn-season-title">${this._escHtml(album.title || '')}${year ? ` <span style="opacity:0.5;font-weight:500">${year}</span>` : ''}</span>
        ${statHtml}
        ${trashBtn}
        ${monBtn}
        ${searchBtn}
      </div>
      ${active ? this._musIsPanel(sp) : ''}
      ${exp ? this._musTracksPanel(album, sp) : ''}
    </div>`;
  }

  _musMonBtn(album, sp) {
    if (sp.monBusy === album.id) {
      return `<span class="action-spinner" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0"></span>`;
    }
    const svg = album.monitored
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    return `<button class="btn-person${album.monitored ? ' active' : ''}" data-mus-mon="${album.id}" title="${album.monitored ? this._t('musUnmonitor') : this._t('musMonitor')}">${svg}</button>`;
  }

  // Tracks are to an album what episodes are to a season.
  _musTracksPanel(album, sp) {
    const tracks = sp.tracks?.get(album.id);
    if (!tracks) {
      return `<div class="sn-episodes sn-episodes-loading">
        <span class="action-spinner" style="width:14px;height:14px;border-width:1.5px"></span>
      </div>`;
    }
    if (!tracks.length) {
      return `<div class="sn-episodes"><span style="color:rgba(255,255,255,0.4);font-size:11px">${this._t('musNoTracks')}</span></div>`;
    }
    const rows = tracks.map(t => {
      const num = String(t.absoluteTrackNumber ?? t.trackNumber ?? '').padStart(2, '0');
      const dur = t.duration ? `${Math.floor(t.duration / 60000)}:${String(Math.floor((t.duration % 60000) / 1000)).padStart(2, '0')}` : '';
      return `<div class="sn-ep-item">
        <div class="sn-ep-row${t.hasFile ? ' has-file' : ''}">
          <span class="sn-ep-num">${num}</span>
          <span class="sn-ep-title">${this._escHtml(t.title || '')}</span>
          ${dur ? `<span class="sn-ep-date">${dur}</span>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="sn-episodes">${rows}</div>`;
  }

  _musIsPanel(sp) {
    if (sp.state === 'loading') {
      return `<div class="sn-is-panel"><div class="is-loading">
        <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>
        <span>${this._t('isQueryingIndexers')}</span></div></div>`;
    }
    if (sp.state === 'error') {
      return `<div class="sn-is-panel"><div class="is-loading" style="color:rgba(255,69,58,0.80)">⚠ ${this._escHtml(sp.error || '')}</div></div>`;
    }
    if (sp.state !== 'results') return '';

    const list = sp.results || [];
    if (!list.length) return `<div class="sn-is-panel"><div class="is-loading">${this._t('isNoResults')}</div></div>`;

    // A phone gets the same stacked cards a series does: seven columns of a
    // table at that width put the title under the indexer and the size over
    // both.
    if (this._isMob) {
      return `<div class="sn-is-panel">
        <div class="is-results-wrap">${this._musIsCards(list, sp)}</div>
      </div>`;
    }

    const rows = list.map(r => {
      const rej = !r.approved && r.rejections?.length
        ? `<div class="is-rej-row">⚠ ${this._escHtml(r.rejections.slice(0, 2).join(' · '))}</div>` : '';
      return `<tr>
        <td>${this._isSrcPill(r)}</td>
        <td><span class="is-rel-title">${this._escHtml(r.title || '')}</span>
            <span class="is-rel-age">${Math.round(r.age || 0)}d</span>${rej}</td>
        <td><span class="is-indexer">${this._escHtml(r.indexer || '')}</span></td>
        <td><span class="is-size">${fmtBytes(r.size)}</span></td>
        <td>${this._isPeers(r)}</td>
        <td>${this._isQualityBadge(r)}</td>
        <td>${this._musGrabBtn(r, sp)}</td>
      </tr>`;
    }).join('');

    // A grab button showing progress is three times the width of the plain
    // arrow, so the column it sits in has to make room — pulled leftwards with
    // a negative margin instead, it climbed over the quality badge.
    const wideGrab = this._lidarrQueuePct?.get(sp.albumId) !== undefined;
    return `<div class="sn-is-panel">
      <div class="is-results-wrap">
        <table class="is-table">
          <colgroup><col style="width:50px"><col><col style="width:80px"><col style="width:60px"><col style="width:70px"><col style="width:74px"><col style="width:${wideGrab ? 78 : 56}px"></colgroup>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }

  _musIsCards(releases, sp) {
    return releases.map(r => {
      const rejHtml = !r.approved && r.rejections?.length
        ? `<div class="is-ic-rej">⚠ ${this._escHtml(r.rejections.slice(0, 1).join(''))}</div>` : '';
      return `<div class="is-card">
        <div class="is-ic-r1">
          ${this._isSrcPill(r)}
          ${this._isQualityBadge(r)}
          <span class="is-size">${fmtBytes(r.size)}</span>
          <div class="is-ic-spacer"></div>
          ${this._musGrabBtn(r, sp)}
        </div>
        <div class="is-ic-title">${this._escHtml(r.title || '')}</div>
        <div class="is-ic-meta">
          <span>${this._escHtml(r.indexer || '')}</span>
          ${/torrent/i.test(String(r.protocol || ''))
            ? `<span class="sep">·</span><span class="is-s">↑${r.seeders ?? '?'}</span>/<span class="is-l">↓${r.leechers ?? '?'}</span>`
            : ''}
          <span class="sep">·</span>
          <span>${Math.round(r.age || 0)}d ago</span>
        </div>
        ${rejHtml}
      </div>`;
    }).join('');
  }

  _musGrabBtn(r, sp) {
    if (sp.grabbing === r.guid) {
      return `<button class="is-grab-btn" disabled>
        <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
      </button>`;
    }
    if (sp.grabbed?.has(r.guid) || this._lidarrQueue?.has(sp.albumId)) {
      const p = this._lidarrQueuePct?.get(sp.albumId);
      if (p === undefined) {
        return `<button class="is-grab-btn" disabled title="${this._t('isGrabbed')}">
          <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
        </button>`;
      }
      const pct = p >= 0 ? p : 0;
      return `<button class="is-grab-btn" disabled style="width:100%;min-width:0;gap:3px;padding:0 6px;border-radius:9px" title="${this._t('isGrabbed')}">
        <div style="display:flex;align-items:center;gap:3px;width:100%">
          <div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden">
            <div style="width:${Math.max(pct, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div>
          </div>
          <span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${pct}%</span>
        </div>
      </button>`;
    }
    const isRej = !r.approved;
    return `<button class="is-grab-btn${isRej ? ' force' : ''}" data-mus-grab="${this._escHtml(r.guid)}" title="${isRej ? 'Force grab' : 'Grab'}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>`;
  }

  _musicAlbumsHtml() {
    const m = this._musicModal;
    const albums = [...(m?.albums || [])].sort((a, b) =>
      String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')));
    if (!albums.length) return `<div class="placeholder">${this._t('musicNoAlbums')}</div>`;

    const per   = Math.max(2, (m.cols || 4) * (m.rows || 2));
    const pages = Math.max(1, Math.ceil(albums.length / per));
    const page  = Math.min(m.albPage || 0, pages - 1);
    const slice = albums.slice(page * per, page * per + per);
    this._musPrefetchCovers(albums.slice((page + 1) * per, (page + 2) * per));

    // The slots stay even with one page, so the first cover lines up with the
    // portrait whether or not there is anything to page through.
    const chev = (dir, disabled) =>
      `<button class="pg-btn mus-pg${disabled ? ' pg-btn-ph' : ''}" data-mus-page="${dir}"${disabled ? ' disabled aria-hidden="true" tabindex="-1"' : ''}>${dir === 'prev' ? '&#8249;' : '&#8250;'}</button>`;

    return `<div class="mus-alb-wrap">
      ${chev('prev', page === 0)}
      <div class="mus-alb-grid"${this._musAlbCols ? ` style="--mus-alb-cols:${this._musAlbCols}"` : ''}>${slice.map(a => this._musicAlbumTile(a)).join('')}</div>
      ${chev('next', page >= pages - 1)}
    </div>`;
  }

  _musicAlbumTile(album) {
    if (album.mbId) return this._musPreviewAlbumTile(album);
    const cover = this._lidarrCover(album);
    const title = this._escHtml(album.title || '');
    const year  = (album.releaseDate || '').slice(0, 4);
    const rv    = album.ratings?.value;
    const rating = rv ? (Math.round(rv * 10) / 10).toFixed(1) : '';
    const st    = album.statistics || {};
    const have  = st.trackFileCount ?? 0;
    const total = st.trackCount ?? 0;
    const dl    = this._lidarrQueue?.has(album.id);

    // A part-downloaded album says how much of it is here, the same way a
    // part-downloaded series does, rather than a symbol that needs decoding.
    let cls = 'b-missing', icon = '✗';
    if (dl)                              { cls = 'b-dl';       icon = '↓'; }
    else if (total > 0 && have >= total) { cls = 'b-st-avail'; icon = '✓'; }
    else if (have > 0)                   { cls = 'b-partial';  icon = `${have}/<span class="b-txt">${total}</span>`; }

    // Tags or stripes is a card-wide preference, so an album cover follows the
    // same setting as every poster rather than always wearing a badge.
    const disp = this._posterCfg().statusDisplay;
    const showTag    = disp === 'tags' || disp === 'both';
    const showStripe = disp === 'stripes' || disp === 'both';
    const pctBar = (cls === 'b-dl')
      ? (this._lidarrQueuePct?.get(album.id) ?? -1)
      : (cls === 'b-partial' ? Math.round((have / total) * 100) : -1);

    return `
      <div class="mus-alb" data-album-id="${album.id}" title="${title}">
        <div class="mus-alb-art${cover && this._musArtSeen?.has(cover) ? ' art-done' : ''}">
          ${cover
            ? `${this._musArtSeen?.has(cover) ? '' : '<span class="action-spinner mus-alb-spin"></span>'}
               <img src="${cover}" loading="lazy" decoding="async"
                    onload="this.parentElement.classList.add('art-done')"
                    onerror="this.style.display='none';this.parentElement.classList.add('art-done')">`
            : `<div class="mus-cover-ph" style="width:100%;height:100%">${this._escHtml(title.slice(0, 1) || '?')}</div>`}
          ${this._posterCfg().mediaType ? `<span class="media-type-tag">${this._t('typeAlbum')}</span>` : ''}
          ${showTag ? `<span class="badge ${cls} mus-alb-badge">${icon}</span>` : ''}
          <div class="mus-alb-cap">
            ${rating ? `<span class="badge b-quality mus-alb-rating">${rating}</span>` : ''}
            ${year ? `<div class="mus-alb-year">${year}</div>` : ''}
            <div class="mus-alb-title">${title}</div>
          </div>
          ${showStripe ? this._statusStripe(this._statusStripeColor(cls), cls === 'b-dl', pctBar) : ''}
        </div>
      </div>`;
  }

  _musPrefetchCovers(albums) {
    if (!albums?.length) return;
    const run = () => albums.forEach(a => {
      const u = this._lidarrCover(a);
      if (u) { const i = new Image(); i.decoding = 'async'; i.src = u; }
    });
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 300);
  }

  _albumModalHtml() {
    const m = this._albumModal;
    if (!m) return '';
    const album  = m.album || {};
    const artist = m.artist || album.artist || {};
    const title  = this._escHtml(album.title || '');
    const who    = this._escHtml(artist.artistName || '');
    const perf   = this._cfgGet('styles', 'performanceMode', false);
    const cover  = this._lidarrCover(album);
    const fan    = this._lidarrArtistImage(artist, 'fanart');

    const st    = album.statistics || {};
    const have  = st.trackFileCount ?? 0;
    const total = st.trackCount ?? 0;
    const year  = String(album.releaseDate || '').slice(0, 4);
    const subLine = [
      who,
      year,
      album.albumType || '',
      total ? `${total} ${this._t('musStatsTracks').toLowerCase()}` : '',
    ].filter(Boolean).join(' · ');

    const rv = album.ratings?.value;
    const votes = album.ratings?.votes;
    const mbIcon = `<svg width="22" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#BA478F"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="900" fill="#fff">MB</text></svg>`;
    const ratingsRow = rv
      ? `<div class="popup-ratings" title="MusicBrainz${votes ? ` · ${votes} ${votes === 1 ? 'vote' : 'votes'}` : ''}"><span style="display:inline-flex;align-items:center;gap:4px">${mbIcon}<b style="font-size:12px;color:var(--is-text);line-height:1;display:block;margin-top:-1px">${(Math.round(rv * 10) / 10).toFixed(1)}</b></span></div>`
      : '';

    const backdropStyle = (fan && !perf)
      ? `background-image:url('${fan}')`
      : `background:linear-gradient(135deg,rgba(21,158,90,0.35),rgba(10,10,14,0.9))`;

    const chip = total
      ? `<div class="instance-status-row"><span class="inst-chip ${
          have >= total ? 'ic--available' : have > 0 ? 'ic--partial' : 'ic--missing'
        }">${have}/${total}${have >= total ? ' <span class="ic-icon">✓</span>' : ''}</span></div>`
      : '';

    return `
      <div class="popup-overlay${dayClass(this)}" data-album-modal>
        <div class="popup-glass is-wide"${this._musGlassH ? ` style="height:${this._musGlassH}px"` : ''}>
          <button class="popup-close" data-album-close><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div class="popup-backdrop mus-backdrop" style="${backdropStyle}">
            <div class="popup-backdrop-fade"></div>
          </div>
          <div class="popup-body mus-modal-body">
            <div class="popup-content mus-content">
              ${cover
                ? `<img class="popup-poster mus-poster" src="${cover}" loading="lazy" onerror="this.style.display='none'">`
                : `<div class="popup-poster mus-poster mus-cover-ph">${this._escHtml(this._musInitials(album.title))}</div>`}
              <div class="popup-meta">
                <div style="display:flex;align-items:flex-start;gap:8px;margin:0 0 5px">
                  <h2 class="popup-title" style="margin:0;flex:1;min-width:0">${title}</h2>
                </div>
                ${(subLine || ratingsRow) ? `<div class="popup-subrow">${subLine ? `<div class="popup-sub">${subLine}</div>` : ''}${ratingsRow}</div>` : ''}
                ${chip}
              </div>
            </div>
            <div class="alb-tracks" data-album-tracks>
              ${this._albumTracksHtml()}
            </div>
          </div>
        </div>
      </div>`;
  }

  _albumTracksHtml() {
    const tracks = this._albumModal?.tracks;
    if (!tracks) {
      return `<div class="sn-episodes sn-episodes-loading"><span class="action-spinner" style="width:14px;height:14px;border-width:1.5px"></span></div>`;
    }
    if (!tracks.length) {
      return `<div class="sn-episodes"><span style="color:rgba(255,255,255,0.4);font-size:11px">${this._t('musNoTracks')}</span></div>`;
    }
    const rows = tracks.map(t => {
      const num = String(t.absoluteTrackNumber ?? t.trackNumber ?? '').padStart(2, '0');
      const dur = t.duration
        ? `${Math.floor(t.duration / 60000)}:${String(Math.floor((t.duration % 60000) / 1000)).padStart(2, '0')}`
        : '';
      return `<div class="sn-ep-item">
        <div class="sn-ep-row${t.hasFile ? ' has-file' : ''}">
          <span class="sn-ep-num">${num}</span>
          <span class="sn-ep-title">${this._escHtml(t.title || '')}</span>
          ${dur ? `<span class="sn-ep-date">${dur}</span>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="sn-episodes">${rows}</div>`;
  }

}

export const musicRenderMixin = _MusicRenderMethods.prototype;
