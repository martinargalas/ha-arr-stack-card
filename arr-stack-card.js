// src/editor.js
var ArrStackCardEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }
  setConfig(config) {
    this._config = config || {};
    this._render();
  }
  connectedCallback() {
    this._render();
  }
  _cfg(group, key, fallback) {
    const v = this._config?.[group]?.[key];
    if (v !== void 0) return v;
    const flat = this._config?.[key];
    if (flat !== void 0) return flat;
    return fallback;
  }
  _val(key, fallback) {
    const v = this._config?.[key];
    return v !== void 0 ? v : fallback;
  }
  _styleVal(key, fallback) {
    const v = this._config?.styles?.[key];
    return v !== void 0 ? v : fallback;
  }
  _render() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--paper-font-body1_-_font-family, -apple-system, sans-serif);
          font-size: 14px;
          color: var(--primary-text-color, #212121);
        }
        .bmc {
          display: flex; align-items: center; gap: 10px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
          text-decoration: none; color: inherit;
          border: 1px solid var(--divider-color, #e0e0e0);
        }
        .bmc:hover { background: var(--primary-background-color, #fff); }
        .bmc img { width: 22px; height: 22px; }
        .bmc-text { flex: 1; }
        .bmc-title { font-weight: 600; font-size: 13px; }
        .bmc-sub { font-size: 11px; color: var(--secondary-text-color, #757575); }
        .section { margin-bottom: 20px; }
        .section-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--secondary-text-color, #757575);
          margin-bottom: 10px; padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .row label { flex: 1; font-size: 13px; }
        .row select, .row input[type="number"], .row input[type="text"] {
          width: 160px; padding: 6px 8px; border-radius: 6px; font-size: 13px;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
        }
        .row input[type="color"] {
          width: 44px; height: 32px; padding: 2px; border-radius: 6px; cursor: pointer;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
        }
        .row input[type="text"].color-text {
          width: 110px; font-family: monospace; font-size: 12px;
        }
        .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; inset: 0; background: var(--divider-color, #ccc);
          border-radius: 20px; cursor: pointer; transition: background .2s;
        }
        .toggle-slider::before {
          content: ''; position: absolute; width: 14px; height: 14px;
          left: 3px; top: 3px; background: #fff; border-radius: 50%;
          transition: transform .2s;
        }
        .toggle input:checked + .toggle-slider { background: var(--primary-color, #03a9f4); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
        .hint { font-size: 11px; color: var(--secondary-text-color, #757575); margin-top: -6px; margin-bottom: 8px; }
      </style>

      <a class="bmc" href="https://buymeacoffee.com/argii" target="_blank" rel="noopener">
        <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="coffee"/>
        <div class="bmc-text">
          <div class="bmc-title">Buy me a coffee \u2615</div>
          <div class="bmc-sub">If you find this card useful, support the developer</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>

      <!-- General -->
      <div class="section">
        <div class="section-title">General</div>
        <div class="row">
          <label>Language</label>
          <select data-key="localisation">
            <option value="cs" ${this._val("localisation", "cs") === "cs" ? "selected" : ""}>Czech</option>
            <option value="en" ${this._val("localisation", "cs") === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
        <div class="row">
          <label>Layout</label>
          <select data-key="layout">
            <option value="both"  ${this._val("layout", "both") === "both" ? "selected" : ""}>Both panels</option>
            <option value="left"  ${this._val("layout", "both") === "left" ? "selected" : ""}>Downloads only</option>
            <option value="right" ${this._val("layout", "both") === "right" ? "selected" : ""}>Media only</option>
          </select>
        </div>
        <div class="row">
          <label>Sticky nav offset (px)</label>
          <input type="number" data-key="sticky_nav_offset" value="${this._val("sticky_nav_offset", 100)}" min="0" max="500" step="10"/>
        </div>
      </div>

      <!-- Downloads -->
      <div class="section">
        <div class="section-title">Downloads</div>
        <div class="row">
          <label>Torrent items per page</label>
          <input type="number" data-group="downloads" data-key="torrentItems" value="${this._cfg("downloads", "torrentItems", 3)}" min="1" max="20"/>
        </div>
        <div class="row">
          <label>Usenet items per page</label>
          <input type="number" data-group="downloads" data-key="usenetItems" value="${this._cfg("downloads", "usenetItems", 3)}" min="1" max="20"/>
        </div>
      </div>

      <!-- Discover -->
      <div class="section">
        <div class="section-title">Discover</div>
        <div class="row">
          <label>Categories per page</label>
          <input type="number" data-group="discover" data-key="categoriesCount" value="${this._cfg("discover", "categoriesCount", 3)}" min="1" max="10"/>
        </div>
        <div class="row">
          <label>One-click movie request</label>
          <label class="toggle">
            <input type="checkbox" data-group="discover" data-key="oneClickMovieRequest" ${this._cfg("discover", "oneClickMovieRequest", false) ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">When enabled, movies are requested immediately without a profile selection dialog.</div>
      </div>

      <!-- Appearance -->
      <div class="section">
        <div class="section-title">Appearance</div>
        <div class="row">
          <label>Performance mode</label>
          <label class="toggle">
            <input type="checkbox" data-style-key="performanceMode" ${this._styleVal("performanceMode", false) ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">Disables backdrop blur \u2014 improves performance on low-end devices.</div>
        ${this._colorRow("Accent color", "accentColor", "#0a84ff")}
        ${this._colorRow("Card background", "cardBackground", "rgba(255,255,255,0.05)")}
        ${this._colorRow("Popup background", "popupBackground", "rgba(255,255,255,0.05)")}
        ${this._colorRow("Overlay background", "overlayBackground", "rgba(0,0,0,0.55)")}
        ${this._colorRow("Primary text", "primaryTextColor", "rgba(255,255,255,1)")}
        ${this._colorRow("Secondary text", "secondaryTextColor", "rgba(255,255,255,0.55)")}
        ${this._colorRow("Muted text", "mutedTextColor", "rgba(255,255,255,0.28)")}
      </div>
    `;
    this._wireEvents();
  }
  _colorRow(label, key, fallback) {
    const val = this._styleVal(key, fallback);
    const isHex = /^#[0-9a-fA-F]{3,8}$/.test(val);
    return `
      <div class="row">
        <label>${label}</label>
        ${isHex ? `<input type="color" data-style-key="${key}" data-color-text="${key}" value="${val}"/>` : ""}
        <input type="text" class="color-text" data-style-key="${key}" value="${val}" placeholder="${fallback}"/>
      </div>`;
  }
  _wireEvents() {
    this.shadowRoot.querySelectorAll('select[data-key], input[type="number"][data-key], input[type="text"][data-key]').forEach((el) => {
      el.addEventListener("change", () => {
        const key = el.dataset.key;
        let val = el.type === "number" ? parseInt(el.value) : el.value;
        this._update({ [key]: val });
      });
    });
    this.shadowRoot.querySelectorAll('input[type="number"][data-group]').forEach((el) => {
      el.addEventListener("change", () => {
        const group = el.dataset.group;
        const key = el.dataset.key;
        const existing = this._config[group] || {};
        this._update({ [group]: { ...existing, [key]: parseInt(el.value) } });
      });
    });
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-group]').forEach((el) => {
      el.addEventListener("change", () => {
        const group = el.dataset.group;
        const key = el.dataset.key;
        const existing = this._config[group] || {};
        this._update({ [group]: { ...existing, [key]: el.checked } });
      });
    });
    this.shadowRoot.querySelectorAll("input[data-style-key]").forEach((el) => {
      const event = el.type === "color" ? "input" : "change";
      el.addEventListener(event, () => {
        const key = el.dataset.styleKey;
        const existing = this._config.styles || {};
        if (el.type === "checkbox") {
          this._update({ styles: { ...existing, [key]: el.checked } });
        } else {
          if (el.type === "color") {
            const textEl = this.shadowRoot.querySelector(`input[data-style-key="${key}"][type="text"]`);
            if (textEl) textEl.value = el.value;
          }
          this._update({ styles: { ...existing, [key]: el.value } });
        }
      });
    });
  }
  _update(patch) {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
};
customElements.define("arr-stack-card-editor", ArrStackCardEditor);

// src/i18n.js
var ARR_I18N = {
  cs: {
    // Záhlaví sekcí
    downloads: "Stahov\xE1n\xED",
    pendingRequests: "\u010Cekaj\xEDc\xED \u017E\xE1dosti",
    overview: "P\u0159ehled film\u016F a seri\xE1l\u016F",
    recentMovies: "Naposledy p\u0159idan\xE9 filmy",
    recentShows: "Naposledy p\u0159idan\xE9 seri\xE1ly",
    upcomingMovies: "Nadch\xE1zej\xEDc\xED filmy",
    newShows: "Nov\xE9 seri\xE1ly",
    trendingMovies: "Trendy",
    typeMovie: "Film",
    typeTv: "Seri\xE1l",
    seeMore: "Dal\u0161\xED",
    popularMovies: "Popul\xE1rn\xED filmy",
    newEpisodes: "Nov\xE9 epizody",
    // Statistiky
    totalSpeed: "Celkov\xE1 rychlost",
    storage: "Kapacita ulo\u017Ei\u0161t\u011B",
    free: "voln\xFDch",
    // Torrent stavy
    seeding: "Seeduje",
    complete: "Dokon\u010Deno",
    // Torrent akce
    sortByProgress: "Se\u0159adit podle progressu",
    sortBySpeed: "Se\u0159adit podle rychlosti",
    resumeAll: "Spustit v\u0161e",
    pauseAll: "Pozastavit v\u0161e",
    resumeSab: "Spustit SAB",
    pauseSab: "Pozastavit SAB",
    pause: "Pozastavit",
    resume: "Spustit",
    stopSeed: "Zastavit seed",
    cancelRemove: "Zru\u0161it",
    keepFiles: "Odstranit torrent, zachovat soubory",
    deleteFiles: "Odstranit + smazat soubory",
    remove: "Odstranit",
    retry: "Zkusit znovu",
    removeFromHist: "Odstranit z historie",
    // Chybové stavy
    errorState: "Chyba",
    missingFiles: "Chyb\xED soubory",
    // Čekající žádosti
    approve: "Schv\xE1lit",
    decline: "Zam\xEDt.",
    // Navigace
    prev: "P\u0159edchoz\xED",
    next: "Dal\u0161\xED",
    // Odznaky
    badgeDownloading: "Stahov\xE1n\xED",
    badgeMissing: "Chyb\xED",
    badgeAvailable: "Dostupn\xE9",
    badgeAdded: "P\u0159id\xE1no",
    badgePending: "Schv\xE1len\xED",
    missingSubs: "Chyb\xED titulky",
    subtitles: "Titulky",
    // Akce
    add: "+ P\u0159idat",
    cancel: "Zru\u0161it",
    confirm: "Potvrdit",
    // Profil / kvalita
    defaultProfile: "V\xFDchoz\xED profil",
    downloadQuality: "Kvalita sta\u017Een\xED",
    // Placeholders
    noDownloads: "\u017D\xE1dn\xE9 aktivn\xED stahov\xE1n\xED",
    noRadarr: "\u017D\xE1dn\xE1 data z Radarr",
    noSonarr: "\u017D\xE1dn\xE1 data ze Sonarr",
    noEpisodes: "\u017D\xE1dn\xE9 nadch\xE1zej\xEDc\xED epizody",
    loading: "Na\u010D\xEDt\xE1n\xED\u2026",
    loadingDetail: "Na\u010D\xEDt\xE1m\u2026",
    // Popup
    watchTrailer: "Sledovat trailer",
    noDescription: "Popis nen\xED k dispozici",
    // Torrent stagnující stav
    stalled: "Stagnuje",
    // Typy médií (pending karta)
    movieLabel: "\u{1F3AC} Film",
    showLabel: "\u{1F4FA} Seri\xE1l",
    // Počty
    movies: "film\u016F",
    shows: "s\xE9ri\xED",
    seasons: "sez\xF3n",
    episodes: "epizod",
    // Interactive Search — filmy
    isQueryingIndexers: "Dotazuji indexery\u2026",
    isResults: "V\xFDsledky",
    isImported: "Importov\xE1no",
    isGrabbed: "Grabbov\xE1no",
    isFailed: "Selhalo \u2014 klikni pro opakov\xE1n\xED",
    isLoadError: "Chyba p\u0159i na\u010D\xEDt\xE1n\xED",
    isGrabError: "Grab selhal",
    isFilterAll: "V\u0161e",
    isConfirmMsg: "Film bude nejd\u0159\xEDve p\u0159id\xE1n do Radarru bez monitorov\xE1n\xED.",
    isMissingTmdb: "Chyb\xED TMDB ID",
    isNoRadarrId: "Film se nepoda\u0159ilo p\u0159idat do Radarru",
    // Interactive Search — seriály
    snSeasonsLabel: "Sez\xF3ny & epizody",
    snSeasonTitle: "Sez\xF3na",
    snExpandEpisodes: "Rozbal epizody",
    snNoEpisodes: "\u017D\xE1dn\xE9 epizody.",
    snNotInSonarr: "Seri\xE1l nenalezen v Sonarru.",
    snEpisode: "Epizoda",
    snSeasonPack: "season pack",
    snBack: "Zp\u011Bt"
  },
  en: {
    downloads: "Downloads",
    pendingRequests: "Pending Requests",
    overview: "Movies & Shows",
    recentMovies: "Recently Added Movies",
    recentShows: "Recently Added Shows",
    upcomingMovies: "Upcoming Movies",
    newShows: "New Shows",
    trendingMovies: "Trending",
    typeMovie: "Movie",
    typeTv: "Show",
    seeMore: "More",
    popularMovies: "Popular Movies",
    newEpisodes: "New Episodes",
    totalSpeed: "Total Speed",
    storage: "Storage",
    free: "free",
    seeding: "Seeding",
    complete: "Complete",
    sortByProgress: "Sort by progress",
    sortBySpeed: "Sort by speed",
    resumeAll: "Resume all",
    pauseAll: "Pause all",
    resumeSab: "Resume SAB",
    pauseSab: "Pause SAB",
    pause: "Pause",
    resume: "Resume",
    stopSeed: "Stop seed",
    cancelRemove: "Cancel",
    keepFiles: "Remove torrent, keep files",
    deleteFiles: "Remove + delete files",
    remove: "Remove",
    retry: "Retry",
    removeFromHist: "Remove from history",
    errorState: "Error",
    missingFiles: "Missing files",
    approve: "Approve",
    decline: "Decline",
    prev: "Previous",
    next: "Next",
    badgeDownloading: "Downloading",
    badgeMissing: "Missing",
    badgeAvailable: "Available",
    badgeAdded: "Added",
    badgePending: "Approval",
    missingSubs: "Missing subs",
    subtitles: "Subtitles",
    add: "+ Add",
    cancel: "Cancel",
    confirm: "Confirm",
    defaultProfile: "Default profile",
    downloadQuality: "Download quality",
    noDownloads: "No active downloads",
    noRadarr: "No data from Radarr",
    noSonarr: "No data from Sonarr",
    noEpisodes: "No upcoming episodes",
    loading: "Loading\u2026",
    loadingDetail: "Loading\u2026",
    watchTrailer: "Watch trailer",
    noDescription: "No description available",
    stalled: "Stalled",
    movieLabel: "\u{1F3AC} Movie",
    showLabel: "\u{1F4FA} Show",
    movies: "movies",
    shows: "shows",
    seasons: "seasons",
    episodes: "episodes",
    // Interactive Search — movies
    isQueryingIndexers: "Querying indexers\u2026",
    isResults: "Results",
    isImported: "Imported",
    isGrabbed: "Grabbed",
    isFailed: "Failed \u2014 click to retry",
    isLoadError: "Error loading results",
    isGrabError: "Grab failed",
    isFilterAll: "All",
    isConfirmMsg: "Movie will be added to Radarr unmonitored first.",
    isMissingTmdb: "Missing TMDB ID",
    isNoRadarrId: "Failed to add movie to Radarr",
    // Interactive Search — shows
    snSeasonsLabel: "Seasons & episodes",
    snSeasonTitle: "Season",
    snExpandEpisodes: "Expand episodes",
    snNoEpisodes: "No episodes.",
    snNotInSonarr: "Series not found in Sonarr.",
    snEpisode: "Episode",
    snSeasonPack: "season pack",
    snBack: "Back"
  }
};

// src/styles/index.js
var STYLES = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* \u2500\u2500 macOS color tokens + user-overridable design tokens \u2500\u2500 */
      :host {
        --mac-red:    #ff453a;
        --mac-yellow: #ffd60a;
        --mac-blue:   #0a84ff;
        --mac-green:  #30d158;
        --mac-gray:   #8E8E93;
        --mac-orange: #FF9500;

        /* Design tokens \u2014 overridable via styles: in YAML config */
        --card-bg:        rgba(255,255,255,0.05);
        --overlay-bg:     rgba(0,0,0,0.55);
        --popup-bg:       rgba(255,255,255,0.05);
        --text-primary:   rgba(255,255,255,1);
        --text-secondary: rgba(255,255,255,0.55);
        --text-muted:     rgba(255,255,255,0.28);
        --accent:         #0a84ff;
        --accent-rgb:     10,132,255;

        color: #ffffff;
        font-family: -apple-system, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
        display: block;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         OUTER CARD
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .card { width: 100%; background: transparent; margin: 0; }

      /* \u2500\u2500 Column header \u2500\u2500 */
      .col-hdr {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 10px;
        padding: 0 4px;
      }

      .col-hdr-title {
        font-size: 14px; font-weight: 700;
        color: var(--text-primary);
        white-space: nowrap;
      }

      .col-hdr-line {
        flex: 1; height: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,0.55);
        margin-left: 10px;
      }

      .col-hdr ha-icon {
        color: rgba(255,255,255,1);
        flex-shrink: 0;
      }

      .dot-online {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--mac-green); box-shadow: 0 0 6px rgba(48,209,88,0.8);
        flex-shrink: 0;
      }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         BODY GRID
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .card-body {
        display: grid;
        grid-template-columns: 2fr 3fr;
        gap: 12px;
        padding: 0 12px 12px;
      }

      /* \u2500\u2500 Glass outer panel \u2500\u2500 */
      .col {
        position: relative;
        padding: 10px 15px;
        min-width: 0; overflow: clip;
        border-radius: 34px;
        display: flex; flex-direction: column;
        background: var(--card-bg);
        backdrop-filter: blur(35px) saturate(100%);
        -webkit-backdrop-filter: blur(35px) saturate(100%);
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow:
          0 15px 25px rgba(0,0,0,0.08),
          inset 0 2px 3px rgba(0,0,0,0.03);
      }

      .col::before {
        content: "";
        position: absolute; inset: 0; border-radius: 34px;
        background: linear-gradient(
          120deg,
          rgba(255,255,255,0.55),
          rgba(255,255,255,0.15) 25%,
          rgba(255,255,255,0.05) 50%,
          transparent 70%
        );
        opacity: 0.35; pointer-events: none; z-index: 0;
      }

      .col > * { position: relative; z-index: 1; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         SECTION LABEL
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .divider    { height: 1px; background: rgba(255,255,255,0.18); margin: 9px 0; }
      .spacer     { height: 16px; }
      .spacer-sm  { height: 8px; }

      .sec { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }

      .sec-icon {
        width: 23px; height: 23px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transform: translateY(0px);
      }

      .sec-title {
        font-size: 12px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.09em;
        color: var(--text-primary);
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }

      .sec-badge {
        font-size: 9px; font-weight: 700;
        padding: 1px 6px; border-radius: 7px;
        margin-left: auto;
        color: #ffffff;
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         DISK CHIPS
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .disk-row { display: flex; gap: 6px; }

      .disk-chip {
        flex: 1; border-radius: 12px; padding: 7px 10px;
        position: relative; overflow: hidden;
        background: rgba(255,255,255,0.08);
      }

      .disk-chip::before {
        content: ""; position: absolute; inset: 0; border-radius: 12px;
        background: linear-gradient(
          120deg,
          rgba(255,255,255,0.45),
          rgba(255,255,255,0.10) 30%,
          rgba(255,255,255,0.02) 60%
        );
        opacity: 0.35; pointer-events: none;
      }

      .disk-chip::after {
        content: ""; position: absolute; inset: 0; border-radius: 12px;
        box-shadow:
          inset 0 0 0 0.5px rgba(255,255,255,0.18),
          inset 0 0 20px rgba(255,255,255,0.08);
        pointer-events: none;
      }

      .disk-chip > * { position: relative; z-index: 1; }

      .dc-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: #fff; margin-bottom: 2px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
      }

      .dc-val {
        font-size: 16px; font-weight: 800; line-height: 1; margin-bottom: 3px;
        text-shadow: 0 1px 6px rgba(0,0,0,0.5);
      }
      .dc-val span { text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

      .dc-sub {
        font-size: 11px; color: #fff;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        line-height: 1.5;
      }

      .mbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; margin-top: 3px; }
      .mbar-fill { height: 100%; border-radius: 1px; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         CLIENT HEADER
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .client-hd {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 8px;
      }

      .client-hd ha-icon {
        color: rgba(255,255,255,1); flex-shrink: 0;
      }

      .client-hd .col-hdr-line {
        background: rgba(33,33,33,0.10);
      }

      .cl-name {
        font-size: 15px; font-weight: 700;
        color: rgba(255,255,255,1);
        white-space: nowrap;
      }

      .cl-speed { font-size: 12px; font-weight: 800; }

      .sort-btns { margin-left: auto; display: flex; gap: 3px; }

      .sb {
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
        border: 1px solid rgba(255,255,255,0.30); background: rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.85); cursor: pointer;
        backdrop-filter: blur(8px);
      }

      .sb.on {
        background: rgba(var(--accent-rgb),0.30); border-color: rgba(var(--accent-rgb),0.55);
        color: #fff;
      }

      .sb:active { transform: scale(0.88); }

      /* Direction arrow shown inside active sort button */
      .sb-dir { font-size: 9px; margin-left: 1px; }

      /* \u2500\u2500 Global pause/resume button (header) \u2500\u2500 */
      .action-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; flex-shrink: 0;
        border-radius: 7px; border: 1px solid rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.10);
        color: rgba(255,255,255,0.80); cursor: pointer;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .action-btn:hover {
        background: rgba(255,255,255,0.20); color: #fff;
      }
      .action-btn.paused {
        background: rgba(48,209,88,0.28); border-color: rgba(48,209,88,0.55);
        color: #fff;
      }
      .action-btn:active { transform: scale(0.88); }

      /* CSS spinner \u2014 nez\xE1vis\xED na ha-icon */
      @keyframes btn-spin {
        to { transform: rotate(360deg); }
      }
      .action-spinner {
        display: block;
        width: 13px; height: 13px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.25);
        border-top-color: #fff;
        animation: btn-spin 0.65s linear infinite;
      }

      /* \u2500\u2500 Per-torrent tiny action buttons \u2500\u2500 */
      .tb-group {
        display: flex; gap: 3px; flex-shrink: 0; margin-left: 6px;
      }

      .tb {
        display: inline-flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; flex-shrink: 0;
        border-radius: 5px; border: 1px solid rgba(255,255,255,0.28);
        background: rgba(255,255,255,0.10);
        color: rgba(255,255,255,0.90); cursor: pointer;
        padding: 0;
        transition: background 0.12s, color 0.12s;
      }
      .tb:hover  { background: rgba(255,255,255,0.22); color: #fff; }
      .tb:active { transform: scale(0.88); }

      /* Resume \u2014 green tint */
      .tb-resume { border-color: rgba(48,209,88,0.40); background: rgba(48,209,88,0.18); color: #fff; }
      .tb-resume:hover { background: rgba(48,209,88,0.32); color: #fff; }

      /* Pause \u2014 stejn\xE1 neutr\xE1ln\xED barva jako glob\xE1ln\xED action-btn */
      .tb-pause  { border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.10); color: #fff; }
      .tb-pause:hover  { background: rgba(255,255,255,0.22); }

      /* Remove (initial) \u2014 neutral */
      .tb-remove { }
      .tb-remove:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.55); color: #fff; }

      .tb-retry { border-color: rgba(255,159,10,0.40); background: rgba(255,159,10,0.14); color: #fff; flex-shrink: 0; }
      .tb-retry:hover { background: rgba(255,159,10,0.30); border-color: rgba(255,159,10,0.65); }

      .tb-hist-del { flex-shrink: 0; }
      .tb-hist-del:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.55); color: #fff; }

      .sab-failed-sep {
        margin: 6px 0 4px; height: 1px;
        background: rgba(255,69,58,0.25);
      }
      .dl-failed { opacity: 0.90; }

      /* Confirm row: cancel / keep / delete */
      .tb-cancel { border-color: rgba(255,255,255,0.30); }
      .tb-keep   { border-color: rgba(255,149,0,0.40);  background: rgba(255,149,0,0.18);  color: rgba(255,149,0,0.90); }
      .tb-keep:hover { background: rgba(255,149,0,0.32); color: #fff; }
      .tb-del    { border-color: rgba(255,69,58,0.55);  background: rgba(255,69,58,0.28);  color: rgba(255,90,80,0.90); }
      .tb-del:hover  { background: rgba(255,69,58,0.45); color: #fff; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         SECTION GLASS CARD
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .sec-card { margin-bottom: 4px; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         DOWNLOAD ITEMS
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .dl {
        padding: 5px 2px; margin-bottom: 0;
        background: none;
      }

      .dl-r1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }

      .dl-name {
        font-size: 12px; font-weight: 600;
        color: #ffffff;
        text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 360px;
      }

      .dl-pct { font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.5); flex-shrink: 0; margin-left: 8px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.4); }

      .dl-r2 { display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }

      .dm { font-size: 11px; color: rgba(255,255,255,0.55); display: flex; align-items: center; gap: 2px; }
      .dm b { font-weight: 700; }
      .dm-val { color: rgba(255,255,255,0.5); font-weight: 700; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         PILL CHIP SYSTEM  (speed + status)
         Solid macOS colours, no gradient \u2014 clean and vivid
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .g, .pill-green, .pill-orange, .pill-red, .pill-blue, .pill-yellow, .pill-teal {
        display: inline-flex; align-items: center; gap: 3px;
        border-radius: 999px; border: 1px solid transparent;
        font-weight: 700; color: #fff; white-space: nowrap;
      }
      /* macOS green \u2014 #30D158 */
      .g, .pill-green  { background: rgba(48,209,88,0.38);  border-color: rgba(48,209,88,0.70); }
      /* macOS teal \u2014 #5AC8FA (seeding active) */
      .pill-teal        { background: rgba(90,200,250,0.28);  border-color: rgba(90,200,250,0.65); }
      /* macOS orange \u2014 #FF9500 */
      .pill-orange      { background: rgba(255,149,0,0.38);  border-color: rgba(255,149,0,0.70); }
      /* macOS red \u2014 #FF453A */
      .pill-red         { background: rgba(255,69,58,0.38);  border-color: rgba(255,69,58,0.70); }
      /* macOS blue \u2014 #0A84FF */
      .pill-blue        { background: rgba(10,132,255,0.38); border-color: rgba(10,132,255,0.70); }
      /* macOS yellow \u2014 #FFD60A */
      .pill-yellow      { background: rgba(255,214,10,0.32); border-color: rgba(255,214,10,0.65); }
      /* Speed value pill (inline in torrent rows) */
      .g { padding: 0 7px; }
      /* Value pill in disk chips */
      .pill-orange.dc-pill { padding: 1px 9px; font-size: 15px; font-weight: 800; }
      /* Status pill in torrent rows */
      .status-pill { padding: 1px 8px; font-size: 10px; }

      .pbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; }
      .pbar-fill { height: 100%; border-radius: 1px; }
      .pf-blue   { background: linear-gradient(90deg, rgba(var(--accent-rgb),0.7), rgba(var(--accent-rgb),1)); }
      .pf-orange { background: linear-gradient(90deg, rgba(255,149,0,0.7), #ffbb50); }
      .pf-red    { background: linear-gradient(90deg, rgba(255,69,58,0.7), #ff6b61); }
      .pf-green  { background: linear-gradient(90deg, rgba(48,209,88,0.7), #a8ffcb); }

      .dl-pct-err { color: var(--mac-red) !important; }
      .dm-err { display: flex; align-items: center; gap: 3px; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         MEDIA GRID  4 columns + pagination
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .mgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; flex: 1; min-width: 0; }

      /* Pagination wrapper */
      .pg-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Chevron buttons */
      .pg-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: rgba(255,255,255,0.55);
        font-size: 22px;
        line-height: 1;
        padding: 2px 5px;
        border-radius: 8px;
        transition: color 0.15s, background 0.15s;
        flex-shrink: 0;
        user-select: none;
      }
      .pg-btn:hover:not(:disabled) {
        color: rgba(255,255,255,0.9);
        background: rgba(255,255,255,0.08);
      }
      .pg-btn:disabled {
        opacity: 0.18;
        cursor: default;
      }
      .pg-btn-ph { visibility: hidden; pointer-events: none; }

      /* Slide animations */
      @keyframes pg-slide-next {
        from { opacity: 0; transform: translateX(16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes pg-slide-prev {
        from { opacity: 0; transform: translateX(-16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .mgrid.anim-next  { animation: pg-slide-next 0.22s cubic-bezier(.25,.46,.45,.94) both; }
      .mgrid.anim-prev  { animation: pg-slide-prev 0.22s cubic-bezier(.25,.46,.45,.94) both; }
      .dl-list { flex: 1; min-width: 0; }
      .dl-list.anim-next { animation: pg-slide-next 0.22s cubic-bezier(.25,.46,.45,.94) both; }
      .dl-list.anim-prev { animation: pg-slide-prev 0.22s cubic-bezier(.25,.46,.45,.94) both; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         MEDIA CARD
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .mc {
        background: rgba(255,255,255,0.10);
        border-radius: 11px; overflow: hidden; min-width: 0;
        container-type: inline-size;
        container-name: mc;
      }

      .mc-cover {
        width: 100%; height: 80px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }

      .mc-cover-lg {
        width: 100%; height: 92px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px; flex-shrink: 0;
      }
      .media-type-tag {
        position: absolute; top: 4px; left: 4px; z-index: 2;
        background: rgba(0,0,0,0.62);
        backdrop-filter: blur(4px);
        color: rgba(255,255,255,0.92);
        font-size: 9px; font-weight: 700;
        padding: 2px 5px; border-radius: 4px;
        letter-spacing: 0.05em;
        pointer-events: none;
      }

      .mc-info { padding: 4px 7px 4px; }

      /* \u2500\u2500 See More card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .smp-card { cursor: pointer; position: relative; overflow: hidden; }
      .smp-card:hover .smp-btn { transform: scale(1.1); }

      /* Absolutn\xED kontejner pokr\xFDvaj\xEDc\xED celou kartu */
      .smp-full { position: absolute; inset: 0; }
      .smp-posters {
        display: grid; grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr; height: 100%; gap: 1px;
      }
      .smp-posters > * { width: 100%; height: 100%; }
      .smp-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.38);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px;
      }
      .smp-btn {
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(255,255,255,0.92);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.55);
        transition: transform 0.18s;
      }
      .smp-cta {
        color: #fff; font-size: 9px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.04em;
        text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      }
      .smp-count {
        color: rgba(255,255,255,0.85); font-size: 9px; font-weight: 600;
        text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      }

      /* \u2500\u2500 Full Trending Overlay (nahrazuje obsah col-right) \u2500\u2500\u2500\u2500\u2500 */
      .trending-overlay { display: flex; flex-direction: column; flex: 1; }

      .to-close {
        width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.65); font-size: 12px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .to-close:hover { background: rgba(255,255,255,0.16); color: #fff; }

      .to-grid {
        flex: 1; min-width: 0; position: relative;
        display: grid; grid-template-columns: repeat(4, 1fr);
        column-gap: 7px; row-gap: 38px; align-content: start;
      }

      /* Abs TV req overlay \u2014 pokryje \u0159\xE1dek karet */
      .to-tv-abs-overlay {
        position: absolute; left: 0; right: 0; z-index: 5;
        background: rgba(14,17,30,0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px; overflow: hidden;
      }
      /* tv-req-inner uvnit\u0159 abs overlaye \u2014 vypln\xED celou v\xFD\u0161ku */
      .to-tv-abs-overlay .tv-req-inner {
        height: 100%; box-sizing: border-box;
      }

      /* Nav \u2014 kop\xEDruje .rp-btn styl */
      .to-nav {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0 2px; gap: 8px; margin-top: 8px; flex-shrink: 0;
      }
      .to-nav-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 20px; color: rgba(255,255,255,0.65);
        font-size: 12px; font-weight: 600; padding: 5px 14px; cursor: pointer;
        display: flex; align-items: center; gap: 4px;
        backdrop-filter: blur(8px); transition: background 0.15s, color 0.15s;
      }
      .to-nav-btn:hover { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); }
      .to-nav-btn:disabled { opacity: 0.35; pointer-events: none; }
      .to-nav-btn-hidden { visibility: hidden; pointer-events: none; }
      .to-nav-dots { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
      .to-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(255,255,255,0.22); border: none; cursor: pointer; padding: 0;
        transition: background 0.25s, width 0.25s;
      }
      .to-dot:hover { background: rgba(255,255,255,0.45); }
      .to-dot.to-dot-act {
        width: 18px; border-radius: 3px;
        background: rgba(255,255,255,0.80); cursor: default; pointer-events: none;
      }

      .mc-title {
        font-size: 12px; font-weight: 700;
        color: #ffffff;
        text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        line-height: 1.3;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 2px;
      }

      .mc-sub {
        font-size: 11px; color: rgba(255,255,255,0.58);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 3px;
      }

      .mc-badges { display: flex; gap: 3px; flex-wrap: wrap; }

      /* \u2500\u2500 Badges (original shape, macOS vivid colours) \u2500\u2500 */
      .badge {
        font-size: 10px; font-weight: 800; line-height: 1;
        padding: 2px 6px; border-radius: 4px; white-space: nowrap;
        display: inline-flex; align-items: center; gap: 2px;
        color: #fff;
      }
      .b-ok      { background:rgba(48,209,88,0.30);  border:1px solid rgba(48,209,88,0.62); }
      .b-sok     { background:rgba(48,209,88,0.26);  border:1px solid rgba(48,209,88,0.55); }
      .b-sub-ok  { background:rgba(48,209,88,0.28);  border:1px solid rgba(48,209,88,0.58); }
      .b-dl      { background:rgba(10,132,255,0.30); border:1px solid rgba(10,132,255,0.62); }
      .b-ep      { background:rgba(10,132,255,0.28); border:1px solid rgba(10,132,255,0.58); }
      .b-audio   { background:rgba(10,132,255,0.26); border:1px solid rgba(10,132,255,0.55); }
      .b-partial { background:rgba(255,149,0,0.30);  border:1px solid rgba(255,149,0,0.62); }
      .b-sno     { background:rgba(255,149,0,0.26);  border:1px solid rgba(255,149,0,0.55); }
      .b-sub-miss{ background:rgba(255,149,0,0.28);  border:1px solid rgba(255,149,0,0.58); }
      .b-missing { background:rgba(255,69,58,0.30);  border:1px solid rgba(255,69,58,0.62); }
      .b-cutoff  { background:rgba(255,214,10,0.28); border:1px solid rgba(255,214,10,0.62); }

      /* \u2500\u2500 Upcoming action row \u2500\u2500 */
      .mc-act {
        display: flex; align-items: center; gap: 4px; margin-top: 3px;
        flex-wrap: nowrap; overflow: hidden;
      }

      .imdb {
        display: flex; align-items: center; gap: 2px;
        border: 1px solid rgba(255,214,10,0.45); border-radius: 4px;
        padding: 2px 6px; font-size: 10px; font-weight: 800; line-height: 1;
        color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.55); flex-shrink: 0;
        background: rgba(255,214,10,0.10);
      }

      /* Datum se smrskne pokud nen\xED m\xEDsto, ale nezalamuje se */
      .date-lbl {
        font-size: 10px; color: rgba(255,255,255,0.52);
        flex: 0 1 auto; white-space: nowrap; min-width: 0;
      }

      .btn-add {
        background: rgba(var(--accent-rgb),0.28); color: #fff;
        font-size: 10px; font-weight: 800; line-height: 1; padding: 2px 6px;
        border-radius: 4px; border: 1px solid rgba(var(--accent-rgb),0.50);
        cursor: pointer; flex-shrink: 0; margin-left: auto;
        backdrop-filter: blur(8px);
      }

      .btn-add:hover { background: rgba(var(--accent-rgb),0.45); }

      /* \u2500\u2500 Status badges v mc-act (stejn\xFD styl jako .badge v knihovn\u011B) \u2500\u2500 */
      .b-st-avail { background: rgba(48,209,88,0.30);  border: 1px solid rgba(48,209,88,0.62); }
      .b-st-pend  { background: rgba(255,149,0,0.30);  border: 1px solid rgba(255,149,0,0.62); }
      .b-st-proc  { background: rgba(10,132,255,0.30); border: 1px solid rgba(10,132,255,0.62); }
      .mc-act .badge { margin-left: auto; flex-shrink: 0; }
      /* Tla\u010D\xEDtko sta\u017Een\xED vlastn\xED \u017E\xE1dosti (neadmin) */
      .req-withdraw {
        display: inline-flex; align-items: center; justify-content: center;
        width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0;
        background: rgba(255,69,58,0.22); border: 1px solid rgba(255,69,58,0.40);
        color: #ff453a; font-size: 9px; font-weight: 900; cursor: pointer;
        margin-left: 2px;
      }
      .req-withdraw:hover { background: rgba(255,69,58,0.42); }
      .mc-act-right { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; }

      /* \u2500\u2500 Adaptivn\xED layout chip\u016F \u2014 container queries \u2500\u2500
         Priorita: 1. zmen\u0161it padding  2. schovat datum
      */
      /* .badge-compact se p\u0159id\xE1 JavaScriptem pokud badge \u0159\xE1dek p\u0159et\xE9k\xE1 */
      .badge-compact .b-txt { display: none; }
      @container mc (max-width: 94px) {
        .imdb { padding: 2px 3px; font-size: 9px; }
        .btn-add { padding: 2px 4px; font-size: 9px; }
      }
      @container mc (max-width: 78px) {
        .date-lbl { display: none; }
      }

      /* \u2500\u2500 Request quality overlay \u2500\u2500 */
      .req-overlay {
        position: absolute; inset: 0; z-index: 10;
        background: rgba(15,15,20,0.88);
        backdrop-filter: blur(8px);
        border-radius: 11px;
        display: flex; align-items: center; justify-content: center;
        animation: fade-in 0.15s ease;
      }
      .req-inner {
        display: flex; flex-direction: column; gap: 7px;
        padding: 10px 10px 8px; width: 100%;
      }
      .req-label {
        font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.55);
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .req-select {
        width: 100%; background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.22); border-radius: 6px;
        color: #fff; font-size: 11px; font-weight: 600;
        padding: 4px 6px; cursor: pointer; outline: none;
        appearance: none; -webkit-appearance: none;
      }
      .req-select option { background: #1c1c2e; color: #fff; }
      .req-actions {
        display: flex; gap: 5px; margin-top: 1px;
      }
      .req-cancel {
        flex: 1; background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.20); border-radius: 5px;
        color: rgba(255,255,255,0.70); font-size: 10px; font-weight: 700;
        padding: 4px 0; cursor: pointer;
      }
      .req-cancel:hover { background: rgba(255,255,255,0.14); }
      .req-confirm {
        flex: 2; background: rgba(var(--accent-rgb),0.35);
        border: 1px solid rgba(var(--accent-rgb),0.55); border-radius: 5px;
        color: #fff; font-size: 10px; font-weight: 800;
        padding: 4px 0; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 3px;
      }
      .req-confirm:hover { background: rgba(var(--accent-rgb),0.52); }
      .req-confirm:disabled, .req-cancel:disabled { opacity: 0.5; cursor: default; }
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

      /* \u2500\u2500 \u010Cekaj\xEDc\xED \u017E\xE1dosti (admin) \u2500\u2500 */
      .pr-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 18px; border-radius: 9px; padding: 0 5px;
        background: rgba(255,69,58,0.80); color: #fff;
        font-size: 10px; font-weight: 900; margin-left: 4px; flex-shrink: 0;
      }
      /* Meta \u0159\xE1dek: typ + kdo \u017E\xE1dal */
      .pr-meta-row {
        display: flex; align-items: center; gap: 4px; margin-bottom: 3px;
        flex-wrap: nowrap; overflow: hidden;
      }
      .pr-type-lbl {
        font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.55);
        white-space: nowrap; flex-shrink: 0;
      }
      .pr-requester {
        font-size: 9px; color: rgba(255,255,255,0.50);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
      }
      /* \u0158\xE1dek tla\u010D\xEDtek \u2014 v\u017Edy cel\xE1 \u0161\xED\u0159ka, ka\u017Ed\xE9 tla\u010D\xEDtko bere 50% */
      .pr-btn-row {
        display: flex; gap: 4px; margin-top: 1px;
      }
      .pr-approve, .pr-decline {
        flex: 1; display: inline-flex; align-items: center; justify-content: center;
        gap: 3px;
        border-radius: 4px; font-size: 10px; font-weight: 800; line-height: 1;
        padding: 3px 4px; cursor: pointer; white-space: nowrap; color: #fff;
      }
      .pr-approve {
        background: rgba(48,209,88,0.28); border: 1px solid rgba(48,209,88,0.50);
      }
      .pr-approve:hover { background: rgba(48,209,88,0.50); }
      .pr-decline {
        background: rgba(255,69,58,0.25); border: 1px solid rgba(255,69,58,0.45);
      }
      .pr-decline:hover { background: rgba(255,69,58,0.45); }
      .pr-approve:disabled, .pr-decline:disabled { opacity: 0.5; cursor: default; }
      /* P\u0159i \xFAzk\xE9m kontejneru schovat texty \u2014 z\u016Fstanou jen ikony */
      @container mc (max-width: 110px) {
        .st-txt { display: none; }
        .pr-approve, .pr-decline { padding: 3px 6px; }
      }

      /* \u2500\u2500 TV Request Overlay \u2500\u2500 */
      .tv-req-overlay { align-items: stretch; padding: 0; }
      .tv-req-inner {
        display: flex; flex-direction: column; gap: 8px;
        padding: 10px 10px 8px; width: 100%;
      }
      .tv-req-top {
        display: flex; gap: 8px; align-items: flex-start;
      }
      .tv-req-poster {
        width: 36px; height: 54px; object-fit: cover;
        border-radius: 4px; flex-shrink: 0;
      }
      .tv-req-poster-ph {
        width: 36px; height: 54px; border-radius: 4px; flex-shrink: 0;
        background: rgba(255,255,255,0.08); display: flex;
        align-items: center; justify-content: center; font-size: 20px;
      }
      .tv-req-info { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
      .tv-req-title {
        font-size: 11px; font-weight: 700; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* Season switches nav */
      .sv-nav-wrap {
        display: flex; align-items: center; gap: 4px;
      }
      .sv-scroll {
        flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
        scrollbar-width: none; gap: 0;
      }
      .sv-scroll::-webkit-scrollbar { display: none; }
      .sv-page {
        min-width: 100%; scroll-snap-align: start;
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; padding: 2px 0;
      }

      /* Single switch */
      .sv-wrap {
        display: flex; flex-direction: column; align-items: center;
        gap: 3px; cursor: pointer; user-select: none;
      }
      .sv-input { display: none; }
      .sv-track {
        width: 28px; height: 16px; border-radius: 8px;
        background: rgba(255,255,255,0.18);
        position: relative; transition: background 0.18s; flex-shrink: 0;
      }
      .sv-thumb {
        position: absolute; top: 2px; left: 2px;
        width: 12px; height: 12px; border-radius: 50%;
        background: #fff; transition: transform 0.18s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      }
      .sv-input:checked + .sv-track { background: rgba(48,209,88,0.75); }
      .sv-input:checked + .sv-track .sv-thumb { transform: translateX(12px); }
      .sv-lbl { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.65); }

      /* Chevron buttons */
      .sv-chev {
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
        border-radius: 5px; color: #fff; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; flex-shrink: 0; padding: 0;
      }
      .sv-chev:disabled { opacity: 0.28; cursor: default; }
      .sv-chev:not(:disabled):hover { background: rgba(255,255,255,0.16); }

      /* Page dots */
      .sv-dots {
        display: flex; justify-content: center; gap: 5px; padding: 1px 0;
      }
      .sv-dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: rgba(255,255,255,0.25); transition: background 0.15s;
      }
      .sv-dot-active { background: rgba(255,255,255,0.80); }

      /* \u2500\u2500 Placeholder \u2500\u2500 */
      .placeholder {
        font-size: 12px; color: rgba(255,255,255,0.35);
        padding: 8px 4px; text-align: center;
      }

      /* \u2500\u2500 Cover gradient placeholders \u2500\u2500 */
      .ca{background:linear-gradient(150deg,#2a1660,#6b35b8);}
      .cb{background:linear-gradient(150deg,#0d2a5e,#1a5faa);}
      .cc{background:linear-gradient(150deg,#0d3318,#1e7a38);}
      .cd{background:linear-gradient(150deg,#3a0e0e,#8a2020);}
      .ce{background:linear-gradient(150deg,#0d2e2e,#1a7a60);}
      .cf{background:linear-gradient(150deg,#2e1a06,#7a4a18);}
      .cg{background:linear-gradient(150deg,#1e0e2e,#5a1880);}
      .ch{background:linear-gradient(150deg,#0e1e1e,#0e5858);}
      .ci{background:linear-gradient(150deg,#2e0e14,#782040);}
      .cj{background:linear-gradient(150deg,#0e0e28,#201880);}
      .ck{background:linear-gradient(150deg,#1a0e28,#580868);}
      .cl{background:linear-gradient(150deg,#0e2618,#0e5a28);}
      .cm{background:linear-gradient(150deg,#221a22,#503060);}
      .cn{background:linear-gradient(150deg,#261818,#583a28);}
      .co{background:linear-gradient(150deg,#182228,#284e42);}
      .cp{background:linear-gradient(150deg,#221e0a,#584e20);}
      .cq{background:linear-gradient(150deg,#0a0c28,#181e60);}
      .cr{background:linear-gradient(150deg,#280c08,#681808);}

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         POPUP OVERLAY
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .popup-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: var(--is-overlay-bg, rgba(0,0,0,0.60));
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* \u2500\u2500 Popup day/night CSS custom properties \u2500\u2500 */
      .popup-overlay {
        --is-blue:       #0a84ff;
        --is-green:      #30d158;
        --is-red:        #ff453a;
        --is-orange:     #ff9500;
        --is-purple:     #bf5af2;
        --is-overlay-bg: var(--overlay-bg, rgba(0,0,0,0.55));
        --is-glass-bg:   var(--popup-bg, rgba(255,255,255,0.05));
        --is-glass-bdr:  rgba(255,255,255,0.25);
        --is-glass-blur: blur(35px) saturate(100%);
        --is-shine:      linear-gradient(120deg,rgba(255,255,255,0.55),rgba(255,255,255,0.15) 25%,rgba(255,255,255,0.05) 50%,transparent 70%);
        --is-shine-op:   0.35;
        --is-text:       rgba(255,255,255,1);
        --is-text-sec:   rgba(255,255,255,0.55);
        --is-text-body:  rgba(255,255,255,0.75);
        --is-text-muted: rgba(255,255,255,0.28);
        --is-text-label: rgba(255,255,255,0.22);
        --is-divider:    rgba(255,255,255,0.10);
        --is-row-hover:  rgba(255,255,255,0.04);
        --is-hdr-bg:     rgba(10,12,22,0.80);
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(255,255,255,0.08);
        --is-btn-bdr:    rgba(255,255,255,0.18);
        --is-btn-clr:    rgba(255,255,255,0.70);
        --is-btn-hbg:    rgba(255,255,255,0.15);
        --is-btn-hclr:   #fff;
        --is-btn-abg:    rgba(10,132,255,0.18);
        --is-btn-abdr:   rgba(10,132,255,0.40);
        --is-btn-aclr:   rgba(100,180,255,0.95);
        --is-fade-btm:   rgba(20,20,30,0.98);
        --is-close-bg:   rgba(0,0,0,0.50);
        --is-backdrop-f: brightness(0.55);
        --is-rej-clr:    rgba(255,149,0,0.80);
        --is-peers-s:    rgba(48,209,88,0.90);
        --is-peers-l:    rgba(255,69,58,0.80);
        --is-score-pos:  rgba(48,209,88,0.95);
        --is-score-neg:  rgba(255,69,58,0.90);
        --is-score-zer:  rgba(255,255,255,0.28);
        --is-src-tor-bg: rgba(48,209,88,0.18);  --is-src-tor-bdr: rgba(48,209,88,0.40);  --is-src-tor-clr: rgba(100,230,140,0.95);
        --is-src-nzb-bg: rgba(10,132,255,0.18); --is-src-nzb-bdr: rgba(10,132,255,0.40); --is-src-nzb-clr: rgba(80,160,255,0.95);
        --is-q4k-bg:     rgba(191,90,242,0.22); --is-q4k-bdr: rgba(191,90,242,0.55); --is-q4k-clr: rgba(210,140,255,0.95);
        --is-q1080-bg:   rgba(10,132,255,0.22); --is-q1080-bdr: rgba(10,132,255,0.55); --is-q1080-clr: rgba(90,170,255,0.95);
        --is-q720-bg:    rgba(90,200,250,0.20); --is-q720-bdr: rgba(90,200,250,0.50); --is-q720-clr: rgba(120,210,255,0.90);
        --is-lang-bg:    rgba(255,255,255,0.07); --is-lang-bdr: rgba(255,255,255,0.13); --is-lang-clr: rgba(255,255,255,0.42);
        --is-grab-bg:    rgba(10,132,255,0.12); --is-grab-bdr: rgba(10,132,255,0.32); --is-grab-clr: rgba(80,160,255,0.9);
        --is-grab-hbg:   rgba(10,132,255,0.28); --is-grab-hbdr: rgba(10,132,255,0.55); --is-grab-hclr: #fff;
        --is-grab-f-bg:  rgba(255,149,0,0.10);  --is-grab-f-bdr: rgba(255,149,0,0.32); --is-grab-f-clr: rgba(255,149,0,0.80);
        --is-grab-done-bg:  rgba(48,209,88,0.18); --is-grab-done-bdr: rgba(48,209,88,0.40); --is-grab-done-clr: rgba(48,209,88,0.9);
        --is-confirm-yes-bg:  rgba(10,132,255,0.18); --is-confirm-yes-clr: rgba(100,180,255,0.95);
        --is-confirm-no-bg:   rgba(255,69,58,0.12);  --is-confirm-no-clr:  rgba(255,100,90,0.90);
      }

      /* Denn\xED re\u017Eim (sun.sun = above_horizon) */
      .popup-overlay.popup-day {
        --is-overlay-bg: rgba(255,255,255,0.65);
        --is-glass-bg:   rgba(255,255,255,0.78);
        --is-glass-bdr:  rgba(255,255,255,0.90);
        --is-glass-blur: blur(40px) saturate(200%);
        --is-shine:      linear-gradient(120deg,rgba(255,255,255,0.95),rgba(255,255,255,0.50) 25%,rgba(255,255,255,0.15) 50%,transparent 70%);
        --is-shine-op:   0.65;
        --is-text:       rgba(0,0,0,0.88);
        --is-text-sec:   rgba(0,0,0,0.48);
        --is-text-body:  rgba(0,0,0,0.65);
        --is-text-muted: rgba(0,0,0,0.32);
        --is-text-label: rgba(0,0,0,0.28);
        --is-divider:    rgba(0,0,0,0.08);
        --is-row-hover:  rgba(0,0,0,0.03);
        --is-hdr-bg:     rgba(240,242,255,0.82);
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(0,0,0,0.05);
        --is-btn-bdr:    rgba(0,0,0,0.12);
        --is-btn-clr:    rgba(0,0,0,0.55);
        --is-btn-hbg:    rgba(0,0,0,0.09);
        --is-btn-hclr:   rgba(0,0,0,0.88);
        --is-btn-abg:    rgba(10,132,255,0.12);
        --is-btn-abdr:   rgba(10,132,255,0.35);
        --is-btn-aclr:   rgba(0,100,220,0.90);
        --is-fade-btm:   rgba(255,255,255,0.95);
        --is-close-bg:   rgba(0,0,0,0.12);
        --is-backdrop-f: brightness(0.72) saturate(0.85);
        --is-rej-clr:    rgba(180,90,0,0.85);
        --is-peers-s:    rgba(0,160,60,0.85);
        --is-peers-l:    rgba(200,40,30,0.80);
        --is-score-pos:  rgba(0,160,60,0.90);
        --is-score-neg:  rgba(200,40,30,0.90);
        --is-score-zer:  rgba(0,0,0,0.28);
        --is-src-tor-bg: rgba(48,209,88,0.14);  --is-src-tor-bdr: rgba(48,209,88,0.45);  --is-src-tor-clr: rgba(0,130,50,0.90);
        --is-src-nzb-bg: rgba(10,132,255,0.12); --is-src-nzb-bdr: rgba(10,132,255,0.45); --is-src-nzb-clr: rgba(0,80,200,0.90);
        --is-q4k-bg:     rgba(191,90,242,0.13); --is-q4k-bdr: rgba(191,90,242,0.50); --is-q4k-clr: rgba(110,10,190,0.90);
        --is-q1080-bg:   rgba(10,132,255,0.12); --is-q1080-bdr: rgba(10,132,255,0.50); --is-q1080-clr: rgba(0,80,200,0.90);
        --is-q720-bg:    rgba(90,200,250,0.14); --is-q720-bdr: rgba(90,200,250,0.50); --is-q720-clr: rgba(0,100,170,0.85);
        --is-lang-bg:    rgba(0,0,0,0.06);      --is-lang-bdr: rgba(0,0,0,0.12);     --is-lang-clr: rgba(0,0,0,0.48);
        --is-grab-bg:    rgba(10,132,255,0.10); --is-grab-bdr: rgba(10,132,255,0.35); --is-grab-clr: rgba(0,80,200,0.90);
        --is-grab-hbg:   rgba(10,132,255,0.22); --is-grab-hbdr: rgba(10,132,255,0.60); --is-grab-hclr: #fff;
        --is-grab-f-bg:  rgba(255,149,0,0.10);  --is-grab-f-bdr: rgba(255,149,0,0.40); --is-grab-f-clr: rgba(160,80,0,0.90);
        --is-grab-done-bg:  rgba(48,209,88,0.14); --is-grab-done-bdr: rgba(48,209,88,0.45); --is-grab-done-clr: rgba(0,130,50,0.90);
        --is-confirm-yes-bg:  rgba(10,132,255,0.15); --is-confirm-yes-clr: rgba(0,80,200,0.90);
        --is-confirm-no-bg:   rgba(255,69,58,0.10);  --is-confirm-no-clr:  rgba(180,40,30,0.90);
      }

      .popup-glass {
        position: relative;
        width: min(800px, 90vw);
        max-height: 85vh;
        border-radius: 28px;
        background: var(--is-glass-bg);
        backdrop-filter: var(--is-glass-blur);
        -webkit-backdrop-filter: var(--is-glass-blur);
        border: 1px solid var(--is-glass-bdr);
        box-shadow: 0 15px 40px rgba(0,0,0,0.20), inset 0 2px 3px rgba(0,0,0,0.04);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: width 0.3s cubic-bezier(.25,.46,.45,.94);
      }
      /* Gradient shine \u2014 p\u0159esn\u011B jako .col::before */
      .popup-glass::before {
        content: ""; position: absolute; inset: 0; border-radius: 28px;
        background: var(--is-shine); opacity: var(--is-shine-op);
        pointer-events: none; z-index: 0;
      }
      .popup-glass > * { position: relative; z-index: 1; }
      /* Wider modal p\u0159i IS v\xFDsledc\xEDch */
      .popup-glass.is-wide { width: min(900px, 94vw); }

      /* Scrollable body below the backdrop */
      .popup-body {
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .popup-close {
        position: absolute;
        top: 12px;
        right: 14px;
        z-index: 10;
        background: var(--accent);
        border: none;
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(10,132,255,0.45);
        transition: background 0.15s, transform 0.1s;
      }

      .popup-close:hover { background: #0071e3; transform: scale(1.08); }
      .popup-close:active { transform: scale(0.94); }

      .popup-backdrop {
        position: relative;
        width: 100%;
        height: 200px;
        background-size: cover;
        background-position: center top;
        flex-shrink: 0;
      }

      .popup-backdrop-fade {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 90px;
        background: linear-gradient(to bottom, transparent, var(--is-fade-btm));
        pointer-events: none;
      }

      .popup-content {
        display: flex;
        gap: 16px;
        padding: 12px 16px 16px;
        overflow-y: auto;
      }

      .popup-poster {
        width: 90px;
        height: 135px;
        border-radius: 10px;
        object-fit: cover;
        flex-shrink: 0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        margin-top: -28px; /* overlap the backdrop fade */
      }

      .popup-meta { flex: 1; min-width: 0; }

      /* Trailer \u2014 YouTube thumbnail link */
      .popup-yt-thumb {
        display: block;
        position: relative;
        width: 100%;
        height: clamp(140px, 28vh, 210px);
        text-decoration: none;
        flex-shrink: 0;
        overflow: hidden;
      }

      .popup-yt-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 30%;
        display: block;
      }

      .popup-yt-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.40);
        transition: background 0.15s;
      }

      .popup-yt-thumb:hover .popup-yt-overlay {
        background: rgba(0,0,0,0.18);
      }

      .popup-yt-btn {
        background: rgba(200,0,0,0.88);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        padding: 9px 22px;
        border-radius: 8px;
        letter-spacing: 0.02em;
      }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         POPUP \u2014 IS BUTTON + ADMIN BADGE
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .popup-title   { font-size: 18px; font-weight: 800; color: var(--is-text); margin: 0 0 5px; line-height: 1.2; }
      .popup-sub     { font-size: 11px; color: var(--is-text-sec); margin-bottom: 10px; }
      .popup-overview { font-size: 11px; color: var(--is-text-body); line-height: 1.65; margin: 0 0 12px; }

      .is-open-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 12px 5px 9px; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-btn-clr); font-size: 11px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        margin-top: 4px;
      }
      .is-open-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-open-btn.active { background: var(--is-btn-abg); border-color: var(--is-btn-abdr); color: var(--is-btn-aclr); }

      .is-admin-badge {
        font-size: 8px; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.05em; padding: 1px 5px; border-radius: 4px;
        background: rgba(255,149,0,0.20); border: 1px solid rgba(255,149,0,0.40);
        color: rgba(255,149,0,0.90); margin-left: 1px;
      }
      .popup-day .is-admin-badge {
        background: rgba(255,149,0,0.14); border-color: rgba(255,149,0,0.40);
        color: rgba(160,80,0,0.90);
      }

      /* IS confirm-add panel */
      .is-confirm-wrap {
        display: flex; flex-direction: column; align-items: center;
        gap: 14px; padding: 24px 20px; text-align: center;
      }
      .is-confirm-msg {
        font-size: 13px; color: var(--is-text-body); line-height: 1.55;
        max-width: 260px;
      }
      .is-confirm-actions {
        display: flex; gap: 12px;
      }
      .is-confirm-btn {
        width: 38px; height: 38px; border-radius: 50%;
        border: 1px solid; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, transform .1s;
      }
      .is-confirm-btn:hover { transform: scale(1.08); }
      .is-confirm-yes {
        background: var(--is-grab-done-bg);
        border-color: var(--is-grab-done-bdr);
        color: var(--is-grab-done-clr);
      }
      .is-confirm-yes:hover { background: rgba(48,209,88,0.30); }
      .is-confirm-no {
        background: var(--is-confirm-no-bg);
        border-color: var(--is-confirm-no-clr);
        color: var(--is-confirm-no-clr);
      }
      .is-confirm-no:hover { background: rgba(255,69,58,0.20); }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         INTERACTIVE SEARCH PANEL
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .is-panel {
        display: flex; flex-direction: column;
        border-top: 1px solid var(--is-divider);
        max-height: 380px; overflow: hidden;
        flex-shrink: 0;
      }
      .is-panel-hdr {
        display: flex; align-items: center; gap: 8px;
        padding: 7px 16px 6px;
        border-bottom: 1px solid var(--is-divider);
        flex-shrink: 0;
      }
      .is-panel-title {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.09em; color: var(--is-text-label);
      }
      .is-count { font-size: 10px; color: var(--is-text-muted); margin-right: auto; }

      .is-filter { display: flex; gap: 4px; }
      .is-f-btn {
        padding: 3px 10px; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: transparent;
        color: var(--is-text-muted); font-size: 10px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.13s, color 0.13s; letter-spacing: 0.02em;
      }
      .is-f-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-f-btn.active { background: var(--is-btn-bg); border-color: var(--is-btn-bdr); color: var(--is-text); }

      .is-loading {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 10px;
        padding: 36px 20px; color: var(--is-text-muted); font-size: 11px;
      }

      /* Results scroll container */
      .is-results-wrap { overflow-y: auto; flex: 1; min-height: 0; }

      /* \u2500\u2500 TABLE \u2500\u2500 */
      .is-table { width: 100%; border-collapse: collapse; }
      .is-table thead th {
        padding: 5px 8px; text-align: left; font-size: 9px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.09em; color: var(--is-text-label);
        border-bottom: 1px solid var(--is-divider); white-space: nowrap;
        position: sticky; top: 0;
        background: var(--is-hdr-bg); backdrop-filter: var(--is-hdr-blur);
        -webkit-backdrop-filter: var(--is-hdr-blur);
      }
      .is-table thead th:first-child { padding-left: 16px; }
      .is-table thead th:last-child  { padding-right: 16px; }
      .is-table tbody tr { border-bottom: 1px solid var(--is-divider); transition: background 0.10s; }
      .is-table tbody tr:hover { background: var(--is-row-hover); }
      .is-table td { padding: 7px 8px; vertical-align: middle; }
      .is-table td:first-child { padding-left: 16px; }
      .is-table td:last-child  { padding-right: 16px; }

      /* \u2500\u2500 CARDS (mobile) \u2500\u2500 */
      .is-card {
        padding: 9px 14px; border-bottom: 1px solid var(--is-divider);
        display: flex; flex-direction: column; gap: 4px; transition: background 0.10s;
      }
      .is-card:hover { background: var(--is-row-hover); }
      .is-ic-r1 { display: flex; align-items: center; gap: 5px; }
      .is-ic-spacer { flex: 1; min-width: 4px; }
      .is-ic-title {
        font-size: 10px; font-weight: 500; color: var(--is-text-body);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .is-ic-meta {
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
        font-size: 9px; color: var(--is-text-muted);
      }
      .is-ic-meta .sep { opacity: 0.5; }
      .is-ic-rej { font-size: 9px; color: var(--is-rej-clr); }

      /* \u2500\u2500 Shared atoms \u2500\u2500 */
      .is-src-pill {
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 8px; font-weight: 800; padding: 2px 5px; border-radius: 5px;
        letter-spacing: 0.04em; white-space: nowrap; border: 1px solid transparent;
      }
      .is-src-tor { background: var(--is-src-tor-bg); border-color: var(--is-src-tor-bdr); color: var(--is-src-tor-clr); }
      .is-src-nzb { background: var(--is-src-nzb-bg); border-color: var(--is-src-nzb-bdr); color: var(--is-src-nzb-clr); }

      .is-q-pill {
        display: inline-flex; align-items: center; border-radius: 999px;
        border: 1px solid transparent; font-weight: 700; font-size: 9px;
        white-space: nowrap; padding: 2px 7px; letter-spacing: 0.03em;
      }
      .is-q-4k   { background: var(--is-q4k-bg);   border-color: var(--is-q4k-bdr);   color: var(--is-q4k-clr);   }
      .is-q-1080 { background: var(--is-q1080-bg); border-color: var(--is-q1080-bdr); color: var(--is-q1080-clr); }
      .is-q-720  { background: var(--is-q720-bg);  border-color: var(--is-q720-bdr);  color: var(--is-q720-clr);  }
      .is-q-sd   { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); color: var(--is-text-muted); }

      .is-score { font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .is-s-pos  { color: var(--is-score-pos); }
      .is-s-neg  { color: var(--is-score-neg); }
      .is-s-zero { color: var(--is-score-zer); }

      .is-rel-title {
        display: block; font-size: 11px; font-weight: 500; color: var(--is-text-body);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;
      }
      .is-rel-age  { font-size: 9px; color: var(--is-text-muted); margin-top: 1px; display: block; }
      .is-rej-row  { font-size: 9px; color: var(--is-rej-clr); margin-top: 2px; display: block; }
      .is-indexer  { font-size: 10px; color: var(--is-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; display: block; }
      .is-size     { font-size: 10px; color: var(--is-text-sec); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .is-peers    { display: flex; align-items: center; gap: 2px; font-size: 10px; white-space: nowrap; }
      .is-peers .is-s { color: var(--is-peers-s); font-weight: 700; }
      .is-peers .is-l { color: var(--is-peers-l); font-weight: 700; }
      .is-peers-na { font-size: 10px; color: var(--is-text-muted); }
      .is-lang-chip {
        font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 5px;
        background: var(--is-lang-bg); border: 1px solid var(--is-lang-bdr);
        color: var(--is-lang-clr); text-transform: uppercase; letter-spacing: 0.03em;
      }

      /* Grab button */
      .is-grab-btn {
        width: 28px; height: 28px; border-radius: 9px;
        border: 1px solid var(--is-grab-bdr); background: var(--is-grab-bg);
        color: var(--is-grab-clr); display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.14s; flex-shrink: 0; margin: 0 auto;
        backdrop-filter: blur(8px);
      }
      .is-grab-btn:hover:not(:disabled) { background: var(--is-grab-hbg); border-color: var(--is-grab-hbdr); color: var(--is-grab-hclr); }
      .is-grab-btn.force { background: var(--is-grab-f-bg); border-color: var(--is-grab-f-bdr); color: var(--is-grab-f-clr); }
      .is-grab-btn.force:hover:not(:disabled) { background: rgba(255,149,0,0.25); color: #fff; }
      .is-grab-btn.is-grab-done { background: var(--is-grab-done-bg); border-color: var(--is-grab-done-bdr); color: var(--is-grab-done-clr); cursor: default; }
      .is-grab-btn.is-grab-failed { background: rgba(255,69,58,0.12); border-color: rgba(255,69,58,0.35); color: rgba(255,69,58,0.90); }
      .is-grab-btn.is-grab-failed:hover { background: rgba(255,69,58,0.22); border-color: rgba(255,69,58,0.55); color: #fff; }
      .is-grab-btn:disabled { opacity: 0.6; cursor: default; }

      /* Confirm wrap (inline 2-button potvrzen\xED) */
      .is-confirm-wrap { display: flex; gap: 4px; align-items: center; justify-content: center; }
      .is-confirm-yes {
        padding: 3px 8px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        background: var(--is-confirm-yes-bg); border: 1px solid var(--is-btn-abdr);
        color: var(--is-confirm-yes-clr); transition: all 0.13s;
      }
      .is-confirm-yes.force { background: var(--is-grab-f-bg); border-color: var(--is-grab-f-bdr); color: var(--is-grab-f-clr); }
      .is-confirm-yes:hover { filter: brightness(1.2); }
      .is-confirm-no {
        padding: 3px 7px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        background: var(--is-confirm-no-bg); border: 1px solid rgba(255,69,58,0.25);
        color: var(--is-confirm-no-clr); transition: all 0.13s;
      }
      .is-confirm-no:hover { filter: brightness(1.2); }

      /* \u2500\u2500 Mobile IS grab button (larger) \u2500\u2500 */
      .is-ic-r1 .is-grab-btn { width: 30px; height: 30px; margin: 0; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         RIGHT COLUMN PAGE NAV
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .rp-sections { flex: 1; }
      .rp-nav {
        position: relative;
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0 2px; gap: 8px;
        margin-top: auto;
      }
      .rp-dots {
        display: flex; align-items: center; gap: 5px; flex-shrink: 0;
      }
      .rp-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(255,255,255,0.22); border: none;
        cursor: pointer; padding: 0; flex-shrink: 0;
        transition: background 0.25s ease;
      }
      .rp-dot:hover { background: rgba(255,255,255,0.45); }
      .rp-dot-active {
        width: 18px; border-radius: 3px;
        background: rgba(255,255,255,0.80);
        cursor: default; pointer-events: none;
        animation: dot-expand 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      @keyframes dot-expand {
        from { width: 6px; opacity: 0.3; }
        to   { width: 18px; opacity: 1; }
      }
      .rp-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 20px;
        color: rgba(255,255,255,0.65);
        font-size: 12px; font-weight: 600;
        padding: 5px 14px;
        cursor: pointer;
        display: flex; align-items: center; gap: 4px;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .rp-btn:hover {
        background: rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.9);
      }
      .rp-btn-hidden { visibility: hidden; pointer-events: none; }

      @keyframes rp-ping {
        0%   { box-shadow: 0 0 0 0 rgba(10,132,255,0.85); }
        70%  { box-shadow: 0 0 0 12px rgba(10,132,255,0); }
        100% { box-shadow: 0 0 0 0 rgba(10,132,255,0); }
      }
      .rp-btn-ping { animation: rp-ping 0.8s ease-out 1; }

      /* \u2500\u2500 Responsive \u2500\u2500 */

      /* Tablet portrait: stack columns */
      @media (max-width: 900px) {
        .card-body { grid-template-columns: 1fr; }

        /* Floating sticky nav \u2014 glass pill, fade-in po nascrollov\xE1n\xED */
        .rp-nav {
          position: sticky;
          bottom: 12px;
          z-index: 10;
          align-self: stretch;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(35px) saturate(180%);
          -webkit-backdrop-filter: blur(35px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 20px;
          padding: 8px 12px;
          margin: 10px 0 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.38);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .rp-nav.rp-nav-visible {
          opacity: 1;
          pointer-events: auto;
        }
        /* Gradient shine */
        .rp-nav::before {
          content: "";
          position: absolute; inset: 0; border-radius: 20px;
          background: linear-gradient(
            120deg,
            rgba(255,255,255,0.55),
            rgba(255,255,255,0.15) 25%,
            rgba(255,255,255,0.05) 50%,
            transparent 70%
          );
          opacity: 0.35; pointer-events: none; z-index: 0;
        }
        .rp-nav > * { position: relative; z-index: 1; }
        .rp-nav .rp-btn {
          color: rgba(255,255,255,0.88);
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.22);
          backdrop-filter: none;
        }
        .rp-nav .rp-btn:hover {
          background: rgba(255,255,255,0.18);
          color: #fff;
        }
        .rp-nav .rp-dot { background: rgba(255,255,255,0.30); }
        .rp-nav .rp-dot-active { background: rgba(255,255,255,0.90); }
      }

      /* Large phone: mgrid 3 col */
      @media (max-width: 700px) {
        .mgrid   { grid-template-columns: repeat(3, 1fr); }
        .dl-name { max-width: calc(100vw - 120px); }
        /* badges stay on one row \u2014 clip overflow */
        .mc-badges { flex-wrap: nowrap; overflow: hidden; }
        .badge     { font-size: 9px; padding: 0 3px; flex-shrink: 0; }
      }

      /* Small phone: mgrid 2 col */
      @media (max-width: 480px) {
        .mgrid   { grid-template-columns: repeat(2, 1fr); }
        .to-grid { grid-template-columns: repeat(2, 1fr); }
        .disk-row    { flex-wrap: wrap; }
        .disk-chip   { min-width: calc(50% - 3px); }
        .col         { border-radius: 24px; padding: 12px; }
        .col::before { border-radius: 24px; }
        .card-body   { gap: 8px; padding: 0 8px 8px; }
        /* even smaller badges in 2-col grid */
        .badge { font-size: 8px; padding: 0 2px; }
        .badge ha-icon { --mdc-icon-size: 8px !important; }
      }

      /* \u2500\u2500 Sonarr Interactive Search \u2500\u2500 */

      .sn-is-section {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sn-seasons-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--is-text-label);
        margin-bottom: 4px;
      }

      /* Season row */
      .sn-season-row {
        border-radius: 8px;
        overflow: hidden;
        background: var(--is-row-hover);
      }

      .sn-season-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        min-height: 36px;
      }

      .sn-expand {
        background: none;
        border: none;
        cursor: pointer;
        padding: 3px;
        display: flex;
        align-items: center;
        color: var(--is-btn-clr);
        flex-shrink: 0;
      }
      .sn-expand:hover { color: var(--is-btn-hclr); }

      .sn-season-chevron {
        transition: transform .2s;
      }
      .sn-season-chevron.open {
        transform: rotate(180deg);
      }

      .sn-season-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--is-text);
        flex-shrink: 0;
      }

      .sn-season-stat {
        font-size: 10px;
        color: var(--is-text-muted);
        flex-shrink: 0;
      }

      .sn-season-bar {
        flex: 1;
        height: 3px;
        background: var(--is-divider);
        border-radius: 2px;
        overflow: hidden;
        min-width: 30px;
      }
      .sn-season-bar-fill {
        height: 100%;
        background: var(--is-blue, #3b82f6);
        border-radius: 2px;
      }

      /* Person icon button */
      .btn-person {
        background: var(--is-btn-bg);
        border: 1px solid var(--is-btn-bdr);
        border-radius: 5px;
        cursor: pointer;
        padding: 4px 6px;
        color: var(--is-btn-clr);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        transition: background .15s, color .15s, border-color .15s;
      }
      .btn-person:hover {
        background: var(--is-btn-hbg);
        color: var(--is-btn-hclr);
        border-color: var(--is-btn-bdr);
      }
      .btn-person.active {
        background: var(--is-btn-abg);
        border-color: var(--is-btn-abdr);
        color: var(--is-btn-aclr);
      }
      .btn-person-sm {
        padding: 3px 5px;
      }

      /* Episodes panel */
      .sn-episodes {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 0 8px 6px;
      }

      .sn-episodes-loading {
        align-items: center;
        justify-content: center;
        min-height: 32px;
        flex-direction: row;
        gap: 8px;
      }

      .sn-ep-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 4px;
        border-radius: 5px;
        flex-wrap: wrap;
      }
      .sn-ep-row:hover { background: var(--is-row-hover); }
      .sn-ep-row.has-file .sn-ep-num { color: var(--is-green); }

      .sn-ep-num {
        font-size: 10px;
        font-family: monospace;
        color: var(--is-text-sec);
        flex-shrink: 0;
        min-width: 56px;
      }

      .sn-ep-title {
        font-size: 11px;
        color: var(--is-text-body);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sn-ep-date {
        font-size: 10px;
        color: var(--is-text-muted);
        flex-shrink: 0;
      }

      /* IS panel (season pack or episode) */
      .sn-is-panel {
        margin: 4px 8px 8px;
        background: var(--is-hdr-bg);
        border-radius: 8px;
        border: 1px solid var(--is-divider);
        max-height: 320px;
        overflow-x: auto;
        overflow-y: auto;
      }

      /* Mobile drill-down */
      .sn-drilldown {
        margin-top: 0;
      }

      .sn-back-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        background: var(--is-btn-bg);
        border: 1px solid var(--is-btn-bdr);
        border-radius: 6px;
        color: var(--is-btn-clr);
        font-size: 12px;
        cursor: pointer;
        padding: 5px 10px;
        margin-bottom: 8px;
        align-self: flex-start;
        transition: background .15s;
      }
      .sn-back-btn:hover {
        background: var(--is-btn-hbg);
        color: var(--is-btn-hclr);
      }

      .sn-drilldown-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--is-text-sec);
        margin-bottom: 6px;
      }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         LAYOUT MODES
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

      /* layout: left \u2014 hide right column, expand left to full width */
      .card-body.layout-left {
        grid-template-columns: 1fr;
      }
      .card-body.layout-left .col-right { display: none; }

      /* layout: right \u2014 hide left column, expand right to full width */
      .card-body.layout-right {
        grid-template-columns: 1fr;
      }
      .card-body.layout-right .col-left { display: none; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         PERFORMANCE MODE
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

      /* Disables all backdrop-filter blur \u2014 major GPU relief on mobile */
      .card-body.perf-mode .col,
      .card-body.perf-mode *,
      .perf-mode ~ #popup-root .popup-glass,
      .perf-mode ~ #popup-root * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      /* Compensate lost blur with higher opacity so content stays readable */
      .card-body.perf-mode .col {
        background: rgba(18,18,22,0.88);
      }
    `;

// src/render/interactive-search.js
var _InteractiveSearch = class {
  _renderIsPanel() {
    if (this._isState === "confirm-add") {
      return `
        <div class="is-panel">
          <div class="is-confirm-wrap">
            <div class="is-confirm-msg">${this._t("isConfirmMsg")}</div>
            <div class="is-confirm-actions">
              <button class="is-confirm-btn is-confirm-yes" data-action="is-confirm-yes">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button class="is-confirm-btn is-confirm-no" data-action="is-confirm-no">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>`;
    }
    if (this._isState === "loading") {
      return `
        <div class="is-panel">
          <div class="is-loading">
            <span class="action-spinner" style="width:22px;height:22px;border-width:2px;border-top-color:var(--is-blue)"></span>
            <span>${this._t("isQueryingIndexers")}</span>
          </div>
        </div>`;
    }
    if (this._isState === "error") {
      return `
        <div class="is-panel">
          <div class="is-loading" style="color:rgba(255,69,58,0.80)">
            \u26A0 ${this._escHtml(this._isError || this._t("isLoadError"))}
          </div>
        </div>`;
    }
    if (this._isState !== "results") return "";
    const all = this._isResults;
    const filter = this._isFilter;
    const visible = filter === "torrent" ? all.filter((r) => r.protocol === "torrent") : filter === "usenet" ? all.filter((r) => r.protocol !== "torrent") : all;
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const rowsHtml = isMobile ? this._renderIsCards(visible) : this._renderIsTable(visible);
    const fBtn = (val, label) => `<button class="is-f-btn${this._isFilter === val ? " active" : ""}" data-isfilter="${val}">${label}</button>`;
    return `
      <div class="is-panel">
        <div class="is-panel-hdr">
          <span class="is-panel-title">${this._t("isResults")}</span>
          <span class="is-count">${all.length}</span>
          <div class="is-filter">
            ${fBtn("all", this._t("isFilterAll"))}
            ${fBtn("torrent", "TOR")}
            ${fBtn("usenet", "NZB")}
          </div>
        </div>
        <div class="is-results-wrap">${rowsHtml}</div>
      </div>`;
  }
  _isQualityBadge(r) {
    const name = r.quality?.quality?.name || "";
    if (/2160|4K|UHD/i.test(name)) return `<span class="is-q-pill is-q-4k">4K${/HDR/i.test(name) ? " HDR" : ""}</span>`;
    if (/1080/i.test(name)) return `<span class="is-q-pill is-q-1080">1080p</span>`;
    if (/720/i.test(name)) return `<span class="is-q-pill is-q-720">720p</span>`;
    return `<span class="is-q-pill is-q-sd">${this._escHtml(name || "?")}</span>`;
  }
  _isScoreHtml(score) {
    if (score == null) return `<span class="is-score is-s-zero">\u2014</span>`;
    const cls = score > 0 ? "is-s-pos" : score < 0 ? "is-s-neg" : "is-s-zero";
    return `<span class="is-score ${cls}">${score > 0 ? "+" : ""}${score}</span>`;
  }
  _isSrcPill(r) {
    return r.protocol === "torrent" ? `<span class="is-src-pill is-src-tor">TOR</span>` : `<span class="is-src-pill is-src-nzb">NZB</span>`;
  }
  _isLang(r) {
    const lang = (r.languages || [])[0]?.name || "";
    return lang ? `<span class="is-lang-chip">${this._escHtml(lang.slice(0, 2).toUpperCase())}</span>` : "";
  }
  _isSize(bytes) {
    if (!bytes) return "\u2014";
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
    return (bytes / 1e6).toFixed(0) + " MB";
  }
  _isPeers(r) {
    if (r.protocol !== "torrent") return `<span class="is-peers-na">\u2014</span>`;
    const s = r.seeders ?? "?";
    const l = r.leechers ?? "?";
    return `<div class="is-peers"><span class="is-s">\u2191${s}</span>/<span class="is-l">\u2193${l}</span></div>`;
  }
  _isGrabBtn(r) {
    const guid = r.guid;
    const isRej = !r.approved;
    const histState = this._isHistory?.[guid];
    if (this._isGrabbed.has(guid) || histState === "grabbed" || histState === "imported") {
      const title = histState === "imported" ? this._t("isImported") : this._t("isGrabbed");
      return `<button class="is-grab-btn is-grab-done" disabled title="${title}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }
    if (histState === "failed") {
      return `<button class="is-grab-btn is-grab-failed" data-grab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t("isFailed")}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    if (this._isGrabbing === guid) {
      return `<button class="is-grab-btn" disabled>
        <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
      </button>`;
    }
    return `<button class="is-grab-btn${isRej ? " force" : ""}" data-grab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${isRej ? "Force grab" : "Grab"}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>`;
  }
  _renderIsTable(releases) {
    const rows = releases.map((r) => {
      const rejHtml = !r.approved && r.rejections?.length ? `<div class="is-rej-row">\u26A0 ${this._escHtml(r.rejections.slice(0, 2).join(" \xB7 "))}</div>` : "";
      return `<tr>
        <td>${this._isSrcPill(r)}</td>
        <td>
          <span class="is-rel-title">${this._escHtml(r.title || "")}</span>
          <span class="is-rel-age">${r.ageHours < 48 ? Math.round(r.ageHours) + "h ago" : Math.round(r.age || 0) + "d ago"}</span>
          ${rejHtml}
        </td>
        <td><span class="is-indexer">${this._escHtml(r.indexer || "")}</span></td>
        <td><span class="is-size">${this._isSize(r.size)}</span></td>
        <td>${this._isPeers(r)}</td>
        <td>${this._isLang(r)}</td>
        <td>${this._isQualityBadge(r)}</td>
        <td>${this._isScoreHtml(r.customFormatScore)}</td>
        <td>${this._isGrabBtn(r)}</td>
      </tr>`;
    }).join("");
    return `<table class="is-table">
      <thead><tr>
        <th>Src</th><th>Title</th><th>Indexer</th>
        <th>Size</th><th>Peers</th><th>Lang</th><th>Quality</th><th>Score</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
  _renderIsCards(releases) {
    return releases.map((r) => {
      const rejHtml = !r.approved && r.rejections?.length ? `<div class="is-ic-rej">\u26A0 ${this._escHtml(r.rejections.slice(0, 1).join(""))}</div>` : "";
      return `<div class="is-card">
        <div class="is-ic-r1">
          ${this._isSrcPill(r)}
          ${this._isQualityBadge(r)}
          ${this._isScoreHtml(r.customFormatScore)}
          <span class="is-size">${this._isSize(r.size)}</span>
          ${this._isLang(r)}
          <div class="is-ic-spacer"></div>
          ${this._isGrabBtn(r)}
        </div>
        <div class="is-ic-title">${this._escHtml(r.title || "")}</div>
        <div class="is-ic-meta">
          <span>${this._escHtml(r.indexer || "")}</span>
          ${r.protocol === "torrent" ? `<span class="sep">\xB7</span><span class="is-s">\u2191${r.seeders ?? "?"}</span>/<span class="is-l">\u2193${r.leechers ?? "?"}</span>` : ""}
          <span class="sep">\xB7</span>
          <span>${r.ageHours < 48 ? Math.round(r.ageHours) + "h ago" : Math.round(r.age || 0) + "d ago"}</span>
        </div>
        ${rejHtml}
      </div>`;
    }).join("");
  }
  // ─────────────────────────────────────────────
  // Interactive Search — fetch + grab
  // ─────────────────────────────────────────────
  async _fetchInteractiveSearch(radarrId) {
    this._isState = "loading";
    this._isResults = [];
    this._isError = null;
    this._renderPopupEl();
    try {
      if (!radarrId) {
        const tmdbId = this._popup?.tmdbId || this._popup?.id;
        const title = this._popup?.title || this._popup?.originalTitle || "";
        if (!tmdbId) throw new Error(this._t("isMissingTmdb"));
        await this._fetchOverseerrRadarrSettings();
        const profileId = this._seerrRadarr?.profileId ?? (this._radarrProfiles[0]?.id ?? 1);
        const rootFolder = this._seerrRadarr?.rootFolder ?? "/movies";
        let addedMovie;
        try {
          addedMovie = await this._hass.callApi("POST", "arr_stack/radarr/movie", {
            tmdbId: parseInt(tmdbId),
            title,
            qualityProfileId: parseInt(profileId),
            rootFolderPath: rootFolder,
            monitored: false,
            addOptions: { searchForMovie: false, monitor: "none" }
          });
        } catch (addErr) {
          const movies = await this._hass.callApi("GET", "arr_stack/radarr/movies").catch(() => []);
          if (Array.isArray(movies)) this._radarr = movies;
          addedMovie = (this._radarr || []).find((m) => String(m.tmdbId) === String(tmdbId));
        }
        radarrId = addedMovie?.id ?? null;
        if (!radarrId) throw new Error(this._t("isNoRadarrId"));
        this._popup._radarrId = radarrId;
      }
      const [data, histRaw] = await Promise.all([
        this._hass.callApi("GET", `arr_stack/radarr/release?movieId=${radarrId}`),
        this._hass.callApi("GET", `arr_stack/radarr/history?movieId=${radarrId}`).catch(() => null)
      ]);
      const records = histRaw?.records ?? (Array.isArray(histRaw) ? histRaw : []);
      const dlIdOutcome = {};
      records.forEach((h) => {
        if (!h.downloadId || h.downloadId in dlIdOutcome) return;
        if (h.eventType === "downloadFailed") dlIdOutcome[h.downloadId] = "failed";
        else if (h.eventType === "downloadFolderImported" || h.eventType === "movieFileImported") dlIdOutcome[h.downloadId] = "imported";
      });
      const histMap = {};
      records.forEach((h) => {
        if (h.eventType !== "grabbed") return;
        const guid = h.data?.guid;
        if (!guid || guid in histMap) return;
        histMap[guid] = dlIdOutcome[h.downloadId] ?? "grabbed";
      });
      this._isHistory = histMap;
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
        if (a.approved !== b.approved) return a.approved ? -1 : 1;
        return (b.customFormatScore ?? 0) - (a.customFormatScore ?? 0);
      });
      this._isResults = sorted;
      this._isState = "results";
    } catch (e) {
      this._isState = "error";
      this._isError = e.message || this._t("isLoadError");
    }
    this._renderPopupEl();
  }
  async _grabRelease(guid, indexerId) {
    this._isGrabbing = guid;
    this._renderPopupEl();
    try {
      const release = this._isResults.find((r) => r.guid === guid) || { guid, indexerId };
      release.movieId = this._popup._radarrId;
      const result = await this._hass.callApi("POST", "arr_stack/radarr/release", release);
      console.log("[arr-card] grab result:", result);
      this._isGrabbed.add(guid);
    } catch (e) {
      console.error("[arr-card] grab error:", e);
      const prev = this._isError;
      this._isError = this._t("isGrabError") + ": " + (e.message || "");
      this._renderPopupEl();
      setTimeout(() => {
        this._isError = prev;
        this._renderPopupEl();
      }, 3e3);
    } finally {
      this._isGrabbing = null;
      this._renderPopupEl();
    }
  }
  // ─────────────────────────────────────────────
  // HA card size hint
  // ─────────────────────────────────────────────
};
var interactiveSearchMixin = _InteractiveSearch.prototype;

// src/render/interactive-search-sonarr.js
var _SonarrIS = class {
  // ─────────────────────────────────────────────
  // Entry point — called from _renderPopup
  // ─────────────────────────────────────────────
  _renderSonarrIsSection() {
    if (!this._snIsOpen) return "";
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    if (isMobile && this._snActiveIs) {
      return this._renderSnDrilldownView();
    }
    return this._renderSnSeasonsView();
  }
  // ─────────────────────────────────────────────
  // Seasons list
  // ─────────────────────────────────────────────
  _renderSnSeasonsView() {
    const series = this._popup?._sonarrSeries;
    if (!series) return `<div class="sn-is-section"><div class="is-loading">${this._t("snNotInSonarr")}</div></div>`;
    const seasons = (series.seasons || []).filter((s) => s.seasonNumber > 0).sort((a, b) => a.seasonNumber - b.seasonNumber);
    const rows = seasons.map((s) => this._renderSnSeasonRow(s)).join("");
    return `<div class="sn-is-section">
      <div class="sn-seasons-label">${this._t("snSeasonsLabel")}</div>
      ${rows}
    </div>`;
  }
  _renderSnSeasonRow(season) {
    const n = season.seasonNumber;
    const exp = this._snExpandedSeasons.has(n);
    const stat = season.statistics || {};
    const have = stat.episodeFileCount ?? 0;
    const tot = stat.totalEpisodeCount ?? stat.episodeCount ?? 0;
    const pct = tot > 0 ? Math.round(have / tot * 100) : 0;
    const pctStyle = `width:${pct}%`;
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const isActiveIs = this._snActiveIs?.type === "season" && this._snActiveIs?.key === n;
    const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;
    const chevron = `<svg class="sn-season-chevron${exp ? " open" : ""}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;
    const episodesHtml = exp ? this._renderSnEpisodesPanel(n) : "";
    const seasonIsHtml = !isMobile && isActiveIs ? this._renderSnIsPanel() : "";
    return `<div class="sn-season-row" data-season="${n}">
      <div class="sn-season-header">
        <button class="sn-expand" data-action="sn-season-toggle" data-season="${n}" title="${this._t("snExpandEpisodes")}">
          ${chevron}
        </button>
        <span class="sn-season-title">${this._t("snSeasonTitle")} ${n}</span>
        <span class="sn-season-stat">${have}/${tot}</span>
        <div class="sn-season-bar"><div class="sn-season-bar-fill" style="${pctStyle}"></div></div>
        <button class="btn-person${isActiveIs ? " active" : ""}" data-action="sn-season-is" data-season="${n}" title="Interactive Search \u2014 season pack">
          ${personIcon}
        </button>
      </div>
      ${seasonIsHtml}
      ${episodesHtml}
    </div>`;
  }
  // ─────────────────────────────────────────────
  // Episodes panel
  // ─────────────────────────────────────────────
  _renderSnEpisodesPanel(seasonNumber) {
    const eps = this._snEpisodes.get(seasonNumber);
    if (!eps) {
      return `<div class="sn-episodes sn-episodes-loading">
        <span class="action-spinner" style="width:14px;height:14px;border-width:1.5px"></span>
      </div>`;
    }
    if (eps.length === 0) {
      return `<div class="sn-episodes"><span style="color:rgba(255,255,255,0.4);font-size:11px">${this._t("snNoEpisodes")}</span></div>`;
    }
    const rows = eps.map((ep) => this._renderSnEpRow(ep)).join("");
    return `<div class="sn-episodes">${rows}</div>`;
  }
  _renderSnEpRow(ep) {
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const isActive = this._snActiveIs?.type === "episode" && this._snActiveIs?.key === ep.id;
    const personIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`;
    const hasFile = !!ep.hasFile;
    const epNum = `S${String(ep.seasonNumber).padStart(2, "0")}E${String(ep.episodeNumber).padStart(2, "0")}`;
    const epTitle = this._escHtml(ep.title || "");
    const airDate = ep.airDate ? ep.airDate.slice(0, 10) : "";
    const epIsHtml = !isMobile && isActive ? this._renderSnIsPanel() : "";
    return `<div class="sn-ep-row${hasFile ? " has-file" : ""}">
      <span class="sn-ep-num">${epNum}</span>
      <span class="sn-ep-title">${epTitle}</span>
      ${airDate ? `<span class="sn-ep-date">${airDate}</span>` : ""}
      <button class="btn-person btn-person-sm${isActive ? " active" : ""}" data-action="sn-ep-is" data-epid="${ep.id}" data-season="${ep.seasonNumber}" title="Interactive Search \u2014 ${this._t("snEpisode").toLowerCase()}">
        ${personIcon}
      </button>
      ${epIsHtml}
    </div>`;
  }
  // ─────────────────────────────────────────────
  // IS panel (shared by season pack + episode)
  // ─────────────────────────────────────────────
  _renderSnIsPanel() {
    if (this._snIsState === "loading") {
      return `<div class="sn-is-panel">
        <div class="is-loading">
          <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>
          <span>${this._t("isQueryingIndexers")}</span>
        </div>
      </div>`;
    }
    if (this._snIsState === "error") {
      return `<div class="sn-is-panel">
        <div class="is-loading" style="color:rgba(255,69,58,0.80)">\u26A0 ${this._escHtml(this._snIsError || this._t("isLoadError"))}</div>
      </div>`;
    }
    if (this._snIsState !== "results") return "";
    const all = this._snIsResults;
    const visible = this._snIsFilter === "torrent" ? all.filter((r) => r.protocol === "torrent") : this._snIsFilter === "usenet" ? all.filter((r) => r.protocol !== "torrent") : all;
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const rowsHtml = isMobile ? this._renderSnIsCards(visible) : this._renderSnIsTable(visible);
    const fBtn = (val, label) => `<button class="is-f-btn${this._snIsFilter === val ? " active" : ""}" data-snisfilter="${val}">${label}</button>`;
    return `<div class="sn-is-panel">
      <div class="is-panel-hdr">
        <span class="is-panel-title">${this._snActiveIs?.type === "season" ? this._t("snSeasonPack").charAt(0).toUpperCase() + this._t("snSeasonPack").slice(1) : this._t("snEpisode")}</span>
        <span class="is-count">${all.length}</span>
        <div class="is-filter">
          ${fBtn("all", this._t("isFilterAll"))}
          ${fBtn("torrent", "TOR")}
          ${fBtn("usenet", "NZB")}
        </div>
      </div>
      <div class="is-results-wrap">${rowsHtml}</div>
    </div>`;
  }
  _renderSnIsTable(releases) {
    const rows = releases.map((r) => {
      const rejHtml = !r.approved && r.rejections?.length ? `<div class="is-rej-row">\u26A0 ${this._escHtml(r.rejections.slice(0, 2).join(" \xB7 "))}</div>` : "";
      return `<tr>
        <td>${this._isSrcPill(r)}</td>
        <td>
          <span class="is-rel-title">${this._escHtml(r.title || "")}</span>
          <span class="is-rel-age">${r.ageHours < 48 ? Math.round(r.ageHours) + "h ago" : Math.round(r.age || 0) + "d ago"}</span>
          ${rejHtml}
        </td>
        <td><span class="is-indexer">${this._escHtml(r.indexer || "")}</span></td>
        <td><span class="is-size">${this._isSize(r.size)}</span></td>
        <td>${this._isPeers(r)}</td>
        <td>${this._isLang(r)}</td>
        <td>${this._isQualityBadge(r)}</td>
        <td>${this._isScoreHtml(r.customFormatScore)}</td>
        <td>${this._snGrabBtn(r)}</td>
      </tr>`;
    }).join("");
    return `<table class="is-table">
      <thead><tr>
        <th>Src</th><th>Title</th><th>Indexer</th>
        <th>Size</th><th>Peers</th><th>Lang</th><th>Quality</th><th>Score</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
  _renderSnIsCards(releases) {
    return releases.map((r) => {
      const rejHtml = !r.approved && r.rejections?.length ? `<div class="is-ic-rej">\u26A0 ${this._escHtml(r.rejections.slice(0, 1).join(""))}</div>` : "";
      return `<div class="is-card">
        <div class="is-ic-r1">
          ${this._isSrcPill(r)}
          ${this._isQualityBadge(r)}
          ${this._isScoreHtml(r.customFormatScore)}
          <span class="is-size">${this._isSize(r.size)}</span>
          ${this._isLang(r)}
          <div class="is-ic-spacer"></div>
          ${this._snGrabBtn(r)}
        </div>
        <div class="is-ic-title">${this._escHtml(r.title || "")}</div>
        <div class="is-ic-meta">
          <span>${this._escHtml(r.indexer || "")}</span>
          ${r.protocol === "torrent" ? `<span class="sep">\xB7</span><span class="is-s">\u2191${r.seeders ?? "?"}</span>/<span class="is-l">\u2193${r.leechers ?? "?"}</span>` : ""}
          <span class="sep">\xB7</span>
          <span>${r.ageHours < 48 ? Math.round(r.ageHours) + "h ago" : Math.round(r.age || 0) + "d ago"}</span>
        </div>
        ${rejHtml}
      </div>`;
    }).join("");
  }
  _snGrabBtn(r) {
    const guid = r.guid;
    const isRej = !r.approved;
    const histState = this._snIsHistory?.[guid];
    if (this._snIsGrabbed.has(guid) || histState === "grabbed" || histState === "imported") {
      const title = histState === "imported" ? this._t("isImported") : this._t("isGrabbed");
      return `<button class="is-grab-btn is-grab-done" disabled title="${title}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }
    if (histState === "failed") {
      return `<button class="is-grab-btn is-grab-failed" data-sngrab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t("isFailed")}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    if (this._snIsGrabbing === guid) {
      return `<button class="is-grab-btn" disabled>
        <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
      </button>`;
    }
    return `<button class="is-grab-btn${isRej ? " force" : ""}" data-sngrab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${isRej ? "Force grab" : "Grab"}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>`;
  }
  // ─────────────────────────────────────────────
  // Mobile drill-down (full IS panel)
  // ─────────────────────────────────────────────
  _renderSnDrilldownView() {
    const label = this._snActiveIs?.type === "season" ? `${this._t("snSeasonTitle")} ${this._snActiveIs.key} \u2014 ${this._t("snSeasonPack")}` : `S${String(this._snActiveIs?.seasonNumber ?? 0).padStart(2, "0")}E${String(this._snActiveIs?.epNum ?? 0).padStart(2, "0")} \u2014 ${this._escHtml(this._snActiveIs?.label || "")}`;
    return `<div class="sn-is-section sn-drilldown">
      <button class="sn-back-btn" data-action="sn-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        ${this._t("snBack")}
      </button>
      <div class="sn-drilldown-label">${label}</div>
      ${this._renderSnIsPanel()}
    </div>`;
  }
};
var sonarrIsMixin = _SonarrIS.prototype;

// src/fetch/index.js
var _FetchMethods = class {
  async _fetchAll() {
    await Promise.allSettled([
      this._fetchRadarr(),
      this._fetchSonarr(),
      this._fetchCalendar(),
      this._fetchOverseerr(),
      this._fetchTvUpcoming(),
      this._fetchTrending(),
      this._fetchPopular(),
      this._fetchSab(),
      this._fetchSabHistory(),
      this._fetchQbit(),
      this._fetchBazarr(),
      this._fetchRadarrQueue(),
      this._fetchPendingRequests(),
      this._fetchMyPendingRequests()
    ]);
    this._render();
  }
  async _fetchDownloadsAndRender() {
    await Promise.allSettled([
      this._fetchQbit(),
      this._fetchSab(),
      this._fetchSabHistory()
    ]);
    const left = this.shadowRoot.getElementById("col-left");
    if (!left) return;
    const newHtml = this._renderLeft();
    if (left.innerHTML !== newHtml) {
      left.innerHTML = newHtml;
      this._wireSort();
      this._wireActionButtons();
      this._wirePageButtons();
    }
  }
  async _fetchRadarr() {
    try {
      const data = await this._hass.callApi("GET", "arr_stack/radarr/movies");
      const radarrFiltered = data.filter((m) => m.added && m.added !== "0001-01-01T00:00:00Z");
      this._radarrTotal = radarrFiltered.length;
      this._radarr = radarrFiltered.sort((a, b) => new Date(b.added) - new Date(a.added)).slice(0, 32);
    } catch (e) {
      console.error("[arr-card] Radarr fetch error:", e);
    }
  }
  async _fetchSonarr() {
    try {
      const data = await this._hass.callApi("GET", "arr_stack/sonarr/series");
      const sonarrFiltered = data.filter((s) => s.added && s.added !== "0001-01-01T00:00:00Z");
      this._sonarrTotal = sonarrFiltered.length;
      this._sonarr = sonarrFiltered.sort((a, b) => new Date(b.added) - new Date(a.added)).slice(0, 32);
    } catch (e) {
      console.error("[arr-card] Sonarr fetch error:", e);
    }
  }
  async _fetchCalendar() {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const end = new Date(Date.now() + 60 * 864e5).toISOString().split("T")[0];
      const data = await this._hass.callApi("GET", `arr_stack/sonarr/calendar?start=${today}&end=${end}`);
      const seen = /* @__PURE__ */ new Map();
      for (const ep of data) {
        const sid = ep.seriesId;
        if (!seen.has(sid) || new Date(ep.airDate) < new Date(seen.get(sid).airDate)) {
          seen.set(sid, ep);
        }
      }
      this._calendar = Array.from(seen.values()).sort((a, b) => new Date(a.airDate) - new Date(b.airDate)).slice(0, 32);
    } catch (e) {
      console.error("[arr-card] Sonarr calendar fetch error:", e);
    }
  }
  async _fetchOverseerr() {
    try {
      const [d1, d2] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/overseerr/upcoming?page=1"),
        this._hass.callApi("GET", "arr_stack/overseerr/upcoming?page=2")
      ]);
      const combined = [...d1.results || [], ...d2.results || []];
      this._upcoming = combined.slice(0, 32);
      this._upcomingError = null;
    } catch (e) {
      this._upcomingError = e.message;
      console.error("[arr-card] Overseerr fetch error:", e);
    }
  }
  async _fetchTrending() {
    try {
      const [d1, d2] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/overseerr/trending?page=1"),
        this._hass.callApi("GET", "arr_stack/overseerr/trending?page=2").catch(() => ({ results: [] }))
      ]);
      this._trending = [...d1.results || [], ...d2.results || []];
      this._trendingApiTotalPages = d1.totalPages || 1;
      this._trendingFetchedApiPage = 2;
      if (this._trendingOverlayOpen) {
        const isMobile = window.matchMedia("(max-width: 480px)").matches;
        const rows = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
        const perPage = isMobile ? rows * 2 : rows * 4;
        const maxPage = Math.max(0, Math.ceil(this._trending.length / perPage) - 1);
        if (this._trendingOverlayPage > maxPage) this._trendingOverlayPage = 0;
      }
    } catch (e) {
      console.error("[arr-card] Overseerr trending fetch error:", e);
    }
  }
  // Proaktivně načte další API stránky na pozadí, pokud overlay nemá dost dat
  async _proactiveTrendingLoad() {
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const rows = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
    const perPage = isMobile ? rows * 2 : rows * 4;
    while (this._trendingOverlayOpen && this._trending.length < perPage * 2 && this._trendingFetchedApiPage < this._trendingApiTotalPages) {
      try {
        const nextApiPage = this._trendingFetchedApiPage + 1;
        const data = await this._hass.callApi("GET", `arr_stack/overseerr/trending?page=${nextApiPage}`);
        this._trending = [...this._trending, ...data.results || []];
        this._trendingApiTotalPages = data.totalPages || this._trendingApiTotalPages;
        this._trendingFetchedApiPage = nextApiPage;
        this._reRenderSection("trending");
      } catch (err) {
        console.error("[arr-card] Trending proactive load error:", err);
        break;
      }
    }
  }
  async _fetchPopular() {
    try {
      const [d1, d2] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/overseerr/popular?page=1"),
        this._hass.callApi("GET", "arr_stack/overseerr/popular?page=2")
      ]);
      this._popular = [...d1.results || [], ...d2.results || []].slice(0, 32);
    } catch (e) {
      console.error("[arr-card] Overseerr popular fetch error:", e);
    }
  }
  async _fetchTvUpcoming() {
    try {
      const [d1, d2] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/overseerr/tv_upcoming?page=1"),
        this._hass.callApi("GET", "arr_stack/overseerr/tv_upcoming?page=2")
      ]);
      this._tvUpcoming = [...d1.results || [], ...d2.results || []].slice(0, 32);
    } catch (e) {
      console.error("[arr-card] Overseerr TV upcoming fetch error:", e);
    }
  }
  async _fetchOverseerrSonarrSettings() {
    try {
      const servers = await this._hass.callApi("GET", "arr_stack/overseerr/sonarr_settings");
      if (!Array.isArray(servers) || servers.length === 0) return;
      const server = servers.find((s) => s.isDefault) || servers[0];
      this._seerrSonarr = {
        serverId: server.id,
        profileId: server.activeProfileId,
        rootFolder: server.activeDirectory
      };
    } catch (e) {
      console.error("[arr-card] Overseerr Sonarr settings fetch error:", e);
    }
  }
  async _fetchSonarrProfiles() {
    if (this._sonarrProfiles.length > 0) return;
    try {
      const data = await this._hass.callApi("GET", "arr_stack/sonarr/profiles");
      if (Array.isArray(data)) this._sonarrProfiles = data;
    } catch (e) {
      console.error("[arr-card] Sonarr profiles fetch error:", e);
    }
  }
  async _openTvRequestOverlay(m, source = "tvUpcoming") {
    this._tvRequestPending = { show: m, seasons: null, selected: null, profileId: null, mediaId: m.id, loading: true, source };
    this._reRenderRight();
    await Promise.allSettled([
      (async () => {
        const detail = await this._hass.callApi("GET", `arr_stack/overseerr/tv/${m.id}`);
        const seasons = (detail.seasons || []).filter((s) => s.seasonNumber > 0).map((s) => s.seasonNumber).sort((a, b) => a - b);
        if (this._tvRequestPending) {
          this._tvRequestPending.seasons = seasons;
          this._tvRequestPending.selected = new Set(seasons);
        }
      })(),
      this._fetchSonarrProfiles(),
      (async () => {
        if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      })()
    ]);
    if (this._tvRequestPending) {
      this._tvRequestPending.profileId = this._seerrSonarr?.profileId ?? null;
      this._tvRequestPending.loading = false;
      this._reRenderRight();
      this._wireTvOverlay();
    }
  }
  async _addOverseerrTvRequest(mediaId, seasons, profileId) {
    const showId = this._tvRequestPending?.show?.id;
    if (showId) {
      this._optimisticRequested.add(showId);
      this._withdrawnIds.delete(showId);
    }
    this._tvRequestPending = null;
    this._reRenderRight();
    try {
      if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const body = { mediaType: "tv", mediaId, seasons };
      if (this._seerrSonarr) {
        body.serverId = this._seerrSonarr.serverId;
        body.profileId = profileId !== null ? parseInt(profileId) : this._seerrSonarr.profileId;
        body.rootFolder = this._seerrSonarr.rootFolder;
      }
      if (!this._hass.user.is_admin) body.userMode = "family";
      const resp = await this._hass.callApi("POST", "arr_stack/overseerr/request", body);
      const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
      if (reqId && !this._hass.user.is_admin) {
        this._familyPendingIds.set(Number(mediaId), reqId);
        this._savePendingToStorage();
        this._reRenderRight();
      }
      this._fetchTvUpcoming().then(() => this._reRenderRight());
    } catch (e) {
      if (showId) this._optimisticRequested.delete(showId);
      this._reRenderRight();
      console.error("[arr-card] Overseerr TV request error:", e);
    }
  }
  async _fetchBazarr() {
    try {
      const data = await this._hass.callApi("GET", "arr_stack/bazarr/movies");
      const map = {};
      for (const movie of data.data || []) {
        map[movie.radarrId] = {
          subtitles: movie.subtitles || [],
          missing: movie.missing_subtitles || []
        };
      }
      this._bazarr = map;
      this._bazarrConfigured = true;
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      this._bazarrConfigured = status !== 503;
      console.error("[arr-card] Bazarr fetch error:", e);
    }
  }
  async _fetchRadarrQueue() {
    try {
      const data = await this._hass.callApi("GET", "arr_stack/radarr/queue");
      const records = data.records || data;
      const failed = /* @__PURE__ */ new Set();
      const active = /* @__PURE__ */ new Set();
      for (const item of Array.isArray(records) ? records : []) {
        if (!item.movieId) continue;
        const bad = item.trackedDownloadStatus === "warning" || item.trackedDownloadStatus === "error" || item.trackedDownloadState === "importFailed" || item.status === "failed";
        if (bad) {
          failed.add(item.movieId);
        } else {
          active.add(item.movieId);
        }
      }
      this._radarrQueueFailed = failed;
      this._radarrQueueActive = active;
    } catch (e) {
      console.error("[arr-card] Radarr queue fetch error:", e);
    }
  }
  async _fetchSab() {
    try {
      const data = await this._hass.callApi("GET", "arr_stack/sabnzbd/queue");
      this._sab = data.queue || {};
      this._sabConfigured = true;
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      this._sabConfigured = status !== 503;
      console.error("[arr-card] SABnzbd fetch error:", e);
    }
  }
  async _fetchSabHistory() {
    try {
      const data = await this._hass.callApi("GET", "arr_stack/sabnzbd/history");
      const slots = data?.history?.slots || [];
      this._sabFailed = slots.filter((s) => s.status === "Failed");
    } catch (e) {
      console.error("[arr-card] SABnzbd history fetch error:", e);
    }
  }
  async _sabHistoryDelete(nzoId) {
    this._sabDeleteBusy = nzoId;
    this._reRenderLeft();
    try {
      await this._hass.callApi("POST", "arr_stack/sabnzbd/action", { mode: "history", name: "delete", nzo_id: nzoId });
    } catch (e) {
      console.error("[arr-card] SABnzbd history delete error:", e);
    } finally {
      await this._fetchSabHistory();
      this._sabDeleteBusy = null;
      this._reRenderLeft();
    }
  }
  async _sabRetry(nzoId) {
    this._sabRetryBusy = nzoId;
    this._reRenderLeft();
    try {
      await this._hass.callApi("POST", "arr_stack/sabnzbd/action", { mode: "retry", nzo_id: nzoId });
    } catch (e) {
      console.error("[arr-card] SABnzbd retry error:", e);
    } finally {
      await new Promise((r) => setTimeout(r, 1e3));
      await Promise.all([this._fetchSab(), this._fetchSabHistory()]);
      this._sabRetryBusy = null;
      this._reRenderLeft();
    }
  }
  async _fetchQbit() {
    try {
      const [torrents, transfer] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/qbit/torrents"),
        this._hass.callApi("GET", "arr_stack/qbit/transfer")
      ]);
      this._qbit = torrents;
      this._qbitTransfer = transfer;
      this._qbitConfigured = true;
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      this._qbitConfigured = status !== 503;
      console.error("[arr-card] qBittorrent fetch error:", e);
    }
  }
  async _fetchOverseerrRadarrSettings() {
    try {
      const servers = await this._hass.callApi("GET", "arr_stack/overseerr/radarr_settings");
      if (!Array.isArray(servers) || servers.length === 0) return;
      const server = servers.find((s) => s.isDefault) || servers[0];
      this._seerrRadarr = {
        serverId: server.id,
        profileId: server.activeProfileId,
        rootFolder: server.activeDirectory
      };
    } catch (e) {
      console.error("[arr-card] Overseerr Radarr settings fetch error:", e);
    }
  }
  async _fetchRadarrProfiles() {
    if (this._radarrProfiles.length > 0) return;
    try {
      const data = await this._hass.callApi("GET", "arr_stack/radarr/profiles");
      if (Array.isArray(data)) this._radarrProfiles = data;
    } catch (e) {
      console.error("[arr-card] Radarr profiles fetch error:", e);
    }
  }
  // ─────────────────────────────────────────────
  // Sonarr Interactive Search
  // ─────────────────────────────────────────────
  async _fetchSonarrEpisodes(seriesId, seasonNumber) {
    try {
      const data = await this._hass.callApi("GET", `arr_stack/sonarr/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
      const eps = (Array.isArray(data) ? data : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
      this._snEpisodes.set(seasonNumber, eps);
    } catch (e) {
      console.error("[arr-card] Sonarr episodes fetch error:", e);
      this._snEpisodes.set(seasonNumber, []);
    }
    this._renderPopupEl();
  }
  async _fetchSonarrSeasonIS(seriesId, seasonNumber) {
    this._snIsState = "loading";
    this._snIsResults = [];
    this._snIsError = null;
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    this._renderPopupEl();
    try {
      let eps = this._snEpisodes.get(seasonNumber);
      if (!eps || eps.length === 0) {
        const epData = await this._hass.callApi("GET", `arr_stack/sonarr/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
        eps = (Array.isArray(epData) ? epData : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
        if (eps.length > 0) this._snEpisodes.set(seasonNumber, eps);
      }
      const firstEp = eps[0];
      if (!firstEp) throw new Error(this._t("snNoEpisodes"));
      const [data, histRaw] = await Promise.all([
        this._hass.callApi("GET", `arr_stack/sonarr/release?episodeId=${firstEp.id}`),
        this._hass.callApi("GET", `arr_stack/sonarr/history?seriesId=${seriesId}`).catch(() => null)
      ]);
      this._snIsHistory = this._buildSnHistoryMap(histRaw);
      this._snIsResults = this._sortIsResults(Array.isArray(data) ? data : []);
      this._snIsState = "results";
    } catch (e) {
      this._snIsState = "error";
      this._snIsError = e.message || this._t("isLoadError");
    }
    this._renderPopupEl();
  }
  async _fetchSonarrEpIS(episodeId, seriesId) {
    this._snIsState = "loading";
    this._snIsResults = [];
    this._snIsError = null;
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    this._renderPopupEl();
    try {
      const [data, histRaw] = await Promise.all([
        this._hass.callApi("GET", `arr_stack/sonarr/release?episodeId=${episodeId}`),
        this._hass.callApi("GET", `arr_stack/sonarr/history?seriesId=${seriesId}`).catch(() => null)
      ]);
      this._snIsHistory = this._buildSnHistoryMap(histRaw);
      this._snIsResults = this._sortIsResults(Array.isArray(data) ? data : []);
      this._snIsState = "results";
    } catch (e) {
      this._snIsState = "error";
      this._snIsError = e.message || this._t("isLoadError");
    }
    this._renderPopupEl();
  }
  _buildSnHistoryMap(histRaw) {
    const records = Array.isArray(histRaw) ? histRaw : histRaw?.records ?? [];
    const dlIdOutcome = {};
    records.forEach((h) => {
      if (!h.downloadId || h.downloadId in dlIdOutcome) return;
      if (h.eventType === "downloadFailed") dlIdOutcome[h.downloadId] = "failed";
      else if (h.eventType === "downloadFolderImported" || h.eventType === "episodeFileImported") dlIdOutcome[h.downloadId] = "imported";
    });
    const histMap = {};
    records.forEach((h) => {
      if (h.eventType !== "grabbed") return;
      const guid = h.data?.guid;
      if (!guid || guid in histMap) return;
      histMap[guid] = dlIdOutcome[h.downloadId] ?? "grabbed";
    });
    return histMap;
  }
  _sortIsResults(data) {
    return data.sort((a, b) => {
      if (a.approved !== b.approved) return a.approved ? -1 : 1;
      return (b.customFormatScore ?? 0) - (a.customFormatScore ?? 0);
    });
  }
  async _sonarrGrab(guid, indexerId) {
    this._snIsGrabbing = guid;
    this._renderPopupEl();
    try {
      const release = this._snIsResults.find((r) => r.guid === guid) || { guid, indexerId };
      await this._hass.callApi("POST", "arr_stack/sonarr/release", release);
      this._snIsGrabbed.add(guid);
    } catch (e) {
      console.error("[arr-card] Sonarr grab error:", e);
      const prev = this._snIsError;
      this._snIsError = this._t("isGrabError") + ": " + (e.message || "");
      this._renderPopupEl();
      setTimeout(() => {
        this._snIsError = prev;
        this._renderPopupEl();
      }, 3e3);
    } finally {
      this._snIsGrabbing = null;
      this._renderPopupEl();
    }
  }
  async _addOverseerrRequest(mediaId, profileId = null) {
    this._optimisticRequested.add(mediaId);
    this._withdrawnIds.delete(mediaId);
    this._requestPending = null;
    this._reRenderRight();
    try {
      if (!this._seerrRadarr) await this._fetchOverseerrRadarrSettings();
      const body = { mediaId, mediaType: "movie" };
      if (this._seerrRadarr) {
        body.serverId = this._seerrRadarr.serverId;
        body.profileId = profileId !== null ? parseInt(profileId) : this._seerrRadarr.profileId;
        body.rootFolder = this._seerrRadarr.rootFolder;
      }
      if (!this._hass.user.is_admin) body.userMode = "family";
      const resp = await this._hass.callApi("POST", "arr_stack/overseerr/request", body);
      const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
      if (reqId && !this._hass.user.is_admin) {
        this._familyPendingIds.set(Number(mediaId), reqId);
        this._savePendingToStorage();
        this._reRenderRight();
      }
      this._fetchOverseerr().then(() => this._reRenderRight());
    } catch (e) {
      this._optimisticRequested.delete(mediaId);
      this._reRenderRight();
      console.error("[arr-card] Overseerr add request error:", e);
    }
  }
};
var fetchMixin = _FetchMethods.prototype;

// src/render/left.js
var _RenderLeft = class {
  _renderLeft() {
    return `
    ${this._renderDiskRow()}
    <div class="spacer"></div>
    ${this._renderQbit()}
    <div class="spacer"></div>
    ${this._renderSab()}
  `;
  }
  _renderLeftHeader() {
    return `
    <div class="col-hdr">
      <ha-icon icon="mdi:download-outline" style="--mdc-icon-size:22px"></ha-icon>
      <span class="col-hdr-title">${this._t("downloads")}</span>
      <div class="col-hdr-line"></div>
    </div>`;
  }
  _renderDiskRow() {
    const qbitSpeedBytes = this._qbitTransfer.dl_info_speed || 0;
    const sabKbps = parseFloat(this._sab.kbpersec) || 0;
    const sabSpeedBytes = sabKbps * 1024;
    const combinedSpeed = qbitSpeedBytes + sabSpeedBytes;
    const qbitSpeedStr = this.fmtSpeed(qbitSpeedBytes);
    const sabSpeedStr = this.fmtSpeed(sabSpeedBytes);
    const combinedStr = this.fmtSpeed(combinedSpeed);
    const diskFreeGB = parseFloat(this._sab.diskspace1) || 0;
    const diskTotalGB = parseFloat(this._sab.diskspacetotal1) || 0;
    const diskUsedGB = diskTotalGB - diskFreeGB;
    const diskPct = diskTotalGB > 0 ? diskUsedGB / diskTotalGB * 100 : 0;
    const diskUsedStr = diskUsedGB >= 1024 ? (diskUsedGB / 1024).toFixed(1) + " TB" : diskUsedGB.toFixed(1) + " GB";
    const diskTotalStr = diskTotalGB >= 1024 ? (diskTotalGB / 1024).toFixed(1) + " TB" : diskTotalGB.toFixed(1) + " GB";
    const diskFreeStr = diskFreeGB >= 1024 ? (diskFreeGB / 1024).toFixed(1) + " TB" : diskFreeGB.toFixed(1) + " GB";
    const activeTorrents = Array.isArray(this._qbit) ? this._qbit.length : 0;
    const sabSlots = Array.isArray(this._sab.slots) ? this._sab.slots.length : 0;
    const sabTotal = this._sab.noofslots_total || sabSlots;
    return `
    <div class="disk-row">
      <div class="disk-chip">
        <div class="dc-label">${this._t("totalSpeed")}</div>
        <div class="dc-val"><span class="g" style="font-size:15px;font-weight:800;padding:2px 10px"><ha-icon icon="mdi:download" style="--mdc-icon-size:14px"></ha-icon> ${combinedStr}</span></div>
        <div class="dc-sub">qBit ${qbitSpeedStr} \xB7 SAB ${sabSpeedStr}</div>
      </div>
      <div class="disk-chip">
        <div class="dc-label">${this._t("storage")}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${diskUsedStr}</span><span style="font-size:10px;color:rgba(255,255,255,0.6);font-weight:600"> / ${diskTotalStr}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${diskPct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${diskPct.toFixed(0)} % \xB7 ${diskFreeStr} ${this._t("free")}</div>
      </div>
    </div>`;
  }
  _renderQbit() {
    if (!this._qbitConfigured) return "";
    const speedBytes = this._qbitTransfer.dl_info_speed || 0;
    const speedStr = this.fmtSpeed(speedBytes);
    const torrents = Array.isArray(this._qbit) ? [...this._qbit] : [];
    const [sortField, sortDir] = this._sort.split("_");
    torrents.sort((a, b) => {
      const av = sortField === "speed" ? a.dlspeed || 0 : a.progress || 0;
      const bv = sortField === "speed" ? b.dlspeed || 0 : b.progress || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    const progressActive = sortField === "progress";
    const speedActive = sortField === "speed";
    const dir = sortDir === "asc" ? "\u2191" : "\u2193";
    const _isQbitPaused = (st) => st.startsWith("paused") || st.startsWith("stopped");
    const activeTorrents = torrents.filter((t) => !_isQbitPaused(t.state || "") && t.progress < 1);
    const allPaused = torrents.length > 0 && activeTorrents.length === 0;
    const items = this._pagedList(torrents, "qbit", (t) => this._renderTorrentItem(t), this._perPage("qbit"));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon("qbit")}
        <span class="col-hdr-title">qBittorrent</span>
        <div class="col-hdr-line"></div>
        <div class="sort-btns">
          <button class="sb${progressActive ? " on" : ""}" data-sort="${progressActive ? sortDir === "desc" ? "progress_asc" : "progress_desc" : "progress_desc"}" title="${this._t("sortByProgress")}">
            <ha-icon icon="mdi:percent" style="--mdc-icon-size:15px"></ha-icon>${progressActive ? `<span class="sb-dir">${dir}</span>` : ""}
          </button>
          <button class="sb${speedActive ? " on" : ""}" data-sort="${speedActive ? sortDir === "desc" ? "speed_asc" : "speed_desc" : "speed_desc"}" title="${this._t("sortBySpeed")}">
            <ha-icon icon="mdi:speedometer" style="--mdc-icon-size:15px"></ha-icon>${speedActive ? `<span class="sb-dir">${dir}</span>` : ""}
          </button>
        </div>
        ${this._qbitBusy ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>` : `<button class="action-btn qbit-global-toggle${allPaused ? " paused" : ""}" title="${allPaused ? this._t("resumeAll") : this._t("pauseAll")}">
               <ha-icon icon="${allPaused ? "mdi:play" : "mdi:pause"}" style="--mdc-icon-size:16px"></ha-icon>
             </button>`}
      </div>
      ${items}
    </div>`;
  }
  _renderTorrentItem(t) {
    const pct = Math.round((t.progress || 0) * 100);
    const dlSpeed = this.fmtSpeed(t.dlspeed || 0);
    const upSpeed = this.fmtSpeed(t.upspeed || 0);
    const eta = this.fmtEta(t.eta);
    const ratio = t.ratio != null && isFinite(t.ratio) ? t.ratio.toFixed(2) : "\u2014";
    const completed = this.fmtSize(t.completed || 0);
    const total = this.fmtSize(t.size || 0);
    const seeds = t.num_seeds || 0;
    const leechs = t.num_leechs || 0;
    const name = this._escHtml(t.name || "Unknown");
    const state = t.state || "";
    const errorStates = { error: this._t("errorState"), missingFiles: this._t("missingFiles") };
    const isCompleted = pct === 100;
    const isError = !isCompleted && state in errorStates;
    const isStalledDL = !isCompleted && state === "stalledDL";
    const isActiveUpload = isCompleted && (state === "uploading" || state === "forcedUP");
    const isStalledSeed = isCompleted && state === "stalledUP";
    const isSeeding = isActiveUpload || isStalledSeed;
    let speedCol = "";
    if (isActiveUpload) {
      speedCol = `<span class="status-pill pill-teal"><ha-icon icon="mdi:upload" style="--mdc-icon-size:11px"></ha-icon> ${upSpeed}</span>`;
    } else if (isStalledSeed) {
      speedCol = `<span class="status-pill pill-teal" style="opacity:0.65"><ha-icon icon="mdi:upload-off" style="--mdc-icon-size:11px"></ha-icon> ${this._t("seeding")}</span>`;
    } else if (isCompleted) {
      speedCol = `<span class="status-pill pill-green"><ha-icon icon="mdi:check-circle" style="--mdc-icon-size:11px"></ha-icon> ${this._t("complete")}</span>`;
    } else if (isError) {
      speedCol = `<span class="status-pill pill-red"><ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:11px"></ha-icon> ${errorStates[state]}</span>`;
    } else if (isStalledDL) {
      speedCol = `<span class="status-pill pill-orange"><ha-icon icon="mdi:alert" style="--mdc-icon-size:11px"></ha-icon> ${this._t("stalled")}</span>`;
    } else {
      speedCol = `<span class="dm"><b class="g" style="font-size:13px"><span style="display:inline-block;transform:translateY(-4px)"><ha-icon icon="mdi:download" style="--mdc-icon-size:12px"></ha-icon></span> ${dlSpeed}</b></span>`;
    }
    const pbarClass = isError ? "pf-red" : isStalledDL ? "pf-orange" : isCompleted ? "pf-green" : "pf-blue";
    const hash = t.hash || "";
    const isPaused = state === "pausedDL" || state === "pausedUP" || state === "stoppedDL" || state === "stoppedUP";
    let actionBtns = "";
    if (this._qbitItemBusy === hash) {
      actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
    } else if (this._confirmRemove === hash) {
      actionBtns = `
      <button class="tb tb-cancel" data-tb-action="cancel-remove" data-hash="${hash}" title="${this._t("cancelRemove")}"><ha-icon icon="mdi:close" style="--mdc-icon-size:15px"></ha-icon></button>
      <button class="tb tb-keep"   data-tb-action="remove-keep"   data-hash="${hash}" title="${this._t("keepFiles")}"><ha-icon icon="mdi:magnet" style="--mdc-icon-size:15px"></ha-icon></button>
      <button class="tb tb-del"    data-tb-action="remove-del"    data-hash="${hash}" title="${this._t("deleteFiles")}"><ha-icon icon="mdi:delete" style="--mdc-icon-size:15px"></ha-icon></button>`;
    } else {
      if (!isCompleted && isPaused)
        actionBtns += `<button class="tb tb-resume" data-tb-action="resume" data-hash="${hash}" title="${this._t("resume")}"><ha-icon icon="mdi:play" style="--mdc-icon-size:15px"></ha-icon></button>`;
      if (!isCompleted && !isPaused && !isError)
        actionBtns += `<button class="tb tb-pause" data-tb-action="pause" data-hash="${hash}" title="${this._t("pause")}"><ha-icon icon="mdi:pause" style="--mdc-icon-size:15px"></ha-icon></button>`;
      if (isSeeding)
        actionBtns += `<button class="tb tb-pause" data-tb-action="pause" data-hash="${hash}" title="${this._t("stopSeed")}"><ha-icon icon="mdi:stop" style="--mdc-icon-size:15px"></ha-icon></button>`;
      actionBtns += `<button class="tb tb-remove" data-tb-action="remove-confirm" data-hash="${hash}" title="${this._t("remove")}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:15px"></ha-icon></button>`;
    }
    return `
    <div class="dl">
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        <span class="dl-pct${isError ? " dl-pct-err" : ""}">${pct}%</span>
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${isSeeding ? `<span class="dm"><ha-icon icon="mdi:swap-vertical" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">R: ${ratio}</b></span>` : `<span class="dm"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">${eta}</b></span>`}
        <span class="dm"><ha-icon icon="mdi:harddisk" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">${completed} / ${total}</b></span>
        <span class="dm"><ha-icon icon="mdi:upload" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">${seeds}</b></span>
        <span class="dm"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">${leechs}</b></span>
      </div>
      <div class="pbar"><div class="pbar-fill ${pbarClass}" style="width:${pct}%"></div></div>
    </div>`;
  }
  _renderSab() {
    if (!this._sabConfigured) return "";
    const sabKbps = parseFloat(this._sab.kbpersec) || 0;
    const speedStr = this.fmtSpeed(sabKbps * 1024);
    const slots = Array.isArray(this._sab.slots) ? this._sab.slots : [];
    const sabPaused = this._sab.status === "Paused";
    const items = this._pagedList(slots, "sab", (s) => this._renderSabItem(s), this._perPage("sab"));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon("sab")}
        <span class="col-hdr-title">SABnzbd</span>
        <div class="col-hdr-line"></div>
        ${this._sabBusy ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>` : `<button class="action-btn sab-global-toggle${sabPaused ? " paused" : ""}" title="${sabPaused ? this._t("resumeSab") : this._t("pauseSab")}">
               <ha-icon icon="${sabPaused ? "mdi:play" : "mdi:pause"}" style="--mdc-icon-size:16px"></ha-icon>
             </button>`}
      </div>
      ${items}
      ${this._renderSabFailed()}
    </div>`;
  }
  _renderSabFailed() {
    if (!this._sabFailed || this._sabFailed.length === 0) return "";
    const rows = this._sabFailed.map((s) => {
      const name = this._escHtml(s.name || s.filename || "Unknown");
      const isRetrying = this._sabRetryBusy === s.nzo_id;
      const isDeleting = this._sabDeleteBusy === s.nzo_id;
      const isBusy = isRetrying || isDeleting;
      const btns = isBusy ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;flex-shrink:0"></span>` : `<button class="tb tb-retry"  data-nzoid="${s.nzo_id}" title="${this._t("retry")}"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:14px"></ha-icon></button>
         <button class="tb tb-hist-del" data-nzoid="${s.nzo_id}" title="${this._t("removeFromHist")}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:14px"></ha-icon></button>`;
      return `
      <div class="dl dl-failed">
        <div class="dl-r1">
          <ha-icon icon="mdi:alert-circle-outline" style="--mdc-icon-size:13px;color:rgba(255,69,58,0.85);flex-shrink:0;margin-right:3px"></ha-icon>
          <span class="dl-name" title="${name}" style="color:rgba(255,120,110,0.90)">${name}</span>
          <div style="display:flex;gap:3px;flex-shrink:0">${btns}</div>
        </div>
      </div>`;
    }).join("");
    return `
    <div class="sab-failed-sep"></div>
    ${rows}`;
  }
  _renderSabItem(s) {
    const pct = parseFloat(s.percentage) || 0;
    const mbTotal = parseFloat(s.mb) || 0;
    const mbLeft = parseFloat(s.mbleft) || 0;
    const mbDone = mbTotal - mbLeft;
    const sizeStr = s.size || `${mbTotal.toFixed(0)} MB`;
    const doneSizeStr = this.fmtSize(mbDone * 1024 * 1024);
    const totalSizeStr = this.fmtSize(mbTotal * 1024 * 1024);
    const sabKbps = parseFloat(this._sab.kbpersec) || 0;
    const speedStr = this.fmtSpeed(sabKbps * 1024);
    const eta = s.timeleft || "";
    const name = this._escHtml(s.filename || "Unknown");
    return `
    <div class="dl">
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        <span class="dl-pct">${pct}%</span>
      </div>
      <div class="dl-r2">
        <span class="dm"><b class="g"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px"></ha-icon> ${speedStr}</b></span>
        <span class="dm"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">${eta}</b></span>
        <span class="dm"><ha-icon icon="mdi:harddisk" style="--mdc-icon-size:11px;color:rgba(255,255,255,0.85)"></ha-icon><b class="dm-val">${doneSizeStr} / ${totalSizeStr}</b></span>
      </div>
      <div class="pbar"><div class="pbar-fill pf-orange" style="width:${pct}%"></div></div>
    </div>`;
  }
  // ─────────────────────────────────────────────
  // Right column
  // ─────────────────────────────────────────────
  _renderPendingRequests() {
    const reqs = this._pendingRequests;
    if (!reqs || reqs.length === 0) return "";
    const grid = this._pagedGrid(reqs, "pending", (req) => this._renderPendingCard(req));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:bell-ring" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("pendingRequests")}</span>
        <span class="pr-badge">${reqs.length}</span>
        <div class="col-hdr-line"></div>
      </div>
      ${grid}
    </div>`;
  }
  _renderPendingCard(req) {
    const media = req.media ?? {};
    const isMovie = req.type === "movie";
    const title = this._escHtml(media.title || media.originalTitle || media.name || "\u2014");
    const poster = media.posterPath ? `https://image.tmdb.org/t/p/w342${media.posterPath}` : null;
    const reqBy = this._escHtml(req.requestedBy?.displayName ?? req.requestedBy?.username ?? "?");
    const reqDate = req.createdAt ? this.fmtDate(req.createdAt.slice(0, 10)) : "";
    const typeLabel = isMovie ? this._t("movieLabel") : this._t("showLabel");
    const icon = isMovie ? "\u{1F3AC}" : "\u{1F4FA}";
    const tmdbId = media.tmdbId ?? 0;
    const coverHtml = poster ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" onerror="this.parentElement.innerHTML='${icon}'" /></div>` : `<div class="mc-cover-lg ${this._grad(req.id)}">${icon}</div>`;
    return `
    <div class="mc" data-popup="${isMovie ? "movie" : "tv"}" data-tmdbid="${tmdbId}" data-title="${title}" style="position:relative">
      ${coverHtml}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="pr-meta-row">
          <span class="pr-type-lbl">${typeLabel}</span>
          <span class="pr-requester">\u{1F464} ${reqBy}${reqDate ? ` \xB7 ${reqDate}` : ""}</span>
        </div>
        <div class="pr-btn-row">
          <button class="pr-approve" data-reqid="${req.id}">\u2713<span class="st-txt">${this._t("approve")}</span></button>
          <button class="pr-decline" data-reqid="${req.id}">\u2715<span class="st-txt">${this._t("decline")}</span></button>
        </div>
      </div>
    </div>`;
  }
};
var renderLeftMixin = _RenderLeft.prototype;

// src/render/right.js
var _RenderRight = class {
  _renderRight() {
    const perPage = Math.max(1, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
    const hasCalendar = this._calendar && this._calendar.length > 0;
    const hasPending = this._hass.user.is_admin && this._pendingRequests.length > 0;
    const allCategories = [
      ...hasPending ? [() => this._renderPendingRequests()] : [],
      () => this._renderRadarr(),
      () => this._renderSonarr(),
      () => this._renderUpcoming(),
      () => this._renderTvUpcoming(),
      () => this._renderTrending(),
      () => this._renderPopular(),
      ...hasCalendar ? [() => this._renderCalendar()] : []
    ];
    const total = allCategories.length;
    const totalPages = Math.ceil(total / perPage);
    const page = Math.max(0, Math.min(this._rightPage || 0, totalPages - 1));
    const start = page * perPage;
    const slice = allCategories.slice(start, start + perPage);
    const _join = (fns) => fns.map((fn, i) => `${i > 0 ? '<div class="spacer-sm"></div>' : ""}${fn()}`).join("");
    const hasPrev = page > 0;
    const hasNext = page < totalPages - 1;
    const dots = totalPages > 1 ? Array.from(
      { length: totalPages },
      (_, i) => `<button class="rp-dot${i === page ? " rp-dot-active" : ""}" data-section="right" data-page="${i}"></button>`
    ).join("") : "";
    const navBar = hasPrev || hasNext ? `
    <div class="rp-nav">
      <button class="rp-btn ${hasPrev ? "" : "rp-btn-hidden"}" data-section="right" data-dir="prev" ${hasPrev ? "" : "disabled"}>
        <ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:16px"></ha-icon> ${this._t("prev")}
      </button>
      <div class="rp-dots">${dots}</div>
      <button class="rp-btn ${hasNext ? "" : "rp-btn-hidden"}" data-section="right" data-dir="next" ${hasNext ? "" : "disabled"}>
        ${this._t("next")} <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:16px"></ha-icon>
      </button>
    </div>` : "";
    if (this._trendingOverlayOpen) return this._renderTrendingOverlay() + this._renderTrendingOverlayNav();
    return `<div class="rp-sections">${_join(slice)}</div>${navBar}`;
  }
  _renderRightHeader() {
    return `
    <div class="col-hdr">
      <ha-icon icon="mdi:movie-outline" style="--mdc-icon-size:22px"></ha-icon>
      <span class="col-hdr-title">${this._t("overview")}</span>
      <div class="col-hdr-line"></div>
    </div>`;
  }
  _renderRadarr() {
    const grid = this._radarr.length === 0 ? `<div class="placeholder">${this._t("noRadarr")}</div>` : this._pagedGrid(this._radarr, "radarr", (m) => this._renderRadarrCard(m));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:filmstrip" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("recentMovies")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(0,132,255,0.15);border:1px solid rgba(0,132,255,0.25)">${this._radarrTotal} ${this._t("movies")}</span>
      </div>
      ${grid}
    </div>`;
  }
  // Map full language name → ISO 639-1 code
  _langCode(name) {
    const MAP = {
      Czech: "CS",
      English: "EN",
      German: "DE",
      French: "FR",
      Spanish: "ES",
      Italian: "IT",
      Polish: "PL",
      Slovak: "SK",
      Russian: "RU",
      Japanese: "JA",
      Korean: "KO",
      Chinese: "ZH",
      Portuguese: "PT",
      Dutch: "NL",
      Swedish: "SV",
      Norwegian: "NO",
      Danish: "DA",
      Finnish: "FI",
      Hungarian: "HU",
      Romanian: "RO",
      Ukrainian: "UK",
      Turkish: "TR",
      Arabic: "AR",
      Hindi: "HI",
      Croatian: "HR",
      Serbian: "SR",
      Bulgarian: "BG",
      Greek: "EL",
      Hebrew: "HE",
      Thai: "TH"
    };
    return MAP[name] || name.substring(0, 2).toUpperCase();
  }
  // Max 2 languages, CS first then EN then others
  _topLangs(langs) {
    const unique = [...new Set(langs.filter(Boolean))];
    if (unique.length <= 2) return unique;
    const priority = ["CS", "EN"];
    const ordered = [
      ...priority.filter((l) => unique.includes(l)),
      ...unique.filter((l) => !priority.includes(l))
    ];
    return ordered.slice(0, 2);
  }
  _renderRadarrCard(m) {
    const poster = this._getRadarrPoster(m);
    const title = this._escHtml(m.title || "Unknown");
    const year = m.year || "";
    const qualityName = m.movieFile?.quality?.quality?.name || "";
    const hasFile = m.hasFile;
    const cutoffNotMet = m.movieFile?.qualityCutoffNotMet;
    const dlFailed = this._radarrQueueFailed.has(m.id);
    const dlActive = this._radarrQueueActive.has(m.id);
    let badge = "";
    if (hasFile && cutoffNotMet) {
      badge = `<span class="badge b-cutoff">\u26A1<span class="b-txt"> Upgrade</span></span>`;
    } else if (hasFile) {
      badge = `<span class="badge b-ok">\u2713</span>`;
    } else if (dlFailed) {
      badge = `<span class="badge b-missing">\u2717<span class="b-txt"> Selhalo</span></span>`;
    } else if (dlActive) {
      badge = `<span class="badge b-dl">\u2193<span class="b-txt"> ${this._t("badgeDownloading")}</span></span>`;
    } else {
      badge = `<span class="badge b-missing">\u2717<span class="b-txt"> ${this._t("badgeMissing")}</span></span>`;
    }
    const sub = [year, qualityName].filter(Boolean).join(" \xB7 ");
    let audioBadge = "";
    if (hasFile) {
      let audioLangs = [];
      if (Array.isArray(m.movieFile?.languages) && m.movieFile.languages.length > 0) {
        audioLangs = m.movieFile.languages.map((l) => this._langCode(l.name || "")).filter(Boolean);
      } else if (m.movieFile?.mediaInfo?.audioLanguages) {
        audioLangs = m.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map((l) => this._langCode(l.trim())).filter(Boolean);
      }
      if (audioLangs.length > 0) {
        const codes = this._topLangs(audioLangs).join(" | ");
        audioBadge = `<span class="badge b-audio" title="Audio: ${codes}"><ha-icon icon="mdi:volume-high" style="--mdc-icon-size:9px"></ha-icon> ${codes}</span>`;
      }
    }
    let subBadge = "";
    const bz = this._bazarrConfigured ? this._bazarr[m.id] : null;
    if (bz) {
      if (bz.missing.length > 0) {
        const langs = this._topLangs(bz.missing.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
        subBadge = `<span class="badge b-sub-miss" title="${this._t("missingSubs")}: ${langs}"><ha-icon icon="mdi:subtitles-outline" style="--mdc-icon-size:9px"></ha-icon> ${langs}</span>`;
      } else if (bz.subtitles.length > 0) {
        const langs = this._topLangs(bz.subtitles.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
        subBadge = `<span class="badge b-sub-ok" title="${this._t("subtitles")}: ${langs}"><ha-icon icon="mdi:subtitles" style="--mdc-icon-size:9px"></ha-icon> ${langs}</span>`;
      }
    }
    return `
    <div class="mc" data-popup="radarr" data-tmdbid="${m.tmdbId}" data-title="${title}">
      ${poster ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" /></div>` : `<div class="mc-cover-lg ${this._grad(m.id)}">\u{1F3AC}</div>`}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-sub">${this._escHtml(sub)}</div>
        <div class="mc-badges">${badge}${subBadge}${audioBadge}</div>
      </div>
    </div>`;
  }
  _getRadarrPoster(m) {
    if (!m.images) return null;
    const img = m.images.find((i) => i.coverType === "poster");
    return img ? img.remoteUrl : null;
  }
  _renderRequestOverlay(movieId, tmdbId) {
    const defProfileId = Number(this._seerrRadarr?.profileId ?? 0);
    const profiles = this._radarrProfiles;
    const profileOptions = profiles.length > 0 ? profiles.map(
      (p) => `<option value="${p.id}" ${Number(p.id) === defProfileId ? "selected" : ""}>${this._escHtml(p.name)}</option>`
    ).join("") : `<option value="${defProfileId}">${this._t("defaultProfile")}</option>`;
    return `
    <div class="req-overlay">
      <div class="req-inner">
        <span class="req-label">${this._t("downloadQuality")}</span>
        <select class="req-select" id="req-select-${movieId}">
          ${profileOptions}
        </select>
        <div class="req-actions">
          <button class="req-cancel" data-req="cancel">${this._t("cancel")}</button>
          <button class="req-confirm" data-req="confirm" data-movieid="${movieId}" data-tmdb="${tmdbId}">
            <ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${this._t("confirm")}
          </button>
        </div>
      </div>
    </div>`;
  }
  _renderSonarr() {
    const grid = this._sonarr.length === 0 ? `<div class="placeholder">${this._t("noSonarr")}</div>` : this._pagedGrid(this._sonarr, "sonarr", (s) => this._renderSonarrCard(s));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:television-play" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("recentShows")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(255,214,10,0.12);border:1px solid rgba(255,214,10,0.22)">${this._sonarrTotal} ${this._t("shows")}</span>
      </div>
      ${grid}
    </div>`;
  }
  _renderSonarrCard(s) {
    const poster = this._getSonarrPoster(s);
    const title = this._escHtml(s.title || "Unknown");
    const stats = s.statistics || {};
    const fileCount = stats.episodeFileCount || 0;
    const totalCount = stats.totalEpisodeCount || 0;
    const seasonCount = stats.seasonCount || 0;
    let badge = "";
    if (fileCount === 0 && totalCount > 0) {
      badge = `<span class="badge b-missing">\u2717<span class="b-txt"> ${this._t("badgeMissing")}</span></span>`;
    } else if (fileCount < totalCount) {
      badge = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
    } else if (totalCount > 0) {
      badge = `<span class="badge b-ok">\u2713</span>`;
    }
    const epBadge = totalCount > 0 ? `<span class="badge b-ep">${totalCount} ep</span>` : "";
    return `
    <div class="mc" data-popup="sonarr" data-tvdbid="${s.tvdbId}" data-tmdbid="${s.tmdbId || ""}" data-title="${title}">
      ${poster ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" /></div>` : `<div class="mc-cover-lg ${this._grad(s.id)}">\u{1F4FA}</div>`}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-sub">${seasonCount} ${this._t("seasons")} \xB7 ${totalCount} ${this._t("episodes")}</div>
        <div class="mc-badges">${epBadge}${badge}</div>
      </div>
    </div>`;
  }
  _getSonarrPoster(s) {
    if (!s.images) return null;
    const img = s.images.find((i) => i.coverType === "poster");
    return img ? img.remoteUrl : null;
  }
  _renderUpcoming() {
    let grid = "";
    if (this._upcomingError) {
      grid = `<div class="placeholder" style="color:rgba(255,80,80,0.9);font-size:11px">\u26A0 ${this._escHtml(this._upcomingError)}</div>`;
    } else if (!this._upcoming || this._upcoming.length === 0) {
      grid = `<div class="placeholder">${this._t("loading")}</div>`;
    } else {
      grid = this._pagedGrid(this._upcoming, "upcoming", (m) => this._renderUpcomingCard(m));
    }
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:ticket-outline" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("upcomingMovies")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
    </div>`;
  }
  _renderTvUpcoming() {
    const p = this._tvRequestPending?.source === "tvUpcoming" ? this._tvRequestPending : null;
    const grid = !this._tvUpcoming || this._tvUpcoming.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGrid(this._tvUpcoming, "tvUpcoming", (m) => this._renderTvUpcomingCard(m));
    return `
    <div class="sec-card" style="position:relative">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:television-play" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("newShows")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
      ${p ? this._renderTvRequestOverlay() : ""}
    </div>`;
  }
  _renderTvUpcomingCard(m, { showRating = false, typeTag = "", overlayIndex = null } = {}) {
    const title = this._escHtml(m.name || m.originalName || "Unknown");
    const rating = m.voteAverage ? m.voteAverage.toFixed(1) : "?";
    const mediaStatus = m.mediaInfo?.status;
    const sonarrEntry = Array.isArray(this._sonarr) && this._sonarr.find((s) => s.tmdbId === m.id);
    const inSonarr = !!sonarrEntry;
    const inSonarrAvail = !!(sonarrEntry && sonarrEntry.statistics?.episodeFileCount > 0);
    const _inOptimistic = this._optimisticRequested.has(m.id);
    const _withdrawn = this._withdrawnIds.has(m.id);
    const _hasPending = this._familyPendingIds.has(m.id);
    const _stale = mediaStatus >= 3 && !inSonarr && !_inOptimistic && !_hasPending;
    const _isAvail = (inSonarrAvail || mediaStatus === 5) && !_withdrawn && !_stale;
    const _isReq = (mediaStatus >= 2 || _inOptimistic || _hasPending || inSonarr) && !_withdrawn && !inSonarrAvail && !_stale;
    const _reqId = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(m.id);
    const _isAdmin = this._hass.user.is_admin;
    let actionBtn = "";
    if (_isAvail) {
      actionBtn = `<span class="badge b-st-avail" style="margin-left:auto">\u2713<span class="b-txt"> ${this._t("badgeAvailable")}</span></span>`;
    } else if (_isReq) {
      if (_isAdmin || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
        actionBtn = `<span class="badge b-st-proc" style="margin-left:auto">\u2193<span class="b-txt"> ${this._t("badgeAdded")}</span></span>`;
      } else {
        const withdrawBtn = _reqId ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}">\u2715</button>` : "";
        actionBtn = `<span class="mc-act-right"><span class="badge b-st-pend">\u23F1<span class="b-txt"> ${this._t("badgePending")}</span></span>${withdrawBtn}</span>`;
      }
    } else {
      actionBtn = `<button class="btn-add tv-req-open" data-showid="${m.id}" data-title="${title}">${this._t("add")}</button>`;
    }
    const tagHtml = typeTag ? `<span class="media-type-tag">${typeTag}</span>` : "";
    let coverHtml = "";
    if (m.posterPath) {
      const posterUrl = `https://image.tmdb.org/t/p/w342${m.posterPath}`;
      coverHtml = `<div class="mc-cover-lg" style="background:none;padding:0;position:relative">${tagHtml}<img src="${posterUrl}" style="width:100%;height:92px;object-fit:cover" loading="lazy" onerror="this.parentElement.innerHTML='\u{1F4FA}'" /></div>`;
    } else {
      coverHtml = `<div class="mc-cover-lg ${this._grad(m.id)}" style="position:relative">${tagHtml}\u{1F4FA}</div>`;
    }
    return `
    <div class="mc" data-popup="tv" data-tmdbid="${m.id}" data-title="${title}"${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ""}>
      ${coverHtml}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-act">
          ${showRating ? `<span class="imdb">\u2B50 ${rating}</span>` : ""}
          ${actionBtn}
        </div>
      </div>
    </div>`;
  }
  _renderTvRequestOverlay() {
    const p = this._tvRequestPending;
    if (!p) return "";
    if (p.loading || !p.seasons) {
      return `
      <div class="req-overlay tv-req-overlay">
        <span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span>
      </div>`;
    }
    const defProfileId = Number(p.profileId ?? 0);
    const profileOptions = this._sonarrProfiles.length > 0 ? this._sonarrProfiles.map(
      (pr) => `<option value="${pr.id}" ${Number(pr.id) === defProfileId ? "selected" : ""}>${this._escHtml(pr.name)}</option>`
    ).join("") : `<option value="${defProfileId}">${this._t("defaultProfile")}</option>`;
    const seasons = p.seasons;
    const pages = [];
    for (let i = 0; i < seasons.length; i += 4) pages.push(seasons.slice(i, i + 4));
    const multiPage = pages.length > 1;
    const pagesHtml = pages.map((page) => `
    <div class="sv-page">
      ${page.map((sn) => `
        <label class="sv-wrap">
          <input type="checkbox" class="sv-input" data-season="${sn}" ${p.selected.has(sn) ? "checked" : ""}>
          <span class="sv-track"><span class="sv-thumb"></span></span>
          <span class="sv-lbl">S${sn}</span>
        </label>`).join("")}
    </div>`).join("");
    const dotsHtml = multiPage ? `<div class="sv-dots">${pages.map(
      (_, i) => `<span class="sv-dot${i === 0 ? " sv-dot-active" : ""}" data-pg="${i}"></span>`
    ).join("")}</div>` : "";
    const poster = p.show.posterPath ? `<img src="https://image.tmdb.org/t/p/w92${p.show.posterPath}" class="tv-req-poster">` : `<span class="tv-req-poster tv-req-poster-ph">\u{1F4FA}</span>`;
    return `
    <div class="req-overlay tv-req-overlay">
      <div class="tv-req-inner">
        <div class="tv-req-top">
          ${poster}
          <div class="tv-req-info">
            <div class="tv-req-title">${this._escHtml(p.show.name || p.show.originalName || "")}</div>
            <select class="req-select" id="tv-req-profile">${profileOptions}</select>
          </div>
        </div>
        <div class="sv-nav-wrap">
          ${multiPage ? `<button class="sv-chev sv-prev" disabled><ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:18px"></ha-icon></button>` : ""}
          <div class="sv-scroll" id="sv-scroll">${pagesHtml}</div>
          ${multiPage ? `<button class="sv-chev sv-next"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px"></ha-icon></button>` : ""}
        </div>
        ${dotsHtml}
        <div class="req-actions">
          <button class="req-cancel tv-req-cancel">${this._t("cancel")}</button>
          <button class="tv-req-confirm req-confirm" data-mediaid="${p.mediaId}">
            <ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${this._t("confirm")}
          </button>
        </div>
      </div>
    </div>`;
  }
  _renderTrendingCard(m, overlayIndex = null) {
    if (m.mediaType === "tv") {
      return this._renderTvUpcomingCard(m, { showRating: true, typeTag: this._t("typeTv"), overlayIndex });
    }
    return this._renderUpcomingCard(m, { showDate: false, typeTag: this._t("typeMovie"), overlayIndex });
  }
  _renderTrending() {
    const p = this._tvRequestPending?.source === "trending" ? this._tvRequestPending : null;
    let grid;
    if (!this._trending || this._trending.length === 0) {
      grid = `<div class="placeholder">${this._t("loading")}</div>`;
    } else {
      const first35 = this._trending.slice(0, 35);
      const itemsWithSeeMore = [...first35, { _isSeeMore: true }];
      grid = this._pagedGrid(
        itemsWithSeeMore,
        "trending",
        (m) => m._isSeeMore ? this._renderSeeMoreCard() : this._renderTrendingCard(m)
      );
    }
    return `
    <div class="sec-card" style="position:relative">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:trending-up" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("trendingMovies")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
      ${p ? this._renderTvRequestOverlay() : ""}
    </div>`;
  }
  _renderSeeMoreCard() {
    const teasers = (this._trending || []).slice(-4);
    const cells = [];
    for (let i = 0; i < 4; i++) {
      const m = teasers[i];
      if (m) {
        const pp = m.posterPath || m.poster_path;
        if (pp) {
          cells.push(`<img src="https://image.tmdb.org/t/p/w92${pp}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">`);
        } else {
          cells.push(`<div class="${this._grad(m.id)}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px">${m.mediaType === "tv" ? "\u{1F4FA}" : "\u{1F3AC}"}</div>`);
        }
      } else {
        cells.push(`<div style="width:100%;height:100%;background:rgba(255,255,255,0.06)"></div>`);
      }
    }
    const remainCount = Math.max(0, (this._trending?.length ?? 0) - 3);
    return `
    <div class="mc smp-card" data-action="trending-open">
      <!-- hidden spacer \u2014 d\xE1 kart\u011B stejnou v\xFD\u0161ku jako ostatn\xED mc karty -->
      <div class="mc-cover-lg" style="padding:0;visibility:hidden" aria-hidden="true"></div>
      <div class="mc-info" style="visibility:hidden" aria-hidden="true">
        <div class="mc-title">X</div>
        <div class="mc-act"><span class="badge">X</span></div>
      </div>
      <!-- 2\xD72 grid pokr\xFDv\xE1 celou kartu -->
      <div class="smp-full">
        <div class="smp-posters">${cells.join("")}</div>
        <div class="smp-overlay">
          <div class="smp-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </div>
          <span class="smp-cta">${this._t("seeMore")}</span>
          <span class="smp-count">+${remainCount}</span>
        </div>
      </div>
    </div>`;
  }
  _renderTrendingOverlay() {
    const items = this._trending || [];
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const rows = Math.max(1, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
    const perPage = isMobile ? rows * 2 : rows * 4;
    const page = this._trendingOverlayPage || 0;
    const pageItems = items.slice(page * perPage, (page + 1) * perPage);
    const gridHtml = pageItems.map((m, i) => this._renderTrendingCard(m, i)).join("");
    return `
    <div class="trending-overlay">
      <div class="col-hdr" style="margin-bottom:8px">
        <ha-icon icon="mdi:trending-up" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("trendingMovies")}</span>
        <div class="col-hdr-line"></div>
        <button class="to-close" data-action="trending-close">\u2715</button>
      </div>
      <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">\u2039</button>
        <div class="to-grid">${gridHtml}</div>
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">\u203A</button>
      </div>
    </div>`;
  }
  // Paging pro trending overlay — stejná struktura jako standardní rp-nav
  _renderTrendingOverlayNav() {
    const items = this._trending || [];
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const rows = Math.max(1, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
    const perPage = isMobile ? rows * 2 : rows * 4;
    const page = this._trendingOverlayPage || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const hasPrev = page > 0;
    const hasNext = page < totalPages - 1 || this._trendingFetchedApiPage < this._trendingApiTotalPages;
    if (!hasPrev && !hasNext) return "";
    const dots = totalPages > 1 ? Array.from(
      { length: totalPages },
      (_, i) => `<button class="rp-dot${i === page ? " rp-dot-active" : ""}" data-topage="${i}"></button>`
    ).join("") : "";
    return `
    <div class="rp-nav">
      <button class="rp-btn ${hasPrev ? "" : "rp-btn-hidden"}" data-action="trending-prev" ${hasPrev ? "" : "disabled"}>
        <ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:16px"></ha-icon> ${this._t("prev")}
      </button>
      <div class="rp-dots">${dots}</div>
      <button class="rp-btn ${hasNext ? "" : "rp-btn-hidden"}" data-action="trending-next" ${hasNext ? "" : "disabled"}>
        ${this._t("next")} <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:16px"></ha-icon>
      </button>
    </div>`;
  }
  _renderTvOverlayCompact(p) {
    if (!p || p.loading || !p.seasons) {
      return `<div style="display:flex;align-items:center;justify-content:center;padding:20px">
      <span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span>
    </div>`;
    }
    const defProfileId = Number(p.profileId ?? 0);
    const profileOptions = this._sonarrProfiles.length > 0 ? this._sonarrProfiles.map(
      (pr) => `<option value="${pr.id}" ${Number(pr.id) === defProfileId ? "selected" : ""}>${this._escHtml(pr.name)}</option>`
    ).join("") : `<option value="${defProfileId}">${this._t("defaultProfile")}</option>`;
    const seasons = p.seasons;
    const pages = [];
    for (let i = 0; i < seasons.length; i += 4) pages.push(seasons.slice(i, i + 4));
    const multiPage = pages.length > 1;
    const pagesHtml = pages.map((page) => `
    <div class="sv-page">
      ${page.map((sn) => `
        <label class="sv-wrap">
          <input type="checkbox" class="sv-input" data-season="${sn}" ${p.selected.has(sn) ? "checked" : ""}>
          <span class="sv-track"><span class="sv-thumb"></span></span>
          <span class="sv-lbl">S${sn}</span>
        </label>`).join("")}
    </div>`).join("");
    const dotsHtml = multiPage ? `<div class="sv-dots">${pages.map(
      (_, i) => `<span class="sv-dot${i === 0 ? " sv-dot-active" : ""}" data-pg="${i}"></span>`
    ).join("")}</div>` : "";
    const poster = p.show.posterPath ? `<img src="https://image.tmdb.org/t/p/w92${p.show.posterPath}" class="tv-req-poster">` : `<span class="tv-req-poster tv-req-poster-ph">\u{1F4FA}</span>`;
    return `
    <div class="tv-req-inner">
      <div class="tv-req-top">
        ${poster}
        <div class="tv-req-info">
          <div class="tv-req-title">${this._escHtml(p.show.name || p.show.originalName || "")}</div>
          <select class="req-select" id="tv-req-profile-abs">${profileOptions}</select>
        </div>
      </div>
      <div class="sv-nav-wrap">
        ${multiPage ? `<button class="sv-chev sv-prev-abs" disabled><ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:18px"></ha-icon></button>` : ""}
        <div class="sv-scroll" id="sv-scroll-abs">${pagesHtml}</div>
        ${multiPage ? `<button class="sv-chev sv-next-abs"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px"></ha-icon></button>` : ""}
      </div>
      ${dotsHtml}
      <div class="req-actions">
        <button class="req-cancel to-tv-cancel-abs">${this._t("cancel")}</button>
        <button class="to-tv-confirm-abs req-confirm" data-mediaid="${p.mediaId}">
          <ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${this._t("confirm")}
        </button>
      </div>
    </div>`;
  }
  _renderPopular() {
    const grid = !this._popular || this._popular.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGrid(this._popular, "popular", (m) => this._renderUpcomingCard(m, { showDate: false }));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:fire" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("popularMovies")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(0,132,255,0.12);border:1px solid rgba(0,132,255,0.22)">ze Seerr</span>
      </div>
      ${grid}
    </div>`;
  }
  _renderUpcomingCard(m, { showDate = true, showRating = !showDate, typeTag = "", overlayIndex = null } = {}) {
    const title = this._escHtml(m.title || "Unknown");
    const rating = m.voteAverage ? m.voteAverage.toFixed(1) : "?";
    const dateStr = this.fmtDate(m.releaseDate);
    const radarrEntry = Array.isArray(this._radarr) && this._radarr.find((r) => r.tmdbId === m.id);
    const inRadarr = !!radarrEntry;
    const inRadarrAvail = !!(radarrEntry && radarrEntry.hasFile);
    const inRadarrDownloading = !!(radarrEntry && !radarrEntry.hasFile && this._radarrQueueActive.has(radarrEntry.id));
    const mediaStatus = m.mediaInfo?.status;
    const _inOptimistic = this._optimisticRequested.has(m.id);
    const _withdrawn = this._withdrawnIds.has(m.id);
    const _hasPending = this._familyPendingIds.has(m.id);
    const _stale = mediaStatus >= 3 && !inRadarr && !_inOptimistic && !_hasPending;
    const _isAvail = (inRadarrAvail || mediaStatus === 5) && !_withdrawn && !_stale;
    const _isReq = (mediaStatus >= 2 || _inOptimistic || _hasPending || inRadarr) && !_withdrawn && !inRadarrAvail && !_stale;
    const _reqId = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(m.id);
    const _isAdmin = this._hass.user.is_admin;
    let actionBtn = "";
    if (_isAvail) {
      actionBtn = `<span class="badge b-st-avail" style="margin-left:auto">\u2713<span class="b-txt"> ${this._t("badgeAvailable")}</span></span>`;
    } else if (_isReq) {
      if (inRadarrDownloading) {
        actionBtn = `<span class="badge b-dl" style="margin-left:auto">\u2193<span class="b-txt"> ${this._t("badgeDownloading")}</span></span>`;
      } else if (_isAdmin || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
        actionBtn = `<span class="badge b-st-proc" style="margin-left:auto">\u2193<span class="b-txt"> ${this._t("badgeAdded")}</span></span>`;
      } else {
        const withdrawBtn = _reqId ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}">\u2715</button>` : "";
        actionBtn = `<span class="mc-act-right"><span class="badge b-st-pend">\u23F1<span class="b-txt"> ${this._t("badgePending")}</span></span>${withdrawBtn}</span>`;
      }
    } else {
      actionBtn = `<button class="btn-add req-open" data-movieid="${m.id}" data-tmdb="${m.id}">${this._t("add")}</button>`;
    }
    const overlay = this._requestPending?.movieId === m.id ? this._renderRequestOverlay(m.id, m.id) : "";
    const tagHtml = typeTag ? `<span class="media-type-tag">${typeTag}</span>` : "";
    let coverHtml = "";
    const posterPath = m.posterPath || m.poster_path || null;
    if (posterPath) {
      const posterUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
      coverHtml = `<div class="mc-cover-lg" style="background:none;padding:0;position:relative">${tagHtml}<img src="${posterUrl}" style="width:100%;height:92px;object-fit:cover" loading="lazy" onerror="this.parentElement.innerHTML='\u{1F3AC}'" /></div>`;
    } else {
      coverHtml = `<div class="mc-cover-lg ${this._grad(m.id)}" style="position:relative">${tagHtml}\u{1F3AC}</div>`;
    }
    return `
    <div class="mc" data-popup="movie" data-tmdbid="${m.id}" data-title="${title}" style="position:relative"${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ""}>
      ${coverHtml}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-act">
          ${showRating ? `<span class="imdb">\u2B50 ${rating}</span>` : ""}
          ${showDate && dateStr ? `<span class="date-lbl">${dateStr}</span>` : ""}
          ${actionBtn}
        </div>
      </div>
      ${overlay}
    </div>`;
  }
  _renderCalendar() {
    let grid = "";
    if (!this._calendar || this._calendar.length === 0) {
      grid = `<div class="placeholder">${this._t("noEpisodes")}</div>`;
    } else {
      grid = this._pagedGrid(this._calendar, "calendar", (ep) => this._renderCalendarCard(ep));
    }
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:calendar-clock" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("newEpisodes")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(255,149,0,0.12);border:1px solid rgba(255,149,0,0.22)">ze Sonarr</span>
      </div>
      ${grid}
    </div>`;
  }
  _renderCalendarCard(ep) {
    const series = ep.series || {};
    const title = this._escHtml(series.title || ep.seriesTitle || "Unknown");
    const s = String(ep.seasonNumber || 0).padStart(2, "0");
    const e = String(ep.episodeNumber || 0).padStart(2, "0");
    const badge = `S${s}E${e}`;
    const dateStr = this.fmtDate(ep.airDate);
    const poster = this._getSonarrPoster(series);
    return `
    <div class="mc" data-popup="sonarr" data-tvdbid="${ep.series?.tvdbId || ""}" data-tmdbid="${ep.series?.tmdbId || ""}" data-title="${title}">
      ${poster ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" /></div>` : `<div class="mc-cover-lg ${this._grad(ep.seriesId)}">\u{1F4FA}</div>`}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="mc-act">
          <span class="badge b-ep">${badge}</span>
          <span class="date-lbl">${dateStr}</span>
        </div>
      </div>
    </div>`;
  }
  // ─────────────────────────────────────────────
  // qBittorrent action API
  // ─────────────────────────────────────────────
};
var renderRightMixin = _RenderRight.prototype;

// src/wire/index.js
var _WireMethods = class {
  async _qbitAction(hash, action, deleteFiles = false) {
    const isGlobal = action === "pauseAll" || action === "resumeAll";
    if (isGlobal) {
      this._qbitBusy = true;
    } else {
      this._qbitItemBusy = hash;
    }
    this._reRenderLeft();
    try {
      await this._hass.callApi("POST", "arr_stack/qbit/action", { action, hash, deleteFiles });
    } catch (e) {
      console.error("[arr-card] qBit action error:", e);
    } finally {
      this._confirmRemove = null;
      await new Promise((r) => setTimeout(r, 2e3));
      await this._fetchQbit();
      this._qbitBusy = false;
      this._qbitItemBusy = null;
      this._reRenderLeft();
    }
  }
  // ─────────────────────────────────────────────
  // SABnzbd action API
  // ─────────────────────────────────────────────
  async _sabAction(mode) {
    this._sabBusy = true;
    this._reRenderLeft();
    try {
      await this._hass.callApi("POST", "arr_stack/sabnzbd/action", { mode });
    } catch (e) {
      console.error("[arr-card] SAB action error:", e);
    } finally {
      await this._fetchSab();
      this._sabBusy = false;
      this._reRenderLeft();
    }
  }
  // ─────────────────────────────────────────────
  // Re-render only the left column (downloads)
  // ─────────────────────────────────────────────
  _reRenderLeft() {
    const left = this.shadowRoot.getElementById("col-left");
    if (!left) return;
    this._blurActive();
    left.innerHTML = this._renderLeft();
    this._wireSort();
    this._wireActionButtons();
    this._wirePageButtons(left);
  }
  // ─────────────────────────────────────────────
  // Wire up action buttons (global + per-torrent)
  // ─────────────────────────────────────────────
  _wireActionButtons() {
    const qbitToggle = this.shadowRoot.querySelector(".qbit-global-toggle");
    if (qbitToggle) {
      qbitToggle.addEventListener("click", () => {
        const paused = qbitToggle.classList.contains("paused");
        this._qbitAction(null, paused ? "resumeAll" : "pauseAll");
      });
    }
    const sabToggle = this.shadowRoot.querySelector(".sab-global-toggle");
    if (sabToggle) {
      sabToggle.addEventListener("click", () => {
        const paused = sabToggle.classList.contains("paused");
        this._sabAction(paused ? "resume" : "pause");
      });
    }
    this.shadowRoot.querySelectorAll(".tb-retry").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nzoId = btn.dataset.nzoid;
        if (nzoId) this._sabRetry(nzoId);
      });
    });
    this.shadowRoot.querySelectorAll(".tb-hist-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nzoId = btn.dataset.nzoid;
        if (nzoId) this._sabHistoryDelete(nzoId);
      });
    });
    this.shadowRoot.querySelectorAll("[data-tb-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.tbAction;
        const hash = btn.dataset.hash || "";
        if (action === "pause") {
          this._qbitAction(hash, "pause");
        } else if (action === "resume") {
          this._qbitAction(hash, "resume");
        } else if (action === "remove-confirm") {
          this._confirmRemove = hash;
          this._reRenderLeft();
        } else if (action === "cancel-remove") {
          this._confirmRemove = null;
          this._reRenderLeft();
        } else if (action === "remove-keep") {
          this._qbitAction(hash, "delete", false);
        } else if (action === "remove-del") {
          this._qbitAction(hash, "delete", true);
        }
      });
    });
  }
  // ─────────────────────────────────────────────
  // Wire up sort buttons (only re-renders torrent list)
  // ─────────────────────────────────────────────
  _wireSort() {
    const btns = this.shadowRoot.querySelectorAll(".sort-btns .sb");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._sort = btn.dataset.sort || "progress_desc";
        this._pages.qbit = 0;
        this._render();
      });
    });
  }
  // ─────────────────────────────────────────────
  // Wire up Overseerr add buttons
  // ─────────────────────────────────────────────
  _wireOverseerrButtons() {
    this.shadowRoot.querySelectorAll(".overseerr-add").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mediaId = parseInt(btn.dataset.mediaid, 10);
        if (mediaId) {
          btn.disabled = true;
          btn.textContent = "\u2026";
          this._addOverseerrRequest(mediaId);
        }
      });
    });
    this.shadowRoot.querySelectorAll(".req-open").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const movieId = parseInt(btn.dataset.movieid, 10);
        const tmdbId = parseInt(btn.dataset.tmdb, 10);
        if (!movieId) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        if (this._cfgGet("discover", "oneClickMovieRequest", false)) {
          await this._addOverseerrRequest(tmdbId, null);
        } else {
          await this._fetchRadarrProfiles();
          this._requestPending = { movieId, tmdbId };
          this._reRenderRight();
        }
      });
    });
    this.shadowRoot.querySelectorAll(".req-cancel:not(.tv-req-cancel)").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._requestPending = null;
        this._reRenderRight();
      });
    });
    this.shadowRoot.querySelectorAll(".req-confirm:not(.tv-req-confirm)").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const movieId = parseInt(btn.dataset.movieid, 10);
        const tmdbId = parseInt(btn.dataset.tmdb, 10);
        const sel = this.shadowRoot.getElementById(`req-select-${movieId}`);
        const profileId = sel ? sel.value : null;
        btn.disabled = true;
        btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
        await this._addOverseerrRequest(tmdbId, profileId);
      });
    });
    this.shadowRoot.querySelectorAll(".tv-req-open").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const showId = parseInt(btn.dataset.showid, 10);
        if (!showId) return;
        const fromTrending = this._trending.some((m) => m.id === showId && m.mediaType === "tv");
        const show = fromTrending ? this._trending.find((m) => m.id === showId) : this._tvUpcoming.find((m) => m.id === showId);
        if (!show) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        if (btn.closest(".trending-overlay")) {
          const grid = btn.closest(".to-grid");
          const card = btn.closest(".mc[data-oi]");
          const cardIndex = card ? parseInt(card.dataset.oi, 10) : 0;
          const colCount = grid ? Math.round(getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length) : 4;
          await this._openTrendingOverlayTvRequest(show, cardIndex, colCount);
        } else {
          await this._openTvRequestOverlay(show, fromTrending ? "trending" : "tvUpcoming");
        }
      });
    });
    this.shadowRoot.querySelectorAll(".tv-req-cancel").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._tvRequestPending = null;
        this._reRenderRight();
      });
    });
    this.shadowRoot.querySelectorAll(".tv-req-confirm").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const mediaId = parseInt(btn.dataset.mediaid, 10);
        const checked = [...this.shadowRoot.querySelectorAll(".sv-input:checked")];
        const seasons = checked.map((el) => parseInt(el.dataset.season, 10)).filter(Boolean);
        if (!seasons.length) return;
        const profileSel = this.shadowRoot.getElementById("tv-req-profile");
        const profileId = profileSel ? profileSel.value : null;
        btn.disabled = true;
        btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
        await this._addOverseerrTvRequest(mediaId, seasons, profileId);
      });
    });
    this.shadowRoot.querySelectorAll(".req-withdraw").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const reqId = parseInt(btn.dataset.reqid, 10);
        const mediaId = parseInt(btn.dataset.mediaid, 10);
        btn.disabled = true;
        btn.innerHTML = '<span class="action-spinner" style="width:8px;height:8px;border-width:1.5px"></span>';
        this._withdrawOverseerrRequest(reqId, mediaId);
      });
    });
    this.shadowRoot.querySelectorAll(".pr-approve").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const reqId = parseInt(btn.dataset.reqid, 10);
        btn.disabled = true;
        btn.textContent = "\u2026";
        this._approvePendingRequest(reqId);
      });
    });
    this.shadowRoot.querySelectorAll(".pr-decline").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const reqId = parseInt(btn.dataset.reqid, 10);
        btn.disabled = true;
        btn.textContent = "\u2026";
        this._declinePendingRequest(reqId);
      });
    });
    this._wireTvOverlay();
    this._wireTrendingOverlay();
  }
  _wireTvOverlay() {
    const scroll = this.shadowRoot.getElementById("sv-scroll");
    if (!scroll) return;
    const prev = this.shadowRoot.querySelector(".sv-prev");
    const next = this.shadowRoot.querySelector(".sv-next");
    const dots = this.shadowRoot.querySelectorAll(".sv-dot");
    const pageWidth = () => scroll.offsetWidth;
    const updateState = () => {
      const sl = scroll.scrollLeft;
      const pw = pageWidth();
      const maxSl = scroll.scrollWidth - pw;
      if (prev) prev.disabled = sl <= 2;
      if (next) next.disabled = sl >= maxSl - 2;
      if (dots.length) {
        const pg = Math.round(sl / pw);
        dots.forEach((d, i) => d.classList.toggle("sv-dot-active", i === pg));
      }
    };
    scroll.addEventListener("scroll", updateState, { passive: true });
    if (prev) prev.addEventListener("click", (e) => {
      e.stopPropagation();
      scroll.scrollBy({ left: -pageWidth(), behavior: "smooth" });
    });
    if (next) next.addEventListener("click", (e) => {
      e.stopPropagation();
      scroll.scrollBy({ left: pageWidth(), behavior: "smooth" });
    });
    updateState();
  }
  _wireTrendingOverlay() {
    const sr = this.shadowRoot;
    sr.querySelector('[data-action="trending-open"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._trendingOverlayOpen = true;
      this._trendingOverlayPage = 0;
      this._trendingOverlayTvPending = null;
      this._reRenderSection("trending");
      this._proactiveTrendingLoad();
    });
    const overlay = sr.querySelector(".trending-overlay");
    if (!overlay) return;
    overlay.querySelector('[data-action="trending-close"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._trendingOverlayOpen = false;
      this._trendingOverlayPage = 0;
      this._trendingOverlayTvPending = null;
      this._reRenderSection("trending");
    });
    sr.querySelector('[data-action="trending-prev"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._trendingOverlayPage = Math.max(0, (this._trendingOverlayPage || 0) - 1);
      this._trendingOverlayTvPending = null;
      this._reRenderSection("trending");
      this._scrollToTrendingOverlay();
    });
    sr.querySelector('[data-action="trending-next"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const isMobile = window.matchMedia("(max-width: 480px)").matches;
      const rows = Math.max(1, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
      const perPage = isMobile ? rows * 2 : rows * 4;
      const newPage = (this._trendingOverlayPage || 0) + 1;
      if (newPage * perPage >= this._trending.length && this._trendingFetchedApiPage < this._trendingApiTotalPages) {
        try {
          const nextApiPage = this._trendingFetchedApiPage + 1;
          const data = await this._hass.callApi("GET", `arr_stack/overseerr/trending?page=${nextApiPage}`);
          this._trending = [...this._trending, ...data.results || []];
          this._trendingApiTotalPages = data.totalPages || this._trendingApiTotalPages;
          this._trendingFetchedApiPage = nextApiPage;
        } catch (err) {
          console.error("[arr-card] Trending lazy load error:", err);
        }
      }
      this._trendingOverlayPage = newPage;
      this._trendingOverlayTvPending = null;
      this._reRenderSection("trending");
      this._scrollToTrendingOverlay();
    });
    sr.querySelectorAll(".rp-dot[data-topage]").forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        const pg = parseInt(dot.dataset.topage, 10);
        if (!isNaN(pg)) {
          this._trendingOverlayPage = pg;
          this._trendingOverlayTvPending = null;
          this._reRenderSection("trending");
          this._scrollToTrendingOverlay();
        }
      });
    });
    if (this._trendingOverlayTvPending) {
      requestAnimationFrame(() => this._positionTvOverlay());
    }
  }
  // Po kliknutí next/prev v more overlay scrolluj viewport tak,
  // aby col-right začínal nahoře — nav pak leží přesně pod kartami
  // Po kliknutí next/prev v more overlay scrolluj viewport na maximum —
  // spodok col-right bude na spodku viewportu, navbar presne pod kartami
  _scrollToTrendingOverlay() {
    requestAnimationFrame(() => {
      const sc = this._findScrollContainer();
      if (!sc) return;
      sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
    });
  }
  async _openTrendingOverlayTvRequest(show, cardIndex, colCount) {
    this._trendingOverlayTvPending = {
      show,
      seasons: null,
      selected: null,
      profileId: null,
      mediaId: show.id,
      loading: true,
      cardIndex,
      colCount
    };
    requestAnimationFrame(() => this._positionTvOverlay());
    await Promise.allSettled([
      (async () => {
        const detail = await this._hass.callApi("GET", `arr_stack/overseerr/tv/${show.id}`);
        const seasons = (detail.seasons || []).filter((s) => s.seasonNumber > 0).map((s) => s.seasonNumber).sort((a, b) => a - b);
        if (this._trendingOverlayTvPending) {
          this._trendingOverlayTvPending.seasons = seasons;
          this._trendingOverlayTvPending.selected = new Set(seasons);
        }
      })(),
      this._fetchSonarrProfiles(),
      (async () => {
        if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      })()
    ]);
    if (this._trendingOverlayTvPending) {
      this._trendingOverlayTvPending.profileId = this._seerrSonarr?.profileId ?? null;
      this._trendingOverlayTvPending.loading = false;
      requestAnimationFrame(() => this._positionTvOverlay());
    }
  }
  _positionTvOverlay() {
    const tvp = this._trendingOverlayTvPending;
    const grid = this.shadowRoot.querySelector(".to-grid");
    if (!grid || !tvp) return;
    const container = grid.parentElement;
    container.querySelector(".to-tv-abs-overlay")?.remove();
    const card = grid.querySelector(`.mc[data-oi="${tvp.cardIndex}"]`);
    if (!card) return;
    const ctnRect = container.getBoundingClientRect();
    const cRect = card.getBoundingClientRect();
    const colCount = Math.round(getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length) || 4;
    const prevCard = tvp.cardIndex >= colCount ? grid.querySelector(`.mc[data-oi="${tvp.cardIndex - colCount}"]`) : null;
    let topPx, heightPx;
    if (prevCard) {
      const prevBottom = prevCard.getBoundingClientRect().top + prevCard.getBoundingClientRect().height;
      topPx = prevBottom + 10 - ctnRect.top;
      heightPx = cRect.top + cRect.height - (prevBottom + 10);
    } else {
      topPx = cRect.top - ctnRect.top;
      heightPx = cRect.height;
    }
    const el = document.createElement("div");
    el.className = "to-tv-abs-overlay";
    el.style.cssText = `top:${topPx}px;height:${heightPx}px`;
    el.innerHTML = this._renderTvOverlayCompact(tvp);
    container.appendChild(el);
    if (!tvp.loading && tvp.seasons) {
      this._wireTvAbsOverlay(el, tvp);
    }
  }
  _wireTvAbsOverlay(el, tvp) {
    const scroll = el.querySelector("#sv-scroll-abs");
    const prev = el.querySelector(".sv-prev-abs");
    const next = el.querySelector(".sv-next-abs");
    const dots = el.querySelectorAll(".sv-dot");
    if (scroll) {
      const pageWidth = () => scroll.offsetWidth;
      const updateState = () => {
        const sl = scroll.scrollLeft;
        const pw = pageWidth();
        const max = scroll.scrollWidth - pw;
        if (prev) prev.disabled = sl <= 2;
        if (next) next.disabled = sl >= max - 2;
        if (dots.length) {
          const pg = Math.round(sl / pw);
          dots.forEach((d, i) => d.classList.toggle("sv-dot-active", i === pg));
        }
      };
      scroll.addEventListener("scroll", updateState, { passive: true });
      prev?.addEventListener("click", (e) => {
        e.stopPropagation();
        scroll.scrollBy({ left: -pageWidth(), behavior: "smooth" });
      });
      next?.addEventListener("click", (e) => {
        e.stopPropagation();
        scroll.scrollBy({ left: pageWidth(), behavior: "smooth" });
      });
      updateState();
    }
    el.querySelector(".to-tv-cancel-abs")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._trendingOverlayTvPending = null;
      this._reRenderSection("trending");
    });
    el.querySelector(".to-tv-confirm-abs")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const checkedSeasons = [...el.querySelectorAll(".sv-input:checked")].map((cb) => parseInt(cb.dataset.season, 10)).filter(Boolean);
      if (!checkedSeasons.length) return;
      const profileSel = el.querySelector(".req-select");
      const profileId = profileSel ? profileSel.value : null;
      const mediaId = parseInt(e.currentTarget.dataset.mediaid, 10);
      e.currentTarget.disabled = true;
      e.currentTarget.innerHTML = '<span class="action-spinner" style="width:10px;height:10px;border-width:1.5px"></span>';
      const show = tvp.show;
      this._optimisticRequested.add(show.id);
      this._withdrawnIds.delete(show.id);
      this._trendingOverlayTvPending = null;
      el.remove();
      try {
        if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
        const body = { mediaType: "tv", mediaId, seasons: checkedSeasons };
        if (this._seerrSonarr) {
          body.serverId = this._seerrSonarr.serverId;
          body.profileId = profileId !== null ? parseInt(profileId) : this._seerrSonarr.profileId;
          body.rootFolder = this._seerrSonarr.rootFolder;
        }
        if (!this._hass.user.is_admin) body.userMode = "family";
        await this._hass.callApi("POST", "arr_stack/overseerr/request", body);
      } catch (err) {
        console.error("[arr-card] overlay TV request error:", err);
        this._optimisticRequested.delete(show.id);
      }
      await this._fetchAll();
    });
  }
  // Rerenderuj jen sloupec kde sekce leží (nezpůsobuje scroll reset stránky)
  _reRenderSection(section) {
    const leftSections = /* @__PURE__ */ new Set(["qbit", "sab"]);
    if (leftSections.has(section)) {
      this._reRenderLeft();
    } else {
      const right = this.shadowRoot.getElementById("col-right");
      if (!right) return;
      const isMobile = window.matchMedia("(max-width: 900px)").matches;
      const navWasVisible = right.querySelector(".rp-nav")?.classList.contains("rp-nav-visible") ?? false;
      const sc = isMobile ? this._findScrollContainer() : null;
      const raw = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
      const navOffset = raw != null ? Math.max(0, parseInt(raw)) : 100;
      const left = isMobile ? this.shadowRoot.getElementById("col-left") : null;
      const navWasMet = isMobile && left ? left.getBoundingClientRect().bottom < navOffset : false;
      right.innerHTML = this._renderRight();
      if (navWasVisible) {
        const newNav = right.querySelector(".rp-nav");
        if (newNav) {
          newNav.style.transition = "none";
          newNav.classList.add("rp-nav-visible");
          requestAnimationFrame(() => {
            newNav.style.transition = "";
          });
        }
      }
      this._wirePageButtons();
      this._wirePopup();
      this._wireOverseerrButtons();
      requestAnimationFrame(() => {
        this._checkBadgeOverflow();
        if (isMobile && sc && left) {
          const lRect = left.getBoundingClientRect();
          const rightEl = this.shadowRoot.getElementById("col-right");
          const rRect = rightEl ? rightEl.getBoundingClientRect() : null;
          const isShortPage = rRect ? rRect.height <= window.innerHeight : false;
          if (!this._trendingOverlayOpen && lRect.bottom >= navOffset && (navWasMet || isShortPage && lRect.top < 0)) {
            sc.scrollTop += lRect.bottom - navOffset + 1;
          }
        }
      });
    }
  }
  _wirePageButtons(scope = this.shadowRoot) {
    if (this._pageBtnAbort) this._pageBtnAbort.abort();
    this._pageBtnAbort = new AbortController();
    const sig = this._pageBtnAbort.signal;
    if (scope === this.shadowRoot) scope.querySelectorAll(".rp-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.action) return;
        btn.classList.add("rp-btn-ping");
        btn.addEventListener("animationend", () => btn.classList.remove("rp-btn-ping"), { once: true });
        const scrollState = this._captureScrollState();
        const dir = btn.dataset.dir;
        const totalPages = this.shadowRoot.querySelectorAll(".rp-dot").length || 1;
        const cur = typeof this._rightPage === "number" ? this._rightPage : 0;
        if (dir === "next") this._rightPage = Math.min(cur + 1, totalPages - 1);
        else this._rightPage = Math.max(cur - 1, 0);
        const right = this.shadowRoot.getElementById("col-right");
        if (right) {
          right.innerHTML = this._renderRight();
          this._wirePageButtons();
          this._wirePopup();
          this._wireOverseerrButtons();
          this._afterRightPageSwitch(scrollState);
        }
      }, { signal: sig });
    });
    if (scope === this.shadowRoot) this.shadowRoot.querySelectorAll(".rp-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        if (dot.dataset.topage !== void 0) return;
        const targetPage = parseInt(dot.dataset.page, 10);
        if (!isNaN(targetPage)) {
          const scrollState = this._captureScrollState();
          this._rightPage = targetPage;
          const right = this.shadowRoot.getElementById("col-right");
          if (right) {
            right.innerHTML = this._renderRight();
            this._wirePageButtons();
            this._wirePopup();
            this._wireOverseerrButtons();
            this._afterRightPageSwitch(scrollState);
          }
        }
      }, { signal: sig });
    });
    if (scope === this.shadowRoot) this._wireSwipe(sig);
    if (scope === this.shadowRoot) this._wireStickyNav();
    scope.querySelectorAll(".pg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.dataset.section;
        const dir = btn.dataset.dir;
        const data = this._getPageData(section);
        const perPage = this._perPage(section);
        const total = Math.ceil(data.length / perPage);
        const cur = this._pages[section] || 0;
        if (dir === "next" && cur < total - 1) {
          this._pages[section] = cur + 1;
          this._pageDir[section] = "next";
        } else if (dir === "prev" && cur > 0) {
          this._pages[section] = cur - 1;
          this._pageDir[section] = "prev";
        } else {
          return;
        }
        this._reRenderSection(section);
        Object.keys(this._pageDir).forEach((k) => {
          this._pageDir[k] = "";
        });
      }, { signal: sig });
    });
  }
  // ─────────────────────────────────────────────
  // Swipe gesta pro stránkování sekcí (touch)
  // ─────────────────────────────────────────────
  _wireSwipe(sig) {
    const THRESHOLD = 40;
    this.shadowRoot.querySelectorAll(".pg-wrap").forEach((wrap) => {
      const btn = wrap.querySelector(".pg-btn[data-section]");
      if (!btn) return;
      const section = btn.dataset.section;
      let startX = null;
      wrap.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true, signal: sig });
      wrap.addEventListener("touchend", (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) < THRESHOLD) return;
        const dir = dx < 0 ? "next" : "prev";
        const data = this._getPageData(section);
        const perPage = this._perPage(section);
        const total = Math.ceil(data.length / perPage);
        const cur = this._pages[section] || 0;
        if (dir === "next" && cur < total - 1) {
          this._pages[section] = cur + 1;
          this._pageDir[section] = "next";
        } else if (dir === "prev" && cur > 0) {
          this._pages[section] = cur - 1;
          this._pageDir[section] = "prev";
        } else {
          return;
        }
        this._reRenderSection(section);
        Object.keys(this._pageDir).forEach((k) => {
          this._pageDir[k] = "";
        });
      }, { passive: true, signal: sig });
    });
  }
};
var wireMixin = _WireMethods.prototype;

// src/popup/index.js
var _PopupMethods = class {
  _wirePopup() {
    this.shadowRoot.querySelectorAll(".mc[data-popup]").forEach((card) => {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (e.target.closest(".overseerr-add, .btn-add, .req-open, .req-cancel, .req-confirm, .req-overlay, .tv-req-open, .tv-req-cancel, .tv-req-confirm, .tv-req-overlay, .req-withdraw, .pr-approve, .pr-decline")) return;
        const type = card.dataset.popup;
        const tmdbId = card.dataset.tmdbid;
        const tvdbId = card.dataset.tvdbid;
        const title = card.dataset.title || "";
        this._openPopup(type, tmdbId, tvdbId, title);
      });
    });
  }
  // ─────────────────────────────────────────────
  // Popup: fetch detail data and open modal
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // Day/night helper (sun.sun entity)
  // ─────────────────────────────────────────────
  get _isDaytime() {
    return this._hass?.states?.["sun.sun"]?.state === "above_horizon";
  }
  async _openPopup(type, tmdbId, tvdbId, title) {
    this._isState = null;
    this._isResults = [];
    this._isFilter = "all";
    this._isGrabbing = null;
    this._isGrabbed = /* @__PURE__ */ new Set();
    this._isHistory = {};
    this._isError = null;
    this._snIsOpen = false;
    this._snExpandedSeasons = /* @__PURE__ */ new Set();
    this._snEpisodes = /* @__PURE__ */ new Map();
    this._snActiveIs = null;
    this._snIsState = null;
    this._snIsResults = [];
    this._snIsError = null;
    this._snIsFilter = "all";
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    let _radarrId = null;
    if ((type === "radarr" || type === "movie") && tmdbId) {
      const m = (this._radarr || []).find((m2) => String(m2.tmdbId) === String(tmdbId));
      _radarrId = m?.id ?? null;
    }
    let _sonarrSeries = null;
    if (type === "sonarr" && (tvdbId || tmdbId)) {
      _sonarrSeries = (this._sonarr || []).find(
        (s) => tvdbId && String(s.tvdbId) === String(tvdbId) || tmdbId && String(s.tmdbId) === String(tmdbId)
      ) ?? null;
    }
    this._popup = { _loading: true, title, _radarrId, _sonarrSeries };
    this._renderPopupEl();
    try {
      let apiPath = "";
      if (type === "tv" && tmdbId) {
        apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
      } else if (type === "sonarr" && tmdbId) {
        apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
      } else if ((type === "radarr" || type === "movie") && tmdbId) {
        apiPath = `arr_stack/overseerr/movie/${tmdbId}`;
      } else {
        throw new Error("no_id");
      }
      const data = await this._hass.callApi("GET", apiPath);
      this._popup = { ...data, _type: type, _radarrId, _sonarrSeries };
    } catch (e) {
      console.error("[arr-card] popup fetch error:", e);
      const local = this._localFallbackData(type, tmdbId, tvdbId, title);
      this._popup = local ? { ...local, _radarrId, _sonarrSeries } : { title, _radarrId, _sonarrSeries, _error: e.message };
    }
    this._renderPopupEl();
  }
  // Build popup data from local arrays when Overseerr is unavailable/fails
  _localFallbackData(type, tmdbId, tvdbId, title) {
    if (type === "tv") {
      const show = this._tvUpcoming?.find((m) => String(m.id) === String(tmdbId));
      if (show) return {
        _type: "tv",
        _localData: true,
        title: show.name || show.originalName || title,
        overview: show.overview || "",
        firstAirDate: show.firstAirDate || "",
        genres: (show.genreIds || []).map((id) => ({ name: String(id) })),
        _localPosterUrl: show.posterPath ? `https://image.tmdb.org/t/p/w342${show.posterPath}` : null,
        relatedVideos: []
      };
    }
    if (type === "sonarr") {
      let series = tmdbId && this._sonarr.find((s) => String(s.tmdbId) === String(tmdbId)) || tvdbId && this._sonarr.find((s) => String(s.tvdbId) === String(tvdbId));
      if (!series) {
        const ep = this._calendar.find(
          (ep2) => tmdbId && String(ep2.series?.tmdbId) === String(tmdbId) || tvdbId && String(ep2.series?.tvdbId) === String(tvdbId)
        );
        if (ep?.series) series = ep.series;
      }
      if (series) {
        return {
          _type: "sonarr",
          _localData: true,
          title: series.title,
          overview: series.overview || "",
          firstAirDate: series.firstAired || "",
          genres: (series.genres || []).map((g) => typeof g === "string" ? { name: g } : g),
          _localPosterUrl: this._getSonarrPoster(series),
          relatedVideos: []
        };
      }
    }
    if (type === "radarr") {
      const movie = this._radarr.find((m) => tmdbId && String(m.tmdbId) === String(tmdbId));
      if (movie) {
        return {
          _type: "radarr",
          _localData: true,
          title: movie.title,
          overview: movie.overview || "",
          releaseDate: movie.digitalRelease || movie.physicalRelease || movie.inCinemas || "",
          genres: (movie.genres || []).map((g) => typeof g === "string" ? { name: g } : g),
          _localPosterUrl: this._getRadarrPoster(movie),
          relatedVideos: []
        };
      }
    }
    return { _type: type, _localData: true, title, overview: "", relatedVideos: [] };
  }
  // ─────────────────────────────────────────────
  // Popup: render popup HTML into popup-root
  // ─────────────────────────────────────────────
  _renderPopupEl() {
    const root = this.shadowRoot.getElementById("popup-root");
    if (!root) return;
    if (!this._popup) {
      root.innerHTML = "";
      return;
    }
    root.innerHTML = this._renderPopup();
    const overlay = root.querySelector(".popup-overlay");
    const glass = root.querySelector(".popup-glass");
    const closeBtn = root.querySelector(".popup-close");
    if (overlay) {
      overlay.addEventListener("click", () => {
        this._popup = null;
        this._renderPopupEl();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this._popup = null;
        this._isState = null;
        this._renderPopupEl();
      });
    }
    if (glass) glass.addEventListener("click", (e) => {
      e.stopPropagation();
      const t = e.target.closest("[data-action],[data-isfilter],[data-snisfilter],[data-grab],[data-sngrab],[data-guid]");
      if (!t) return;
      if (t.dataset.action === "is-toggle") {
        if (this._isState) {
          this._isState = null;
        } else if (this._popup._type === "movie" && !this._popup._radarrId) {
          this._isState = "confirm-add";
        } else {
          this._fetchInteractiveSearch(this._popup._radarrId);
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "is-confirm-yes") {
        this._fetchInteractiveSearch(this._popup._radarrId);
        return;
      }
      if (t.dataset.action === "is-confirm-no") {
        this._isState = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.isfilter !== void 0) {
        this._isFilter = t.dataset.isfilter;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.grab !== void 0) {
        this._grabRelease(t.dataset.grab, parseInt(t.dataset.indexerid));
        return;
      }
      if (t.dataset.action === "sn-is-toggle") {
        console.log("[sn-is] sonarrSeries:", this._popup._sonarrSeries, "type:", this._popup._type);
        this._snIsOpen = !this._snIsOpen;
        this._snActiveIs = null;
        this._snIsState = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "sn-season-toggle") {
        const n = parseInt(t.dataset.season);
        if (this._snExpandedSeasons.has(n)) {
          this._snExpandedSeasons.delete(n);
        } else {
          this._snExpandedSeasons.clear();
          this._snExpandedSeasons.add(n);
          this._snActiveIs = null;
          this._snIsState = null;
          if (!this._snEpisodes.has(n)) {
            const sid = this._popup._sonarrSeries?.id;
            if (sid) this._fetchSonarrEpisodes(sid, n);
          }
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "sn-season-is") {
        const n = parseInt(t.dataset.season);
        const isMobile = window.matchMedia("(max-width: 600px)").matches;
        if (this._snActiveIs?.type === "season" && this._snActiveIs?.key === n) {
          this._snActiveIs = null;
          this._snIsState = null;
        } else {
          this._snActiveIs = { type: "season", key: n };
          this._snExpandedSeasons.clear();
          const sid = this._popup._sonarrSeries?.id;
          if (sid) {
            if (isMobile) {
              this._renderPopupEl();
              this._fetchSonarrSeasonIS(sid, n);
            } else {
              this._fetchSonarrSeasonIS(sid, n);
            }
          }
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "sn-ep-is") {
        const epId = parseInt(t.dataset.epid);
        const seasonN = parseInt(t.dataset.season);
        const isMobile = window.matchMedia("(max-width: 600px)").matches;
        if (this._snActiveIs?.type === "episode" && this._snActiveIs?.key === epId) {
          this._snActiveIs = null;
          this._snIsState = null;
        } else {
          const eps = this._snEpisodes.get(seasonN) || [];
          const ep = eps.find((e2) => e2.id === epId);
          this._snActiveIs = {
            type: "episode",
            key: epId,
            seasonNumber: seasonN,
            epNum: ep?.episodeNumber ?? 0,
            label: ep?.title || ""
          };
          const sid = this._popup._sonarrSeries?.id;
          if (sid) {
            if (isMobile) {
              this._renderPopupEl();
              this._fetchSonarrEpIS(epId, sid);
            } else {
              this._fetchSonarrEpIS(epId, sid);
            }
          }
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.snisfilter !== void 0) {
        this._snIsFilter = t.dataset.snisfilter;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.sngrab !== void 0) {
        this._sonarrGrab(t.dataset.sngrab, parseInt(t.dataset.indexerid));
        return;
      }
      if (t.dataset.action === "sn-back") {
        this._snActiveIs = null;
        this._snIsState = null;
        this._renderPopupEl();
        return;
      }
    });
  }
  _renderPopup() {
    const d = this._popup;
    if (!d) return "";
    if (d._loading) {
      return `
      <div class="popup-overlay">
        <div class="popup-glass" style="align-items:center;justify-content:center;min-height:200px">
          <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <div style="color:rgba(255,255,255,0.7);font-size:13px">${this._t("loadingDetail")}</div>
        </div>
      </div>`;
    }
    if (d._error) {
      return `
      <div class="popup-overlay">
        <div class="popup-glass" style="align-items:center;justify-content:center;min-height:200px;padding:24px">
          <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;text-align:center">
            \u26A0 ${this._escHtml(d._error)}<br>
            <span style="font-size:11px;color:rgba(255,255,255,0.45)">${this._escHtml(d.title || "")}</span>
          </div>
        </div>
      </div>`;
    }
    const title = this._escHtml(d.title || d.name || "");
    const year = d.releaseDate ? d.releaseDate.slice(0, 4) : d.firstAirDate ? d.firstAirDate.slice(0, 4) : "";
    const genres = (d.genres || []).map((g) => this._escHtml(g.name || "")).filter(Boolean).join(" \xB7 ");
    const rating = d.voteAverage ? d.voteAverage.toFixed(1) : "";
    const overview = this._escHtml(d.overview || "");
    const subLine = [year, genres, rating ? `\u2B50 ${rating}` : ""].filter(Boolean).join(" \xB7 ");
    const backdropPath = d.backdropPath || null;
    const posterPath = d.posterPath || null;
    const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : "";
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : d._localPosterUrl || "";
    const backdropStyle = backdropUrl ? `background-image:url('${backdropUrl}')` : posterUrl ? `background-image:url('${posterUrl}');background-size:cover;background-position:center;filter:blur(6px) brightness(0.4)` : "background:linear-gradient(135deg,rgba(20,20,40,1),rgba(40,20,60,1))";
    const videos = Array.isArray(d.relatedVideos) ? d.relatedVideos : [];
    const trailer = videos.find((v) => v.site === "YouTube" && v.type === "Trailer") || videos.find((v) => v.site === "YouTube");
    const trailerHtml = trailer ? `<a class="popup-yt-thumb"
         href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}"
         target="_blank" rel="noopener noreferrer">
         <img src="https://img.youtube.com/vi/${encodeURIComponent(trailer.key)}/hqdefault.jpg"
              loading="lazy" onerror="this.style.display='none'" />
         <div class="popup-yt-overlay">
           <div class="popup-yt-btn">\u25B6 ${this._t("watchTrailer")}</div>
         </div>
       </a>` : "";
    const posterHtml = posterUrl ? `<img class="popup-poster" src="${posterUrl}" loading="lazy" onerror="this.style.display='none'" />` : "";
    const isAdmin = this._hass.user.is_admin;
    const isMovieType = d._type === "radarr" || d._type === "movie";
    const isSonarrType = d._type === "sonarr";
    const isActive = !!this._isState;
    const snIsActive = this._snIsOpen;
    const personIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;
    const isOpenBtn = isAdmin && isMovieType ? `
    <button class="is-open-btn${isActive ? " active" : ""}" data-action="is-toggle">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      Interactive Search
      <span class="is-admin-badge">admin</span>
    </button>` : "";
    const snIsOpenBtn = isAdmin && isSonarrType ? `
    <button class="is-open-btn${snIsActive ? " active" : ""}" data-action="sn-is-toggle">
      ${personIconSvg}
      Interactive Search
      <span class="is-admin-badge">admin</span>
    </button>` : "";
    const dayClass = this._isDaytime ? " popup-day" : "";
    const wideClass = isActive || snIsActive ? " is-wide" : "";
    return `
    <div class="popup-overlay${dayClass}">
      <div class="popup-glass${wideClass}">
        <button class="popup-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <div class="popup-backdrop" style="${backdropStyle}">
          <div class="popup-backdrop-fade"></div>
        </div>
        <div class="popup-body">
          <div class="popup-content">
            ${posterHtml}
            <div class="popup-meta">
              <h2 class="popup-title">${title}</h2>
              ${subLine ? `<div class="popup-sub">${subLine}</div>` : ""}
              ${overview ? `<p class="popup-overview">${overview}</p>` : `<p class="popup-overview" style="color:rgba(255,255,255,0.35);font-style:italic">${this._t("noDescription")}</p>`}
              ${isOpenBtn}
              ${snIsOpenBtn}
            </div>
          </div>
          ${isActive || snIsActive ? "" : trailerHtml}
          ${isActive ? this._renderIsPanel() : ""}
          ${snIsActive ? this._renderSonarrIsSection() : ""}
        </div>
      </div>
    </div>`;
  }
  // ─────────────────────────────────────────────
  // Interactive Search — panel HTML
  // ─────────────────────────────────────────────
};
var popupMixin = _PopupMethods.prototype;

// src/card.js
var ArrStackCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._interval = null;
    this._fastInterval = null;
    this._initialized = false;
    this._pageBtnAbort = null;
    this._sort = "progress_desc";
    this._radarr = [];
    this._radarrTotal = 0;
    this._sonarr = [];
    this._sonarrTotal = 0;
    this._calendar = [];
    this._upcoming = [];
    this._tvUpcoming = [];
    this._trending = [];
    this._popular = [];
    this._qbit = [];
    this._qbitTransfer = {};
    this._sab = {};
    this._sabFailed = [];
    this._sabRetryBusy = null;
    this._sabDeleteBusy = null;
    this._qbCookies = null;
    this._qbitConfigured = true;
    this._sabConfigured = true;
    this._bazarrConfigured = true;
    this._bazarr = {};
    this._radarrQueueFailed = /* @__PURE__ */ new Set();
    this._radarrQueueActive = /* @__PURE__ */ new Set();
    this._seerrRadarr = null;
    this._confirmRemove = null;
    this._requestPending = null;
    this._pendingRequests = [];
    this._optimisticRequested = /* @__PURE__ */ new Set();
    this._withdrawnIds = /* @__PURE__ */ new Set();
    this._myRequestIds = /* @__PURE__ */ new Map();
    this._familyPendingIds = /* @__PURE__ */ new Map();
    this._radarrProfiles = [];
    this._tvRequestPending = null;
    this._trendingOverlayOpen = false;
    this._trendingOverlayPage = 0;
    this._trendingOverlayTvPending = null;
    this._trendingFetchedApiPage = 2;
    this._trendingApiTotalPages = 1;
    this._seerrSonarr = null;
    this._sonarrProfiles = [];
    this._qbitBusy = false;
    this._sabBusy = false;
    this._qbitItemBusy = null;
    this._popup = null;
    this._isState = null;
    this._isResults = [];
    this._isFilter = "all";
    this._isGrabbing = null;
    this._isGrabbed = /* @__PURE__ */ new Set();
    this._isConfirm = null;
    this._isError = null;
    this._snIsOpen = false;
    this._snExpandedSeasons = /* @__PURE__ */ new Set();
    this._snEpisodes = /* @__PURE__ */ new Map();
    this._snActiveIs = null;
    this._snIsState = null;
    this._snIsResults = [];
    this._snIsError = null;
    this._snIsFilter = "all";
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    this._pages = { radarr: 0, sonarr: 0, upcoming: 0, tvUpcoming: 0, calendar: 0, trending: 0, popular: 0, qbit: 0, sab: 0, pending: 0 };
    this._pageDir = { radarr: "", sonarr: "", upcoming: "", tvUpcoming: "", calendar: "", trending: "", popular: "", qbit: "", sab: "", pending: "" };
    this._rightPage = 0;
    this._gradients = ["ca", "cb", "cc", "cd", "ce", "cf", "cg", "ch", "ci", "cj", "ck", "cl", "cm", "cn", "co", "cp", "cq", "cr"];
    this._gradientMap = {};
    this._gradientIdx = 0;
  }
  // ─────────────────────────────────────────────
  // HA lifecycle
  // ─────────────────────────────────────────────
  setConfig(config) {
    this._config = config;
    if (this._initialized) this._wireStickyNav();
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._buildShell();
      this._loadPendingFromStorage();
      this._fetchOverseerrRadarrSettings();
      this._fetchAll();
      this._interval = setInterval(() => this._fetchAll(), 3e4);
      this._fastInterval = setInterval(() => this._fetchDownloadsAndRender(), 5e3);
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
    if (this._pageBtnAbort) {
      this._pageBtnAbort.abort();
      this._pageBtnAbort = null;
    }
  }
  connectedCallback() {
    if (!this._initialized) return;
    if (!this._interval) {
      this._interval = setInterval(() => this._fetchAll(), 3e4);
    }
    if (!this._fastInterval) {
      this._fastInterval = setInterval(() => this._fetchDownloadsAndRender(), 5e3);
    }
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this._checkBadgeOverflow());
      });
      this._resizeObserver.observe(this);
    }
    requestAnimationFrame(() => this._wireStickyNav());
  }
  // ─────────────────────────────────────────────
  // Config helpers
  // ─────────────────────────────────────────────
  get _cfg() {
    return this._config;
  }
  // Nested config read with flat fallback for backward compat
  // e.g. _cfgGet('downloads', 'torrentItems') reads config.downloads.torrentItems ?? config.torrentItems
  _cfgGet(group, key, fallback) {
    const grouped = this._config?.[group]?.[key];
    if (grouped !== void 0) return grouped;
    const flat = this._config?.[key];
    if (flat !== void 0) return flat;
    return fallback;
  }
  // Lokalizační helper — vrátí přeložený řetězec dle nastavení localisation: cs|en
  _t(key) {
    const lang = this._cfg?.localisation === "en" ? "en" : "cs";
    return (ARR_I18N[lang] || ARR_I18N.cs)[key] || key;
  }
  // Returns items per page for a given section (respects YAML config)
  _perPage(section) {
    if (section === "qbit") return parseInt(this._cfgGet("downloads", "torrentItems", 3)) || 3;
    if (section === "sab") return parseInt(this._cfgGet("downloads", "usenetItems", 3)) || 3;
    return 4;
  }
  // Converts "#rrggbb" or "#rgb" to "r,g,b" string for use in rgba()
  _hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`;
  }
  // ─────────────────────────────────────────────
  // Formatters
  // ─────────────────────────────────────────────
  fmtSpeed(bytesPerSec) {
    if (bytesPerSec === void 0 || bytesPerSec === null || isNaN(bytesPerSec)) return "0 KB/s";
    if (bytesPerSec >= 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(1) + " MB/s";
    }
    return Math.round(bytesPerSec / 1024) + " KB/s";
  }
  fmtSize(bytes) {
    if (bytes === void 0 || bytes === null || isNaN(bytes)) return "0 MB";
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    }
    return Math.round(bytes / (1024 * 1024)) + " MB";
  }
  fmtEta(seconds) {
    if (!seconds || seconds <= 0 || seconds >= 864e4) return "\u221E";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  }
  fmtDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return `${d.getDate()}. ${d.getMonth() + 1}.`;
    } catch {
      return "";
    }
  }
  fmtPct(ratio) {
    if (ratio === void 0 || ratio === null || isNaN(ratio)) return "0%";
    return Math.round(ratio * 100) + "%";
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
    if (app === "qbit") {
      return `<svg ${s} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9.25" stroke="white" stroke-width="1.7"/>
        <path d="M13.8 6.5 9.2 12.1h3.3L10 17.5l5.8-7h-3.4z" fill="white"/>
      </svg>`;
    }
    if (app === "sab") {
      return `<svg ${s} fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.5 4H9a3 3 0 0 0-1.5 5.6A3 3 0 0 0 9 15h1v2.6l-1.3-1.3-1.4 1.4L12 22l4.7-4.3-1.4-1.4-1.3 1.3V15h1a3 3 0 0 0 1.5-5.6A3 3 0 0 0 15.5 4zM9 7h6.5a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2zm6.5 6H9a1 1 0 0 1 0-2h6.5a1 1 0 0 1 0 2z"/>
      </svg>`;
    }
    return "";
  }
  // ─────────────────────────────────────────────
  // Paginated grid helper
  // ─────────────────────────────────────────────
  _pagedGrid(items, section, renderFn, perPage = 4) {
    if (!items || items.length === 0) return "";
    const page = this._pages[section] || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const pageItems = items.slice(page * perPage, page * perPage + perPage);
    const dir = this._pageDir[section] || "";
    const animClass = dir === "next" ? "anim-next" : dir === "prev" ? "anim-prev" : "";
    const grid = `<div class="mgrid ${animClass}">${pageItems.map((it) => renderFn(it)).join("")}</div>`;
    if (totalPages <= 1) {
      return `
        <div class="pg-wrap">
          <button class="pg-btn pg-btn-ph" disabled>\u2039</button>
          ${grid}
          <button class="pg-btn pg-btn-ph" disabled>\u203A</button>
        </div>`;
    }
    const prevDis = page === 0 ? "disabled" : "";
    const nextDis = page >= totalPages - 1 ? "disabled" : "";
    return `
      <div class="pg-wrap">
        <button class="pg-btn" data-section="${section}" data-dir="prev" ${prevDis}>\u2039</button>
        ${grid}
        <button class="pg-btn" data-section="${section}" data-dir="next" ${nextDis}>\u203A</button>
      </div>`;
  }
  // Returns the correct data array for a given section key
  _getPageData(section) {
    if (section === "qbit") return Array.isArray(this._qbit) ? this._qbit : [];
    if (section === "sab") return Array.isArray(this._sab.slots) ? this._sab.slots : [];
    if (section === "pending") return this._pendingRequests || [];
    return this["_" + section] || [];
  }
  // Paginated vertical list (for download items)
  _pagedList(items, section, renderFn, perPage = 4) {
    if (!items || items.length === 0)
      return `<div class="placeholder">${this._t("noDownloads")}</div>`;
    const page = this._pages[section] || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const pageItems = items.slice(page * perPage, page * perPage + perPage);
    const dir = this._pageDir[section] || "";
    const animClass = dir === "next" ? "anim-next" : dir === "prev" ? "anim-prev" : "";
    const list = `<div class="dl-list ${animClass}">${pageItems.map((it) => renderFn(it)).join("")}</div>`;
    if (totalPages <= 1) return list;
    const prevDis = page === 0 ? "disabled" : "";
    const nextDis = page >= totalPages - 1 ? "disabled" : "";
    return `
      <div class="pg-wrap">
        <button class="pg-btn" data-section="${section}" data-dir="prev" ${prevDis}>\u2039</button>
        ${list}
        <button class="pg-btn" data-section="${section}" data-dir="next" ${nextDis}>\u203A</button>
      </div>`;
  }
  // ─────────────────────────────────────────────
  // Fetch helpers
  // ─────────────────────────────────────────────
  // Odstraní focus před innerHTML zápisem — zabrání neočekávanému chování prohlížeče.
  _blurActive() {
    const el = this.shadowRoot.activeElement || document.activeElement;
    if (el && typeof el.blur === "function") el.blur();
  }
  // Floating nav — IntersectionObserver na sentinel.
  // Nav se zobrazí (fade-in) když uživatel scrolluje k pravé sekci.
  // Observer 1 (col-left): zobraz nav když col-left vyjede z viewportu — pro standardní stránky.
  // Observer 2 (col-right): záloha pro krátké stránky kde scroll nestačí ke spuštění obs. 1.
  _wireStickyNav() {
    if (window.matchMedia("(min-width: 901px)").matches) return;
    const left = this.shadowRoot.getElementById("col-left");
    const right = this.shadowRoot.getElementById("col-right");
    if (!left) return;
    this._clearNavWatcher();
    const raw = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
    const offset = raw != null ? Math.max(0, parseInt(raw)) : 100;
    const syncNav = () => {
      const nav = this.shadowRoot.querySelector(".rp-nav");
      if (!nav) return;
      const lRect = left.getBoundingClientRect();
      const leftIsGone = lRect.bottom < offset;
      let rightEnough = false;
      if (right && lRect.top < 0) {
        const rRect = right.getBoundingClientRect();
        const vh = window.innerHeight;
        const visible = Math.min(rRect.bottom, vh) - Math.max(rRect.top, 0);
        rightEnough = rRect.height > 0 && visible / rRect.height >= 0.9;
      }
      nav.classList.toggle("rp-nav-visible", leftIsGone || rightEnough);
    };
    syncNav();
    this._navInterval = setInterval(syncNav, 150);
  }
  _clearNavWatcher() {
    if (this._navObserver) {
      this._navObserver.disconnect();
      this._navObserver = null;
    }
    if (this._navObserver2) {
      this._navObserver2.disconnect();
      this._navObserver2 = null;
    }
    if (this._navInterval) {
      clearInterval(this._navInterval);
      this._navInterval = null;
    }
    if (this._navScrollHandler) {
      document.removeEventListener("scroll", this._navScrollHandler, true);
      this._navScrollHandler = null;
    }
  }
  // Po přepnutí stránky pravého sloupce (rp-btn / rp-dot):
  // Zachytí scroll stav těsně před re-renderem pravého sloupce.
  // Musí být voláno PŘED right.innerHTML = ..., proto jako samostatná metoda.
  _captureScrollState() {
    if (!window.matchMedia("(max-width: 900px)").matches) return null;
    const sc = this._findScrollContainer();
    const right = this.shadowRoot.getElementById("col-right");
    const left = this.shadowRoot.getElementById("col-left");
    if (!sc) return null;
    const prevScrollTop = sc.scrollTop;
    const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 60;
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
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    requestAnimationFrame(() => {
      if (!isMobile) this._measureAndLockHeight();
      requestAnimationFrame(() => {
        this._checkBadgeOverflow();
        if (!isMobile || !scrollState) return;
        const { sc, prevScrollTop, atBottom, shortPage } = scrollState;
        if (shortPage) {
          const left = this.shadowRoot.getElementById("col-left");
          if (left) {
            const raw = this._cfg.sticky_nav_offset ?? this._cfg.stickyNavOffset;
            const offset = raw != null ? Math.max(0, parseInt(raw)) : 100;
            const lRect = left.getBoundingClientRect();
            sc.scrollTop += lRect.bottom - offset + 1;
          }
        } else if (atBottom) {
          sc.scrollTop = sc.scrollHeight;
        } else {
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
      const next = node.parentNode ?? (node.getRootNode?.() !== document ? node.getRootNode?.()?.host : null);
      if (!next || next === document || next === window) break;
      node = next;
      if (node.nodeType !== 1) continue;
      try {
        const oy = window.getComputedStyle(node).overflowY;
        if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 1) {
          return node;
        }
      } catch (_) {
      }
    }
    return document.documentElement;
  }
  _reRenderRight() {
    const right = this.shadowRoot.getElementById("col-right");
    if (!right) return;
    this._blurActive();
    right.innerHTML = this._renderRight();
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
    requestAnimationFrame(() => {
      if (!window.matchMedia("(max-width: 900px)").matches) this._measureAndLockHeight();
      requestAnimationFrame(() => this._checkBadgeOverflow());
    });
  }
  // Přeměří všechny stránky pravého sloupce a nastaví min-height na nejvyšší.
  // Vše proběhne synchronně v jednom JS tiku — browser nestihne malovat.
  _measureAndLockHeight() {
    const right = this.shadowRoot.getElementById("col-right");
    if (!right) return;
    const savedPage = this._rightPage;
    const perPage = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
    const hasCal = this._calendar && this._calendar.length > 0;
    const hasPend = this._hass.user.is_admin && this._pendingRequests.length > 0;
    const totalCats = 6 + (hasPend ? 1 : 0) + (hasCal ? 1 : 0);
    const totalPages = Math.ceil(totalCats / perPage);
    if (totalPages <= 1) {
      right.style.minHeight = "";
      return;
    }
    let maxH = 0;
    right.style.visibility = "hidden";
    right.style.minHeight = "";
    for (let p = 0; p < totalPages; p++) {
      this._rightPage = p;
      right.innerHTML = this._renderRight();
      maxH = Math.max(maxH, right.scrollHeight);
    }
    this._rightPage = savedPage;
    right.innerHTML = this._renderRight();
    right.style.visibility = "";
    right.style.minHeight = maxH + "px";
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
  }
  _checkBadgeOverflow() {
    this.shadowRoot.querySelectorAll(".mc").forEach((card) => {
      const row = card.querySelector(".mc-act") || card.querySelector(".mc-badges");
      if (!row) return;
      const overflows = row.scrollWidth > row.clientWidth + 1;
      card.classList.toggle("badge-compact", overflows);
    });
  }
  async _fetchPendingRequests() {
    if (!this._hass.user.is_admin) return;
    try {
      const data = await this._hass.callApi("GET", "arr_stack/overseerr/pending");
      this._pendingRequests = data?.results ?? [];
    } catch (e) {
      console.error("[arr-card] Pending requests fetch error:", e);
      this._pendingRequests = [];
    }
  }
  // ── LocalStorage helpers pro pending žádosti (přežije refresh stránky) ──
  _pendingStorageKey() {
    return `arr_stack_pending_${this._hass?.user?.id || "default"}`;
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
    } catch (e) {
    }
  }
  _savePendingToStorage() {
    if (this._hass?.user?.is_admin) return;
    try {
      const obj = {};
      this._familyPendingIds.forEach((reqId, tmdbId) => {
        obj[tmdbId] = reqId;
      });
      localStorage.setItem(this._pendingStorageKey(), JSON.stringify(obj));
    } catch (e) {
    }
  }
  async _fetchMyPendingRequests() {
    if (this._hass.user.is_admin) return;
    try {
      const data = await this._hass.callApi("GET", "arr_stack/overseerr/my_pending");
      const results = data?.results || [];
      const serverReqMap = new Map(results.map((r) => [r.id, r.status]));
      let changed = false;
      for (const [tmdbId, reqId] of this._familyPendingIds) {
        const serverStatus = serverReqMap.get(reqId);
        if (serverStatus === void 0 || serverStatus === 3) {
          this._familyPendingIds.delete(tmdbId);
          changed = true;
        }
      }
      const knownReqIds = new Set(this._familyPendingIds.values());
      for (const r of results) {
        if (r.status !== 1) continue;
        const tmdbId = Number(r.media?.tmdbId);
        if (!tmdbId) continue;
        if (this._familyPendingIds.has(tmdbId)) continue;
        if (knownReqIds.has(r.id)) continue;
        this._familyPendingIds.set(tmdbId, r.id);
        changed = true;
      }
      if (changed) {
        this._savePendingToStorage();
        this._reRenderRight();
      }
    } catch (e) {
      console.error("[arr-card] my_pending fetch error:", e);
    }
  }
  _optimisticRemovePending(requestId) {
    this._pendingRequests = this._pendingRequests.filter((r) => r.id !== requestId);
    const newTotal = Math.ceil(this._pendingRequests.length / 4);
    this._pages.pending = Math.max(0, Math.min(this._pages.pending, newTotal - 1));
    this._reRenderRight();
  }
  async _approvePendingRequest(requestId) {
    this._optimisticRemovePending(requestId);
    try {
      await this._hass.callApi("POST", "arr_stack/overseerr/approve", { requestId });
      this._fetchPendingRequests().then(() => this._reRenderRight());
    } catch (e) {
      await this._fetchPendingRequests();
      this._reRenderRight();
      console.error("[arr-card] Approve request error:", e);
    }
  }
  async _declinePendingRequest(requestId) {
    this._optimisticRemovePending(requestId);
    try {
      await this._hass.callApi("POST", "arr_stack/overseerr/decline", { requestId });
      this._fetchPendingRequests().then(() => this._reRenderRight());
    } catch (e) {
      await this._fetchPendingRequests();
      this._reRenderRight();
      console.error("[arr-card] Decline request error:", e);
    }
  }
  async _withdrawOverseerrRequest(requestId, mediaId) {
    this._optimisticRequested.delete(mediaId);
    this._familyPendingIds.delete(mediaId);
    this._savePendingToStorage();
    this._withdrawnIds.add(mediaId);
    this._reRenderRight();
    try {
      await this._hass.callApi("POST", "arr_stack/overseerr/request_delete", { requestId });
      await this._fetchOverseerr();
      await this._fetchTvUpcoming();
      this._withdrawnIds.delete(mediaId);
      this._reRenderRight();
    } catch (e) {
      this._withdrawnIds.delete(mediaId);
      this._reRenderRight();
      console.error("[arr-card] Withdraw request error:", e);
    }
  }
  // ─────────────────────────────────────────────
  // Shell build (CSS + skeleton)
  // ─────────────────────────────────────────────
  _buildShell() {
    const style = document.createElement("style");
    style.textContent = this._css();
    const userStyles = this._cfg?.styles || {};
    const customVars = [];
    if (userStyles.cardBackground) customVars.push(`--card-bg: ${userStyles.cardBackground}`);
    if (userStyles.overlayBackground) customVars.push(`--overlay-bg: ${userStyles.overlayBackground}`);
    if (userStyles.popupBackground) customVars.push(`--popup-bg: ${userStyles.popupBackground}`);
    if (userStyles.primaryTextColor) customVars.push(`--text-primary: ${userStyles.primaryTextColor}`);
    if (userStyles.secondaryTextColor) customVars.push(`--text-secondary: ${userStyles.secondaryTextColor}`);
    if (userStyles.mutedTextColor) customVars.push(`--text-muted: ${userStyles.mutedTextColor}`);
    if (userStyles.accentColor) {
      const rgb = this._hexToRgb(userStyles.accentColor);
      customVars.push(`--accent: ${userStyles.accentColor}`);
      customVars.push(`--accent-rgb: ${rgb}`);
    }
    if (customVars.length) {
      const varStyle = document.createElement("style");
      varStyle.textContent = `:host { ${customVars.join("; ")}; }`;
      this.shadowRoot.appendChild(varStyle);
    }
    const layout = this._cfg?.layout || "both";
    const wrapper = document.createElement("div");
    wrapper.className = "card";
    const layoutClass = layout === "left" ? " layout-left" : layout === "right" ? " layout-right" : "";
    const perfClass = this._cfg?.styles?.performanceMode || this._cfg?.performanceMode ? " perf-mode" : "";
    wrapper.innerHTML = `<div class="card-body${layoutClass}${perfClass}">
      <div class="col col-left" id="col-left"></div>
      <div class="col col-right" id="col-right"></div>
    </div>`;
    const popupRoot = document.createElement("div");
    popupRoot.id = "popup-root";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(wrapper);
    this.shadowRoot.appendChild(popupRoot);
  }
  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────
  _render() {
    const left = this.shadowRoot.getElementById("col-left");
    const right = this.shadowRoot.getElementById("col-right");
    if (!left || !right) return;
    const layout = this._cfg?.layout || "both";
    if (layout !== "right") left.innerHTML = this._renderLeft();
    if (layout !== "left") right.innerHTML = this._renderRight();
    this._wireSort();
    this._wireActionButtons();
    this._wireOverseerrButtons();
    this._wirePageButtons();
    this._wirePopup();
    this._renderPopupEl();
    requestAnimationFrame(() => {
      if (!window.matchMedia("(max-width: 900px)").matches) this._measureAndLockHeight();
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
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // ─────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────
  _css() {
    return STYLES;
  }
  getCardSize() {
    return 10;
  }
  static getConfigElement() {
    return document.createElement("arr-stack-card-editor");
  }
  static getStubConfig() {
    return {
      localisation: "en",
      layout: "both",
      downloads: { torrentItems: 3, usenetItems: 3 },
      discover: { categoriesCount: 3, oneClickMovieRequest: false },
      styles: { performanceMode: false }
    };
  }
};
function applyMixin(target, mixin) {
  for (const name of Object.getOwnPropertyNames(mixin)) {
    if (name !== "constructor") {
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
customElements.define("arr-stack-card", ArrStackCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "arr-stack-card",
  name: "Arr Stack Card",
  description: "Media server dashboard \u2014 Radarr, Sonarr, Overseerr, SABnzbd, qBittorrent"
});
