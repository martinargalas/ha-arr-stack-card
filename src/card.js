/**
 * arr-stack-card.js  v119
 * Home Assistant Lovelace custom card — Media server dashboard
 * Displays qBittorrent, SABnzbd, Radarr, Sonarr, Overseerr data
 */

import './editor.js';
import { ARR_I18N } from './i18n.js';
import { STYLES } from './styles/index.js';
import { interactiveSearchMixin } from './render/interactive-search.js';
import { sonarrIsMixin } from './render/interactive-search-sonarr.js';
import { fetchMixin } from './fetch/index.js';
import { renderLeftMixin } from './render/left.js';
import { renderRightMixin } from './render/right.js';
import { wireMixin } from './wire/index.js';
import { popupMixin } from './popup/index.js';

class ArrStackCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._interval = null;
    this._fastInterval = null;
    this._initialized = false;
    this._pageBtnAbort = null; // AbortController pro page-button listenery
    this._sort = 'progress_desc'; // 'progress_desc'|'progress_asc'|'speed_desc'|'speed_asc'

    // Data stores
    this._radarr = [];
    this._radarrTotal = 0;
    this._sonarr = [];
    this._sonarrTotal = 0;
    this._calendar = [];
    this._upcoming = [];
    this._tvUpcoming = [];
    this._trending = [];
    this._popular  = [];
    this._qbit = [];
    this._qbitTransfer = {};
    this._sab = {};
    this._sabFailed = [];            // failed položky z SABnzbd history
    this._sabRetryBusy = null;       // nzo_id položky, jejíž retry právě probíhá
    this._sabDeleteBusy = null;      // nzo_id položky, jejíž smazání z history probíhá
    this._qbCookies = null;
    this._qbitConfigured   = true; // false pokud proxy vrátí 503 (není nakonfigurován)
    this._sabConfigured    = true; // false pokud proxy vrátí 503 (není nakonfigurován)
    this._bazarrConfigured = true; // false pokud proxy vrátí 503 (není nakonfigurován)
    this._bazarr = {}; // map: radarrId → { subtitles, missing_subtitles }
    this._radarrQueueFailed = new Set(); // radarr movieId s chybou stahování
    this._radarrQueueActive = new Set(); // radarr movieId s aktivním stahováním
    this._seerrRadarr = null;           // { serverId, profileId, rootFolder } z Overseerr settings
    this._confirmRemove = null;         // hash torrentu čekajícího na potvrzení smazání
    this._requestPending = null;        // { movieId, tmdbId } — overlay výběru profilu
    this._pendingRequests = [];         // čekající žádosti z Overseerr (vidí jen admin)
    this._optimisticRequested = new Set(); // mediaId odeslaných žádostí (okamžitá odezva)
    this._withdrawnIds = new Set();        // mediaId stažených žádostí (okamžitá odezva)
    this._myRequestIds = new Map();        // mediaId → requestId (zachyceno z POST odpovědi)
    this._familyPendingIds = new Map();    // tmdbId → requestId (načteno z my_pending, pro non-admin)
    this._radarrProfiles = [];          // cache quality profilů z Radarr
    this._tvRequestPending = null;      // { show, seasons, selected, profileId, mediaId, loading }
    this._overlay = { section: null, page: 0, tvPending: null }; // section=null → closed
    this._overlayApiPage = {};           // section → last fetched API page number
    this._overlayApiTotalPages = {};     // section → total pages in API
    this._seerrSonarr = null;           // { serverId, profileId, rootFolder } z Overseerr Sonarr settings
    this._sonarrProfiles = [];          // cache quality profilů ze Sonarr
    this._qbitBusy = false;            // globální akce qBit právě probíhá
    this._sabBusy  = false;            // globální akce SAB právě probíhá
    this._qbitItemBusy = null;         // hash torrentu, jehož akce právě probíhá

    // Popup state
    this._popup = null; // stores fetched detail data for modal

    // Interactive Search state (Radarr)
    this._isState    = null;    // null | 'loading' | 'results' | 'error'
    this._isResults  = [];      // pole releasů z Radarr /api/v3/release
    this._isFilter   = 'all';   // 'all' | 'torrent' | 'usenet'
    this._isGrabbing = null;    // guid právě stahovaného releasu
    this._isGrabbed  = new Set(); // guidy úspěšně grabnutých releasů
    this._isConfirm  = null;    // guid čekající na potvrzení
    this._isError    = null;    // chybová zpráva

    // Interactive Search state (Sonarr)
    this._snIsOpen         = false;      // seasons panel visible
    this._snExpandedSeasons = new Set(); // čísla sezón s rozbalením epizod
    this._snEpisodes       = new Map();  // seasonNumber → episodes[]
    this._snActiveIs       = null;       // { type:'season'|'episode', key } - otevřený IS panel
    this._snIsState        = null;       // loading | results | error
    this._snIsResults      = [];
    this._snIsError        = null;
    this._snIsFilter       = 'all';
    this._snIsGrabbing     = null;
    this._snIsGrabbed      = new Set();
    this._snIsHistory      = {};

    // Pagination state
    this._pages   = { radarr: 0, sonarr: 0, upcoming: 0, tvUpcoming: 0, calendar: 0, trending: 0, popular: 0, qbit: 0, sab: 0, pending: 0 };
    this._pageDir = { radarr: '', sonarr: '', upcoming: '', tvUpcoming: '', calendar: '', trending: '', popular: '', qbit: '', sab: '', pending: '' };
    this._rightPage = 0;
    this._rightMaxH = 0;    // cached max height across all outer pages (used to pre-lock before innerHTML swap)

    // Cover gradient classes pool
    this._gradients = ['ca','cb','cc','cd','ce','cf','cg','ch','ci','cj','ck','cl','cm','cn','co','cp','cq','cr'];
    this._gradientMap = {};
    this._gradientIdx = 0;
  }

  // ─────────────────────────────────────────────
  // HA lifecycle
  // ─────────────────────────────────────────────

  setConfig(config) {
    this._config = config;
    // Pokud je karta už inicializována, obnov sticky nav observer s novým offsetem
    if (this._initialized) {
      this._wireStickyNav();
      this._applyTheme();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._buildShell();
      this._loadPendingFromStorage(); // obnovit pending stav z localStorage před prvním fetchem
      this._fetchOverseerrRadarrSettings(); // jednou při startu, výsledek se cachuje v this._seerrRadarr
      this._fetchAll();
      this._interval = setInterval(() => this._fetchAll(), 30000);
      this._fastInterval = setInterval(() => this._fetchDownloadsAndRender(), 5000);

      // ResizeObserver — badge compact při změně velikosti karty
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this._checkBadgeOverflow());
      });
      this._resizeObserver.observe(this);
    }
  }

  disconnectedCallback() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this._fastInterval) {
      clearInterval(this._fastInterval);
      this._fastInterval = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._clearNavWatcher();
    if (this._pageBtnAbort) { this._pageBtnAbort.abort(); this._pageBtnAbort = null; }
  }

  connectedCallback() {
    // Karta byla odpojena a znovu zapojena (např. Bubble Card přepnutí/schování).
    // _initialized zůstane true — HA set hass() přeskočí re-init, takže intervaly
    // a nav watcher musíme obnovit sami.
    if (!this._initialized) return; // ještě nebyla inicializována, set hass() to vyřeší

    if (!this._interval) {
      this._interval = setInterval(() => this._fetchAll(), 30000);
    }
    if (!this._fastInterval) {
      this._fastInterval = setInterval(() => this._fetchDownloadsAndRender(), 5000);
    }
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this._checkBadgeOverflow());
      });
      this._resizeObserver.observe(this);
    }
    // Nav watcher (setInterval) musí být obnoven — col-left/col-right jsou stále v DOM
    requestAnimationFrame(() => this._wireStickyNav());
  }

  // ─────────────────────────────────────────────
  // Config helpers
  // ─────────────────────────────────────────────

  get _cfg() { return this._config; }

  // Nested config read with flat fallback for backward compat
  // e.g. _cfgGet('downloads', 'torrentItems') reads config.downloads.torrentItems ?? config.torrentItems
  _cfgGet(group, key, fallback) {
    const grouped = this._config?.[group]?.[key];
    if (grouped !== undefined) return grouped;
    const flat = this._config?.[key];
    if (flat !== undefined) return flat;
    return fallback;
  }

  // Returns config object for a section overlay (icon, data key, render fn, etc.)
  _getSectionOverlayConfig(section) {
    const tmdbUrl = path => path ? `https://image.tmdb.org/t/p/w92${path}` : null;
    const cfgs = {
      trending:   {
        dataKey: '_trending',   icon: 'mdi:trending-up',     titleKey: 'trendingMovies',
        apiEndpoint: 'overseerr/trending',    hasTvPending: true,
        renderCard:  (m, i) => this._renderTrendingCard(m, i),
        getPosterUrl: m => tmdbUrl(m.posterPath || m.poster_path),
        emoji: m => m.mediaType === 'tv' ? '📺' : '🎬',
      },
      popular:    {
        dataKey: '_popular',    icon: 'mdi:fire',            titleKey: 'popularMovies',
        apiEndpoint: 'overseerr/popular',     hasTvPending: false,
        renderCard:  (m, i) => this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), overlayIndex: i }),
        getPosterUrl: m => tmdbUrl(m.posterPath),
        emoji: () => '🎬',
      },
      upcoming:   {
        dataKey: '_upcoming',   icon: 'mdi:ticket-outline',  titleKey: 'upcomingMovies',
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m, i) => this._renderUpcomingCard(m, { overlayIndex: i }),
        getPosterUrl: m => tmdbUrl(m.posterPath || m.poster_path),
        emoji: () => '🎬',
      },
      tvUpcoming: {
        dataKey: '_tvUpcoming', icon: 'mdi:television-play', titleKey: 'newShows',
        apiEndpoint: 'overseerr/tv_upcoming', hasTvPending: true,
        renderCard:  (m, i) => this._renderTvUpcomingCard(m, { showRating: true, overlayIndex: i }),
        getPosterUrl: m => tmdbUrl(m.posterPath),
        emoji: () => '📺',
      },
      radarr:     {
        dataKey: '_radarr',     icon: 'mdi:filmstrip',       titleKey: 'recentMovies',
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m) => this._renderRadarrCard(m),
        getPosterUrl: m => this._getRadarrPoster(m),
        emoji: () => '🎬',
      },
      sonarr:     {
        dataKey: '_sonarr',     icon: 'mdi:television-play', titleKey: 'recentShows',
        apiEndpoint: null,                    hasTvPending: false,
        renderCard:  (m) => this._renderSonarrCard(m),
        getPosterUrl: m => this._getSonarrPoster(m),
        emoji: () => '📺',
      },
    };
    return cfgs[section] || null;
  }

  // Paged grid with automatic See-More card insertion (if items exceed showMoreOnPage threshold)
  _pagedGridWithSmp(items, section, renderFn) {
    if (!items || items.length === 0) return '';
    const showMorePage = Math.max(1, parseInt(this._cfgGet('discover', 'showMoreOnPage', 3)) || 3);
    const itemsBefore  = showMorePage * 4 - 1;
    if (items.length > itemsBefore) {
      const withSmp = [...items.slice(0, itemsBefore), { _isSeeMore: true }];
      return this._pagedGrid(withSmp, section, m => m._isSeeMore ? this._renderSeeMoreCardFor(section) : renderFn(m));
    }
    return this._pagedGrid(items, section, renderFn);
  }

  // Lokalizační helper — vrátí přeložený řetězec dle nastavení localisation: cs|en
  _t(key) {
    const lang = this._cfg?.localisation === 'en' ? 'en' : 'cs';
    return (ARR_I18N[lang] || ARR_I18N.cs)[key] || key;
  }

  // Returns items per page for a given section (respects YAML config)
  _perPage(section) {
    if (section === 'qbit') return parseInt(this._cfgGet('downloads', 'torrentItems', 3)) || 3;
    if (section === 'sab')  return parseInt(this._cfgGet('downloads', 'usenetItems',  3)) || 3;
    return 4;
  }

  // Converts "#rrggbb" or "#rgb" to "r,g,b" string for use in rgba()
  _hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  // Parse hex or rgb/rgba string → "R, G, B" (strips alpha)
  _parseColorRgb(str) {
    if (!str) return null;
    const s = str.trim();
    if (s.startsWith('#')) {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      hex = hex.slice(0, 6);
      if (hex.length !== 6) return null;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return `${r}, ${g}, ${b}`;
    }
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return `${m[1]}, ${m[2]}, ${m[3]}`;
    return null;
  }

  // Inject theme CSS custom properties derived from config into shadow DOM
  _applyTheme() {
    if (!this.shadowRoot) return;
    const cfg = (this._config || {}).styles || {};
    const c = k => this._parseColorRgb(cfg[k]);
    const rules = [];

    // Custom properties (used by rgba(var(--xxx), alpha) in base CSS)
    const props = [];
    const propMap = [
      ['headingTextColor',          '--arr-ht-rgb'],
      ['headingColor',              '--arr-hd-rgb'],
      ['primaryTextColor',          '--arr-pt-rgb'],
      ['secondaryTextColor',        '--arr-st-rgb'],
      ['pagingButtonTextColor',     '--arr-pbt-rgb'],
      ['downloadButtonTextColor',   '--arr-dbt-rgb'],
      ['tagPillTextColor',          '--arr-tp-rgb'],
      ['pagingButtonBackgroundColor','--arr-pbb-rgb'],
      ['pagingDotColor',            '--arr-pd-rgb'],
      ['pagingDotActiveColor',      '--arr-pda-rgb'],
    ];
    for (const [key, prop] of propMap) {
      const rgb = c(key);
      if (rgb) props.push(`${prop}: ${rgb};`);
    }
    if (props.length) rules.push(`:host { ${props.join(' ')} }`);

    // Modal overrides — high specificity, override day/night
    const mo = c('modalHeadingTextColor');
    if (mo) rules.push(`.popup-overlay .popup-title { color: rgba(${mo}, 1) !important; }`);

    const mp = c('modalPrimaryTextColor');
    if (mp) {
      rules.push(`.popup-overlay .popup-sub { color: rgba(${mp}, 0.55) !important; }`);
      rules.push(`.popup-overlay .popup-overview { color: rgba(${mp}, 0.75) !important; }`);
    }

    const mci = c('modalCloseButtonIconColor');
    if (mci) rules.push(`.popup-close { color: rgba(${mci}, 1) !important; }`);

    const mcb = c('modalCloseButtonBackgroundColor');
    if (mcb) rules.push(`.popup-close { background: rgba(${mcb}, 1) !important; box-shadow: none !important; }`);

    const mb = c('modalBackgroundColor');
    if (mb) rules.push(`.popup-overlay .popup-glass { background: rgba(${mb}, 0.05) !important; }`);

    const mbt = c('modalButtonTextColor');
    if (mbt) rules.push(`.popup-overlay .is-open-btn { color: rgba(${mbt}, 0.70) !important; }`);

    const mbb = c('modalButtonBackgroundColor');
    if (mbb) rules.push(`.popup-overlay .is-open-btn { background: rgba(${mbb}, 0.08) !important; }`);

    let el = this.shadowRoot.getElementById('arr-theme');
    if (!el) {
      el = document.createElement('style');
      el.id = 'arr-theme';
      this.shadowRoot.appendChild(el);
    }
    el.textContent = rules.join('\n');
  }

  // ─────────────────────────────────────────────
  // Formatters
  // ─────────────────────────────────────────────

  fmtSpeed(bytesPerSec) {
    if (bytesPerSec === undefined || bytesPerSec === null || isNaN(bytesPerSec)) return '0 KB/s';
    if (bytesPerSec >= 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    }
    return Math.round(bytesPerSec / 1024) + ' KB/s';
  }

  fmtSize(bytes) {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 MB';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }

  fmtEta(seconds) {
    if (!seconds || seconds <= 0 || seconds >= 8640000) return '∞';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  }

  fmtDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return `${d.getDate()}. ${d.getMonth() + 1}.`;
    } catch {
      return '';
    }
  }

  fmtPct(ratio) {
    if (ratio === undefined || ratio === null || isNaN(ratio)) return '0%';
    return Math.round(ratio * 100) + '%';
  }

  // Assign a stable gradient class to each media item ID
  _grad(id) {
    const key = String(id);
    if (!this._gradientMap[key]) {
      this._gradientMap[key] = this._gradients[this._gradientIdx % this._gradients.length];
      this._gradientIdx++;
    }
    return this._gradientMap[key];
  }

  // ─────────────────────────────────────────────
  // App SVG icons (white, 22×22)
  // ─────────────────────────────────────────────

  _appIcon(app) {
    const s = 'width="26" height="26" viewBox="0 0 24 24" style="flex-shrink:0;display:block"';
    if (app === 'qbit') {
      // qBittorrent — lightning bolt inside circle (inspired by the official logo)
      return `<svg ${s} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9.25" stroke="white" stroke-width="1.7"/>
        <path d="M13.8 6.5 9.2 12.1h3.3L10 17.5l5.8-7h-3.4z" fill="white"/>
      </svg>`;
    }
    if (app === 'sab') {
      // SABnzbd — stylised 'S' with downward arrow (usenet / newsgroup feel)
      return `<svg ${s} fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.5 4H9a3 3 0 0 0-1.5 5.6A3 3 0 0 0 9 15h1v2.6l-1.3-1.3-1.4 1.4L12 22l4.7-4.3-1.4-1.4-1.3 1.3V15h1a3 3 0 0 0 1.5-5.6A3 3 0 0 0 15.5 4zM9 7h6.5a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2zm6.5 6H9a1 1 0 0 1 0-2h6.5a1 1 0 0 1 0 2z"/>
      </svg>`;
    }
    return '';
  }

  // ─────────────────────────────────────────────
  // Paginated grid helper
  // ─────────────────────────────────────────────

  _pagedGrid(items, section, renderFn, perPage = 4) {
    if (!items || items.length === 0) return '';
    const page       = this._pages[section] || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const pageItems  = items.slice(page * perPage, page * perPage + perPage);
    const dir        = this._pageDir[section] || '';
    const animClass  = dir === 'next' ? 'anim-next' : dir === 'prev' ? 'anim-prev' : '';
    const grid       = `<div class="mgrid ${animClass}">${pageItems.map(it => renderFn(it)).join('')}</div>`;

    if (totalPages <= 1) {
      // Placeholder tlačítka zachovají stejné odsazení jako multi-page sekce
      return `
        <div class="pg-wrap">
          <button class="pg-btn pg-btn-ph" disabled>‹</button>
          ${grid}
          <button class="pg-btn pg-btn-ph" disabled>›</button>
        </div>`;
    }

    const prevDis = page === 0              ? 'disabled' : '';
    const nextDis = page >= totalPages - 1  ? 'disabled' : '';
    return `
      <div class="pg-wrap">
        <button class="pg-btn" data-section="${section}" data-dir="prev" ${prevDis}>‹</button>
        ${grid}
        <button class="pg-btn" data-section="${section}" data-dir="next" ${nextDis}>›</button>
      </div>`;
  }

  // Returns the correct data array for a given section key
  _getPageData(section) {
    if (section === 'qbit')    return Array.isArray(this._qbit) ? this._qbit : [];
    if (section === 'sab')     return Array.isArray(this._sab.slots) ? this._sab.slots : [];
    if (section === 'pending') return this._pendingRequests || [];
    return this['_' + section] || [];
  }

  // Paginated vertical list (for download items)
  _pagedList(items, section, renderFn, perPage = 4) {
    if (!items || items.length === 0)
      return `<div class="placeholder">${this._t('noDownloads')}</div>`;
    const page       = this._pages[section] || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const pageItems  = items.slice(page * perPage, page * perPage + perPage);
    const dir        = this._pageDir[section] || '';
    const animClass  = dir === 'next' ? 'anim-next' : dir === 'prev' ? 'anim-prev' : '';
    const list       = `<div class="dl-list ${animClass}">${pageItems.map(it => renderFn(it)).join('')}</div>`;

    if (totalPages <= 1) return list;

    const prevDis = page === 0             ? 'disabled' : '';
    const nextDis = page >= totalPages - 1 ? 'disabled' : '';
    return `
      <div class="pg-wrap">
        <button class="pg-btn" data-section="${section}" data-dir="prev" ${prevDis}>‹</button>
        ${list}
        <button class="pg-btn" data-section="${section}" data-dir="next" ${nextDis}>›</button>
      </div>`;
  }

  // ─────────────────────────────────────────────
  // Fetch helpers
  // ─────────────────────────────────────────────

  // Odstraní focus před innerHTML zápisem — zabrání neočekávanému chování prohlížeče.
  _blurActive() {
    const el = this.shadowRoot.activeElement || document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  }

  // Floating nav — IntersectionObserver na sentinel.
  // Nav se zobrazí (fade-in) když uživatel scrolluje k pravé sekci.
  // Observer 1 (col-left): zobraz nav když col-left vyjede z viewportu — pro standardní stránky.
  // Observer 2 (col-right): záloha pro krátké stránky kde scroll nestačí ke spuštění obs. 1.
  _wireStickyNav() {
    // Pouze na stackovaném layoutu (mobil/tablet ≤ 900px)
    if (window.matchMedia('(min-width: 901px)').matches) return;

    const left  = this.shadowRoot.getElementById('col-left');
    const right = this.shadowRoot.getElementById('col-right');
    if (!left) return;

    this._clearNavWatcher();

    // sticky_nav_offset: jak brzo před opuštěním col-left se nav zobrazí (výchozí 100 px)
    const raw    = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
    const offset = raw != null ? Math.max(0, parseInt(raw)) : 100;

    // Každých 150 ms přečteme aktuální BCR — bez závislosti na scroll-událostech
    // (HA scrolluje uvnitř shadow DOM, IntersectionObserver/scroll eventy tam nejsou spolehlivé).
    const syncNav = () => {
      const nav = this.shadowRoot.querySelector('.rp-nav');
      if (!nav) return;
      const lRect = left.getBoundingClientRect();

      // Podmínka 1: col-left vyjel nad viewport o alespoň `offset` px
      const leftIsGone = lRect.bottom < offset;

      // Podmínka 2 (záloha pro krátké stránky): col-right je z ≥ 90 % viditelný
      // a col-left se aspoň trochu schoval nad viewport
      let rightEnough = false;
      if (right && lRect.top < 0) {
        const rRect   = right.getBoundingClientRect();
        const vh      = window.innerHeight;
        const visible = Math.min(rRect.bottom, vh) - Math.max(rRect.top, 0);
        rightEnough   = rRect.height > 0 && visible / rRect.height >= 0.9;
      }

      nav.classList.toggle('rp-nav-visible', leftIsGone || rightEnough);
    };

    syncNav();                                        // okamžitý stav
    this._navInterval = setInterval(syncNav, 150);   // spolehlivý polling
  }

  _clearNavWatcher() {
    if (this._navObserver)  { this._navObserver.disconnect();  this._navObserver  = null; }
    if (this._navObserver2) { this._navObserver2.disconnect(); this._navObserver2 = null; }
    if (this._navInterval)  { clearInterval(this._navInterval); this._navInterval = null; }
    if (this._navScrollHandler) {
      document.removeEventListener('scroll', this._navScrollHandler, true);
      this._navScrollHandler = null;
    }
  }

  // Po přepnutí stránky pravého sloupce (rp-btn / rp-dot):
  // Zachytí scroll stav těsně před re-renderem pravého sloupce.
  // Musí být voláno PŘED right.innerHTML = ..., proto jako samostatná metoda.
  _captureScrollState() {
    if (!window.matchMedia('(max-width: 900px)').matches) return null;
    const sc    = this._findScrollContainer();
    const right = this.shadowRoot.getElementById('col-right');
    const left  = this.shadowRoot.getElementById('col-left');
    if (!sc) return null;

    const prevScrollTop = sc.scrollTop;
    const atBottom      = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 60;

    // "Krátká stránka" = jsme na konci, ale col-right se celý vešel do viewportu
    // (rRect.top ≥ 0) a col-left aspoň trochu vyjel (navbar byl viditelný).
    let shortPage = false;
    if (atBottom && right && left) {
      const rRect = right.getBoundingClientRect();
      const lRect = left.getBoundingClientRect();
      shortPage = rRect.top >= 0 && lRect.top < 0;
    }

    return { sc, prevScrollTop, atBottom, shortPage };
  }

  // Po přepnutí stránky pravého sloupce (rp-btn / rp-dot):
  // Na mobilu přeskočíme _measureAndLockHeight() — zabrání scroll-to-top (stejný princip jako u pg-btn).
  // Na desktopu měříme výšky normálně.
  // scrollState musí být zachycen PŘED renderem (viz _captureScrollState).
  _afterRightPageSwitch(scrollState = null) {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;

    requestAnimationFrame(() => {
      // _measureAndLockHeight() zde záměrně nevoláme — _rightMaxH je cachován z posledního
      // _render() a byl aplikován synchronně před innerHTML swapem v click handleru.
      // Volání _measureAndLockHeight() by způsobilo minHeight collapse (layout reflow).
      requestAnimationFrame(() => {
        this._checkBadgeOverflow();

        if (!isMobile || !scrollState) return;
        const { sc, prevScrollTop, atBottom, shortPage } = scrollState;

        if (shortPage) {
          // Krátká stránka: scrollni přesně na pozici, kde se navbar zobrazí.
          // Navbar se zobrazí, když col-left.bottom < offset (sticky_nav_offset).
          // → chceme col-left.bottom = offset → sc.scrollTop += lRect.bottom - offset.
          const left = this.shadowRoot.getElementById('col-left');
          if (left) {
            const raw    = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
            const offset = raw != null ? Math.max(0, parseInt(raw)) : 100;
            const lRect  = left.getBoundingClientRect();
            sc.scrollTop += lRect.bottom - offset + 1; // +1 px: syncNav používá < (striktně)
          }
        } else if (atBottom) {
          // Dlouhá stránka, byl na konci → zůstaň na konci nové stránky.
          sc.scrollTop = sc.scrollHeight;
        } else {
          // Byl uprostřed → obnov přesnou pozici.
          sc.scrollTop = prevScrollTop;
        }
      });
    });
  }

  // Projde DOM stromem nahoru přes shadow DOM hranice a vrátí první scroll container.
  // scrollIntoView() / window.scroll nejsou spolehlivé v HA shadow DOM na Android Chrome.
  _findScrollContainer() {
    let node = this;
    for (let i = 0; i < 20; i++) {
      const next = node.parentNode
        ?? (node.getRootNode?.() !== document ? node.getRootNode?.()?.host : null);
      if (!next || next === document || next === window) break;
      node = next;
      if (node.nodeType !== 1) continue;
      try {
        const oy = window.getComputedStyle(node).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
          return node;
        }
      } catch (_) { /* cross-origin guard */ }
    }
    return document.documentElement;
  }

  _reRenderRight() {
    const right = this.shadowRoot.getElementById('col-right');
    if (!right) return;
    this._blurActive();
    right.innerHTML = this._renderRight();
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
    // Na mobilu přeskočíme _measureAndLockHeight() — minHeight collaps způsobuje scroll-to-top.
    // Na desktopu měříme výšky normálně (zabrání výškovým skokům při přepínání stránek).
    requestAnimationFrame(() => {
      if (!window.matchMedia('(max-width: 900px)').matches) this._measureAndLockHeight();
      requestAnimationFrame(() => this._checkBadgeOverflow());
    });
  }

  // Přeměří všechny stránky pravého sloupce a nastaví min-height na nejvyšší.
  // Každá outer stránka se měří se všemi _pages sekcí = 0 (nejvyšší možná varianta).
  // Vše proběhne synchronně v jednom JS tiku — browser nestihne malovat.
  _measureAndLockHeight() {
    const right = this.shadowRoot.getElementById('col-right');
    if (!right) return;

    const savedPage  = this._rightPage;
    const savedPages = { ...this._pages };  // uložit stav section pagination
    const perPage    = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
    const hasCal     = this._calendar && this._calendar.length > 0;
    const hasPend    = this._hass.user.is_admin && this._pendingRequests.length > 0;
    const totalCats  = 6 + (hasPend ? 1 : 0) + (hasCal ? 1 : 0);
    const totalPages = Math.ceil(totalCats / perPage);

    let maxH = 0;
    right.style.visibility = 'hidden';
    right.style.minHeight  = '';

    for (let p = 0; p < totalPages; p++) {
      this._rightPage = p;
      // Měříme s _pages = 0 pro každou sekci — strana 0 = nejvíce položek = nejvyšší grid
      Object.keys(this._pages).forEach(k => { this._pages[k] = 0; });
      right.innerHTML = this._renderRight();
      maxH = Math.max(maxH, right.scrollHeight);
    }

    this._rightPage = savedPage;
    Object.assign(this._pages, savedPages);  // obnovit section pagination
    right.innerHTML       = this._renderRight();
    right.style.visibility = '';
    this._rightMaxH       = maxH;
    right.style.minHeight  = maxH + 'px';

    // Re-wire po finálním renderu
    // Poznámka: _checkBadgeOverflow() volá volající (_reRenderRight) přes druhý RAF
    // pro správné layout měření. Zde ho nevoláme synchronně.
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
  }

  _checkBadgeOverflow() {
    // Pro každou kartu: pokud badge řádek (mc-act nebo mc-badges) přetéká → badge-compact
    this.shadowRoot.querySelectorAll('.mc').forEach(card => {
      const row = card.querySelector('.mc-act') || card.querySelector('.mc-badges');
      if (!row) return;
      const overflows = row.scrollWidth > row.clientWidth + 1;
      card.classList.toggle('badge-compact', overflows);
    });
  }

  async _fetchPendingRequests() {
    if (!this._hass.user.is_admin) return;
    try {
      const data = await this._hass.callApi('GET', 'arr_stack/overseerr/pending');
      this._pendingRequests = data?.results ?? [];
    } catch (e) {
      console.error('[arr-card] Pending requests fetch error:', e);
      this._pendingRequests = [];
    }
  }

  // ── LocalStorage helpers pro pending žádosti (přežije refresh stránky) ──

  _pendingStorageKey() {
    return `arr_stack_pending_${this._hass?.user?.id || 'default'}`;
  }

  _loadPendingFromStorage() {
    if (this._hass?.user?.is_admin) return;
    try {
      const raw = localStorage.getItem(this._pendingStorageKey());
      if (raw) {
        const obj = JSON.parse(raw);
        this._familyPendingIds = new Map(
          Object.entries(obj).map(([k, v]) => [Number(k), v])
        );
      }
    } catch (e) { /* ignore */ }
  }

  _savePendingToStorage() {
    if (this._hass?.user?.is_admin) return;
    try {
      const obj = {};
      this._familyPendingIds.forEach((reqId, tmdbId) => { obj[tmdbId] = reqId; });
      localStorage.setItem(this._pendingStorageKey(), JSON.stringify(obj));
    } catch (e) { /* ignore */ }
  }

  async _fetchMyPendingRequests() {
    if (this._hass.user.is_admin) return;
    try {
      const data = await this._hass.callApi('GET', 'arr_stack/overseerr/my_pending');
      const results = data?.results || [];

      // Server vrací VŠECHNY requesty (filter=all) — mapa requestId → status
      const serverReqMap = new Map(results.map(r => [r.id, r.status]));

      let changed = false;

      // 1. Cleanup — odstraň záznamy jejichž request byl zamítnut (status=3) nebo na serveru neexistuje
      for (const [tmdbId, reqId] of this._familyPendingIds) {
        const serverStatus = serverReqMap.get(reqId);
        if (serverStatus === undefined || serverStatus === 3) {
          this._familyPendingIds.delete(tmdbId);
          changed = true;
        }
      }

      // 2. Addback — přidej pending requesty (status=1) se známým tmdbId, které ještě nemáme v mapě.
      //    Zachytí "Requested" položky (re-request po zamítnutí), kde POST odpověď neobsahovala id.
      //    TV seriály mohou mít r.media.tmdbId === null — ty přeskočíme (zachytí je POST response).
      const knownReqIds = new Set(this._familyPendingIds.values());
      for (const r of results) {
        if (r.status !== 1) continue;                          // jen PENDING (čeká na schválení)
        const tmdbId = Number(r.media?.tmdbId);
        if (!tmdbId) continue;                                 // TV bez tmdbId — přeskočit
        if (this._familyPendingIds.has(tmdbId)) continue;     // už evidujeme
        if (knownReqIds.has(r.id)) continue;                  // reqId je pod jiným tmdbId
        this._familyPendingIds.set(tmdbId, r.id);
        changed = true;
      }

      if (changed) {
        this._savePendingToStorage();
        this._reRenderRight();
      }
    } catch (e) {
      // Při chybě ponecháme existující data (server dočasně nedostupný)
      console.error('[arr-card] my_pending fetch error:', e);
    }
  }

  _optimisticRemovePending(requestId) {
    this._pendingRequests = this._pendingRequests.filter(r => r.id !== requestId);
    // Clamp stránku pokud zmizel poslední prvek na ní
    const newTotal = Math.ceil(this._pendingRequests.length / 4);
    this._pages.pending = Math.max(0, Math.min(this._pages.pending, newTotal - 1));
    this._reRenderRight();
  }

  async _approvePendingRequest(requestId) {
    this._optimisticRemovePending(requestId);
    try {
      await this._hass.callApi('POST', 'arr_stack/overseerr/approve', { requestId });
      this._fetchPendingRequests().then(() => this._reRenderRight());
    } catch (e) {
      await this._fetchPendingRequests();
      this._reRenderRight();
      console.error('[arr-card] Approve request error:', e);
    }
  }

  async _declinePendingRequest(requestId) {
    this._optimisticRemovePending(requestId);
    try {
      await this._hass.callApi('POST', 'arr_stack/overseerr/decline', { requestId });
      this._fetchPendingRequests().then(() => this._reRenderRight());
    } catch (e) {
      await this._fetchPendingRequests();
      this._reRenderRight();
      console.error('[arr-card] Decline request error:', e);
    }
  }

  async _withdrawOverseerrRequest(requestId, mediaId) {
    // Optimistický update — okamžitě zobrazit "+ Přidat"
    this._optimisticRequested.delete(mediaId);
    this._familyPendingIds.delete(mediaId);
    this._savePendingToStorage();
    this._withdrawnIds.add(mediaId);
    this._reRenderRight();
    try {
      await this._hass.callApi('POST', 'arr_stack/overseerr/request_delete', { requestId });
      // Po úspěchu sync reálný stav
      await this._fetchOverseerr();
      await this._fetchTvUpcoming();
      this._withdrawnIds.delete(mediaId);
      this._reRenderRight();
    } catch (e) {
      // Rollback
      this._withdrawnIds.delete(mediaId);
      this._reRenderRight();
      console.error('[arr-card] Withdraw request error:', e);
    }
  }

  // ─────────────────────────────────────────────
  // Shell build (CSS + skeleton)
  // ─────────────────────────────────────────────

  _buildShell() {
    const style = document.createElement('style');
    style.textContent = this._css();

    // Inject user CSS variables from styles: config block
    // Colors are stored as hex in config; alpha is fixed per-variable.
    const userStyles = this._cfg?.styles || {};
    const perfMode = !!(userStyles.performanceMode || this._cfg?.performanceMode);
    const customVars = [];

    const hexRgba = (hex, alpha) => {
      if (!hex || !hex.startsWith('#')) return null;
      const rgb = this._hexToRgb(hex);
      return rgb ? `rgba(${rgb},${alpha})` : null;
    };

    // cardBackground only applies in perf mode (normal mode uses blur which hides bg)
    if (perfMode && userStyles.cardBackground) {
      const v = hexRgba(userStyles.cardBackground, 0.90);
      if (v) customVars.push(`--card-bg-perf: ${v}`);
    }
    const layout = this._cfg?.layout || 'both';
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    const layoutClass = layout === 'left' ? ' layout-left' : layout === 'right' ? ' layout-right' : '';
    const perfClass = (this._cfg?.styles?.performanceMode || this._cfg?.performanceMode) ? ' perf-mode' : '';
    wrapper.innerHTML = `<div class="card-body${layoutClass}${perfClass}">
      <div class="col col-left" id="col-left"></div>
      <div class="col col-right" id="col-right"></div>
    </div>`;
    // Popup root — separate from .card so overlay covers everything
    const popupRoot = document.createElement('div');
    popupRoot.id = 'popup-root';
    this.shadowRoot.appendChild(style);
    // Custom vars appended after main style so they override defaults
    if (customVars.length) {
      const varStyle = document.createElement('style');
      varStyle.textContent = `:host { ${customVars.join('; ')}; }`;
      this.shadowRoot.appendChild(varStyle);
    }
    this.shadowRoot.appendChild(wrapper);
    this.shadowRoot.appendChild(popupRoot);
    this._applyTheme();
  }

  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────

  _render() {
    const left = this.shadowRoot.getElementById('col-left');
    const right = this.shadowRoot.getElementById('col-right');
    if (!left || !right) return;
    const layout = this._cfg?.layout || 'both';
    if (layout !== 'right') left.innerHTML  = this._renderLeft();
    if (layout !== 'left')  right.innerHTML = this._renderRight();
    this._wireSort();
    this._wireActionButtons();
    this._wireOverseerrButtons();
    this._wirePageButtons();
    this._wirePopup();
    this._renderPopupEl();
    requestAnimationFrame(() => {
      if (!window.matchMedia('(max-width: 900px)').matches) this._measureAndLockHeight();
      requestAnimationFrame(() => this._checkBadgeOverflow());
    });
  }

  // ─────────────────────────────────────────────
  // Left column
  // ─────────────────────────────────────────────


  // ─────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────

  _css() { return STYLES; }

  getCardSize() {
    return 10;
  }

  static getConfigElement() {
    return document.createElement('arr-stack-card-editor');
  }

  static getStubConfig() {
    return {
      localisation: 'en',
      layout: 'both',
      downloads: { torrentItems: 3, usenetItems: 3 },
      discover: { categoriesCount: 3, oneClickMovieRequest: false },
      styles: { performanceMode: false },
    };
  }
}

// ─────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────

function applyMixin(target, mixin) {
  for (const name of Object.getOwnPropertyNames(mixin)) {
    if (name !== 'constructor') {
      Object.defineProperty(target, name, Object.getOwnPropertyDescriptor(mixin, name));
    }
  }
}

applyMixin(ArrStackCard.prototype, interactiveSearchMixin);
applyMixin(ArrStackCard.prototype, sonarrIsMixin);
applyMixin(ArrStackCard.prototype, fetchMixin);
applyMixin(ArrStackCard.prototype, renderLeftMixin);
applyMixin(ArrStackCard.prototype, renderRightMixin);
applyMixin(ArrStackCard.prototype, wireMixin);
applyMixin(ArrStackCard.prototype, popupMixin);

customElements.define('arr-stack-card', ArrStackCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'arr-stack-card',
  name: 'Arr Stack Card',
  description: 'Media server dashboard — Radarr, Sonarr, Overseerr, SABnzbd, qBittorrent',
});
