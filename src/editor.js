// Arr Stack Card — Visual Editor
class ArrStackCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._caps = null;
    this._activeTab = 'general';
  }

  set hass(hass) {
    const wasAdmin = this._hass?.user?.is_admin;
    this._hass = hass;
    if (!this._caps) this._loadCaps();
    if (wasAdmin !== hass?.user?.is_admin) this._render();
  }

  async _loadCaps() {
    try {
      this._caps = await this._hass.callApi('GET', 'arr_stack/capabilities/info');
      const hasDownloads = this._caps.qbit || this._caps.sabnzbd || this._caps.nzbget || this._caps.deluge || this._caps.rtorrent;
      if (!hasDownloads && this._config.layout !== 'right') {
        this._config = { ...this._config, layout: 'right' };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      }
      if (this._caps.overseerr) {
        try {
          const accts = await this._hass.callApi('GET', 'arr_stack/overseerr/seerr_accounts');
          this._seerrAccounts = accts || [];
        } catch (_) { this._seerrAccounts = []; }
      }
      this._render();
    } catch (_) {
      this._caps = {};
    }
  }

  setConfig(config) {
    config = config || {};
    if (Array.isArray(config.categories)) {
      const CAT_MAP = { radarr: 'recentlyAdded', sonarr: 'recentlyRequested' };
      const seen = new Set();
      config = {
        ...config,
        categories: config.categories
          .map(c => CAT_MAP[c.id] ? { ...c, id: CAT_MAP[c.id] } : c)
          .filter(c => seen.has(c.id) ? false : seen.add(c.id)),
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
    if (v !== undefined) return v;
    const flat = this._config?.[key];
    if (flat !== undefined) return flat;
    return fallback;
  }

  _val(key, fallback) {
    const v = this._config?.[key];
    return v !== undefined ? v : fallback;
  }

  _styleVal(key, fallback) {
    const v = this._config?.styles?.[key];
    return v !== undefined ? v : fallback;
  }

  // Extract hex from stored hex or rgba string
  _toHex(val, fallback) {
    if (!val) return fallback;
    if (/^#/.test(val)) return val;
    // rgba(r,g,b,...) → #rrggbb
    const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return '#' + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
    return fallback;
  }

  _render() {
    const perfMode = !!this._styleVal('performanceMode', false);
    const tab = this._activeTab;

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
        .tabs {
          display: flex; gap: 0; margin-bottom: 16px;
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
        }
        .tab {
          padding: 8px 14px; font-size: 12px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em;
          cursor: pointer; border: none; background: none;
          color: var(--secondary-text-color, #757575);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px; transition: color .15s, border-color .15s;
          white-space: nowrap;
        }
        .tab:hover { color: var(--primary-text-color, #212121); }
        .tab.active {
          color: var(--primary-color, #03a9f4);
          border-bottom-color: var(--primary-color, #03a9f4);
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .section { margin-bottom: 20px; }
        .sub-group { padding-left: 14px; }
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
          <div class="bmc-title">Buy me a coffee ☕</div>
          <div class="bmc-sub">If you find this card useful, support the developer</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;flex-shrink:0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>

      <div class="tabs">
        <button class="tab${tab === 'general' ? ' active' : ''}" data-tab="general">General</button>
        <button class="tab${tab === 'left' ? ' active' : ''}" data-tab="left">Left Panel</button>
        <button class="tab${tab === 'right' ? ' active' : ''}" data-tab="right">Right Panel</button>
        ${this._seerrAccounts?.length > 1 ? `<button class="tab${tab === 'users' ? ' active' : ''}" data-tab="users">Users</button>` : ''}
        <button class="tab${tab === 'appearance' ? ' active' : ''}" data-tab="appearance">Appearance</button>
      </div>

      <!-- ═══ TAB: General ═══ -->
      <div class="tab-content${tab === 'general' ? ' active' : ''}" data-tab-content="general">
        <div class="section">
          <div class="row">
            <span class="row-label">Language</span>
            <select data-key="localisation">
              <option value="cs" ${this._val('localisation','en')==='cs'?'selected':''}>Czech</option>
              <option value="en" ${this._val('localisation','en')==='en'?'selected':''}>English</option>
              <option value="fr" ${this._val('localisation','en')==='fr'?'selected':''}>French</option>
            </select>
          </div>
          ${(this._caps?.qbit || this._caps?.sabnzbd || this._caps?.nzbget || this._caps?.deluge || this._caps?.rtorrent || this._caps === null) ? `
          <div class="row">
            <span class="row-label">Layout</span>
            <select data-key="layout">
              <option value="both"  ${this._val('layout','both')==='both' ?'selected':''}>Both panels</option>
              <option value="left"  ${this._val('layout','both')==='left' ?'selected':''}>Downloads only</option>
              <option value="right" ${this._val('layout','both')==='right'?'selected':''}>Media only</option>
            </select>
          </div>` : ''}
          ${(this._caps?.qbit || this._caps?.sabnzbd || this._caps === null) ? `
          <div class="row">
            <span class="row-label">Swap sides</span>
            <label class="toggle">
              <input type="checkbox" data-key="swap_sides" ${this._val('swap_sides', false) ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          ${this._val('swap_sides', false) ? `<div class="hint">Media panel is taller — set Sticky nav offset to ~2000 for the nav to appear immediately on mobile.</div>` : ''}` : ''}
          <div class="row">
            <span class="row-label">Sticky nav offset (px)</span>
            <input type="number" data-key="sticky_nav_offset" value="${this._val('sticky_nav_offset', 100)}" min="0" max="500" step="10"/>
          </div>
        </div>
      </div>

      <!-- ═══ TAB: Left Panel ═══ -->
      <div class="tab-content${tab === 'left' ? ' active' : ''}" data-tab-content="left">

        <!-- Downloads -->
        <div class="section">
          <div class="section-title">Downloads</div>
          <div class="row">
            <span class="row-label">Torrent items per page</span>
            <input type="number" data-group="downloads" data-key="torrentItems" value="${this._cfg('downloads','torrentItems',3)}" min="1" max="20"/>
          </div>
          <div class="row">
            <span class="row-label">Usenet items per page</span>
            <input type="number" data-group="downloads" data-key="usenetItems" value="${this._cfg('downloads','usenetItems',3)}" min="1" max="20"/>
          </div>
          <div class="row">
            <span class="row-label">Allow download controls</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="allowControls" ${this._cfg('downloads','allowControls',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">When disabled, play/pause and delete buttons are hidden. Category filters remain accessible.</div>
          <div class="section-subtitle" style="font-size:11px;font-weight:600;color:var(--secondary-text-color,#9e9e9e);text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 6px">Cards</div>
          <div class="sub-group">
          <div class="row">
            <span class="row-label">Show storage card</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="showStorage" ${this._cfg('downloads','showStorage',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show total speed card</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="showTotalSpeed" ${this._cfg('downloads','showTotalSpeed',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show VPN card</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="showVpnCard" ${this._cfg('downloads','showVpnCard',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div></div>
<div class="section-subtitle" style="font-size:11px;font-weight:600;color:var(--secondary-text-color,#9e9e9e);text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 6px">Download row</div>
          <div class="sub-group">
          <div class="row">
            <span class="row-label">Upload speed</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowUpload" ${this._cfg('downloads','rowUpload',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Time left</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowEta" ${this._cfg('downloads','rowEta',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Size</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowSize" ${this._cfg('downloads','rowSize',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Peers</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowPeers" ${this._cfg('downloads','rowPeers',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Percentage</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowPercent" ${this._cfg('downloads','rowPercent',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Progress bar</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowProgress" ${this._cfg('downloads','rowProgress',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div></div>
          <div class="hint">What each download row shows. The first pill always stays — it carries the state, so Stalled, Paused, Complete and errors remain visible. Upload speed and Peers apply to torrent clients only.</div>
        </div>

        <!-- Download Clients -->
        ${(() => {
          const caps   = this._caps;
          const allClients = this._getClients().filter(c => {
            if (caps === null) return true;
            if (c.id === 'qbit'     && !caps?.qbit)      return false;
            if (c.id === 'deluge'   && !caps?.deluge)     return false;
            if (c.id === 'rtorrent' && !caps?.rtorrent)   return false;
            if (c.id === 'sab'      && !caps?.sabnzbd)    return false;
            if (c.id === 'nzbget'   && !caps?.nzbget)     return false;
            return true;
          });
          const torrentIds = ['qbit', 'deluge', 'rtorrent'];
          const usenetIds  = ['sab', 'nzbget'];
          const torrentClients = allClients.filter(c => torrentIds.includes(c.id));
          const usenetClients  = allClients.filter(c => usenetIds.includes(c.id));
          if (allClients.length === 0) return '';
          const renderGroup = (title, clients) => clients.length === 0 ? '' : `
          <div class="section-subtitle" style="font-size:11px;font-weight:600;color:var(--secondary-text-color,#9e9e9e);text-transform:uppercase;letter-spacing:0.06em;margin:8px 0 4px">${title}</div>
          <div class="cat-list">
            ${clients.map(c => `
              <div class="cat-item${c.enabled === false ? ' cat-disabled' : ''}" draggable="true" data-client-id="${c.id}">
                <ha-icon icon="mdi:drag-vertical" style="--mdc-icon-size:18px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0;cursor:grab"></ha-icon>
                <span class="cat-label">${this._clientLabel(c.id)}</span>
                <label class="toggle">
                  <input type="checkbox" data-client-toggle="${c.id}" ${c.enabled !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>`;
          return `
        <div class="section">
          <div class="section-title">Download Clients</div>
          <div class="hint" style="margin-bottom:8px">Drag to reorder · toggle to show/hide. Only configured clients are shown.</div>
          ${renderGroup('Torrent', torrentClients)}
          ${renderGroup('Usenet', usenetClients)}
        </div>`;
        })()}

        <!-- Storage -->
        <div class="section">
          <div class="section-title">Storage</div>
          <div class="row">
            <span class="row-label">Disk space source</span>
            <select data-style-key="storageSource">
              <option value="auto"    ${this._styleVal('storageSource','auto') === 'auto'    ? 'selected' : ''}>Auto</option>
              <option value="radarr"  ${this._styleVal('storageSource','auto') === 'radarr'  ? 'selected' : ''}>Radarr</option>
              ${this._caps?.radarr2 ? '<option value="radarr2" ' + (this._styleVal('storageSource','auto') === 'radarr2' ? 'selected' : '') + '>Radarr 2</option>' : ''}
              <option value="sonarr"  ${this._styleVal('storageSource','auto') === 'sonarr'  ? 'selected' : ''}>Sonarr</option>
              ${this._caps?.sonarr2 ? '<option value="sonarr2" ' + (this._styleVal('storageSource','auto') === 'sonarr2' ? 'selected' : '') + '>Sonarr 2</option>' : ''}
            </select>
          </div>
          <div class="hint">Which service to use for the disk space widget. Use Radarr or Sonarr if SABnzbd reports a different volume (e.g. cache drive instead of array).</div>
        </div>
      </div>

      <!-- ═══ TAB: Right Panel ═══ -->
      <div class="tab-content${tab === 'right' ? ' active' : ''}" data-tab-content="right">

        <div class="section">
          <div class="row">
            <span class="row-label">Categories per page</span>
            <input type="number" data-group="discover" data-key="categoriesCount" value="${this._cfg('discover','categoriesCount',3)}" min="1" max="10"/>
          </div>
          <div class="row">
            <span class="row-label">Items per category</span>
            <input type="number" data-group="discover" data-key="itemsPerCategory" value="${this._cfg('discover','itemsPerCategory',4)}" min="2" max="10"/>
          </div>
          <div class="row">
            <span class="row-label">Search bar</span>
            <label class="toggle"><input type="checkbox" data-group="discover" data-key="showSearch" ${this._cfg('discover','showSearch',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Off gives its slot to one more category — for a static or e-ink dashboard.</div>
          <div class="hint">Number of poster columns per category row, search results and More overlay. Default: 4.</div>
          <div class="row">
            <span class="row-label">Show More card on page</span>
            <input type="number" data-group="discover" data-key="showMoreOnPage" value="${this._cfg('discover','showMoreOnPage',3)}" min="1" max="50"/>
          </div>
          <div class="hint">Insert a "See More" card as the last slot on this page. Opens full-section overlay. Default: 3.</div>
          ${(this._caps?.trakt || this._caps?.suggestarr) ? `
          <div class="section-title" style="margin-top:16px">Recommendations</div>
          ${this._caps?.trakt ? `
          <div class="row">
            <span class="row-label">Trakt</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="recTrakt" ${this._cfg('discover','recTrakt',true)!==false?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          </div>` : ''}
          ${this._caps?.suggestarr ? `
          <div class="row">
            <span class="row-label">SuggestArr</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="recSuggestarr" ${this._cfg('discover','recSuggestarr',true)!==false?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          </div>` : ''}
          <div class="hint">What the Recommendations row draws on. With both on, the two are dealt out one after the other so neither fills the row. Music from Last.fm joins it whenever Lidarr is set up — the row's own filter is where it gets switched off.</div>` : ''}
          ${this._caps?.overseerr ? `
          <div class="section-title" style="margin-top:16px">Recently Requested</div>
          <div class="row">
            <span class="row-label">Source</span>
            <select data-group="discover" data-key="requestedSource" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="both" ${this._cfg('discover','requestedSource','both')==='both'?'selected':''}>Seerr + card</option>
              <option value="seerr" ${this._cfg('discover','requestedSource','both')==='seerr'?'selected':''}>Seerr only</option>
              <option value="library" ${this._cfg('discover','requestedSource','both')==='library'?'selected':''}>Library</option>
            </select>
          </div>
          <div class="hint">Seerr + card adds what you requested through the card and anything downloading right now. Seerr only mirrors your Seerr request list exactly. Library is the old behaviour: every monitored title without a file, whatever put it there.</div>` : ''}
          <div class="section-title" style="margin-top:16px">One-click Request</div>
          <div class="row">
            <span class="row-label">Enabled</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="oneClickRequest" ${(this._cfg('discover','oneClickRequest',false)||this._cfg('discover','oneClickMovieRequest',false))?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Skip profile dialog for movies and TV shows.</div>
          <div class="row">
            <span class="row-label">Non-admin only</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="oneClickNonAdminOnly" ${this._cfg('discover','oneClickNonAdminOnly',false)?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Admin keeps the profile selection dialog, non-admin users get one-click.</div>
          <div class="row">
            <span class="row-label">Season mode</span>
            <select data-group="discover" data-key="oneClickTvSeasonMode" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="first" ${this._cfg('discover','oneClickTvSeasonMode','first') === 'first' ? 'selected' : ''}>First season</option>
              <option value="latest" ${this._cfg('discover','oneClickTvSeasonMode','first') === 'latest' ? 'selected' : ''}>Latest season</option>
              <option value="all" ${this._cfg('discover','oneClickTvSeasonMode','first') === 'all' ? 'selected' : ''}>All seasons</option>
            </select>
          </div>
          <div class="hint">Which seasons to request when using one-click for shows.</div>
          <div class="row">
            <span class="row-label">Default movie profile</span>
            <input type="text" data-group="discover" data-key="oneClickDefaultMovieProfile" value="${this._cfg('discover','oneClickDefaultMovieProfile','')}" placeholder="e.g. HD-1080p" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)"/>
          </div>
          <div class="hint">Quality profile name from Radarr (Settings → Profiles → Name). Leave empty to use Radarr default.</div>
          <div class="row">
            <span class="row-label">Default show profile</span>
            <input type="text" data-group="discover" data-key="oneClickDefaultShowProfile" value="${this._cfg('discover','oneClickDefaultShowProfile','')}" placeholder="e.g. HD-1080p" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)"/>
          </div>
          <div class="hint">Quality profile name from Sonarr (Settings → Profiles → Name). Leave empty to use Sonarr default.</div>
        </div>

        <!-- Posters -->
        <div class="section">
          <div class="section-title">Posters</div>
          <div class="row">
            <span class="row-label">Show title</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showTitle" ${this._cfg('posters','showTitle',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show audio languages</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showAudio" ${this._cfg('posters','showAudio',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show subtitles</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showSubtitles" ${this._cfg('posters','showSubtitles',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show rating</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showRating" ${this._cfg('posters','showRating',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show media type tag</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showMediaType" ${this._cfg('posters','showMediaType',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Show a Movie or TV label in the top-left corner of each poster.</div>
          <div class="row">
            <span class="row-label">Language display</span>
            <select data-group="posters" data-key="langDisplay" style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="flags" ${this._cfg('posters','langDisplay','flags')==='flags'?'selected':''}>Combined — flags</option>
              <option value="tags" ${this._cfg('posters','langDisplay','flags')==='tags'?'selected':''}>Separate tags</option>
            </select>
          </div>
          <div class="hint">Combined puts subtitle flags, the rating and audio flags in one strip. Separate keeps the original rating, audio and subtitle tags. The two toggles above switch the left and right flags off in either mode.</div>
          ${(this._caps === null || this._caps?.maintainerr) ? `
          <div class="row">
            <span class="row-label">Show deletion tag</span>
            <select data-group="posters" data-key="goneTag" style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="all" ${this._cfg('posters','goneTag','all')==='all'?'selected':''}>All categories</option>
              <option value="maintainerr" ${this._cfg('posters','goneTag','all')==='maintainerr'?'selected':''}>Maintainerr only</option>
              <option value="off" ${this._cfg('posters','goneTag','all')==='off'?'selected':''}>Never</option>
            </select>
          </div>
          <div class="hint">Marks titles Maintainerr has queued for deletion with a "Gone in…" tag.</div>` : ''}
          <div class="row">
            <span class="row-label">Rating provider</span>
            <select data-group="posters" data-key="ratingProvider" style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="imdb" ${this._cfg('posters','ratingProvider',this._cfg('discover','ratingProvider','imdb'))==='imdb'?'selected':''}>IMDb</option>
              <option value="tmdb" ${this._cfg('posters','ratingProvider',this._cfg('discover','ratingProvider','imdb'))==='tmdb'?'selected':''}>TMDB</option>
            </select>
          </div>
          <div class="hint">Falls back to TMDB → TheTVDB if IMDb score is unavailable.</div>
          <div class="row">
            <span class="row-label">Status display</span>
            <select data-group="posters" data-key="statusDisplay">
              <option value="tags" ${this._cfg('posters','statusDisplay','tags')==='tags'?'selected':''}>Tags</option>
              <option value="stripes" ${this._cfg('posters','statusDisplay','tags')==='stripes'?'selected':''}>Stripes</option>
              <option value="both" ${this._cfg('posters','statusDisplay','tags')==='both'?'selected':''}>Both</option>
            </select>
          </div>
          <div class="hint">Tags show status badges on posters. Stripes show a coloured bar at the bottom with download progress. Both combines them.</div>
        </div>

        <!-- Categories -->
        <div class="section">
          <div class="section-title">Categories</div>
          <div class="hint" style="margin-bottom:8px">Drag to reorder · toggle to show/hide.</div>
          <div class="cat-list">
            ${this._getCats().filter(c => {
                if (!this._hass?.user?.is_admin && ['tautulli','jellystat','tracearr','activity','prowlarr','maintainerr'].includes(c.id)) return false;
                if (c.id === 'prowlarr' && this._caps !== null && !this._caps?.prowlarr) return false;
                if (c.id === 'tracearr' && this._caps !== null && !this._caps?.tracearr) return false;
                if (c.id === 'maintainerr' && this._caps !== null && !this._caps?.maintainerr) return false;
                return true;
              }).map(c => `
              <div class="cat-item${c.enabled === false ? ' cat-disabled' : ''}" draggable="true" data-cat-id="${c.id}">
                <ha-icon icon="mdi:drag-vertical" style="--mdc-icon-size:18px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0;cursor:grab"></ha-icon>
                <span class="cat-label">${this._catLabel(c.id)}</span>
                <label class="toggle">
                  <input type="checkbox" data-cat-toggle="${c.id}" ${c.enabled !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- ═══ TAB: Users ═══ -->
      ${this._caps?.overseerr ? `
      <div class="tab-content${tab === 'users' ? ' active' : ''}" data-tab-content="users">
        <div class="section">
          <div class="section-title">Seerr User Mapping</div>
          <div class="hint" style="margin-top:0;margin-bottom:12px">Map HA users to Seerr accounts. Non-admin HA users without a specific mapping use the default.</div>
          <div class="user-map-rows">
            ${this._renderUserMapRows()}
          </div>
          <button class="user-map-add" style="margin-top:8px;padding:6px 14px;border-radius:6px;border:1px solid var(--divider-color,#e0e0e0);background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color);font-size:12px;cursor:pointer">+ Add mapping</button>
        </div>
      </div>` : ''}

      <!-- ═══ TAB: Appearance ═══ -->
      <div class="tab-content${tab === 'appearance' ? ' active' : ''}" data-tab-content="appearance">
        <div class="section">
          <div class="row">
            <span class="row-label">Performance mode</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="performanceMode" ${perfMode?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Disables backdrop blur — improves performance on low-end devices.</div>

          ${perfMode ? this._colorRow('Card background', 'cardBackground', '#121216') : ''}
          ${perfMode ? this._numberRow('Card background transparency', 'cardBackgroundOpacity', 90, 0, 100, 1, '0–100 %') : ''}

          <div class="row">
            <span class="row-label">Day / night modal colours</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="dayNightMode" ${this._styleVal('dayNightMode', true) ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Automatically switches modal (popup) colours based on time of day. Disable if you use custom modal colours.</div>

          <div class="row">
            <span class="row-label">ARR application icons</span>
            <select data-style-key="applicationIcons">
              <option value="real" ${this._styleVal('applicationIcons','real') === 'real' ? 'selected' : ''}>Real (app logos)</option>
              <option value="mdi" ${this._styleVal('applicationIcons','real') === 'mdi' ? 'selected' : ''}>MDI icons</option>
            </select>
          </div>
          <div class="hint">Show actual application logos in section headers instead of generic MDI icons.</div>

          <div class="row">
            <span class="row-label">Category colour overlays</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="categoryOverlays" ${this._styleVal('categoryOverlays', true) !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Show brand-colour background tint behind each section's content.</div>

          ${this._numberRow('UI scale', 'uiScale', 1, 0.5, 3, 0.05, '0.5–3')}
          <div class="hint">Scale all card content proportionally. Use values above 1 on large screens or TVs where the default text is too small. Reduce columns (Items per category) if content overflows.</div>

          ${this._numberRow('Left panel width', 'leftPanelWidth', 40, 10, 90, 1, '10–90 %')}
          <div class="hint">Width of the downloads panel as a percentage of the card. Default is 40 %. Has no effect when the downloads panel is hidden or on mobile.</div>
        </div>
      </div>
    `;

    this._wireEvents();
    this._wireUserMap();
    if (this._activeTab === 'users' && !this._haUsers) this._loadUserMapData();
  }

  _defaultCats() {
    return [
      { id: 'recentlyAdded',     enabled: true  },
      { id: 'recentlyRequested', enabled: true  },
      { id: 'upcoming',          enabled: true  },
      { id: 'tvUpcoming',        enabled: true  },
      { id: 'trending',          enabled: true  },
      { id: 'popular',           enabled: true  },
      { id: 'recommendations',   enabled: false },
      { id: 'calendar',          enabled: true  },
      { id: 'streams',           enabled: false },
      { id: 'tautulli',          enabled: false },
      { id: 'jellystat',         enabled: false },
      { id: 'tracearr',          enabled: false },
      { id: 'activity',          enabled: false },
      { id: 'prowlarr',          enabled: false },
      { id: 'maintainerr',      enabled: false },
      { id: 'library',           enabled: true  },
    ];
  }

  // Old configs name up to three recommendation rows. They collapse into one,
  // keeping the position of the first of them — Trakt if it is there — and
  // staying on if any of them was on.
  _mergeRecCats(cats) {
    const REC = ['trakt', 'suggestarr', 'lastfm'];
    if (!cats.some(c => REC.includes(c.id))) return cats;
    if (cats.some(c => c.id === 'recommendations')) return cats.filter(c => !REC.includes(c.id));
    const slot = cats.findIndex(c => c.id === 'trakt') >= 0
      ? cats.findIndex(c => c.id === 'trakt')
      : cats.findIndex(c => REC.includes(c.id));
    const enabled = cats.some(c => REC.includes(c.id) && c.enabled !== false);
    const out = cats.filter(c => !REC.includes(c.id));
    out.splice(Math.min(slot, out.length), 0, { id: 'recommendations', enabled });
    return out;
  }

  _getCats() {
    if (!this._config?.categories) return this._defaultCats();
    // Music was its own category once; it is a filter inside Recently Added
    // now, so a saved config that still names it would otherwise show a row
    // that switches nothing on. Trakt, SuggestArr and Last.fm became one
    // Recommendations row in the same way — it takes Trakt's place when both
    // were there, Trakt being the one more people run.
    const saved = this._mergeRecCats(this._config.categories.filter(c => c.id !== 'music'));
    const savedIds = new Set(saved.map(c => c.id));
    const missing  = this._defaultCats().filter(c => !savedIds.has(c.id));
    return [...saved, ...missing];
  }

  _catLabel(id) {
    return {
      radarr:            'Recently Added',
      sonarr:            'Recently Requested',
      recentlyAdded:     'Recently Added',
      recentlyRequested: 'Recently Requested',
      music:             'Recently Added Music (Lidarr)',
      upcoming:          'Upcoming Movies',
      tvUpcoming:        'New Shows',
      trending:          'Trending',
      popular:           'Popular Movies',
      recommendations:   'Recommendations (Trakt / SuggestArr / Last.fm)',
      calendar:          'Calendar',
      streams:           'Now Playing (Plex / Jellyfin / Kodi / Emby) — auto-hidden when nothing plays',
      tautulli:          'Statistics (Plex)',
      jellystat:         'Statistics (Jellyfin)',
      tracearr:          'Streaming Statistics (Tracearr)',
      activity:          'Activity (Queue / History / Blocklist)',
      prowlarr:          'Prowlarr (Indexers / Stats / History)',
      maintainerr:       'Maintainerr (Rules / Collections / Storage)',
      library:           'Library (Movies & TV Shows)',
    }[id] || id;
  }

  _defaultClients() {
    return [
      { id: 'qbit',     enabled: true },
      { id: 'deluge',   enabled: true },
      { id: 'rtorrent', enabled: true },
      { id: 'sab',      enabled: true },
      { id: 'nzbget',   enabled: true },
    ];
  }

  _getClients() {
    const saved    = this._config?.downloadClients;
    if (!Array.isArray(saved)) return this._defaultClients();
    const savedIds = new Set(saved.map(c => c.id));
    const missing  = this._defaultClients().filter(c => !savedIds.has(c.id));
    return [...saved, ...missing];
  }

  _clientLabel(id) {
    return { qbit: 'qBittorrent', sab: 'SABnzbd', nzbget: 'NZBGet', deluge: 'Deluge', rtorrent: 'rTorrent' }[id] || id;
  }

  _numberRow(label, key, defaultVal, min, max, step, hint) {
    const stored = this._styleVal(key, null);
    const val = stored != null ? stored : defaultVal;
    return `
      <div class="row">
        <span class="row-label">${label}</span>
        ${hint ? `<span class="color-alpha">${hint}</span>` : ''}
        <input type="number" data-style-key="${key}" value="${val}" min="${min}" max="${max}" step="${step}" style="width:56px;text-align:right"/>
      </div>`;
  }

  _sliderRow(label, key, defaultVal, min, max, step, unit) {
    const stored = this._styleVal(key, null);
    const val = stored != null ? stored : defaultVal;
    const display = unit ? `${val}${unit}` : `${val}`;
    return `
      <div class="row" style="flex-wrap:wrap;gap:4px">
        <span class="row-label">${label}</span>
        <span class="color-alpha" data-val-for="${key}" style="min-width:36px;text-align:right">${display}</span>
      </div>
      <input type="range" data-style-key="${key}" data-unit="${unit||''}" value="${val}" min="${min}" max="${max}" step="${step}"
        style="width:100%;margin:2px 0 6px;accent-color:var(--primary-color,#03a9f4)"/>`;
  }

  _colorRow(label, key, defaultHex, alphaHint) {
    const stored = this._styleVal(key, null);
    const hex = this._toHex(stored, defaultHex);
    return `
      <div class="row">
        <span class="row-label">${label}</span>
        ${alphaHint ? `<span class="color-alpha">${alphaHint}</span>` : ''}
        <input type="color" data-style-key="${key}" value="${hex}"/>
      </div>`;
  }

  _wireEvents() {
    // Tab switching
    this.shadowRoot.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        this.shadowRoot.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this._activeTab));
        this.shadowRoot.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === this._activeTab));
        if (this._activeTab === 'users') this._loadUserMapData();
      });
    });

    // Top-level selects
    this.shadowRoot.querySelectorAll('select[data-key]').forEach(el => {
      el.addEventListener('change', () => this._update({ [el.dataset.key]: el.value }));
    });

    // Top-level number inputs
    this.shadowRoot.querySelectorAll('input[type="number"][data-key]').forEach(el => {
      el.addEventListener('change', () => this._update({ [el.dataset.key]: parseInt(el.value) }));
    });

    // Grouped number inputs
    this.shadowRoot.querySelectorAll('input[type="number"][data-group]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: parseInt(el.value) } });
      });
    });

    // Grouped text inputs
    this.shadowRoot.querySelectorAll('input[type="text"][data-group]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: el.value } });
      });
    });

    // Top-level checkboxes
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-key]').forEach(el => {
      el.addEventListener('change', () => this._update({ [el.dataset.key]: el.checked }));
    });

    // Grouped checkboxes
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-group]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: el.checked } });
      });
    });

    // Grouped selects
    this.shadowRoot.querySelectorAll('select[data-group]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: el.value } });
      });
    });

    // Style selects (applicationIcons, etc.)
    this.shadowRoot.querySelectorAll('select[data-style-key]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.value } });
      });
    });

    // Style checkboxes (performanceMode)
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-style-key]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.checked } });
        this._render();
      });
    });

    // Style number inputs
    this.shadowRoot.querySelectorAll('input[type="number"][data-style-key]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: parseFloat(el.value) } });
      });
    });

    // Style range sliders — update display live, save on input
    this.shadowRoot.querySelectorAll('input[type="range"][data-style-key]').forEach(el => {
      const key = el.dataset.styleKey;
      const unit = el.dataset.unit || '';
      const label = this.shadowRoot.querySelector(`[data-val-for="${key}"]`);
      // Stop HA card-drag from stealing pointer events on the slider track
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('mousedown',   e => e.stopPropagation());
      el.addEventListener('input', () => {
        if (label) label.textContent = el.value + unit;
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [key]: parseFloat(el.value) } });
      });
    });

    // Style color pickers — store as hex
    this.shadowRoot.querySelectorAll('input[type="color"][data-style-key]').forEach(el => {
      el.addEventListener('input', () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.value } });
      });
    });

    // Client checkboxes
    this.shadowRoot.querySelectorAll('input[data-client-toggle]').forEach(el => {
      el.addEventListener('change', () => {
        const clients = this._getClients().map(c =>
          c.id === el.dataset.clientToggle ? { ...c, enabled: el.checked } : c
        );
        this._update({ downloadClients: clients });
      });
    });

    // Client drag-and-drop
    let dragClientId = null;
    this.shadowRoot.querySelectorAll('[data-client-id]').forEach(el => {
      el.addEventListener('dragstart', e => {
        dragClientId = el.dataset.clientId;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        dragClientId = null;
      });
      el.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const toId = el.dataset.clientId;
        if (!dragClientId || dragClientId === toId) return;
        const clients = [...this._getClients()];
        const from = clients.findIndex(c => c.id === dragClientId);
        const to   = clients.findIndex(c => c.id === toId);
        if (from < 0 || to < 0) return;
        const [item] = clients.splice(from, 1);
        clients.splice(to, 0, item);
        this._update({ downloadClients: clients });
        this._render();
      });
    });

    // Category checkboxes
    this.shadowRoot.querySelectorAll('input[data-cat-toggle]').forEach(el => {
      el.addEventListener('change', () => {
        const cats = this._getCats().map(c =>
          c.id === el.dataset.catToggle ? { ...c, enabled: el.checked } : c
        );
        this._update({ categories: cats });
      });
    });

    // Category drag-and-drop
    let dragId = null;
    this.shadowRoot.querySelectorAll('.cat-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        dragId = el.dataset.catId;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        dragId = null;
      });
      el.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const toId = el.dataset.catId;
        if (!dragId || dragId === toId) return;
        const cats = [...this._getCats()];
        const from = cats.findIndex(c => c.id === dragId);
        const to   = cats.findIndex(c => c.id === toId);
        if (from < 0 || to < 0) return;
        const [item] = cats.splice(from, 1);
        cats.splice(to, 0, item);
        this._update({ categories: cats });
        this._render();
      });
    });
  }

  _renderUserMapRows() {
    const map = this._config.seerr_user_map || [{ ha: 'all_non_admin', seerr: 'family' }];
    const haUsers = this._haUsers || [];
    const seerrAccounts = this._seerrAccounts || [];
    const usedHaIds = new Set(map.filter(m => m.ha !== 'all_non_admin').map(m => m.ha));

    return map.map((m, i) => {
      const isDefault = m.ha === 'all_non_admin';
      const haOptions = isDefault
        ? '<option value="all_non_admin" selected>All non-admin users</option>'
        : haUsers
            .filter(u => !u.is_admin && (u.id === m.ha || !usedHaIds.has(u.id) || m.ha === u.id))
            .map(u => `<option value="${u.id}" ${u.id === m.ha ? 'selected' : ''}>${u.name || u.id}</option>`)
            .join('');
      const seerrOptions = seerrAccounts
        .map(a => `<option value="${a.id}" ${a.id === m.seerr ? 'selected' : ''}>${a.id === 'family' ? 'Family' : 'Guest'} (${a.email})</option>`)
        .join('');

      return `
        <div class="row" data-map-idx="${i}">
          <select data-map-ha="${i}" style="flex:1;min-width:0;padding:6px 8px;border-radius:6px;font-size:12px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color)"${isDefault ? ' disabled' : ''}>
            ${haOptions}
          </select>
          <span style="font-size:11px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0">→</span>
          <select data-map-seerr="${i}" style="flex:1;min-width:0;padding:6px 8px;border-radius:6px;font-size:12px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color)">
            ${seerrOptions}
          </select>
          ${!isDefault ? `<button data-map-del="${i}" style="border:none;background:none;cursor:pointer;font-size:16px;color:var(--error-color,#e53935);padding:2px 6px" title="Remove">×</button>` : '<span style="width:30px"></span>'}
        </div>`;
    }).join('');
  }

  async _loadUserMapData() {
    if (this._haUsers) return;
    try {
      const [haUsers, seerrAccounts] = await Promise.all([
        this._hass.callApi('GET', 'arr_stack/overseerr/ha_users'),
        this._hass.callApi('GET', 'arr_stack/overseerr/seerr_accounts'),
      ]);
      this._haUsers = haUsers || [];
      this._seerrAccounts = seerrAccounts || [];
      if (this._activeTab === 'users') this._render();
    } catch (_) {
      this._haUsers = [];
      this._seerrAccounts = [];
    }
  }

  _wireUserMap() {
    const root = this.shadowRoot;
    root.querySelectorAll('[data-map-seerr]').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.mapSeerr);
        const map = [...(this._config.seerr_user_map || [{ ha: 'all_non_admin', seerr: 'family' }])];
        if (map[idx]) map[idx] = { ...map[idx], seerr: sel.value };
        this._update({ seerr_user_map: map });
      });
    });
    root.querySelectorAll('[data-map-ha]').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.mapHa);
        const map = [...(this._config.seerr_user_map || [{ ha: 'all_non_admin', seerr: 'family' }])];
        if (map[idx]) map[idx] = { ...map[idx], ha: sel.value };
        this._update({ seerr_user_map: map });
        this._render();
      });
    });
    root.querySelectorAll('[data-map-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.mapDel);
        const map = [...(this._config.seerr_user_map || [{ ha: 'all_non_admin', seerr: 'family' }])];
        map.splice(idx, 1);
        this._update({ seerr_user_map: map });
        this._render();
      });
    });
    const addBtn = root.querySelector('.user-map-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const map = [...(this._config.seerr_user_map || [{ ha: 'all_non_admin', seerr: 'family' }])];
        const haUsers = this._haUsers || [];
        const usedIds = new Set(map.map(m => m.ha));
        const available = haUsers.find(u => !u.is_admin && !usedIds.has(u.id));
        if (!available) return;
        const defaultSeerr = (this._seerrAccounts || [])[0]?.id || 'family';
        map.push({ ha: available.id, seerr: defaultSeerr });
        this._update({ seerr_user_map: map });
        this._render();
      });
    }
  }

  _update(patch) {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define('arr-stack-card-editor', ArrStackCardEditor);
