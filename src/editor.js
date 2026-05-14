// Arr Stack Card — Visual Editor
class ArrStackCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
          <div class="bmc-title">Buy me a coffee ☕</div>
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
            <option value="cs" ${this._val('localisation','cs')==='cs'?'selected':''}>Czech</option>
            <option value="en" ${this._val('localisation','cs')==='en'?'selected':''}>English</option>
          </select>
        </div>
        <div class="row">
          <span class="row-label">Layout</span>
          <select data-key="layout">
            <option value="both"  ${this._val('layout','both')==='both' ?'selected':''}>Both panels</option>
            <option value="left"  ${this._val('layout','both')==='left' ?'selected':''}>Downloads only</option>
            <option value="right" ${this._val('layout','both')==='right'?'selected':''}>Media only</option>
          </select>
        </div>
        <div class="row">
          <span class="row-label">Sticky nav offset (px)</span>
          <input type="number" data-key="sticky_nav_offset" value="${this._val('sticky_nav_offset', 100)}" min="0" max="500" step="10"/>
        </div>
      </div>

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
      </div>

      <!-- Discover -->
      <div class="section">
        <div class="section-title">Discover</div>
        <div class="row">
          <span class="row-label">Categories per page</span>
          <input type="number" data-group="discover" data-key="categoriesCount" value="${this._cfg('discover','categoriesCount',3)}" min="1" max="10"/>
        </div>
        <div class="row">
          <span class="row-label">Show More card on page</span>
          <input type="number" data-group="discover" data-key="showMoreOnPage" value="${this._cfg('discover','showMoreOnPage',3)}" min="1" max="50"/>
        </div>
        <div class="hint">Insert a "See More" card as the last slot on this page. Opens full-section overlay. Default: 3.</div>
        <div class="row">
          <span class="row-label">One-click movie request</span>
          <label class="toggle">
            <input type="checkbox" data-group="discover" data-key="oneClickMovieRequest" ${this._cfg('discover','oneClickMovieRequest',false)?'checked':''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">Skip profile dialog — use default quality profile immediately.</div>
      </div>

      <!-- Right Panel -->
      <div class="section">
        <div class="section-title">Right Panel — Categories</div>
        <div class="hint" style="margin-bottom:8px">Drag to reorder · toggle to show/hide.</div>
        <div class="cat-list">
          ${this._getCats().map(c => `
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

      <!-- Appearance -->
      <div class="section">
        <div class="section-title">Appearance</div>
        <div class="row">
          <span class="row-label">Performance mode</span>
          <label class="toggle">
            <input type="checkbox" data-style-key="performanceMode" ${perfMode?'checked':''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="hint">Disables backdrop blur — improves performance on low-end devices.</div>

        ${this._colorRow('Card background',   'cardBackground',    '#121216', 'opacity 90% — perf mode only')}
      </div>
    `;

    this._wireEvents();
  }

  _defaultCats() {
    return [
      { id: 'radarr',     enabled: true },
      { id: 'sonarr',     enabled: true },
      { id: 'upcoming',   enabled: true },
      { id: 'tvUpcoming', enabled: true },
      { id: 'trending',   enabled: true },
      { id: 'popular',    enabled: true },
      { id: 'calendar',   enabled: true },
    ];
  }

  _getCats() {
    return this._config?.categories || this._defaultCats();
  }

  _catLabel(id) {
    return {
      radarr:     'Movies (Radarr)',
      sonarr:     'TV Shows (Sonarr)',
      upcoming:   'Movie Requests',
      tvUpcoming: 'TV Requests',
      trending:   'Trending',
      popular:    'Popular',
      calendar:   'Calendar',
    }[id] || id;
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

    // Grouped checkboxes
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-group]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config[el.dataset.group] || {};
        this._update({ [el.dataset.group]: { ...existing, [el.dataset.key]: el.checked } });
      });
    });

    // Style checkboxes (performanceMode)
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-style-key]').forEach(el => {
      el.addEventListener('change', () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.checked } });
        // Re-render so cardBackground row shows/hides perf hint live
        this._render();
      });
    });

    // Style color pickers — store as hex
    this.shadowRoot.querySelectorAll('input[type="color"][data-style-key]').forEach(el => {
      el.addEventListener('input', () => {
        const existing = this._config.styles || {};
        this._update({ styles: { ...existing, [el.dataset.styleKey]: el.value } });
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

  _update(patch) {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define('arr-stack-card-editor', ArrStackCardEditor);
