// Activity: the cards in the right column — the queue, what is missing, history
// and the blocklist — and the click that opens the modal. Core, because the
// column draws them synchronously; the modal loads on demand (chunks/activity.js).

class _ActivityTilesMethods {

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

  _instLabel(svc) {
    const defaults = { radarr: 'Radarr', radarr2: 'Radarr 2', sonarr: 'Sonarr', sonarr2: 'Sonarr 2', lidarr: 'Lidarr' };
    if (this._overseerrConfigured !== false) {
      const map = { radarr: this._seerrRadarr, radarr2: this._seerrRadarr2, sonarr: this._seerrSonarr, sonarr2: this._seerrSonarr2 };
      const name = map[svc]?.name;
      if (name) return name;
    }
    return defaults[svc] || svc;
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

  _actMissingCard() {
    const cache = this._actMissingCache;
    const movieCount  = cache?.movieCount  ?? null;
    const seriesCount = cache?.seriesCount ?? null;

    const badge = movieCount !== null
      ? this._uiBadge(String(movieCount + seriesCount), 'amber', { extra: 'flex-shrink:0', white: true })
      : '';

    const filmSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    const tvSvg   = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
    const mkRow    = (svg, label, count) => `<div class="u-row-6"><span style="opacity:0.6;flex-shrink:0;display:flex">${svg}</span><span style="font-size:10px;font-weight:600;color:var(--is-text-sec);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span><span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);flex-shrink:0">${count}</span></div>`;
    const mkSubRow = (label, count) => `<div style="display:flex;align-items:center;gap:6px;padding-left:16px"><span style="font-size:9px;color:var(--is-text-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span><span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.75);flex-shrink:0">${count}</span></div>`;

    let rows = '';
    if (cache && movieCount !== null) {
      const rRecs = cache.rRecs || [];
      const sRecs = cache.sRecs || [];
      const hasR2 = this._radarr2Configured === true;
      const hasS2 = this._sonarr2Configured === true;
      if (hasR2 || hasS2) {
        const r1 = rRecs.filter(r => r._inst === 'radarr').length;
        const r2 = rRecs.filter(r => r._inst === 'radarr2').length;
        const s1 = sRecs.filter(s => s._inst === 'sonarr').length;
        const s2 = sRecs.filter(s => s._inst === 'sonarr2').length;
        if (movieCount > 0) {
          rows += mkRow(filmSvg, this._t('tlFilterMovies'), movieCount);
          if (hasR2) {
            if (r1 > 0) rows += mkSubRow(this._instLabel('radarr'), r1);
            if (r2 > 0) rows += mkSubRow(this._instLabel('radarr2'), r2);
          }
        }
        if (seriesCount > 0) {
          rows += mkRow(tvSvg, this._t('tlFilterTvShows'), seriesCount);
          if (hasS2) {
            if (s1 > 0) rows += mkSubRow(this._instLabel('sonarr'), s1);
            if (s2 > 0) rows += mkSubRow(this._instLabel('sonarr2'), s2);
          }
        }
      } else {
        if (movieCount  > 0) rows += mkRow(filmSvg, this._t('tlFilterMovies'), movieCount);
        if (seriesCount > 0) rows += mkRow(tvSvg,   this._t('tlFilterTvShows'),   seriesCount);
      }
    }

    const content = cache === undefined || movieCount === null
      ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('loading')}</div>`
      : (movieCount + seriesCount) === 0
        ? `<div style="font-size:9px;color:var(--is-text-muted);padding:8px 0">${this._t('actMissingEmpty')}</div>`
        : `<div style="display:flex;flex-direction:column;gap:4px;padding:4px 0">${rows}</div>`;

    
    return `<div class="tl-card u-sec-body" data-act-open="missing">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>
      <div class="u-row-sb-w">
        <span style="font-size:10px;font-weight:800;color:var(--is-text);background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;line-height:1">${this._t('actMissing')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${content}</div>
    </div>`;
  }

  _wireActivityPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._actWired) return;
    right._actWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-act-open]');
      if (!card) return;
      this._openActivityModal(card.dataset.actOpen);
    });
  }

  _computeActMissingCache() {
    const _buildProfMap = (...profArrays) => {
      const map = new Map();
      for (const arr of profArrays) for (const p of (arr || [])) if (p.id != null && p.name) map.set(p.id, p.name);
      return map;
    };
    const rProfMap = _buildProfMap(this._radarrProfiles, this._radarr2Profiles);
    const sProfMap = _buildProfMap(this._sonarrProfiles, this._sonarr2Profiles);
    const rRecs = [
      ...(this._radarr  || []).filter(m => !m.hasFile).map(m => ({ ...m, _inst: 'radarr',  _profileName: rProfMap.get(m.qualityProfileId) || '' })),
      ...(this._radarr2 || []).filter(m => !m.hasFile).map(m => ({ ...m, _inst: 'radarr2', _profileName: rProfMap.get(m.qualityProfileId) || '' })),
    ];
    const sRecs = [
      ...(this._sonarr  || []).map(s => { const s0 = (s.seasons||[]).find(ss=>ss.seasonNumber===0); const mc = Math.max(0, ((s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)) - ((s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0))); const tc = Math.max(0,(s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)); const fc = Math.max(0,(s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0)); return { ...s, _inst: 'sonarr',  _profileName: sProfMap.get(s.qualityProfileId) || '', _missingCount: mc, _totalCount: tc, _fileCount: fc }; }).filter(s => s._missingCount > 0),
      ...(this._sonarr2 || []).map(s => { const s0 = (s.seasons||[]).find(ss=>ss.seasonNumber===0); const mc = Math.max(0, ((s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)) - ((s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0))); const tc = Math.max(0,(s.statistics?.totalEpisodeCount||0)-(s0?.statistics?.totalEpisodeCount||0)); const fc = Math.max(0,(s.statistics?.episodeFileCount||0)-(s0?.statistics?.episodeFileCount||0)); return { ...s, _inst: 'sonarr2', _profileName: sProfMap.get(s.qualityProfileId) || '', _missingCount: mc, _totalCount: tc, _fileCount: fc }; }).filter(s => s._missingCount > 0),
    ];
    this._actMissingCache = { movieCount: rRecs.length, seriesCount: sRecs.length, rRecs, sRecs };
  }

}

export const activityTilesMixin = _ActivityTilesMethods.prototype;
