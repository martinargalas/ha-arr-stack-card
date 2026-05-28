// src/editor.js
var ArrStackCardEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }
  setConfig(config) {
    config = config || {};
    if (Array.isArray(config.categories)) {
      const CAT_MAP = { radarr: "recentlyAdded", sonarr: "recentlyRequested" };
      const seen = /* @__PURE__ */ new Set();
      config = {
        ...config,
        categories: config.categories.map((c) => CAT_MAP[c.id] ? { ...c, id: CAT_MAP[c.id] } : c).filter((c) => seen.has(c.id) ? false : seen.add(c.id))
      };
    }
    this._config = config;
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
  // Extract hex from stored hex or rgba string
  _toHex(val, fallback) {
    if (!val) return fallback;
    if (/^#/.test(val)) return val;
    const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
    return fallback;
  }
  _render() {
    const perfMode = !!this._styleVal("performanceMode", false);
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
        .row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 10px;
        }
        .row-label { flex: 1; font-size: 13px; }
        .row select, .row input[type="number"] {
          width: 160px; padding: 6px 8px; border-radius: 6px; font-size: 13px;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
        }
        .row input[type="color"] {
          width: 44px; height: 32px; padding: 2px; border-radius: 6px; cursor: pointer;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          flex-shrink: 0;
        }
        .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
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
        .color-alpha { font-size: 10px; color: var(--secondary-text-color, #9e9e9e); flex-shrink: 0; white-space: nowrap; }
        .cat-list { display: flex; flex-direction: column; gap: 6px; }
        .cat-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px;
          background: var(--secondary-background-color, #f5f5f5);
          border: 1px solid var(--divider-color, #e0e0e0);
          transition: opacity .15s, border-color .15s, background .15s;
        }
        .cat-item.drag-over { border-color: var(--primary-color, #03a9f4); background: var(--primary-background-color, #fff); }
        .cat-item.dragging { opacity: 0.4; }
        .cat-label { flex: 1; font-size: 13px; }
        .cat-disabled .cat-label { opacity: 0.45; }
      </style>

      <a class="bmc" href="https://buymeacoffee.com/argii" target="_blank" rel="noopener">
        <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="coffee"/>
        <div class="bmc-text">
          <div class="bmc-title">Buy me a coffee \u2615</div>
          <div class="bmc-sub">If you find this card useful, support the developer</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;flex-shrink:0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>

      <!-- General -->
      <div class="section">
        <div class="section-title">General</div>
        <div class="row">
          <span class="row-label">Language</span>
          <select data-key="localisation">
            <option value="cs" ${this._val("localisation", "en") === "cs" ? "selected" : ""}>Czech</option>
            <option value="en" ${this._val("localisation", "en") === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
        <div class="row">
          <span class="row-label">Layout</span>
          <select data-key="layout">
            <option value="both"  ${this._val("layout", "both") === "both" ? "selected" : ""}>Both panels</option>
            <option value="left"  ${this._val("layout", "both") === "left" ? "selected" : ""}>Downloads only</option>
            <option value="right" ${this._val("layout", "both") === "right" ? "selected" : ""}>Media only</option>
          </select>
        </div>
        <div class="row">
          <span class="row-label">Sticky nav offset (px)</span>
          <input type="number" data-key="sticky_nav_offset" value="${this._val("sticky_nav_offset", 100)}" min="0" max="500" step="10"/>
        </div>
      </div>

      <!-- Downloads -->
      <div class="section">
        <div class="section-title">Downloads</div>
        <div class="row">
          <span class="row-label">Torrent items per page</span>
          <input type="number" data-group="downloads" data-key="torrentItems" value="${this._cfg("downloads", "torrentItems", 3)}" min="1" max="20"/>
        </div>
        <div class="row">
          <span class="row-label">Usenet items per page</span>
          <input type="number" data-group="downloads" data-key="usenetItems" value="${this._cfg("downloads", "usenetItems", 3)}" min="1" max="20"/>
        </div>
      </div>

      <!-- Discover -->
      <div class="section">
        <div class="section-title">Discover</div>
        <div class="row">
          <span class="row-label">Categories per page</span>
          <input type="number" data-group="discover" data-key="categoriesCount" value="${this._cfg("discover", "categoriesCount", 3)}" min="1" max="10"/>
        </div>
        <div class="row">
          <span class="row-label">Items per category</span>
          <input type="number" data-group="discover" data-key="itemsPerCategory" value="${this._cfg("discover", "itemsPerCategory", 4)}" min="2" max="10"/>
        </div>
        <div class="hint">Number of poster columns per category row, search results and More overlay. Default: 4.</div>
        <div class="row">
          <span class="row-label">Show More card on page</span>
          <input type="number" data-group="discover" data-key="showMoreOnPage" value="${this._cfg("discover", "showMoreOnPage", 3)}" min="1" max="50"/>
        </div>
        <div class="hint">Insert a "See More" card as the last slot on this page. Opens full-section overlay. Default: 3.</div>
        <div class="row">
          <span class="row-label">One-click request</span>
          <label class="toggle">
            <input type="checkbox" data-group="discover" data-key="oneClickRequest" ${this._cfg("discover", "oneClickRequest", false) || this._cfg("discover", "oneClickMovieRequest", false) ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">Skip profile dialog for movies and TV shows. TV automatically requests Season 1.</div>
        <div class="row">
          <span class="row-label">Default movie profile</span>
          <input type="text" data-group="discover" data-key="oneClickDefaultMovieProfile" value="${this._cfg("discover", "oneClickDefaultMovieProfile", "")}" placeholder="e.g. HD-1080p" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)"/>
        </div>
        <div class="hint">Quality profile name from Radarr (Settings \u2192 Profiles \u2192 Name). Leave empty to use Radarr default.</div>
        <div class="row">
          <span class="row-label">Default show profile</span>
          <input type="text" data-group="discover" data-key="oneClickDefaultShowProfile" value="${this._cfg("discover", "oneClickDefaultShowProfile", "")}" placeholder="e.g. HD-1080p" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)"/>
        </div>
        <div class="hint">Quality profile name from Sonarr (Settings \u2192 Profiles \u2192 Name). Leave empty to use Sonarr default.</div>
      </div>

      <!-- Right Panel -->
      <div class="section">
        <div class="section-title">Right Panel \u2014 Categories</div>
        <div class="hint" style="margin-bottom:8px">Drag to reorder \xB7 toggle to show/hide.</div>
        <div class="cat-list">
          ${this._getCats().map((c) => `
            <div class="cat-item${c.enabled === false ? " cat-disabled" : ""}" draggable="true" data-cat-id="${c.id}">
              <ha-icon icon="mdi:drag-vertical" style="--mdc-icon-size:18px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0;cursor:grab"></ha-icon>
              <span class="cat-label">${this._catLabel(c.id)}</span>
              <label class="toggle">
                <input type="checkbox" data-cat-toggle="${c.id}" ${c.enabled !== false ? "checked" : ""}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Appearance -->
      <div class="section">
        <div class="section-title">Appearance</div>
        <div class="row">
          <span class="row-label">Performance mode</span>
          <label class="toggle">
            <input type="checkbox" data-style-key="performanceMode" ${perfMode ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">Disables backdrop blur \u2014 improves performance on low-end devices.</div>

        ${perfMode ? this._colorRow("Card background", "cardBackground", "#121216") : ""}
        ${perfMode ? this._numberRow("Card background transparency", "cardBackgroundOpacity", 90, 0, 100, 1, "0\u2013100 %") : ""}

        <div class="row">
          <span class="row-label">Day / night modal colours</span>
          <label class="toggle">
            <input type="checkbox" data-style-key="dayNightMode" ${this._styleVal("dayNightMode", true) ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">Automatically switches modal (popup) colours based on time of day. Disable if you use custom modal colours.</div>
      </div>
    `;
    this._wireEvents();
  }
  _defaultCats() {
    return [
      { id: "recentlyAdded", enabled: true },
      { id: "recentlyRequested", enabled: true },
      { id: "upcoming", enabled: true },
      { id: "tvUpcoming", enabled: true },
      { id: "trending", enabled: true },
      { id: "popular", enabled: true },
      { id: "calendar", enabled: true },
      { id: "streams", enabled: true },
      { id: "tautulli", enabled: true },
      { id: "jellystat", enabled: true }
    ];
  }
  _getCats() {
    if (!this._config?.categories) return this._defaultCats();
    const saved = this._config.categories;
    const savedIds = new Set(saved.map((c) => c.id));
    const missing = this._defaultCats().filter((c) => !savedIds.has(c.id));
    return [...saved, ...missing];
  }
  _catLabel(id) {
    return {
      radarr: "Recently Added",
      sonarr: "Recently Requested",
      recentlyAdded: "Recently Added",
      recentlyRequested: "Recently Requested",
      upcoming: "Upcoming Movies",
      tvUpcoming: "New Shows",
      trending: "Trending",
      popular: "Popular Movies",
      calendar: "Calendar",
      streams: "Now Playing (Plex / Jellyfin) \u2014 auto-hidden when nothing plays",
      tautulli: "Statistics",
      jellystat: "Statistics (Jellyfin)"
    }[id] || id;
  }
  _numberRow(label, key, defaultVal, min, max, step, hint) {
    const stored = this._styleVal(key, null);
    const val = stored != null ? stored : defaultVal;
    return `
      <div class="row">
        <span class="row-label">${label}</span>
        ${hint ? `<span class="color-alpha">${hint}</span>` : ""}
        <input type="number" data-style-key="${key}" value="${val}" min="${min}" max="${max}" step="${step}" style="width:56px;text-align:right"/>
      </div>`;
  }
  _colorRow(label, key, defaultHex, alphaHint) {
    const stored = this._styleVal(key, null);
    const hex = this._toHex(stored, defaultHex);
    return `
      <div class="row">
        <span class="row-label">${label}</span>
        ${alphaHint ? `<span class="color-alpha">${alphaHint}</span>` : ""}
        <input type="color" data-style-key="${key}" value="${hex}"/>
      </div>`;
  }
  _wireEvents() {
    this.shadowRoot.querySelectorAll("select[data-key]").forEach((el) => {
      el.addEventListener("change", () => this._update({ [el.dataset.key]: el.value }));
    });
    this.shadowRoot.querySelectorAll('input[type="number"][data-key]').forEach((el) => {
      el.addEventListener("change", () => this._update({ [el.dataset.key]: parseInt(el.value) }));
    });
    this.shadowRoot.querySelectorAll('input[type="number"][data-group]').forEach((el) => {
      el.addEventListener("change", () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: parseInt(el.value) } });
      });
    });
    this.shadowRoot.querySelectorAll('input[type="text"][data-group]').forEach((el) => {
      el.addEventListener("change", () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: el.value } });
      });
    });
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-group]').forEach((el) => {
      el.addEventListener("change", () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: el.checked } });
      });
    });
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-style-key]').forEach((el) => {
      el.addEventListener("change", () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.checked } });
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll('input[type="number"][data-style-key]').forEach((el) => {
      el.addEventListener("change", () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: parseFloat(el.value) } });
      });
    });
    this.shadowRoot.querySelectorAll('input[type="color"][data-style-key]').forEach((el) => {
      el.addEventListener("input", () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.value } });
      });
    });
    this.shadowRoot.querySelectorAll("input[data-cat-toggle]").forEach((el) => {
      el.addEventListener("change", () => {
        const cats = this._getCats().map(
          (c) => c.id === el.dataset.catToggle ? { ...c, enabled: el.checked } : c
        );
        this._update({ categories: cats });
      });
    });
    let dragId = null;
    this.shadowRoot.querySelectorAll(".cat-item").forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        dragId = el.dataset.catId;
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        dragId = null;
      });
      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        el.classList.add("drag-over");
      });
      el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("drag-over");
        const toId = el.dataset.catId;
        if (!dragId || dragId === toId) return;
        const cats = [...this._getCats()];
        const from = cats.findIndex((c) => c.id === dragId);
        const to = cats.findIndex((c) => c.id === toId);
        if (from < 0 || to < 0) return;
        const [item] = cats.splice(from, 1);
        cats.splice(to, 0, item);
        this._update({ categories: cats });
        this._render();
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
    recentlyAdded: "Naposledy p\u0159idan\xE9",
    recentlyRequested: "Ned\xE1vno \u017E\xE1dan\xE9",
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
    badgeFailed: "Selhalo",
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
    noStreams: "Nic se nep\u0159ehr\xE1v\xE1",
    streamsTitle: "P\u0159ehr\xE1v\xE1n\xED",
    streamsActive: "aktivn\xED",
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
    snConfirmMsg: "Seri\xE1l bude nejd\u0159\xEDve p\u0159id\xE1n do Sonarru bez monitorov\xE1n\xED.",
    snAddingToSonarr: "P\u0159id\xE1v\xE1m seri\xE1l do Sonarru\u2026",
    snNoSonarrId: "Seri\xE1l se nepoda\u0159ilo p\u0159idat do Sonarru",
    snEpisode: "Epizoda",
    // Auto Search
    asSearchMovie: "Search Movie",
    asSearchSeries: "Search Series",
    asMovieConfirm: "Film bude p\u0159id\xE1n do Radarru a spust\xED se automatick\xE9 vyhled\xE1v\xE1n\xED.",
    asSeriesConfirm: "Seri\xE1l bude p\u0159id\xE1n do Sonarru. Vyberte sez\xF3nu pro vyhled\xE1v\xE1n\xED.",
    asAdding: "P\u0159id\xE1v\xE1m\u2026",
    asSearching: "Spou\u0161t\xEDm vyhled\xE1v\xE1n\xED\u2026",
    asSearchDone: "Vyhled\xE1v\xE1n\xED spu\u0161t\u011Bno",
    snSeasonPack: "season pack",
    snBack: "Zp\u011Bt",
    // Search
    searchPlaceholder: "Hledat filmy a seri\xE1ly\u2026",
    typeShow: "Seri\xE1l",
    // Pending badges
    fromSeerr: "ze Seerr",
    fromSonarr: "ze Sonarr",
    // Plex terminate overlay
    terminateTitle: "Zastavit",
    terminatePrompt: "Zastavit toto p\u0159ehr\xE1v\xE1n\xED?",
    terminateUserHint: "Zpr\xE1va bude zobrazena u\u017Eivateli",
    terminateMsgLabel: "ZPR\xC1VA",
    terminateDefault: "Va\u0161e p\u0159ehr\xE1v\xE1n\xED bylo ukon\u010Deno administr\xE1torem.",
    terminateCancel: "Zru\u0161it",
    terminateStop: "Zastavit",
    stopPlayback: "Stop Playback"
  },
  en: {
    downloads: "Downloads",
    pendingRequests: "Pending Requests",
    overview: "Movies & Shows",
    recentMovies: "Recently Added Movies",
    recentShows: "Recently Added Shows",
    recentlyAdded: "Recently Added",
    recentlyRequested: "Recently Requested",
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
    badgeFailed: "Failed",
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
    noStreams: "Nothing playing",
    streamsTitle: "Now Playing",
    streamsActive: "active",
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
    snConfirmMsg: "Series will be added to Sonarr unmonitored first.",
    snAddingToSonarr: "Adding series to Sonarr\u2026",
    snNoSonarrId: "Failed to add series to Sonarr",
    snEpisode: "Episode",
    // Auto Search
    asSearchMovie: "Search Movie",
    asSearchSeries: "Search Series",
    asMovieConfirm: "Movie will be added to Radarr and automatic search will start.",
    asSeriesConfirm: "Series will be added to Sonarr. Select a season to search.",
    asAdding: "Adding\u2026",
    asSearching: "Starting search\u2026",
    asSearchDone: "Search started",
    snSeasonPack: "season pack",
    snBack: "Back",
    // Search
    searchPlaceholder: "Search Movies and Shows\u2026",
    typeShow: "Show",
    // Pending badges
    fromSeerr: "from Seerr",
    fromSonarr: "from Sonarr",
    // Plex terminate overlay
    terminateTitle: "Stop",
    terminatePrompt: "Stop this playback?",
    terminateUserHint: "A message will be shown to user",
    terminateMsgLabel: "MESSAGE",
    terminateDefault: "Your playback has been terminated by an administrator.",
    terminateCancel: "Cancel",
    terminateStop: "Stop",
    stopPlayback: "Stop Playback"
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
        margin-bottom: 8px;
        padding: 0 4px;
      }

      .col-hdr-title {
        font-size: 14px; font-weight: 700;
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        white-space: nowrap;
      }

      .col-hdr-line {
        flex: 1; height: 6px;
        border-radius: 999px;
        background: rgba(var(--arr-hd-rgb, 255, 255, 255), 0.55);
        margin-left: 10px;
      }

      .col-hdr > ha-icon {
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
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
        padding: 0 12px 8px;
      }

      /* \u2500\u2500 Glass outer panel \u2500\u2500 */
      .col {
        position: relative;
        padding: 7px 15px;
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
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }

      .sec-badge {
        font-size: 9px; font-weight: 700;
        padding: 1px 6px; border-radius: 7px;
        margin-left: auto;
        color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
      .sec-page-ind {
        font-size: 10px; font-weight: 500;
        color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.38);
        white-space: nowrap; letter-spacing: 0.3px;
        margin-left: auto;
      }
      .sec-page-ind + .sec-badge { margin-left: 8px; }
      .sec-page-sep { margin: 0 2px; opacity: 0.55; }

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
        letter-spacing: 0.06em; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1); margin-bottom: 2px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
      }

      .dc-val {
        font-size: 16px; font-weight: 800; line-height: 1; margin-bottom: 3px;
        text-shadow: 0 1px 6px rgba(0,0,0,0.5);
      }
      .dc-val span { text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

      .dc-sub {
        font-size: 11px; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        line-height: 1.5;
      }

      .vpn-shield { flex-shrink: 0; margin-left: -2px; }
      .vpn-shield-ok   { color: rgba(48,209,88,0.90); }
      .vpn-shield-fail { color: rgba(255,69,58,0.90); }
      .vpn-shield-unk  { color: rgba(255,255,255,0.30); }

      .mbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; margin-top: 3px; }
      .mbar-fill { height: 100%; border-radius: 1px; }

      .rf-disk-chip { margin-bottom: 8px; }
      .rf-disk-inner { display: flex; justify-content: space-between; align-items: flex-start; }
      .rf-disk-left { flex: 1; min-width: 0; }
      .rf-disk-right { text-align: right; margin-left: 10px; flex-shrink: 0; max-width: 55%; }
      .dc-root-path { font-size: 10px; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 0.6); font-weight: 600; line-height: 1.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .disk-chip.dc-pageable { padding: 0; }
      .stream-badge { font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 3px; letter-spacing: 0.04em; vertical-align: middle; }
      .stream-badge-plex { background: rgba(229,160,13,0.25); color: rgba(229,160,13,1); border: 1px solid rgba(229,160,13,0.35); }
      .stream-badge-jf   { background: rgba(0,164,220,0.25);  color: rgba(0,164,220,1);  border: 1px solid rgba(0,164,220,0.35); }
      .stream-prog-track { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.15); z-index: 2; }
      .stream-prog-fill  { height: 100%; background: rgba(229,160,13,0.9); border-radius: 0 1px 0 0; transition: width 0.5s linear; }
      .stream-paused img { filter: brightness(0.55) saturate(0.4); }
      .stream-paused-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; color: rgba(255,255,255,0.9); }
      .stream-device-tag { position: absolute; top: 6px; left: 6px; z-index: 2; background: rgba(0,0,0,0.62); backdrop-filter: blur(4px); color: rgba(var(--arr-st-rgb,255,255,255),0.85); font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; pointer-events: none; }
      .stream-user-tag { position: absolute; top: 28px; left: 6px; z-index: 2; background: rgba(0,0,0,0.62); backdrop-filter: blur(4px); color: rgba(var(--arr-st-rgb,255,255,255),0.92); font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; pointer-events: none; max-width: calc(100% - 12px); overflow: hidden; }
      .popup-ctrl-btn { background: rgba(255,255,255,0.08); border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.85); transition: background 0.15s; }
      .popup-ctrl-btn:hover { background: rgba(255,255,255,0.16); }
      .popup-ctrl-btn-main { width: 56px; height: 56px; background: rgba(229,160,13,0.2); }
      .popup-ctrl-btn-main:hover { background: rgba(229,160,13,0.35); }
      .stream-seek-wrap:hover .stream-prog-fill { background: rgba(229,160,13,1); }

      .dc-pageable { display: flex; align-items: stretch; justify-content: space-between; }
      .dc-page-content { flex: 1; min-width: 0; padding: 7px 4px; }
      .dc-chev { background: none; border: none; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 0.55); cursor: pointer; padding: 7px 3px; display: flex; align-items: center; flex-shrink: 0; }
      .dc-chev:disabled { opacity: 0.18; cursor: default; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         CLIENT HEADER
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .client-hd {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 8px;
      }

      .client-hd ha-icon {
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1); flex-shrink: 0;
      }

      .client-hd .col-hdr-line {
        background: rgba(33,33,33,0.10);
      }

      .cl-name {
        font-size: 15px; font-weight: 700;
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        white-space: nowrap;
      }

      .cl-speed { font-size: 12px; font-weight: 800; }

      .sort-btns { margin-left: auto; display: flex; gap: 3px; }

      .sb {
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
        border: 1px solid rgba(255,255,255,0.30); background: rgba(255,255,255,0.12);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.85); cursor: pointer;
        backdrop-filter: blur(8px);
      }

      .sb.on {
        background: rgba(var(--accent-rgb),0.30); border-color: rgba(var(--accent-rgb),0.55);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1);
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
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.80); cursor: pointer;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .action-btn:hover {
        background: rgba(255,255,255,0.20); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1);
      }
      .action-btn.paused {
        background: rgba(48,209,88,0.28); border-color: rgba(48,209,88,0.55);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1);
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
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.90); cursor: pointer;
        padding: 0;
        transition: background 0.12s, color 0.12s;
      }
      .tb:hover  { background: rgba(255,255,255,0.22); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb:active { transform: scale(0.88); }

      /* Resume \u2014 green tint */
      .tb-resume { border-color: rgba(48,209,88,0.40); background: rgba(48,209,88,0.18); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb-resume:hover { background: rgba(48,209,88,0.32); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      /* Pause \u2014 stejn\xE1 neutr\xE1ln\xED barva jako glob\xE1ln\xED action-btn */
      .tb-pause  { border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.10); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb-pause:hover  { background: rgba(255,255,255,0.22); }

      /* Remove (initial) \u2014 neutral */
      .tb-remove { }
      .tb-remove:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.55); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      .tb-retry { border-color: rgba(255,159,10,0.40); background: rgba(255,159,10,0.14); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); flex-shrink: 0; }
      .tb-retry:hover { background: rgba(255,159,10,0.30); border-color: rgba(255,159,10,0.65); }

      .tb-hist-del { flex-shrink: 0; }
      .tb-hist-del:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.55); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      .sab-failed-sep {
        margin: 6px 0 4px; height: 1px;
        background: rgba(255,69,58,0.25);
      }
      .dl-failed { opacity: 0.90; }

      /* Confirm row: cancel / keep / delete */
      .tb-cancel { border-color: rgba(255,255,255,0.30); }
      .tb-keep   { border-color: rgba(255,149,0,0.40);  background: rgba(255,149,0,0.18);  color: rgba(255,149,0,0.90); }
      .tb-keep:hover { background: rgba(255,149,0,0.32); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb-del    { border-color: rgba(255,69,58,0.55);  background: rgba(255,69,58,0.28);  color: rgba(255,90,80,0.90); }
      .tb-del:hover  { background: rgba(255,69,58,0.45); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         SECTION GLASS CARD
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .sec-card { margin-bottom: 4px; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         SEARCH BAR
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .sec-search { padding-bottom: 0; }
      .sec-search .mgrid { padding: 0 30px; }
      .search-bar-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(var(--arr-pbb-rgb, 255,255,255), 0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 999px;
        padding: 8px 14px;
        margin-bottom: 8px;
        transition: border-color .2s;
      }
      .search-bar-wrap:focus-within {
        border-color: rgba(255,255,255,0.35);
      }
      .search-bar-icon { color: var(--secondary-text-color, #888); flex-shrink: 0; }
      .search-bar-input {
        background: none;
        border: none;
        outline: none;
        font-family: inherit;
        font-size: 15px;
        font-weight: 800;
        color: var(--secondary-text-color, #aaa);
        width: 100%;
      }
      .search-bar-input::placeholder { color: rgba(255,255,255,0.25); }
      .search-bar-clear {
        background: none;
        border: none;
        color: rgba(255,255,255,0.4);
        cursor: pointer;
        font-size: 12px;
        padding: 0 2px;
        flex-shrink: 0;
      }
      .sec-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      .sec-grid .mc {
        position: relative;
        overflow: hidden;
        border-radius: 10px;
        aspect-ratio: 2/3;
        display: block;
      }
      .mc-grad {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
        padding: 18px 6px 6px;
        pointer-events: none;
      }
      .mc-year {
        font-size: 9px;
        color: rgba(255,255,255,0.55);
      }
      .mc-type-tag {
        position: absolute;
        top: 5px; right: 5px;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        border-radius: 4px;
        padding: 2px 5px;
        pointer-events: none;
      }
      .placeholder-poster {
        width: 100%; height: 100%;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      }

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
        color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 360px;
      }

      .dl-pct { font-size: 13px; font-weight: 800; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.5); flex-shrink: 0; margin-left: 8px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.4); }

      .dl-r2 { display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }

      .dm { font-size: 11px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.55); display: flex; align-items: center; gap: 2px; }
      .dm b { font-weight: 700; }
      .dm-val { color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.5); font-weight: 700; }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         PILL CHIP SYSTEM  (speed + status)
         Solid macOS colours, no gradient \u2014 clean and vivid
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .g, .pill-green, .pill-orange, .pill-red, .pill-blue, .pill-yellow, .pill-teal, .pill-gray {
        display: inline-flex; align-items: center; gap: 3px;
        border-radius: 999px; border: 1px solid transparent;
        font-weight: 700; color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1); white-space: nowrap;
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
      /* gray \u2014 queued/unknown */
      .pill-gray        { background: rgba(180,180,180,0.20); border-color: rgba(180,180,180,0.45); }
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
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.55);
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
        position: relative; aspect-ratio: 2/3; height: auto; cursor: pointer;
        container-type: inline-size;
        container-name: mc;
      }
      @container mc (max-width: 105px) {
        .media-type-tag .b-txt { display: none; }
        .badge .b-txt { display: none; }
      }

      .mc-cover {
        width: 100%; height: 80px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }

      .mc-cover-lg { display: none; }
      .media-type-tag {
        position: absolute; top: 6px; left: 6px; z-index: 2;
        background: rgba(0,0,0,0.62);
        backdrop-filter: blur(4px);
        color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.92);
        font-size: 10px; font-weight: 800; line-height: 1;
        padding: 2px 6px; border-radius: 4px;
        letter-spacing: 0.05em;
        display: inline-flex; align-items: center;
        border: 1px solid transparent;
        pointer-events: none;
      }

      .mc-info { display: none; }

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
        column-gap: 7px; row-gap: 7px; align-content: start;
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
        color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        line-height: 1.3;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 2px;
      }

      .mc-sub {
        font-size: 11px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 3px;
      }

      .mc-badges { display: flex; gap: 3px; flex-wrap: wrap; }

      /* \u2500\u2500 Badges (original shape, macOS vivid colours) \u2500\u2500 */
      .badge {
        font-size: 10px; font-weight: 800; line-height: 1;
        padding: 2px 6px; border-radius: 4px; white-space: nowrap;
        display: inline-flex; align-items: center; gap: 2px;
        color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
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
      .b-tag     { background:rgba(175,82,222,0.26); border:1px solid rgba(175,82,222,0.55); }

      /* \u2500\u2500 Upcoming action row \u2500\u2500 */
      .mc-act {
        display: flex; align-items: center; gap: 4px; margin-top: 3px;
        flex-wrap: nowrap; overflow: hidden;
      }

      .imdb {
        display: inline-flex; align-items: center; gap: 2px;
        border: 1px solid rgba(255,214,10,0.45); border-radius: 4px;
        padding: 2px 6px; font-size: 10px; font-weight: 800; line-height: 1;
        color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.55); flex-shrink: 0;
        background: rgba(255,214,10,0.10);
      }

      /* Datum se smrskne pokud nen\xED m\xEDsto, ale nezalamuje se */
      .date-lbl {
        font-size: 10px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.52);
        flex: 0 1 auto; white-space: nowrap; min-width: 0;
      }

      .btn-add {
        background: rgba(var(--accent-rgb),0.28); color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
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
        display: flex; align-items: stretch; justify-content: center;
        animation: fade-in 0.15s ease;
      }
      .req-inner {
        display: flex; flex-direction: column; justify-content: space-between;
        padding: 10px 10px 8px; width: 100%;
      }
      .req-label {
        font-size: 10px; font-weight: 700; color: var(--text-secondary);
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
        display: flex; gap: 5px;
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
      /* \u2500\u2500 Tab bar \u2500\u2500 */
      .req-tabs {
        display: flex; gap: 4px; margin-bottom: 1px;
      }
      .req-tab {
        flex: 1; font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.04em; padding: 4px 0;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
        border-radius: 5px; color: rgba(255,255,255,0.40); cursor: pointer;
        transition: background 0.12s, color 0.12s, border-color 0.12s;
      }
      .req-tab.req-tab--active {
        background: rgba(var(--accent-rgb),0.20);
        border-color: rgba(var(--accent-rgb),0.50);
        color: #fff;
      }
      .req-tab:not(.req-tab--active):hover { color: rgba(255,255,255,0.70); background: rgba(255,255,255,0.10); }
      /* \u2500\u2500 Tab panels \u2500\u2500 */
      .req-panels-wrap { flex: 1; display: flex; flex-direction: column; padding: 6px 0; }
      .req-panel { display: flex; flex-direction: column; gap: 7px; }
      .req-panel--hidden { display: none; }
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
        font-size: 9px; font-weight: 700; color: var(--text-secondary);
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
        font-size: 12px; color: var(--text-muted);
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
        color: var(--is-text);
        --is-blue:       #0a84ff;
        --is-green:      #30d158;
        --is-red:        #ff453a;
        --is-orange:     #ff9500;
        --is-purple:     #bf5af2;
        --is-overlay-bg: var(--overlay-bg, rgba(0,0,0,0.55));
        --is-glass-bg:   var(--popup-bg, rgba(10,10,22,0.55));
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
        --is-menu-bg:    #18182a;
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(255,255,255,0.08);
        --is-btn-bdr:    rgba(255,255,255,0.18);
        --is-btn-clr:    rgba(255,255,255,0.70);
        --is-btn-hbg:    rgba(255,255,255,0.15);
        --is-btn-hclr:   #fff;
        --is-btn-abg:    rgba(10,132,255,0.18);
        --is-btn-abdr:   rgba(10,132,255,0.40);
        --is-btn-aclr:   rgba(100,180,255,0.95);
        --is-fade-btm:   rgba(10,10,18,0.94);
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
        --is-glass-bg:   rgba(255,255,255,0.14);
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
        --is-menu-bg:    rgba(245,246,255,0.99);
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(0,0,0,0.05);
        --is-btn-bdr:    rgba(0,0,0,0.12);
        --is-btn-clr:    rgba(0,0,0,0.55);
        --is-btn-hbg:    rgba(0,0,0,0.09);
        --is-btn-hclr:   rgba(0,0,0,0.88);
        --is-btn-abg:    rgba(10,132,255,0.12);
        --is-btn-abdr:   rgba(10,132,255,0.35);
        --is-btn-aclr:   rgba(0,100,220,0.90);
        --is-fade-btm:   rgba(255,255,255,0.68);
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
      /* Extra-wide modal pro Tautulli statistics \u2014 pevn\xE1 v\xFD\u0161ka eliminuje skok p\u0159i p\u0159ep\xEDn\xE1n\xED tab\u016F */
      .popup-glass.tl-wide { width: min(1100px, 96vw); height: 88vh; }

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
        height: 60px;
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
      .popup-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; }
      .popup-actions .is-btn-row { margin-top: 0; }
      .popup-actions .is-open-btn { margin-top: 0; }
      .popup-actions .remove-confirm-row { margin-top: 0; }

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

      .popup-yt-thumb::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 50px;
        background: linear-gradient(to bottom, var(--is-fade-btm), transparent);
        pointer-events: none;
        z-index: 1;
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
      .popup-sub     { font-size: 11px; color: var(--is-text-sec); margin-bottom: 8px; }
      .popup-overview { font-size: 11px; color: var(--is-text-body); line-height: 1.65; margin: 0 0 12px; }

      .instance-status-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
      .inst-chip {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
        padding: 2px 7px 2px 6px; border-radius: 10px; border: 1px solid; line-height: 1;
      }
      .ic-icon { font-size: 11px; font-weight: 900; line-height: 1; }
      .ic--available   { color: #4ade80; border-color: rgba(74,222,128,0.35); background: rgba(74,222,128,0.08); }
      .ic--downloading { color: #60a5fa; border-color: rgba(96,165,250,0.35); background: rgba(96,165,250,0.08); }
      .ic--failed      { color: #f87171; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.08); }
      .ic--missing     { color: #f87171; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.08); }
      .ic--added       { color: rgba(255,255,255,0.55); border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
      .ic--none        { color: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.08); background: transparent; }

      .is-open-btn {
        position: relative;
        display: inline-flex; align-items: center; gap: 5px;
        padding: 0 12px 0 9px; height: 28px; box-sizing: border-box; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-btn-clr); font-size: 11px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        margin-top: 4px;
      }
      .is-open-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-open-btn.active { background: var(--is-btn-abg); border-color: var(--is-btn-abdr); color: var(--is-btn-aclr); }
      .is-open-btn.in-lib { background: rgba(74,222,128,0.10); border-color: rgba(74,222,128,0.38); color: #4ade80; }
      .is-open-btn.in-lib:hover { background: rgba(74,222,128,0.20); border-color: rgba(74,222,128,0.55); color: #4ade80; }
      .as-done-icon { color: #4ade80; font-size:13px; font-weight:700; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; width:26px; }
      .as-btn-badge { position:absolute; top:-5px; right:-5px; width:13px; height:13px; border-radius:50%; font-size:8px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; line-height:1; pointer-events:none; }
      .as-btn-badge--ok  { background:#4ade80; color:#000; }
      .as-btn-badge--err { background:#f87171; color:#fff; }
      .as-btn-badge--dl  { background:rgba(59,130,246,0.9); color:#fff; }
      .as-done-icon--dl  { color: rgba(59,130,246,0.9); }
      .as-dl-bar { flex:1; height:3px; border-radius:2px; background:rgba(255,255,255,0.12); overflow:hidden; min-width:30px; max-width:60px; }
      .as-dl-bar-fill { height:100%; background:rgba(59,130,246,0.8); border-radius:2px; transition:width 0.5s linear; }
      .popup-day .as-dl-bar { background:rgba(0,0,0,0.10); }
      .popup-day .as-dl-bar-fill { background:rgba(37,99,235,0.75); }
      .is-btn-row { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; margin-top: 4px; height: 28px; overflow: visible; }
      .is-btn-row .is-open-btn { margin-top: 0; height: 28px; box-sizing: border-box; }
      .is-collapse-btn { padding: 0; width: 28px; height: 28px; border-radius: 50%; justify-content: center; flex-shrink: 0; }

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
      .popup-day .ic--none  { color: rgba(0,0,0,0.35); border-color: rgba(0,0,0,0.15); background: rgba(0,0,0,0.04); }
      .popup-day .ic--added { color: rgba(0,0,0,0.50); border-color: rgba(0,0,0,0.18); background: rgba(0,0,0,0.04); }
      .popup-day .action-spinner { border-color: rgba(0,0,0,0.15); border-top-color: rgba(0,0,0,0.65); }
      .popup-day .popup-ctrl-btn { color: rgba(0,0,0,0.75); background: rgba(0,0,0,0.07); }
      .popup-day .popup-ctrl-btn:hover { background: rgba(0,0,0,0.13); }
      .popup-day .popup-ctrl-btn-main { background: rgba(229,160,13,0.25); color: rgba(0,0,0,0.80); }
      .popup-day .popup-ctrl-btn-main:hover { background: rgba(229,160,13,0.42); }
      .popup-day .stream-prog-track { background: rgba(0,0,0,0.12); }
      .popup-day .stream-paused-overlay { color: rgba(0,0,0,0.7); }
      .stream-popup-track { background: rgba(255,255,255,0.15); }
      .stream-popup-fill  { background: rgba(255,255,255,0.7); }
      .popup-day .stream-popup-track { background: rgba(0,0,0,0.12); }
      .popup-day .stream-popup-fill  { background: rgba(229,160,13,0.9); }
      .popup-day .stream-popup-time { color: rgba(0,0,0,0.45) !important; }
      .popup-day .is-f-select {
        background-color: rgba(0,0,0,0.06);
        border-color: rgba(0,0,0,0.14);
        color: rgba(0,0,0,0.60);
      }
      .popup-day .is-f-select.active {
        background-color: rgba(0,0,0,0.12);
        border-color: rgba(0,0,0,0.30);
        color: rgba(0,0,0,0.85);
      }

      .remove-lib-btn  { border-color: rgba(255,120,30,0.45); color: rgba(255,150,80,0.9); height: 28px; box-sizing: border-box; }
      .remove-lib-btn:hover  { background: rgba(255,120,30,0.18); border-color: rgba(255,120,30,0.70); color: #ff9640; }
      .remove-disc-btn, .remove-excl-btn { border-color: rgba(255,69,58,0.55); color: rgba(255,90,80,0.95); }
      .remove-disc-btn:hover, .remove-excl-btn:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.80); color: #ff453a; }
      .remove-confirm-row {
        display: inline-flex; align-items: center; flex-wrap: nowrap; gap: 6px; margin-top: 4px;
      }
      .remove-confirm-row .is-open-btn {
        margin-top: 0; height: 28px; box-sizing: border-box; flex-shrink: 1; min-width: 0;
      }
      @media (max-width: 480px) {
        .remove-confirm-row { flex-wrap: wrap; }
      }
      .remove-ic-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; box-sizing: border-box;
        border-radius: 50%; border: 1px solid currentColor;
        background: transparent; cursor: pointer; padding: 0; flex-shrink: 0;
        transition: background 0.15s;
      }
      .remove-ic-no    { color: rgba(255,100,100,0.75); }
      .remove-ic-no:hover { background: rgba(255,100,100,0.2); }
      .remove-ic-btn svg { display: block; }

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
      .is-sort-arrow { margin-left: 3px; font-size: 9px; opacity: 1; }
      .is-sort-arrow.is-sort-inactive { opacity: 0.3; }
      .is-f-select {
        appearance: none; -webkit-appearance: none;
        background-color: rgba(var(--arr-ht-rgb,255,255,255),0.07);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 7px center;
        border: 1px solid rgba(var(--arr-ht-rgb,255,255,255),0.14);
        border-radius: 20px; color: rgba(var(--arr-st-rgb,180,180,180),0.70);
        font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
        padding: 3px 22px 3px 9px; cursor: pointer; outline: none;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }
      .is-f-select.active {
        background-color: rgba(var(--arr-ht-rgb,255,255,255),0.16);
        border-color: rgba(var(--arr-ht-rgb,255,255,255),0.40);
        color: rgba(var(--arr-ht-rgb,255,255,255),1);
      }
      .is-f-select option { background: #1e1e2e; color: #ffffff; }
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
        padding: 6px 0 2px; gap: 8px;
        margin-top: auto;
      }
      .rp-dots {
        display: flex; align-items: center; gap: 5px; flex: 1; justify-content: center; overflow: hidden; min-width: 0;
      }
      .rp-page-counter {
        font-size: 12px; font-weight: 600; opacity: 0.7;
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.8);
        white-space: nowrap;
      }
      .rp-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.22); border: none;
        cursor: pointer; padding: 0; flex-shrink: 0;
        transition: width 0.25s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.25s ease, background 0.25s ease;
      }
      .rp-dot:hover { background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.45); }
      .rp-dot-active {
        width: 18px; border-radius: 3px;
        background: rgba(var(--arr-pda-rgb, 255, 255, 255), 0.80);
        cursor: default; pointer-events: none;
      }
      .rp-btn {
        background: rgba(var(--arr-pbb-rgb, 255, 255, 255), 0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 20px;
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.65);
        font-size: 12px; font-weight: 600;
        padding: 5px 14px;
        cursor: pointer;
        display: flex; align-items: center; gap: 4px;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .rp-btn:hover {
        background: rgba(255,255,255,0.15);
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.9);
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
          color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.88);
          background: rgba(var(--arr-pbb-rgb, 255, 255, 255), 0.10);
          border-color: rgba(255,255,255,0.22);
          backdrop-filter: none;
        }
        .rp-nav .rp-btn:hover {
          background: rgba(255,255,255,0.18);
          color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 1);
        }
        .rp-nav .rp-dot { background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.30); }
        .rp-nav .rp-dot-active { background: rgba(var(--arr-pda-rgb, 255, 255, 255), 0.90); }
      }

      /* Large phone: mgrid 3 col */
      @media (max-width: 700px) {
        .mgrid   { grid-template-columns: repeat(3, 1fr) !important; }
        .tl-row  { grid-template-columns: repeat(3, 1fr) !important; }
        .dl-name { max-width: calc(100vw - 120px); }
        /* badges stay on one row \u2014 clip overflow */
        .mc-badges { flex-wrap: nowrap; overflow: hidden; }
        .badge     { font-size: 9px; padding: 0 3px; flex-shrink: 0; }
      }

      /* Small phone: mgrid 2 col */
      @media (max-width: 480px) {
        .mgrid   { grid-template-columns: repeat(2, 1fr) !important; }
        .to-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .tl-row  { grid-template-columns: repeat(2, 1fr) !important; }
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

      .sn-ep-item { display: block; }
      .sn-ep-item:hover .sn-ep-row { background: var(--is-row-hover); }
      .sn-ep-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 4px;
        border-radius: 5px;
      }
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
        overflow-x: hidden;
        overflow-y: auto;
      }
      .sn-is-panel .is-rel-title { max-width: 130px; }
      .sn-is-panel .is-indexer   { max-width: 70px; }

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
        background: var(--card-bg-perf, rgba(18,18,22,0.88));
      }

      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         TAUTULLI POSTER ROW
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
      .tl-row { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .tl-card {
        background: rgba(255,255,255,0.10);
        border-radius: 11px; padding: 11px 10px; cursor: pointer;
        position: relative; overflow: hidden; aspect-ratio: 2/3;
        display: flex; flex-direction: column;
        transition: transform .15s, box-shadow .15s;
      }
      .tl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      .tl-card-warn { background: rgba(180,30,30,0.22); }
      .tl-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
      .tl-accent-blue   { background: rgba(99,140,255,0.7); }
      .tl-accent-green  { background: rgba(60,200,120,0.7); }
      .tl-accent-orange { background: rgba(250,160,40,0.7); }
      .tl-accent-purple { background: rgba(180,80,255,0.7); }
      .tl-accent-red    { background: rgba(255,60,60,0.8); }
      .tl-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; flex-shrink: 0; }
      .tl-icon-blue   { background: rgba(99,140,255,0.15); }
      .tl-icon-green  { background: rgba(60,200,120,0.15); }
      .tl-icon-orange { background: rgba(250,160,40,0.15); }
      .tl-icon-purple { background: rgba(180,80,255,0.15); }
      .tl-icon-red    { background: rgba(255,60,60,0.15); }
      .tl-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); margin-bottom: 6px; flex-shrink: 0; }
      .tl-label-warn { color: rgba(255,100,100,0.6); }
      .tl-stat-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
      .tl-stat-name { font-size: 10px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 72px; }
      .tl-stat-val  { font-size: 10px; font-weight: 700; color: rgba(250,180,50,0.9); flex-shrink: 0; margin-left: 4px; }
      .tl-big-num   { font-size: 34px; font-weight: 800; color: rgba(250,160,40,0.9); line-height: 1; margin-bottom: 4px; }
      .tl-big-sub   { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
      .tl-sub-row   { font-size: 9px; color: rgba(255,255,255,0.4); margin-bottom: 2px; }
      .tl-sub-val   { font-weight: 600; color: rgba(255,255,255,0.6); }
      .tl-user-row  { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; }
      .tl-user-row:last-of-type { margin-bottom: 0; }
      .tl-avatar { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.6); overflow: hidden; }
      .tl-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .tl-avatar-warn { background: rgba(255,60,60,0.2); color: rgba(255,120,120,0.9); }
      .tl-user-name  { font-size: 10px; color: rgba(255,255,255,0.75); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tl-user-name-warn { color: rgba(255,120,120,0.95); }
      .tl-user-plays { font-size: 9px; font-weight: 700; color: rgba(250,180,50,0.85); flex-shrink: 0; }
      .tl-user-plays-warn { color: rgba(255,80,80,0.8); }
      .tl-warn-sub   { font-size: 8px; color: rgba(255,80,80,0.6); }
      .tl-warn-badge { position: absolute; top: 8px; right: 8px; background: rgba(255,60,60,0.2); border: 1px solid rgba(255,60,60,0.4); border-radius: 4px; padding: 1px 4px; font-size: 8px; color: rgba(255,100,100,0.9); font-weight: 700; }
      .tl-mini-bars { display: flex; align-items: flex-end; gap: 2px; flex: 1; min-height: 0; }
      .tl-bar-col   { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; }
      .tl-bar { width: 100%; border-radius: 2px 2px 0 0; background: rgba(180,80,255,0.5); min-height: 2px; transition: background .15s; }
      .tl-card:hover .tl-bar { background: rgba(180,80,255,0.8); }
      .tl-bar-day   { font-size: 6px; color: rgba(255,255,255,0.2); }
      .tl-chart-sum { font-size: 9px; color: rgba(255,255,255,0.4); margin-top: 4px; flex-shrink: 0; }
      .tl-chart-sum strong { color: rgba(180,80,255,0.9); font-weight: 700; }

      /* Tautulli modal */
      /* tl-modal-* removed \u2014 now uses popup-overlay / popup-glass / popup-close / is-panel-hdr */
      /* \u2500\u2500 Tautulli Graphs \u2500\u2500 */
      .tl-graph-title { font-size: 10px; font-weight: 700; color: var(--is-text-label); text-transform: uppercase; letter-spacing: .06em; }
      .tl-g-card { background: var(--is-row-hover); border: 1px solid var(--is-divider); border-radius: 10px; padding: 12px 12px 10px 12px; --tl-wknd: rgba(255,255,255,0.035); --tl-col-hlt: rgba(255,255,255,0.06); }
      .popup-day .tl-g-card { --tl-wknd: rgba(0,0,0,0.03); --tl-col-hlt: rgba(0,0,0,0.05); }
      .tl-g-svg { width: 100%; display: block; overflow: visible; }

      /* Bar animation: scale up from bottom of each bar's own bbox */
      @keyframes tl-g-bar-up {
        from { transform: scaleY(0); opacity: 0.4; }
        to   { transform: scaleY(1); opacity: 1; }
      }
      .tl-g-anim-bar {
        transform-box: fill-box;
        transform-origin: center bottom;
        animation: tl-g-bar-up 0.38s cubic-bezier(.22,.61,.36,1) both;
      }
      /* Hover highlight for column groups */
      .tl-g-col:hover .tl-g-anim-bar { opacity: 1 !important; filter: brightness(1.15); }

      /* Line animation: draw left\u2192right via stroke-dashoffset (large dasharray, no pathLength) */
      @keyframes tl-g-line-draw {
        from { stroke-dashoffset: 4000; }
        to   { stroke-dashoffset: 0; }
      }
      .tl-g-anim-line {
        stroke-dasharray: 4000;
        animation: tl-g-line-draw 0.75s ease-out both;
      }

      /* HTML x-axis label row below SVG \u2014 avoids font stretching from preserveAspectRatio:none */
      .tl-g-x-labels { position: relative; height: 16px; margin-top: 2px; overflow: visible; }
      .tl-g-x-labels span { white-space: nowrap; font-size: 10px; color: var(--is-text-muted); line-height: 1; }

      /* HTML y-axis label \u2014 consistent size regardless of chart width */
      .tl-g-ylabel { position: absolute; top: 2px; left: 2px; font-size: 10px; color: var(--is-text-muted); line-height: 1; pointer-events: none; z-index: 1; white-space: nowrap; }
      .tl-hist-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .tl-hist-table th { text-align: left; padding: 6px 8px; color: var(--is-text-label); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--is-divider); }
      .tl-hist-table td { padding: 9px 8px; border-bottom: 1px solid var(--is-divider); color: var(--is-text-body); vertical-align: middle; }
      .tl-hist-table tr:last-child td { border-bottom: none; }
      .tl-hist-table tr:hover td { background: var(--is-row-hover); }
      .tl-users-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .tl-users-table th { text-align: left; padding: 6px 8px; color: var(--is-text-label); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--is-divider); }
      .tl-users-table td { padding: 9px 8px; border-bottom: 1px solid var(--is-divider); color: var(--is-text-body); vertical-align: middle; }
      .tl-users-table tr:last-child td { border-bottom: none; }
      .tl-users-table tr.tl-row-warn td { background: rgba(255,60,60,0.04); }
      .tl-users-table tr:hover td { background: var(--is-row-hover); }
      .tl-warn-banner { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,60,60,0.08); border: 1px solid rgba(255,60,60,0.22); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px; color: rgba(255,120,120,0.9); line-height: 1.5; }
      .tl-ack-btn { margin-left: auto; flex-shrink: 0; align-self: center; background: rgba(255,60,60,0.18); border: 1px solid rgba(255,60,60,0.35); border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 600; color: rgba(255,120,120,0.9); cursor: pointer; transition: all .15s; white-space: nowrap; }
      .tl-ack-btn:hover { background: rgba(255,60,60,0.3); color: #fff; }
      .tl-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; }
      .tl-page-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg); color: var(--is-btn-clr); cursor: pointer; font-size: 12px; line-height: 1.4; transition: all .15s; }
      .tl-page-btn:disabled { opacity: 0.3; pointer-events: none; }
      .tl-page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
      .tl-page-btn.active { background: rgba(10,132,255,0.28); border-color: rgba(10,132,255,0.55); color: #fff; }
      .tl-col-item { display: flex; align-items: center; gap: 8px; padding: 6px 14px; cursor: pointer; font-size: 12px; color: var(--is-text-body,rgba(255,255,255,0.8)); white-space: nowrap; transition: background .1s; }
      .tl-col-item:hover { background: var(--is-row-hover,rgba(255,255,255,0.05)); }
      .tl-col-chk { width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--is-btn-bdr); background: transparent; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; transition: all .15s; }
      .tl-col-chk.on { background: rgba(10,132,255,0.85); border-color: rgba(10,132,255,0.9); }
      .tl-col-chk.on::after { content: "\u2713"; font-size: 9px; color: #fff; font-weight: 900; line-height: 1; }
      .tl-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
      .tl-toolbar-actions { margin-left:auto; display:flex; align-items:center; gap:6px; }
      .tl-edit-btn { display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; border-radius: 4px; border: 1px solid; cursor: pointer; font-size: 10px; font-weight: 600; transition: all .15s; white-space: nowrap; }
      .tl-del-btn   { background: rgba(255,69,58,0.18);  border-color: rgba(255,69,58,0.4);  color: rgba(255,100,90,0.9); }
      .tl-del-btn:hover   { background: rgba(255,69,58,0.35); }
      .tl-purge-btn { background: rgba(255,149,0,0.18); border-color: rgba(255,149,0,0.4); color: rgba(255,180,50,0.9); }
      .tl-purge-btn:hover { background: rgba(255,149,0,0.35); }
      .tl-tog-btn   { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.4); width: 26px; height: 26px; padding: 0; justify-content: center; border-radius: 50%; }
      .tl-tog-btn.on { background: rgba(48,209,88,0.18); border-color: rgba(48,209,88,0.4); color: rgba(80,220,110,0.9); }
      .tl-tog-btn:hover { opacity: 0.8; }
      .tl-page-counter { font-size: 12px; color: rgba(255,255,255,0.4); }
      .tl-badge-movie  { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(99,120,255,0.18); color: rgba(140,155,255,0.9); border: 1px solid rgba(99,120,255,0.28); }
      .tl-badge-tv     { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(80,200,120,0.13); color: rgba(100,220,140,0.9); border: 1px solid rgba(80,200,120,0.22); }
      .tl-badge-music  { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(250,180,50,0.13); color: rgba(250,200,80,0.9); border: 1px solid rgba(250,180,50,0.22); }
      .tl-mob-card { padding: 10px 12px; border-bottom: 1px solid var(--is-divider); transition: background 0.1s; }
      .tl-mob-card:last-child { border-bottom: none; }
      .tl-mob-card:hover { background: var(--is-row-hover); }
      .tl-mob-r1 { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; min-width: 0; }
      .tl-mob-name { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--is-text); }
      .tl-mob-meta { display: flex; gap: 10px; font-size: 11px; color: var(--is-text-label); flex-wrap: wrap; }
      .tl-mob-edit { display: flex; gap: 4px; margin-top: 7px; flex-wrap: wrap; }
      .tl-icon-btn { width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
      .tl-mob-pag { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
      .tl-mob-pag-info { flex: 1; text-align: center; font-size: 12px; color: var(--is-text-label); }
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
    const visible = this._applyIsFilters(all);
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const rowsHtml = isMobile ? this._renderIsCards(visible) : this._renderIsTable(visible);
    const { protocol, indexer, quality, lang } = this._isFilters;
    const anyFilter = protocol || indexer || quality || lang;
    const countHtml = visible.length !== all.length ? `<span class="is-count">${visible.length}<span style="opacity:0.45">/${all.length}</span></span>` : `<span class="is-count">${all.length}</span>`;
    const uniqIndexers = [...new Set(all.map((r) => r.indexer).filter(Boolean))].sort();
    const uniqQualities = [...new Set(all.map((r) => this._isQualityLabel(r)).filter(Boolean))];
    const uniqLangs = [...new Set(all.map((r) => ((r.languages || [])[0]?.name || "").slice(0, 2).toUpperCase()).filter(Boolean))].sort();
    const mkSelect = (dim, label, current, options) => {
      const opts = options.map(
        (v) => `<option value="${this._escHtml(v)}"${current === v ? " selected" : ""}>${this._escHtml(v)}</option>`
      ).join("");
      return `<select class="is-f-select${current ? " active" : ""}" data-isselect="${dim}">
        <option value="">${label}</option>
        ${opts}
      </select>`;
    };
    return `
      <div class="is-panel">
        <div class="is-panel-hdr">
          <span class="is-panel-title">${this._t("isResults")}</span>
          ${countHtml}
          <div class="is-filter">
            ${mkSelect("protocol", "Protocol", protocol, ["torrent", "usenet"])}
            ${uniqIndexers.length > 1 ? mkSelect("indexer", "Indexer", indexer, uniqIndexers) : ""}
            ${uniqQualities.length > 1 ? mkSelect("quality", "Quality", quality, uniqQualities) : ""}
            ${uniqLangs.length > 1 ? mkSelect("lang", "Lang", lang, uniqLangs) : ""}
          </div>
        </div>
        <div class="is-results-wrap">${rowsHtml}</div>
      </div>`;
  }
  _isQualityLabel(r) {
    const name = r.quality?.quality?.name || "";
    if (/2160|4K|UHD/i.test(name)) return /HDR/i.test(name) ? "4K HDR" : "4K";
    if (/1080/i.test(name)) return "1080p";
    if (/720/i.test(name)) return "720p";
    return name || "SD";
  }
  _applyIsFilters(releases) {
    const { protocol, indexer, quality, lang } = this._isFilters;
    return releases.filter((r) => {
      if (protocol) {
        const proto = r.protocol === "torrent" ? "torrent" : "usenet";
        if (proto !== protocol) return false;
      }
      if (indexer && (r.indexer || "") !== indexer) return false;
      if (quality && this._isQualityLabel(r) !== quality) return false;
      if (lang) {
        const lc = ((r.languages || [])[0]?.name || "").slice(0, 2).toUpperCase();
        if (lc !== lang) return false;
      }
      return true;
    });
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
    const _dlSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>`;
    if (histState === "imported") {
      return `<button class="is-grab-btn is-grab-done" disabled title="${this._t("isImported")}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }
    if (histState === "failed") {
      return `<button class="is-grab-btn is-grab-failed" data-grab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t("isFailed")}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    {
      const inst = this._isInstance || "radarr";
      const mId = inst === "radarr2" ? this._popup?._radarr2Id : this._popup?._radarrId;
      const qPct = inst === "radarr2" ? this._radarr2QueuePct || /* @__PURE__ */ new Map() : this._radarrQueuePct || /* @__PURE__ */ new Map();
      const inQueue = !!(mId && qPct.has(mId));
      const showProg = this._isGrabbed.has(guid) || histState === "grabbed" && inQueue;
      if (showProg) {
        const p = inQueue ? qPct.get(mId) : 0;
        return `<button class="is-grab-btn" disabled style="min-width:56px;gap:3px;padding:0 6px" title="${this._t("isGrabbed")}">
          <div style="display:flex;align-items:center;gap:3px;width:100%">
            <div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden">
              <div style="width:${Math.max(p, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div>
            </div>
            <span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${p}%</span>
          </div>
        </button>`;
      }
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
  _isSortValue(r, col) {
    switch (col) {
      case "src":
        return r.protocol === "torrent" ? 0 : 1;
      case "title":
        return (r.title || "").toLowerCase();
      case "indexer":
        return (r.indexer || "").toLowerCase();
      case "size":
        return r.size || 0;
      case "peers":
        return r.protocol === "torrent" ? r.seeders ?? -1 : -1;
      case "lang":
        return ((r.languages || [])[0]?.name || "").toLowerCase();
      case "quality":
        return r.quality?.quality?.name || "";
      case "score":
        return r.customFormatScore ?? -Infinity;
      default:
        return 0;
    }
  }
  _renderIsTable(releases) {
    const { col, dir } = this._isSort || {};
    const sorted = col ? [...releases].sort((a, b) => {
      const av = this._isSortValue(a, col);
      const bv = this._isSortValue(b, col);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    }) : releases;
    const arrow = (c) => {
      if (col !== c) return `<span class="is-sort-arrow is-sort-inactive">\u21C5</span>`;
      return `<span class="is-sort-arrow">${dir === -1 ? "\u2193" : "\u2191"}</span>`;
    };
    const th = (c, label) => `<th data-issort="${c}" style="cursor:pointer;user-select:none">${label}${arrow(c)}</th>`;
    const rows = sorted.map((r) => {
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
        ${th("src", "Src")}${th("title", "Title")}${th("indexer", "Indexer")}
        ${th("size", "Size")}${th("peers", "Peers")}${th("lang", "Lang")}${th("quality", "Quality")}${th("score", "Score")}<th></th>
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
  async _fetchInteractiveSearch(radarrId, instance = "radarr") {
    this._isInstance = instance;
    this._isState = "loading";
    this._isResults = [];
    this._isError = null;
    this._renderPopupEl();
    const svc = instance === "radarr2" ? "radarr2" : "radarr";
    try {
      if (!radarrId) {
        const tmdbId = this._popup?.tmdbId || this._popup?.id;
        const title = this._popup?.title || this._popup?.originalTitle || "";
        if (!tmdbId) throw new Error(this._t("isMissingTmdb"));
        await this._fetchOverseerrRadarrSettings();
        const seerr = instance === "radarr2" ? this._seerrRadarr2 : this._seerrRadarr;
        if (instance === "radarr2") {
          if (!this._radarr2Profiles?.length) await this._fetchRadarr2Profiles();
          if (!this._radarr2RootFolders?.length) await this._fetchRadarr2RootFolders();
        } else {
          if (!this._radarrProfiles?.length) await this._fetchRadarrProfiles();
          if (!this._radarrRootFolders?.length) await this._fetchRadarrRootFolders();
        }
        const profiles = instance === "radarr2" ? this._radarr2Profiles : this._radarrProfiles;
        const rootFolders = instance === "radarr2" ? this._radarr2RootFolders : this._radarrRootFolders;
        const profileId = seerr?.profileId ?? (profiles?.[0]?.id ?? 1);
        const rootFolder = seerr?.rootFolder ?? rootFolders?.[0]?.path ?? "/movies";
        let addedMovie;
        try {
          addedMovie = await this._hass.callApi("POST", `arr_stack/${svc}/movie`, {
            tmdbId: parseInt(tmdbId),
            title,
            qualityProfileId: parseInt(profileId),
            rootFolderPath: rootFolder,
            monitored: false,
            addOptions: { searchForMovie: false, monitor: "none" }
          });
        } catch (addErr) {
          const movies = await this._hass.callApi("GET", `arr_stack/${svc}/movies`).catch(() => []);
          if (instance === "radarr2") {
            if (Array.isArray(movies)) {
              const filtered = movies.filter((m) => m.added && m.added !== "0001-01-01T00:00:00Z");
              this._radarr2 = filtered;
              const map = /* @__PURE__ */ new Map();
              filtered.forEach((m) => {
                if (m.tmdbId) map.set(String(m.tmdbId), m);
              });
              this._radarr2ByTmdb = map;
            }
          } else {
            if (Array.isArray(movies)) this._radarr = movies;
          }
          const pool = instance === "radarr2" ? this._radarr2 : this._radarr;
          addedMovie = (pool || []).find((m) => String(m.tmdbId) === String(tmdbId));
        }
        radarrId = addedMovie?.id ?? null;
        if (!radarrId) throw new Error(this._t("isNoRadarrId"));
        if (instance === "radarr2") this._popup._radarr2Id = radarrId;
        else this._popup._radarrId = radarrId;
      }
      const [data, histRaw] = await Promise.all([
        this._hass.callApi("GET", `arr_stack/${svc}/release?movieId=${radarrId}`),
        this._hass.callApi("GET", `arr_stack/${svc}/history?movieId=${radarrId}`).catch(() => null)
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
      const svc = this._isInstance === "radarr2" ? "radarr2" : "radarr";
      const release = this._isResults.find((r) => r.guid === guid) || { guid, indexerId };
      release.movieId = this._isInstance === "radarr2" ? this._popup._radarr2Id : this._popup._radarrId;
      await this._hass.callApi("POST", `arr_stack/${svc}/release`, release);
      this._isGrabbed.add(guid);
      this._dlTriggeredBy = "is";
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
    if (!series) {
      const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      if (this._snIsState === "confirm-add") {
        return `<div class="sn-is-section">
          <div class="is-confirm-wrap">
            <div class="is-confirm-msg">${this._t("snConfirmMsg")}</div>
            <div class="is-confirm-actions">
              <button class="is-confirm-btn is-confirm-yes" data-action="sn-confirm-yes">${checkSvg}</button>
              <button class="is-confirm-btn is-confirm-no" data-action="sn-confirm-no">${crossSvg}</button>
            </div>
          </div>
        </div>`;
      }
      if (this._snIsState === "adding") {
        return `<div class="sn-is-section"><div class="is-loading">
          <span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>
          <span>${this._t("snAddingToSonarr")}</span>
        </div></div>`;
      }
      if (this._snIsState === "error") {
        return `<div class="sn-is-section"><div class="is-loading" style="color:rgba(255,69,58,0.80)">\u26A0 ${this._escHtml(this._snIsError || this._t("isLoadError"))}</div></div>`;
      }
      return `<div class="sn-is-section"><div class="is-loading">${this._t("snNotInSonarr")}</div></div>`;
    }
    const seasons = (series.seasons || []).filter((s) => s.seasonNumber > 0).sort((a, b) => a.seasonNumber - b.seasonNumber);
    const PER_PAGE = 4;
    const totalPages = Math.max(1, Math.ceil(seasons.length / PER_PAGE));
    const page = Math.min(this._snSeasonsPage || 0, totalPages - 1);
    const sliced = seasons.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const rows = sliced.map((s) => this._renderSnSeasonRow(s)).join("");
    const paginationHtml = this._tlMobPag("sn-spage", page, totalPages);
    return `<div class="sn-is-section">
      <div class="sn-seasons-label">${this._t("snSeasonsLabel")}</div>
      <div style="min-height:156px;display:flex;flex-direction:column;gap:4px">${rows}</div>
      <div style="padding-bottom:12px">${paginationHtml}</div>
    </div>`;
  }
  _renderSnSeasonRow(season) {
    const n = season.seasonNumber;
    const exp = this._snExpandedSeasons.has(n);
    const stat = season.statistics || {};
    const have = stat.episodeFileCount ?? 0;
    const tot = stat.totalEpisodeCount ?? stat.episodeCount ?? 0;
    const pct = tot > 0 ? Math.round(have / tot * 100) : 0;
    const inst = this._snIsInstance || "sonarr";
    const series = inst === "sonarr2" ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
    const qKey = `${series?.id}:${n}`;
    const qPctMap = inst === "sonarr2" ? this._sonarr2QueueSeasonPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeasonPct || /* @__PURE__ */ new Map();
    const qPct = qPctMap.has(qKey) ? qPctMap.get(qKey) : null;
    const isQueued = qPct !== null;
    const barPct = isQueued ? Math.max(qPct, 4) : pct;
    const pctStyle = isQueued ? `width:${barPct}%;background:#3b82f6` : `width:${barPct}%`;
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
        ${isQueued ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:64px"><div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(qPct, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${qPct}%</span></div>` : ""}
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
    const inst2 = this._snIsInstance || "sonarr";
    const qEps = inst2 === "sonarr2" ? this._sonarr2QueueEpisodes || /* @__PURE__ */ new Set() : this._sonarrQueueEpisodes || /* @__PURE__ */ new Set();
    const qEpPctMap = inst2 === "sonarr2" ? this._sonarr2QueueEpPct || /* @__PURE__ */ new Map() : this._sonarrQueueEpPct || /* @__PURE__ */ new Map();
    const epInQueue = qEps.has(ep.id);
    const epQPct = epInQueue ? qEpPctMap.get(ep.id) ?? 0 : null;
    const epQueueHtml = epInQueue ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:56px"><div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(epQPct, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${epQPct}%</span></div>` : "";
    const epIsHtml = !isMobile && isActive ? this._renderSnIsPanel() : "";
    return `<div class="sn-ep-item">
      <div class="sn-ep-row${hasFile ? " has-file" : ""}">
        <span class="sn-ep-num">${epNum}</span>
        <span class="sn-ep-title">${epTitle}</span>
        ${epInQueue ? epQueueHtml : airDate ? `<span class="sn-ep-date">${airDate}</span>` : ""}
        <button class="btn-person btn-person-sm${isActive ? " active" : ""}" data-action="sn-ep-is" data-epid="${ep.id}" data-season="${ep.seasonNumber}" title="Interactive Search \u2014 ${this._t("snEpisode").toLowerCase()}">
          ${personIcon}
        </button>
      </div>
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
    const { protocol, indexer, quality, lang } = this._snIsFilters || {};
    const visible = all.filter((r) => {
      if (protocol) {
        const p = r.protocol === "torrent" ? "torrent" : "usenet";
        if (p !== protocol) return false;
      }
      if (indexer && (r.indexer || "") !== indexer) return false;
      if (quality && this._isQualityLabel(r) !== quality) return false;
      if (lang) {
        const lc = ((r.languages || [])[0]?.name || "").slice(0, 2).toUpperCase();
        if (lc !== lang) return false;
      }
      return true;
    });
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const rowsHtml = isMobile ? this._renderSnIsCards(visible) : this._renderSnIsTable(visible);
    const uniqIndexers = [...new Set(all.map((r) => r.indexer).filter(Boolean))].sort();
    const uniqQualities = [...new Set(all.map((r) => this._isQualityLabel(r)).filter(Boolean))];
    const uniqLangs = [...new Set(all.map((r) => ((r.languages || [])[0]?.name || "").slice(0, 2).toUpperCase()).filter(Boolean))].sort();
    const mkSel = (dim, label, cur, opts) => {
      const options = opts.map(
        (v) => `<option value="${this._escHtml(v)}"${cur === v ? " selected" : ""}>${this._escHtml(v)}</option>`
      ).join("");
      return `<select class="is-f-select${cur ? " active" : ""}" data-snisselect="${dim}">
        <option value="">${label}</option>${options}
      </select>`;
    };
    const countHtml = visible.length !== all.length ? `<span class="is-count">${visible.length}<span style="opacity:0.45">/${all.length}</span></span>` : `<span class="is-count">${all.length}</span>`;
    return `<div class="sn-is-panel">
      <div class="is-panel-hdr">
        <span class="is-panel-title">${this._snActiveIs?.type === "season" ? this._t("snSeasonPack").charAt(0).toUpperCase() + this._t("snSeasonPack").slice(1) : this._t("snEpisode")}</span>
        ${countHtml}
        <div class="is-filter">
          ${mkSel("protocol", "Protocol", protocol, ["torrent", "usenet"])}
          ${uniqIndexers.length > 1 ? mkSel("indexer", "Indexer", indexer, uniqIndexers) : ""}
          ${uniqQualities.length > 1 ? mkSel("quality", "Quality", quality, uniqQualities) : ""}
          ${uniqLangs.length > 1 ? mkSel("lang", "Lang", lang, uniqLangs) : ""}
        </div>
      </div>
      <div class="is-results-wrap">${rowsHtml}</div>
    </div>`;
  }
  _renderSnIsTable(releases) {
    const { col, dir } = this._snIsSort || {};
    const sorted = col ? [...releases].sort((a, b) => {
      const av = this._isSortValue(a, col);
      const bv = this._isSortValue(b, col);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    }) : releases;
    const arrow = (c) => col !== c ? `<span class="is-sort-arrow is-sort-inactive">\u21C5</span>` : `<span class="is-sort-arrow">${dir === -1 ? "\u2193" : "\u2191"}</span>`;
    const th = (c, label) => `<th data-snissort="${c}" style="cursor:pointer;user-select:none">${label}${arrow(c)}</th>`;
    const rows = sorted.map((r) => {
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
        ${th("src", "Src")}${th("title", "Title")}${th("indexer", "Indexer")}
        ${th("size", "Size")}${th("peers", "Peers")}${th("lang", "Lang")}${th("quality", "Quality")}${th("score", "Score")}<th></th>
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
    const _dlSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>`;
    if (histState === "imported") {
      return `<button class="is-grab-btn is-grab-done" disabled title="${this._t("isImported")}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }
    if (histState === "failed") {
      return `<button class="is-grab-btn is-grab-failed" data-sngrab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t("isFailed")}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    {
      const inst = this._snIsInstance || "sonarr";
      const series = inst === "sonarr2" ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
      const seriesId = series?.id;
      const qSeasonPct = inst === "sonarr2" ? this._sonarr2QueueSeasonPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeasonPct || /* @__PURE__ */ new Map();
      const qSeriesPct = inst === "sonarr2" ? this._sonarr2QueueSeriesPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeriesPct || /* @__PURE__ */ new Map();
      const sk = `${seriesId}:${r.seasonNumber ?? r.season}`;
      const rawPct = qSeasonPct.has(sk) ? qSeasonPct.get(sk) : seriesId && qSeriesPct.has(seriesId) ? qSeriesPct.get(seriesId) : null;
      const inQueue = rawPct !== null;
      const showProg = this._snIsGrabbed.has(guid) || histState === "grabbed" && inQueue;
      if (showProg) {
        const p = rawPct ?? 0;
        return `<button class="is-grab-btn" disabled style="min-width:56px;gap:3px;padding:0 6px" title="${this._t("isGrabbed")}">
          <div style="display:flex;align-items:center;gap:3px;width:100%">
            <div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden">
              <div style="width:${Math.max(p, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div>
            </div>
            <span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${p}%</span>
          </div>
        </button>`;
      }
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

// src/render/auto-search.js
var POPUP_TYPE_AS = { RADARR: "radarr", MOVIE: "movie", SONARR: "sonarr", TV: "tv" };
var _AutoSearchMethods = class {
  // ─── Entry point ─────────────────────────────────────────────────────────
  _renderAsSection() {
    if (!this._asOpen) return "";
    const d = this._popup;
    const isMovieType = d._type === POPUP_TYPE_AS.RADARR || d._type === POPUP_TYPE_AS.MOVIE;
    return isMovieType ? this._renderAsMoviePanel() : this._renderAsSeasonsView();
  }
  // ─── Movie panel ─────────────────────────────────────────────────────────
  _renderAsMoviePanel() {
    const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    if (this._asState === "confirm") {
      return `<div class="sn-is-section">
        <div class="is-confirm-wrap">
          <div class="is-confirm-msg">${this._t("asMovieConfirm")}</div>
          <div class="is-confirm-actions">
            <button class="is-confirm-btn is-confirm-yes" data-action="as-confirm-yes">${checkSvg}</button>
            <button class="is-confirm-btn is-confirm-no" data-action="as-confirm-no">${crossSvg}</button>
          </div>
        </div>
      </div>`;
    }
    return "";
  }
  // ─── Seasons view (Sonarr) ────────────────────────────────────────────────
  _renderAsSeasonsView() {
    const d = this._popup;
    const series = this._asInstance === "sonarr2" ? d._sonarr2Series : d._sonarrSeries;
    const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const crossSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const spinner = `<span class="action-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:var(--is-blue)"></span>`;
    if (!series) {
      if (this._asState === "confirm") {
        return `<div class="sn-is-section">
          <div class="is-confirm-wrap">
            <div class="is-confirm-msg">${this._t("asSeriesConfirm")}</div>
            <div class="is-confirm-actions">
              <button class="is-confirm-btn is-confirm-yes" data-action="as-confirm-yes">${checkSvg}</button>
              <button class="is-confirm-btn is-confirm-no" data-action="as-confirm-no">${crossSvg}</button>
            </div>
          </div>
        </div>`;
      }
      return "";
    }
    const seasons = (series.seasons || []).filter((s) => s.seasonNumber > 0).sort((a, b) => a.seasonNumber - b.seasonNumber);
    const PER_PAGE = 4;
    const totalPages = Math.max(1, Math.ceil(seasons.length / PER_PAGE));
    const page = Math.min(this._snSeasonsPage || 0, totalPages - 1);
    const sliced = seasons.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const rows = sliced.map((s) => this._renderAsSeasonRow(s)).join("");
    const pagination = this._tlMobPag("sn-spage", page, totalPages);
    return `<div class="sn-is-section">
      <div class="sn-seasons-label">${this._t("snSeasonsLabel")}</div>
      <div style="min-height:156px;display:flex;flex-direction:column;gap:4px">${rows}</div>
      <div style="padding-bottom:12px">${pagination}</div>
    </div>`;
  }
  _renderAsSeasonRow(season) {
    const n = season.seasonNumber;
    const exp = this._snExpandedSeasons.has(n);
    const stat = season.statistics || {};
    const have = stat.episodeFileCount ?? 0;
    const tot = stat.totalEpisodeCount ?? stat.episodeCount ?? 0;
    const pct = tot > 0 ? Math.round(have / tot * 100) : 0;
    const key = `season:${n}`;
    const isSearching = this._asSearchingItems.has(key);
    const isSearched = this._asSearchedItems.has(key);
    const _series = this._asInstance === "sonarr2" ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
    const _qSeasons = this._asInstance === "sonarr2" ? this._sonarr2QueueSeasons || /* @__PURE__ */ new Set() : this._sonarrQueueSeasons || /* @__PURE__ */ new Set();
    const _qSeasonPct = this._asInstance === "sonarr2" ? this._sonarr2QueueSeasonPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeasonPct || /* @__PURE__ */ new Map();
    const _seasonKey = _series?.id != null ? `${_series.id}:${n}` : null;
    const isDownloading = this._asDownloadingItems.has(key) || _seasonKey && _qSeasons.has(_seasonKey);
    const dlPct = isDownloading && _seasonKey ? _qSeasonPct.get(_seasonKey) ?? null : null;
    const searchSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    const chevron = `<svg class="sn-season-chevron${exp ? " open" : ""}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    let searchBtn;
    if (isSearching) {
      searchBtn = `<span class="action-spinner" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0"></span>`;
    } else if (isDownloading) {
      searchBtn = `<span class="as-done-icon as-done-icon--dl"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg></span>`;
    } else if (isSearched) {
      searchBtn = `<span class="as-done-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71Z"/></svg></span>`;
    } else {
      searchBtn = `<button class="btn-person" data-action="as-season-search" data-season="${n}" title="Search season ${n}">${searchSvg}</button>`;
    }
    const episodesHtml = exp ? this._renderAsEpisodesPanel(n) : "";
    return `<div class="sn-season-row" data-season="${n}">
      <div class="sn-season-header">
        <button class="sn-expand" data-action="sn-season-toggle" data-season="${n}" title="${this._t("snExpandEpisodes")}">${chevron}</button>
        <span class="sn-season-title">${this._t("snSeasonTitle")} ${n}</span>
        <span class="sn-season-stat">${have}/${tot}</span>
        <div class="sn-season-bar"><div class="sn-season-bar-fill" style="width:${pct}%"></div></div>
        ${searchBtn}
      </div>
      ${episodesHtml}
    </div>`;
  }
  _renderAsEpisodesPanel(seasonNumber) {
    const eps = this._snEpisodes.get(seasonNumber);
    if (!eps) {
      return `<div class="sn-episodes sn-episodes-loading">
        <span class="action-spinner" style="width:14px;height:14px;border-width:1.5px"></span>
      </div>`;
    }
    if (eps.length === 0) {
      return `<div class="sn-episodes"><span style="color:rgba(255,255,255,0.4);font-size:11px">${this._t("snNoEpisodes")}</span></div>`;
    }
    return `<div class="sn-episodes">${eps.map((ep) => this._renderAsEpRow(ep)).join("")}</div>`;
  }
  _renderAsEpRow(ep) {
    const key = `ep:${ep.id}`;
    const isSearching = this._asSearchingItems.has(key);
    const isSearched = this._asSearchedItems.has(key);
    const _qEpisodes = this._asInstance === "sonarr2" ? this._sonarr2QueueEpisodes || /* @__PURE__ */ new Set() : this._sonarrQueueEpisodes || /* @__PURE__ */ new Set();
    const _qEpPct = this._asInstance === "sonarr2" ? this._sonarr2QueueEpPct || /* @__PURE__ */ new Map() : this._sonarrQueueEpPct || /* @__PURE__ */ new Map();
    const isDownloading = this._asDownloadingItems.has(key) || _qEpisodes.has(ep.id);
    const dlPct = isDownloading ? _qEpPct.get(ep.id) ?? null : null;
    const hasFile = !!ep.hasFile;
    const epNum = `S${String(ep.seasonNumber).padStart(2, "0")}E${String(ep.episodeNumber).padStart(2, "0")}`;
    const searchSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    let searchBtn;
    if (isSearching) {
      searchBtn = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px;flex-shrink:0"></span>`;
    } else if (isDownloading) {
      const bar = dlPct !== null ? `<div class="as-dl-bar" style="max-width:40px"><div class="as-dl-bar-fill" style="width:${dlPct}%"></div></div>` : "";
      searchBtn = `<span class="as-done-icon as-done-icon--dl" style="display:inline-flex;align-items:center;gap:3px">${bar}<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg></span>`;
    } else if (isSearched) {
      searchBtn = `<span class="as-done-icon"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71Z"/></svg></span>`;
    } else {
      searchBtn = `<button class="btn-person btn-person-sm" data-action="as-ep-search" data-epid="${ep.id}" data-season="${ep.seasonNumber}" title="Search episode">${searchSvg}</button>`;
    }
    return `<div class="sn-ep-item">
      <div class="sn-ep-row${hasFile ? " has-file" : ""}">
        <span class="sn-ep-num">${epNum}</span>
        <span class="sn-ep-title">${this._escHtml(ep.title || "")}</span>
        ${ep.airDate ? `<span class="sn-ep-date">${ep.airDate.slice(0, 10)}</span>` : ""}
        ${searchBtn}
      </div>
    </div>`;
  }
};
var autoSearchMixin = _AutoSearchMethods.prototype;

// src/fetch/index.js
var _FetchMethods = class {
  _callApi(method, path, body) {
    const p = this._debug ? path + (path.includes("?") ? "&" : "?") + "_debug=1" : path;
    return this._hass.callApi(method, p, body);
  }
  async _fetchAll() {
    if (this._overseerrConfigured === null) {
      await this._fetchOverseerrRadarrSettings();
    }
    await Promise.allSettled([
      this._fetchRadarr2(),
      this._fetchSonarr2()
    ]);
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
      this._fetchRadarr2Queue(),
      this._fetchSonarrQueue("sonarr"),
      this._fetchSonarrQueue("sonarr2"),
      this._fetchPendingRequests(),
      this._fetchMyPendingRequests(),
      this._fetchRadarrTags(),
      this._fetchSonarrTags(),
      this._fetchRadarrRootFolders(),
      this._fetchSonarrRootFolders(),
      this._fetchRadarr2Profiles(),
      this._fetchRadarr2Tags(),
      this._fetchRadarr2RootFolders(),
      this._fetchTautulli(),
      this._fetchJellystat(),
      this._fetchPlexSessions()
    ]);
    this._render();
  }
  async _fetchPlexSessions() {
    const now = Date.now();
    if (now - (this._plexLastFetch || 0) < 5e3) return;
    this._plexLastFetch = now;
    try {
      const raw = await this._callApi("GET", "arr_stack/plex/sessions");
      if (Array.isArray(raw)) {
        this._plexConfigured = false;
        this._plexSessions = [];
        return;
      }
      this._plexConfigured = true;
      const sessions = raw?.MediaContainer?.Metadata || [];
      this._plexSessions = sessions.filter((s) => s.Player?.machineIdentifier && (s.Player.state === "playing" || s.Player.state === "paused")).map((s) => this._normalizePlexSession(s));
    } catch (_) {
      this._plexConfigured = false;
      this._plexSessions = [];
    }
  }
  _normalizePlexSession(s) {
    const player = s.Player || {};
    const type = s.type || "";
    const isTV = type === "episode";
    const isMusic = type === "track";
    const poster = null;
    const productStr = (player.product || "").toLowerCase();
    const deviceStr = (player.device || "").toLowerCase();
    const platformStr = (player.platform || "").toLowerCase();
    const nl = `${productStr} ${deviceStr} ${platformStr}`;
    let deviceIcon = "mdi:television";
    let deviceName = "TV";
    if (/plexamp/i.test(productStr)) {
      if (/ipad|ipados/i.test(nl)) {
        deviceIcon = "mdi:tablet";
        deviceName = "iPad";
      } else if (/iphone|ios/i.test(nl)) {
        deviceIcon = "mdi:cellphone";
        deviceName = "iPhone";
      } else if (/android/i.test(nl)) {
        deviceIcon = "mdi:cellphone";
        deviceName = "Phone";
      } else if (/mac|macos/i.test(nl)) {
        deviceIcon = "mdi:laptop";
        deviceName = "Mac";
      } else if (/windows/i.test(nl)) {
        deviceIcon = "mdi:monitor";
        deviceName = "PC";
      } else {
        deviceIcon = "mdi:music";
        deviceName = "Plexamp";
      }
    } else if (/iphone|for ios/i.test(nl)) {
      deviceIcon = "mdi:cellphone";
      deviceName = "Phone";
    } else if (/ipad|ipados/i.test(nl)) {
      deviceIcon = "mdi:tablet";
      deviceName = "Tablet";
    } else if (/macbook|for mac\b|mac desktop/i.test(nl)) {
      deviceIcon = "mdi:laptop";
      deviceName = "Mac";
    } else if (/laptop/i.test(nl)) {
      deviceIcon = "mdi:laptop";
      deviceName = "Notebook";
    } else if (/windows|for windows|desktop|pc\b/i.test(nl)) {
      deviceIcon = "mdi:monitor";
      deviceName = "PC";
    } else if (/web|chrome|browser|safari|firefox/i.test(nl)) {
      deviceIcon = "mdi:web";
      deviceName = "Browser";
    } else if (/apple\s*tv|android\s*tv|fire\s*tv|roku|shield/i.test(nl)) {
      deviceIcon = "mdi:television";
      deviceName = "TV";
    } else if (/android/i.test(nl)) {
      deviceIcon = "mdi:cellphone";
      deviceName = "Phone";
    }
    const port = player.port || (player.secure ? 32433 : 32500);
    const protocol = player.secure ? "https" : "http";
    const playerUrl = player.address ? `${protocol}://${player.address}:${port}` : null;
    return {
      id: `plex:${player.machineIdentifier}`,
      source: "plex",
      state: player.state || "playing",
      attr: {
        media_content_type: isTV ? "episode" : isMusic ? "music" : "movie",
        media_title: s.title || "",
        // episode title / movie title / track title
        media_series_title: isTV ? s.grandparentTitle || "" : "",
        media_season: isTV ? s.parentIndex || 0 : 0,
        media_episode: isTV ? s.index || 0 : 0,
        media_artist: isMusic ? s.grandparentTitle || "" : "",
        media_album_name: isMusic ? s.parentTitle || "" : "",
        media_channel: "",
        media_library_title: "",
        entity_picture: null,
        // Plex poster built fresh at render via _plexThumb
        _plexThumb: s.thumb || s.parentThumb || s.grandparentThumb || "",
        media_duration: Math.round((s.duration || 0) / 1e3),
        media_position: Math.round((s.viewOffset || 0) / 1e3),
        media_position_updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        friendly_name: player.product || player.title || "",
        supported_features: 0
      },
      _machineIdentifier: player.machineIdentifier,
      _playerUrl: playerUrl,
      _plexUser: s.User?.title || "",
      _plexUserThumb: s.User?.thumb || "",
      _plexSessionId: s.Session?.id || s.sessionKey || "",
      _plexSessionKey: s.sessionKey || ""
    };
  }
  async _fetchDownloadsAndRender() {
    const prevQbit = new Set((this._qbit || []).map((t) => t.hash));
    const prevSab = new Set((this._sab?.slots || []).map((s) => s.nzo_id));
    const hadItems = prevQbit.size > 0 || prevSab.size > 0;
    await Promise.allSettled([
      this._fetchQbit(),
      this._fetchSab(),
      this._fetchSabHistory()
    ]);
    if (hadItems) {
      const currQbit = new Set((this._qbit || []).map((t) => t.hash));
      const currSab = new Set((this._sab?.slots || []).map((s) => s.nzo_id));
      const completed = [...prevQbit].some((id) => !currQbit.has(id)) || [...prevSab].some((id) => !currSab.has(id));
      if (completed) {
        await Promise.all([this._fetchRadarr(), this._fetchSonarr()]);
        this._reRenderRight();
      }
    }
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
      const data = await this._callApi("GET", "arr_stack/radarr/movies");
      const radarrFiltered = data.filter((m) => m.added && m.added !== "0001-01-01T00:00:00Z");
      this._radarrTotal = radarrFiltered.length;
      this._radarr = radarrFiltered.sort((a, b) => new Date(b.added) - new Date(a.added));
    } catch (e) {
      console.error("[arr-card] Radarr fetch error:", e);
    }
  }
  async _fetchSonarr() {
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr/series");
      const sonarrFiltered = data.filter((s) => s.added && s.added !== "0001-01-01T00:00:00Z");
      this._sonarrAll = Array.isArray(data) ? data : [];
      this._sonarrTotal = sonarrFiltered.length;
      this._sonarr = sonarrFiltered.sort((a, b) => new Date(b.added) - new Date(a.added));
      await this._fetchSonarrRecentImports();
      await this._fetchSonarrEpisodeFiles();
      await this._fetchBazarrEpisodes();
    } catch (e) {
      console.error("[arr-card] Sonarr fetch error:", e);
    }
  }
  _is503(e) {
    return e?.status === 503 || Number(e?.statusCode) === 503 || typeof e?.message === "string" && e.message.includes("503");
  }
  async _fetchRadarr2() {
    if (this._radarr2Configured === false) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr2/movies");
      if (data && data._notConfigured) {
        this._radarr2Configured = false;
        return;
      }
      const filtered = data.filter((m) => m.added && m.added !== "0001-01-01T00:00:00Z");
      this._radarr2 = filtered.sort((a, b) => new Date(b.added) - new Date(a.added));
      this._radarr2Total = filtered.length;
      this._radarr2Configured = true;
      const map = /* @__PURE__ */ new Map();
      for (const m of filtered) if (m.tmdbId) map.set(String(m.tmdbId), m);
      this._radarr2ByTmdb = map;
    } catch (e) {
      if (this._radarr2Configured === null) this._radarr2Configured = false;
    }
  }
  async _fetchSonarr2() {
    if (this._sonarr2Configured === false) return;
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr2/series");
      if (data && data._notConfigured) {
        this._sonarr2Configured = false;
        return;
      }
      const filtered = data.filter((s) => s.added && s.added !== "0001-01-01T00:00:00Z");
      this._sonarr2 = filtered.sort((a, b) => new Date(b.added) - new Date(a.added));
      this._sonarr2Total = filtered.length;
      this._sonarr2Configured = true;
      const map = /* @__PURE__ */ new Map();
      for (const s of filtered) if (s.tvdbId) map.set(String(s.tvdbId), s);
      this._sonarr2ByTvdb = map;
      await this._fetchSonarr2RecentImports();
    } catch (e) {
      if (this._sonarr2Configured === null) this._sonarr2Configured = false;
    }
  }
  async _fetchSonarr2RecentImports() {
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr2/recentimports");
      const records = (data.records || []).filter((r) => r.eventType === "downloadFolderImported");
      const dateMap = {};
      const epMap = {};
      for (const r of records) {
        if (!(r.seriesId in dateMap)) {
          dateMap[r.seriesId] = r.date;
          const sn = r.episode?.seasonNumber;
          const en = r.episode?.episodeNumber;
          if (sn != null && en != null) epMap[r.seriesId] = { s: sn, e: en };
        }
      }
      this._sonarr2ImportDates = dateMap;
      this._sonarr2ImportEps = epMap;
    } catch (e) {
      this._sonarr2ImportDates = {};
      this._sonarr2ImportEps = {};
    }
  }
  async _fetchSonarrRecentImports() {
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr/recentimports");
      const records = (data.records || []).filter((r) => r.eventType === "downloadFolderImported");
      const dateMap = {};
      const epMap = {};
      for (const r of records) {
        if (!(r.seriesId in dateMap)) {
          dateMap[r.seriesId] = r.date;
          const sn = r.episode?.seasonNumber;
          const en = r.episode?.episodeNumber;
          if (sn != null && en != null) epMap[r.seriesId] = { s: sn, e: en };
        }
      }
      this._sonarrImportDates = dateMap;
      this._sonarrImportEps = epMap;
    } catch (e) {
      console.error("[arr-card] Sonarr recent imports fetch error:", e);
      this._sonarrImportDates = {};
      this._sonarrImportEps = {};
    }
  }
  async _fetchSonarrEpisodeFiles() {
    try {
      const allSeries = (this._sonarr || []).filter((s) => (s.statistics?.episodeFileCount ?? 0) > 0);
      const importDates = this._sonarrImportDates || {};
      const withImports = allSeries.filter((s) => s.id in importDates).sort((a, b) => importDates[b.id].localeCompare(importDates[a.id])).slice(0, 20);
      const withoutImports = allSeries.filter((s) => !(s.id in importDates)).slice(0, Math.max(0, 20 - withImports.length));
      const recent = [...withImports, ...withoutImports];
      if (!recent.length) return;
      const results = await Promise.allSettled(
        recent.map((s) => this._callApi("GET", `arr_stack/sonarr/episodefiles?seriesId=${s.id}`))
      );
      const epFiles = {};
      for (let i = 0; i < recent.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0) {
          const epNum = (f) => {
            const m = (f.relativePath || "").match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
            return m ? parseInt(m[1]) * 1e4 + parseInt(m[2]) : 0;
          };
          const sorted = r.value.sort((a, b) => epNum(b) - epNum(a));
          epFiles[recent[i].id] = sorted[0];
        }
      }
      this._sonarrEpFiles = epFiles;
    } catch (e) {
      console.error("[arr-card] Sonarr episode files fetch error:", e);
    }
  }
  async _fetchCalendar() {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const end = new Date(Date.now() + 60 * 864e5).toISOString().split("T")[0];
      const data = await this._callApi("GET", `arr_stack/sonarr/calendar?start=${today}&end=${end}`);
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
  // Returns discover service prefix — 'overseerr' when configured, 'tmdb' as fallback
  get _discoverSvc() {
    return this._overseerrConfigured === false ? "tmdb" : "overseerr";
  }
  async _fetchOverseerr() {
    if (this._overseerrConfigured === null) return;
    try {
      const svc = this._discoverSvc;
      const [d1, d2] = await Promise.all([
        this._callApi("GET", `arr_stack/${svc}/upcoming?page=1`),
        this._callApi("GET", `arr_stack/${svc}/upcoming?page=2`).catch(() => ({ results: [] }))
      ]);
      this._upcoming = [...d1.results || [], ...d2.results || []];
      this._upcomingError = null;
    } catch (e) {
      this._upcomingError = e.message;
      console.error("[arr-card] Upcoming fetch error:", e);
    }
  }
  // Společný helper pro stránkované fetche (trending/popular/tvUpcoming)
  async _fetchOverseerrPaged(endpoint, dataKey, section) {
    if (this._overseerrConfigured === null) return;
    try {
      const svc = this._discoverSvc;
      const [d1, d2] = await Promise.all([
        this._callApi("GET", `arr_stack/${svc}/${endpoint}?page=1`),
        this._callApi("GET", `arr_stack/${svc}/${endpoint}?page=2`).catch(() => ({ results: [] }))
      ]);
      this[dataKey] = [...d1.results || [], ...d2.results || []];
      this._overlayApiTotalPages[section] = d1.totalPages || 1;
      this._overlayApiPage[section] = 2;
    } catch (e) {
      console.error(`[arr-card] ${section} fetch error:`, e);
    }
  }
  async _fetchTrending() {
    await this._fetchOverseerrPaged("trending", "_trending", "trending");
    if (this._overlay?.section === "trending") {
      const isMobile = window.matchMedia("(max-width: 480px)").matches;
      const rows = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
      const perPage = isMobile ? rows * 2 : rows * 4;
      const maxPage = Math.max(0, Math.ceil(this._trending.length / perPage) - 1);
      if (this._overlay.page > maxPage) this._overlay.page = 0;
    }
  }
  // Proaktivně načte další API stránky na pozadí, pokud overlay nemá dost dat
  async _proactiveSectionLoad(section) {
    const cfg = this._getSectionOverlayConfig(section);
    if (!cfg?.apiEndpoint) return;
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const rows = Math.max(1, parseInt(this._cfg.categoriesCount) || 3);
    const perPage = isMobile ? rows * 2 : rows * 4;
    while (this._overlay?.section === section && (this[cfg.dataKey] || []).length < perPage * 2 && (this._overlayApiPage[section] || 0) < (this._overlayApiTotalPages[section] || 1)) {
      try {
        const nextApiPage = (this._overlayApiPage[section] || 0) + 1;
        const data = await this._callApi("GET", `arr_stack/${cfg.apiEndpoint}?page=${nextApiPage}`);
        this[cfg.dataKey] = [...this[cfg.dataKey] || [], ...data.results || []];
        this._overlayApiTotalPages[section] = data.totalPages || this._overlayApiTotalPages[section] || 1;
        this._overlayApiPage[section] = nextApiPage;
        this._reRenderSection(section);
      } catch (err) {
        console.error(`[arr-card] ${section} proactive load error:`, err);
        break;
      }
    }
  }
  async _fetchPopular() {
    await this._fetchOverseerrPaged("popular", "_popular", "popular");
  }
  async _fetchTvUpcoming() {
    await this._fetchOverseerrPaged("tv_upcoming", "_tvUpcoming", "tvUpcoming");
  }
  async _fetchOverseerrSonarrSettings() {
    try {
      const servers = await this._callApi("GET", "arr_stack/overseerr/sonarr_settings");
      if (!Array.isArray(servers) || servers.length === 0) return;
      const primary = servers.find((s) => s.isDefault) || servers[0];
      this._seerrSonarr = {
        serverId: primary.id,
        profileId: primary.activeProfileId,
        rootFolder: primary.activeDirectory,
        name: primary.name || ""
      };
      const secondary = servers.find((s) => s.id !== primary.id);
      if (secondary) {
        this._seerrSonarr2 = {
          serverId: secondary.id,
          profileId: secondary.activeProfileId,
          rootFolder: secondary.activeDirectory,
          name: secondary.name || ""
        };
      }
    } catch (e) {
      console.error("[arr-card] Overseerr Sonarr settings fetch error:", e);
    }
  }
  async _fetchSonarrProfiles() {
    if (this._sonarrProfiles.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr/profiles");
      if (Array.isArray(data)) this._sonarrProfiles = data;
    } catch (e) {
      console.error("[arr-card] Sonarr profiles fetch error:", e);
    }
  }
  async _oneClickTvRequest(show) {
    try {
      if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const profileName = this._cfgGet("discover", "oneClickDefaultShowProfile", "");
      let profileId = this._seerrSonarr?.profileId ?? null;
      if (profileName) {
        await this._fetchSonarrProfiles();
        const match = this._sonarrProfiles.find((p) => p.name === profileName);
        if (match) profileId = match.id;
      }
      const tagName = this._cfgGet("discover", "oneClickDefaultShowTag", "");
      let tagId = null;
      if (tagName && this._sonarrTags.length > 0) {
        const tagMatch = this._sonarrTags.find((t) => t.label === tagName);
        if (tagMatch) tagId = tagMatch.id;
      }
      const cfgRootFolder = this._cfgGet("discover", "oneClickDefaultShowRootFolder", "") || null;
      let seasons = [];
      if (this._overseerrConfigured !== false) {
        const detail = await this._callApi("GET", `arr_stack/overseerr/tv/${show.id}`);
        const season1 = (detail.seasons || []).find((s) => s.seasonNumber === 1);
        seasons = season1 ? [1] : [(detail.seasons || []).filter((s) => s.seasonNumber > 0).sort((a, b) => a.seasonNumber - b.seasonNumber)[0]?.seasonNumber].filter(Boolean);
      } else {
        const tvdbId = show.externalIds?.tvdbId || show.tvdbId;
        if (tvdbId) {
          const lookup = await this._callApi("GET", `arr_stack/sonarr/lookup?tvdbId=${tvdbId}`);
          const s = Array.isArray(lookup) ? lookup[0] : lookup;
          const allSeasons = (s?.seasons || []).filter((x) => x.seasonNumber > 0).sort((a, b) => a.seasonNumber - b.seasonNumber);
          seasons = allSeasons.length ? [allSeasons[0].seasonNumber] : [];
        }
      }
      if (seasons.length === 0) return;
      this._optimisticRequested.add(show.id);
      this._withdrawnIds.delete(show.id);
      this._reRenderRight();
      if (this._overseerrConfigured === false) {
        await this._addDirectTvRequest(show, seasons, profileId, tagId, cfgRootFolder);
        return;
      }
      const body = { mediaType: "tv", mediaId: show.id, seasons };
      if (this._seerrSonarr) {
        body.serverId = this._seerrSonarr.serverId;
        body.profileId = profileId;
        body.rootFolder = cfgRootFolder || this._seerrSonarr.rootFolder;
      }
      if (!this._hass.user.is_admin) body.userMode = "family";
      if (tagId !== null) body.tags = [parseInt(tagId)];
      const resp = await this._callApi("POST", "arr_stack/overseerr/request", body);
      const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
      if (reqId && !this._hass.user.is_admin) {
        this._familyPendingIds.set(Number(show.id), reqId);
        this._savePendingToStorage();
      }
      this._reRenderRight();
    } catch (e) {
      console.error("[arr-card] oneClick TV request error:", e);
      this._optimisticRequested.delete(show.id);
      this._reRenderRight();
    }
  }
  async _openTvRequestOverlay(m, source = "tvUpcoming") {
    this._tvRequestPending = { show: m, seasons: null, selected: null, profileId: null, mediaId: m.id, loading: true, source };
    this._reRenderRight();
    await Promise.allSettled([
      (async () => {
        let seasons = [];
        if (this._overseerrConfigured !== false) {
          try {
            const detail = await this._callApi("GET", `arr_stack/overseerr/tv/${m.id}`);
            seasons = (detail.seasons || []).filter((s) => s.seasonNumber > 0).map((s) => s.seasonNumber).sort((a, b) => a - b);
          } catch (_) {
          }
        }
        if (!seasons.length) {
          let tvdbId = m.externalIds?.tvdbId || m.tvdbId;
          if (!tvdbId && this._overseerrConfigured === false) {
            try {
              const ext = await this._callApi("GET", `arr_stack/tmdb/tv/${m.id}`);
              tvdbId = ext?.externalIds?.tvdbId;
            } catch (_) {
            }
          }
          if (tvdbId) {
            try {
              const lookup = await this._callApi("GET", `arr_stack/sonarr/lookup?tvdbId=${tvdbId}`);
              const s = Array.isArray(lookup) ? lookup[0] : lookup;
              seasons = (s?.seasons || []).filter((s2) => s2.seasonNumber > 0).map((s2) => s2.seasonNumber).sort((a, b) => a - b);
            } catch (_) {
            }
          }
        }
        if (this._tvRequestPending) {
          this._tvRequestPending.seasons = seasons;
          this._tvRequestPending.selected = new Set(seasons);
        }
      })(),
      this._fetchSonarrProfiles(),
      this._fetchSonarrRootFolders(),
      (async () => {
        if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      })()
    ]);
    if (this._tvRequestPending) {
      this._tvRequestPending.profileId = this._seerrSonarr?.profileId ?? null;
      this._tvRequestPending.loading = false;
      this._reRenderRight();
      this._wireTvOverlay();
    }
  }
  async _addOverseerrTvRequest(mediaId, seasons, profileId, tagId = null, rootFolder = null) {
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
        body.rootFolder = rootFolder || this._seerrSonarr.rootFolder;
      }
      if (tagId !== null) body.tags = [parseInt(tagId)];
      if (!this._hass.user.is_admin) body.userMode = "family";
      const resp = await this._callApi("POST", "arr_stack/overseerr/request", body);
      const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
      if (reqId && !this._hass.user.is_admin) {
        this._familyPendingIds.set(Number(mediaId), reqId);
        this._savePendingToStorage();
        this._reRenderRight();
      }
      this._fetchTvUpcoming().then(() => this._reRenderRight());
      setTimeout(() => this._fetchSonarr().then(() => this._reRenderRight()), 2e3);
    } catch (e) {
      if (showId) this._optimisticRequested.delete(showId);
      this._reRenderRight();
      console.error("[arr-card] Overseerr TV request error:", e);
    }
  }
  // ─── Direct add (bez Overseerr) ────────────────────────────────────────────
  async _addDirectMovieRequest(tmdbId, profileId, tagId, rootFolder, instance = "radarr") {
    const svc = instance === "radarr2" ? "radarr2" : "radarr";
    const profiles = instance === "radarr2" ? this._radarr2Profiles : this._radarrProfiles;
    const rootFolders = instance === "radarr2" ? this._radarr2RootFolders : this._radarrRootFolders;
    this._optimisticRequested.add(tmdbId);
    this._withdrawnIds?.delete(tmdbId);
    this._requestPending = null;
    this._reRenderRight();
    try {
      const rf = rootFolder || rootFolders?.[0]?.path || "/movies";
      const pId = profileId ? parseInt(profileId) : profiles?.[0]?.id ?? 1;
      const pd = this._popup;
      const body = { tmdbId: parseInt(tmdbId), title: pd?.title || pd?.name || "", qualityProfileId: pId, rootFolderPath: rf, monitored: true, addOptions: { searchForMovie: true } };
      if (tagId) body.tags = [parseInt(tagId)];
      await this._callApi("POST", `arr_stack/${svc}/movie`, body);
      setTimeout(() => {
        (svc === "radarr2" ? this._fetchRadarr2() : this._fetchRadarr()).then(() => this._reRenderRight());
      }, 2e3);
    } catch (e) {
      this._optimisticRequested.delete(tmdbId);
      this._reRenderRight();
      console.error("[arr-card] Direct Radarr add error:", e);
    }
  }
  async _addDirectTvRequest(show, seasons, profileId, tagId, rootFolder) {
    const showId = show?.id;
    const tvdbId = show?.externalIds?.tvdbId || show?.tvdbId;
    if (!tvdbId) return;
    if (showId) {
      this._optimisticRequested.add(showId);
      this._withdrawnIds?.delete(showId);
    }
    this._tvRequestPending = null;
    this._reRenderRight();
    try {
      await this._fetchSonarrProfiles();
      await this._fetchSonarrRootFolders();
      const lookupResults = await this._callApi("GET", `arr_stack/sonarr/lookup?tvdbId=${tvdbId}`);
      const seriesData = Array.isArray(lookupResults) ? lookupResults[0] : lookupResults;
      if (!seriesData) throw new Error("Series not found");
      const rf = rootFolder || this._sonarrRootFolders?.[0]?.path || "/tv";
      const pId = profileId ? parseInt(profileId) : this._sonarrProfiles?.[0]?.id ?? 1;
      const seasonObjs = (seriesData.seasons || []).map((s) => ({ ...s, monitored: seasons.includes(s.seasonNumber) }));
      try {
        await this._callApi("POST", "arr_stack/sonarr/series", {
          ...seriesData,
          seasons: seasonObjs,
          qualityProfileId: pId,
          rootFolderPath: rf,
          monitored: true,
          addOptions: { searchForMissingEpisodes: true, searchForCutoffUnmetEpisodes: false, monitor: "none" },
          ...tagId ? { tags: [parseInt(tagId)] } : {}
        });
      } catch (_) {
      }
      setTimeout(() => this._fetchSonarr().then(() => this._reRenderRight()), 2e3);
    } catch (e) {
      if (showId) this._optimisticRequested.delete(showId);
      this._reRenderRight();
      console.error("[arr-card] Direct Sonarr add error:", e);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────
  async _fetchBazarr() {
    try {
      const data = await this._callApi("GET", "arr_stack/bazarr/movies");
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
      const status = e?.status_code ?? e?.status ?? e?.response?.status;
      const body = typeof e?.body === "string" ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
      this._bazarrConfigured = !(status === 503 || body.includes("not configured"));
      console.error("[arr-card] Bazarr fetch error:", e);
    }
  }
  async _fetchBazarrEpisodes() {
    if (!this._bazarrConfigured) return;
    try {
      const seriesIds = Object.keys(this._sonarrEpFiles || {});
      if (!seriesIds.length) return;
      const results = await Promise.allSettled(
        seriesIds.map((sid) => this._callApi("GET", `arr_stack/bazarr/episodes?seriesId=${sid}`))
      );
      const map = {};
      for (let i = 0; i < seriesIds.length; i++) {
        const r = results[i];
        if (r.status !== "fulfilled") continue;
        for (const ep of r.value?.data || []) {
          map[ep.sonarrEpisodeFileId] = {
            subtitles: ep.subtitles || [],
            missing: ep.missing_subtitles || []
          };
        }
      }
      this._bazarrEpisodes = map;
    } catch (e) {
      console.error("[arr-card] Bazarr episodes fetch error:", e);
    }
  }
  async _fetchRadarrQueue() {
    try {
      const data = await this._callApi("GET", "arr_stack/radarr/queue");
      const records = data.records || data;
      const failed = /* @__PURE__ */ new Set();
      const active = /* @__PURE__ */ new Set();
      const pct = /* @__PURE__ */ new Map();
      for (const item of Array.isArray(records) ? records : []) {
        if (!item.movieId) continue;
        const bad = item.trackedDownloadStatus === "warning" || item.trackedDownloadStatus === "error" || item.trackedDownloadState === "importFailed" || item.status === "failed";
        if (bad) {
          failed.add(item.movieId);
          continue;
        }
        active.add(item.movieId);
        const sz = item.size || 0;
        const sl = item.sizeleft || 0;
        pct.set(item.movieId, sz > 0 ? Math.round((sz - sl) / sz * 100) : 0);
      }
      this._radarrQueueFailed = failed;
      this._radarrQueueActive = active;
      this._radarrQueuePct = pct;
    } catch (e) {
      console.error("[arr-card] Radarr queue fetch error:", e);
    }
  }
  async _fetchRadarr2Queue() {
    if (this._radarr2Configured === false) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr2/queue");
      const records = data.records || data;
      const failed = /* @__PURE__ */ new Set();
      const active = /* @__PURE__ */ new Set();
      const pct = /* @__PURE__ */ new Map();
      for (const item of Array.isArray(records) ? records : []) {
        if (!item.movieId) continue;
        const bad = item.trackedDownloadStatus === "warning" || item.trackedDownloadStatus === "error" || item.trackedDownloadState === "importFailed" || item.status === "failed";
        if (bad) {
          failed.add(item.movieId);
          continue;
        }
        active.add(item.movieId);
        const sz = item.size || 0;
        const sl = item.sizeleft || 0;
        pct.set(item.movieId, sz > 0 ? Math.round((sz - sl) / sz * 100) : 0);
      }
      this._radarr2QueueFailed = failed;
      this._radarr2QueueActive = active;
      this._radarr2QueuePct = pct;
    } catch (e) {
    }
  }
  async _fetchSonarrQueue(instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    const seasonsKey = instance === "sonarr2" ? "_sonarr2QueueSeasons" : "_sonarrQueueSeasons";
    const episodesKey = instance === "sonarr2" ? "_sonarr2QueueEpisodes" : "_sonarrQueueEpisodes";
    const epPctKey = instance === "sonarr2" ? "_sonarr2QueueEpPct" : "_sonarrQueueEpPct";
    const seasonPctKey = instance === "sonarr2" ? "_sonarr2QueueSeasonPct" : "_sonarrQueueSeasonPct";
    const seriesPctKey = instance === "sonarr2" ? "_sonarr2QueueSeriesPct" : "_sonarrQueueSeriesPct";
    try {
      const data = await this._callApi("GET", `arr_stack/${svc}/queue`);
      const records = Array.isArray(data) ? data : data.records || [];
      const seasons = /* @__PURE__ */ new Set();
      const episodes = /* @__PURE__ */ new Set();
      const epPct = /* @__PURE__ */ new Map();
      const seasonData = /* @__PURE__ */ new Map();
      const seriesData = /* @__PURE__ */ new Map();
      for (const item of records) {
        const bad = item.trackedDownloadStatus === "warning" || item.trackedDownloadStatus === "error" || item.trackedDownloadState === "importFailed" || item.status === "failed";
        if (bad) continue;
        const sz = item.size || 0;
        const sl = item.sizeleft || 0;
        const pct = sz > 0 ? Math.round((sz - sl) / sz * 100) : 0;
        if (item.seriesId != null && item.seasonNumber != null) {
          const sk = `${item.seriesId}:${item.seasonNumber}`;
          seasons.add(sk);
          const prev = seasonData.get(sk) || { size: 0, sizeleft: 0 };
          seasonData.set(sk, { size: prev.size + sz, sizeleft: prev.sizeleft + sl });
          const sprev = seriesData.get(item.seriesId) || { size: 0, sizeleft: 0 };
          seriesData.set(item.seriesId, { size: sprev.size + sz, sizeleft: sprev.sizeleft + sl });
        }
        if (item.episodeId != null) {
          episodes.add(item.episodeId);
          epPct.set(item.episodeId, pct);
        }
      }
      const seasonPct = /* @__PURE__ */ new Map();
      for (const [sk, { size, sizeleft }] of seasonData)
        seasonPct.set(sk, size > 0 ? Math.round((size - sizeleft) / size * 100) : 0);
      const seriesPct = /* @__PURE__ */ new Map();
      for (const [sid, { size, sizeleft }] of seriesData)
        seriesPct.set(sid, size > 0 ? Math.round((size - sizeleft) / size * 100) : 0);
      this[seasonsKey] = seasons;
      this[episodesKey] = episodes;
      this[epPctKey] = epPct;
      this[seasonPctKey] = seasonPct;
      this[seriesPctKey] = seriesPct;
    } catch (e) {
    }
  }
  async _fetchSab() {
    try {
      const data = await this._callApi("GET", "arr_stack/sabnzbd/queue");
      if (data?.status === false) {
        console.error("[arr-card] SABnzbd API error:", data?.error);
        this._sabConfigured = false;
        return;
      }
      const queue = data.queue || {};
      const prev = this._sabMbleftPrev || {};
      const curr = {};
      const active = /* @__PURE__ */ new Set();
      const slots = queue.slots || [];
      const globalSpeed = parseFloat(queue.kbpersec) || 0;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const mbleft = parseFloat(s.mbleft) || 0;
        curr[s.nzo_id] = mbleft;
        if (s.nzo_id in prev && prev[s.nzo_id] > mbleft) {
          active.add(s.nzo_id);
        }
        if (i === 0 && globalSpeed > 0 && mbleft > 0) {
          active.add(s.nzo_id);
        }
      }
      this._sabMbleftPrev = curr;
      this._sabActiveIds = queue.status === "Paused" ? /* @__PURE__ */ new Set() : active;
      this._sab = queue;
      this._sabConfigured = true;
      this._fetchVpnIp();
    } catch (e) {
      const status = e?.status_code ?? e?.status ?? e?.response?.status;
      const body = typeof e?.body === "string" ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
      const isNotConfigured = status === 503 || body.includes("not configured");
      this._sabConfigured = !isNotConfigured;
      console.error("[arr-card] SABnzbd fetch error:", e);
    }
  }
  async _fetchVpnIp() {
    if (this._vpnIpFetching) return;
    this._vpnIpFetching = true;
    try {
      const res = await this._callApi("GET", "arr_stack/sabnzbd/status");
      const newLocal = res?.status?.localipv4 || null;
      const newPublic = res?.status?.publicipv4 || null;
      const changed = !this._sabVpnFetched || newLocal !== this._sabLocalIp || newPublic !== this._sabPublicIp;
      this._sabLocalIp = newLocal;
      this._sabPublicIp = newPublic;
      this._sabVpnFetched = true;
      if (changed) this._render();
    } catch (e) {
    } finally {
      this._vpnIpFetching = false;
    }
  }
  async _fetchSabHistory() {
    try {
      const data = await this._callApi("GET", "arr_stack/sabnzbd/history");
      const slots = data?.history?.slots || [];
      this._sabFailed = slots.filter((s) => s.status === "Failed");
      const DONE = /* @__PURE__ */ new Set(["Completed", "Extracting", "Moving", "Running Script", "Verifying"]);
      this._sabCompleted = slots.filter((s) => DONE.has(s.status)).slice(0, 10);
    } catch (e) {
      console.error("[arr-card] SABnzbd history fetch error:", e);
    }
  }
  async _sabQueueDelete(nzoId) {
    this._sabQueueBusy = nzoId;
    this._reRenderLeft();
    try {
      await this._callApi("POST", "arr_stack/sabnzbd/action", { mode: "queue", name: "delete", nzo_id: nzoId });
    } catch (e) {
      console.error("[arr-card] SAB queue delete error:", e);
    } finally {
      this._sabQueueBusy = null;
      await this._fetchSab();
      this._reRenderLeft();
    }
  }
  async _sabHistoryDelete(nzoId) {
    this._sabDeleteBusy = nzoId;
    this._reRenderLeft();
    try {
      await this._callApi("POST", "arr_stack/sabnzbd/action", { mode: "history", name: "delete", nzo_id: nzoId });
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
      await this._callApi("POST", "arr_stack/sabnzbd/action", { mode: "retry", nzo_id: nzoId });
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
      const [torrents, transfer, maindata] = await Promise.all([
        this._callApi("GET", "arr_stack/qbit/torrents"),
        this._callApi("GET", "arr_stack/qbit/transfer"),
        this._callApi("GET", "arr_stack/qbit/maindata").catch(() => null)
      ]);
      this._qbit = torrents;
      this._qbitTransfer = transfer;
      this._qbitDiskFreeBytes = maindata?.server_state?.free_space_on_disk ?? null;
      this._qbitConfigured = true;
    } catch (e) {
      const status = e?.status_code ?? e?.status ?? e?.response?.status;
      const body = typeof e?.body === "string" ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
      const isNotConfigured = status === 503 || body.includes("not configured");
      this._qbitConfigured = !isNotConfigured;
      console.error("[arr-card] qBittorrent fetch error:", e);
    }
  }
  async _fetchOverseerrRadarrSettings() {
    try {
      const servers = await this._callApi("GET", "arr_stack/overseerr/radarr_settings");
      if (!Array.isArray(servers) || servers.length === 0) {
        this._overseerrConfigured = false;
        return;
      }
      this._overseerrConfigured = true;
      const primary = servers.find((s) => s.isDefault && !s.is4k) || servers.find((s) => !s.is4k) || servers[0];
      this._seerrRadarr = {
        serverId: primary.id,
        profileId: primary.activeProfileId,
        rootFolder: primary.activeDirectory,
        name: primary.name || ""
      };
      const secondary = servers.find((s) => s.id !== primary.id && s.is4k) || servers.find((s) => s.id !== primary.id);
      if (secondary) {
        this._seerrRadarr2 = {
          serverId: secondary.id,
          profileId: secondary.activeProfileId,
          rootFolder: secondary.activeDirectory,
          is4k: !!secondary.is4k,
          name: secondary.name || ""
        };
      }
    } catch (e) {
      this._overseerrConfigured = false;
    }
  }
  async _fetchRadarrProfiles() {
    if (this._radarrProfiles.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr/profiles");
      if (Array.isArray(data)) this._radarrProfiles = data;
    } catch (e) {
      console.error("[arr-card] Radarr profiles fetch error:", e);
    }
  }
  async _fetchRadarrTags() {
    if (this._radarrTags.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr/tags");
      if (Array.isArray(data)) this._radarrTags = data;
    } catch (e) {
    }
  }
  async _fetchSonarrTags() {
    if (this._sonarrTags.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr/tags");
      if (Array.isArray(data)) this._sonarrTags = data;
    } catch (e) {
    }
  }
  async _fetchRadarrRootFolders() {
    if (this._radarrRootFolders.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr/rootfolders");
      if (Array.isArray(data)) this._radarrRootFolders = data;
    } catch (e) {
    }
  }
  async _fetchRadarr2Profiles() {
    if (this._radarr2Configured === false) return;
    if (this._radarr2Profiles.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr2/profiles");
      if (Array.isArray(data)) this._radarr2Profiles = data;
    } catch (e) {
    }
  }
  async _fetchRadarr2Tags() {
    if (this._radarr2Configured === false) return;
    if (this._radarr2Tags.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr2/tags");
      if (Array.isArray(data)) this._radarr2Tags = data;
    } catch (e) {
    }
  }
  async _fetchRadarr2RootFolders() {
    if (this._radarr2Configured === false) return;
    if (this._radarr2RootFolders.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/radarr2/rootfolders");
      if (Array.isArray(data)) this._radarr2RootFolders = data;
    } catch (e) {
    }
  }
  async _fetchSonarrRootFolders() {
    if (this._sonarrRootFolders.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr/rootfolders");
      if (Array.isArray(data)) this._sonarrRootFolders = data;
    } catch (e) {
    }
  }
  async _fetchSonarr2Profiles() {
    if (this._sonarr2Configured === false) return;
    if (this._sonarr2Profiles?.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr2/profiles");
      if (Array.isArray(data)) this._sonarr2Profiles = data;
    } catch (e) {
    }
  }
  async _fetchSonarr2RootFolders() {
    if (this._sonarr2Configured === false) return;
    if (this._sonarr2RootFolders?.length > 0) return;
    try {
      const data = await this._callApi("GET", "arr_stack/sonarr2/rootfolders");
      if (Array.isArray(data)) this._sonarr2RootFolders = data;
    } catch (e) {
    }
  }
  // ─────────────────────────────────────────────
  // Sonarr Interactive Search
  // ─────────────────────────────────────────────
  async _fetchSonarrEpisodes(seriesId, seasonNumber, instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    try {
      const data = await this._callApi("GET", `arr_stack/${svc}/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
      const eps = (Array.isArray(data) ? data : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
      this._snEpisodes.set(seasonNumber, eps);
    } catch (e) {
      console.error("[arr-card] Sonarr episodes fetch error:", e);
      this._snEpisodes.set(seasonNumber, []);
    }
    this._renderPopupEl();
  }
  async _fetchSonarrSeasonIS(seriesId, seasonNumber, instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
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
        const epData = await this._callApi("GET", `arr_stack/${svc}/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
        eps = (Array.isArray(epData) ? epData : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
        if (eps.length > 0) this._snEpisodes.set(seasonNumber, eps);
      }
      const firstEp = eps[0];
      if (!firstEp) throw new Error(this._t("snNoEpisodes"));
      const [data, histRaw] = await Promise.all([
        this._callApi("GET", `arr_stack/${svc}/release?episodeId=${firstEp.id}`),
        this._callApi("GET", `arr_stack/${svc}/history?seriesId=${seriesId}`).catch(() => null)
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
  async _fetchSonarrEpIS(episodeId, seriesId, instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    this._snIsState = "loading";
    this._snIsResults = [];
    this._snIsError = null;
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    this._renderPopupEl();
    try {
      const [data, histRaw] = await Promise.all([
        this._callApi("GET", `arr_stack/${svc}/release?episodeId=${episodeId}`),
        this._callApi("GET", `arr_stack/${svc}/history?seriesId=${seriesId}`).catch(() => null)
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
      const snSvc = this._snIsInstance === "sonarr2" ? "sonarr2" : "sonarr";
      await this._callApi("POST", `arr_stack/${snSvc}/release`, release);
      this._snIsGrabbed.add(guid);
      this._dlTriggeredBy = "is";
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
  async _fetchSearch(query) {
    this._searchLoading = true;
    try {
      if (this._overseerrConfigured === false) {
        const [movieRaw, tvRaw] = await Promise.allSettled([
          this._callApi("GET", `arr_stack/radarr/lookup?term=${encodeURIComponent(query)}`),
          this._callApi("GET", `arr_stack/sonarr/lookup?term=${encodeURIComponent(query)}`)
        ]);
        const movies = (movieRaw.status === "fulfilled" && Array.isArray(movieRaw.value) ? movieRaw.value : []).filter((m) => m.tmdbId).map((m) => ({
          id: m.tmdbId,
          mediaType: "movie",
          title: m.title || "",
          posterPath: m.remotePoster || null,
          overview: m.overview || "",
          releaseDate: m.year ? `${m.year}-01-01` : "",
          genres: (m.genres || []).map((g) => typeof g === "string" ? { name: g } : g),
          ratings: m.ratings || {},
          voteAverage: m.ratings?.tmdb?.value || m.ratings?.imdb?.value || 0,
          images: m.images || [],
          youTubeTrailerId: m.youTubeTrailerId || null,
          mediaInfo: null
        }));
        const shows = (tvRaw.status === "fulfilled" && Array.isArray(tvRaw.value) ? tvRaw.value : []).filter((s) => s.tvdbId).map((s) => ({
          id: s.tmdbId || null,
          tvdbId: s.tvdbId,
          mediaType: "tv",
          name: s.title || "",
          posterPath: s.remotePoster || null,
          overview: s.overview || "",
          firstAirDate: s.year ? `${s.year}-01-01` : "",
          genres: (s.genres || []).map((g) => typeof g === "string" ? { name: g } : g),
          ratings: s.ratings || {},
          voteAverage: s.ratings?.tmdb?.value || s.ratings?.imdb?.value || s.ratings?.value || 0,
          images: s.images || [],
          youTubeTrailerId: s.youTubeTrailerId || null,
          mediaInfo: null
        }));
        const merged = [];
        const max = Math.max(movies.length, shows.length);
        for (let i = 0; i < max; i++) {
          if (movies[i]) merged.push(movies[i]);
          if (shows[i]) merged.push(shows[i]);
        }
        this._searchResults = merged;
      } else {
        const data = await this._callApi("POST", `arr_stack/${this._discoverSvc}/search`, { query });
        this._searchResults = (data?.results || []).filter((r) => r.mediaType === "movie" || r.mediaType === "tv");
      }
    } catch (e) {
      this._searchResults = [];
      console.error("[arr-card] Search fetch error:", e);
    }
    this._searchLoading = false;
    this._reRenderRight();
    setTimeout(() => {
      const inp = this.shadowRoot?.querySelector(".search-bar-input");
      if (inp && this._searchActive) {
        inp.focus();
        const len = inp.value.length;
        inp.setSelectionRange(len, len);
      }
    }, 80);
  }
  async _addOverseerrRequest(mediaId, profileId = null, tagId = null, rootFolder = null, use4k = false) {
    this._optimisticRequested.add(mediaId);
    this._withdrawnIds.delete(mediaId);
    this._requestPending = null;
    this._reRenderRight();
    try {
      if (!this._seerrRadarr) await this._fetchOverseerrRadarrSettings();
      const seerr = use4k && this._seerrRadarr2 ? this._seerrRadarr2 : this._seerrRadarr;
      const body = { mediaId, mediaType: "movie" };
      if (seerr) {
        body.serverId = seerr.serverId;
        body.profileId = profileId !== null ? parseInt(profileId) : seerr.profileId;
        body.rootFolder = rootFolder || seerr.rootFolder;
      }
      if (tagId !== null) body.tags = [parseInt(tagId)];
      if (!this._hass.user.is_admin) body.userMode = "family";
      const resp = await this._callApi("POST", "arr_stack/overseerr/request", body);
      const reqId = Array.isArray(resp) ? resp[0]?.id : resp?.id;
      if (reqId && !this._hass.user.is_admin) {
        this._familyPendingIds.set(Number(mediaId), reqId);
        this._savePendingToStorage();
        this._reRenderRight();
      }
      this._fetchOverseerr().then(() => this._reRenderRight());
      setTimeout(() => this._fetchRadarr().then(() => this._reRenderRight()), 2e3);
      if (use4k) setTimeout(() => this._fetchRadarr2().then(() => this._reRenderRight()), 2e3);
    } catch (e) {
      this._optimisticRequested.delete(mediaId);
      this._reRenderRight();
      console.error("[arr-card] Overseerr add request error:", e);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Tautulli — poster data fetch
  // ──────────────────────────────────────────────────────────────────────────
  async _fetchTautulli() {
    if (!this._tautulliConfigured) return;
    try {
      const [actRaw, statsRaw, playsRaw, ackRaw, libsRaw, histRaw] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/tautulli/get_activity").catch(() => null),
        this._hass.callApi("GET", "arr_stack/tautulli/get_home_stats?time_range=7&stats_count=5&stats_type=plays").catch(() => null),
        this._hass.callApi("GET", "arr_stack/tautulli/get_plays_by_date?time_range=7&y_axis=plays").catch(() => null),
        this._hass.callApi("GET", "arr_stack/tautulli/sharing_ack").catch(() => null),
        this._hass.callApi("GET", "arr_stack/tautulli/get_libraries_table?length=20&start=0").catch(() => null),
        this._hass.callApi("GET", `arr_stack/tautulli/get_history?length=${this._config?.security?.ip_history_depth ?? 200}&order_column=date&order_dir=desc`).catch(() => null)
      ]);
      if (actRaw === null && statsRaw === null) {
        this._tautulliConfigured = false;
        return;
      }
      const act = actRaw?.response?.data || {};
      const stats = statsRaw?.response?.data || [];
      const playsD = playsRaw?.response?.data || {};
      const cats = playsD.categories || [];
      const series = playsD.series || [];
      const movieSeries = series.find((sr) => /movie/i.test(sr.name));
      const showSeries = series.find((sr) => /tv|show/i.test(sr.name));
      const musicSeries = series.find((sr) => /music|artist/i.test(sr.name));
      const playsData = cats.map((date, i) => ({
        date,
        value: series.reduce((s, sr) => s + ((sr.data || [])[i] || 0), 0),
        movie: (movieSeries?.data || [])[i] || 0,
        show: (showSeries?.data || [])[i] || 0,
        music: (musicSeries?.data || [])[i] || 0
      }));
      const threshold = this._config?.security?.ip_sharing_threshold ?? 2;
      const histRows = histRaw?.response?.data?.data || [];
      const byUser = {};
      histRows.forEach((h) => {
        const name = h.friendly_name || h.user || h.username;
        if (!name || !h.ip_address) return;
        if (!byUser[name]) byUser[name] = {};
        const ip = h.ip_address;
        if (!byUser[name][ip]) byUser[name][ip] = { ip, lastSeen: h.date || h.stopped || 0, count: 0 };
        byUser[name][ip].count++;
        if ((h.date || h.stopped || 0) > byUser[name][ip].lastSeen) byUser[name][ip].lastSeen = h.date || h.stopped || 0;
      });
      const ackedIps = ackRaw?.ackedIps || {};
      const sharingUsers = [];
      const ipReport = {};
      for (const [name, ipMap] of Object.entries(byUser)) {
        const knownIps = new Set(ackedIps[name] || []);
        const newIps = Object.values(ipMap).filter((e) => !knownIps.has(e.ip));
        if (newIps.length >= threshold) {
          sharingUsers.push(name);
          ipReport[name] = Object.values(ipMap).sort((a, b) => b.lastSeen - a.lastSeen);
        }
      }
      this._tautulli = {
        activity: act,
        stats,
        playsData,
        libraries: libsRaw?.response?.data?.data || [],
        recentHistory: histRaw?.response?.data?.data || [],
        sharingDetected: sharingUsers.length > 0,
        sharingAcked: false,
        sharingUsers,
        ackedIps,
        ipReport
      };
    } catch (e) {
      console.warn("[arr-card] Tautulli fetch error:", e);
    }
  }
  async _ackTautulliSharing() {
    if (!this._tautulli) return;
    const { sharingUsers, ackedIps: prev, ipReport } = this._tautulli;
    const updated = { ...prev };
    sharingUsers.forEach((name) => {
      const ips = (ipReport?.[name] || []).map((e) => e.ip);
      const existing = new Set(prev[name] || []);
      ips.forEach((ip) => existing.add(ip));
      updated[name] = [...existing];
    });
    try {
      await this._hass.callApi("POST", "arr_stack/tautulli/sharing_ack", { ackedIps: updated });
      this._tautulli = { ...this._tautulli, sharingAcked: true, ackedIps: updated };
      this._reRenderRight();
    } catch (e) {
      console.warn("[arr-card] Tautulli ack error:", e);
    }
  }
  // ─────────────────────────────────────────────
  // Jellystat
  // ─────────────────────────────────────────────
  async _fetchJellystat() {
    if (!this._jellystatConfigured) return;
    try {
      const [libsRaw, usersRaw, histRaw, playsRaw] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/jellystat/getLibraries").catch(() => null),
        this._hass.callApi("GET", "arr_stack/jellystat/stats/getAllUserActivity").catch(() => null),
        this._hass.callApi("GET", "arr_stack/jellystat/getHistory?page=1&size=5").catch(() => null),
        this._hass.callApi("GET", "arr_stack/jellystat/stats/getViewsOverTime").catch(() => null)
      ]);
      if (libsRaw === null && usersRaw === null) {
        this._jellystatConfigured = false;
        return;
      }
      const libraries = Array.isArray(libsRaw) ? libsRaw : libsRaw?.data || libsRaw?.items || [];
      const users = Array.isArray(usersRaw) ? usersRaw : usersRaw?.data || usersRaw?.users || [];
      const recentHistory = (histRaw?.results || histRaw?.data || (Array.isArray(histRaw) ? histRaw : [])).slice(0, 5);
      const statsArr = playsRaw?.stats || [];
      const today = /* @__PURE__ */ new Date();
      const playsData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today - (6 - i) * 864e5);
        const dateStr = d.toISOString().slice(0, 10);
        const entry = statsArr.find((r) => {
          try {
            return new Date(r.Key).toISOString().slice(0, 10) === dateStr;
          } catch {
            return false;
          }
        });
        if (!entry) return { date: dateStr, value: 0 };
        const value = Object.values(entry).filter((v) => v && typeof v === "object" && "count" in v).reduce((s, v) => s + (v.count || 0), 0);
        return { date: dateStr, value };
      });
      users.sort((a, b) => (b.Plays ?? b.TotalPlays ?? 0) - (a.Plays ?? a.TotalPlays ?? 0));
      this._jellystat = { libraries, users, recentHistory, activity: {}, playsData };
    } catch (e) {
      console.warn("[arr-card] Jellystat fetch error:", e);
    }
  }
  // ─────────────────────────────────────────────
  // Auto Search — Radarr
  // ─────────────────────────────────────────────
  async _triggerRadarrAutoSearch(instance = "radarr") {
    const svc = instance === "radarr2" ? "radarr2" : "radarr";
    const d = this._popup;
    const movieId = instance === "radarr2" ? d._radarr2Id : d._radarrId;
    const _asDelay = (ms) => new Promise((r) => setTimeout(r, ms));
    this._dlTriggeredBy = "as";
    if (movieId) {
      this._asMovieSearching = true;
      this._renderPopupEl();
      try {
        await Promise.all([
          this._callApi("POST", `arr_stack/${svc}/command`, { name: "MoviesSearch", movieIds: [movieId] }),
          _asDelay(1e3)
        ]);
        this._asMovieSearched = true;
        this._asState = "done";
        this._asPollForDownload(`movie:${instance}`, svc, movieId);
      } catch (e) {
        this._asState = "error";
        this._asError = e.message || this._t("isLoadError");
      }
      this._asMovieSearching = false;
      this._renderPopupEl();
    } else {
      this._asState = "adding";
      this._renderPopupEl();
      try {
        const tmdbId = d.id || d.tmdbId;
        if (!tmdbId) throw new Error(this._t("isMissingTmdb"));
        const seerr = instance === "radarr2" ? this._seerrRadarr2 : this._seerrRadarr;
        if (instance === "radarr2") {
          if (!this._radarr2Profiles?.length) await this._fetchRadarr2Profiles();
          if (!this._radarr2RootFolders?.length) await this._fetchRadarr2RootFolders();
        } else {
          if (!this._radarrProfiles?.length) await this._fetchRadarrProfiles();
          if (!this._radarrRootFolders?.length) await this._fetchRadarrRootFolders();
        }
        const profiles = instance === "radarr2" ? this._radarr2Profiles : this._radarrProfiles;
        const rootFolders = instance === "radarr2" ? this._radarr2RootFolders : this._radarrRootFolders;
        const pId = seerr?.profileId ? parseInt(seerr.profileId) : profiles?.[0]?.id ?? 1;
        const rf = seerr?.rootFolder || rootFolders?.[0]?.path || "/movies";
        const body = { tmdbId: parseInt(tmdbId), title: d.title || d.name || "", qualityProfileId: pId, rootFolderPath: rf, monitored: true, addOptions: { searchForMovie: true } };
        const [added] = await Promise.all([
          this._callApi("POST", `arr_stack/${svc}/movie`, body),
          _asDelay(1e3)
        ]);
        if (added?.id) {
          if (instance === "radarr2") {
            if (!this._radarr2) this._radarr2 = [];
            if (!this._radarr2.find((m) => m.id === added.id)) this._radarr2.push(added);
            d._radarr2Id = added.id;
          } else {
            if (!this._radarr) this._radarr = [];
            if (!this._radarr.find((m) => m.id === added.id)) this._radarr.push(added);
            d._radarrId = added.id;
          }
        }
        this._asMovieSearched = true;
        this._asState = "done";
        const newMovieId = instance === "radarr2" ? d._radarr2Id : d._radarrId;
        if (newMovieId) this._asPollForDownload(`movie:${instance}`, svc, newMovieId);
      } catch (e) {
        this._asState = "error";
        this._asError = e.message || this._t("isLoadError");
      }
      this._renderPopupEl();
    }
  }
  // ─────────────────────────────────────────────
  // Auto Search — Sonarr (add series + seasons)
  // ─────────────────────────────────────────────
  async _addSeriesForAs(instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    this._dlTriggeredBy = "as";
    this._asState = "adding";
    this._renderPopupEl();
    try {
      const d = this._popup;
      const tvdbId = d.externalIds?.tvdbId || d._tvdbId;
      if (!tvdbId) throw new Error(this._t("snNoSonarrId"));
      const lookupResults = await this._callApi("GET", `arr_stack/${svc}/lookup?tvdbId=${tvdbId}`);
      const seriesData = Array.isArray(lookupResults) ? lookupResults[0] : lookupResults;
      if (!seriesData) throw new Error(this._t("snNoSonarrId"));
      if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const seerr = instance === "sonarr2" ? this._seerrSonarr2 : this._seerrSonarr;
      let profileId, rootFolder;
      if (seerr) {
        profileId = seerr.profileId ?? 1;
        rootFolder = seerr.rootFolder ?? "/tv";
      } else {
        if (instance === "sonarr2") {
          if (!this._sonarr2Profiles?.length) await this._fetchSonarr2Profiles();
          if (!this._sonarr2RootFolders?.length) await this._fetchSonarr2RootFolders();
          profileId = this._sonarr2Profiles?.[0]?.id ?? 1;
          rootFolder = this._sonarr2RootFolders?.[0]?.path ?? "/tv";
        } else {
          await this._fetchSonarrProfiles();
          await this._fetchSonarrRootFolders();
          profileId = this._sonarrProfiles?.[0]?.id ?? 1;
          rootFolder = this._sonarrRootFolders?.[0]?.path ?? "/tv";
        }
      }
      let added;
      try {
        added = await this._callApi("POST", `arr_stack/${svc}/series`, {
          ...seriesData,
          qualityProfileId: parseInt(profileId),
          rootFolderPath: rootFolder,
          monitored: false,
          addOptions: { searchForMissingEpisodes: false, searchForCutoffUnmetEpisodes: false, monitor: "none" }
        });
      } catch (_) {
      }
      if (instance === "sonarr2") {
        await this._fetchSonarr2();
        const found = (this._sonarr2 || []).find(
          (s) => String(s.tvdbId) === String(tvdbId) || added?.id && s.id === added.id
        ) || added;
        if (found) d._sonarr2Series = found;
      } else {
        await this._fetchSonarr();
        const found = (this._sonarrAll || []).find(
          (s) => String(s.tvdbId) === String(tvdbId) || added?.id && s.id === added.id
        ) || added;
        if (found) d._sonarrSeries = found;
      }
      this._asState = "seasons";
    } catch (e) {
      this._asState = "error";
      this._asError = e.message || this._t("isLoadError");
    }
    this._renderPopupEl();
  }
  async _triggerSonarrSeasonSearch(seasonNumber, instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    const d = this._popup;
    const series = instance === "sonarr2" ? d._sonarr2Series : d._sonarrSeries;
    if (!series?.id) return;
    const seriesId = series.id;
    const key = `season:${seasonNumber}`;
    this._dlTriggeredBy = "as";
    this._asSearchingItems.add(key);
    this._renderPopupEl();
    try {
      const cache = instance === "sonarr2" ? this._sonarr2 || [] : this._sonarr || [];
      const full = cache.find((s) => s.id === seriesId) || series;
      const updated = {
        ...full,
        monitored: true,
        seasons: (full.seasons || []).map(
          (s) => s.seasonNumber === seasonNumber ? { ...s, monitored: true } : s
        )
      };
      await this._callApi("PUT", `arr_stack/${svc}/series/${seriesId}`, updated);
      if (instance === "sonarr2") {
        this._sonarr2 = (this._sonarr2 || []).map((s) => s.id === seriesId ? updated : s);
        d._sonarr2Series = updated;
      } else {
        this._sonarr = (this._sonarr || []).map((s) => s.id === seriesId ? updated : s);
        d._sonarrSeries = updated;
      }
      await Promise.all([
        this._callApi("POST", `arr_stack/${svc}/command`, { name: "SeasonSearch", seriesId, seasonNumber }),
        new Promise((r) => setTimeout(r, 1e3))
      ]);
      this._asSearchedItems.add(key);
      this._asPollForDownload(key, svc, seriesId);
    } catch (e) {
      console.error("[arr-card] Season search error:", e);
    }
    this._asSearchingItems.delete(key);
    this._renderPopupEl();
  }
  async _triggerSonarrEpisodeSearch(episodeId, seasonNumber, instance = "sonarr") {
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    const d = this._popup;
    const series = instance === "sonarr2" ? d._sonarr2Series : d._sonarrSeries;
    const key = `ep:${episodeId}`;
    this._asSearchingItems.add(key);
    this._renderPopupEl();
    try {
      await Promise.all([
        this._callApi("POST", `arr_stack/${svc}/command`, { name: "EpisodeSearch", episodeIds: [episodeId] }),
        new Promise((r) => setTimeout(r, 1e3))
      ]);
      this._asSearchedItems.add(key);
      if (series?.id) this._asPollForDownload(key, svc, series.id);
    } catch (e) {
      console.error("[arr-card] Episode search error:", e);
    }
    this._asSearchingItems.delete(key);
    this._renderPopupEl();
  }
  // ─────────────────────────────────────────────
  // Auto Search — poll queue after search fired
  // key: 'movie' | 'season:N' | 'ep:ID'
  // movieOrSeriesId: Radarr movieId or Sonarr seriesId
  // ─────────────────────────────────────────────
  async _asPollForDownload(key, svc, movieOrSeriesId) {
    const isRadarr = svc === "radarr" || svc === "radarr2";
    const endpoint = `arr_stack/${svc}/queue`;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 3e3));
      if (!this._asOpen) return;
      try {
        const data = await this._callApi("GET", endpoint);
        const records = Array.isArray(data) ? data : data.records || [];
        const found = records.some((item) => {
          if (isRadarr) return item.movieId === movieOrSeriesId;
          return item.seriesId === movieOrSeriesId;
        });
        if (found) {
          this._asDownloadingItems.add(key);
          this._renderPopupEl();
          return;
        }
      } catch (_) {
      }
    }
  }
};
var fetchMixin = _FetchMethods.prototype;

// src/render/left.js
var _RenderLeft = class {
  _renderLeft() {
    const qbit = this._qbitConfigured ? this._renderQbit() : "";
    const sab = this._sabConfigured ? this._renderSab() : "";
    const sep = qbit && sab ? '<div class="spacer"></div>' : "";
    return `
    ${this._renderDiskRow()}
    <div class="spacer"></div>
    ${qbit}${sep}${sab}
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
    const fmtGB = (bytes) => {
      const gb = bytes / 1073741824;
      return gb >= 1024 ? (gb / 1024).toFixed(1) + " TB" : gb.toFixed(1) + " GB";
    };
    const qbitSpeedBytes = this._qbitConfigured ? this._qbitTransfer.dl_info_speed || 0 : 0;
    const sabKbps = this._sabConfigured ? parseFloat(this._sab.kbpersec) || 0 : 0;
    const sabSpeedBytes = sabKbps * 1024;
    const combinedSpeed = qbitSpeedBytes + sabSpeedBytes;
    const combinedStr = this.fmtSpeed(combinedSpeed);
    let speedSub = "";
    if (this._qbitConfigured && this._sabConfigured) {
      speedSub = `qBit ${this.fmtSpeed(qbitSpeedBytes)} \xB7 SAB ${this.fmtSpeed(sabSpeedBytes)}`;
    } else if (this._qbitConfigured) {
      speedSub = `qBittorrent`;
    } else if (this._sabConfigured) {
      speedSub = `SABnzbd`;
    }
    const sabFreeGB = this._sabConfigured ? parseFloat(this._sab.diskspace2) || 0 : 0;
    const sabTotalGB = this._sabConfigured ? parseFloat(this._sab.diskspacetotal2) || 0 : 0;
    const hasSabDisk = sabTotalGB > 0;
    const qbitFreeBytes = this._qbitDiskFreeBytes;
    const hasQbitDisk = typeof qbitFreeBytes === "number" && qbitFreeBytes > 0;
    const DISK_ROUND = 100 * 1024 * 1024;
    const allRoots = [...this._radarrRootFolders || [], ...this._sonarrRootFolders || []];
    const diskMap = /* @__PURE__ */ new Map();
    for (const r of allRoots) {
      const key = Math.round(r.freeSpace / DISK_ROUND);
      if (!diskMap.has(key)) diskMap.set(key, { freeSpace: r.freeSpace, paths: /* @__PURE__ */ new Set() });
      diskMap.get(key).paths.add(r.path);
    }
    const uniqueDisks = [...diskMap.values()].map((d) => ({ freeSpace: d.freeSpace, paths: [...d.paths] }));
    const diskTotal = uniqueDisks.length;
    const SAB_ROUND_EARLY = 1024 * 1024 * 1024;
    let diskPage;
    if (this._diskPage.left === null) {
      const sabKey = hasSabDisk ? Math.round(sabFreeGB * 1073741824 / SAB_ROUND_EARLY) : -1;
      const sabIdx = uniqueDisks.findIndex((d) => Math.round(d.freeSpace / SAB_ROUND_EARLY) === sabKey);
      diskPage = sabIdx >= 0 ? sabIdx : 0;
    } else {
      diskPage = Math.min(this._diskPage.left, Math.max(0, diskTotal - 1));
    }
    const activeDisk = uniqueDisks[diskPage];
    const diskLabel = activeDisk ? activeDisk.paths.map((p) => p.replace(/\/$/, "").split("/").filter(Boolean).pop() || p).join(" \xB7 ") : "";
    const multiDisk = diskTotal > 1;
    const _chev = (dir, disabled) => `
    <button class="dc-chev" data-diskkey="left" data-diskdir="${dir}" ${disabled ? "disabled" : ""}>
      <ha-icon icon="mdi:chevron-${dir === "prev" ? "left" : "right"}" style="--mdc-icon-size:16px"></ha-icon>
    </button>`;
    const SAB_ROUND = 1024 * 1024 * 1024;
    const sabFreeBytes = sabFreeGB * 1073741824;
    const sabTotalBytes = sabTotalGB * 1073741824;
    const sabDiskKey = hasSabDisk ? Math.round(sabFreeBytes / SAB_ROUND) : -1;
    const activeSabKey = activeDisk ? Math.round(activeDisk.freeSpace / SAB_ROUND) : -2;
    const activeIsSab = hasSabDisk && sabDiskKey === activeSabKey;
    const activeDiskKey = activeDisk ? Math.round(activeDisk.freeSpace / DISK_ROUND) : -2;
    const qbitDiskKey = hasQbitDisk ? Math.round(qbitFreeBytes / DISK_ROUND) : -3;
    const activeIsQbit = hasQbitDisk && !activeIsSab && qbitDiskKey === activeDiskKey;
    let diskChip = "";
    if (multiDisk && activeDisk) {
      let pageContent = "";
      if (activeIsSab) {
        const usedGB = sabTotalGB - sabFreeGB;
        const pct = usedGB / sabTotalGB * 100;
        pageContent = `
        <div class="dc-label">${this._t("storage")}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedGB * 1073741824)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(sabTotalBytes)}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${pct.toFixed(0)} % \xB7 ${fmtGB(sabFreeBytes)} ${this._t("free")}</div>`;
      } else if (activeIsQbit) {
        pageContent = `
        <div class="dc-label">${this._t("storage")}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(qbitFreeBytes)} ${this._t("free")}</span></div>
        ${diskLabel ? `<div class="dc-sub">${this._escHtml(diskLabel)}</div>` : ""}`;
      } else {
        pageContent = `
        <div class="dc-label">${this._t("storage")}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(activeDisk.freeSpace)} ${this._t("free")}</span></div>
        ${diskLabel ? `<div class="dc-sub">${this._escHtml(diskLabel)}</div>` : ""}`;
      }
      diskChip = `
      <div class="disk-chip dc-pageable">
        ${_chev("prev", diskPage === 0)}
        <div class="dc-page-content">${pageContent}</div>
        ${_chev("next", diskPage >= diskTotal - 1)}
      </div>`;
    } else if (hasSabDisk) {
      const usedGB = sabTotalGB - sabFreeGB;
      const pct = usedGB / sabTotalGB * 100;
      diskChip = `
      <div class="disk-chip">
        <div class="dc-label">${this._t("storage")}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedGB * 1073741824)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(sabTotalGB * 1073741824)}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${pct.toFixed(0)} % \xB7 ${fmtGB(sabFreeGB * 1073741824)} ${this._t("free")}</div>
      </div>`;
    } else if (hasQbitDisk) {
      diskChip = `
      <div class="disk-chip">
        <div class="dc-label">${this._t("storage")}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(qbitFreeBytes)} ${this._t("free")}</span></div>
      </div>`;
    }
    const speedStyle = diskChip ? "" : "flex:1";
    const speedChip = `
    <div class="disk-chip" style="${speedStyle}">
      <div class="dc-label">${this._t("totalSpeed")}</div>
      <div class="dc-val"><span class="g" style="font-size:15px;font-weight:800;padding:2px 10px"><ha-icon icon="mdi:download" style="--mdc-icon-size:14px"></ha-icon> ${combinedStr}</span></div>
      <div class="dc-sub">${speedSub}</div>
    </div>`;
    return `<div class="disk-row">${speedChip}${diskChip}</div>`;
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
      speedCol = this._pill("pill-teal", "mdi:upload", upSpeed);
    } else if (isStalledSeed) {
      speedCol = this._pill("pill-teal", "mdi:upload-off", this._t("seeding"), "opacity:0.65");
    } else if (isCompleted) {
      speedCol = this._pill("pill-green", "mdi:check-circle", this._t("complete"));
    } else if (isError) {
      speedCol = this._pill("pill-red", "mdi:alert-circle", errorStates[state]);
    } else if (isStalledDL) {
      speedCol = this._pill("pill-orange", "mdi:alert", this._t("stalled"));
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
        ${isSeeding ? `<span class="dm"><ha-icon icon="mdi:swap-vertical" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">R: ${ratio}</b></span>` : `<span class="dm"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${eta}</b></span>`}
        <span class="dm"><ha-icon icon="mdi:harddisk" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${completed} / ${total}</b></span>
        <span class="dm"><ha-icon icon="mdi:upload" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${seeds}</b></span>
        <span class="dm"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${leechs}</b></span>
      </div>
      <div class="pbar"><div class="pbar-fill ${pbarClass}" style="width:${pct}%"></div></div>
    </div>`;
  }
  _renderSab() {
    if (!this._sabConfigured) return "";
    const sabKbps = parseFloat(this._sab.kbpersec) || 0;
    const speedStr = this.fmtSpeed(sabKbps * 1024);
    const sabPaused = this._sab.status === "Paused";
    const allSlots = this._getPageData("sab");
    const items = this._pagedList(allSlots, "sab", (s) => this._renderSabItem(s), this._perPage("sab"));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:8px">
        <div style="position:relative;flex-shrink:0;display:inline-flex;width:26px;height:26px">
          ${this._appIcon("sab")}
          ${(() => {
      if (!this._sabVpnFetched) return "";
      const vpnOn = !!this._sabLocalIp;
      const icon = vpnOn ? "mdi:shield-check" : "mdi:shield-off";
      const cls = vpnOn ? "vpn-shield-ok" : "vpn-shield-fail";
      return `<ha-icon icon="${icon}" class="vpn-shield ${cls}" style="--mdc-icon-size:13px;position:absolute;bottom:-4px;right:-5px"></ha-icon>`;
    })()}
        </div>
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
  _sabTimeleftToSecs(t) {
    if (!t || t === "0:00:00") return 0;
    const parts = t.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }
  _renderSabItem(s) {
    const pct = parseFloat(s.percentage) || 0;
    const mbTotal = parseFloat(s.mb) || 0;
    const mbLeft = parseFloat(s.mbleft) || 0;
    const mbDone = mbTotal - mbLeft;
    const doneSizeStr = this.fmtSize(mbDone * 1024 * 1024);
    const totalSizeStr = this.fmtSize(mbTotal * 1024 * 1024);
    const eta = s.timeleft || "";
    const name = this._escHtml(s.filename || "Unknown");
    const status = s.status || "";
    const isDownloading = this._sabActiveIds?.has(s.nzo_id) ?? false;
    const SAB_STATUS_PILLS = {
      Queued: { cls: "pill-gray", icon: "mdi:clock-outline", label: "Queued" },
      Paused: { cls: "pill-orange", icon: "mdi:pause", label: "Paused" },
      Checking: { cls: "pill-teal", icon: "mdi:magnify", label: "Checking" },
      Extracting: { cls: "pill-teal", icon: "mdi:archive-outline", label: "Extracting" },
      Verifying: { cls: "pill-teal", icon: "mdi:shield-check", label: "Verifying" },
      Repairing: { cls: "pill-teal", icon: "mdi:wrench-outline", label: "Repairing" },
      Failed: { cls: "pill-red", icon: "mdi:alert-circle", label: "Failed" },
      Completed: { cls: "pill-green", icon: "mdi:check-circle", label: "Completed" }
    };
    let speedCol = "";
    if (isDownloading) {
      const secs = this._sabTimeleftToSecs(eta);
      let bps = 0;
      if (secs > 0 && mbLeft > 0) {
        bps = mbLeft * 1024 * 1024 / secs;
      } else {
        bps = (parseFloat(this._sab.kbpersec) || 0) * 1024;
      }
      speedCol = `<span class="dm"><b class="g"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px"></ha-icon> ${this.fmtSpeed(bps)}</b></span>`;
    } else {
      const globalPaused = this._sab?.status === "Paused";
      const pillStatus = status === "Downloading" || status === "Queued" ? globalPaused ? "Paused" : "Queued" : status;
      const pill = SAB_STATUS_PILLS[pillStatus] || { cls: "pill-gray", icon: "mdi:dots-horizontal", label: pillStatus || "\u2014" };
      speedCol = `<span class="status-pill ${pill.cls}"><ha-icon icon="${pill.icon}" style="--mdc-icon-size:11px"></ha-icon> ${pill.label}</span>`;
    }
    const nzoId = s.nzo_id || "";
    let actionBtns = "";
    if (s._history) {
      const isDeleting = this._sabDeleteBusy === nzoId;
      actionBtns = isDeleting ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>` : `<button class="tb tb-hist-del" data-nzoid="${nzoId}" title="${this._t("removeFromHist")}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:15px"></ha-icon></button>`;
    } else {
      const isBusy = this._sabQueueBusy === nzoId;
      if (isBusy) {
        actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
      } else if (this._sabQueueConfirm === nzoId) {
        actionBtns = `
        <button class="tb tb-cancel" data-sab-action="cancel" data-nzoid="${nzoId}" title="${this._t("cancelRemove")}"><ha-icon icon="mdi:close" style="--mdc-icon-size:15px"></ha-icon></button>
        <button class="tb tb-del"   data-sab-action="delete"  data-nzoid="${nzoId}" title="${this._t("deleteFiles")}"><ha-icon icon="mdi:delete" style="--mdc-icon-size:15px"></ha-icon></button>`;
      } else {
        actionBtns = `<button class="tb tb-remove" data-sab-action="confirm" data-nzoid="${nzoId}" title="${this._t("remove")}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:15px"></ha-icon></button>`;
      }
    }
    return `
    <div class="dl">
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        <span class="dl-pct">${pct}%</span>
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${isDownloading ? `<span class="dm"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${eta}</b></span>` : ""}
        <span class="dm"><ha-icon icon="mdi:harddisk" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${doneSizeStr} / ${totalSizeStr}</b></span>
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
    const poster = media.posterPath;
    const reqBy = this._escHtml(req.requestedBy?.displayName ?? req.requestedBy?.username ?? "?");
    const typeLabel = isMovie ? this._t("typeMovie") : this._t("typeTv");
    const icon = isMovie ? "\u{1F3AC}" : "\u{1F4FA}";
    const tmdbId = media.tmdbId ?? 0;
    const imgHtml = poster ? `<img src="${poster.startsWith("http") ? poster : `https://image.tmdb.org/t/p/w342${poster}`}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">` : `<div class="${this._grad(req.id)}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px">${icon}</div>`;
    return `
    <div class="mc" data-popup="${isMovie ? "movie" : "tv"}" data-tmdbid="${tmdbId}" data-title="${title}">
      ${imgHtml}
      <span class="media-type-tag">${typeLabel}</span>
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.93) 0%,transparent 80%);padding:36px 6px 5px;z-index:1">
        <div style="font-size:8px;color:rgba(255,255,255,0.55);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\u{1F464} ${reqBy}</div>
        <div class="pr-btn-row" style="margin-bottom:4px">
          <button class="pr-approve" data-reqid="${req.id}">\u2713<span class="st-txt"> ${this._t("approve")}</span></button>
          <button class="pr-decline" data-reqid="${req.id}">\u2715<span class="st-txt"> ${this._t("decline")}</span></button>
        </div>
        <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${title}">${title}</div>
      </div>
    </div>`;
  }
};
var renderLeftMixin = _RenderLeft.prototype;

// src/constants.js
var POPUP_TYPE = {
  RADARR: "radarr",
  SONARR: "sonarr",
  MOVIE: "movie",
  TV: "tv",
  STREAM: "stream"
};

// src/render/right.js
var _RenderRight = class {
  _renderRight() {
    const perPage = Math.max(2, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
    const regularPerPage = perPage - 1;
    const hasCalendar = this._calendar && this._calendar.length > 0;
    const hasPending = this._hass.user.is_admin && this._pendingRequests.length > 0;
    const DEFAULT_CATS = ["recentlyAdded", "recentlyRequested", "upcoming", "tvUpcoming", "trending", "popular", "calendar", "tautulli", "jellystat"];
    const catConfig = this._config?.categories || DEFAULT_CATS.map((id) => ({ id, enabled: true }));
    const states = this._hass?.states || {};
    const hasActiveStreams = Object.keys(states).some((id) => {
      if (!(id.startsWith("media_player.plex_") || id.startsWith("media_player.jellyfin_"))) return false;
      const st = states[id].state;
      return st === "playing" || st === "paused";
    });
    const CAT_FN = {
      radarr: () => this._renderRadarr(),
      sonarr: () => this._renderSonarr(),
      recentlyAdded: () => this._renderRecentlyAdded(),
      recentlyRequested: () => this._renderRecentlyRequested(),
      upcoming: () => this._renderUpcoming(),
      tvUpcoming: () => this._renderTvUpcoming(),
      trending: () => this._renderTrending(),
      popular: () => this._renderPopular(),
      calendar: hasCalendar ? () => this._renderCalendar() : null,
      streams: hasActiveStreams ? () => this._renderStreams() : null,
      tautulli: this._tautulliConfigured !== false ? () => this._renderTautulli() : null,
      jellystat: this._jellystatConfigured !== false ? () => this._renderJellystat() : null
    };
    const regularCategories = [
      ...hasPending ? [() => this._renderPendingRequests()] : [],
      ...catConfig.filter((c) => c.enabled !== false).map((c) => CAT_FN[c.id]).filter(Boolean)
    ];
    const totalPages = Math.max(1, Math.ceil(regularCategories.length / regularPerPage));
    const page = Math.max(0, Math.min(this._rightPage || 0, totalPages - 1));
    const regStart = page * regularPerPage;
    const regSlice = regularCategories.slice(regStart, regStart + regularPerPage);
    const pageSlice = [() => this._renderSearch(), ...regSlice];
    const _join = (fns) => fns.map((fn, i) => `${i === 1 ? '<div style="height:3px"></div>' : i > 1 ? '<div class="spacer-sm"></div>' : ""}${fn()}`).join("");
    const hasPrev = page > 0;
    const hasNext = page < totalPages - 1;
    const dots = totalPages > 1 ? totalPages > 7 ? `<span class="rp-page-counter">${page + 1} / ${totalPages}</span>` : Array.from(
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
    if (this._overlay?.section) return this._renderSectionOverlay(this._overlay.section) + this._renderSectionOverlayNav(this._overlay.section);
    if (this._searchActive) {
      const _sCols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
      const searchPerPage = _sCols * 2;
      const searchTotal = Math.ceil((this._searchResults || []).length / searchPerPage);
      const sp = this._searchPage || 0;
      const hasPrevS = sp > 0;
      const hasNextS = sp < searchTotal - 1;
      const searchNavBar = searchTotal > 1 ? `
      <div class="rp-nav">
        <button class="rp-btn ${hasPrevS ? "" : "rp-btn-hidden"}" data-section="right" data-dir="prev" ${hasPrevS ? "" : "disabled"}>
          <ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:16px"></ha-icon> ${this._t("prev")}
        </button>
        <div class="rp-dots">
          ${searchTotal <= 7 ? Array.from(
        { length: searchTotal },
        (_, i) => `<button class="rp-dot${i === sp ? " rp-dot-active" : ""}" data-section="right" data-page="${i}"></button>`
      ).join("") : `<span class="rp-page-counter">${sp + 1} / ${searchTotal}</span>`}
        </div>
        <button class="rp-btn ${hasNextS ? "" : "rp-btn-hidden"}" data-section="right" data-dir="next" ${hasNextS ? "" : "disabled"}>
          ${this._t("next")} <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:16px"></ha-icon>
        </button>
      </div>` : "";
      return `<div class="rp-sections">${this._renderSearch()}</div>${searchNavBar}`;
    }
    const filler = Array(Math.max(0, regularPerPage - regSlice.length)).fill('<div class="spacer-sm"></div>').join("");
    return `<div class="rp-sections">${_join(pageSlice)}${filler}</div>${navBar}`;
  }
  _renderSearch() {
    const hasQuery = !!this._searchQuery;
    const headingColor = this._cfgGet("styles", "headingTextColor", "#fff") || "#fff";
    const iconDefaultColor = this._cfgGet("styles", "searchBarIconColor", "") || "";
    const iconStyle = hasQuery ? `color:${headingColor};` : iconDefaultColor ? `color:${iconDefaultColor};` : "";
    const inputStyle = hasQuery ? `color:${headingColor};` : "";
    const inner = this._searchActive ? this._renderSearchResultsGrid() : "";
    const tvSearchOverlay = this._tvRequestPending?.source === "search" ? this._renderTvRequestOverlay() : "";
    return `
    <div class="sec-card sec-search" style="position:relative">
      <div class="search-bar-wrap">
        <ha-icon icon="mdi:magnify" class="search-bar-icon" style="--mdc-icon-size:22px;${iconStyle}"></ha-icon>
        <input
          class="search-bar-input"
          type="text"
          placeholder="${this._t("searchPlaceholder")}"
          value="${this._escHtml(this._searchQuery)}"
          data-action="search-input"
          autocomplete="off"
          style="${inputStyle}"
        >
        ${this._searchActive ? `<button class="search-bar-clear" data-action="search-clear" style="${iconStyle}">\u2715</button>` : ""}
      </div>
      ${inner}
      ${tvSearchOverlay}
    </div>`;
  }
  _renderSearchResultsGrid() {
    if (this._searchLoading) {
      return `<div class="placeholder">${this._t("loading")}</div>`;
    }
    if (!this._searchResults.length) {
      return `<div class="placeholder" style="font-size:12px;color:var(--secondary-text-color,#888)">No results</div>`;
    }
    const gradColor = "rgba(0,0,0,0.88)";
    const textColor = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
    const sPage = cols * 2;
    const sp = this._searchPage || 0;
    const cards = this._searchResults.slice(sp * sPage, (sp + 1) * sPage).map((m) => {
      const isMovie = m.mediaType === "movie";
      const title = this._escHtml(m.title || m.name || "");
      const tmdbId = m.id;
      const popupType = isMovie ? POPUP_TYPE.MOVIE : POPUP_TYPE.TV;
      const typeTag = isMovie ? this._t("typeMovie") : this._t("typeTv");
      const poster = m.posterPath ? m.posterPath.startsWith("http") ? m.posterPath : `https://image.tmdb.org/t/p/w342${m.posterPath}` : "";
      const radarrEntry = isMovie && Array.isArray(this._radarr) ? this._radarr.find((r) => r.tmdbId === tmdbId) : null;
      const sonarrEntry = !isMovie && Array.isArray(this._sonarr) ? this._sonarr.find((s) => tmdbId && s.tmdbId === tmdbId) || this._sonarr.find((s) => m.tvdbId && s.tvdbId === m.tvdbId) : null;
      const mediaStatus = m.mediaInfo?.status;
      const _inOptimistic = this._optimisticRequested.has(tmdbId);
      const _withdrawn = this._withdrawnIds.has(tmdbId);
      const _hasPending = this._familyPendingIds.has(tmdbId);
      const inLib = isMovie ? !!radarrEntry : !!sonarrEntry;
      const hasFile = isMovie ? !!radarrEntry?.hasFile : !!(sonarrEntry?.statistics?.episodeFileCount > 0);
      const _stale = mediaStatus >= 3 && !inLib && !_inOptimistic && !_hasPending;
      const _isAvail = (hasFile || mediaStatus === 5) && !_withdrawn && !_stale;
      const _isReq = (mediaStatus >= 2 || _inOptimistic || _hasPending || inLib) && !_withdrawn && !hasFile && !_stale;
      const _reqId = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(tmdbId);
      const searchReqKey = "search-" + tmdbId;
      const _isAdmin = this._hass.user.is_admin;
      const _noSeerr = this._overseerrConfigured === false;
      let actionBtn = "";
      if (_isAvail) {
        actionBtn = "";
      } else if (_isReq) {
        if (_isAdmin || _noSeerr || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
          actionBtn = "";
        } else {
          const withdrawBtn = _reqId ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${tmdbId}">\u2715</button>` : "";
          actionBtn = withdrawBtn;
        }
      } else if (isMovie) {
        actionBtn = `<button class="btn-add req-open" data-movieid="${tmdbId}" data-tmdb="${tmdbId}" data-reqkey="${searchReqKey}">${this._t("add")}</button>`;
      } else {
        actionBtn = `<button class="btn-add tv-req-open" data-showid="${tmdbId}" data-title="${title}" data-source="search">${this._t("add")}</button>`;
      }
      let statusBadge = "";
      if (_isAvail) {
        statusBadge = this._statusBadge(this._badge("b-st-avail", "\u2713", this._t("badgeAvailable")));
      } else if (_isReq) {
        if (_isAdmin || _noSeerr || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
          statusBadge = this._statusBadge(this._badge("b-st-proc", "\u2193", this._t("badgeAdded")));
        } else {
          statusBadge = this._statusBadge(this._badge("b-st-pend", "\u23F1", this._t("badgePending")));
        }
      }
      const posterHtml = poster ? `<img src="${poster}" alt="${title}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : `<div class="search-mc-ph ${this._grad(tmdbId)}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px">${isMovie ? "\u{1F3AC}" : "\u{1F4FA}"}</div>`;
      const reqOverlay = isMovie && this._requestPending?.reqKey === searchReqKey ? this._renderRequestOverlay(tmdbId, tmdbId) : "";
      const tvdbAttr = !isMovie && m.tvdbId ? ` data-tvdbid="${m.tvdbId}"` : "";
      return `
      <div class="mc" data-popup="${popupType}" data-tmdbid="${tmdbId}"${tvdbAttr} data-title="${title}"${radarrEntry ? ` data-radarrid="${radarrEntry.id}"` : ""} style="position:relative">
        ${posterHtml}
        <span class="media-type-tag">${typeTag}</span>
        ${statusBadge}
        ${this._mcGrad(gradColor, `${m.voteAverage ? `<div style="margin-bottom:3px"><span class="imdb">\u2B50 ${m.voteAverage.toFixed(1)}</span></div>` : ""}<div style="display:flex;align-items:center;gap:4px">
            <div style="font-size:10px;font-weight:600;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${title}</div>
            ${actionBtn ? `<div style="flex-shrink:0">${actionBtn}</div>` : ""}
          </div>`)}
        ${reqOverlay}
      </div>`;
    }).join("");
    return `<div class="mgrid" style="grid-template-columns:repeat(${cols},1fr);row-gap:10px">${cards}</div>`;
  }
  _pageIndicator(section, itemsOrCount, perPage = 4) {
    const count = Array.isArray(itemsOrCount) ? itemsOrCount.length : itemsOrCount || 0;
    const totalPages = Math.ceil(count / perPage);
    if (totalPages <= 1) return "";
    const page = Math.min(this._pages[section] || 0, totalPages - 1);
    return `<span class="sec-page-ind">${page + 1}<span class="sec-page-sep">/</span>${totalPages}</span>`;
  }
  _renderRightHeader() {
    return `
    <div class="col-hdr">
      <ha-icon icon="mdi:movie-outline" style="--mdc-icon-size:22px"></ha-icon>
      <span class="col-hdr-title">${this._t("overview")}</span>
      <div class="col-hdr-line"></div>
    </div>`;
  }
  _renderRootDiskChip(key, roots) {
    if (!roots || roots.length === 0) return "";
    const fmtGB = (bytes) => {
      const gb = bytes / 1073741824;
      return gb >= 1024 ? (gb / 1024).toFixed(1) + " TB" : gb.toFixed(1) + " GB";
    };
    const DISK_ROUND = 100 * 1024 * 1024;
    const diskMap = /* @__PURE__ */ new Map();
    for (const r of roots) {
      const key2 = Math.round(r.freeSpace / DISK_ROUND);
      if (!diskMap.has(key2)) diskMap.set(key2, { freeSpace: r.freeSpace, paths: [] });
      diskMap.get(key2).paths.push(r.path);
    }
    const uniqueDisks = [...diskMap.values()];
    const total = uniqueDisks.length;
    const page = Math.min(this._diskPage[key] || 0, total - 1);
    const disk = uniqueDisks[page];
    const pathsHtml = disk.paths.map((p) => `<div class="dc-root-path">${this._escHtml(p)}</div>`).join("");
    const pagingHtml = total > 1 ? `
    <div class="dc-disk-paging">
      <button class="dc-disk-btn" data-diskkey="${key}" data-diskdir="prev" ${page === 0 ? "disabled" : ""}>\u2039</button>
      <span class="dc-disk-dots">${page + 1} / ${total}</span>
      <button class="dc-disk-btn" data-diskkey="${key}" data-diskdir="next" ${page >= total - 1 ? "disabled" : ""}>\u203A</button>
    </div>` : "";
    return `
    <div class="disk-chip rf-disk-chip">
      <div class="rf-disk-inner">
        <div class="rf-disk-left">
          <div class="dc-label">${this._t("storage")}</div>
          <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(disk.freeSpace)} ${this._t("free")}</span></div>
          ${pagingHtml}
        </div>
        <div class="rf-disk-right">${pathsHtml}</div>
      </div>
    </div>`;
  }
  _renderRadarr() {
    const smpCount = this._smpPageCount(this._radarr, "radarr");
    const grid = this._radarr.length === 0 ? `<div class="placeholder">${this._t("noRadarr")}</div>` : this._pagedGridWithSmp(this._radarr, "radarr", (m) => this._renderRadarrCard(m));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:filmstrip" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("recentMovies")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("radarr", smpCount)}
        <span class="sec-badge" style="background:rgba(0,132,255,0.15);border:1px solid rgba(0,132,255,0.25)">${this._radarrTotal} ${this._t("movies")}</span>
      </div>
      ${grid}
    </div>`;
  }
  _renderRequestOverlay(movieId, tmdbId) {
    const isAdmin = this._hass?.user?.is_admin;
    const hasDual = this._radarr2Configured && (this._seerrRadarr2 || this._overseerrConfigured === false);
    const tab1Name = hasDual && this._seerrRadarr2?.is4k ? "HD" : "Radarr";
    const tab2Name = hasDual && this._seerrRadarr2?.is4k ? "4K" : "Radarr 2";
    const buildPanel = (panelId, profiles, defProfileId, tags, rootFolders, selectId, tagId, rfId, hidden = false) => {
      const profileOptions = profiles.length > 0 ? profiles.map(
        (p) => `<option value="${p.id}" ${Number(p.id) === defProfileId ? "selected" : ""}>${this._escHtml(p.name)}</option>`
      ).join("") : `<option value="${defProfileId}">${this._t("defaultProfile")}</option>`;
      const tagHtml = isAdmin && tags.length > 0 ? `
      <span class="req-label">Tag</span>
      <select class="req-select" id="${tagId}">
        <option value="">\u2014 no tag \u2014</option>
        ${tags.map((t) => `<option value="${t.id}">${this._escHtml(t.label)}</option>`).join("")}
      </select>` : "";
      const rfHtml = isAdmin && rootFolders.length > 1 ? `
      <span class="req-label">Root folder</span>
      <select class="req-select" id="${rfId}">
        ${rootFolders.map((f) => `<option value="${this._escHtml(f.path)}">${this._escHtml(f.path)}</option>`).join("")}
      </select>` : "";
      return `
      <div class="req-panel${hidden ? " req-panel--hidden" : ""}" data-panel="${panelId}">
        <span class="req-label">${this._t("downloadQuality")}</span>
        <select class="req-select" id="${selectId}">${profileOptions}</select>
        ${tagHtml}
        ${rfHtml}
      </div>`;
    };
    const panel1 = buildPanel(
      "r1",
      this._radarrProfiles,
      Number(this._seerrRadarr?.profileId ?? 0),
      this._radarrTags,
      this._radarrRootFolders,
      `req-select-${movieId}`,
      `req-tag-${movieId}`,
      `req-rootfolder-${movieId}`
    );
    const panel2 = hasDual ? buildPanel(
      "r2",
      this._radarr2Profiles,
      Number(this._seerrRadarr2?.profileId ?? 0),
      this._radarr2Tags,
      this._radarr2RootFolders,
      `req-select2-${movieId}`,
      `req-tag2-${movieId}`,
      `req-rootfolder2-${movieId}`,
      true
      // hidden initially
    ) : "";
    const tabBar = hasDual ? `
    <div class="req-tabs">
      <button class="req-tab req-tab--active" data-tab="r1">${tab1Name}</button>
      <button class="req-tab" data-tab="r2">${tab2Name}</button>
    </div>` : "";
    return `
    <div class="req-overlay">
      <div class="req-inner">
        ${tabBar}
        <div class="req-panels-wrap">
          ${panel1}
          ${panel2}
        </div>
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
    const smpCount = this._smpPageCount(this._sonarr, "sonarr");
    const grid = this._sonarr.length === 0 ? `<div class="placeholder">${this._t("noSonarr")}</div>` : this._pagedGridWithSmp(this._sonarr, "sonarr", (s) => this._renderSonarrCard(s));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:television-play" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("recentShows")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("sonarr", smpCount)}
        <span class="sec-badge" style="background:rgba(255,214,10,0.12);border:1px solid rgba(255,214,10,0.22)">${this._sonarrTotal} ${this._t("shows")}</span>
      </div>
      ${grid}
    </div>`;
  }
  _renderRecentlyAdded() {
    const items = this.recentlyAdded;
    const smpCount = this._smpPageCount(items, "recentlyAdded");
    const grid = items.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGridWithSmp(items, "recentlyAdded", (m) => this._renderRecentlyAddedCard(m));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:check-circle-outline" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("recentlyAdded")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("recentlyAdded", smpCount)}
      </div>
      ${grid}
    </div>`;
  }
  _renderRecentlyRequested() {
    const items = this.recentlyRequested;
    const smpCount = this._smpPageCount(items, "recentlyRequested");
    const grid = items.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGridWithSmp(items, "recentlyRequested", (m) => this._renderRecentlyRequestedCard(m));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:clock-time-four-outline" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("recentlyRequested")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("recentlyRequested", smpCount)}
      </div>
      ${grid}
    </div>`;
  }
  _renderUpcoming() {
    const items = this._upcoming || [];
    const smpCount = this._smpPageCount(items, "upcoming");
    let grid = "";
    if (this._upcomingError) {
      grid = `<div class="placeholder" style="color:rgba(255,80,80,0.9);font-size:11px">\u26A0 ${this._escHtml(this._upcomingError)}</div>`;
    } else if (items.length === 0) {
      grid = `<div class="placeholder">${this._t("loading")}</div>`;
    } else {
      grid = this._pagedGridWithSmp(items, "upcoming", (m) => this._renderUpcomingCard(m, { reqKey: "upcoming-" + m.id }));
    }
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:ticket-outline" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("upcomingMovies")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("upcoming", smpCount)}
      </div>
      ${grid}
    </div>`;
  }
  _renderTvUpcoming() {
    const items = this._tvUpcoming || [];
    const smpCount = this._smpPageCount(items, "tvUpcoming");
    const p = this._tvRequestPending?.source === "tvUpcoming" ? this._tvRequestPending : null;
    const grid = items.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGridWithSmp(items, "tvUpcoming", (m) => this._renderTvUpcomingCard(m));
    return `
    <div class="sec-card" style="position:relative">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:television-play" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("newShows")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("tvUpcoming", smpCount)}
      </div>
      ${grid}
      ${p ? this._renderTvRequestOverlay() : ""}
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
    const poster = p.show.posterPath ? `<img src="${p.show.posterPath.startsWith("http") ? p.show.posterPath : `https://image.tmdb.org/t/p/w92${p.show.posterPath}`}" class="tv-req-poster">` : `<span class="tv-req-poster tv-req-poster-ph">\u{1F4FA}</span>`;
    return `
    <div class="req-overlay tv-req-overlay">
      <div class="tv-req-inner">
        <div class="tv-req-top">
          ${poster}
          <div class="tv-req-info">
            <div class="tv-req-title">${this._escHtml(p.show.name || p.show.originalName || "")}</div>
            <select class="req-select" id="tv-req-profile">${profileOptions}</select>
            ${this._hass?.user?.is_admin && this._sonarrTags.length > 0 ? `
            <select class="req-select" id="tv-req-tag">
              <option value="">\u2014 no tag \u2014</option>
              ${this._sonarrTags.map((t) => `<option value="${t.id}">${this._escHtml(t.label)}</option>`).join("")}
            </select>` : ""}
            ${this._hass?.user?.is_admin && this._sonarrRootFolders.length > 1 ? `
            <select class="req-select" id="tv-req-rootfolder">
              ${this._sonarrRootFolders.map((f) => `<option value="${this._escHtml(f.path)}">${this._escHtml(f.path)}</option>`).join("")}
            </select>` : ""}
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
  _renderTrending() {
    const items = this._trending || [];
    const smpCount = this._smpPageCount(items, "trending");
    const p = this._tvRequestPending?.source === "trending" ? this._tvRequestPending : null;
    const grid = items.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGridWithSmp(items, "trending", (m) => this._renderTrendingCard(m));
    return `
    <div class="sec-card" style="position:relative">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:trending-up" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("trendingMovies")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("trending", smpCount)}
      </div>
      ${grid}
      ${p ? this._renderTvRequestOverlay() : ""}
    </div>`;
  }
  // Returns item count for _pageIndicator, accounting for SMP card insertion
  _smpPageCount(items, section) {
    if (!items || items.length === 0) return 0;
    const showMorePage = Math.max(1, parseInt(this._cfgGet("discover", "showMoreOnPage", 3)) || 3);
    const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
    const itemsBefore = showMorePage * cols - 1;
    return items.length > itemsBefore ? itemsBefore + 1 : items.length;
  }
  _renderSeeMoreCardFor(section) {
    const cfg = this._getSectionOverlayConfig(section);
    const items = (cfg ? this[cfg.dataKey] : []) || [];
    const showMorePage = Math.max(1, parseInt(this._cfgGet("discover", "showMoreOnPage", 3)) || 3);
    const itemsBefore = showMorePage * 4 - 1;
    const teasers = items.slice(-4);
    const cells = [];
    for (let i = 0; i < 4; i++) {
      const m = teasers[i];
      if (m && cfg) {
        const url = cfg.getPosterUrl(m);
        if (url) {
          cells.push(`<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">`);
        } else {
          cells.push(`<div class="${this._grad(m.id)}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px">${cfg.emoji(m)}</div>`);
        }
      } else {
        cells.push(`<div style="width:100%;height:100%;background:rgba(255,255,255,0.06)"></div>`);
      }
    }
    const remainCount = Math.max(0, items.length - itemsBefore);
    return `
    <div class="mc smp-card" data-action="overlay-open" data-sec="${section}">
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
  _renderSectionOverlay(section) {
    const cfg = this._getSectionOverlayConfig(section);
    if (!cfg) return "";
    const items = this[cfg.dataKey] || [];
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
    const perPage = isMobile ? cols : cols * 2;
    const page = this._overlay.page || 0;
    const pageItems = items.slice(page * perPage, (page + 1) * perPage);
    const gridHtml = pageItems.map((m, i) => cfg.renderCard(m, i)).join("");
    return `
    <div class="trending-overlay">
      <div class="col-hdr" style="margin-bottom:8px">
        <ha-icon icon="${cfg.icon}" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t(cfg.titleKey)}</span>
        <div class="col-hdr-line"></div>
        <button class="to-close" data-action="overlay-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M11 6l-6 6 6 6"/>
          </svg>
        </button>
      </div>
      <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">\u2039</button>
        <div class="to-grid" style="grid-template-columns:repeat(${cols},1fr)">${gridHtml}</div>
        <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">\u203A</button>
      </div>
    </div>`;
  }
  // Paging nav pro sekce overlay — stejná struktura jako standardní rp-nav
  _renderSectionOverlayNav(section) {
    const cfg = this._getSectionOverlayConfig(section);
    if (!cfg) return "";
    const items = this[cfg.dataKey] || [];
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
    const perPage = isMobile ? cols : cols * 2;
    const page = this._overlay.page || 0;
    const totalPages = Math.ceil(items.length / perPage);
    const hasPrev = page > 0;
    const apiPage = this._overlayApiPage[section] || 0;
    const apiTotal = this._overlayApiTotalPages[section] || 1;
    const hasNext = page < totalPages - 1 || cfg.apiEndpoint && apiPage < apiTotal;
    if (!hasPrev && !hasNext) return "";
    const dots = totalPages > 1 ? totalPages > 7 ? `<span class="rp-page-counter">${page + 1} / ${totalPages}</span>` : Array.from(
      { length: totalPages },
      (_, i) => `<button class="rp-dot${i === page ? " rp-dot-active" : ""}" data-topage="${i}"></button>`
    ).join("") : "";
    return `
    <div class="rp-nav">
      <button class="rp-btn ${hasPrev ? "" : "rp-btn-hidden"}" data-action="overlay-prev" ${hasPrev ? "" : "disabled"}>
        <ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:16px"></ha-icon> ${this._t("prev")}
      </button>
      <div class="rp-dots">${dots}</div>
      <button class="rp-btn ${hasNext ? "" : "rp-btn-hidden"}" data-action="overlay-next" ${hasNext ? "" : "disabled"}>
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
    const poster = p.show.posterPath ? `<img src="${p.show.posterPath.startsWith("http") ? p.show.posterPath : `https://image.tmdb.org/t/p/w92${p.show.posterPath}`}" class="tv-req-poster">` : `<span class="tv-req-poster tv-req-poster-ph">\u{1F4FA}</span>`;
    return `
    <div class="tv-req-inner">
      <div class="tv-req-top">
        ${poster}
        <div class="tv-req-info">
          <div class="tv-req-title">${this._escHtml(p.show.name || p.show.originalName || "")}</div>
          <select class="req-select" id="tv-req-profile-abs">${profileOptions}</select>
          ${this._hass?.user?.is_admin && this._sonarrTags.length > 0 ? `
          <select class="req-select" id="tv-req-tag-abs">
            <option value="">\u2014 no tag \u2014</option>
            ${this._sonarrTags.map((t) => `<option value="${t.id}">${this._escHtml(t.label)}</option>`).join("")}
          </select>` : ""}
          ${this._hass?.user?.is_admin && this._sonarrRootFolders.length > 1 ? `
          <select class="req-select" id="tv-req-rootfolder-abs">
            ${this._sonarrRootFolders.map((f) => `<option value="${this._escHtml(f.path)}">${this._escHtml(f.path)}</option>`).join("")}
          </select>` : ""}
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
    const items = this._popular || [];
    const smpCount = this._smpPageCount(items, "popular");
    const grid = items.length === 0 ? `<div class="placeholder">${this._t("loading")}</div>` : this._pagedGridWithSmp(items, "popular", (m) => this._renderUpcomingCard(m, { showDate: false, reqKey: "popular-" + m.id }));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:fire" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("popularMovies")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("popular", smpCount)}
      </div>
      ${grid}
    </div>`;
  }
  _renderCalendar() {
    let grid = "";
    if (!this._calendar || this._calendar.length === 0) {
      grid = `<div class="placeholder">${this._t("noEpisodes")}</div>`;
    } else {
      const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
      grid = this._pagedGrid(this._calendar, "calendar", (ep) => this._renderCalendarCard(ep), cols);
    }
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:calendar-clock" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("newEpisodes")}</span>
        <div class="col-hdr-line"></div>
        ${this._pageIndicator("calendar", this._calendar || [])}
      </div>
      ${grid}
    </div>`;
  }
  // ─────────────────────────────────────────────
  // Active Streams (Plex / Jellyfin via hass.states)
  // ─────────────────────────────────────────────
  _renderStreams() {
    const states = this._hass?.states || {};
    const streams = Object.entries(states).filter(([id, s]) => {
      if (!(id.startsWith("media_player.plex_") || id.startsWith("media_player.jellyfin_"))) return false;
      if (s.state !== "playing" && s.state !== "paused") {
        this._streamsEnded.delete(id);
        return false;
      }
      if (this._streamsEnded.has(id)) return false;
      const attr = s.attributes || {};
      const dur = attr.media_duration || 0;
      const pos = attr.media_position || 0;
      if (dur > 0 && pos >= dur - 2) return false;
      return true;
    }).map(([id, s]) => ({ id, state: s.state, attr: s.attributes || {} }));
    this._streams = streams;
    this._startStreamsTimer(streams);
    this._syncStreamPopup();
    if (streams.length === 0) return "";
    const grid = this._pagedGridWithSmp(streams, "streams", (s) => this._renderStreamCard(s));
    return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:play-network" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t("streamsTitle")}</span>
        <div class="col-hdr-line"></div>
        <span class="sec-badge" style="background:rgba(229,160,13,0.12);border:1px solid rgba(229,160,13,0.25)">${streams.length} ${this._t("streamsActive")}</span>
      </div>
      ${grid}
    </div>`;
  }
  _startStreamsTimer(streams) {
    if (this._streamsTimer) {
      clearInterval(this._streamsTimer);
      this._streamsTimer = null;
    }
    const playing = streams.filter((s) => s.state === "playing" && s.attr.media_duration > 0);
    if (!playing.length) return;
    this._streamsTimer = setInterval(() => {
      let anyNewlyEnded = false;
      this.shadowRoot?.querySelectorAll(".stream-prog-fill").forEach((el) => {
        const pos = parseFloat(el.dataset.pos);
        const dur = parseFloat(el.dataset.dur);
        const updatedAt = parseFloat(el.dataset.updated);
        const entity = el.dataset.entity;
        if (!dur) return;
        if (!el.dataset.state) return;
        const isPlaying = el.dataset.state === "playing";
        const elapsed = isPlaying ? (Date.now() - updatedAt) / 1e3 : 0;
        const current = Math.min(pos + elapsed, dur);
        el.style.width = (current / dur * 100).toFixed(2) + "%";
        if (isPlaying && entity && current >= dur && !this._streamsEnded.has(entity)) {
          this._streamsEnded.add(entity);
          anyNewlyEnded = true;
        }
      });
      if (anyNewlyEnded) this._reRenderSection("streams");
      let anyRestarted = false;
      for (const endedId of this._streamsEnded) {
        const s = this._hass?.states?.[endedId];
        if (!s) continue;
        if (s.state !== "playing" && s.state !== "paused") continue;
        const hassPos = s.attributes?.media_position || 0;
        const hassDur = s.attributes?.media_duration || 0;
        if (hassDur > 0 && hassPos < hassDur - 5) {
          this._streamsEnded.delete(endedId);
          anyRestarted = true;
        }
      }
      if (anyRestarted) this._reRenderSection("streams");
    }, 1e3);
  }
  _renderStreamCard({ id, state, attr }) {
    const isPlex = id.startsWith("media_player.plex_");
    const isPlaying = state === "playing";
    const contentType = attr.media_content_type || "";
    const isMusic = contentType === "music" || contentType === "artist" || contentType === "album";
    const isLiveTV = contentType === "channel" || !!attr.media_channel && !isMusic || attr.media_library_title === "Live TV";
    const isTV = isLiveTV || contentType === "tvshow" || contentType === "episode" || !!attr.media_series_title;
    const channel = attr.media_channel || "";
    const title = isLiveTV ? channel || attr.media_title || "" : isTV ? attr.media_series_title || attr.media_title || "" : attr.media_artist || attr.media_title || "";
    const epLabel = !isLiveTV && isTV && attr.media_season && attr.media_episode ? `S${String(attr.media_season).padStart(2, "0")}E${String(attr.media_episode).padStart(2, "0")}` : "";
    const subtitle = isMusic ? attr.media_album_name || "" : isLiveTV ? attr.media_title || "" : isTV ? attr.media_title || "" : "";
    const nl = (attr.friendly_name || id).toLowerCase();
    let deviceIcon = "mdi:television";
    let deviceName = "TV";
    if (/iphone|android.*mobile|for\s+ios|for\s+android\s*\(mobile\)/i.test(nl)) {
      deviceIcon = "mdi:cellphone";
      deviceName = "Phone";
    } else if (/ipad|for\s+android\s*\(tablet\)|tablet/i.test(nl)) {
      deviceIcon = "mdi:tablet";
      deviceName = "Tablet";
    } else if (/macbook|for\s+mac\b|mac\s+desktop/i.test(nl)) {
      deviceIcon = "mdi:laptop";
      deviceName = "Mac";
    } else if (/laptop/i.test(nl)) {
      deviceIcon = "mdi:laptop";
      deviceName = "Notebook";
    } else if (/windows|for\s+windows|desktop|pc\b/i.test(nl)) {
      deviceIcon = "mdi:monitor";
      deviceName = "PC";
    } else if (/web|chrome|browser|safari|firefox|for\s+web/i.test(nl)) {
      deviceIcon = "mdi:web";
      deviceName = "Browser";
    } else if (/apple\s*tv|android\s*tv|fire\s*tv|roku|samsung.*tv|lg.*tv|shield|htpc|for\s+tv/i.test(nl)) {
      deviceIcon = "mdi:television";
      deviceName = "TV";
    } else if (/android/i.test(nl)) {
      deviceIcon = "mdi:cellphone";
      deviceName = "Phone";
    }
    const poster = attr.entity_picture || null;
    let img;
    if (!poster && isLiveTV) {
      const ch = channel || (attr.media_title || "").slice(0, 6).toUpperCase();
      img = `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1b2a 0%,#1b2838 60%,#0a1628 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px">
      <ha-icon icon="mdi:broadcast" style="--mdc-icon-size:30px;color:rgba(220,60,60,0.85)"></ha-icon>
      ${ch ? `<span style="font-size:8px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.45);max-width:70px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(ch)}</span>` : ""}
      <span style="font-size:7px;font-weight:800;letter-spacing:3px;color:rgba(220,60,60,0.7)">LIVE</span>
    </div>`;
    } else {
      img = this._mcImg(poster, isMusic ? "\u{1F3B5}" : isTV ? "\u{1F4FA}" : "\u{1F3AC}", id);
    }
    const duration = attr.media_duration || 0;
    const position = attr.media_position || 0;
    const updatedAt = attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now();
    const elapsed = isPlaying ? (Date.now() - updatedAt) / 1e3 : 0;
    const currentPos = Math.min(position + elapsed, duration);
    const initPct = duration > 0 ? (currentPos / duration * 100).toFixed(2) : 0;
    const progBar = duration > 0 ? `<div class="stream-prog-track"><div class="stream-prog-fill" data-entity="${this._escHtml(id)}" data-pos="${position}" data-dur="${duration}" data-updated="${updatedAt}" data-state="${state}" style="width:${initPct}%;transition:none"></div></div>` : "";
    const svcBadge = this._statusBadge(
      isPlex ? `<span class="stream-badge stream-badge-plex">PLEX</span>` : `<span class="stream-badge stream-badge-jf">JF</span>`
    );
    const pausedOverlay = !isPlaying ? `<div class="stream-paused-overlay"><ha-icon icon="mdi:pause-circle" style="--mdc-icon-size:32px;opacity:0.85"></ha-icon></div>` : "";
    const deviceTag = `<span class="stream-device-tag"><ha-icon icon="${deviceIcon}" style="--mdc-icon-size:9px"></ha-icon> ${this._escHtml(deviceName)}</span>`;
    let userName = "";
    let userThumb = "";
    if (isPlex) {
      const match = (this._plexSessions || []).find((s) => {
        const sTitle = s.attr.media_title || "";
        const hTitle = attr.media_title || "";
        const titleMatch = hTitle === sTitle || hTitle.startsWith(sTitle + " (") || sTitle.startsWith(hTitle + " (");
        const seriesMatch = (s.attr.media_series_title || "") === (attr.media_series_title || "");
        return titleMatch && seriesMatch;
      });
      if (match?._plexUser) {
        userName = match._plexUser;
        userThumb = match._plexUserThumb || "";
      }
    } else {
      const fn = attr.friendly_name || "";
      const jf = fn.replace(/^jellyfin\s*/i, "").trim();
      const parts = jf.split(/\s+/);
      userName = parts.length > 1 ? parts.slice(0, -1).join(" ") : jf;
    }
    const initials = userName ? userName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";
    const hue = userName ? [...userName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
    const avatarEl = userThumb ? `<img src="${this._escHtml(userThumb)}" style="width:12px;height:12px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.2)" loading="lazy" onerror="this.style.display='none'">` : "";
    const userBadge = userName ? `<div class="stream-user-tag">
        ${avatarEl}
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${this._escHtml(userName)}</span>
      </div>` : "";
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb,255,255,255),1)";
    const sub = subtitle ? `<div style="font-size:10px;color:rgba(var(--arr-pt-rgb,255,255,255),0.6);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(subtitle)}</div>` : "";
    return `
    <div class="mc${!isPlaying ? " stream-paused" : ""}" data-stream-entity="${this._escHtml(id)}" data-stream-type="${this._escHtml(contentType)}" data-stream-title="${this._escHtml(attr.media_title || title)}" data-stream-series="${this._escHtml(attr.media_series_title || "")}" style="cursor:pointer">
      ${img}
      ${deviceTag}
      ${svcBadge}
      ${pausedOverlay}
      ${userBadge}
      ${this._mcGrad(grad, `
        ${epLabel ? `<div style="margin-bottom:3px"><span class="imdb">${epLabel}</span></div>` : ""}
        ${isLiveTV && channel ? `<div style="margin-bottom:3px"><span class="imdb">${this._escHtml(channel)}</span></div>` : ""}
        <div style="font-size:10px;font-weight:700;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(title)}</div>
        ${sub}
      `)}
      ${progBar}
    </div>`;
  }
  // ─────────────────────────────────────────────
  // qBittorrent action API
  // ─────────────────────────────────────────────
};
var renderRightMixin = _RenderRight.prototype;

// src/render/media-cards.js
var _MediaCardMethods = class {
  _statusBadge(html) {
    return `<div style="position:absolute;top:6px;right:6px;z-index:2;display:flex;align-items:flex-start">${html}</div>`;
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
  _getRadarrPoster(m) {
    if (!m.images) return null;
    const img = m.images.find((i) => i.coverType === "poster");
    return img ? img.remoteUrl : null;
  }
  _getSonarrPoster(s) {
    if (!s.images) return null;
    const img = s.images.find((i) => i.coverType === "poster");
    return img ? img.remoteUrl : null;
  }
  _qualityBadge2(m) {
    if (!this._radarr2Configured) return "";
    const m2 = m.tmdbId ? this._radarr2ByTmdb.get(String(m.tmdbId)) : null;
    if (!m2) return "";
    const inR2 = m2.hasFile;
    const inR1 = m.hasFile;
    const style = "font-size:8px;padding:1px 4px;border-radius:3px;color:#fff;font-weight:700;letter-spacing:.3px";
    if (inR1 && inR2) return `<span class="badge b-r2" style="background:linear-gradient(90deg,rgba(0,120,255,0.85),rgba(140,40,220,0.85));${style}">R+R2</span>`;
    if (inR2) return `<span class="badge b-r2" style="background:rgba(140,40,220,0.85);${style}">R2</span>`;
    return "";
  }
  _renderRadarrCard(m) {
    const poster = this._getRadarrPoster(m);
    const title = this._escHtml(m.title || "Unknown");
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const ratingVal = m.ratings?.imdb?.value || m.ratings?.tmdb?.value || 0;
    const rating = ratingVal ? ratingVal.toFixed(1) : "";
    const hasFile = m.hasFile;
    const cutoffNotMet = m.movieFile?.qualityCutoffNotMet;
    const dlFailed = this._radarrQueueFailed.has(m.id);
    const dlActive = this._radarrQueueActive.has(m.id);
    let badgeHtml = "";
    if (hasFile && cutoffNotMet) {
      badgeHtml = this._badge("b-cutoff", "\u26A1", "Upgrade");
    } else if (hasFile) {
      badgeHtml = this._badge("b-st-avail", "\u2713", this._t("badgeAvailable"));
    } else if (dlFailed) {
      badgeHtml = this._badge("b-missing", "\u2717", this._t("badgeFailed"));
    } else if (dlActive) {
      badgeHtml = this._badge("b-dl", "\u2193", this._t("badgeDownloading"));
    } else {
      badgeHtml = this._badge("b-missing", "\u2717", this._t("badgeMissing"));
    }
    const statusBadge = badgeHtml ? this._statusBadge(badgeHtml) : "";
    const qualBadge4k = this._qualityBadge2(m);
    let audioBadge = "";
    let subBadge = "";
    if (hasFile) {
      let audioLangs = [];
      if (Array.isArray(m.movieFile?.languages) && m.movieFile.languages.length > 0) {
        audioLangs = m.movieFile.languages.map((l) => this._langCode(l.name || "")).filter(Boolean);
      } else if (m.movieFile?.mediaInfo?.audioLanguages) {
        audioLangs = m.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map((l) => this._langCode(l.trim())).filter(Boolean);
      }
      if (audioLangs.length > 0) {
        const codes = this._topLangs(audioLangs).join(" | ");
        audioBadge = this._badgeIcon("b-audio", "mdi:volume-high", codes);
      }
      const bz = this._bazarrConfigured ? this._bazarr[m.id] : null;
      if (bz) {
        if (bz.missing.length > 0) {
          const langs = this._topLangs(bz.missing.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
          subBadge = this._badgeIcon("b-sub-miss", "mdi:subtitles-outline", langs);
        } else if (bz.subtitles.length > 0) {
          const langs = this._topLangs(bz.subtitles.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
          subBadge = this._badgeIcon("b-sub-ok", "mdi:subtitles", langs);
        }
      }
    }
    const img = this._mcImg(poster, "\u{1F3AC}", m.id);
    return `
    <div class="mc" data-popup="${POPUP_TYPE.RADARR}" data-tmdbid="${m.tmdbId}" data-title="${title}">
      ${img}
      ${statusBadge}
      ${this._mcGrad(grad, `${rating ? `<div style="margin-bottom:3px"><span class="imdb">\u2B50 ${rating}</span></div>` : ""}
        ${audioBadge || subBadge || qualBadge4k ? `<div style="display:flex;justify-content:flex-start;gap:3px;flex-wrap:wrap;margin-bottom:3px">${audioBadge}${subBadge}${qualBadge4k}</div>` : ""}
        <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>`)}
    </div>`;
  }
  _renderSonarrCard(s) {
    const poster = this._getSonarrPoster(s);
    const title = this._escHtml(s.title || "Unknown");
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const ratingVal = s.ratings?.imdb?.value || s.ratings?.tmdb?.value || s.ratings?.value || 0;
    const rating = ratingVal ? ratingVal.toFixed(1) : "";
    const stats = s.statistics || {};
    const fileCount = stats.episodeFileCount || 0;
    const totalCount = stats.totalEpisodeCount || 0;
    let badgeHtml = "";
    if (fileCount === 0 && totalCount > 0) {
      badgeHtml = this._badge("b-missing", "\u2717", this._t("badgeMissing"));
    } else if (fileCount < totalCount) {
      badgeHtml = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
    } else if (totalCount > 0) {
      badgeHtml = this._badge("b-st-avail", "\u2713", this._t("badgeAvailable"));
    }
    const statusBadge = badgeHtml ? this._statusBadge(badgeHtml) : "";
    const img = this._mcImg(poster, "\u{1F4FA}", s.id);
    return `
    <div class="mc" data-popup="${POPUP_TYPE.SONARR}" data-tvdbid="${s.tvdbId}" data-tmdbid="${s.tmdbId || ""}" data-title="${title}">
      ${img}
      ${statusBadge}
      ${this._mcGrad(grad, `${rating ? `<div style="margin-bottom:3px"><span class="imdb">\u2B50 ${rating}</span></div>` : ""}
        <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>`)}
    </div>`;
  }
  _renderRecentlyAddedCard(item) {
    const isMovie = item._mediaType === "movie";
    const poster = isMovie ? this._getRadarrPoster(item) : this._getSonarrPoster(item);
    const title = this._escHtml(item.title || "Unknown");
    const typeTag = isMovie ? this._t("typeMovie") : this._t("typeTv");
    const popup = isMovie ? POPUP_TYPE.RADARR : POPUP_TYPE.SONARR;
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const img = this._mcImg(poster, isMovie ? "\u{1F3AC}" : "\u{1F4FA}", item.id);
    const tvdbAttr = !isMovie && item.tvdbId ? ` data-tvdbid="${item.tvdbId}"` : "";
    const tmdbAttr = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : "";
    const radarrAttr = isMovie ? item._isRadarr2 ? ` data-radarr2id="${item.id}"` : ` data-radarrid="${item.id}"` : "";
    let badgeHtml = "";
    if (isMovie) {
      badgeHtml = item.movieFile?.qualityCutoffNotMet ? this._badge("b-cutoff", "\u26A1", "Upgrade") : this._badge("b-st-avail", "\u2713", this._t("badgeAvailable"));
    } else {
      const importEps = item._isSonarr2 ? this._sonarr2ImportEps || {} : this._sonarrImportEps || {};
      const imp = importEps[item.id];
      if (imp) {
        const epLabel = imp.e > 0 ? `S${String(imp.s).padStart(2, "0")}E${String(imp.e).padStart(2, "0")}` : `S${String(imp.s).padStart(2, "0")}`;
        badgeHtml = this._badge("b-st-avail", "\u2713", epLabel);
      } else {
        const epFile = this._sonarrEpFiles?.[item.id];
        if (epFile) {
          const match = (epFile.relativePath || "").match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
          badgeHtml = match ? this._badge("b-st-avail", "\u2713", `S${String(match[1]).padStart(2, "0")}E${String(match[2]).padStart(2, "0")}`) : this._badge("b-st-avail", "\u2713", this._t("badgeAvailable"));
        } else {
          const fileCount = item.statistics?.episodeFileCount ?? 0;
          const totalCount = item.statistics?.totalEpisodeCount ?? item.statistics?.episodeCount ?? 0;
          badgeHtml = fileCount < totalCount ? `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>` : this._badge("b-st-avail", "\u2713", this._t("badgeAvailable"));
        }
      }
    }
    const statusBadge = this._statusBadge(badgeHtml);
    const ratingVal = item.ratings?.imdb?.value || item.ratings?.tmdb?.value || item.ratings?.value || 0;
    const rating = ratingVal ? ratingVal.toFixed(1) : "";
    let audioBadge = "";
    let subBadge = "";
    if (isMovie) {
      let audioLangs = [];
      if (Array.isArray(item.movieFile?.languages) && item.movieFile.languages.length > 0) {
        audioLangs = item.movieFile.languages.map((l) => this._langCode(l.name || "")).filter(Boolean);
      } else if (item.movieFile?.mediaInfo?.audioLanguages) {
        audioLangs = item.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map((l) => this._langCode(l.trim())).filter(Boolean);
      }
      if (audioLangs.length > 0) {
        const codes = this._topLangs(audioLangs).join(" | ");
        audioBadge = this._badgeIcon("b-audio", "mdi:volume-high", codes);
      }
      const bz = this._bazarrConfigured ? this._bazarr[item.id] : null;
      if (bz) {
        if (bz.missing.length > 0) {
          const langs = this._topLangs(bz.missing.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
          subBadge = this._badgeIcon("b-sub-miss", "mdi:subtitles-outline", langs);
        } else if (bz.subtitles.length > 0) {
          const langs = this._topLangs(bz.subtitles.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
          subBadge = this._badgeIcon("b-sub-ok", "mdi:subtitles", langs);
        }
      }
    } else {
      const epFile = this._sonarrEpFiles?.[item.id];
      if (epFile) {
        let audioLangs = [];
        if (Array.isArray(epFile.languages) && epFile.languages.length > 0) {
          audioLangs = epFile.languages.map((l) => this._langCode(l.name || "")).filter(Boolean);
        } else if (epFile.mediaInfo?.audioLanguages) {
          audioLangs = epFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map((l) => this._langCode(l.trim())).filter(Boolean);
        }
        if (audioLangs.length > 0) {
          const codes = this._topLangs(audioLangs).join(" | ");
          audioBadge = this._badgeIcon("b-audio", "mdi:volume-high", codes);
        }
        const bze = this._bazarrConfigured ? this._bazarrEpisodes?.[epFile.id] : null;
        if (bze) {
          if (bze.missing.length > 0) {
            const langs = this._topLangs(bze.missing.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
            subBadge = this._badgeIcon("b-sub-miss", "mdi:subtitles-outline", langs);
          } else if (bze.subtitles.length > 0) {
            const langs = this._topLangs(bze.subtitles.map((s) => (s.code2 || s.name || "?").toUpperCase())).join(" | ");
            subBadge = this._badgeIcon("b-sub-ok", "mdi:subtitles", langs);
          }
        } else if (epFile.mediaInfo?.subtitles) {
          const subLangs = this._topLangs(
            epFile.mediaInfo.subtitles.split(/\s*[\/,]\s*/).map((l) => this._langCode(l.trim())).filter(Boolean)
          ).join(" | ");
          if (subLangs) subBadge = this._badgeIcon("b-sub-ok", "mdi:subtitles", subLangs);
        }
      }
    }
    return `
    <div class="mc" data-popup="${popup}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}">
      ${img}
      <span class="media-type-tag">${typeTag}</span>
      ${statusBadge}
      ${this._mcGrad(grad, `${rating ? `<div style="margin-bottom:3px"><span class="imdb">\u2B50 ${rating}</span></div>` : ""}
        ${audioBadge || subBadge ? `<div style="display:flex;justify-content:flex-start;gap:3px;flex-wrap:wrap;margin-bottom:3px">${audioBadge}${subBadge}</div>` : ""}
        <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>`)}
    </div>`;
  }
  _renderRecentlyRequestedCard(item) {
    const isMovie = item._mediaType === "movie";
    const poster = isMovie ? this._getRadarrPoster(item) : this._getSonarrPoster(item);
    const title = this._escHtml(item.title || "Unknown");
    const typeTag = isMovie ? this._t("typeMovie") : this._t("typeTv");
    const popup = isMovie ? POPUP_TYPE.RADARR : POPUP_TYPE.SONARR;
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const img = this._mcImg(poster, isMovie ? "\u{1F3AC}" : "\u{1F4FA}", item.id);
    const tvdbAttr = !isMovie && item.tvdbId ? ` data-tvdbid="${item.tvdbId}"` : "";
    const tmdbAttr = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : "";
    const radarrAttr = isMovie ? item._isRadarr2 ? ` data-radarr2id="${item.id}"` : ` data-radarrid="${item.id}"` : "";
    let badgeHtml = "";
    if (isMovie) {
      const qActive = item._isRadarr2 ? this._radarr2QueueActive : this._radarrQueueActive;
      const qFailed = item._isRadarr2 ? this._radarr2QueueFailed : this._radarrQueueFailed;
      const dlActive = qActive?.has(item.id);
      const dlFailed = qFailed?.has(item.id);
      if (dlFailed) badgeHtml = this._badge("b-missing", "\u2717", this._t("badgeFailed"));
      else if (dlActive) badgeHtml = this._badge("b-dl", "\u2193", this._t("badgeDownloading"));
      else badgeHtml = this._badge("b-missing", "\u2717", this._t("badgeMissing"));
    } else {
      const snQ = item._isSonarr2 ? this._sonarr2QueueSeriesPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeriesPct || /* @__PURE__ */ new Map();
      if (snQ.has(item.id)) badgeHtml = this._badge("b-dl", "\u2193", this._t("badgeDownloading"));
      else badgeHtml = this._badge("b-missing", "\u2717", this._t("badgeMissing"));
    }
    const statusBadge = this._statusBadge(badgeHtml);
    const ratingVal = item.ratings?.imdb?.value || item.ratings?.tmdb?.value || item.ratings?.value || 0;
    const rating = ratingVal ? ratingVal.toFixed(1) : "";
    return `
    <div class="mc" data-popup="${popup}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}">
      ${img}
      <span class="media-type-tag">${typeTag}</span>
      ${statusBadge}
      ${this._mcGrad(grad, `${rating ? `<div style="margin-bottom:3px"><span class="imdb">\u2B50 ${rating}</span></div>` : ""}
        <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>`)}
    </div>`;
  }
  _renderTvUpcomingCard(m, { showDate = true, showRating = false, typeTag = "", overlayIndex = null, source = "tvUpcoming" } = {}) {
    const title = this._escHtml(m.name || m.originalName || "Unknown");
    const rating = m.voteAverage ? m.voteAverage.toFixed(1) : "?";
    const dateStr = this.fmtDate(m.firstAirDate || m.first_air_date);
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
    const _noSeerr = this._overseerrConfigured === false;
    let actionBtn = "";
    if (_isAvail) {
      actionBtn = "";
    } else if (_isReq) {
      if (_isAdmin || _noSeerr || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
        actionBtn = "";
      } else {
        const withdrawBtn = _reqId ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}">\u2715</button>` : "";
        actionBtn = withdrawBtn;
      }
    } else {
      actionBtn = `<button class="btn-add tv-req-open" data-showid="${m.id}" data-title="${title}" data-source="${source}">${this._t("add")}</button>`;
    }
    let statusBadge = "";
    if (_isAvail) {
      statusBadge = this._statusBadge(this._badge("b-st-avail", "\u2713", this._t("badgeAvailable")));
    } else if (_isReq) {
      if (_isAdmin || _noSeerr || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
        statusBadge = this._statusBadge(this._badge("b-st-proc", "\u2193", this._t("badgeAdded")));
      } else {
        statusBadge = this._statusBadge(this._badge("b-st-pend", "\u23F1", this._t("badgePending")));
      }
    }
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const tagHtml = typeTag ? `<span class="media-type-tag"><span class="b-txt">${typeTag}</span></span>` : "";
    const img = this._mcImg(m.posterPath ? m.posterPath.startsWith("http") ? m.posterPath : `https://image.tmdb.org/t/p/w342${m.posterPath}` : null, "\u{1F4FA}", m.id);
    return `
    <div class="mc" data-popup="${POPUP_TYPE.TV}" data-tmdbid="${m.id}" data-title="${title}"${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ""}>
      ${img}
      ${tagHtml}
      ${statusBadge}
      ${this._mcGrad(grad, `${showDate && dateStr || showRating && rating !== "?" ? `<div style="margin-bottom:3px">${showDate && dateStr ? `<span style="font-size:9px;color:${tc};opacity:0.85">${dateStr}</span>` : `<span class="imdb">\u2B50 ${rating}</span>`}</div>` : ""}
        <div style="display:flex;align-items:center;gap:4px">
          <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${title}</div>
          ${actionBtn ? `<div style="flex-shrink:0">${actionBtn}</div>` : ""}
        </div>`)}
    </div>`;
  }
  _renderTrendingCard(m, overlayIndex = null) {
    if (m.mediaType === "tv") {
      return this._renderTvUpcomingCard(m, { showDate: false, showRating: true, typeTag: this._t("typeTv"), overlayIndex, source: "trending" });
    }
    return this._renderUpcomingCard(m, { showDate: false, typeTag: this._t("typeMovie"), overlayIndex, reqKey: "trending-" + m.id });
  }
  _renderUpcomingCard(m, { showDate = true, showRating = !showDate, typeTag = "", overlayIndex = null, reqKey = String(m.id) } = {}) {
    const title = this._escHtml(m.title || "Unknown");
    const rating = m.voteAverage ? m.voteAverage.toFixed(1) : "?";
    const dateStr = this.fmtDate(m.releaseDate);
    const radarrEntry = Array.isArray(this._radarr) && this._radarr.find((r) => r.tmdbId === m.id);
    const inRadarr = !!radarrEntry;
    const inRadarrAvail = !!(radarrEntry && radarrEntry.hasFile);
    const inRadarrDownloading = !!(radarrEntry && !radarrEntry.hasFile && this._radarrQueueActive.has(radarrEntry.id));
    const radarr2Entry = this._radarr2ByTmdb?.get(String(m.id));
    const inRadarr2 = !!radarr2Entry;
    const inRadarr2Avail = !!(radarr2Entry && radarr2Entry.hasFile);
    const inRadarr2Downloading = !!(radarr2Entry && !radarr2Entry.hasFile && this._radarr2QueueActive?.has(radarr2Entry.id));
    const mediaStatus = m.mediaInfo?.status;
    const _inOptimistic = this._optimisticRequested.has(m.id);
    const _withdrawn = this._withdrawnIds.has(m.id);
    const _hasPending = this._familyPendingIds.has(m.id);
    const _stale = mediaStatus >= 3 && !inRadarr && !inRadarr2 && !_inOptimistic && !_hasPending;
    const _isAvail = (inRadarrAvail || inRadarr2Avail || mediaStatus === 5) && !_withdrawn && !_stale;
    const _isReq = (mediaStatus >= 2 || _inOptimistic || _hasPending || inRadarr || inRadarr2) && !_withdrawn && !inRadarrAvail && !inRadarr2Avail && !_stale;
    const _isDownloading = inRadarrDownloading || inRadarr2Downloading;
    const _reqId = m.mediaInfo?.requests?.[0]?.id || this._familyPendingIds.get(m.id);
    const _isAdmin = this._hass.user.is_admin;
    const _noSeerr2 = this._overseerrConfigured === false;
    let actionBtn = "";
    if (_isAvail) {
      actionBtn = "";
    } else if (_isReq) {
      if (_isDownloading) {
        actionBtn = "";
      } else if (_isAdmin || _noSeerr2 || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
        actionBtn = "";
      } else {
        const withdrawBtn = _reqId ? `<button class="req-withdraw" data-reqid="${_reqId}" data-mediaid="${m.id}">\u2715</button>` : "";
        actionBtn = withdrawBtn;
      }
    } else {
      actionBtn = `<button class="btn-add req-open" data-movieid="${m.id}" data-tmdb="${m.id}" data-reqkey="${reqKey}">${this._t("add")}</button>`;
    }
    let statusBadge = "";
    if (_isAvail) {
      statusBadge = this._statusBadge(this._badge("b-st-avail", "\u2713", this._t("badgeAvailable")));
    } else if (_isReq) {
      if (_isDownloading) {
        statusBadge = this._statusBadge(this._badge("b-dl", "\u2193", this._t("badgeDownloading")));
      } else if (_isAdmin || _noSeerr2 || mediaStatus >= 3 && !_inOptimistic && !_hasPending) {
        statusBadge = this._statusBadge(this._badge("b-st-proc", "\u2193", this._t("badgeAdded")));
      } else {
        statusBadge = this._statusBadge(this._badge("b-st-pend", "\u23F1", this._t("badgePending")));
      }
    }
    const overlay = this._requestPending?.reqKey === reqKey ? this._renderRequestOverlay(m.id, m.id) : "";
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const posterPath = m.posterPath || m.poster_path || null;
    const img = this._mcImg(posterPath ? posterPath.startsWith("http") ? posterPath : `https://image.tmdb.org/t/p/w342${posterPath}` : null, "\u{1F3AC}", m.id);
    const tagHtml = typeTag ? `<span class="media-type-tag"><span class="b-txt">${typeTag}</span></span>` : "";
    return `
    <div class="mc" data-popup="${POPUP_TYPE.MOVIE}" data-tmdbid="${m.id}" data-title="${title}"${radarrEntry ? ` data-radarrid="${radarrEntry.id}"` : ""}${overlayIndex !== null ? ` data-oi="${overlayIndex}"` : ""}>
      ${img}
      ${tagHtml}
      ${statusBadge}
      ${this._mcGrad(grad, `${showDate && dateStr || showRating && rating !== "?" ? `<div style="margin-bottom:3px">${showDate && dateStr ? `<span style="font-size:9px;color:${tc};opacity:0.85">${dateStr}</span>` : `<span class="imdb">\u2B50 ${rating}</span>`}</div>` : ""}
        <div style="display:flex;align-items:center;gap:4px">
          <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${title}</div>
          ${actionBtn ? `<div style="flex-shrink:0">${actionBtn}</div>` : ""}
        </div>`)}
      ${overlay}
    </div>`;
  }
  _renderCalendarCard(ep) {
    const series = ep.series || {};
    const title = this._escHtml(series.title || ep.seriesTitle || "Unknown");
    const s = String(ep.seasonNumber || 0).padStart(2, "0");
    const e = String(ep.episodeNumber || 0).padStart(2, "0");
    const badge = `S${s}E${e}`;
    const dateStr = this.fmtDate(ep.airDateUtc || ep.airDate);
    const poster = this._getSonarrPoster(series);
    const grad = "rgba(0,0,0,0.88)";
    const tc = "rgba(var(--arr-pt-rgb, 255, 255, 255), 1)";
    const img = this._mcImg(poster, "\u{1F4FA}", ep.series?.id || ep.seriesId);
    return `
    <div class="mc" data-popup="${POPUP_TYPE.SONARR}" data-tvdbid="${ep.series?.tvdbId || ""}" data-tmdbid="${ep.series?.tmdbId || ""}" data-title="${title}">
      ${img}
      ${this._mcGrad(grad, `<div style="margin-bottom:3px;display:flex;align-items:center;justify-content:space-between;gap:4px">
          ${dateStr ? `<span style="font-size:9px;color:${tc};opacity:0.85">${dateStr}</span>` : "<span></span>"}
          <span class="badge b-ep">${badge}</span>
        </div>
        <div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>`)}
    </div>`;
  }
};
var mediaCardsMixin = _MediaCardMethods.prototype;

// src/styles/theme.js
var _ThemeMethods = class {
  _hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`;
  }
  // Parse hex or rgb/rgba string → "R, G, B" (strips alpha)
  _parseColorRgb(str) {
    if (!str) return null;
    const s = str.trim();
    if (s.startsWith("#")) {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
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
    const c = (k) => this._parseColorRgb(cfg[k]);
    const rules = [];
    const props = [];
    const propMap = [
      ["headingTextColor", "--arr-ht-rgb"],
      ["headingColor", "--arr-hd-rgb"],
      ["primaryTextColor", "--arr-pt-rgb"],
      ["secondaryTextColor", "--arr-st-rgb"],
      ["pagingButtonTextColor", "--arr-pbt-rgb"],
      ["downloadButtonTextColor", "--arr-dbt-rgb"],
      ["tagPillTextColor", "--arr-tp-rgb"],
      ["pagingButtonBackgroundColor", "--arr-pbb-rgb"],
      ["pagingDotColor", "--arr-pd-rgb"],
      ["pagingDotActiveColor", "--arr-pda-rgb"]
    ];
    for (const [key, prop] of propMap) {
      const rgb = c(key);
      if (rgb) props.push(`${prop}: ${rgb};`);
    }
    if (props.length) rules.push(`:host { ${props.join(" ")} }`);
    const mo = c("modalHeadingTextColor");
    if (mo) {
      rules.push(`.popup-overlay .popup-title { color: rgba(${mo}, 1) !important; }`);
      rules.push(`.popup-overlay .is-f-btn.active { color: rgba(${mo}, 1) !important; }`);
      rules.push(`.popup-overlay .sn-season-title { color: rgba(${mo}, 1) !important; }`);
      rules.push(`.popup-overlay .btn-person:not(.active) { color: rgba(${mo}, 0.80) !important; border-color: rgba(${mo}, 0.25) !important; }`);
    }
    const mp = c("modalPrimaryTextColor");
    if (mp) {
      rules.push(`.popup-overlay .popup-sub { color: rgba(${mp}, 0.55) !important; }`);
      rules.push(`.popup-overlay .popup-overview { color: rgba(${mp}, 0.75) !important; }`);
      rules.push(`.popup-overlay .is-rel-title { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .is-indexer { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .is-size { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .is-lang-chip { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .sn-ep-num { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .sn-ep-title { color: rgba(${mp}, 0.90) !important; }`);
    }
    const msc = c("modalSecondaryTextColor");
    if (msc) {
      rules.push(`.popup-overlay .is-panel-title { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-count { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-f-btn:not(.active) { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-table thead th { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-s-zero { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-loading { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-q-sd { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-rel-age { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-peers-na { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .sn-seasons-label { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .sn-season-stat { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .sn-ep-date { color: rgba(${msc}, 0.70) !important; }`);
    }
    const mci = c("modalCloseButtonIconColor");
    if (mci) rules.push(`.popup-close { color: rgba(${mci}, 1) !important; }`);
    const mcb = c("modalCloseButtonBackgroundColor");
    if (mcb) rules.push(`.popup-close { background: rgba(${mcb}, 1) !important; box-shadow: none !important; }`);
    const mb = c("modalBackgroundColor");
    if (mb) {
      const [mr, mg, mb2] = mb.split(",").map(Number);
      const lr = Math.round(mr + (255 - mr) * 0.6);
      const lg = Math.round(mg + (255 - mg) * 0.6);
      const lb = Math.round(mb2 + (255 - mb2) * 0.6);
      const mbLight = `${lr}, ${lg}, ${lb}`;
      rules.push(`.popup-overlay .popup-glass { background: rgba(${mb}, 0.30) !important; }`);
      rules.push(`.popup-overlay { --is-fade-btm: rgba(${mb}, 0.30) !important; --is-hdr-bg: rgba(${mb}, 0.12) !important; --is-shine: linear-gradient(120deg,rgba(${mbLight},0.55),rgba(${mbLight},0.15) 25%,rgba(${mbLight},0.05) 50%,transparent 70%) !important; }`);
    }
    const mov = c("modalOverlayColor");
    if (mov) rules.push(`.popup-overlay { background: rgba(${mov}, 0.65) !important; }`);
    const mbt = c("modalButtonTextColor");
    if (mbt) rules.push(`.popup-overlay .is-open-btn { color: rgba(${mbt}, 1) !important; }`);
    const mbb = c("modalButtonBackgroundColor");
    if (mbb) rules.push(`.popup-overlay .is-open-btn:not(.remove-lib-btn):not(.remove-disc-btn) { background: rgba(${mbb}, 0.20) !important; border-color: rgba(${mbb}, 0.40) !important; }`);
    const mrb = c("modalRemoveButtonBackgroundColor");
    if (mrb) rules.push(`.popup-overlay .is-open-btn[data-action="remove-confirm"] { background: rgba(${mrb}, 0.20) !important; border-color: rgba(${mrb}, 0.40) !important; }`);
    let el = this.shadowRoot.getElementById("arr-theme");
    if (!el) {
      el = document.createElement("style");
      el.id = "arr-theme";
      this.shadowRoot.appendChild(el);
    }
    el.textContent = rules.join("\n");
  }
};
var themeMixin = _ThemeMethods.prototype;

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
    this.shadowRoot.querySelectorAll("[data-sab-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.sabAction;
        const nzoId = btn.dataset.nzoid;
        if (!nzoId) return;
        if (action === "confirm") {
          this._sabQueueConfirm = nzoId;
          this._reRenderLeft();
        } else if (action === "cancel") {
          this._sabQueueConfirm = null;
          this._reRenderLeft();
        } else if (action === "delete") {
          this._sabQueueConfirm = null;
          this._sabQueueDelete(nzoId);
        }
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
        const oneClick = this._cfgGet("discover", "oneClickRequest", false) || this._cfgGet("discover", "oneClickMovieRequest", false);
        if (oneClick) {
          const profileName = this._cfgGet("discover", "oneClickDefaultMovieProfile", "");
          let profileId = null;
          if (profileName) {
            await this._fetchRadarrProfiles();
            const match = this._radarrProfiles.find((p) => p.name === profileName);
            profileId = match ? match.id : null;
          }
          const cfgMovieTag = this._cfgGet("discover", "oneClickDefaultMovieTag", "") || "";
          let movieTagId = null;
          if (cfgMovieTag && this._radarrTags.length > 0) {
            const tm = this._radarrTags.find((t) => t.label === cfgMovieTag);
            if (tm) movieTagId = tm.id;
          }
          const cfgMovieRootFolder = this._cfgGet("discover", "oneClickDefaultMovieRootFolder", "") || null;
          if (this._overseerrConfigured === false) {
            await this._addDirectMovieRequest(tmdbId, profileId, movieTagId, cfgMovieRootFolder, "radarr");
          } else {
            await this._addOverseerrRequest(tmdbId, profileId, movieTagId, cfgMovieRootFolder);
          }
        } else {
          await Promise.all([this._fetchRadarrProfiles(), this._fetchRadarrTags(), this._fetchRadarrRootFolders()]);
          const reqKey = btn.dataset.reqkey || String(tmdbId);
          this._requestPending = { movieId, tmdbId, reqKey };
          this._reRenderRight(true);
        }
      });
    });
    this.shadowRoot.querySelectorAll(".req-cancel:not(.tv-req-cancel)").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._requestPending = null;
        this._reRenderRight(true);
      });
    });
    this.shadowRoot.querySelectorAll(".req-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        const overlay = tab.closest(".req-overlay");
        if (!overlay) return;
        const targetPanel = tab.dataset.tab;
        overlay.querySelectorAll(".req-tab").forEach((t) => t.classList.toggle("req-tab--active", t.dataset.tab === targetPanel));
        overlay.querySelectorAll(".req-panel").forEach((p) => p.classList.toggle("req-panel--hidden", p.dataset.panel !== targetPanel));
      });
    });
    this.shadowRoot.querySelectorAll(".req-confirm:not(.tv-req-confirm)").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const movieId = parseInt(btn.dataset.movieid, 10);
        const tmdbId = parseInt(btn.dataset.tmdb, 10);
        const overlay = btn.closest(".req-overlay");
        const activeTab = overlay?.querySelector(".req-tab--active")?.dataset.tab ?? "r1";
        const use2 = activeTab === "r2";
        const suffix = use2 ? "2" : "";
        const sel = this.shadowRoot.getElementById(`req-select${suffix}-${movieId}`);
        const tagSel = this.shadowRoot.getElementById(`req-tag${suffix}-${movieId}`);
        const rfSel = this.shadowRoot.getElementById(`req-rootfolder${suffix}-${movieId}`);
        const profileId = sel ? sel.value : null;
        const tagId = tagSel ? tagSel.value : null;
        const rootFolder = rfSel?.value || null;
        btn.disabled = true;
        btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
        if (this._overseerrConfigured === false) {
          await this._addDirectMovieRequest(tmdbId, profileId, tagId || null, rootFolder, use2 ? "radarr2" : "radarr");
        } else {
          await this._addOverseerrRequest(tmdbId, profileId, tagId || null, rootFolder, use2);
        }
      });
    });
    const tvBtns = this.shadowRoot.querySelectorAll(".tv-req-open");
    tvBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const showId = parseInt(btn.dataset.showid, 10);
        if (!showId) return;
        const tvSource = btn.dataset.source || "tvUpcoming";
        const show = tvSource === "trending" ? this._trending.find((m) => m.id === showId && m.mediaType === "tv") : tvSource === "search" ? (this._searchResults || []).find((m) => m.id === showId && m.mediaType === "tv") : (this._tvUpcoming || []).find((m) => m.id === showId);
        const fromTrending = tvSource === "trending";
        const fromSearch = tvSource === "search";
        if (!show) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        const oneClick = this._cfgGet("discover", "oneClickRequest", false) || this._cfgGet("discover", "oneClickMovieRequest", false);
        if (oneClick) {
          await this._oneClickTvRequest(show);
          btn.disabled = false;
          return;
        }
        if (btn.closest(".trending-overlay")) {
          const grid = btn.closest(".to-grid");
          const card = btn.closest(".mc[data-oi]");
          const cardIndex = card ? parseInt(card.dataset.oi, 10) : 0;
          const colCount = grid ? Math.round(getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length) : 4;
          await this._openOverlayTvRequest(show, cardIndex, colCount);
        } else {
          await this._openTvRequestOverlay(show, tvSource);
        }
      });
    });
    this.shadowRoot.querySelectorAll(".tv-req-cancel").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._tvRequestPending = null;
        this._reRenderRight(true);
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
        const tagSel = this.shadowRoot.getElementById("tv-req-tag");
        const rfSel = this.shadowRoot.getElementById("tv-req-rootfolder");
        const profileId = profileSel ? profileSel.value : null;
        const tagId = tagSel?.value || null;
        const rootFolder = rfSel?.value || null;
        btn.disabled = true;
        btn.innerHTML = '<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px"></span>';
        if (this._overseerrConfigured === false) {
          await this._addDirectTvRequest(this._tvRequestPending?.show, seasons, profileId, tagId, rootFolder);
        } else {
          await this._addOverseerrTvRequest(mediaId, seasons, profileId, tagId, rootFolder);
        }
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
    this._wireSectionOverlay();
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
  _wireSectionOverlay() {
    const sr = this.shadowRoot;
    sr.querySelectorAll('[data-action="overlay-open"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const sec = el.dataset.sec;
        if (!sec) return;
        this._overlay = { section: sec, page: 0, tvPending: null };
        this._reRenderSection(sec);
        const cfg = this._getSectionOverlayConfig(sec);
        if (cfg?.apiEndpoint) this._proactiveSectionLoad(sec);
      });
    });
    const overlay = sr.querySelector(".trending-overlay");
    if (!overlay) return;
    overlay.querySelector('[data-action="overlay-close"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      const sec = this._overlay?.section;
      this._overlay = { section: null, page: 0, tvPending: null };
      this._reRenderSection(sec || "trending");
    });
    sr.querySelector('[data-action="overlay-prev"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._overlay.page = Math.max(0, (this._overlay.page || 0) - 1);
      this._overlay.tvPending = null;
      this._reRenderSection(this._overlay.section);
      this._scrollToSectionOverlay();
    });
    sr.querySelector('[data-action="overlay-next"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const sec = this._overlay?.section;
      const cfg = this._getSectionOverlayConfig(sec);
      if (!cfg) return;
      const isMobile = window.matchMedia("(max-width: 480px)").matches;
      const rows = Math.max(1, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
      const perPage = isMobile ? rows * 2 : rows * 4;
      const items = this[cfg.dataKey] || [];
      const newPage = (this._overlay.page || 0) + 1;
      if (cfg.apiEndpoint && newPage * perPage >= items.length) {
        const apiPage = this._overlayApiPage[sec] || 0;
        const apiTotal = this._overlayApiTotalPages[sec] || 1;
        if (apiPage < apiTotal) {
          try {
            const nextApiPage = apiPage + 1;
            const data = await this._hass.callApi("GET", `arr_stack/${cfg.apiEndpoint}?page=${nextApiPage}`);
            this[cfg.dataKey] = [...items, ...data.results || []];
            this._overlayApiTotalPages[sec] = data.totalPages || apiTotal;
            this._overlayApiPage[sec] = nextApiPage;
          } catch (err) {
            console.error(`[arr-card] ${sec} overlay lazy load error:`, err);
          }
        }
      }
      this._overlay.page = newPage;
      this._overlay.tvPending = null;
      this._reRenderSection(this._overlay.section);
      this._scrollToSectionOverlay();
    });
    sr.querySelectorAll(".rp-dot[data-topage]").forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        const pg = parseInt(dot.dataset.topage, 10);
        if (!isNaN(pg)) {
          this._overlay.page = pg;
          this._overlay.tvPending = null;
          this._reRenderSection(this._overlay.section);
          this._scrollToSectionOverlay();
        }
      });
    });
    if (this._overlay.tvPending) {
      requestAnimationFrame(() => this._positionTvOverlay());
    }
  }
  // Po kliknutí next/prev v more overlay scrolluj viewport na maximum —
  // spodok col-right bude na spodku viewportu, navbar presne pod kartami
  _scrollToSectionOverlay() {
    requestAnimationFrame(() => {
      const sc = this._findScrollContainer();
      if (!sc) return;
      sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
    });
  }
  async _openOverlayTvRequest(show, cardIndex, colCount) {
    this._overlay.tvPending = {
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
        if (this._overlay.tvPending) {
          this._overlay.tvPending.seasons = seasons;
          this._overlay.tvPending.selected = new Set(seasons);
        }
      })(),
      this._fetchSonarrProfiles(),
      (async () => {
        if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      })()
    ]);
    if (this._overlay.tvPending) {
      this._overlay.tvPending.profileId = this._seerrSonarr?.profileId ?? null;
      this._overlay.tvPending.loading = false;
      requestAnimationFrame(() => this._positionTvOverlay());
    }
  }
  _positionTvOverlay() {
    const tvp = this._overlay.tvPending;
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
      this._overlay.tvPending = null;
      this._reRenderSection(this._overlay.section);
    });
    el.querySelector(".to-tv-confirm-abs")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const checkedSeasons = [...el.querySelectorAll(".sv-input:checked")].map((cb) => parseInt(cb.dataset.season, 10)).filter(Boolean);
      if (!checkedSeasons.length) return;
      const profileSel = el.querySelector("#tv-req-profile-abs");
      const tagSel = el.querySelector("#tv-req-tag-abs");
      const rfSel = el.querySelector("#tv-req-rootfolder-abs");
      const profileId = profileSel ? profileSel.value : null;
      const tagId = tagSel?.value || null;
      const rootFolder = rfSel?.value || null;
      const mediaId = parseInt(e.currentTarget.dataset.mediaid, 10);
      e.currentTarget.disabled = true;
      e.currentTarget.innerHTML = '<span class="action-spinner" style="width:10px;height:10px;border-width:1.5px"></span>';
      const show = tvp.show;
      this._optimisticRequested.add(show.id);
      this._withdrawnIds.delete(show.id);
      this._overlay.tvPending = null;
      el.remove();
      try {
        if (!this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
        const body = { mediaType: "tv", mediaId, seasons: checkedSeasons };
        if (this._seerrSonarr) {
          body.serverId = this._seerrSonarr.serverId;
          body.profileId = profileId !== null ? parseInt(profileId) : this._seerrSonarr.profileId;
          body.rootFolder = rootFolder || this._seerrSonarr.rootFolder;
        }
        if (tagId) body.tags = [parseInt(tagId)];
        if (!this._hass.user.is_admin) body.userMode = "family";
        await this._hass.callApi("POST", "arr_stack/overseerr/request", body);
      } catch (err) {
        console.error("[arr-card] overlay TV request error:", err);
        this._optimisticRequested.delete(show.id);
      }
      await this._fetchAll();
    });
  }
  _wireSearch() {
    const root = this.shadowRoot;
    const input = root.querySelector(".search-bar-input");
    if (!input) return;
    if (this._searchAbort) this._searchAbort.abort();
    this._searchAbort = new AbortController();
    const sig = this._searchAbort.signal;
    const headingColor = this._cfgGet("styles", "headingTextColor", "#fff") || "#fff";
    const iconDefaultColor = this._cfgGet("styles", "searchBarIconColor", "") || "";
    const _setSearchColors = (on) => {
      const wrap = input.closest(".search-bar-wrap");
      if (!wrap) return;
      const icon = wrap.querySelector("ha-icon");
      const clear = wrap.querySelector(".search-bar-clear");
      if (icon) icon.style.color = on ? headingColor : iconDefaultColor;
      if (clear) clear.style.color = on ? headingColor : "";
      input.style.color = on ? headingColor : "";
    };
    input.addEventListener("focus", () => _setSearchColors(true), { signal: sig });
    input.addEventListener("blur", () => {
      if (!this._searchQuery?.trim()) _setSearchColors(false);
    }, { signal: sig });
    input.addEventListener("input", () => {
      const q = input.value.trim();
      this._searchQuery = input.value;
      this._searchPage = 0;
      clearTimeout(this._searchTimer);
      _setSearchColors(!!q || document.activeElement === input);
      if (!q) {
        this._searchActive = false;
        this._searchResults = [];
        this._reRenderRight(true);
        return;
      }
      this._searchActive = true;
      this._searchTimer = setTimeout(() => this._fetchSearch(q), 600);
    }, { signal: sig });
    root.addEventListener("click", (e) => {
      if (e.target.closest(".search-bar-clear")) {
        clearTimeout(this._searchTimer);
        this._searchQuery = "";
        this._searchActive = false;
        this._searchPage = 0;
        this._searchResults = [];
        this._reRenderRight(true);
      }
    }, { signal: sig });
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
      this._wireSearch();
      requestAnimationFrame(() => {
        this._checkBadgeOverflow();
        if (isMobile && sc && left) {
          const lRect = left.getBoundingClientRect();
          const rightEl = this.shadowRoot.getElementById("col-right");
          const rRect = rightEl ? rightEl.getBoundingClientRect() : null;
          const isShortPage = rRect ? rRect.height <= window.innerHeight : false;
          if (!this._overlay?.section && lRect.bottom >= navOffset && (navWasMet || isShortPage && lRect.top < 0)) {
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
        if (this._searchActive) {
          const _sc = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
          const searchTotal = Math.ceil((this._searchResults || []).length / (_sc * 2));
          const cur = this._searchPage || 0;
          if (dir === "next") this._searchPage = Math.min(cur + 1, searchTotal - 1);
          else this._searchPage = Math.max(cur - 1, 0);
        } else {
          const totalPages = this.shadowRoot.querySelectorAll(".rp-dot").length || 1;
          const cur = typeof this._rightPage === "number" ? this._rightPage : 0;
          if (dir === "next") this._rightPage = Math.min(cur + 1, totalPages - 1);
          else this._rightPage = Math.max(cur - 1, 0);
        }
        const right = this.shadowRoot.getElementById("col-right");
        if (right) {
          if (this._rightMaxH) right.style.minHeight = this._rightMaxH + "px";
          const navWasVisible = right.querySelector(".rp-nav")?.classList.contains("rp-nav-visible") ?? false;
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
          this._wireSearch();
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
          if (this._searchActive) this._searchPage = targetPage;
          else this._rightPage = targetPage;
          const right = this.shadowRoot.getElementById("col-right");
          if (right) {
            if (this._rightMaxH) right.style.minHeight = this._rightMaxH + "px";
            const navWasVisible = right.querySelector(".rp-nav")?.classList.contains("rp-nav-visible") ?? false;
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
            this._wireSearch();
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
    scope.querySelectorAll(".dc-chev").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.diskkey;
        const dir = btn.dataset.diskdir;
        if (!key || btn.disabled) return;
        let roots;
        if (key === "left") {
          roots = [...this._radarrRootFolders || [], ...this._sonarrRootFolders || []];
        } else {
          roots = key === "radarr" ? this._radarrRootFolders : this._sonarrRootFolders;
        }
        const DISK_ROUND = 100 * 1024 * 1024;
        const diskMap = /* @__PURE__ */ new Map();
        for (const r of roots) {
          const key2 = Math.round(r.freeSpace / DISK_ROUND);
          if (!diskMap.has(key2)) diskMap.set(key2, true);
        }
        const total = diskMap.size;
        const cur = this._diskPage[key] ?? 0;
        if (dir === "next" && cur < total - 1) this._diskPage[key] = cur + 1;
        else if (dir === "prev" && cur > 0) this._diskPage[key] = cur - 1;
        else return;
        if (key === "left") {
          this._reRenderLeft();
        } else {
          this._reRenderSection(key);
        }
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
        const total = Math.ceil(this._smpPageCount(data, section) / perPage);
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
    const rpNav = this.shadowRoot.querySelector(".rp-nav");
    if (rpNav) {
      let startX = null;
      rpNav.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true, signal: sig });
      rpNav.addEventListener("touchend", (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) < THRESHOLD) return;
        const dir = dx < 0 ? "next" : "prev";
        const allCategories = (this._cfg.categories || this._defaultCategories()).filter((c) => c.enabled !== false);
        const perPage = Math.max(1, parseInt(this._cfgGet("discover", "categoriesCount", 3)) || 3);
        const totalPages = Math.ceil(allCategories.length / perPage);
        const cur = this._pages["right"] || 0;
        if (dir === "next" && cur < totalPages - 1) {
          this._pages["right"] = cur + 1;
        } else if (dir === "prev" && cur > 0) {
          this._pages["right"] = cur - 1;
        } else {
          return;
        }
        this._reRenderRight(true);
      }, { passive: true, signal: sig });
    }
  }
};
var wireMixin = _WireMethods.prototype;

// src/wire/tautulli.js
var _WireTautulliMethods = class {
  _wireTautulliPosters(right) {
    right.addEventListener("click", (e) => {
      const card = e.target.closest("[data-tl-open]");
      if (!card) return;
      this._openTautulliModal(card.dataset.tlOpen);
    });
  }
  _wireTautulliModal(el) {
    el.querySelector("#tl-close")?.addEventListener("click", () => this._closeTautulliModal());
    el.addEventListener("click", (e) => {
      if (e.target === el) this._closeTautulliModal();
    });
    el.querySelectorAll("[data-tl-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.tlTab;
        if (!t || !this._tautulliModal) return;
        el.querySelectorAll("[data-tl-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        this._tautulliModal.tab = t;
        const titleEl = el.querySelector("#tl-hdr-title");
        if (titleEl) titleEl.textContent = this._tlTabTitle(t);
        const subEl = el.querySelector("#tl-hdr-sub");
        if (subEl) subEl.textContent = this._tlTabSubtitle(t);
        this._tlLoadTab(t, el);
      });
    });
  }
  _wireTautulliModalBody(body) {
    body.querySelector("#tl-ip-report-toggle")?.addEventListener("click", async () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.ipReportOpen = !this._tautulliModal.ipReportOpen;
      const m = this._tautulliModal;
      const r2 = await this._tlApiFetch("get_users_table", `length=50&start=${(m.usersPage || 0) * 50}&order_column=${m.usersSortCol || "plays"}&order_dir=${m.usersSortDir || "desc"}`).catch(() => null);
      body.innerHTML = this._tlBodyUsers(r2?.response?.data?.data);
      this._wireTautulliModalBody(body);
    });
    body.querySelector("#tl-ack-btn")?.addEventListener("click", async () => {
      await this._ackTautulliSharing();
      const r = await this._hass.callApi("GET", "arr_stack/tautulli/get_users_table?length=50&start=0&order_column=plays&order_dir=desc").catch(() => null);
      body.innerHTML = this._tlBodyUsers(r?.response?.data?.data);
      this._wireTautulliModalBody(body);
    });
    {
      let _histSearchTimer = null;
      body.querySelector("#tl-hist-search")?.addEventListener("input", (e) => {
        if (!this._tautulliModal) return;
        this._tautulliModal.histSearch = e.target.value || "";
        this._tautulliModal.histPage = 0;
        clearTimeout(_histSearchTimer);
        _histSearchTimer = setTimeout(async () => {
          const inp0 = body.querySelector("#tl-hist-search");
          const sel0 = inp0?.selectionStart ?? null;
          await this._tlRefetchHistory(body);
          const inp = body.querySelector("#tl-hist-search");
          if (inp && sel0 !== null) {
            inp.focus();
            inp.setSelectionRange(sel0, sel0);
          }
        }, 400);
      });
    }
    body.querySelector("#tl-hist-user-sel")?.addEventListener("change", async (e) => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histUser = e.target.value || null;
      this._tautulliModal.histPage = 0;
      await this._tlRefetchHistory(body);
    });
    body.querySelectorAll("[data-tl-hist-media]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const v = btn.dataset.tlHistMedia;
        this._tautulliModal.histMedia = this._tautulliModal.histMedia === v ? null : v;
        this._tautulliModal.histPage = 0;
        await this._tlRefetchHistory(body);
      });
    });
    body.querySelectorAll("[data-tl-hist-play]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const v = btn.dataset.tlHistPlay;
        this._tautulliModal.histPlayback = this._tautulliModal.histPlayback === v ? null : v;
        this._tautulliModal.histPage = 0;
        await this._tlRefetchHistory(body);
      });
    });
    body.querySelector("#tl-hist-perpage")?.addEventListener("change", async (e) => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histPerPage = parseInt(e.target.value) || 25;
      this._tautulliModal.histPage = 0;
      await this._tlRefetchHistory(body);
    });
    body.querySelector("#tl-hist-del-mode")?.addEventListener("click", () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histDeleteMode = !this._tautulliModal.histDeleteMode;
      body.innerHTML = this._tlBodyHistory();
      this._wireTautulliModalBody(body);
    });
    body.querySelector("#tl-hist-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.histColsOpen = !this._tautulliModal.histColsOpen;
      const menu = body.querySelector("#tl-hist-cols-menu");
      if (menu) menu.style.display = this._tautulliModal.histColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-tl-hist-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden("histHiddenCols", ["ip", "paused", "stopped"]);
        const col = item.dataset.tlHistCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.histColsOpen = true;
        body.innerHTML = this._tlBodyHistory();
        this._wireTautulliModalBody(body);
      });
    });
    body.querySelector("#tl-hist-mob-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.histMobColsOpen = !this._tautulliModal.histMobColsOpen;
      const menu = body.querySelector("#tl-hist-mob-cols-menu");
      if (menu) menu.style.display = this._tautulliModal.histMobColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-tl-hist-mob-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden("histMobHiddenCols", ["ip", "platform", "product", "player", "paused", "stopped"]);
        const col = item.dataset.tlHistMobCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.histMobColsOpen = true;
        body.innerHTML = this._tlBodyHistory();
        this._wireTautulliModalBody(body);
      });
    });
    body.querySelectorAll("[data-tl-hpage]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.histTotal / (m.histPerPage || 25)));
        const val = btn.dataset.tlHpage;
        let p = m.histPage || 0;
        if (val === "first") p = 0;
        else if (val === "prev") p = Math.max(0, p - 1);
        else if (val === "next") p = Math.min(totalPages - 1, p + 1);
        else if (val === "last") p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.histPage) return;
        m.histPage = p;
        await this._tlRefetchHistory(body);
      });
    });
    body.querySelectorAll("[data-tl-hist-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const rid = btn.dataset.tlHistDelete;
        if (!confirm("Delete this history entry? This cannot be undone.")) return;
        btn.disabled = true;
        await this._tlApiFetch("delete_history", `row_id=${rid}`);
        await this._tlRefetchHistory(body);
      });
    });
    this._wireGraphControls(body);
    body.querySelector("#tl-libs-search")?.addEventListener("input", (e) => {
      if (!this._tautulliModal) return;
      const pos = e.target.selectionStart;
      this._tautulliModal.libsSearch = e.target.value || "";
      this._tautulliModal.libsPage = 0;
      body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
      this._wireTautulliModalBody(body);
      const inp = body.querySelector("#tl-libs-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(pos, pos);
      }
    });
    body.querySelector("#tl-libs-perpage")?.addEventListener("change", async (e) => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libsPerPage = parseInt(e.target.value);
      this._tautulliModal.libsPage = 0;
      await this._tlRefetchLibraries(body);
    });
    body.querySelectorAll("[data-tl-lib-sort]").forEach((th) => {
      th.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const col = th.dataset.tlLibSort;
        if (this._tautulliModal.libsSortCol === col) {
          this._tautulliModal.libsSortDir = this._tautulliModal.libsSortDir === "asc" ? "desc" : "asc";
        } else {
          this._tautulliModal.libsSortCol = col;
          this._tautulliModal.libsSortDir = "desc";
        }
        this._tautulliModal.libsPage = 0;
        await this._tlRefetchLibraries(body);
      });
    });
    body.querySelectorAll("[data-tl-lpage]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.libsTotal / m.libsPerPage));
        const val = btn.dataset.tlLpage;
        let p = m.libsPage;
        if (val === "first") p = 0;
        else if (val === "prev") p = Math.max(0, p - 1);
        else if (val === "next") p = Math.min(totalPages - 1, p + 1);
        else if (val === "last") p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.libsPage) return;
        m.libsPage = p;
        await this._tlRefetchLibraries(body);
      });
    });
    body.querySelector("#tl-libs-edit-btn")?.addEventListener("click", () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libsEditMode = !this._tautulliModal.libsEditMode;
      body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
      this._wireTautulliModalBody(body);
    });
    body.querySelector("#tl-libs-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.libsColsOpen = !this._tautulliModal.libsColsOpen;
      const menu = body.querySelector("#tl-libs-cols-menu");
      if (menu) menu.style.display = this._tautulliModal.libsColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-tl-lib-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden("libsHiddenCols", ["type"]);
        const col = item.dataset.tlLibCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.libsColsOpen = true;
        body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
        this._wireTautulliModalBody(body);
      });
    });
    body.querySelector("#tl-libs-mob-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.libsMobColsOpen = !this._tautulliModal.libsMobColsOpen;
      const menu = body.querySelector("#tl-libs-mob-cols-menu");
      if (menu) menu.style.display = this._tautulliModal.libsMobColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-tl-lib-mob-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden("libsMobHiddenCols", ["type", "parents", "children", "lastStream"]);
        const col = item.dataset.tlLibMobCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.libsMobColsOpen = true;
        body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
        this._wireTautulliModalBody(body);
      });
    });
    body.querySelectorAll("[data-tl-lib-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const sid = btn.dataset.tlLibDelete;
        const name = btn.dataset.tlLibName || sid;
        if (!confirm(`Delete library "${name}" from Tautulli? This cannot be undone.`)) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        await this._tlApiFetch("delete_library", `section_id=${sid}`);
        await this._tlRefetchLibraries(body);
      });
    });
    body.querySelectorAll("[data-tl-lib-purge]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const sid = btn.dataset.tlLibPurge;
        const name = btn.dataset.tlLibName || sid;
        if (!confirm(`Delete all history for library "${name}"? This cannot be undone.`)) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        await this._tlApiFetch("delete_all_library_history", `section_id=${sid}`);
        await this._tlRefetchLibraries(body);
      });
    });
    body.querySelector("#tl-users-search")?.addEventListener("input", (e) => {
      if (!this._tautulliModal) return;
      const pos = e.target.selectionStart;
      this._tautulliModal.usersSearch = e.target.value || "";
      this._tautulliModal.usersPage = 0;
      body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
      this._wireTautulliModalBody(body);
      const inp = body.querySelector("#tl-users-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(pos, pos);
      }
    });
    body.querySelector("#tl-users-perpage")?.addEventListener("change", async (e) => {
      if (!this._tautulliModal) return;
      this._tautulliModal.usersPerPage = parseInt(e.target.value);
      this._tautulliModal.usersPage = 0;
      await this._tlRefetchUsers(body);
    });
    body.querySelectorAll("[data-tl-sort]").forEach((th) => {
      th.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const col = th.dataset.tlSort;
        if (this._tautulliModal.usersSortCol === col) {
          this._tautulliModal.usersSortDir = this._tautulliModal.usersSortDir === "asc" ? "desc" : "asc";
        } else {
          this._tautulliModal.usersSortCol = col;
          this._tautulliModal.usersSortDir = "desc";
        }
        this._tautulliModal.usersPage = 0;
        await this._tlRefetchUsers(body);
      });
    });
    body.querySelectorAll("[data-tl-upage]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.usersTotal / m.usersPerPage));
        const val = btn.dataset.tlUpage;
        let p = m.usersPage;
        if (val === "first") p = 0;
        else if (val === "prev") p = Math.max(0, p - 1);
        else if (val === "next") p = Math.min(totalPages - 1, p + 1);
        else if (val === "last") p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.usersPage) return;
        m.usersPage = p;
        await this._tlRefetchUsers(body);
      });
    });
    body.querySelector("#tl-users-edit-btn")?.addEventListener("click", () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.usersEditMode = !this._tautulliModal.usersEditMode;
      body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
      this._wireTautulliModalBody(body);
    });
    body.querySelector("#tl-users-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.usersColsOpen = !this._tautulliModal.usersColsOpen;
      const menu = body.querySelector("#tl-users-cols-menu");
      if (menu) menu.style.display = this._tautulliModal.usersColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-tl-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden("usersHiddenCols", ["username", "fullname", "email"]);
        const col = item.dataset.tlCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.usersColsOpen = true;
        body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
        this._wireTautulliModalBody(body);
      });
    });
    body.querySelector("#tl-users-mob-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.usersMobColsOpen = !this._tautulliModal.usersMobColsOpen;
      const menu = body.querySelector("#tl-users-mob-cols-menu");
      if (menu) menu.style.display = this._tautulliModal.usersMobColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-tl-usr-mob-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden("usersMobHiddenCols", ["lastPlayed", "platform", "player", "ip", "username", "email"]);
        const col = item.dataset.tlUsrMobCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.usersMobColsOpen = true;
        body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
        this._wireTautulliModalBody(body);
      });
    });
    body.querySelectorAll("[data-tl-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlDelete;
        const name = btn.dataset.tlName || uid;
        if (!confirm(`Delete user "${name}" from Tautulli? This cannot be undone.`)) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        await this._tlApiFetch("delete_user", `user_id=${uid}`);
        await this._tlRefetchUsers(body);
      });
    });
    body.querySelectorAll("[data-tl-purge]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlPurge;
        const name = btn.dataset.tlName || uid;
        if (!confirm(`Delete all history for "${name}"? This cannot be undone.`)) return;
        btn.disabled = true;
        btn.textContent = "\u2026";
        await this._tlApiFetch("delete_all_user_history", `user_id=${uid}`);
        await this._tlRefetchUsers(body);
      });
    });
    body.querySelectorAll("[data-tl-toggle-hist]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlToggleHist;
        const cur = parseInt(btn.dataset.tlKh || "1");
        btn.style.opacity = "0.5";
        btn.disabled = true;
        await this._tlApiFetch("edit_user", `user_id=${uid}&keep_history=${cur ? 0 : 1}`);
        await this._tlRefetchUsers(body);
      });
    });
    body.querySelectorAll("[data-tl-toggle-guest]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlToggleGuest;
        const cur = parseInt(btn.dataset.tlAg || "0");
        btn.style.opacity = "0.5";
        btn.disabled = true;
        await this._tlApiFetch("edit_user", `user_id=${uid}&allow_guest=${cur ? 0 : 1}`);
        await this._tlRefetchUsers(body);
      });
    });
  }
  // ── Graph controls wiring ─────────────────────────────────────────────────
  // Called after body render when graphs tab is active.
  // Also called from _wireTautulliModalBody for all tabs (no-ops if no els).
  _wireGraphControls(body) {
    if (!body) return;
    body.querySelectorAll("[data-tl-graph-sub]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const m = this._tautulliModal;
        if (!m) return;
        const newSub = btn.dataset.tlGraphSub;
        if (newSub === m.graphsSub) return;
        m.graphsSub = newSub;
        m.graphsData = null;
        if (newSub === "totals") {
          if (m.graphsRange > 60) m.graphsRange = 12;
        } else {
          if (m.graphsRange <= 60 && m.graphsSub === "totals") m.graphsRange = 30;
        }
        await this._tlRefetchGraphs(body);
      });
    });
    body.querySelectorAll("[data-tl-g-metric]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const m = this._tautulliModal;
        if (!m) return;
        const v = btn.dataset.tlGMetric;
        if (v === m.graphsMetric) return;
        m.graphsMetric = v;
        m.graphsData = null;
        await this._tlRefetchGraphs(body);
      });
    });
    {
      let _gRangeTimer = null;
      const doRangeRefetch = async (inputEl) => {
        const m = this._tautulliModal;
        if (!m) return;
        const v = Math.max(1, parseInt(inputEl.value) || 1);
        m.graphsRange = v;
        m.graphsData = null;
        await this._tlRefetchGraphs(body);
      };
      const rangeEl = body.querySelector("#tl-g-range");
      if (rangeEl) {
        rangeEl.addEventListener("input", (e) => {
          clearTimeout(_gRangeTimer);
          _gRangeTimer = setTimeout(() => doRangeRefetch(e.target), 700);
        });
        rangeEl.addEventListener("change", (e) => {
          clearTimeout(_gRangeTimer);
          doRangeRefetch(e.target);
        });
      }
    }
    body.querySelector("#tl-g-dd-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const m = this._tautulliModal;
      if (!m) return;
      m.graphsDdOpen = !m.graphsDdOpen;
      const panel = body.querySelector("#tl-g-dd-panel");
      if (panel) panel.style.display = m.graphsDdOpen ? "block" : "none";
    });
    body.addEventListener("click", (e) => {
      const m = this._tautulliModal;
      if (!m || !m.graphsDdOpen) return;
      if (!e.target.closest("#tl-g-dd-wrap")) {
        m.graphsDdOpen = false;
        const panel = body.querySelector("#tl-g-dd-panel");
        if (panel) panel.style.display = "none";
      }
    });
    body.querySelector("#tl-g-dd-all")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const m = this._tautulliModal;
      if (!m) return;
      m.graphsSelectedUsers = null;
      m.graphsData = null;
      await this._tlRefetchGraphs(body);
    });
    body.querySelector("#tl-g-dd-none")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const m = this._tautulliModal;
      if (!m) return;
      m.graphsSelectedUsers = /* @__PURE__ */ new Set();
      m.graphsData = null;
      await this._tlRefetchGraphs(body);
    });
    body.querySelectorAll("[data-tl-g-uid]").forEach((item) => {
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        const m = this._tautulliModal;
        if (!m) return;
        const uid = item.dataset.tlGUid;
        const sel = m.graphsSelectedUsers;
        if (sel && sel.size === 1 && sel.has(uid)) {
          m.graphsSelectedUsers = null;
        } else {
          m.graphsSelectedUsers = /* @__PURE__ */ new Set([uid]);
        }
        m.graphsData = null;
        m.graphsDdOpen = true;
        await this._tlRefetchGraphs(body);
        const panel = body.querySelector("#tl-g-dd-panel");
        if (panel) panel.style.display = "block";
      });
    });
    const _tlGVBW = 1e3, _tlGSVH = 200;
    const _tlGRoundedTopJS = (x, y, w, h, rx, ry) => {
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (rx < 0.5 || ry < 0.5) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
      const f = (n) => n.toFixed(2);
      return `M${f(x)},${f(y + h)} L${f(x)},${f(y + ry)} Q${f(x)},${f(y)} ${f(x + rx)},${f(y)} L${f(x + w - rx)},${f(y)} Q${f(x + w)},${f(y)} ${f(x + w)},${f(y + ry)} L${f(x + w)},${f(y + h)} Z`;
    };
    const fixSvgDots = (svg) => {
      const svgW = svg.getBoundingClientRect().width;
      if (!svgW) return;
      const scaleX = svgW / _tlGVBW;
      svg.querySelectorAll("circle").forEach((c) => {
        const r = parseFloat(c.getAttribute("r")) || 0;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        el.setAttribute("cx", c.getAttribute("cx") || "0");
        el.setAttribute("cy", c.getAttribute("cy") || "0");
        el.setAttribute("rx", String(r));
        el.setAttribute("ry", String(r * scaleX));
        el.setAttribute("data-tl-dot-r", String(r));
        const fill = c.getAttribute("fill");
        if (fill) el.setAttribute("fill", fill);
        const styl = c.getAttribute("style");
        if (styl) el.setAttribute("style", styl);
        c.parentNode.replaceChild(el, c);
      });
      svg.querySelectorAll("ellipse[data-tl-dot-r]").forEach((el) => {
        const r = parseFloat(el.getAttribute("data-tl-dot-r")) || 0;
        el.setAttribute("ry", String(r * scaleX));
      });
      svg.querySelectorAll("path[data-tl-rr]").forEach((p) => {
        const rr = parseFloat(p.getAttribute("data-tl-rr")) || 0;
        const bx = parseFloat(p.getAttribute("data-tl-bx")) || 0;
        const by = parseFloat(p.getAttribute("data-tl-by")) || 0;
        const bw = parseFloat(p.getAttribute("data-tl-bw")) || 0;
        const bh = parseFloat(p.getAttribute("data-tl-bh")) || 0;
        p.setAttribute("d", _tlGRoundedTopJS(bx, by, bw, bh, rr, rr * scaleX));
      });
    };
    requestAnimationFrame(() => {
      body.querySelectorAll(".tl-g-svg").forEach((svg) => {
        fixSvgDots(svg);
        if (typeof ResizeObserver !== "undefined") {
          const ro = new ResizeObserver(() => fixSvgDots(svg));
          ro.observe(svg);
        }
      });
    });
    body.querySelectorAll(".tl-g-card").forEach((card) => {
      let activeCol = null;
      const tipEl = card.querySelector(".tl-g-tip");
      if (!tipEl) return;
      const showColTip = (colData, eClientX, eClientY) => {
        if (!colData.vals || !colData.vals.length) return;
        const lbl = colData.lbl || "";
        const rows = colData.vals.map((v) => {
          const disp = v.fv != null ? v.fv : v.v;
          return `<div style="display:flex;align-items:center;gap:6px;padding:1px 0">
            <span style="width:6px;height:6px;border-radius:1px;background:${v.hex || "var(--is-text-muted)"};flex-shrink:0"></span>
            <span style="color:var(--is-text-muted)">${v.n}</span>
            <span style="font-weight:600;color:var(--is-text);margin-left:auto;padding-left:10px">${disp}</span>
          </div>`;
        }).join("");
        const totDisp = colData.ftot != null ? colData.ftot : colData.tot;
        const totRow = totDisp != null ? `<div style="display:flex;justify-content:space-between;border-top:1px solid var(--is-divider);margin-top:4px;padding-top:4px">
               <span style="color:var(--is-text-muted);font-weight:600">Total</span>
               <span style="font-weight:700;color:var(--is-text)">${totDisp}</span>
             </div>` : "";
        tipEl.innerHTML = `<div style="font-size:10px;color:var(--is-text-muted);margin-bottom:4px">${lbl}</div>${rows}${totRow}`;
        const cardRect = tipEl.parentElement.getBoundingClientRect();
        let tipLeft = eClientX - cardRect.left;
        let tipTop = eClientY - cardRect.top - 8;
        tipEl.style.display = "block";
        tipEl.style.left = "0";
        tipEl.style.top = "0";
        const tipW = tipEl.offsetWidth, tipH = tipEl.offsetHeight, contW = cardRect.width;
        tipLeft = Math.max(4, Math.min(tipLeft - tipW / 2, contW - tipW - 4));
        tipTop = Math.max(4, tipTop - tipH);
        tipEl.style.left = tipLeft + "px";
        tipEl.style.top = tipTop + "px";
      };
      const clearHighlights = () => card.querySelectorAll(".tl-g-lhlt").forEach((r) => r.style.opacity = "0");
      const hideTip = () => {
        tipEl.style.display = "none";
        activeCol = null;
        clearHighlights();
      };
      card.addEventListener("click", (e) => {
        const lcol = e.target.closest(".tl-g-lcol");
        if (lcol) {
          if (lcol === activeCol) {
            hideTip();
            return;
          }
          clearHighlights();
          activeCol = lcol;
          const hlt = lcol.querySelector(".tl-g-lhlt");
          if (hlt) hlt.style.opacity = "1";
          let colData2;
          try {
            colData2 = JSON.parse(lcol.dataset.tlGCol);
          } catch {
            return;
          }
          showColTip(colData2, e.clientX, e.clientY);
          return;
        }
        const col = e.target.closest(".tl-g-col");
        if (!col || !col.dataset.tlGCol) {
          hideTip();
          return;
        }
        if (col === activeCol) {
          hideTip();
          return;
        }
        clearHighlights();
        activeCol = col;
        let colData;
        try {
          colData = JSON.parse(col.dataset.tlGCol);
        } catch {
          return;
        }
        showColTip(colData, e.clientX, e.clientY);
      });
    });
  }
};
var wireTautulliMixin = _WireTautulliMethods.prototype;

// src/wire/jellystat.js
var _WireJellystatMethods = class {
  _wireJellystatPosters(right) {
    right.addEventListener("click", (e) => {
      const card = e.target.closest("[data-js-open]");
      if (!card) return;
      this._openJellystatModal(card.dataset.jsOpen);
    });
  }
  _wireJellystatModal(el) {
    el.querySelector("#js-close")?.addEventListener("click", () => this._closeJellystatModal());
    el.addEventListener("click", (e) => {
      if (e.target === el) this._closeJellystatModal();
    });
    el.querySelectorAll("[data-js-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.jsTab;
        if (!t || !this._jellystatModal) return;
        el.querySelectorAll("[data-js-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        this._jellystatModal.tab = t;
        const titleEl = el.querySelector("#js-hdr-title");
        if (titleEl) titleEl.textContent = this._jsTabTitle(t);
        this._jsLoadTab(t, el);
      });
    });
  }
  _wireJellystatModalBody(body) {
    body.querySelector("#js-libs-search")?.addEventListener("input", (e) => {
      if (!this._jellystatModal) return;
      const pos = e.target.selectionStart;
      this._jellystatModal.libsSearch = e.target.value || "";
      this._jellystatModal.libsPage = 0;
      body.innerHTML = this._jsBodyLibraries();
      this._wireJellystatModalBody(body);
      const inp = body.querySelector("#js-libs-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(pos, pos);
      }
    });
    body.querySelectorAll("[data-js-lib-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const col = th.dataset.jsLibSort;
        if (this._jellystatModal.libsSortCol === col) {
          this._jellystatModal.libsSortDir = this._jellystatModal.libsSortDir === "asc" ? "desc" : "asc";
        } else {
          this._jellystatModal.libsSortCol = col;
          this._jellystatModal.libsSortDir = "desc";
        }
        this._jellystatModal.libsPage = 0;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelectorAll("[data-js-lpage]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const m = this._jellystatModal;
        const perPage = this._tlCalcPerPage();
        const totalPages = Math.max(1, Math.ceil((m.libsData?.length || 0) / perPage));
        const val = btn.dataset.jsLpage;
        let p = m.libsPage || 0;
        if (val === "first") p = 0;
        else if (val === "prev") p = Math.max(0, p - 1);
        else if (val === "next") p = Math.min(totalPages - 1, p + 1);
        else if (val === "last") p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.libsPage) return;
        m.libsPage = p;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-libs-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.libsColsOpen = !this._jellystatModal.libsColsOpen;
      const menu = body.querySelector("#js-libs-cols-menu");
      if (menu) menu.style.display = this._jellystatModal.libsColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-js-lib-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden("libsHiddenCols", ["type"]);
        const col = item.dataset.jsLibCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.libsColsOpen = true;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-libs-mob-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.libsMobColsOpen = !this._jellystatModal.libsMobColsOpen;
      const menu = body.querySelector("#js-libs-mob-cols-menu");
      if (menu) menu.style.display = this._jellystatModal.libsMobColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-js-lib-mob-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden("libsMobHiddenCols", ["type"]);
        const col = item.dataset.jsLibMobCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.libsMobColsOpen = true;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-users-search")?.addEventListener("input", (e) => {
      if (!this._jellystatModal) return;
      const pos = e.target.selectionStart;
      this._jellystatModal.usersSearch = e.target.value || "";
      this._jellystatModal.usersPage = 0;
      body.innerHTML = this._jsBodyUsers();
      this._wireJellystatModalBody(body);
      const inp = body.querySelector("#js-users-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(pos, pos);
      }
    });
    body.querySelectorAll("[data-js-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const col = th.dataset.jsSort;
        if (this._jellystatModal.usersSortCol === col) {
          this._jellystatModal.usersSortDir = this._jellystatModal.usersSortDir === "asc" ? "desc" : "asc";
        } else {
          this._jellystatModal.usersSortCol = col;
          this._jellystatModal.usersSortDir = "desc";
        }
        this._jellystatModal.usersPage = 0;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelectorAll("[data-js-upage]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const m = this._jellystatModal;
        const perPage = this._tlCalcPerPage();
        const totalPages = Math.max(1, Math.ceil((m.usersData?.length || 0) / perPage));
        const val = btn.dataset.jsUpage;
        let p = m.usersPage || 0;
        if (val === "first") p = 0;
        else if (val === "prev") p = Math.max(0, p - 1);
        else if (val === "next") p = Math.min(totalPages - 1, p + 1);
        else if (val === "last") p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.usersPage) return;
        m.usersPage = p;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-users-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.usersColsOpen = !this._jellystatModal.usersColsOpen;
      const menu = body.querySelector("#js-users-cols-menu");
      if (menu) menu.style.display = this._jellystatModal.usersColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-js-usr-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden("usersHiddenCols", ["userId"]);
        const col = item.dataset.jsUsrCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.usersColsOpen = true;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-users-mob-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.usersMobColsOpen = !this._jellystatModal.usersMobColsOpen;
      const menu = body.querySelector("#js-users-mob-cols-menu");
      if (menu) menu.style.display = this._jellystatModal.usersMobColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-js-usr-mob-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden("usersMobHiddenCols", ["lastSeen", "userId"]);
        const col = item.dataset.jsUsrMobCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.usersMobColsOpen = true;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-hist-user-sel")?.addEventListener("change", async (e) => {
      if (!this._jellystatModal) return;
      this._jellystatModal.histUser = e.target.value || null;
      this._jellystatModal.histPage = 0;
      await this._jsRefetchHistory(body);
    });
    body.querySelectorAll("[data-js-hist-pm]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._jellystatModal) return;
        this._jellystatModal.histPlayMethod = btn.dataset.jsHistPm || null;
        this._jellystatModal.histPage = 0;
        await this._jsRefetchHistory(body);
      });
    });
    {
      let _jsHistTimer = null;
      body.querySelector("#js-hist-search")?.addEventListener("input", (e) => {
        if (!this._jellystatModal) return;
        this._jellystatModal.histSearch = e.target.value || "";
        this._jellystatModal.histPage = 0;
        clearTimeout(_jsHistTimer);
        _jsHistTimer = setTimeout(async () => {
          const inp0 = body.querySelector("#js-hist-search");
          const sel0 = inp0?.selectionStart ?? null;
          await this._jsRefetchHistory(body);
          const inp = body.querySelector("#js-hist-search");
          if (inp && sel0 !== null) {
            inp.focus();
            inp.setSelectionRange(sel0, sel0);
          }
        }, 400);
      });
    }
    body.querySelectorAll("[data-js-hpage]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this._jellystatModal) return;
        const m = this._jellystatModal;
        const perPage = this._tlCalcPerPage({ hasFilter: true });
        const totalPages = Math.max(1, Math.ceil(m.histTotal / perPage));
        const val = btn.dataset.jsHpage;
        let p = m.histPage || 0;
        if (val === "first") p = 0;
        else if (val === "prev") p = Math.max(0, p - 1);
        else if (val === "next") p = Math.min(totalPages - 1, p + 1);
        else if (val === "last") p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.histPage) return;
        m.histPage = p;
        await this._jsRefetchHistory(body);
      });
    });
    body.querySelector("#js-hist-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.histColsOpen = !this._jellystatModal.histColsOpen;
      const menu = body.querySelector("#js-hist-cols-menu");
      if (menu) menu.style.display = this._jellystatModal.histColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-js-hist-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden("histHiddenCols", ["playMethod"]);
        const col = item.dataset.jsHistCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.histColsOpen = true;
        body.innerHTML = this._jsBodyHistory();
        this._wireJellystatModalBody(body);
      });
    });
    body.querySelector("#js-hist-mob-cols-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.histMobColsOpen = !this._jellystatModal.histMobColsOpen;
      const menu = body.querySelector("#js-hist-mob-cols-menu");
      if (menu) menu.style.display = this._jellystatModal.histMobColsOpen ? "block" : "none";
    });
    body.querySelectorAll("[data-js-hist-mob-col]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden("histMobHiddenCols", ["client", "device", "playMethod"]);
        const col = item.dataset.jsHistMobCol;
        if (hidden.has(col)) hidden.delete(col);
        else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.histMobColsOpen = true;
        body.innerHTML = this._jsBodyHistory();
        this._wireJellystatModalBody(body);
      });
    });
    this._wireJsGraphControls(body);
  }
  // ── Graph controls ────────────────────────────────────────────────────────
  _wireJsGraphControls(body) {
    if (!body) return;
    body.querySelectorAll("[data-js-g-metric]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const m = this._jellystatModal;
        if (!m) return;
        const v = btn.dataset.jsGMetric;
        if (v === m.graphsMetric) return;
        m.graphsMetric = v;
        m.graphsData = null;
        await this._jsRefetchGraphs(body);
      });
    });
    {
      let _jsRangeTimer = null;
      const doRangeRefetch = async (inputEl) => {
        const m = this._jellystatModal;
        if (!m) return;
        m.graphsRange = Math.max(1, parseInt(inputEl.value) || 1);
        m.graphsData = null;
        await this._jsRefetchGraphs(body);
      };
      const rangeEl = body.querySelector("#js-g-range");
      if (rangeEl) {
        rangeEl.addEventListener("input", (e) => {
          clearTimeout(_jsRangeTimer);
          _jsRangeTimer = setTimeout(() => doRangeRefetch(e.target), 700);
        });
        rangeEl.addEventListener("change", (e) => {
          clearTimeout(_jsRangeTimer);
          doRangeRefetch(e.target);
        });
      }
    }
    const _VBW = 1e3, _SVH = 200;
    const _fixTop = (x, y, w, h, rx, ry) => {
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (rx < 0.5 || ry < 0.5) return "M" + x + "," + (y + h) + " L" + x + "," + y + " L" + (x + w) + "," + y + " L" + (x + w) + "," + (y + h) + " Z";
      const f = (n) => n.toFixed(2);
      return "M" + f(x) + "," + f(y + h) + " L" + f(x) + "," + f(y + ry) + " Q" + f(x) + "," + f(y) + " " + f(x + rx) + "," + f(y) + " L" + f(x + w - rx) + "," + f(y) + " Q" + f(x + w) + "," + f(y) + " " + f(x + w) + "," + f(y + ry) + " L" + f(x + w) + "," + f(y + h) + " Z";
    };
    const fixSvg = (svg) => {
      const svgW = svg.getBoundingClientRect().width;
      if (!svgW) return;
      const scaleX = svgW / _VBW;
      svg.querySelectorAll("circle").forEach((c) => {
        const r = parseFloat(c.getAttribute("r")) || 0;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        el.setAttribute("cx", c.getAttribute("cx") || "0");
        el.setAttribute("cy", c.getAttribute("cy") || "0");
        el.setAttribute("rx", String(r));
        el.setAttribute("ry", String(r * scaleX));
        el.setAttribute("data-js-dot-r", String(r));
        const fill = c.getAttribute("fill");
        if (fill) el.setAttribute("fill", fill);
        const styl = c.getAttribute("style");
        if (styl) el.setAttribute("style", styl);
        c.parentNode.replaceChild(el, c);
      });
      svg.querySelectorAll("ellipse[data-js-dot-r]").forEach((el) => {
        const r = parseFloat(el.getAttribute("data-js-dot-r")) || 0;
        el.setAttribute("ry", String(r * scaleX));
      });
      svg.querySelectorAll("path[data-tl-rr]").forEach((p) => {
        const rr = parseFloat(p.getAttribute("data-tl-rr")) || 0;
        const bx = parseFloat(p.getAttribute("data-tl-bx")) || 0;
        const by = parseFloat(p.getAttribute("data-tl-by")) || 0;
        const bw = parseFloat(p.getAttribute("data-tl-bw")) || 0;
        const bh = parseFloat(p.getAttribute("data-tl-bh")) || 0;
        p.setAttribute("d", _fixTop(bx, by, bw, bh, rr, rr * scaleX));
      });
    };
    requestAnimationFrame(() => {
      body.querySelectorAll(".tl-g-svg").forEach((svg) => {
        fixSvg(svg);
        if (typeof ResizeObserver !== "undefined") {
          const ro = new ResizeObserver(() => fixSvg(svg));
          ro.observe(svg);
        }
      });
    });
    body.querySelectorAll(".tl-g-card").forEach((card) => {
      let activeCol = null;
      const tipEl = card.querySelector(".tl-g-tip");
      if (!tipEl) return;
      const showColTip = (colData, eClientX, eClientY) => {
        if (!colData.vals || !colData.vals.length) return;
        const lbl = colData.lbl || "";
        const rows = colData.vals.map((v) => {
          const disp = v.fv != null ? v.fv : v.v;
          return '<div style="display:flex;align-items:center;gap:6px;padding:1px 0"><span style="width:6px;height:6px;border-radius:1px;background:' + (v.hex || "var(--is-text-muted)") + ';flex-shrink:0"></span><span style="color:var(--is-text-muted)">' + v.n + '</span><span style="font-weight:600;color:var(--is-text);margin-left:auto;padding-left:10px">' + disp + "</span></div>";
        }).join("");
        const totDisp = colData.ftot != null ? colData.ftot : colData.tot;
        const totRow = totDisp != null ? '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--is-divider);margin-top:4px;padding-top:4px"><span style="color:var(--is-text-muted);font-weight:600">Total</span><span style="font-weight:700;color:var(--is-text)">' + totDisp + "</span></div>" : "";
        tipEl.innerHTML = '<div style="font-size:10px;color:var(--is-text-muted);margin-bottom:4px">' + lbl + "</div>" + rows + totRow;
        const cardRect = tipEl.parentElement.getBoundingClientRect();
        let tipLeft = eClientX - cardRect.left;
        let tipTop = eClientY - cardRect.top - 8;
        tipEl.style.display = "block";
        tipEl.style.left = "0";
        tipEl.style.top = "0";
        const tipW = tipEl.offsetWidth, tipH = tipEl.offsetHeight, contW = cardRect.width;
        tipLeft = Math.max(4, Math.min(tipLeft - tipW / 2, contW - tipW - 4));
        tipTop = Math.max(4, tipTop - tipH);
        tipEl.style.left = tipLeft + "px";
        tipEl.style.top = tipTop + "px";
      };
      const clearHighlights = () => card.querySelectorAll(".tl-g-lhlt").forEach((r) => r.style.opacity = "0");
      const hideTip = () => {
        tipEl.style.display = "none";
        activeCol = null;
        clearHighlights();
      };
      card.addEventListener("click", (e) => {
        const lcol = e.target.closest(".tl-g-lcol");
        if (lcol) {
          if (lcol === activeCol) {
            hideTip();
            return;
          }
          clearHighlights();
          activeCol = lcol;
          const hlt = lcol.querySelector(".tl-g-lhlt");
          if (hlt) hlt.style.opacity = "1";
          let colData2;
          try {
            colData2 = JSON.parse(lcol.dataset.tlGCol);
          } catch {
            return;
          }
          showColTip(colData2, e.clientX, e.clientY);
          return;
        }
        const col = e.target.closest(".tl-g-col");
        if (!col || !col.dataset.tlGCol) {
          hideTip();
          return;
        }
        if (col === activeCol) {
          hideTip();
          return;
        }
        clearHighlights();
        activeCol = col;
        let colData;
        try {
          colData = JSON.parse(col.dataset.tlGCol);
        } catch {
          return;
        }
        showColTip(colData, e.clientX, e.clientY);
      });
    });
  }
};
var wireJellystatMixin = _WireJellystatMethods.prototype;

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
        const radarrId = card.dataset.radarrid ? parseInt(card.dataset.radarrid, 10) : null;
        const radarr2Id = card.dataset.radarr2id ? parseInt(card.dataset.radarr2id, 10) : null;
        this._openPopup(type, tmdbId, tvdbId, title, radarrId, radarr2Id);
      });
    });
    this.shadowRoot.querySelectorAll(".mc[data-stream-entity]").forEach((card) => {
      card.addEventListener("click", () => {
        this._openStreamPopup(
          card.dataset.streamEntity,
          card.dataset.streamType || "",
          card.dataset.streamTitle || "",
          card.dataset.streamSeries || ""
        );
      });
    });
  }
  // ─────────────────────────────────────────────
  // Stream popup — open from stream card click
  // ─────────────────────────────────────────────
  async _openStreamPopup(entityId, contentType, trackTitle, seriesTitle) {
    const isMusic = contentType === "music" || contentType === "artist" || contentType === "album";
    const streamAttr = this._hass?.states?.[entityId]?.attributes || {};
    const isLiveTV = contentType === "channel" || !!streamAttr.media_channel || streamAttr.media_library_title === "Live TV";
    const isTV = isLiveTV || contentType === "tvshow" || contentType === "episode" || !!seriesTitle || !!streamAttr.media_series_title;
    if (isMusic) {
      const s = this._hass?.states?.[entityId];
      const attr = s?.attributes || {};
      this._popup = {
        _type: POPUP_TYPE.STREAM,
        _streamEntity: entityId,
        _streamState: s?.state || "idle",
        title: attr.media_title || "",
        _artist: attr.media_artist || "",
        _album: attr.media_album_name || "",
        _duration: attr.media_duration || 0,
        _position: attr.media_position || 0,
        _updatedAt: attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now(),
        _poster: attr.entity_picture || null
      };
      this._renderPopupEl();
      if (entityId.startsWith("media_player.plex_")) this._fetchPlexMachineId(entityId);
      return;
    }
    if (isTV) {
      const lookupTitle = seriesTitle || trackTitle;
      const lt = lookupTitle.toLowerCase();
      const _snMatch = (arr) => (arr || []).find((s3) => {
        const st = s3.title?.toLowerCase() || "";
        return st === lt || st.includes(lt) || lt.includes(st);
      });
      const s = _snMatch(this._sonarr);
      const s2 = !s && _snMatch(this._sonarr2);
      const snHit = s || s2;
      if (snHit) {
        const popType = snHit === s ? POPUP_TYPE.SONARR : POPUP_TYPE.SONARR;
        await this._openPopup(popType, snHit.tmdbId ? String(snHit.tmdbId) : null, snHit.tvdbId ? String(snHit.tvdbId) : null, snHit.title);
      } else if (this._overseerrConfigured !== false) {
        let tvTmdbId = null;
        try {
          const sr = await this._hass.callApi("POST", "arr_stack/overseerr/search", { query: lookupTitle, page: 1 });
          const hit2 = (sr?.results || []).find((r) => r.mediaType === "tv");
          if (hit2?.id) tvTmdbId = String(hit2.id);
        } catch (_) {
        }
        await this._openPopup(POPUP_TYPE.TV, tvTmdbId, null, lookupTitle);
      } else {
        await this._openPopup(POPUP_TYPE.TV, null, null, lookupTitle);
      }
      if (this._popup) {
        this._popup._noIS = isLiveTV;
        this._attachStreamData(entityId);
        this._renderPopupEl();
      }
      return;
    }
    const titleNoYear = trackTitle.replace(/\s*\(\d{4}\)\s*$/, "").trim();
    const _normT = (s) => (s || "").toLowerCase().replace(/\s*\(\d{4}\)\s*$/, "").trim();
    this._popup = { _loading: true, title: trackTitle };
    this._renderPopupEl();
    let sessionTmdbId = null;
    if (entityId.startsWith("media_player.plex_") || entityId.startsWith("media_player.plex ")) {
      try {
        const raw = await this._hass.callApi("GET", "arr_stack/plex/sessions");
        const sessions = raw?.MediaContainer?.Metadata || [];
        const attr = this._hass?.states?.[entityId]?.attributes || {};
        const rawTitle = (attr.media_title || "").replace(/\s*\(\d{4}\)\s*$/, "").toLowerCase().trim();
        const mediaPos = attr.media_position || 0;
        let match = sessions.find((s) => {
          if (!rawTitle) return false;
          const st = (s.title || "").toLowerCase();
          const titleOk = st === rawTitle;
          const posOk = Math.abs((s.viewOffset || 0) / 1e3 - mediaPos) < 60;
          return titleOk && posOk;
        });
        if (!match) match = sessions.find((s) => rawTitle && (s.title || "").toLowerCase() === rawTitle);
        if (!match && sessions.length === 1) match = sessions[0];
        if (match?.Guid) {
          for (const g of Array.isArray(match.Guid) ? match.Guid : []) {
            if (g.id?.startsWith("tmdb://")) sessionTmdbId = g.id.replace("tmdb://", "");
          }
        }
      } catch (_) {
      }
    }
    if (sessionTmdbId) {
      const radarrByTmdb = (this._radarr || []).find((m3) => m3.tmdbId && String(m3.tmdbId) === sessionTmdbId);
      const radarr2ByTmdb = !radarrByTmdb && (this._radarr2 || []).find((m3) => m3.tmdbId && String(m3.tmdbId) === sessionTmdbId);
      await this._openPopup(
        radarrByTmdb || radarr2ByTmdb ? POPUP_TYPE.RADARR : POPUP_TYPE.MOVIE,
        sessionTmdbId,
        null,
        titleNoYear,
        radarrByTmdb?.id ?? null,
        radarr2ByTmdb?.id ?? null
      );
      if (this._popup) {
        this._attachStreamData(entityId);
        this._renderPopupEl();
      }
      return;
    }
    const _titleMatch = (entry) => {
      const ql = _normT(trackTitle);
      const qn = _normT(titleNoYear);
      return [entry.title, entry.sortTitle, entry.originalTitle].some((t) => {
        const tl = _normT(t);
        return tl && (tl === ql || tl === qn);
      });
    };
    const m = (this._radarr || []).find((m3) => _titleMatch(m3));
    const m2 = !m && (this._radarr2 || []).find((m3) => _titleMatch(m3));
    const hit = m || m2;
    if (hit) {
      let hitTmdbId = hit.tmdbId ? String(hit.tmdbId) : null;
      if (!hitTmdbId && this._overseerrConfigured !== false) {
        try {
          const sr = await this._hass.callApi("POST", "arr_stack/overseerr/search", { query: titleNoYear, page: 1 });
          const qt = _normT(titleNoYear);
          const oh = (sr?.results || []).find((r) => {
            if (r.mediaType !== "movie") return false;
            const rt = _normT(r.title);
            const ort = _normT(r.originalTitle || "");
            return rt === qt || ort === qt || rt.includes(qt) || qt.includes(rt);
          });
          if (oh?.id) hitTmdbId = String(oh.id);
        } catch (_) {
        }
      }
      await this._openPopup(POPUP_TYPE.RADARR, hitTmdbId, null, hit.title, m?.id ?? null, m2?.id ?? null);
      if (this._popup) {
        this._attachStreamData(entityId);
        this._renderPopupEl();
      }
    } else {
      const _trackYear = trackTitle.match(/\((\d{4})\)/)?.[1] || null;
      let movieTmdbId = null;
      if (this._overseerrConfigured !== false) {
        try {
          const sr = await this._hass.callApi("POST", "arr_stack/overseerr/search", { query: titleNoYear, page: 1 });
          const qt = _normT(titleNoYear);
          const oh = (sr?.results || []).find((r) => {
            if (r.mediaType !== "movie") return false;
            const rt = _normT(r.title);
            const ort = _normT(r.originalTitle || "");
            if (rt === qt || ort === qt || rt.includes(qt) || qt.includes(rt)) return true;
            return !!(_trackYear && r.releaseDate?.startsWith(_trackYear));
          });
          if (oh?.id) movieTmdbId = String(oh.id);
        } catch (_) {
        }
      }
      if (movieTmdbId) {
        const radarrByTmdb = (this._radarr || []).find((m3) => m3.tmdbId && String(m3.tmdbId) === movieTmdbId);
        const radarr2ByTmdb = !radarrByTmdb && (this._radarr2 || []).find((m3) => m3.tmdbId && String(m3.tmdbId) === movieTmdbId);
        if (radarrByTmdb || radarr2ByTmdb) {
          await this._openPopup(POPUP_TYPE.RADARR, movieTmdbId, null, titleNoYear, radarrByTmdb?.id ?? null, radarr2ByTmdb?.id ?? null);
        } else {
          await this._openPopup(POPUP_TYPE.MOVIE, movieTmdbId, null, titleNoYear);
        }
        if (this._popup) {
          this._attachStreamData(entityId);
          this._renderPopupEl();
        }
      } else {
        this._popup = {
          _type: POPUP_TYPE.STREAM,
          _streamEntity: entityId,
          _streamState: this._hass?.states?.[entityId]?.state || "idle",
          title: trackTitle,
          _artist: "",
          _album: "",
          _duration: streamAttr.media_duration || 0,
          _position: streamAttr.media_position || 0,
          _updatedAt: streamAttr.media_position_updated_at ? new Date(streamAttr.media_position_updated_at).getTime() : Date.now(),
          _poster: streamAttr.entity_picture || null,
          _noIS: false
        };
        this._renderPopupEl();
      }
    }
  }
  // Attach live stream data to current popup (called after _openPopup for movie/TV from stream card)
  _attachStreamData(entityId) {
    if (!this._popup) return;
    const s = this._hass?.states?.[entityId];
    const attr = s?.attributes || {};
    this._popup._streamEntity = entityId;
    this._popup._streamState = s?.state || "idle";
    this._popup._duration = attr.media_duration || 0;
    this._popup._position = attr.media_position || 0;
    this._popup._updatedAt = attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now();
    this._popup._plexMachineId = null;
    if (entityId.startsWith("media_player.plex_")) this._fetchPlexMachineId(entityId);
  }
  async _fetchPlexMachineId(entityId) {
    try {
      const [raw, clientsRaw] = await Promise.all([
        this._hass.callApi("GET", "arr_stack/plex/sessions"),
        this._hass.callApi("GET", "arr_stack/plex/clients").catch(() => null)
      ]);
      const clients = clientsRaw?.MediaContainer?.Server || [];
      const sessions = raw?.MediaContainer?.Metadata || [];
      if (!sessions.length) return;
      const attr = this._hass?.states?.[entityId]?.attributes || {};
      const rawTitle = (attr.media_title || "").replace(/\s*\(\d{4}\)\s*$/, "").trim().toLowerCase();
      const mediaPos = attr.media_position || 0;
      let match = sessions.find((s) => {
        if (!s.Player?.machineIdentifier) return false;
        const sTitle = (s.title || "").toLowerCase();
        const titleOk = rawTitle && sTitle === rawTitle;
        const posOk = Math.abs((s.viewOffset || 0) / 1e3 - mediaPos) < 60;
        return titleOk && posOk;
      });
      if (!match) match = sessions.find((s) => rawTitle && (s.title || "").toLowerCase() === rawTitle);
      if (!match && sessions.length === 1 && sessions[0].Player?.machineIdentifier) match = sessions[0];
      const p = match?.Player;
      if (p && this._popup) {
        this._popup._plexMachineId = p.machineIdentifier;
        this._popup._plexSessionId = match?.Session?.id || match?.sessionKey || "";
        this._popup._plexSessionKey = match?.sessionKey || "";
        this._popup._plexUser = match?.User?.title || "";
        this._popup._plexUserThumb = match?.User?.thumb || "";
        const port = p.port || (p.secure ? 32433 : 32500);
        const protocol = p.secure ? "https" : "http";
        this._popup._plexPlayerUrl = p.platform === "tvOS" && p.address ? `${protocol}://${p.address}:${port}` : null;
        this._renderPopupEl();
      }
    } catch (_) {
    }
  }
  // Seek via HA media_seek, or fall back to Plex direct API when HA seek unsupported
  _doSeek(entityId, newPos) {
    const supported = this._hass?.states?.[entityId]?.attributes?.supported_features || 0;
    const canSeek = !!(supported & 2);
    if (canSeek) {
      this._hass.callService("media_player", "media_seek", { entity_id: entityId, seek_position: newPos });
      return;
    }
    const machineId = this._popup?._plexMachineId;
    if (machineId) {
      this._hass.callApi("POST", "arr_stack/plex/player", {
        action: "seekTo",
        machineIdentifier: machineId,
        offset: Math.round(newPos * 1e3),
        playerUrl: this._popup?._plexPlayerUrl || null
      }).catch(() => {
      });
    }
  }
  // Update all progress fills for an entity across card + popup (call after seek)
  _updateStreamFills(entityId, newPos, dur) {
    const pct = dur > 0 ? Math.min(newPos / dur * 100, 100).toFixed(2) : 0;
    const now = Date.now().toString();
    this.shadowRoot?.querySelectorAll(`.stream-prog-fill[data-entity="${entityId}"]`).forEach((f) => {
      f.style.width = pct + "%";
      f.dataset.pos = newPos.toFixed(2);
      f.dataset.updated = now;
    });
  }
  // Sync music popup to current hass state (called from _renderStreams on each refresh)
  _syncStreamPopup() {
    const d = this._popup;
    if (!d || !d._streamEntity) return;
    const s = this._hass?.states?.[d._streamEntity];
    if (!s) return;
    const attr = s.attributes || {};
    if (d._type === POPUP_TYPE.STREAM) {
      if (d._plexTerminated) return;
      if (attr.media_title === d.title && s.state === d._streamState) return;
      this._popup = {
        ...d,
        _streamState: s.state,
        title: attr.media_title || d.title,
        _artist: attr.media_artist || "",
        _album: attr.media_album_name || "",
        _duration: attr.media_duration || 0,
        _position: attr.media_position || 0,
        _updatedAt: attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now(),
        _poster: attr.entity_picture || null
      };
      this._renderPopupEl();
      return;
    }
    if (d._plexTerminated) return;
    if (s.state !== d._streamState) {
      d._streamState = s.state;
      d._position = attr.media_position || 0;
      d._duration = attr.media_duration || 0;
      d._updatedAt = attr.media_position_updated_at ? new Date(attr.media_position_updated_at).getTime() : Date.now();
      const root = this.shadowRoot?.getElementById("popup-root");
      const btn = root?.querySelector('[data-action="stream-playpause"]');
      if (btn) {
        const playing = s.state === "playing";
        btn.innerHTML = playing ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      }
    }
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
  async _openPopup(type, tmdbId, tvdbId, title, radarrId = null, radarr2IdHint = null) {
    this._isState = null;
    this._isInstance = "radarr";
    this._isResults = [];
    this._isFilters = { protocol: "", indexer: "", quality: "", lang: "" };
    this._isSort = { col: null, dir: 1 };
    this._isGrabbing = null;
    this._isGrabbed = /* @__PURE__ */ new Set();
    this._isHistory = {};
    this._isError = null;
    this._removeConfirm = false;
    this._removeInstance = null;
    this._snIsInstance = "sonarr";
    this._snIsOpen = false;
    this._snExpandedSeasons = /* @__PURE__ */ new Set();
    this._snEpisodes = /* @__PURE__ */ new Map();
    this._snActiveIs = null;
    this._snIsState = null;
    this._snIsResults = [];
    this._snIsError = null;
    this._snIsFilter = "all";
    this._snIsFilters = { protocol: "", indexer: "", quality: "", lang: "" };
    this._snIsSort = { col: null, dir: 1 };
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    this._snSeasonsPage = 0;
    this._searchExpand = null;
    this._searchPickInst = null;
    this._asOpen = false;
    this._asInstance = null;
    this._asState = null;
    this._asError = null;
    this._asMovieSearching = false;
    this._asMovieSearched = false;
    this._asSearchingItems = /* @__PURE__ */ new Set();
    this._asSearchedItems = /* @__PURE__ */ new Set();
    let _radarrId = null;
    let _radarr2Id = null;
    if ((type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE) && (radarrId || radarr2IdHint || tmdbId)) {
      if (!radarr2IdHint) {
        _radarrId = radarrId ?? (this._radarr || []).find((m) => String(m.tmdbId) === String(tmdbId))?.id ?? null;
      }
      _radarr2Id = radarr2IdHint ?? (tmdbId ? this._radarr2ByTmdb?.get(String(tmdbId))?.id ?? null : null);
    }
    let _sonarrSeries = null;
    let _sonarr2Series = null;
    if ((type === POPUP_TYPE.SONARR || type === POPUP_TYPE.TV) && (tvdbId || tmdbId)) {
      const sonarrPool = this._sonarrAll || this._sonarr || [];
      _sonarrSeries = sonarrPool.find(
        (s) => tvdbId && String(s.tvdbId) === String(tvdbId) || tmdbId && String(s.tmdbId) === String(tmdbId)
      ) ?? null;
      if (this._sonarr2Configured) {
        _sonarr2Series = (this._sonarr2 || []).find(
          (s) => tvdbId && String(s.tvdbId) === String(tvdbId) || tmdbId && String(s.tmdbId) === String(tmdbId)
        ) ?? null;
      }
    }
    this._popup = { _loading: true, title, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series };
    this._renderPopupEl();
    if (this._overseerrConfigured === false) {
      const local = this._localFallbackData(type, tmdbId, tvdbId, title);
      const _popId = tmdbId ? parseInt(tmdbId) : void 0;
      const _popTvdb = tvdbId ? parseInt(tvdbId) : void 0;
      this._popup = local ? { ...local, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb } : { title, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb };
      this._renderPopupEl();
      if (tmdbId) {
        const isMovie = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
        const tmdbPath = isMovie ? `arr_stack/tmdb/movie/${tmdbId}` : `arr_stack/tmdb/tv/${tmdbId}`;
        this._callApi("GET", tmdbPath).then((detail) => {
          if (!this._popup || this._popup._type !== type) return;
          const prev = this._popup;
          this._popup = {
            ...prev,
            overview: detail.overview || prev.overview || "",
            posterPath: detail.posterPath || prev.posterPath || null,
            backdropPath: detail.backdropPath || prev.backdropPath || null,
            voteAverage: detail.voteAverage || prev.voteAverage || 0,
            genres: detail.genres?.length ? detail.genres : prev.genres || [],
            releaseDate: detail.releaseDate || prev.releaseDate || "",
            firstAirDate: detail.firstAirDate || prev.firstAirDate || "",
            relatedVideos: detail.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: detail.youTubeTrailerId }] : prev.relatedVideos || []
          };
          this._renderPopupEl();
        }).catch(() => {
        });
      }
      return;
    }
    try {
      let apiPath = "";
      if (type === POPUP_TYPE.TV && tmdbId) {
        apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
      } else if (type === POPUP_TYPE.SONARR && tmdbId) {
        apiPath = `arr_stack/overseerr/tv/${tmdbId}`;
      } else if ((type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE) && tmdbId) {
        apiPath = `arr_stack/overseerr/movie/${tmdbId}`;
      } else {
        throw new Error("no_id");
      }
      const data = await this._hass.callApi("GET", apiPath);
      if ((type === POPUP_TYPE.TV || type === POPUP_TYPE.SONARR) && !_sonarrSeries && data.externalIds?.tvdbId) {
        const tvdbFromDetail = String(data.externalIds.tvdbId);
        let sonarrPool = this._sonarrAll || this._sonarr || [];
        _sonarrSeries = sonarrPool.find((s) => String(s.tvdbId) === tvdbFromDetail) ?? null;
        if (!_sonarrSeries) {
          await this._fetchSonarr();
          sonarrPool = this._sonarrAll || this._sonarr || [];
          _sonarrSeries = sonarrPool.find((s) => String(s.tvdbId) === tvdbFromDetail) ?? null;
        }
      }
      this._popup = { ...data, _type: type, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series };
      if (_sonarrSeries || type === POPUP_TYPE.TV || type === POPUP_TYPE.SONARR) {
        this._fetchSonarrQueue("sonarr").then(() => this._renderPopupEl());
        if (this._sonarr2Configured !== false)
          this._fetchSonarrQueue("sonarr2").then(() => this._renderPopupEl());
      }
      if (tmdbId && (!data.overview || !data.relatedVideos?.length)) {
        const _isMovie = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
        const _tmdbPath = _isMovie ? `arr_stack/tmdb/movie/${tmdbId}` : `arr_stack/tmdb/tv/${tmdbId}`;
        this._callApi("GET", _tmdbPath).then((detail) => {
          if (!this._popup || this._popup._type !== type) return;
          const prev = this._popup;
          this._popup = {
            ...prev,
            overview: detail.overview || prev.overview || "",
            posterPath: detail.posterPath || prev.posterPath || null,
            backdropPath: detail.backdropPath || prev.backdropPath || null,
            voteAverage: detail.voteAverage || prev.voteAverage || 0,
            genres: detail.genres?.length ? detail.genres : prev.genres || [],
            releaseDate: detail.releaseDate || prev.releaseDate || "",
            firstAirDate: detail.firstAirDate || prev.firstAirDate || "",
            relatedVideos: detail.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: detail.youTubeTrailerId }] : prev.relatedVideos || []
          };
          this._renderPopupEl();
        }).catch(() => {
        });
      }
    } catch (e) {
      console.error("[arr-card] popup fetch error:", e);
      const local = this._localFallbackData(type, tmdbId, tvdbId, title);
      const _popId = tmdbId ? parseInt(tmdbId) : void 0;
      const _popTvdb = tvdbId ? parseInt(tvdbId) : void 0;
      this._popup = local ? { ...local, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, id: _popId, _tvdbId: _popTvdb } : { title, _radarrId, _radarr2Id, _sonarrSeries, _sonarr2Series, _error: e.message, id: _popId, _tvdbId: _popTvdb };
      if (tmdbId) {
        const _isMovie = type === POPUP_TYPE.RADARR || type === POPUP_TYPE.MOVIE;
        const _tmdbPath = _isMovie ? `arr_stack/tmdb/movie/${tmdbId}` : `arr_stack/tmdb/tv/${tmdbId}`;
        const _snapType = type;
        this._callApi("GET", _tmdbPath).then((detail) => {
          if (!this._popup || this._popup._type !== _snapType) return;
          const prev = this._popup;
          this._popup = {
            ...prev,
            overview: detail.overview || prev.overview || "",
            posterPath: detail.posterPath || prev.posterPath || null,
            backdropPath: detail.backdropPath || prev.backdropPath || null,
            voteAverage: detail.voteAverage || prev.voteAverage || 0,
            genres: detail.genres?.length ? detail.genres : prev.genres || [],
            releaseDate: detail.releaseDate || prev.releaseDate || "",
            firstAirDate: detail.firstAirDate || prev.firstAirDate || "",
            relatedVideos: detail.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: detail.youTubeTrailerId }] : prev.relatedVideos || []
          };
          this._renderPopupEl();
        }).catch(() => {
        });
      }
    }
    this._renderPopupEl();
  }
  // Build popup data from local arrays when Overseerr is unavailable/fails
  _localFallbackData(type, tmdbId, tvdbId, title) {
    if (type === POPUP_TYPE.TV) {
      const show = this._tvUpcoming?.find((m) => String(m.id) === String(tmdbId)) || (this._searchResults || []).find((m) => m.mediaType === "tv" && (tmdbId && String(m.id) === String(tmdbId) || tvdbId && String(m.tvdbId) === String(tvdbId)));
      if (show) return {
        _type: POPUP_TYPE.TV,
        _localData: true,
        title: show.name || show.originalName || title,
        overview: show.overview || "",
        firstAirDate: show.firstAirDate || "",
        genres: (show.genreIds || []).map((id) => ({ name: String(id) })),
        ratings: show.ratings || {},
        images: show.images || [],
        _localPosterUrl: show.posterPath ? show.posterPath.startsWith("http") ? show.posterPath : `https://image.tmdb.org/t/p/w342${show.posterPath}` : null,
        relatedVideos: show.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: show.youTubeTrailerId }] : []
      };
    }
    if (type === POPUP_TYPE.SONARR) {
      let series = tmdbId && this._sonarr.find((s) => String(s.tmdbId) === String(tmdbId)) || tvdbId && this._sonarr.find((s) => String(s.tvdbId) === String(tvdbId));
      if (!series) {
        const ep = this._calendar.find(
          (ep2) => tmdbId && String(ep2.series?.tmdbId) === String(tmdbId) || tvdbId && String(ep2.series?.tvdbId) === String(tvdbId)
        );
        if (ep?.series) series = ep.series;
      }
      if (series) {
        const fanart = series.images?.find((i) => i.coverType === "fanart")?.remoteUrl || null;
        return {
          _type: POPUP_TYPE.SONARR,
          _localData: true,
          title: series.title,
          overview: series.overview || "",
          firstAirDate: series.firstAired || "",
          genres: (series.genres || []).map((g) => typeof g === "string" ? { name: g } : g),
          voteAverage: series.ratings?.tmdb?.value || series.ratings?.imdb?.value || 0,
          _localPosterUrl: this._getSonarrPoster(series),
          _localBackdropUrl: fanart,
          relatedVideos: series.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: series.youTubeTrailerId }] : []
        };
      }
    }
    if (type === POPUP_TYPE.RADARR) {
      const movie = this._radarr.find((m) => tmdbId && String(m.tmdbId) === String(tmdbId));
      if (movie) {
        const fanart = movie.images?.find((i) => i.coverType === "fanart")?.remoteUrl || null;
        return {
          _type: POPUP_TYPE.RADARR,
          _localData: true,
          title: movie.title,
          overview: movie.overview || "",
          releaseDate: movie.digitalRelease || movie.physicalRelease || movie.inCinemas || "",
          genres: (movie.genres || []).map((g) => typeof g === "string" ? { name: g } : g),
          voteAverage: movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0,
          _localPosterUrl: this._getRadarrPoster(movie),
          _localBackdropUrl: fanart,
          relatedVideos: movie.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: movie.youTubeTrailerId }] : []
        };
      }
    }
    if (type === POPUP_TYPE.MOVIE || type === POPUP_TYPE.TV) {
      const _allDiscover = [
        ...this._searchResults || [],
        ...this._upcoming || [],
        ...this._trending || [],
        ...this._popular || [],
        ...this._tvUpcoming || []
      ];
      const sr = _allDiscover.find(
        (m) => tmdbId && String(m.id) === String(tmdbId) || tvdbId && m.tvdbId && String(m.tvdbId) === String(tvdbId)
      );
      if (sr) {
        const posterPath = sr.posterPath || null;
        return {
          _type: type,
          _localData: true,
          title: sr.title || sr.name || title,
          overview: sr.overview || "",
          releaseDate: sr.releaseDate || "",
          firstAirDate: sr.firstAirDate || "",
          genres: sr.genres || [],
          ratings: sr.ratings || {},
          voteAverage: sr.voteAverage || 0,
          images: sr.images || [],
          _tvdbId: sr.tvdbId || null,
          _localPosterUrl: posterPath ? posterPath.startsWith("http") ? posterPath : `https://image.tmdb.org/t/p/w342${posterPath}` : null,
          relatedVideos: sr.youTubeTrailerId ? [{ site: "YouTube", type: "Trailer", key: sr.youTubeTrailerId }] : []
        };
      }
    }
    return { _type: type, _localData: true, title, overview: "", relatedVideos: [] };
  }
  // ─────────────────────────────────────────────
  // Popup: render popup HTML into popup-root
  // ─────────────────────────────────────────────
  _renderPopupEl() {
    if (this._terminateActive) return;
    const root = this.shadowRoot.getElementById("popup-root");
    if (!root) return;
    if (this._streamPopupTimer) {
      clearInterval(this._streamPopupTimer);
      this._streamPopupTimer = null;
    }
    if (!this._popup) {
      root.innerHTML = "";
      return;
    }
    const prevIsWrap = root.querySelector(".is-results-wrap");
    const prevBody = root.querySelector(".popup-body");
    const savedIsScroll = prevIsWrap ? prevIsWrap.scrollTop : 0;
    const savedBodyScroll = prevBody ? prevBody.scrollTop : 0;
    root.innerHTML = this._renderPopup();
    if (savedIsScroll > 0) {
      const newIsWrap = root.querySelector(".is-results-wrap");
      if (newIsWrap) newIsWrap.scrollTop = savedIsScroll;
    }
    if (savedBodyScroll > 0) {
      const newBody = root.querySelector(".popup-body");
      if (newBody) newBody.scrollTop = savedBodyScroll;
    }
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
      const t = e.target.closest("[data-action],[data-isfil],[data-snisfilter],[data-issort],[data-snissort],[data-grab],[data-sngrab],[data-guid],[data-sn-spage]");
      if (!t) return;
      const _closeAS = () => {
        this._asOpen = false;
        this._asExpanded = false;
        this._asState = null;
      };
      const _closeIS = () => {
        this._isState = null;
        this._isExpanded = false;
      };
      const _closeSnIS = () => {
        this._snIsOpen = false;
        this._snIsExpanded = false;
        this._snIsState = null;
        this._snActiveIs = null;
      };
      const _closeRemove = () => {
        this._removeConfirm = false;
      };
      if (t.dataset.action === "search-expand") {
        _closeAS();
        _closeIS();
        _closeSnIS();
        _closeRemove();
        this._searchExpand = "pick";
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "search-collapse") {
        _closeAS();
        _closeIS();
        _closeSnIS();
        _closeRemove();
        this._searchExpand = null;
        this._searchPickInst = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "search-pick-inst") {
        this._searchPickInst = t.dataset.instance;
        this._searchExpand = "pick-mode";
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "search-pick-as") {
        _closeIS();
        _closeSnIS();
        _closeRemove();
        const dd2 = this._popup;
        const _isMovT2 = dd2._type === "radarr" || dd2._type === "movie";
        const inst = this._searchPickInst ?? (_isMovT2 ? dd2._radarrId ? "radarr" : dd2._radarr2Id ? "radarr2" : "radarr" : dd2._sonarrSeries ? "sonarr" : dd2._sonarr2Series ? "sonarr2" : "sonarr");
        if (this._asOpen && this._asInstance === inst) {
          this._asOpen = false;
          this._asState = null;
          this._renderPopupEl();
        } else {
          this._asOpen = true;
          this._asInstance = inst;
          this._asState = null;
          this._asMovieSearching = false;
          this._asMovieSearched = false;
          this._asSearchingItems = /* @__PURE__ */ new Set();
          this._asSearchedItems = /* @__PURE__ */ new Set();
          this._asError = null;
          if (_isMovT2) {
            const mId = inst === "radarr2" ? dd2._radarr2Id : dd2._radarrId;
            if (!mId) {
              this._asState = "confirm";
              this._renderPopupEl();
            } else {
              this._triggerRadarrAutoSearch(inst);
            }
          } else {
            const ss = inst === "sonarr2" ? dd2._sonarr2Series : dd2._sonarrSeries;
            this._asState = ss ? "seasons" : "confirm";
            this._renderPopupEl();
          }
        }
        return;
      }
      if (t.dataset.action === "search-pick-is") {
        _closeAS();
        _closeRemove();
        const dd2 = this._popup;
        const _isMovT2 = dd2._type === "radarr" || dd2._type === "movie";
        const inst = this._searchPickInst ?? (_isMovT2 ? dd2._radarrId ? "radarr" : dd2._radarr2Id ? "radarr2" : "radarr" : dd2._sonarrSeries ? "sonarr" : dd2._sonarr2Series ? "sonarr2" : "sonarr");
        if (_isMovT2) {
          const radarrId = inst === "radarr2" ? dd2._radarr2Id : dd2._radarrId;
          if (this._isState && this._isInstance === inst) {
            this._isState = null;
            this._renderPopupEl();
          } else {
            _closeSnIS();
            this._isInstance = inst;
            this._isState = null;
            if (!radarrId) {
              this._isState = "confirm-add";
              this._renderPopupEl();
            } else {
              this._fetchInteractiveSearch(radarrId, inst);
            }
          }
        } else {
          if (this._snIsOpen && this._snIsInstance === inst) {
            this._snIsOpen = false;
            this._snActiveIs = null;
            this._snIsState = null;
            this._renderPopupEl();
          } else {
            _closeIS();
            this._snIsInstance = inst;
            this._snIsOpen = true;
            this._snActiveIs = null;
            this._snIsState = null;
            this._snSeasonsPage = 0;
            const seriesInInst = inst === "sonarr2" ? dd2._sonarr2Series : dd2._sonarrSeries;
            if (!seriesInInst) {
              this._snIsState = "confirm-add";
            }
            this._renderPopupEl();
          }
        }
        return;
      }
      if (t.dataset.action === "as-confirm-yes") {
        const dd = this._popup;
        const isMovT = dd._type === "radarr" || dd._type === "movie";
        if (isMovT) {
          this._triggerRadarrAutoSearch(this._asInstance);
        } else {
          this._addSeriesForAs(this._asInstance);
        }
        return;
      }
      if (t.dataset.action === "as-confirm-no") {
        this._asOpen = false;
        this._asState = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "as-season-search") {
        const n = parseInt(t.dataset.season);
        this._triggerSonarrSeasonSearch(n, this._asInstance);
        return;
      }
      if (t.dataset.action === "as-ep-search") {
        const epId = parseInt(t.dataset.epid);
        const seasonN = parseInt(t.dataset.season);
        this._triggerSonarrEpisodeSearch(epId, seasonN, this._asInstance);
        return;
      }
      if (t.dataset.action === "is-confirm-yes") {
        const radarrId = this._isInstance === "radarr2" ? this._popup._radarr2Id : this._popup._radarrId;
        this._fetchInteractiveSearch(radarrId, this._isInstance);
        return;
      }
      if (t.dataset.action === "is-confirm-no") {
        this._isState = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.issort !== void 0) {
        const col = t.dataset.issort;
        if (this._isSort.col === col) {
          this._isSort = { col, dir: this._isSort.dir * -1 };
        } else {
          this._isSort = { col, dir: -1 };
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.grab !== void 0) {
        this._grabRelease(t.dataset.grab, parseInt(t.dataset.indexerid));
        return;
      }
      if (t.dataset.action === "sn-confirm-yes") {
        this._addSeriesToSonarr(this._snIsInstance);
        return;
      }
      if (t.dataset.action === "sn-confirm-no") {
        this._snIsOpen = false;
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
            const activeSeries = this._snIsInstance === "sonarr2" ? this._popup._sonarr2Series : this._popup._sonarrSeries;
            const sid = activeSeries?.id;
            if (sid) this._fetchSonarrEpisodes(sid, n, this._snIsInstance);
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
          const activeSn = this._snIsInstance === "sonarr2" ? this._popup._sonarr2Series : this._popup._sonarrSeries;
          const sid = activeSn?.id;
          if (sid) {
            if (isMobile) {
              this._renderPopupEl();
              this._fetchSonarrSeasonIS(sid, n, this._snIsInstance);
            } else {
              this._fetchSonarrSeasonIS(sid, n, this._snIsInstance);
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
          const activeSnEp = this._snIsInstance === "sonarr2" ? this._popup._sonarr2Series : this._popup._sonarrSeries;
          const sid = activeSnEp?.id;
          if (sid) {
            if (isMobile) {
              this._renderPopupEl();
              this._fetchSonarrEpIS(epId, sid, this._snIsInstance);
            } else {
              this._fetchSonarrEpIS(epId, sid, this._snIsInstance);
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
      if (t.dataset.snissort !== void 0) {
        const col = t.dataset.snissort;
        if (this._snIsSort.col === col) {
          this._snIsSort = { col, dir: this._snIsSort.dir * -1 };
        } else {
          this._snIsSort = { col, dir: -1 };
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.sngrab !== void 0) {
        this._sonarrGrab(t.dataset.sngrab, parseInt(t.dataset.indexerid));
        return;
      }
      {
        const snSpageBtn = t.closest("[data-sn-spage]") || (t.dataset.snSpage !== void 0 ? t : null);
        if (snSpageBtn) {
          const series = this._popup?._sonarrSeries;
          const total = (series?.seasons || []).filter((s) => s.seasonNumber > 0).length;
          const totalPages = Math.max(1, Math.ceil(total / 4));
          const val = snSpageBtn.dataset.snSpage;
          let p = this._snSeasonsPage || 0;
          if (val === "first") p = 0;
          else if (val === "prev") p = Math.max(0, p - 1);
          else if (val === "next") p = Math.min(totalPages - 1, p + 1);
          else if (val === "last") p = totalPages - 1;
          else p = parseInt(val) || 0;
          if (p !== this._snSeasonsPage) {
            this._snSeasonsPage = p;
            this._renderPopupEl();
          }
          return;
        }
      }
      if (t.dataset.action === "sn-back") {
        this._snActiveIs = null;
        this._snIsState = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "remove-confirm") {
        _closeAS();
        _closeIS();
        _closeSnIS();
        this._searchExpand = null;
        const pd = this._popup;
        const dualR = pd && pd._radarrId && pd._radarr2Id;
        const dualS = pd && pd._sonarrSeries?.id && pd._sonarr2Series?.id;
        if (dualR || dualS) {
          this._removeConfirm = "instance";
        } else {
          if (pd?._radarr2Id && !pd?._radarrId) this._removeInstance = "radarr2";
          else if (pd?._sonarr2Series?.id && !pd?._sonarrSeries?.id) this._removeInstance = "sonarr2";
          this._removeConfirm = "choose";
        }
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "remove-instance") {
        this._removeInstance = t.dataset.instance;
        this._removeConfirm = "choose";
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "remove-choose-lib") {
        this._removeFromLibrary(false);
        return;
      }
      if (t.dataset.action === "remove-choose-disc") {
        this._removeFromLibrary(true, true);
        return;
      }
      if (t.dataset.action === "remove-no") {
        this._removeConfirm = false;
        this._removeInstance = null;
        this._renderPopupEl();
        return;
      }
      if (t.dataset.action === "remove-yes") {
        this._removeFromLibrary(t.dataset.files === "true");
        return;
      }
      if (t.dataset.action === "stream-playpause") {
        const entityId = t.dataset.entity;
        const curState = this._hass?.states?.[entityId]?.state;
        const supported = this._hass?.states?.[entityId]?.attributes?.supported_features || 0;
        const canPause = supported & 1;
        const canPlay = supported & 16384;
        const plexAction = curState === "playing" ? "pause" : "play";
        let svc;
        if (curState === "playing") {
          svc = canPause ? "media_pause" : canPlay ? "media_play_pause" : null;
        } else {
          svc = canPlay ? "media_play" : canPause ? "media_play_pause" : null;
        }
        if (svc) {
          try {
            this._hass.callService("media_player", svc, { entity_id: entityId });
          } catch (_) {
          }
        }
        if (!svc && this._popup?._plexMachineId) {
          this._hass.callApi("POST", "arr_stack/plex/player", {
            action: plexAction,
            machineIdentifier: this._popup._plexMachineId,
            playerUrl: this._popup._plexPlayerUrl || null
          }).catch(() => {
          });
        }
        const newState = curState === "playing" ? "paused" : "playing";
        if (this._popup?._streamEntity === entityId) {
          this._popup._streamState = newState;
          if (this._popup._type === POPUP_TYPE.STREAM) this._renderPopupEl();
          else {
            const btn = this.shadowRoot?.getElementById("popup-root")?.querySelector('[data-action="stream-playpause"]');
            if (btn) btn.innerHTML = `<ha-icon icon="mdi:${newState === "playing" ? "pause" : "play"}" style="--mdc-icon-size:32px"></ha-icon>`;
          }
        }
        return;
      }
      if (t.dataset.action === "stream-prev") {
        const _plexPrev = () => this._popup?._plexMachineId && this._hass.callApi("POST", "arr_stack/plex/player", {
          action: "skipPrevious",
          machineIdentifier: this._popup._plexMachineId,
          playerUrl: this._popup._plexPlayerUrl || null
        }).catch(() => {
        });
        this._hass.callService("media_player", "media_previous_track", { entity_id: t.dataset.entity }).catch(() => _plexPrev());
        setTimeout(() => {
          this._syncStreamPopup();
          this._reRenderSection("streams");
        }, 2e3);
        return;
      }
      if (t.dataset.action === "stream-next") {
        const _plexNext = () => this._popup?._plexMachineId && this._hass.callApi("POST", "arr_stack/plex/player", {
          action: "skipNext",
          machineIdentifier: this._popup._plexMachineId,
          playerUrl: this._popup._plexPlayerUrl || null
        }).catch(() => {
        });
        this._hass.callService("media_player", "media_next_track", { entity_id: t.dataset.entity }).catch(() => _plexNext());
        setTimeout(() => {
          this._syncStreamPopup();
          this._reRenderSection("streams");
        }, 2e3);
        return;
      }
      if (t.dataset.action === "stream-terminate-show") {
        const glass2 = this.shadowRoot?.querySelector(".popup-glass");
        if (!glass2) return;
        glass2.querySelector(".plex-terminate-modal")?.remove();
        const d = this._popup;
        const sessionId = t.dataset.sessionId;
        const userName = d?._plexUser || "";
        const userThumb = d?._plexUserThumb || "";
        const title = d?.title || "";
        const isDay = this._isDaytime && this._config?.styles?.dayNightMode !== false;
        const fg = isDay ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
        const fgSub = isDay ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
        const bg = isDay ? "rgba(235,235,240,0.97)" : "rgba(16,16,26,0.97)";
        const inputBg = isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)";
        const inputBd = isDay ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)";
        const avatarEl = userThumb ? `<img src="${this._escHtml(userThumb)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid rgba(255,255,255,0.15)">` : "";
        const modal = document.createElement("div");
        modal.className = "plex-terminate-modal";
        modal.style.cssText = `position:absolute;inset:0;background:${bg};backdrop-filter:blur(12px);border-radius:inherit;z-index:50;display:flex;flex-direction:column;padding:20px 24px;gap:14px;overflow:auto`;
        modal.innerHTML = `
        <div style="font-size:15px;font-weight:700;color:${fg}">${this._t("terminateTitle")} \u2014 ${this._escHtml(title)}</div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${avatarEl}
          <div style="font-size:13px;color:${fgSub};line-height:1.5">
            ${this._t("terminatePrompt")}
            ${userName ? `<br>${this._t("terminateUserHint")} <strong style="color:${fg}">${this._escHtml(userName)}</strong>.` : ""}
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;color:${fgSub};letter-spacing:0.1em;margin-bottom:6px">${this._t("terminateMsgLabel")}</div>
          <textarea id="stream-terminate-reason" rows="3" placeholder="${this._t("terminateDefault")}"
            style="width:100%;box-sizing:border-box;background:${inputBg};border:1px solid ${inputBd};border-radius:8px;padding:8px 10px;font-size:12px;color:${fg};outline:none;resize:none;font-family:inherit"></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:auto">
          <button data-action="stream-terminate-cancel" class="is-open-btn" style="justify-content:center;padding:0 12px;min-width:74px">${this._t("terminateCancel")}</button>
          <button data-action="stream-terminate-confirm" data-session-id="${this._escHtml(sessionId)}"
            class="is-open-btn remove-disc-btn" style="justify-content:center;padding:0 12px;min-width:74px">${this._t("terminateStop")}</button>
        </div>`;
        this._terminateActive = true;
        glass2.appendChild(modal);
        return;
      }
      if (t.dataset.action === "stream-terminate-cancel") {
        this._terminateActive = false;
        this.shadowRoot?.querySelector(".plex-terminate-modal")?.remove();
        return;
      }
      if (t.dataset.action === "stream-terminate-confirm") {
        const sessionId = t.dataset.sessionId;
        if (!sessionId) return;
        const modal = this.shadowRoot?.querySelector(".plex-terminate-modal");
        const reason = (modal?.querySelector("#stream-terminate-reason")?.value || "").trim() || this._t("terminateDefault");
        const stopBtn = this.shadowRoot?.querySelector('[data-action="stream-terminate-show"]');
        const stopSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
        const checkSvgInline = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        this._terminateActive = false;
        modal?.remove();
        t.disabled = true;
        if (this._popup) {
          const d = this._popup;
          if (d._streamState === "playing") {
            const elapsed = (Date.now() - (d._updatedAt || Date.now())) / 1e3;
            d._position = Math.min((d._position || 0) + elapsed, d._duration || 0);
            d._updatedAt = Date.now();
            d._streamState = "paused";
          }
          d._plexTerminated = true;
        }
        this._callApi("DELETE", "arr_stack/plex/session/terminate", { sessionId, reason }).catch(() => {
        });
        if (stopBtn) {
          stopBtn.innerHTML = `<ha-icon icon="mdi:loading" style="--mdc-icon-size:14px;animation:btn-spin 0.65s linear infinite"></ha-icon> ${this._t("stopPlayback")}`;
          stopBtn.disabled = true;
          setTimeout(() => {
            if (stopBtn) stopBtn.innerHTML = `${checkSvgInline} ${this._t("stopPlayback")}`;
            setTimeout(() => {
              if (this._popup) this._popup._plexSessionId = null;
              this._renderPopupEl();
              this._reRenderSection?.("streams");
            }, 600);
          }, 1e3);
        } else {
          setTimeout(() => {
            if (this._popup) this._popup._plexSessionId = null;
            this._renderPopupEl();
            this._reRenderSection?.("streams");
          }, 1e3);
        }
        return;
      }
      if (t.dataset.action === "stream-seek") {
        const rect = t.getBoundingClientRect();
        const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const dur = parseFloat(t.dataset.dur);
        if (dur > 0) {
          const newPos = pct * dur;
          this._updateStreamFills(t.dataset.entity, newPos, dur);
          this._doSeek(t.dataset.entity, newPos);
        }
        return;
      }
    });
    const seekWrap = root.querySelector(".stream-seek-wrap");
    if (seekWrap) {
      const applySeek = (clientX, commit) => {
        const rect = seekWrap.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const dur = parseFloat(seekWrap.dataset.dur);
        const eid = seekWrap.dataset.entity;
        if (dur > 0 && eid) {
          const newPos = pct * dur;
          this._updateStreamFills(eid, newPos, dur);
          if (commit) this._doSeek(eid, newPos);
        }
      };
      seekWrap.addEventListener("touchstart", (e) => {
        e.preventDefault();
        applySeek(e.touches[0].clientX, true);
      }, { passive: false });
      seekWrap.addEventListener("touchmove", (e) => {
        e.preventDefault();
        applySeek(e.touches[0].clientX, false);
      }, { passive: false });
      seekWrap.addEventListener("touchend", (e) => {
        e.preventDefault();
        applySeek(e.changedTouches[0].clientX, true);
      }, { passive: false });
    }
    if (glass) glass.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-isselect],[data-snisselect]");
      if (!sel) return;
      if (sel.dataset.isselect !== void 0) {
        this._isFilters = { ...this._isFilters, [sel.dataset.isselect]: sel.value };
      } else if (sel.dataset.snisselect !== void 0) {
        this._snIsFilters = { ...this._snIsFilters, [sel.dataset.snisselect]: sel.value };
      }
      this._renderPopupEl();
    });
    if (this._popup?._type === POPUP_TYPE.STREAM || this._popup?._streamEntity) {
      const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
      this._streamPopupTimer = setInterval(() => {
        const fill = root.querySelector(".stream-prog-fill");
        const timeEl = root.querySelector(".stream-popup-time");
        if (!fill) return;
        const pos = parseFloat(fill.dataset.pos);
        const dur = parseFloat(fill.dataset.dur);
        const updatedAt = parseFloat(fill.dataset.updated);
        if (!dur) return;
        const playing = this._popup?._streamState === "playing";
        const elapsed = playing ? (Date.now() - updatedAt) / 1e3 : 0;
        const current = Math.min(pos + elapsed, dur);
        fill.style.width = (current / dur * 100).toFixed(2) + "%";
        if (timeEl) timeEl.textContent = `${fmt(current)} / ${fmt(dur)}`;
      }, 1e3);
    }
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
    if (d._type === POPUP_TYPE.STREAM) return this._renderStreamPopup(d);
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
    const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : d._localBackdropUrl || "";
    const posterUrl = posterPath ? posterPath.startsWith("http") ? posterPath : `https://image.tmdb.org/t/p/w342${posterPath}` : d._localPosterUrl || "";
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
    const isMovieType = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE;
    const isSonarrType = d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV;
    const isActive = !!this._isState;
    const snIsActive = this._snIsOpen;
    const personIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;
    const searchSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    const chevRSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
    const MAX_INST_LBL = 10;
    const _instLabels = (n1, n2, fb1, fb2) => {
      const use = n1 && n2 && n1.length <= MAX_INST_LBL && n2.length <= MAX_INST_LBL;
      return use ? [n1, n2] : [fb1, fb2];
    };
    const hasDualRadarr = !!this._radarr2Configured;
    const hasDualSonarr = !!this._sonarr2Configured;
    const singleInstance = d._radarrId ? "radarr" : d._radarr2Id ? "radarr2" : "radarr";
    const [isl1, isl2] = this._seerrRadarr2?.is4k ? ["HD", "4K"] : _instLabels(this._seerrRadarr?.name, this._seerrRadarr2?.name, "Radarr 1", "Radarr 2");
    const _re1 = d._radarrId ? (this._radarr || []).find((m) => m.id === d._radarrId) : null;
    const _re2 = d._radarr2Id ? (this._radarr2 || []).find((m) => m.id === d._radarr2Id) : null;
    const _se1 = d._sonarrSeries?.id ? (this._sonarr || []).find((s) => s.id === d._sonarrSeries.id) : null;
    const _se2 = d._sonarr2Series?.id ? (this._sonarr2 || []).find((s) => s.id === d._sonarr2Series.id) : null;
    const rInLib1 = !!_re1?.hasFile;
    const rInLib2 = !!_re2?.hasFile;
    const snInLib1 = _se1?.statistics?.episodeFileCount > 0;
    const snInLib2 = _se2?.statistics?.episodeFileCount > 0;
    const asActive = this._asOpen;
    const _asLoading = (inst) => this._asInstance === inst && (this._asMovieSearching || asActive && this._asState === "adding");
    const _asDone = (inst) => this._asInstance === inst && (this._asState === "done" || this._asMovieSearched);
    const _asErr = (inst) => this._asInstance === inst && this._asState === "error";
    const _asSpinner = `<span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>`;
    const _movieDlPct = (inst) => {
      const mId = inst === "radarr2" ? d._radarr2Id : d._radarrId;
      if (!mId) return null;
      const qPct = inst === "radarr2" ? this._radarr2QueuePct || /* @__PURE__ */ new Map() : this._radarrQueuePct || /* @__PURE__ */ new Map();
      return qPct.has(mId) ? qPct.get(mId) : null;
    };
    const _seriesDlPct = (inst) => {
      const series = inst === "sonarr2" ? d._sonarr2Series : d._sonarrSeries;
      if (!series?.id) return null;
      const qPct = inst === "sonarr2" ? this._sonarr2QueueSeriesPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeriesPct || /* @__PURE__ */ new Map();
      return qPct.has(series.id) ? qPct.get(series.id) : null;
    };
    const _inLibCls = (inLib, inst) => inLib && _movieDlPct(inst) === null ? " in-lib" : "";
    const _snInLibCls = (inLib, inst) => inLib && _seriesDlPct(inst) === null ? " in-lib" : "";
    const collXSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    let searchBtnHtml = "";
    if (isAdmin && (isMovieType || isSonarrType) && !d._noIS) {
      const se = this._searchExpand;
      const collapseBtn = `<button class="is-open-btn is-collapse-btn" data-action="search-collapse" title="Close">${collXSvg}</button>`;
      if (!se) {
        searchBtnHtml = `<div class="is-btn-row">
        <button class="is-open-btn" data-action="search-expand">
          ${searchSvg} Search
        </button>
      </div>`;
      } else if (se === "pick") {
        const _isDual = isMovieType ? hasDualRadarr : hasDualSonarr;
        if (_isDual) {
          if (isMovieType) {
            const i1Active = this._asOpen && this._asInstance === "radarr" || !!this._isState && this._isInstance === "radarr";
            const i2Active = this._asOpen && this._asInstance === "radarr2" || !!this._isState && this._isInstance === "radarr2";
            searchBtnHtml = `<div class="is-btn-row">
            <button class="is-open-btn${i1Active ? " active" : ""}" data-action="search-pick-inst" data-instance="radarr">${isl1}</button>
            <button class="is-open-btn${i2Active ? " active" : ""}" data-action="search-pick-inst" data-instance="radarr2">${isl2}</button>
            ${collapseBtn}
          </div>`;
          } else {
            const [assl1, assl2] = _instLabels(this._seerrSonarr?.name, this._seerrSonarr2?.name, "Sonarr 1", "Sonarr 2");
            const i1Active = this._asOpen && this._asInstance === "sonarr" || this._snIsOpen && this._snIsInstance === "sonarr";
            const i2Active = this._asOpen && this._asInstance === "sonarr2" || this._snIsOpen && this._snIsInstance === "sonarr2";
            searchBtnHtml = `<div class="is-btn-row">
            <button class="is-open-btn${i1Active ? " active" : ""}" data-action="search-pick-inst" data-instance="sonarr">${assl1}</button>
            <button class="is-open-btn${i2Active ? " active" : ""}" data-action="search-pick-inst" data-instance="sonarr2">${assl2}</button>
            ${collapseBtn}
          </div>`;
          }
        } else {
          const asPickActive = this._asOpen;
          const isPickActive = !!(this._isState || this._snIsOpen);
          const asPickIcon = this._asMovieSearching || this._asOpen && this._asState === "adding" ? _asSpinner : searchSvg;
          searchBtnHtml = `<div class="is-btn-row">
          <button class="is-open-btn${asPickActive ? " active" : ""}" data-action="search-pick-as">
            ${asPickIcon} Automatic
          </button>
          <button class="is-open-btn${isPickActive ? " active" : ""}" data-action="search-pick-is">
            ${personIconSvg} Interactive
          </button>
          ${collapseBtn}
        </div>`;
        }
      } else if (se === "pick-mode") {
        const pickedInst = this._searchPickInst;
        const asPickActive = this._asOpen && this._asInstance === pickedInst;
        const isPickActive = isMovieType ? !!this._isState && this._isInstance === pickedInst : this._snIsOpen && this._snIsInstance === pickedInst;
        const asPickIcon = this._asMovieSearching || this._asOpen && this._asState === "adding" ? _asSpinner : searchSvg;
        searchBtnHtml = `<div class="is-btn-row">
        <button class="is-open-btn${asPickActive ? " active" : ""}" data-action="search-pick-as">
          ${asPickIcon} Automatic
        </button>
        <button class="is-open-btn${isPickActive ? " active" : ""}" data-action="search-pick-is">
          ${personIconSvg} Interactive
        </button>
        ${collapseBtn}
      </div>`;
      }
    }
    const trashSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const stopSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
    const checkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const crossSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const canRemoveRadarr = isAdmin && isMovieType && (d._radarrId || d._radarr2Id);
    const canRemoveSonarr = isAdmin && isSonarrType && (d._sonarrSeries?.id || d._sonarr2Series?.id);
    const radarrEntry = d._radarrId ? (this._radarr || []).find((m) => m.id === d._radarrId) : null;
    const radarr2Entry = d._radarr2Id ? (this._radarr2 || []).find((m) => m.id === d._radarr2Id) : null;
    const sonarrEntry = d._sonarrSeries?.id ? (this._sonarr || []).find((s) => s.id === d._sonarrSeries.id) : null;
    const sonarr2Entry = d._sonarr2Series?.id ? (this._sonarr2 || []).find((s) => s.id === d._sonarr2Series.id) : null;
    const hasFiles = !!(radarrEntry?.hasFile || radarr2Entry?.hasFile || sonarrEntry?.statistics?.episodeFileCount > 0 || sonarr2Entry?.statistics?.episodeFileCount > 0);
    const _instStatus = (entry, qActive, qFailed) => {
      if (!entry) return "none";
      const hasF = entry.hasFile || entry.statistics?.episodeFileCount > 0;
      if (hasF) return "available";
      if (qFailed?.has(entry.id)) return "failed";
      if (qActive?.has(entry.id)) return "downloading";
      if (entry.monitored) return "missing";
      return "added";
    };
    const _dlSvgSm = `<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>`;
    const _instChip = (label, status, pct = null) => {
      const map = {
        available: { cls: "ic--available", icon: "\u2713" },
        downloading: { cls: "ic--downloading", icon: "" },
        failed: { cls: "ic--failed", icon: "\u2717" },
        missing: { cls: "ic--missing", icon: "\u2717" },
        added: { cls: "ic--added", icon: "+" },
        none: { cls: "ic--none", icon: "\u2013" }
      };
      const { cls } = map[status] || map.none;
      if (status === "downloading") {
        const p = pct ?? 0;
        const barHtml = `<div style="display:inline-flex;align-items:center;gap:3px;margin-left:4px;vertical-align:middle"><div style="width:36px;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden;display:inline-block;vertical-align:middle"><div style="width:${Math.max(p, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${p}%</span></div>`;
        return `<span class="inst-chip ${cls}">${label}${barHtml}</span>`;
      }
      const { icon } = map[status] || map.none;
      return `<span class="inst-chip ${cls}">${label}${icon ? ` <span class="ic-icon">${icon}</span>` : ""}</span>`;
    };
    const _chipMoviePct = (inst) => {
      const mId = inst === "radarr2" ? d._radarr2Id : d._radarrId;
      if (!mId) return null;
      const qPct = inst === "radarr2" ? this._radarr2QueuePct || /* @__PURE__ */ new Map() : this._radarrQueuePct || /* @__PURE__ */ new Map();
      return qPct.has(mId) ? qPct.get(mId) : null;
    };
    const _chipSeriesPct = (inst) => {
      const series = inst === "sonarr2" ? d._sonarr2Series : d._sonarrSeries;
      if (!series?.id) return null;
      const qPct = inst === "sonarr2" ? this._sonarr2QueueSeriesPct || /* @__PURE__ */ new Map() : this._sonarrQueueSeriesPct || /* @__PURE__ */ new Map();
      return qPct.has(series.id) ? qPct.get(series.id) : null;
    };
    let instanceStatusHtml = "";
    let singleDlTag = "";
    if (isMovieType && this._radarr2Configured) {
      const is4k = this._seerrRadarr2?.is4k;
      let lbl1, lbl2;
      if (is4k) {
        [lbl1, lbl2] = ["HD", "4K"];
      } else {
        [lbl1, lbl2] = _instLabels(
          this._seerrRadarr?.name,
          this._seerrRadarr2?.name,
          "Radarr 1",
          "Radarr 2"
        );
      }
      const st1 = _instStatus(radarrEntry, this._radarrQueueActive, this._radarrQueueFailed);
      const st2 = _instStatus(radarr2Entry, this._radarr2QueueActive, this._radarr2QueueFailed);
      instanceStatusHtml = `<div class="instance-status-row">${_instChip(lbl1, st1, _chipMoviePct("radarr"))}${_instChip(lbl2, st2, _chipMoviePct("radarr2"))}</div>`;
    } else if (isSonarrType && this._sonarr2Configured) {
      const [lbl1, lbl2] = _instLabels(
        this._seerrSonarr?.name,
        this._seerrSonarr2?.name,
        "Sonarr 1",
        "Sonarr 2"
      );
      const st1 = _instStatus(sonarrEntry, null, null);
      const st2 = _instStatus(sonarr2Entry, null, null);
      instanceStatusHtml = `<div class="instance-status-row">${_instChip(lbl1, st1, _chipSeriesPct("sonarr"))}${_instChip(lbl2, st2, _chipSeriesPct("sonarr2"))}</div>`;
    } else if (isMovieType) {
      const pct = _chipMoviePct("radarr");
      if (pct !== null) {
        singleDlTag = `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><div style="width:80px;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(pct, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:10px;color:#3b82f6;font-weight:700">${pct}%</span></div>`;
      }
    } else if (isSonarrType) {
      const pct = _chipSeriesPct("sonarr");
      if (pct !== null) {
        singleDlTag = `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><div style="width:80px;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden"><div style="width:${Math.max(pct, 4)}%;height:100%;background:#3b82f6;border-radius:2px"></div></div><span style="font-size:10px;color:#3b82f6;font-weight:700">${pct}%</span></div>`;
      }
    }
    const _popupRadarrEntry = d._type === POPUP_TYPE.RADARR || d._type === POPUP_TYPE.MOVIE ? (this._radarr || []).find((m) => m.id === d._radarrId) : null;
    const _popupSonarrEntry = (d._type === POPUP_TYPE.SONARR || d._type === POPUP_TYPE.TV) && d._sonarrSeries?.id ? (this._sonarr || []).find((s) => s.id === d._sonarrSeries.id) : null;
    const _popupTags = _popupRadarrEntry ? (_popupRadarrEntry.tags || []).map((id) => (this._radarrTags || []).find((t) => t.id === id)?.label).filter(Boolean) : _popupSonarrEntry ? (_popupSonarrEntry.tags || []).map((id) => (this._sonarrTags || []).find((t) => t.id === id)?.label).filter(Boolean) : [];
    const _tagIconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:0.7"><path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.78 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58Z"/></svg>`;
    const popupTagHtml = _popupTags.length > 0 ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:-6px;margin-bottom:10px">${_popupTags.map((l) => `<span style="display:inline-flex;align-items:center;gap:2px;font-size:11px;color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:0 4px 0 3px;line-height:1.7">${_tagIconSvg}${this._escHtml(l)}</span>`).join("")}</div>` : "";
    const removeLabel = canRemoveSonarr ? "Remove Series \u203A" : "Remove \u203A";
    const _rmIs4k = this._seerrRadarr2?.is4k;
    const [_rmLbl1R, _rmLbl2R] = _rmIs4k ? ["HD", "4K"] : _instLabels(this._seerrRadarr?.name, this._seerrRadarr2?.name, "Radarr 1", "Radarr 2");
    const _rmDualR = canRemoveRadarr && !!(d._radarrId && d._radarr2Id);
    const _rmDualS = canRemoveSonarr && !!(d._sonarrSeries?.id && d._sonarr2Series?.id);
    const chevronSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    const removeBtn = canRemoveRadarr || canRemoveSonarr ? (() => {
      const rc = this._removeConfirm;
      if (!rc) return `
      <button class="is-open-btn remove-lib-btn" data-action="remove-confirm">
        ${trashSvg} ${removeLabel}${_rmDualR || _rmDualS ? ` ${chevronSvg}` : ""}
      </button>`;
      if (rc === "instance") {
        const i1 = canRemoveSonarr ? "sonarr" : "radarr";
        const i2 = canRemoveSonarr ? "sonarr2" : "radarr2";
        const l1 = canRemoveSonarr ? "Sonarr" : _rmLbl1R;
        const l2 = canRemoveSonarr ? "Sonarr 2" : _rmLbl2R;
        return `
        <div class="remove-confirm-row">
          <button class="is-open-btn remove-lib-btn" data-action="remove-instance" data-instance="${i1}">${trashSvg} ${l1}</button>
          <button class="is-open-btn remove-lib-btn" data-action="remove-instance" data-instance="${i2}">${trashSvg} ${l2}</button>
          <button class="remove-ic-btn remove-ic-no" data-action="remove-no">${crossSvg}</button>
        </div>`;
      }
      return `
      <div class="remove-confirm-row">
        <button class="is-open-btn remove-lib-btn" data-action="remove-choose-lib">${trashSvg} Remove from library</button>
        <button class="is-open-btn remove-disc-btn" data-action="remove-choose-disc">${trashSvg} Remove from disc</button>
        <button class="remove-ic-btn remove-ic-no" data-action="remove-no">${crossSvg}</button>
      </div>`;
    })() : "";
    const canTerminate = !!(d._streamEntity && d._plexSessionId) && !!this._hass?.user?.is_admin;
    const terminateActionBtn = canTerminate ? `
    <button class="is-open-btn remove-disc-btn" data-action="stream-terminate-show"
      data-session-id="${this._escHtml(d._plexSessionId)}">
      ${stopSvg} ${this._t("stopPlayback")} ${chevronSvg}
    </button>` : "";
    const dayClass = this._isDaytime && this._config?.styles?.dayNightMode !== false ? " popup-day" : "";
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
              ${instanceStatusHtml}
              ${singleDlTag}
              ${popupTagHtml}
              ${overview ? `<p class="popup-overview">${overview}</p>` : `<p class="popup-overview" style="color:rgba(255,255,255,0.35);font-style:italic">${this._t("noDescription")}</p>`}
              ${d._streamEntity ? this._renderPopupStreamControls(d) : ""}
              <div class="popup-actions">
                ${searchBtnHtml}
                ${removeBtn}
                ${terminateActionBtn}
              </div>
            </div>
          </div>
          ${isActive || snIsActive || asActive ? "" : trailerHtml}
          ${asActive ? this._renderAsSection() : ""}
          ${isActive ? this._renderIsPanel() : ""}
          ${snIsActive ? this._renderSonarrIsSection() : ""}
        </div>
      </div>
    </div>`;
  }
  // ─────────────────────────────────────────────
  // Stream controls embedded in movie/TV popup
  // ─────────────────────────────────────────────
  _renderPopupStreamControls(d) {
    const eid = d._streamEntity;
    const dur = d._duration || 0;
    const pos = d._position || 0;
    const upd = d._updatedAt || Date.now();
    const playing = d._streamState === "playing";
    const elapsed = playing ? (Date.now() - upd) / 1e3 : 0;
    const current = Math.min(pos + elapsed, dur);
    const initPct = dur > 0 ? (current / dur * 100).toFixed(2) : 0;
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const timeLabel = dur > 0 ? `${fmt(current)} / ${fmt(dur)}` : "";
    const canSeek = false;
    const canPlexSeek = false;
    const seekBar = dur > 0 ? `
    <div ${canSeek || canPlexSeek ? `class="stream-seek-wrap" data-action="stream-seek" data-entity="${this._escHtml(eid)}" data-dur="${dur}" style="cursor:pointer;padding:6px 0;margin-bottom:2px"` : `style="padding:6px 0;margin-bottom:2px"`}>
      <div class="stream-popup-track" style="position:relative;height:4px;border-radius:2px;overflow:hidden">
        <div class="stream-prog-fill stream-popup-fill" data-entity="${this._escHtml(eid)}" data-pos="${pos}" data-dur="${dur}" data-updated="${upd}" style="position:absolute;inset:0 auto 0 0;width:${initPct}%;border-radius:2px;transition:none"></div>
      </div>
    </div>
    <div class="stream-popup-time" style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:8px">${timeLabel}</div>` : "";
    return `<div style="margin-top:10px;margin-bottom:2px">
    ${seekBar}
  </div>`;
  }
  // ─────────────────────────────────────────────
  // Interactive Search — panel HTML
  // ─────────────────────────────────────────────
  async _removeFromLibrary(deleteFiles = false, addExclusion = false) {
    const d = this._popup;
    if (!d) return;
    const df = deleteFiles ? "true" : "false";
    const ex = addExclusion ? "true" : "false";
    const inst = this._removeInstance || (d._radarrId ? "radarr" : d._radarr2Id ? "radarr2" : d._sonarrSeries?.id ? "sonarr" : "sonarr2");
    try {
      if (inst === "radarr2" && d._radarr2Id) {
        await this._hass.callApi("DELETE", `arr_stack/radarr2/movie/${d._radarr2Id}?deleteFiles=${df}&addExclusion=${ex}`);
        this._radarr2 = (this._radarr2 || []).filter((m) => m.id !== d._radarr2Id);
      } else if ((inst === "radarr" || !inst.startsWith("sonarr")) && d._radarrId) {
        await this._hass.callApi("DELETE", `arr_stack/radarr/movie/${d._radarrId}?deleteFiles=${df}&addExclusion=${ex}`);
        this._radarr = (this._radarr || []).filter((m) => m.id !== d._radarrId);
      } else if (inst === "sonarr2" && d._sonarr2Series?.id) {
        await this._hass.callApi("DELETE", `arr_stack/sonarr2/series/${d._sonarr2Series.id}?deleteFiles=${df}&addExclusion=${ex}`);
        this._sonarr2 = (this._sonarr2 || []).filter((s) => s.id !== d._sonarr2Series.id);
      } else if (d._sonarrSeries?.id) {
        await this._hass.callApi("DELETE", `arr_stack/sonarr/series/${d._sonarrSeries.id}?deleteFiles=${df}&addExclusion=${ex}`);
        this._sonarr = (this._sonarr || []).filter((s) => s.id !== d._sonarrSeries.id);
      }
    } catch (e) {
      console.error("[ArrStack] Remove failed:", e);
    }
    this._popup = null;
    this._removeConfirm = false;
    this._removeInstance = null;
    this._render();
    this._fetchAll();
  }
  // ─────────────────────────────────────────────
  // Music / stream popup renderer
  // ─────────────────────────────────────────────
  _renderStreamPopup(d) {
    const isPlaying = d._streamState === "playing";
    const title = this._escHtml(d.title || "");
    const artist = this._escHtml(d._artist || "");
    const album = this._escHtml(d._album || "");
    const duration = d._duration || 0;
    const position = d._position || 0;
    const updatedAt = d._updatedAt || Date.now();
    const elapsed = isPlaying ? (Date.now() - updatedAt) / 1e3 : 0;
    const currentPos = Math.min(position + elapsed, duration);
    const initPct = duration > 0 ? (currentPos / duration * 100).toFixed(2) : 0;
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const timeLabel = duration > 0 ? `${fmt(currentPos)} / ${fmt(duration)}` : "";
    const eid = this._escHtml(d._streamEntity || "");
    const posterUrl = d._poster || "";
    const posterHtml = posterUrl ? `<img class="popup-poster" src="${this._escHtml(posterUrl)}" loading="lazy" onerror="this.style.display='none'" />` : "";
    const backdropStyle = posterUrl ? `background-image:url('${this._escHtml(posterUrl)}');background-size:cover;background-position:center;filter:blur(6px) brightness(0.4)` : "background:linear-gradient(135deg,rgba(20,20,40,1),rgba(40,20,60,1))";
    const subLine = [artist, album].filter(Boolean).join(" \xB7 ");
    const rawEid = d._streamEntity || "";
    const suppFeats = this._hass?.states?.[rawEid]?.attributes?.supported_features || 0;
    const canControl = !!(suppFeats & 1) || !!(suppFeats & 16384) || !!d._plexMachineId;
    const canSeek = !!(suppFeats & 2);
    const canPlexSeek = !!d._plexMachineId;
    const seekBar = duration > 0 ? `
    <div ${canSeek || canPlexSeek ? `class="stream-seek-wrap" data-action="stream-seek" data-entity="${eid}" data-dur="${duration}" style="cursor:pointer;padding:6px 0;margin-bottom:4px"` : `style="padding:6px 0;margin-bottom:4px"`}>
      <div class="stream-prog-track" style="height:4px;position:relative;bottom:auto;left:auto;right:auto;border-radius:2px">
        <div class="stream-prog-fill" data-entity="${eid}" data-pos="${position}" data-dur="${duration}" data-updated="${updatedAt}" style="width:${initPct}%;transition:none;border-radius:2px"></div>
      </div>
    </div>
    <div class="stream-popup-time" style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:10px">${timeLabel}</div>` : "";
    const controls = canControl ? `
    <div style="display:flex;align-items:center;gap:16px;margin-top:4px">
      <button class="popup-ctrl-btn" data-action="stream-prev" data-entity="${eid}">
        <ha-icon icon="mdi:skip-previous" style="--mdc-icon-size:26px"></ha-icon>
      </button>
      <button class="popup-ctrl-btn popup-ctrl-btn-main" data-action="stream-playpause" data-entity="${eid}">
        <ha-icon icon="mdi:${isPlaying ? "pause" : "play"}" style="--mdc-icon-size:32px"></ha-icon>
      </button>
      <button class="popup-ctrl-btn" data-action="stream-next" data-entity="${eid}">
        <ha-icon icon="mdi:skip-next" style="--mdc-icon-size:26px"></ha-icon>
      </button>
    </div>` : "";
    const dayClass = this._isDaytime && this._config?.styles?.dayNightMode !== false ? " popup-day" : "";
    return `
    <div class="popup-overlay${dayClass}">
      <div class="popup-glass">
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
              ${seekBar}
              ${controls}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  async _addSeriesToSonarr(instance = "sonarr") {
    this._snIsState = "adding";
    this._renderPopupEl();
    const svc = instance === "sonarr2" ? "sonarr2" : "sonarr";
    try {
      const d = this._popup;
      const tvdbId = d.externalIds?.tvdbId || d._tvdbId;
      if (!tvdbId) throw new Error(this._t("snNoSonarrId"));
      const lookupResults = await this._callApi("GET", `arr_stack/${svc}/lookup?tvdbId=${tvdbId}`);
      const seriesData = Array.isArray(lookupResults) ? lookupResults[0] : lookupResults;
      if (!seriesData) throw new Error(this._t("snNoSonarrId"));
      if (this._overseerrConfigured !== false && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      let profileId, rootFolder;
      if (this._seerrSonarr) {
        profileId = this._seerrSonarr.profileId ?? 1;
        rootFolder = this._seerrSonarr.rootFolder ?? "/tv";
      } else {
        await this._fetchSonarrProfiles();
        await this._fetchSonarrRootFolders();
        profileId = this._sonarrProfiles?.[0]?.id ?? 1;
        rootFolder = this._sonarrRootFolders?.[0]?.path ?? "/tv";
      }
      let added;
      try {
        added = await this._callApi("POST", `arr_stack/${svc}/series`, {
          ...seriesData,
          qualityProfileId: parseInt(profileId),
          rootFolderPath: rootFolder,
          monitored: false,
          addOptions: { searchForMissingEpisodes: false, searchForCutoffUnmetEpisodes: false, monitor: "none" }
        });
      } catch (addErr) {
        await this._fetchSonarr();
        added = (this._sonarrAll || []).find((s) => String(s.tvdbId) === String(tvdbId));
      }
      await this._fetchSonarr();
      const refreshed = (this._sonarrAll || []).find(
        (s) => String(s.tvdbId) === String(tvdbId) || added?.id && s.id === added.id
      ) || added;
      if (!refreshed) throw new Error(this._t("snNoSonarrId"));
      this._popup._sonarrSeries = refreshed;
      this._snIsState = null;
    } catch (e) {
      this._snIsState = "error";
      this._snIsError = e.message || this._t("isLoadError");
    }
    this._renderPopupEl();
  }
};
var popupMixin = _PopupMethods.prototype;

// src/render/tautulli-shared.js
var _TL_COLS_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`;
var _TL_EDIT_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
var _TL_TRASH_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
var _TL_CHEV_L = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
var _TL_CHEV_R = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
var _TL_CHEV_LL = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 18 12 12 18 6"/><polyline points="12 18 6 12 12 6"/></svg>`;
var _TL_CHEV_RR = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 18 12 12 6 6"/><polyline points="12 18 18 12 12 6"/></svg>`;
var _TL_SEL_STY = `margin:0 4px;background:var(--is-row-hover,rgba(255,255,255,0.06));border:1px solid var(--is-divider,rgba(255,255,255,0.1));border-radius:6px;color:var(--is-text,#fff);padding:4px 8px;font-size:12px`;
var _TL_MENU_STY = `position:absolute;right:0;top:calc(100% + 4px);background:var(--is-menu-bg,#18182a);border:1px solid var(--is-divider,rgba(255,255,255,0.12));border-radius:8px;padding:6px 0;min-width:190px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,0.18)`;
var _TautulliSharedMethods = class {
  // ── State helper ──────────────────────────────────────────────────────────
  _tlHidden(key, defaults) {
    const m = this._tautulliModal;
    if (!m) return new Set(defaults);
    if (!m[key]) m[key] = new Set(defaults);
    return m[key];
  }
  // ── Column prefs — HA user data (cross-device) ────────────────────────────
  async _tlLoadColPrefs() {
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "arr-tl-cols" });
      return r?.value || {};
    } catch {
      return {};
    }
  }
  _tlSaveColPrefs() {
    const m = this._tautulliModal;
    if (!m) return;
    const KEYS = ["libsHiddenCols", "libsMobHiddenCols", "usersHiddenCols", "usersMobHiddenCols", "histHiddenCols", "histMobHiddenCols"];
    const value = {};
    for (const k of KEYS) if (m[k]) value[k] = [...m[k]];
    this._hass.callWS({ type: "frontend/store_user_data", key: "arr-tl-cols", value }).catch(() => {
    });
  }
  // ── Icons ─────────────────────────────────────────────────────────────────
  _tlLibSvgIcon(type, name, size) {
    const sm = size !== "md";
    const sz = sm ? 10 : 15;
    const clr = "var(--is-text-sec)";
    const sty = sm ? `flex-shrink:0;color:${clr}` : `vertical-align:middle;margin-right:7px;flex-shrink:0;color:${clr}`;
    const isPodcast = type === "podcast" || (name || "").toLowerCase().includes("podcast");
    const s = `stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const w = (p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}">${p}</svg>`;
    if (type === "movie") return w('<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/>');
    if (type === "show") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="currentColor" style="${sty}"><path d="M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,1 23,17V5A2,2 0 0,1 21,3M21,17H3V5H21V17Z"/></svg>`;
    if (isPodcast) return w('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>');
    if (type === "artist") return w('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>');
    return w('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>');
  }
  _tlMediaIcon(type, size) {
    const sz = size || 11;
    const s = `stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const sty = `flex-shrink:0;vertical-align:middle;color:var(--is-text-muted)`;
    if (type === "movie") return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>`;
    if (type === "episode") return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="currentColor" style="${sty}"><path d="M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,1 23,17V5A2,2 0 0,1 21,3M21,17H3V5H21V17Z"/></svg>`;
    if (type === "track") return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    return "";
  }
  // ── Toolbar building blocks ───────────────────────────────────────────────
  _tlPerPageSelect(id, perPage, opts) {
    opts = opts || [10, 25, 50, 100];
    const options = opts.map((n) => `<option value="${n}"${n === perPage ? " selected" : ""}>${n}</option>`).join("");
    return `<select id="${id}" style="${_TL_SEL_STY}">${options}</select>`;
  }
  _tlEditBtn(id, active, label) {
    label = label || "Edit";
    const icon = label === "Delete" ? _TL_TRASH_SVG : _TL_EDIT_SVG;
    return `<button id="${id}" class="tl-page-btn${active ? " active" : ""}" style="display:inline-flex;align-items:center;gap:5px">${icon}${label}</button>`;
  }
  _tlColsMenu(btnId, menuId, items, isOpen) {
    return `<div style="position:relative"><button id="${btnId}" class="tl-page-btn" style="display:inline-flex;align-items:center;gap:5px">${_TL_COLS_SVG}Columns</button><div id="${menuId}" style="display:${isOpen ? "block" : "none"};${_TL_MENU_STY}">${items}</div></div>`;
  }
  _tlColItems(cols, hiddenSet, dataAttr) {
    return cols.map((c) => {
      const on = !hiddenSet.has(c.key);
      return `<div class="tl-col-item" ${dataAttr}="${c.key}"><span class="tl-col-chk${on ? " on" : ""}"></span>${c.label}</div>`;
    }).join("");
  }
  _tlToolbar(opts) {
    const { isMobile, select, editBtn, colsBtn, banner } = opts;
    const b = banner || "";
    const showLabel = select ? `<span style="font-size:12px;color:var(--is-text-label)">${isMobile ? `Show ${select}` : `Show ${select} entries per page`}</span>` : "";
    return `${b}<div class="tl-toolbar">${showLabel}<div class="tl-toolbar-actions">${editBtn}${colsBtn}</div></div>`;
  }
  // ── Pagination ────────────────────────────────────────────────────────────
  _tlMobPag(attr, page, totalPages) {
    if (totalPages <= 1) return "";
    const DOT_LIMIT = 15;
    let center;
    if (totalPages <= DOT_LIMIT) {
      const dots = Array.from(
        { length: totalPages },
        (_, i) => i === page ? `<button data-${attr}="${i}" style="width:18px;height:6px;border-radius:3px;background:var(--is-text);padding:0;min-width:0;flex-shrink:0;vertical-align:middle;border:none;cursor:default;outline:none" disabled></button>` : `<button class="tl-page-btn" data-${attr}="${i}" style="width:6px;height:6px;border-radius:50%;background:var(--is-text-muted);padding:0;min-width:0;flex-shrink:0;vertical-align:middle;border:none"></button>`
      ).join("");
      center = `<div style="display:flex;align-items:center;gap:5px">${dots}</div>`;
    } else {
      center = `<span style="font-size:13px;font-weight:600;color:var(--is-text,#fff);min-width:44px;text-align:center">${page + 1}/${totalPages}</span>`;
    }
    const first = page === 0;
    const last = page >= totalPages - 1;
    const btnSty = "display:inline-flex;align-items:center;gap:4px;padding:5px 10px";
    return `<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px">
      <button class="tl-page-btn tl-icon-btn" data-${attr}="first" style="${btnSty}"${first ? " disabled" : ""}>${_TL_CHEV_LL}</button>
      <button class="tl-page-btn tl-icon-btn" data-${attr}="prev" style="${btnSty}"${first ? " disabled" : ""}>${_TL_CHEV_L}</button>
      ${center}
      <button class="tl-page-btn tl-icon-btn" data-${attr}="next" style="${btnSty}"${last ? " disabled" : ""}>${_TL_CHEV_R}</button>
      <button class="tl-page-btn tl-icon-btn" data-${attr}="last" style="${btnSty}"${last ? " disabled" : ""}>${_TL_CHEV_RR}</button>
    </div>`;
  }
  _tlDeskPag(attr, page, perPage, total, label) {
    label = label || "entries";
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total > 0 ? page * perPage + 1 : 0;
    const to = Math.min((page + 1) * perPage, total);
    const showing = total > 0 ? `Showing ${from}\u2013${to} of ${total} ${label}` : `No ${label}`;
    const btns = [];
    btns.push(`<button class="tl-page-btn" data-${attr}="first"${page === 0 ? " disabled" : ""}>First</button>`);
    btns.push(`<button class="tl-page-btn" data-${attr}="prev"${page === 0 ? " disabled" : ""}>Previous</button>`);
    const lo = Math.max(0, Math.min(page - 2, totalPages - 5));
    const hi = Math.min(totalPages - 1, lo + 4);
    for (let i = lo; i <= hi; i++) btns.push(`<button class="tl-page-btn${i === page ? " active" : ""}" data-${attr}="${i}">${i + 1}</button>`);
    btns.push(`<button class="tl-page-btn" data-${attr}="next"${page >= totalPages - 1 ? " disabled" : ""}>Next</button>`);
    btns.push(`<button class="tl-page-btn" data-${attr}="last"${page >= totalPages - 1 ? " disabled" : ""}>Last</button>`);
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;flex-wrap:wrap;gap:8px"><span style="font-size:12px;color:var(--is-text-label)">${showing}</span><div style="display:flex;gap:4px;flex-wrap:wrap">${btns.join("")}</div></div>`;
  }
  // ── Formatters ────────────────────────────────────────────────────────────
  // Dynamický počet řádků/karet = (88vh − overhead) / výška řádku
  // hasFilter: true pro history (filter bar +44px)
  _tlCalcPerPage(opts) {
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const modalH = window.innerHeight * 0.88;
    const hdr = isMob ? 90 : 68;
    const pad = 34;
    const bar = 44;
    const filter = opts && opts.hasFilter ? 44 : 0;
    const thead = isMob ? 0 : 36;
    const pag = isMob ? 56 : 52;
    const rowH = isMob ? 62 : 38;
    return Math.max(3, Math.floor((modalH - hdr - pad - bar - filter - thead - pag) / rowH));
  }
  _tlFmtDuration(secs) {
    if (!secs) return "0m";
    const h = Math.floor(secs / 3600);
    const m = Math.floor(secs % 3600 / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  _tlFmtTime(ts) {
    if (!ts) return "\u2014";
    const d = new Date(typeof ts === "number" ? ts * 1e3 : ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  _tlUserSelect(id, users, selUser) {
    const opts = [
      `<option value="">All users</option>`,
      ...(users || []).map((u) => `<option value="${u.user_id ?? ""}"${String(selUser ?? "") === String(u.user_id ?? "") ? " selected" : ""}>${u.friendly_name || u.user || "?"}</option>`)
    ].join("");
    return `<select id="${id}" style="${_TL_SEL_STY};max-width:130px">${opts}</select>`;
  }
  _tlFmtDate(ts) {
    if (!ts) return "\u2014";
    const d = new Date(typeof ts === "number" ? ts * 1e3 : ts);
    const sec = Math.floor((Date.now() - d.getTime()) / 1e3);
    if (sec < 60) return "just now";
    if (sec < 3600) return Math.floor(sec / 60) + "m ago";
    if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
    if (sec < 604800) return Math.floor(sec / 86400) + "d ago";
    return d.toLocaleDateString();
  }
  _tlSearchInput(id, value) {
    const SEARCH_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--is-text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    return `<div style="display:inline-flex;align-items:center;gap:5px;background:var(--is-row-hover,rgba(255,255,255,0.06));border:1px solid var(--is-divider,rgba(255,255,255,0.1));border-radius:4px;padding:4px 7px">
      ${SEARCH_SVG}
      <input id="${id}" type="search" value="${this._escHtml(value || "")}" placeholder="Search\u2026" autocomplete="off" style="background:none;border:none;outline:none;color:var(--is-text,#fff);font-size:12px;width:110px;min-width:60px">
    </div>`;
  }
};
var tautulliSharedMixin = _TautulliSharedMethods.prototype;

// src/render/tautulli-table.js
var _tlSortTh = (c, sortCol, sortDir, dataAttr) => `<th data-${dataAttr}="${c.sort}" style="${c.right ? "text-align:right;" : ""}cursor:pointer;user-select:none"><span style="white-space:nowrap">${c.label} <span style="opacity:${c.sort === sortCol ? 1 : 0.3};font-size:9px">${c.sort === sortCol ? sortDir === "asc" ? "\u2191" : "\u2193" : "\u2195"}</span></span></th>`;
var _DEL_BTN = (data, name) => `<button class="tl-edit-btn tl-del-btn" ${data} title="Delete"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Delete</button>`;
var _PURGE_BTN = (data, name) => `<button class="tl-edit-btn tl-purge-btn" ${data} title="Purge history"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Purge</button>`;
var _TautulliTableMethods = class {
  // ──────────────────────────────────────────────────────────────────────────
  // Libraries
  // ──────────────────────────────────────────────────────────────────────────
  _tlBodyLibraries(data, total) {
    const isMobile = window.matchMedia("(max-width:600px)").matches;
    const m = this._tautulliModal || {};
    const page = m.libsPage || 0;
    const perPage = this._tlCalcPerPage();
    const sortCol = m.libsSortCol || "plays";
    const sortDir = m.libsSortDir || "desc";
    const editMode = m.libsEditMode || false;
    const search = (m.libsSearch || "").toLowerCase().trim();
    const hidden = this._tlHidden("libsHiddenCols", ["type"]);
    const mobHidden = this._tlHidden("libsMobHiddenCols", ["type", "parents", "children", "lastStream"]);
    const filtered = search ? (data || []).filter((l) => (l.section_name || "").toLowerCase().includes(search)) : data || [];
    const tot = filtered.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const COLS = [
      { key: "name", label: "Library", sort: "section_name", right: false },
      { key: "type", label: "Type", sort: "section_type", right: false },
      { key: "count", label: "Items", sort: "count", right: true },
      { key: "parents", label: "Seasons/Albums", sort: "parent_count", right: true },
      { key: "children", label: "Episodes/Tracks", sort: "child_count", right: true },
      { key: "lastStream", label: "Streamed", sort: "last_accessed", right: false },
      { key: "lastPlayed", label: "Last Played", sort: "last_played", right: false },
      { key: "plays", label: "Plays", sort: "plays", right: true },
      { key: "duration", label: "Duration", sort: "duration", right: true }
    ];
    const vis = COLS.filter((c) => !hidden.has(c.key));
    const deskColItems = this._tlColItems(COLS.filter((c) => c.key !== "name"), hidden, "data-tl-lib-col");
    const deskColsBtn = this._tlColsMenu("tl-libs-cols-btn", "tl-libs-cols-menu", deskColItems, m.libsColsOpen);
    const MOB_LIB_COLS = [
      { key: "plays", label: "Plays" },
      { key: "lastPlayed", label: "Last Played" },
      { key: "type", label: "Type" },
      { key: "parents", label: "Seasons/Albums" },
      { key: "children", label: "Eps/Tracks" },
      { key: "lastStream", label: "Last Streamed" }
    ];
    const mobColItems = this._tlColItems(MOB_LIB_COLS, mobHidden, "data-tl-lib-mob-col");
    const mobColsBtn = this._tlColsMenu("tl-libs-mob-cols-btn", "tl-libs-mob-cols-menu", mobColItems, m.libsMobColsOpen);
    const editBtn = this._tlEditBtn("tl-libs-edit-btn", editMode);
    const searchEl = this._tlSearchInput("tl-libs-search", m.libsSearch);
    const colsBtn = isMobile ? mobColsBtn : deskColsBtn;
    const searchElFlex = searchEl.replace("display:inline-flex", "display:flex;flex:1").replace("width:110px", "flex:1").replace("min-width:60px", "min-width:0");
    const toolbar = `<div class="tl-toolbar">${searchElFlex}<div class="tl-toolbar-actions">${editBtn}${colsBtn}</div></div>`;
    const page2 = Math.min(page, totalPages - 1);
    const sliced = filtered.slice(page2 * perPage, (page2 + 1) * perPage);
    if (isMobile) {
      const cards = sliced.map((lib) => {
        const type = (lib.section_type || "").toLowerCase();
        const icon = this._tlLibSvgIcon(type, lib.section_name || "", "sm");
        const sid = lib.section_id || "";
        const editBtns = editMode ? `<div class="tl-mob-edit">
          ${_DEL_BTN(`data-tl-lib-delete="${sid}" data-tl-lib-name="${lib.section_name || sid}"`)}
          ${_PURGE_BTN(`data-tl-lib-purge="${sid}" data-tl-lib-name="${lib.section_name || sid}"`)}
        </div>` : "";
        const mp = [];
        if (!mobHidden.has("plays")) mp.push(`<span style="font-weight:600;flex-shrink:0">&#9654; ${lib.plays ?? 0}</span>`);
        if (!mobHidden.has("lastPlayed") && lib.last_played) mp.push(`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lib.last_played}</span>`);
        if (!mobHidden.has("type") && lib.section_type) mp.push(`<span style="text-transform:capitalize;color:var(--is-text-label)">${lib.section_type}</span>`);
        if (!mobHidden.has("parents") && lib.parent_count != null) mp.push(`<span>${lib.parent_count} sea/alb</span>`);
        if (!mobHidden.has("children") && lib.child_count != null) mp.push(`<span>${lib.child_count} ep/trk</span>`);
        if (!mobHidden.has("lastStream") && lib.last_accessed) mp.push(`<span>${this._tlFmtDate(lib.last_accessed)}</span>`);
        return `<div class="tl-mob-card"><div style="display:flex;align-items:center;gap:10px">
          <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--is-row-hover)">${icon.replace(/width="\d+" height="\d+"/, 'width="16" height="16"')}</div>
          <div style="flex:1;min-width:0"><div class="tl-mob-name">${lib.section_name || "\u2014"}</div>${mp.length ? `<div class="tl-mob-meta">${mp.join("")}</div>` : ""}</div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:15px;font-weight:700;color:rgba(250,180,50,0.9)">${lib.count ?? "\u2014"}</div>
            ${lib.duration ? `<div style="font-size:11px;color:var(--is-text-label)">${this._tlFmtDuration(lib.duration)}</div>` : ""}
          </div>
        </div>${editBtns}</div>`;
      }).join("") || '<div style="text-align:center;color:var(--is-text-muted);padding:30px">No library data</div>';
      return toolbar + `<div>${cards}</div>` + this._tlMobPag("tl-lpage", page, totalPages);
    }
    const editThHdr = editMode ? '<th style="white-space:nowrap;width:1px;padding-right:12px">Edit</th>' : "";
    const thead = vis.map((c) => _tlSortTh(c, sortCol, sortDir, "tl-lib-sort")).join("");
    const rows = sliced.map((lib) => {
      const type = (lib.section_type || "").toLowerCase();
      const icon = this._tlLibSvgIcon(type, lib.section_name || "", "md");
      const lAcc = lib.last_accessed ? this._tlFmtDate(lib.last_accessed) : '<span style="color:var(--is-text-muted)">never</span>';
      const lPly = lib.last_played ? `<span style="font-size:11px;color:var(--is-text-sec)">${lib.last_played}</span>` : '<span style="color:var(--is-text-muted)">n/a</span>';
      const cm = {
        name: `<td style="max-width:150px"><span style="display:flex;align-items:center;min-width:0">${icon}<strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lib.section_name || "\u2014"}</strong></span></td>`,
        type: `<td style="text-transform:capitalize;color:var(--is-text-label);white-space:nowrap">${lib.section_type || "\u2014"}</td>`,
        count: `<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">${lib.count ?? "\u2014"}</td>`,
        parents: `<td style="text-align:right">${lib.parent_count != null ? lib.parent_count : "\u2014"}</td>`,
        children: `<td style="text-align:right">${lib.child_count != null ? lib.child_count : "\u2014"}</td>`,
        lastStream: `<td style="white-space:nowrap">${lAcc}</td>`,
        lastPlayed: `<td style="max-width:160px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lPly}</div></td>`,
        plays: `<td style="text-align:right;font-weight:700">${lib.plays ?? 0}</td>`,
        duration: `<td style="text-align:right;white-space:nowrap">${lib.duration ? this._tlFmtDuration(lib.duration) : "\u2014"}</td>`
      };
      const sid = lib.section_id || "";
      const editCell = editMode ? `<td style="white-space:nowrap;padding-right:12px"><div style="display:inline-flex;align-items:center;gap:4px">
        ${_DEL_BTN(`data-tl-lib-delete="${sid}" data-tl-lib-name="${lib.section_name || sid}"`)}
        ${_PURGE_BTN(`data-tl-lib-purge="${sid}" data-tl-lib-name="${lib.section_name || sid}"`)}
      </div></td>` : "";
      return `<tr>${editCell}${vis.map((c) => cm[c.key] || "<td>\u2014</td>").join("")}</tr>`;
    }).join("");
    return toolbar + `<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${editThHdr}${thead}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length}" style="text-align:center;color:var(--is-text-muted);padding:30px">No library data</td></tr>`}</tbody></table></div>` + this._tlMobPag("tl-lpage", page, totalPages);
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────────────────────────────────
  _tlIpReport() {
    const tl = this._tautulli || {};
    const m = this._tautulliModal || {};
    if (!tl.sharingDetected || tl.sharingAcked) return "";
    const open = m.ipReportOpen !== false;
    const threshold = this._config?.security?.ip_sharing_threshold ?? 2;
    const users = tl.sharingUsers || [];
    const report = tl.ipReport || {};
    const rows = users.map((name) => {
      const ips = report[name] || [];
      const ipRows = ips.map((e) => {
        const d = e.lastSeen ? new Date(e.lastSeen * 1e3) : null;
        const dateStr = d ? d.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" }) : "\u2014";
        return `<tr>
          <td style="padding:4px 8px;font-size:11px;font-family:monospace;color:var(--is-text)">${e.ip}</td>
          <td style="padding:4px 8px;font-size:11px;color:var(--is-text-muted)">${dateStr}</td>
          <td style="padding:4px 8px;font-size:11px;color:var(--is-text-muted);text-align:right">${e.count}</td>
        </tr>`;
      }).join("");
      return `<div style="margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;color:rgba(255,150,150,0.9);margin-bottom:6px;display:flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${name}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.08)">
              <th style="padding:3px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left">IP Address</th>
              <th style="padding:3px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left">Last Seen</th>
              <th style="padding:3px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:right">Plays</th>
            </tr>
          </thead>
          <tbody>${ipRows}</tbody>
        </table>
      </div>`;
    }).join("");
    const chevron = open ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>` : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<div style="background:rgba(180,30,30,0.12);border:1px solid rgba(255,100,100,0.2);border-radius:8px;margin-bottom:10px;overflow:hidden">
      <div id="tl-ip-report-toggle" style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;user-select:none">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,150,150,0.9)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style="font-size:12px;font-weight:700;color:rgba(255,150,150,0.95);flex:1">Account sharing detected \xB7 ${users.length} user${users.length !== 1 ? "s" : ""} \xB7 ${threshold}+ unique IPs</span>
        <button class="tl-ack-btn" id="tl-ack-btn" style="font-size:10px;padding:3px 10px;margin-right:4px" onclick="event.stopPropagation()">Acknowledge</button>
        ${chevron}
      </div>
      ${open ? `<div style="padding:0 12px 12px">${rows}</div>` : ""}
    </div>`;
  }
  _tlBodyUsers(data, total) {
    const isMobile = window.matchMedia("(max-width:600px)").matches;
    const m = this._tautulliModal || {};
    const page = m.usersPage || 0;
    const perPage = this._tlCalcPerPage();
    const sortCol = m.usersSortCol || "plays";
    const sortDir = m.usersSortDir || "desc";
    const editMode = m.usersEditMode || false;
    const search = (m.usersSearch || "").toLowerCase().trim();
    const hidden = this._tlHidden("usersHiddenCols", ["username", "fullname", "email"]);
    const mobHidden = this._tlHidden("usersMobHiddenCols", ["lastPlayed", "platform", "player", "ip", "username", "email"]);
    const filtered = search ? (data || []).filter((u) => [u.friendly_name || "", u.username || "", u.email || ""].some((v) => v.toLowerCase().includes(search))) : data || [];
    const tot = filtered.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const COLS = [
      { key: "user", label: "User", sort: "friendly_name", right: false },
      { key: "username", label: "Username", sort: "username", right: false },
      { key: "fullname", label: "Full Name", sort: "full_name", right: false },
      { key: "email", label: "Email", sort: "email", right: false },
      { key: "lastSeen", label: "Last Streamed", sort: "last_seen", right: false },
      { key: "ip", label: "Last Known IP", sort: "ip_address", right: false },
      { key: "platform", label: "Last Platform", sort: "platform", right: false },
      { key: "player", label: "Last Player", sort: "player", right: false },
      { key: "lastPlayed", label: "Last Played", sort: "last_played", right: false },
      { key: "plays", label: "Total Plays", sort: "plays", right: true },
      { key: "duration", label: "Total Duration", sort: "duration", right: true }
    ];
    const vis = COLS.filter((c) => !hidden.has(c.key));
    const tl2 = this._tautulli || {};
    const showBanner = tl2.sharingDetected && !tl2.sharingAcked;
    const wU = tl2.sharingUsers || [];
    const banner = "";
    const deskColItems = this._tlColItems(COLS.filter((c) => c.key !== "user"), hidden, "data-tl-col");
    const deskColsBtn = this._tlColsMenu("tl-users-cols-btn", "tl-users-cols-menu", deskColItems, m.usersColsOpen);
    const MOB_USR_COLS = [
      { key: "lastSeen", label: "Last Seen" },
      { key: "lastPlayed", label: "Last Played" },
      { key: "platform", label: "Platform" },
      { key: "player", label: "Player" },
      { key: "ip", label: "Last IP" },
      { key: "username", label: "Username" },
      { key: "email", label: "Email" }
    ];
    const mobColItems = this._tlColItems(MOB_USR_COLS, mobHidden, "data-tl-usr-mob-col");
    const mobColsBtn = this._tlColsMenu("tl-users-mob-cols-btn", "tl-users-mob-cols-menu", mobColItems, m.usersMobColsOpen);
    const editBtn = this._tlEditBtn("tl-users-edit-btn", editMode);
    const searchEl = this._tlSearchInput("tl-users-search", m.usersSearch);
    const colsBtn = isMobile ? mobColsBtn : deskColsBtn;
    const searchElFlex = searchEl.replace("display:inline-flex", "display:flex;flex:1").replace("width:110px", "flex:1").replace("min-width:60px", "min-width:0");
    const ipReport = this._tlIpReport();
    const toolbar = `${ipReport}<div class="tl-toolbar">${searchElFlex}<div class="tl-toolbar-actions">${editBtn}${colsBtn}</div></div>`;
    const page2 = Math.min(page, totalPages - 1);
    const sliced = filtered.slice(page2 * perPage, (page2 + 1) * perPage);
    if (isMobile) {
      const warnUsers2 = wU;
      const cards = sliced.map((u) => {
        const name = u.friendly_name || u.username || "\u2014";
        const thumb = u.user_thumb || "";
        const av = thumb ? `<img src="${thumb}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--is-divider)" loading="lazy" onerror="this.style.display='none'">` : `<span style="width:36px;height:36px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:13px;font-weight:700">${(name[0] || "?").toUpperCase()}</span>`;
        const uid = u.user_id || "";
        const kh = u.keep_history != null ? Number(u.keep_history) : 1;
        const ag = u.allow_guest != null ? Number(u.allow_guest) : 0;
        const editBtns = editMode ? `<div class="tl-mob-edit">
          ${_DEL_BTN(`data-tl-delete="${uid}" data-tl-name="${this._escHtml(name)}"`)}
          ${_PURGE_BTN(`data-tl-purge="${uid}" data-tl-name="${this._escHtml(name)}"`)}
          <button class="tl-edit-btn tl-tog-btn${kh ? " on" : ""}" data-tl-toggle-hist="${uid}" data-tl-kh="${kh}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
          <button class="tl-edit-btn tl-tog-btn${ag ? " on" : ""}" data-tl-toggle-guest="${uid}" data-tl-ag="${ag}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></button>
        </div>` : "";
        const um = [];
        if (!mobHidden.has("lastSeen")) um.push(`<span>${u.last_seen ? this._tlFmtDate(u.last_seen) : "Never seen"}</span>`);
        if (!mobHidden.has("lastPlayed") && u.last_played) um.push(`<span style="display:inline-flex;align-items:center;gap:3px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._tlMediaIcon(u.media_type, 10)}<span style="overflow:hidden;text-overflow:ellipsis">${this._escHtml(u.last_played)}</span></span>`);
        if (!mobHidden.has("platform") && u.platform) um.push(`<span>${this._escHtml(u.platform)}</span>`);
        if (!mobHidden.has("player") && u.player) um.push(`<span>${this._escHtml(u.player)}</span>`);
        if (!mobHidden.has("ip") && u.ip_address) um.push(`<span style="font-family:monospace;font-size:10px">${this._escHtml(u.ip_address)}</span>`);
        if (!mobHidden.has("username") && u.username) um.push(`<span style="color:var(--is-text-label)">${this._escHtml(u.username)}</span>`);
        if (!mobHidden.has("email") && u.email) um.push(`<span style="color:var(--is-text-label);font-size:10px">${this._escHtml(u.email)}</span>`);
        return `<div class="tl-mob-card"><div style="display:flex;align-items:center;gap:10px">
          ${av}
          <div style="flex:1;min-width:0"><div class="tl-mob-name">${this._escHtml(name)}</div>${um.length ? `<div class="tl-mob-meta">${um.join("")}</div>` : ""}</div>
          <div style="text-align:right;flex-shrink:0">
            <div style="color:rgba(250,180,50,0.9);font-weight:700">&#9654; ${u.plays ?? 0}</div>
            <div style="font-size:11px;color:var(--is-text-label)">${u.duration ? this._tlFmtDuration(u.duration) : "\u2014"}</div>
          </div>
        </div>${editBtns}</div>`;
      }).join("") || '<div style="text-align:center;color:var(--is-text-muted);padding:30px">No user data</div>';
      return toolbar + `<div>${cards}</div>` + this._tlMobPag("tl-upage", page, totalPages);
    }
    const warnUsers = wU;
    const editThHdr = editMode ? '<th style="white-space:nowrap;width:1px;padding-right:12px">Edit</th>' : "";
    const thead = vis.map((c) => _tlSortTh(c, sortCol, sortDir, "tl-sort")).join("");
    const rows = sliced.map((u) => {
      const name = u.friendly_name || u.username || "\u2014";
      const isW = warnUsers.includes(name) || warnUsers.includes(u.username);
      const thumb = u.user_thumb || "";
      const av = thumb ? `<img src="${thumb}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--is-divider)" loading="lazy" onerror="this.style.display='none'">` : `<span style="width:30px;height:30px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:12px;font-weight:700">${(name[0] || "?").toUpperCase()}</span>`;
      const mIco = u.last_played ? this._tlMediaIcon(u.media_type) : "";
      const cm = {
        user: `<td><div style="display:flex;align-items:center;gap:8px">${av}<span style="font-weight:600">${this._escHtml(name)}</span></div></td>`,
        username: `<td style="color:var(--is-text-label)">${this._escHtml(u.username || "\u2014")}</td>`,
        fullname: `<td style="color:var(--is-text-label)">${this._escHtml(u.full_name || "\u2014")}</td>`,
        email: `<td style="color:var(--is-text-label);font-size:11px">${this._escHtml(u.email || "\u2014")}</td>`,
        lastSeen: `<td>${u.last_seen ? this._tlFmtDate(u.last_seen) : '<span style="color:var(--is-text-muted)">never</span>'}</td>`,
        ip: `<td style="font-family:monospace;font-size:11px">${this._escHtml(u.ip_address || "n/a")}</td>`,
        platform: `<td>${this._escHtml(u.platform || "n/a")}</td>`,
        player: `<td>${u.player ? `<span style="display:inline-flex;align-items:center;gap:5px"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="color:var(--is-text-muted)" stroke="none"><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="10 8 17 12 10 16"/></svg>${this._escHtml(u.player)}</span>` : '<span style="color:var(--is-text-muted)">n/a</span>'}</td>`,
        lastPlayed: `<td style="max-width:160px"><div style="display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.last_played ? mIco + '<span style="overflow:hidden;text-overflow:ellipsis">' + this._escHtml(u.last_played) + "</span>" : '<span style="color:var(--is-text-muted)">n/a</span>'}</div></td>`,
        plays: `<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">${u.plays ?? 0}</td>`,
        duration: `<td style="text-align:right">${u.duration ? this._tlFmtDuration(u.duration) : "\u2014"}</td>`
      };
      const uid = u.user_id || "";
      const kh = u.keep_history != null ? Number(u.keep_history) : 1;
      const ag = u.allow_guest != null ? Number(u.allow_guest) : 0;
      const editCell = editMode ? `<td style="white-space:nowrap;padding-right:12px"><div style="display:inline-flex;align-items:center;gap:4px">
        ${_DEL_BTN(`data-tl-delete="${uid}" data-tl-name="${this._escHtml(name)}"`)}
        ${_PURGE_BTN(`data-tl-purge="${uid}" data-tl-name="${this._escHtml(name)}"`)}
        <button class="tl-edit-btn tl-tog-btn${kh ? " on" : ""}" data-tl-toggle-hist="${uid}" data-tl-kh="${kh}" title="${kh ? "Disable" : "Enable"} history"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
        <button class="tl-edit-btn tl-tog-btn${ag ? " on" : ""}" data-tl-toggle-guest="${uid}" data-tl-ag="${ag}" title="${ag ? "Disable" : "Enable"} guest"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></button>
      </div></td>` : "";
      return `<tr${isW ? ' class="tl-row-warn"' : ""}>${editCell}${vis.map((c) => cm[c.key] || "<td>\u2014</td>").join("")}</tr>`;
    }).join("");
    return toolbar + `<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${editThHdr}${thead}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length}" style="text-align:center;color:var(--is-text-muted);padding:30px">No user data</td></tr>`}</tbody></table></div>` + this._tlMobPag("tl-upage", page, totalPages);
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Refetch
  // ──────────────────────────────────────────────────────────────────────────
  async _tlRefetchLibraries(body) {
    const m = this._tautulliModal;
    if (!m) return;
    body.innerHTML = '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading\u2026</div>';
    const pp = this._tlCalcPerPage();
    const start = (m.libsPage || 0) * pp;
    const r = await this._tlApiFetch("get_libraries_table", `length=${pp}&start=${start}&order_column=${m.libsSortCol || "plays"}&order_dir=${m.libsSortDir || "desc"}`);
    if (!this._tautulliModal) return;
    m.libsData = r?.response?.data?.data || [];
    m.libsTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || m.libsData.length;
    body.innerHTML = this._tlBodyLibraries(m.libsData, m.libsTotal);
    this._wireTautulliModalBody(body);
  }
  async _tlRefetchUsers(body) {
    const m = this._tautulliModal;
    if (!m) return;
    body.innerHTML = '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading\u2026</div>';
    const pp = this._tlCalcPerPage();
    const start = (m.usersPage || 0) * pp;
    const r = await this._tlApiFetch("get_users_table", `length=${pp}&start=${start}&order_column=${m.usersSortCol || "plays"}&order_dir=${m.usersSortDir || "desc"}`);
    if (!this._tautulliModal) return;
    m.usersData = r?.response?.data?.data || [];
    m.usersTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || m.usersData.length;
    body.innerHTML = this._tlBodyUsers(m.usersData, m.usersTotal);
    this._wireTautulliModalBody(body);
  }
  // ──────────────────────────────────────────────────────────────────────────
  // History
  // ──────────────────────────────────────────────────────────────────────────
  _tlBodyHistory() {
    const m = this._tautulliModal;
    if (!m) return "";
    if (m.histLoading) return '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading\u2026</div>';
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const page = m.histPage || 0;
    const perPage = this._tlCalcPerPage({ hasFilter: true });
    const tot = m.histTotal || 0;
    const data = m.histData || [];
    const media = m.histMedia || null;
    const playback = m.histPlayback || null;
    const delMode = m.histDeleteMode || false;
    const users = m.histUsers || [];
    const selUser = m.histUser || "";
    const hidden = this._tlHidden("histHiddenCols", ["ip", "paused", "stopped"]);
    const mobHidden = this._tlHidden("histMobHiddenCols", ["ip", "platform", "product", "player", "paused", "stopped"]);
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const HIST_COLS = [
      { key: "date", label: "Date", right: false },
      { key: "user", label: "User", right: false },
      { key: "ip", label: "IP", right: false },
      { key: "platform", label: "Platform", right: false },
      { key: "product", label: "Product", right: false },
      { key: "player", label: "Player", right: false },
      { key: "title", label: "Title", right: false },
      { key: "started", label: "Started", right: false },
      { key: "paused", label: "Paused", right: true },
      { key: "stopped", label: "Stopped", right: false },
      { key: "duration", label: "Duration", right: true }
    ];
    const userSel = this._tlUserSelect("tl-hist-user-sel", users, selUser);
    const mediaBtns = [
      { v: "movie", l: "Movies" },
      { v: "episode", l: "TV Shows" },
      { v: "track", l: "Music" },
      { v: "live", l: "Live TV" }
    ].map((f) => `<button class="tl-page-btn${media === f.v ? " active" : ""}" data-tl-hist-media="${f.v}" style="white-space:nowrap;flex-shrink:0">${f.l}</button>`).join("");
    const playBtns = [
      { v: "direct play", l: "Direct Play" },
      { v: "direct stream", l: "Direct Stream" },
      { v: "transcode", l: "Transcode" }
    ].map((f) => `<button class="tl-page-btn${playback === f.v ? " active" : ""}" data-tl-hist-play="${f.v}" style="white-space:nowrap;flex-shrink:0">${f.l}</button>`).join("");
    const delBtn = this._tlEditBtn("tl-hist-del-mode", delMode, "Delete");
    const MOB_HIST_PICKER = [
      { key: "platform", label: "Platform" },
      { key: "player", label: "Player" },
      { key: "started", label: "Started" },
      { key: "duration", label: "Duration" },
      { key: "ip", label: "IP" },
      { key: "paused", label: "Paused" },
      { key: "stopped", label: "Stopped" }
    ];
    const colsBtn = isMob ? this._tlColsMenu("tl-hist-mob-cols-btn", "tl-hist-mob-cols-menu", this._tlColItems(MOB_HIST_PICKER, mobHidden, "data-tl-hist-mob-col"), m.histMobColsOpen) : this._tlColsMenu("tl-hist-cols-btn", "tl-hist-cols-menu", this._tlColItems(HIST_COLS.filter((c) => c.key !== "title"), hidden, "data-tl-hist-col"), m.histColsOpen);
    const histSearchEl = this._tlSearchInput("tl-hist-search", m.histSearch);
    const histSearchElFlex = histSearchEl.replace("display:inline-flex", "display:flex;flex:1").replace("width:110px", "flex:1").replace("min-width:60px", "min-width:0");
    let toolbar;
    if (isMob) {
      const row1 = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">${histSearchElFlex}<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">${delBtn}${colsBtn}</div></div>`;
      const userSelFull = userSel.replace("max-width:130px", "width:100%;max-width:none").replace("margin:0 4px", "margin:0");
      const row2s = `<div style="margin-bottom:6px">${userSelFull}</div>`;
      const row3 = `<div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap">${mediaBtns}${playBtns}</div>`;
      toolbar = row1 + row2s + row3;
    } else {
      const filterRow = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">${userSel.replace("margin:0 4px", "margin:0")}<div style="display:flex;gap:4px;flex-wrap:wrap">${mediaBtns}</div><div style="display:flex;gap:4px;flex-wrap:wrap">${playBtns}</div></div>`;
      toolbar = `<div class="tl-toolbar">${histSearchElFlex}<div class="tl-toolbar-actions">${delBtn}${colsBtn}</div></div>${filterRow}`;
    }
    const _wRing = '<circle cx="7" cy="7" r="5.5" fill="none" style="stroke:var(--is-text-muted)" stroke-width="1.5"/>';
    const _wSvg = (inner) => `<svg width="14" height="14" viewBox="0 0 14 14">${inner}</svg>`;
    const _wArc = (d) => `<path d="${d}" style="fill:var(--is-text-body)"/>`;
    const watchSvg = (ws) => ws === 4 ? _wSvg('<circle cx="7" cy="7" r="5.5" style="fill:var(--is-text-body)"/>') : ws === 3 ? _wSvg(`${_wRing}${_wArc("M7,7 L7,1.5 A5.5,5.5 0,1,1 1.5,7 Z")}`) : ws === 2 ? _wSvg(`${_wRing}${_wArc("M7,7 L7,1.5 A5.5,5.5 0,0,1 7,12.5 Z")}`) : ws === 1 ? _wSvg(`${_wRing}${_wArc("M7,7 L7,1.5 A5.5,5.5 0,0,1 12.5,7 Z")}`) : _wSvg(_wRing);
    if (!data.length) {
      return toolbar + '<div style="text-align:center;color:var(--is-text-muted);padding:30px">No history</div>';
    }
    if (isMob) {
      const cards = data.map((h) => {
        const icon = this._tlMediaIcon(h.media_type || "", 12);
        const title = this._escHtml(h.full_title || h.title || "\u2014");
        const user = this._escHtml(h.friendly_name || h.user || "\u2014");
        const ago = h.date ? this._tlFmtDate(h.date) : "\u2014";
        const dur = h.duration ? this._tlFmtDuration(h.duration) : "\u2014";
        const pct = h.percent_complete ?? 0;
        const ws = pct >= 85 ? 4 : pct >= 63 ? 3 : pct >= 38 ? 2 : pct >= 10 ? 1 : 0;
        const mp = [];
        if (!mobHidden.has("platform") && h.platform) mp.push(this._escHtml(h.platform));
        if (!mobHidden.has("player") && h.player) mp.push(this._escHtml(h.player));
        if (!mobHidden.has("started") && h.started) mp.push(this._tlFmtTime(h.started));
        if (!mobHidden.has("ip") && h.ip_address) mp.push(h.ip_address);
        if (!mobHidden.has("paused") && h.paused_counter) mp.push("paused " + this._tlFmtDuration(h.paused_counter));
        const meta = `<div class="tl-mob-meta"><span>${user}</span><span style="color:var(--is-text-muted)"> &middot; </span><span>${ago}</span>${mp.map((v) => `<span style="color:var(--is-text-muted)"> &middot; </span><span>${v}</span>`).join("")}</div>`;
        const delEl = delMode ? `<button class="tl-edit-btn tl-del-btn" data-tl-hist-delete="${h.row_id}" style="margin-top:6px;font-size:10px">Delete</button>` : "";
        return `<div class="tl-mob-card"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div class="tl-mob-name" style="display:flex;align-items:center;gap:4px">${icon}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${title}</span></div>${meta}</div><div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:600;color:var(--is-text)">${dur}</div><div style="margin-top:2px;display:flex;justify-content:flex-end">${watchSvg(ws)}</div></div></div>${delEl}</div>`;
      }).join("");
      return toolbar + `<div>${cards}</div>` + this._tlMobPag("tl-hpage", page, totalPages);
    }
    const vis = HIST_COLS.filter((c) => !hidden.has(c.key));
    const thead = vis.map((c) => `<th style="${c.right ? "text-align:right;" : ""}white-space:nowrap">${c.label}</th>`).join("") + "<th></th>";
    const delHdr = delMode ? '<th style="width:1px"></th>' : "";
    const rows = data.map((h) => {
      const icon = this._tlMediaIcon(h.media_type || "", 11);
      const pct = h.percent_complete ?? 0;
      const ws = pct >= 85 ? 4 : pct >= 63 ? 3 : pct >= 38 ? 2 : pct >= 10 ? 1 : 0;
      const rid = h.row_id || "";
      const esc = (s) => this._escHtml(s || "");
      const cm = {
        date: `<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">${h.date ? this._tlFmtDate(h.date) : "\u2014"}</td>`,
        user: `<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.friendly_name || h.user)}</td>`,
        ip: `<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">${h.ip_address || "\u2014"}</td>`,
        platform: `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.platform)}</td>`,
        product: `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.product)}</td>`,
        player: `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.player)}</td>`,
        title: `<td style="max-width:240px"><div style="display:flex;align-items:center;gap:5px;min-width:0">${icon}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1" title="${esc(h.full_title || h.title)}">${esc(h.full_title || h.title)}</span></div></td>`,
        started: `<td style="white-space:nowrap;font-size:11px">${h.started ? this._tlFmtTime(h.started) : "\u2014"}</td>`,
        paused: `<td style="text-align:right;white-space:nowrap;font-size:11px">${h.paused_counter ? this._tlFmtDuration(h.paused_counter) : "0m"}</td>`,
        stopped: `<td style="white-space:nowrap;font-size:11px">${h.stopped ? this._tlFmtTime(h.stopped) : "\u2014"}</td>`,
        duration: `<td style="text-align:right;white-space:nowrap;font-weight:600">${h.duration ? this._tlFmtDuration(h.duration) : "\u2014"}</td>`
      };
      const watchCell = `<td style="text-align:right;padding-right:8px;white-space:nowrap">${watchSvg(ws)}</td>`;
      const delCell = delMode ? `<td style="padding:0 4px;white-space:nowrap"><button class="tl-edit-btn tl-del-btn" data-tl-hist-delete="${rid}"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></td>` : "";
      return `<tr>${vis.map((c) => cm[c.key] || "<td>\u2014</td>").join("")}${watchCell}${delCell}</tr>`;
    }).join("");
    return toolbar + `<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${thead}${delHdr}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length + 2}" style="text-align:center;color:var(--is-text-muted);padding:30px">No history</td></tr>`}</tbody></table></div>` + this._tlMobPag("tl-hpage", page, totalPages);
  }
  async _tlRefetchHistory(body) {
    const m = this._tautulliModal;
    if (!m) return;
    body.innerHTML = '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading\u2026</div>';
    const data = await this._tlFetchHistory(m.histPage, m.histUser, m.histMedia, m.histPlayback, this._tlCalcPerPage({ hasFilter: true }), m.histSearch);
    if (!this._tautulliModal) return;
    m.histData = data.data || [];
    m.histTotal = data.recordsFiltered || 0;
    body.innerHTML = this._tlBodyHistory();
    this._wireTautulliModalBody(body);
  }
};
var tautulliTableMixin = _TautulliTableMethods.prototype;

// src/render/tautulli.js
var _TautulliMethods = class {
  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────
  _renderTautulli() {
    const data = this._tautulli || {};
    const act = data.activity || {};
    const stats = data.stats || [];
    const showWarn = data.sharingDetected && !data.sharingAcked;
    return `
      <div class="sec-card">
        <div class="col-hdr" style="margin-bottom:5px">
          <ha-icon icon="mdi:chart-bar" style="--mdc-icon-size:24px"></ha-icon>
          <span class="col-hdr-title">Statistics</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._tlLibCard(data)}
            ${showWarn ? this._tlSharingCard(data) : this._tlUsersCard(stats, act, data)}
            ${this._tlHistoryCard(data)}
            ${this._tlActivityCard(data.playsData)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }
  _tlLibCard(data) {
    const libs = (data.libraries || []).filter((lib) => (lib.section_type || "").toLowerCase() !== "live");
    const rows = libs.map((lib, i) => {
      const type = (lib.section_type || "").toLowerCase();
      const count = lib.count ?? lib.plays ?? 0;
      const dim = count === 0 ? ";opacity:0.28" : "";
      const sep = i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : "";
      return `<div style="${sep}display:flex;align-items:center;gap:5px;padding:4px 0">` + this._tlLibSvgIcon(type, lib.section_name, "sm") + `<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-left:1px">${lib.section_name || "\u2014"}</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0${dim}">${count}</span></div>`;
    }).join("") || `<div style="font-size:9px;color:rgba(255,255,255,0.3);padding:8px 0">No data</div>`;
    const sectTag = libs.length > 0 ? `<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${libs.length}</span>` : "";
    return `<div class="tl-card" data-tl-open="libraries" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px">
      <div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap">
        <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">Libraries</span>
        ${sectTag}
      </div>
      <div style="flex:1;position:relative;z-index:2">${rows}</div>
    </div>`;
  }
  _tlUsersCard(stats, act, data) {
    const userRows = (stats || []).find((s) => s.stat_id === "top_users")?.rows || [];
    const sessions = act?.sessions || [];
    const activeUsers = new Set(sessions.map((s) => s.user_id || s.user)).size;
    const items = userRows.slice(0, 5).map((r) => {
      const name = r.friendly_name || r.user || "\u2014";
      const plays = r.total_plays ?? 0;
      const thumb = r.user_thumb || "";
      const av = thumb ? `<img src="${thumb}" style="width:14px;height:14px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.18)" loading="lazy" onerror="this.style.display='none'">` : `<span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,0.14);display:inline-block;flex-shrink:0"></span>`;
      const sep = userRows.indexOf(r) > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : "";
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:4px 0">${av}<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${name}</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${plays}</span></div>`;
    }).join("") || `<div style="font-size:9px;color:rgba(255,255,255,0.3)">No data</div>`;
    const activeTag = activeUsers > 0 ? `<span style="font-size:10px;font-weight:700;color:#34d399;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${activeUsers} active</span>` : "";
    return `<div class="tl-card" data-tl-open="users" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px">
      <div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap">
        <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">Users</span>
        ${activeTag}
      </div>
      <div style="flex:1;position:relative;z-index:2">${items}</div>
    </div>`;
  }
  _tlSharingCard(data) {
    const name = (data.sharingUsers || [])[0] || "Unknown";
    return `<div class="tl-card tl-card-warn" data-tl-open="users">
      <span class="media-type-tag" style="color:rgba(255,150,150,0.95)">! Sharing</span>
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(70,0,0,0.95) 0%,rgba(40,0,0,0.65) 55%,transparent 100%);padding:48px 8px 8px;z-index:1">
        <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${name}</div>
        <div style="font-size:9px;color:rgba(255,150,150,0.7)">Multiple IPs \xB7 Click to review</div>
      </div>
    </div>`;
  }
  _tlHistoryCard(data) {
    const hist = (data.recentHistory || []).slice(0, 3);
    const streams = (data.activity || {}).stream_count ?? 0;
    const items = hist.map((h, i) => {
      const title = h.full_title || h.title || "\u2014";
      const user = h.friendly_name || h.user || "";
      const ago = h.date ? this._tlFmtDate(h.date) : "";
      const sep = i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : "";
      return `<div style="${sep}padding:4px 0"><div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px">${user}${ago ? " \xB7 " + ago : ""}</div></div>`;
    }).join("") || `<div style="font-size:9px;color:rgba(255,255,255,0.3);padding:8px 0">No history</div>`;
    const streamTag = streams > 0 ? `<span style="font-size:10px;font-weight:700;color:#34d399;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${streams} now</span>` : "";
    return `<div class="tl-card" data-tl-open="history" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px">
      <div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap">
        <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">History</span>
        ${streamTag}
      </div>
      <div style="flex:1;position:relative;z-index:2">${items}</div>
    </div>`;
  }
  _tlActivityCard(playsData) {
    const days = (playsData || []).slice(-7);
    const max = Math.max(...days.map((d) => d.value || 0), 1);
    const total = days.reduce((s, d) => s + (d.value || 0), 0);
    const bars = days.map((d) => {
      const h = Math.max(d.value ? 2 : 0, Math.round((d.value || 0) / max * 100));
      const gap = 100 - h;
      return `<div style="flex:1;display:flex;flex-direction:column"><div style="flex:${gap}"></div><div style="flex:${h};background:rgba(255,255,255,0.55);border-radius:2px 2px 0 0${d.value ? "" : ";display:none"}"></div></div>`;
    }).join("");
    const labels = days.map(
      (d) => `<div style="flex:1;font-size:6px;color:rgba(255,255,255,0.3);text-align:center;padding:1px 0 0">${(d.date || "").slice(-2)}</div>`
    ).join("");
    const playsTag = total > 0 ? `<span style="font-size:10px;font-weight:700;color:#63b3ed;background:rgba(99,179,237,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} plays</span>` : "";
    return `<div class="tl-card" data-tl-open="graphs" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px">
      <div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap">
        <div style="display:flex;flex-direction:column;gap:1px">
          <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">Charts</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic">last 7 days</span>
        </div>
        ${playsTag}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0">
        <div style="flex:1;display:flex;gap:2px">${bars || ""}</div>
        <div style="display:flex;gap:2px;margin-top:2px">${labels}</div>
      </div>
    </div>`;
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Modal — open / close / shell HTML
  // ──────────────────────────────────────────────────────────────────────────
  async _openTautulliModal(tab) {
    tab = tab || "libraries";
    const prefs = await this._tlLoadColPrefs();
    const hSet = (key, defs) => prefs[key] ? new Set(prefs[key]) : new Set(defs);
    this._tautulliModal = {
      tab,
      ipReportOpen: true,
      histPage: 0,
      histPerPage: 10,
      histSearch: "",
      histUser: null,
      histMedia: null,
      histPlayback: null,
      histTotal: 0,
      histData: [],
      histUsers: [],
      histLoading: false,
      histDeleteMode: false,
      histColsOpen: false,
      histMobColsOpen: false,
      histHiddenCols: hSet("histHiddenCols", ["ip", "paused", "stopped"]),
      histMobHiddenCols: hSet("histMobHiddenCols", ["ip", "platform", "product", "player", "paused", "stopped"]),
      graphsSub: "media",
      graphsData: null,
      graphsLoading: false,
      graphsMetric: "plays",
      graphsRange: window.matchMedia("(max-width:600px)").matches ? 7 : 30,
      graphsSelectedUsers: null,
      graphsUserList: [],
      graphsDdOpen: false,
      usersPage: 0,
      usersPerPage: 10,
      usersSortCol: "plays",
      usersSortDir: "desc",
      usersSearch: "",
      usersData: [],
      usersTotal: 0,
      usersHiddenCols: hSet("usersHiddenCols", ["username", "fullname", "email"]),
      usersColsOpen: false,
      usersMobHiddenCols: hSet("usersMobHiddenCols", ["lastPlayed", "platform", "player", "ip", "username", "email"]),
      usersMobColsOpen: false,
      usersEditMode: false,
      libsPage: 0,
      libsPerPage: 10,
      libsSortCol: "plays",
      libsSortDir: "desc",
      libsSearch: "",
      libsData: [],
      libsTotal: 0,
      libsEditMode: false,
      libsHiddenCols: hSet("libsHiddenCols", ["type"]),
      libsColsOpen: false,
      libsMobHiddenCols: hSet("libsMobHiddenCols", ["type", "parents", "children", "lastStream"]),
      libsMobColsOpen: false
    };
    this.shadowRoot.querySelector("[data-tl-modal]")?.remove();
    const wrap = document.createElement("div");
    wrap.innerHTML = this._tlModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireTautulliModal(el);
    this._tlLoadTab(tab, el);
  }
  _closeTautulliModal() {
    this.shadowRoot.querySelector("[data-tl-modal]")?.remove();
    this._tautulliModal = null;
  }
  _tlModalHtml(tab) {
    const dayClass = this._isDaytime && this._config?.styles?.dayNightMode !== false ? " popup-day" : "";
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const allTabs = ["libraries", "users", "history", "graphs"];
    const tabBtns = allTabs.map(
      (t) => `<button class="is-f-btn${t === tab ? " active" : ""}" data-tl-tab="${t}">${this._tlTabLabel(t)}</button>`
    ).join("");
    const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const sub = this._tlTabSubtitle(tab);
    const hdrInner = isMobile ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
           <div style="flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._tlTabTitle(tab)}</div>
           <button class="popup-close" id="tl-close" style="position:relative;top:0;right:0;flex-shrink:0">${closeSvg}</button>
         </div>
         <div class="is-filter">${tabBtns}</div>` : `<div style="flex:1;min-width:0">
           <div id="tl-hdr-title" style="font-size:15px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._tlTabTitle(tab)}</div>
           ${sub ? `<div id="tl-hdr-sub" style="font-size:12px;color:var(--is-text-sec);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>` : ""}
         </div>
         <div class="is-filter" style="flex-shrink:0">${tabBtns}</div>
         <button class="popup-close" id="tl-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:flex-start;margin-left:4px">${closeSvg}</button>`;
    const hdrStyle = isMobile ? "padding:14px 16px 12px;flex-direction:column;align-items:stretch" : "padding:14px 22px 12px;gap:12px;flex-wrap:wrap";
    return `<div class="popup-overlay${dayClass}" data-tl-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="${hdrStyle}">${hdrInner}</div>
        <div class="popup-body" id="tl-body" style="padding:${isMobile ? "12px 14px 16px" : "14px 22px 20px"}">
          <div class="is-loading"><span>Loading\u2026</span></div>
        </div>
      </div>
    </div>`;
  }
  _tlTabLabel(t) {
    return { libraries: "Libraries", users: "Users", history: "History", graphs: "Graphs" }[t] || t;
  }
  _tlTabIcon(t) {
    return {
      libraries: this._tlSvgLibraries(),
      users: this._tlSvgUsers(),
      history: this._tlSvgStreams(),
      graphs: this._tlSvgGraphs()
    }[t] || "";
  }
  _tlTabTitle(t) {
    return { libraries: "All Libraries", users: "All Users", history: "Recent History", graphs: "Play Statistics" }[t] || "";
  }
  _tlTabSubtitle(t) {
    return { libraries: "", users: "", history: "", graphs: "" }[t] || "";
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Tab loader
  // ──────────────────────────────────────────────────────────────────────────
  async _tlLoadTab(tab, modal) {
    const body = modal.querySelector("#tl-body");
    if (!body) return;
    if (tab === "libraries") {
      body.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px">Loading\u2026</div>';
      const ml = this._tautulliModal;
      if (!ml) return;
      const _pp = this._tlCalcPerPage();
      const r = await this._tlApiFetch("get_libraries_table", `length=${_pp}&start=${(ml.libsPage || 0) * _pp}&order_column=${ml.libsSortCol || "plays"}&order_dir=${ml.libsSortDir || "desc"}`);
      if (!this._tautulliModal) return;
      ml.libsData = r?.response?.data?.data || [];
      ml.libsTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || ml.libsData.length;
      body.innerHTML = this._tlBodyLibraries(ml.libsData, ml.libsTotal);
      this._wireTautulliModalBody(body);
    } else if (tab === "users") {
      body.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px">Loading\u2026</div>';
      const m2 = this._tautulliModal;
      if (!m2) return;
      const _pp2 = this._tlCalcPerPage();
      const r = await this._tlApiFetch("get_users_table", `length=${_pp2}&start=${(m2.usersPage || 0) * _pp2}&order_column=${m2.usersSortCol || "plays"}&order_dir=${m2.usersSortDir || "desc"}`);
      if (!this._tautulliModal) return;
      m2.usersData = r?.response?.data?.data || [];
      m2.usersTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || m2.usersData.length;
      body.innerHTML = this._tlBodyUsers(m2.usersData, m2.usersTotal);
      this._wireTautulliModalBody(body);
    } else if (tab === "history") {
      if (!this._tautulliModal) return;
      this._tautulliModal.histLoading = true;
      body.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px">Loading\u2026</div>';
      const [data, usersR] = await Promise.all([
        this._tlFetchHistory(0, null, null, null, this._tlCalcPerPage({ hasFilter: true })),
        this._tlApiFetch("get_users_table", "length=100&start=0&order_column=friendly_name&order_dir=asc")
      ]);
      if (!this._tautulliModal) return;
      this._tautulliModal.histData = data.data || [];
      this._tautulliModal.histTotal = data.recordsFiltered || 0;
      this._tautulliModal.histLoading = false;
      this._tautulliModal.histUsers = usersR?.response?.data?.data || [];
      body.innerHTML = this._tlBodyHistory();
      this._wireTautulliModalBody(body);
    } else if (tab === "graphs") {
      const mg = this._tautulliModal;
      if (!mg) return;
      if (!mg.graphsUserList?.length) {
        const ur = await this._tlApiFetch("get_users_table", "length=100&start=0&order_column=friendly_name&order_dir=asc");
        if (!this._tautulliModal) return;
        mg.graphsUserList = ur?.response?.data?.data || [];
      }
      mg.graphsLoading = true;
      body.innerHTML = this._tlBodyGraphs();
      const gd = await this._tlFetchGraphs();
      if (!this._tautulliModal) return;
      mg.graphsData = gd;
      mg.graphsLoading = false;
      body.innerHTML = this._tlBodyGraphs();
      this._wireGraphControls(body);
      this._tlGTriggerAnim(body);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────
  // API helpers
  // ──────────────────────────────────────────────────────────────────────────
  async _tlApiFetch(cmd, params) {
    try {
      return await this._hass.callApi("GET", `arr_stack/tautulli/${cmd}${params ? "?" + params : ""}`);
    } catch (e) {
      console.warn("[arr-card] Tautulli fetch error:", cmd, e);
      return null;
    }
  }
  async _tlFetchHistory(page, user, media, playback, perPage, search) {
    perPage = perPage || 10;
    const start = (page || 0) * perPage;
    let p = `length=${perPage}&start=${start}&order_column=date&order_dir=desc`;
    if (user) p += `&user_id=${encodeURIComponent(user)}`;
    if (media) p += `&media_type=${encodeURIComponent(media)}`;
    if (playback) p += `&transcode_decision=${encodeURIComponent(playback)}`;
    if (search) p += `&search=${encodeURIComponent(search)}`;
    const r = await this._tlApiFetch("get_history", p);
    return r?.response?.data || { data: [], recordsFiltered: 0 };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // SVG icons (16px, tab icons)
  // ──────────────────────────────────────────────────────────────────────────
  _tlSvgLibraries() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M8 3v18M16 3v18"/></svg>`;
  }
  _tlSvgUsers() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`;
  }
  _tlSvgStreams() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  }
  _tlSvgGraphs() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  }
  _tlSvgWarn() {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>`;
  }
};
var tautulliMixin = _TautulliMethods.prototype;

// src/render/tautulli-graphs.js
var _TL_G_HEX = {
  "Movies": "#FF9500",
  "TV": "#007AFF",
  "Music": "#34C759",
  "Live TV": "#FF2D55",
  "Direct Play": "#34C759",
  "Direct Stream": "#007AFF",
  "Transcode": "#FF3B30"
};
var _TL_G_FALLBACK = ["#007AFF", "#FF9500", "#34C759", "#FF2D55", "#BF5AF2", "#FF3B30", "#5AC8FA", "#FFCC00"];
var _TL_G_VBW = 1e3;
var _TL_G_SVH = 200;
var _TL_G_DISP = 200;
var _P = { l: 12, r: 6, t: 18, b: 6 };
function _tlGHex(n, si) {
  if (_TL_G_HEX[n]) return _TL_G_HEX[n];
  if (si !== void 0) return _TL_G_FALLBACK[si % _TL_G_FALLBACK.length];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = h * 31 + n.charCodeAt(i) & 65535;
  return _TL_G_FALLBACK[h % _TL_G_FALLBACK.length];
}
function _tlGAttr(v) {
  return String(v).replace(/"/g, "&quot;");
}
function _tlGFmtDur(sec) {
  if (!sec || sec <= 0) return "0";
  const m = Math.floor(sec / 60);
  if (m < 1) return sec + "s";
  const h = Math.floor(m / 60);
  if (h < 1) return m + "m";
  const d = Math.floor(h / 24);
  if (d < 1) return h + "h " + (m % 60 > 0 ? m % 60 + "m" : "");
  const mo = Math.floor(d / 30);
  if (mo < 1) return d + "d " + (h % 24 > 0 ? h % 24 + "h" : "");
  return mo + "mo " + (d % 30 > 0 ? d % 30 + "d" : "");
}
function _tlGFmtDurShort(sec) {
  if (!sec || sec <= 0) return "0";
  const m = Math.floor(sec / 60);
  if (m < 1) return sec + "s";
  const h = Math.floor(m / 60);
  if (h < 1) return m + "m";
  const d = Math.floor(h / 24);
  if (d < 1) return h + "h";
  return d + "d";
}
function _tlGPrep(rawData, opts) {
  opts = opts || {};
  const d = rawData?.response?.data;
  if (!d) return null;
  let cats = d.categories || [];
  let series = (d.series || []).filter((s) => s.name !== "Total");
  if (!cats.length || !series.length) return null;
  if (opts.isDate && opts.range && cats.length < opts.range) {
    const today = /* @__PURE__ */ new Date(), full = [];
    for (let i = opts.range - 1; i >= 0; i--) {
      const dd = new Date(today - i * 864e5);
      full.push(dd.toISOString().slice(0, 10));
    }
    const map = {};
    cats.forEach((c, ci) => {
      map[c] = {};
      series.forEach((s, si) => {
        map[c][si] = (s.data || [])[ci] || 0;
      });
    });
    cats = full;
    series = series.map((s, si) => ({
      ...s,
      data: full.map((dt) => map[dt]?.[si] || 0)
    }));
  }
  const maxV = Math.max(1, ...cats.map(
    (_, i) => series.reduce((s, ser) => s + ((ser.data || [])[i] || 0), 0)
  ));
  return { cats, series, maxV };
}
function _tlGXLabels(visibleLabels) {
  if (!visibleLabels.length) return "";
  return '<div class="tl-g-x-labels">' + visibleLabels.map((l) => {
    let style;
    if (l.first) {
      style = `left:${l.pct.toFixed(1)}%;transform:translateX(0)`;
    } else if (l.last) {
      style = `left:${l.pct.toFixed(1)}%;transform:translateX(-100%)`;
    } else {
      style = `left:${l.pct.toFixed(1)}%;transform:translateX(-50%)`;
    }
    return `<span style="position:absolute;${style};font-size:10px;color:var(--is-text-muted);white-space:nowrap;line-height:1">${l.lbl}</span>`;
  }).join("") + "</div>";
}
var _TautulliGraphsMethods = class {
  _tlBodyGraphs() {
    const m = this._tautulliModal;
    if (!m) return "";
    if (m.graphsLoading) return '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading&hellip;</div>';
    const sub = m.graphsSub || "media";
    const metric = m.graphsMetric || "plays";
    const range = m.graphsRange || 30;
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const isTot = sub === "totals";
    const subTabBar = `
      <div style="display:flex;gap:4px;flex-shrink:0">
        ${[{ id: "media", lbl: "Media Type" }, { id: "stream", lbl: "Stream Type" }, { id: "totals", lbl: "Play Totals" }].map(
      (s) => `<button class="tl-page-btn${s.id === sub ? " active" : ""}" data-tl-graph-sub="${s.id}">${s.lbl}</button>`
    ).join("")}
      </div>`;
    const metricBtns = `
      <div style="display:inline-flex;gap:2px;flex-shrink:0">
        <button class="tl-page-btn${metric === "plays" ? " active" : ""}" data-tl-g-metric="plays"   >${isMob ? "Plays" : "Play Count"}</button>
        <button class="tl-page-btn${metric === "duration" ? " active" : ""}" data-tl-g-metric="duration">${isMob ? "Duration" : "Play Duration"}</button>
      </div>`;
    const rangeUnit = isTot ? "months" : "days";
    const rangeCtrl = `
      <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--is-text-muted);flex-shrink:0">
        <span>Last</span>
        <input id="tl-g-range" type="number" value="${range}" min="1" max="${isTot ? 60 : 365}"
          style="width:38px;background:var(--is-btn-bg);border:1px solid var(--is-btn-bdr);border-radius:6px;color:var(--is-text);padding:4px 4px;font-size:12px;line-height:1.4;text-align:center;font-family:inherit;outline:none;box-sizing:border-box;-webkit-appearance:none;appearance:none">
        <span>${rangeUnit}</span>
      </div>`;
    const rightControls = `
      <div style="display:flex;align-items:center;gap:${isMob ? "4" : "6"}px;flex-wrap:nowrap;justify-content:${isMob ? "flex-start" : "flex-end"}">
        ${this._tlGUserDropdown()}${metricBtns}${rangeCtrl}
      </div>`;
    const controls = isMob ? `<div style="margin-bottom:8px">${rightControls}</div>
         <div style="margin-bottom:12px">${subTabBar}</div>` : `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;flex-wrap:wrap">
           ${subTabBar}${rightControls}
         </div>`;
    const gd = m.graphsData || {};
    const isDur = metric === "duration";
    const BASE = { range, isDate: true, isDuration: isDur, isMob };
    let body = "";
    if (sub === "media") {
      const lineSvg = this._tlGLineSvg(gd.byDate, { ...BASE, chartId: "md", xLabel: (d) => d.slice(-5) });
      const barOpts = { isDuration: isDur, isMob };
      const dowSvg = this._tlGBarSvg(gd.byDow, { ...barOpts, chartId: "dw", xLabel: (d) => d.slice(0, 3) });
      const hodSvg = this._tlGBarSvg(gd.byHod, { ...barOpts, chartId: "hd", xLabel: (_, i) => i % 4 === 0 ? `${i}h` : "" });
      const halfRow = isMob ? `<div style="margin-bottom:10px">${this._tlGCard("By Day of Week", gd.byDow, dowSvg)}</div>
           <div style="margin-bottom:10px">${this._tlGCard("By Hour of Day", gd.byHod, hodSvg)}</div>` : `<div style="display:flex;gap:10px;margin-bottom:10px">
             <div style="flex:1;min-width:0">${this._tlGCard("By Day of Week", gd.byDow, dowSvg)}</div>
             <div style="flex:1;min-width:0">${this._tlGCard("By Hour of Day", gd.byHod, hodSvg)}</div>
           </div>`;
      body = `<div style="margin-bottom:10px">${this._tlGCard("Daily Play Count by Media Type", gd.byDate, lineSvg)}</div>${halfRow}`;
    } else if (sub === "stream") {
      const lineSvg = this._tlGLineSvg(gd.streamByDate, { ...BASE, chartId: "st", xLabel: (d) => d.slice(-5) });
      const concSvg = this._tlGLineSvg(gd.concurrentByDate, { ...BASE, chartId: "cc", isDuration: false, xLabel: (d) => d.slice(-5) });
      body = `<div style="margin-bottom:10px">${this._tlGCard("Daily Play Count by Stream Type", gd.streamByDate, lineSvg)}</div>
              <div>${this._tlGCard("Daily Concurrent Streams by Stream Type", gd.concurrentByDate, concSvg)}</div>`;
    } else {
      const barSvg = this._tlGBarSvg(gd.monthly, { isDuration: isDur, isMob, chartId: "mo", xLabel: (d) => d.slice(0, 3) });
      body = `<div style="margin-bottom:10px">${this._tlGCard("Total Play Count by Month", gd.monthly, barSvg)}</div>`;
    }
    return controls + body;
  }
  // ── Card wrapper ──────────────────────────────────────────────────────────
  _tlGCard(title, rawData, chartHtml) {
    const series = (rawData?.response?.data?.series || []).filter((s) => s.name !== "Total");
    const legend = series.map(
      (s, si) => `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--is-text-muted)"><span style="width:7px;height:7px;border-radius:2px;background:${_tlGHex(s.name, si)};flex-shrink:0;display:inline-block;opacity:0.9"></span>${s.name}</span>`
    ).join("");
    return `<div class="tl-g-card" style="position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        <span class="tl-graph-title">${title}</span>
        ${legend ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${legend}</div>` : ""}
      </div>
      <div style="position:relative">
        ${chartHtml}
        <div class="tl-g-tip" style="display:none;position:absolute;top:0;left:0;background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:7px;padding:7px 10px;font-size:11px;pointer-events:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div>
      </div>
    </div>`;
  }
  _tlGSvgEl(inner) {
    return `<svg class="tl-g-svg" viewBox="0 0 ${_TL_G_VBW} ${_TL_G_SVH}" width="100%" height="${_TL_G_DISP}" preserveAspectRatio="none">${inner}</svg>`;
  }
  // HTML y-label + SVG wrapper — avoids font distortion from preserveAspectRatio:none
  _tlGWrap(svgHtml, labelsHtml, yLblTxt) {
    return `<div style="position:relative">
      <span class="tl-g-ylabel">${yLblTxt}</span>
      ${svgHtml}
    </div>${labelsHtml}`;
  }
  // ── Stacked bar chart ─────────────────────────────────────────────────────
  // Returns svgHtml + x-labels HTML div
  _tlGBarSvg(rawData, opts) {
    opts = opts || {};
    const prep = _tlGPrep(rawData, opts);
    const VBW = _TL_G_VBW, SVH = _TL_G_SVH;
    const noData = this._tlGWrap(
      this._tlGSvgEl(`<text x="${VBW / 2}" y="${SVH / 2}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--is-text-muted);font-size:22">No data</text>`),
      "",
      ""
    );
    if (!prep) return noData;
    const { cats, series, maxV } = prep;
    const n = cats.length;
    const cW = VBW - _P.l - _P.r;
    const cH = SVH - _P.t - _P.b;
    const baseY = _P.t + cH;
    const cid = opts.chartId || "g";
    const isDur = !!opts.isDuration;
    const defs = "<defs>" + series.map((s, si) => {
      const h = _tlGHex(s.name, si);
      return `<linearGradient id="tl-gb-${cid}-${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stop-color="${h}" stop-opacity="0.92"/><stop offset="100%" stop-color="${h}" stop-opacity="0.42"/></linearGradient>`;
    }).join("") + "</defs>";
    const serGrad = {};
    series.forEach((s, si) => {
      serGrad[s.name] = `url(#tl-gb-${cid}-${si})`;
    });
    const slotW = cW / n;
    const bwFrac = n <= 7 ? 0.5 : n <= 14 ? 0.55 : Math.min(0.65, Math.max(0.14, 42 / slotW));
    const bw = Math.max(4, slotW * bwFrac);
    const rr = Math.min(bw * 0.38, 10);
    const labelW = opts.isMob ? 110 : 62;
    const showEvery = Math.max(1, Math.ceil(labelW / slotW));
    let bars = "", delay = 0;
    const visibleLabels = [];
    cats.forEach((cat, i) => {
      const x = _P.l + i * slotW + (slotW - bw) / 2;
      const total = series.reduce((s, ser) => s + ((ser.data || [])[i] || 0), 0);
      const sorted = series.slice().sort((a, b) => ((a.data || [])[i] || 0) - ((b.data || [])[i] || 0));
      const tipVals = sorted.filter((s) => ((s.data || [])[i] || 0) > 0).reverse().map((s, si) => {
        const v = (s.data || [])[i] || 0;
        return { n: s.name, v, fv: isDur ? _tlGFmtDur(v) : v, hex: _tlGHex(s.name, si) };
      });
      const tipData = _tlGAttr(JSON.stringify({
        lbl: cat,
        tot: total,
        ftot: isDur ? _tlGFmtDur(total) : null,
        vals: tipVals
      }));
      let colPaths = "", curY = baseY;
      if (total > 0) {
        sorted.forEach((ser, si2) => {
          const v = (ser.data || [])[i] || 0;
          if (!v) return;
          const h = v / maxV * cH;
          const fill = serGrad[ser.name] || _tlGHex(ser.name, series.indexOf(ser));
          const isTop = si2 === sorted.length - 1 || sorted.slice(si2 + 1).every((s2) => !((s2.data || [])[i] || 0));
          curY -= h;
          const pathD = isTop ? this._tlGRoundedTop(x, curY, bw, h, rr) : `M${x},${curY + h} L${x},${curY} L${x + bw},${curY} L${x + bw},${curY + h} Z`;
          const rrAttr = isTop && rr >= 0.5 ? ` data-tl-rr="${rr.toFixed(2)}" data-tl-bx="${x.toFixed(2)}" data-tl-by="${curY.toFixed(2)}" data-tl-bw="${bw.toFixed(2)}" data-tl-bh="${h.toFixed(2)}"` : "";
          colPaths += `<path d="${pathD}"${rrAttr} style="fill:${fill}" class="tl-g-anim-bar" data-d="${(delay * 0.012).toFixed(2)}"/>`;
        });
        delay++;
      }
      bars += `<g class="tl-g-col" data-tl-g-col="${tipData}" style="cursor:${total > 0 ? "pointer" : "default"}"><rect x="${(_P.l + i * slotW).toFixed(1)}" y="${_P.t}" width="${slotW.toFixed(1)}" height="${cH}" fill="transparent"/>` + colPaths + `</g>`;
      const lbl = typeof opts.xLabel === "function" ? opts.xLabel(cat, i, n) : cat || "";
      if (lbl) {
        const lr = Math.floor((n - 2) / showEvery) * showEvery;
        if (i % showEvery === 0 || i === n - 1 && (n - 1 - lr) * slotW >= labelW * 0.8) {
          visibleLabels.push({ pct: (_P.l + i * slotW + slotW / 2) / VBW * 100, lbl, first: i === 0, last: i === n - 1 });
        }
      }
    });
    const yLblTxt = isDur ? _tlGFmtDurShort(maxV) : String(maxV);
    return this._tlGWrap(this._tlGSvgEl(defs + bars), _tlGXLabels(visibleLabels), yLblTxt);
  }
  _tlGRoundedTop(x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    if (r < 0.5) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
    const f = (n) => n.toFixed(2);
    return `M${f(x)},${f(y + h)} L${f(x)},${f(y + r)} Q${f(x)},${f(y)} ${f(x + r)},${f(y)} L${f(x + w - r)},${f(y)} Q${f(x + w)},${f(y)} ${f(x + w)},${f(y + r)} L${f(x + w)},${f(y + h)} Z`;
  }
  // ── Line chart ────────────────────────────────────────────────────────────
  // Dots: filled with card bg color (var(--is-row-hover)) so line underneath is hidden,
  //       stroke ring drawn on top → line visually ends at dot edge, never passes through
  _tlGLineSvg(rawData, opts) {
    opts = opts || {};
    const prep = _tlGPrep(rawData, opts);
    const VBW = _TL_G_VBW, SVH = _TL_G_SVH;
    const noDt = this._tlGWrap(
      this._tlGSvgEl(`<text x="${VBW / 2}" y="${SVH / 2}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--is-text-muted);font-size:22">No data</text>`),
      "",
      ""
    );
    if (!prep) return noDt;
    const { cats, series, maxV } = prep;
    const n = cats.length;
    const cW = VBW - _P.l - _P.r;
    const cH = SVH - _P.t - _P.b;
    const baseY = _P.t + cH;
    const cid = opts.chartId || "l";
    const isDur = !!opts.isDuration;
    const dotR = n <= 12 ? 4 : n <= 30 ? 3 : 2;
    const slotW2 = cW / Math.max(n, 1);
    const ptX = (i) => _P.l + (i + 0.5) * slotW2;
    const colL = (i) => _P.l + i * slotW2;
    const colR = (i) => _P.l + (i + 1) * slotW2;
    const seriesPts = series.map((ser) => {
      const vals = ser.data || [];
      return vals.map((v, i) => ({
        x: ptX(i),
        y: _P.t + cH - v / maxV * cH,
        v,
        cat: cats[i]
      }));
    });
    let di = series.map((s, si) => {
      const h = _tlGHex(s.name, si);
      return `<linearGradient id="tl-gl-${cid}-${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stop-color="${h}" stop-opacity="0.18"/><stop offset="100%" stop-color="${h}" stop-opacity="0"/></linearGradient>`;
    }).join("");
    series.forEach((ser, si) => {
      const circles = seriesPts[si].filter((p) => p.v > 0).map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotR}" fill="black"/>`).join("");
      di += `<mask id="tl-lmask-${cid}-${si}" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="${VBW}" height="${SVH}" fill="white"/>` + circles + `</mask>`;
    });
    const defs = `<defs>${di}</defs>`;
    let out = defs;
    if (opts.isDate) {
      cats.forEach((cat, i) => {
        const dow = (/* @__PURE__ */ new Date(cat + "T12:00:00")).getDay();
        if (dow !== 0 && dow !== 6) return;
        const rx = colL(i), rw = colR(i) - rx;
        out += `<rect x="${rx.toFixed(1)}" y="${_P.t}" width="${rw.toFixed(1)}" height="${cH}" style="fill:var(--tl-wknd)"/>`;
      });
    }
    series.forEach((ser, si) => {
      const pts = seriesPts[si];
      if (!pts.some((p) => p.v > 0)) return;
      const hex = _tlGHex(ser.name, si);
      out += `<path d="${this._tlGSmoothArea(pts, baseY)}" style="fill:url(#tl-gl-${cid}-${si})"/>`;
      out += `<path d="${this._tlGSmoothLine(pts)}" fill="none" stroke="${hex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="tl-g-anim-line" mask="url(#tl-lmask-${cid}-${si})"/>`;
    });
    series.forEach((ser, si) => {
      const pts = seriesPts[si];
      const hex = _tlGHex(ser.name, si);
      pts.forEach((p) => {
        if (!p.v) return;
        const tipJson = _tlGAttr(JSON.stringify({ lbl: p.cat, name: ser.name, val: p.v, hex }));
        out += `<circle class="tl-g-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotR}" style="fill:transparent;stroke:${hex};stroke-width:2.5;cursor:pointer" vector-effect="non-scaling-stroke" data-tl-g-dot="${tipJson}"/>`;
      });
    });
    cats.forEach((cat, i) => {
      const rx = colL(i), rw = colR(i) - rx;
      const tipVals = series.map((ser, si) => {
        const v = (ser.data || [])[i] || 0;
        return { n: ser.name, v, fv: isDur ? _tlGFmtDur(v) : v, hex: _tlGHex(ser.name, si) };
      }).filter((v) => v.v > 0).sort((a, b) => b.v - a.v);
      const tot = tipVals.reduce((s, v) => s + v.v, 0);
      const td = _tlGAttr(JSON.stringify({ lbl: cat, tot, ftot: isDur ? _tlGFmtDur(tot) : null, vals: tipVals }));
      out += `<g class="tl-g-lcol" data-tl-g-col="${td}" style="cursor:pointer"><rect class="tl-g-lhlt" x="${rx.toFixed(1)}" y="${_P.t}" width="${rw.toFixed(1)}" height="${cH}" style="fill:var(--tl-col-hlt);opacity:0"/><rect x="${rx.toFixed(1)}" y="${_P.t}" width="${rw.toFixed(1)}" height="${cH}" fill="transparent"/></g>`;
    });
    const labelW = opts.isMob ? 110 : 62;
    const showEvery = Math.max(1, Math.ceil(labelW / slotW2));
    const visibleLabels = [];
    cats.forEach((cat, i) => {
      const lbl = typeof opts.xLabel === "function" ? opts.xLabel(cat, i, n) : (cat || "").slice(-5);
      if (!lbl) return;
      const lr = Math.floor((n - 2) / showEvery) * showEvery;
      if (i % showEvery === 0 || i === n - 1 && (n - 1 - lr) * slotW2 >= labelW * 0.8) {
        visibleLabels.push({ pct: ptX(i) / VBW * 100, lbl, first: i === 0, last: i === n - 1 });
      }
    });
    const yLblTxt = isDur ? _tlGFmtDurShort(maxV) : String(maxV);
    return this._tlGWrap(this._tlGSvgEl(out), _tlGXLabels(visibleLabels), yLblTxt);
  }
  _tlGSmoothLine(pts) {
    if (pts.length < 2) return pts.length === 1 ? `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}` : "";
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const cx1 = p0.x + (p1.x - p0.x) / 4;
      const cx2 = p1.x - (p1.x - p0.x) / 4;
      d += ` C${cx1.toFixed(1)},${p0.y.toFixed(1)} ${cx2.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }
  _tlGSmoothArea(pts, baseY) {
    const lp = pts[pts.length - 1], fp = pts[0];
    return this._tlGSmoothLine(pts) + ` L${lp.x.toFixed(1)},${baseY.toFixed(1)} L${fp.x.toFixed(1)},${baseY.toFixed(1)} Z`;
  }
  // ── User dropdown ─────────────────────────────────────────────────────────
  _tlGUserDropdown() {
    const m = this._tautulliModal;
    if (!m) return "";
    const users = m.graphsUserList || [], sel = m.graphsSelectedUsers;
    let btnLabel = "All Users";
    if (sel && sel.size === 1) {
      const u = users.find((u2) => sel.has(String(u2.user_id)));
      btnLabel = u ? u.friendly_name || u.username || "1 User" : "1 User";
    }
    const chevron = `<svg viewBox="0 0 10 6" width="8" height="5" style="position:absolute;right:7px;top:50%;transform:translateY(-50%)" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polyline points="1,1 5,5 9,1"/></svg>`;
    const chkSvg = `<svg viewBox="0 0 14 14" width="12" height="12"><polyline points="2,7 5.5,10.5 12,3" fill="none" stroke="var(--is-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const items = users.map((u) => {
      const uid = String(u.user_id), checked = !sel || sel.has(uid);
      const name = u.friendly_name || u.username || uid;
      return `<div class="tl-g-dd-item" data-tl-g-uid="${uid}"
        style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;cursor:pointer;font-size:11px;color:var(--is-text-body)">
        <span>${name}</span>
        <span style="width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${checked ? chkSvg : ""}</span>
      </div>`;
    }).join("");
    return `<div style="position:relative;flex-shrink:0" id="tl-g-dd-wrap">
      <button id="tl-g-dd-btn" class="tl-page-btn" style="white-space:nowrap;padding:4px 24px 4px 10px;position:relative">
        ${btnLabel}${chevron}
      </button>
      <div id="tl-g-dd-panel" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:8px;min-width:160px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.35);overflow:hidden">
        <div style="display:flex;gap:6px;padding:6px 8px 8px;border-bottom:1px solid var(--is-divider)">
          <button id="tl-g-dd-all"  class="tl-page-btn" style="flex:1;height:26px;font-size:10px;padding:0">Select All</button>
          <button id="tl-g-dd-none" class="tl-page-btn" style="flex:1;height:26px;font-size:10px;padding:0">Deselect All</button>
        </div>
        <div style="max-height:160px;overflow-y:auto">${items || '<div style="padding:8px 12px;font-size:11px;color:var(--is-text-muted)">No users</div>'}</div>
      </div>
    </div>`;
  }
  // ── Fetch ─────────────────────────────────────────────────────────────────
  async _tlFetchGraphs() {
    const m = this._tautulliModal;
    const metric = m?.graphsMetric || "plays";
    const range = m?.graphsRange || 30;
    const sub = m?.graphsSub || "media";
    const yAxis = metric === "duration" ? "duration" : "plays";
    const sel = m?.graphsSelectedUsers;
    const userParam = sel && sel.size === 1 ? `&user_id=${[...sel][0]}` : "";
    const base = `time_range=${range}&y_axis=${yAxis}${userParam}`;
    if (sub === "media") {
      const [byDate, byDow, byHod] = await Promise.all([
        this._tlApiFetch("get_plays_by_date", base),
        this._tlApiFetch("get_plays_by_dayofweek", base),
        this._tlApiFetch("get_plays_by_hourofday", base)
      ]);
      return { byDate, byDow, byHod };
    } else if (sub === "stream") {
      const [streamByDate, concurrentByDate] = await Promise.all([
        this._tlApiFetch("get_plays_by_stream_type", base),
        this._tlApiFetch("get_concurrent_streams_by_stream_type", `time_range=${range}${userParam}`)
      ]);
      return { streamByDate, concurrentByDate };
    } else {
      const monthly = await this._tlApiFetch("get_plays_per_month", base);
      return { monthly };
    }
  }
  async _tlRefetchGraphs(body) {
    const m = this._tautulliModal;
    if (!m || !body) return;
    m.graphsLoading = true;
    body.innerHTML = this._tlBodyGraphs();
    const gd = await this._tlFetchGraphs();
    if (!this._tautulliModal) return;
    m.graphsData = gd;
    m.graphsLoading = false;
    body.innerHTML = this._tlBodyGraphs();
    this._wireGraphControls(body);
    this._tlGTriggerAnim(body);
  }
  _tlGTriggerAnim(body) {
    body.querySelectorAll(".tl-g-anim-bar").forEach((el) => {
      el.style.animationDelay = (el.getAttribute("data-d") || "0") + "s";
    });
  }
};
var tautulliGraphsMixin = _TautulliGraphsMethods.prototype;

// src/render/jellystat-shared.js
var _JellystatSharedMethods = class {
  _jsHidden(key, defaults) {
    const m = this._jellystatModal;
    if (!m) return new Set(defaults);
    if (!m[key]) m[key] = new Set(defaults);
    return m[key];
  }
  async _jsLoadColPrefs() {
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "arr-js-cols" });
      return r?.value || {};
    } catch {
      return {};
    }
  }
  _jsSaveColPrefs() {
    const m = this._jellystatModal;
    if (!m) return;
    const KEYS = ["libsHiddenCols", "libsMobHiddenCols", "usersHiddenCols", "usersMobHiddenCols", "histHiddenCols", "histMobHiddenCols"];
    const value = {};
    for (const k of KEYS) if (m[k]) value[k] = [...m[k]];
    this._hass.callWS({ type: "frontend/store_user_data", key: "arr-js-cols", value }).catch(() => {
    });
  }
  _jsUserSelect(id, users, selUser) {
    const _TL_SEL_STY2 = "margin:0 4px;background:var(--is-row-hover,rgba(255,255,255,0.06));border:1px solid var(--is-divider,rgba(255,255,255,0.1));border-radius:6px;color:var(--is-text,#fff);padding:4px 8px;font-size:12px";
    const opts = [
      '<option value="">All users</option>',
      ...(users || []).map((u) => {
        const name = u.UserName || u.Name || u.UserId || "";
        return '<option value="' + name + '"' + (String(selUser || "") === String(name) ? " selected" : "") + ">" + name + "</option>";
      })
    ].join("");
    return '<select id="' + id + '" style="' + _TL_SEL_STY2 + ';max-width:130px">' + opts + "</select>";
  }
  _jsMediaTypeBadge(t) {
    t = (t || "").toLowerCase();
    if (t === "movie") return "Movie";
    if (t === "episode") return "Episode";
    if (t === "audio" || t === "musicvideo") return "Music";
    return t || "";
  }
};
var jellystatSharedMixin = _JellystatSharedMethods.prototype;

// src/render/jellystat-table.js
var _jsSortTh = (c, sortCol, sortDir, dataAttr) => "<th data-" + dataAttr + '="' + c.sort + '" style="' + (c.right ? "text-align:right;" : "") + 'cursor:pointer;user-select:none"><span style="white-space:nowrap">' + c.label + ' <span style="opacity:' + (c.sort === sortCol ? 1 : 0.3) + ';font-size:9px">' + (c.sort === sortCol ? sortDir === "asc" ? "&#8593;" : "&#8595;" : "&#8597;") + "</span></span></th>";
var _JellystatTableMethods = class {
  // ──────────────────────────────────────────────────────────────────────────
  // Libraries
  // ──────────────────────────────────────────────────────────────────────────
  _jsBodyLibraries() {
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const m = this._jellystatModal || {};
    const page = m.libsPage || 0;
    const perPage = this._tlCalcPerPage();
    const sortCol = m.libsSortCol || "plays";
    const sortDir = m.libsSortDir || "desc";
    const search = (m.libsSearch || "").toLowerCase().trim();
    const data = m.libsData || [];
    const hasSeasons = data.some((l) => l.Season_Count > 0);
    const hasEpisodes = data.some((l) => l.Episode_Count > 0);
    const hasStreamed = data.some((l) => l.LastActivity);
    const hasLastPlayed = data.some((l) => l.ItemName);
    const defaultHidden = /* @__PURE__ */ new Set();
    if (!hasSeasons) defaultHidden.add("seasons");
    if (!hasEpisodes) defaultHidden.add("episodes");
    if (!hasStreamed) defaultHidden.add("streamed");
    if (!hasLastPlayed) defaultHidden.add("lastPlayed");
    const hidden = this._jsHidden("libsHiddenCols", [...defaultHidden]);
    const mobH = this._jsHidden("libsMobHiddenCols", ["seasons", "episodes", "streamed", "lastPlayed", "duration"]);
    const fmtInterval = (iv) => {
      if (!iv) return null;
      const s = String(iv);
      const dayM = s.match(/^(\d+)\s+days?/);
      const days = dayM ? parseInt(dayM[1]) : 0;
      const timeM = s.match(/(\d+):(\d+):/);
      const hours = timeM ? parseInt(timeM[1]) : 0;
      const mins = timeM ? parseInt(timeM[2]) : 0;
      const totalH = days * 24 + hours;
      if (totalH >= 48) return Math.floor(totalH / 24) + "d ago";
      if (totalH >= 1) return totalH + "h ago";
      if (mins >= 1) return mins + "m ago";
      return "just now";
    };
    const filtered = search ? data.filter((l) => (l.Name || "").toLowerCase().includes(search)) : data;
    const sorted = filtered.slice().sort((a, b) => {
      let av, bv;
      if (sortCol === "plays") {
        av = Number(a.Plays) || 0;
        bv = Number(b.Plays) || 0;
      } else if (sortCol === "duration") {
        av = a.total_playback_duration || 0;
        bv = b.total_playback_duration || 0;
      } else if (sortCol === "count") {
        av = a.Library_Count || 0;
        bv = b.Library_Count || 0;
      } else if (sortCol === "seasons") {
        av = a.Season_Count || 0;
        bv = b.Season_Count || 0;
      } else if (sortCol === "episodes") {
        av = a.Episode_Count || 0;
        bv = b.Episode_Count || 0;
      } else if (sortCol === "lastPlayed") {
        av = (a.ItemName || "").toLowerCase();
        bv = (b.ItemName || "").toLowerCase();
      } else {
        av = (a.Name || "").toLowerCase();
        bv = (b.Name || "").toLowerCase();
      }
      return sortDir === "asc" ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });
    const tot = sorted.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const page2 = Math.min(page, totalPages - 1);
    const sliced = sorted.slice(page2 * perPage, (page2 + 1) * perPage);
    const COLS = [
      { key: "name", label: "Library", sort: "name", right: false },
      { key: "count", label: "Items", sort: "count", right: true },
      { key: "seasons", label: "Seasons / Albums", sort: "seasons", right: true },
      { key: "episodes", label: "Episodes / Tracks", sort: "episodes", right: true },
      { key: "streamed", label: "Streamed", sort: "streamed", right: false },
      { key: "lastPlayed", label: "Last Played", sort: "lastPlayed", right: false },
      { key: "plays", label: "Plays", sort: "plays", right: true },
      { key: "duration", label: "Duration", sort: "duration", right: true }
    ];
    const vis = COLS.filter((c) => !hidden.has(c.key));
    const deskColItems = this._tlColItems(COLS.filter((c) => c.key !== "name"), hidden, "data-js-lib-col");
    const deskColsBtn = this._tlColsMenu("js-libs-cols-btn", "js-libs-cols-menu", deskColItems, m.libsColsOpen);
    const MOB_LIB_COLS = [
      { key: "seasons", label: "Seasons/Albums" },
      { key: "episodes", label: "Episodes/Tracks" },
      { key: "streamed", label: "Streamed" },
      { key: "lastPlayed", label: "Last Played" },
      { key: "duration", label: "Duration" }
    ];
    const mobColItems = this._tlColItems(MOB_LIB_COLS, mobH, "data-js-lib-mob-col");
    const mobColsBtn = this._tlColsMenu("js-libs-mob-cols-btn", "js-libs-mob-cols-menu", mobColItems, m.libsMobColsOpen);
    const colsBtn = isMob ? mobColsBtn : deskColsBtn;
    const searchEl = this._tlSearchInput("js-libs-search", m.libsSearch);
    const searchFlex = searchEl.replace("display:inline-flex", "display:flex;flex:1").replace("width:110px", "flex:1").replace("min-width:60px", "min-width:0");
    const toolbar = '<div class="tl-toolbar">' + searchFlex + '<div class="tl-toolbar-actions">' + colsBtn + "</div></div>";
    const _libIcon = (lib) => {
      const ct = (lib.CollectionType || lib.Type || "").toLowerCase();
      const t = ct.includes("movie") ? "movie" : ct.includes("tv") || ct.includes("show") ? "show" : ct.includes("music") || ct.includes("audio") ? "artist" : ct;
      return t;
    };
    if (isMob) {
      const cards = sliced.map((lib) => {
        const icon = this._tlLibSvgIcon(_libIcon(lib), lib.Name || "", "sm");
        const plays = Number(lib.Plays) || 0;
        const dur = lib.total_playback_duration ? this._tlFmtDuration(lib.total_playback_duration) : null;
        const mp = [];
        if (!mobH.has("streamed") && lib.LastActivity) mp.push("<span>" + (fmtInterval(lib.LastActivity) || "&#x2014;") + "</span>");
        if (!mobH.has("seasons") && lib.Season_Count > 0) mp.push('<span style="color:var(--is-text-label)">' + lib.Season_Count + " seasons</span>");
        if (!mobH.has("episodes") && lib.Episode_Count > 0) mp.push('<span style="color:var(--is-text-label)">' + lib.Episode_Count + " episodes</span>");
        if (!mobH.has("lastPlayed") && lib.ItemName) mp.push('<span style="color:var(--is-text-muted)">' + lib.ItemName + "</span>");
        if (!mobH.has("duration") && dur) mp.push('<span style="color:var(--is-text-label)">' + dur + "</span>");
        return '<div class="tl-mob-card"><div style="display:flex;align-items:center;gap:10px"><div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--is-row-hover)">' + icon.replace(/width="\d+" height="\d+"/, 'width="16" height="16"') + '</div><div style="flex:1;min-width:0"><div class="tl-mob-name">' + (lib.Name || "&#x2014;") + "</div>" + (mp.length ? '<div class="tl-mob-meta">' + mp.join('<span style="color:var(--is-text-muted)"> &middot; </span>') + "</div>" : "") + '</div><div style="text-align:right;flex-shrink:0"><div style="font-size:15px;font-weight:700;color:rgba(250,180,50,0.9)">' + (lib.Library_Count ?? "&#x2014;") + '</div><div style="font-size:11px;color:var(--is-text-label)">&#9654; ' + plays + "</div></div></div></div>";
      }).join("") || '<div style="text-align:center;color:var(--is-text-muted);padding:30px">No library data</div>';
      return toolbar + "<div>" + cards + "</div>" + this._tlMobPag("js-lpage", page2, totalPages);
    }
    const thead = vis.map((c) => _jsSortTh(c, sortCol, sortDir, "js-lib-sort")).join("");
    const rows = sliced.map((lib) => {
      const icon = this._tlLibSvgIcon(_libIcon(lib), lib.Name || "", "md");
      const dur = lib.total_playback_duration ? this._tlFmtDuration(lib.total_playback_duration) : "&#x2014;";
      const streamedStr = fmtInterval(lib.LastActivity);
      const cm = {
        name: '<td style="max-width:180px"><span style="display:flex;align-items:center;min-width:0">' + icon + '<strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (lib.Name || "&#x2014;") + "</strong></span></td>",
        count: '<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">' + (lib.Library_Count ?? "&#x2014;") + "</td>",
        seasons: '<td style="text-align:right;color:var(--is-text-label)">' + (lib.Season_Count > 0 ? lib.Season_Count : "&#x2014;") + "</td>",
        episodes: '<td style="text-align:right;color:var(--is-text-label)">' + (lib.Episode_Count > 0 ? lib.Episode_Count : "&#x2014;") + "</td>",
        streamed: '<td style="white-space:nowrap;font-size:11px">' + (streamedStr || '<span style="color:var(--is-text-muted)">never</span>') + "</td>",
        lastPlayed: '<td style="max-width:200px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--is-text-label)">' + (lib.ItemName || '<span style="color:var(--is-text-muted)">n/a</span>') + "</div></td>",
        plays: '<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">' + (Number(lib.Plays) || 0) + "</td>",
        duration: '<td style="text-align:right">' + dur + "</td>"
      };
      return "<tr>" + vis.map((c) => cm[c.key] || "<td>&#x2014;</td>").join("") + "</tr>";
    }).join("");
    return toolbar + '<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>' + thead + "</tr></thead><tbody>" + (rows || '<tr><td colspan="' + vis.length + '" style="text-align:center;color:var(--is-text-muted);padding:30px">No library data</td></tr>') + "</tbody></table></div>" + this._tlDeskPag("js-lpage", page2, perPage, tot, "libraries");
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────────────────────────────────
  _jsBodyUsers() {
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const m = this._jellystatModal || {};
    const page = m.usersPage || 0;
    const perPage = this._tlCalcPerPage();
    const sortCol = m.usersSortCol || "plays";
    const sortDir = m.usersSortDir || "desc";
    const search = (m.usersSearch || "").toLowerCase().trim();
    const data = m.usersData || [];
    const hasStreamed = data.some((u) => u.LastActivityDate);
    const hasClient = data.some((u) => u.LastClient);
    const hasLastPlayed = data.some((u) => u.LastWatched);
    const defaultHidden = /* @__PURE__ */ new Set(["player"]);
    if (!hasClient) {
      defaultHidden.add("platform");
      defaultHidden.add("player");
    }
    if (!hasStreamed) defaultHidden.add("lastStreamed");
    if (!hasLastPlayed) defaultHidden.add("lastPlayed");
    const hidden = this._jsHidden("usersHiddenCols", [...defaultHidden]);
    const mobH = this._jsHidden("usersMobHiddenCols", ["lastStreamed", "platform", "player", "lastPlayed"]);
    const splitClient = (raw) => {
      if (!raw) return ["", ""];
      const idx = raw.indexOf(" - ");
      return idx >= 0 ? [raw.slice(0, idx), raw.slice(idx + 3)] : [raw, ""];
    };
    const filtered = search ? data.filter((u) => (u.UserName || u.Name || "").toLowerCase().includes(search) || (u.LastWatched || "").toLowerCase().includes(search)) : data;
    const sorted = filtered.slice().sort((a, b) => {
      let av, bv;
      if (sortCol === "plays") {
        av = a.TotalPlays ?? 0;
        bv = b.TotalPlays ?? 0;
      } else if (sortCol === "duration") {
        av = a.TotalWatchTime ?? 0;
        bv = b.TotalWatchTime ?? 0;
      } else if (sortCol === "lastStreamed") {
        av = a.LastActivityDate || "";
        bv = b.LastActivityDate || "";
      } else if (sortCol === "lastPlayed") {
        av = (a.LastWatched || "").toLowerCase();
        bv = (b.LastWatched || "").toLowerCase();
      } else if (sortCol === "platform") {
        av = splitClient(a.LastClient)[0].toLowerCase();
        bv = splitClient(b.LastClient)[0].toLowerCase();
      } else {
        av = (a.UserName || a.Name || "").toLowerCase();
        bv = (b.UserName || b.Name || "").toLowerCase();
      }
      return sortDir === "asc" ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });
    const tot = sorted.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const page2 = Math.min(page, totalPages - 1);
    const sliced = sorted.slice(page2 * perPage, (page2 + 1) * perPage);
    const COLS = [
      { key: "user", label: "User", sort: "user", right: false },
      { key: "lastStreamed", label: "Last Streamed", sort: "lastStreamed", right: false },
      { key: "platform", label: "Platform", sort: "platform", right: false },
      { key: "player", label: "Player", sort: "player", right: false },
      { key: "lastPlayed", label: "Last Played", sort: "lastPlayed", right: false },
      { key: "plays", label: "Total Plays", sort: "plays", right: true },
      { key: "duration", label: "Total Duration", sort: "duration", right: true }
    ];
    const vis = COLS.filter((c) => !hidden.has(c.key));
    const deskColItems = this._tlColItems(COLS.filter((c) => c.key !== "user"), hidden, "data-js-usr-col");
    const deskColsBtn = this._tlColsMenu("js-users-cols-btn", "js-users-cols-menu", deskColItems, m.usersColsOpen);
    const MOB_USR_COLS = [
      { key: "lastStreamed", label: "Last Streamed" },
      { key: "platform", label: "Platform" },
      { key: "player", label: "Player" },
      { key: "lastPlayed", label: "Last Played" }
    ];
    const mobColItems = this._tlColItems(MOB_USR_COLS, mobH, "data-js-usr-mob-col");
    const mobColsBtn = this._tlColsMenu("js-users-mob-cols-btn", "js-users-mob-cols-menu", mobColItems, m.usersMobColsOpen);
    const colsBtn = isMob ? mobColsBtn : deskColsBtn;
    const searchEl = this._tlSearchInput("js-users-search", m.usersSearch);
    const searchFlex = searchEl.replace("display:inline-flex", "display:flex;flex:1").replace("width:110px", "flex:1").replace("min-width:60px", "min-width:0");
    const toolbar = '<div class="tl-toolbar">' + searchFlex + '<div class="tl-toolbar-actions">' + colsBtn + "</div></div>";
    if (isMob) {
      const cards = sliced.map((u) => {
        const name = u.UserName || u.Name || "&#x2014;";
        const plays = u.TotalPlays ?? 0;
        const dur = u.TotalWatchTime ? this._tlFmtDuration(u.TotalWatchTime) : "&#x2014;";
        const [platform, player] = splitClient(u.LastClient);
        const mp = [];
        if (!mobH.has("lastStreamed") && u.LastActivityDate) mp.push("<span>" + this._tlFmtDate(u.LastActivityDate) + "</span>");
        if (!mobH.has("platform") && platform) mp.push('<span style="color:var(--is-text-label)">' + platform + "</span>");
        if (!mobH.has("player") && player) mp.push('<span style="color:var(--is-text-label)">' + player + "</span>");
        if (!mobH.has("lastPlayed") && u.LastWatched) mp.push('<span style="color:var(--is-text-muted)">' + u.LastWatched + "</span>");
        const av = '<span style="width:36px;height:36px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:13px;font-weight:700">' + (name[0] || "?").toUpperCase() + "</span>";
        return '<div class="tl-mob-card"><div style="display:flex;align-items:center;gap:10px">' + av + '<div style="flex:1;min-width:0"><div class="tl-mob-name">' + name + "</div>" + (mp.length ? '<div class="tl-mob-meta">' + mp.join('<span style="color:var(--is-text-muted)"> &middot; </span>') + "</div>" : "") + '</div><div style="text-align:right;flex-shrink:0"><div style="color:rgba(250,180,50,0.9);font-weight:700">&#9654; ' + plays + '</div><div style="font-size:11px;color:var(--is-text-label)">' + dur + "</div></div></div></div>";
      }).join("") || '<div style="text-align:center;color:var(--is-text-muted);padding:30px">No user data</div>';
      return toolbar + "<div>" + cards + "</div>" + this._tlMobPag("js-upage", page2, totalPages);
    }
    const thead = vis.map((c) => _jsSortTh(c, sortCol, sortDir, "js-sort")).join("");
    const rows = sliced.map((u) => {
      const name = u.UserName || u.Name || "&#x2014;";
      const av = '<span style="width:30px;height:30px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:12px;font-weight:700">' + (name[0] || "?").toUpperCase() + "</span>";
      const dur = u.TotalWatchTime ? this._tlFmtDuration(u.TotalWatchTime) : "&#x2014;";
      const [platform, player] = splitClient(u.LastClient);
      const cm = {
        user: '<td><div style="display:flex;align-items:center;gap:8px">' + av + '<span style="font-weight:600">' + name + "</span></div></td>",
        lastStreamed: '<td style="white-space:nowrap;font-size:11px">' + (u.LastActivityDate ? this._tlFmtDate(u.LastActivityDate) : '<span style="color:var(--is-text-muted)">never</span>') + "</td>",
        platform: '<td style="color:var(--is-text-label)">' + (platform || "&#x2014;") + "</td>",
        player: '<td style="color:var(--is-text-label)">' + (player || "&#x2014;") + "</td>",
        lastPlayed: '<td style="max-width:200px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (u.LastWatched || "&#x2014;") + "</div></td>",
        plays: '<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">' + (u.TotalPlays ?? 0) + "</td>",
        duration: '<td style="text-align:right">' + dur + "</td>"
      };
      return "<tr>" + vis.map((c) => cm[c.key] || "<td>&#x2014;</td>").join("") + "</tr>";
    }).join("");
    return toolbar + '<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>' + thead + "</tr></thead><tbody>" + (rows || '<tr><td colspan="' + vis.length + '" style="text-align:center;color:var(--is-text-muted);padding:30px">No user data</td></tr>') + "</tbody></table></div>" + this._tlDeskPag("js-upage", page2, perPage, tot, "users");
  }
  // ──────────────────────────────────────────────────────────────────────────
  // History
  // ──────────────────────────────────────────────────────────────────────────
  _jsBodyHistory() {
    const m = this._jellystatModal;
    if (!m) return "";
    if (m.histLoading) return '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading\u2026</div>';
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const page = m.histPage || 0;
    const perPage = this._tlCalcPerPage({ hasFilter: true });
    const tot = m.histTotal || 0;
    const data = m.histData || [];
    const users = m.histUsers || [];
    const selUser = m.histUser || "";
    const selMethod = m.histPlayMethod || "";
    const hidden = this._jsHidden("histHiddenCols", ["product", "player", "ip"]);
    const mobH = this._jsHidden("histMobHiddenCols", ["product", "player", "started", "ip"]);
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const HIST_COLS = [
      { key: "date", label: "Date" },
      { key: "user", label: "User" },
      { key: "product", label: "Product" },
      { key: "player", label: "Player" },
      { key: "title", label: "Title" },
      { key: "started", label: "Started", right: true },
      { key: "duration", label: "Duration", right: true },
      { key: "ip", label: "IP", right: false }
    ];
    const vis = HIST_COLS.filter((c) => !hidden.has(c.key));
    const userSel = this._jsUserSelect("js-hist-user-sel", users, selUser);
    const pmBtns = ["", "DirectPlay", "DirectStream", "Transcode"].map((pm) => {
      const label = pm === "" ? "All" : pm === "DirectPlay" ? "Direct Play" : pm === "DirectStream" ? "Direct Stream" : pm;
      const active = selMethod === pm;
      return '<button class="tl-page-btn' + (active ? " active" : "") + '" data-js-hist-pm="' + pm + '" style="white-space:nowrap">' + label + "</button>";
    }).join("");
    const colsBtn = isMob ? this._tlColsMenu(
      "js-hist-mob-cols-btn",
      "js-hist-mob-cols-menu",
      this._tlColItems([{ key: "product", label: "Product" }, { key: "player", label: "Player" }, { key: "started", label: "Started" }, { key: "ip", label: "IP" }], mobH, "data-js-hist-mob-col"),
      m.histMobColsOpen
    ) : this._tlColsMenu(
      "js-hist-cols-btn",
      "js-hist-cols-menu",
      this._tlColItems(HIST_COLS.filter((c) => c.key !== "title"), hidden, "data-js-hist-col"),
      m.histColsOpen
    );
    const srchEl = this._tlSearchInput("js-hist-search", m.histSearch);
    const srchFlex = srchEl.replace("display:inline-flex", "display:flex;flex:1").replace("width:110px", "flex:1").replace("min-width:60px", "min-width:0");
    let toolbar;
    if (isMob) {
      toolbar = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' + srchFlex + '<div style="flex-shrink:0">' + colsBtn + '</div></div><div style="margin-bottom:6px">' + userSel.replace("max-width:130px", "width:100%;max-width:none").replace("margin:0 4px", "margin:0") + '</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">' + pmBtns + "</div>";
    } else {
      toolbar = '<div class="tl-toolbar">' + srchFlex + '<div class="tl-toolbar-actions">' + colsBtn + '</div></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">' + userSel.replace("margin:0 4px", "margin:0") + pmBtns + "</div>";
    }
    if (!data.length) {
      return toolbar + '<div style="text-align:center;color:var(--is-text-muted);padding:30px">No history</div>';
    }
    const _fmtStarted = (ts) => {
      if (!ts) return "\u2014";
      try {
        return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch {
        return "\u2014";
      }
    };
    const _titleHtml = (h) => {
      const item = h.NowPlayingItemName || "\u2014";
      if (!h.SeriesName) return item;
      const ep = h.SeasonNumber != null && h.EpisodeNumber != null ? " S" + String(h.SeasonNumber).padStart(2, "0") + "E" + String(h.EpisodeNumber).padStart(2, "0") + " " : " \u2013 ";
      return '<span style="color:var(--is-text-muted)">' + h.SeriesName + ep + "</span>" + item;
    };
    if (isMob) {
      const cards = data.map((h) => {
        const dur = h.PlaybackDuration ? this._tlFmtDuration(h.PlaybackDuration) : "\u2014";
        const ago = h.ActivityDateInserted ? this._tlFmtDate(h.ActivityDateInserted) : "\u2014";
        const mp = ["<span>" + (h.UserName || "\u2014") + "</span>", "<span>" + ago + "</span>"];
        if (!mobH.has("product") && h.Client) mp.push('<span style="color:var(--is-text-label)">' + h.Client + "</span>");
        if (!mobH.has("player") && h.DeviceName) mp.push('<span style="color:var(--is-text-label)">' + h.DeviceName + "</span>");
        if (!mobH.has("started")) mp.push('<span style="color:var(--is-text-muted)">' + _fmtStarted(h.ActivityDateInserted) + "</span>");
        return '<div class="tl-mob-card"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div class="tl-mob-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _titleHtml(h) + '</div><div class="tl-mob-meta">' + mp.join('<span style="color:var(--is-text-muted)"> &middot; </span>') + '</div></div><div style="text-align:right;flex-shrink:0;font-weight:600">' + dur + "</div></div></div>";
      }).join("");
      return toolbar + "<div>" + cards + "</div>" + this._tlMobPag("js-hpage", page, totalPages);
    }
    const thead = vis.map((c) => '<th style="' + (c.right ? "text-align:right;" : "") + 'white-space:nowrap">' + c.label + "</th>").join("");
    const rows = data.map((h) => {
      const cm = {
        date: '<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">' + (h.ActivityDateInserted ? this._tlFmtDate(h.ActivityDateInserted) : "\u2014") + "</td>",
        user: '<td style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">' + (h.UserName || "\u2014") + "</td>",
        product: '<td style="color:var(--is-text-label);white-space:nowrap">' + (h.Client || "\u2014") + "</td>",
        player: '<td style="color:var(--is-text-label);white-space:nowrap">' + (h.DeviceName || "\u2014") + "</td>",
        title: '<td style="max-width:260px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _titleHtml(h) + "</div></td>",
        started: '<td style="text-align:right;white-space:nowrap;color:var(--is-text-label);font-size:12px">' + _fmtStarted(h.ActivityDateInserted) + "</td>",
        duration: '<td style="text-align:right;white-space:nowrap;font-weight:600">' + (h.PlaybackDuration ? this._tlFmtDuration(h.PlaybackDuration) : "\u2014") + "</td>",
        ip: '<td style="font-family:monospace;font-size:11px;color:var(--is-text-muted)">' + (h.RemoteEndPoint || "\u2014") + "</td>"
      };
      return "<tr>" + vis.map((c) => cm[c.key] || "<td>\u2014</td>").join("") + "</tr>";
    }).join("");
    return toolbar + '<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>' + thead + "</tr></thead><tbody>" + (rows || '<tr><td colspan="' + vis.length + '" style="text-align:center;color:var(--is-text-muted);padding:30px">No history</td></tr>') + "</tbody></table></div>" + this._tlDeskPag("js-hpage", page, perPage, tot, "history");
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Refetch helpers
  // ──────────────────────────────────────────────────────────────────────────
  async _jsRefetchHistory(body) {
    const m = this._jellystatModal;
    if (!m) return;
    body.innerHTML = '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading\u2026</div>';
    const perPage = this._tlCalcPerPage({ hasFilter: true });
    const filters = [];
    if (m.histUser) filters.push({ field: "UserName", value: m.histUser.toLowerCase() });
    if (m.histPlayMethod) filters.push({ field: "PlayMethod", value: m.histPlayMethod.toLowerCase() });
    let endpoint = "getHistory?page=" + ((m.histPage || 0) + 1) + "&size=" + perPage;
    if (m.histSearch) endpoint += "&search=" + encodeURIComponent(m.histSearch);
    if (filters.length) endpoint += "&filters=" + encodeURIComponent(JSON.stringify(filters));
    const raw = await this._jsApiFetch(endpoint);
    if (!this._jellystatModal) return;
    m.histData = raw?.results || (Array.isArray(raw) ? raw : []);
    m.histTotal = raw?.pages != null ? raw.pages * perPage : raw?.totalCount ?? m.histData.length;
    body.innerHTML = this._jsBodyHistory();
    this._wireJellystatModalBody(body);
  }
};
var jellystatTableMixin = _JellystatTableMethods.prototype;

// src/render/jellystat.js
var _JellystatMethods = class {
  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────
  _renderJellystat() {
    const data = this._jellystat || {};
    return `
      <div class="sec-card">
        <div class="col-hdr" style="margin-bottom:5px">
          <ha-icon icon="mdi:chart-bar" style="--mdc-icon-size:24px"></ha-icon>
          <span class="col-hdr-title">Statistics (Jellyfin)</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._jsLibCard(data)}
            ${this._jsUsersCard(data)}
            ${this._jsHistoryCard(data)}
            ${this._jsActivityCard(data.playsData)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }
  _jsLibCard(data) {
    const libs = data.libraries || [];
    const rows = libs.slice(0, 5).map((lib, i) => {
      const ct = (lib.CollectionType || lib.Type || "").toLowerCase();
      const type = ct.includes("movie") ? "movie" : ct.includes("tv") || ct.includes("show") ? "show" : ct.includes("music") || ct.includes("audio") ? "artist" : ct;
      const count = lib.item_count ?? lib.ItemCount ?? lib.count ?? 0;
      const dim = count === 0 ? ";opacity:0.28" : "";
      const sep = i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : "";
      return '<div style="' + sep + 'display:flex;align-items:center;gap:5px;padding:4px 0">' + this._tlLibSvgIcon(type, lib.Name || "", "sm") + '<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-left:1px">' + (lib.Name || "&#x2014;") + '</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0' + dim + '">' + count + "</span></div>";
    }).join("") || '<div style="font-size:9px;color:rgba(255,255,255,0.3);padding:8px 0">No data</div>';
    const sectTag = libs.length > 0 ? '<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + libs.length + "</span>" : "";
    return '<div class="tl-card" data-js-open="libraries" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px"><div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap"><span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">Libraries</span>' + sectTag + '</div><div style="flex:1;position:relative;z-index:2">' + rows + "</div></div>";
  }
  _jsUsersCard(data) {
    const users = (data.users || []).slice(0, 5);
    const active = (data.activity?.Sessions || []).length;
    const items = users.map((u, i) => {
      const name = u.Name || u.UserName || "&#x2014;";
      const plays = u.Plays ?? u.TotalPlays ?? u.PlayCount ?? 0;
      const sep = i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : "";
      const av = '<span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,0.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:7px;font-weight:700;color:#fff">' + (name[0] || "?").toUpperCase() + "</span>";
      return '<div style="' + sep + 'display:flex;align-items:center;gap:6px;padding:4px 0">' + av + '<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">' + name + '</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0">' + plays + "</span></div>";
    }).join("") || '<div style="font-size:9px;color:rgba(255,255,255,0.3)">No data</div>';
    const activeTag = active > 0 ? '<span style="font-size:10px;font-weight:700;color:#34d399;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + active + " active</span>" : "";
    return '<div class="tl-card" data-js-open="users" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px"><div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap"><span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">Users</span>' + activeTag + '</div><div style="flex:1;position:relative;z-index:2">' + items + "</div></div>";
  }
  _jsHistoryCard(data) {
    const hist = (data.recentHistory || []).slice(0, 3);
    const streams = (data.activity?.Sessions || []).length;
    const items = hist.map((h, i) => {
      const title = h.NowPlayingItemName || h.ItemName || "&#x2014;";
      const series = h.SeriesName ? " &middot; " + h.SeriesName : "";
      const user = h.UserName || "";
      const ago = h.ActivityDateInserted ? this._tlFmtDate(h.ActivityDateInserted) : "";
      const sep = i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : "";
      return '<div style="' + sep + 'padding:4px 0"><div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + title + series + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px">' + user + (ago ? " &middot; " + ago : "") + "</div></div>";
    }).join("") || '<div style="font-size:9px;color:rgba(255,255,255,0.3);padding:8px 0">No history</div>';
    const streamTag = streams > 0 ? '<span style="font-size:10px;font-weight:700;color:#34d399;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + streams + " now</span>" : "";
    return '<div class="tl-card" data-js-open="history" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px"><div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap"><span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">History</span>' + streamTag + '</div><div style="flex:1;position:relative;z-index:2">' + items + "</div></div>";
  }
  _jsActivityCard(playsData) {
    const days = (playsData || []).slice(-7);
    const max = Math.max(...days.map((d) => d.value || 0), 1);
    const total = days.reduce((s, d) => s + (d.value || 0), 0);
    const bars = days.map((d) => {
      const h = Math.max(d.value ? 2 : 0, Math.round((d.value || 0) / max * 100));
      const gap = 100 - h;
      return '<div style="flex:1;display:flex;flex-direction:column"><div style="flex:' + gap + '"></div><div style="flex:' + h + ";background:rgba(255,255,255,0.55);border-radius:2px 2px 0 0" + (d.value ? "" : ";display:none") + '"></div></div>';
    }).join("");
    const labels = days.map(
      (d) => '<div style="flex:1;font-size:6px;color:rgba(255,255,255,0.3);text-align:center;padding:1px 0 0">' + (d.date || "").slice(-2) + "</div>"
    ).join("");
    const playsTag = total > 0 ? '<span style="font-size:10px;font-weight:700;color:#63b3ed;background:rgba(99,179,237,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + total + " plays</span>" : "";
    return '<div class="tl-card" data-js-open="graphs" style="display:flex;flex-direction:column;gap:0;padding:10px 10px 8px"><div style="position:absolute;bottom:-15px;right:-15px;opacity:0.025;pointer-events:none;z-index:0;color:#fff;line-height:0"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap"><div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.92);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">Charts</span><span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic">last 7 days</span></div>' + playsTag + '</div><div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0"><div style="flex:1;display:flex;gap:2px">' + (bars || "") + '</div><div style="display:flex;gap:2px;margin-top:2px">' + labels + "</div></div></div>";
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────
  async _openJellystatModal(tab) {
    tab = tab || "libraries";
    const prefs = await this._jsLoadColPrefs();
    const hSet = (key, defs) => prefs[key] ? new Set(prefs[key]) : new Set(defs);
    this._jellystatModal = {
      tab,
      histPage: 0,
      histSearch: "",
      histUser: null,
      histPlayMethod: null,
      histTotal: 0,
      histData: [],
      histUsers: [],
      histLoading: false,
      histColsOpen: false,
      histMobColsOpen: false,
      histHiddenCols: hSet("histHiddenCols", ["playMethod"]),
      histMobHiddenCols: hSet("histMobHiddenCols", ["client", "device", "playMethod"]),
      graphsSub: "media",
      graphsData: null,
      graphsLoading: false,
      graphsMetric: "plays",
      graphsRange: window.matchMedia("(max-width:600px)").matches ? 7 : 30,
      usersPage: 0,
      usersSearch: "",
      usersData: [],
      usersTotal: 0,
      usersHiddenCols: hSet("usersHiddenCols", ["userId"]),
      usersMobHiddenCols: hSet("usersMobHiddenCols", ["lastSeen", "userId"]),
      usersColsOpen: false,
      usersMobColsOpen: false,
      libsPage: 0,
      libsSearch: "",
      libsData: [],
      libsTotal: 0,
      libsHiddenCols: hSet("libsHiddenCols", ["type"]),
      libsMobHiddenCols: hSet("libsMobHiddenCols", ["type"]),
      libsColsOpen: false,
      libsMobColsOpen: false
    };
    this.shadowRoot.querySelector("[data-js-modal]")?.remove();
    const wrap = document.createElement("div");
    wrap.innerHTML = this._jsModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireJellystatModal(el);
    this._jsLoadTab(tab, el);
  }
  _closeJellystatModal() {
    this.shadowRoot.querySelector("[data-js-modal]")?.remove();
    this._jellystatModal = null;
  }
  _jsModalHtml(tab) {
    const dayClass = this._isDaytime && this._config?.styles?.dayNightMode !== false ? " popup-day" : "";
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const allTabs = ["libraries", "users", "history", "graphs"];
    const tabBtns = allTabs.map(
      (t) => '<button class="is-f-btn' + (t === tab ? " active" : "") + '" data-js-tab="' + t + '">' + this._jsTabLabel(t) + "</button>"
    ).join("");
    const closeSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const hdrInner = isMobile ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><div style="flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + this._jsTabTitle(tab) + '</div><button class="popup-close" id="js-close" style="position:relative;top:0;right:0;flex-shrink:0">' + closeSvg + '</button></div><div class="is-filter">' + tabBtns + "</div>" : '<div style="flex:1;min-width:0"><div id="js-hdr-title" style="font-size:15px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + this._jsTabTitle(tab) + '</div></div><div class="is-filter" style="flex-shrink:0">' + tabBtns + '</div><button class="popup-close" id="js-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:flex-start;margin-left:4px">' + closeSvg + "</button>";
    const hdrStyle = isMobile ? "padding:14px 16px 12px;flex-direction:column;align-items:stretch" : "padding:14px 22px 12px;gap:12px;flex-wrap:wrap";
    return '<div class="popup-overlay' + dayClass + '" data-js-modal><div class="popup-glass tl-wide"><div class="is-panel-hdr" style="' + hdrStyle + '">' + hdrInner + '</div><div class="popup-body" id="js-body" style="padding:' + (isMobile ? "12px 14px 16px" : "14px 22px 20px") + '"><div class="is-loading"><span>Loading\u2026</span></div></div></div></div>';
  }
  _jsTabLabel(t) {
    return { libraries: "Libraries", users: "Users", history: "History", graphs: "Graphs" }[t] || t;
  }
  _jsTabTitle(t) {
    return { libraries: "All Libraries", users: "All Users", history: "Recent History", graphs: "Play Statistics" }[t] || "";
  }
  // ──────────────────────────────────────────────────────────────────────────
  // Tab loader
  // ──────────────────────────────────────────────────────────────────────────
  async _jsLoadTab(tab, modal) {
    const body = modal.querySelector("#js-body");
    if (!body) return;
    if (tab === "libraries") {
      body.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px">Loading\u2026</div>';
      const m = this._jellystatModal;
      if (!m) return;
      const raw = await this._jsApiFetch("stats/getLibraryCardStats");
      if (!this._jellystatModal) return;
      m.libsData = Array.isArray(raw) ? raw : raw?.data || [];
      m.libsTotal = m.libsData.length;
      body.innerHTML = this._jsBodyLibraries();
      this._wireJellystatModalBody(body);
    } else if (tab === "users") {
      body.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px">Loading\u2026</div>';
      const m = this._jellystatModal;
      if (!m) return;
      const raw = await this._jsApiFetch("stats/getAllUserActivity");
      if (!this._jellystatModal) return;
      m.usersData = Array.isArray(raw) ? raw : raw?.data || raw?.users || [];
      m.usersTotal = m.usersData.length;
      body.innerHTML = this._jsBodyUsers();
      this._wireJellystatModalBody(body);
    } else if (tab === "history") {
      body.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px">Loading\u2026</div>';
      const m = this._jellystatModal;
      if (!m) return;
      m.histLoading = true;
      const perPage = this._tlCalcPerPage({ hasFilter: true });
      const [histRaw, usersRaw] = await Promise.all([
        this._jsApiFetch("getHistory?page=1&size=" + perPage),
        this._jsApiFetch("stats/getAllUserActivity")
      ]);
      if (!this._jellystatModal) return;
      m.histData = histRaw?.results || (Array.isArray(histRaw) ? histRaw : []);
      m.histTotal = histRaw?.pages != null ? histRaw.pages * perPage : histRaw?.totalCount ?? m.histData.length;
      m.histUsers = Array.isArray(usersRaw) ? usersRaw : usersRaw?.data || [];
      m.histLoading = false;
      body.innerHTML = this._jsBodyHistory();
      this._wireJellystatModalBody(body);
    } else if (tab === "graphs") {
      const mg = this._jellystatModal;
      if (!mg) return;
      mg.graphsLoading = true;
      body.innerHTML = this._jsBodyGraphs();
      const gd = await this._jsFetchGraphs();
      if (!this._jellystatModal) return;
      mg.graphsData = gd;
      mg.graphsLoading = false;
      body.innerHTML = this._jsBodyGraphs();
      this._wireJsGraphControls(body);
      this._tlGTriggerAnim(body);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────
  // API helper
  // ──────────────────────────────────────────────────────────────────────────
  async _jsApiFetch(endpoint, body) {
    try {
      const method = body !== void 0 ? "POST" : "GET";
      return await this._hass.callApi(method, "arr_stack/jellystat/" + endpoint, body);
    } catch (e) {
      console.warn("[arr-card] Jellystat fetch error:", endpoint, e);
      return null;
    }
  }
};
var jellystatMixin = _JellystatMethods.prototype;

// src/render/jellystat-graphs.js
var _JS_DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function _jsLibData(stats, libName, field) {
  return stats.map((entry) => {
    const v = entry[libName];
    return v && typeof v === "object" ? v[field] || 0 : 0;
  });
}
function _jsLibChart(raw, cats, dataFn) {
  if (!raw?.stats?.length) return null;
  const libs = raw.libraries || [];
  const mk = (field) => {
    const series = libs.map((lib) => ({
      name: lib.Name,
      data: dataFn(raw.stats, lib.Name, field)
    })).filter((s) => s.data.some((v) => v > 0));
    if (!series.length) return null;
    return { response: { data: { categories: cats, series } } };
  };
  return { plays: mk("count"), duration: mk("duration") };
}
function _jsPrepByDate(raw) {
  if (!raw?.stats?.length) return null;
  const cats = raw.stats.map((r) => r.Key.replace(/,?\s*\d{4}$/, ""));
  return _jsLibChart(raw, cats, _jsLibData);
}
var _JS_DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function _jsPrepByDow(raw) {
  if (!raw?.stats?.length) return null;
  const libs = raw.libraries || [];
  const mk = (field) => {
    const series = libs.map((lib) => ({
      name: lib.Name,
      data: _JS_DOW_NAMES.map((_, i) => {
        const entry = raw.stats.find(
          (s) => s.Key === _JS_DOW_FULL[i] || // "Sunday" etc.
          Number(s.Key) === i || // 0-indexed numeric
          Number(s.Key) === i + 1
          // 1-indexed numeric
        );
        const v = entry?.[lib.Name];
        return v && typeof v === "object" ? v[field] || 0 : 0;
      })
    })).filter((s) => s.data.some((v) => v > 0));
    if (!series.length) return null;
    return { response: { data: { categories: _JS_DOW_NAMES, series } } };
  };
  return { plays: mk("count"), duration: mk("duration") };
}
function _jsPrepByHod(raw) {
  if (!raw?.stats?.length) return null;
  const cats = Array.from({ length: 24 }, (_, i) => String(i));
  const libs = raw.libraries || [];
  const mk = (field) => {
    const series = libs.map((lib) => ({
      name: lib.Name,
      data: cats.map((h) => {
        const entry = raw.stats.find((s) => Number(s.Key) === Number(h));
        const v = entry?.[lib.Name];
        return v && typeof v === "object" ? v[field] || 0 : 0;
      })
    })).filter((s) => s.data.some((v) => v > 0));
    if (!series.length) return null;
    return { response: { data: { categories: cats, series } } };
  };
  return { plays: mk("count"), duration: mk("duration") };
}
var _JellystatGraphsMethods = class {
  _jsBodyGraphs() {
    const m = this._jellystatModal;
    if (!m) return "";
    if (m.graphsLoading) return '<div style="text-align:center;color:var(--is-text-muted);padding:40px">Loading&hellip;</div>';
    const metric = m.graphsMetric || "plays";
    const range = m.graphsRange || 30;
    const isMob = window.matchMedia("(max-width:600px)").matches;
    const isDur = metric === "duration";
    const metricBtns = '<div style="display:inline-flex;gap:2px"><button class="tl-page-btn' + (metric === "plays" ? " active" : "") + '" data-js-g-metric="plays">Count</button><button class="tl-page-btn' + (metric === "duration" ? " active" : "") + '" data-js-g-metric="duration">Duration</button></div>';
    const rangeCtrl = '<div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--is-text-muted)"><span>Last</span><input id="js-g-range" type="number" value="' + range + '" min="1" max="365" style="width:38px;background:var(--is-btn-bg);border:1px solid var(--is-btn-bdr);border-radius:6px;color:var(--is-text);padding:4px;font-size:12px;text-align:center;font-family:inherit;outline:none;box-sizing:border-box;-webkit-appearance:none;appearance:none"><span>Days</span></div>';
    const controls = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;flex-wrap:wrap">' + metricBtns + rangeCtrl + "</div>";
    const gd = m.graphsData || {};
    const BASE = { range, isDate: false, isDuration: isDur, isMob };
    const barO = { isDuration: isDur, isMob };
    const pick = (obj) => isDur ? obj?.duration : obj?.plays;
    const dateLabel = (d, _i, n) => isMob || n > 20 ? d.split(" ")[1] || d : d;
    const lineSvg = this._tlGLineSvg(pick(gd.byDate), { ...BASE, chartId: "jd", xLabel: dateLabel });
    const dowSvg = this._tlGBarSvg(pick(gd.byDow), { ...barO, chartId: "jw", xLabel: (d) => d });
    const hodSvg = this._tlGBarSvg(pick(gd.byHod), { ...barO, chartId: "jh", xLabel: (_, i) => i % 4 === 0 ? i + "h" : "" });
    const lineTitle = isDur ? "Daily Play Duration Per Library \u2014 Last " + range + " Days" : "Daily Play Count Per Library \u2014 Last " + range + " Days";
    const dowTitle = isDur ? "Play Duration By Day \u2014 Last " + range + " Days" : "Play Count By Day \u2014 Last " + range + " Days";
    const hodTitle = isDur ? "Play Duration By Hour \u2014 Last " + range + " Days" : "Play Count By Hour \u2014 Last " + range + " Days";
    const halfRow = isMob ? '<div style="margin-bottom:10px">' + this._tlGCard(dowTitle, pick(gd.byDow), dowSvg) + '</div><div style="margin-bottom:10px">' + this._tlGCard(hodTitle, pick(gd.byHod), hodSvg) + "</div>" : '<div style="display:flex;gap:10px;margin-bottom:10px"><div style="flex:1;min-width:0">' + this._tlGCard(dowTitle, pick(gd.byDow), dowSvg) + '</div><div style="flex:1;min-width:0">' + this._tlGCard(hodTitle, pick(gd.byHod), hodSvg) + "</div></div>";
    return controls + '<div style="margin-bottom:10px">' + this._tlGCard(lineTitle, pick(gd.byDate), lineSvg) + "</div>" + halfRow;
  }
  async _jsFetchGraphs() {
    const days = this._jellystatModal?.graphsRange || 30;
    const [byDateRaw, byDowRaw, byHodRaw] = await Promise.all([
      this._jsApiFetch("stats/getViewsOverTime?days=" + days),
      this._jsApiFetch("stats/getViewsByDays?days=" + days),
      this._jsApiFetch("stats/getViewsByHour?days=" + days)
    ]);
    return {
      byDate: _jsPrepByDate(byDateRaw),
      byDow: _jsPrepByDow(byDowRaw),
      byHod: _jsPrepByHod(byHodRaw)
    };
  }
  async _jsRefetchGraphs(body) {
    const m = this._jellystatModal;
    if (!m || !body) return;
    m.graphsLoading = true;
    body.innerHTML = this._jsBodyGraphs();
    const gd = await this._jsFetchGraphs();
    if (!this._jellystatModal) return;
    m.graphsData = gd;
    m.graphsLoading = false;
    body.innerHTML = this._jsBodyGraphs();
    this._wireJsGraphControls(body);
    this._tlGTriggerAnim(body);
  }
};
var jellystatGraphsMixin = _JellystatGraphsMethods.prototype;

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
    this._radarr2 = [];
    this._radarr2Total = 0;
    this._radarr2Configured = null;
    this._radarr2ByTmdb = /* @__PURE__ */ new Map();
    this._sonarr = [];
    this._sonarrAll = [];
    this._sonarrTotal = 0;
    this._sonarr2 = [];
    this._sonarr2Total = 0;
    this._sonarr2Configured = null;
    this._sonarr2ByTvdb = /* @__PURE__ */ new Map();
    this._calendar = [];
    this._upcoming = [];
    this._tvUpcoming = [];
    this._trending = [];
    this._popular = [];
    this._qbit = [];
    this._qbitTransfer = {};
    this._qbitDiskFreeBytes = null;
    this._sab = {};
    this._sabLocalIp = null;
    this._sabPublicIp = null;
    this._sabVpnFetched = false;
    this._sabFailed = [];
    this._sabRetryBusy = null;
    this._sabDeleteBusy = null;
    this._qbCookies = null;
    this._qbitConfigured = true;
    this._sabConfigured = true;
    this._bazarrConfigured = true;
    this._tautulliConfigured = true;
    this._tautulli = null;
    this._tautulliModal = null;
    this._jellystatConfigured = true;
    this._jellystat = null;
    this._jellystatModal = null;
    this._bazarr = {};
    this._radarrQueueFailed = /* @__PURE__ */ new Set();
    this._radarrQueueActive = /* @__PURE__ */ new Set();
    this._radarr2QueueFailed = /* @__PURE__ */ new Set();
    this._radarr2QueueActive = /* @__PURE__ */ new Set();
    this._plexSessions = [];
    this._plexConfigured = null;
    this._plexLastFetch = 0;
    this._overseerrConfigured = null;
    this._seerrRadarr = null;
    this._seerrRadarr2 = null;
    this._confirmRemove = null;
    this._requestPending = null;
    this._pendingRequests = [];
    this._optimisticRequested = /* @__PURE__ */ new Set();
    this._withdrawnIds = /* @__PURE__ */ new Set();
    this._myRequestIds = /* @__PURE__ */ new Map();
    this._familyPendingIds = /* @__PURE__ */ new Map();
    this._radarrProfiles = [];
    this._radarrTags = [];
    this._sonarrTags = [];
    this._radarrRootFolders = [];
    this._sonarrRootFolders = [];
    this._radarr2Profiles = [];
    this._radarr2Tags = [];
    this._radarr2RootFolders = [];
    this._sonarr2Profiles = [];
    this._sonarr2RootFolders = [];
    this._tvRequestPending = null;
    this._overlay = { section: null, page: 0, tvPending: null };
    this._overlayApiPage = {};
    this._overlayApiTotalPages = {};
    this._seerrSonarr = null;
    this._seerrSonarr2 = null;
    this._sonarrProfiles = [];
    this._qbitBusy = false;
    this._sabBusy = false;
    this._qbitItemBusy = null;
    this._popup = null;
    this._isState = null;
    this._isResults = [];
    this._isFilters = { protocol: "", indexer: "", quality: "", lang: "" };
    this._isSort = { col: null, dir: 1 };
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
    this._snIsFilters = { protocol: "", indexer: "", quality: "", lang: "" };
    this._snIsSort = { col: null, dir: 1 };
    this._snIsGrabbing = null;
    this._snIsGrabbed = /* @__PURE__ */ new Set();
    this._snIsHistory = {};
    this._searchExpand = null;
    this._asOpen = false;
    this._asInstance = null;
    this._asState = null;
    this._asError = null;
    this._asMovieSearching = false;
    this._asMovieSearched = false;
    this._asSearchingItems = /* @__PURE__ */ new Set();
    this._asSearchedItems = /* @__PURE__ */ new Set();
    this._asDownloadingItems = /* @__PURE__ */ new Set();
    this._radarrQueuePct = /* @__PURE__ */ new Map();
    this._radarr2QueuePct = /* @__PURE__ */ new Map();
    this._dlTriggeredBy = null;
    this._sonarrQueueSeasons = /* @__PURE__ */ new Set();
    this._sonarrQueueEpisodes = /* @__PURE__ */ new Set();
    this._sonarrQueueEpPct = /* @__PURE__ */ new Map();
    this._sonarrQueueSeasonPct = /* @__PURE__ */ new Map();
    this._sonarrQueueSeriesPct = /* @__PURE__ */ new Map();
    this._sonarr2QueueSeasons = /* @__PURE__ */ new Set();
    this._sonarr2QueueEpisodes = /* @__PURE__ */ new Set();
    this._sonarr2QueueEpPct = /* @__PURE__ */ new Map();
    this._sonarr2QueueSeasonPct = /* @__PURE__ */ new Map();
    this._sonarr2QueueSeriesPct = /* @__PURE__ */ new Map();
    this._sonarr2ImportDates = {};
    this._sonarrImportEps = {};
    this._sonarr2ImportEps = {};
    this._searchQuery = "";
    this._searchResults = [];
    this._searchPage = 0;
    this._searchLoading = false;
    this._searchActive = false;
    this._searchTimer = null;
    this._searchAbort = null;
    this._pages = { radarr: 0, sonarr: 0, upcoming: 0, tvUpcoming: 0, calendar: 0, trending: 0, popular: 0, qbit: 0, sab: 0, pending: 0, recentlyAdded: 0, recentlyRequested: 0, streams: 0 };
    this._pageDir = { radarr: "", sonarr: "", upcoming: "", tvUpcoming: "", calendar: "", trending: "", popular: "", qbit: "", sab: "", pending: "", streams: "" };
    this._streamsTimer = null;
    this._streamPopupTimer = null;
    this._streamsEnded = /* @__PURE__ */ new Set();
    this._diskPage = { radarr: 0, sonarr: 0, left: null };
    this._rightPage = 0;
    this._rightMaxH = 0;
    this._gradients = ["ca", "cb", "cc", "cd", "ce", "cf", "cg", "ch", "ci", "cj", "ck", "cl", "cm", "cn", "co", "cp", "cq", "cr"];
    this._gradientMap = {};
    this._gradientIdx = 0;
  }
  // ─────────────────────────────────────────────
  // HA lifecycle
  // ─────────────────────────────────────────────
  setConfig(config) {
    if (Array.isArray(config.categories)) {
      const CAT_MAP = { radarr: "recentlyAdded", sonarr: "recentlyRequested" };
      const seen = /* @__PURE__ */ new Set();
      config = {
        ...config,
        categories: config.categories.map((c) => CAT_MAP[c.id] ? { ...c, id: CAT_MAP[c.id] } : c).filter((c) => seen.has(c.id) ? false : seen.add(c.id))
      };
    }
    this._config = config;
    this._debug = !!config.debug;
    if (this._initialized) {
      this._wireStickyNav();
      this._applyTheme();
    }
  }
  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._buildShell();
      this._loadPendingFromStorage();
      this._fetchAll();
      this._interval = setInterval(() => this._fetchAll(), 3e4);
      this._fastInterval = setInterval(() => this._fetchDownloadsAndRender(), 5e3);
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this._checkBadgeOverflow());
      });
      this._resizeObserver.observe(this);
      return;
    }
    if (prev) {
      const cur = hass.states || {};
      const old = prev.states || {};
      for (const id of Object.keys(cur)) {
        if (!(id.startsWith("media_player.plex_") || id.startsWith("media_player.jellyfin_"))) continue;
        const nowActive = cur[id]?.state === "playing" || cur[id]?.state === "paused";
        const wasActive = old[id]?.state === "playing" || old[id]?.state === "paused";
        if (nowActive && !wasActive) {
          this._streamsEnded.delete(id);
          this._reRenderSection("streams");
          break;
        }
      }
      for (const id of this._streamsEnded) {
        const curS = cur[id];
        if (!curS) {
          this._streamsEnded.delete(id);
          continue;
        }
        const nowActive = curS.state === "playing" || curS.state === "paused";
        if (!nowActive) {
          this._streamsEnded.delete(id);
          continue;
        }
        const curAttr = curS.attributes || {};
        const oldAttr = old[id]?.attributes || {};
        const curUpd = curAttr.media_position_updated_at;
        const oldUpd = oldAttr.media_position_updated_at;
        const titleChg = curAttr.media_title !== oldAttr.media_title;
        const idChg = curAttr.media_content_id !== oldAttr.media_content_id;
        const posReset = (curAttr.media_position || 0) < 10 && (oldAttr.media_position || 0) > 30;
        if (curUpd && curUpd !== oldUpd || titleChg || idChg || posReset) {
          this._streamsEnded.delete(id);
          this._reRenderSection("streams");
          break;
        }
      }
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
    if (this._streamsTimer) {
      clearInterval(this._streamsTimer);
      this._streamsTimer = null;
    }
    if (this._streamPopupTimer) {
      clearInterval(this._streamPopupTimer);
      this._streamPopupTimer = null;
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
  // Returns config object for a section overlay (icon, data key, render fn, etc.)
  _getSectionOverlayConfig(section) {
    const tmdbUrl = (path) => !path ? null : path.startsWith("http") ? path : `https://image.tmdb.org/t/p/w92${path}`;
    const cfgs = {
      trending: {
        dataKey: "_trending",
        icon: "mdi:trending-up",
        titleKey: "trendingMovies",
        apiEndpoint: `${this._discoverSvc}/trending`,
        hasTvPending: true,
        renderCard: (m, i) => this._renderTrendingCard(m, i),
        getPosterUrl: (m) => tmdbUrl(m.posterPath || m.poster_path),
        emoji: (m) => m.mediaType === "tv" ? "\u{1F4FA}" : "\u{1F3AC}"
      },
      popular: {
        dataKey: "_popular",
        icon: "mdi:fire",
        titleKey: "popularMovies",
        apiEndpoint: `${this._discoverSvc}/popular`,
        hasTvPending: false,
        renderCard: (m, i) => this._renderUpcomingCard(m, { showDate: false, typeTag: this._t("typeMovie"), overlayIndex: i }),
        getPosterUrl: (m) => tmdbUrl(m.posterPath),
        emoji: () => "\u{1F3AC}"
      },
      upcoming: {
        dataKey: "_upcoming",
        icon: "mdi:ticket-outline",
        titleKey: "upcomingMovies",
        apiEndpoint: null,
        hasTvPending: false,
        renderCard: (m, i) => this._renderUpcomingCard(m, { overlayIndex: i }),
        getPosterUrl: (m) => tmdbUrl(m.posterPath || m.poster_path),
        emoji: () => "\u{1F3AC}"
      },
      tvUpcoming: {
        dataKey: "_tvUpcoming",
        icon: "mdi:television-play",
        titleKey: "newShows",
        apiEndpoint: `${this._discoverSvc}/tv_upcoming`,
        hasTvPending: true,
        renderCard: (m, i) => this._renderTvUpcomingCard(m, { showRating: true, overlayIndex: i }),
        getPosterUrl: (m) => tmdbUrl(m.posterPath),
        emoji: () => "\u{1F4FA}"
      },
      radarr: {
        dataKey: "_radarr",
        icon: "mdi:filmstrip",
        titleKey: "recentMovies",
        apiEndpoint: null,
        hasTvPending: false,
        renderCard: (m) => this._renderRadarrCard(m),
        getPosterUrl: (m) => this._getRadarrPoster(m),
        emoji: () => "\u{1F3AC}"
      },
      sonarr: {
        dataKey: "_sonarr",
        icon: "mdi:television-play",
        titleKey: "recentShows",
        apiEndpoint: null,
        hasTvPending: false,
        renderCard: (m) => this._renderSonarrCard(m),
        getPosterUrl: (m) => this._getSonarrPoster(m),
        emoji: () => "\u{1F4FA}"
      },
      recentlyAdded: {
        dataKey: "recentlyAdded",
        icon: "mdi:check-circle-outline",
        titleKey: "recentlyAdded",
        apiEndpoint: null,
        hasTvPending: false,
        renderCard: (m) => this._renderRecentlyAddedCard(m),
        getPosterUrl: (m) => m._mediaType === "movie" ? this._getRadarrPoster(m) : this._getSonarrPoster(m),
        emoji: (m) => m._mediaType === "movie" ? "\u{1F3AC}" : "\u{1F4FA}"
      },
      recentlyRequested: {
        dataKey: "recentlyRequested",
        icon: "mdi:clock-time-four-outline",
        titleKey: "recentlyRequested",
        apiEndpoint: null,
        hasTvPending: false,
        renderCard: (m) => this._renderRecentlyRequestedCard(m),
        getPosterUrl: (m) => m._mediaType === "movie" ? this._getRadarrPoster(m) : this._getSonarrPoster(m),
        emoji: (m) => m._mediaType === "movie" ? "\u{1F3AC}" : "\u{1F4FA}"
      }
    };
    return cfgs[section] || null;
  }
  // Paged grid with automatic See-More card insertion (if items exceed showMoreOnPage threshold)
  _pagedGridWithSmp(items, section, renderFn) {
    if (!items || items.length === 0) return "";
    const showMorePage = Math.max(1, parseInt(this._cfgGet("discover", "showMoreOnPage", 3)) || 3);
    const cols = Math.max(2, Math.min(10, parseInt(this._cfgGet("discover", "itemsPerCategory", 4)) || 4));
    const itemsBefore = showMorePage * cols - 1;
    if (items.length > itemsBefore) {
      const withSmp = [...items.slice(0, itemsBefore), { _isSeeMore: true }];
      return this._pagedGrid(withSmp, section, (m) => m._isSeeMore ? this._renderSeeMoreCardFor(section) : renderFn(m), cols);
    }
    return this._pagedGrid(items, section, renderFn, cols);
  }
  // Lokalizační helper — vrátí přeložený řetězec dle nastavení localisation: cs|en
  _t(key) {
    const lang = this._cfg?.localisation === "cs" ? "cs" : "en";
    return (ARR_I18N[lang] || ARR_I18N.cs)[key] || key;
  }
  // Returns items per page for a given section (respects YAML config)
  _perPage(section) {
    if (section === "qbit") return parseInt(this._cfgGet("downloads", "torrentItems", 3)) || 3;
    if (section === "sab") return parseInt(this._cfgGet("downloads", "usenetItems", 3)) || 3;
    return 4;
  }
  // Converts "#rrggbb" or "#rgb" to "r,g,b" string for use in rgba()
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
  // ─────────────────────────────────────────────
  // Badge / pill helpers
  // ─────────────────────────────────────────────
  /** Media card poster img + gradient placeholder fallback */
  _mcImg(poster, emoji, gradId, phClass = "") {
    return poster ? `<img src="${poster}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">` : `<div class="${phClass}${this._grad(gradId)}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px">${emoji}</div>`;
  }
  /** Media card gradient footer overlay */
  _mcGrad(grad, inner) {
    return `<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,${grad} 0%,transparent 80%);padding:28px 6px 6px;z-index:1">${inner}</div>`;
  }
  /** Media card badge with text: <span class="badge {cls}">{icon}<span class="b-txt"> {text}</span></span> */
  _badge(cls, icon, text) {
    return `<span class="badge ${cls}">${icon}<span class="b-txt"> ${text}</span></span>`;
  }
  /** Media card badge with mdi icon: <span class="badge {cls}"><ha-icon ...> {text}</span> */
  _badgeIcon(cls, mdiIcon, text) {
    return `<span class="badge ${cls}"><ha-icon icon="${mdiIcon}" style="--mdc-icon-size:9px"></ha-icon> ${text}</span>`;
  }
  /** Download panel status pill: <span class="status-pill {cls}"><ha-icon ...> {text}</span> */
  _pill(cls, mdiIcon, text, style = "") {
    return `<span class="status-pill ${cls}"${style ? ` style="${style}"` : ""}><ha-icon icon="${mdiIcon}" style="--mdc-icon-size:11px"></ha-icon> ${text}</span>`;
  }
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
    const grid = `<div class="mgrid ${animClass}" style="grid-template-columns:repeat(${perPage},1fr)">${pageItems.map((it) => renderFn(it)).join("")}</div>`;
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
    if (section === "sab") {
      const slots = Array.isArray(this._sab?.slots) ? this._sab.slots : [];
      const completed = (this._sabCompleted || []).map((s) => ({
        nzo_id: s.nzo_id,
        filename: s.name || s.filename || "Unknown",
        percentage: "100",
        mb: String((s.bytes || 0) / 1024 / 1024),
        mbleft: "0",
        status: "Completed",
        timeleft: "",
        size: s.size || "",
        _history: true
      }));
      return [...slots, ...completed];
    }
    if (section === "pending") return this._pendingRequests || [];
    if (section === "recentlyAdded") return this.recentlyAdded;
    if (section === "recentlyRequested") return this.recentlyRequested;
    return this["_" + section] || [];
  }
  get recentlyAdded() {
    const movies = (this._radarr || []).filter((m) => m.hasFile).map((m) => ({ ...m, _mediaType: "movie", _sortDate: m.movieFile?.dateAdded || m.added || "" }));
    const movies2 = (this._radarr2 || []).filter((m) => m.hasFile).map((m) => ({ ...m, _mediaType: "movie", _isRadarr2: true, _sortDate: m.movieFile?.dateAdded || m.added || "" }));
    const shows = (this._sonarr || []).filter((s) => (s.statistics?.episodeFileCount ?? 0) > 0).map((s) => ({ ...s, _mediaType: "tv", _sortDate: this._sonarrImportDates?.[s.id] || s.added || "" }));
    const shows2 = (this._sonarr2 || []).filter((s) => (s.statistics?.episodeFileCount ?? 0) > 0).map((s) => ({ ...s, _mediaType: "tv", _isSonarr2: true, _sortDate: this._sonarr2ImportDates?.[s.id] || s.added || "" }));
    const movieMap = /* @__PURE__ */ new Map();
    for (const m of [...movies, ...movies2]) {
      const key = m.tmdbId ? String(m.tmdbId) : `_uid_m_${m._isRadarr2 ? "r2" : "r1"}_${m.id}`;
      if (!movieMap.has(key)) movieMap.set(key, m);
    }
    const showMap = /* @__PURE__ */ new Map();
    for (const s of [...shows, ...shows2]) {
      const key = s.tvdbId ? String(s.tvdbId) : `_uid_s_${s._isSonarr2 ? "s2" : "s1"}_${s.id}`;
      if (!showMap.has(key)) showMap.set(key, s);
    }
    return [...movieMap.values(), ...showMap.values()].sort((a, b) => b._sortDate.localeCompare(a._sortDate));
  }
  get recentlyRequested() {
    const _rqA = this._radarrQueueActive || /* @__PURE__ */ new Set();
    const _rq2A = this._radarr2QueueActive || /* @__PURE__ */ new Set();
    const _snQ = this._sonarrQueueSeriesPct || /* @__PURE__ */ new Map();
    const _snQ2 = this._sonarr2QueueSeriesPct || /* @__PURE__ */ new Map();
    const _now = (/* @__PURE__ */ new Date()).toISOString();
    const movies = (this._radarr || []).filter((m) => m.monitored && !m.hasFile).map((m) => ({ ...m, _mediaType: "movie", _sortDate: m.added || "" }));
    const movies2 = (this._radarr2 || []).filter((m) => m.monitored && !m.hasFile).map((m) => ({ ...m, _mediaType: "movie", _isRadarr2: true, _sortDate: m.added || "" }));
    const shows = (this._sonarr || []).filter((s) => s.monitored && ((s.statistics?.episodeFileCount ?? 0) === 0 || _snQ.has(s.id))).map((s) => ({ ...s, _mediaType: "tv", _sortDate: _snQ.has(s.id) && (s.statistics?.episodeFileCount ?? 0) > 0 ? _now : s.added || "" }));
    const shows2 = (this._sonarr2 || []).filter((s) => s.monitored && ((s.statistics?.episodeFileCount ?? 0) === 0 || _snQ2.has(s.id))).map((s) => ({ ...s, _mediaType: "tv", _isSonarr2: true, _sortDate: _snQ2.has(s.id) && (s.statistics?.episodeFileCount ?? 0) > 0 ? _now : s.added || "" }));
    const _isDlMovie = (m) => m._isRadarr2 ? _rq2A.has(m.id) : _rqA.has(m.id);
    const _isDlShow = (s) => s._isSonarr2 ? _snQ2.has(s.id) : _snQ.has(s.id);
    const movieMap = /* @__PURE__ */ new Map();
    for (const m of [...movies, ...movies2]) {
      const key = m.tmdbId ? String(m.tmdbId) : `_uid_m_${m._isRadarr2 ? "r2" : "r1"}_${m.id}`;
      const ex = movieMap.get(key);
      if (!ex || !_isDlMovie(ex) && _isDlMovie(m)) movieMap.set(key, m);
    }
    const showMap = /* @__PURE__ */ new Map();
    for (const s of [...shows, ...shows2]) {
      const key = s.tvdbId ? String(s.tvdbId) : `_uid_s_${s._isSonarr2 ? "s2" : "s1"}_${s.id}`;
      const ex = showMap.get(key);
      if (!ex || !_isDlShow(ex) && _isDlShow(s)) showMap.set(key, s);
    }
    const _movieHasFile = /* @__PURE__ */ new Set([
      ...(this._radarr || []).filter((m) => m.hasFile && m.tmdbId).map((m) => String(m.tmdbId)),
      ...(this._radarr2 || []).filter((m) => m.hasFile && m.tmdbId).map((m) => String(m.tmdbId))
    ]);
    const _showHasEps = /* @__PURE__ */ new Set([
      ...(this._sonarr || []).filter((s) => (s.statistics?.episodeFileCount ?? 0) > 0 && s.tvdbId).map((s) => String(s.tvdbId)),
      ...(this._sonarr2 || []).filter((s) => (s.statistics?.episodeFileCount ?? 0) > 0 && s.tvdbId).map((s) => String(s.tvdbId))
    ]);
    const finalMovies = [...movieMap.values()].filter((m) => {
      const key = m.tmdbId ? String(m.tmdbId) : null;
      return !key || !_movieHasFile.has(key);
    });
    const finalShows = [...showMap.values()].filter((s) => {
      if (_isDlShow(s)) return true;
      const key = s.tvdbId ? String(s.tvdbId) : null;
      return !key || !_showHasEps.has(key);
    });
    return [...finalMovies, ...finalShows].sort((a, b) => b._sortDate.localeCompare(a._sortDate));
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
  _reRenderRight(force = false) {
    const right = this.shadowRoot.getElementById("col-right");
    if (!right) return;
    if (!force && this._requestPending) return;
    if (!this._searchActive) this._blurActive();
    if (this._searchActive && this._rightMaxH) right.style.minHeight = this._rightMaxH + "px";
    right.innerHTML = this._renderRight();
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
    this._wireSearch();
    this._wireTautulliPosters(right);
    this._wireJellystatPosters(right);
    if (this._searchActive) {
      requestAnimationFrame(() => {
        const inp = this.shadowRoot.querySelector(".search-bar-input");
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      });
    }
    requestAnimationFrame(() => {
      if (!this._searchActive) {
        const isMobile = window.matchMedia("(max-width: 900px)").matches;
        if (isMobile) {
          const sc = this._findScrollContainer();
          const savedTop = sc ? sc.scrollTop : 0;
          this._measureAndLockHeight();
          if (sc) sc.scrollTop = savedTop;
        } else {
          this._measureAndLockHeight();
        }
      }
      requestAnimationFrame(() => this._checkBadgeOverflow());
    });
  }
  // Přeměří všechny stránky pravého sloupce a nastaví min-height na nejvyšší.
  // Každá outer stránka se měří se všemi _pages sekcí = 0 (nejvyšší možná varianta).
  // Vše proběhne synchronně v jednom JS tiku — browser nestihne malovat.
  _measureAndLockHeight() {
    const right = this.shadowRoot.getElementById("col-right");
    if (!right) return;
    if (this._overlay?.section && this._rightMaxH) {
      right.style.minHeight = this._rightMaxH + "px";
      this._wirePageButtons();
      this._wirePopup();
      this._wireOverseerrButtons();
      this._wireSearch();
      return;
    }
    const savedPage = this._rightPage;
    const savedPages = { ...this._pages };
    let maxH = 0;
    right.style.visibility = "hidden";
    right.style.minHeight = "";
    for (let p = 0; p < 20; p++) {
      this._rightPage = p;
      Object.keys(this._pages).forEach((k) => {
        this._pages[k] = 0;
      });
      right.innerHTML = this._renderRight();
      maxH = Math.max(maxH, right.scrollHeight);
      const hasNext = !!right.querySelector('.rp-btn[data-dir="next"]:not(.rp-btn-hidden):not([disabled])');
      if (!hasNext) break;
    }
    this._rightPage = savedPage;
    Object.assign(this._pages, savedPages);
    right.innerHTML = this._renderRight();
    right.style.visibility = "";
    this._rightMaxH = maxH;
    right.style.minHeight = maxH + "px";
    this._wirePageButtons();
    this._wirePopup();
    this._wireOverseerrButtons();
    this._wireSearch();
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
    if (this._overseerrConfigured === false) {
      this._pendingRequests = [];
      return;
    }
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
    if (this._overseerrConfigured === false) return;
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
    const req = this._pendingRequests.find((r) => r.id === requestId);
    const isMovie = req?.type === "movie";
    this._optimisticRemovePending(requestId);
    try {
      if (isMovie && !this._seerrRadarr) await this._fetchOverseerrRadarrSettings();
      if (!isMovie && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const seerr = isMovie ? this._seerrRadarr : this._seerrSonarr;
      const body = { requestId };
      if (seerr) {
        body.mediaType = isMovie ? "movie" : "tv";
        body.serverId = seerr.serverId;
        body.profileId = seerr.profileId;
        body.rootFolder = seerr.rootFolder;
        if (!isMovie && req?.seasons) body.seasons = req.seasons.map((s) => s.seasonNumber);
      }
      await this._hass.callApi("POST", "arr_stack/overseerr/approve", body);
      await Promise.all([
        this._fetchPendingRequests(),
        this._fetchRadarr(),
        this._fetchSonarr()
      ]);
      this._reRenderRight();
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
    const perfMode = !!(userStyles.performanceMode || this._cfg?.performanceMode);
    const customVars = [];
    const hexRgba = (hex, alpha) => {
      if (!hex || !hex.startsWith("#")) return null;
      const rgb = this._hexToRgb(hex);
      return rgb ? `rgba(${rgb},${alpha})` : null;
    };
    if (perfMode && userStyles.cardBackground) {
      const opacityPct = userStyles.cardBackgroundOpacity;
      const alpha = typeof opacityPct === "number" && opacityPct >= 0 && opacityPct <= 100 ? opacityPct / 100 : 0.9;
      const v = hexRgba(userStyles.cardBackground, alpha);
      if (v) customVars.push(`--card-bg-perf: ${v}`);
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
    if (customVars.length) {
      const varStyle = document.createElement("style");
      varStyle.textContent = `:host { ${customVars.join("; ")}; }`;
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
    const left = this.shadowRoot.getElementById("col-left");
    const right = this.shadowRoot.getElementById("col-right");
    if (!left || !right) return;
    const layout = this._cfg?.layout || "both";
    if (layout !== "right") left.innerHTML = this._renderLeft();
    if (this._requestPending) return;
    if (layout !== "left") right.innerHTML = this._renderRight();
    this._wireSort();
    this._wireActionButtons();
    this._wireOverseerrButtons();
    this._wirePageButtons();
    this._wirePopup();
    this._wireSearch();
    if (right) this._wireTautulliPosters(right);
    if (right) this._wireJellystatPosters(right);
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
      discover: { categoriesCount: 3, oneClickRequest: false, oneClickDefaultMovieProfile: "", oneClickDefaultShowProfile: "" },
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
applyMixin(ArrStackCard.prototype, autoSearchMixin);
applyMixin(ArrStackCard.prototype, fetchMixin);
applyMixin(ArrStackCard.prototype, renderLeftMixin);
applyMixin(ArrStackCard.prototype, renderRightMixin);
applyMixin(ArrStackCard.prototype, mediaCardsMixin);
applyMixin(ArrStackCard.prototype, themeMixin);
applyMixin(ArrStackCard.prototype, wireMixin);
applyMixin(ArrStackCard.prototype, wireTautulliMixin);
applyMixin(ArrStackCard.prototype, wireJellystatMixin);
applyMixin(ArrStackCard.prototype, popupMixin);
applyMixin(ArrStackCard.prototype, tautulliSharedMixin);
applyMixin(ArrStackCard.prototype, tautulliTableMixin);
applyMixin(ArrStackCard.prototype, tautulliMixin);
applyMixin(ArrStackCard.prototype, tautulliGraphsMixin);
applyMixin(ArrStackCard.prototype, jellystatSharedMixin);
applyMixin(ArrStackCard.prototype, jellystatTableMixin);
applyMixin(ArrStackCard.prototype, jellystatMixin);
applyMixin(ArrStackCard.prototype, jellystatGraphsMixin);
customElements.define("arr-stack-card", ArrStackCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "arr-stack-card",
  name: "Arr Stack Card",
  description: "Media server dashboard \u2014 Radarr, Sonarr, Overseerr, SABnzbd, qBittorrent"
});
