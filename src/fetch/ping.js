// The anonymous usage ping and the one-time activation. Split out of card.js.

class _PingMethods {

  _markActivated() {
    if (!this._actPingSent && !this._metricsOptOut) {
      this._actPingSent = true;
      this._sendPing();
    }
  }

  _sendPing() {
    // Belt and braces: whoever calls this, an opted-out install sends nothing
    if (this._metricsOptOut) return;
    try {
      const act  = this._actPingSent ? 1 : 0;
      const sid  = btoa(location.hostname).replace(/=/g, '').slice(0, 16);
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
          ...(this._capsLoaded ? { svcs } : {}),
        }),
      }).catch(() => {});
    } catch (_) {}
  }
}

export const pingMixin = _PingMethods.prototype;
