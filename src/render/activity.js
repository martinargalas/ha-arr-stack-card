// ──────────────────────────────────────────────────────────────────────────
// Activity — Queue / History / Blocklist cards + modal
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass, isMobile } from '../shared/ui.js';

class _ActivityRenderMethods {

  // One capsule per tab: search, the pickers, then Columns — Columns is a
  // dropdown in all but name, so it belongs in the bar with the rest. A phone
  // gets a second bar for the pickers; three of them plus a search field on one
  // row would leave nothing to type in.
  // A phone has no room for worded pickers, so each one shows the glyph of what
  // it filters. Muted while it is on "all", blue once it actually filters —
  // otherwise a row of icons says nothing about what is set.
  _actFilterIcon(kind) {
    const F = 'viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"';
    const I = {
      source:    `<svg ${F}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>`,
      status:    `<svg ${F}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      quality:   `<svg ${F}><polygon points="12 2 15 9 22 9.3 16.5 13.8 18.4 21 12 17 5.6 21 7.5 13.8 2 9.3 9 9"/></svg>`,
      protocol:  `<svg ${F}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>`,
      indexer:   `<svg ${F}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg>`,
      client:    `<svg ${F}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      event:     `<svg ${F}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`,
      langs:     `<svg ${F}><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>`,
      formats:   `<svg ${F}><path d="M20.6 13.4 12 22l-9-9V3h10z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>`,
      relgroup:  `<svg ${F}><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></svg>`,
      profile:   `<svg ${F}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
      monitored: `<svg ${F}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
      filter:    `<svg ${F}><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5"/></svg>`,
      sort:      `<svg ${F}><polyline points="7 4 7 20"/><polyline points="4 17 7 20 10 17"/><polyline points="17 20 17 4"/><polyline points="14 7 17 4 20 7"/></svg>`,
    };
    return I[kind] || I.status;
  }

  _actIconSelect(sel) {
    const cur = String(sel.value ?? '');
    const active = cur && cur !== 'all';
    const label = sel.items.find(([v]) => String(v) === cur)?.[1] || '';
    const opts = sel.items.map(([v, l]) =>
      `<option value="${this._escHtml(String(v))}"${String(v) === cur ? ' selected' : ''}>${this._escHtml(l)}</option>`).join('');
    const chev = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<span class="mt-tb-sel mt-tb-sel--ico${active ? ' is-active' : ''}" title="${this._escHtml(label)}">
      ${this._actFilterIcon(sel.kind)}${chev}
      <select id="${sel.id}">${opts}</select>
    </span>`;
  }

  _actBar(searchId, searchVal, sels, colsBtnId) {
    const colsSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`;
    const bar = this._uiBar(searchId, searchVal, sels,
      colsBtnId ? [{ id: colsBtnId, label: this._t('actColumns'), icon: colsSvg }] : []);
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-shrink:0">${bar}</div>`;
  }

  // ── Right-panel card row ─────────────────────────────────────────────────

  _renderActivity() {
    const rItems   = this._radarrQueueItems  || [];
    const r2Items  = this._radarr2QueueItems || [];
    const snPct    = this._sonarrQueueSeriesPct  || new Map();
    const sn2Pct   = this._sonarr2QueueSeriesPct || new Map();
    const liPct    = this._lidarrQueueArtists || new Map();
    const totalFailed = rItems.filter(x => x.failed).length + r2Items.filter(x => x.failed).length;
    const totalActive = rItems.filter(x => !x.failed).length + r2Items.filter(x => !x.failed).length
      + snPct.size + sn2Pct.size + liPct.size;

    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('radarr', 25, 75, 0.23)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIconRow(['radarr', 'sonarr', 'lidarr'])}
          <span class="col-hdr-title">${this._t('actActivityQueue')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._actQueueCard(totalActive, totalFailed)}
            ${this._actHistoryCard()}
            ${this._actBlocklistCard()}
            ${this._actMissingCard()}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _actQueueCard(totalActive, totalFailed) {
    // Build preview rows — radarr/radarr2 from enriched items, sonarr/sonarr2 from seriesPct+library
    const rItems     = this._radarrQueueItems   || [];
    const r2Items    = this._radarr2QueueItems  || [];
    const snSeries   = this._sonarr   || [];
    const snPct      = this._sonarrQueueSeriesPct   || new Map();
    const snFirstEp  = this._sonarrQueueFirstEp     || new Map();
    const sn2Series  = this._sonarr2  || [];
    const sn2Pct     = this._sonarr2QueueSeriesPct  || new Map();
    const sn2FirstEp = this._sonarr2QueueFirstEp    || new Map();

    const rows = [];
    const maxRows = this._actCardMax('queue');
    // Render all available items (trimmer hides overflow and calibrates the limit).
    // Hard cap at 20 to avoid massive DOMs when queue is very long.
    const CAP = Math.max(maxRows + 3, 20);
    for (const item of [...rItems, ...r2Items]) {
      if (rows.length >= CAP) break;
      rows.push({ title: item.title, type: 'movie', failed: item.failed, pct: item.pct, sub: null });
    }
    for (const [sid, pct] of snPct) {
      if (rows.length >= CAP) break;
      const s  = snSeries.find(x => x.id === sid);
      const ep = snFirstEp.get(sid);
      const sub = ep
        ? `S${String(ep.season).padStart(2,'0')}E${String(ep.episode).padStart(2,'0')}${ep.count > 1 ? ` +${ep.count - 1}` : ''}`
        : 'Show';
      if (s) rows.push({ title: s.title || '—', type: 'show', failed: false, pct, sub });
    }
    for (const [sid, pct] of sn2Pct) {
      if (rows.length >= CAP) break;
      const s  = sn2Series.find(x => x.id === sid);
      const ep = sn2FirstEp.get(sid);
      const sub = ep
        ? `S${String(ep.season).padStart(2,'0')}E${String(ep.episode).padStart(2,'0')}${ep.count > 1 ? ` +${ep.count - 1}` : ''}`
        : 'Show';
      if (s) rows.push({ title: s.title || '—', type: 'show', failed: false, pct, sub });
    }

    for (const [aid, pct] of (this._lidarrQueueArtists || new Map())) {
      if (rows.length >= CAP) break;
      const a = this._lidarrArtists?.get(aid);
      if (!a) continue;
      rows.push({
        title: a.artistName || '—', type: 'music', failed: false,
        pct: pct >= 0 ? pct : 0, sub: this._t('typeArtist'),
      });
    }

    const badge = totalFailed > 0
      ? this._uiBadge(`${totalFailed} ${this._t('actFailed')}`, 'amber', { extra: 'flex-shrink:0', white: true })
      : totalActive > 0
        ? this._uiBadge(`${totalActive} ${this._t('tlActive')}`, 'green', { extra: 'flex-shrink:0', white: true })
        : '';

    const rowsHtml = rows.length > 0
      ? rows.map((r, i) => {
          const sep    = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
          const color  = r.failed ? 'rgba(248,113,113,0.85)' : 'rgba(52,211,153,0.85)';
          const sub    = r.sub ?? (r.type === 'movie' ? this._t('typeMovie') : r.type === 'music' ? this._t('typeArtist') : this._t('typeTv'));
          const pctBar = r.failed ? '' : `<div style="margin-top:3px;width:100%;height:2px;background:rgba(255,255,255,0.08);border-radius:1px"><div style="width:${r.pct}%;height:100%;background:${color};border-radius:1px"></div></div>`;
          const pctTxt = r.failed ? ` ${this._uiBadge(this._t('actFailed'), 'amber')}` : ` · ${r.pct}%`;
          const hidden = i >= maxRows ? 'display:none;' : '';
          return `<div style="${hidden}${sep}padding:4px 0">
            <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:1px">${sub}${pctTxt}</div>
            ${pctBar}
          </div>`;
        }).join('')
      : `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('actNoDownloads')}</div>`;

    return `<div class="tl-card u-sec-body" data-act-open="queue">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg></div>
      <div class="u-row-sb-w">
        <span style="font-size:10px;font-weight:800;color:var(--is-text);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">${this._t('actQueue')}</span>
        ${badge}
      </div>
      <div data-act-content class="u-flex-ovh-rel">${rowsHtml}</div>
    </div>`;
  }

  _actHistoryCard() {
    const cache = this._actHistoryCache;
    const grabbed = cache === null ? null : (cache || []);
    const histMax = this._actCardMax('history');

    const content = grabbed === null
      ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('loading')}</div>`
      : grabbed.length === 0
        ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('actNoHistory')}</div>`
        : grabbed.map((r, i) => {
            const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
            const ago = r.date ? this._tlFmtDate(r.date) : '';
            const sub = [r.svc, r.ep || null, ago].filter(Boolean).join(' · ');
            const hidden = i >= histMax ? 'display:none;' : '';
            return `<div style="${hidden}${sep}padding:4px 0">
              <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
              <div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:1px">${sub}</div>
            </div>`;
          }).join('');

    return `<div class="tl-card u-sec-body" data-act-open="history">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="u-row-sb-w">
        <span style="font-size:10px;font-weight:800;color:var(--is-text);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">${this._t('actHistory')}</span>
      </div>
      <div data-act-content class="u-flex-ovh-rel">${content}</div>
    </div>`;
  }

  _actBlocklistCard() {
    const cache = this._actBlocklistCache;
    const items = cache === null ? null : (cache || []);
    const blMax = this._actCardMax('blocklist');

    const content = items === null
      ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('loading')}</div>`
      : items.length === 0
        ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('actNoBlocked')}</div>`
        : items.map((r, i) => {
            const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
            const ago = r.date ? this._tlFmtDate(r.date) : '';
            const sub = [r.svc, r.quality, ago].filter(Boolean).join(' · ');
            const hidden = i >= blMax ? 'display:none;' : '';
            return `<div style="${hidden}${sep}padding:4px 0">
              <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
              <div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:1px">${sub}</div>
            </div>`;
          }).join('');

    return `<div class="tl-card u-sec-body" data-act-open="blocklist">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
      <div class="u-row-sb-w">
        <span style="font-size:10px;font-weight:800;color:var(--is-text);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">${this._t('actBlocklist')}</span>
      </div>
      <div data-act-content class="u-flex-ovh-rel">${content}</div>
    </div>`;
  }

  // Returns the max items that fit in a poster card of the given type.
  // Uses a cached value (from previous successful trim) so re-renders never show overflow.
  // Keys: 'queue' | 'history' | 'blocklist' | 'tl-history' | 'js-history'
  _actCardMax(key) {
    if (!this._actCardLimits) {
      // Load from localStorage on first call; fall back to a safe default (3)
      try {
        const stored = JSON.parse(localStorage.getItem('arr-act-card-limits') || 'null');
        this._actCardLimits = (stored && typeof stored === 'object') ? stored : {};
      } catch { this._actCardLimits = {}; }
    }
    return this._actCardLimits[key] ?? 3;
  }

  _trimActivityCards() {
    const BOTTOM_GAP = 12;
    const SEL_KEY = {
      '[data-act-open="queue"]':    'queue',
      '[data-act-open="history"]':  'history',
      '[data-act-open="blocklist"]':'blocklist',
      '[data-tl-open="history"]':   'tl-history',
      '[data-js-open="history"]':   'js-history',
    };

    const trimAndLearn = () => {
      let anyUpdated = false;
      for (const [attr, key] of Object.entries(SEL_KEY)) {
        const card = this.shadowRoot?.querySelector(`.tl-card${attr}`);
        if (!card) continue;
        const contentDiv = card.querySelector('[data-act-content]');
        if (!contentDiv) continue;

        for (const item of contentDiv.children) item.style.display = '';
        const limit = contentDiv.getBoundingClientRect().bottom - BOTTOM_GAP;
        if (limit <= 0) continue; // layout not ready — skip this card this pass

        let overflowing = false;
        let visible = 0;
        for (const item of contentDiv.children) {
          if (overflowing || item.getBoundingClientRect().bottom > limit) {
            overflowing = true;
            item.style.display = 'none';
          } else {
            visible++;
          }
        }

        // Update cache if the measured limit differs from what we rendered
        if (!this._actCardLimits) this._actCardLimits = {};
        if (this._actCardLimits[key] !== visible) {
          this._actCardLimits[key] = visible;
          anyUpdated = true;
        }
      }
      // Persist calibrated limits so next render (incl. after navigation) is correct
      if (anyUpdated && !this._trimCalibrating) {
        try { localStorage.setItem('arr-act-card-limits', JSON.stringify(this._actCardLimits)); } catch {}
        // Re-render right panel once with corrected limits so overflow never shows
        this._trimCalibrating = true;
        this._reRenderRight?.();
        this._trimCalibrating = false;
      }
    };

    // Disconnect stale observer
    this._trimRO?.disconnect();
    this._trimRO = null;

    requestAnimationFrame(trimAndLearn);

    // ResizeObserver: catches HA panel slide-in and deferred layout
    const tlRow = this.shadowRoot?.querySelector('.tl-row');
    if (tlRow && typeof ResizeObserver !== 'undefined') {
      let fires = 0;
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(trimAndLearn);
        if (++fires >= 6) { ro.disconnect(); this._trimRO = null; }
      });
      ro.observe(tlRow);
      this._trimRO = ro;
      setTimeout(() => { ro.disconnect(); this._trimRO = null; }, 3000);
    }
  }

  // ── Modal shell ──────────────────────────────────────────────────────────

  _actModalNavHtml(tab) {
    const isMobile = this._isMob;
    const _ico = d => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    // Download tray / clock / no-entry / warning triangle
    const NAV = [
      { id: 'queue',     label: this._t('actTabQueue'),     icon: _ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>') },
      { id: 'history',   label: this._t('actTabHistory'),   icon: _ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
      { id: 'blocklist', label: this._t('actTabBlocklist'), icon: _ico('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>') },
      { id: 'missing',   label: this._t('actTabMissing'),   icon: _ico('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>') },
    ];
    // Four labelled pills overflow a phone header, so there the glyph carries
    // the meaning and only the active tab keeps its word.
    return `<div id="act-nav" class="mt-nav"><span class="mt-nav-ind"></span>${
      NAV.map(g => {
        const on = g.id === tab;
        return `<button class="mt-nav-btn${on ? ' is-on' : ''}" data-act-tab="${g.id}" title="${this._escHtml(g.label)}">${g.icon}${(!isMobile || on) ? g.label : ''}</button>`;
      }).join('')}</div>`;
  }

  _actModalHtml(tab) {
    const isMobile = this._isMob;
    // Title dropped — the active tab already names the view
    // Opened from a title's detail popup? Then this goes back to it.
    const _backIco = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const hdrInner = `<div id="act-nav-area" style="min-width:0;flex-shrink:1;overflow:hidden">${this._actModalNavHtml(tab)}</div>
         ${isMobile ? '' : `<div id="act-status-slot" style="flex-shrink:0;display:flex;align-items:center"></div>`}
         <div style="flex:1;min-width:8px"></div>
         <button class="popup-close" id="act-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${this._actPopupReturn ? _backIco : ICONS.close}</button>`;
    const hdrStyle = isMobile
      ? 'padding:12px 12px 10px;gap:8px;align-items:center'
      : 'padding:14px 22px 10px;gap:12px;align-items:center';
    return `<div class="popup-overlay${dayClass(this)}" data-act-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="${hdrStyle}">${hdrInner}</div>
        <div class="popup-body" id="act-body" style="padding:${isMobile ? '12px 14px 16px' : '14px 22px 20px'};overflow:hidden">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  // ── Instance label helper ─────────────────────────────────────────────────
  // Returns seerr server name if configured, else "Radarr" / "Radarr 2" / …

  // Which app a row came from, as a glyph: a film strip, a set, or a note.
  _actSrcIcon(svc) {
    const F = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"';
    if (svc === 'lidarr') {
      return `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`;
    }
    if (svc === 'radarr' || svc === 'radarr2') {
      return `<svg ${F}><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    }
    return `<svg ${F}><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
  }

  // Lidarr's own green, beside Radarr's blue and Sonarr's amber.
  _actSrcColor(svc) {
    if (svc === 'lidarr') return 'rgba(21,158,90,0.9)';
    return (svc === 'radarr' || svc === 'radarr2') ? 'rgba(99,140,255,0.85)' : 'rgba(250,160,40,0.85)';
  }

  _instLabel(svc) {
    const defaults = { radarr: 'Radarr', radarr2: 'Radarr 2', sonarr: 'Sonarr', sonarr2: 'Sonarr 2', lidarr: 'Lidarr' };
    if (this._overseerrConfigured !== false) {
      const map = { radarr: this._seerrRadarr, radarr2: this._seerrRadarr2, sonarr: this._seerrSonarr, sonarr2: this._seerrSonarr2 };
      const name = map[svc]?.name;
      if (name) return name;
    }
    return defaults[svc] || svc;
  }
}

export const activityRenderMixin = _ActivityRenderMethods.prototype;
