// The apps' icons and brand colours. Split out of card.js.

class _BrandMethods {

  // App SVG icons (white, 22×22)
  // ─────────────────────────────────────────────

  _appIconRow(apps, size = 24) {
    const list = apps.filter(a => a !== 'lidarr' || this._lidarrConfigured !== false);
    return `<div class="app-icon-row" style="display:inline-flex;gap:4px;flex-shrink:0;align-items:center">${
      list.map(a => this._appIcon(a, size)).join('')
    }</div>`;
  }

  _appIcon(app, size = 26) {
    const useReal = this._cfgGet('styles', 'applicationIcons', 'real') !== 'mdi';
    const sz = `width="${size}" height="${size}"`;
    const CDN = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg';
    const cdnSlugs = {
      qbit:       'qbittorrent',
      sab:        'sabnzbd',
      nzbget:     'nzbget',
      deluge:     'deluge',
      rtorrent:   'rutorrent',
      transmission: 'transmission',
      radarr:     'radarr',
      sonarr:     'sonarr',
      overseerr:  'overseerr',
      jellyseerr: 'jellyseerr',
      tmdb:       'tmdb',
      trakt:      'trakt',
      plex:       'plex',
      tautulli:   'tautulli',
      prowlarr:   'prowlarr',
      jellystat:  'jellystat',
      tracearr:   'tracearr',
      maintainerr:'maintainerr',
      lidarr:     'lidarr',
      bazarr:     'bazarr',
      suggestarr: 'suggest-arr',
      jellyfin:   'jellyfin',
      emby:       'emby',
      kodi:       'kodi',
    };
    const mdiIcons = {
      radarr:     'mdi:filmstrip',
      sonarr:     'mdi:television-play',
      overseerr:  'mdi:movie-open-check-outline',
      jellyseerr: 'mdi:movie-open-check-outline',
      tmdb:       'mdi:movie-open',
      trakt:      'mdi:movie-star-outline',
      suggestarr: 'mdi:lightbulb-on-outline',
      plex:       'mdi:plex',
      tautulli:   'mdi:chart-bar',
      prowlarr:   'mdi:magnify-scan',
      jellystat:  'mdi:chart-line',
      tracearr:   'mdi:shield-account-outline',
      maintainerr:'mdi:broom',
      lidarr:     'mdi:music-box-multiple-outline',
      lastfm:     'mdi:radio-tower',
      deezer:     'mdi:equalizer',
      bazarr:     'mdi:subtitles-outline',
      jellyfin:   'mdi:jellyfish-outline',
      emby:       'mdi:emby',
      kodi:       'mdi:kodi',
    };
    // Custom SVGs — monochrome silhouettes matching real app logos
    const customSvgs = {
      qbit:   `<svg ${sz} viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16.5" text-anchor="middle" font-size="9.5" font-weight="700" font-family="sans-serif">qb</text></svg>`,
      sab:    `<svg ${sz} viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M5 2h14v10h3L12 22 2 12h3V2z"/></svg>`,
      deluge:   `<svg ${sz} viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l6 5h-4v5H10v-5H6l6-5z"/></svg>`,
      rtorrent: `<svg ${sz} viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm-1 3v5.27l-3.5 2.02.99 1.71L12 14.15l3.51 2.02.99-1.71L13 12.27V7h-2z"/></svg>`,
      lastfm: `<svg ${sz} viewBox="0 0 24 24" style="flex-shrink:0"><rect width="24" height="24" rx="5" fill="#D51007"/><g transform="translate(2.4 2.4) scale(0.8)"><path fill="#fff" d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/></g></svg>`,
      deezer: `<svg ${sz} viewBox="0 0 24 24" style="flex-shrink:0"><rect width="24" height="24" rx="5" fill="#A238FF"/><g fill="#fff"><rect x="4" y="15" width="3" height="4" rx="0.8"/><rect x="8.2" y="11.5" width="3" height="7.5" rx="0.8"/><rect x="12.4" y="8" width="3" height="11" rx="0.8"/><rect x="16.6" y="5" width="3" height="14" rx="0.8"/></g></svg>`,
      nzbget: `<svg ${sz} viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><rect x="5" y="2" width="14" height="2" rx="0.5"/><rect x="5" y="5.5" width="14" height="2" rx="0.5"/><rect x="5" y="9" width="14" height="2" rx="0.5"/><path d="M5 12h14v4h3L12 22 2 16h3v-4z"/></svg>`,
    };
    // A few icons exist only as raster in dashboard-icons
    const pngOnly = new Set(['suggest-arr']);
    if (useReal && cdnSlugs[app]) {
      const slug = cdnSlugs[app];
      const url  = pngOnly.has(slug)
        ? `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${slug}.png`
        : `${CDN}/${slug}.svg`;
      return `<img src="${url}" ${sz} style="flex-shrink:0;display:block;object-fit:contain" onerror="this.style.display='none'">`;
    }
    if (customSvgs[app]) {
      return customSvgs[app];
    }
    if (mdiIcons[app]) {
      return `<ha-icon icon="${mdiIcons[app]}" style="--mdc-icon-size:${size}px;flex-shrink:0"></ha-icon>`;
    }
    return '';
  }

  _discoverIconKey() {
    if (this._overseerrConfigured === false) return 'tmdb';
    return this._seerrType || 'overseerr';
  }

  _brandColor(app, o = 0.35) {
    const map = {
      trakt:       `rgba(230,87,99,${o})`,
      suggestarr:  `rgba(250,180,50,${o})`,
      overseerr:   `rgba(99,102,241,${o})`,
      jellyseerr:  `rgba(0,164,220,${o})`,
      tmdb:        `rgba(1,180,228,${o})`,
      radarr:      `rgba(255,197,0,${o})`,
      sonarr:      `rgba(53,202,255,${o})`,
      plex:        `rgba(229,160,13,${o})`,
      tautulli:    `rgba(255,111,0,${o})`,
      jellystat:   `rgba(0,164,220,${o})`,
      jellyfin:    `rgba(0,164,220,${o})`,
      emby:        `rgba(82,182,92,${o})`,
      kodi:        `rgba(23,154,215,${o})`,
      prowlarr:    `rgba(255,80,0,${o})`,
      tracearr:    `rgba(99,200,150,${o})`,
      qbit:        `rgba(30,140,255,${o})`,
      deluge:      `rgba(10,80,220,${o})`,
      rtorrent:    `rgba(60,120,255,${o})`,
      transmission: `rgba(210,40,40,${o})`,
      sab:         `rgba(200,150,0,${o})`,
      nzbget:      `rgba(40,140,60,${o})`,
      maintainerr: `rgba(245,158,11,${o})`,
      lidarr:      `rgba(21,158,90,${o})`,
    };
    return map[app] || `rgba(255,255,255,${o})`;
  }

  _brandColorSecondary(app, o = 0.35) {
    const map = {
      trakt:       `rgba(236,72,153,${o})`,
      suggestarr:  `rgba(255,120,80,${o})`,
      overseerr:   `rgba(124,58,237,${o})`,
      jellyseerr:  `rgba(139,92,246,${o})`,
      tmdb:        `rgba(144,206,161,${o})`,
      radarr:      `rgba(100,200,255,${o})`,
      sonarr:      `rgba(255,255,255,${o})`,
      plex:        `rgba(200,100,0,${o})`,
      tautulli:    `rgba(255,255,255,${o})`,
      jellystat:   `rgba(139,92,246,${o})`,
      jellyfin:    `rgba(139,92,246,${o})`,
      prowlarr:    `rgba(255,160,50,${o})`,
      tracearr:    `rgba(50,180,120,${o})`,
      qbit:        `rgba(10,80,220,${o})`,
      deluge:      `rgba(5,45,160,${o})`,
      rtorrent:    `rgba(140,60,240,${o})`,
      transmission: `rgba(170,25,25,${o})`,
      sab:         `rgba(170,125,0,${o})`,
      nzbget:      `rgba(30,120,50,${o})`,
      maintainerr: `rgba(200,120,0,${o})`,
    };
    return map[app] || `rgba(255,255,255,${o})`;
  }
}

export const brandMixin = _BrandMethods.prototype;
