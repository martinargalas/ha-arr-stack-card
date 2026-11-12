// Arr Stack Card — Visual Editor
import { stylesTabHtml, wireStylesTab, STYLES_TAB_CSS } from './editor-styles.js';

// The editors' own look: the card's editor and the search header's share it
const EDITOR_CSS = `
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
        /* The tabs are wider than the dialog on most screens. They scroll on
           their own, so dragging them no longer shifts the whole editor. */
        :host { overflow-x: hidden; }
        .tabs {
          display: flex; gap: 0; margin-bottom: 16px;
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
          overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab { flex-shrink: 0; }
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
        /* Same width as the fields in the Styles tab: its control column less
           the suffix and reset slots. They end at the edge, with the toggles. */
        .row select, .row input[type="number"], .row > input[type="text"] {
          width: calc(var(--st-ctl-w) - 62px); flex-shrink: 0;
          height: 30px; box-sizing: border-box; padding: 0 8px; border-radius: 6px; font: inherit; font-size: 12px;
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
`;

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
      const hasDownloads = this._caps.qbit || this._caps.sabnzbd || this._caps.nzbget || this._caps.deluge || this._caps.rtorrent || this._caps.transmission;
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
    // Home Assistant hands back every config this editor sends. Redrawing on
    // our own change would take the focus out of the field being typed in and
    // fold the open style groups, so that one is only stored.
    if (this._sent && JSON.stringify(config) === this._sent) { this._config = config; return; }
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
    // Styles had a tab of its own for a while
    if (this._activeTab === 'styles') this._activeTab = 'appearance';
    const tab = this._activeTab;
    // The floating page buttons (Sticky nav offset) live only in the Pages layout
    const pagesNav = this._cfg('discover', 'mobileLayout', 'pages') === 'pages' || this._cfg('discover', 'tabletLayout', 'pages') === 'pages';
    // One-click's own settings show while it is on (the old movie-only key counts)
    // The panels' groups fold like the Appearance tab's; the first of each starts open
    this._rpOpen = this._rpOpen || new Set(['rp.layout', 'lp.downloads']);
    const oneClick = !!(this._cfg('discover','oneClickRequest',false) || this._cfg('discover','oneClickMovieRequest',false));

    this.shadowRoot.innerHTML = `
      <style>
${EDITOR_CSS}
        ${STYLES_TAB_CSS}
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
          ${(this._caps?.qbit || this._caps?.sabnzbd || this._caps?.nzbget || this._caps?.deluge || this._caps?.rtorrent || this._caps?.transmission || this._caps === null) ? `
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
          ${this._val('swap_sides', false) && pagesNav ? `<div class="hint">Media panel is taller — set Sticky nav offset to ~2000 for the nav to appear immediately on mobile.</div>` : ''}` : ''}
          ${pagesNav ? `<div class="row">
            <span class="row-label">Sticky nav offset (px)</span>
            <input type="number" data-key="sticky_nav_offset" value="${this._val('sticky_nav_offset', 100)}" min="0" max="500" step="10"/>
          </div>
          <div class="hint">On a phone or tablet, how early the media's page buttons float in as you scroll down to them. Only with the Pages layout (Media → Discover).</div>` : ''}
          <div class="row">
            <span class="row-label">Space above bottom dock (px)</span>
            <input type="number" data-key="dock_offset" value="${this._val('dock_offset', 0)}" min="-300" max="300" step="4"/>
          </div>
          <div class="hint">Phone only. In the details of a film, a series or an artist, the window of posters or albums you drag up from the bottom stays above a Bubble Card or glass-cards dock. This moves where it rests folded: a positive number higher, a negative one lower. Dragged up a row, a whole row always shows above the dock. With a dock the card doesn't recognise, a positive number keeps this much clear at the bottom of the screen.</div>
        </div>
      </div>

      <!-- ═══ TAB: Left Panel ═══ -->
      <div class="tab-content${tab === 'left' ? ' active' : ''}" data-tab-content="left">

        <!-- Downloads -->
        <details class="st-group" data-st-group="lp.downloads"${this._rpOpen.has('lp.downloads') ? ' open' : ''}>
          <summary>Downloads</summary><div class="st-body">
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
        </div></details>

        <details class="st-group" data-st-group="lp.cards"${this._rpOpen.has('lp.cards') ? ' open' : ''}>
          <summary>Cards</summary><div class="st-body">
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
          </div>
          <div class="hint">The summary cards above the downloads.</div>
        </div></details>

        <details class="st-group" data-st-group="lp.row"${this._rpOpen.has('lp.row') ? ' open' : ''}>
          <summary>Download row</summary><div class="st-body">
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
          </div>
          ${(this._caps?.qbit2 || this._caps?.sabnzbd2) ? `
          <div class="row">
            <span class="row-label">Instance label</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowInstance" ${this._cfg('downloads','rowInstance',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>` : ''}
          <div class="hint">What each download row shows. The first pill always stays — it carries the state, so Stalled, Paused, Complete and errors remain visible. Upload speed and Peers apply to torrent clients only.${(this._caps?.qbit2 || this._caps?.sabnzbd2) ? ' Instance label is the 1 or 2 on each row while both of a client\'s instances are shown.' : ''}</div>
        </div></details>

        <!-- Download Clients -->
        ${(() => {
          const caps   = this._caps;
          const allClients = this._getClients().filter(c => {
            if (caps === null) return true;
            if (c.id === 'qbit'     && !caps?.qbit)      return false;
            if (c.id === 'deluge'   && !caps?.deluge)     return false;
            if (c.id === 'rtorrent' && !caps?.rtorrent)   return false;
            if (c.id === 'transmission' && !caps?.transmission) return false;
            if (c.id === 'sab'      && !caps?.sabnzbd)    return false;
            if (c.id === 'nzbget'   && !caps?.nzbget)     return false;
            return true;
          });
          const torrentIds = ['qbit', 'deluge', 'rtorrent', 'transmission'];
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
        <details class="st-group" data-st-group="lp.clients"${this._rpOpen.has('lp.clients') ? ' open' : ''}>
          <summary>Download clients</summary><div class="st-body">
          <div class="hint" style="margin-bottom:8px">Drag to reorder · toggle to show/hide. Only configured clients are shown.</div>
          ${renderGroup('Torrent', torrentClients)}
          ${renderGroup('Usenet', usenetClients)}
        </div></details>`;
        })()}

        <!-- Storage -->
        <details class="st-group" data-st-group="lp.storage"${this._rpOpen.has('lp.storage') ? ' open' : ''}>
          <summary>Storage</summary><div class="st-body">
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
        </div></details>
      </div>

      <!-- ═══ TAB: Right Panel ═══ -->
      <div class="tab-content${tab === 'right' ? ' active' : ''}" data-tab-content="right">

        <!-- Layout: the page of categories. The three numbers count for the
             Pages layout; Shelves and List flow the categories instead -->
        <details class="st-group" data-st-group="rp.layout"${this._rpOpen.has('rp.layout') ? ' open' : ''}>
          <summary>Layout</summary><div class="st-body">
          <div class="row">
            <span class="row-label">Rows on a page</span>
            <input type="number" data-group="discover" data-key="categoriesCount" value="${this._cfg('discover','categoriesCount',3)}" min="2" max="10"/>
          </div>
          <div class="hint">Categories shown at once, the search field counting as one of them. A phone set to Shelves or List scrolls instead and leaves this aside.</div>
          <div class="row">
            <span class="row-label">Posters in a row</span>
            <input type="number" data-group="discover" data-key="itemsPerCategory" value="${this._cfg('discover','itemsPerCategory',4)}" min="2" max="10"/>
          </div>
          <div class="hint">Also the columns of the search results and of See More, except on a phone. Pages layout only: a shelf holds up to 20 posters you swipe through.</div>
          <div class="row">
            <span class="row-label">See More on page</span>
            <input type="number" data-group="discover" data-key="showMoreOnPage" value="${this._cfg('discover','showMoreOnPage',3)}" min="1" max="50"/>
          </div>
          <div class="hint">On this page of a category its last poster becomes See More, which opens the whole category. Pages layout only: a shelf always ends with it.</div>
        </div></details>

        <!-- Phone and tablet -->
        <details class="st-group" data-st-group="rp.devices"${this._rpOpen.has('rp.devices') ? ' open' : ''}>
          <summary>Phone and tablet</summary><div class="st-body">
          <div class="row">
            <span class="row-label">Layout on a phone</span>
            <select data-group="discover" data-key="mobileLayout">
              <option value="pages" ${this._cfg('discover','mobileLayout','pages')==='pages'?'selected':''}>Pages</option>
              <option value="shelves" ${this._cfg('discover','mobileLayout','pages')==='shelves'?'selected':''}>Shelves</option>
              <option value="list" ${this._cfg('discover','mobileLayout','pages')==='list'?'selected':''}>List</option>
            </select>
          </div>
          <div class="row">
            <span class="row-label">Layout on a tablet</span>
            <select data-group="discover" data-key="tabletLayout">
              <option value="pages" ${this._cfg('discover','tabletLayout','pages')==='pages'?'selected':''}>Pages</option>
              <option value="shelves" ${this._cfg('discover','tabletLayout','pages')==='shelves'?'selected':''}>Shelves</option>
              <option value="list" ${this._cfg('discover','tabletLayout','pages')==='list'?'selected':''}>List</option>
            </select>
          </div>
          <div class="hint">Pages turns a few categories at a time. Shelves shows every category, each a row you swipe sideways. List folds them to their titles; tap one to open it.</div>
          <div class="row">
            <span class="row-label">Posters per row on a phone</span>
            <select data-group="discover" data-key="mobileColumns">
              <option value="3" ${String(this._cfg('discover','mobileColumns','3'))==='3'?'selected':''}>3</option>
              <option value="2" ${String(this._cfg('discover','mobileColumns','3'))==='2'?'selected':''}>2</option>
            </select>
          </div>
          <div class="row">
            <span class="row-label">Posters per row on a tablet</span>
            <select data-group="discover" data-key="tabletColumns">
              <option value="0" ${String(this._cfg('discover','tabletColumns','0'))==='0'?'selected':''}>Auto</option>
              <option value="3" ${String(this._cfg('discover','tabletColumns','0'))==='3'?'selected':''}>3</option>
              <option value="4" ${String(this._cfg('discover','tabletColumns','0'))==='4'?'selected':''}>4</option>
              <option value="5" ${String(this._cfg('discover','tabletColumns','0'))==='5'?'selected':''}>5</option>
              <option value="6" ${String(this._cfg('discover','tabletColumns','0'))==='6'?'selected':''}>6</option>
            </select>
          </div>
          <div class="hint">For the lists that fill the screen, in every layout: See More, a category opened from List and, on a phone, the search, Library and Maintainerr. Auto fits as many as the tablet's width takes.</div>
          <div class="row">
            <span class="row-label">Fade under a bottom bar</span>
            <label class="toggle"><input type="checkbox" data-group="discover" data-key="dockFade" ${this._cfg('discover','dockFade',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">With a bar fixed along the bottom of the screen (Bubble Card's buttons), lists, covers and trailers fade out under it, and by day a light band stays there. Turn it off for an opaque bar, which hides what runs under it anyway.</div>
        </div></details>

        <!-- Search -->
        <details class="st-group" data-st-group="rp.search"${this._rpOpen.has('rp.search') ? ' open' : ''}>
          <summary>Search</summary><div class="st-body">
          <div class="row">
            <span class="row-label">Show search field</span>
            <label class="toggle"><input type="checkbox" data-group="discover" data-key="showSearch" ${this._cfg('discover','showSearch',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Off gives its place to one more category, for a static or e-ink dashboard.</div>
          <div class="row">
            <span class="row-label">Search in a pop-up header</span>
            <label class="toggle"><input type="checkbox" data-key="search_in_header" ${this._config.search_in_header ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">For a card in a pop-up (Bubble Card with its header hidden, or any header that takes cards): put an <b>Arr Stack Search</b> card in that header and the field moves there. Until one is on the page, the field stays in the card.</div>
          ${this._config.search_in_header ? `<div class="row">
            <span class="row-label">Link name</span>
            <input type="text" data-text-key="search_link" value="${String(this._config.search_link || '').replace(/"/g, '&quot;')}" placeholder="optional"/>
          </div>
          <div class="hint">Leave empty with one such card on the page. With two or more (say a Movies and a Kids pop-up, each with its own header), type any word here, e.g. <code>kids</code>, and the same word in <b>Link name</b> of the Arr Stack Search card in that pop-up. Without it, every header searches the first card.</div>` : `<div class="row">
            <span class="row-label">Header on a phone</span>
            <label class="toggle"><input type="checkbox" data-key="phone_header" ${this._config.phone_header ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Phone only. The search field becomes a header held at the top of the screen. A window opened from the card takes it over: its tabs and buttons go up into it and a back arrow closes it.</div>`}
        </div></details>

        ${(this._caps?.trakt || this._caps?.suggestarr) ? `
        <!-- Recommendations -->
        <details class="st-group" data-st-group="rp.recs"${this._rpOpen.has('rp.recs') ? ' open' : ''}>
          <summary>Recommendations</summary><div class="st-body">
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
          <div class="hint">What the Recommendations row draws on. With both on, they take turns so neither fills the row. Music from Last.fm joins in whenever Lidarr is set up; the row's own filter switches it off.</div>
        </div></details>` : ''}

        <!-- Requests -->
        <details class="st-group" data-st-group="rp.requests"${this._rpOpen.has('rp.requests') ? ' open' : ''}>
          <summary>Requests</summary><div class="st-body">
          ${this._caps?.overseerr ? `
          <div class="row">
            <span class="row-label">Recently Requested shows</span>
            <select data-group="discover" data-key="requestedSource">
              <option value="both" ${this._cfg('discover','requestedSource','both')==='both'?'selected':''}>Seerr + card</option>
              <option value="seerr" ${this._cfg('discover','requestedSource','both')==='seerr'?'selected':''}>Seerr only</option>
              <option value="library" ${this._cfg('discover','requestedSource','both')==='library'?'selected':''}>Library</option>
            </select>
          </div>
          <div class="hint">Seerr + card: your Seerr requests, what you asked for through the card and anything downloading now. Seerr only: exactly your Seerr request list. Library: every monitored title without a file, whatever added it.</div>` : ''}
          <div class="row">
            <span class="row-label">One-click request</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="oneClickRequest" ${oneClick?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Requests a movie or show at once, without the profile dialog.</div>
          ${oneClick ? `
          <div class="sub-group">
            <div class="row">
              <span class="row-label">Only for non-admins</span>
              <label class="toggle">
                <input type="checkbox" data-group="discover" data-key="oneClickNonAdminOnly" ${this._cfg('discover','oneClickNonAdminOnly',false)?'checked':''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="hint">Admins keep the dialog.</div>
            <div class="row">
              <span class="row-label">Seasons of a show</span>
              <select data-group="discover" data-key="oneClickTvSeasonMode">
                <option value="first" ${this._cfg('discover','oneClickTvSeasonMode','first') === 'first' ? 'selected' : ''}>First season</option>
                <option value="latest" ${this._cfg('discover','oneClickTvSeasonMode','first') === 'latest' ? 'selected' : ''}>Latest season</option>
                <option value="all" ${this._cfg('discover','oneClickTvSeasonMode','first') === 'all' ? 'selected' : ''}>All seasons</option>
              </select>
            </div>
            <div class="row">
              <span class="row-label">Movie profile</span>
              <input type="text" data-group="discover" data-key="oneClickDefaultMovieProfile" value="${this._cfg('discover','oneClickDefaultMovieProfile','')}" placeholder="e.g. HD-1080p"/>
            </div>
            <div class="row">
              <span class="row-label">Show profile</span>
              <input type="text" data-group="discover" data-key="oneClickDefaultShowProfile" value="${this._cfg('discover','oneClickDefaultShowProfile','')}" placeholder="e.g. HD-1080p"/>
            </div>
            <div class="hint">A quality profile's name as Radarr and Sonarr show it (Settings → Profiles). Empty uses their default.</div>
          </div>` : ''}
        </div></details>

        <!-- Posters -->
        <details class="st-group" data-st-group="rp.posters"${this._rpOpen.has('rp.posters') ? ' open' : ''}>
          <summary>Posters</summary><div class="st-body">
          <div class="row">
            <span class="row-label">Show title</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showTitle" ${this._cfg('posters','showTitle',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show media type tag</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showMediaType" ${this._cfg('posters','showMediaType',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">A Movie or TV label in the top-left corner.</div>
          <div class="row">
            <span class="row-label">Show rating</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showRating" ${this._cfg('posters','showRating',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Rating provider</span>
            <select data-group="posters" data-key="ratingProvider">
              <option value="imdb" ${this._cfg('posters','ratingProvider',this._cfg('discover','ratingProvider','imdb'))==='imdb'?'selected':''}>IMDb</option>
              <option value="tmdb" ${this._cfg('posters','ratingProvider',this._cfg('discover','ratingProvider','imdb'))==='tmdb'?'selected':''}>TMDB</option>
            </select>
          </div>
          <div class="hint">A title IMDb has no score for shows TMDB's, then TheTVDB's.</div>
          <div class="row">
            <span class="row-label">Show audio languages</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showAudio" ${this._cfg('posters','showAudio',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show subtitles</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showSubtitles" ${this._cfg('posters','showSubtitles',true) !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Language display</span>
            <select data-group="posters" data-key="langDisplay">
              <option value="flags" ${this._cfg('posters','langDisplay','flags')==='flags'?'selected':''}>Combined — flags</option>
              <option value="tags" ${this._cfg('posters','langDisplay','flags')==='tags'?'selected':''}>Separate tags</option>
            </select>
          </div>
          <div class="hint">Combined puts subtitle flags (left), the rating and audio flags (right) in one strip. Separate keeps rating, audio and subtitles as tags of their own. The two switches above hide audio or subtitles in either mode.</div>
          <div class="row">
            <span class="row-label">Status display</span>
            <select data-group="posters" data-key="statusDisplay">
              <option value="tags" ${this._cfg('posters','statusDisplay','tags')==='tags'?'selected':''}>Tags</option>
              <option value="stripes" ${this._cfg('posters','statusDisplay','tags')==='stripes'?'selected':''}>Stripes</option>
              <option value="both" ${this._cfg('posters','statusDisplay','tags')==='both'?'selected':''}>Both</option>
            </select>
          </div>
          <div class="hint">Tags are status badges on the poster. Stripes are a coloured bar along its bottom with the download progress.</div>
          ${(this._caps === null || this._caps?.maintainerr) ? `
          <div class="row">
            <span class="row-label">Deletion tag</span>
            <select data-group="posters" data-key="goneTag">
              <option value="all" ${this._cfg('posters','goneTag','all')==='all'?'selected':''}>All categories</option>
              <option value="maintainerr" ${this._cfg('posters','goneTag','all')==='maintainerr'?'selected':''}>Maintainerr only</option>
              <option value="off" ${this._cfg('posters','goneTag','all')==='off'?'selected':''}>Never</option>
            </select>
          </div>
          <div class="hint">A "Gone in…" tag on titles Maintainerr has queued for deletion.</div>` : ''}
        </div></details>

        <!-- Now Playing -->
        <details class="st-group" data-st-group="rp.streams"${this._rpOpen.has('rp.streams') ? ' open' : ''}>
          <summary>Now Playing</summary><div class="st-body">
          <div class="row">
            <span class="row-label">Show playback details</span>
            <label class="toggle"><input type="checkbox" data-group="streams" data-key="showTechInfo" ${this._cfg('streams','showTechInfo',false) ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Adds a line to each stream: the source, Direct Play / Direct Stream / Transcode, what reaches the player and the bitrate, e.g. 1080p › Transcode › 720p · 4.0 Mbps. Plex, Jellyfin and Emby only.</div>
        </div></details>

        <!-- Categories -->
        <details class="st-group" data-st-group="rp.categories"${this._rpOpen.has('rp.categories') ? ' open' : ''}>
          <summary>Categories</summary><div class="st-body">
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
        </div></details>
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

      <!-- ═══ TAB: Appearance — general settings, then the design tokens (#42) ═══ -->
      <div class="tab-content${tab === 'appearance' ? ' active' : ''}" data-tab-content="appearance">
        ${stylesTabHtml(this, `          <div class="row">
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
            <span class="row-label">Category colour overlays</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="categoryOverlays" ${this._styleVal('categoryOverlays', true) !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Show brand-colour background tint behind each section's content.</div>

          <div class="row">
            <span class="row-label">Window colour overlays</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="modalOverlays" ${this._styleVal('modalOverlays', true) !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Show the app's colours at the top of its windows: Activity, Library, the calendar, the statistics, Prowlarr, Maintainerr and the full-screen category windows.</div>

          ${this._numberRow('UI scale', 'uiScale', 1, 0.5, 3, 0.05, '0.5–3')}
          <div class="hint">Scale all card content proportionally. Use values above 1 on large screens or TVs where the default text is too small. Reduce columns (Items per category) if content overflows.</div>

          ${this._numberRow('Left panel width', 'leftPanelWidth', 40, 10, 90, 1, '10–90 %')}
          <div class="hint">Width of the downloads panel as a percentage of the card. Default is 40 %. Has no effect when the downloads panel is hidden or on mobile.</div>
`)}
      </div>
    `;

    this._wireEvents();
    wireStylesTab(this, this.shadowRoot.querySelector('[data-tab-content="appearance"]'));
    this.shadowRoot.querySelectorAll('[data-tab-content="left"] details[data-st-group], [data-tab-content="right"] details[data-st-group]').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) this._rpOpen.add(d.dataset.stGroup); else this._rpOpen.delete(d.dataset.stGroup);
    }));
    // A redraw would start the tab strip from the left again; only ever
    // scroll it sideways — scrollIntoView would move the dialog too.
    const tabs = this.shadowRoot.querySelector('.tabs');
    if (tabs) {
      tabs.scrollLeft = this._tabsScroll || 0;
      tabs.addEventListener('scroll', () => { this._tabsScroll = tabs.scrollLeft; }, { passive: true });
    }
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
      { id: 'transmission', enabled: true },
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
    return { qbit: 'qBittorrent', sab: 'SABnzbd', nzbget: 'NZBGet', deluge: 'Deluge', rtorrent: 'rTorrent', transmission: 'Transmission' }[id] || id;
  }

  _numberRow(label, key, defaultVal, min, max, step, hint) {
    const stored = this._styleVal(key, null);
    const val = stored != null ? stored : defaultVal;
    return `
      <div class="row">
        <span class="row-label">${label}</span>
        ${hint ? `<span class="color-alpha">${hint}</span>` : ''}
        <input type="number" data-style-key="${key}" value="${val}" min="${min}" max="${max}" step="${step}" style="text-align:right"/>
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
        const strip = btn.parentElement;
        const left = btn.offsetLeft - (strip.clientWidth - btn.offsetWidth) / 2;
        strip.scrollTo?.({ left: Math.max(0, left), behavior: 'smooth' });
        this.shadowRoot.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this._activeTab));
        this.shadowRoot.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === this._activeTab));
        if (this._activeTab === 'users') this._loadUserMapData();
      });
    });

    // Top-level selects
    this.shadowRoot.querySelectorAll('select[data-key]:not([data-group])').forEach(el => {
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

    // The search header's switch shows or hides its Link field
    this.shadowRoot.querySelector('input[data-key="search_in_header"]')?.addEventListener('change', () => this._render());
    // One-click shows or hides its own settings — after the grouped handler
    // further down has saved the switch
    this.shadowRoot.querySelector('input[data-key="oneClickRequest"]')?.addEventListener('change', () => queueMicrotask(() => this._render()));
    // Top-level text fields; an emptied one leaves the config
    this.shadowRoot.querySelectorAll('input[type="text"][data-text-key]').forEach(el => {
      el.addEventListener('change', () => {
        const v = el.value.trim();
        const next = { ...this._config };
        if (v) next[el.dataset.textKey] = v; else delete next[el.dataset.textKey];
        this._config = next;
        this._update({});
      });
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
    this._sent = JSON.stringify(this._config);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define('arr-stack-card-editor', ArrStackCardEditor);

// The search header's editor: what it shows, which card it searches for, and
// the Styles tab the card has — empty, it wears the card's look.
class ArrStackSearchEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._activeTab = 'general';
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    config = config || {};
    if (this._sent && JSON.stringify(config) === this._sent) { this._config = config; return; }
    this._config = config;
    this._render();
  }

  _update(patch) {
    const next = { ...this._config, ...patch };
    for (const [k, v] of Object.entries(next)) if (v === undefined || v === '') delete next[k];
    this._config = next;
    this._sent = JSON.stringify(this._config);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _render() {
    const c = this._config;
    const tab = this._activeTab;
    const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const text = (key, label, ph = '') => `<div class="row"><span class="row-label">${label}</span>
      <input type="text" data-sk="${key}" value="${esc(c[key])}" placeholder="${ph}" style="width:180px"/></div>`;
    const toggle = (key, label, on) => `<div class="row"><span class="row-label">${label}</span>
      <label class="toggle"><input type="checkbox" data-sb="${key}" ${on ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`;
    const general = `
      <div class="section">
        ${toggle('header', 'Pop-up header', !!c.header)}
        <div class="hint">On: a whole header — icon, the field and a close button. For a Bubble Card pop-up with <code>show_header: false</code>, as its first card. Off: the field alone, for a header that brings its own.</div>
        ${c.header ? text('icon', 'Icon', 'mdi:movie-play-outline')
          + toggle('close', 'Close button', c.close !== false)
          + '<div class="hint">Closes the pop-up, as its own header did.</div>' : ''}
        ${toggle('bare', 'No background', c.background === 'none')}
        <div class="hint">For a header that draws its own surface: only the field and buttons are left.</div>
        ${text('link', 'Link name', 'optional')}
        <div class="hint">Searches for the Arr Stack Card on the page that has <b>Search in a pop-up header</b> on. Leave empty with one such card. With two or more, type the same word here and in that card's <b>Link name</b> (Right Panel → Search), e.g. <code>kids</code>.</div>
      </div>`;
    this.shadowRoot.innerHTML = `
      <style>
${EDITOR_CSS}
        ${STYLES_TAB_CSS}
      </style>
      <div class="tabs">
        <button class="tab${tab === 'general' ? ' active' : ''}" data-tab="general">General</button>
        <button class="tab${tab === 'appearance' ? ' active' : ''}" data-tab="appearance">Appearance</button>
      </div>
      ${tab === 'general' ? general : `<div class="hint" style="margin:0 0 12px">Left empty, the header looks like the card it searches for — its preset and colours. What you set here is laid over that.</div>${stylesTabHtml(this)}`}`;

    this.shadowRoot.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      this._activeTab = b.dataset.tab;
      this._render();
    }));
    this.shadowRoot.querySelectorAll('input[data-sk]').forEach(el => el.addEventListener('change', () => this._update({ [el.dataset.sk]: el.value.trim() })));
    this.shadowRoot.querySelectorAll('input[data-sb]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.sb;
      if (k === 'bare') this._update({ background: el.checked ? 'none' : undefined });
      else if (k === 'close') this._update({ close: el.checked ? undefined : false });
      else this._update({ [k]: el.checked || undefined });
      this._render();
    }));
    if (tab === 'appearance') wireStylesTab(this, this.shadowRoot);
  }
}

customElements.define('arr-stack-search-editor', ArrStackSearchEditor);
