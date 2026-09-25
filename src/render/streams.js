import { RANGE_MARKS, rangeMarkSvg } from '../shared/logos.js';
// Now Playing: the stream cards and their timer. Split out of render/right.js.

class _StreamsRenderMethods {

// ─────────────────────────────────────────────
// Active Streams (Plex / Jellyfin via hass.states)
// ─────────────────────────────────────────────

_renderStreams() {
  const states = this._hass?.states || {};

  // Plex streams from media_player entities
  const plexStreams = Object.entries(states)
    .filter(([id, s]) => {
      if (!id.startsWith('media_player.plex_')) return false;
      if (s.state !== 'playing' && s.state !== 'paused') {
        this._streamsEnded.delete(id);
        return false;
      }
      if (this._streamsEnded.has(id)) return false;
      const attr = s.attributes || {};
      const dur  = attr.media_duration || 0;
      const pos  = attr.media_position  || 0;
      if (dur > 0 && pos >= dur - 2) return false;
      return true;
    })
    .map(([id, s]) => ({ id, state: s.state, attr: s.attributes || {} }));

  // Jellyfin sessions from our proxy endpoint
  const jellyfinStreams = (this._jellyfinSessions || []).filter(s => {
    if (this._streamsEnded.has(s.id)) return false;
    const dur = s.attr.media_duration || 0;
    const pos = s.attr.media_position || 0;
    if (dur > 0 && pos >= dur - 2) return false;
    return true;
  });

  // Emby sessions from our proxy endpoint
  const embyStreams = (this._embySessions || []).filter(s => {
    if (this._streamsEnded.has(s.id)) return false;
    const dur = s.attr.media_duration || 0;
    const pos = s.attr.media_position || 0;
    if (dur > 0 && pos >= dur - 2) return false;
    return true;
  });

  // Kodi streams from our proxy (entity registry lookup — entity id varies)
  const kodiStreams = (this._kodiSessions || []).filter(s => {
    if (this._streamsEnded.has(s.id)) return false;
    const dur = s.attr.media_duration || 0;
    const pos = s.attr.media_position || 0;
    if (dur > 0 && pos >= dur - 2) return false;
    return true;
  });

  const streams = [...plexStreams, ...jellyfinStreams, ...embyStreams, ...kodiStreams];

  this._streams = streams;
  this._startStreamsTimer(streams);
  this._syncStreamPopup();

  if (streams.length === 0) return '';

  const grid = this._pagedGridWithSmp(streams, 'streams', s => this._renderStreamCard(s));

  const hasPlex  = plexStreams.length > 0;
  const hasJF    = jellyfinStreams.length > 0;
  const hasEmby  = embyStreams.length > 0;
  const hasKodi  = kodiStreams.length > 0;
  const activeApps = [hasPlex && 'plex', hasJF && 'jellyfin', hasEmby && 'emby', hasKodi && 'kodi'].filter(Boolean);
  const overlayApp = activeApps[0] || 'plex';

  const _streamOverlay = (() => {
    if (!this._categoryOverlaysEnabled) return '';
    const o = 0.4;
    if (streams.length <= 2) {
      const mask = `linear-gradient(to bottom,transparent 0.07%,black 6%,black 80%,transparent 100%)`;
      const g = `radial-gradient(circle at 25% 15%,${this._brandColor(overlayApp, o)} 0%,transparent 48%)`;
      return `<div style="position:absolute;inset:0;background:${g};mask-image:${mask};-webkit-mask-image:${mask};filter:blur(25px);pointer-events:none;z-index:0;"></div>`;
    }
    return this._sectionOverlayHtml(overlayApp, 25, 75, o);
  })();

  const iconHtml = activeApps.length > 1
    ? activeApps.map(a => this._appIcon(a, 20)).join('')
    : this._appIcon(activeApps[0] || 'plex', 24);

  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${_streamOverlay}
      <div class="col-hdr" style="margin-bottom:5px">
        <div style="display:flex;gap:4px;align-items:center">${iconHtml}</div>
        <span class="col-hdr-title">${this._t('streamsTitle')}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(229,160,13,0.12);border:1px solid rgba(229,160,13,0.25)">${streams.length} ${this._t('streamsActive')}</span>
      </div>
      ${grid}
    </div>`;
}

_startStreamsTimer(streams) {
  if (this._streamsTimer) { clearInterval(this._streamsTimer); this._streamsTimer = null; }
  const playing = streams.filter(s => s.state === 'playing' && s.attr.media_duration > 0);
  if (!playing.length) return;
  this._streamsTimer = setInterval(() => {
    let anyNewlyEnded = false;
    this.shadowRoot?.querySelectorAll('.stream-prog-fill').forEach(el => {
      const pos       = parseFloat(el.dataset.pos);
      const dur       = parseFloat(el.dataset.dur);
      const updatedAt = parseFloat(el.dataset.updated);
      const entity    = el.dataset.entity;
      if (!dur) return;
      if (!el.dataset.state) return; // popup fill — managed by _streamPopupTimer
      const isPlaying = el.dataset.state === 'playing';
      const elapsed = isPlaying ? (Date.now() - updatedAt) / 1000 : 0;
      const current = Math.min(pos + elapsed, dur);
      el.style.width = (current / dur * 100).toFixed(2) + '%';
      // The clock beside the bar, where there is one. The artist window has no
      // popup timer behind it, so its label was written once at render and then
      // stood still while the bar ran on — most visible right after a seek.
      const timeEl = el.closest('.mus-stream-bar')?.querySelector('.stream-popup-time');
      if (timeEl) {
        const fmt = v => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
        const next = `${fmt(current)} / ${fmt(dur)}`;
        if (timeEl.textContent !== next) timeEl.textContent = next;
      }
      // Detect playback end before HA updates — only for playing streams
      if (isPlaying && entity && current >= dur && !this._streamsEnded.has(entity)) {
        this._streamsEnded.add(entity);
        anyNewlyEnded = true;
      }
    });
    if (anyNewlyEnded) this._reRenderSection('streams');
    // A session read through the proxy arrives on a poll rather than as a state
    // push, so this is where an artist window hears about the next track.
    if (this._musicModal?.stream) this._musWatchStream();

    // Check if entities we marked as ended now have new content in HA
    let anyRestarted = false;
    for (const endedId of this._streamsEnded) {
      const s = this._hass?.states?.[endedId];
      if (!s) continue;
      if (s.state !== 'playing' && s.state !== 'paused') continue;
      const hassPos = s.attributes?.media_position || 0;
      const hassDur = s.attributes?.media_duration || 0;
      if (hassDur > 0 && hassPos < hassDur - 5) {
        this._streamsEnded.delete(endedId);
        anyRestarted = true;
      }
    }
    if (anyRestarted) this._reRenderSection('streams');
  }, 1000);
}

// Plex streams reach the card twice: as HA media_player entities and as proxy
// sessions keyed `plex:<machineIdentifier>`. Only the proxy side carries the
// user and the provider ids, so pair the two up.
_streamPlexSession(id, attr) {
  const sessions = this._plexSessions || [];
  if (id.startsWith('plex:')) return sessions.find(s => s.id === id) || null;
  if (!id.startsWith('media_player.plex_')) return null;
  return sessions.find(s => {
    const sTitle = s.attr.media_title || '';
    const hTitle = attr.media_title || '';
    const titleMatch = hTitle === sTitle || hTitle.startsWith(sTitle + ' (') || sTitle.startsWith(hTitle + ' (');
    const seriesMatch = (s.attr.media_series_title || '') === (attr.media_series_title || '');
    return titleMatch && seriesMatch;
  }) || null;
}

_streamLibPoster(id, attr, isTV, plexMatch) {
  let tmdbId = null;
  let tvdbId = null;
  if (id.startsWith('jellyfin:')) {
    tmdbId = attr._jfTmdbId; tvdbId = attr._jfTvdbId;
  } else if (id.startsWith('emby:')) {
    tmdbId = attr._embyTmdbId; tvdbId = attr._embyTvdbId;
  } else if (plexMatch) {
    tmdbId = plexMatch._tmdbId; tvdbId = plexMatch._tvdbId;
  }
  if (!tmdbId && !tvdbId) return null;
  const eq = (a, b) => a != null && b != null && String(a) === String(b);
  if (isTV) {
    const shows = [...(this._sonarr || []), ...(this._sonarr2 || [])];
    const hit = shows.find(s => eq(s.tvdbId, tvdbId)) || shows.find(s => eq(s.tmdbId, tmdbId));
    return hit ? this._getSonarrPoster(hit) : null;
  }
  const movies = [...(this._radarr || []), ...(this._radarr2 || [])];
  const hit = movies.find(m => eq(m.tmdbId, tmdbId));
  return hit ? this._getRadarrPoster(hit) : null;
}

// The dynamic range of a stream the card is showing, whatever the source.
_streamRangeOf(streamId) {
  if (!streamId) return '';
  const pools = [this._jellyfinSessions, this._plexSessions, this._embySessions];
  for (const pool of pools) {
    const hit = (pool || []).find(s => s.id === streamId);
    if (hit) return hit.attr?._dynRange || '';
  }
  return this._hass?.states?.[streamId]?.attributes?._dynRange || '';
}

// The badge itself. Dolby Vision, HDR10 and HDR10+ each have a logo of their
// own, and each belongs to somebody: reproducing them in a card distributed
// through HACS would mean using three trademarks on licence terms the card
// cannot meet, and HLG has no mark at all — four badges in four visual
// languages. Typography instead, told apart by colour and spacing: the
// black-and-gold capsule reads as Dolby at a glance without being its logo.
_streamRangeBadge(range, { long = false, cls = 'stream-hdr-tag' } = {}) {
  if (!range) return '';
  const dv = range === 'DV';
  const tone = dv ? ' hdr-dv' : range === 'HLG' ? ' hdr-hlg' : '';
  // Dolby Vision, HDR10 and HDR10+ are known by their marks; HLG has none and
  // says its name instead. The drawings take the badge's own colour.
  const mark = RANGE_MARKS[range];
  if (mark) {
    // The Dolby Vision wordmark carries a whole word beside its symbol, so it
    // needs more height than the HDR marks to stay legible at all.
    const svg = rangeMarkSvg(range, long ? (dv ? 13 : 15) : (dv ? 10 : 13));
    // A mark that draws its own frame gets no second one from the badge
    const bare = mark.boxed ? ' hdr-bare' : '';
    return `<span class="${cls}${tone} hdr-logo${bare}" title="${this._escHtml(mark.name)}">${svg}</span>`;
  }
  return `<span class="${cls}${tone}">${this._escHtml(range)}</span>`;
}

_renderStreamCard({ id, state, attr }) {
  const isPlex      = id.startsWith('media_player.plex_') || id.startsWith('plex:');
  const isJellyfin  = id.startsWith('jellyfin:');
  const isEmby      = id.startsWith('emby:');
  const isKodi      = (this._kodiSessions || []).some(s => s.id === id);
  const isPlaying   = state === 'playing';

  // Media info
  const contentType = attr.media_content_type || '';
  const isMusic  = contentType === 'music' || contentType === 'artist' || contentType === 'album';
  const isLiveTV = contentType === 'channel' || (!!attr.media_channel && !isMusic)
                 || attr.media_library_title === 'Live TV';
  const isTV     = isLiveTV || contentType === 'tvshow' || contentType === 'episode' || !!attr.media_series_title;
  const channel  = attr.media_channel || '';
  const title    = isLiveTV
    ? (channel || attr.media_title || '')
    : isTV ? (attr.media_series_title || attr.media_title || '') : (attr.media_artist || attr.media_title || '');
  const epLabel  = !isLiveTV && isTV && attr.media_season && attr.media_episode
    ? `S${String(attr.media_season).padStart(2,'0')}E${String(attr.media_episode).padStart(2,'0')}`
    : '';
  const subtitle = isMusic
    ? (attr.media_album_name || '')
    : isLiveTV ? (attr.media_title || '')
    : isTV ? (attr.media_title || '') : '';

  // Device type label + icon
  let deviceIcon = attr._jfDeviceIcon || attr._embyDeviceIcon || 'mdi:television';
  let deviceName = attr._jfDeviceName || attr._embyDeviceName || 'TV';
  const nl = (attr.friendly_name || id).toLowerCase();
  if (!isJellyfin && !isEmby && /iphone|android.*mobile|for\s+ios|for\s+android\s*\(mobile\)/i.test(nl)) {
    deviceIcon = 'mdi:cellphone'; deviceName = 'Phone';
  } else if (!isJellyfin && !isEmby && /ipad|for\s+android\s*\(tablet\)|tablet/i.test(nl)) {
    deviceIcon = 'mdi:tablet'; deviceName = 'Tablet';
  } else if (!isJellyfin && !isEmby && /macbook|for\s+mac\b|mac\s+desktop/i.test(nl)) {
    deviceIcon = 'mdi:laptop'; deviceName = 'Mac';
  } else if (!isJellyfin && !isEmby && /laptop/i.test(nl)) {
    deviceIcon = 'mdi:laptop'; deviceName = 'Notebook';
  } else if (!isJellyfin && !isEmby && /windows|for\s+windows|desktop|pc\b/i.test(nl)) {
    deviceIcon = 'mdi:monitor'; deviceName = 'PC';
  } else if (!isJellyfin && !isEmby && /web|chrome|browser|safari|firefox|for\s+web/i.test(nl)) {
    deviceIcon = 'mdi:web'; deviceName = 'Browser';
  } else if (!isJellyfin && !isEmby && /apple\s*tv|android\s*tv|fire\s*tv|roku|samsung.*tv|lg.*tv|shield|htpc|for\s+tv/i.test(nl)) {
    deviceIcon = 'mdi:television'; deviceName = 'TV';
  } else if (!isJellyfin && !isEmby && /android/i.test(nl)) {
    deviceIcon = 'mdi:cellphone'; deviceName = 'Phone';
  }

  // Poster: the player's own artwork is whatever the media server holds for the
  // item, which is often the wrong edition or a custom upload. The library entry
  // carries the same poster every other card shows, so prefer it and fall back
  // to the player only for things we do not have (Live TV, music, unmanaged).
  const plexMatch = this._streamPlexSession(id, attr);
  const poster = this._streamLibPoster(id, attr, isTV, plexMatch) || attr.entity_picture || null;
  let img;
  let musicFlat = false;
  if (!poster && isLiveTV) {
    const ch = channel || (attr.media_title || '').slice(0, 6).toUpperCase();
    img = `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1b2a 0%,#1b2838 60%,#0a1628 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px">
      <ha-icon icon="mdi:broadcast" style="--mdc-icon-size:30px;color:rgba(220,60,60,0.85)"></ha-icon>
      ${ch ? `<span style="font-size:8px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.45);max-width:70px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(ch)}</span>` : ''}
      <span style="font-size:7px;font-weight:800;letter-spacing:3px;color:rgba(220,60,60,0.7)">LIVE</span>
    </div>`;
  } else if (isMusic) {
    const perf = this._cfgGet('styles', 'performanceMode', false);
    const back = (!perf && poster)
      ? `<img src="${poster}" class="mus-back" loading="lazy" aria-hidden="true" onerror="this.style.display='none'">`
      : '';
    const front = poster
      ? `<img src="${poster}" class="mus-cover" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="mus-cover mus-cover-ph">♪</div>`;
    img = `${back}<div class="mus-scrim"></div>${front}`;
    musicFlat = !back;
  } else {
    img = this._mcImg(poster, isMusic ? '🎵' : isTV ? '📺' : '🎬', id);
  }

  // Progress bar: compute initial position including elapsed time to avoid re-animation jump
  const duration  = attr.media_duration || 0;
  const position  = attr.media_position  || 0;
  const updatedAt = attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now();
  const elapsed   = isPlaying ? (Date.now() - updatedAt) / 1000 : 0;
  const currentPos = Math.min(position + elapsed, duration);
  const initPct   = duration > 0 ? (currentPos / duration * 100).toFixed(2) : 0;
  const progBar   = duration > 0
    ? `<div class="stream-prog-track"><div class="stream-prog-fill" data-entity="${this._escHtml(id)}" data-pos="${position}" data-dur="${duration}" data-updated="${updatedAt}" data-state="${state}" style="width:${initPct}%;transition:none"></div></div>`
    : '';

  // Service badge at top-right
  const svcBadge = this._statusBadge(
    isPlex  ? `<span class="stream-badge stream-badge-plex">PLEX</span>`
    : isEmby ? `<span class="stream-badge stream-badge-emby">EMBY</span>`
    : isKodi  ? `<span class="stream-badge stream-badge-kodi">KODI</span>`
    :           `<span class="stream-badge stream-badge-jf">JF</span>`
  );

  // Paused overlay
  const pausedOverlay = !isPlaying
    ? `<div class="stream-paused-overlay"><ha-icon icon="mdi:pause-circle" style="--mdc-icon-size:32px;opacity:0.85"></ha-icon></div>`
    : '';

  // Device tag (top-left, like media-type-tag)
  const deviceTag = `<span class="stream-device-tag"><ha-icon icon="${deviceIcon}" style="--mdc-icon-size:9px"></ha-icon> ${this._escHtml(deviceName)}</span>`;

  // Dolby Vision or HDR, when the stream carries it. SDR is the ordinary case
  // and gets no chip — a badge on everything says nothing.
  // Above the title rather than floating over the artwork: the mark belongs to
  // what is playing, and the poster underneath is rarely quiet enough to read
  // a badge against.
  const rangeTag = this._streamRangeBadge(attr._dynRange, { cls: 'stream-hdr-tag stream-hdr-line' });

  // User name — for Plex match against _plexSessions (has _plexUser from API)
  //             Jellyfin: parse from entity_id segment
  let userName = '';
  let userThumb = '';
  if (isPlex) {
    // 1) Try _plexSessions match (most accurate — has real User.title from Plex API)
    if (plexMatch?._plexUser) {
      userName = plexMatch._plexUser;
      userThumb = plexMatch._plexUserThumb || '';
    }
    // No Plex configured in our integration → no user tag shown
  } else if (isJellyfin) {
    userName = attr._jfUser || '';
  } else if (isEmby) {
    userName = attr._embyUser || '';
  } else if (isKodi) {
    // Kodi HA entity — no user concept, use device name
    userName = '';
  } else {
    // Fallback: Jellyfin media_player entity — parse friendly_name
    const fn = attr.friendly_name || '';
    const jf = fn.replace(/^jellyfin\s*/i, '').trim();
    const parts = jf.split(/\s+/);
    userName = parts.length > 1 ? parts.slice(0, -1).join(' ') : jf;
  }
  // Initials (max 2 chars)
  const initials = userName
    ? userName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  // Deterministic hue from name
  const hue = userName
    ? [...userName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
    : 200;
  const avatarEl = userThumb
    ? `<img src="${this._escHtml(userThumb)}" style="width:12px;height:12px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.2)" loading="lazy" onerror="this.style.display='none'">`
    : '';
  const userBadge = userName
    ? `<div class="stream-user-tag">
        ${avatarEl}
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${this._escHtml(userName)}</span>
      </div>`
    : '';

  // A track playing by an artist the library holds opens that artist rather
  // than the plain stream popup — the same detail every other music poster
  // opens, with the transport added.
  const _musArtist = isMusic && this._lidarrConfigured !== false
    ? this._musStreamArtist(id)
    : null;

  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb,255,255,255),1)';
  const sub  = subtitle
    ? `<div style="font-size:${isMusic ? 9 : 10}px;color:rgba(var(--arr-pt-rgb,255,255,255),${isMusic ? '0.66' : '0.6'});margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(subtitle)}</div>`
    : '';

  return `
    <div class="mc${isMusic ? ' mc-music' : ''}${musicFlat ? ' mus-flat' : ''}${!isPlaying ? ' stream-paused' : ''}"${_musArtist ? ` data-artist-id="${_musArtist.id}"` : ''} data-stream-entity="${this._escHtml(id)}" data-stream-type="${this._escHtml(contentType)}" data-stream-title="${this._escHtml(attr.media_title || title)}" data-stream-series="${this._escHtml(attr.media_series_title || '')}" style="cursor:pointer">
      ${img}
      ${deviceTag}
      ${svcBadge}
      ${pausedOverlay}
      ${userBadge}
      ${this._mcGrad(grad, isMusic ? `
        ${this._musStreamRating(attr)}
        <div style="font-size:10px;font-weight:700;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(title)}</div>
        ${sub}
      ` : `
        ${epLabel ? `<div style="margin-bottom:3px"><span class="imdb">${epLabel}</span></div>` : ''}
        ${isLiveTV && channel ? `<div style="margin-bottom:3px"><span class="imdb">${this._escHtml(channel)}</span></div>` : ''}
        ${rangeTag ? `<div style="margin-bottom:3px">${rangeTag}</div>` : ''}
        <div style="font-size:10px;font-weight:700;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(title)}</div>
        ${sub}
      `)}
      ${progBar}
    </div>`;
}

// The playing artist's own score, where Lidarr holds them — the same badge the
// artist card wears, so a track and its artist read alike.
_musStreamRating(attr) {
  const name = String(attr?.media_artist || '').toLowerCase();
  if (!name || !this._lidarrArtists?.size) return '';
  const hit = [...this._lidarrArtists.values()]
    .find(a => String(a.artistName || '').toLowerCase() === name);
  if (!hit) return '';
  const rating = this._posterCfg().rating ? this._musRatingBadge(hit, true, true) : '';
  return this._flagStrip([], this._musOrigin(hit), rating, { endIcon: false });
}

}

export const streamsRenderMixin = _StreamsRenderMethods.prototype;
