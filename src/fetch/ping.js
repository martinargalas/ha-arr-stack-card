// The anonymous usage ping and the one-time activation. Split out of card.js.

// Sixteen hex characters from whatever randomness the page has. crypto.randomUUID
// needs a secure context, and Home Assistant is very often served over plain
// http on the local network, so getRandomValues is asked first and Math.random
// is the last resort — this names a browser for a usage count, nothing more.
function _randomHex16() {
  const bytes = new Uint8Array(8);
  try { crypto.getRandomValues(bytes); }
  catch (_) { for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256); }
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

class _PingMethods {

  _markActivated() {
    if (!this._actPingSent && !this._metricsOptOut) {
      this._actPingSent = true;
      this._sendPing();
    }
  }

  // A window that failed to load, once per window per session (from _chunkFailed)
  _reportChunkFailure(name) {
    if (this._metricsOptOut) return;
    this._cfSent = this._cfSent || new Set();
    if (this._cfSent.has(name)) return;
    this._cfSent.add(name);
    this._sendPing({ cf: name });
  }

  // Who this ping is from. The integration hands over a salted hash of the
  // Home Assistant installation's id — one value per installation, whichever
  // browser or address it is opened from, and nothing that leads back to it.
  // Without the integration a random id is kept in this browser instead, which
  // counts devices rather than installations but says nothing about anyone.
  //
  // It used to be the first characters of the hostname in base64: reversible,
  // and every install reached as homeassistant.local was the same install.
  _pingSid() {
    if (this._iid) return this._iid;
    const KEY = 'arr-stack-card-sid';
    try {
      const kept = localStorage.getItem(KEY);
      if (/^[0-9a-f]{16}$/.test(kept || '')) return kept;
      const fresh = _randomHex16();
      localStorage.setItem(KEY, fresh);
      return fresh;
    } catch (_) {
      this._sessSid = this._sessSid || _randomHex16();
      return this._sessSid;
    }
  }

  // The identifier this browser used before, sent once so the history it
  // pinged under carries over to the new one instead of turning every install
  // into a new one overnight. The server hashes it on arrival and never stores
  // it as sent. Goes in a later release, once the switch has had time to land.
  _pingLegacySid() {
    const KEY = 'arr-stack-card-sid-linked';
    try {
      if (localStorage.getItem(KEY) === '1') return null;
      localStorage.setItem(KEY, '1');
    } catch (_) {
      if (this._legacySent) return null;
      this._legacySent = true;
    }
    try { return btoa(location.hostname).replace(/=/g, '').slice(0, 16); } catch (_) { return null; }
  }

  _sendPing(extra = null) {
    // Belt and braces: whoever calls this, an opted-out install sends nothing
    if (this._metricsOptOut) return;
    try {
      const act  = this._actPingSent ? 1 : 0;
      const sid  = this._pingSid();
      const lsid = this._pingLegacySid();
      const svcs = [
        this._radarr2Configured   !== false && 'radarr2',
        this._sonarr2Configured   !== false && 'sonarr2',
        this._overseerrConfigured !== false && 'overseerr',
        this._bazarrConfigured    !== false && 'bazarr',
        this._plexConfigured      !== false && 'plex',
        this._tautulliConfigured  !== false && 'tautulli',
        this._jellystatConfigured !== false && 'jellystat',
        this._qbitConfigured      !== false && 'qbit',
        this._sabConfigured       !== false && 'sabnzbd',
        // Second instances: false until the capabilities say they are set up
        this._qbit2Configured     === true  && 'qbit2',
        this._sab2Configured      === true  && 'sabnzbd2',
        this._nzbgetConfigured    !== false && 'nzbget',
        this._delugeConfigured    !== false && 'deluge',
        this._traktConfigured     !== false && 'trakt',
        this._suggestarrConfigured !== false && 'suggestarr',
        this._lidarrConfigured    !== false && 'lidarr',
        // Last.fm only counts as set up when it can actually suggest, which
        // takes a key and a library to compare against.
        (this._lastfmConfigured && this._lidarrConfigured !== false) && 'lastfm',
        this._gluetunConfigured   !== false && 'gluetun',
        this._prowlarrConfigured  !== false && 'prowlarr',
        this._rtorrentConfigured  !== false && 'rtorrent',
        this._transmissionConfigured !== false && 'transmission',
        this._tracearrConfigured  !== false && 'tracearr',
        this._maintainerrConfigured !== false && 'maintainerr',
        // Whether this install already has its own TMDB key. With the shared key
        // going away on 2026-09-01, this is what says how many installs without
        // Seerr still have to act.
        this._tmdbOwnKey === true && 'tmdb_key',
        this._jellyfinConfigured  === true  && 'jellyfin',
        (this._config.seerr_user_map?.length > 0) && 'seerr_users',
      ].filter(Boolean);
      // Until the integration has said what is set up, the flags are only
      // defaults — qBittorrent and Bazarr start as true, Seerr, Plex and
      // Prowlarr as unknown — and every one of them would be reported as
      // installed. Without the list the worker keeps this install's last known
      // one (it stores null and counts only pings that carry services).
      fetch('https://arr-ping.martinargalas.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          v: __CARD_VERSION__, sid, mob: this._isMob ? 1 : 0, act,
          ...(lsid ? { lsid } : {}),
          ...(this._capsLoaded ? { svcs } : {}),
          ...(extra || {}),
        }),
      }).catch(() => {});
    } catch (_) {}
  }
}

export const pingMixin = _PingMethods.prototype;
